"use client";

import { useEffect } from "react";
import {
  ChevronRight,
  Download,
  Loader2,
  Play,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { useUsageGate } from "@/components/capability-notice";
import { useMemo, useState } from "react";
import { CURL_BASE_URL, CurlSnippet, curlAuthHeader, shellQuote, type CurlStep } from "@/components/curl-snippet";
import { useTtsCompose, useTtsHistory, useTtsOptions } from "@/hooks/use-tts";
import { translateText } from "@/lib/translate";
import type { TtsGeneration, TtsOutputFormat, TtsStatus } from "@/lib/tts";

const BRAND_GRADIENT =
  "bg-brand-gradient";

const LANGUAGE_OPTIONS = [
  { value: "hi", label: "Hindi" },
  { value: "ta", label: "Tamil" },
  { value: "bn", label: "Bengali" },
  { value: "te", label: "Telugu" },
  { value: "mr", label: "Marathi" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ar", label: "Arabic" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Mandarin" },
  { value: "ko", label: "Korean" },
  { value: "ru", label: "Russian" },
  { value: "pt", label: "Portuguese" },
  { value: "gu", label: "Gujarati" },
  { value: "kn", label: "Kannada" },
  { value: "ml", label: "Malayalam" },
  { value: "pa", label: "Punjabi" },
  { value: "ur", label: "Urdu" },
];

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function Toggle({
  on,
  onToggle,
  disabled,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className={cx(
          "relative h-[22px] w-10 rounded-full border-0 p-0 transition-colors disabled:opacity-50",
          on ? "bg-brand-gradient" : "bg-surface-high",
        )}
      >
        <span
          className={cx(
            "absolute top-[3px] left-[3px] h-4 w-4 rounded-full bg-white shadow transition-transform",
            on && "translate-x-[18px]",
          )}
        />
      </button>
      <span className="text-sm text-muted">{label}</span>
    </label>
  );
}

function statusTone(status: TtsStatus) {
  switch (status) {
    case "completed":
      return "text-success border-success-border";
    case "failed":
      return "text-danger border-danger-border";
    case "processing":
      return "text-cyan border-brand-border";
    default:
      return "text-warning border-warning-border";
  }
}

function GenerationRow({
  item,
  busy,
  deleting,
  usageBlocked,
  playingUuid,
  loadingUuid,
  onPlay,
  onDownload,
  onRegenerate,
  onDelete,
  onSelect,
}: {
  item: TtsGeneration;
  busy: boolean;
  deleting: boolean;
  usageBlocked?: boolean;
  playingUuid: string | null;
  loadingUuid: string | null;
  onPlay: () => void;
  onDownload: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
  onSelect: () => void;
}) {
  const canEdit = item.status === "queued" || item.status === "failed";
  const canDelete = item.status !== "processing";
  const canPlay = item.status === "completed";

  return (
    <div
      className={cx(
        "rounded-xl border border-brand-border bg-brand-soft px-4 py-3",
        deleting && "opacity-70",
      )}
    >
      <button type="button" onClick={onSelect} className="w-full text-left" disabled={deleting}>
        <p className="line-clamp-2 text-[13px] text-text">{item.text}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={cx(
              "rounded-full border px-2 py-0.5 text-[12px] font-medium uppercase tracking-wide",
              statusTone(item.status),
            )}
          >
            {item.status}
          </span>
          <span className="font-mono text-[12px] text-muted">
            {item.language} · {item.voiceMode} · {item.outputFormat}
          </span>
        </div>
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        {canPlay && (
          <button
            type="button"
            disabled={busy || deleting || loadingUuid === item.generationUuid}
            onClick={onPlay}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border px-2.5 py-1.5 text-[12px] text-muted hover:bg-brand-soft disabled:opacity-50"
          >
            <Play size={12} fill="currentColor" />
            {playingUuid === item.generationUuid ? "Playing…" : "Play"}
          </button>
        )}
        {canPlay && (
          <button
            type="button"
            disabled={busy || deleting || loadingUuid === item.generationUuid}
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border px-2.5 py-1.5 text-[12px] text-muted hover:bg-brand-soft disabled:opacity-50"
          >
            <Download size={12} /> Download
          </button>
        )}
        {canEdit && (
          <button
            type="button"
            disabled={busy || deleting || usageBlocked}
            onClick={onRegenerate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border px-2.5 py-1.5 text-[12px] text-muted hover:bg-brand-soft disabled:opacity-50"
          >
            <RefreshCcw size={12} /> Generate
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            disabled={busy || deleting}
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border px-2.5 py-1.5 text-[12px] text-danger hover:bg-brand-soft disabled:opacity-50"
          >
            {deleting ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Deleting…
              </>
            ) : (
              <>
                <Trash2 size={12} /> Delete
              </>
            )}
          </button>
        )}
      </div>
      {item.error?.message && (
        <p className="mt-2 text-[12px] text-danger">{item.error.message}</p>
      )}
    </div>
  );
}

export function TextToSpeechDemo() {
  const { blocked: usageBlocked } = useUsageGate();
  const { options, loading: loadingOptions, error: optionsError } = useTtsOptions();
  const compose = useTtsCompose(options);
  const history = useTtsHistory(8);
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [selected, setSelected] = useState<TtsGeneration | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState("");

  useEffect(() => {
    if (!compose.busy) void history.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compose.busy, compose.current?.status]);

  const formats: TtsOutputFormat[] =
    options?.audioFormats?.length ? options.audioFormats : ["wav", "mp3", "ogg"];
  const speed = options?.speed ?? { min: 0.5, max: 1.5, step: 0.1, default: 1 };
  const pitch = options?.pitch ?? { min: 0.5, max: 1.5, step: 0.1, default: 1 };
  const modelReady = options?.modelConfigured ?? false;

  const curlSteps = useMemo<CurlStep[]>(() => {
    const body = {
      text: compose.text.trim().slice(0, compose.maxChars) || "Hello from EBMA text to speech.",
      language: compose.language || "auto",
      voiceMode: compose.voiceMode,
      // The API identifies cloned voices by id; uploaded samples are a portal-only flow.
      ...(compose.voiceMode === "clone" ? { voiceId: "<your_voice_id>" } : {}),
      speed: Number(compose.speed.toFixed(1)),
      pitch: Number(compose.pitch.toFixed(1)),
      outputFormat: compose.outputFormat,
    };
    const generation = `${CURL_BASE_URL}/tts/generations`;
    return [
      {
        title: "Create generation",
        command: `curl -X POST ${generation} \\\n  ${curlAuthHeader} \\\n  -H "Content-Type: application/json" \\\n  -d ${shellQuote(JSON.stringify(body, null, 2))}`,
        note: "Copy generationUuid from the response into the next commands.",
      },
      {
        title: "Generate audio",
        command: `curl -X POST ${generation}/<generation_uuid>/generate \\\n  ${curlAuthHeader}`,
        note: "Skip this if the server auto-processes new requests. Poll GET /tts/generations/<generation_uuid> until status is completed.",
      },
      {
        title: "Download audio",
        command: `curl ${generation}/<generation_uuid>/audio \\\n  ${curlAuthHeader} \\\n  -o speech.${compose.outputFormat}`,
      },
    ];
  }, [compose.text, compose.maxChars, compose.language, compose.voiceMode, compose.speed, compose.pitch, compose.outputFormat]);

  const onSelectLanguage = async (nextLang: string) => {
    if (nextLang === compose.language && !translating) {
      compose.setLanguage(nextLang);
      return;
    }

    const previousLang = compose.language;
    compose.setLanguage(nextLang);
    setTranslateError("");

    const sourceText = compose.text.trim();
    if (!sourceText || nextLang === "auto") return;

    setTranslating(true);
    try {
      const result = await translateText({
        text: sourceText,
        sourceLanguage: previousLang === "auto" ? "auto" : previousLang,
        targetLanguage: nextLang,
      });
      compose.setText(result.translatedText.slice(0, compose.maxChars));
    } catch (err) {
      setTranslateError(
        err instanceof Error ? err.message : "Failed to translate text",
      );
    } finally {
      setTranslating(false);
    }
  };

  const statusLine = translateError
    ? translateError
    : translating
      ? "Translating text…"
      : compose.error
        ? compose.error
        : compose.audio.error
          ? compose.audio.error
          : optionsError
            ? optionsError
            : compose.busy
              ? "Generating audio…"
              : loadingOptions
                ? "Loading TTS options…"
                : !modelReady
                  ? "TTS model is not configured."
                  : compose.current
                    ? `Last: ${compose.current.status}`
                    : "Ready.";

  return (
    <div className="text-muted">
      <section
        className="relative pb-8 text-center"
        style={{
          backgroundImage:
            "radial-gradient(55% 55% at 50% 0%, color-mix(in srgb, var(--theme-purple) 16%, transparent), transparent 70%)",
        }}
      >
        <p
          className={cx(
            BRAND_GRADIENT,
            "bg-clip-text font-mono text-[13px] font-semibold tracking-[0.25em] text-transparent",
          )}
        >
          EXPRESSIVE SPEECH SYNTHESIS
        </p>
        <h1 className="mt-5 text-4xl font-extrabold leading-none tracking-tight text-text sm:text-[56px]">
          Text to Speech
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted">
          Type text, pick language and voice settings, then generate speech. Audio is fetched with
          your session — never a naked public URL.
        </p>
      </section>

      <section className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-brand-border bg-brand-soft p-5 sm:p-7">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[12px] tracking-wider text-muted">
              TEXT TO SPEAK
            </span>
            <span className="font-mono text-[12px] text-muted">
              {compose.text.length} / {compose.maxChars}
            </span>
          </div>

          <textarea
            value={compose.text}
            maxLength={compose.maxChars}
            onChange={(e) => compose.setText(e.target.value)}
            rows={5}
            className="w-full resize-y rounded-xl border border-brand-border bg-brand-soft px-4 py-3 text-[15px] leading-relaxed text-text outline-none transition-colors placeholder:text-muted hover:border-brand-border focus:border-brand-border"
            placeholder="Type or paste text to synthesize…"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((opt) => {
              const active = compose.language === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={translating || compose.busy}
                  onClick={() => void onSelectLanguage(opt.value)}
                  className={cx(
                    "rounded-full border px-3 py-1 text-[12px] transition-colors disabled:opacity-50",
                    active
                      ? "border-brand-border bg-brand-soft text-text"
                      : "border-brand-border bg-brand-soft text-muted hover:border-brand-border hover:bg-brand-soft",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {translating && (
            <p className="mt-2 text-[12px] text-muted">Translating…</p>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-1">
            <label className="flex flex-col gap-2 sm:max-w-xs">
              <span className="font-mono text-[12px] tracking-wider text-muted">FORMAT</span>
              <select
                value={compose.outputFormat}
                onChange={(e) =>
                  compose.setOutputFormat(e.target.value as TtsOutputFormat)
                }
                className="appearance-none rounded-lg border border-brand-border bg-brand-soft px-4 py-2.5 text-[14px] font-semibold text-text outline-none hover:border-brand-border focus:border-brand-border"
              >
                {formats.map((fmt) => (
                  <option key={fmt} value={fmt} className="bg-brand-soft">
                    {fmt.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-6">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[12px] tracking-wider text-muted">VOICE</span>
              <div className="flex overflow-hidden rounded-lg border border-brand-border">
                <button
                  type="button"
                  onClick={() => {
                    compose.setVoiceMode("default");
                    compose.setVoiceSample(null);
                    compose.setSampleTranscript("");
                  }}
                  className={cx(
                    "px-4 py-2.5 text-[13px] font-semibold transition-colors",
                    compose.voiceMode === "default"
                      ? cx(BRAND_GRADIENT, "text-on-brand shadow-[0_8px_20px_-8px_rgba(38,96,234,0.55)]")
                      : "bg-brand-soft text-muted hover:bg-brand-soft",
                  )}
                >
                  Default voice
                </button>
                <button
                  type="button"
                  onClick={() => compose.setVoiceMode("clone")}
                  className={cx(
                    "border-l border-brand-border px-4 py-2.5 text-[13px] font-semibold transition-colors",
                    compose.voiceMode === "clone"
                      ? cx(BRAND_GRADIENT, "text-on-brand")
                      : "bg-brand-soft text-muted hover:bg-brand-soft",
                  )}
                >
                  Clone a voice
                </button>
              </div>
            </div>

            <div className="pb-2.5">
              <Toggle
                label="Stream audio while generating"
                on={compose.playWhileGenerating}
                disabled={compose.busy}
                onToggle={() =>
                  compose.setPlayWhileGenerating(!compose.playWhileGenerating)
                }
              />
            </div>
          </div>

          {compose.voiceMode === "clone" && (
            <div className="mt-4 space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="font-mono text-[12px] tracking-wider text-muted">
                    VOICE SAMPLE (WAV, MP3, FLAC OR OGG; 5 TO 15 S OF CLEAR SPEECH)
                  </span>
                  <div className="flex items-center gap-3 rounded-lg border border-brand-border bg-brand-soft px-3 py-2.5">
                    <input
                      type="file"
                      accept=".wav,.mp3,.flac,.ogg,audio/wav,audio/mpeg,audio/flac,audio/ogg"
                      className="max-w-full text-[13px] text-muted file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-text"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        compose.setVoiceSample(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  <span className="text-[12px] text-muted">
                    {compose.voiceSample
                      ? compose.voiceSample.name
                      : "No file chosen"}
                  </span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="font-mono text-[12px] tracking-wider text-muted">
                    WHAT IS SAID IN THE SAMPLE (OPTIONAL; IMPROVES THE MATCH)
                  </span>
                  <input
                    value={compose.sampleTranscript}
                    onChange={(e) => compose.setSampleTranscript(e.target.value)}
                    placeholder="Optional transcript of the sample…"
                    className="rounded-lg border border-brand-border bg-brand-soft px-4 py-2.5 text-[14px] text-text outline-none hover:border-brand-border focus:border-brand-border"
                  />
                </label>
              </div>
              <p className="text-[12px] leading-relaxed text-muted">
                Only clone voices you have the right to use. The sample is used for this
                request only and is deleted straight afterwards.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="mt-4 flex w-full items-center gap-2 rounded-lg border border-brand-border bg-brand-soft px-3 py-2.5 text-left text-[12px] font-semibold tracking-wider text-muted transition-colors hover:border-brand-border"
          >
            <ChevronRight
              size={14}
              className={cx("shrink-0 transition-transform", advancedOpen && "rotate-90")}
            />
            ADVANCED
          </button>
          {advancedOpen && (
            <div className="mt-2 grid gap-3 rounded-lg border border-brand-border bg-brand-soft px-4 py-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[12px] text-muted">
                Speed ({compose.speed.toFixed(1)})
                <input
                  type="range"
                  min={speed.min}
                  max={speed.max}
                  step={speed.step}
                  value={compose.speed}
                  onChange={(e) => compose.setSpeed(Number(e.target.value))}
                  className="accent-accent"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] text-muted">
                Pitch ({compose.pitch.toFixed(1)})
                <input
                  type="range"
                  min={pitch.min}
                  max={pitch.max}
                  step={pitch.step}
                  value={compose.pitch}
                  onChange={(e) => compose.setPitch(Number(e.target.value))}
                  className="accent-accent"
                />
              </label>
            </div>
          )}

          <CurlSnippet
            steps={curlSteps}
            description="Call this request from your own app. The body updates as you change the text and settings above."
          />

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => void compose.generate()}
              disabled={
                !compose.text.trim() ||
                compose.busy ||
                !modelReady ||
                usageBlocked ||
                (compose.voiceMode === "clone" && !compose.voiceSample)
              }
              className={cx(
                BRAND_GRADIENT,
                "flex items-center gap-2 rounded-xl px-6 py-3 text-[15px] font-bold text-text shadow-[0_10px_25px_-10px_rgba(38,96,234,0.5)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:scale-100",
              )}
            >
              <Play size={16} fill="currentColor" />
              {compose.busy ? "Generating…" : "Generate speech"}
            </button>
            <div className="flex items-center gap-2.5">
              <span
                className={cx(
                  "h-1.5 w-1.5 rounded-full",
                  compose.busy ? "bg-success" : "bg-brand-soft",
                )}
              />
              <span className="font-mono text-[13px] text-muted">{statusLine}</span>
            </div>
          </div>

          <div className="mt-6 min-h-[72px] rounded-xl border border-dashed border-brand-border bg-brand-soft px-4 py-5">
            {compose.current ? (
              <div className="space-y-3">
                <p className="text-[13px] text-text">{compose.current.text}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cx(
                      "rounded-full border px-2 py-0.5 text-[12px] uppercase",
                      statusTone(compose.current.status),
                    )}
                  >
                    {compose.current.status}
                  </span>
                  {compose.current.status === "completed" && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          void compose.audio.play(compose.current!.generationUuid)
                        }
                        className="rounded-lg border border-brand-border px-2.5 py-1.5 text-[12px] text-muted hover:bg-brand-soft"
                      >
                        Play
                      </button>
                      <button
                        type="button"
                        onClick={() => void compose.audio.download(compose.current!)}
                        className="rounded-lg border border-brand-border px-2.5 py-1.5 text-[12px] text-muted hover:bg-brand-soft"
                      >
                        Download
                      </button>
                    </>
                  )}
                  {(compose.current.status === "queued" ||
                    compose.current.status === "failed") && (
                    <button
                      type="button"
                      disabled={compose.busy || !modelReady || usageBlocked}
                      onClick={() =>
                        void compose.regenerate(compose.current!.generationUuid)
                      }
                      className="rounded-lg border border-brand-border px-2.5 py-1.5 text-[12px] text-muted hover:bg-brand-soft disabled:opacity-50"
                    >
                      Retry generate
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center text-[13px] text-muted">
                Your generated clips appear here.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-brand-border bg-brand-soft p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-[15px] font-semibold text-text">
              Generation history
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={history.status}
                onChange={(e) => {
                  history.setPage(1);
                  history.setStatus(e.target.value as TtsStatus | "");
                }}
                className="rounded-lg border border-brand-border bg-brand-soft px-3 py-1.5 text-[12px] text-muted"
              >
                <option value="">All statuses</option>
                <option value="queued">queued</option>
                <option value="processing">processing</option>
                <option value="completed">completed</option>
                <option value="failed">failed</option>
              </select>
              <input
                value={history.search}
                onChange={(e) => history.setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    history.setPage(1);
                  }
                }}
                placeholder="Search text…"
                className="w-40 rounded-lg border border-brand-border bg-brand-soft px-3 py-1.5 text-[12px] text-text outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  history.setPage(1);
                  void history.refresh();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border px-2.5 py-1.5 text-[12px] text-muted hover:bg-brand-soft"
              >
                <RefreshCcw size={12} /> Refresh
              </button>
            </div>
          </div>

          {history.error && (
            <p className="mb-3 text-[12px] text-danger">{history.error}</p>
          )}
          {history.loading && (
            <p className="mb-3 text-[12px] text-muted">Loading…</p>
          )}
          {history.items.length === 0 && !history.loading ? (
            <p className="text-[13px] text-muted">No generations yet.</p>
          ) : (
            <div className="space-y-2">
              {history.items.map((item) => (
                <GenerationRow
                  key={item.generationUuid}
                  item={item}
                  busy={compose.busy}
                  deleting={compose.deletingUuid === item.generationUuid}
                  usageBlocked={usageBlocked}
                  playingUuid={compose.audio.playingUuid}
                  loadingUuid={compose.audio.loadingUuid}
                  onSelect={() => setSelected(item)}
                  onPlay={() => void compose.audio.play(item.generationUuid)}
                  onDownload={() => void compose.audio.download(item)}
                  onRegenerate={() => void compose.regenerate(item.generationUuid)}
                  onDelete={() => {
                    void compose.remove(item.generationUuid).then(() => history.refresh());
                  }}
                />
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-[12px] text-muted">
            <span>
              Page {history.page} / {Math.max(1, history.totalPages)}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={history.page <= 1}
                onClick={() => history.setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-brand-border px-2.5 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={!history.hasNextPage}
                onClick={() => history.setPage((p) => p + 1)}
                className="rounded-lg border border-brand-border px-2.5 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>

          {selected && (
            <div className="mt-5 rounded-xl border border-brand-border bg-brand-soft p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-text">Detail</h3>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-[12px] text-muted"
                >
                  Close
                </button>
              </div>
              {(selected.status === "queued" || selected.status === "failed") ? (
                <div className="space-y-3">
                  <textarea
                    value={selected.text}
                    maxLength={compose.maxChars}
                    onChange={(e) =>
                      setSelected({ ...selected, text: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-brand-border bg-brand-soft px-3 py-2 text-[13px] text-text outline-none"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={compose.busy}
                      onClick={() =>
                        void compose
                          .update(selected.generationUuid, {
                            text: selected.text,
                            language: selected.language,
                            voiceMode: selected.voiceMode,
                            speed: selected.speed,
                            pitch: selected.pitch,
                            outputFormat: selected.outputFormat,
                            ...(selected.voiceMode === "clone" && selected.voiceId
                              ? { voiceId: selected.voiceId }
                              : {}),
                          })
                          .then((updated) => {
                            setSelected(updated);
                            void history.refresh();
                          })
                      }
                      className="rounded-lg border border-brand-border px-2.5 py-1.5 text-[12px] text-muted hover:bg-brand-soft disabled:opacity-50"
                    >
                      Save edit
                    </button>
                    <button
                      type="button"
                      disabled={compose.busy || !modelReady || usageBlocked}
                      onClick={() =>
                        void compose.regenerate(selected.generationUuid).then(() => {
                          void history.refresh();
                        })
                      }
                      className="rounded-lg border border-brand-border px-2.5 py-1.5 text-[12px] text-muted hover:bg-brand-soft disabled:opacity-50"
                    >
                      Generate
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-muted">{selected.text}</p>
              )}
              <p className="mt-2 font-mono text-[12px] text-muted">
                {selected.generationUuid}
              </p>
              <p className="mt-1 font-mono text-[12px] text-muted">
                {selected.language} · speed {selected.speed} · pitch {selected.pitch} ·{" "}
                {selected.status}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
