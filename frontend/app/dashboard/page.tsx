"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/features/auth/auth-provider";
import { checkKeyState, type KeyState } from "@/features/crypto/key-lifecycle";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const [keyState, setKeyState] = useState<KeyState | null>(null);

  useEffect(() => {
    checkKeyState().then(setKeyState).catch(console.error);
  }, []);

  return (
    <AppShell>
      <div className="stack">
        <h2>Dashboard</h2>

        <section className="panel stack">
          <h3>Cryptographic Status</h3>
          <div style={{ display: "grid", gap: "8px" }}>
            <StatusRow
              label="Private key pair"
              ok={keyState?.hasKeys ?? false}
              okText="Loaded from IndexedDB"
              failText={<><span>Not present. </span><Link href="/keys" style={{ color: "var(--accent)" }}>Generate keys →</Link></>}
            />
            <StatusRow
              label="Encryption algorithm"
              ok={true}
              okText="AES-256-GCM (browser Web Crypto API)"
            />
            <StatusRow
              label="Key wrapping"
              ok={true}
              okText="RSA-OAEP-SHA256 (2048-bit)"
            />
            <StatusRow
              label="Signing"
              ok={true}
              okText="RSA-PSS-SHA256 (2048-bit)"
            />
            <StatusRow
              label="Integrity hashing"
              ok={true}
              okText="SHA-256 on plaintext + ciphertext"
            />
            <StatusRow
              label="Server sees plaintext?"
              ok={true}
              okText="No — ciphertext only"
            />
          </div>
          {keyState?.encryptionFingerprint && (
            <div style={{ fontSize: "0.82em", color: "var(--muted)", marginTop: "4px" }}>
              Encryption key fingerprint: <code>{keyState.encryptionFingerprint.slice(0, 32)}…</code>
            </div>
          )}
        </section>

        <section className="panel stack">
          <h3>Security Architecture</h3>
          <ul style={{ paddingLeft: "20px", fontSize: "0.9em" }} className="stack">
            <li><strong>Browser trust boundary:</strong> plaintext, private keys, signing, encryption, decryption.</li>
            <li><strong>Django API:</strong> authentication (JWT), RBAC, metadata validation — no plaintext.</li>
            <li><strong>PostgreSQL:</strong> metadata, wrapped keys, signatures, audit chain — no plaintext.</li>
            <li><strong>Filesystem storage:</strong> AES-256-GCM ciphertext only.</li>
          </ul>
        </section>

        {user && (
          <section className="panel">
            <h3>Logged in as: {user.username}</h3>
            <p className="muted" style={{ fontSize: "0.9em" }}>Roles: {user.roles.join(", ")}</p>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function StatusRow({
  label,
  ok,
  okText,
  failText,
}: {
  label: string;
  ok: boolean;
  okText: React.ReactNode;
  failText?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "12px", fontSize: "0.9em" }}>
      <span
        style={{
          display: "inline-block",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: ok ? "#16a34a" : "var(--danger)",
          flexShrink: 0,
          marginTop: "3px",
        }}
      />
      <span style={{ color: "var(--muted)", minWidth: "190px" }}>{label}</span>
      <span>{ok ? okText : (failText ?? <span style={{ color: "var(--danger)" }}>Not configured</span>)}</span>
    </div>
  );
}
