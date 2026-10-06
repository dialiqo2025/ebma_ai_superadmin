import { ApiError } from "./errors";

export function fieldErrorMap(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries(error.fieldErrors.map((item) => [item.field, item.message]));
}

export function errorMessage(error: unknown, fallback = "Something went wrong") {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

export function cooldownSeconds(error: unknown, fallback = 30) {
  if (error instanceof ApiError && typeof error.retryAfter === "number") {
    return Math.max(1, Math.ceil(error.retryAfter));
  }
  return fallback;
}
