"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { authApi, useAuth, errorMessage, fieldErrorMap } from "@/lib/auth";
import { Button, Spinner } from "@/components/ui/button";

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const labelClass =
  "[&>span:first-child]:mb-2 [&>span:first-child]:block [&>span:first-child]:text-[12px] [&>span:first-child]:font-[750] [&>span:first-child]:uppercase [&>span:first-child]:tracking-[0.08em] [&>span:first-child]:text-muted";

const inputClass =
  "h-[47px] w-full rounded-[10px] border border-brand-border bg-brand-soft px-[13px] text-xs text-text outline-none transition duration-200 placeholder:text-muted focus:border-brand-border focus:shadow-[0_0_0_3px_rgba(91,79,233,.11)]";

export function ChangePasswordForm() {
  const { user, token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});

    if (!user?.email || !token) {
      setError("You must be signed in to change your password.");
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      setFieldErrors({ newPassword: "Password must be 8–72 characters" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setFieldErrors({ confirmNewPassword: "Passwords do not match" });
      return;
    }

    setLoading(true);
    try {
      await authApi.updatePassword(
        {
          email: user.email,
          currentPassword,
          newPassword,
          confirmNewPassword,
        },
        token,
      );
      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setError(errorMessage(err));
      setFieldErrors(fieldErrorMap(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 font-heading text-[27px] font-semibold tracking-[-0.03em]">Settings</h1>
      <p className="mb-8 text-[12px] text-muted">Manage your account security.</p>

      <section className="rounded-[13px] border border-brand-border bg-brand-soft p-6">
        <h2 className="mb-1 font-heading text-[15px] font-semibold">Change password</h2>
        <p className="mb-5 text-[12px] text-muted">
          Signed in as <strong className="text-muted">{user?.email}</strong>
        </p>

        {(error || success) && (
          <div
            className={cx(
              "mb-4 rounded-lg border px-3 py-2 text-[12px] leading-relaxed",
              error
                ? "border-danger-border bg-brand-soft text-danger"
                : "border-success-border bg-success-soft text-success",
            )}
          >
            {error || success}
          </div>
        )}

        <form className="grid gap-4" onSubmit={onSubmit}>
          <label className={labelClass}>
            <span>Current password</span>
            <div className="relative">
              <LockKeyhole size={17} className="absolute left-[13px] top-[15px] text-muted" />
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className={cx(inputClass, "pl-10 pr-12")}
              />
              <button
                type="button"
                className="absolute right-[7px] top-[7px] grid h-[34px] w-[34px] place-items-center border-0 bg-transparent text-muted"
                onClick={() => setShowCurrent((v) => !v)}
              >
                {showCurrent ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {fieldErrors.currentPassword && (
              <span className="mt-1.5 block text-[12px] text-danger">
                {fieldErrors.currentPassword}
              </span>
            )}
          </label>

          <label className={labelClass}>
            <span>New password</span>
            <div className="relative">
              <LockKeyhole size={17} className="absolute left-[13px] top-[15px] text-muted" />
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                maxLength={72}
                required
                className={cx(inputClass, "pl-10 pr-12")}
              />
              <button
                type="button"
                className="absolute right-[7px] top-[7px] grid h-[34px] w-[34px] place-items-center border-0 bg-transparent text-muted"
                onClick={() => setShowNew((v) => !v)}
              >
                {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {fieldErrors.newPassword && (
              <span className="mt-1.5 block text-[12px] text-danger">{fieldErrors.newPassword}</span>
            )}
          </label>

          <label className={labelClass}>
            <span>Confirm new password</span>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              minLength={8}
              maxLength={72}
              required
              className={inputClass}
            />
            {fieldErrors.confirmNewPassword && (
              <span className="mt-1.5 block text-[12px] text-danger">
                {fieldErrors.confirmNewPassword}
              </span>
            )}
          </label>

          <Button type="submit" variant="primary" className="mt-2 h-[46px] w-full sm:w-auto" disabled={loading}>
            {loading ? <Spinner /> : "Update password"}
          </Button>
        </form>
      </section>
    </div>
  );
}
