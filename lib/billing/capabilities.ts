import { apiRequest } from "@/lib/api";

export type Capabilities = {
  plan: string;
  subscribed: boolean;
  capabilities: { stt: boolean; tts: boolean; llm: boolean; llmMode: "platform" | "user" | "both" };
};

export const capabilitiesApi = {
  get: () => apiRequest<Capabilities>("/billing/capabilities", { auth: true }),
};
