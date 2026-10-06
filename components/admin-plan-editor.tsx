"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { PlanRatesEditor } from "@/components/plan-rates-editor";
import {
  bundleToStoredPlanRates,
  defaultPlanRateBundle,
  planRatesToBundle,
  type BundleForm,
} from "@/lib/billing/plan-rates-ui";

type Kind = "service" | "wallet_topup";

type FormState = {
  code: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  credits: string;
  billingInterval: string;
  planKind: Kind;
  benefits: string;
  features: { stt: boolean; tts: boolean };
  isDefault: boolean;
  contactOnly: boolean;
};

type Plan = {
  plan_uuid: string;
  code?: string;
  name?: string;
  description?: string | null;
  price_minor?: number;
  currency?: string;
  monthly_credits?: string;
  billing_interval?: string;
  plan_kind?: Kind;
  benefits?: string[];
  features?: { stt: boolean; tts: boolean };
  tts_credits_per_1000_chars?: string | null;
  stt_credits_per_minute?: string | null;
  llm_credits_per_1000_tokens?: string | null;
  is_default?: boolean;
  contact_only?: boolean;
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
  benefits: "",
  features: { stt: true, tts: true },
  isDefault: false,
  contactOnly: false,
};

const input =
  "h-10 rounded-lg border border-[#293354] bg-[#10172d] px-3 text-sm text-white outline-none focus:border-[#6558e9]";

export function AdminPlanEditorPage({ editId }: { editId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(blank);
  const [rateBundle, setRateBundle] = useState<BundleForm>(defaultPlanRateBundle);
  const [loading, setLoading] = useState(Boolean(editId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    void apiRequest<Plan[]>("/billing/admin/plans", { auth: true })
      .then((rows) => {
        const plan = rows.find((item) => item.plan_uuid === editId);
        if (plan) {
          setForm({
            code: plan.code || "",
            name: plan.name || "",
            description: plan.description || "",
            price: String((plan.price_minor || 0) / 100),
            currency: plan.currency || "INR",
            credits: String(plan.monthly_credits || "0"),
            billingInterval: plan.billing_interval || "one_time",
            planKind: plan.plan_kind || "service",
            benefits: (plan.benefits || []).join("\n"),
            features: {
              stt: Boolean(plan.features?.stt),
              tts: Boolean(plan.features?.tts),
            },
            isDefault: Boolean(plan.is_default),
            contactOnly: Boolean(plan.contact_only),
          });
          setRateBundle(planRatesToBundle(plan));
        }
      })
      .finally(() => setLoading(false));
  }, [editId]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const ratesDisabled = form.contactOnly || form.planKind === "wallet_topup";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const stored = ratesDisabled ? null : bundleToStoredPlanRates(rateBundle);
      await apiRequest(
        editId ? `/billing/admin/plans/${editId}` : "/billing/admin/plans",
        {
          method: editId ? "PATCH" : "POST",
          auth: true,
          body: {
            code: form.code,
            name: form.name,
            description: form.description,
            priceMinor: Math.round(Number(form.price) * 100),
            currency: form.currency,
            credits: Number(form.credits),
            billingInterval: form.billingInterval,
            planKind: form.planKind,
            features: {
              stt: form.planKind !== "wallet_topup" && form.features.stt,
              tts: form.planKind !== "wallet_topup" && form.features.tts,
              llm: true,
            },
            benefits: form.benefits
              .split("\n")
              .map((value) => value.trim())
              .filter(Boolean),
            ttsCreditsPer1000Chars: stored?.ttsCreditsPer1000Chars ?? null,
            sttCreditsPerMinute: stored?.sttCreditsPerMinute ?? null,
            llmCreditsPer1000Tokens: stored?.llmCreditsPer1000Tokens ?? null,
            isDefault: form.isDefault && !form.contactOnly,
            contactOnly: form.contactOnly,
          },
        },
      );
      router.push("/platform/admin/plans");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl text-[#d7def0]">
      <p className="font-mono text-[11px] tracking-[.24em] text-[#8f82ff]">CONTROL PANEL</p>
      <h1 className="mt-3 text-4xl font-extrabold text-white">
        {editId ? "Edit plan" : "Create plan"}
      </h1>
      <p className="mt-3 text-sm text-[#8995b3]">
        Set wallet usage rates per plan (TTS, STT, LLM). 1 credit = ₹1.
      </p>
      <button
        type="button"
        onClick={() => router.push("/platform/admin/plans")}
        className="mt-6 flex items-center gap-2 text-sm text-[#a99af3] hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to plan catalogue
      </button>
      {loading ? (
        <p className="mt-8 text-sm text-[#74809e]">Loading plan…</p>
      ) : (
        <form
          onSubmit={submit}
          className="mt-6 rounded-2xl border border-[#293354] bg-[#101832] p-6"
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-xs text-[#8995b3]">
              Code
              <input
                required
                className={input}
                value={form.code}
                onChange={(e) => update("code", e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs text-[#8995b3]">
              Plan name
              <input
                required
                className={input}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs text-[#8995b3]">
              Display price
              <input
                type="number"
                min="0"
                step="0.01"
                className={input}
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs text-[#8995b3]">
              Currency
              <select
                className={input}
                value={form.currency}
                onChange={(e) => update("currency", e.target.value)}
              >
                <option>INR</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs text-[#8995b3] md:col-span-2">
              Short description
              <input
                className={input}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs text-[#8995b3]">
              Plan type
              <select
                className={input}
                value={form.planKind}
                onChange={(e) => update("planKind", e.target.value as Kind)}
              >
                <option value="service">Service plan — PAYG / Custom</option>
                <option value="wallet_topup">Wallet top-up — credits only</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-5 text-sm text-[#b6c0d6]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isDefault}
                disabled={form.contactOnly}
                onChange={(e) => update("isDefault", e.target.checked)}
              />
              Default plan for new users
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.contactOnly}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    contactOnly: e.target.checked,
                    isDefault: e.target.checked ? false : current.isDefault,
                  }))
                }
              />
              Contact-only (Custom — no checkout)
            </label>
          </div>

          <section className="mt-8">
            <h2 className="text-sm font-bold text-white">Usage rates (wallet)</h2>
            <p className="mt-1 text-xs text-[#74809e]">
              These rates apply to users assigned this plan. Previously configured under Usage
              settings.
            </p>
            <div className="mt-4">
              <PlanRatesEditor
                value={rateBundle}
                onChange={setRateBundle}
                disabled={ratesDisabled}
              />
            </div>
          </section>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="grid gap-1 text-xs text-[#8995b3]">
              Customer benefits (one per line)
              <textarea
                rows={6}
                className="rounded-lg border border-[#293354] bg-[#10172d] p-3 text-sm text-white outline-none focus:border-[#6558e9]"
                value={form.benefits}
                onChange={(e) => update("benefits", e.target.value)}
              />
            </label>
            <div>
              <p className="text-xs font-semibold text-white">Included services</p>
              <div className="mt-3 space-y-3">
                {(
                  [
                    ["stt", "Speech to text"],
                    ["tts", "Text to speech"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 text-sm text-[#b6c0d6]">
                    <input
                      type="checkbox"
                      disabled={form.planKind === "wallet_topup"}
                      checked={form.features[key]}
                      onChange={(e) =>
                        update("features", {
                          ...form.features,
                          [key]: e.target.checked,
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
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
    </main>
  );
}
