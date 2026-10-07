"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { API_BASE_URL, errorMessage } from "@/lib/api";
import { apiKeysApi, type ApiKeyRecord, type ApiKeyScope, type CreatedApiKey } from "@/lib/api-keys/api";

const scopeLabels: Record<ApiKeyScope, string> = { stt: "Speech to text", tts: "Text to speech", llm: "LLM / chat" };
const expiryOptions = [{ label: "Never", value: "" }, { label: "30 days", value: "30" }, { label: "90 days", value: "90" }, { label: "1 year", value: "365" }];
const inputClass = "h-11 rounded-lg border border-brand-border bg-brand-soft px-3 text-sm text-text outline-none";

const formatDate = (value: string | null) => value ? new Date(value).toLocaleString() : "—";

function keyStatus(key: ApiKeyRecord) {
  if (key.revoked_at) return { label: "Revoked", className: "border-brand-border text-danger" };
  if (key.expires_at && new Date(key.expires_at) < new Date()) return { label: "Expired", className: "border-warning-border text-warning" };
  return { label: "Active", className: "border-success-border text-success" };
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  return <button onClick={() => void copy()} className="flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-soft px-3 py-2 text-xs font-semibold text-text hover:border-brand-border">{copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}{copied ? "Copied" : label}</button>;
}

export function ApiKeysPage() {
  const { user, ready } = useAuth(); const router = useRouter();
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [name, setName] = useState(""); const [scopes, setScopes] = useState<ApiKeyScope[]>(["stt", "tts", "llm"]); const [expiry, setExpiry] = useState(""); const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [editing, setEditing] = useState<string | null>(null); const [editName, setEditName] = useState("");

  useEffect(() => { if (ready && !user) router.replace("/"); }, [ready, user, router]);
  const load = useCallback(async () => { try { setKeys(await apiKeysApi.list()); setError(""); } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); } }, []);
  useEffect(() => { if (ready && user) void load(); }, [ready, user, load]);

  const toggleScope = (scope: ApiKeyScope) => setScopes(current => current.includes(scope) ? current.filter(s => s !== scope) : [...current, scope]);
  const create = async () => {
    setCreating(true); setError("");
    try { const key = await apiKeysApi.create({ name: name.trim(), scopes, expiresInDays: expiry ? Number(expiry) : undefined }); setCreated(key); setName(""); await load(); }
    catch (err) { setError(errorMessage(err)); } finally { setCreating(false); }
  };
  const rename = async (keyUuid: string) => { try { await apiKeysApi.rename(keyUuid, editName.trim()); setEditing(null); await load(); } catch (err) { setError(errorMessage(err)); } };
  const revoke = async (key: ApiKeyRecord) => {
    if (!window.confirm(`Revoke "${key.name}"? Apps using this key will stop working immediately.`)) return;
    try { await apiKeysApi.revoke(key.key_uuid); await load(); } catch (err) { setError(errorMessage(err)); }
  };

  if (!ready || !user) return null;
  const sampleKey = created?.secret ?? "ebma_sk_your_key";
  const curl = `curl -X POST ${API_BASE_URL}/tts/generations \\\n  -H "Authorization: Bearer ${sampleKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"text":"नमस्ते, आप कैसे हैं?","language":"hi","voiceMode":"default","outputFormat":"wav"}'`;

  return <main className="mx-auto w-full max-w-none text-text">
    <p className="font-mono text-[11px] tracking-[.24em] text-accent">WORKSPACE / DEVELOPERS</p>
    <h1 className="mt-3 text-4xl font-extrabold text-text">API keys</h1>
    <p className="mt-3 text-sm text-muted">Call EBMA speech, voice and LLM APIs from your own apps. Usage is charged to your wallet.</p>

    {error && <p className="mt-6 rounded-lg border border-brand-border bg-brand-soft px-4 py-3 text-sm text-danger">{error}</p>}

    {created && <section className="mt-6 rounded-2xl border border-brand-border bg-brand-soft p-6">
      <div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 shrink-0 text-warning" size={18} /><div><p className="text-sm font-semibold text-text">Copy your new key now</p><p className="mt-1 text-xs text-muted">For security, &ldquo;{created.name}&rdquo; will not be shown again. Store it in a secret manager, never in browser code.</p></div></div>
      <div className="mt-4 flex flex-wrap items-center gap-3"><code className="min-w-0 flex-1 break-all rounded-lg border border-brand-border bg-brand-soft px-3 py-2.5 font-mono text-xs text-text">{created.secret}</code><CopyButton value={created.secret} /><button onClick={() => setCreated(null)} className="rounded-lg px-3 py-2 text-xs text-muted hover:text-text">Done</button></div>
    </section>}

    <section className="mt-6 rounded-2xl border border-brand-border bg-brand-soft p-6">
      <h2 className="font-bold text-text">Create a key</h2>
      <div className="mt-4 grid gap-5 md:grid-cols-[2fr_1fr]">
        <label className="grid gap-2 text-xs text-muted">Name<input value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="e.g. Production call-center bot" className={inputClass} /></label>
        <label className="grid gap-2 text-xs text-muted">Expires<select value={expiry} onChange={e => setExpiry(e.target.value)} className={inputClass}>{expiryOptions.map(o => <option key={o.label} value={o.value}>{o.label}</option>)}</select></label>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-4"><span className="text-xs text-muted">Access</span>{(Object.keys(scopeLabels) as ApiKeyScope[]).map(scope => <label key={scope} className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)} className="accent-accent" />{scopeLabels[scope]}</label>)}</div>
      <div className="mt-6 flex justify-end"><button onClick={() => void create()} disabled={creating || !name.trim() || !scopes.length} className="flex items-center gap-2 rounded-lg bg-brand-soft px-5 py-2.5 text-xs font-semibold text-text disabled:opacity-50"><Plus size={15} />{creating ? "Creating…" : "Create key"}</button></div>
    </section>

    <section className="mt-6 overflow-hidden rounded-2xl border border-brand-border bg-brand-soft">
      <div className="border-b border-brand-border px-6 py-4"><h2 className="font-bold text-text">Your keys</h2></div>
      {loading ? <p className="px-6 py-8 text-sm text-muted">Loading…</p> : !keys.length ? <div className="flex flex-col items-center px-6 py-10 text-center"><KeyRound className="text-accent" size={26} /><p className="mt-3 text-sm text-muted">No API keys yet. Create one to start building.</p></div> :
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-accent"><tr><th className="px-6 py-3 font-semibold">Name</th><th className="px-3 py-3 font-semibold">Key</th><th className="px-3 py-3 font-semibold">Access</th><th className="px-3 py-3 font-semibold">Last used</th><th className="px-3 py-3 font-semibold">Expires</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-6 py-3" /></tr></thead>
          <tbody>{keys.map(key => { const status = keyStatus(key); const usable = !key.revoked_at; return <tr key={key.key_uuid} className="border-t border-brand-border">
            <td className="px-6 py-3">{editing === key.key_uuid ? <div className="flex gap-2"><input value={editName} onChange={e => setEditName(e.target.value)} maxLength={100} className="h-8 w-44 rounded-md border border-brand-border bg-brand-soft px-2 text-sm text-text outline-none" autoFocus /><button onClick={() => void rename(key.key_uuid)} disabled={!editName.trim()} className="text-xs font-semibold text-accent disabled:opacity-50">Save</button><button onClick={() => setEditing(null)} className="text-xs text-muted">Cancel</button></div> : <span className="font-semibold text-text">{key.name}</span>}</td>
            <td className="px-3 py-3 font-mono text-xs text-muted">{key.prefix}</td>
            <td className="px-3 py-3 text-xs text-muted">{key.scopes.map(s => s.toUpperCase()).join(", ")}</td>
            <td className="px-3 py-3 text-xs text-muted">{formatDate(key.last_used_at)}</td>
            <td className="px-3 py-3 text-xs text-muted">{key.expires_at ? formatDate(key.expires_at) : "Never"}</td>
            <td className="px-3 py-3"><span className={`rounded border px-2 py-0.5 text-[11px] ${status.className}`}>{status.label}</span></td>
            <td className="px-6 py-3">{usable && <div className="flex justify-end gap-3"><button title="Rename" onClick={() => { setEditing(key.key_uuid); setEditName(key.name); }} className="text-muted hover:text-text"><Pencil size={15} /></button><button title="Revoke" onClick={() => void revoke(key)} className="text-muted hover:text-danger"><Trash2 size={15} /></button></div>}</td>
          </tr>; })}</tbody>
        </table></div>}
    </section>

    <section className="mt-6 rounded-2xl border border-brand-border bg-brand-soft p-6">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-text">Quick start</h2><p className="mt-1 text-xs text-muted">Send the key as a Bearer token. Keys work on speech-to-text, text-to-speech and chat endpoints.</p></div><CopyButton value={curl} label="Copy cURL" /></div>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-brand-border bg-brand-soft p-4 font-mono text-xs leading-6 text-muted">{curl}</pre>
    </section>
  </main>;
}
