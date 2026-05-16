"use client";

import { hasPermission, type Permission } from "@/lib/rbac/policies";
import { useAuth } from "@/features/auth/auth-provider";

export function RequirePermission({
  permission,
  children
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user || !hasPermission(user.roles, permission)) {
    return null;
  }

  return <>{children}</>;
}

