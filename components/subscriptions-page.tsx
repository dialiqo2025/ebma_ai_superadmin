"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Check,
  CreditCard,
  Loader2,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  billingApi,
  type BillingPlan,
  type BillingSubscriptionRecord,
  type BillingTransactionRecord,
} from "@/lib/billing/api";
import { capabilitiesApi, type Capabilities } from "@/lib/billing/capabilities";

const money = (amount: number, currency: string) =>
  `${(Number(amount) / 100).toFixed(2)} ${currency}`;

const planMoney = (plan: BillingPlan) =>
  `${(Number(plan.price_minor) / 100).toFixed(2)} ${plan.currency}`;

function statusTone(status: string) {
  const value = status.toLowerCase();
  if (value === "active") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (value === "canceled" || value === "cancelled") {
    return "border-rose-400/30 bg-rose-400/10 text-rose-300";
  }
  if (value === "past_due" || value === "incomplete" || value === "pending") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  }
  return "border-[#39446d] bg-[#151c36] text-[#aeb9d2]";
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

function featureList(plan: BillingPlan | null | undefined) {
  if (!plan) return ["Limited legacy access"];
  if (plan.benefits?.length) return plan.benefits;
  return Object.entries(plan.features || {})
    .filter(([, enabled]) => enabled)
    .map(([key]) => key.toUpperCase());
}

export function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<BillingSubscriptionRecord[]>([]);
  const [transactions, setTransactions] = useState<BillingTransactionRecord[]>([]);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    void Promise.all([
      billingApi.subscriptions(),
      billingApi.transactions(),
      billingApi.plans(),
      capabilitiesApi.get().catch(() => null),
    ])
      .then(([nextSubscriptions, nextTransactions, nextPlans, nextCapabilities]) => {
        setSubscriptions(nextSubscriptions);
        setTransactions(nextTransactions);
        setPlans(nextPlans);
        setCapabilities(nextCapabilities);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (params.get("checkout") !== "success" || !sessionId) return;
    void billingApi
      .confirmCheckout(sessionId)
      .then((result) => {
        if (result.credited) window.alert("Payment confirmed. Your plan credits have been added.");
        load();
      })
      .catch(() =>
        window.alert(
          "Payment completed, but confirmation is still processing. Please refresh in a moment.",
        ),
      );
  }, []);

  const cancel = async (row: BillingSubscriptionRecord) => {
    if (
      !window.confirm(
        "Cancel this subscription at the end of the current billing period?",
      )
    ) {
      return;
    }
    await billingApi.cancelSubscription(row.subscription.subscription_uuid);
    load();
  };

  const current = subscriptions.find(
    (row) =>
      row.subscription.status === "active" && row.plan?.plan_kind === "service",
  );

  const canCancel = Boolean(
    current?.subscription.stripe_subscription_id &&
      (current.plan?.billing_interval === "monthly" ||
        current.plan?.billing_interval === "yearly"),
  );

  const currentStatus = current?.subscription.status || "inactive";
  const currentPlanName =
    current?.plan?.name ||
    (capabilities?.plan ? capabilities.plan.replace(/_/g, " ") : "Free plan");

  const servicePlans = useMemo(
    () => plans.filter((plan) => plan.plan_kind === "service" && plan.active),
    [plans],
  );

  const otherPlans = useMemo(
    () =>
      servicePlans.filter(
        (plan) => !current?.plan || plan.plan_uuid !== current.plan.plan_uuid,
      ),
    [servicePlans, current],
  );

  const startCheckout = async (planUuid: string) => {
    setCheckoutPlan(planUuid);
    try {
      const session = await billingApi.checkout(planUuid);
      if (session.url) window.location.assign(session.url);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to start checkout");
    } finally {
      setCheckoutPlan(null);
    }
  };

  return (
    <main className="mx-auto max-w-6xl text-[#d7def0]">
      <p className="font-mono text-[11px] tracking-[.24em] text-[#8f82ff]">BILLING</p>
      <h1 className="mt-3 text-4xl font-extrabold text-white">My plan</h1>
      <p className="mt-3 text-sm text-[#8995b3]">
        Review your current plan status and switch to another option anytime.
      </p>

      {loading ? (
        <div className="mt-10 flex justify-center text-[#a99af3]">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <>
          <section className="mt-8 rounded-2xl border border-[#293354] bg-[#101832] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#8f82ff]">
                  Current plan
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">{currentPlanName}</h2>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusTone(currentStatus)}`}
                  >
                    {current ? formatStatus(currentStatus) : "No active plan"}
                  </span>
                </div>
                <p className="mt-3 max-w-2xl text-sm text-[#8995b3]">
                  {current
                    ? current.plan?.description ||
                      "Your active service plan and included credits."
                    : "You are not on a paid service plan. Choose an option below to unlock entitlements and credits."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/platform/plans?kind=wallet_topup"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#39446d] px-3 py-2 text-xs font-semibold text-[#c5cee3] hover:border-[#6558e9] hover:text-white"
                >
                  <Wallet size={14} /> Recharge wallet
                </Link>
                {canCancel && current && (
                  <button
                    type="button"
                    onClick={() => void cancel(current)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 px-3 py-2 text-xs text-rose-300 hover:bg-rose-400/10"
                  >
                    <XCircle size={14} /> Cancel subscription
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[#243056] bg-[#0c1225] p-4">
                <p className="text-[11px] text-[#74809e]">Status</p>
                <p className="mt-2 text-sm font-semibold capitalize text-white">
                  {current ? formatStatus(currentStatus) : "Inactive"}
                </p>
              </div>
              <div className="rounded-xl border border-[#243056] bg-[#0c1225] p-4">
                <p className="text-[11px] text-[#74809e]">Credits included</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {current
                    ? Number(current.plan?.monthly_credits || 0).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-[#243056] bg-[#0c1225] p-4">
                <p className="text-[11px] text-[#74809e]">Billing</p>
                <p className="mt-2 text-sm font-semibold capitalize text-white">
                  {current?.plan?.billing_interval.replace(/_/g, " ") || "—"}
                </p>
              </div>
              <div className="rounded-xl border border-[#243056] bg-[#0c1225] p-4">
                <p className="text-[11px] text-[#74809e]">Access period</p>
                <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-white">
                  {current?.subscription.current_period_end ? (
                    <>
                      <CalendarClock size={14} className="text-[#8f82ff]" />
                      Until{" "}
                      {new Date(
                        current.subscription.current_period_end,
                      ).toLocaleDateString()}
                    </>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {featureList(current?.plan).map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#2f3a5c] bg-[#0c1225] px-3 py-1.5 text-[11px] text-[#b6c0d6]"
                >
                  <Check size={12} className="text-emerald-300" />
                  {item}
                </span>
              ))}
              {!current && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2f3a5c] bg-[#0c1225] px-3 py-1.5 text-[11px] text-[#b6c0d6]">
                  <Sparkles size={12} className="text-[#a99af3]" />
                  {capabilities?.subscribed
                    ? "Subscribed access"
                    : "Legacy / free access"}
                </span>
              )}
            </div>
          </section>

          <section className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">Other plan options</h2>
                <p className="mt-1 text-sm text-[#8995b3]">
                  Compare available service plans and upgrade when you are ready.
                </p>
              </div>
              <Link
                href="/platform/plans?kind=service"
                className="text-xs font-semibold text-[#a99af3] hover:text-white"
              >
                Browse all plans
              </Link>
            </div>

            {otherPlans.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-[#202846] bg-[#0c1225] p-8 text-center text-sm text-[#74809e]">
                {servicePlans.length === 0
                  ? "No service plans are available right now."
                  : "You are already on the only available service plan."}
              </div>
            ) : (
              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {otherPlans.map((plan) => (
                  <article
                    key={plan.plan_uuid}
                    className="flex flex-col rounded-2xl border border-[#293354] bg-[#0c1225] p-5 transition-colors hover:border-[#6558e9]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white">
                        <CreditCard size={17} className="text-[#a99af3]" />
                        {plan.name}
                      </div>
                      <span className="rounded-full border border-[#39446d] px-2 py-1 text-[10px] uppercase tracking-wider text-[#aeb9d2]">
                        {plan.billing_interval.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-3 min-h-10 text-sm text-[#8995b3]">
                      {plan.description ||
                        "Access EBMA services with included credits."}
                    </p>
                    <p className="mt-5 text-2xl font-bold text-white">
                      {planMoney(plan)}
                    </p>
                    <p className="mt-1 text-xs text-[#74809e]">
                      {Number(plan.monthly_credits).toLocaleString()} credits included
                    </p>
                    <div className="mt-5 space-y-2 text-sm text-[#b6c0d6]">
                      {featureList(plan)
                        .slice(0, 4)
                        .map((item) => (
                          <p key={item} className="flex items-center gap-2">
                            <Check size={14} className="text-emerald-300" />
                            {item}
                          </p>
                        ))}
                    </div>
                    <button
                      type="button"
                      disabled={checkoutPlan === plan.plan_uuid}
                      onClick={() => void startCheckout(plan.plan_uuid)}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#5d50e8] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#6a5cf4] disabled:opacity-60"
                    >
                      <CreditCard size={14} />
                      {checkoutPlan === plan.plan_uuid
                        ? "Opening checkout…"
                        : current
                          ? "Switch to this plan"
                          : "Choose this plan"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8 overflow-x-auto rounded-2xl border border-[#202846] bg-[#0c1225]">
            <div className="border-b border-[#202846] px-5 py-4 text-sm font-bold text-white">
              Recent transactions
            </div>
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-[#202846] text-[10px] uppercase tracking-wider text-[#74809e]">
                <tr>
                  <th className="px-5 py-4">Plan / purpose</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Payment</th>
                  <th className="px-5 py-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 8).map((row) => (
                  <tr
                    key={row.transaction.transaction_uuid}
                    className="border-b border-[#202846] last:border-0"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">
                        {row.plan?.name || "Plan removed"}
                      </p>
                      <p className="text-xs text-[#74809e]">
                        {row.plan?.plan_kind === "wallet_topup"
                          ? "Wallet top-up"
                          : "Service plan"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          row.transaction.status === "succeeded"
                            ? "text-emerald-300"
                            : row.transaction.status === "pending"
                              ? "text-amber-300"
                              : "text-rose-300"
                        }
                      >
                        {row.transaction.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white">
                      {money(
                        row.transaction.amount_minor,
                        row.transaction.currency,
                      )}
                    </td>
                    <td className="px-5 py-4 text-[#b6c0d6]">
                      {row.transaction.payment_method}
                    </td>
                    <td className="px-5 py-4 text-xs text-[#8995b3]">
                      {new Date(row.transaction.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <p className="p-10 text-center text-sm text-[#74809e]">
                No transactions yet.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
