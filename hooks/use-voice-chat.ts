"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/api";
import { chatApi } from "@/lib/chat";
import type { ChatHistoryTurn, ChatOptions, ChatRole } from "@/lib/chat";
import type { SttFinalSegmentPayload, SttMode } from "@/lib/stt";
import type { TtsOutputFormat, TtsVoiceMode } from "@/lib/tts";
import { useSttLiveSession } from "./use-stt-live-session";

const SETTINGS_KEY = "ebma.voiceChat.settings";
const MESSAGES_KEY = "ebma.voiceChat.messages";
const MAX_STORED_MESSAGES = 100;

export type VoiceChatAudioState = "loading" | "ready" | "browser" | "error" | "off";

export type VoiceChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  language: string;
  source: "voice" | "text";
  createdAt: number;
  status: "done" | "error";
  llmMs?: number;
  audio?: {
    state: VoiceChatAudioState;
    url?: string;
    error?: string;
  };
};

export type VoiceChatSettings = {
  /** Language the user speaks; also the ASR language ("auto" detects). */
  language: string;
  /** Language the assistant answers in ("auto" mirrors the user). */
  replyLanguage: string;
  sttMode: SttMode;
  endSilenceMs: number;
  /** Hands-free: every spoken phrase is sent automatically and the mic stays open. */
  handsFree: boolean;
  /** Push-to-talk: send the transcript as soon as the mic is stopped. */
  autoSendVoice: boolean;
  voiceReplies: boolean;
  browserVoiceFallback: boolean;
  voiceMode: TtsVoiceMode;
  voiceId: string;
  speed: number;
  pitch: number;
  outputFormat: TtsOutputFormat;
};

export const DEFAULT_VOICE_CHAT_SETTINGS: VoiceChatSettings = {
  language: "auto",
  replyLanguage: "auto",
  sttMode: "native",
  endSilenceMs: 800,
  handsFree: false,
  autoSendVoice: true,
  voiceReplies: true,
  browserVoiceFallback: true,
  voiceMode: "default",
  voiceId: "",
  speed: 1,
  pitch: 1,
  outputFormat: "mp3",
};

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function joinText(a: string, b: string) {
  return [a.trim(), b.trim()].filter(Boolean).join(" ");
}

function readStorage<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked */
  }
}

/** BCP-47 tag for the browser speech engine. */
function browserLocale(code: string) {
  if (!code || code === "auto") return undefined;
  if (code === "en") return "en-IN";
  if (code === "ne") return "ne-NP";
  return `${code}-IN`;
}

export function browserSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Merge consecutive same-role turns so the LLM always sees alternating roles. */
function buildHistory(messages: VoiceChatMessage[], maxTurns: number): ChatHistoryTurn[] {
  const turns: ChatHistoryTurn[] = [];
  for (const message of messages) {
    if (message.status !== "done" || !message.text.trim()) continue;
    const last = turns[turns.length - 1];
    if (last && last.role === message.role) {
      last.text = `${last.text}\n${message.text}`.slice(-4000);
    } else {
      turns.push({ role: message.role, text: message.text.slice(0, 4000) });
    }
  }
  return turns.slice(-maxTurns);
}

export function useVoiceChat() {
  const [options, setOptions] = useState<ChatOptions | null>(null);
  const [optionsError, setOptionsError] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [settings, setSettings] = useState<VoiceChatSettings>(DEFAULT_VOICE_CHAT_SETTINGS);
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [synthesizingId, setSynthesizingId] = useState<string | null>(null);

  const hydratedRef = useRef(false);
  const messagesRef = useRef<VoiceChatMessage[]>([]);
  const settingsRef = useRef(settings);
  const optionsRef = useRef<ChatOptions | null>(null);
  const draftRef = useRef("");
  const thinkingRef = useRef(false);
  const botBusyRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const turnRef = useRef(0);
  const voiceCapturedRef = useRef(false);
  const voiceLanguageRef = useRef<string | null>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  messagesRef.current = messages;
  settingsRef.current = settings;
  optionsRef.current = options;
  draftRef.current = draft;
  thinkingRef.current = thinking;

  // ---------- persistence ----------
  useEffect(() => {
    const storedSettings = readStorage<Partial<VoiceChatSettings>>(SETTINGS_KEY);
    if (storedSettings) setSettings({ ...DEFAULT_VOICE_CHAT_SETTINGS, ...storedSettings });
    const storedMessages = readStorage<VoiceChatMessage[]>(MESSAGES_KEY);
    if (Array.isArray(storedMessages)) {
      setMessages(storedMessages.map((m) => ({ ...m, audio: undefined })));
    }
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (hydratedRef.current) writeStorage(SETTINGS_KEY, settings);
  }, [settings]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    writeStorage(
      MESSAGES_KEY,
      messages.slice(-MAX_STORED_MESSAGES).map((m) => ({ ...m, audio: undefined })),
    );
  }, [messages]);

  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      audioRef.current?.pause();
      if (browserSpeechSupported()) window.speechSynthesis.cancel();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // ---------- options ----------
  const refreshOptions = useCallback(async () => {
    setLoadingOptions(true);
    setOptionsError("");
    try {
      setOptions(await chatApi.getOptions());
    } catch (err) {
      setOptionsError(errorMessage(err, "Failed to load assistant options"));
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    void refreshOptions();
  }, [refreshOptions]);

  const updateSettings = useCallback((patch: Partial<VoiceChatSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const patchMessage = useCallback((id: string, patch: Partial<VoiceChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  // ---------- playback ----------
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (browserSpeechSupported()) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  const playUrl = useCallback(
    async (id: string, url: string) => {
      stopSpeaking();
      const audio = new Audio(url);
      audioRef.current = audio;
      const done = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
          setSpeakingId(null);
        }
      };
      audio.onended = done;
      audio.onerror = done;
      setSpeakingId(id);
      try {
        await audio.play();
      } catch {
        done();
        patchMessage(id, {
          audio: { state: "ready", url, error: "Autoplay was blocked. Press play to listen." },
        });
      }
    },
    [patchMessage, stopSpeaking],
  );

  const speakWithBrowser = useCallback(
    (id: string, text: string, language: string) => {
      if (!browserSpeechSupported()) return false;
      stopSpeaking();
      const utterance = new SpeechSynthesisUtterance(text);
      const locale = browserLocale(language);
      if (locale) {
        utterance.lang = locale;
        const voice = window.speechSynthesis
          .getVoices()
          .find((v) => v.lang.toLowerCase().startsWith(language.toLowerCase()));
        if (voice) utterance.voice = voice;
      }
      utterance.rate = settingsRef.current.speed;
      utterance.pitch = settingsRef.current.pitch;
      const done = () => setSpeakingId((current) => (current === id ? null : current));
      utterance.onend = done;
      utterance.onerror = done;
      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
      return true;
    },
    [stopSpeaking],
  );

  const speak = useCallback(
    async (message: VoiceChatMessage) => {
      const turn = turnRef.current;
      const current = settingsRef.current;
      const ttsConfigured = optionsRef.current?.ttsConfigured ?? false;

      const fallback = (reason?: string) => {
        if (turn !== turnRef.current) return;
        if (current.browserVoiceFallback && speakWithBrowser(message.id, message.text, message.language)) {
          patchMessage(message.id, { audio: { state: "browser", error: reason } });
        } else {
          patchMessage(message.id, {
            audio: { state: reason ? "error" : "off", error: reason },
          });
        }
      };

      if (!ttsConfigured) {
        fallback();
        return;
      }

      setSynthesizingId(message.id);
      patchMessage(message.id, { audio: { state: "loading" } });
      try {
        const blob = await chatApi.synthesize({
          text: message.text,
          language: message.language || "auto",
          voiceMode: current.voiceMode,
          ...(current.voiceMode === "clone" && current.voiceId.trim()
            ? { voiceId: current.voiceId.trim() }
            : {}),
          speed: current.speed,
          pitch: current.pitch,
          outputFormat: current.outputFormat,
        });
        const url = URL.createObjectURL(blob);
        objectUrlsRef.current.add(url);
        patchMessage(message.id, { audio: { state: "ready", url } });
        // A newer turn started while audio was generating: keep it for replay only.
        if (turn === turnRef.current) await playUrl(message.id, url);
      } catch (err) {
        fallback(errorMessage(err, "Speech generation failed"));
      } finally {
        setSynthesizingId((id) => (id === message.id ? null : id));
      }
    },
    [patchMessage, playUrl, speakWithBrowser],
  );

  const replay = useCallback(
    async (id: string) => {
      const message = messagesRef.current.find((m) => m.id === id);
      if (!message) return;
      if (speakingId === id) {
        stopSpeaking();
        return;
      }
      if (message.audio?.url) {
        await playUrl(id, message.audio.url);
        return;
      }
      await speak(message);
    },
    [playUrl, speak, speakingId, stopSpeaking],
  );

  // ---------- chat ----------
  const send = useCallback(
    async (text: string, meta: { source?: "voice" | "text"; language?: string } = {}) => {
      const message = text.trim();
      if (!message || thinkingRef.current) return;

      const current = settingsRef.current;
      const maxChars = optionsRef.current?.maxMessageCharacters ?? 2000;
      const maxHistory = optionsRef.current?.maxHistoryMessages ?? 20;
      const language = meta.language && meta.language !== "auto" ? meta.language : current.language;
      const history = buildHistory(messagesRef.current, maxHistory);

      turnRef.current += 1;
      stopSpeaking();

      const userMessage: VoiceChatMessage = {
        id: newId(),
        role: "user",
        text: message.slice(0, maxChars),
        language,
        source: meta.source ?? "text",
        createdAt: Date.now(),
        status: "done",
      };
      setMessages((prev) => [...prev, userMessage]);
      thinkingRef.current = true;
      setThinking(true);

      try {
        const response = await chatApi.sendMessage({
          message: userMessage.text,
          language,
          replyLanguage: current.replyLanguage,
          source: userMessage.source,
          history,
        });

        const assistantMessage: VoiceChatMessage = {
          id: newId(),
          role: "assistant",
          text: response.reply.text,
          language: response.reply.language,
          source: "text",
          createdAt: Date.now(),
          status: "done",
          llmMs: response.llmMs,
          audio: current.voiceReplies ? { state: "loading" } : { state: "off" },
        };
        setMessages((prev) => [...prev, assistantMessage]);
        thinkingRef.current = false;
        setThinking(false);

        if (current.voiceReplies) await speak(assistantMessage);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            text: errorMessage(err, "The assistant could not reply"),
            language,
            source: "text",
            createdAt: Date.now(),
            status: "error",
          },
        ]);
      } finally {
        thinkingRef.current = false;
        setThinking(false);
      }
    },
    [speak, stopSpeaking],
  );

  const sendDraft = useCallback(async () => {
    const text = draftRef.current;
    if (!text.trim()) return;
    const fromVoice = voiceCapturedRef.current;
    const language = voiceLanguageRef.current ?? undefined;
    setDraft("");
    voiceCapturedRef.current = false;
    voiceLanguageRef.current = null;
    await send(text, { source: fromVoice ? "voice" : "text", language });
  }, [send]);

  // ---------- microphone ----------
  const onFinal = useCallback(
    (segment: SttFinalSegmentPayload) => {
      const text = segment.text?.trim();
      if (!text) return;
      if (settingsRef.current.handsFree) {
        if (botBusyRef.current) return;
        void send(text, { source: "voice", language: segment.lang });
        return;
      }
      voiceCapturedRef.current = true;
      voiceLanguageRef.current = segment.lang || voiceLanguageRef.current;
      setDraft((prev) => joinText(prev, text));
    },
    [send],
  );

  const stt = useSttLiveSession({ persistSegments: false, onFinal });

  const setSttMuted = stt.setMuted;
  const botBusy = thinking || speakingId !== null || synthesizingId !== null;
  botBusyRef.current = botBusy;

  // Never let ASR hear the assistant's own voice; in hands-free mode also
  // ignore the user while a reply is being prepared.
  useEffect(() => {
    setSttMuted(speakingId !== null || (settings.handsFree && botBusy));
  }, [botBusy, setSttMuted, settings.handsFree, speakingId]);

  const toggleMic = useCallback(async () => {
    if (stt.listening) {
      if (settingsRef.current.handsFree) {
        await stt.stop();
        return;
      }
      await stt.stop({ flush: true });
      if (settingsRef.current.autoSendVoice && voiceCapturedRef.current) {
        await sendDraft();
      }
      return;
    }
    if (stt.busy) return;
    stopSpeaking();
    voiceCapturedRef.current = false;
    voiceLanguageRef.current = null;
    const current = settingsRef.current;
    await stt.start({
      language: current.language,
      mode: current.sttMode,
      endSilenceMs: current.endSilenceMs,
      partials: true,
    });
  }, [sendDraft, stopSpeaking, stt]);

  const clearConversation = useCallback(() => {
    turnRef.current += 1;
    stopSpeaking();
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
    setMessages([]);
    setDraft("");
  }, [stopSpeaking]);

  return {
    options,
    optionsError,
    loadingOptions,
    refreshOptions,
    settings,
    updateSettings,
    messages,
    draft,
    setDraft,
    thinking,
    speakingId,
    synthesizingId,
    botBusy,
    send,
    sendDraft,
    replay,
    stopSpeaking,
    clearConversation,
    toggleMic,
    stt,
  };
}

export type UseVoiceChatResult = ReturnType<typeof useVoiceChat>;
