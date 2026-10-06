"use client";

import type { ReactNode } from "react";
import { Bot, Mic2, Volume2 } from "lucide-react";
import {
  bundleToApiRates,
  formatCredits,
  type BundleForm,
} from "@/lib/billing/plan-rates-ui";

const input =
  "h-11 w-full rounded-xl border border-[#2a3558] bg-[#0b1224] px-3.5 text-sm font-medium text-white outline-none transition focus:border-[#7c6ff0] focus:ring-2 focus:ring-[#7c6ff0]/20";

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
            Charge rule (1 credit = ₹1)
          </p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2.5">
            <label className="grid gap-1.5">
              <span className="text-[11px] font-medium text-[#8b97b4]">Credits (₹)</span>
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

export function PlanRatesEditor({
  value,
  onChange,
  disabled,
}: {
  value: BundleForm;
  onChange: (next: BundleForm) => void;
  disabled?: boolean;
}) {
  const rates = bundleToApiRates(value);
  const setField = (key: keyof BundleForm, fieldValue: string) => {
    if (disabled) return;
    onChange({ ...value, [key]: fieldValue });
  };

  if (disabled) {
    return (
      <p className="text-sm text-[#74809e]">
        Usage rates are not configured for wallet top-up or contact-only plans.
      </p>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <RateCard
        title="Text to speech"
        subtitle="Wallet charge for generated characters"
        accentBar="bg-[#38bdf8]"
        icon={<Volume2 size={18} className="text-[#38bdf8]" />}
        credits={value.ttsCredits}
        quantity={value.ttsPerChars}
        quantityLabel="Characters"
        onCredits={(v) => setField("ttsCredits", v)}
        onQuantity={(v) => setField("ttsPerChars", v)}
        unitRate={formatCredits(rates.tts_characters)}
        unitRateLabel="credit / character"
        formula={`${value.ttsCredits || "0"} credits per ${value.ttsPerChars || "0"} characters`}
      />
      <RateCard
        title="Speech to text"
        subtitle="Wallet charge for audio duration"
        accentBar="bg-[#a78bfa]"
        icon={<Mic2 size={18} className="text-[#a78bfa]" />}
        credits={value.sttCredits}
        quantity={value.sttPerMinutes}
        quantityLabel="Minutes"
        onCredits={(v) => setField("sttCredits", v)}
        onQuantity={(v) => setField("sttPerMinutes", v)}
        unitRate={formatCredits(rates.stt_seconds)}
        unitRateLabel="credit / second"
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
        unitRate={formatCredits(rates.llm_tokens)}
        unitRateLabel="credit / token"
        formula={`${value.llmCredits || "0"} credits per ${value.llmPerTokens || "0"} tokens`}
      />
    </div>
  );
}
