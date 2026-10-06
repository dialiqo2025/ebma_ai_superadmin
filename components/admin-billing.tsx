"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Eye,
  Mic2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Volume2,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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
};

type ApiRates = {
  tts_characters: number;
  stt_seconds: number;
  llm_tokens: number;
};

type BundleForm = {
  ttsCredits: string;
  ttsPerChars: string;
  sttCredits: string;
  sttPerMinutes: string;
  llmCredits: string;
  llmPerTokens: string;
};

const blank: FormState = {
  code: "",
  name: "",
  description: "",
  price: "0",
  currency: "INR",
  credits: "1000",
  billingInterval: "one_time",
  planKind: "service",
  features: { stt: true, tts: true, llm: true },
  benefits: "",
};

const defaultBundle: BundleForm = {
  ttsCredits: "10",
  ttsPerChars: "100",
  sttCredits: "50",
  sttPerMinutes: "1",
  llmCredits: "1",
  llmPerTokens: "1000",
};

const input =
  "h-11 w-full rounded-xl border border-[#2a3558] bg-[#0b1224] px-3.5 text-sm font-medium text-white outline-none transition focus:border-[#7c6ff0] focus:ring-2 focus:ring-[#7c6ff0]/20";

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
    <article className="relative overflow-hidden rounded-2xl border border-[#243056] bg-[#0e152c]">
      <div className={`absolute inset-x-0 top-0 h-1 ${accentBar}`} />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5">
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold tracking-wide text-white">{title}</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-[#7f8ba8]">{subtitle}</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[#2a3558] bg-[#0b1224] p-3.5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6f7c9c]">
            Charge rule
          </p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2.5">
            <label className="grid gap-1.5">
              <span className="text-[11px] font-medium text-[#8b97b4]">Credits</span>
              <input
                type="number"
                min="0"
                step="any"
                className={input}
                value={credits}
                onChange={(e) => onCredits(e.target.value)}
              />
            </label>
            <span className="pb-3 text-[12px] font-semibold text-[#6f7c9c]">per</span>
            <label className="grid gap-1.5">
              <span className="text-[11px] font-medium text-[#8b97b4]">{quantityLabel}</span>
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
          <p className="rounded-lg bg-[#121a33] px-3 py-2.5 text-[12px] leading-relaxed text-[#b7c1d8]">
            {formula}
          </p>
          <p className="px-1 text-[11px] text-[#6f7c9c]">
            Stored as <span className="font-mono text-[#c5cee3]">{unitRate}</span>{" "}
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
              <th className="px-5 py-4">Credits</th>
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
                  <p className="text-xs text-[#74809e]">{plan.code}</p>
                </td>
                <td className="px-5 py-4 text-white">
                  {(plan.price_minor / 100).toFixed(2)} {plan.currency}
                </td>
                <td className="px-5 py-4 text-[#b6c0d6]">
                  {Number(plan.monthly_credits).toLocaleString()}
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
          });
        }
      })
      .finally(() => setLoading(false));
  }, [editId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const body = {
      ...form,
      priceMinor: Math.round(Number(form.price) * 100),
      credits: Number(form.credits),
      benefits: form.benefits
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    };
    delete (body as { price?: string }).price;
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
                <option value="one_time">One time</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
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
  const [form, setForm] = useState<BundleForm>(defaultBundle);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const rates = bundleToApiRates(form);
  const preview = {
    tts1k: rates.tts_characters * 1000,
    stt1m: rates.stt_seconds * 60,
    llm1k: rates.llm_tokens * 1000,
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    void apiRequest<ApiRates>("/billing/admin/rates", { auth: true })
      .then((data) => setForm(apiRatesToBundle(data)))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load rates"),
      )
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const body = bundleToApiRates(form);
      if (
        !Number.isFinite(body.tts_characters) ||
        !Number.isFinite(body.stt_seconds) ||
        !Number.isFinite(body.llm_tokens)
      ) {
        throw new Error("Enter valid non-negative numbers.");
      }
      await apiRequest("/billing/admin/rates", { method: "PUT", auth: true, body });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rates");
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof BundleForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  return (
    <AdminFrame
      title="Usage settings"
      description="Define credit burn in plain language. Example: 10 credits for every 100 characters, or 50 credits per minute of audio."
    >
      {loading ? (
        <p className="mt-8 text-sm text-[#74809e]">Loading rates…</p>
      ) : (
        <div className="mt-8 space-y-5">
          <section className="rounded-2xl border border-[#202846] bg-[#0c1225] p-6 sm:p-7">
            {/* <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Credit rates</h2>
                <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-[#7f8ba8]">
                  Set how many credits each service consumes. Values are converted to
                  per-character, per-second, and per-token rates for the billing API.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="rounded-lg border border-[#2f3a5c] px-3 py-2 text-xs font-semibold text-[#a99af3] transition hover:border-[#6558e9] hover:bg-[#151c36] hover:text-white"
              >
                {showAdvanced ? "Hide API values" : "Show API values"}
              </button>
            </div> */}

            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              <RateCard
                title="Text to speech"
                subtitle="Credits for generated characters"
                accentBar="bg-[#38bdf8]"
                icon={<Volume2 size={18} className="text-[#38bdf8]" />}
                credits={form.ttsCredits}
                quantity={form.ttsPerChars}
                quantityLabel="Characters"
                onCredits={(v) => setField("ttsCredits", v)}
                onQuantity={(v) => setField("ttsPerChars", v)}
                unitRate={formatCredits(rates.tts_characters)}
                unitRateLabel="credit / character"
                formula={`${form.ttsCredits || "0"} credits / ${form.ttsPerChars || "0"} characters`}
              />
              <RateCard
                title="Speech to text"
                subtitle="Credits for audio duration"
                accentBar="bg-[#a78bfa]"
                icon={<Mic2 size={18} className="text-[#a78bfa]" />}
                credits={form.sttCredits}
                quantity={form.sttPerMinutes}
                quantityLabel="Minutes"
                onCredits={(v) => setField("sttCredits", v)}
                onQuantity={(v) => setField("sttPerMinutes", v)}
                unitRate={formatCredits(rates.stt_seconds)}
                unitRateLabel="credit / second"
                formula={`${form.sttCredits || "0"} credits / ${form.sttPerMinutes || "0"} minute(s)`}
              />
              <RateCard
                title="LLM"
                subtitle="Credits for tokens processed"
                accentBar="bg-[#f472b6]"
                icon={<Bot size={18} className="text-[#f472b6]" />}
                credits={form.llmCredits}
                quantity={form.llmPerTokens}
                quantityLabel="Tokens"
                onCredits={(v) => setField("llmCredits", v)}
                onQuantity={(v) => setField("llmPerTokens", v)}
                unitRate={formatCredits(rates.llm_tokens)}
                unitRateLabel="credit / token"
                formula={`${form.llmCredits || "0"} credits / ${form.llmPerTokens || "0"} tokens`}
              />
            </div>

            {showAdvanced && (
              <div className="mt-5 grid gap-3 rounded-xl border border-dashed border-[#2f3a5c] bg-[#0a1020] p-4 sm:grid-cols-3">
                {(
                  [
                    ["tts_characters", rates.tts_characters],
                    ["stt_seconds", rates.stt_seconds],
                    ["llm_tokens", rates.llm_tokens],
                  ] as const
                ).map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-[#121a33] px-3.5 py-3">
                    <p className="font-mono text-[11px] text-[#6f7c9c]">{key}</p>
                    <p className="mt-1 font-mono text-sm text-white">
                      {formatCredits(value)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#202846] pt-5">
              <div className="min-h-[18px] text-xs">
                {error ? (
                  <span className="text-rose-300">{error}</span>
                ) : saved ? (
                  <span className="text-emerald-300">Rates saved successfully</span>
                ) : (
                  <span className="text-[#6f7c9c]">
                    Changes apply to new usage after save
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#5d50e8] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(93,80,232,.28)] transition hover:bg-[#6a5cf4] disabled:opacity-50"
              >
                <Save size={15} /> {saving ? "Saving…" : "Save rates"}
              </button>
            </div>
          </section>

          {/* <section className="rounded-2xl border border-[#202846] bg-[#0c1225] p-6 sm:p-7">
            <h2 className="text-lg font-bold text-white">Live preview</h2>
            <p className="mt-1.5 text-[13px] text-[#7f8ba8]">
              Estimated credit burn with the rates above (before plan discounts).
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {(
                [
                  {
                    label: "TTS · 1,000 chars",
                    value: preview.tts1k,
                    bar: "bg-[#38bdf8]",
                  },
                  {
                    label: "STT · 1 minute",
                    value: preview.stt1m,
                    bar: "bg-[#a78bfa]",
                  },
                  {
                    label: "LLM · 1,000 tokens",
                    value: preview.llm1k,
                    bar: "bg-[#f472b6]",
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.label}
                  className="relative overflow-hidden rounded-2xl border border-[#243056] bg-[#0e152c] p-5"
                >
                  <div className={`absolute inset-x-0 top-0 h-1 ${item.bar}`} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6f7c9c]">
                    {item.label}
                  </p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-white">
                    {formatCredits(item.value)}
                  </p>
                  <p className="mt-1 text-[12px] text-[#8b97b4]">credits</p>
                </div>
              ))}
            </div>
          </section> */}
        </div>
      )}
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
