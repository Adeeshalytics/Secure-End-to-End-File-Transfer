import { apiRequest } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/pagination";
import type { SecureFileRecord } from "@/types/files";

export function listFiles(accessToken: string): Promise<PaginatedResponse<SecureFileRecord>> {
  return apiRequest<PaginatedResponse<SecureFileRecord>>("/files/", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}
