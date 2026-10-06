import { NextResponse } from "next/server";

type Body = {
  text?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
};

const LANG_ALIASES: Record<string, string> = {
  auto: "autodetect",
  zh: "zh-CN",
  mandarin: "zh-CN",
};

const CHUNK_SIZE = 450;

function normalizeLang(code: string) {
  const key = code.trim().toLowerCase();
  return LANG_ALIASES[key] || key;
}

function chunkText(text: string, size = CHUNK_SIZE) {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > size) {
    let cut = remaining.lastIndexOf(" ", size);
    if (cut < size * 0.5) cut = size;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function translateChunk(text: string, source: string, target: string) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `${source}|${target}`);

  const upstream = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!upstream.ok) {
    throw new Error(`Translate provider error (${upstream.status})`);
  }

  const payload = (await upstream.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: number | string;
    responseDetails?: string;
  };

  const translated = String(payload.responseData?.translatedText || "").trim();
  const statusNum = Number(payload.responseStatus);
  if (!translated || (Number.isFinite(statusNum) && statusNum !== 200)) {
    throw new Error(payload.responseDetails || "Translation failed");
  }
  if (/^=?QUERY LENGTH LIMIT/i.test(translated)) {
    throw new Error("Text is too long to translate in one request");
  }
  return translated;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const text = String(body.text || "").trim();
    const targetLanguage = String(body.targetLanguage || "").trim();
    const sourceLanguage = String(body.sourceLanguage || "auto").trim() || "auto";

    if (!text) {
      return NextResponse.json(
        { success: false, message: "Text is required", data: null },
        { status: 422 },
      );
    }
    if (!targetLanguage || targetLanguage === "auto") {
      return NextResponse.json(
        {
          success: false,
          message: "A concrete target language is required",
          data: null,
        },
        { status: 422 },
      );
    }
    if (sourceLanguage !== "auto" && sourceLanguage === targetLanguage) {
      return NextResponse.json({
        success: true,
        message: "Same language",
        data: {
          translatedText: text,
          sourceLanguage,
          targetLanguage,
        },
      });
    }

    const source = normalizeLang(sourceLanguage);
    const target = normalizeLang(targetLanguage);
    const parts = chunkText(text);
    const translatedParts: string[] = [];
    for (const part of parts) {
      translatedParts.push(await translateChunk(part, source, target));
    }

    return NextResponse.json({
      success: true,
      message: "Translated",
      data: {
        translatedText: translatedParts.join(" ").trim(),
        sourceLanguage,
        targetLanguage,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Translation failed",
        data: null,
      },
      { status: 500 },
    );
  }
}
