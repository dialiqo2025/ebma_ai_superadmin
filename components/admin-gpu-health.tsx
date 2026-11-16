"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Mail,
  Play,
  Plus,
  RefreshCw,
  Search,
  ServerCog,
  Trash2,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Settings = {
  enabled: boolean;
  check_interval_minutes: number;
  retention_days: number;
  notifications_enabled: boolean;
  notify_healthy: boolean;
  notify_high_usage: boolean;
  notify_unhealthy: boolean;
  notify_recovered: boolean;
  high_usage_threshold_percent: number;
  repeat_alert_minutes: number;
  next_check_at: string;
  last_check_at: string | null;
};
type Recipient = { recipient_uuid: string; email: string; created_at: string };
type Check = {
  check_uuid: string;
  trigger: "scheduled" | "manual";
  status: "healthy" | "high_usage" | "unhealthy";
  context: string;
  endpoint: string;
  method: string;
  http_status: number | null;
  duration_ms: number;
  response_body: string | null;
  error_code: string | null;
  error_message: string | null;
  usage_percent: number | null;
  active_workload: number | null;
  capacity: number | null;
  queue_depth: number | null;
  notification_status: string;
  notification_recipient_count: number;
  notification_error: string | null;
  checked_at: string;
};
type Configuration = { settings: Settings; recipients: Recipient[]; latestCheck: Check | null; endpoint: string };
type CheckList = { items: Check[]; pagination: { page: number; pageSize: number; total: number; totalPages: number; hasNextPage: boolean } };

const dateTime = (value: string | null) => value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" }) : "Never";
const contextText = (value: string) => ({
  initial_healthy: "Initial check passed",
  routine_healthy: "Routine check passed",
  recovered: "Service recovered",
  high_usage_detected: "High usage detected",
  still_high_usage: "Still under high load",
  incident_detected: "Incident detected",
  still_unhealthy: "Still unavailable",
}[value] || value.replaceAll("_", " "));

export function AdminGpuHealth() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [checks, setChecks] = useState<CheckList | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifyHealthy, setNotifyHealthy] = useState(false);
  const [notifyHighUsage, setNotifyHighUsage] = useState(true);
  const [notifyUnhealthy, setNotifyUnhealthy] = useState(true);
  const [notifyRecovered, setNotifyRecovered] = useState(false);
  const [highUsageThreshold, setHighUsageThreshold] = useState("80");
  const [repeatAlertMinutes, setRepeatAlertMinutes] = useState("60");
  const [intervalMinutes, setIntervalMinutes] = useState("30");
  const [retentionDays, setRetentionDays] = useState("30");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { if (ready && user && user.role !== "superAdmin") router.replace("/platform"); }, [ready, user, router]);
  useEffect(() => {
    const timer = window.setTimeout(() => { setAppliedSearch(search.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    if (user?.role !== "superAdmin") return;
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (status) query.set("status", status);
      if (appliedSearch) query.set("search", appliedSearch);
      const [nextConfiguration, nextChecks] = await Promise.all([
        apiRequest<Configuration>("/gpu-health/configuration", { auth: true }),
        apiRequest<CheckList>(`/gpu-health/checks?${query}`, { auth: true }),
      ]);
      setConfiguration(nextConfiguration);
      setChecks(nextChecks);
      setEnabled(nextConfiguration.settings.enabled);
      setNotificationsEnabled(nextConfiguration.settings.notifications_enabled);
      setNotifyHealthy(nextConfiguration.settings.notify_healthy);
      setNotifyHighUsage(nextConfiguration.settings.notify_high_usage);
      setNotifyUnhealthy(nextConfiguration.settings.notify_unhealthy);
      setNotifyRecovered(nextConfiguration.settings.notify_recovered);
      setHighUsageThreshold(String(nextConfiguration.settings.high_usage_threshold_percent));
      setRepeatAlertMinutes(String(nextConfiguration.settings.repeat_alert_minutes));
      setIntervalMinutes(String(nextConfiguration.settings.check_interval_minutes));
      setRetentionDays(String(nextConfiguration.settings.retention_days));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load GPU health monitoring"); }
    finally { setLoading(false); }
  }, [user, page, status, appliedSearch]);

  useEffect(() => { void load(); }, [load]);

  const saveSettings = async () => {
    const interval = Number(intervalMinutes);
    const retention = Number(retentionDays);
    const threshold = Number(highUsageThreshold);
    const repeatMinutes = Number(repeatAlertMinutes);
    if (!Number.isInteger(interval) || interval < 1 || interval > 10_080) { setError("Check interval must be between 1 and 10,080 minutes."); return; }
    if (!Number.isInteger(retention) || retention < 1 || retention > 3650) { setError("Retention must be between 1 and 3,650 days."); return; }
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > 100) { setError("High-usage threshold must be between 1% and 100%."); return; }
    if (!Number.isInteger(repeatMinutes) || repeatMinutes < 1 || repeatMinutes > 10_080) { setError("Repeat alert interval must be between 1 and 10,080 minutes."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest("/gpu-health/settings", { method: "PUT", auth: true, body: {
        enabled, checkIntervalMinutes: interval, retentionDays: retention, notificationsEnabled,
        notifyHealthy, notifyHighUsage, notifyUnhealthy, notifyRecovered,
        highUsageThresholdPercent: threshold, repeatAlertMinutes: repeatMinutes,
      } });
      setNotice("GPU health monitoring settings saved. The next check was rescheduled using the new interval.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save settings"); }
    finally { setBusy(false); }
  };

  const addRecipient = async () => {
    if (!email.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest("/gpu-health/recipients", { method: "POST", auth: true, body: { email: email.trim() } });
      setEmail(""); setNotice("Notification recipient added."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to add recipient"); }
    finally { setBusy(false); }
  };

  const removeRecipient = async (recipient: Recipient) => {
    setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest(`/gpu-health/recipients/${recipient.recipient_uuid}`, { method: "DELETE", auth: true });
      setNotice(`${recipient.email} was removed.`); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to remove recipient"); }
    finally { setBusy(false); }
  };

  const checkNow = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await apiRequest<Check>("/gpu-health/check-now", { method: "POST", auth: true, timeout: 150_000 });
      setNotice(`Manual check completed: ${result.status}.`); setPage(1); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to complete GPU health check"); }
    finally { setBusy(false); }
  };

  const cleanup = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await apiRequest<{ deleted: number }>("/gpu-health/cleanup", { method: "POST", auth: true });
      setNotice(`${result.deleted} expired health check record${result.deleted === 1 ? "" : "s"} deleted.`); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete expired records"); }
    finally { setBusy(false); }
  };

  if (!ready || !user || user.role !== "superAdmin") return null;
  const latest = configuration?.latestCheck;

  return (
    <main className="mx-auto w-full max-w-[1280px] text-text">
      <Link href="/platform/admin" className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-accent"><ArrowLeft size={14} /> Admin Console</Link>
      <div className="mb-5 mt-4 flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-mono text-[11px] tracking-[.24em] text-accent">INFRASTRUCTURE</p><h1 className="mt-2 text-3xl font-extrabold">GPU Health Monitor</h1><p className="mt-2 text-sm text-muted">Schedule TTS GPU probes, notify the operations team, and retain an auditable health history.</p></div>
        <div className="flex gap-2"><button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand-border bg-surface px-3 text-xs font-medium text-muted hover:text-text disabled:opacity-60"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button><button type="button" onClick={() => void checkNow()} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-xs font-semibold text-white disabled:opacity-60"><Play size={14} /> Check now</button></div>
      </div>

      {error && <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">{error}</p>}
      {notice && <p className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-xs text-success">{notice}</p>}

      <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={latest?.status === "healthy" ? CheckCircle2 : AlertCircle} label="Current status" value={latest ? latest.status.replaceAll("_", " ") : "No checks yet"} tone={latest?.status === "healthy" ? "success" : latest?.status === "high_usage" ? "warning" : latest ? "danger" : "muted"} />
        <SummaryCard icon={Clock3} label="Last check" value={dateTime(configuration?.settings.last_check_at ?? null)} />
        <SummaryCard icon={Activity} label="Next scheduled check" value={configuration?.settings.enabled ? dateTime(configuration.settings.next_check_at) : "Monitoring paused"} />
        <SummaryCard icon={Mail} label="Recipients" value={`${configuration?.recipients.length ?? 0} email${configuration?.recipients.length === 1 ? "" : "s"}`} />
      </section>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-2xl border border-brand-border bg-surface p-5">
          <div className="flex items-center gap-2"><ServerCog size={18} className="text-accent" /><h2 className="font-bold">Schedule and retention</h2></div>
          <p className="mt-1 text-xs text-muted">Checks use <span className="font-mono text-text">{configuration?.endpoint || "the configured endpoint"}</span>.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-muted">Check every<input type="number" min={1} max={10080} value={intervalMinutes} onChange={(event) => setIntervalMinutes(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-brand-border bg-surface-raised px-3 text-text" /><span className="mt-1 block text-[10px]">minutes (30 is recommended)</span></label>
            <label className="text-xs text-muted">Delete logs after<input type="number" min={1} max={3650} value={retentionDays} onChange={(event) => setRetentionDays(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-brand-border bg-surface-raised px-3 text-text" /><span className="mt-1 block text-[10px]">days</span></label>
          </div>
          <div className="mt-4 grid gap-2">
            <Toggle checked={enabled} onChange={setEnabled} title="Scheduled monitoring" description="Run checks automatically using the interval above." />
            <Toggle checked={notificationsEnabled} onChange={setNotificationsEnabled} title="Email alerts" description="Master switch for the selected alert conditions below." />
          </div>
          <div className={`mt-4 rounded-xl border border-brand-border bg-surface-raised p-4 ${notificationsEnabled ? "" : "opacity-60"}`}>
            <h3 className="text-xs font-bold">Email conditions</h3>
            <p className="mt-1 text-[10px] text-muted">Choose exactly which GPU states should email the operations team.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Toggle checked={notifyHealthy} onChange={setNotifyHealthy} title="Service running" description="Healthy and routine checks." disabled={!notificationsEnabled} />
              <Toggle checked={notifyHighUsage} onChange={setNotifyHighUsage} title="High usage" description="Capacity threshold reached or work is queued." disabled={!notificationsEnabled} />
              <Toggle checked={notifyUnhealthy} onChange={setNotifyUnhealthy} title="Out of service" description="Timeout, connection failure, or unhealthy response." disabled={!notificationsEnabled} />
              <Toggle checked={notifyRecovered} onChange={setNotifyRecovered} title="Service recovered" description="Service returns after high usage or an outage." disabled={!notificationsEnabled} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-[10px] text-muted">High usage at<input type="number" min={1} max={100} disabled={!notificationsEnabled} value={highUsageThreshold} onChange={(event) => setHighUsageThreshold(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-brand-border bg-surface px-3 text-xs text-text disabled:opacity-60" /><span className="mt-1 block">percent of reported capacity</span></label>
              <label className="text-[10px] text-muted">Repeat ongoing alerts after<input type="number" min={1} max={10080} disabled={!notificationsEnabled} value={repeatAlertMinutes} onChange={(event) => setRepeatAlertMinutes(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-brand-border bg-surface px-3 text-xs text-text disabled:opacity-60" /><span className="mt-1 block">minutes (transitions are immediate)</span></label>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => void saveSettings()} disabled={busy} className="h-10 rounded-lg bg-accent px-4 text-xs font-semibold text-white disabled:opacity-60">Save settings</button><button type="button" onClick={() => void cleanup()} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand-border px-3 text-xs text-muted hover:text-text disabled:opacity-60"><Trash2 size={13} /> Delete expired now</button></div>
        </section>

        <section className="rounded-2xl border border-brand-border bg-surface p-5">
          <div className="flex items-center gap-2"><Mail size={18} className="text-accent" /><h2 className="font-bold">Notification recipients</h2></div>
          <p className="mt-1 text-xs text-muted">Add multiple registered operations email addresses.</p>
          <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); void addRecipient(); }}><input type="email" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ops@example.com" className="h-10 min-w-0 flex-1 rounded-lg border border-brand-border bg-surface-raised px-3 text-xs outline-none focus:border-accent" /><button disabled={busy || !email.trim()} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-white disabled:opacity-60"><Plus size={14} /> Add</button></form>
          <div className="mt-4 max-h-52 space-y-2 overflow-y-auto">
            {!configuration?.recipients.length && <p className="rounded-lg border border-dashed border-brand-border px-3 py-6 text-center text-xs text-muted">No recipients added. Checks will still be stored.</p>}
            {configuration?.recipients.map((recipient) => <div key={recipient.recipient_uuid} className="flex items-center gap-3 rounded-lg border border-brand-border bg-surface-raised px-3 py-2"><Mail size={13} className="shrink-0 text-accent" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{recipient.email}</p><p className="text-[10px] text-muted">Added {dateTime(recipient.created_at)}</p></div><button type="button" aria-label={`Remove ${recipient.email}`} onClick={() => void removeRecipient(recipient)} disabled={busy} className="rounded-md p-2 text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-50"><Trash2 size={13} /></button></div>)}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-brand-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-brand-border p-4"><div><h2 className="font-bold">Health check history</h2><p className="mt-1 text-xs text-muted">Stored endpoint responses, timings, email delivery, and failure context.</p></div><label className="relative ml-auto min-w-60"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search endpoint or response" className="h-9 w-full rounded-lg border border-brand-border bg-surface-raised pl-9 pr-3 text-xs outline-none focus:border-accent" /></label><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-brand-border bg-surface-raised px-3 text-xs"><option value="">All statuses</option><option value="healthy">Healthy</option><option value="high_usage">High usage</option><option value="unhealthy">Unhealthy</option></select></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-surface-raised text-[10px] uppercase tracking-wider text-muted"><tr><th className="px-4 py-3">Status</th><th className="px-4 py-3">Context</th><th className="px-4 py-3">Endpoint</th><th className="px-4 py-3">Response</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Checked</th><th className="px-4 py-3">Details</th></tr></thead><tbody className="divide-y divide-brand-border">
          {!loading && !checks?.items.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted">No health checks match these filters.</td></tr>}
          {checks?.items.map((item) => <CheckRows key={item.check_uuid} item={item} expanded={expanded === item.check_uuid} onToggle={() => setExpanded(expanded === item.check_uuid ? null : item.check_uuid)} />)}
        </tbody></table></div>
        <div className="flex items-center justify-between border-t border-brand-border px-4 py-3 text-xs text-muted"><span>{checks ? `${checks.pagination.total.toLocaleString()} records` : "Loading…"}</span><div className="flex items-center gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded border border-brand-border px-3 py-1.5 disabled:opacity-40">Previous</button><span>Page {page} of {Math.max(1, checks?.pagination.totalPages || 1)}</span><button disabled={!checks?.pagination.hasNextPage || loading} onClick={() => setPage((value) => value + 1)} className="rounded border border-brand-border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
      </section>
    </main>
  );
}

function SummaryCard({ icon: Icon, label, value, tone = "muted" }: { icon: typeof Activity; label: string; value: string; tone?: "success" | "warning" | "danger" | "muted" }) {
  const color = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-accent";
  return <div className="rounded-xl border border-brand-border bg-surface p-4"><div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${color}`}><Icon size={14} /> {label}</div><p className="mt-3 text-sm font-semibold capitalize">{value}</p></div>;
}

function Toggle({ checked, onChange, title, description, disabled = false }: { checked: boolean; onChange: (value: boolean) => void; title: string; description: string; disabled?: boolean }) {
  return <label className={`flex items-center gap-3 rounded-lg border border-brand-border bg-surface-raised p-3 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-accent" /><span><span className="block text-xs font-semibold">{title}</span><span className="mt-0.5 block text-[10px] text-muted">{description}</span></span></label>;
}

function CheckRows({ item, expanded, onToggle }: { item: Check; expanded: boolean; onToggle: () => void }) {
  const healthy = item.status === "healthy";
  const highUsage = item.status === "high_usage";
  return <>
    <tr className="align-top hover:bg-surface-raised/50"><td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-semibold ${healthy ? "bg-success/10 text-success" : highUsage ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"}`}>{healthy ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}{item.status.replaceAll("_", " ")}</span><span className="mt-1 block text-[10px] text-muted">{item.trigger}</span></td><td className="px-4 py-3 font-medium">{contextText(item.context)}</td><td className="max-w-64 px-4 py-3"><p className="truncate font-mono text-[10px]" title={item.endpoint}>{item.method} {item.endpoint}</p></td><td className="px-4 py-3"><p>{item.http_status ? `HTTP ${item.http_status}` : "No response"}</p><p className="mt-1 text-[10px] text-muted">{item.duration_ms.toLocaleString()} ms{item.usage_percent === null ? "" : ` · ${item.usage_percent}% usage`}</p>{item.queue_depth !== null && <p className="mt-1 text-[10px] text-muted">Queue: {item.queue_depth}</p>}</td><td className="px-4 py-3"><p className="capitalize">{item.notification_status.replaceAll("_", " ")}</p><p className="mt-1 text-[10px] text-muted">{item.notification_recipient_count} delivered</p></td><td className="whitespace-nowrap px-4 py-3">{dateTime(item.checked_at)}</td><td className="px-4 py-3"><button type="button" onClick={onToggle} className="rounded border border-brand-border px-2 py-1 text-[10px] text-muted hover:text-text">{expanded ? "Hide" : "View"}</button></td></tr>
    {expanded && <tr className="bg-surface-raised/40"><td colSpan={7} className="px-4 py-4"><div className="grid gap-4 lg:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Result</p><pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-brand-border bg-surface p-3 font-mono text-[11px] leading-5">{item.error_message || item.response_body || "The endpoint returned no response body."}</pre></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Notification delivery</p><pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-brand-border bg-surface p-3 font-mono text-[11px] leading-5">{item.notification_error || `${item.notification_recipient_count} email acknowledgement(s) delivered successfully.`}</pre>{item.error_code && <p className="mt-2 text-[10px] text-danger">Error code: {item.error_code}</p>}</div></div></td></tr>}
  </>;
}
