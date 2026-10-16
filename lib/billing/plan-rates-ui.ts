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

export type StoredPlanRates = {
  /** Exact rule entered in superadmin (source of truth for charging). */
  ttsRateCredits: number;
  ttsRateChars: number;
  sttRateCredits: number;
  sttRateMinutes: number;
  llmRateCredits: number;
  llmRateTokens: number;
  /** Legacy normalized columns — kept in sync for rollback. */
  ttsCreditsPer1000Chars: number;
  sttCreditsPerMinute: number;
  llmCreditsPer1000Tokens: number;
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

function positive(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Clean rate values for storage/display.
 * Collapses dust from round-trips while keeping intentional precision up to 6 decimals.
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

/** Exact pair + synced legacy normalized rates for the API payload. */
export function bundleToStoredPlanRates(form: BundleForm): StoredPlanRates {
  const ttsRateCredits = snapRate(num(form.ttsCredits));
  const ttsRateChars = snapRate(positive(form.ttsPerChars, 1000));
  const sttRateCredits = snapRate(num(form.sttCredits));
  const sttRateMinutes = snapRate(positive(form.sttPerMinutes, 1));
  const llmRateCredits = snapRate(num(form.llmCredits));
  const llmRateTokens = snapRate(positive(form.llmPerTokens, 1000));

  return {
    ttsRateCredits,
    ttsRateChars,
    sttRateCredits,
    sttRateMinutes,
    llmRateCredits,
    llmRateTokens,
    ttsCreditsPer1000Chars: snapRate((ttsRateCredits / ttsRateChars) * 1000),
    sttCreditsPerMinute: snapRate(sttRateCredits / sttRateMinutes),
    llmCreditsPer1000Tokens: snapRate((llmRateCredits / llmRateTokens) * 1000),
  };
}

export function bundleToApiRates(form: BundleForm): ApiRates {
  const stored = bundleToStoredPlanRates(form);
  return {
    tts_characters: snapRate(stored.ttsRateCredits / stored.ttsRateChars),
    stt_seconds: snapRate(stored.sttRateCredits / (stored.sttRateMinutes * 60)),
    llm_tokens: snapRate(stored.llmRateCredits / stored.llmRateTokens),
  };
}

/** Prefer exact pair columns; fall back to legacy normalized columns. */
export function planRatesToBundle(input: {
  tts_rate_credits?: string | number | null;
  tts_rate_chars?: string | number | null;
  stt_rate_credits?: string | number | null;
  stt_rate_minutes?: string | number | null;
  llm_rate_credits?: string | number | null;
  llm_rate_tokens?: string | number | null;
  tts_credits_per_1000_chars?: string | number | null;
  stt_credits_per_minute?: string | number | null;
  llm_credits_per_1000_tokens?: string | number | null;
}): BundleForm {
  const hasTtsPair =
    input.tts_rate_credits != null && input.tts_rate_chars != null;
  const hasSttPair =
    input.stt_rate_credits != null && input.stt_rate_minutes != null;
  const hasLlmPair =
    input.llm_rate_credits != null && input.llm_rate_tokens != null;

  return {
    ttsCredits: String(
      snapRate(
        Number(
          hasTtsPair
            ? input.tts_rate_credits
            : (input.tts_credits_per_1000_chars ?? 30),
        ),
      ),
    ),
    ttsPerChars: String(
      snapRate(Number(hasTtsPair ? input.tts_rate_chars : 1000)),
    ),
    sttCredits: String(
      snapRate(
        Number(
          hasSttPair
            ? input.stt_rate_credits
            : (input.stt_credits_per_minute ?? 1),
        ),
      ),
    ),
    sttPerMinutes: String(
      snapRate(Number(hasSttPair ? input.stt_rate_minutes : 1)),
    ),
    llmCredits: String(
      snapRate(
        Number(
          hasLlmPair
            ? input.llm_rate_credits
            : (input.llm_credits_per_1000_tokens ?? 1),
        ),
      ),
    ),
    llmPerTokens: String(
      snapRate(Number(hasLlmPair ? input.llm_rate_tokens : 1000)),
    ),
  };
}

export function formatCredits(value: number) {
  return snapRate(value).toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function formatConfiguredRate(
  credits: number,
  quantity: number,
  unit: string,
) {
  const qty = Number.isInteger(quantity)
    ? quantity.toLocaleString()
    : snapRate(quantity).toLocaleString(undefined, { maximumFractionDigits: 6 });
  return `₹${snapRate(credits).toLocaleString()} / ${qty} ${unit}`;
}
