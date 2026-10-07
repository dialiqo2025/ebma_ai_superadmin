"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { sttApi } from "@/lib/stt";
import type {
  SttFinalSegmentPayload,
  SttHealth,
  SttMode,
  SttOptions,
  SttSegment,
  SttSession,
  SttStartMessage,
  SttWsMessage,
} from "@/lib/stt";

const IDLE_LEVEL = 0.08;

export type SttLiveConfig = {
  language: string;
  mode: SttMode;
  sampleRate?: number;
  endSilenceMs: number;
  partials: boolean;
};

export type UseSttLiveSessionResult = {
  options: SttOptions | null;
  healthOk: boolean | null;
  health: SttHealth | null;
  loadingOptions: boolean;
  listening: boolean;
  busy: boolean;
  partialText: string;
  finals: SttSegment[];
  transcript: string;
  session: SttSession | null;
  voiceLevel: number;
  serverSpeaking: boolean | null;
  error: string;
  tokenCooldown: number;
  modelConfigured: boolean;
  start: (config: SttLiveConfig) => Promise<void>;
  configure: (config: Pick<SttLiveConfig, "language" | "mode" | "endSilenceMs" | "partials">) => void;
  /** `flush: true` sends ASR `stop` and waits for the in-progress phrase's final. */
  stop: (options?: { flush?: boolean }) => Promise<void>;
  clear: () => void;
  refreshMeta: () => Promise<void>;
  /** While muted the mic stays open but silence is streamed, so ASR hears nothing. */
  setMuted: (muted: boolean) => void;
};

export type UseSttLiveSessionOptions = {
  /** Save each final segment to the STT session history (default true). */
  persistSegments?: boolean;
  /** Called for every final phrase received from the ASR socket. */
  onFinal?: (segment: SttFinalSegmentPayload) => void;
};

function downsampleToRate(
  input: Float32Array,
  inputRate: number,
  outputRate: number,
): Float32Array {
  if (inputRate === outputRate) return input;
  const ratio = inputRate / outputRate;
  const newLength = Math.floor(input.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.floor((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let j = start; j < end && j < input.length; j += 1) {
      sum += input[j];
      count += 1;
    }
    result[i] = count ? sum / count : 0;
  }
  return result;
}

function floatTo16BitPcm(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i += 1) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function toLocalSegment(finalMsg: SttFinalSegmentPayload): SttSegment {
  return {
    segmentUuid: `local-${finalMsg.seg}`,
    seg: finalMsg.seg,
    text: finalMsg.text,
    lang: finalMsg.lang,
    t0: finalMsg.t0,
    t1: finalMsg.t1,
    audio_s: finalMsg.audio_s,
    decode_ms: finalMsg.decode_ms,
    latency_ms: finalMsg.latency_ms,
    reason: finalMsg.reason,
    createdAt: new Date().toISOString(),
  };
}

export function useSttLiveSession(
  hookOptions: UseSttLiveSessionOptions = {},
): UseSttLiveSessionResult {
  const persistSegments = hookOptions.persistSegments ?? true;
  const onFinalRef = useRef(hookOptions.onFinal);
  onFinalRef.current = hookOptions.onFinal;
  const mutedRef = useRef(false);
  const flushResolverRef = useRef<(() => void) | null>(null);
  const [options, setOptions] = useState<SttOptions | null>(null);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [health, setHealth] = useState<SttHealth | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [partialText, setPartialText] = useState("");
  const [finals, setFinals] = useState<SttSegment[]>([]);
  const [transcript, setTranscript] = useState("");
  const [session, setSession] = useState<SttSession | null>(null);
  const [voiceLevel, setVoiceLevel] = useState(IDLE_LEVEL);
  const [serverSpeaking, setServerSpeaking] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [tokenCooldown, setTokenCooldown] = useState(0);

  const sessionIdRef = useRef<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meterDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);
  const startMessageRef = useRef<SttStartMessage | null>(null);
  const targetRateRef = useRef(16000);
  const startedApiRef = useRef(false);
  const finishingRef = useRef(false);
  const pendingPersistsRef = useRef(new Set<Promise<unknown>>());
  const maxTimerRef = useRef<number | null>(null);
  const levelRef = useRef(IDLE_LEVEL);
  const listeningRef = useRef(false);

  const refreshMeta = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const [opts, health] = await Promise.all([
        sttApi.getOptions(),
        sttApi.getHealth().catch(() => null),
      ]);
      setOptions(opts);
      if (health && typeof health === "object") {
        setHealth(health);
        const status = String(health.status || "").toLowerCase();
        setHealthOk(
          health.ok === true || status === "ok" || status === "healthy" || status === "up",
        );
      } else {
        setHealth(null);
        setHealthOk(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load STT options");
      setOptions(null);
      setHealth(null);
      setHealthOk(false);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  useEffect(() => {
    if (tokenCooldown <= 0) return;
    const id = window.setInterval(() => {
      setTokenCooldown((v) => Math.max(0, v - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [tokenCooldown]);

  const stopMeter = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    levelRef.current = IDLE_LEVEL;
    setVoiceLevel(IDLE_LEVEL);
  }, []);

  const tickMeter = useCallback(() => {
    const analyser = analyserRef.current;
    const data = meterDataRef.current;
    if (!analyser || !data || !listeningRef.current) return;
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const s = (data[i] - 128) / 128;
      sum += s * s;
    }
    const rms = Math.sqrt(sum / data.length);
    const gated = Math.max(0, rms - 0.02);
    const mapped = Math.min(1, gated * 6);
    const target = IDLE_LEVEL + mapped * (1 - IDLE_LEVEL);
    levelRef.current = levelRef.current * 0.6 + target * 0.4;
    setVoiceLevel(levelRef.current);
    rafRef.current = requestAnimationFrame(tickMeter);
  }, []);

  const cleanupMedia = useCallback(() => {
    stopMeter();
    try {
      processorRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    processorRef.current = null;
    analyserRef.current = null;
    meterDataRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
  }, [stopMeter]);

  const closeWs = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        if (
          wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING
        ) {
          wsRef.current.close();
        }
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    }
  }, []);

  const finishSession = useCallback(
    async (payload: { status: "completed" } | { status: "failed"; errorCode: string; errorMessage?: string }) => {
      const id = sessionIdRef.current;
      if (!id || finishingRef.current) return;
      finishingRef.current = true;
      try {
        // Let in-flight segment saves land first so the session closes with all of them.
        await Promise.all(pendingPersistsRef.current);
        const updated = await sttApi.finishSession(id, payload);
        setSession(updated);
        if (updated.transcript) setTranscript(updated.transcript);
        if (updated.segments?.length) setFinals(updated.segments);
      } catch {
        /* best-effort finish */
      } finally {
        finishingRef.current = false;
      }
    },
    [],
  );

  const stop = useCallback(async (stopOptions?: { flush?: boolean }) => {
    const ws = wsRef.current;
    if (stopOptions?.flush && listeningRef.current && ws?.readyState === WebSocket.OPEN) {
      // Stop capturing, then let the server finish the phrase in progress.
      listeningRef.current = false;
      setListening(false);
      setBusy(true);
      cleanupMedia();
      await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(resolve, 5000);
        flushResolverRef.current = () => {
          window.clearTimeout(timeout);
          resolve();
        };
        try {
          ws.send(JSON.stringify({ type: "stop" }));
        } catch {
          flushResolverRef.current();
        }
      });
      flushResolverRef.current = null;
    }

    listeningRef.current = false;
    setListening(false);
    setBusy(false);
    setServerSpeaking(null);
    setPartialText("");
    if (maxTimerRef.current !== null) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    cleanupMedia();
    closeWs();
    if (sessionIdRef.current && startedApiRef.current) {
      await finishSession({ status: "completed" });
    }
    startedApiRef.current = false;
  }, [cleanupMedia, closeWs, finishSession]);

  const failAndStop = useCallback(
    async (message: string, errorCode = "client_error") => {
      setError(message);
      listeningRef.current = false;
      setListening(false);
      setBusy(false);
      setPartialText("");
      if (maxTimerRef.current !== null) {
        window.clearTimeout(maxTimerRef.current);
        maxTimerRef.current = null;
      }
      cleanupMedia();
      closeWs();
      if (sessionIdRef.current) {
        await finishSession({
          status: "failed",
          errorCode,
          errorMessage: message,
        });
      }
      startedApiRef.current = false;
    },
    [cleanupMedia, closeWs, finishSession],
  );

  const attachMicPipeline = useCallback(
    async (stream: MediaStream, targetSampleRate: number) => {
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const context = audioContextRef.current ?? new AudioCtx();
      audioContextRef.current = context;
      await context.resume();

      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;
      meterDataRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      rafRef.current = requestAnimationFrame(tickMeter);

      const bufferSize = 4096;
      const processor = context.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || !listeningRef.current) return;
        const input = event.inputBuffer.getChannelData(0);
        const resampled = downsampleToRate(input, context.sampleRate, targetSampleRate);
        // Muted: keep the stream timing intact but send silence, so any open phrase
        // finalizes and the assistant's own voice is never transcribed.
        const pcm = mutedRef.current
          ? new ArrayBuffer(resampled.length * 2)
          : floatTo16BitPcm(resampled);
        ws.send(pcm);
      };

      source.connect(processor);
      processor.connect(context.destination);
    },
    [tickMeter],
  );

  const start = useCallback(
    async (config: SttLiveConfig) => {
      if (listeningRef.current || busy) return;
      if (tokenCooldown > 0) {
        setError(`Token rate limited. Retry in ${tokenCooldown}s.`);
        return;
      }
      if (options && !options.modelConfigured) {
        setError("ASR model is not configured.");
        return;
      }

      setError("");
      setServerSpeaking(null);
      setBusy(true);
      setPartialText("");
      setFinals([]);
      mutedRef.current = false;
      setTranscript("");
      finishingRef.current = false;
      startedApiRef.current = false;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;

        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const context = new AudioCtx();
        audioContextRef.current = context;
        const nativeRate = context.sampleRate;
        const min = options?.sampleRate.min ?? 8000;
        const max = options?.sampleRate.max ?? 96000;
        const sampleRate =
          config.sampleRate ??
          (nativeRate >= min && nativeRate <= max
            ? nativeRate
            : options?.sampleRate.default ?? 16000);

        const created = await sttApi.createSession({
          language: config.language,
          mode: config.mode,
          sampleRate,
          endSilenceMs: config.endSilenceMs,
          partials: config.partials,
        });

        sessionIdRef.current = created.session.sessionUuid;
        setSession(created.session);
        startMessageRef.current = created.startMessage;
        targetRateRef.current = created.startMessage.sample_rate || sampleRate;

        let tokenRes;
        try {
          tokenRes = await sttApi.mintToken(created.session.sessionUuid, { ttlSeconds: 300 });
        } catch (err) {
          if (err instanceof ApiError && err.status === 429) {
            const retry =
              typeof err.retryAfter === "number"
                ? Math.ceil(err.retryAfter)
                : typeof (err.data as { retryAfterSeconds?: number } | null)?.retryAfterSeconds ===
                    "number"
                  ? Math.ceil(
                      (err.data as { retryAfterSeconds: number }).retryAfterSeconds,
                    )
                  : 60;
            setTokenCooldown(retry);
            throw new Error(`Token rate limited. Retry in ${retry}s.`);
          }
          throw err;
        }

        setSession(tokenRes.session);
        startMessageRef.current = tokenRes.startMessage;
        targetRateRef.current = tokenRes.startMessage.sample_rate;

        const wsUrl = `${tokenRes.connection.wsUrl}${
          tokenRes.connection.wsUrl.includes("?") ? "&" : "?"
        }token=${encodeURIComponent(tokenRes.connection.token)}`;

        await new Promise<void>((resolve, reject) => {
          const ws = new WebSocket(wsUrl);
          ws.binaryType = "arraybuffer";
          wsRef.current = ws;
          let settled = false;

          const readyTimeout = window.setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(new Error("Timed out waiting for ASR ready"));
          }, 20_000);

          const fail = (message: string) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(readyTimeout);
            reject(new Error(message));
          };

          ws.onerror = () => {
            fail("WebSocket connection failed");
          };

          // EBMA ASR requires the JSON `start` message first; it replies with `ready`.
          ws.onopen = () => {
            try {
              const startMessage = startMessageRef.current;
              if (!startMessage) {
                fail("Missing start message");
                return;
              }
              ws.send(JSON.stringify(startMessage));
            } catch (e) {
              fail(e instanceof Error ? e.message : "Failed to send start message");
            }
          };

          ws.onmessage = async (event) => {
            if (typeof event.data !== "string") return;
            let msg: SttWsMessage;
            try {
              msg = JSON.parse(event.data) as SttWsMessage;
            } catch {
              return;
            }

            if (msg.type === "ready") {
              if (settled) return;
              window.clearTimeout(readyTimeout);
              try {
                await sttApi.markStarted(created.session.sessionUuid);
                startedApiRef.current = true;
                await attachMicPipeline(stream, targetRateRef.current);
                listeningRef.current = true;
                setListening(true);
                setBusy(false);

                const maxMinutes = options?.maxSessionMinutes ?? 20;
                maxTimerRef.current = window.setTimeout(() => {
                  void failAndStop("Max session duration reached", "max_session_minutes");
                }, maxMinutes * 60_000);

                settled = true;
                resolve();
              } catch (e) {
                fail(e instanceof Error ? e.message : "Failed to start streaming");
              }
              return;
            }

            if (msg.type === "error") {
              const errPayload = msg as unknown as { message?: string };
              const errMsg =
                typeof errPayload.message === "string"
                  ? errPayload.message
                  : "ASR WebSocket error";
              fail(errMsg);
              return;
            }

            if (msg.type === "stopped") {
              flushResolverRef.current?.();
              return;
            }

            if (msg.type === "vad") {
              setServerSpeaking(typeof msg.speaking === "boolean" ? msg.speaking : null);
              return;
            }

            if (msg.type === "partial") {
              setPartialText(String(msg.text || ""));
              return;
            }

            if (msg.type === "final") {
              const finalMsg = msg as SttFinalSegmentPayload;
              setPartialText("");
              setTranscript((prev) => {
                const next = prev ? `${prev} ${finalMsg.text}` : finalMsg.text;
                return next.trim();
              });
              onFinalRef.current?.(finalMsg);
              // Show the phrase as soon as ASR sends it; saving it to history happens
              // in the background and never delays what the user sees.
              setFinals((prev) => {
                if (prev.some((s) => s.seg === finalMsg.seg)) return prev;
                return [...prev, toLocalSegment(finalMsg)].sort((a, b) => a.seg - b.seg);
              });
              if (!persistSegments) return;
              const persist: Promise<unknown> = sttApi
                .persistFinalSegment(created.session.sessionUuid, finalMsg)
                .catch(() => undefined)
                .finally(() => pendingPersistsRef.current.delete(persist));
              pendingPersistsRef.current.add(persist);
            }
          };

          ws.onclose = () => {
            if (listeningRef.current) {
              void failAndStop("WebSocket disconnected", "ws_disconnected");
            }
          };
        });
      } catch (err) {
        setBusy(false);
        const message = err instanceof Error ? err.message : "Failed to start listening";
        await failAndStop(message, err instanceof ApiError ? "api_error" : "client_error");
      }
    },
    [attachMicPipeline, busy, failAndStop, options, persistSegments, tokenCooldown],
  );

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
  }, []);

  const configure = useCallback((config: Pick<SttLiveConfig, "language" | "mode" | "endSilenceMs" | "partials">) => {
    const ws = wsRef.current;
    if (!listeningRef.current || ws?.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      type: "config",
      lang: config.language,
      mode: config.mode,
      end_silence_ms: config.endSilenceMs,
      partials: config.partials,
    }));
  }, []);

  useEffect(() => {
    return () => {
      listeningRef.current = false;
      if (maxTimerRef.current !== null) window.clearTimeout(maxTimerRef.current);
      cleanupMedia();
      closeWs();
      if (sessionIdRef.current && startedApiRef.current) {
        void sttApi.finishSession(sessionIdRef.current, {
          status: "failed",
          errorCode: "client_unmount",
          errorMessage: "Page closed",
        });
      }
    };
  }, [cleanupMedia, closeWs]);

  const clear = useCallback(() => {
    if (listeningRef.current) return;
    setPartialText("");
    setFinals([]);
    setTranscript("");
    setError("");
    setSession(null);
    setServerSpeaking(null);
  }, []);

  return {
    options,
    healthOk,
    health,
    loadingOptions,
    listening,
    busy,
    partialText,
    finals,
    transcript,
    session,
    voiceLevel,
    serverSpeaking,
    error,
    tokenCooldown,
    modelConfigured: options?.modelConfigured ?? false,
    start,
    configure,
    stop,
    clear,
    refreshMeta,
    setMuted,
  };
}
