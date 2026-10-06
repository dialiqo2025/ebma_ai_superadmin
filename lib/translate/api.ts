import type { TranslateRequest, TranslateResult } from "./types";

export async function translateText(
  payload: TranslateRequest,
): Promise<TranslateResult> {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as {
    success?: boolean;
    message?: string;
    data?: TranslateResult | null;
  };

  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.message || "Translation failed");
  }

  return json.data;
}
