"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/features/auth/auth-provider";
import {
  checkKeyState,
  generateAndRegisterKeys,
  resetKeys,
  type KeyState,
} from "@/features/crypto/key-lifecycle";
import {
  KeyRound, ShieldCheck, AlertTriangle, Loader2,
  RefreshCw, Trash2, Copy, CheckCheck,
} from "lucide-react";

export default function KeysPage() {
  const { accessToken } = useAuth();
  const [keyState, setKeyState] = useState<KeyState | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    checkKeyState().then(setKeyState).catch(console.error);
  }, []);

  async function handleGenerate() {
    if (!accessToken) return;
    setStatus("generating");
    setErrorMsg("");
    try {
      await generateAndRegisterKeys(accessToken);
      const state = await checkKeyState();
      setKeyState(state);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Key generation failed.");
      setStatus("error");
    }
  }

  async function handleReset() {
    await resetKeys();
    const state = await checkKeyState();
    setKeyState(state);
    setStatus("idle");
    setErrorMsg("");
  }

  function copyToClipboard(text: string, id: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  return (
    <AppShell>
      <div className="page-container">
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>
            Key Management
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
            RSA-2048 key pairs generated in the browser. Private keys never leave this device.
          </p>
        </div>

        {/* Step indicator */}
        <div className="step-indicator" style={{ marginBottom: 24, gap: 16 }}>
          {[
            { n: "1", label: "Check state", done: keyState !== null },
            { n: "2", label: "Generate pairs", done: keyState?.hasKeys ?? false },
            { n: "3", label: "Register public keys", done: keyState?.hasKeys ?? false },
          ].map(({ n, label, done }, i) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <span style={{ color: "#7dd3fc", marginRight: 4 }}>›</span>}
              <div style={{
                width: 20, height: 20, borderRadius: "50%", fontSize: 11, fontWeight: 700,
                background: done ? "#0284c7" : "#bae6fd", color: done ? "white" : "#0c4a6e",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>{n}</div>
              <span style={{ fontSize: 12, fontWeight: done ? 600 : 400 }}>{label}</span>
            </div>
          ))}
        </div>

        {keyState === null ? (
          <div className="card">
            <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", fontSize: 14 }}>
              <Loader2 size={15} className="spinner" />
              Checking IndexedDB…
            </div>
          </div>
        ) : keyState.hasKeys ? (
          /* Keys exist */
          <div className="stack-sm">
            <div className="alert alert-success" style={{ marginBottom: 8 }}>
              <ShieldCheck size={14} />
              Key pair active — you can encrypt, sign, and decrypt files.
            </div>

            {/* Encryption key card */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <KeyRound size={15} color="#2563eb" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    Encryption Key Pair
                  </span>
                  <span className="badge-blue">RSA-OAEP-SHA256</span>
                </div>
              </div>
              <div className="card-body">
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-key">Key ID</span>
                    <span className="info-value"><code style={{ fontSize: 13 }}>{keyState.encryptionKeyId}</code></span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Public key fingerprint</span>
                    <span className="info-value" style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <span className="fingerprint" style={{ flex: 1 }}>{keyState.encryptionFingerprint}</span>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => copyToClipboard(keyState.encryptionFingerprint!, "enc")}
                        title="Copy fingerprint"
                      >
                        {copied === "enc" ? <CheckCheck size={12} color="var(--success)" /> : <Copy size={12} />}
                      </button>
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Purpose</span>
                    <span className="info-value">Receive AES-256-GCM wrapped keys (RSA-OAEP)</span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Private key</span>
                    <span className="info-value" style={{ color: "var(--success)", fontSize: 13 }}>
                      Stored in IndexedDB · Not exportable
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signing key card */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <KeyRound size={15} color="#7c3aed" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    Signing Key Pair
                  </span>
                  <span className="badge-purple">RSA-PSS-SHA256</span>
                </div>
              </div>
              <div className="card-body">
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-key">Key ID</span>
                    <span className="info-value"><code style={{ fontSize: 13 }}>{keyState.signingKeyId}</code></span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Public key fingerprint</span>
                    <span className="info-value" style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <span className="fingerprint" style={{ flex: 1 }}>{keyState.signingFingerprint}</span>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => copyToClipboard(keyState.signingFingerprint!, "sig")}
                        title="Copy fingerprint"
                      >
                        {copied === "sig" ? <CheckCheck size={12} color="var(--success)" /> : <Copy size={12} />}
                      </button>
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Purpose</span>
                    <span className="info-value">Sign file manifests (RSA-PSS, 32-byte salt)</span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Private key</span>
                    <span className="info-value" style={{ color: "var(--success)", fontSize: 13 }}>
                      Stored in IndexedDB · Not exportable
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => void handleGenerate()} disabled={status === "generating"}>
                {status === "generating" ? <Loader2 size={13} className="spinner" /> : <RefreshCw size={13} />}
                Rotate Keys
              </button>
              <button className="btn btn-danger" onClick={() => void handleReset()}>
                <Trash2 size={13} />
                Clear Keys
              </button>
            </div>
          </div>
        ) : (
          /* No keys */
          <div className="stack-sm">
            <div className="card">
              <div className="card-body" style={{ textAlign: "center", padding: "40px 24px" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--bg)", border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <KeyRound size={20} color="var(--text-muted)" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
                  No key pair found
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, maxWidth: 360, margin: "0 auto 20px" }}>
                  Generate two RSA-2048 key pairs in this browser. The private keys will be stored in IndexedDB only — they never leave your device.
                </p>
                <button
                  className="btn btn-primary btn-lg"
                  disabled={status === "generating"}
                  onClick={() => void handleGenerate()}
                >
                  {status === "generating" && <Loader2 size={15} className="spinner" />}
                  {status === "generating" ? "Generating RSA-2048 pairs…" : "Generate & Register Key Pair"}
                </button>
                {status === "error" && (
                  <div className="alert alert-error" style={{ marginTop: 16 }}>
                    <AlertTriangle size={14} />
                    {errorMsg}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Security notes */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Security Notes</span>
          </div>
          <div className="card-body">
            <div className="stack-sm" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>01</span>
                RSA-OAEP-SHA256 wraps the per-file AES-256-GCM key so only intended recipients can decrypt.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>02</span>
                RSA-PSS-SHA256 signs the canonical file manifest for non-repudiation (32-byte salt).
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>03</span>
                Fingerprints are SHA-256 hashes of the SPKI-encoded public key — independently verifiable.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>04</span>
                Clearing browser storage or switching devices requires key regeneration. Previous files cannot be decrypted without the original private key.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
