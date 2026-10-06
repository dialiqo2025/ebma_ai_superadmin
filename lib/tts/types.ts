export type TtsVoiceMode = "default" | "clone";
export type TtsOutputFormat = "wav" | "mp3" | "ogg";
export type TtsStatus = "queued" | "processing" | "completed" | "failed";

export type TtsRangeOption = {
  min: number;
  max: number;
  step: number;
  default: number;
};

export type TtsVoiceCloneOptions = {
  enabled: boolean;
  sampleFormats: string[];
  sampleMinDurationSeconds: number;
  sampleMaxDurationSeconds: number;
  sampleMaxBytes: number;
  sampleTranscriptMaxCharacters: number;
  requiresSampleTranscript: boolean;
};

export type TtsOptions = {
  maxTextCharacters: number;
  languages: string;
  voiceModes: TtsVoiceMode[];
  audioFormats: TtsOutputFormat[];
  speed: TtsRangeOption;
  pitch: TtsRangeOption;
  autoProcess: boolean;
  modelConfigured: boolean;
  voiceClone?: TtsVoiceCloneOptions;
  streaming?: {
    enabled: boolean;
    endpoint: string;
    encoding: string;
    contentType: string;
    sampleRate: number;
    channels: number;
  };
};

export type TtsErrorInfo = {
  code: string;
  message: string;
};

export type TtsGeneration = {
  generationUuid: string;
  text: string;
  language: string;
  voiceMode: TtsVoiceMode;
  voiceId: string | null;
  speed: number;
  pitch: number;
  outputFormat: TtsOutputFormat;
  status: TtsStatus;
  audioUrl: string | null;
  audioMimeType: string | null;
  audioSizeBytes: number | null;
  providerRequestId: string | null;
  error: TtsErrorInfo | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TtsPagination = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
};

export type TtsGenerationList = {
  items: TtsGeneration[];
  pagination: TtsPagination;
};

export type CreateTtsGenerationRequest = {
  text: string;
  language?: string;
  voiceMode?: TtsVoiceMode;
  voiceId?: string;
  speed?: number;
  pitch?: number;
  outputFormat?: TtsOutputFormat;
};

export type UpdateTtsGenerationRequest = Partial<CreateTtsGenerationRequest>;

export type ListTtsGenerationsQuery = {
  page?: number;
  page_size?: number;
  status?: TtsStatus;
  language?: string;
  search?: string;
};
