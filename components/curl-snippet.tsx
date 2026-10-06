"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Copy, Terminal } from "lucide-react";
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
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#2a3552] px-2.5 py-1.5 text-[12px] text-[#9aa5b8] hover:bg-[#101830] hover:text-white"
    >
      {copied ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function CurlSnippet({ steps, description, defaultOpen = false }: { steps: CurlStep[]; description: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const setup = `export EBMA_API_KEY=ebma_sk_your_key`;
  const all = [setup, ...steps.map((s) => `# ${s.title}\n${s.command}`)].join("\n\n");

  return (
    <div className="mt-5 rounded-xl border border-[#1b2540] bg-[#080e20]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-[#8b98ae] hover:text-white"
      >
        <ChevronRight size={14} className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        <Terminal size={14} className="shrink-0" />
        CURL REQUEST
      </button>
      {open && (
        <div className="border-t border-[#1b2540] px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="max-w-2xl text-[12px] leading-relaxed text-[#8b98ae]">
              {description} Create a key on the{" "}
              <Link href="/platform/api-keys" className="text-[#a99af3] hover:text-white">
                API keys
              </Link>{" "}
              page and run <code className="font-mono text-[#c9d1e8]">{setup}</code> first.
            </p>
            <CopyButton value={all} label="Copy all" />
          </div>
          <div className="mt-4 space-y-4">
            {steps.map((step, index) => (
              <div key={step.title}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] tracking-wider text-[#5b6b85]">
                    {index + 1}. {step.title.toUpperCase()}
                  </span>
                  <CopyButton value={step.command} label="Copy" />
                </div>
                <pre className="overflow-x-auto rounded-lg border border-[#1b2540] bg-[#060b1d] p-3 font-mono text-[12px] leading-6 text-[#c9d1e8]">
                  {step.command}
                </pre>
                {step.note && <p className="mt-1.5 text-[11px] text-[#6b7a94]">{step.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
