import { apiBlob, apiRequest } from "@/lib/api";
import type {
  CreateSttSessionRequest,
  FinishSttSessionRequest,
  ListSttSessionsQuery,
  ListSttTranscriptionsQuery,
  SttDownloadFormat,
  SttFinalSegmentPayload,
  SttHealth,
  SttOptions,
  SttSegment,
  SttSessionList,
  SttTokenRequest,
  SttTranscriptionList,
  UpdateSttSessionRequest,
  UploadSttTranscriptionParams,
} from "./types";
import {
  normalizeCreateSessionResponse,
  normalizeSttSession,
  normalizeTokenResponse,
  normalizeTranscription,
} from "./normalize";

function toQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const sttApi = {
  getOptions() {
    return apiRequest<SttOptions>("/stt/options", { auth: true });
  },

  getHealth() {
    return apiRequest<SttHealth>("/stt/health", { auth: true });
  },

  async createSession(payload: CreateSttSessionRequest = {}) {
    const raw = await apiRequest<unknown>("/stt/sessions", {
      method: "POST",
      body: payload,
      auth: true,
    });
    return normalizeCreateSessionResponse(raw);
  },

  async listSessions(query: ListSttSessionsQuery = {}) {
    const data = await apiRequest<SttSessionList>(
      `/stt/sessions${toQuery({
        page: query.page,
        page_size: query.page_size,
        status: query.status,
        language: query.language,
        search: query.search,
      })}`,
      { auth: true },
    );
    return {
      items: (data?.items ?? []).map((item) => normalizeSttSession(item)),
      pagination: data.pagination,
    };
  },

  async getSession(sessionUuid: string) {
    const raw = await apiRequest<unknown>(`/stt/sessions/${sessionUuid}`, {
      auth: true,
    });
    return normalizeSttSession(raw);
  },

  async updateSession(sessionUuid: string, payload: UpdateSttSessionRequest) {
    const raw = await apiRequest<unknown>(`/stt/sessions/${sessionUuid}`, {
      method: "PATCH",
      body: payload,
      auth: true,
    });
    return normalizeCreateSessionResponse(raw);
  },

  deleteSession(sessionUuid: string) {
    return apiRequest<unknown>(`/stt/sessions/${sessionUuid}`, {
      method: "DELETE",
      auth: true,
    });
  },

  async mintToken(sessionUuid: string, payload: SttTokenRequest = {}) {
    const raw = await apiRequest<unknown>(`/stt/sessions/${sessionUuid}/token`, {
      method: "POST",
      body: payload,
      auth: true,
    });
    return normalizeTokenResponse(raw);
  },

  async markStarted(sessionUuid: string) {
    const raw = await apiRequest<unknown>(`/stt/sessions/${sessionUuid}/start`, {
      method: "POST",
      auth: true,
    });
    return normalizeSttSession(raw);
  },

  persistFinalSegment(sessionUuid: string, payload: SttFinalSegmentPayload) {
    return apiRequest<{ segment: SttSegment; session: unknown }>(
      `/stt/sessions/${sessionUuid}/segments`,
      {
        method: "POST",
        body: payload,
        auth: true,
      },
    ).then((data) => data.segment);
  },

  async finishSession(sessionUuid: string, payload: FinishSttSessionRequest) {
    const raw = await apiRequest<unknown>(`/stt/sessions/${sessionUuid}/finish`, {
      method: "POST",
      body: payload,
      auth: true,
    });
    return normalizeSttSession(raw);
  },

  async uploadTranscription(params: UploadSttTranscriptionParams) {
    const form = new FormData();
    form.append("file", params.file);
    if (params.language) form.append("language", params.language);
    if (params.diarize !== undefined) {
      form.append("diarize", params.diarize ? "true" : "false");
    }
    if (params.diarize && params.speakers !== undefined) {
      form.append("speakers", String(params.speakers));
    }

    const raw = await apiRequest<unknown>("/stt/transcriptions", {
      method: "POST",
      body: form,
      auth: true,
      timeout: 300_000,
    });
    return normalizeTranscription(raw);
  },

  async getTranscription(transcriptionUuid: string) {
    const raw = await apiRequest<unknown>(
      `/stt/transcriptions/${transcriptionUuid}`,
      { auth: true },
    );
    return normalizeTranscription(raw);
  },

  async listTranscriptions(query: ListSttTranscriptionsQuery = {}) {
    const data = await apiRequest<SttTranscriptionList>(
      `/stt/transcriptions${toQuery({
        page: query.page,
        page_size: query.page_size,
        status: query.status,
        language: query.language,
        search: query.search,
      })}`,
      { auth: true },
    );
    return {
      items: (data?.items ?? []).map((item) => normalizeTranscription(item)),
      pagination: data.pagination,
    };
  },

  deleteTranscription(transcriptionUuid: string) {
    return apiRequest<unknown>(`/stt/transcriptions/${transcriptionUuid}`, {
      method: "DELETE",
      auth: true,
    });
  },

  downloadTranscription(transcriptionUuid: string, format: SttDownloadFormat) {
    return apiBlob(
      `/stt/transcriptions/${transcriptionUuid}/download${toQuery({ format })}`,
      { timeout: 120_000 },
    );
  },
};
