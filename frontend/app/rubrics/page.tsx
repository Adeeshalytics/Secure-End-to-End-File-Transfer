"use client";

import { AppShell } from "@/components/layout/app-shell";

export default function RubricsPage() {
  return (
    <AppShell>
      <div className="stack">
        <h2>Rubrics</h2>
        <section className="panel">
          <p className="muted">Examiner rubric upload will use the same ciphertext-only file contract.</p>
        </section>
      </div>
    </AppShell>
  );
}

