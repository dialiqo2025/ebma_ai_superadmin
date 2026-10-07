export type SttMode = "native" | "mixed" | "romanized";
export type SttStatus = "created" | "connecting" | "streaming" | "completed" | "failed";
export type SttSegmentReason = "pause" | "max_len" | "flush";

export type SttLanguageOption = {
  code: string;
  name: string;
};

export type SttSampleRateOption = {
  min: number;
  max: number;
  default: number;
};

export type SttEndSilenceOption = {
  min: number;
  max: number;
  default: number;
};

export type SttAudioOptions = {
  encoding: "pcm_s16le";
  channels: 1;
  recommendedFrameMs: {
    min: number;
    max: number;
    ideal: number;
  };
};

export type SttOptions = {
  languages: SttLanguageOption[];
  modes: SttMode[];
  sampleRate: SttSampleRateOption;
  endSilenceMs: SttEndSilenceOption;
  partialsDefault: boolean;
  maxSessionMinutes: number;
  maxPhraseSeconds: number;
  modelConfigured: boolean;
  transport: "websocket";
  audio: SttAudioOptions;
  fileTranscription?: SttFileTranscriptionOptions;
};

export type SttDownloadFormat = "txt" | "srt" | "vtt";

export type SttFileTranscriptionOptions = {
  maxUploadBytes: number;
  maxAudioMinutes: number;
  acceptedFormats: string[];
  downloadFormats: SttDownloadFormat[];
  diarizeDefault: boolean;
  speakers: { min: number; max: number };
  pollIntervalMs: number;
};

export type SttTranscriptionStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type SttTranscriptionSegment = {
  start: number;
  end: number;
  text: string;
  speaker?: string | null;
};

export type SttTranscriptionSpeaker = {
  id?: string | number;
  label?: string;
  speaker?: string;
  talkTimeSeconds?: number;
  [key: string]: unknown;
};

export type SttTranscriptionResult = {
  segments?: SttTranscriptionSegment[];
  speakers?: SttTranscriptionSpeaker[];
  [key: string]: unknown;
};

export type SttTranscription = {
  transcriptionUuid: string;
  providerJobId: string | null;
  filename: string;
  language: string;
  diarize: boolean;
  speakers: number | null;
  status: SttTranscriptionStatus;
  stage: string | null;
  progress: number;
  audioSeconds: number | null;
  transcript: string;
  result: SttTranscriptionResult | null;
  error: SttErrorInfo | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type SttTranscriptionList = {
  items: SttTranscription[];
  pagination: SttPagination;
};

export type ListSttTranscriptionsQuery = {
  page?: number;
  page_size?: number;
  status?: SttTranscriptionStatus;
  language?: string;
  search?: string;
};

export type UploadSttTranscriptionParams = {
  file: File;
  language?: string;
  diarize?: boolean;
  speakers?: number;
};

export type SttErrorInfo = {
  code: string;
  message: string;
};

export type SttSegment = {
  segmentUuid: string;
  seg: number;
  text: string;
  lang: string;
  t0: number;
  t1: number;
  audio_s: number;
  decode_ms: number;
  latency_ms: number;
  reason: SttSegmentReason;
  createdAt: string;
};

export type SttSession = {
  sessionUuid: string;
  language: string;
  mode: SttMode;
  sampleRate: number;
  endSilenceMs: number;
  partials: boolean;
  status: SttStatus;
  transcript: string;
  phraseCount: number;
  audioDurationSeconds: number;
  error: SttErrorInfo | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  segments?: SttSegment[];
};

export type SttStartMessage = {
  type: "start";
  sample_rate: number;
  lang: string;
  mode: SttMode;
  end_silence_ms: number;
  partials: boolean;
};

export type SttCreateSessionResponse = {
  session: SttSession;
  startMessage: SttStartMessage;
};

export type SttPagination = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
};

export type SttSessionList = {
  items: SttSession[];
  pagination: SttPagination;
};

export type CreateSttSessionRequest = {
  language?: string;
  mode?: SttMode;
  sampleRate?: number;
  endSilenceMs?: number;
  partials?: boolean;
};

export type UpdateSttSessionRequest = Partial<CreateSttSessionRequest>;

export type ListSttSessionsQuery = {
  page?: number;
  page_size?: number;
  status?: SttStatus;
  language?: string;
  search?: string;
};

export type SttTokenRequest = {
  ttlSeconds?: number;
};

export type SttConnection = {
  token: string;
  wsUrl: string;
  expiresIn: number;
  expiresAt: number;
};

export type SttTokenResponse = {
  session: SttSession;
  connection: SttConnection;
  startMessage: SttStartMessage;
};

export type SttFinalSegmentPayload = {
  type: "final";
  seg: number;
  text: string;
  lang: string;
  t0: number;
  t1: number;
  audio_s: number;
  decode_ms: number;
  latency_ms: number;
  reason: SttSegmentReason;
};

export type SttPartialMessage = {
  type: "partial";
  text?: string;
  seg?: number;
  [key: string]: unknown;
};

export type SttReadyMessage = {
  type: "ready";
  [key: string]: unknown;
};

export type SttWsMessage =
  | SttReadyMessage
  | SttPartialMessage
  | SttFinalSegmentPayload
  | { type: string; [key: string]: unknown };

export type FinishSttSessionRequest =
  | { status: "completed" }
  | { status: "failed"; errorCode: string; errorMessage?: string };

export type SttHealth = {
  ok?: boolean;
  status?: string;
  active_sessions?: number;
  max_sessions?: number;
  queue_depth?: number;
  long_form?: {
    speaker_identification?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
