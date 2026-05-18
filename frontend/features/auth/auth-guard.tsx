"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/types/auth";
import { useAuth } from "./auth-provider";

export function AuthGuard({
  allowedRoles,
  children
}: {
  allowedRoles?: Role[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const hasAllowedRole = !allowedRoles?.length || user?.roles.some((role) => allowedRoles.includes(role));

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!hasAllowedRole) {
      router.replace("/dashboard");
    }
  }, [hasAllowedRole, isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <main className="content">Checking session...</main>;
  }

  if (!isAuthenticated || !hasAllowedRole) {
    return <main className="content">Redirecting...</main>;
  }

  return <>{children}</>;
}
