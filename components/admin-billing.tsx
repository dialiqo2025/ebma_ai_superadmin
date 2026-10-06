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

const planInput =
  "h-10 rounded-lg border border-[#293354] bg-[#10172d] px-3 text-sm text-white outline-none focus:border-[#6558e9]";

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
    <main className="mx-auto max-w-6xl text-[#d7def0]">
      <p className="font-mono text-[11px] tracking-[.24em] text-[#8f82ff]">
        CONTROL PANEL
      </p>
      <h1 className="mt-3 text-4xl font-extrabold text-white">{title}</h1>
      <p className="mt-3 text-sm text-[#8995b3]">{description}</p>
      {children}
    </main>
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
            ["Total plans", plans.length, "text-white"],
            ["Active", active, "text-emerald-300"],
            ["Inactive", plans.length - active, "text-rose-300"],
          ] as const
        ).map(([label, value, color]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-[#202846] bg-[#0c1225] p-4"
          >
            <p className="text-xs text-[#74809e]">{label}</p>
            <p className={"mt-2 text-2xl font-bold " + color}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Plan catalogue</h2>
        <button
          onClick={() => router.push("/platform/admin/plans/new")}
          className="flex items-center gap-2 rounded-lg bg-[#5d50e8] px-4 py-2.5 text-xs font-semibold text-white"
        >
          <Plus size={15} /> New plan
        </button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-[#202846] bg-[#0c1225]">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b border-[#202846] text-[10px] uppercase tracking-wider text-[#74809e]">
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
                className="border-b border-[#202846] last:border-0"
              >
                <td className="px-5 py-4">
                  <p className="font-semibold text-white">{plan.name}</p>
                  <p className="text-xs text-[#74809e]">
                    {plan.code}
                    {plan.is_default ? " · default" : ""}
                    {plan.contact_only ? " · contact" : ""}
                  </p>
                </td>
                <td className="px-5 py-4 text-white">
                  {(plan.price_minor / 100).toFixed(2)} {plan.currency}
                </td>
                <td className="px-5 py-4 text-[#b6c0d6]">
                  {plan.contact_only
                    ? "—"
                    : `₹${Number(plan.tts_credits_per_1000_chars ?? 30)}/1k TTS · ₹${Number(plan.stt_credits_per_minute ?? 1)}/min STT · ₹${Number(plan.llm_credits_per_1000_tokens ?? 1)}/1k LLM`}
                </td>
                <td className="px-5 py-4 text-xs text-[#a99af3]">
                  {Object.entries(plan.features || {})
                    .filter(([, enabled]) => enabled)
                    .map(([service]) => service.toUpperCase())
                    .join(" · ") || "None"}
                </td>
                <td className="px-5 py-4">
                  <span className={plan.active ? "text-emerald-300" : "text-rose-300"}>
                    {plan.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-3 text-xs">
                    <button
                      onClick={() => setView(plan)}
                      className="flex items-center gap-1 text-[#b6c0d6] hover:text-white"
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      onClick={() =>
                        router.push("/platform/admin/plans/" + plan.plan_uuid + "/edit")
                      }
                      className="flex items-center gap-1 text-[#a99af3] hover:text-white"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => void remove(plan)}
                      className="flex items-center gap-1 text-rose-300 hover:text-rose-100"
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
          <p className="p-8 text-center text-sm text-[#74809e]">No plans created yet.</p>
        )}
      </div>

      {view && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setView(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#293354] bg-[#0c1225] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white">{view.name}</h2>
            <p className="mt-2 text-sm text-[#8995b3]">
              {view.description || "No description"}
            </p>
            <p className="mt-5 text-2xl font-bold text-white">
              {(view.price_minor / 100).toFixed(2)} {view.currency}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[#b6c0d6]">
              {(view.benefits || []).map((benefit) => (
                <li key={benefit}>✓ {benefit}</li>
              ))}
            </ul>
            <button
              onClick={() => setView(null)}
              className="mt-6 rounded-lg border border-[#293354] px-4 py-2 text-xs text-white"
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
        className="mt-6 flex items-center gap-2 text-sm text-[#a99af3] hover:text-white"
      >
        <ArrowLeft size={16} /> Back to plan catalogue
      </button>
      {loading ? (
        <p className="mt-8 text-sm text-[#74809e]">Loading plan…</p>
      ) : (
        <form
          onSubmit={submit}
          className="mt-6 rounded-2xl border border-[#293354] bg-[#101832] p-6"
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <label className="grid gap-1 text-xs text-[#8995b3]">
              Code
              <input
                required
                className={planInput}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-xs text-[#8995b3]">
              Plan name
              <input
                required
                className={planInput}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-xs text-[#8995b3]">
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
            <label className="grid gap-1 text-xs text-[#8995b3]">
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
            <label className="grid gap-1 text-xs text-[#8995b3]">
              Credits
              <input
                type="number"
                min="0"
                className={planInput}
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-xs text-[#8995b3] md:col-span-3">
              Short description
              <input
                className={planInput}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-xs text-[#8995b3]">
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
            <label className="grid gap-1 text-xs text-[#8995b3]">
              Customer benefits (one per line)
              <textarea
                rows={6}
                className="rounded-lg border border-[#293354] bg-[#10172d] p-3 text-sm text-white outline-none focus:border-[#6558e9]"
                value={form.benefits}
                onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                placeholder={
                  "1,000 credits included\nPriority processing\nAccess to all AI services"
                }
              />
            </label>
            <div>
              <p className="text-xs font-semibold text-white">Included services</p>
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
                    className="flex items-center gap-3 text-sm text-[#b6c0d6]"
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
              <p className="mt-5 text-xs leading-5 text-[#74809e]">
                Voice Assistant uses the LLM as middleware. STT and TTS remain optional
                input/output capabilities.
              </p>
            </div>
          </div>
          <button
            disabled={saving}
            className="mt-7 flex items-center gap-2 rounded-lg bg-[#5d50e8] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
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
      <div className="mt-8 overflow-x-auto rounded-2xl border border-[#202846] bg-[#0c1225]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#202846] text-[10px] uppercase tracking-wider text-[#74809e]">
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
                className="border-b border-[#202846] last:border-0"
              >
                <td className="px-5 py-4 text-white">
                  {String(row.subscription_uuid || row.transaction_uuid)}
                </td>
                <td className="px-5 py-4 text-[#9aa6c2]">{String(row.user_uuid)}</td>
                <td className="px-5 py-4 text-[#a99af3]">{String(row.status)}</td>
                <td className="px-5 py-4 text-[#9aa6c2]">
                  {String(row.created_at || "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-[#74809e]">No records yet.</p>
        )}
      </div>
    </AdminFrame>
  );
}
