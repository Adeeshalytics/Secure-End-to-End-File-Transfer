"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearTokenPair, getAccessToken, setTokenPair } from "@/lib/auth/token-store";
import type { CurrentUser } from "@/types/auth";
import { requestCurrentUser, requestTokenPair } from "./auth-api";
import { clearStoredKeyInfo } from "@/features/crypto/key-lifecycle";

interface AuthContextValue {
  user: CurrentUser | null;
  accessToken: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(() => getAccessToken());
  const [user, setUser] = useState<CurrentUser | null>(null);

  // Re-hydrate user from stored token on mount
  useEffect(() => {
    const token = getAccessToken();
    if (token && !user) {
      setAccessToken(token);
      requestCurrentUser(token)
        .then(setUser)
        .catch(() => {
          clearTokenPair();
          setAccessToken(null);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      async login(username, password) {
        const tokens = await requestTokenPair(username, password);
        setTokenPair(tokens.access, tokens.refresh);
        setAccessToken(tokens.access);
        const currentUser = await requestCurrentUser(tokens.access);
        setUser(currentUser);
        router.push("/dashboard");
      },
      logout() {
        clearTokenPair();
        clearStoredKeyInfo();
        setAccessToken(null);
        setUser(null);
        router.push("/login");
      },
    }),
    [accessToken, router, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
