import { apiRequest } from "@/lib/api/client";
import type { CurrentUser, TokenPair } from "@/types/auth";

export function requestTokenPair(username: string, password: string): Promise<TokenPair> {
  return apiRequest<TokenPair>("/auth/token/", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export function requestCurrentUser(accessToken: string): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/auth/me/", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

