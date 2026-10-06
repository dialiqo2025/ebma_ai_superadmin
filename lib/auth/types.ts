export type AuthUser = {
  user_uuid: string;
  fullName: string;
  company_name?: string | null;
  email: string;
  role: string;
  user_enabled: boolean;
  email_verified: boolean;
  auth_provider?: string;
  last_login?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SignUpRequest = {
  email: string;
  fullName: string;
  company_name?: string;
};

export type SignUpData = {
  user_uuid: string;
  email: string;
  verificationRequired: true;
  expiresIn?: number;
};

export type VerifyOtpRequest = {
  email: string;
  code: string;
};

export type AuthSessionData = {
  token: string;
  user: AuthUser;
};

export type ResendOtpRequest = {
  email: string;
};

export type ResendOtpData = {
  email: string;
  expiresIn?: number;
};

export type SignInRequest = {
  email: string;
};

export type SignInData = {
  otpRequired: true;
  email: string;
  expiresIn?: number;
};

export type UpdatePasswordRequest = {
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};
