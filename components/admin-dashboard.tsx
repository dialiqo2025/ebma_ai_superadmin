"use client";

import Link from "next/link";
import {
  Activity,
  AudioLines,
  BarChart3,
  CreditCard,
  Mic2,
  Settings2,
  ShieldCheck,
  Users,
  Volume2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

const modules = [
  { title: "Users", description: "Manage registered accounts, access, and status.", href: "/platform/admin/users", icon: Users },
  { title: "Usage settings", description: "Set new user credits and service rates.", href: "/platform/admin/usage-settings", icon: Settings2 },
  { title: "Plans & pricing", description: "Manage credit packages and checkout plans.", href: "/platform/admin/plans", icon: CreditCard },
  { title: "Subscriptions", description: "Review active plans and plan history.", href: "/platform/admin/subscriptions", icon: Activity },
  { title: "Transactions", description: "Review payments, credits, and refunds.", href: "/platform/admin/transactions", icon: ShieldCheck },
];

type Period = "today" | "7d" | "30d" | "month" | "custom";
type UsageOverview = {
  totals: { events: number; activeUsers: number; credits: number };
  services: { type: string; events: number; quantity: number; credits: number }[];
  daily: { bucket: string; events: number; credits: number; ttsCredits: number; sttCredits: number; llmCredits: number }[];
  topUsers: { user_uuid: string; fullName: string; email: string; events: number; credits: number; ttsEvents: number; sttEvents: number; llmEvents: number }[];
};

const serviceInfo: Record<string, { title: string; unit: string; icon: typeof Mic2 }> = {
  stt_seconds: { title: "Speech to text", unit: "minutes transcribed", icon: Mic2 },
  tts_characters: { title: "Text to speech", unit: "characters generated", icon: Volume2 },
  llm_tokens: { title: "Voice assistant & LLM", unit: "tokens processed", icon: AudioLines },
};

function dateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function rangeFor(period: Period, customFrom: string, customTo: string) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === "today") return { from: start, to: end };
  if (period === "7d") start.setDate(start.getDate() - 6);
  else if (period === "30d") start.setDate(start.getDate() - 29);
  else if (period === "month") start.setDate(1);
  else if (period === "custom") {
    const from = new Date(`${customFrom}T00:00:00`);
    const to = new Date(`${customTo}T23:59:59.999`);
    return { from, to };
  }
  return { from: start, to: end };
}

const number = (value: number) => new Intl.NumberFormat().format(value);
const credits = (value: number) => `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)} cr`;

function UsageTrend({ data, metric }: { data: UsageOverview["daily"]; metric: "credits" | "events" }) {
  const [hovered, setHovered] = useState<{ x: number; y: number; item: UsageOverview["daily"][number] } | null>(null);
  const width = 760;
  const height = 220;
  const padX = 22;
  const padY = 22;
  const values = data.map((item) => item[metric]);
  const max = Math.max(...values, 1);
  const points = data.map((item, index) => {
    const x = data.length < 2 ? width / 2 : padX + (index / (data.length - 1)) * (width - padX * 2);
    const y = height - padY - (item[metric] / max) * (height - padY * 2);
    return { x, y, item };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = points.length ? `${path} L ${points.at(-1)!.x} ${height - padY} L ${points[0].x} ${height - padY} Z` : "";

  return (
    <div className="relative mt-4 rounded-xl border border-brand-border bg-surface px-2 pt-3" onMouseLeave={() => setHovered(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label={`Daily ${metric} usage trend`}>
        <defs>
          <linearGradient id="adminUsageFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--theme-accent-strong)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--theme-accent-strong)" stopOpacity="0.015" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((fraction) => {
          const y = height - padY - fraction * (height - padY * 2);
          return <line key={fraction} x1={padX} x2={width - padX} y1={y} y2={y} stroke="currentColor" className="text-brand-border" strokeDasharray="4 5" />;
        })}
        {area && <path d={area} fill="url(#adminUsageFill)" />}
        {path && <path d={path} fill="none" stroke="var(--theme-accent-strong)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map(({ x, y, item }) => (
          <g key={item.bucket}>
            <circle
              cx={x}
              cy={y}
              r={hovered?.item.bucket === item.bucket ? "7" : "5"}
              fill="var(--theme-accent-strong)"
              stroke="var(--theme-surface)"
              strokeWidth="2"
              tabIndex={0}
              role="button"
              aria-label={`${new Date(item.bucket).toLocaleDateString()}: ${number(item.events)} requests, ${credits(item.credits)} used`}
              onMouseEnter={() => setHovered({ x, y, item })}
              onFocus={() => setHovered({ x, y, item })}
              onBlur={() => setHovered(null)}
              onClick={() => setHovered((current) => current?.item.bucket === item.bucket ? null : { x, y, item })}
              className="cursor-pointer outline-none focus-visible:stroke-[var(--theme-text)]"
            >
              <title>{new Date(item.bucket).toLocaleDateString()} · {metric === "credits" ? credits(item.credits) : `${number(item.events)} requests`}</title>
            </circle>
          </g>
        ))}
        {points.length > 0 && [points[0], points[Math.floor((points.length - 1) / 2)], points.at(-1)!].map(({ x, item }, index) => (
          <text key={`${item.bucket}-${index}`} x={x} y={height - 3} textAnchor={index === 0 ? "start" : index === 2 ? "end" : "middle"} fill="currentColor" className="fill-muted text-[11px]">
            {new Date(item.bucket).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </text>
        ))}
        {!data.length && <text x={width / 2} y={height / 2} textAnchor="middle" fill="currentColor" className="fill-muted text-sm">No billable activity in this period</text>}
      </svg>
      {hovered && (
        <div
          role="tooltip"
          className={`pointer-events-none absolute z-20 w-52 -translate-x-1/2 rounded-lg border border-brand-border bg-surface-raised p-3 shadow-xl ${hovered.y < 82 ? "" : "-translate-y-full"}`}
          style={{ left: `${Math.min(82, Math.max(18, (hovered.x / width) * 100))}%`, top: `${(hovered.y / height) * 100}%` }}
        >
          <p className="text-xs font-semibold text-text">{new Date(hovered.item.bucket).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs"><span className="text-muted">{metric === "credits" ? "Credits used" : "Requests"}</span><span className="font-semibold text-text">{metric === "credits" ? credits(hovered.item.credits) : number(hovered.item.events)}</span></div>
          <div className="mt-1 flex items-center justify-between gap-3 text-xs"><span className="text-muted">Billable requests</span><span className="font-semibold text-text">{number(hovered.item.events)}</span></div>
          <div className="mt-2 grid grid-cols-3 gap-2 border-t border-brand-border pt-2 text-[10px]">
            <div><span className="block text-muted">STT</span><span className="font-medium text-text">{credits(hovered.item.sttCredits)}</span></div>
            <div><span className="block text-muted">TTS</span><span className="font-medium text-text">{credits(hovered.item.ttsCredits)}</span></div>
            <div><span className="block text-muted">Assistant</span><span className="font-medium text-text">{credits(hovered.item.llmCredits)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<{ total_users: number; total_active_users: number } | null>(null);
  const [overview, setOverview] = useState<UsageOverview | null>(null);
  const [period, setPeriod] = useState<Period>("30d");
  const [metric, setMetric] = useState<"credits" | "events">("credits");
  const [customFrom, setCustomFrom] = useState(() => dateInputValue(new Date(Date.now() - 6 * 86_400_000)));
  const [customTo, setCustomTo] = useState(() => dateInputValue(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { if (user && user.role !== "superAdmin") router.replace("/platform"); }, [user, router]);
  useEffect(() => { if (user?.role === "superAdmin") void apiRequest<typeof stats>("/user/summary", { auth: true }).then(setStats).catch(() => undefined); }, [user]);

  const range = useMemo(() => rangeFor(period, customFrom, customTo), [period, customFrom, customTo]);
  const loadUsage = useCallback(async () => {
    if (!user || user.role !== "superAdmin" || Number.isNaN(range.from.valueOf()) || Number.isNaN(range.to.valueOf()) || range.from > range.to) return;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ from: range.from.toISOString(), to: range.to.toISOString() });
      setOverview(await apiRequest<UsageOverview>(`/billing/admin/usage-overview?${query}`, { auth: true }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load platform usage");
    } finally {
      setLoading(false);
    }
  }, [user, range]);

  useEffect(() => { void loadUsage(); }, [loadUsage]);

  if (!user || user.role !== "superAdmin") return null;

  const avgCreditsPerRequest = overview?.totals.events ? overview.totals.credits / overview.totals.events : 0;
  const serviceOrder = ["stt_seconds", "tts_characters", "llm_tokens"];
  const serviceRows = serviceOrder.map((type) => overview?.services.find((row) => row.type === type) ?? { type, events: 0, quantity: 0, credits: 0 });
  const maxServiceCredits = Math.max(...serviceRows.map((row) => row.credits), 1);

  return (
    <main className="mx-auto w-full max-w-none text-text">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[.24em] text-accent">CONTROL PANEL</p>
          <h1 className="mt-3 text-3xl font-extrabold text-text">Superadmin <span className="bg-brand-gradient bg-clip-text text-transparent">overview</span></h1>
          <p className="mt-2 text-sm text-muted">Platform adoption, billable usage, and account activity.</p>
          <p className="mt-1 text-xs text-accent">Signed in as {user.email}</p>
        </div>
        <Link href="/platform/admin/users" className="rounded-lg border border-brand-border px-4 py-2.5 text-xs font-semibold text-text hover:bg-surface-raised">Manage users <span aria-hidden="true">→</span></Link>
      </div>

      <section aria-label="Platform usage statistics" className="rounded-2xl border border-brand-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><BarChart3 size={17} className="text-accent" /><h2 className="text-lg font-bold">Platform usage</h2></div>
            <p className="mt-1 text-xs text-muted">Aggregate billable activity across all users · {range.from.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} – {range.to.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="usage-period">Usage period</label>
            <select id="usage-period" value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="h-10 rounded-lg border border-brand-border bg-surface px-3 text-xs text-text outline-none focus:border-accent">
              <option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="month">This month</option><option value="custom">Custom range</option>
            </select>
            {period === "custom" && <div className="flex items-center gap-2"><input aria-label="From date" type="date" value={customFrom} max={customTo} onChange={(event) => setCustomFrom(event.target.value)} className="h-10 rounded-lg border border-brand-border bg-surface px-2 text-xs text-text" /><span className="text-xs text-muted">to</span><input aria-label="To date" type="date" value={customTo} min={customFrom} max={dateInputValue(new Date())} onChange={(event) => setCustomTo(event.target.value)} className="h-10 rounded-lg border border-brand-border bg-surface px-2 text-xs text-text" /></div>}
            <button type="button" onClick={() => void loadUsage()} disabled={loading} className="h-10 rounded-lg border border-brand-border px-3 text-xs font-medium text-muted hover:text-text disabled:opacity-60">{loading ? "Loading…" : "Refresh"}</button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Registered accounts", value: number(stats?.total_users ?? 0), note: `${number(stats?.total_active_users ?? 0)} currently enabled`, icon: Users },
            { label: "Active users", value: number(overview?.totals.activeUsers ?? 0), note: "Used a billable service in range", icon: Activity },
            { label: "Billable requests", value: number(overview?.totals.events ?? 0), note: "Successful metered events", icon: BarChart3 },
            { label: "Credits consumed", value: credits(overview?.totals.credits ?? 0), note: `${avgCreditsPerRequest.toFixed(2)} credits per request`, icon: CreditCard },
          ].map(({ label, value, note, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-brand-border bg-surface-raised p-4">
              <div className="flex items-center justify-between"><p className="text-xs font-medium text-muted">{label}</p><Icon size={16} className="text-accent" /></div>
              <p className={`mt-3 text-2xl font-bold tracking-tight ${label === "Credits consumed" ? "bg-brand-gradient bg-clip-text text-transparent" : "text-text"}`}>{loading ? "…" : value}</p>
              <p className="mt-1 text-[11px] text-muted">{note}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="text-sm font-semibold">Usage trend</h3><p className="mt-1 text-xs text-muted">Daily platform consumption</p></div>
              <label className="flex items-center gap-2 text-xs text-muted">Show<select value={metric} onChange={(event) => setMetric(event.target.value as "credits" | "events")} className="h-9 rounded-lg border border-brand-border bg-surface px-2 text-xs text-text"><option value="credits">Credits</option><option value="events">Requests</option></select></label>
            </div>
            <UsageTrend data={overview?.daily ?? []} metric={metric} />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Service breakdown</h3>
            <p className="mt-1 text-xs text-muted">Usage and credit contribution per product</p>
            <div className="mt-3 space-y-3">
              {serviceRows.map((row) => {
                const item = serviceInfo[row.type] ?? { title: row.type, unit: "units", icon: Activity };
                const Icon = item.icon;
                const quantity = row.type === "stt_seconds" ? (row.quantity / 60).toFixed(1) : number(row.quantity);
                return <div key={row.type} className="rounded-xl border border-brand-border bg-surface-raised p-3.5">
                  <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Icon size={15} className="text-accent" /><span className="text-xs font-semibold">{item.title}</span></div><span className="text-xs font-semibold">{credits(row.credits)}</span></div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-brand-border"><div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.max(row.credits > 0 ? 3 : 0, (row.credits / maxServiceCredits) * 100)}%` }} /></div>
                  <p className="mt-2 text-[11px] text-muted">{number(row.events)} requests <span className="px-1.5">·</span>{quantity} {item.unit}</p>
                </div>;
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-brand-border">
          <div className="flex items-center justify-between border-b border-brand-border px-4 py-3">
            <div><h3 className="text-sm font-semibold">Top users by credit usage</h3><p className="mt-1 text-[11px] text-muted">Accounts with the highest metered consumption in this period</p></div>
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-medium text-accent">Top 10</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-surface-raised text-[10px] uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Requests</th><th className="px-4 py-3">STT</th><th className="px-4 py-3">TTS</th><th className="px-4 py-3">Assistant / LLM</th><th className="px-4 py-3 text-right">Credits used</th></tr></thead>
              <tbody className="divide-y divide-brand-border">
                {(overview?.topUsers ?? []).map((row) => <tr key={row.user_uuid} className="hover:bg-surface-raised"><td className="px-4 py-3"><p className="font-semibold text-text">{row.fullName}</p><p className="mt-0.5 text-[11px] text-muted">{row.email}</p></td><td className="px-4 py-3">{number(row.events)}</td><td className="px-4 py-3">{number(row.sttEvents)}</td><td className="px-4 py-3">{number(row.ttsEvents)}</td><td className="px-4 py-3">{number(row.llmEvents)}</td><td className="px-4 py-3 text-right font-semibold">{credits(row.credits)}</td></tr>)}
                {!loading && !overview?.topUsers.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No billable usage for this period.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {error && <p role="alert" className="mt-3 text-xs text-danger">{error}</p>}
      </section>

      <section className="mt-7">
        <div className="mb-3"><h2 className="text-lg font-bold">Admin tools</h2><p className="mt-1 text-xs text-muted">Manage platform accounts and billing configuration.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{modules.map(({ title, description, href, icon: Icon }) => <Link key={title} href={href} className="group rounded-2xl border border-brand-border bg-surface p-4 transition hover:border-brand-border hover:bg-surface-raised"><Icon size={19} className="text-accent" /><h2 className="mt-3 text-sm font-bold text-text">{title}</h2><p className="mt-1.5 text-xs leading-5 text-muted">{description}</p><span className="mt-3 inline-block text-[11px] font-semibold text-accent group-hover:text-text">Open module →</span></Link>)}</div>
      </section>
    </main>
  );
}
