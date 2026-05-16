import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/submissions", label: "Submissions" },
  { href: "/rubrics", label: "Rubrics" },
  { href: "/evaluations", label: "Evaluations" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="shell">
      <aside className="sidebar stack">
        <div>
          <ShieldCheck size={28} aria-hidden />
          <h1>Secure Eval</h1>
          <p className="muted">Ciphertext-only academic workflows.</p>
        </div>
        <nav className="stack">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="content">{children}</section>
    </main>
  );
}

