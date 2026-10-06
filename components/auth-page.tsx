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
import { useRouter } from "next/navigation";
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
              Sign in with a one-time code — no password to remember.
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
  const router = useRouter();
  const { setSession, isAuthenticated, ready, user } = useAuth();

  const [mode] = useState<Mode>("login");
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
