"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Copy, Terminal } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export type CurlStep = { title: string; command: string; note?: string };

/** Placeholder the user replaces with a key from /platform/api-keys. */
export const CURL_KEY_VAR = "$EBMA_API_KEY";
export const CURL_BASE_URL = API_BASE_URL;

/** Quotes a value for a single-quoted bash argument. */
export const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

export const curlAuthHeader = `-H "Authorization: Bearer ${CURL_KEY_VAR}"`;

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-border bg-surface px-2.5 py-1.5 text-[12px] text-muted hover:bg-surface-raised hover:text-text"
    >
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function CurlSnippet({ steps, description, defaultOpen = false }: { steps: CurlStep[]; description: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const setup = `export EBMA_API_KEY=ebma_sk_your_key`;
  const all = [setup, ...steps.map((s) => `# ${s.title}\n${s.command}`)].join("\n\n");

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex w-full items-center gap-3 rounded-xl px-1.5 py-2 text-left transition-colors hover:bg-brand-soft"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-brand-border bg-brand-soft text-accent transition-colors group-hover:border-accent/40">
          <Terminal size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-text">Developer</span>
          <span className="block truncate text-[11px] text-muted">API endpoint and cURL examples</span>
        </span>
        <ChevronDown size={15} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-brand-border bg-brand-soft p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="max-w-2xl text-[12px] leading-relaxed text-muted">
              {description} Create a key on the{" "}
              <Link href="/platform/api-keys" className="text-accent hover:text-text">
                API Keys
              </Link>{" "}
              page and run <code className="font-mono text-muted">{setup}</code> first.
            </p>
            <CopyButton value={all} label="Copy all" />
          </div>
          <div className="mt-4 space-y-4">
            {steps.map((step) => (
              <div key={step.title}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] font-semibold tracking-wider text-accent">
                    cURL · {step.title}
                  </span>
                  <CopyButton value={step.command} label="Copy" />
                </div>
                <pre className="overflow-x-auto rounded-lg border border-brand-border bg-surface p-3 font-mono text-[12px] leading-6 text-muted">
                  {step.command}
                </pre>
                {step.note && <p className="mt-1.5 text-[11px] text-accent">{step.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
