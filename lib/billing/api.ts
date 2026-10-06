import { apiRequest } from "@/lib/api";

export type BillingSummary = {
  balanceCredits: number;
  initialCredits: number;
  overageCredits: number;
  usedCredits: number;
  usageQuantity: number;
  pricing: Record<string, { unit: string; creditsPerUnit: number; example: string }>;
};

export type BillingUsage = {
  usage_uuid: string;
  usage_type: "tts_characters" | "stt_seconds" | "llm_tokens";
  quantity: string;
  charged_credits: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

export type BillingPlan = {
  plan_uuid: string;
  code: string;
  name: string;
  description?: string | null;
  price_minor: number;
  currency: string;
  billing_interval: string;
  plan_kind: "service" | "wallet_topup";
  monthly_credits: string;
  active: boolean;
  features?: { stt: boolean; tts: boolean; llm: boolean };
  benefits?: string[];
};
export type BillingSubscriptionRecord = { subscription: { subscription_uuid: string; status: string; stripe_subscription_id?: string | null; current_period_start?: string | null; current_period_end?: string | null; created_at: string }; plan: BillingPlan | null };
export type BillingTransactionRecord = { transaction: { transaction_uuid: string; amount_minor: number; currency: string; payment_method: string; status: string; stripe_checkout_session_id?: string | null; stripe_payment_intent_id?: string | null; metadata?: Record<string, unknown> | null; created_at: string }; plan: BillingPlan | null };

export type AdminUserWallet = {
  user_uuid: string;
  email: string;
  fullName: string;
  balanceCredits: number;
};

export type AdminGrantCreditsResult = {
  user_uuid: string;
  grantedCredits: number;
  balanceCredits: number;
};

export const billingApi = {
  summary: () => apiRequest<BillingSummary>("/billing/summary", { auth: true }),
  plans: () => apiRequest<BillingPlan[]>("/billing/plans", { auth: true }),
  checkout: (planUuid: string) => apiRequest<{ url: string | null; sessionId: string }>("/billing/checkout", { method: "POST", auth: true, body: { planUuid } }),
  walletTopupCheckout: (amount: number) => apiRequest<{ url: string | null; sessionId: string; amount: number; credits: number; currency: string }>("/billing/wallet-topup/checkout", { method: "POST", auth: true, body: { amount } }),
  confirmCheckout: (sessionId: string) => apiRequest<{ status: string; credited: boolean }>(`/billing/checkout/${encodeURIComponent(sessionId)}/confirm`, { auth: true }),
  subscriptions: () => apiRequest<BillingSubscriptionRecord[]>("/billing/subscriptions", { auth: true }),
  cancelSubscription: (subscriptionUuid: string) => apiRequest(`/billing/subscriptions/${subscriptionUuid}/cancel`, { method: "POST", auth: true }),
  transactions: () => apiRequest<BillingTransactionRecord[]>("/billing/transactions", { auth: true }),
  transaction: (transactionUuid: string) => apiRequest<BillingTransactionRecord>(`/billing/transactions/${encodeURIComponent(transactionUuid)}`, { auth: true }),
  usage: (filters: { page?: number; type?: string; from?: string; to?: string } = {}) => {
    const params = new URLSearchParams({ page: String(filters.page ?? 1) });
    if (filters.type) params.set("type", filters.type);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    return apiRequest<{ items: BillingUsage[]; page: number; pageSize: number }>(`/billing/usage?${params}`, { auth: true });
  },
  adminUserWallet: (userUuid: string) =>
    apiRequest<AdminUserWallet>(`/billing/admin/users/${encodeURIComponent(userUuid)}/wallet`, {
      auth: true,
    }),
  adminGrantCredits: (userUuid: string, body: { credits: number; note?: string }) =>
    apiRequest<AdminGrantCreditsResult>(
      `/billing/admin/users/${encodeURIComponent(userUuid)}/credits`,
      { method: "POST", auth: true, body },
    ),
};
