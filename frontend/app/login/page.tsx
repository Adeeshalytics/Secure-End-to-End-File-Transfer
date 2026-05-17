"use client";

import { useState } from "react";
import { Lock, ShieldCheck, Key, FileText, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";

const DEMO_ACCOUNTS = [
  { username: "alice", role: "Student",      password: "DemoPassword1!", color: "#7c3aed" },
  { username: "bob",   role: "Examiner",     password: "DemoPassword1!", color: "#ea580c" },
  { username: "admin", role: "Course Admin", password: "DemoPassword1!", color: "#059669" },
];

const FEATURES = [
  { icon: ShieldCheck, text: "AES-256-GCM file encryption — browser-only" },
  { icon: Key,         text: "RSA-OAEP per-recipient key wrapping" },
  { icon: FileText,    text: "RSA-PSS signed manifests for non-repudiation" },
  { icon: ShieldCheck, text: "Tamper-evident SHA-256 audit hash chain" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(u: string, p: string) {
    setLoading(true);
    setError("");
    try {
      await login(u, p);
    } catch {
      setError("Invalid username or password.");
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      {/* Left branding panel */}
      <div className="login-left">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
          <div style={{ width: 36, height: 36, background: "#2563eb", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={18} color="white" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc" }}>SecureEval</span>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f8fafc", lineHeight: 1.25, marginBottom: 12, letterSpacing: "-0.5px" }}>
          End-to-end encrypted<br />academic file exchange
        </h1>
        <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7, marginBottom: 36 }}>
          The server never sees your files. Encryption, signing, and decryption happen entirely in your browser using the Web Crypto API.
        </p>

        <div className="stack-sm">
          {FEATURES.map(({ icon: Icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "#cbd5e1" }}>
              <Icon size={14} color="#3b82f6" style={{ flexShrink: 0 }} />
              {text}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #1e293b" }}>
          <div style={{ display: "flex", gap: 20 }}>
            {["AES-256-GCM", "RSA-OAEP", "RSA-PSS", "SHA-256"].map((alg) => (
              <span key={alg} className="crypto-tag">{alg}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-card-header">
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Sign in to your account</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Enter your credentials to continue</p>
          </div>

          <div className="login-card-body">
            <form
              className="form-grid"
              onSubmit={(e) => { e.preventDefault(); void handleLogin(username, password); }}
            >
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  autoComplete="username"
                  placeholder="e.g. alice"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                />
              </div>

              {error && (
                <div className="alert alert-error" style={{ padding: "8px 12px", fontSize: 13 }}>
                  {error}
                </div>
              )}

              <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
                {loading && <Loader2 size={15} className="spinner" />}
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>

          <div className="login-card-footer" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Demo accounts — click to sign in
            </p>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.username}
                onClick={() => void handleLogin(acc.username, acc.password)}
                disabled={loading}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", cursor: "pointer", textAlign: "left", width: "100%", transition: "background 150ms" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
              >
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: acc.color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {acc.username[0].toUpperCase()}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{acc.username}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{acc.role} · DemoPassword1!</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
