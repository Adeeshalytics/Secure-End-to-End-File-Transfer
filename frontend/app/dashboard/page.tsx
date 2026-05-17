"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/features/auth/auth-provider";
import { checkKeyState, type KeyState } from "@/features/crypto/key-lifecycle";
import {
  ShieldCheck, ShieldAlert, KeyRound, Lock, Database,
  Server, Globe, ArrowRight, CheckCircle2, XCircle,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const [keyState, setKeyState] = useState<KeyState | null>(null);

  useEffect(() => {
    checkKeyState().then(setKeyState).catch(console.error);
  }, []);

  const hasKeys = keyState?.hasKeys ?? false;
  const primaryRole = user?.roles?.[0] ?? "";

  return (
    <AppShell>
      <div className="page-container">
        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Dashboard
            </h1>
            <span className={`badge-${primaryRole === "student" ? "blue" : primaryRole === "examiner" ? "green" : "purple"}`}>
              {primaryRole || "user"}
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
            Welcome back, <strong>{user?.username}</strong>. All cryptographic operations run in your browser.
          </p>
        </div>

        {/* Key status alert */}
        {keyState !== null && !hasKeys && (
          <div className="alert alert-warning" style={{ marginBottom: 20 }}>
            <ShieldAlert size={15} />
            <span>
              No RSA key pair found in this browser.{" "}
              <Link href="/keys" style={{ color: "var(--warning)", fontWeight: 600, textDecoration: "underline" }}>
                Generate keys →
              </Link>{" "}
              before uploading or downloading files.
            </span>
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Encryption</div>
            <div className="stat-value">AES-256-GCM</div>
            <div className="stat-sub">Browser-only</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Key Wrapping</div>
            <div className="stat-value">RSA-OAEP</div>
            <div className="stat-sub">2048-bit keys</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Signatures</div>
            <div className="stat-value">RSA-PSS</div>
            <div className="stat-sub">SHA-256, 32-byte salt</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Key Storage</div>
            <div className="stat-value" style={{ fontSize: 15 }}>IndexedDB</div>
            <div className="stat-sub">Never transmitted</div>
          </div>
        </div>

        <div className="arch-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {/* Crypto status */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {hasKeys
                  ? <ShieldCheck size={16} color="var(--success)" />
                  : <ShieldAlert size={16} color="var(--warning)" />}
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  Cryptographic Status
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="stack-sm">
                <StatusRow ok={hasKeys} label="RSA key pair">
                  {hasKeys ? "Loaded from IndexedDB" : <Link href="/keys" style={{ color: "var(--accent)" }}>Generate keys →</Link>}
                </StatusRow>
                <StatusRow ok label="File encryption">AES-256-GCM (Web Crypto API)</StatusRow>
                <StatusRow ok label="Key wrapping">RSA-OAEP-SHA256</StatusRow>
                <StatusRow ok label="Manifest signing">RSA-PSS-SHA256</StatusRow>
                <StatusRow ok label="Integrity check">SHA-256 (plaintext + cipher)</StatusRow>
                <StatusRow ok label="Server sees plaintext">No — ciphertext only</StatusRow>
              </div>

              {keyState?.encryptionFingerprint && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Encryption key fingerprint
                  </div>
                  <div className="fingerprint">{keyState.encryptionFingerprint}</div>
                </div>
              )}
            </div>
          </div>

          {/* Trust boundary */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Lock size={16} color="var(--accent)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  Security Architecture
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="stack-sm">
                <TrustZone icon={Globe} label="Your Browser" color="#2563eb" description="Plaintext · Private keys · Encrypt · Decrypt · Sign" />
                <div style={{ display: "flex", justifyContent: "center", color: "var(--text-muted)" }}>
                  <ArrowRight size={14} />
                </div>
                <TrustZone icon={Server} label="Django API" color="#7c3aed" description="JWT auth · RBAC · Metadata · No plaintext" />
                <div style={{ display: "flex", justifyContent: "center", color: "var(--text-muted)" }}>
                  <ArrowRight size={14} />
                </div>
                <TrustZone icon={Database} label="Storage" color="#0284c7" description="Ciphertext blobs · Wrapped keys · Audit chain" />
              </div>

              <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["AES-256-GCM", "RSA-OAEP", "RSA-PSS", "SHA-256", "JWT"].map((alg) => (
                  <span key={alg} className="crypto-tag">{alg}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Account info */}
        {user && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                Session
              </span>
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-row">
                  <span className="info-key">Username</span>
                  <span className="info-value">{user.username}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Roles</span>
                  <span className="info-value" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {user.roles.map((r) => (
                      <span key={r} className="badge-blue">{r}</span>
                    ))}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-key">Key state</span>
                  <span className="info-value" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {hasKeys
                      ? <><CheckCircle2 size={13} color="var(--success)" /> Ready</>
                      : <><XCircle size={13} color="var(--danger)" /> No keys</>}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-key">Token storage</span>
                  <span className="info-value">sessionStorage (tab-scoped)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatusRow({ ok, label, children }: { ok: boolean; label: string; children: React.ReactNode }) {
  return (
    <div className="status-row">
      {ok
        ? <CheckCircle2 size={13} color="var(--success)" style={{ flexShrink: 0, marginTop: 1 }} />
        : <XCircle size={13} color="var(--danger)" style={{ flexShrink: 0, marginTop: 1 }} />}
      <span style={{ color: "var(--text-muted)", minWidth: 160, fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{children}</span>
    </div>
  );
}

function TrustZone({
  icon: Icon, label, color, description,
}: { icon: React.ElementType; label: string; color: string; description: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", background: "var(--bg)", borderRadius: 6 }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: color + "1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={14} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{description}</div>
      </div>
    </div>
  );
}
