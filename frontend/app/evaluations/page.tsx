"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ClipboardList, Lock, ShieldCheck, FileText } from "lucide-react";

const PLANNED_FEATURES = [
  {
    icon: FileText,
    title: "Encrypted Evaluation Forms",
    description: "Examiners fill in structured evaluation forms that are AES-256-GCM encrypted before submission.",
  },
  {
    icon: Lock,
    title: "Per-Submission Score Wrapping",
    description: "Numeric scores are RSA-OAEP wrapped so only the student and course admin can read the result.",
  },
  {
    icon: ShieldCheck,
    title: "Signed Grade Records",
    description: "Each evaluation is RSA-PSS signed by the examiner's registered key, providing non-repudiation.",
  },
  {
    icon: ClipboardList,
    title: "Audit-Linked Events",
    description: "Every evaluation action is appended to the tamper-evident SHA-256 audit chain.",
  },
];

export default function EvaluationsPage() {
  return (
    <AppShell>
      <div className="page-container">
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>
            Evaluations
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
            Structured grading with encrypted scores and signed grade records.
          </p>
        </div>

        {/* Coming-soon card */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: "var(--bg)", border: "2px dashed var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <ClipboardList size={22} color="var(--text-muted)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              Evaluations module
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 400, margin: "0 auto 20px" }}>
              This module is planned for a future release. Core crypto infrastructure (AES-256-GCM, RSA-OAEP, RSA-PSS, audit chain) is already in place.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <span className="crypto-tag">AES-256-GCM</span>
              <span className="crypto-tag">RSA-OAEP</span>
              <span className="crypto-tag">RSA-PSS</span>
              <span className="crypto-tag">SHA-256 chain</span>
            </div>
          </div>
        </div>

        {/* Planned features grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {PLANNED_FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card">
              <div className="card-body">
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: "rgba(37,99,235,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Icon size={16} color="var(--accent)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                      {title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                      {description}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
