import type { TtsOutputFormat, TtsRangeOption, TtsVoiceMode } from "@/lib/tts";

export type ChatRole = "user" | "assistant";

export type ChatLanguageOption = {
  code: string;
  name: string;
};

export type ChatOptions = {
  languages: ChatLanguageOption[];
  llmConfigured: boolean;
  ttsConfigured: boolean;
  maxMessageCharacters: number;
  maxReplyCharacters: number;
  maxHistoryMessages: number;
  voiceModes: TtsVoiceMode[];
  audioFormats: TtsOutputFormat[];
  speed: TtsRangeOption;
  pitch: TtsRangeOption;
};

export type ChatHistoryTurn = {
  role: ChatRole;
  text: string;
};

export type ChatMessageRequest = {
  message: string;
  language?: string;
  replyLanguage?: string;
  source?: "voice" | "text";
  history?: ChatHistoryTurn[];
};

export type ChatMessageResponse = {
  reply: {
    text: string;
    language: string;
  };
  llmMs: number;
  providerRequestId?: string;
};

export type ChatSpeechRequest = {
  text: string;
  language?: string;
  voiceMode?: TtsVoiceMode;
  voiceId?: string;
  speed?: number;
  pitch?: number;
  outputFormat?: TtsOutputFormat;
};
