"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearTokenPair, getAccessToken, setTokenPair } from "@/lib/auth/token-store";
import type { CurrentUser } from "@/types/auth";
import { requestCurrentUser, requestTokenPair } from "./auth-api";

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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      async login(username, password) {
        const tokens = await requestTokenPair(username, password);
        setTokenPair(tokens.access, tokens.refresh);
        setAccessToken(tokens.access);
        setUser(await requestCurrentUser(tokens.access));
        router.push("/dashboard");
      },
      logout() {
        clearTokenPair();
        setAccessToken(null);
        setUser(null);
        router.push("/login");
      }
    }),
    [accessToken, router, user]
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

