"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function AdminPlaceholder({ title, description }: { title: string; description: string }) {
  const router = useRouter();
  const { user, ready } = useAuth();
  useEffect(() => { if (ready && user?.role !== "superAdmin") router.replace("/platform"); }, [ready, user, router]);
  if (!ready || user?.role !== "superAdmin") return null;
  return <main className="mx-auto max-w-6xl text-text"><p className="font-mono text-[11px] tracking-[.24em] text-accent">CONTROL PANEL</p><h1 className="mt-3 text-4xl font-extrabold text-text">{title}</h1><p className="mt-3 text-sm text-muted">{description}</p><section className="mt-8 rounded-2xl border border-brand-border bg-surface p-8"><Settings2 className="text-accent" size={24} /><h2 className="mt-5 text-lg font-bold text-text">Module foundation ready</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">This module is protected by the superadmin role. Its data model and Stripe workflow will be enabled after the corresponding provider credentials and business rules are configured.</p></section></main>;
}
