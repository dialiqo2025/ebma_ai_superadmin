export type ApiRates = {
  tts_characters: number;
  stt_seconds: number;
  llm_tokens: number;
};

export type BundleForm = {
  ttsCredits: string;
  ttsPerChars: string;
  sttCredits: string;
  sttPerMinutes: string;
  llmCredits: string;
  llmPerTokens: string;
};

export const defaultPlanRateBundle: BundleForm = {
  ttsCredits: "30",
  ttsPerChars: "1000",
  sttCredits: "1",
  sttPerMinutes: "1",
  llmCredits: "1",
  llmPerTokens: "1000",
};

function num(value: string, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Clean rate values for storage/display.
 * Collapses dust from the old minutes↔seconds round-trip (e.g. 1.00002 → 1)
 * while keeping intentional precision up to 6 decimals.
 */
function snapRate(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  for (const places of [0, 1, 2, 3]) {
    const factor = 10 ** places;
    const candidate = Math.round(value * factor) / factor;
    if (Math.abs(candidate - value) < 5e-5) {
      return Object.is(candidate, -0) ? 0 : candidate;
    }
  }
  const at6 = Math.round(value * 1_000_000) / 1_000_000;
  return Object.is(at6, -0) ? 0 : at6;
}

export function bundleToApiRates(form: BundleForm): ApiRates {
  const stored = bundleToStoredPlanRates(form);
  return {
    tts_characters: snapRate(stored.ttsCreditsPer1000Chars / 1000),
    // Derive seconds from the clean per-minute rate (not the reverse).
    stt_seconds: snapRate(stored.sttCreditsPerMinute / 60),
    llm_tokens: snapRate(stored.llmCreditsPer1000Tokens / 1000),
  };
}

export function bundleToStoredPlanRates(form: BundleForm) {
  // Direct from form fields — never round-trip through per-second.
  const ttsPer = Math.max(num(form.ttsPerChars, 1), 1e-9);
  const sttMinutes = Math.max(num(form.sttPerMinutes, 1), 1e-9);
  const llmPer = Math.max(num(form.llmPerTokens, 1), 1e-9);
  return {
    ttsCreditsPer1000Chars: snapRate((num(form.ttsCredits) / ttsPer) * 1000),
    sttCreditsPerMinute: snapRate(num(form.sttCredits) / sttMinutes),
    llmCreditsPer1000Tokens: snapRate((num(form.llmCredits) / llmPer) * 1000),
  };
}

export function planRatesToBundle(input: {
  tts_credits_per_1000_chars?: string | number | null;
  stt_credits_per_minute?: string | number | null;
  llm_credits_per_1000_tokens?: string | number | null;
}): BundleForm {
  const tts1000 = Number(input.tts_credits_per_1000_chars ?? 30);
  const sttMin = Number(input.stt_credits_per_minute ?? 1);
  const llm1000 = Number(input.llm_credits_per_1000_tokens ?? 1);
  return {
    ttsCredits: String(snapRate(tts1000)),
    ttsPerChars: "1000",
    // Snap so previously corrupted 1.00002 loads as 1 in the form.
    sttCredits: String(snapRate(sttMin)),
    sttPerMinutes: "1",
    llmCredits: String(snapRate(llm1000)),
    llmPerTokens: "1000",
  };
}

export function formatCredits(value: number) {
  return snapRate(value).toLocaleString(undefined, { maximumFractionDigits: 6 });
}
