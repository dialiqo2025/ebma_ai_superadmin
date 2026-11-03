"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowLeft, CalendarRange, CheckCircle2, Clock3, Coins, FileAudio, Hourglass, LoaderCircle, Mic2, Radio, RefreshCw, Search, TriangleAlert, Upload, Volume2, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { UserFilterDropdown } from "@/components/admin-observability";

type Operation = {
  operationUuid: string;
  service: "stt" | "tts";
  operationType: string;
  status: "success" | "failed" | "queued" | "processing" | "stalled";
  rawStatus: string;
  title: string;
  userEmail: string | null;
  userName: string | null;
  fileSizeBytes: number | null;
  inputUnits: number | null;
  outputUnits: number | null;
  audioSeconds: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  chargedCredits: number;
  usageEvents: number;
};
type Response = { items: Operation[]; pagination: { page: number; pageSize: number; total: number; totalPages: number; hasNextPage: boolean } };
type Statistics = {
  totalRequests: number; successRequests: number; failedRequests: number; queuedRequests: number; processingRequests: number; activeProcessingRequests?: number; stalledRequests: number; stalledAfterMinutes: number; successRate: number;
  sttRequests: number; sttLiveSessions: number; sttFileTranscriptions: number; sttAudioSeconds: number;
  ttsRequests: number; ttsDefaultVoice: number; ttsVoiceCloning: number; ttsInputCharacters: number; ttsOutputBytes: number;
  totalCredits: number;
  statusBreakdown: Array<{ key: string; service: "stt" | "tts"; label: string; total: number; success: number; failed: number; queued: number; processing: number; stalled: number; credits: number; input: { value: number; unit: "seconds" | "characters" }; output: { value: number; unit: "characters" | "bytes" }; supporting: { value: number; unit: "bytes"; label: string } | null }>;
};

const bytes = (value: number | null) => {
  if (value == null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = value;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) { amount /= 1024; index += 1; }
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: index ? 2 : 0 })} ${units[index]}`;
};
const usage = ({ value, unit }: { value: number; unit: "seconds" | "characters" | "bytes" }) => unit === "bytes" ? bytes(value) : unit === "seconds" ? value >= 60 ? `${(value / 60).toLocaleString(undefined, { maximumFractionDigits: 2 })} min` : `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} sec` : `${value.toLocaleString()} chars`;
const duration = (started: string, completed: string | null, status: Operation["status"]) => {
  if (!completed) return status === "stalled" ? "Stalled" : status === "queued" ? "Waiting" : "In progress";
  const ms = Math.max(0, new Date(completed).getTime() - new Date(started).getTime());
  return ms < 1000 ? `${ms} ms` : ms < 60_000 ? `${(ms / 1000).toFixed(1)} sec` : `${(ms / 60_000).toFixed(1)} min`;
};

export function AdminGpuOperations() {
  const { user, ready } = useAuth();
  const [result, setResult] = useState<Response | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [service, setService] = useState("");
  const [userUuid, setUserUuid] = useState("");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => { setAppliedSearch(search.trim()); setPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    if (user?.role !== "superAdmin") return;
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (appliedSearch) query.set("search", appliedSearch);
      if (status) query.set("status", status);
      if (service) query.set("service", service);
      if (userUuid) query.set("userUuid", userUuid);
      if (from) query.set("from", new Date(from).toISOString());
      if (to) query.set("to", new Date(to).toISOString());
      const statisticsQuery = new URLSearchParams();
      if (userUuid) statisticsQuery.set("userUuid", userUuid);
      if (from) statisticsQuery.set("from", new Date(from).toISOString());
      if (to) statisticsQuery.set("to", new Date(to).toISOString());
      const [operations, summary] = await Promise.all([
        apiRequest<Response>(`/observability/gpu-operations?${query}`, { auth: true }),
        apiRequest<Statistics>(`/observability/gpu-operation-statistics?${statisticsQuery}`, { auth: true }),
      ]);
      setResult(operations);
      setStatistics(summary);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load GPU operations"); }
    finally { setLoading(false); }
  }, [user, page, appliedSearch, status, service, userUuid, from, to]);
  useEffect(() => { void load(); }, [load]);

  if (!ready || user?.role !== "superAdmin") return null;
  const applyRange = () => {
    if (fromInput && toInput && new Date(fromInput) > new Date(toInput)) { setError("Start date must be before end date."); return; }
    setFrom(fromInput); setTo(toInput); setPage(1); setError("");
  };

  return <main className="mx-auto w-full max-w-[1320px] text-text">
    <Link href="/platform/admin" className="inline-flex items-center gap-2 text-xs text-muted hover:text-accent"><ArrowLeft size={14} /> Admin Console</Link>
    <div className="mb-5 mt-4 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-[11px] tracking-[.24em] text-accent">OPERATION TRACING</p><h1 className="mt-2 text-3xl font-extrabold">GPU Operations</h1><p className="mt-2 text-sm text-muted">One record per user request, with complete STT/TTS processing and billing flow.</p></div><button onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand-border bg-surface px-3 text-xs text-muted"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button></div>
    {error && <p className="mb-4 rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-xs text-danger">{error}</p>}
    <section className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-brand-border bg-surface p-4 shadow-sm"><div className="mr-2 flex items-center gap-2 self-center"><CalendarRange size={17} className="text-accent" /><div><p className="text-xs font-bold">Statistics scope</p><p className="text-[9px] text-muted">Filter every metric and operation</p></div></div><UserFilterDropdown value={userUuid} onChange={(value) => { setUserUuid(value); setPage(1); }} /><label className="text-[9px] font-semibold uppercase text-muted">From date & time<input type="datetime-local" value={fromInput} max={toInput || undefined} onChange={(event) => setFromInput(event.target.value)} className="mt-1 block h-9 rounded-lg border border-brand-border bg-surface-raised px-3 text-xs font-normal normal-case text-text" /></label><label className="text-[9px] font-semibold uppercase text-muted">To date & time<input type="datetime-local" value={toInput} min={fromInput || undefined} onChange={(event) => setToInput(event.target.value)} className="mt-1 block h-9 rounded-lg border border-brand-border bg-surface-raised px-3 text-xs font-normal normal-case text-text" /></label><button onClick={applyRange} className="h-9 rounded-lg bg-accent px-4 text-xs font-semibold text-white">Apply filters</button>{(userUuid || from || to) && <button onClick={() => { setUserUuid(""); setFromInput(""); setToInput(""); setFrom(""); setTo(""); setPage(1); }} className="h-9 rounded-lg border border-brand-border px-3 text-xs text-muted hover:text-text">Clear scope</button>}</section>
    <section className="mb-4 space-y-3">
      <div className="flex items-center justify-between"><div><h2 className="text-sm font-bold">GPU usage at a glance</h2><p className="mt-0.5 text-[10px] text-muted">Recalculates for the selected user and date/time range.{statistics ? ` Jobs without an update for ${statistics.stalledAfterMinutes} minutes are classified as stalled.` : ""}</p></div>{statistics && <span className="text-[10px] text-muted">Success rate: {statistics.successRate.toFixed(1)}%</span>}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Stat icon={Activity} label="Total operations" value={statistics?.totalRequests} tone="text-accent" />
        <Stat icon={CheckCircle2} label="Successful" value={statistics?.successRequests} tone="text-success" />
        <Stat icon={XCircle} label="Failed" value={statistics?.failedRequests} tone="text-danger" />
        <Stat icon={Hourglass} label="Queued" value={statistics?.queuedRequests} tone="text-warning" />
        <Stat icon={LoaderCircle} label="Processing" value={statistics ? statistics.activeProcessingRequests ?? statistics.processingRequests : undefined} tone="text-warning" />
        <Stat icon={TriangleAlert} label="Stalled" value={statistics?.stalledRequests} tone="text-danger" />
        <Stat icon={Coins} label="Credits charged" value={statistics ? `${statistics.totalCredits.toLocaleString(undefined, { maximumFractionDigits: 6 })} cr` : undefined} tone="text-accent" />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-border bg-surface p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-accent"><Mic2 size={17} /></span><div><h3 className="text-sm font-bold">Speech To Text</h3><p className="text-[10px] text-muted">Recognition operations</p></div></div><strong className="text-2xl">{statistics?.sttRequests.toLocaleString() ?? "—"}</strong></div><div className="mt-4 grid grid-cols-3 gap-2"><MiniStat icon={Radio} label="Live STT sessions" value={statistics?.sttLiveSessions} /><MiniStat icon={Upload} label="File transcriptions" value={statistics?.sttFileTranscriptions} /><MiniStat icon={Clock3} label="Audio processed" value={statistics ? `${(statistics.sttAudioSeconds / 60).toFixed(2)} min` : undefined} /></div></div>
        <div className="rounded-2xl border border-brand-border bg-surface p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-accent"><Volume2 size={17} /></span><div><h3 className="text-sm font-bold">Text To Speech</h3><p className="text-[10px] text-muted">Synthesis operations</p></div></div><strong className="text-2xl">{statistics?.ttsRequests.toLocaleString() ?? "—"}</strong></div><div className="mt-4 grid grid-cols-4 gap-2"><MiniStat icon={Volume2} label="Default voice" value={statistics?.ttsDefaultVoice} /><MiniStat icon={FileAudio} label="Voice cloning" value={statistics?.ttsVoiceCloning} /><MiniStat icon={Activity} label="Input characters" value={statistics?.ttsInputCharacters} /><MiniStat icon={FileAudio} label="Audio generated" value={statistics ? bytes(statistics.ttsOutputBytes) : undefined} /></div></div>
      </div>
      <StatusBreakdown rows={statistics?.statusBreakdown} />
      <UsageBreakdown rows={statistics?.statusBreakdown} />
    </section>
    <section className="overflow-hidden rounded-2xl border border-brand-border bg-surface shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-brand-border p-4"><label className="relative min-w-64 flex-1 sm:max-w-96"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search filename, input, name, or email" className="h-9 w-full rounded-lg border border-brand-border bg-surface-raised pl-9 pr-3 text-xs outline-none focus:border-accent" /></label><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-brand-border bg-surface-raised px-3 text-xs"><option value="">All outcomes</option><option value="queued">Queued</option><option value="processing">Processing</option><option value="stalled">Stalled</option><option value="success">Success</option><option value="failed">Failed</option></select><select value={service} onChange={(event) => { setService(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-brand-border bg-surface-raised px-3 text-xs"><option value="">STT & TTS</option><option value="stt">STT</option><option value="tts">TTS</option></select></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-xs"><thead className="bg-surface-raised text-[10px] uppercase tracking-wider text-muted"><tr><th className="px-4 py-3">Outcome</th><th className="px-4 py-3">Operation</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Measurements</th><th className="px-4 py-3">Credits</th><th className="px-4 py-3">Elapsed</th><th className="px-4 py-3">Requested</th><th className="px-4 py-3">Trace</th></tr></thead><tbody className="divide-y divide-brand-border">
        {result?.items.map((item) => <tr key={`${item.service}:${item.operationUuid}`} className="align-top hover:bg-brand-soft/40"><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 font-semibold ${item.status === "success" ? "bg-success/10 text-success" : item.status === "failed" || item.status === "stalled" ? "bg-danger-soft text-danger" : "bg-warning/10 text-warning"}`}>{item.status}</span><p className="mt-2 text-[10px] text-muted">Raw: {item.rawStatus}</p></td><td className="max-w-64 px-4 py-3"><p className="font-bold text-text">{item.service.toUpperCase()} · {item.operationType}</p><p className="mt-1 truncate text-[10px] text-muted" title={item.title}>{item.title}</p>{item.errorMessage && <p className="mt-1 line-clamp-2 text-[10px] text-danger">{item.errorMessage}</p>}</td><td className="px-4 py-3"><p className="font-medium text-text">{item.userName || "Unknown"}</p><p className="mt-1 text-[10px] text-muted">{item.userEmail || "—"}</p></td><td className="px-4 py-3">{item.service === "stt" ? <><p><FileAudio size={12} className="mr-1 inline" />{bytes(item.fileSizeBytes)}</p><p className="mt-1 text-muted">{item.audioSeconds == null ? "Duration pending" : `${item.audioSeconds.toFixed(2)} sec audio`}</p><p className="mt-1 text-muted">{item.outputUnits?.toLocaleString() || 0} transcript chars</p></> : <><p>{item.inputUnits?.toLocaleString() || 0} input characters</p><p className="mt-1 text-muted">{bytes(item.outputUnits)}</p></>}</td><td className="px-4 py-3"><p className="font-bold text-accent">{item.chargedCredits.toLocaleString(undefined, { maximumFractionDigits: 6 })} cr</p><p className="mt-1 text-[10px] text-muted">{item.usageEvents} billing event{item.usageEvents === 1 ? "" : "s"}</p></td><td className="whitespace-nowrap px-4 py-3"><Clock3 size={12} className="mr-1 inline text-muted" />{duration(item.createdAt, item.completedAt, item.status)}</td><td className="whitespace-nowrap px-4 py-3 text-muted">{new Date(item.createdAt).toLocaleString()}</td><td className="px-4 py-3"><Link href={`/platform/admin/gpu-logs/${item.service}/${item.operationUuid}`} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 font-semibold text-white"><Activity size={13} /> View flow</Link></td></tr>)}
        {!loading && !result?.items.length && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted">No GPU operations match these filters.</td></tr>}{loading && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted">Loading operations…</td></tr>}
      </tbody></table></div>
      <div className="flex items-center justify-between border-t border-brand-border px-4 py-3 text-xs text-muted"><span>{result?.pagination.total.toLocaleString() || 0} operations</span><div className="flex items-center gap-2"><button disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border border-brand-border px-3 py-1.5 disabled:opacity-40">Previous</button><span>Page {page} of {Math.max(1, result?.pagination.totalPages || 1)}</span><button disabled={loading || !result?.pagination.hasNextPage} onClick={() => setPage((value) => value + 1)} className="rounded border border-brand-border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
    </section>
  </main>;
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Activity; label: string; value: number | string | undefined; tone: string }) { return <div className="flex items-center gap-3 rounded-xl border border-brand-border bg-surface p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-raised"><Icon size={17} className={tone} /></span><div className="min-w-0"><p className="text-[10px] text-muted">{label}</p><p className="mt-1 truncate text-lg font-bold">{typeof value === "number" ? value.toLocaleString() : value ?? "—"}</p></div></div>; }
function MiniStat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: number | string | undefined }) { return <div className="rounded-xl border border-brand-border bg-surface-raised p-3"><Icon size={13} className="text-accent" /><p className="mt-2 text-[9px] text-muted">{label}</p><p className="mt-1 truncate text-sm font-bold">{typeof value === "number" ? value.toLocaleString() : value ?? "—"}</p></div>; }

function StatusBreakdown({ rows }: { rows: Statistics["statusBreakdown"] | undefined }) {
  return <div className="overflow-hidden rounded-2xl border border-brand-border bg-surface"><div className="border-b border-brand-border px-4 py-3"><h3 className="text-sm font-bold">Status by module</h3><p className="mt-0.5 text-[10px] text-muted">Shows exactly which STT or TTS workflow contributes to each status for the selected scope.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-surface-raised text-[9px] uppercase tracking-wider text-muted"><tr><th className="px-4 py-2.5">Module</th><th className="px-3 py-2.5 text-right">Total</th><th className="px-3 py-2.5 text-right">Successful</th><th className="px-3 py-2.5 text-right">Failed</th><th className="px-3 py-2.5 text-right">Queued</th><th className="px-3 py-2.5 text-right">Processing</th><th className="px-4 py-2.5 text-right">Stalled</th></tr></thead><tbody className="divide-y divide-brand-border">{rows?.map((row) => <tr key={row.key}><td className="px-4 py-3"><span className={`mr-2 rounded-full px-2 py-1 text-[9px] font-bold uppercase ${row.service === "stt" ? "bg-brand-soft text-accent" : "bg-success/10 text-success"}`}>{row.service}</span><span className="font-semibold">{row.label}</span></td><Count value={row.total} /><Count value={row.success} tone="text-success" /><Count value={row.failed} tone="text-danger" /><Count value={row.queued} tone="text-warning" /><Count value={row.processing} tone="text-warning" /><Count value={row.stalled} tone="text-danger" last /></tr>)}{!rows && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Loading status breakdown…</td></tr>}</tbody></table></div></div>;
}

function UsageBreakdown({ rows }: { rows: Statistics["statusBreakdown"] | undefined }) {
  return <div><div className="mb-2 flex items-end justify-between gap-3"><div><h3 className="text-sm font-bold">Consumption and credits by module</h3><p className="mt-0.5 text-[10px] text-muted">Native input, generated output, and billed credits for the selected user and date range.</p></div><span className="text-[9px] text-muted">1 credit = ₹1</span></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{rows?.map((row) => { const Icon = row.key === "stt_file" ? Upload : row.key === "stt_live" ? Radio : row.key === "tts_clone" ? FileAudio : Volume2; return <article key={row.key} className="group rounded-2xl border border-brand-border bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-accent"><Icon size={16} /></span><div className="min-w-0"><p className="truncate text-xs font-bold">{row.label}</p><p className="mt-0.5 text-[9px] text-muted">{row.total.toLocaleString()} operation{row.total === 1 ? "" : "s"}</p></div></div><span className={`rounded-full px-2 py-1 text-[8px] font-bold uppercase ${row.service === "stt" ? "bg-brand-soft text-accent" : "bg-success/10 text-success"}`}>{row.service}</span></div><div className="mt-4 rounded-xl bg-gradient-to-br from-brand-soft to-surface-raised p-3"><p className="text-[9px] font-semibold uppercase tracking-wider text-muted">Credits utilized</p><p className="mt-1 text-xl font-extrabold text-accent">{row.credits.toLocaleString(undefined, { maximumFractionDigits: 6 })} <span className="text-xs font-semibold">cr</span></p></div><div className="mt-3 grid grid-cols-2 gap-2"><UsageMetric label={row.service === "stt" ? "Audio input" : "Text input"} value={usage(row.input)} /><UsageMetric label={row.service === "stt" ? "Transcript output" : "Audio output"} value={usage(row.output)} /></div>{row.supporting && <p className="mt-3 flex items-center justify-between border-t border-brand-border pt-3 text-[9px] text-muted"><span>{row.supporting.label}</span><strong className="text-text">{usage(row.supporting)}</strong></p>}</article>; })}{!rows && Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-56 animate-pulse rounded-2xl border border-brand-border bg-surface" />)}</div></div>;
}

function UsageMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-brand-border bg-surface-raised p-3"><p className="text-[8px] uppercase tracking-wider text-muted">{label}</p><p className="mt-1 truncate text-xs font-bold" title={value}>{value}</p></div>; }

function Count({ value, tone = "text-text", last = false }: { value: number; tone?: string; last?: boolean }) { return <td className={`${last ? "px-4" : "px-3"} py-3 text-right font-bold ${value ? tone : "text-muted"}`}>{value.toLocaleString()}</td>; }
