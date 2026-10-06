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

function roundNice(value: number) {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function bundleToApiRates(form: BundleForm): ApiRates {
  const ttsPer = Math.max(num(form.ttsPerChars, 1), 1e-9);
  const sttMinutes = Math.max(num(form.sttPerMinutes, 1), 1e-9);
  const llmPer = Math.max(num(form.llmPerTokens, 1), 1e-9);
  return {
    tts_characters: roundNice(num(form.ttsCredits) / ttsPer),
    stt_seconds: roundNice(num(form.sttCredits) / (sttMinutes * 60)),
    llm_tokens: roundNice(num(form.llmCredits) / llmPer),
  };
}

export function bundleToStoredPlanRates(form: BundleForm) {
  const api = bundleToApiRates(form);
  return {
    ttsCreditsPer1000Chars: roundNice(api.tts_characters * 1000),
    sttCreditsPerMinute: roundNice(api.stt_seconds * 60),
    llmCreditsPer1000Tokens: roundNice(api.llm_tokens * 1000),
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
    ttsCredits: String(roundNice(tts1000)),
    ttsPerChars: "1000",
    sttCredits: String(roundNice(sttMin)),
    sttPerMinutes: "1",
    llmCredits: String(roundNice(llm1000)),
    llmPerTokens: "1000",
  };
}

export function formatCredits(value: number) {
  return roundNice(value).toLocaleString(undefined, { maximumFractionDigits: 6 });
}
