"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  Check,
  Copy,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  SendHorizontal,
  SlidersHorizontal,
  Square,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  browserSpeechSupported,
  useVoiceChat,
  type VoiceChatMessage,
  type VoiceChatSettings,
} from "@/hooks/use-voice-chat";
import type { SttMode } from "@/lib/stt";
import type { TtsOutputFormat, TtsVoiceMode } from "@/lib/tts";

const ACTION_GRADIENT =
  "bg-brand-gradient";
const TAB_GRADIENT = "bg-brand-gradient-short";
const LABEL_GRADIENT = "bg-brand-gradient";

const FALLBACK_LANGUAGES = [
  { code: "auto", name: "Automatic detection" },
  { code: "hi", name: "Hindi" },
  { code: "en", name: "English (Indian)" },
  { code: "bn", name: "Bengali" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "mr", name: "Marathi" },
  { code: "gu", name: "Gujarati" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
  { code: "pa", name: "Punjabi" },
];

const SUGGESTIONS = [
  "What can you help me with?",
  "आज के लिए कोई प्रेरणादायक विचार बताइए",
  "Explain speech recognition in simple words",
  "தமிழில் ஒரு சிறிய கதை சொல்லுங்கள்",
];

const MODE_OPTIONS: { value: SttMode; label: string }[] = [
  { value: "native", label: "Native script" },
  { value: "mixed", label: "Mixed" },
  { value: "romanized", label: "Romanized" },
];

const PAUSE_OPTIONS = [500, 700, 800, 1000, 1500, 2000];

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Select({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[12px] font-medium tracking-[0.14em] text-muted uppercase">
        {label}
      </span>
      <span className="relative">
        <select
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-[150px] cursor-pointer appearance-none rounded-lg border border-brand-border bg-brand-soft py-2 pr-9 pl-3 text-[13px] font-semibold text-text outline-none transition-colors hover:border-brand-border focus:border-brand-border disabled:cursor-not-allowed disabled:opacity-50"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-brand-soft">
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-muted"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  );
}

function Toggle({
  on,
  onToggle,
  label,
  hint,
  disabled,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className="flex items-start gap-2.5 text-left disabled:opacity-50"
    >
      <span
        className={cx(
          "relative mt-0.5 h-[20px] w-9 shrink-0 rounded-full transition-colors",
          on ? "bg-brand-gradient" : "bg-surface-high",
        )}
      >
        <span
          className={cx(
            "absolute top-[3px] left-[3px] h-[14px] w-[14px] rounded-full bg-white shadow transition-transform",
            on && "translate-x-4",
          )}
        />
      </span>
      <span className="flex flex-col">
        <span className="text-[13px] text-muted">{label}</span>
        {hint ? <span className="text-[12px] text-muted">{hint}</span> : null}
      </span>
    </button>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex justify-between text-[12px] font-medium tracking-[0.14em] text-muted uppercase">
        {label}
        <span className="tracking-normal text-muted">{value.toFixed(1)}×</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-accent"
      />
    </label>
  );
}

function SpeakingBars({ active }: { active: boolean }) {
  return (
    <span className="inline-flex h-3 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <i
          key={i}
          className={cx(
            "block w-[3px] rounded-full bg-brand",
            active ? "animate-[voicebar_0.9s_ease-in-out_infinite]" : "h-1",
          )}
          style={active ? { animationDelay: `${i * 0.15}s`, height: "100%" } : undefined}
        />
      ))}
    </span>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Assistant is thinking">
      {[0, 1, 2].map((i) => (
        <i
          key={i}
          className="block h-1.5 w-1.5 animate-bounce rounded-full bg-surface-raised"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function MessageBubble({
  message,
  languageName,
  speaking,
  onReplay,
}: {
  message: VoiceChatMessage;
  languageName: (code: string) => string;
  speaking: boolean;
  onReplay: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isError = message.status === "error";
  const audio = message.audio;

  const copy = () => {
    void navigator.clipboard.writeText(message.text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div className={cx("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <span
          className={cx(
            "mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full",
            isError ? "bg-danger-soft text-danger" : cx(TAB_GRADIENT, "text-on-brand"),
          )}
        >
          {isError ? <AlertCircle size={16} /> : <Bot size={16} />}
        </span>
      )}
      <div className={cx("flex max-w-[78%] flex-col gap-1.5", isUser && "items-end")}>
        <div
          className={cx(
            "rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words",
            isUser
              ? "rounded-br-md bg-brand-gradient text-on-brand"
              : isError
                ? "rounded-bl-md border border-danger-border bg-brand-soft text-danger"
                : "rounded-bl-md border border-brand-border bg-brand-soft text-text",
          )}
        >
          {message.text}
        </div>
        <div
          className={cx(
            "flex flex-wrap items-center gap-2 px-1 text-[12px] text-muted",
            isUser && "justify-end",
          )}
        >
          {message.source === "voice" && (
            <span className="inline-flex items-center gap-1">
              <Mic size={11} /> voice
            </span>
          )}
          {message.language && message.language !== "auto" && (
            <span className="rounded bg-brand-soft px-1.5 py-0.5 text-muted">
              {languageName(message.language)}
            </span>
          )}
          <span>{formatTime(message.createdAt)}</span>
          {!isUser && !isError && (
            <>
              {typeof message.llmMs === "number" && (
                <span title="LLM response time">{(message.llmMs / 1000).toFixed(1)} s</span>
              )}
              {audio?.state === "loading" && (
                <span className="inline-flex items-center gap-1 text-cyan">
                  <Loader2 size={11} className="animate-spin" /> generating voice
                </span>
              )}
              {speaking && (
                <span className="inline-flex items-center gap-1.5 text-accent">
                  <SpeakingBars active /> speaking
                </span>
              )}
              {audio?.state === "browser" && !speaking && (
                <span title={audio.error}>browser voice</span>
              )}
              <button
                type="button"
                onClick={onReplay}
                disabled={audio?.state === "loading"}
                className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-muted transition-colors hover:bg-brand-soft hover:text-text disabled:opacity-40"
                aria-label={speaking ? "Stop speaking" : "Play reply"}
              >
                {speaking ? <Pause size={12} /> : <Play size={12} />}
                {speaking ? "Stop" : "Play"}
              </button>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-muted transition-colors hover:bg-brand-soft hover:text-text"
                aria-label="Copy reply"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </>
          )}
        </div>
        {audio?.error && (audio.state === "error" || audio.state === "ready" || audio.state === "browser") && (
          <span className="px-1 text-[12px] text-danger">
            {audio.state === "browser" ? `Server voice unavailable (${audio.error}); used browser voice.` : audio.error}
          </span>
        )}
      </div>
    </div>
  );
}

function SettingsPanel({
  settings,
  update,
  disabled,
  ttsConfigured,
  speed,
  pitch,
  audioFormats,
}: {
  settings: VoiceChatSettings;
  update: (patch: Partial<VoiceChatSettings>) => void;
  disabled: boolean;
  ttsConfigured: boolean;
  speed: { min: number; max: number; step: number };
  pitch: { min: number; max: number; step: number };
  audioFormats: TtsOutputFormat[];
}) {
  return (
    <div className="grid gap-5 rounded-xl border border-brand-border bg-brand-soft p-4 sm:grid-cols-2 lg:grid-cols-3">
      <Select
        label="Transcript script"
        value={settings.sttMode}
        disabled={disabled}
        options={MODE_OPTIONS}
        onChange={(v) => update({ sttMode: v as SttMode })}
      />
      <Select
        label="Phrase ends after"
        value={String(settings.endSilenceMs)}
        disabled={disabled}
        options={PAUSE_OPTIONS.map((ms) => ({ value: String(ms), label: `${(ms / 1000).toFixed(1)} s pause` }))}
        onChange={(v) => update({ endSilenceMs: Number(v) })}
      />
      <Select
        label="Audio format"
        value={settings.outputFormat}
        options={audioFormats.map((f) => ({ value: f, label: f.toUpperCase() }))}
        onChange={(v) => update({ outputFormat: v as TtsOutputFormat })}
      />
      <Select
        label="Voice"
        value={settings.voiceMode}
        options={[
          { value: "default", label: "Default voice" },
          { value: "clone", label: "Cloned voice" },
        ]}
        onChange={(v) => update({ voiceMode: v as TtsVoiceMode })}
      />
      {settings.voiceMode === "clone" ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium tracking-[0.14em] text-muted uppercase">
            Voice ID
          </span>
          <input
            value={settings.voiceId}
            onChange={(e) => update({ voiceId: e.target.value })}
            placeholder="voice id"
            className="rounded-lg border border-brand-border bg-brand-soft px-3 py-2 text-[13px] text-text outline-none focus:border-brand-border"
          />
        </label>
      ) : (
        <div className="hidden lg:block" />
      )}
      <div className="hidden lg:block" />
      <Range label="Speed" value={settings.speed} {...speed} onChange={(v) => update({ speed: v })} />
      <Range label="Pitch" value={settings.pitch} {...pitch} onChange={(v) => update({ pitch: v })} />
      <div className="flex flex-col gap-3">
        <Toggle
          label="Auto-send after speaking"
          hint="Push-to-talk sends when you stop the mic"
          on={settings.autoSendVoice}
          onToggle={() => update({ autoSendVoice: !settings.autoSendVoice })}
        />
        <Toggle
          label="Browser voice fallback"
          hint={
            ttsConfigured
              ? "Used if the EBMA voice fails"
              : "EBMA TTS is offline; replies use the browser voice"
          }
          on={settings.browserVoiceFallback}
          disabled={!browserSpeechSupported()}
          onToggle={() => update({ browserVoiceFallback: !settings.browserVoiceFallback })}
        />
      </div>
    </div>
  );
}

export function VoiceChat() {
  const chat = useVoiceChat();
  const { stt, settings, updateSettings } = chat;
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const languages = chat.options?.languages?.length ? chat.options.languages : FALLBACK_LANGUAGES;
  const languageName = useMemo(() => {
    const map = new Map(languages.map((l) => [l.code, l.name]));
    return (code: string) => map.get(code) ?? code;
  }, [languages]);

  const micLocked = stt.listening || stt.busy;
  const llmReady = chat.options?.llmConfigured ?? false;
  const ttsReady = chat.options?.ttsConfigured ?? false;
  const asrReady = stt.modelConfigured;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.messages.length, chat.thinking, stt.partialText]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [chat.draft]);

  const statusText = stt.error
    ? stt.error
    : stt.tokenCooldown > 0
      ? `Microphone rate limited. Retry in ${stt.tokenCooldown}s.`
      : stt.busy
        ? stt.listening
          ? "Finishing…"
          : "Connecting to speech recognition…"
        : stt.listening
          ? chat.speakingId
            ? "Assistant is speaking. Mic paused."
            : settings.handsFree && chat.thinking
              ? "Thinking…"
              : settings.handsFree
                ? "Hands-free: just talk. Each pause sends your message."
                : "Listening… press the mic again when you are done."
          : chat.thinking
            ? "Thinking…"
            : chat.speakingId
              ? "Speaking…"
              : !llmReady && !chat.loadingOptions
                ? "LLM is not configured on the server."
                : "Type a message or press the mic to talk.";

  const ringScale = stt.listening && !chat.speakingId ? 1 + stt.voiceLevel * 0.9 : 1;

  return (
    <div className="flex h-[calc(100vh-68px-104px)] min-h-[560px] flex-col text-muted">
      <style>{`@keyframes voicebar{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}`}</style>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5">
        <div>
          <p
            className={cx(
              LABEL_GRADIENT,
              "bg-clip-text text-[12px] font-semibold tracking-[0.28em] text-transparent",
            )}
          >
            SPEECH → LLM → SPEECH
          </p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-text sm:text-3xl">
            Voice Assistant
          </h1>
          <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
            {[
              { label: "ASR", ok: asrReady },
              { label: "LLM", ok: llmReady },
              { label: ttsReady ? "TTS" : "TTS (browser fallback)", ok: ttsReady },
            ].map((chip) => (
              <span
                key={chip.label}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
                  chip.ok
                    ? "border-success-border text-success"
                    : "border-brand-border text-accent",
                )}
              >
                <i
                  className={cx(
                    "h-1.5 w-1.5 rounded-full",
                    chip.ok ? "bg-success" : "bg-brand",
                  )}
                />
                {chip.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateSettings({ voiceReplies: !settings.voiceReplies })}
            className={cx(
              "grid h-9 w-9 place-items-center rounded-lg border transition-colors",
              settings.voiceReplies
                ? "border-brand-border bg-brand-soft text-accent"
                : "border-brand-border text-muted hover:text-text",
            )}
            title={settings.voiceReplies ? "Voice replies on" : "Voice replies off"}
            aria-pressed={settings.voiceReplies}
          >
            {settings.voiceReplies ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className={cx(
              "grid h-9 w-9 place-items-center rounded-lg border transition-colors",
              showSettings
                ? "border-brand-border bg-brand-soft text-accent"
                : "border-brand-border text-muted hover:text-text",
            )}
            title="Settings"
            aria-expanded={showSettings}
          >
            <SlidersHorizontal size={17} />
          </button>
          <button
            type="button"
            onClick={chat.clearConversation}
            disabled={!chat.messages.length || chat.thinking}
            className="grid h-9 w-9 place-items-center rounded-lg border border-brand-border text-muted transition-colors hover:text-danger disabled:opacity-40"
            title="Clear conversation"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <Select
          label="I speak"
          value={settings.language}
          disabled={micLocked}
          options={languages.map((l) => ({
            value: l.code,
            label: l.code === "auto" ? "Auto-detect" : l.name,
          }))}
          onChange={(v) => updateSettings({ language: v })}
        />
        <Select
          label="Reply in"
          value={settings.replyLanguage}
          options={languages.map((l) => ({
            value: l.code,
            label: l.code === "auto" ? "Same as me" : l.name,
          }))}
          onChange={(v) => updateSettings({ replyLanguage: v })}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium tracking-[0.14em] text-muted uppercase">
            Conversation
          </span>
          <div className="inline-flex rounded-lg border border-brand-border bg-brand-soft p-0.5">
            {[
              { value: false, label: "Push to talk" },
              { value: true, label: "Hands-free" },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                disabled={micLocked}
                onClick={() => updateSettings({ handsFree: opt.value })}
                className={cx(
                  "rounded-md px-3 py-[7px] text-[12px] font-semibold transition-colors disabled:cursor-not-allowed",
                  settings.handsFree === opt.value
                    ? cx(TAB_GRADIENT, "text-on-brand")
                    : "text-muted hover:text-text",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="mb-4">
          <SettingsPanel
            settings={settings}
            update={updateSettings}
            disabled={micLocked}
            ttsConfigured={ttsReady}
            speed={chat.options?.speed ?? { min: 0.5, max: 1.5, step: 0.1 }}
            pitch={chat.options?.pitch ?? { min: 0.5, max: 1.5, step: 0.1 }}
            audioFormats={chat.options?.audioFormats ?? ["wav", "mp3", "ogg"]}
          />
        </div>
      )}

      {chat.optionsError && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-danger-border bg-brand-soft px-3 py-2 text-[13px] text-danger">
          {chat.optionsError}
          <button type="button" className="underline" onClick={() => void chat.refreshOptions()}>
            Retry
          </button>
        </div>
      )}

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-brand-border bg-brand-soft px-4 py-5 sm:px-6"
      >
        {chat.messages.length === 0 && !chat.thinking && !stt.partialText ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <span className={cx(TAB_GRADIENT, "grid h-14 w-14 place-items-center rounded-2xl text-on-brand")}>
              <Bot size={26} />
            </span>
            <div>
              <p className="text-[17px] font-semibold text-text">Talk to EBMA in your language</p>
              <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
                Press the mic and speak in any of 27 Indian languages. The reply shows up here and
                is read aloud to you.
              </p>
            </div>
            <div className="flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={!llmReady}
                  onClick={() => void chat.send(s)}
                  className="rounded-full border border-brand-border bg-brand-soft px-3.5 py-1.5 text-[12px] text-muted transition-colors hover:border-brand-border hover:text-text disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {chat.messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                languageName={languageName}
                speaking={chat.speakingId === m.id}
                onReplay={() => void chat.replay(m.id)}
              />
            ))}

            {stt.listening && stt.partialText && !chat.speakingId && (
              <div className="flex justify-end">
                <div className="max-w-[78%] rounded-2xl rounded-br-md border border-dashed border-brand-border px-4 py-3 text-[15px] leading-relaxed text-muted italic">
                  {stt.partialText}
                </div>
              </div>
            )}

            {chat.thinking && (
              <div className="flex gap-3">
                <span className={cx(TAB_GRADIENT, "grid h-8 w-8 shrink-0 place-items-center rounded-full text-on-brand")}>
                  <Bot size={16} />
                </span>
                <div className="rounded-2xl rounded-bl-md border border-brand-border bg-brand-soft px-4 py-3.5">
                  <ThinkingDots />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="mt-4">
        <div className="flex items-end gap-3 rounded-2xl border border-brand-border bg-brand-soft p-2.5 focus-within:border-brand-border">
          <div className="relative shrink-0">
            {stt.listening && (
              <span
                className="absolute inset-0 rounded-xl bg-brand-soft/35 transition-transform duration-75"
                style={{ transform: `scale(${ringScale})` }}
                aria-hidden
              />
            )}
            <button
              type="button"
              onClick={() => void chat.toggleMic()}
              disabled={(stt.busy && !stt.listening) || (!asrReady && !stt.listening) || stt.tokenCooldown > 0}
              className={cx(
                "relative grid h-11 w-11 place-items-center rounded-xl text-text transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-45",
                stt.listening ? "bg-danger-soft" : ACTION_GRADIENT,
              )}
              title={
                !asrReady
                  ? "Speech recognition is not configured"
                  : stt.listening
                    ? settings.handsFree
                      ? "Stop hands-free conversation"
                      : "Stop and send"
                    : "Start talking"
              }
              aria-pressed={stt.listening}
            >
              {stt.busy ? (
                <Loader2 size={19} className="animate-spin" />
              ) : stt.listening ? (
                settings.handsFree ? <MicOff size={19} /> : <Square size={16} fill="currentColor" />
              ) : (
                <Mic size={19} />
              )}
            </button>
          </div>

          <textarea
            ref={textareaRef}
            rows={1}
            value={chat.draft}
            onChange={(e) => chat.setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void chat.sendDraft();
              }
            }}
            maxLength={chat.options?.maxMessageCharacters ?? 2000}
            placeholder={
              stt.listening && !settings.handsFree
                ? "Your words appear here as you speak…"
                : "Message EBMA Assistant…"
            }
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-relaxed text-text outline-none placeholder:text-accent"
          />

          {chat.speakingId ? (
            <button
              type="button"
              onClick={chat.stopSpeaking}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-brand-border bg-brand-soft text-accent"
              title="Stop speaking"
            >
              <Square size={15} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void chat.sendDraft()}
              disabled={!chat.draft.trim() || chat.thinking || !llmReady}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-text transition-colors hover:bg-brand-soft disabled:opacity-40"
              title="Send"
            >
              {chat.thinking ? <Loader2 size={18} className="animate-spin" /> : <SendHorizontal size={18} />}
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cx(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                stt.error
                  ? "bg-danger-soft"
                  : stt.listening
                    ? "animate-pulse bg-success"
                    : chat.thinking || chat.speakingId
                      ? "bg-brand"
                      : "bg-brand-soft",
              )}
            />
            <span className={cx("truncate text-[12px]", stt.error ? "text-danger" : "text-muted")}>
              {statusText}
            </span>
          </div>
          <span className="hidden shrink-0 text-[12px] text-accent sm:block">
            Enter to send · Shift+Enter for a new line
          </span>
        </div>
      </div>
    </div>
  );
}
