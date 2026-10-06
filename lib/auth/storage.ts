import type { AuthUser } from "./types";

const TOKEN_KEY = "ebma-access-token";
const USER_KEY = "ebma-user";
const RESET_TOKEN_KEY = "ebma-reset-token";
/** Legacy mock session key — cleared on logout */
const LEGACY_SESSION_KEY = "ebma-session";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function persistSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem(LEGACY_SESSION_KEY);
  localStorage.removeItem(RESET_TOKEN_KEY);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_SESSION_KEY);
  localStorage.removeItem(RESET_TOKEN_KEY);
}

export function getResetToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(RESET_TOKEN_KEY);
}

export function setResetToken(token: string) {
  localStorage.setItem(RESET_TOKEN_KEY, token);
}

export function clearResetToken() {
  localStorage.removeItem(RESET_TOKEN_KEY);
}
