"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Lock, LayoutDashboard, KeyRound, FileUp,
  BookOpen, ClipboardList, ShieldCheck, LogOut,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";

const navItems = [
  { href: "/dashboard",   label: "Dashboard",  icon: LayoutDashboard },
  { href: "/keys",        label: "My Keys",     icon: KeyRound },
  { href: "/submissions", label: "Submissions", icon: FileUp },
  { href: "/rubrics",     label: "Rubrics",     icon: BookOpen },
  { href: "/evaluations", label: "Evaluations", icon: ClipboardList },
  { href: "/audit",       label: "Audit Log",   icon: ShieldCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initial = user?.username?.[0]?.toUpperCase() ?? "?";
  const primaryRole = user?.roles?.[0] ?? "";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Lock size={16} color="white" />
          </div>
          <div>
            <div className="sidebar-logo-title">SecureEval</div>
            <div className="sidebar-logo-sub">E2E Encrypted</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item${pathname === href ? " active" : ""}`}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>

        <div className="sidebar-footer">
          {user && (
            <div className="user-chip">
              <div className="user-avatar">{initial}</div>
              <div className="min-w-0">
                <div className="user-name truncate">{user.username}</div>
                <div className="user-role">{primaryRole}</div>
              </div>
            </div>
          )}
          <button className="btn-logout" onClick={logout}>
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
