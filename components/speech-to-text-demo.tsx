"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {Loader2, Download, Mic, Trash2, Upload } from "lucide-react";
import { useUsageGate } from "@/components/capability-notice";
import { CURL_BASE_URL, CurlSnippet, curlAuthHeader, shellQuote, type CurlStep } from "@/components/curl-snippet";
import { useSttFileTranscription } from "@/hooks/use-stt-file-transcription";
import { useSttLiveSession } from "@/hooks/use-stt-live-session";
import { sttApi } from "@/lib/stt";
import type {
  SttDownloadFormat,
  SttMode,
  SttPagination,
  SttSegment,
  SttSession,
  SttTranscription,
  SttTranscriptionStatus,
} from "@/lib/stt";

const TAB_GRADIENT =
  "bg-brand-gradient-short";
const ACTION_GRADIENT =
  "bg-brand-gradient";
const LABEL_GRADIENT =
  "bg-brand-gradient";

const FALLBACK_LANGUAGES = [
  { code: "auto", name: "Automatic detection" },
  { code: "hi", name: "Hindi" },
  { code: "en", name: "English" },
  { code: "bn", name: "Bengali" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "mr", name: "Marathi" },
  { code: "gu", name: "Gujarati" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
  { code: "pa", name: "Punjabi" },
];

const MODE_OPTIONS: { value: SttMode; label: string }[] = [
  { value: "native", label: "Native script" },
  { value: "mixed", label: "Mixed" },
  { value: "romanized", label: "Romanized" },
];

const PAUSE_OPTIONS = [
  { label: "0.4 s pause", ms: 400 },
  { label: "0.7 s pause", ms: 700 },
  { label: "1.0 s pause", ms: 1000 },
  { label: "1.5 s pause", ms: 1500 },
];

const IDLE_LEVEL = 0.08;

type InputMode = "live" | "upload";

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function languageLabel(code: string, languages: { code: string; name: string }[]) {
  return languages.find((l) => l.code === code)?.name || code;
}

function transcriptionStatusTone(status: SttTranscriptionStatus) {
  switch (status) {
    case "completed":
      return "text-success border-success-border";
    case "failed":
      return "text-danger border-danger-border";
    case "cancelled":
      return "text-muted border-brand-border";
    case "processing":
      return "text-cyan border-brand-border";
    default:
      return "text-warning border-warning-border";
  }
}

function acceptAttr(formats: string[]) {
  const parts = formats.flatMap((fmt) => {
    const clean = fmt.replace(/^\./, "").toLowerCase();
    return [`.${clean}`, `audio/${clean}`, `video/${clean}`];
  });
  return Array.from(new Set(["audio/*", "video/*", ...parts])).join(",");
}

function Dropdown({
  label,
  value,
  options,
  onChange,
  disabled,
  emphasizeValue = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
  emphasizeValue?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] font-medium tracking-[0.14em] text-muted">
        {label}
      </span>
      <div className="relative">
        <select
          disabled={disabled}
          className={cx(
            "min-w-[140px] cursor-pointer appearance-none rounded-lg border bg-surface py-2.5 pr-10 pl-3.5 text-[14px] font-semibold text-text outline-none transition-colors hover:border-border-strong focus:border-border-strong disabled:cursor-not-allowed",
            emphasizeValue
              ? "border-2 border-border-strong font-bold disabled:opacity-100"
              : "border-brand-border disabled:opacity-70",
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface">
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
      </div>
    </div>
  );
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

const SPEAKER_COLORS = [
  {
    bg: "bg-brand-soft",
    text: "text-accent",
    border: "border-brand-border",
    bar: "bg-brand",
  },
  {
    bg: "bg-success-soft",
    text: "text-success",
    border: "border-success-border",
    bar: "bg-success",
  },
  {
    bg: "bg-warning-soft",
    text: "text-warning",
    border: "border-warning-border",
    bar: "bg-warning",
  },
  {
    bg: "bg-danger-soft",
    text: "text-danger",
    border: "border-danger-border",
    bar: "bg-danger",
  },
  {
    bg: "bg-brand-soft",
    text: "text-cyan",
    border: "border-brand-border",
    bar: "bg-cyan",
  },
  {
    bg: "bg-brand-soft",
    text: "text-accent",
    border: "border-brand-border",
    bar: "bg-brand",
  },
  {
    bg: "bg-orange-900/55",
    text: "text-orange-200",
    border: "border-orange-400/45",
    bar: "bg-orange-400",
  },
  {
    bg: "bg-teal-900/55",
    text: "text-teal-200",
    border: "border-teal-400/45",
    bar: "bg-teal-400",
  },
] as const;

function speakerColorKey(speaker: string) {
  let hash = 0;
  for (let i = 0; i < speaker.length; i += 1) {
    hash = (hash + speaker.charCodeAt(i) * (i + 1)) % SPEAKER_COLORS.length;
  }
  return SPEAKER_COLORS[hash];
}

function SegmentBlock({
  timeLabel,
  language,
  durationLabel,
  speaker,
  text,
  muted,
}: {
  timeLabel: string;
  language?: string;
  durationLabel?: string;
  speaker?: string | null;
  text: string;
  muted?: boolean;
}) {
  const tone = speaker ? speakerColorKey(speaker) : null;

  return (
    <div
      className={cx(
        "border-b border-brand-border py-5 last:border-b-0",
        tone ? "border-l-2 pl-3" : undefined,
        tone?.border,
      )}
    >
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        {speaker && tone ? (
          <span
            className={cx(
              "rounded-md border px-2 py-0.5 text-[12px] font-medium",
              tone.bg,
              tone.text,
              tone.border,
            )}
          >
            {speaker}
          </span>
        ) : null}
        <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[12px] font-semibold text-text">
          {timeLabel}
        </span>
        {language ? (
          <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[12px] font-medium text-muted">
            {language}
          </span>
        ) : null}
        {durationLabel ? (
          <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[12px] font-medium text-muted">
            {durationLabel}
          </span>
        ) : null}
      </div>
      <p
        className={cx(
          "text-[22px] leading-relaxed tracking-tight",
          muted ? "text-muted" : "text-text",
        )}
      >
        {text}
      </p>
    </div>
  );
}

const RESULT_ACTION_BTN =
  "rounded-full border border-brand-border bg-surface px-4 py-1.5 text-[13px] font-medium text-text transition-colors hover:border-border-strong hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-65";

function transcriptPlainText(item: SttTranscription) {
  const segments = item.result?.segments ?? [];
  if (segments.length > 0) {
    return segments
      .map((seg) => seg.text.trim())
      .filter(Boolean)
      .join("\n");
  }
  return (item.transcript || "").trim();
}

function pad2(n: number) {
  return String(Math.floor(n)).padStart(2, "0");
}

function pad3(n: number) {
  return String(Math.floor(n)).padStart(3, "0");
}

/** SRT: 00:00:01,234 */
function formatSrtTime(seconds: number) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)},${pad3(ms)}`;
}

/** VTT: 00:00:01.234 */
function formatVttTime(seconds: number) {
  return formatSrtTime(seconds).replace(",", ".");
}

type LiveExportCue = {
  start: number;
  end: number;
  text: string;
  lang?: string;
};

function liveExportCues(
  finals: SttSegment[],
  fallbackTranscript: string,
): LiveExportCue[] {
  if (finals.length > 0) {
    return finals
      .map((seg) => ({
        start: seg.t0,
        end: seg.t1 > seg.t0 ? seg.t1 : seg.t0 + Math.max(seg.audio_s, 0.4),
        text: seg.text.trim(),
        lang: seg.lang,
      }))
      .filter((c) => c.text);
  }
  const text = fallbackTranscript.trim();
  if (!text) return [];
  return [{ start: 0, end: 1, text }];
}

function buildLiveTxt(cues: LiveExportCue[]) {
  return cues.map((c) => c.text).join("\n");
}

function buildLiveSrt(cues: LiveExportCue[]) {
  return cues
    .map(
      (c, i) =>
        `${i + 1}\n${formatSrtTime(c.start)} --> ${formatSrtTime(c.end)}\n${c.text}\n`,
    )
    .join("\n");
}

function buildLiveVtt(cues: LiveExportCue[]) {
  const body = cues
    .map(
      (c) =>
        `${formatVttTime(c.start)} --> ${formatVttTime(c.end)}\n${c.text}\n`,
    )
    .join("\n");
  return `WEBVTT\n\n${body}`;
}

function buildLiveJson(cues: LiveExportCue[], language: string) {
  return JSON.stringify(
    {
      source: "live",
      language,
      transcript: cues.map((c) => c.text).join(" "),
      segments: cues.map((c, i) => ({
        index: i + 1,
        start: c.start,
        end: c.end,
        text: c.text,
        language: c.lang || language,
      })),
    },
    null,
    2,
  );
}

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ResultActionCapsules({
  disabled,
  clearDisabled,
  onCopy,
  onDownloadTxt,
  onDownloadSrt,
  onDownloadVtt,
  onDownloadJson,
  onClear,
  clearLabel = "Clear",
}: {
  disabled?: boolean;
  clearDisabled?: boolean;
  onCopy: () => void;
  onDownloadTxt: () => void;
  onDownloadSrt: () => void;
  onDownloadVtt: () => void;
  onDownloadJson: () => void;
  onClear: () => void;
  clearLabel?: string;
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-2.5">
      <button
        type="button"
        disabled={disabled}
        onClick={onCopy}
        className={RESULT_ACTION_BTN}
      >
        Copy text
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onDownloadTxt}
        className={RESULT_ACTION_BTN}
      >
        Download TXT
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onDownloadSrt}
        className={RESULT_ACTION_BTN}
      >
        Download SRT
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onDownloadVtt}
        className={RESULT_ACTION_BTN}
      >
        Download VTT
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onDownloadJson}
        className={RESULT_ACTION_BTN}
      >
        Download JSON
      </button>
      <button
        type="button"
        disabled={clearDisabled}
        onClick={onClear}
        className={RESULT_ACTION_BTN}
      >
        {clearLabel}
      </button>
    </div>
  );
}

function TranscriptionResult({
  item,
  onCopy,
  onDownload,
  onDownloadJson,
  onNewFile,
}: {
  item: SttTranscription;
  onCopy: () => void;
  onDownload: (format: SttDownloadFormat) => void;
  onDownloadJson: () => void;
  onNewFile: () => void;
}) {
  const segments = item.result?.segments ?? [];
  const speakers = item.result?.speakers ?? [];
  const completed = item.status === "completed";

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {item.audioSeconds != null && (
          <span className="rounded-md bg-brand-soft px-2.5 py-1 text-[12px] font-medium text-muted">
            {formatClock(item.audioSeconds)} of audio
          </span>
        )}
        <span className="rounded-md bg-brand-soft px-2.5 py-1 text-[12px] font-medium text-muted">
          {item.filename}
        </span>
        <span
          className={cx(
            "rounded-md border px-2.5 py-1 text-[12px] font-medium uppercase",
            transcriptionStatusTone(item.status),
          )}
        >
          {item.status}
        </span>
      </div>

      {speakers.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {speakers.map((sp, idx) => {
            const label =
              String(sp.label || sp.speaker || sp.id || `Speaker ${idx + 1}`);
            const tone = speakerColorKey(label);
            return (
              <span
                key={`${label}-${idx}`}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px]",
                  tone.bg,
                  tone.text,
                  tone.border,
                )}
              >
                <span className={cx("h-1.5 w-1.5 rounded-full", tone.bar)} />
                {label}
                {typeof sp.talkTimeSeconds === "number"
                  ? ` · ${sp.talkTimeSeconds.toFixed(1)}s`
                  : ""}
              </span>
            );
          })}
        </div>
      )}

      {segments.length > 0 ? (
        segments.map((seg, idx) => (
          <SegmentBlock
            key={`${seg.start}-${idx}`}
            timeLabel={formatClock(seg.start)}
            speaker={seg.speaker}
            durationLabel={`${Math.max(0, seg.end - seg.start).toFixed(1)} s`}
            text={seg.text}
          />
        ))
      ) : item.transcript ? (
        <SegmentBlock timeLabel="0:00" text={item.transcript} />
      ) : (
        <p className="text-sm text-muted">No transcript text returned.</p>
      )}

      {completed && (
        <ResultActionCapsules
          onCopy={onCopy}
          onDownloadTxt={() => onDownload("txt")}
          onDownloadSrt={() => onDownload("srt")}
          onDownloadVtt={() => onDownload("vtt")}
          onDownloadJson={onDownloadJson}
          onClear={onNewFile}
          clearLabel="New file"
        />
      )}
    </div>
  );
}

function LiveSessionTable({
  sessions,
  languages,
  busy,
  onOpen,
  onDelete,
}: {
  sessions: SttSession[];
  languages: { code: string; name: string }[];
  busy: boolean;
  onOpen: (sessionUuid: string) => void;
  onDelete: (session: SttSession) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-brand-border">
      <table className="w-full min-w-[620px] text-left text-[12px]">
        <thead className="bg-surface-raised text-muted">
          <tr>
            <th className="px-3 py-2 font-semibold">SESSION</th>
            <th className="px-3 py-2 font-semibold">TRANSCRIPT</th>
            <th className="px-3 py-2 font-semibold">STARTED</th>
            <th className="px-3 py-2 text-right font-semibold">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((item) => {
            const active = item.status === "connecting" || item.status === "streaming";
            return (
              <tr key={item.sessionUuid} className="border-t border-brand-border hover:bg-surface-raised/50">
                <td className="whitespace-nowrap px-3 py-2.5 text-text">
                  {languageLabel(item.language, languages)}
                  <span className="ml-2 rounded-full bg-surface-raised px-2 py-0.5 text-muted">{item.status}</span>
                </td>
                <td className="max-w-[280px] truncate px-3 py-2.5 text-muted">{item.transcript || "No transcript text"}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-muted">{new Date(item.createdAt).toLocaleString()}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  <button type="button" disabled={busy} onClick={() => onOpen(item.sessionUuid)} className="mr-3 font-medium text-text hover:underline disabled:opacity-50">Open</button>
                  <button type="button" disabled={busy} title={active ? "Delete saved record; the GPU stream may continue" : "Delete session"} onClick={() => onDelete(item)} className="font-medium text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-40">{active ? "Delete anyway" : "Delete"}</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SpeechToTextDemo() {
  const { blocked: usageBlocked } = useUsageGate();
  const live = useSttLiveSession();
  const fileTx = useSttFileTranscription();
  const [inputMode, setInputMode] = useState<InputMode>("live");
  const [language, setLanguage] = useState("auto");
  const [mode, setMode] = useState<SttMode>("native");
  const [pauseMs, setPauseMs] = useState(700);
  const [partials, setPartials] = useState(true);
  const [identifySpeakers, setIdentifySpeakers] = useState(false);
  const [speakersCount, setSpeakersCount] = useState<"auto" | number>("auto");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePickError, setFilePickError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [liveHistory, setLiveHistory] = useState<SttSession[]>([]);
  const [selectedLiveHistory, setSelectedLiveHistory] = useState<SttSession | null>(null);
  const [liveHistoryError, setLiveHistoryError] = useState("");
  const [liveHistoryBusy, setLiveHistoryBusy] = useState(false);
  const [showAllLiveHistory, setShowAllLiveHistory] = useState(false);
  const [recentSessionsOpen, setRecentSessionsOpen] = useState(false);
  const [allLiveHistory, setAllLiveHistory] = useState<SttSession[]>([]);
  const [allLivePagination, setAllLivePagination] = useState<SttPagination | null>(null);
  const [allLivePage, setAllLivePage] = useState(1);

  const refreshLiveHistory = useCallback(async () => {
    try {
      const result = await sttApi.listSessions({ page: 1, page_size: 5 });
      setLiveHistory(result.items);
      setLiveHistoryError("");
    } catch (error) {
      setLiveHistoryError(error instanceof Error ? error.message : "Unable to load live session history");
    }
  }, []);

  const loadAllLiveHistory = useCallback(async (page: number) => {
    setLiveHistoryBusy(true);
    try {
      const result = await sttApi.listSessions({ page, page_size: 20 });
      setAllLiveHistory(result.items);
      setAllLivePagination(result.pagination);
      setAllLivePage(page);
      setLiveHistoryError("");
    } catch (error) {
      setLiveHistoryError(error instanceof Error ? error.message : "Unable to load session history");
    } finally {
      setLiveHistoryBusy(false);
    }
  }, []);

  useEffect(() => {
    void refreshLiveHistory();
  }, [refreshLiveHistory]);

  useEffect(() => {
    if (live.session?.status === "completed" || live.session?.status === "failed") {
      void refreshLiveHistory();
    }
  }, [live.session?.status, live.session?.sessionUuid, refreshLiveHistory]);

  useEffect(() => {
    if (!live.listening || live.busy) return;
    live.configure({ language, mode, endSilenceMs: pauseMs, partials });
  }, [language, mode, pauseMs, partials, live.listening, live.busy, live.configure]);

  const openLiveHistory = async (sessionUuid: string) => {
    setLiveHistoryBusy(true);
    try {
      setSelectedLiveHistory(await sttApi.getSession(sessionUuid));
      setLiveHistoryError("");
    } catch (error) {
      setLiveHistoryError(error instanceof Error ? error.message : "Unable to open this session");
    } finally {
      setLiveHistoryBusy(false);
    }
  };

  const removeLiveHistory = async (session: SttSession) => {
    const active = session.status === "connecting" || session.status === "streaming";
    const isCurrentSession = live.session?.sessionUuid === session.sessionUuid && (live.listening || live.busy);
    if (active) {
      const explanation = isCurrentSession
        ? "This is the session running in this tab. It will be stopped and its saved transcript will be permanently deleted. Continue?"
        : "This session is still marked active. Deleting removes its saved record, but cannot stop audio running in another tab. That GPU stream may continue until the 20-minute session limit. Continue?";
      if (!window.confirm(explanation)) return;
    } else if (!window.confirm("Permanently delete this saved live session and transcript?")) {
      return;
    }

    setLiveHistoryBusy(true);
    try {
      if (isCurrentSession) await live.stop();
      await sttApi.deleteSession(session.sessionUuid, { force: active });
      setSelectedLiveHistory((current) => current?.sessionUuid === session.sessionUuid ? null : current);
      await refreshLiveHistory();
      if (showAllLiveHistory) await loadAllLiveHistory(allLivePage);
    } catch (error) {
      setLiveHistoryError(error instanceof Error ? error.message : "Unable to delete this session");
    } finally {
      setLiveHistoryBusy(false);
    }
  };

  const languages = useMemo(() => {
    const fromLive = live.options?.languages;
    const fromFile = fileTx.options?.languages;
    const source = fromLive?.length
      ? fromLive
      : fromFile?.length
        ? fromFile
        : FALLBACK_LANGUAGES;
    // Always keep automatic detection at the top for both live + upload.
    const withoutAuto = source.filter((l) => l.code !== "auto");
    return [{ code: "auto", name: "Automatic detection" }, ...withoutAuto];
  }, [fileTx.options, live.options]);

  useEffect(() => {
    if (live.options?.partialsDefault !== undefined) {
      setPartials(live.options.partialsDefault);
    }
    if (live.options?.endSilenceMs?.default) {
      const apiDefault = live.options.endSilenceMs.default;
      const exact = PAUSE_OPTIONS.find((p) => p.ms === apiDefault);
      if (exact) {
        setPauseMs(exact.ms);
      } else {
        const nearest = PAUSE_OPTIONS.reduce((best, opt) =>
          Math.abs(opt.ms - apiDefault) < Math.abs(best.ms - apiDefault) ? opt : best,
        );
        setPauseMs(nearest.ms);
      }
    }
  }, [live.options]);

  useEffect(() => {
    if (fileTx.fileOpts.diarizeDefault) {
      setIdentifySpeakers(true);
    }
    setSpeakersCount("auto");
  }, [fileTx.fileOpts]);

  useEffect(() => {
    if (inputMode === "upload" && live.listening) {
      void live.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputMode]);

  const controlsDisabled = live.busy || usageBlocked;
  const uploadBusy = fileTx.uploading || fileTx.polling;
  const actionsDisabled = usageBlocked;
  const barWidthPct = `${Math.round(
    (live.listening ? live.voiceLevel : IDLE_LEVEL) * 100,
  )}%`;
  const hasLiveContent =
    live.finals.length > 0 || Boolean(live.partialText) || Boolean(live.transcript);

  const progressPct = Math.round(
    Math.max(0, Math.min(1, fileTx.current?.progress ?? (fileTx.uploading ? 0.05 : 0))) *
      100,
  );

  const statusText = live.error
    ? live.error
    : live.tokenCooldown > 0
      ? `Token cooldown: ${live.tokenCooldown}s`
      : live.busy
        ? "Connecting…"
        : live.listening
          ? live.serverSpeaking === true ? "Voice detected. Transcribing…" : live.serverSpeaking === false ? "Listening. No speech detected." : "Listening. Speak now."
          : live.loadingOptions
            ? "Loading STT options…"
            : !live.modelConfigured
              ? "ASR model is not configured."
              : "Ready to transcribe. Select Start listening and allow microphone access.";

  const uploadStatusText = filePickError
    ? filePickError
    : fileTx.error
      ? fileTx.error
      : fileTx.uploading
        ? "Uploading file…"
        : fileTx.polling
          ? `${fileTx.current?.stage || "Processing"}…`
          : fileTx.current?.status === "completed"
            ? "Done."
            : fileTx.current?.status === "failed"
              ? fileTx.current.error?.message || "Failed."
              : selectedFile
                ? "File ready. Click Transcript to generate."
                : "Waiting for a file.";

  const onToggleListen = async () => {
    if (live.listening) {
      await live.stop();
      return;
    }
    if (usageBlocked) return;
    await live.start({
      language,
      mode,
      endSilenceMs: pauseMs,
      partials,
    });
  };

  const copyLiveTranscript = () => {
    const cues = liveExportCues(
      live.finals,
      [live.transcript, live.partialText].filter(Boolean).join(" "),
    );
    const text = buildLiveTxt(cues);
    if (text) void navigator.clipboard.writeText(text);
  };

  const downloadLive = (format: "txt" | "srt" | "vtt" | "json") => {
    const cues = liveExportCues(
      live.finals,
      [live.transcript, live.partialText].filter(Boolean).join(" "),
    );
    if (!cues.length) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const base = `live-transcript-${stamp}`;
    if (format === "txt") {
      downloadTextFile(`${base}.txt`, buildLiveTxt(cues), "text/plain;charset=utf-8");
      return;
    }
    if (format === "srt") {
      downloadTextFile(`${base}.srt`, buildLiveSrt(cues), "application/x-subrip;charset=utf-8");
      return;
    }
    if (format === "vtt") {
      downloadTextFile(`${base}.vtt`, buildLiveVtt(cues), "text/vtt;charset=utf-8");
      return;
    }
    downloadTextFile(
      `${base}.json`,
      buildLiveJson(cues, language),
      "application/json;charset=utf-8",
    );
  };

  const clearLive = () => {
    if (live.listening || live.busy) return;
    live.clear();
  };

  const onFilePicked = (file: File | null | undefined) => {
    if (!file || uploadBusy) return;
    if (file.size > fileTx.fileOpts.maxUploadBytes) {
      setSelectedFile(null);
      setFilePickError(
        `File too large. Max ${formatBytes(fileTx.fileOpts.maxUploadBytes)}.`,
      );
      return;
    }
    setFilePickError("");
    setSelectedFile(file);
    fileTx.clearCurrent();
  };

  const onGenerateTranscript = async () => {
    if (!selectedFile || uploadBusy || usageBlocked) return;
    setFilePickError("");
    await fileTx.upload({
      file: selectedFile,
      language,
      diarize: identifySpeakers,
      speakers:
        identifySpeakers && speakersCount !== "auto" ? speakersCount : undefined,
    });
  };

  const hasUploadResult =
    Boolean(fileTx.current) &&
    (fileTx.current!.status === "completed" ||
      (fileTx.current!.status !== "failed" &&
        (Boolean(fileTx.current!.transcript) ||
          (fileTx.current!.result?.segments?.length ?? 0) > 0)));

  /** Result panel only after there is something to show (completed transcript). */
  const showUploadBelow = hasUploadResult;
  const showHistory = fileTx.history.length > 0;

  const speakerOptions = useMemo(() => {
    const min = Math.max(1, fileTx.fileOpts.speakers.min || 1);
    const max = Math.max(min, fileTx.fileOpts.speakers.max || min);
    const nums = Array.from({ length: max - min + 1 }, (_, i) => {
      const n = min + i;
      return { value: String(n), label: String(n) };
    });
    return [{ value: "auto", label: "Detect automatically" }, ...nums];
  }, [fileTx.fileOpts.speakers.max, fileTx.fileOpts.speakers.min]);

  const curlSteps = useMemo<CurlStep[]>(() => {
    if (inputMode === "upload") {
      const transcriptions = `${CURL_BASE_URL}/stt/transcriptions`;
      const fields = [
        `-F ${shellQuote(`file=@${selectedFile?.name ?? "audio.wav"}`)}`,
        `-F ${shellQuote(`language=${language}`)}`,
        `-F ${shellQuote(`diarize=${identifySpeakers}`)}`,
        ...(identifySpeakers && speakersCount !== "auto" ? [`-F ${shellQuote(`speakers=${speakersCount}`)}`] : []),
      ];
      const format = fileTx.fileOpts.downloadFormats[0] ?? "txt";
      return [
        {
          title: "Upload file",
          command: `curl -X POST ${transcriptions} \\\n  ${curlAuthHeader} \\\n  ${fields.join(" \\\n  ")}`,
          note: "Run from the folder containing the file. Copy transcriptionUuid from the response.",
        },
        {
          title: "Check status",
          command: `curl ${transcriptions}/<transcription_uuid> \\\n  ${curlAuthHeader}`,
          note: "Repeat until status is completed; the transcript is in the response.",
        },
        {
          title: "Download transcript",
          command: `curl "${transcriptions}/<transcription_uuid>/download?format=${format}" \\\n  ${curlAuthHeader} \\\n  -o transcript.${format}`,
          note: `Formats: ${fileTx.fileOpts.downloadFormats.join(", ") || "txt, srt, vtt"}.`,
        },
      ];
    }

    const sessions = `${CURL_BASE_URL}/stt/sessions`;
    const body = {
      language,
      mode,
      sampleRate: live.options?.sampleRate.default ?? 16000,
      endSilenceMs: pauseMs,
      partials,
    };
    return [
      {
        title: "Create session",
        command: `curl -X POST ${sessions} \\\n  ${curlAuthHeader} \\\n  -H "Content-Type: application/json" \\\n  -d ${shellQuote(JSON.stringify(body, null, 2))}`,
        note: "Copy session.sessionUuid from the response.",
      },
      {
        title: "Get streaming token",
        command: `curl -X POST ${sessions}/<session_uuid>/token \\\n  ${curlAuthHeader} \\\n  -H "Content-Type: application/json" \\\n  -d '{"ttlSeconds": 300}'`,
        note: "Open a WebSocket to connection.wsUrl with this token and stream 16-bit PCM audio; text comes back phrase by phrase.",
      },
      {
        title: "Finish session",
        command: `curl -X POST ${sessions}/<session_uuid>/finish \\\n  ${curlAuthHeader} \\\n  -H "Content-Type: application/json" \\\n  -d '{"status": "completed"}'`,
      },
    ];
  }, [inputMode, selectedFile, language, identifySpeakers, speakersCount, fileTx.fileOpts.downloadFormats, mode, live.options?.sampleRate.default, pauseMs, partials]);

  const dropzoneHint =`Audio or video (${fileTx.fileOpts.acceptedFormats
    .map((f) => f.toUpperCase())
    .slice(0, 6)
    .join(", ")} and more), up to ${formatBytes(fileTx.fileOpts.maxUploadBytes)} and ${fileTx.fileOpts.maxAudioMinutes} minutes.`;

  return (
    <div className="text-muted">
      <section
        className="relative pb-7 text-center"
        style={{
          backgroundImage:
            "radial-gradient(55% 55% at 50% 0%, color-mix(in srgb, var(--theme-purple) 16%, transparent), transparent 70%), linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)",
          backgroundSize: "auto, 48px 48px, 48px 48px",
        }}
      >
        <p
          className={cx(
            LABEL_GRADIENT,
            "bg-clip-text text-[12px] font-semibold tracking-[0.28em] text-transparent",
          )}
        >
          REAL-TIME SPEECH RECOGNITION
        </p>
        <h1 className="mt-4 text-4xl font-extrabold leading-none tracking-tight text-text sm:text-[52px]">
          Speech to Text
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-muted">
          Speak in any of 27 Indian languages and watch your words appear, phrase by phrase, the
          moment you pause.
        </p>

        <div className="mt-7 inline-flex rounded-full border border-brand-border bg-brand-soft p-1">
          <button
            type="button"
            onClick={() => setInputMode("live")}
            className={cx(
              "rounded-full px-5 py-2 text-[13px] font-semibold transition-colors",
              inputMode === "live"
                ? cx(TAB_GRADIENT, "text-on-brand shadow-[0_8px_24px_-10px_rgba(59,130,246,0.8)]")
                : "text-muted hover:text-text",
            )}
          >
            Live microphone
          </button>
          <button
            type="button"
            onClick={() => setInputMode("upload")}
            className={cx(
              "rounded-full px-5 py-2 text-[13px] font-semibold transition-colors",
              inputMode === "upload"
                ? cx(TAB_GRADIENT, "text-on-brand shadow-[0_8px_24px_-10px_rgba(59,130,246,0.8)]")
                : "text-muted hover:text-text",
            )}
          >
            Upload a file
          </button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl">
        <div className="rounded-2xl border border-brand-border bg-brand-soft p-5 sm:p-7">
          {inputMode === "live" ? (
            <>
            <div className="flex flex-wrap items-end gap-5">
                <Dropdown
                  label="LANGUAGE"
                  value={language}
                  disabled={controlsDisabled}
                  emphasizeValue
                  options={languages.map((l) => ({ value: l.code, label: l.name }))}
                  onChange={setLanguage}
                />
                <Dropdown
                  label="OUTPUT"
                  value={mode}
                  disabled={controlsDisabled}
                  options={MODE_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
                  onChange={(v) => setMode(v as SttMode)}
                />
                <Dropdown
                  label="PHRASE ENDS AFTER"
                  value={String(pauseMs)}
                  disabled={controlsDisabled}
                  options={PAUSE_OPTIONS.map((p) => ({
                    value: String(p.ms),
                    label: p.label,
                  }))}
                  onChange={(v) => setPauseMs(Number(v))}
                />

                <div className="pb-2.5">
                  <Toggle
                    label="Live preview"
                    on={partials}
                    disabled={controlsDisabled}
                    onToggle={() => setPartials((v) => !v)}
                  />
                </div>

                <div className="ml-0 flex w-full flex-col items-stretch gap-2 sm:ml-auto sm:w-auto sm:items-end">
                  <button
                    type="button"
                    disabled={
                      live.busy ||
                      (!live.modelConfigured && !live.listening) ||
                      (actionsDisabled && !live.listening)
                    }
                    className={cx(
                      ACTION_GRADIENT,
                      "flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-[15px] font-bold text-on-brand shadow-[0_12px_28px_-12px_rgba(37,99,235,0.75)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:scale-100",
                    )}
                    onClick={() => void onToggleListen()}
                  >
                    <Mic strokeWidth={2.5} className="h-4 w-4" />
                    {live.busy
                      ? "Connecting…"
                      : live.listening
                        ? "Stop listening"
                        : "Start listening"}
                  </button>
                  <div className="h-[3px] w-full overflow-hidden rounded-full bg-brand-soft sm:w-44">
                    <div
                      className={cx(ACTION_GRADIENT, "h-full rounded-full")}
                      style={{
                        width: barWidthPct,
                        transition: live.listening
                          ? "width 75ms linear"
                          : "width 300ms ease",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cx(
                      "h-2 w-2 shrink-0 rounded-full",
                      live.listening || live.busy ? "bg-success" : "bg-muted/50",
                    )}
                  />
                  <span className="text-[13px] leading-5 text-muted">{statusText}</span>
                </div>
                {live.health && (live.health.active_sessions !== undefined || live.health.queue_depth !== undefined) && (
                  <div className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full border border-brand-border bg-surface px-3 py-1.5 text-[12px] leading-4 text-muted">
                    <span className="font-semibold text-text">GPU service</span>
                    <span aria-hidden="true">·</span>
                    <span>{live.health.active_sessions ?? 0}{live.health.max_sessions ? ` / ${live.health.max_sessions}` : ""} sessions</span>
                    {live.health.queue_depth !== undefined && <><span aria-hidden="true">·</span><span>{live.health.queue_depth} waiting</span></>}
                  </div>
                )}
              </div>

              <div className="mt-5 min-h-[280px] rounded-xl border border-brand-border bg-brand-soft px-5 py-2 sm:px-6">
                {hasLiveContent ? (
                  <div>
                    {live.finals.map((seg: SttSegment) => (
                      <SegmentBlock
                        key={`${seg.segmentUuid}-${seg.seg}`}
                        timeLabel={formatClock(seg.t0)}
                        language={languageLabel(seg.lang || language, languages)}
                        durationLabel={`${seg.audio_s.toFixed(1)} s`}
                        text={seg.text}
                      />
                    ))}
                    {partials && live.partialText ? (
                      <SegmentBlock
                        timeLabel="…"
                        language={languageLabel(language, languages)}
                        text={live.partialText}
                        muted
                      />
                    ) : null}
                    {!live.finals.length && live.transcript && !live.partialText ? (
                      <SegmentBlock
                        timeLabel="0:00"
                        language={languageLabel(language, languages)}
                        text={live.transcript}
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                    <p className="max-w-sm text-sm leading-relaxed text-muted">
                      Press <span className="font-semibold text-muted">Start listening</span>{" "}
                      and speak. Phrases appear here when you pause.
                    </p>
                  </div>
                )}
              </div>

              <ResultActionCapsules
                disabled={!hasLiveContent}
                clearDisabled={live.listening || live.busy || !hasLiveContent}
                onCopy={copyLiveTranscript}
                onDownloadTxt={() => downloadLive("txt")}
                onDownloadSrt={() => downloadLive("srt")}
                onDownloadVtt={() => downloadLive("vtt")}
                onDownloadJson={() => downloadLive("json")}
                onClear={clearLive}
                clearLabel="Clear"/>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-brand-border bg-surface px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:border-border-strong hover:bg-surface-raised"
                  onClick={copyLiveTranscript}
                >
                  Copy transcript
                </button>
                <button
                  type="button"
                  disabled={live.listening || live.busy || actionsDisabled}
                  className="rounded-lg border border-brand-border bg-surface px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:border-border-strong hover:bg-surface-raised disabled:opacity-65"
                  onClick={clearLive}
                >
                  Clear
                </button>
              </div>

              <CurlSnippet
                steps={curlSteps}
                description="Start a live session from your own server. The body follows the language and output settings above."
              />

              <section className="mt-6 border-t border-brand-border pt-5" aria-label="Live transcription history">
                <div className="rounded-xl border border-brand-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <button type="button" aria-expanded={recentSessionsOpen} onClick={() => setRecentSessionsOpen((open) => !open)} className="flex min-w-0 items-center gap-2 text-left text-[14px] font-semibold text-text">
                      <span className={cx("text-muted transition-transform", recentSessionsOpen && "rotate-90")} aria-hidden="true">›</span>
                      <span>Recent live sessions <span className="ml-1 text-[12px] font-normal text-muted">({liveHistory.length})</span></span>
                    </button>
                    <button type="button" onClick={() => void refreshLiveHistory()} disabled={liveHistoryBusy} className="shrink-0 rounded-lg px-3 py-2 text-[12px] font-medium text-muted hover:bg-surface-raised hover:text-text disabled:opacity-50">Refresh</button>
                  </div>
                  {recentSessionsOpen && (
                    <div className="mt-3 border-t border-brand-border pt-3">
                      {liveHistoryError && <p className="mb-3 rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-[12px] text-danger">{liveHistoryError}</p>}
                      {liveHistory.length === 0 ? (
                        <p className="text-[12px] text-muted">Your recent live transcripts will appear here.</p>
                      ) : (
                        <LiveSessionTable sessions={liveHistory} languages={languages} busy={liveHistoryBusy} onOpen={(id) => void openLiveHistory(id)} onDelete={(item) => void removeLiveHistory(item)} />
                      )}
                      <p className="mt-2 text-[11px] leading-4 text-muted">Delete asks for confirmation. If a session is running in another tab, deleting its saved record will not stop that audio stream; it may continue until the 20-minute limit.</p>
                      <div className="mt-3 flex justify-end border-t border-brand-border pt-3">
                        <button type="button" onClick={() => {
                          const next = !showAllLiveHistory;
                          setShowAllLiveHistory(next);
                          if (next) void loadAllLiveHistory(1);
                        }} className="rounded-lg border border-brand-border bg-surface px-3.5 py-2 text-[12px] font-semibold text-text transition-colors hover:bg-surface-raised">
                          {showAllLiveHistory ? "Hide all sessions" : "View all sessions"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {selectedLiveHistory && (
                  <div className="mt-3 rounded-xl border border-brand-border bg-surface p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="text-[13px] font-semibold text-text">Saved transcript · {selectedLiveHistory.status}</h3>
                      <button type="button" onClick={() => setSelectedLiveHistory(null)} className="text-[12px] text-muted hover:text-text">Close</button>
                    </div>
                    <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-text">{selectedLiveHistory.transcript || "No transcript text was saved."}</p>
                  </div>
                )}
                {showAllLiveHistory && (
                  <div className="mt-4 rounded-xl border border-brand-border bg-surface p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-[14px] font-semibold text-text">All live sessions</h3>
                      <span className="text-[12px] text-muted">{allLivePagination?.totalCount ?? 0} total</span>
                    </div>
                    {liveHistoryError && <p className="mb-3 text-[12px] text-danger">{liveHistoryError}</p>}
                    {allLiveHistory.length === 0 ? <p className="text-[12px] text-muted">No live sessions found.</p> : (
                      <LiveSessionTable sessions={allLiveHistory} languages={languages} busy={liveHistoryBusy} onOpen={(id) => void openLiveHistory(id)} onDelete={(item) => void removeLiveHistory(item)} />
                    )}
                    <div className="mt-3 flex items-center justify-between text-[12px] text-muted">
                      <span>Page {allLivePagination?.page ?? 1} of {Math.max(1, allLivePagination?.totalPages ?? 1)}</span>
                      <div className="flex gap-2">
                        <button type="button" disabled={liveHistoryBusy || !allLivePagination || allLivePage <= 1} onClick={() => void loadAllLiveHistory(allLivePage - 1)} className="rounded-lg border border-brand-border px-3 py-1.5 disabled:opacity-40">Previous</button>
                        <button type="button" disabled={liveHistoryBusy || !allLivePagination?.hasNextPage} onClick={() => void loadAllLiveHistory(allLivePage + 1)} className="rounded-lg border border-brand-border px-3 py-1.5 disabled:opacity-40">Next</button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-6">
                <Dropdown
                  label="LANGUAGE"
                  value={language}
                  disabled={uploadBusy || actionsDisabled}
                  emphasizeValue
                  options={languages.map((l) => ({ value: l.code, label: l.name }))}
                  onChange={setLanguage}
                />
                <div className="pb-2.5">
                  <Toggle
                    label="Identify speakers"
                    on={identifySpeakers}
                    disabled={uploadBusy || actionsDisabled || !fileTx.diarizeAvailable}
                    onToggle={() => setIdentifySpeakers((v) => !v)}
                  />
                </div>
                {identifySpeakers && fileTx.diarizeAvailable && (
                  <Dropdown
                    label="NUMBER OF SPEAKERS"
                    value={String(speakersCount)}
                    disabled={uploadBusy || actionsDisabled}
                    options={speakerOptions}
                    onChange={(v) =>
                      setSpeakersCount(v === "auto" ? "auto" : Number(v))
                    }
                  />
                )}
                {!fileTx.diarizeAvailable && (
                  <p className="pb-2.5 text-[12px] text-muted">
                    Speaker identification unavailable on this ASR.
                  </p>
                )}
              </div>

              {identifySpeakers && fileTx.diarizeAvailable && (
                <p className="mt-3 text-[12px] leading-relaxed text-muted">
                  Tip: if you know how many people speak, choose the number — it makes
                  speaker labels more accurate.
                </p>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={acceptAttr(fileTx.fileOpts.acceptedFormats)}
                className="hidden"
                onChange={(e) => {
                  onFilePicked(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />

              <button
                type="button"
                disabled={uploadBusy || actionsDisabled}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(e) => {
                  e.preventDefault();
                  dragCounter.current += 1;
                  setDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  dragCounter.current = Math.max(0, dragCounter.current - 1);
                  if (dragCounter.current === 0) setDragging(false);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  dragCounter.current = 0;
                  setDragging(false);
                  onFilePicked(e.dataTransfer.files?.[0]);
                }}
                className={cx(
                  "mt-5 flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center transition-colors disabled:opacity-60",
                  dragging
                    ? "border-brand-border bg-brand-soft"
                    : "border-brand-border/70 bg-transparent hover:border-brand-border hover:bg-brand-soft",
                )}
              >
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-cyan">
                  <Upload size={22} />
                </span>
                <p className="text-[16px] text-text">
                  <span className="font-bold">Choose a file</span> or drop it here
                </p>
                <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">
                  {dropzoneHint}
                </p>
                <p className="mt-1 text-[12px] text-muted">
                  English words and numbers stay in Latin script.
                </p>
                {selectedFile ? (
                  <p className="mt-3 text-[12px] text-cyan">
                    {selectedFile.name} · {formatBytes(selectedFile.size)}
                  </p>
                ) : null}
              </button>

              {selectedFile && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={uploadBusy || actionsDisabled}
                    onClick={() => void onGenerateTranscript()}
                    className={cx(
                      ACTION_GRADIENT,
                      "flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-[15px] font-bold text-on-brand shadow-[0_12px_28px_-12px_rgba(37,99,235,0.75)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:scale-100",
                    )}
                  >
                    {fileTx.uploading
                      ? "Uploading…"
                      : fileTx.polling
                        ? "Transcribing…"
                        : "Transcript"}
                  </button>
                  {!uploadBusy && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setFilePickError("");
                        fileTx.clearCurrent();
                      }}
                      className="rounded-lg border border-brand-border px-4 py-2 text-[13px] text-muted hover:bg-brand-soft"
                    >
                      Clear file
                    </button>
                  )}
                </div>
              )}

              {(selectedFile || uploadBusy || filePickError || fileTx.error) && (
                <div className="mt-5 flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={cx(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        fileTx.current?.status === "completed"
                          ? "bg-success"
                          : fileTx.current?.status === "failed"
                            ? "bg-danger-soft"
                            : uploadBusy
                              ? "bg-cyan"
                              : "bg-brand-soft",
                      )}
                    />
                    <span className="truncate text-[13px] text-muted">
                      {uploadStatusText}
                    </span>
                  </div>
                  {(uploadBusy || fileTx.current?.status === "completed") && (
                    <div className="h-[4px] w-40 shrink-0 overflow-hidden rounded-full bg-brand-soft sm:w-52">
                      <div
                        className={cx(TAB_GRADIENT, "h-full rounded-full transition-all")}
                        style={{
                          width: `${
                            fileTx.current?.status === "completed"
                              ? 100
                              : Math.max(progressPct, 8)
                          }%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              <CurlSnippet
                steps={curlSteps}
                description="Transcribe a file from your own app. The fields follow the language, speaker settings and file chosen above."
              />

              {showUploadBelow && (
                <div className="mt-5 min-h-[220px] rounded-xl border border-brand-border bg-brand-soft px-5 py-5 sm:px-6">
                  <TranscriptionResult
                    item={fileTx.current!}
                    onCopy={() => {
                      const text = transcriptPlainText(fileTx.current!);
                      if (text) void navigator.clipboard.writeText(text);
                    }}
                    onDownload={(format) =>
                      void fileTx.download(
                        fileTx.current!.transcriptionUuid,
                        format,
                        fileTx.current!.filename.replace(/\.[^.]+$/, ""),
                      )
                    }
                    onDownloadJson={() => {
                      const item = fileTx.current!;
                      const payload = {
                        transcriptionUuid: item.transcriptionUuid,
                        filename: item.filename,
                        language: item.language,
                        status: item.status,
                        audioSeconds: item.audioSeconds,
                        transcript: item.transcript,
                        result: item.result,
                      };
                      const blob = new Blob(
                        [JSON.stringify(payload, null, 2)],
                        { type: "application/json" },
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${item.filename.replace(/\.[^.]+$/, "") || item.transcriptionUuid}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    onNewFile={() => {
                      setSelectedFile(null);
                      setFilePickError("");
                      fileTx.clearCurrent();
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  />
                </div>
              )}

              {showHistory && (
                <div className="mt-6 border-t border-brand-border pt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-[14px] font-semibold text-text">
                      Transcription history
                    </h2>
                    <button
                      type="button"
                      onClick={() => void fileTx.refreshHistory()}
                      className="text-[12px] text-muted hover:text-text"
                    >
                      Refresh
                    </button>
                  </div>
                  {fileTx.historyError && (
                    <p className="mb-2 text-[12px] text-danger">{fileTx.historyError}</p>
                  )}
                  <div className="space-y-2">
                    {fileTx.history.map((item) => (
                      <div
                        key={item.transcriptionUuid}
                        className={cx(
                          "rounded-xl border border-brand-border bg-brand-soft px-4 py-3",
                          fileTx.deletingUuid === item.transcriptionUuid &&
                            "opacity-70",
                        )}
                      >
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() =>
                            void fileTx.openTranscription(item.transcriptionUuid)
                          }
                        >
                          <p className="truncate text-[13px] text-text">
                            {item.filename}
                          </p>
                          <p className="mt-1 line-clamp-1 text-[12px] text-muted">
                            {item.transcript || "(no transcript yet)"}
                          </p>
                        </button>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={cx(
                              "rounded-full border px-2 py-0.5 text-[12px] uppercase",
                              transcriptionStatusTone(item.status),
                            )}
                          >
                            {item.status}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {item.status === "completed" &&
                              fileTx.fileOpts.downloadFormats.map((format) => (
                                <button
                                  key={format}
                                  type="button"
                                  onClick={() =>
                                    void fileTx.download(
                                      item.transcriptionUuid,
                                      format,
                                      item.filename.replace(/\.[^.]+$/, ""),
                                    )
                                  }
                                  className="text-[12px] text-muted hover:text-text"
                                >
                                  {format.toUpperCase()}
                                </button>
                              ))}
                            <button
                              type="button"
                              disabled={Boolean(fileTx.deletingUuid)}
                              onClick={() =>
                                void fileTx.remove(item.transcriptionUuid)
                              }
                              className="inline-flex items-center gap-1 text-[12px] text-danger disabled:opacity-50"
                            >
                              {fileTx.deletingUuid === item.transcriptionUuid ? (
                                <>
                                  <Loader2 size={11} className="animate-spin" />
                                  Deleting…
                                </>
                              ) : (
                                <>
                                  <Trash2 size={11} /> Delete
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[12px] text-muted">
                    <span>Page {fileTx.historyPage}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={fileTx.historyPage <= 1}
                        onClick={() =>
                          fileTx.setHistoryPage((p) => Math.max(1, p - 1))
                        }
                        className="rounded-lg border border-brand-border px-2.5 py-1 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={!fileTx.historyHasNext}
                        onClick={() => fileTx.setHistoryPage((p) => p + 1)}
                        className="rounded-lg border border-brand-border px-2.5 py-1 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
