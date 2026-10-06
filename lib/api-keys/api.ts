import { apiRequest } from "@/lib/api";

export type ApiKeyScope = "stt" | "tts" | "llm";

export type ApiKeyRecord = {
  key_uuid: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type CreatedApiKey = ApiKeyRecord & { secret: string };

export const apiKeysApi = {
  list: () => apiRequest<ApiKeyRecord[]>("/api-keys", { auth: true }),
  create: (body: { name: string; scopes: ApiKeyScope[]; expiresInDays?: number }) =>
    apiRequest<CreatedApiKey>("/api-keys", { method: "POST", auth: true, body }),
  rename: (keyUuid: string, name: string) =>
    apiRequest<ApiKeyRecord>(`/api-keys/${keyUuid}`, { method: "PATCH", auth: true, body: { name } }),
  revoke: (keyUuid: string) =>
    apiRequest<ApiKeyRecord>(`/api-keys/${keyUuid}`, { method: "DELETE", auth: true }),
};
