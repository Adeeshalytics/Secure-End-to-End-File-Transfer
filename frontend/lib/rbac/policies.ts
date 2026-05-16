import type { Role } from "@/types/auth";

export type Permission =
  | "submission:create"
  | "submission:read"
  | "rubric:create"
  | "rubric:read"
  | "evaluation:create"
  | "evaluation:finalize"
  | "audit:read"
  | "keys:manage";

const rolePermissions: Record<Role, Permission[]> = {
  student: ["submission:create", "submission:read", "keys:manage"],
  examiner: ["submission:read", "rubric:create", "rubric:read", "evaluation:create", "evaluation:finalize", "keys:manage"],
  project_evaluator: ["submission:read", "rubric:read", "evaluation:create", "evaluation:finalize", "keys:manage"],
  course_admin: ["submission:read", "rubric:read", "evaluation:create", "audit:read", "keys:manage"],
  system_admin: ["submission:read", "rubric:read", "evaluation:create", "audit:read", "keys:manage"],
  ai_examiner_service: ["submission:read", "rubric:read", "evaluation:create"]
};

export function hasPermission(roles: Role[], permission: Permission): boolean {
  return roles.some((role) => rolePermissions[role]?.includes(permission));
}

