"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/features/auth/auth-provider";
import { checkKeyState, getPrivateKeysOrThrow, getStoredKeyInfo } from "@/features/crypto/key-lifecycle";
import { authedRequest, authedMultipartRequest } from "@/lib/api/client";
import {
  encryptFile,
  wrapAesKey,
  signManifest,
  unwrapAesKey,
  decryptFile,
} from "@/lib/crypto/crypto-service";
import type { EncryptedPayload } from "@/lib/crypto/types";

interface Assignment {
  id: number;
  course: number;
  title: string;
  description: string;
}

interface FileRecord {
  id: number;
  file_type: string;
  ciphertext_sha256: string;
  plaintext_sha256: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  owner?: number;
}

interface DownloadResponse {
  file_id: number;
  file_type: string;
  mime_type: string;
  ciphertext_b64: string;
  ciphertext_sha256: string;
  plaintext_sha256: string;
  aes_gcm_iv: string;
  aes_gcm_tag: string;
  wrapped_key: {
    wrapped_key_ciphertext: string;
    recipient_key_fingerprint: string;
  };
  signature: {
    signature_algorithm: string;
    signature_value: string;
    signed_by: string;
    signing_key_fingerprint: string;
  } | null;
  manifest: { manifest_json: Record<string, unknown>; manifest_sha256: string } | null;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function SubmissionsPage() {
  const { accessToken, user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null);
  const [hasKeys, setHasKeys] = useState<boolean | null>(null);

  const [uploadStatus, setUploadStatus] = useState<"idle" | "encrypting" | "uploading" | "done" | "error">("idle");
  const [uploadMsg, setUploadMsg] = useState("");
  const [downloadStatus, setDownloadStatus] = useState<Record<number, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isExaminer = user?.roles.some((r) => ["examiner", "project_evaluator", "course_admin", "system_admin"].includes(r)) ?? false;

  useEffect(() => {
    if (!accessToken) return;
    checkKeyState().then((s) => setHasKeys(s.hasKeys)).catch(console.error);
    authedRequest<{ results: Assignment[] }>("/assignments/", accessToken)
      .then((d) => setAssignments(d.results ?? (d as unknown as Assignment[])))
      .catch(console.error);
    authedRequest<{ results: FileRecord[] } | FileRecord[]>("/files/", accessToken)
      .then((d) => {
        const arr = Array.isArray(d) ? d : (d as { results: FileRecord[] }).results ?? [];
        setFiles(arr);
      })
      .catch(console.error);
  }, [accessToken]);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !accessToken || !selectedAssignment) {
      setUploadMsg("Select a file and an assignment first.");
      return;
    }
    if (!hasKeys) {
      setUploadMsg("Generate your key pair on the Keys page first.");
      return;
    }

    setUploadStatus("encrypting");
    setUploadMsg("Encrypting file with AES-256-GCM…");

    try {
      const keyInfo = getStoredKeyInfo()!;
      const assignment = assignments.find((a) => a.id === selectedAssignment)!;

      const aad = {
        file_type: "student_submission",
        assignment_id: selectedAssignment,
        course_id: assignment.course,
        uploader_key_id: keyInfo.encryptionKeyId,
        filename: file.name,
      };

      const { payload: encPayload, rawAesKey } = await encryptFile(file, aad);

      // Wrap AES key for self (student can decrypt own file)
      const myKeys = await authedRequest<{ id: number; public_key_pem: string; key_type: string }[]>(
        `/keys/for-user/${user!.id}/`,
        accessToken,
      );
      const myEncKey = myKeys.find((k) => k.key_type === "rsa_oaep_encryption");

      // Wrap AES key for: (1) the uploader, (2) all registered examiners/admins
      const wrappedKeys: { recipient_user_id: number; recipient_key_id: number; wrapped_key_ciphertext: string }[] = [];

      if (myEncKey) {
        const wrapped = await wrapAesKey(rawAesKey, myEncKey.public_key_pem);
        wrappedKeys.push({ recipient_user_id: user!.id, recipient_key_id: myEncKey.id, wrapped_key_ciphertext: wrapped });
      }

      // Fetch and wrap for all examiner keys registered on the server
      try {
        const examinerKeys = await authedRequest<{ id: number; user: number; public_key_pem: string }[]>(
          "/keys/examiner-keys/",
          accessToken,
        );
        for (const ek of examinerKeys) {
          if (ek.user === user!.id) continue; // already wrapped for self above
          const wrapped = await wrapAesKey(rawAesKey, ek.public_key_pem);
          wrappedKeys.push({ recipient_user_id: ek.user, recipient_key_id: ek.id, wrapped_key_ciphertext: wrapped });
        }
      } catch {
        // No examiner keys registered yet — continue with uploader-only wrap
      }

      const manifest = {
        filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        plaintext_sha256: encPayload.plaintextSha256,
        ciphertext_sha256: encPayload.ciphertextSha256,
        aes_gcm_iv: encPayload.iv,
        assignment_id: selectedAssignment,
        course_id: assignment.course,
        uploader_id: user!.id,
        timestamp: new Date().toISOString(),
      };

      const { encryptionPrivKey: _ep, signingPrivKey } = await getPrivateKeysOrThrow();
      const signed = await signManifest(manifest, signingPrivKey, keyInfo.signingKeyId);

      setUploadStatus("uploading");
      setUploadMsg("Uploading ciphertext to server…");

      const metadata = {
        course: assignment.course,
        assignment: selectedAssignment,
        file_type: "student_submission",
        aes_gcm_iv: encPayload.iv,
        aes_gcm_tag: encPayload.tag,
        plaintext_sha256: encPayload.plaintextSha256,
        ciphertext_sha256: encPayload.ciphertextSha256,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        encrypted_filename: { encrypted: false, filename: file.name },
        manifest: {
          manifest_json: signed.manifest,
          manifest_sha256: signed.manifestSha256,
        },
        signature: {
          signing_key_id: keyInfo.signingKeyId,
          signature_value: signed.signatureValue,
          signed_payload_sha256: signed.manifestSha256,
        },
        wrapped_keys: wrappedKeys,
      };

      const formData = new FormData();
      formData.append("ciphertext", new Blob([encPayload.ciphertext]), "upload.enc");
      formData.append("metadata", JSON.stringify(metadata));

      const result = await authedMultipartRequest<{ id: number; ciphertext_sha256: string }>(
        "/files/upload/",
        accessToken,
        formData,
      );

      setUploadStatus("done");
      setUploadMsg(`Uploaded. File ID: ${result.id} | Ciphertext SHA-256: ${result.ciphertext_sha256.slice(0, 16)}…`);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh file list
      const updated = await authedRequest<{ results: FileRecord[] } | FileRecord[]>("/files/", accessToken);
      setFiles(Array.isArray(updated) ? updated : (updated as { results: FileRecord[] }).results ?? []);
    } catch (err) {
      setUploadStatus("error");
      setUploadMsg(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  async function handleDownload(fileId: number) {
    if (!accessToken) return;
    setDownloadStatus((s) => ({ ...s, [fileId]: "Fetching ciphertext…" }));

    try {
      const data = await authedRequest<DownloadResponse>(`/files/${fileId}/download/`, accessToken);

      setDownloadStatus((s) => ({ ...s, [fileId]: "Unwrapping AES key…" }));

      const { encryptionPrivKey } = await getPrivateKeysOrThrow();
      const aesKey = await unwrapAesKey(data.wrapped_key.wrapped_key_ciphertext, encryptionPrivKey);

      setDownloadStatus((s) => ({ ...s, [fileId]: "Decrypting…" }));

      const ciphertextBin = atob(data.ciphertext_b64);
      const ciphertextBytes = new Uint8Array(ciphertextBin.length);
      for (let i = 0; i < ciphertextBin.length; i++) ciphertextBytes[i] = ciphertextBin.charCodeAt(i);

      const payload: EncryptedPayload = {
        ciphertext: ciphertextBytes.buffer,
        iv: data.aes_gcm_iv,
        tag: data.aes_gcm_tag,
        plaintextSha256: data.plaintext_sha256,
        ciphertextSha256: data.ciphertext_sha256,
      };

      const plaintext = await decryptFile(payload, aesKey);

      const blob = new Blob([plaintext], { type: data.mime_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (data.manifest?.manifest_json?.filename as string) ?? `file-${fileId}`;
      a.click();
      URL.revokeObjectURL(url);

      const sigNote = data.signature ? ` | Signed by ${data.signature.signed_by}` : "";
      setDownloadStatus((s) => ({ ...s, [fileId]: `Decrypted successfully${sigNote}` }));
    } catch (err) {
      setDownloadStatus((s) => ({
        ...s,
        [fileId]: err instanceof Error ? err.message : "Decryption failed.",
      }));
    }
  }

  return (
    <AppShell>
      <div className="stack">
        <h2>Submissions</h2>

        {!hasKeys && hasKeys !== null && (
          <div className="panel" style={{ borderColor: "var(--danger)", background: "#fff5f5" }}>
            <strong style={{ color: "var(--danger)" }}>No key pair found.</strong>{" "}
            <a href="/keys" style={{ color: "var(--accent)" }}>Go to Keys page</a> to generate and register your RSA key pair before uploading.
          </div>
        )}

        {!isExaminer && (
          <section className="panel stack">
            <h3>Upload Encrypted Submission</h3>
            <p className="muted" style={{ fontSize: "0.9em" }}>
              Your file is encrypted with AES-256-GCM in the browser. Only ciphertext reaches the server. A manifest is signed with RSA-PSS.
            </p>
            <label className="stack" style={{ fontSize: "0.9em" }}>
              Assignment
              <select
                className="input"
                value={selectedAssignment ?? ""}
                onChange={(e) => setSelectedAssignment(Number(e.target.value) || null)}
              >
                <option value="">Select assignment…</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </label>
            <label className="stack" style={{ fontSize: "0.9em" }}>
              File (PDF, DOCX, ZIP…)
              <input ref={fileInputRef} type="file" className="input" />
            </label>
            <button
              className="button"
              style={{ width: "fit-content" }}
              disabled={uploadStatus === "encrypting" || uploadStatus === "uploading"}
              onClick={() => void handleUpload()}
            >
              {uploadStatus === "encrypting"
                ? "Encrypting…"
                : uploadStatus === "uploading"
                  ? "Uploading…"
                  : "Encrypt and Upload"}
            </button>
            {uploadMsg && (
              <p style={{ fontSize: "0.88em", color: uploadStatus === "error" ? "var(--danger)" : "var(--muted)" }}>
                {uploadMsg}
              </p>
            )}
          </section>
        )}

        <section className="panel stack">
          <h3>{isExaminer ? "All Submissions" : "Your Uploaded Files"}</h3>
          {files.length === 0 ? (
            <p className="muted">No files available yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px 8px 0", color: "var(--muted)" }}>ID</th>
                  <th style={{ textAlign: "left", padding: "8px 12px 8px 0", color: "var(--muted)" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "8px 12px 8px 0", color: "var(--muted)" }}>MIME</th>
                  <th style={{ textAlign: "left", padding: "8px 12px 8px 0", color: "var(--muted)" }}>Size</th>
                  <th style={{ textAlign: "left", padding: "8px 12px 8px 0", color: "var(--muted)" }}>SHA-256 (cipher)</th>
                  <th style={{ textAlign: "left", padding: "8px 12px 8px 0", color: "var(--muted)" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 12px 8px 0" }}>{f.id}</td>
                    <td style={{ padding: "8px 12px 8px 0" }}>{f.file_type}</td>
                    <td style={{ padding: "8px 12px 8px 0" }}>{f.mime_type}</td>
                    <td style={{ padding: "8px 12px 8px 0" }}>{formatBytes(f.size_bytes)}</td>
                    <td style={{ padding: "8px 12px 8px 0", fontFamily: "monospace", fontSize: "0.8em" }}>
                      {f.ciphertext_sha256.slice(0, 20)}…
                    </td>
                    <td style={{ padding: "8px 12px 8px 0" }}>
                      <div className="stack" style={{ gap: "4px" }}>
                        <button
                          className="button"
                          style={{ fontSize: "0.8em", padding: "4px 10px" }}
                          onClick={() => void handleDownload(f.id)}
                        >
                          Decrypt + Download
                        </button>
                        {downloadStatus[f.id] && (
                          <p style={{ fontSize: "0.78em", color: "var(--muted)", margin: 0 }}>{downloadStatus[f.id]}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AppShell>
  );
}
