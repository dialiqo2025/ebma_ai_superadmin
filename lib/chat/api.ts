import { apiBlob, apiRequest } from "@/lib/api";
import type {
  ChatMessageRequest,
  ChatMessageResponse,
  ChatOptions,
  ChatSpeechRequest,
} from "./types";

export const chatApi = {
  getOptions() {
    return apiRequest<ChatOptions>("/chat/options", { auth: true });
  },

  sendMessage(payload: ChatMessageRequest) {
    return apiRequest<ChatMessageResponse>("/chat/messages", {
      method: "POST",
      body: payload,
      auth: true,
      timeout: 60_000,
    });
  },

  synthesize(payload: ChatSpeechRequest) {
    return apiBlob("/chat/speech", {
      method: "POST",
      body: payload,
      timeout: 120_000,
    });
  },
};
