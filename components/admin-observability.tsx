"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CalendarRange, Check, CheckCircle2, ChevronDown, Download, LoaderCircle, RefreshCw, Search, Settings2, Trash2, UserRound, X } from "lucide-react";
import { apiBlob, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Kind = "api" | "gpu";
type LogItem = {
  log_uuid: string;
  request_id?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  method?: string;
  path?: string;
  module?: string;
  functionality?: string;
  service?: string;
  operation?: string;
  endpoint?: string;
  status: "success" | "failed";
  http_status?: number;
  upstream_status?: number | null;
  description: string;
  error_code?: string | null;
  error_message?: string | null;
  request_metadata?: unknown;
  response_metadata?: unknown;
  provider_reference?: string | null;
  artifact_file_name?: string | null;
  artifact_original_name?: string | null;
  duration_ms: number;
  created_at: string;
};
type ListResponse = { items: LogItem[]; pagination: { page: number; pageSize: number; total: number; totalPages: number; hasNextPage: boolean } };
type Settings = { retention_days: number; updated_at: string };
type ObservedUser = { user_uuid: string; fullName: string; email: string };
type ObservedUserResponse = { items: ObservedUser[]; pagination: { page: number; pageSize: number; total: number; totalPages: number; hasNextPage: boolean } };

const dateTime = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" });
const json = (value: unknown) => value == null ? "No data recorded" : JSON.stringify(value, null, 2);

export function AdminObservability({ kind }: { kind: Kind }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [result, setResult] = useState<ListResponse | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [retentionDraft, setRetentionDraft] = useState("7");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [service, setService] = useState("");
  const [userUuid, setUserUuid] = useState("");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { if (ready && user && user.role !== "superAdmin") router.replace("/platform"); }, [ready, user, router]);
  useEffect(() => {
    const timer = window.setTimeout(() => { setAppliedSearch(search.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    if (user?.role !== "superAdmin") return;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (appliedSearch) query.set("search", appliedSearch);
      if (status) query.set("status", status);
      if (kind === "gpu" && service) query.set("service", service);
      if (userUuid) query.set("userUuid", userUuid);
      if (appliedFrom) query.set("from", new Date(appliedFrom).toISOString());
      if (appliedTo) query.set("to", new Date(appliedTo).toISOString());
      const endpoint = kind === "api" ? "api-transactions" : "gpu-transactions";
      const [logs, nextSettings] = await Promise.all([
        apiRequest<ListResponse>(`/observability/${endpoint}?${query}`, { auth: true }),
        apiRequest<Settings>("/observability/settings", { auth: true }),
      ]);
      setResult({
        ...logs,
        items: [...logs.items].sort((left, right) => {
          const timeDifference = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
          return timeDifference || right.log_uuid.localeCompare(left.log_uuid);
        }),
      });
      setSettings(nextSettings);
      setRetentionDraft(String(nextSettings.retention_days));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load monitoring logs");
    } finally { setLoading(false); }
  }, [user, kind, page, appliedSearch, status, service, userUuid, appliedFrom, appliedTo]);

  useEffect(() => { void load(); }, [load]);

  const applyDateRange = () => {
    if (fromInput && toInput && new Date(fromInput) > new Date(toInput)) {
      setError("The start date and time must be earlier than the end date and time.");
      return;
    }
    setError("");
    setAppliedFrom(fromInput);
    setAppliedTo(toInput);
    setPage(1);
  };

  const clearDateRange = () => {
    setFromInput(""); setToInput(""); setAppliedFrom(""); setAppliedTo(""); setPage(1); setError("");
  };

  const saveRetention = async () => {
    const days = Number(retentionDraft);
    if (!Number.isInteger(days) || days < 1 || days > 365) { setError("Retention must be a whole number between 1 and 365 days."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const next = await apiRequest<Settings>("/observability/settings", { method: "PUT", body: { retentionDays: days }, auth: true });
      setSettings(next); setNotice(`Logs will be retained for ${days} day${days === 1 ? "" : "s"}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update retention"); }
    finally { setSaving(false); }
  };

  const cleanup = async () => {
    setSaving(true); setError(""); setNotice("");
    try { await apiRequest("/observability/cleanup", { method: "POST", auth: true }); setNotice("Expired records and stored transcription files were deleted."); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to run cleanup"); }
    finally { setSaving(false); }
  };

  const openArtifact = async (item: LogItem) => {
    try {
      const blob = await apiBlob(`/observability/gpu-transactions/${item.log_uuid}/artifact`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = item.artifact_original_name || "transcription-audio"; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to download transcription file"); }
  };

  const openTranscript = async (item: LogItem) => {
    try {
      const blob = await apiBlob(`/observability/gpu-transactions/${item.log_uuid}/transcript`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "transcription.txt"; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to download transcript"); }
  };

  if (!ready || !user || user.role !== "superAdmin") return null;
  const title = kind === "api" ? "API & Function Logs" : "GPU Service Logs";
  const subtitle = kind === "api" ? "Review application requests, outcomes, response times, and human-readable errors." : "Review STT/TTS GPU calls, upstream outcomes, and retained STT source files.";

  return (
    <main className="mx-auto w-full max-w-[1280px] text-text">
      <Link href="/platform/admin" className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-accent"><ArrowLeft size={14} /> Admin Console</Link>
      <div className="mb-5 mt-4 flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-mono text-[11px] tracking-[.24em] text-accent">SYSTEM MONITORING</p><h1 className="mt-2 text-3xl font-extrabold">{title}</h1><p className="mt-2 text-sm text-muted">{subtitle}</p></div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand-border bg-surface px-3 text-xs font-medium text-muted hover:text-text disabled:opacity-60"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </div>

      <section className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-brand-border bg-surface p-4">
        <Settings2 size={18} className="mb-2 text-accent" />
        <label className="text-xs text-muted">Automatic deletion after
          <span className="mt-1 flex items-center gap-2"><input type="number" min={1} max={365} value={retentionDraft} onChange={(event) => setRetentionDraft(event.target.value)} className="h-9 w-24 rounded-lg border border-brand-border bg-surface-raised px-3 text-text" /><span>days</span></span>
        </label>
        <button onClick={() => void saveRetention()} disabled={saving} className="h-9 rounded-lg bg-accent px-4 text-xs font-semibold text-white disabled:opacity-60">Save retention</button>
        <button onClick={() => void cleanup()} disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand-border px-3 text-xs text-muted hover:text-text disabled:opacity-60"><Trash2 size={13} /> Delete expired now</button>
        {settings && <span className="ml-auto text-[11px] text-muted">Current policy: {settings.retention_days} days</span>}
      </section>
      {error && <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">{error}</p>}
      {notice && <p className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-xs text-success">{notice}</p>}

      <section className="overflow-hidden rounded-2xl border border-brand-border bg-surface shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-brand-border p-4">
          <label className="relative min-w-60 flex-1 sm:max-w-96"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search path, operation, description, or user" className="h-9 w-full rounded-lg border border-brand-border bg-surface-raised pl-9 pr-3 text-xs outline-none focus:border-accent" /></label>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-brand-border bg-surface-raised px-3 text-xs"><option value="">All outcomes</option><option value="success">Success</option><option value="failed">Failed</option></select>
          {kind === "gpu" && <select value={service} onChange={(event) => { setService(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-brand-border bg-surface-raised px-3 text-xs"><option value="">STT & TTS</option><option value="stt">STT</option><option value="tts">TTS</option></select>}
          <UserFilterDropdown value={userUuid} onChange={(value) => { setUserUuid(value); setPage(1); }} />
        </div>
        <div className="flex flex-wrap items-end gap-2 border-b border-brand-border bg-surface-raised/40 p-4">
          <CalendarRange size={16} className="mb-2.5 text-accent" />
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">From date & time<input type="datetime-local" value={fromInput} max={toInput || undefined} onChange={(event) => setFromInput(event.target.value)} className="mt-1 block h-9 rounded-lg border border-brand-border bg-surface px-3 text-xs font-normal normal-case tracking-normal text-text" /></label>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">To date & time<input type="datetime-local" value={toInput} min={fromInput || undefined} onChange={(event) => setToInput(event.target.value)} className="mt-1 block h-9 rounded-lg border border-brand-border bg-surface px-3 text-xs font-normal normal-case tracking-normal text-text" /></label>
          <button onClick={applyDateRange} className="h-9 rounded-lg bg-accent px-4 text-xs font-semibold text-white">Apply range</button>
          {(fromInput || toInput || appliedFrom || appliedTo) && <button onClick={clearDateRange} className="h-9 rounded-lg border border-brand-border bg-surface px-3 text-xs text-muted hover:text-text">Clear range</button>}
          {(appliedFrom || appliedTo) && <span className="mb-2 ml-auto text-[10px] text-muted">Filtering by your local date and time</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="bg-surface-raised text-[10px] uppercase tracking-wider text-muted"><tr><th className="px-4 py-3">Outcome</th><th className="px-4 py-3">{kind === "api" ? "Request" : "GPU operation"}</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Details</th></tr></thead>
            <tbody className="divide-y divide-brand-border">
              {!loading && !result?.items.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted">No monitoring records match these filters.</td></tr>}
              {result?.items.map((item) => <LogRows key={item.log_uuid} item={item} kind={kind} expanded={expanded === item.log_uuid} onToggle={() => setExpanded(expanded === item.log_uuid ? null : item.log_uuid)} onArtifact={() => void openArtifact(item)} onTranscript={() => void openTranscript(item)} />)}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-brand-border px-4 py-3 text-xs text-muted"><span>{result ? `${result.pagination.total.toLocaleString()} records` : "Loading…"}</span><div className="flex items-center gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded border border-brand-border px-3 py-1.5 disabled:opacity-40">Previous</button><span>Page {page} of {Math.max(1, result?.pagination.totalPages || 1)}</span><button disabled={!result?.pagination.hasNextPage || loading} onClick={() => setPage((value) => value + 1)} className="rounded border border-brand-border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
      </section>
    </main>
  );
}

function LogRows({ item, kind, expanded, onToggle, onArtifact, onTranscript }: { item: LogItem; kind: Kind; expanded: boolean; onToggle: () => void; onArtifact: () => void; onTranscript: () => void }) {
  const failed = item.status === "failed";
  const resultMetadata = item.response_metadata as { result?: { protocol?: unknown } } | null | undefined;
  const canHaveUploadedSource = item.service === "stt" && item.operation === "transcription_result" && resultMetadata?.result?.protocol !== "arabic_ws";
  return <>
    <tr className="align-top hover:bg-surface-raised/50">
      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-semibold ${failed ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>{failed ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}{failed ? "Failed" : "Success"}</span><span className="mt-1 block text-[10px] text-muted">HTTP {item.http_status ?? item.upstream_status ?? "—"}</span></td>
      <td className="max-w-64 px-4 py-3"><p className="font-semibold">{kind === "api" ? `${item.method} · ${item.module}` : `${item.service?.toUpperCase()} · ${item.operation?.replaceAll("_", " ")}`}</p><p className="mt-1 truncate font-mono text-[10px] text-muted" title={kind === "api" ? item.path : item.endpoint}>{kind === "api" ? item.path : item.endpoint}</p>{item.artifact_file_name && <button type="button" onClick={onArtifact} className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-brand-border bg-surface px-2 py-1 text-[10px] font-semibold text-accent hover:bg-brand-soft" title={item.artifact_original_name || "Download uploaded STT source file"}><Download size={11} className="shrink-0" /><span className="truncate">{item.artifact_original_name || "Uploaded STT file"}</span></button>}</td>
      <td className="px-4 py-3"><p>{item.userName || "System / unknown"}</p><p className="mt-1 text-[10px] text-muted">{item.userEmail || "No user association"}</p></td>
      <td className="max-w-sm px-4 py-3"><p className={failed ? "text-danger" : "text-text"}>{item.description}</p>{item.error_code && <p className="mt-1 font-mono text-[10px] text-muted">{item.error_code}</p>}</td>
      <td className="whitespace-nowrap px-4 py-3">{item.duration_ms.toLocaleString()} ms</td><td className="whitespace-nowrap px-4 py-3 text-muted">{dateTime(item.created_at)}</td>
      <td className="px-4 py-3"><button onClick={onToggle} className="inline-flex items-center gap-1 text-accent">Inspect <ChevronDown size={13} className={expanded ? "rotate-180" : ""} /></button></td>
    </tr>
    {expanded && <tr className="bg-surface-raised/60"><td colSpan={7} className="p-4"><div className="grid gap-4 lg:grid-cols-2"><Detail title="Request metadata" value={item.request_metadata} /><Detail title="Response metadata" value={item.response_metadata} /></div><div className="mt-3 grid gap-3 rounded-lg border border-brand-border bg-surface p-3 sm:grid-cols-3"><div><span className="text-[10px] uppercase text-muted">Request ID</span><p className="mt-1 break-all font-mono text-[11px]">{item.request_id || "—"}</p></div><div><span className="text-[10px] uppercase text-muted">Provider reference</span><p className="mt-1 break-all font-mono text-[11px]">{item.provider_reference || "—"}</p></div><div><span className="text-[10px] uppercase text-muted">Technical error</span><p className="mt-1 text-[11px] text-danger">{item.error_message || "None"}</p></div></div><div className="mt-3 flex flex-wrap gap-2">{(item.artifact_file_name || canHaveUploadedSource) && <button onClick={onArtifact} className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-surface px-3 py-2 text-xs font-semibold text-accent"><Download size={14} /> Download {item.artifact_original_name || "uploaded source file"}</button>}{item.service === "stt" && item.operation === "transcription_result" && <button onClick={onTranscript} className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-surface px-3 py-2 text-xs font-semibold text-accent"><Download size={14} /> Download transcript</button>}</div></td></tr>}
  </>;
}

function Detail({ title, value }: { title: string; value: unknown }) { return <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">{title}</p><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-brand-border bg-bg p-3 font-mono text-[10px] leading-5 text-muted">{json(value)}</pre></div>; }

function UserFilterDropdown({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<ObservedUser[]>([]);
  const [selected, setSelected] = useState<ObservedUser | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value) return;
    setSelected(null);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
      setItems([]);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (debouncedSearch) query.set("search", debouncedSearch);
    void apiRequest<ObservedUserResponse>(`/observability/users?${query}`, { auth: true })
      .then((response) => {
        if (requestId !== requestIdRef.current) return;
        setItems((current) => page === 1
          ? response.items
          : [...current, ...response.items.filter((item) => !current.some((existing) => existing.user_uuid === item.user_uuid))]);
        setHasNextPage(response.pagination.hasNextPage);
        setTotal(response.pagination.total);
      })
      .catch(() => {
        if (requestId === requestIdRef.current) setHasNextPage(false);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
  }, [open, page, debouncedSearch]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-64">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="flex h-9 w-full items-center gap-2 rounded-lg border border-brand-border bg-surface-raised py-0 pl-3 pr-14 text-left text-xs">
        <UserRound size={13} className="shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate">{selected ? `${selected.fullName} · ${selected.email}` : "All users"}</span>
      </button>
      {selected && <button type="button" aria-label="Clear user filter" onClick={() => { setSelected(null); onChange(""); }} className="absolute right-7 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 text-muted hover:text-text"><X size={12} /></button>}
      <ChevronDown size={13} className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      {open && <div className="absolute right-0 top-11 z-40 w-[360px] max-w-[90vw] overflow-hidden rounded-xl border border-brand-border bg-surface shadow-xl">
        <div className="border-b border-brand-border p-2">
          <label className="relative block"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search user name or email" className="h-9 w-full rounded-lg border border-brand-border bg-surface-raised pl-8 pr-3 text-xs outline-none focus:border-accent" /></label>
        </div>
        <div role="listbox" onScroll={(event) => { const element = event.currentTarget; if (!loading && hasNextPage && element.scrollTop + element.clientHeight >= element.scrollHeight - 40) setPage((current) => current + 1); }} className="max-h-64 overflow-y-auto p-1.5">
          <button type="button" role="option" aria-selected={!value} onClick={() => { setSelected(null); onChange(""); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-brand-soft"><span className="flex-1">All users</span>{!value && <Check size={13} className="text-accent" />}</button>
          {items.map((record) => <button key={record.user_uuid} type="button" role="option" aria-selected={value === record.user_uuid} onClick={() => { setSelected(record); onChange(record.user_uuid); setOpen(false); }} className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left hover:bg-brand-soft"><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-text">{record.fullName}</span><span className="mt-0.5 block truncate text-[10px] text-muted">{record.email}</span></span>{value === record.user_uuid && <Check size={13} className="mt-1 shrink-0 text-accent" />}</button>)}
          {!loading && !items.length && <p className="px-3 py-8 text-center text-xs text-muted">No users found.</p>}
          {loading && <p className="flex items-center justify-center gap-2 px-3 py-4 text-xs text-muted"><LoaderCircle size={14} className="animate-spin" /> Loading users…</p>}
        </div>
        <div className="border-t border-brand-border px-3 py-2 text-[10px] text-muted">{total.toLocaleString()} users · scroll to load more</div>
      </div>}
    </div>
  );
}
