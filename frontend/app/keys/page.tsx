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

export default function KeysPage() {
  const { accessToken } = useAuth();
  const [keyState, setKeyState] = useState<KeyState | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

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

  return (
    <AppShell>
      <div className="stack">
        <h2>Cryptographic Key Management</h2>

        <section className="panel stack">
          <h3>Your Key Pair</h3>
          <p className="muted">
            Two RSA-2048 key pairs are generated entirely in your browser. Private keys are stored in IndexedDB and
            never transmitted. Public keys are registered with the server so senders can encrypt files for you.
          </p>

          {keyState === null && <p className="muted">Checking key state…</p>}

          {keyState?.hasKeys ? (
            <div className="stack">
              <div className="panel" style={{ background: "var(--background)" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.9em" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "6px 12px 6px 0", color: "var(--muted)", whiteSpace: "nowrap" }}>Encryption key ID</td>
                      <td><code>{keyState.encryptionKeyId}</code></td>
                    </tr>
                    <tr>
                      <td style={{ padding: "6px 12px 6px 0", color: "var(--muted)", whiteSpace: "nowrap" }}>Encryption fingerprint (SHA-256)</td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85em", wordBreak: "break-all" }}>{keyState.encryptionFingerprint}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "6px 12px 6px 0", color: "var(--muted)", whiteSpace: "nowrap" }}>Signing key ID</td>
                      <td><code>{keyState.signingKeyId}</code></td>
                    </tr>
                    <tr>
                      <td style={{ padding: "6px 12px 6px 0", color: "var(--muted)", whiteSpace: "nowrap" }}>Signing fingerprint (SHA-256)</td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85em", wordBreak: "break-all" }}>{keyState.signingFingerprint}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="muted" style={{ fontSize: "0.85em" }}>
                Private keys are stored in IndexedDB in this browser only. They are NOT on the server.
              </p>
              <button className="button" style={{ background: "var(--danger)", width: "fit-content" }} onClick={() => void handleReset()}>
                Revoke and Clear Keys
              </button>
            </div>
          ) : keyState !== null ? (
            <div className="stack">
              <p>No keys registered for this browser session. Generate a key pair to upload or download encrypted files.</p>
              <button
                className="button"
                style={{ width: "fit-content" }}
                disabled={status === "generating"}
                onClick={() => void handleGenerate()}
              >
                {status === "generating" ? "Generating RSA-2048 key pairs…" : "Generate and Register Key Pair"}
              </button>
              {status === "error" && <p style={{ color: "var(--danger)" }}>{errorMsg}</p>}
            </div>
          ) : null}
        </section>

        <section className="panel stack">
          <h3>Security Notes</h3>
          <ul className="stack" style={{ paddingLeft: "20px", fontSize: "0.9em" }}>
            <li>RSA-OAEP-SHA256 (2048-bit) is used to wrap the per-file AES-256-GCM key for each recipient.</li>
            <li>RSA-PSS-SHA256 (2048-bit) is used to sign the file manifest for non-repudiation.</li>
            <li>Private keys are stored in IndexedDB using the extractable=false flag where possible, and remain browser-local.</li>
            <li>Key fingerprints are SHA-256 hashes of the public key SPKI bytes — independently verifiable.</li>
            <li>If you clear your browser storage or switch devices, you must re-generate keys. Previous encrypted files cannot be decrypted without the private key.</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
