"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/features/auth/auth-provider";
import { authedRequest } from "@/lib/api/client";

interface AuditEntry {
  id: number;
  actor_username: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  ip_address: string | null;
  previous_log_hash: string;
  current_log_hash: string;
  created_at: string;
}

export default function AuditPage() {
  const { accessToken } = useAuth();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [chainValid, setChainValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    authedRequest<{ results?: AuditEntry[] } | AuditEntry[]>("/audit/", accessToken)
      .then((data) => {
        const entries = Array.isArray(data) ? data : (data.results ?? []);
        setLogs(entries);
        setChainValid(verifyHashChain(entries));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [accessToken]);

  function verifyHashChain(entries: AuditEntry[]): boolean {
    if (entries.length === 0) return true;
    // Verify that each entry's previous_log_hash matches the prior entry's current_log_hash
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].previous_log_hash !== entries[i - 1].current_log_hash) return false;
    }
    return true;
  }

  return (
    <AppShell>
      <div className="stack">
        <h2>Tamper-Evident Audit Log</h2>

        <section className="panel stack">
          <p className="muted" style={{ fontSize: "0.9em" }}>
            Every write operation is recorded with a SHA-256 hash chain. Each entry includes the previous entry&apos;s
            hash, making any tampering detectable. This provides non-repudiation of academic workflow events.
          </p>

          {loading ? (
            <p className="muted">Loading audit log…</p>
          ) : (
            <>
              <div
                className="panel"
                style={{
                  background: chainValid ? "#f0fdf4" : "#fff5f5",
                  borderColor: chainValid ? "#16a34a" : "var(--danger)",
                }}
              >
                <strong style={{ color: chainValid ? "#16a34a" : "var(--danger)" }}>
                  {chainValid
                    ? `Hash chain verified — ${logs.length} entries, no tampering detected`
                    : "HASH CHAIN BROKEN — tampering detected!"}
                </strong>
              </div>

              {logs.length === 0 ? (
                <p className="muted">No audit entries yet. Events appear here after login/upload actions.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82em" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border)" }}>
                        {["#", "Actor", "Action", "IP", "Prev Hash", "This Hash", "Time"].map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: "6px 10px 6px 0", color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, idx) => {
                        const broken = idx > 0 && log.previous_log_hash !== logs[idx - 1].current_log_hash;
                        return (
                          <tr
                            key={log.id}
                            style={{
                              borderBottom: "1px solid var(--border)",
                              background: broken ? "#fff5f5" : "transparent",
                            }}
                          >
                            <td style={{ padding: "5px 10px 5px 0" }}>{log.id}</td>
                            <td style={{ padding: "5px 10px 5px 0" }}>{log.actor_username ?? "—"}</td>
                            <td style={{ padding: "5px 10px 5px 0", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.action}>{log.action}</td>
                            <td style={{ padding: "5px 10px 5px 0" }}>{log.ip_address ?? "—"}</td>
                            <td style={{ padding: "5px 10px 5px 0", fontFamily: "monospace", fontSize: "0.85em" }}>
                              {log.previous_log_hash ? log.previous_log_hash.slice(0, 12) + "…" : "genesis"}
                            </td>
                            <td style={{ padding: "5px 10px 5px 0", fontFamily: "monospace", fontSize: "0.85em" }}>
                              {log.current_log_hash.slice(0, 12)}…
                              {broken && <span style={{ color: "var(--danger)", marginLeft: 4 }}>⚠ BROKEN</span>}
                            </td>
                            <td style={{ padding: "5px 10px 5px 0", whiteSpace: "nowrap" }}>
                              {new Date(log.created_at).toLocaleTimeString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
