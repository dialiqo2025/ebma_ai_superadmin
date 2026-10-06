"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Brand } from "./brand";
import { Button, Spinner } from "./ui/button";
import {
  ApiError,
  authApi,
  useAuth,
  cooldownSeconds,
  errorMessage,
  fieldErrorMap,
} from "@/lib/auth";

type Mode = "login" | "signup";
type Step = "form" | "otp";
type OtpPurpose = "signup" | "signin";

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const labelClass =
  "[&>span:first-child]:mb-2 [&>span:first-child]:block [&>span:first-child]:text-[12px] [&>span:first-child]:font-[750] [&>span:first-child]:uppercase [&>span:first-child]:tracking-[0.08em] [&>span:first-child]:text-[#adb2c9]";

const inputClass =
  "h-[47px] w-full rounded-[10px] border border-[#2b3356] bg-[#151a30] px-[13px] text-xs text-white outline-none transition duration-200 placeholder:text-[#8b98ae] focus:border-[#6f62e7] focus:shadow-[0_0_0_3px_rgba(91,79,233,.11)]";

function FieldHint({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="mt-1.5 block text-[12px] text-[#ef6a82]">{message}</span>;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#EA4335"
        d="M9 7.24v3.46h4.84c-.21 1.18-.84 2.18-1.79 2.85l2.89 2.24c1.69-1.56 2.66-3.86 2.66-6.59 0-.63-.06-1.24-.16-1.83H9z"
      />
      <path
        fill="#34A853"
        d="M3.99 10.74A5.41 5.41 0 0 1 3.64 9c0-.61.11-1.2.3-1.74L.54 4.98A8.96 8.96 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.03-2.3z"
      />
      <path
        fill="#4A90E2"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.98l3.03 2.3C4.6 5.17 6.62 3.58 9 3.58z"
      />
      <path
        fill="#FBBC05"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.89-2.24c-.8.54-1.83.86-3.07.86-2.38 0-4.4-1.6-5.11-3.76l-3.03 2.3C2.44 15.98 5.48 18 9 18z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#F25022" d="M1 1h7.5v7.5H1z" />
      <path fill="#7FBA00" d="M9.5 1H17v7.5H9.5z" />
      <path fill="#00A4EF" d="M1 9.5H8.5V17H1z" />
      <path fill="#FFB900" d="M9.5 9.5H17V17H9.5z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="currentColor"
        d="M12.86 9.4c-.02-2.07 1.69-3.07 1.77-3.12-0.97-1.41-2.47-1.61-3-1.64-1.28-.13-2.5.75-3.15.75-.65 0-1.66-.73-2.73-.71-1.4.02-2.7.82-3.42 2.08-1.46 2.53-.37 6.28 1.05 8.34.69 1.01 1.52 2.14 2.61 2.1 1.05-.04 1.44-.67 2.71-.67 1.26 0 1.62.67 2.73.65 1.13-.02 1.84-1.03 2.53-2.05.79-1.16 1.12-2.28 1.14-2.34-.02-.01-2.18-.84-2.2-3.39zM11.1 3.34c.58-.7.97-1.68.86-2.65-.84.03-1.85.56-2.45 1.26-.54.62-1.01 1.62-.88 2.57.93.07 1.89-.47 2.47-1.18z"
      />
    </svg>
  );
}

function AuthVisual() {
  return (
    <div className="relative overflow-hidden border-r border-[#252d4c] bg-[radial-gradient(circle_at_30%_45%,rgba(91,79,233,.2),transparent_33%),linear-gradient(145deg,#0d1020,#080a14)] max-[820px]:hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(130,140,190,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(130,140,190,.16)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-[190px] -right-[100px] h-[480px] w-[480px] rounded-full bg-[#583be1] opacity-[0.12] blur-[150px]"
        aria-hidden
      />

      <Link
        href="/home"
        className="absolute left-[42px] top-[38px] z-[2] flex items-center gap-[7px] text-[12px] text-[#8189aa] transition hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to home
      </Link>

      <div className="absolute left-[10%] right-[8%] top-1/2 z-[2] -translate-y-[56%]">
        <div className="flex w-max items-center gap-2 rounded-full border border-[rgba(155,92,246,.3)] bg-[rgba(91,79,233,.1)] px-3 py-2 text-[12px] font-[750] uppercase tracking-[0.1em] text-[#b5adff]">
          <Sparkles size={14} />
          Build what&apos;s next
        </div>
        <h1 className="mb-0 mt-6 font-heading text-[clamp(39px,4vw,56px)] font-[610] leading-[1.12] tracking-[-0.045em]">
          Every great conversation
          <br />
          starts with <span className="text-[#a982f6]">understanding.</span>
        </h1>
        <p className="mt-6 max-w-[540px] text-[15px] leading-[1.75] text-[#9198b8]">
          Join teams building faster, more natural voice and language experiences with ebma AI.
        </p>
        <div className="mt-[42px] grid grid-cols-2 gap-[26px]">
          <div className="flex gap-3">
            <span className="grid h-9 w-9 min-w-9 place-items-center rounded-[10px] border border-[#343b64] bg-[#171c34] text-[#9c78ef] [&_svg]:h-[17px] [&_svg]:w-[17px]">
              <ShieldCheck />
            </span>
            <p className="m-0 text-[12px] leading-normal text-[#a0acc0]">
              <strong className="mb-1 block text-[12px] text-[#d2d5e6]">Private by design</strong>
              Your data is encrypted and never used to train public models.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="grid h-9 w-9 min-w-9 place-items-center rounded-[10px] border border-[#343b64] bg-[#171c34] text-[#9c78ef] [&_svg]:h-[17px] [&_svg]:w-[17px]">
              <LockKeyhole />
            </span>
            <p className="m-0 text-[10px] leading-normal text-[#707899]">
              <strong className="mb-1 block text-[11px] text-[#d2d5e6]">Passwordless access</strong>
              Sign in with a one-time code or Google — no password to remember.
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-[37px] left-[10%] z-[2] text-[#8c93b2]">
        <div className="text-[12px] tracking-[5px] text-[#a178ee]">✦ ✦ ✦</div>
        <p className="my-2 font-heading text-xs font-medium">
          “The foundation for human-first AI experiences.”
        </p>
        <span className="text-[12px] uppercase tracking-[0.1em] text-[#8b98ae]">
          ebma intelligence platform
        </span>
      </div>
    </div>
  );
}

export function AuthPage() {
  const search = useSearchParams();
  const router = useRouter();
  const { setSession, isAuthenticated, ready, user } = useAuth();

  const initialMode: Mode = search.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<Step>("form");
  const [otpPurpose, setOtpPurpose] = useState<OtpPurpose>("signin");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [seconds, setSeconds] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (ready && isAuthenticated) {
      router.replace(user?.role === "superAdmin" ? "/platform/admin" : "/platform");
    }
  }, [ready, isAuthenticated, user, router]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  const clearMessages = () => {
    setFormError("");
    setFormSuccess("");
    setFieldErrors({});
  };

  const goToOtp = (purpose: OtpPurpose, nextEmail: string, expiresIn?: number) => {
    setOtpPurpose(purpose);
    setEmail(nextEmail);
    setOtp(["", "", "", "", "", ""]);
    setSeconds(typeof expiresIn === "number" ? Math.max(1, Math.ceil(expiresIn)) : 30);
    setStep("otp");
    window.setTimeout(() => otpRefs.current[0]?.focus(), 80);
  };

  const handleApiFailure = (error: unknown) => {
    setFormError(errorMessage(error));
    setFieldErrors(fieldErrorMap(error));
    if (error instanceof ApiError && error.status === 429) {
      setSeconds(cooldownSeconds(error));
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setStep("form");
    setOtp(["", "", "", "", "", ""]);
    clearMessages();
    router.replace(next === "signup" ? "/?mode=signup" : "/");
  };

  const submitAuthForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearMessages();

    if (mode === "signup") {
      if (fullName.trim().length < 3) {
        setFieldErrors({ fullName: "Full name must be at least 3 characters" });
        return;
      }
      if (companyName.trim() && companyName.trim().length < 3) {
        setFieldErrors({ company_name: "Company name must be at least 3 characters" });
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const payload = {
          email: email.trim(),
          fullName: fullName.trim(),
          ...(companyName.trim().length >= 3 ? { company_name: companyName.trim() } : {}),
        };
        const data = await authApi.signUp(payload);
        setFormSuccess("Verification code sent. Check your inbox.");
        goToOtp("signup", data.email || email.trim(), data.expiresIn);
      } else {
        const data = await authApi.signIn({ email: email.trim() });
        setFormSuccess("Verification code sent. Check your inbox.");
        goToOtp("signin", data.email || email.trim(), data.expiresIn);
      }
    } catch (error) {
      if (
        error instanceof ApiError &&
        mode === "signup" &&
        error.status === 409 &&
        error.verificationRequired
      ) {
        setFormSuccess("Account exists but is unverified. Enter the OTP or resend a new code.");
        goToOtp("signup", email.trim());
        return;
      }
      if (
        error instanceof ApiError &&
        mode === "login" &&
        error.status === 403 &&
        error.verificationRequired
      ) {
        setFormSuccess("Please verify your email to continue.");
        goToOtp("signup", email.trim());
        return;
      }
      handleApiFailure(error);
    } finally {
      setLoading(false);
    }
  };

  const updateOtp = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKey = (index: number, key: string) => {
    if (key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    const code = otp.join("");
    if (!/^\d{6}$/.test(code)) {
      setFormError("Enter the 6-digit code");
      return;
    }
    clearMessages();
    setLoading(true);
    try {
      if (otpPurpose === "signup") {
        const data = await authApi.verifySignUpOtp({ email: email.trim(), code });
        setSession(data.token, data.user);
        router.push(data.user.role === "superAdmin" ? "/platform/admin" : "/platform");
      } else {
        const data = await authApi.verifySignInOtp({ email: email.trim(), code });
        setSession(data.token, data.user);
        router.push(data.user.role === "superAdmin" ? "/platform/admin" : "/platform");
      }
    } catch (error) {
      handleApiFailure(error);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (seconds > 0 || loading) return;
    clearMessages();
    setLoading(true);
    try {
      if (otpPurpose === "signup") {
        const data = await authApi.resendSignUpOtp({ email: email.trim() });
        setSeconds(
          typeof data.expiresIn === "number" ? Math.max(1, Math.ceil(data.expiresIn)) : 30,
        );
        setFormSuccess("A new verification code was sent.");
      } else {
        const data = await authApi.signIn({ email: email.trim() });
        setSeconds(
          typeof data.expiresIn === "number" ? Math.max(1, Math.ceil(data.expiresIn)) : 30,
        );
        setFormSuccess("A new verification code was sent.");
      }
    } catch (error) {
      handleApiFailure(error);
    } finally {
      setLoading(false);
    }
  };

  const continueWithGoogle = () => {
    window.location.href = authApi.googleAuthUrl();
  };

  const continueWithMicrosoft = () => {
    window.location.href = authApi.microsoftAuthUrl();
  };

  const continueWithApple = () => {
    window.location.href = authApi.appleAuthUrl();
  };

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#090b17] min-[821px]:grid-cols-[1.04fr_0.96fr]">
      <AuthVisual />

      <div className="relative flex min-h-screen items-center justify-center bg-[#0d1020] p-[50px] max-[820px]:px-[30px] max-[820px]:py-[55px] max-[560px]:items-start max-[560px]:px-5 max-[560px]:pb-[70px] max-[560px]:pt-[45px]">
        <div className="w-full max-w-[440px]">
          <div className="mb-[46px] max-[560px]:mb-[42px]">
            <Brand />
          </div>

          {step === "form" && (
            <>
              <div>
                <h2 className="mb-[9px] font-heading text-[31px] font-[620] tracking-[-0.035em]">
                  {mode === "login" ? "Welcome back" : "Create your account"}
                </h2>
                <p className="m-0 text-xs leading-[1.6] text-[#838bab]">
                  {mode === "login"
                    ? "Enter your email and we’ll send a one-time code."
                    : "Start building with voice and language AI today."}
                </p>
              </div>

              <div className="my-[28px] mb-[25px] grid grid-cols-2 gap-0 rounded-[11px] border border-[#252d4c] bg-[#14192e] p-1">
                <button
                  type="button"
                  className={cx(
                    "h-9 cursor-pointer rounded-lg border-0 text-[12px] font-bold transition-all",
                    mode === "login"
                      ? "bg-[linear-gradient(135deg,var(--color-brand-a),var(--color-brand-b))] text-white shadow-[0_4px_14px_rgba(91,79,233,.35)]"
                      : "bg-transparent text-[#a0acc0] hover:text-[#b0b5d0]",
                  )}
                  onClick={() => switchMode("login")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={cx(
                    "h-9 cursor-pointer rounded-lg border-0 text-[12px] font-bold transition-all",
                    mode === "signup"
                      ? "bg-[linear-gradient(135deg,var(--color-brand-a),var(--color-brand-b))] text-white shadow-[0_4px_14px_rgba(91,79,233,.35)]"
                      : "bg-transparent text-[#a0acc0] hover:text-[#b0b5d0]",
                  )}
                  onClick={() => switchMode("signup")}
                >
                  Create account
                </button>
              </div>

              {(formError || formSuccess) && (
                <div
                  className={cx(
                    "mb-4 rounded-lg border px-3 py-2 text-[12px] leading-relaxed",
                    formError
                      ? "border-[#5a2a3a] bg-[#2a1520] text-[#ef6a82]"
                      : "border-[#2a4a3a] bg-[#152a20] text-[#4dd0a3]",
                  )}
                >
                  {formError || formSuccess}
                </div>
              )}

              <div className="mb-4 grid gap-2.5">
                <button
                  type="button"
                  onClick={continueWithGoogle}
                  className="flex h-[47px] w-full items-center justify-center gap-2.5 rounded-[10px] border border-[#2b3356] bg-[#151a30] text-[12px] font-semibold text-[#e8eaf4] transition hover:border-[#3d4670] hover:bg-[#1a2038]"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
                <button
                  type="button"
                  onClick={continueWithMicrosoft}
                  className="flex h-[47px] w-full items-center justify-center gap-2.5 rounded-[10px] border border-[#2b3356] bg-[#151a30] text-[12px] font-semibold text-[#e8eaf4] transition hover:border-[#3d4670] hover:bg-[#1a2038]"
                >
                  <MicrosoftIcon />
                  Continue with Microsoft
                </button>
                <button
                  type="button"
                  onClick={continueWithApple}
                  className="flex h-[47px] w-full items-center justify-center gap-2.5 rounded-[10px] border border-[#2b3356] bg-[#151a30] text-[12px] font-semibold text-[#e8eaf4] transition hover:border-[#3d4670] hover:bg-[#1a2038]"
                >
                  <AppleIcon />
                  Continue with Apple
                </button>
              </div>

              <div className="mb-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-[#252d4c]" />
                <span className="text-[10px] uppercase tracking-[0.12em] text-[#555d7e]">or</span>
                <span className="h-px flex-1 bg-[#252d4c]" />
              </div>

              <form className="grid gap-[18px]" onSubmit={submitAuthForm}>
                {mode === "signup" && (
                  <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
                    <label className={labelClass}>
                      <span>Full name</span>
                      <input
                        type="text"
                        placeholder="Your full name"
                        required
                        minLength={3}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={inputClass}
                      />
                      <FieldHint message={fieldErrors.fullName} />
                    </label>
                    <label className={labelClass}>
                      <span>Company (optional)</span>
                      <input
                        type="text"
                        placeholder="Company name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className={inputClass}
                      />
                      <FieldHint message={fieldErrors.company_name} />
                    </label>
                  </div>
                )}

                <label className={labelClass}>
                  <span>Work email</span>
                  <div className="relative">
                    <Mail size={17} className="absolute left-[13px] top-[15px] text-[#9aa5b8]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      className={cx(inputClass, "pl-10")}
                    />
                  </div>
                  <FieldHint message={fieldErrors.email} />
                </label>

                {mode === "signup" && (
                  <label className="flex cursor-pointer items-start gap-2 text-[10px] text-[#777f9f]">
                    <input type="checkbox" required className="peer sr-only" />
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border border-[#353d63] bg-[#171c33] text-transparent peer-checked:border-brand-a peer-checked:bg-brand-a peer-checked:text-white">
                      <Check size={12} />
                    </span>
                    <span className="mt-0.5">
                      I agree to the{" "}
                      <a href="#" className="text-[12px] text-[#a89af4]">
                        Terms
                      </a>{" "}
                      and{" "}
                      <a href="#" className="text-[12px] text-[#a89af4]">
                        Privacy Policy
                      </a>
                      .
                    </span>
                  </label>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="mt-0.5 h-[49px] w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <Spinner />
                  ) : (
                    <>
                      {mode === "login" ? "Send sign-in code" : "Send verification code"}
                      <ArrowRight size={17} />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-[18px] flex items-center justify-center gap-1.5 text-[12px] text-[#8b98ae]">
                <ShieldCheck size={14} className="text-[#6c64a6]" />
                Passwordless sign-in with a one-time email code.
              </p>
            </>
          )}

          {step === "otp" && (
            <div className="relative text-center">
              <button
                type="button"
                className="absolute -top-[35px] flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[12px] text-[#a0acc0]"
                onClick={() => {
                  clearMessages();
                  setStep("form");
                }}
              >
                <ArrowLeft size={16} />
                Back
              </button>

              <div className="mx-auto mb-[22px] grid h-[55px] w-[55px] place-items-center rounded-2xl border border-[#393d72] bg-[linear-gradient(145deg,#242451,#161b34)] text-[#a981f5] shadow-[0_0_45px_rgba(91,79,233,.13)]">
                <Mail />
              </div>

              <h2 className="mb-[9px] font-heading text-[31px] font-[620] tracking-[-0.035em]">
                {otpPurpose === "signup" ? "Verify your email" : "Check your inbox"}
              </h2>
              <p className="m-0 text-xs leading-[1.6] text-[#838bab]">
                We sent a 6-digit verification code to
                <br />
                <strong className="text-[#cfd2e3]">{email}</strong>
              </p>

              {(formError || formSuccess) && (
                <div
                  className={cx(
                    "mt-4 rounded-lg border px-3 py-2 text-left text-[12px] leading-relaxed",
                    formError
                      ? "border-[#5a2a3a] bg-[#2a1520] text-[#ef6a82]"
                      : "border-[#2a4a3a] bg-[#152a20] text-[#4dd0a3]",
                  )}
                >
                  {formError || formSuccess}
                </div>
              )}

              <form className="mt-[29px]" onSubmit={verifyOtp}>
                <div className="flex justify-center gap-2 max-[560px]:gap-[5px]">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        otpRefs.current[index] = element;
                      }}
                      value={digit}
                      onChange={(event) => updateOtp(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKey(index, event.key)}
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`OTP digit ${index + 1}`}
                      className="h-[57px] w-[51px] rounded-[10px] border border-[#30385d] bg-[#151a30] text-center font-heading text-xl font-semibold text-white outline-none focus:border-[#7a6dec] focus:shadow-[0_0_0_3px_rgba(91,79,233,.12)] max-[560px]:h-[52px] max-[560px]:w-[43px]"
                    />
                  ))}
                </div>
                <FieldHint message={fieldErrors.code} />

                <Button
                  type="submit"
                  variant="primary"
                  className="mt-5 h-[49px] w-full"
                  disabled={loading || otp.some((digit) => !digit)}
                >
                  {loading ? (
                    <Spinner />
                  ) : (
                    <>
                      Verify & continue
                      <ArrowRight size={17} />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-5 text-[12px] text-[#9aa5b8]">
                Didn&apos;t receive it?{" "}
                {seconds > 0 ? (
                  <span className="text-[#949bb7]">
                    Resend in 0:{seconds.toString().padStart(2, "0")}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={resendOtp}
                    disabled={loading}
                    className="cursor-pointer border-0 bg-transparent text-[12px] text-[#a99bf5] disabled:opacity-50"
                  >
                    Resend code
                  </button>
                )}
              </p>

              <div className="mt-8 flex gap-2.5 rounded-[10px] border border-[#272f50] bg-[#13182c] p-3 text-left text-[12px] leading-normal text-[#a0acc0]">
                <LockKeyhole size={16} className="min-w-4 text-[#8276d8]" />
                <span>
                  <strong className="block text-[12px] text-[#afb4cd]">Secure verification</strong>
                  Enter the 6-digit code exactly as sent to your email.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
