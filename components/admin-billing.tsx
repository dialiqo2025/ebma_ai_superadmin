"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PlanRatesEditor } from "@/components/plan-rates-editor";
import {
  bundleToStoredPlanRates,
  defaultPlanRateBundle,
  planRatesToBundle,
  type BundleForm,
} from "@/lib/billing/plan-rates-ui";

type Plan = {
  plan_uuid: string;
  code: string;
  name: string;
  description?: string | null;
  price_minor: number;
  currency: string;
  billing_interval: string;
  plan_kind?: "service" | "wallet_topup";
  monthly_credits: string;
  tts_credits_per_1000_chars?: string | null;
  stt_credits_per_minute?: string | null;
  llm_credits_per_1000_tokens?: string | null;
  is_default?: boolean;
  contact_only?: boolean;
  active: boolean;
  features?: { stt: boolean; tts: boolean; llm: boolean };
  benefits?: string[];
};

type FormState = {
  code: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  credits: string;
  billingInterval: string;
  planKind: "service" | "wallet_topup";
  features: { stt: boolean; tts: boolean; llm: boolean };
  benefits: string;
  isDefault: boolean;
  contactOnly: boolean;
};

const blank: FormState = {
  code: "",
  name: "",
  description: "",
  price: "0",
  currency: "INR",
  credits: "0",
  billingInterval: "one_time",
  planKind: "service",
  features: { stt: true, tts: true, llm: true },
  benefits: "",
  isDefault: false,
  contactOnly: false,
};

const input =
  "h-11 w-full rounded-xl border border-brand-border bg-surface px-3.5 text-sm font-medium text-text outline-none transition focus:border-brand-border focus:ring-2 focus:ring-brand-border/20";

const planInput =
  "h-10 rounded-lg border border-brand-border bg-surface px-3 text-sm text-text outline-none focus:border-brand-border";

function AdminFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && user?.role !== "superAdmin") router.replace("/platform");
  }, [ready, user, router]);

  if (!ready || user?.role !== "superAdmin") return null;

  return (
    <main className="mx-auto w-full max-w-none text-text">
      <p className="font-mono text-[11px] tracking-[.24em] text-accent">
        CONTROL PANEL
      </p>
      <h1 className="mt-3 text-4xl font-extrabold text-text">{title}</h1>
      <p className="mt-3 text-sm text-muted">{description}</p>
      {children}
    </main>
  );
}

function num(value: string, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function roundNice(value: number) {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function apiRatesToBundle(rates: ApiRates): BundleForm {
  const ttsPer = 100;
  const sttPerMin = 1;
  const llmPer = 1000;
  return {
    ttsCredits: String(roundNice((rates.tts_characters ?? 0) * ttsPer)),
    ttsPerChars: String(ttsPer),
    sttCredits: String(roundNice((rates.stt_seconds ?? 0) * 60 * sttPerMin)),
    sttPerMinutes: String(sttPerMin),
    llmCredits: String(roundNice((rates.llm_tokens ?? 0) * llmPer)),
    llmPerTokens: String(llmPer),
  };
}

function bundleToApiRates(form: BundleForm): ApiRates {
  const ttsPer = Math.max(num(form.ttsPerChars, 1), 1e-9);
  const sttMinutes = Math.max(num(form.sttPerMinutes, 1), 1e-9);
  const llmPer = Math.max(num(form.llmPerTokens, 1), 1e-9);
  return {
    tts_characters: roundNice(num(form.ttsCredits) / ttsPer),
    stt_seconds: roundNice(num(form.sttCredits) / (sttMinutes * 60)),
    llm_tokens: roundNice(num(form.llmCredits) / llmPer),
  };
}

function formatCredits(value: number) {
  return roundNice(value).toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function RateCard({
  title,
  subtitle,
  accentBar,
  icon,
  credits,
  quantity,
  quantityLabel,
  onCredits,
  onQuantity,
  unitRateLabel,
  unitRate,
  formula,
}: {
  title: string;
  subtitle: string;
  accentBar: string;
  icon: ReactNode;
  credits: string;
  quantity: string;
  quantityLabel: string;
  onCredits: (v: string) => void;
  onQuantity: (v: string) => void;
  unitRateLabel: string;
  unitRate: string;
  formula: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-brand-border bg-surface">
      <div className={`absolute inset-x-0 top-0 h-1 ${accentBar}`} />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5">
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold tracking-wide text-text">{title}</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">{subtitle}</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-brand-border bg-surface p-3.5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Charge rule
          </p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2.5">
            <label className="grid gap-1.5">
              <span className="text-[11px] font-medium text-muted">Credits</span>
              <input
                type="number"
                min="0"
                step="any"
                className={input}
                value={credits}
                onChange={(e) => onCredits(e.target.value)}
              />
            </label>
            <span className="pb-3 text-[12px] font-semibold text-accent">per</span>
            <label className="grid gap-1.5">
              <span className="text-[11px] font-medium text-muted">{quantityLabel}</span>
              <input
                type="number"
                min="0.001"
                step="any"
                className={input}
                value={quantity}
                onChange={(e) => onQuantity(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="rounded-lg bg-surface px-3 py-2.5 text-[12px] leading-relaxed text-muted">
            {formula}
          </p>
          <p className="px-1 text-[11px] text-accent">
            Stored as <span className="font-mono text-muted">{unitRate}</span>{" "}
            {unitRateLabel}
          </p>
        </div>
      </div>
    </article>
  );
}

export function AdminPlans() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [view, setView] = useState<Plan | null>(null);

  const load = () =>
    void apiRequest<Plan[]>("/billing/admin/plans", { auth: true }).then(setPlans);

  useEffect(load, []);

  const remove = async (plan: Plan) => {
    if (window.confirm("Delete " + plan.name + "?")) {
      await apiRequest("/billing/admin/plans/" + plan.plan_uuid, {
        method: "DELETE",
        auth: true,
      });
      load();
    }
  };

  const active = plans.filter((plan) => plan.active).length;

  return (
    <AdminFrame
      title="Plans & pricing"
      description="Create customer-ready packages with transparent benefits and service entitlements."
    >
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {(
          [
            ["Total plans", plans.length, "text-text"],
            ["Active", active, "text-success"],
            ["Inactive", plans.length - active, "text-danger"],
          ] as const
        ).map(([label, value, color]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-brand-border bg-surface p-4"
          >
            <p className="text-xs text-accent">{label}</p>
            <p className={"mt-2 text-2xl font-bold " + color}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text">Plan catalogue</h2>
        <button
          onClick={() => router.push("/platform/admin/plans/new")}
          className="flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2.5 text-xs font-semibold text-on-brand hover:brightness-110"
        >
          <Plus size={15} /> New plan
        </button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-brand-border bg-surface">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b border-brand-border text-[10px] uppercase tracking-wider text-accent">
            <tr>
              <th className="px-5 py-4">Plan</th>
              <th className="px-5 py-4">Price</th>
              <th className="px-5 py-4">TTS / STT rates</th>
              <th className="px-5 py-4">Services</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr
                key={plan.plan_uuid}
                className="border-b border-brand-border last:border-0"
              >
                <td className="px-5 py-4">
                  <p className="font-semibold text-text">{plan.name}</p>
                  <p className="text-xs text-accent">
                    {plan.code}
                    {plan.is_default ? " · default" : ""}
                    {plan.contact_only ? " · contact" : ""}
                  </p>
                </td>
                <td className="px-5 py-4 text-text">
                  {(plan.price_minor / 100).toFixed(2)} {plan.currency}
                </td>
                <td className="px-5 py-4 text-muted">
                  {plan.contact_only
                    ? "—"
                    : `₹${Number(plan.tts_credits_per_1000_chars ?? 30)}/1k TTS · ₹${Number(plan.stt_credits_per_minute ?? 1)}/min STT · ₹${Number(plan.llm_credits_per_1000_tokens ?? 1)}/1k LLM`}
                </td>
                <td className="px-5 py-4 text-xs text-accent">
                  {Object.entries(plan.features || {})
                    .filter(([, enabled]) => enabled)
                    .map(([service]) => service.toUpperCase())
                    .join(" · ") || "None"}
                </td>
                <td className="px-5 py-4">
                  <span className={plan.active ? "text-success" : "text-danger"}>
                    {plan.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-3 text-xs">
                    <button
                      onClick={() => setView(plan)}
                      className="flex items-center gap-1 text-muted hover:text-text"
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      onClick={() =>
                        router.push("/platform/admin/plans/" + plan.plan_uuid + "/edit")
                      }
                      className="flex items-center gap-1 text-accent hover:text-text"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => void remove(plan)}
                      className="flex items-center gap-1 text-danger hover:text-danger"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {plans.length === 0 && (
          <p className="p-8 text-center text-sm text-accent">No plans created yet.</p>
        )}
      </div>

      {view && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-theme-overlay p-4"
          onClick={() => setView(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-brand-border bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-text">{view.name}</h2>
            <p className="mt-2 text-sm text-muted">
              {view.description || "No description"}
            </p>
            <p className="mt-5 text-2xl font-bold text-text">
              {(view.price_minor / 100).toFixed(2)} {view.currency}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {(view.benefits || []).map((benefit) => (
                <li key={benefit}>✓ {benefit}</li>
              ))}
            </ul>
            <button
              onClick={() => setView(null)}
              className="mt-6 rounded-lg border border-brand-border px-4 py-2 text-xs text-text"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </AdminFrame>
  );
}

export function AdminPlanEditor({ editId }: { editId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(blank);
  const [rateBundle, setRateBundle] = useState<BundleForm>(defaultPlanRateBundle);
  const [loading, setLoading] = useState(Boolean(editId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    void apiRequest<Plan[]>("/billing/admin/plans", { auth: true })
      .then((plans) => {
        const plan = plans.find((item) => item.plan_uuid === editId);
        if (plan) {
          setForm({
            code: plan.code,
            name: plan.name,
            description: plan.description || "",
            price: String(plan.price_minor / 100),
            currency: plan.currency,
            credits: String(plan.monthly_credits),
            billingInterval: plan.billing_interval,
            planKind: plan.plan_kind || "service",
            features: plan.features || blank.features,
            benefits: (plan.benefits || []).join("\n"),
            isDefault: Boolean(plan.is_default),
            contactOnly: Boolean(plan.contact_only),
          });
          setRateBundle(planRatesToBundle(plan));
        }
      })
      .finally(() => setLoading(false));
  }, [editId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const ratesDisabled = form.contactOnly || form.planKind === "wallet_topup";
    const stored = ratesDisabled ? null : bundleToStoredPlanRates(rateBundle);
    const body = {
      code: form.code,
      name: form.name,
      description: form.description,
      currency: form.currency,
      billingInterval: form.billingInterval,
      planKind: form.planKind,
      features: form.features,
      priceMinor: Math.round(Number(form.price) * 100),
      credits: Number(form.credits),
      benefits: form.benefits
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      ttsCreditsPer1000Chars: stored?.ttsCreditsPer1000Chars ?? null,
      sttCreditsPerMinute: stored?.sttCreditsPerMinute ?? null,
      llmCreditsPer1000Tokens: stored?.llmCreditsPer1000Tokens ?? null,
      isDefault: form.isDefault && !form.contactOnly,
      contactOnly: form.contactOnly,
    };
    await apiRequest(
      editId ? "/billing/admin/plans/" + editId : "/billing/admin/plans",
      {
        method: editId ? "PATCH" : "POST",
        auth: true,
        body,
      },
    );
    setSaving(false);
    router.push("/platform/admin/plans");
  };

  return (
    <AdminFrame
      title={editId ? "Edit plan" : "Create plan"}
      description="Define pricing, benefits, and exactly which EBMA services this package includes."
    >
      <button
        onClick={() => router.push("/platform/admin/plans")}
        className="mt-6 flex items-center gap-2 text-sm text-accent hover:text-text"
      >
        <ArrowLeft size={16} /> Back to plan catalogue
      </button>
      {loading ? (
        <p className="mt-8 text-sm text-accent">Loading plan…</p>
      ) : (
        <form
          onSubmit={submit}
          className="mt-6 rounded-2xl border border-brand-border bg-surface p-6"
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <label className="grid gap-1 text-xs text-muted">
              Code
              <input
                required
                className={planInput}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted">
              Plan name
              <input
                required
                className={planInput}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted">
              Price
              <input
                type="number"
                min="0"
                step="0.01"
                className={planInput}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted">
              Currency
              <select
                className={planInput}
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs text-muted">
              Credits
              <input
                type="number"
                min="0"
                className={planInput}
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted md:col-span-3">
              Short description
              <input
                className={planInput}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted">
              Billing interval
              <select
                className={planInput}
                value={form.billingInterval}
                onChange={(e) =>
                  setForm({ ...form, billingInterval: e.target.value })
                }
              >
                <option value="one_time">One time / PAYG</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
          </div>

          {form.planKind === "service" && !form.contactOnly && (
            <div className="mt-6">
              <h2 className="text-sm font-bold text-white">Usage rates (wallet)</h2>
              <p className="mt-1 mb-4 text-xs text-[#74809e]">
                Same configuration previously under Usage settings. 1 credit = ₹1.
              </p>
              <PlanRatesEditor value={rateBundle} onChange={setRateBundle} />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-5 text-sm text-[#b6c0d6]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isDefault}
                disabled={form.contactOnly}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              />
              Default plan for new users
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.contactOnly}
                onChange={(e) =>
                  setForm({
                    ...form,
                    contactOnly: e.target.checked,
                    isDefault: e.target.checked ? false : form.isDefault,
                  })
                }
              />
              Contact-only Custom tier
            </label>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="grid gap-1 text-xs text-muted">
              Customer benefits (one per line)
              <textarea
                rows={6}
                className="rounded-lg border border-brand-border bg-surface p-3 text-sm text-text outline-none focus:border-brand-border"
                value={form.benefits}
                onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                placeholder={
                  "1,000 credits included\nPriority processing\nAccess to all AI services"
                }
              />
            </label>
            <div>
              <p className="text-xs font-semibold text-text">Included services</p>
              <div className="mt-3 space-y-3">
                {(
                  [
                    ["stt", "Speech to text"],
                    ["tts", "Text to speech"],
                    ["llm", "LLM assistant"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 text-sm text-muted"
                  >
                    <input
                      type="checkbox"
                      checked={form.features[key]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          features: { ...form.features, [key]: e.target.checked },
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="mt-5 text-xs leading-5 text-accent">
                Voice Assistant uses the LLM as middleware. STT and TTS remain optional
                input/output capabilities.
              </p>
            </div>
          </div>
          <button
            disabled={saving}
            className="mt-7 flex items-center gap-2 rounded-lg bg-brand-gradient px-5 py-2.5 text-xs font-semibold text-on-brand hover:brightness-110 disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? "Saving…" : editId ? "Save changes" : "Create plan"}
          </button>
        </form>
      )}
    </AdminFrame>
  );
}

export function AdminUsageSettings() {
  return (
    <AdminFrame
      title="Usage settings moved"
      description="Configure TTS, STT, and LLM wallet rates on each plan under Plans and pricing."
    >
      <div className="mt-8 rounded-2xl border border-[#293354] bg-[#101832] p-6">
        <p className="text-sm text-[#aeb9d2]">
          Global usage settings are no longer used. Open a plan to edit charge rules (credits per
          characters / minutes / tokens). Assign that plan to users from User management.
        </p>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/platform/admin/plans";
          }}
          className="mt-5 rounded-lg bg-[#5d50e8] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Go to Plans and pricing
        </button>
      </div>
    </AdminFrame>
  );
}

export function AdminRecords({ kind }: { kind: "subscriptions" | "transactions" }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const endpoint = "/billing/admin/" + kind;

  useEffect(() => {
    void apiRequest<Record<string, unknown>[]>(endpoint, { auth: true }).then(setRows);
  }, [endpoint]);

  return (
    <AdminFrame
      title={kind === "subscriptions" ? "Subscriptions" : "Transactions"}
      description={
        kind === "subscriptions"
          ? "Review active plans and plan history."
          : "Review payments, credit grants, and refunds."
      }
    >
      <div className="mt-8 overflow-x-auto rounded-2xl border border-brand-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-[10px] uppercase tracking-wider text-accent">
            <tr>
              <th className="px-5 py-4">Record</th>
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={String(row.subscription_uuid || row.transaction_uuid)}
                className="border-b border-brand-border last:border-0"
              >
                <td className="px-5 py-4 text-text">
                  {String(row.subscription_uuid || row.transaction_uuid)}
                </td>
                <td className="px-5 py-4 text-muted">{String(row.user_uuid)}</td>
                <td className="px-5 py-4 text-accent">{String(row.status)}</td>
                <td className="px-5 py-4 text-muted">
                  {String(row.created_at || "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-accent">No records yet.</p>
        )}
      </div>
    </AdminFrame>
  );
}
