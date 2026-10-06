import { API_BASE_URL, apiBlob, apiRequest, ApiError } from "@/lib/api";
import { getStoredToken } from "@/lib/auth/storage";
import type {
  CreateTtsGenerationRequest,
  ListTtsGenerationsQuery,
  TtsGeneration,
  TtsGenerationList,
  TtsOptions,
  UpdateTtsGenerationRequest,
} from "./types";

function toQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const ttsApi = {
  getOptions() {
    return apiRequest<TtsOptions>("/tts/options", { auth: true });
  },

  createGeneration(payload: CreateTtsGenerationRequest) {
    return apiRequest<TtsGeneration>("/tts/generations", {
      method: "POST",
      body: payload,
      auth: true,
      timeout: 120_000,
    });
  },

  createCloneGeneration(input: {
    text: string;
    language?: string;
    voiceSample: File;
    sampleTranscript?: string;
    speed?: number;
    pitch?: number;
    outputFormat?: CreateTtsGenerationRequest["outputFormat"];
  }) {
    const form = new FormData();
    form.set("text", input.text);
    form.set("voiceMode", "clone");
    if (input.language) form.set("language", input.language);
    if (input.speed !== undefined) form.set("speed", String(input.speed));
    if (input.pitch !== undefined) form.set("pitch", String(input.pitch));
    if (input.outputFormat) form.set("outputFormat", input.outputFormat);
    if (input.sampleTranscript?.trim()) {
      form.set("sampleTranscript", input.sampleTranscript.trim());
    }
    form.set("voiceSample", input.voiceSample);

    return apiRequest<TtsGeneration>("/tts/generations", {
      method: "POST",
      body: form,
      auth: true,
      timeout: 120_000,
    });
  },

  listGenerations(query: ListTtsGenerationsQuery = {}) {
    return apiRequest<TtsGenerationList>(
      `/tts/generations${toQuery({
        page: query.page,
        page_size: query.page_size,
        status: query.status,
        language: query.language,
        search: query.search,
      })}`,
      { auth: true },
    );
  },

  getGeneration(generationUuid: string) {
    return apiRequest<TtsGeneration>(`/tts/generations/${generationUuid}`, {
      auth: true,
    });
  },

  updateGeneration(generationUuid: string, payload: UpdateTtsGenerationRequest) {
    return apiRequest<TtsGeneration>(`/tts/generations/${generationUuid}`, {
      method: "PATCH",
      body: payload,
      auth: true,
    });
  },

  deleteGeneration(generationUuid: string) {
    return apiRequest<unknown>(`/tts/generations/${generationUuid}`, {
      method: "DELETE",
      auth: true,
    });
  },

  generate(generationUuid: string) {
    return apiRequest<TtsGeneration>(`/tts/generations/${generationUuid}/generate`, {
      method: "POST",
      auth: true,
      timeout: 120_000,
    });
  },

  /**
   * Streaming synthesis: binary PCM body (not JSON). Play with `playPcmStream`.
   * After the stream ends the generation is marked completed and WAV is stored.
   */
  async streamGeneration(
    generationUuid: string,
    options?: { signal?: AbortSignal },
  ): Promise<Response> {
    const token = getStoredToken();
    const response = await fetch(
      `${API_BASE_URL}/tts/generations/${generationUuid}/stream`,
      {
        method: "POST",
        headers: {
          Accept: "audio/pcm, audio/*, application/json",
          ...(token ? { Authorization: token } : {}),
        },
        signal: options?.signal,
      },
    );

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || contentType.includes("application/json")) {
      let message = "TTS stream failed";
      let data: unknown = null;
      try {
        const payload = await response.json();
        message = payload?.message || message;
        data = payload?.data ?? null;
      } catch {
        /* ignore */
      }
      throw new ApiError(response.status || 0, {
        success: false,
        message,
        data: data as never,
      });
    }

    return response;
  },

  async fetchAudioBlob(generationUuid: string) {
    return apiBlob(`/tts/generations/${generationUuid}/audio`, { timeout: 60_000 });
  },

  audioAbsoluteUrl(audioUrl: string | null | undefined) {
    if (!audioUrl) return null;
    if (/^https?:\/\//i.test(audioUrl)) return audioUrl;
    const base = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
    return `${base}${audioUrl.startsWith("/") ? audioUrl : `/${audioUrl}`}`;
  },
};
