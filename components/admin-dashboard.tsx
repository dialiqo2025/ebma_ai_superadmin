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
  return <main className="mx-auto max-w-6xl text-text"><div className="mb-8"><p className="font-mono text-[11px] tracking-[.24em] text-accent">CONTROL PANEL</p><h1 className="mt-3 text-4xl font-extrabold text-text">Superadmin console</h1><p className="mt-3 text-sm text-muted">Manage EBMA users, usage policy, plans, and billing operations.</p><p className="mt-2 text-xs text-accent">Signed in as {user.email}</p></div><div className="mb-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-brand-border bg-surface p-4"><p className="text-xs text-accent">Registered users</p><p className="mt-2 text-2xl font-bold text-text">{stats?.total_users ?? "—"}</p></div><div className="rounded-xl border border-brand-border bg-surface p-4"><p className="text-xs text-accent">Active users</p><p className="mt-2 text-2xl font-bold text-success">{stats?.total_active_users ?? "—"}</p></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{modules.map(({ title, description, href, icon: Icon }) => <Link key={title} href={href} className="group rounded-2xl border border-brand-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand-border hover:bg-surface-raised"><Icon size={22} className="text-accent" /><h2 className="mt-5 font-bold text-text">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{description}</p><span className="mt-5 inline-block text-xs font-semibold text-accent group-hover:text-text">Open module →</span></Link>)}</div></main>;
}
