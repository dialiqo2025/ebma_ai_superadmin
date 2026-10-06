"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/api";
import { playPcmStream, ttsApi } from "@/lib/tts";
import type {
  CreateTtsGenerationRequest,
  TtsGeneration,
  TtsOptions,
  TtsOutputFormat,
  TtsStatus,
  TtsVoiceMode,
} from "@/lib/tts";

export type TtsComposeState = {
  text: string;
  language: string;
  voiceMode: TtsVoiceMode;
  voiceId: string;
  speed: number;
  pitch: number;
  outputFormat: TtsOutputFormat;
};

export function useTtsOptions() {
  const [options, setOptions] = useState<TtsOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const opts = await ttsApi.getOptions();
      setOptions(opts);
    } catch (err) {
      setError(errorMessage(err, "Failed to load TTS options"));
      setOptions(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { options, loading, error, refresh };
}

export function useTtsHistory(pageSize = 8) {
  const [items, setItems] = useState<TtsGeneration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<TtsStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await ttsApi.listGenerations({
        page,
        page_size: pageSize,
        status: status || undefined,
        search: search.trim() || undefined,
      });
      setItems(data.items);
      setHasNextPage(data.pagination.hasNextPage);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(errorMessage(err, "Failed to load generations"));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    items,
    loading,
    error,
    status,
    setStatus,
    search,
    setSearch,
    page,
    setPage,
    hasNextPage,
    totalPages,
    refresh,
  };
}

export function useTtsAudio() {
  const objectUrlRef = useRef<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const [playingUuid, setPlayingUuid] = useState<string | null>(null);
  const [loadingUuid, setLoadingUuid] = useState<string | null>(null);
  const [streamingUuid, setStreamingUuid] = useState<string | null>(null);
  const [error, setError] = useState("");

  const revoke = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setStreamingUuid(null);
  }, []);

  useEffect(
    () => () => {
      revoke();
      stopStream();
    },
    [revoke, stopStream],
  );

  const play = useCallback(
    async (generationUuid: string) => {
      setError("");
      stopStream();
      setLoadingUuid(generationUuid);
      try {
        const blob = await ttsApi.fetchAudioBlob(generationUuid);
        revoke();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setPlayingUuid(generationUuid);
        const audio = new Audio(url);
        await audio.play();
        audio.onended = () => setPlayingUuid(null);
      } catch (err) {
        setError(errorMessage(err, "Failed to play audio"));
        setPlayingUuid(null);
      } finally {
        setLoadingUuid(null);
      }
    },
    [revoke, stopStream],
  );

  /** Stream GPU audio and play PCM as it arrives. */
  const streamAndPlay = useCallback(
    async (generationUuid: string) => {
      setError("");
      stopStream();
      const controller = new AbortController();
      streamAbortRef.current = controller;
      setLoadingUuid(generationUuid);
      setStreamingUuid(generationUuid);
      setPlayingUuid(generationUuid);

      try {
        const response = await ttsApi.streamGeneration(generationUuid, {
          signal: controller.signal,
        });
        setLoadingUuid(null);
        await playPcmStream(response, {
          signal: controller.signal,
          onEnded: () => setPlayingUuid(null),
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(errorMessage(err, "Failed to stream speech"));
        setPlayingUuid(null);
        throw err;
      } finally {
        if (streamAbortRef.current === controller) {
          streamAbortRef.current = null;
        }
        setStreamingUuid(null);
        setLoadingUuid(null);
      }
    },
    [stopStream],
  );

  const download = useCallback(async (generation: TtsGeneration) => {
    setError("");
    setLoadingUuid(generation.generationUuid);
    try {
      const blob = await ttsApi.fetchAudioBlob(generation.generationUuid);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tts-${generation.generationUuid}.${generation.outputFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorMessage(err, "Failed to download audio"));
    } finally {
      setLoadingUuid(null);
    }
  }, []);

  return {
    play,
    streamAndPlay,
    stopStream,
    download,
    playingUuid,
    loadingUuid,
    streamingUuid,
    error,
    setError,
  };
}

async function waitUntilSettled(generationUuid: string, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    const gen = await ttsApi.getGeneration(generationUuid);
    if (gen.status === "completed" || gen.status === "failed") return gen;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return ttsApi.getGeneration(generationUuid);
}

export function useTtsCompose(options: TtsOptions | null) {
  const [text, setText] = useState(
    "नमस्ते, आप कैसे हैं? आज मौसम बहुत अच्छा है, चलिए कहीं घूमने चलते हैं।",
  );
  const [language, setLanguage] = useState("hi");
  const [voiceMode, setVoiceMode] = useState<TtsVoiceMode>("default");
  const [voiceId, setVoiceId] = useState("");
  const [voiceSample, setVoiceSample] = useState<File | null>(null);
  const [sampleTranscript, setSampleTranscript] = useState("");
  const [playWhileGenerating, setPlayWhileGenerating] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [outputFormat, setOutputFormat] = useState<TtsOutputFormat>("wav");
  const [busy, setBusy] = useState(false);
  const [deletingUuid, setDeletingUuid] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<TtsGeneration | null>(null);
  const audio = useTtsAudio();

  useEffect(() => {
    if (!options) return;
    setSpeed(options.speed.default);
    setPitch(options.pitch.default);
    if (options.audioFormats.length) setOutputFormat(options.audioFormats[0]);
    if (options.voiceModes.length) setVoiceMode(options.voiceModes[0]);
  }, [options]);

  const maxChars = options?.maxTextCharacters ?? 1500;
  const streamingEnabled = options?.streaming?.enabled !== false;

  const generate = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    if (options && !options.modelConfigured) {
      setError("TTS model is not configured.");
      return;
    }
    if (voiceMode === "clone" && !voiceSample) {
      setError("Choose a voice sample file to clone a voice.");
      return;
    }
    if (voiceMode === "clone" && options?.voiceClone && !options.voiceClone.enabled) {
      setError("Voice clone is not available on the server.");
      return;
    }
    if (voiceMode === "clone" && options?.voiceClone?.requiresSampleTranscript) {
      if (!sampleTranscript.trim()) {
        setError("Enter what is spoken in the voice sample (transcript).");
        return;
      }
    }

    setBusy(true);
    setError("");
    audio.setError("");

    try {
      const textPayload = trimmed.slice(0, maxChars);
      const languagePayload = language || "auto";

      let generation =
        voiceMode === "clone" && voiceSample
          ? await ttsApi.createCloneGeneration({
              text: textPayload,
              language: languagePayload,
              voiceSample,
              sampleTranscript: sampleTranscript.trim() || undefined,
              speed,
              pitch,
              outputFormat,
            })
          : await ttsApi.createGeneration({
              text: textPayload,
              language: languagePayload,
              voiceMode: "default",
              speed,
              pitch,
              outputFormat,
            });
      setCurrent(generation);

      const useStream =
        streamingEnabled &&
        playWhileGenerating &&
        (generation.status === "queued" || generation.status === "failed");

      if (useStream) {
        await audio.streamAndPlay(generation.generationUuid);
        generation = await ttsApi.getGeneration(generation.generationUuid);
        setCurrent(generation);
        if (generation.status === "failed") {
          setError(generation.error?.message || "Generation failed");
        }
        return;
      }

      if (generation.status === "queued" || generation.status === "failed") {
        generation = await ttsApi.generate(generation.generationUuid);
        setCurrent(generation);
      }

      if (generation.status === "processing") {
        generation = await waitUntilSettled(generation.generationUuid);
        setCurrent(generation);
      }

      if (generation.status === "failed") {
        setError(generation.error?.message || "Generation failed");
        return;
      }

      if (generation.status === "completed" && playWhileGenerating) {
        await audio.play(generation.generationUuid);
      }
    } catch (err) {
      setError(errorMessage(err, "Failed to generate speech"));
    } finally {
      setBusy(false);
    }
  }, [
    audio,
    busy,
    language,
    maxChars,
    options,
    outputFormat,
    pitch,
    playWhileGenerating,
    speed,
    streamingEnabled,
    text,
    voiceMode,
    voiceSample,
    sampleTranscript,
  ]);

  const regenerate = useCallback(
    async (generationUuid: string) => {
      setBusy(true);
      setError("");
      try {
        if (streamingEnabled && playWhileGenerating) {
          const existing = await ttsApi.getGeneration(generationUuid);
          if (existing.status === "queued" || existing.status === "failed") {
            await audio.streamAndPlay(generationUuid);
            const generation = await ttsApi.getGeneration(generationUuid);
            setCurrent(generation);
            if (generation.status === "failed") {
              setError(generation.error?.message || "Generation failed");
            }
            return;
          }
        }

        let generation = await ttsApi.generate(generationUuid);
        setCurrent(generation);
        if (generation.status === "processing") {
          generation = await waitUntilSettled(generationUuid);
          setCurrent(generation);
        }
        if (generation.status === "failed") {
          setError(generation.error?.message || "Generation failed");
          return;
        }
        if (generation.status === "completed" && playWhileGenerating) {
          await audio.play(generation.generationUuid);
        }
      } catch (err) {
        setError(errorMessage(err, "Failed to regenerate"));
      } finally {
        setBusy(false);
      }
    },
    [audio, playWhileGenerating, streamingEnabled],
  );

  const remove = useCallback(async (generationUuid: string) => {
    setError("");
    setDeletingUuid(generationUuid);
    try {
      await ttsApi.deleteGeneration(generationUuid);
      setCurrent((prev) =>
        prev?.generationUuid === generationUuid ? null : prev,
      );
    } catch (err) {
      setError(errorMessage(err, "Failed to delete generation"));
      throw err;
    } finally {
      setDeletingUuid(null);
    }
  }, []);

  const update = useCallback(
    async (generationUuid: string, payload: CreateTtsGenerationRequest) => {
      setBusy(true);
      setError("");
      try {
        const generation = await ttsApi.updateGeneration(generationUuid, payload);
        setCurrent(generation);
        return generation;
      } catch (err) {
        setError(errorMessage(err, "Failed to update generation"));
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return {
    text,
    setText,
    language,
    setLanguage,
    voiceMode,
    setVoiceMode,
    voiceId,
    setVoiceId,
    voiceSample,
    setVoiceSample,
    sampleTranscript,
    setSampleTranscript,
    playWhileGenerating,
    setPlayWhileGenerating,
    speed,
    setSpeed,
    pitch,
    setPitch,
    outputFormat,
    setOutputFormat,
    maxChars,
    busy,
    deletingUuid,
    error,
    current,
    setCurrent,
    generate,
    regenerate,
    remove,
    update,
    audio,
  };
}
