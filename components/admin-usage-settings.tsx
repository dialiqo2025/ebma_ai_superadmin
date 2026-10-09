"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Save } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function AdminUsageSettings() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [credits, setCredits] = useState("1000");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && user?.role !== "superAdmin") router.replace("/platform");
  }, [ready, user, router]);

  useEffect(() => {
    if (!ready || user?.role !== "superAdmin") return;
    void apiRequest<{ credits: number }>("/billing/admin/signup-free-credits", { auth: true })
      .then((result) => setCredits(String(result.credits)))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load setting"))
      .finally(() => setLoading(false));
  }, [ready, user]);

  const save = async () => {
    if (!credits.trim()) {
      setError("Enter the free credit amount to grant new accounts.");
      setMessage("");
      return;
    }
    const value = Number(credits);
    if (!Number.isFinite(value) || value < 0 || value > 1_000_000_000) {
      setError("Enter a value from 0 to 1,000,000,000 credits.");
      setMessage("");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest<{ credits: number }>("/billing/admin/signup-free-credits", {
        method: "PUT",
        auth: true,
        body: { credits: value },
      });
      setCredits(String(result.credits));
      setMessage("Free signup credits saved. New accounts will receive this amount.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save setting");
    } finally {
      setSaving(false);
    }
  };

  if (!ready || user?.role !== "superAdmin") return null;

  return (
    <main className="mx-auto w-full max-w-3xl text-text">
      <p className="font-mono text-[11px] tracking-[.24em] text-accent">CONTROL PANEL</p>
      <h1 className="mt-3 text-4xl font-extrabold text-text">Usage settings</h1>
      <p className="mt-3 text-sm text-muted">
        Set the one-time free wallet credit grant for newly registered users.
      </p>

      <section className="mt-8 rounded-2xl border border-brand-border bg-surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand-border text-accent">
            <Coins size={18} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-text">Free credits for new accounts</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Each new user receives this balance when their wallet is created after email verification.
              The credits are used and billed through the existing wallet flow.
            </p>
          </div>
        </div>

        <label className="mt-6 block max-w-sm text-xs font-medium text-muted" htmlFor="signup-free-credits">
          Credits granted
          <div className="mt-2 flex h-11 items-center rounded-lg border border-brand-border bg-surface focus-within:border-accent">
            <input
              id="signup-free-credits"
              type="number"
              min="0"
              max="1000000000"
              step="0.01"
              value={credits}
              disabled={loading || saving}
              onChange={(event) => setCredits(event.target.value)}
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-text outline-none"
            />
            <span className="px-3 text-xs text-muted">credits</span>
          </div>
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={loading || saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-gradient px-4 text-sm font-semibold text-on-brand hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={15} /> {saving ? "Saving…" : "Save setting"}
          </button>
          {message && <p role="status" className="text-sm text-success">{message}</p>}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
        <p className="mt-4 border-t border-brand-border pt-4 text-xs leading-relaxed text-muted">
          This setting applies to wallets created after it is saved. Existing wallet balances are not changed.
          Service credit rates remain configured on each plan.
        </p>
      </section>
    </main>
  );
}
