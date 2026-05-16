import { AppShell } from "@/components/layout/app-shell";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="stack">
        <h2>Dashboard</h2>
        <section className="panel">
          <h3>Security posture</h3>
          <p className="muted">
            The frontend will own plaintext, private keys, encryption, signing, and verification. The backend stores
            metadata, signatures, wrapped keys, and ciphertext references only.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

