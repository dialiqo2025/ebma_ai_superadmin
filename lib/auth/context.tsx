"use client";

import { setUnauthorizedHandler } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearSession,
  getStoredToken,
  getStoredUser,
  persistSession,
} from "./storage";
import type { AuthUser } from "./types";

type AuthContextValue = {
  ready: boolean;
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setSession: (token: string, user: AuthUser) => void;
  logout: (redirectToSignIn?: boolean) => void;
  displayName: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function formatDisplayName(user: AuthUser | null) {
  if (!user) return "Builder";
  if (user.fullName?.trim()) return user.fullName.trim();
  const fromEmail = user.email?.split("@")[0] || "Builder";
  return fromEmail
    .replace(/[._-]+/g, " ")
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const logout = useCallback(
    (redirectToSignIn = true) => {
      clearSession();
      setToken(null);
      setUser(null);
      if (redirectToSignIn) router.replace("/");
    },
    [router],
  );

  const setSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    persistSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  useEffect(() => {
    setToken(getStoredToken());
    setUser(getStoredUser());
    setReady(true);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => logout(true));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      token,
      user,
      isAuthenticated: Boolean(token && user),
      setSession,
      logout,
      displayName: formatDisplayName(user),
    }),
    [ready, token, user, setSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
