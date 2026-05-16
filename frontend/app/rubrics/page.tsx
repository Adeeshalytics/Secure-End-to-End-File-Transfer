"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/features/auth/auth-provider";
import {
  checkKeyState,
  getPrivateKeysOrThrow,
  getStoredKeyInfo,
} from "@/features/crypto/key-lifecycle";
import { authedRequest, authedMultipartRequest } from "@/lib/api/client";
import {
  encryptFile,
  wrapAesKey,
  signManifest,
  unwrapAesKey,
  decryptFile,
} from "@/lib/crypto/crypto-service";
import type { EncryptedPayload } from "@/lib/crypto/types";
import {
  BookOpen, Upload, Download, ShieldAlert, FileText,
  CheckCircle2, Loader2, AlertCircle, Lock, ShieldCheck,
} from "lucide-react";

interface Assignment {
  id: number;
  course: number;
  title: string;
}

interface FileRecord {
  id: number;
  file_type: string;
  ciphertext_sha256: string;
  plaintext_sha256: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

interface DownloadResponse {
  file_id: number;
  mime_type: string;
  ciphertext_b64: string;
  ciphertext_sha256: string;
  plaintext_sha256: string;
  aes_gcm_iv: string;
  aes_gcm_tag: string;
  wrapped_key: { wrapped_key_ciphertext: string; recipient_key_fingerprint: string };
  signature: { signed_by: string; signing_key_fingerprint: string } | null;
  manifest: { manifest_json: Record<string, unknown>; manifest_sha256: string } | null;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function RubricsPage() {
  const { accessToken, user } = useAuth();

  const isExaminer = user?.roles.some((r) =>
    ["examiner", "project_evaluator", "course_admin", "system_admin"].includes(r),
  ) ?? false;

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [rubrics, setRubrics] = useState<FileRecord[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null);
  const [hasKeys, setHasKeys] = useState<boolean | null>(null);

  const [uploadStatus, setUploadStatus] = useState<"idle" | "encrypting" | "uploading" | "done" | "error">("idle");
  const [uploadMsg, setUploadMsg] = useState("");
  const [downloadStatus, setDownloadStatus] = useState<Record<number, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!accessToken) return;
    checkKeyState().then((s) => setHasKeys(s.hasKeys)).catch(console.error);
    authedRequest<{ results?: Assignment[] } | Assignment[]>("/assignments/", accessToken)
      .then((d) => setAssignments(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(console.error);
    authedRequest<{ results?: FileRecord[] } | FileRecord[]>("/files/", accessToken)
      .then((d) => {
        const all = Array.isArray(d) ? d : (d.results ?? []);
        setRubrics(all.filter((f) => f.file_type === "rubric"));
      })
      .catch(console.error);
  }, [accessToken]);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !accessToken || !selectedAssignment || !user) {
      setUploadMsg("Select a file and an assignment first.");
      return;
    }
    if (!hasKeys) {
      setUploadMsg("Generate your key pair on the Keys page first.");
      return;
    }

    setUploadStatus("encrypting");
    setUploadMsg("Encrypting rubric with AES-256-GCM…");

    try {
      const keyInfo = getStoredKeyInfo()!;
      const assignment = assignments.find((a) => a.id === selectedAssignment)!;

      const aad = {
        file_type: "rubric",
        assignment_id: selectedAssignment,
        course_id: assignment.course,
        uploader_key_id: keyInfo.encryptionKeyId,
        filename: file.name,
      };

      const { payload: encPayload, rawAesKey } = await encryptFile(file, aad);

      const myKeys = await authedRequest<{ id: number; public_key_pem: string; key_type: string }[]>(
        `/keys/for-user/${user.id}/`, accessToken,
      );
      const myEncKey = myKeys.find((k) => k.key_type === "rsa_oaep_encryption");

      const wrappedKeys: { recipient_user_id: number; recipient_key_id: number; wrapped_key_ciphertext: string }[] = [];

      if (myEncKey) {
        const wrapped = await wrapAesKey(rawAesKey, myEncKey.public_key_pem);
        wrappedKeys.push({ recipient_user_id: user.id, recipient_key_id: myEncKey.id, wrapped_key_ciphertext: wrapped });
      }

      try {
        const studentKeys = await authedRequest<{ id: number; user: number; public_key_pem: string }[]>(
          "/keys/student-keys/", accessToken,
        );
        for (const sk of studentKeys) {
          if (sk.user === user.id) continue;
          const wrapped = await wrapAesKey(rawAesKey, sk.public_key_pem);
          wrappedKeys.push({ recipient_user_id: sk.user, recipient_key_id: sk.id, wrapped_key_ciphertext: wrapped });
        }
      } catch {
        // No student keys yet
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
        uploader_id: user.id,
        file_type: "rubric",
        timestamp: new Date().toISOString(),
      };

      const { signingPrivKey } = await getPrivateKeysOrThrow();
      const signed = await signManifest(manifest, signingPrivKey, keyInfo.signingKeyId);

      setUploadStatus("uploading");
      setUploadMsg("Uploading encrypted rubric…");

      const metadata = {
        course: assignment.course,
        assignment: selectedAssignment,
        file_type: "rubric",
        aes_gcm_iv: encPayload.iv,
        aes_gcm_tag: encPayload.tag,
        plaintext_sha256: encPayload.plaintextSha256,
        ciphertext_sha256: encPayload.ciphertextSha256,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        encrypted_filename: { encrypted: false, filename: file.name },
        manifest: { manifest_json: signed.manifest, manifest_sha256: signed.manifestSha256 },
        signature: {
          signing_key_id: keyInfo.signingKeyId,
          signature_value: signed.signatureValue,
          signed_payload_sha256: signed.manifestSha256,
        },
        wrapped_keys: wrappedKeys,
      };

      const formData = new FormData();
      formData.append("ciphertext", new Blob([encPayload.ciphertext]), "rubric.enc");
      formData.append("metadata", JSON.stringify(metadata));

      const result = await authedMultipartRequest<{ id: number; ciphertext_sha256: string }>(
        "/files/upload/", accessToken, formData,
      );

      setUploadStatus("done");
      setUploadMsg(`File ID: ${result.id} · SHA-256: ${result.ciphertext_sha256.slice(0, 16)}…`);
      if (fileInputRef.current) fileInputRef.current.value = "";

      const updated = await authedRequest<{ results?: FileRecord[] } | FileRecord[]>("/files/", accessToken);
      const all = Array.isArray(updated) ? updated : (updated.results ?? []);
      setRubrics(all.filter((f) => f.file_type === "rubric"));
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

      const bin = atob(data.ciphertext_b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      const payload: EncryptedPayload = {
        ciphertext: bytes.buffer,
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
      a.download = (data.manifest?.manifest_json?.filename as string) ?? `rubric-${fileId}`;
      a.click();
      URL.revokeObjectURL(url);

      const sigNote = data.signature ? ` · Signed by ${data.signature.signed_by}` : "";
      setDownloadStatus((s) => ({ ...s, [fileId]: `✓ Decrypted${sigNote}` }));
    } catch (err) {
      setDownloadStatus((s) => ({
        ...s,
        [fileId]: err instanceof Error ? err.message : "Decryption failed.",
      }));
    }
  }

  const uploading = uploadStatus === "encrypting" || uploadStatus === "uploading";

  return (
    <AppShell>
      <div className="page-container">
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>
            Rubrics
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
            {isExaminer
              ? "Upload encrypted rubrics. The AES key is wrapped for every registered student."
              : "Rubrics are decrypted locally in your browser using your RSA private key."}
          </p>
        </div>

        {!hasKeys && hasKeys !== null && (
          <div className="alert alert-warning" style={{ marginBottom: 20 }}>
            <ShieldAlert size={14} />
            No RSA key pair found.{" "}
            <a href="/keys" style={{ color: "var(--warning)", fontWeight: 600, textDecoration: "underline" }}>
              Generate keys →
            </a>
          </div>
        )}

        {/* Upload — examiner only */}
        {isExaminer ? (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Upload size={15} color="var(--accent)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  Upload Encrypted Rubric
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span className="crypto-tag">AES-256-GCM</span>
                <span className="crypto-tag">RSA-OAEP</span>
                <span className="crypto-tag">RSA-PSS</span>
              </div>
            </div>
            <div className="card-body">
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                The rubric is encrypted in your browser. The AES key is wrapped separately for each registered student (RSA-OAEP).
                The server receives only ciphertext.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                    Assignment
                  </label>
                  <select
                    className="form-input"
                    value={selectedAssignment ?? ""}
                    onChange={(e) => setSelectedAssignment(Number(e.target.value) || null)}
                  >
                    <option value="">Select assignment…</option>
                    {assignments.map((a) => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                    Rubric file (PDF, DOCX…)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="form-input"
                    accept=".pdf,.docx,.doc,.txt"
                    style={{ cursor: "pointer" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  className="btn btn-primary"
                  disabled={uploading}
                  onClick={() => void handleUpload()}
                >
                  {uploading && <Loader2 size={14} className="spinner" />}
                  <Lock size={13} />
                  {uploadStatus === "encrypting"
                    ? "Encrypting…"
                    : uploadStatus === "uploading"
                      ? "Uploading…"
                      : "Encrypt & Upload Rubric"}
                </button>

                {uploadMsg && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                    {uploadStatus === "done" && <CheckCircle2 size={13} color="var(--success)" />}
                    {uploadStatus === "error" && <AlertCircle size={13} color="var(--danger)" />}
                    {uploading && <Loader2 size={13} className="spinner" color="var(--text-muted)" />}
                    <span style={{ color: uploadStatus === "error" ? "var(--danger)" : "var(--text-muted)" }}>
                      {uploadMsg}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            <BookOpen size={14} />
            Rubric upload is restricted to examiner accounts.
          </div>
        )}

        {/* Rubric list */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Download size={15} color="var(--text-muted)" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                Available Rubrics
              </span>
              {rubrics.length > 0 && (
                <span className="badge-purple">{rubrics.length}</span>
              )}
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {rubrics.length === 0 ? (
              <div className="empty-state">
                <FileText size={28} color="var(--text-muted)" />
                <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginTop: 12 }}>No rubrics yet</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {isExaminer ? "Upload an encrypted rubric above." : "Rubrics will appear here once uploaded by an examiner."}
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>MIME</th>
                    <th>Size</th>
                    <th>Ciphertext SHA-256</th>
                    <th>Uploaded</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rubrics.map((f) => (
                    <tr key={f.id}>
                      <td><code style={{ fontSize: 12 }}>{f.id}</code></td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{f.mime_type}</td>
                      <td>{formatBytes(f.size_bytes)}</td>
                      <td><span className="hash-short">{f.ciphertext_sha256.slice(0, 18)}…</span></td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                        {new Date(f.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => void handleDownload(f.id)}
                          >
                            <Download size={11} />
                            Decrypt
                          </button>
                          {downloadStatus[f.id] && (
                            <span style={{
                              fontSize: 11,
                              color: downloadStatus[f.id].startsWith("✓")
                                ? "var(--success)"
                                : downloadStatus[f.id].includes("failed") || downloadStatus[f.id].includes("Error")
                                  ? "var(--danger)"
                                  : "var(--text-muted)",
                            }}>
                              {downloadStatus[f.id]}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Security properties */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={15} color="var(--success)" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                Security Properties
              </span>
            </div>
          </div>
          <div className="card-body">
            <div className="stack-sm" style={{ fontSize: 13 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <span className="crypto-tag" style={{ flexShrink: 0 }}>Confidentiality</span>
                <span style={{ color: "var(--text-secondary)" }}>AES-256-GCM — only users with a wrapped copy of the AES key can decrypt.</span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <span className="crypto-tag" style={{ flexShrink: 0 }}>Integrity</span>
                <span style={{ color: "var(--text-secondary)" }}>AES-GCM auth tag detects ciphertext tampering. SHA-256 stored server-side for independent verification.</span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <span className="crypto-tag" style={{ flexShrink: 0 }}>Non-repudiation</span>
                <span style={{ color: "var(--text-secondary)" }}>RSA-PSS-SHA256 signature over the manifest ties the rubric to the examiner&apos;s registered signing key.</span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <span className="crypto-tag" style={{ flexShrink: 0 }}>Per-recipient</span>
                <span style={{ color: "var(--text-secondary)" }}>AES key is RSA-OAEP wrapped separately for each student. Revoking access only removes their EncryptedFileKey record.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
