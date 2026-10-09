"use client";

import Link from "next/link";
import { ArrowRight, Building2, CalendarDays, CheckCircle2, Cpu, Mail, ShieldCheck } from "lucide-react";
import { ChangePasswordForm } from "@/components/change-password-form";
import { useAuth } from "@/lib/auth";

function displayDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function Detail({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 py-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-brand-border bg-brand-soft text-muted">
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">{label}</p>
        <p className="mt-1 break-words text-[13px] font-medium text-text">{value}</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const initials = (user?.fullName || user?.email || "U")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <main className="mx-auto w-full max-w-5xl">
      <header className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Account</p>
        <h1 className="mt-1 font-heading text-[27px] font-semibold tracking-[-0.03em]">Settings</h1>
        <p className="mt-1 text-[13px] text-muted">Manage your profile, security, and workspace preferences.</p>
      </header>

      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        <section className="rounded-[14px] border border-brand-border bg-brand-soft p-5 sm:p-6">
          <div className="flex items-center gap-4 border-b border-brand-border pb-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#654df3,#bc62f6)] text-lg font-semibold text-white shadow-[0_6px_18px_rgba(116,76,235,.2)]">
              {initials || "U"}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-heading text-[17px] font-semibold">{user?.fullName || "Your profile"}</h2>
              <p className="mt-1 truncate text-[12px] text-muted">{user?.email || "Account email unavailable"}</p>
              <span className="mt-2 inline-flex rounded-full border border-brand-border bg-white/70 px-2.5 py-1 text-[10px] font-semibold capitalize text-muted">
                {(user?.role || "member").replace(/[_-]+/g, " ")}
              </span>
            </div>
          </div>

          <div className="divide-y divide-brand-border/80">
            <Detail icon={Mail} label="Email address" value={user?.email || "Not available"} />
            <Detail icon={Building2} label="Organization" value={user?.company_name || "Personal workspace"} />
            <Detail
              icon={ShieldCheck}
              label="Account status"
              value={user?.user_enabled ? "Active" : "Disabled"}
            />
            <Detail
              icon={CheckCircle2}
              label="Email verification"
              value={user?.email_verified ? "Verified" : "Pending verification"}
            />
            <Detail icon={CalendarDays} label="Last sign in" value={displayDate(user?.last_login)} />
          </div>
        </section>

        <ChangePasswordForm />

        <Link
          href="/platform/settings/llm"
          className="group flex items-center justify-between gap-5 rounded-[14px] border border-brand-border bg-brand-soft p-5 transition hover:border-brand-border hover:bg-white/70 lg:col-span-2"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-brand-border bg-white/70 text-brand">
              <Cpu size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-text">LLM configuration</span>
              <span className="mt-1 block text-[12px] text-muted">Choose a provider and model when your plan supports a user-managed LLM.</span>
            </span>
          </span>
          <ArrowRight size={17} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
        </Link>
      </div>
    </main>
  );
}
