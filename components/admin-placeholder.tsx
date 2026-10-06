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
  return <main className="mx-auto max-w-6xl text-[#d7def0]"><p className="font-mono text-[11px] tracking-[.24em] text-[#8f82ff]">CONTROL PANEL</p><h1 className="mt-3 text-4xl font-extrabold text-white">{title}</h1><p className="mt-3 text-sm text-[#8995b3]">{description}</p><section className="mt-8 rounded-2xl border border-[#202846] bg-[#0c1225] p-8"><Settings2 className="text-[#9a8cf7]" size={24} /><h2 className="mt-5 text-lg font-bold text-white">Module foundation ready</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#8995b3]">This module is protected by the superadmin role. Its data model and Stripe workflow will be enabled after the corresponding provider credentials and business rules are configured.</p></section></main>;
}
