const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001/api/v1";

const ACCESS_KEY  = "secure_eval_access_token";
const REFRESH_KEY = "secure_eval_refresh_token";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: unknown,
  ) {
    super(message);
  }
}

// ── Token helpers (duplicated here to avoid circular imports) ─────────────────
function storedAccess(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACCESS_KEY);
}
function storedRefresh(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(REFRESH_KEY);
}
function saveAccess(token: string) {
  sessionStorage.setItem(ACCESS_KEY, token);
}

// ── One-shot token refresh (called automatically on 401) ──────────────────────
let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  // Deduplicate: if a refresh is already in flight, wait for it
  if (refreshing) return refreshing;

  refreshing = (async () => {
    const refresh = storedRefresh();
    if (!refresh) throw new Error("No refresh token — please log in again.");

    const res = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
      // Refresh token itself is expired — clear everything
      sessionStorage.removeItem(ACCESS_KEY);
      sessionStorage.removeItem(REFRESH_KEY);
      throw new Error("Session expired — please log in again.");
    }

    const data = (await res.json()) as { access: string };
    saveAccess(data.access);
    return data.access;
  })().finally(() => { refreshing = null; });

  return refreshing;
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function rawFetch(url: string, options: RequestInit): Promise<Response> {
  const res = await fetch(url, options);

  // If 401 and we have a refresh token, try once to get a new access token
  if (res.status === 401) {
    const authHeader = (options.headers as Record<string, string>)?.["Authorization"];
    if (authHeader?.startsWith("Bearer ") && storedRefresh()) {
      const newToken = await refreshAccessToken();

      // Rebuild headers with the new token
      const retryHeaders = { ...(options.headers as Record<string, string>), Authorization: `Bearer ${newToken}` };
      return fetch(url, { ...options, headers: retryHeaders });
    }
  }

  return res;
}

async function parseResponse<T>(res: Response, errorLabel: string): Promise<T> {
  const payload = res.headers.get("content-type")?.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) throw new ApiError(errorLabel, res.status, payload);
  return payload as T;
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await rawFetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return parseResponse<T>(res, "API request failed");
}

export async function authedRequest<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  // Always use the freshest token from storage (may have been refreshed)
  const token = storedAccess() ?? accessToken;
  const res = await rawFetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  return parseResponse<T>(res, "API request failed");
}

export async function authedMultipartRequest<T>(
  path: string,
  accessToken: string,
  formData: FormData,
): Promise<T> {
  const token = storedAccess() ?? accessToken;
  const res = await rawFetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return parseResponse<T>(res, "Upload failed");
}
