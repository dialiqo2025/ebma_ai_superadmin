"use client";

import Link from "next/link";
import { Activity, CreditCard, Settings2, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

const modules = [
  { title: "Users", description: "Manage registered accounts, access, and status.", href: "/platform/admin/users", icon: Users },
  { title: "Usage settings", description: "Configure TTS, STT, and LLM credit rates.", href: "/platform/admin/usage-settings", icon: Settings2 },
  { title: "Plans & pricing", description: "Manage credit packages and Stripe checkout.", href: "/platform/admin/plans", icon: CreditCard },
  { title: "Subscriptions", description: "Review active plans and plan history.", href: "/platform/admin/subscriptions", icon: Activity },
  { title: "Transactions", description: "Review payments, credits, and refunds.", href: "/platform/admin/transactions", icon: ShieldCheck },
];

export function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<{ total_users: number; total_active_users: number } | null>(null);
  useEffect(() => { if (user && user.role !== "superAdmin") router.replace("/platform"); }, [user, router]);
  useEffect(() => { if (user?.role === "superAdmin") void apiRequest<typeof stats>("/user/summary", { auth: true }).then(setStats).catch(() => undefined); }, [user]);
  if (!user || user.role !== "superAdmin") return null;
  return <main className="mx-auto max-w-6xl text-[#d7def0]"><div className="mb-8"><p className="font-mono text-[11px] tracking-[.24em] text-[#8f82ff]">CONTROL PANEL</p><h1 className="mt-3 text-4xl font-extrabold text-white">Superadmin console</h1><p className="mt-3 text-sm text-[#8995b3]">Manage EBMA users, usage policy, plans, and billing operations.</p><p className="mt-2 text-xs text-[#74809e]">Signed in as {user.email}</p></div><div className="mb-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#202846] bg-[#0c1225] p-4"><p className="text-xs text-[#74809e]">Registered users</p><p className="mt-2 text-2xl font-bold text-white">{stats?.total_users ?? "—"}</p></div><div className="rounded-xl border border-[#202846] bg-[#0c1225] p-4"><p className="text-xs text-[#74809e]">Active users</p><p className="mt-2 text-2xl font-bold text-emerald-300">{stats?.total_active_users ?? "—"}</p></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{modules.map(({ title, description, href, icon: Icon }) => <Link key={title} href={href} className="group rounded-2xl border border-[#202846] bg-[#0c1225] p-5 transition hover:-translate-y-0.5 hover:border-[#6558e9] hover:bg-[#101832]"><Icon size={22} className="text-[#9a8cf7]" /><h2 className="mt-5 font-bold text-white">{title}</h2><p className="mt-2 text-sm leading-6 text-[#8995b3]">{description}</p><span className="mt-5 inline-block text-xs font-semibold text-[#a99af3] group-hover:text-white">Open module →</span></Link>)}</div></main>;
}
