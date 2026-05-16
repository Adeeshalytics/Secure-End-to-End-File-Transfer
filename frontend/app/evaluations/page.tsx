"use client";

import { AppShell } from "@/components/layout/app-shell";

export default function EvaluationsPage() {
  return (
    <AppShell>
      <div className="stack">
        <h2>Evaluations</h2>
        <section className="panel">
          <p className="muted">Evaluation finalization will require signed manifests and RBAC checks.</p>
        </section>
      </div>
    </AppShell>
  );
}

