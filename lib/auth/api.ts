import { API_BASE_URL, apiRequest } from "@/lib/api";
import type {
  AuthSessionData,
  ResendOtpData,
  ResendOtpRequest,
  SignInData,
  SignInRequest,
  SignUpData,
  SignUpRequest,
  UpdatePasswordRequest,
  VerifyOtpRequest,
} from "./types";

export const authApi = {
  signUp(payload: SignUpRequest) {
    return apiRequest<SignUpData>("/auth/sign-up", {
      method: "POST",
      body: payload,
    });
  },

  verifySignUpOtp(payload: VerifyOtpRequest) {
    return apiRequest<AuthSessionData>("/auth/sign-up/verify-otp", {
      method: "POST",
      body: payload,
    });
  },

  resendSignUpOtp(payload: ResendOtpRequest) {
    return apiRequest<ResendOtpData>("/auth/sign-up/resend-otp", {
      method: "POST",
      body: payload,
    });
  },

  signIn(payload: SignInRequest) {
    return apiRequest<SignInData>("/auth/sign-in", {
      method: "POST",
      body: payload,
    });
  },

  verifySignInOtp(payload: VerifyOtpRequest) {
    return apiRequest<AuthSessionData>("/auth/sign-in/verify-otp", {
      method: "POST",
      body: payload,
    });
  },

  updatePassword(payload: UpdatePasswordRequest, token?: string) {
    return apiRequest<unknown>("/auth/update-profile", {
      method: "POST",
      body: payload,
      token,
      auth: true,
    });
  },

  googleAuthUrl() {
    return `${API_BASE_URL}/auth/google`;
  },

  microsoftAuthUrl() {
    return `${API_BASE_URL}/auth/microsoft`;
  },

  appleAuthUrl() {
    return `${API_BASE_URL}/auth/apple`;
  },
};
