const ACCESS_TOKEN_KEY = "secure_eval_access_token";
const REFRESH_TOKEN_KEY = "secure_eval_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setTokenPair(access: string, refresh: string): void {
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, access);
  window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokenPair(): void {
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

