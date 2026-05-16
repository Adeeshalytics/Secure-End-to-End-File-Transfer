export type Role =
  | "student"
  | "examiner"
  | "project_evaluator"
  | "course_admin"
  | "system_admin"
  | "ai_examiner_service";

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  roles: Role[];
}

export interface TokenPair {
  access: string;
  refresh: string;
}

