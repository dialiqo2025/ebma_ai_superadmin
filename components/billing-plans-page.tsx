"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, Loader2, Sparkles, Wallet } from "lucide-react";
import { billingApi, type BillingPlan } from "@/lib/billing/api";

const money = (plan: BillingPlan) => `${(Number(plan.price_minor) / 100).toFixed(2)} ${plan.currency}`;

export function BillingPlansPage() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [topupAmount, setTopupAmount] = useState("50");
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<"service" | "wallet_topup" | "all">("all");
  useEffect(() => { void billingApi.plans().then(setPlans).finally(() => setLoading(false)); }, []);
  useEffect(() => { const kind = new URLSearchParams(window.location.search).get("kind"); if (kind === "service" || kind === "wallet_topup") setKindFilter(kind); }, []);
  useEffect(() => { const params = new URLSearchParams(window.location.search); const sessionId = params.get("session_id"); if (params.get("checkout") !== "success" || !sessionId) return; void billingApi.confirmCheckout(sessionId).then(result => { if (result.credited) window.alert("Payment confirmed. Your credits have been added."); }).catch(() => window.alert("Payment completed, but wallet confirmation is still processing. Please refresh in a moment.")); }, []);
  const visiblePlans = kindFilter === "all" ? plans.filter(plan => plan.plan_kind === "service") : plans.filter(plan => plan.plan_kind === kindFilter);

  if (kindFilter === "wallet_topup") {
    const amount = Number(topupAmount);
    const credits = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
    return <main className="mx-auto max-w-4xl text-text"><p className="font-mono text-[11px] tracking-[.24em] text-accent">BILLING</p><h1 className="mt-3 text-4xl font-extrabold text-text">Recharge wallet</h1><p className="mt-3 text-sm text-muted">Add credits without changing your current service access.</p>
      <div className="mt-7 rounded-2xl border border-brand-border bg-brand-soft p-5 text-sm text-muted"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 shrink-0 text-accent" size={18} /><p><span className="font-semibold text-text">Simple, transparent billing.</span> Enter the amount you want to pay and receive the same number of credits. Your wallet is updated after Stripe confirms payment.</p></div></div>
      <section className="mt-8 rounded-2xl border border-brand-border bg-brand-soft p-6 shadow-[0_0_40px_rgba(93,80,232,.12)]"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-text">Choose recharge amount</h2><p className="mt-1 text-sm text-muted">1 INR = 1 credit</p></div><Wallet className="text-cyan" size={24} /></div>
        <label className="mt-6 block text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="topup-amount">Amount (INR)</label><div className="mt-2 flex items-center rounded-lg border border-brand-border bg-brand-soft focus-within:border-brand-border"><span className="pl-4 text-muted">₹</span><input id="topup-amount" type="number" min="50" step="1" value={topupAmount} onChange={event => { setTopupAmount(event.target.value); setTopupError(null); }} className="w-full bg-transparent px-3 py-3 text-lg font-semibold text-text outline-none" /></div>
        <div className="mt-4 rounded-lg border border-brand-border bg-brand-soft p-4"><p className="text-sm text-muted">You will receive</p><p className="mt-1 text-3xl font-bold text-text">{credits.toLocaleString()} <span className="text-base font-medium text-accent">credits</span></p><p className="mt-1 text-xs text-accent">Credits are added to your existing wallet after successful payment.</p></div>
        {topupError && <p className="mt-4 rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger">{topupError}</p>}
        <button type="button" disabled={topupBusy || !Number.isInteger(amount) || amount < 50} onClick={async () => { setTopupBusy(true); setTopupError(null); try { const session = await billingApi.walletTopupCheckout(amount); if (session.url) window.location.assign(session.url); } catch (error) { setTopupError(error instanceof Error ? error.message : "Unable to start wallet recharge"); } finally { setTopupBusy(false); } }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-soft px-4 py-3 text-sm font-semibold text-text hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50"><CreditCard size={16} />{topupBusy ? "Opening secure checkout…" : "Continue to secure payment"}</button><p className="mt-3 text-center text-xs text-accent">Minimum recharge: ₹50 · Enter whole credits · Payments are processed securely by Stripe.</p>
      </section></main>;
  }

  return <main className="mx-auto max-w-6xl text-text"><p className="font-mono text-[11px] tracking-[.24em] text-accent">BILLING</p><h1 className="mt-3 text-4xl font-extrabold text-text">{kindFilter === "service" ? "Choose a service plan" : "Plans & credits"}</h1><p className="mt-3 text-sm text-muted">{kindFilter === "service" ? "Choose a plan to restore service access and receive included credits." : "Choose a service plan or add credits to your existing wallet."}</p>
    <div className="mt-7 rounded-2xl border border-brand-border bg-brand-soft p-5 text-sm text-muted">
      <div className="flex items-start gap-3"><Sparkles className="mt-0.5 shrink-0 text-accent" size={18} /><p><span className="font-semibold text-text">How billing works.</span> Service plans include product access and credits. Wallet top-ups add credits without changing your current service entitlements.</p></div>
    </div>
    {loading ? <div className="mt-10 flex justify-center text-accent"><Loader2 className="animate-spin" /></div> : visiblePlans.length === 0 ? <div className="mt-10 rounded-2xl border border-brand-border bg-brand-soft p-10 text-center text-sm text-accent">No plans are available for this option right now.</div> : <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visiblePlans.map(plan => <article key={plan.plan_uuid} className="flex flex-col rounded-2xl border border-brand-border bg-brand-soft p-5 transition-colors hover:border-brand-border">
      <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2 text-xs font-semibold text-text">{plan.plan_kind === "wallet_topup" ? <Wallet size={17} className="text-cyan" /> : <CreditCard size={17} className="text-accent" />}{plan.name}</div><span className="rounded-full border border-brand-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted">{plan.plan_kind === "wallet_topup" ? "Wallet top-up" : "Service plan"}</span></div>
      <p className="mt-3 min-h-10 text-sm text-muted">{plan.description || (plan.plan_kind === "wallet_topup" ? "Add credits to your existing wallet." : "Access EBMA services with included credits.")}</p>
      <p className="mt-5 text-2xl font-bold text-text">{money(plan)}</p><p className="mt-1 text-xs text-accent">{Number(plan.monthly_credits).toLocaleString()} credits · {plan.billing_interval.replace("_", " ")}</p>
      <div className="mt-5 space-y-2 text-sm text-muted">{(plan.benefits?.length ? plan.benefits : Object.entries(plan.features || {}).filter(([, enabled]) => enabled).map(([key]) => key.toUpperCase())).map(item => <p key={item} className="flex items-center gap-2"><Check size={14} className="text-success" />{item}</p>)}</div>
      <button type="button" disabled={checkoutPlan === plan.plan_uuid} onClick={async () => { setCheckoutPlan(plan.plan_uuid); try { const session = await billingApi.checkout(plan.plan_uuid); if (session.url) window.location.assign(session.url); } catch (error) { window.alert(error instanceof Error ? error.message : "Unable to start checkout"); } finally { setCheckoutPlan(null); } }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-soft px-4 py-2.5 text-xs font-semibold text-text hover:bg-brand-soft disabled:opacity-60"><CreditCard size={14} />{checkoutPlan === plan.plan_uuid ? "Opening checkout…" : "Purchase securely"}</button>
      <p className="mt-2 text-center text-[10px] text-accent">Payments are processed securely by Stripe.</p>
    </article>)}</div>}
  </main>;
}
