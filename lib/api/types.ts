export type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  data?:
    | { verificationRequired?: boolean; retryAfter?: number; [key: string]: unknown }
    | Array<{ field: string; message: string }>
    | null;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type FieldError = { field: string; message: string };
