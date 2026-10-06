import type {
  SttConnection,
  SttCreateSessionResponse,
  SttErrorInfo,
  SttSession,
  SttStartMessage,
  SttTokenResponse,
  SttTranscription,
  SttTranscriptionResult,
  SttTranscriptionSpeaker,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(obj: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function pickBool(obj: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

/** Normalize session whether nested under `session` or returned flat on `data`. */
export function normalizeSttSession(raw: unknown): SttSession {
  if (!isRecord(raw)) {
    throw new Error("Invalid STT session payload");
  }

  const source = isRecord(raw.session) ? raw.session : raw;

  const sessionUuid = pickString(source, "sessionUuid", "session_uuid", "id");
  if (!sessionUuid) {
    throw new Error("STT session response missing sessionUuid");
  }

  return {
    sessionUuid,
    language: pickString(source, "language", "lang") || "hi",
    mode: (pickString(source, "mode") as SttSession["mode"]) || "native",
    sampleRate: pickNumber(source, "sampleRate", "sample_rate") ?? 16000,
    endSilenceMs: pickNumber(source, "endSilenceMs", "end_silence_ms") ?? 700,
    partials: pickBool(source, "partials") ?? true,
    status: (pickString(source, "status") as SttSession["status"]) || "created",
    transcript: pickString(source, "transcript") || "",
    phraseCount: pickNumber(source, "phraseCount", "phrase_count") ?? 0,
    audioDurationSeconds:
      pickNumber(source, "audioDurationSeconds", "audio_duration_seconds") ?? 0,
    error: (isRecord(source.error) ? (source.error as SttSession["error"]) : null) ?? null,
    startedAt: pickString(source, "startedAt", "started_at") ?? null,
    completedAt: pickString(source, "completedAt", "completed_at") ?? null,
    createdAt: pickString(source, "createdAt", "created_at") || new Date().toISOString(),
    updatedAt: pickString(source, "updatedAt", "updated_at") || new Date().toISOString(),
    segments: Array.isArray(source.segments)
      ? (source.segments as SttSession["segments"])
      : undefined,
  };
}

export function normalizeStartMessage(
  raw: unknown,
  session?: SttSession,
): SttStartMessage {
  const candidate = isRecord(raw)
    ? isRecord(raw.startMessage)
      ? raw.startMessage
      : isRecord(raw.start_message)
        ? raw.start_message
        : raw.type === "start"
          ? raw
          : null
    : null;

  if (candidate) {
    return {
      type: "start",
      sample_rate:
        pickNumber(candidate, "sample_rate", "sampleRate") ??
        session?.sampleRate ??
        16000,
      lang: pickString(candidate, "lang", "language") || session?.language || "hi",
      mode:
        (pickString(candidate, "mode") as SttStartMessage["mode"]) ||
        session?.mode ||
        "native",
      end_silence_ms:
        pickNumber(candidate, "end_silence_ms", "endSilenceMs") ??
        session?.endSilenceMs ??
        700,
      partials: pickBool(candidate, "partials") ?? session?.partials ?? true,
    };
  }

  if (!session) {
    throw new Error("STT response missing startMessage");
  }

  // Fallback only when API omitted startMessage (token endpoint should still supply it).
  return {
    type: "start",
    sample_rate: session.sampleRate,
    lang: session.language,
    mode: session.mode,
    end_silence_ms: session.endSilenceMs,
    partials: session.partials,
  };
}

export function normalizeCreateSessionResponse(raw: unknown): SttCreateSessionResponse {
  const session = normalizeSttSession(raw);
  const startMessage = normalizeStartMessage(raw, session);
  return { session, startMessage };
}

function normalizeConnection(raw: unknown): SttConnection {
  if (!isRecord(raw)) throw new Error("STT token response missing connection");
  const source = isRecord(raw.connection) ? raw.connection : raw;
  const token = pickString(source, "token");
  const wsUrl = pickString(source, "wsUrl", "ws_url", "url");
  if (!token || !wsUrl) {
    throw new Error("STT connection missing token or wsUrl");
  }
  return {
    token,
    wsUrl,
    expiresIn: pickNumber(source, "expiresIn", "expires_in") ?? 300,
    expiresAt: pickNumber(source, "expiresAt", "expires_at") ?? 0,
  };
}

export function normalizeTokenResponse(raw: unknown): SttTokenResponse {
  const session = normalizeSttSession(raw);
  const startMessage = normalizeStartMessage(raw, session);
  const connection = normalizeConnection(raw);
  return { session, connection, startMessage };
}

function normalizeTranscriptionError(
  value: unknown,
): SttErrorInfo | null {
  if (!isRecord(value)) return null;
  const code = pickString(value, "code") || "unknown";
  const message = pickString(value, "message") || "Transcription failed";
  return { code, message };
}

function normalizeTranscriptionResult(value: unknown): SttTranscriptionResult | null {
  if (!isRecord(value)) return null;
  const segmentsRaw = Array.isArray(value.segments) ? value.segments : [];
  const speakersRaw = Array.isArray(value.speakers) ? value.speakers : [];
  return {
    ...value,
    segments: segmentsRaw
      .filter(isRecord)
      .map((seg) => ({
        start: pickNumber(seg, "start", "t0") ?? 0,
        end: pickNumber(seg, "end", "t1") ?? 0,
        text: pickString(seg, "text") || "",
        speaker: pickString(seg, "speaker", "speakerLabel", "speaker_label") ?? null,
      })),
    speakers: speakersRaw.filter(isRecord) as SttTranscriptionSpeaker[],
  };
}

export function normalizeTranscription(raw: unknown): SttTranscription {
  if (!isRecord(raw)) {
    throw new Error("Invalid STT transcription payload");
  }
  const source = isRecord(raw.transcription) ? raw.transcription : raw;
  const transcriptionUuid = pickString(
    source,
    "transcriptionUuid",
    "transcription_uuid",
    "id",
  );
  if (!transcriptionUuid) {
    throw new Error("STT transcription response missing transcriptionUuid");
  }

  const progressRaw = pickNumber(source, "progress") ?? 0;
  const progress = progressRaw > 1 ? progressRaw / 100 : Math.max(0, Math.min(1, progressRaw));

  return {
    transcriptionUuid,
    providerJobId:
      pickString(source, "providerJobId", "provider_job_id") ?? null,
    filename: pickString(source, "filename", "fileName", "file_name") || "file",
    language: pickString(source, "language", "lang") || "hi",
    diarize: pickBool(source, "diarize") ?? false,
    speakers: pickNumber(source, "speakers") ?? null,
    status:
      (pickString(source, "status") as SttTranscription["status"]) || "queued",
    stage: pickString(source, "stage") ?? null,
    progress,
    audioSeconds:
      pickNumber(source, "audioSeconds", "audio_seconds", "audioDurationSeconds") ??
      null,
    transcript: pickString(source, "transcript") || "",
    result: normalizeTranscriptionResult(source.result),
    error: normalizeTranscriptionError(source.error),
    createdAt:
      pickString(source, "createdAt", "created_at") || new Date().toISOString(),
    updatedAt:
      pickString(source, "updatedAt", "updated_at") || new Date().toISOString(),
    completedAt:
      pickString(source, "completedAt", "completed_at") ?? null,
  };
}

