"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, errorMessage } from "@/lib/api";
import { sttApi } from "@/lib/stt";
import type {
  SttDownloadFormat,
  SttFileTranscriptionOptions,
  SttHealth,
  SttOptions,
  SttTranscription,
  SttTranscriptionStatus,
} from "@/lib/stt";

const DEFAULT_FILE_OPTS: SttFileTranscriptionOptions = {
  maxUploadBytes: 300 * 1024 * 1024,
  maxAudioMinutes: 120,
  acceptedFormats: [
    "mp3",
    "wav",
    "m4a",
    "flac",
    "ogg",
    "mp4",
    "webm",
    "aac",
    "mpeg",
  ],
  downloadFormats: ["txt", "srt", "vtt"],
  diarizeDefault: false,
  speakers: { min: 1, max: 20 },
  pollIntervalMs: 1500,
};

const ACTIVE: SttTranscriptionStatus[] = ["queued", "processing"];

export type UseSttFileTranscriptionResult = {
  options: SttOptions | null;
  fileOpts: SttFileTranscriptionOptions;
  health: SttHealth | null;
  diarizeAvailable: boolean;
  current: SttTranscription | null;
  history: SttTranscription[];
  uploading: boolean;
  polling: boolean;
  deletingUuid: string | null;
  error: string;
  historyError: string;
  historyPage: number;
  historyHasNext: boolean;
  setHistoryPage: (page: number | ((p: number) => number)) => void;
  refreshMeta: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  upload: (params: {
    file: File;
    language: string;
    diarize: boolean;
    speakers?: number;
  }) => Promise<void>;
  openTranscription: (transcriptionUuid: string) => Promise<void>;
  download: (
    transcriptionUuid: string,
    format: SttDownloadFormat,
    filenameHint?: string,
  ) => Promise<void>;
  remove: (transcriptionUuid: string) => Promise<void>;
  clearCurrent: () => void;
};

function mapUploadError(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 413) return "File too large for upload.";
    if (err.status === 429) return "Too many transcription jobs. Try again shortly.";
    if (err.status === 501) {
      return err.message || "Speaker identification is unavailable.";
    }
  }
  return errorMessage(err, "Upload failed");
}

export function useSttFileTranscription(): UseSttFileTranscriptionResult {
  const [options, setOptions] = useState<SttOptions | null>(null);
  const [health, setHealth] = useState<SttHealth | null>(null);
  const [current, setCurrent] = useState<SttTranscription | null>(null);
  const [history, setHistory] = useState<SttTranscription[]>([]);
  const [uploading, setUploading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [deletingUuid, setDeletingUuid] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasNext, setHistoryHasNext] = useState(false);

  const pollTimerRef = useRef<number | null>(null);
  const pollTargetRef = useRef<string | null>(null);

  const fileOpts = options?.fileTranscription ?? DEFAULT_FILE_OPTS;
  const diarizeAvailable =
    health?.long_form?.speaker_identification !== false;

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollTargetRef.current = null;
    setPolling(false);
  }, []);

  const refreshMeta = useCallback(async () => {
    try {
      const [opts, healthRes] = await Promise.all([
        sttApi.getOptions(),
        sttApi.getHealth().catch(() => null),
      ]);
      setOptions(opts);
      setHealth(healthRes);
    } catch (err) {
      setError(errorMessage(err, "Failed to load STT options"));
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    setHistoryError("");
    try {
      const data = await sttApi.listTranscriptions({
        page: historyPage,
        page_size: 8,
      });
      setHistory(data.items);
      setHistoryHasNext(Boolean(data.pagination?.hasNextPage));
    } catch (err) {
      setHistoryError(errorMessage(err, "Failed to load transcription history"));
    }
  }, [historyPage]);

  const pollUntilDone = useCallback(
    async (transcriptionUuid: string) => {
      stopPolling();
      pollTargetRef.current = transcriptionUuid;
      setPolling(true);

      const tick = async () => {
        if (pollTargetRef.current !== transcriptionUuid) return;
        try {
          const next = await sttApi.getTranscription(transcriptionUuid);
          setCurrent(next);

          if (ACTIVE.includes(next.status)) {
            const interval = fileOpts.pollIntervalMs || 1500;
            pollTimerRef.current = window.setTimeout(() => {
              void tick();
            }, interval);
            return;
          }

          setPolling(false);
          pollTargetRef.current = null;
          if (next.status === "failed") {
            setError(next.error?.message || "Transcription failed");
          }
          void refreshHistory();
        } catch (err) {
          setPolling(false);
          pollTargetRef.current = null;
          setError(errorMessage(err, "Failed while polling transcription"));
        }
      };

      await tick();
    },
    [fileOpts.pollIntervalMs, refreshHistory, stopPolling],
  );

  const upload = useCallback(
    async (params: {
      file: File;
      language: string;
      diarize: boolean;
      speakers?: number;
    }) => {
      setError("");
      setUploading(true);
      setCurrent(null);

      try {
        if (params.file.size > fileOpts.maxUploadBytes) {
          throw new ApiError(413, {
            success: false,
            message: "File too large for upload.",
            data: null,
          });
        }

        if (params.diarize && !diarizeAvailable) {
          throw new ApiError(501, {
            success: false,
            message: "Speaker identification is unavailable.",
            data: null,
          });
        }

        const created = await sttApi.uploadTranscription({
          file: params.file,
          language: params.language,
          diarize: params.diarize,
          speakers: params.diarize ? params.speakers : undefined,
        });
        setCurrent(created);

        if (ACTIVE.includes(created.status)) {
          await pollUntilDone(created.transcriptionUuid);
        } else {
          void refreshHistory();
          if (created.status === "failed") {
            setError(created.error?.message || "Transcription failed");
          }
        }
      } catch (err) {
        setError(mapUploadError(err));
      } finally {
        setUploading(false);
      }
    },
    [diarizeAvailable, fileOpts.maxUploadBytes, pollUntilDone, refreshHistory],
  );

  const openTranscription = useCallback(
    async (transcriptionUuid: string) => {
      setError("");
      try {
        const item = await sttApi.getTranscription(transcriptionUuid);
        setCurrent(item);
        if (ACTIVE.includes(item.status)) {
          await pollUntilDone(item.transcriptionUuid);
        }
      } catch (err) {
        setError(errorMessage(err, "Failed to open transcription"));
      }
    },
    [pollUntilDone],
  );

  const download = useCallback(
    async (
      transcriptionUuid: string,
      format: SttDownloadFormat,
      filenameHint?: string,
    ) => {
      setError("");
      try {
        const blob = await sttApi.downloadTranscription(transcriptionUuid, format);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filenameHint || transcriptionUuid}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(errorMessage(err, "Failed to download transcript"));
      }
    },
    [],
  );

  const remove = useCallback(
    async (transcriptionUuid: string) => {
      setError("");
      setDeletingUuid(transcriptionUuid);
      try {
        await sttApi.deleteTranscription(transcriptionUuid);
        if (current?.transcriptionUuid === transcriptionUuid) {
          stopPolling();
          setCurrent(null);
        }
        await refreshHistory();
      } catch (err) {
        setError(errorMessage(err, "Failed to delete transcription"));
      } finally {
        setDeletingUuid(null);
      }
    },
    [current?.transcriptionUuid, refreshHistory, stopPolling],
  );

  const clearCurrent = useCallback(() => {
    stopPolling();
    setCurrent(null);
    setError("");
  }, [stopPolling]);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    options,
    fileOpts,
    health,
    diarizeAvailable,
    current,
    history,
    uploading,
    polling,
    deletingUuid,
    error,
    historyError,
    historyPage,
    historyHasNext,
    setHistoryPage,
    refreshMeta,
    refreshHistory,
    upload,
    openTranscription,
    download,
    remove,
    clearCurrent,
  };
}
