"use client";

import type { ReactNode } from "react";
import { Bot, Mic2, Volume2 } from "lucide-react";
import {
  bundleToStoredPlanRates,
  formatCredits,
  type BundleForm,
} from "@/lib/billing/plan-rates-ui";

const input =
  "h-11 w-full rounded-xl border border-brand-border bg-surface px-3.5 text-sm font-medium text-text outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

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
    <article className="relative overflow-hidden rounded-2xl border border-brand-border bg-surface-raised">
      <div className={`absolute inset-x-0 top-0 h-1 ${accentBar}`} />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-border bg-surface-high">
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold tracking-wide text-text">{title}</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">{subtitle}</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-brand-border bg-surface p-3.5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Charge rule (1 credit = ₹1)
          </p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2.5">
            <label className="grid gap-1.5">
              <span className="text-[11px] font-medium text-muted">Credits (₹)</span>
              <input
                type="number"
                min="0"
                step="any"
                className={input}
                value={credits}
                onChange={(e) => onCredits(e.target.value)}
              />
            </label>
            <span className="pb-3 text-[12px] font-semibold text-muted">per</span>
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
          <p className="rounded-lg bg-surface-high px-3 py-2.5 text-[12px] leading-relaxed text-text">
            {formula}
          </p>
          <p className="px-1 text-[11px] text-muted">
            Stored as <span className="font-mono text-text">{unitRate}</span> {unitRateLabel}
          </p>
        </div>
      </div>
    </article>
  );
}

export function PlanRatesEditor({
  value,
  onChange,
  disabled,
}: {
  value: BundleForm;
  onChange: (next: BundleForm) => void;
  disabled?: boolean;
}) {
  // Show the same rates that will be sent in the PATCH/POST payload.
  const stored = bundleToStoredPlanRates(value);
  const setField = (key: keyof BundleForm, fieldValue: string) => {
    if (disabled) return;
    onChange({ ...value, [key]: fieldValue });
  };

  if (disabled) {
    return (
      <p className="text-sm text-muted">
        Usage rates are not configured for wallet top-up or contact-only plans.
      </p>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <RateCard
        title="Text To Speech"
        subtitle="Wallet charge for generated characters"
        accentBar="bg-[#38bdf8]"
        icon={<Volume2 size={18} className="text-[#38bdf8]" />}
        credits={value.ttsCredits}
        quantity={value.ttsPerChars}
        quantityLabel="Characters"
        onCredits={(v) => setField("ttsCredits", v)}
        onQuantity={(v) => setField("ttsPerChars", v)}
        unitRate={formatCredits(stored.ttsCreditsPer1000Chars)}
        unitRateLabel="credits / 1000 characters"
        formula={`${value.ttsCredits || "0"} credits per ${value.ttsPerChars || "0"} characters`}
      />
      <RateCard
        title="Speech To Text"
        subtitle="Wallet charge for audio duration"
        accentBar="bg-[#a78bfa]"
        icon={<Mic2 size={18} className="text-[#a78bfa]" />}
        credits={value.sttCredits}
        quantity={value.sttPerMinutes}
        quantityLabel="Minutes"
        onCredits={(v) => setField("sttCredits", v)}
        onQuantity={(v) => setField("sttPerMinutes", v)}
        unitRate={formatCredits(stored.sttCreditsPerMinute)}
        unitRateLabel="credits / minute"
        formula={`${value.sttCredits || "0"} credits per ${value.sttPerMinutes || "0"} minute(s)`}
      />
      <RateCard
        title="LLM"
        subtitle="Wallet charge for tokens processed"
        accentBar="bg-[#f472b6]"
        icon={<Bot size={18} className="text-[#f472b6]" />}
        credits={value.llmCredits}
        quantity={value.llmPerTokens}
        quantityLabel="Tokens"
        onCredits={(v) => setField("llmCredits", v)}
        onQuantity={(v) => setField("llmPerTokens", v)}
        unitRate={formatCredits(stored.llmCreditsPer1000Tokens)}
        unitRateLabel="credits / 1000 tokens"
        formula={`${value.llmCredits || "0"} credits per ${value.llmPerTokens || "0"} tokens`}
      />
    </div>
  );
}
