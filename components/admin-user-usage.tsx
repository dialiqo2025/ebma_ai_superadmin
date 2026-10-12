"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, Coins, Filter, RefreshCw, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Period = "today" | "7d" | "30d" | "month";
type UserUsageItem = {
  user_uuid: string;
  fullName: string;
  email: string;
  events: number;
  credits: number;
  ttsEvents: number;
  sttEvents: number;
  llmEvents: number;
  sttQuantity: number;
  ttsQuantity: number;
  llmQuantity: number;
};
type UserUsageResponse = {
  items: UserUsageItem[];
  creditRangeMax: number;
  summary?: { totalAccounts: number; totalRequests: number; totalCredits: number };
  pagination: { page: number; pageSize: number; total: number; totalPages: number; hasNextPage: boolean };
};

function getDateRange(period: Period) {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  if (period === "7d") from.setDate(from.getDate() - 6);
  if (period === "30d") from.setDate(from.getDate() - 29);
  if (period === "month") from.setDate(1);
  return { from, to };
}

const number = (value: number) => new Intl.NumberFormat().format(value);
const credits = (value: number) => `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)} cr`;

export function AdminUserUsage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("30d");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [minCreditsInput, setMinCreditsInput] = useState("");
  const [maxCreditsInput, setMaxCreditsInput] = useState("");
  const [minCredits, setMinCredits] = useState("");
  const [maxCredits, setMaxCredits] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<UserUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const range = useMemo(() => getDateRange(period), [period]);
  // Keep the slider's scale tied to the dataset so applying a range never
  // changes the track endpoints or zoom level.
  const creditLimit = Math.max(100, result?.creditRangeMax ?? 0);
  const sliderMin = Math.min(creditLimit, Math.max(0, Number(minCreditsInput) || 0));
  const sliderMax = Math.max(sliderMin, Math.min(creditLimit, maxCreditsInput === "" ? creditLimit : Number(maxCreditsInput)));

  const applyCreditInputs = (minValue: string, maxValue: string) => {
    const min = minValue.trim() === "" ? undefined : Number(minValue);
    const max = maxValue.trim() === "" ? undefined : Number(maxValue);
    if ((min !== undefined && (!Number.isFinite(min) || min < 0)) || (max !== undefined && (!Number.isFinite(max) || max < 0)) || (min !== undefined && max !== undefined && min > max)) {
      setError("Enter a valid credit range. Minimum must be less than or equal to maximum.");
      return;
    }
    setError("");
    setPage(1);
    setMinCredits(min === undefined ? "" : String(min));
    setMaxCredits(max === undefined ? "" : String(max));
  };

  useEffect(() => {
    if (ready && user && user.role !== "superAdmin") router.replace("/platform");
  }, [ready, user, router]);

  const load = useCallback(async () => {
    if (!user || user.role !== "superAdmin") return;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        page: String(page),
        pageSize: "25",
        search: appliedSearch,
        sort,
      });
      if (minCredits) query.set("minCredits", minCredits);
      if (maxCredits) query.set("maxCredits", maxCredits);
      setResult(await apiRequest<UserUsageResponse>(`/billing/admin/user-usage?${query}`, { auth: true }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load user usage");
    } finally {
      setLoading(false);
    }
  }, [user, range, page, appliedSearch, minCredits, maxCredits, sort]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  if (!ready || !user || user.role !== "superAdmin") return null;

  const pagination = result?.pagination;
  const usageStats = result
    ? {
        accounts: result.summary?.totalAccounts ?? pagination?.total,
        requests: result.summary?.totalRequests ?? result.items.reduce((sum, item) => sum + item.events, 0),
        credits: result.summary?.totalCredits ?? result.items.reduce((sum, item) => sum + item.credits, 0),
        hasServerSummary: Boolean(result.summary),
      }
    : undefined;
  return (
    <main className="mx-auto w-full max-w-[1210px] text-text">
      <Link href="/platform/admin" className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-accent">
        <ArrowLeft size={14} /> Admin Console
      </Link>
      <div className="mb-5 mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[.24em] text-accent">USAGE ANALYTICS</p>
          <h1 className="mt-2 text-3xl font-extrabold">User Usage</h1>
          <p className="mt-2 text-sm text-muted">Usage by account across Speech To Text, Text To Speech, and Voice Assistant.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Usage period" value={period} onChange={(event) => { setPeriod(event.target.value as Period); setPage(1); }} className="h-10 rounded-lg border border-brand-border bg-surface px-3 text-xs text-text">
            <option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="month">This month</option>
          </select>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand-border bg-surface px-3 text-xs font-medium text-muted hover:text-text disabled:opacity-60">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="platform-table-container mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Accounts", value: usageStats?.accounts, icon: Users, color: "text-accent" },
          { label: usageStats?.hasServerSummary ? "Total requests" : "Requests on this page", value: usageStats?.requests, icon: Activity, color: "text-success" },
          { label: usageStats?.hasServerSummary ? "Credits used" : "Credits on this page", value: usageStats?.credits, icon: Coins, color: "text-accent" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-brand-border bg-surface p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-raised">
              <Icon size={18} className={color} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-1 truncate text-xl font-bold leading-none text-text">
                {value === undefined ? "—" : label === "Credits used" ? credits(value) : number(value)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <section className="platform-table-container overflow-hidden rounded-2xl border border-brand-border bg-surface shadow-sm">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-brand-border px-4 py-4 sm:px-5">
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <label className="relative min-w-0 flex-1 sm:max-w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="h-9 w-full rounded-lg border border-brand-border bg-surface pl-9 pr-3 text-xs text-text outline-none focus:border-accent" />
            </label>
            <div className="ml-auto flex items-center gap-2">
            <label className="sr-only" htmlFor="usage-sort">Sort by credit usage</label>
            <select id="usage-sort" value={sort} onChange={(event) => { setSort(event.target.value as "desc" | "asc"); setPage(1); }} className="h-9 rounded-lg border border-brand-border bg-surface px-2.5 text-xs text-text">
              <option value="desc">Most credits</option><option value="asc">Least credits</option>
            </select>
            <div className="relative">
              <button type="button" aria-label="Credit usage filters" aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)} className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${filterOpen || minCredits || maxCredits ? "border-accent bg-brand-soft text-accent" : "border-brand-border bg-surface text-muted hover:text-text"}`}>
                <Filter size={15} />
                {(minCredits || maxCredits) && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />}
              </button>
              {filterOpen && <div className="absolute right-0 top-11 z-30 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-brand-border bg-surface p-4 shadow-xl">
                <div className="mb-3 flex items-start justify-between">
                  <div><h3 className="text-xs font-semibold text-text">Credit usage</h3><p className="mt-0.5 text-[10px] text-muted">Set a minimum, maximum, or both.</p></div>
                  <button type="button" onClick={() => { setMinCreditsInput(""); setMaxCreditsInput(""); applyCreditInputs("", ""); }} className="text-[10px] font-medium text-accent hover:underline">Clear</button>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <label className="text-[10px] text-muted">Min credits<input id="min-credits" type="number" min="0" step="any" value={minCreditsInput} onChange={(event) => { setMinCreditsInput(event.target.value); applyCreditInputs(event.target.value, maxCreditsInput); }} placeholder="No minimum" className="mt-1 h-8 w-full rounded-lg border border-brand-border bg-surface-raised px-2 text-xs text-text outline-none focus:border-accent" /></label>
                  <span className="mt-4 text-[10px] text-muted">to</span>
                  <label className="text-[10px] text-muted">Max credits<input id="max-credits" type="number" min="0" step="any" value={maxCreditsInput} onChange={(event) => { setMaxCreditsInput(event.target.value); applyCreditInputs(minCreditsInput, event.target.value); }} placeholder="No maximum" className="mt-1 h-8 w-full rounded-lg border border-brand-border bg-surface-raised px-2 text-xs text-text outline-none focus:border-accent" /></label>
                </div>
                <div className="relative mx-2 mt-3 h-6">
                  <div aria-hidden="true" className="pointer-events-none absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand-border" />
                  <div aria-hidden="true" className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand-gradient-short" style={{ left: `${(sliderMin / creditLimit) * 100}%`, width: `${((sliderMax - sliderMin) / creditLimit) * 100}%` }} />
                  <label className="sr-only" htmlFor="min-credits-slider">Adjust minimum credits</label>
                  <input id="min-credits-slider" type="range" min="0" max={creditLimit} step={creditLimit <= 100 ? 0.1 : Math.max(1, Math.ceil(creditLimit / 100))} value={sliderMin} onChange={(event) => { const value = String(Math.min(Number(event.target.value), sliderMax)); setMinCreditsInput(value); applyCreditInputs(value, maxCreditsInput); }} className="credit-range absolute inset-0 h-6 w-full" />
                  <label className="sr-only" htmlFor="max-credits-slider">Adjust maximum credits</label>
                  <input id="max-credits-slider" type="range" min="0" max={creditLimit} step={creditLimit <= 100 ? 0.1 : Math.max(1, Math.ceil(creditLimit / 100))} value={sliderMax} onChange={(event) => { const value = String(Math.max(Number(event.target.value), sliderMin)); setMaxCreditsInput(value); applyCreditInputs(minCreditsInput, value); }} className="credit-range absolute inset-0 h-6 w-full" />
                </div>
                <div className="flex justify-between text-[10px] text-muted"><span>0 cr</span><span>{number(creditLimit)} cr</span></div>
              </div>}
            </div>
            </div>
          </div>
        </div>
        <style jsx>{`
          .credit-range { -webkit-appearance: none; appearance: none; background: transparent; pointer-events: none; }
          .credit-range::-webkit-slider-runnable-track { -webkit-appearance: none; height: 4px; border: 0; background: transparent; }
          .credit-range::-moz-range-track { height: 4px; border: 0; background: transparent; }
          .credit-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; margin-top: -6px; border: 2px solid var(--theme-surface); border-radius: 999px; background: var(--theme-accent-strong); box-shadow: 0 0 0 1px var(--theme-accent-strong); pointer-events: auto; cursor: grab; }
          .credit-range::-moz-range-thumb { width: 12px; height: 12px; border: 2px solid var(--theme-surface); border-radius: 999px; background: var(--theme-accent-strong); box-shadow: 0 0 0 1px var(--theme-accent-strong); pointer-events: auto; cursor: grab; }
        `}</style>

        <div className="overflow-x-auto">
          <table className="platform-data-table w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-brand-border bg-surface-raised text-[10px] uppercase tracking-wide text-muted">
              <tr><th>User</th><th>Requests</th><th>STT requests</th><th>TTS requests</th><th>Assistant requests</th><th>Credits used</th><th>STT audio</th><th>TTS characters</th><th>Assistant tokens</th></tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {(result?.items ?? []).map((item) => (
                <tr key={item.user_uuid} className="transition-colors odd:bg-surface even:bg-surface-raised/35 hover:bg-brand-soft/70">
                  <td><p className="font-semibold text-text">{item.fullName}</p><p className="mt-0.5 text-[11px] text-muted">{item.email}</p></td>
                  <td>{number(item.events)}</td><td>{number(item.sttEvents)}</td><td>{number(item.ttsEvents)}</td><td>{number(item.llmEvents)}</td>
                  <td className="font-semibold"><span className="bg-brand-gradient bg-clip-text text-transparent">{credits(item.credits)}</span></td>
                  <td>{(item.sttQuantity / 60).toFixed(1)} min</td><td>{number(item.ttsQuantity)}</td><td>{number(item.llmQuantity)}</td>
                </tr>
              ))}
              {!loading && !result?.items.length && <tr><td colSpan={9} className="py-10 text-center text-muted">No users found for this search.</td></tr>}
              {loading && <tr><td colSpan={9} className="py-10 text-center text-muted">Loading user usage…</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-brand-border px-4 py-3 text-xs text-muted">
          <span>Page {pagination?.page ?? page} of {Math.max(1, pagination?.totalPages ?? 1)}</span>
          <div className="flex gap-2">
            <button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-brand-border px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button type="button" disabled={loading || !pagination?.hasNextPage} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-brand-border px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      </section>
      {error && <p role="alert" className="mt-3 text-xs text-danger">{error}</p>}
    </main>
  );
}
