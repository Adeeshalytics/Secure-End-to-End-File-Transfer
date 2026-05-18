"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Lock, LayoutDashboard, KeyRound, FileUp,
  BookOpen, ClipboardList, ShieldCheck, LogOut, X,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = sidebarOpen ? "hidden" : "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const initial = user?.username?.[0]?.toUpperCase() ?? "?";
  const primaryRole = user?.roles?.[0] ?? "";

  // Role-based avatar colour — matches the login page demo accounts
  const avatarColor =
    primaryRole === "examiner" || primaryRole === "project_evaluator" ? "#ea580c" :  // orange (Bob)
    primaryRole === "course_admin" || primaryRole === "system_admin"  ? "#059669" :  // green  (Admin)
                                                                        "#7c3aed";   // purple (Alice / student)

  // Role-based sidebar theme — distinct background per role so both demo windows
  // are visually unambiguous at a glance. CSS variables propagate to .sidebar,
  // .mobile-header, .nav-item, .sidebar-logo-icon, etc.
  const shellStyle = (() => {
    if (primaryRole === "examiner" || primaryRole === "project_evaluator") {
      return {
        // Material light blue — high-contrast, clearly distinguishable from Alice's dark theme
        "--sidebar-bg": "#2196F3",
        "--sidebar-border": "rgba(255,255,255,0.2)",
        "--sidebar-text": "rgba(255,255,255,0.78)",
        "--sidebar-text-active": "#ffffff",
        "--sidebar-hover": "rgba(255,255,255,0.14)",
        "--sidebar-active-bg": "rgba(255,255,255,0.22)",
        "--sidebar-active-text": "#ffffff",
      } as React.CSSProperties;
    }
    if (primaryRole === "course_admin" || primaryRole === "system_admin") {
      return {
        // Dark emerald — distinct from both Alice (dark slate) and Bob (Material blue)
        "--sidebar-bg": "#064e3b",
        "--sidebar-border": "rgba(255,255,255,0.12)",
      } as React.CSSProperties;
    }
    // Student (Alice) — keep the default dark slate from globals.css
    return undefined;
  })();

  const SidebarContent = () => (
    <>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Lock size={16} color="white" />
        </div>
        <div>
          <div className="sidebar-logo-title">SecureEval</div>
          <div className="sidebar-logo-sub">E2E Encrypted</div>
        </div>
        {/* Close button visible only on mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          style={{
            marginLeft: "auto", background: "none", border: "none",
            color: "var(--sidebar-text)", cursor: "pointer", padding: 4,
            borderRadius: 6, display: "flex", alignItems: "center",
          }}
          className="mobile-close-btn"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
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
            <div className="user-avatar" style={{ background: avatarColor }}>{initial}</div>
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
    </>
  );

  return (
    <div className="shell" style={shellStyle}>
      {/* ── Mobile header bar ───────────────────────────────────────────────── */}
      <header className="mobile-header">
        <div className="mobile-header-logo">
          <div className="mobile-header-logo-icon">
            <Lock size={14} color="white" />
          </div>
          SecureEval
        </div>
        <button
          className={`hamburger${sidebarOpen ? " open" : ""}`}
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {/* ── Sidebar backdrop (mobile) ────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          style={{ display: "block" }}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <SidebarContent />
      </aside>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="main-content">{children}</main>
    </div>
  );
}
