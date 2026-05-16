"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/keys", label: "Keys" },
  { href: "/submissions", label: "Submissions" },
  { href: "/rubrics", label: "Rubrics" },
  { href: "/evaluations", label: "Evaluations" },
  { href: "/audit", label: "Audit Log" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <main className="shell">
      <aside className="sidebar stack">
        <div>
          <ShieldCheck size={28} aria-hidden />
          <h1 style={{ marginTop: "8px", marginBottom: "4px" }}>Secure Eval</h1>
          <p className="muted" style={{ fontSize: "0.85em", margin: 0 }}>Ciphertext-only academic workflows.</p>
        </div>

        <nav className="stack" style={{ gap: "4px" }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "8px 10px",
                borderRadius: "6px",
                background: pathname === item.href ? "var(--accent)" : "transparent",
                color: pathname === item.href ? "white" : "inherit",
                fontSize: "0.9em",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
          {user && (
            <p style={{ fontSize: "0.85em", color: "var(--muted)", margin: "0 0 8px" }}>
              <strong>{user.username}</strong><br />
              {user.roles.join(", ")}
            </p>
          )}
          <button
            onClick={logout}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: "0.85em",
              width: "100%",
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <section className="content">{children}</section>
    </main>
  );
}
