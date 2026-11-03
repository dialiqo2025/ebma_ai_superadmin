"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, Coins, Cpu, Download, FileAudio, FileJson, Globe2, ReceiptText, User } from "lucide-react";
import { apiBlob, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Stage = {
  id: string; type: "lifecycle" | "api" | "gpu" | "billing"; name: string; status: string;
  startedAt: string; completedAt: string; durationMs: number; endpoint: string | null; description: string;
  request: unknown; response: unknown; httpStatus?: number | null; errorCode?: string | null; errorMessage?: string | null;
  artifactLogUuid?: string | null; artifactOriginalName?: string | null;
};
type Details = {
  operation: {
    operationUuid: string; service: "stt" | "tts"; operationType: string; status: string; rawStatus: string;
    userEmail: string | null; userName: string | null; requestId: string | null; providerReference: string | null;
    createdAt: string; startedAt: string; completedAt: string | null; totalDurationMs: number;
    errorCode: string | null; errorMessage: string | null; metrics: Record<string, unknown>; input: unknown; output: unknown;
    resultAvailable: boolean; transcriptAvailable?: boolean; apiResultAvailable?: boolean;
  };
  billing: { totalCredits: number; items: Array<{ usageUuid: string; usageType: string; quantity: number; unitPriceCredits: number; chargedCredits: number; metadata: unknown; createdAt: string }> };
  stages: Stage[];
  related: { apiCalls: number; gpuCalls: number; billingEvents: number };
};

const json = (value: unknown) => value == null ? "No data" : JSON.stringify(value, null, 2);
const elapsed = (ms: number) => ms < 1000 ? `${ms} ms` : ms < 60_000 ? `${(ms / 1000).toFixed(2)} sec` : `${(ms / 60_000).toFixed(2)} min`;
const bytes = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) { amount /= 1024; unit += 1; }
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: unit === 0 ? 0 : 2 })} ${units[unit]}`;
};
const metric = (key: string, value: unknown) => {
  if (value == null) return "—";
  if (typeof value === "number" && key.toLowerCase().includes("bytes")) return bytes(value);
  return typeof value === "number" ? value.toLocaleString() : String(value);
};

export function AdminGpuOperationDetails({ service, operationUuid }: { service: string; operationUuid: string }) {
  const { user, ready } = useAuth();
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (user?.role !== "superAdmin") return;
    void apiRequest<Details>(`/observability/gpu-operations/${service}/${operationUuid}`, { auth: true })
      .then(setDetails).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load operation trace"));
  }, [user, service, operationUuid]);
  if (!ready || user?.role !== "superAdmin") return null;
  if (error) return <main className="mx-auto max-w-5xl"><Link href="/platform/admin/gpu-logs" className="text-xs text-accent">← GPU Operations</Link><p className="mt-6 rounded-xl border border-danger-border bg-danger-soft p-4 text-sm text-danger">{error}</p></main>;
  if (!details) return <div className="py-20 text-center text-sm text-muted">Loading operation trace…</div>;
  const operation = details.operation;

  const download = async (stage: Stage) => {
    if (!stage.artifactLogUuid) return;
    try {
      const blob = await apiBlob(`/observability/gpu-transactions/${stage.artifactLogUuid}/artifact`);
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = stage.artifactOriginalName || "uploaded-source"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to download source file"); }
  };
  const downloadResult = async (format?: "txt" | "json") => {
    try {
      const suffix = format === "json" ? "?format=json" : "";
      const blob = await apiBlob(`/observability/gpu-operations/${operation.service}/${operation.operationUuid}/result${suffix}`);
      const url = URL.createObjectURL(blob);
      const extension = operation.service === "stt" ? format ?? "txt" : String(operation.metrics.outputFormat || "wav");
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${operation.service}-result-${operation.operationUuid}.${extension}`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to download result file"); }
  };

  return <main className="mx-auto w-full max-w-[1280px] text-text">
    <Link href="/platform/admin/gpu-logs" className="inline-flex items-center gap-2 text-xs text-muted hover:text-accent"><ArrowLeft size={14} /> GPU Operations</Link>
    <div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-[11px] tracking-[.22em] text-accent">{operation.service.toUpperCase()} / {operation.operationType.toUpperCase()}</p><h1 className="mt-2 text-3xl font-extrabold">Operation flow</h1><p className="mt-2 break-all font-mono text-[11px] text-muted">{operation.operationUuid}</p></div><div className="flex items-center gap-2">{operation.service === "tts" && operation.resultAvailable && <button onClick={() => void downloadResult()} className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-surface px-3 py-2 text-xs font-semibold text-accent hover:bg-brand-soft"><Download size={14} /> Download generated audio</button>}<span className={`rounded-full px-3 py-1.5 text-xs font-bold ${operation.status === "success" ? "bg-success/10 text-success" : operation.status === "failed" ? "bg-danger-soft text-danger" : "bg-warning/10 text-warning"}`}>{operation.rawStatus}</span></div></div>
    {operation.errorMessage && <p className="mt-4 rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger"><AlertCircle size={15} className="mr-2 inline" />{operation.errorMessage}</p>}
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Summary icon={User} label="User" value={operation.userName || "Unknown"} detail={operation.userEmail || "No email"} />
      <Summary icon={Clock3} label="End-to-end duration" value={elapsed(operation.totalDurationMs)} detail={`${new Date(operation.createdAt).toLocaleString()} requested`} />
      <Summary icon={Coins} label="Credits charged" value={`${details.billing.totalCredits.toLocaleString(undefined, { maximumFractionDigits: 6 })} cr`} detail={`${details.billing.items.length} billing event(s)`} />
      <Summary icon={Cpu} label="Related calls" value={`${details.related.apiCalls} API · ${details.related.gpuCalls} GPU`} detail={`${details.stages.length} total timeline stages`} />
    </div>

    <section className="mt-5 rounded-2xl border border-brand-border bg-surface p-5"><h2 className="text-base font-bold">Request measurements</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(operation.metrics).map(([key, value]) => <div key={key} className="rounded-xl border border-brand-border bg-surface-raised p-3"><p className="text-[9px] font-semibold uppercase tracking-wider text-muted">{key.replace(/([A-Z])/g, " $1")}</p><p className="mt-2 break-words text-sm font-bold" title={typeof value === "number" && key.toLowerCase().includes("bytes") ? `${value.toLocaleString()} bytes` : undefined}>{metric(key, value)}</p></div>)}</div></section>

    <section className="mt-5 rounded-2xl border border-brand-border bg-surface p-5"><div className="flex items-center justify-between"><div><h2 className="text-base font-bold">Stage-by-stage timeline</h2><p className="mt-1 text-xs text-muted">Chronological lifecycle, API, GPU, and billing events.</p></div></div><div className="mt-6 space-y-0">{details.stages.map((stage, index) => <StageCard key={stage.id} stage={stage} index={index} last={index === details.stages.length - 1} onDownload={() => void download(stage)} />)}</div></section>

    <FinalOutput operation={operation} onDownload={downloadResult} />

    <section className="mt-5 rounded-2xl border border-brand-border bg-surface p-5"><h2 className="text-base font-bold">Credit calculation</h2><p className="mt-1 text-xs text-muted">Auditable billing ledger entries associated with this operation.</p><div className="mt-4 overflow-x-auto rounded-xl border border-brand-border"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-surface-raised text-[9px] uppercase text-muted"><tr><th className="px-3 py-2">Charged at</th><th className="px-3 py-2">Usage type</th><th className="px-3 py-2">Quantity</th><th className="px-3 py-2">Unit rate</th><th className="px-3 py-2">Calculation</th><th className="px-3 py-2">Credits</th></tr></thead><tbody className="divide-y divide-brand-border">{details.billing.items.map((item) => <tr key={item.usageUuid}><td className="px-3 py-3">{new Date(item.createdAt).toLocaleString()}</td><td className="px-3 py-3 font-semibold">{item.usageType}</td><td className="px-3 py-3">{item.quantity.toLocaleString()}</td><td className="px-3 py-3">{item.unitPriceCredits.toFixed(6)} cr</td><td className="px-3 py-3 font-mono text-[10px]">{item.quantity} × {item.unitPriceCredits}</td><td className="px-3 py-3 font-bold text-accent">{item.chargedCredits.toLocaleString(undefined, { maximumFractionDigits: 6 })} cr</td></tr>)}{!details.billing.items.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">No credits were charged for this operation.</td></tr>}</tbody></table></div></section>
  </main>;
}

function Summary({ icon: Icon, label, value, detail }: { icon: typeof User; label: string; value: string; detail: string }) { return <div className="flex gap-3 rounded-xl border border-brand-border bg-surface p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-accent"><Icon size={17} /></span><div className="min-w-0"><p className="text-[10px] text-muted">{label}</p><p className="mt-1 truncate text-sm font-bold">{value}</p><p className="mt-1 truncate text-[9px] text-muted">{detail}</p></div></div>; }

function FinalOutput({ operation, onDownload }: { operation: Details["operation"]; onDownload: (format?: "txt" | "json") => Promise<void> }) {
  if (operation.service === "tts") {
    return <section className="mt-5 rounded-2xl border border-brand-border bg-surface p-5"><h2 className="text-base font-bold">Generated output</h2><p className="mt-1 text-xs text-muted">Final audio returned by the TTS operation.</p>{operation.resultAvailable ? <button onClick={() => void onDownload()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white"><Download size={14} /> Download generated audio</button> : <p className="mt-4 rounded-lg bg-surface-raised p-3 text-xs text-muted">Generated audio is not available for this operation.</p>}</section>;
  }
  const output = operation.output && typeof operation.output === "object" ? operation.output as { transcript?: unknown; result?: unknown } : {};
  const transcript = typeof output.transcript === "string" ? output.transcript.trim() : "";
  return <section className="mt-5 rounded-2xl border border-brand-border bg-surface p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-bold">Generated transcription output</h2><p className="mt-1 text-xs text-muted">Download the readable transcript or the complete GPU API response.</p></div><div className="flex flex-wrap gap-2">{operation.transcriptAvailable && <button onClick={() => void onDownload("txt")} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white"><Download size={14} /> Download transcript (.txt)</button>}{operation.apiResultAvailable && <button onClick={() => void onDownload("json")} className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-surface px-4 py-2 text-xs font-semibold text-accent"><FileJson size={14} /> Download API result (.json)</button>}</div></div>{transcript ? <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-brand-border bg-surface-raised p-4 text-xs leading-5 text-text">{transcript}</pre> : operation.apiResultAvailable ? <p className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-4 text-xs text-warning">The GPU completed this operation but returned no transcript text or segments. The original API result is still available as a JSON download for investigation.</p> : <p className="mt-4 rounded-xl bg-surface-raised p-4 text-xs text-muted">No generated transcription output is available yet.</p>}</section>;
}

function StageCard({ stage, index, last, onDownload }: { stage: Stage; index: number; last: boolean; onDownload: () => void }) {
  const Icon = stage.type === "api" ? Globe2 : stage.type === "gpu" ? Cpu : stage.type === "billing" ? ReceiptText : FileAudio;
  return <div className="relative grid grid-cols-[34px_1fr] gap-3 pb-5">{!last && <span className="absolute left-[16px] top-8 h-[calc(100%-1rem)] w-px bg-brand-border" />}<span className={`z-10 grid h-8 w-8 place-items-center rounded-full border ${stage.status === "failed" ? "border-danger-border bg-danger-soft text-danger" : "border-success/30 bg-success/10 text-success"}`}><Icon size={14} /></span><article className="rounded-xl border border-brand-border bg-surface-raised p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-widest text-muted">Step {index + 1} · {stage.type}</p><h3 className="mt-1 text-sm font-bold">{stage.name}</h3><p className="mt-1 text-xs text-muted">{stage.description}</p></div><div className="text-right"><p className="text-[10px] font-semibold">{elapsed(stage.durationMs)}</p><p className="mt-1 text-[9px] text-muted">{new Date(stage.startedAt).toLocaleString()}</p></div></div>{stage.endpoint && <p className="mt-3 break-all rounded-lg border border-brand-border bg-bg px-3 py-2 font-mono text-[9px] text-muted">{stage.endpoint}{stage.httpStatus ? ` · HTTP ${stage.httpStatus}` : ""}</p>}{(stage.errorCode || stage.errorMessage) && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-[10px] text-danger">{stage.errorCode || "Error"}: {stage.errorMessage}</p>}<div className="mt-3 flex flex-wrap items-center gap-2">{stage.artifactLogUuid && <button onClick={onDownload} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-surface px-2.5 py-1.5 text-[10px] font-semibold text-accent"><Download size={12} /> {stage.artifactOriginalName || "Uploaded source"}</button>}<details><summary className="cursor-pointer text-[10px] font-semibold text-accent">Request & response</summary><div className="mt-3 grid gap-3 lg:grid-cols-2"><Data title="Request" value={stage.request} /><Data title="Response" value={stage.response} /></div></details></div></article></div>;
}

function Data({ title, value }: { title: string; value: unknown }) { return <div><p className="mb-1 text-[9px] font-semibold uppercase text-muted">{title}</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-brand-border bg-bg p-3 font-mono text-[9px] leading-4 text-muted">{json(value)}</pre></div>; }
