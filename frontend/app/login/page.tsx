"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";

const DEMO_ACCOUNTS = [
  { username: "alice", role: "Student", password: "DemoPassword1!" },
  { username: "bob", role: "Examiner", password: "DemoPassword1!" },
  { username: "admin", role: "Course Admin", password: "DemoPassword1!" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(u: string, p: string) {
    setLoading(true);
    setError("");
    try {
      await login(u, p);
    } catch {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="content" style={{ display: "flex", justifyContent: "center", paddingTop: "80px" }}>
      <div className="stack" style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ margin: "0 0 4px" }}>Secure Eval</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.9em" }}>End-to-end encrypted academic file exchange</p>
        </div>

        <form
          className="panel stack"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit(username, password);
          }}
        >
          <h2 style={{ margin: 0 }}>Sign in</h2>
          <label className="stack" style={{ fontSize: "0.9em" }}>
            Username
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </label>
          <label className="stack" style={{ fontSize: "0.9em" }}>
            Password
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.9em" }}>{error}</p>}
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <section className="panel stack">
          <h3 style={{ margin: 0, fontSize: "0.9em", color: "var(--muted)" }}>Demo Accounts</h3>
          <p style={{ margin: 0, fontSize: "0.82em", color: "var(--muted)" }}>Password for all: <code>DemoPassword1!</code></p>
          <div className="stack" style={{ gap: "6px" }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.username}
                onClick={() => {
                  setUsername(acc.username);
                  setPassword(acc.password);
                  void handleSubmit(acc.username, acc.password);
                }}
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "0.88em",
                }}
              >
                <strong>{acc.username}</strong> — {acc.role}
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
