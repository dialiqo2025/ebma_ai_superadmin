"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { capabilitiesApi, type Capabilities } from "@/lib/billing/capabilities";
import { billingApi, type BillingSummary } from "@/lib/billing/api";

type UsageGateValue = {
  ready: boolean;
  blocked: boolean;
  creditsLocked: boolean;
  capabilityLocked: boolean;
};

const UsageGateContext = createContext<UsageGateValue>({
  ready: false,
  blocked: false,
  creditsLocked: false,
  capabilityLocked: false,
});

export function useUsageGate() {
  return useContext(UsageGateContext);
}

export function CapabilityNotice({
  capability,
  children,
}: {
  capability: "stt" | "tts" | "llm";
  children: ReactNode;
}) {
  const [data, setData] = useState<Capabilities | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);

  useEffect(() => {
    void capabilitiesApi.get().then(setData).catch(() => undefined);
  }, []);
  useEffect(() => {
    void billingApi.summary().then(setBilling).catch(() => undefined);
  }, []);

  const capabilityLocked = Boolean(data && !data.capabilities[capability]);
  const creditsLocked = Boolean(billing && billing.balanceCredits <= 0);
  const blocked = capabilityLocked || creditsLocked;
  const ready = Boolean(data && billing);

  const value = useMemo<UsageGateValue>(
    () => ({
      ready,
      blocked,
      creditsLocked,
      capabilityLocked,
    }),
    [ready, blocked, creditsLocked, capabilityLocked],
  );

  const planHref = creditsLocked
    ? "/platform/plans?kind=wallet_topup"
    : "/platform/plans?kind=service";

  return (
    <UsageGateContext.Provider value={value}>
      {blocked && (
        <div className="mx-auto mb-4 flex max-w-6xl items-start justify-between gap-4 rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning">
          <div className="flex items-start gap-3">
            <LockKeyhole size={17} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">
                {creditsLocked
                  ? "Your credits are exhausted"
                  : `${capability.toUpperCase()} is not included in your current plan`}
              </p>
              <p className="mt-1 text-xs text-warning">
                {creditsLocked
                  ? "Recharge your wallet or choose a service plan to continue. Actions below are disabled until credits are available."
                  : "You can view this module, but actions are disabled until you upgrade your plan."}
              </p>
            </div>
          </div>
          <Link
            href={planHref}
            className="shrink-0 rounded-lg bg-brand-soft px-3 py-2 text-xs font-semibold text-text hover:bg-brand-soft"
          >
            {creditsLocked ? "Recharge" : "View plans"}
          </Link>
        </div>
      )}
      {children}
    </UsageGateContext.Provider>
  );
}
