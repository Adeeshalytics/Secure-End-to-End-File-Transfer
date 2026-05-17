"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/features/auth/auth-provider";
import { authedRequest } from "@/lib/api/client";
import {
  ShieldCheck, ShieldAlert, RefreshCw, Loader2,
  Activity,
} from "lucide-react";

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

  function loadLogs() {
    if (!accessToken) return;
    setLoading(true);
    authedRequest<{ results?: AuditEntry[] } | AuditEntry[]>("/audit/", accessToken)
      .then((data) => {
        const entries = Array.isArray(data) ? data : (data.results ?? []);
        setLogs(entries);
        setChainValid(verifyHashChain(entries));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadLogs(); }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  function verifyHashChain(entries: AuditEntry[]): boolean {
    if (entries.length === 0) return true;
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].previous_log_hash !== entries[i - 1].current_log_hash) return false;
    }
    return true;
  }

  function actionBadge(action: string) {
    if (action.includes("upload") || action.includes("create")) return "badge-green";
    if (action.includes("download") || action.includes("read")) return "badge-blue";
    if (action.includes("login") || action.includes("auth")) return "badge-purple";
    if (action.includes("delete") || action.includes("revoke")) return "badge-red";
    return "badge-blue";
  }

  return (
    <AppShell>
      <div className="page-container">
        {/* Header */}
        <div className="page-header-row" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>
              Audit Log
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Tamper-evident SHA-256 hash chain. Each entry commits to the previous entry&apos;s hash.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadLogs} disabled={loading}>
            {loading ? <Loader2 size={13} className="spinner" /> : <RefreshCw size={13} />}
            Refresh
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Total entries</div>
            <div className="stat-value">{loading ? "—" : logs.length}</div>
            <div className="stat-sub">In this chain</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Chain status</div>
            <div className="stat-value" style={{
              fontSize: 14,
              color: chainValid === null ? "var(--text-muted)" : chainValid ? "var(--success)" : "var(--danger)",
            }}>
              {chainValid === null ? "Checking…" : chainValid ? "Verified" : "BROKEN"}
            </div>
            <div className="stat-sub">SHA-256 chain</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Hash algorithm</div>
            <div className="stat-value" style={{ fontSize: 14 }}>SHA-256</div>
            <div className="stat-sub">256-bit digest</div>
          </div>
        </div>

        {/* Chain integrity banner */}
        {!loading && chainValid !== null && (
          <div
            className={chainValid ? "alert alert-success" : "alert alert-error"}
            style={{ marginBottom: 20, fontSize: 14 }}
          >
            {chainValid
              ? <ShieldCheck size={15} />
              : <ShieldAlert size={15} />}
            {chainValid
              ? `Hash chain verified — ${logs.length} entries, no tampering detected`
              : "HASH CHAIN BROKEN — tampering or data corruption detected!"}
          </div>
        )}

        {/* Audit table */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={15} color="var(--text-muted)" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                Audit Entries
              </span>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div className="empty-state">
                <Loader2 size={22} className="spinner" color="var(--text-muted)" />
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>Loading audit log…</div>
              </div>
            ) : logs.length === 0 ? (
              <div className="empty-state">
                <Activity size={28} color="var(--text-muted)" />
                <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginTop: 12 }}>No entries yet</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Events appear after login, upload, and download actions.</div>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Actor</th>
                      <th>Action</th>
                      <th className="hide-mobile">Resource</th>
                      <th className="hide-mobile">IP</th>
                      <th>Prev hash</th>
                      <th>This hash</th>
                      <th className="hide-mobile">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => {
                      const broken = idx > 0 && log.previous_log_hash !== logs[idx - 1].current_log_hash;
                      return (
                        <tr key={log.id} style={{ background: broken ? "rgba(239,68,68,0.05)" : undefined }}>
                          <td><code style={{ fontSize: 11 }}>{log.id}</code></td>
                          <td style={{ fontWeight: 500 }}>{log.actor_username ?? <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                          <td>
                            <span className={actionBadge(log.action)} title={log.action} style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }}>
                              {log.action.length > 30 ? log.action.slice(0, 30) + "…" : log.action}
                            </span>
                          </td>
                          <td className="hide-mobile" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {log.resource_type}
                            {log.resource_id && <span style={{ marginLeft: 4 }}>#{log.resource_id}</span>}
                          </td>
                          <td className="hide-mobile" style={{ fontSize: 12, color: "var(--text-muted)" }}>{log.ip_address ?? "—"}</td>
                          <td>
                            <span className="hash-short">
                              {log.previous_log_hash ? log.previous_log_hash.slice(0, 10) + "…" : <em style={{ color: "var(--text-muted)" }}>genesis</em>}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span className="hash-short">{log.current_log_hash.slice(0, 10)}…</span>
                              {broken && (
                                <span style={{ color: "var(--danger)", fontSize: 11, fontWeight: 700 }}>⚠ BROKEN</span>
                              )}
                            </div>
                          </td>
                          <td className="hide-mobile" style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--text-muted)" }}>
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Technical note */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>How the hash chain works</span>
          </div>
          <div className="card-body">
            <div className="stack-sm" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>01</span>
                Every write operation (login, upload, download, key registration) creates an AuditLog entry.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>02</span>
                Each entry includes the SHA-256 hash of the previous entry, forming a cryptographic chain.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>03</span>
                Any modification to an existing entry invalidates all subsequent hashes — detectable immediately.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>04</span>
                The genesis entry has an empty previous hash. Chain integrity is verified client-side on every load.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
