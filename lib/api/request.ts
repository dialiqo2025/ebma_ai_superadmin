import {
  api,
  clearSessionOnUnauthorized,
  shouldClearSession,
  toApiError,
  type ApiRequestConfig,
} from "./axios";
import { ApiError } from "./errors";
import type { ApiErrorResponse, ApiResponse } from "./types";

export type RequestOptions = {
  method?: string;
  body?: unknown;
  /** Explicit token (already includes Bearer). Overrides stored token. */
  token?: string | null;
  /** Attach stored access token + clear session on 401/403 */
  auth?: boolean;
  /** Request timeout in ms */
  timeout?: number;
};

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, token, auth = false, timeout }: RequestOptions = {},
): Promise<T> {
  try {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const response = await api.request<ApiResponse<T>>({
      url: path,
      method,
      data: body,
      headers: token ? { Authorization: token } : undefined,
      authProtected: auth,
      timeout,
      // Let the runtime set multipart boundary for FormData (do not force JSON).
      transformRequest: isFormData
        ? [
            (data, headers) => {
              if (headers && typeof (headers as { delete?: (k: string) => void }).delete === "function") {
                (headers as { delete: (k: string) => void }).delete("Content-Type");
              }
              return data;
            },
          ]
        : undefined,
    } as ApiRequestConfig);

    const payload = response.data;

    if (!payload?.success) {
      const error = new ApiError(response.status, {
        success: false,
        message: payload?.message || "Request failed",
        data: payload && "data" in payload ? (payload.data as ApiErrorResponse["data"]) : null,
      });

      if (auth && shouldClearSession(response.status, error.message)) {
        clearSessionOnUnauthorized();
      }

      throw error;
    }

    return payload.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw toApiError(error);
  }
}

async function blobErrorPayload(data: unknown): Promise<ApiErrorResponse | null> {
  if (!(data instanceof Blob)) return null;
  try {
    return JSON.parse(await data.text()) as ApiErrorResponse;
  } catch {
    return null;
  }
}

/** Authenticated binary fetch (e.g. TTS audio). Not a JSON envelope. */
export async function apiBlob(
  path: string,
  {
    token,
    timeout = 60_000,
    method = "GET",
    body,
  }: { token?: string | null; timeout?: number; method?: string; body?: unknown } = {},
): Promise<Blob> {
  try {
    const response = await api.request<Blob>({
      url: path,
      method,
      data: body,
      responseType: "blob",
      headers: token ? { Authorization: token } : undefined,
      authProtected: true,
      timeout,
    } as ApiRequestConfig);

    const contentType = String(response.headers["content-type"] || "");
    if (contentType.includes("application/json")) {
      const text = await response.data.text();
      let payload: ApiErrorResponse | null = null;
      try {
        payload = JSON.parse(text) as ApiErrorResponse;
      } catch {
        /* ignore */
      }
      throw new ApiError(response.status, {
        success: false,
        message: payload?.message || "Failed to download audio",
        data: payload?.data ?? null,
      });
    }

    return response.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const response = (error as { response?: { status?: number; data?: unknown } })?.response;
    const payload = await blobErrorPayload(response?.data);
    if (payload) {
      throw new ApiError(response?.status ?? 0, {
        success: false,
        message: payload.message || "Request failed",
        data: payload.data ?? null,
      });
    }
    throw toApiError(error);
  }
}
