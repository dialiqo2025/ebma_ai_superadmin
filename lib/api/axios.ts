import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getStoredToken } from "@/lib/auth/storage";
import { ApiError } from "./errors";
import type { ApiErrorResponse } from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "https://ebma-ai-backend.onrender.com/api/v1";

export type ApiRequestConfig = InternalAxiosRequestConfig & {
  authProtected?: boolean;
};

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

export function clearSessionOnUnauthorized() {
  onUnauthorized?.();
}

export function shouldClearSession(status: number, message: string) {
  if (status !== 401 && status !== 403) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("logged out") ||
    lower.includes("invalid token") ||
    lower.includes("unauthorized") ||
    lower.includes("token expired") ||
    lower.includes("jwt") ||
    lower.includes("session")
  );
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const cfg = config as ApiRequestConfig;

  if (cfg.authProtected && !cfg.headers?.Authorization) {
    const token = getStoredToken();
    if (token) {
      cfg.headers.set("Authorization", token);
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status ?? 0;
    const message = error.response?.data?.message || error.message || "Request failed";
    const config = error.config as ApiRequestConfig | undefined;

    if (config?.authProtected && shouldClearSession(status, message)) {
      clearSessionOnUnauthorized();
    }

    return Promise.reject(error);
  },
);

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const payload = error.response?.data as ApiErrorResponse | undefined;

    if (payload && typeof payload === "object") {
      return new ApiError(status, {
        success: false,
        message: payload.message || error.message || "Request failed",
        data: payload.data ?? null,
      });
    }

    return new ApiError(status, {
      success: false,
      message: error.message || "Request failed",
      data: null,
    });
  }

  return new ApiError(0, {
    success: false,
    message: error instanceof Error ? error.message : "Request failed",
    data: null,
  });
}
