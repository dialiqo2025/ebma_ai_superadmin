import type { ApiErrorResponse, FieldError } from "./types";

export class ApiError extends Error {
  status: number;
  success = false as const;
  data: ApiErrorResponse["data"];
  fieldErrors: FieldError[];
  retryAfter?: number;
  verificationRequired?: boolean;

  constructor(status: number, body: ApiErrorResponse) {
    super(body.message || "Request failed");
    this.name = "ApiError";
    this.status = status;
    this.data = body.data ?? null;

    const data = body.data;
    if (Array.isArray(data)) {
      this.fieldErrors = data;
    } else {
      this.fieldErrors = [];
      if (data && typeof data === "object") {
        if (typeof data.retryAfter === "number") this.retryAfter = data.retryAfter;
        if (
          typeof (data as { retryAfterSeconds?: number }).retryAfterSeconds === "number"
        ) {
          this.retryAfter = (data as { retryAfterSeconds: number }).retryAfterSeconds;
        }
        if (data.verificationRequired === true) this.verificationRequired = true;
      }
    }
  }
}
