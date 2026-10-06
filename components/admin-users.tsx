"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, CreditCard, Search, UserPlus, X } from "lucide-react";
import { apiRequest } from "@/lib/api";
import {
  billingApi,
  type AdminUserWallet,
  type BillingPlan,
} from "@/lib/billing/api";
import { useAuth } from "@/lib/auth";

type AdminUser = {
  user_uuid: string;
  fullName: string;
  email: string;
  role: string;
  user_enabled: boolean;
};

type UserResponse = { data: AdminUser[]; total_users_count: number };

type FormState = {
  fullName: string;
  email: string;
  password: string;
  role: "user" | "admin" | "tenant";
  isActive: boolean;
};

const emptyForm: FormState = {
  fullName: "",
  email: "",
  password: "",
  role: "user",
  isActive: true,
};

/** Decode Microsoft guest UPNs for display: user_domain.com#EXT#@tenant… → user@domain.com */
function formatDisplayEmail(email: string) {
  const lower = email.toLowerCase();
  const extMarker = lower.indexOf("#ext#");
  if (extMarker === -1) return email;

  const local = email.slice(0, extMarker);
  const atIndex = local.lastIndexOf("_");
  if (atIndex <= 0 || atIndex === local.length - 1) return email;
  return `${local.slice(0, atIndex)}@${local.slice(atIndex + 1)}`;
}

export function AdminUsers() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [creditUser, setCreditUser] = useState<AdminUser | null>(null);
  const [wallet, setWallet] = useState<AdminUserWallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [creditSaving, setCreditSaving] = useState(false);
  const [creditSuccess, setCreditSuccess] = useState("");

  const [planUser, setPlanUser] = useState<AdminUser | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [selectedPlanUuid, setSelectedPlanUuid] = useState("");
  const [planWallet, setPlanWallet] = useState<AdminUserWallet | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [planSuccess, setPlanSuccess] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const result = await apiRequest<UserResponse>(
        `/user?search=${encodeURIComponent(search)}&page=1&page_size=50&includeTenants=true`,
        { auth: true },
      );
      setUsers(result.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready && user?.role !== "superAdmin") router.replace("/platform");
  }, [ready, user, router]);

  useEffect(() => {
    if (user?.role === "superAdmin") void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!ready || !user || user.role !== "superAdmin") return null;

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest("/user", { method: "POST", body: form, auth: true });
      setOpen(false);
      setForm(emptyForm);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create user");
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = async (record: AdminUser) => {
    try {
      await apiRequest("/user", {
        method: "PUT",
        body: { user_uuid: record.user_uuid, isActive: !record.user_enabled },
        auth: true,
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update user");
    }
  };

  const deleteUser = async (record: AdminUser) => {
    if (!window.confirm(`Delete ${record.email}? This cannot be undone.`)) return;
    try {
      await apiRequest(`/user?user_uuid=${record.user_uuid}`, {
        method: "DELETE",
        auth: true,
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete user");
    }
  };

  const openCreditModal = async (record: AdminUser) => {
    setCreditUser(record);
    setCreditAmount("");
    setCreditNote("");
    setCreditSuccess("");
    setError("");
    setWallet(null);
    setWalletLoading(true);
    try {
      const data = await billingApi.adminUserWallet(record.user_uuid);
      setWallet(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load wallet");
      setCreditUser(null);
    } finally {
      setWalletLoading(false);
    }
  };

  const closeCreditModal = () => {
    setCreditUser(null);
    setWallet(null);
    setCreditAmount("");
    setCreditNote("");
    setCreditSuccess("");
  };

  const openPlanModal = async (record: AdminUser) => {
    setPlanUser(record);
    setSelectedPlanUuid("");
    setPlanSuccess("");
    setError("");
    setPlanWallet(null);
    setPlanLoading(true);
    try {
      const [walletData, planRows] = await Promise.all([
        billingApi.adminUserWallet(record.user_uuid),
        billingApi.adminPlans(),
      ]);
      setPlanWallet(walletData);
      const assignable = planRows.filter(
        (plan) =>
          plan.active &&
          plan.plan_kind === "service" &&
          !plan.contact_only,
      );
      setPlans(assignable);
      setSelectedPlanUuid(walletData.planUuid || assignable[0]?.plan_uuid || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load plans");
      setPlanUser(null);
    } finally {
      setPlanLoading(false);
    }
  };

  const closePlanModal = () => {
    setPlanUser(null);
    setPlans([]);
    setSelectedPlanUuid("");
    setPlanWallet(null);
    setPlanSuccess("");
  };

  const assignPlan = async (event: FormEvent) => {
    event.preventDefault();
    if (!planUser || !selectedPlanUuid) return;
    setPlanSaving(true);
    setError("");
    setPlanSuccess("");
    try {
      const result = await billingApi.adminAssignPlan(
        planUser.user_uuid,
        selectedPlanUuid,
      );
      setPlanSuccess(`Assigned plan “${result.planName}”.`);
      setPlanWallet((prev) =>
        prev
          ? {
              ...prev,
              planUuid: selectedPlanUuid,
              planName: result.planName,
              planCode: result.planCode,
            }
          : prev,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to assign plan");
    } finally {
      setPlanSaving(false);
    }
  };

  const grantCredits = async (event: FormEvent) => {
    event.preventDefault();
    if (!creditUser) return;

    const credits = Number(creditAmount);
    if (!Number.isFinite(credits) || credits <= 0) {
      setError("Enter a valid credit amount greater than zero.");
      return;
    }

    setCreditSaving(true);
    setError("");
    setCreditSuccess("");
    try {
      const result = await billingApi.adminGrantCredits(creditUser.user_uuid, {
        credits,
        ...(creditNote.trim() ? { note: creditNote.trim() } : {}),
      });
      setWallet((prev) =>
        prev
          ? { ...prev, balanceCredits: result.balanceCredits }
          : {
              user_uuid: creditUser.user_uuid,
              email: creditUser.email,
              fullName: creditUser.fullName,
              balanceCredits: result.balanceCredits,
            },
      );
      setCreditSuccess(
        `Added ${result.grantedCredits.toLocaleString()} credits. New balance: ${result.balanceCredits.toLocaleString()}.`,
      );
      setCreditAmount("");
      setCreditNote("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add credits");
    } finally {
      setCreditSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl text-[#d7def0]">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[.24em] text-[#8f82ff]">
            CONTROL PANEL / USERS
          </p>
          <h1 className="mt-3 text-4xl font-extrabold text-white">User management</h1>
          <p className="mt-3 text-sm text-[#8995b3]">
            Review accounts, adjust access, and grant wallet credits.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError("");
            setOpen(true);
          }}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-[#5d50e8] px-4 py-2.5 text-xs font-semibold text-white"
        >
          <UserPlus size={15} /> Create user
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      <div className="mb-5 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-[#293354] bg-[#10172d] px-3">
          <Search size={16} className="text-[#74809e]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void load();
            }}
            placeholder="Search name or email"
            className="h-10 w-full bg-transparent text-sm text-white outline-none placeholder:text-[#596783]"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-[#293354] px-4 text-xs text-[#b6c0d6] hover:text-white"
        >
          Search
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#202846] bg-[#0c1225]">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_88px_88px_minmax(240px,1fr)] border-b border-[#202846] px-5 py-3 text-[10px] uppercase tracking-wider text-[#74809e]">
            <span>User</span>
            <span>Email</span>
            <span>Role</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-[#74809e]">Loading users…</p>
          ) : users.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[#74809e]">No users found.</p>
          ) : (
            users.map((record) => (
              <div
                key={record.user_uuid}
                className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_88px_88px_minmax(240px,1fr)] items-center gap-3 border-b border-[#202846] px-5 py-4 text-sm last:border-0"
              >
                <div className="min-w-0 truncate font-medium text-white" title={record.fullName}>
                  {record.fullName}
                </div>
                <div className="min-w-0 truncate text-[#9aa6c2]" title={record.email}>
                  {formatDisplayEmail(record.email)}
                </div>
                <div>
                  <span className="rounded-full border border-[#39416a] px-2 py-1 text-[10px] text-[#a99af3]">
                    {record.role}
                  </span>
                </div>
                <div>
                  <span
                    className={
                      record.user_enabled ? "text-emerald-300" : "text-rose-300"
                    }
                  >
                    {record.user_enabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <div className="flex flex-nowrap items-center gap-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => void openPlanModal(record)}
                    className="inline-flex items-center gap-1 text-xs text-[#c4b5fd] hover:text-white"
                  >
                    <CreditCard size={13} /> Assign plan
                  </button>
                  <button
                    type="button"
                    onClick={() => void openCreditModal(record)}
                    className="inline-flex items-center gap-1 text-xs text-[#7dd3fc] hover:text-white"
                  >
                    <Coins size={13} /> Add credits
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleUser(record)}
                    className="text-xs text-[#a99af3] hover:text-white"
                  >
                    {record.user_enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteUser(record)}
                    className="text-xs text-rose-300 hover:text-rose-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={createUser}
            className="w-full max-w-md rounded-2xl border border-[#293354] bg-[#0c1225] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Create user</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {(
                [
                  ["fullName", "Full name", "text"],
                  ["email", "Email", "email"],
                  ["password", "Temporary password", "password"],
                ] as const
              ).map(([key, label, type]) => (
                <label key={key} className="block text-xs text-[#8995b3]">
                  {label}
                  <input
                    required
                    value={form[key]}
                    type={type}
                    onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#293354] bg-[#10172d] px-3 text-sm text-white outline-none"
                  />
                </label>
              ))}
              <label className="block text-xs text-[#8995b3]">
                Role
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm({ ...form, role: event.target.value as FormState["role"] })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#293354] bg-[#10172d] px-3 text-sm text-white outline-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="tenant">Tenant</option>
                </select>
              </label>
            </div>
            <button
              disabled={saving}
              className="mt-5 w-full rounded-lg bg-[#5d50e8] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create user"}
            </button>
          </form>
        </div>
      )}

      {(creditUser || walletLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={grantCredits}
            className="w-full max-w-md rounded-2xl border border-[#293354] bg-[#0c1225] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Add credits</h2>
              <button
                type="button"
                onClick={closeCreditModal}
                disabled={walletLoading}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {walletLoading ? (
              <p className="mt-6 text-sm text-[#74809e]">Loading wallet…</p>
            ) : creditUser && wallet ? (
              <>
                <p className="mt-2 truncate text-sm text-[#8995b3]" title={wallet.email}>
                  {wallet.fullName} · {formatDisplayEmail(wallet.email)}
                </p>
                <div className="mt-4 rounded-xl border border-[#243056] bg-[#101832] p-4">
                  <p className="text-[11px] uppercase tracking-wider text-[#74809e]">
                    Current balance
                  </p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {wallet.balanceCredits.toLocaleString()}{" "}
                    <span className="text-sm font-medium text-[#a99af3]">credits</span>
                  </p>
                </div>

                {creditSuccess && (
                  <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
                    {creditSuccess}
                  </p>
                )}

                <label className="mt-4 block text-xs text-[#8995b3]">
                  Credits to add
                  <input
                    required
                    type="number"
                    min="0.000001"
                    step="any"
                    value={creditAmount}
                    onChange={(event) => setCreditAmount(event.target.value)}
                    placeholder="e.g. 500"
                    className="mt-1 h-10 w-full rounded-lg border border-[#293354] bg-[#10172d] px-3 text-sm text-white outline-none"
                  />
                </label>
                <label className="mt-3 block text-xs text-[#8995b3]">
                  Note (optional)
                  <textarea
                    rows={2}
                    value={creditNote}
                    onChange={(event) => setCreditNote(event.target.value)}
                    placeholder="Reason for adjustment"
                    className="mt-1 w-full rounded-lg border border-[#293354] bg-[#10172d] px-3 py-2 text-sm text-white outline-none"
                  />
                </label>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={closeCreditModal}
                    className="flex-1 rounded-lg border border-[#293354] py-2.5 text-sm text-[#b6c0d6] hover:text-white"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={creditSaving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#5d50e8] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Coins size={15} />
                    {creditSaving ? "Adding…" : "Add credits"}
                  </button>
                </div>
              </>
            ) : null}
          </form>
        </div>
      )}

      {(planUser || planLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={assignPlan}
            className="w-full max-w-md rounded-2xl border border-[#293354] bg-[#0c1225] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Assign plan</h2>
              <button
                type="button"
                onClick={closePlanModal}
                disabled={planLoading}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {planLoading ? (
              <p className="mt-6 text-sm text-[#74809e]">Loading plans…</p>
            ) : planUser ? (
              <>
                <p className="mt-2 truncate text-sm text-[#8995b3]" title={planUser.email}>
                  {planUser.fullName} · {formatDisplayEmail(planUser.email)}
                </p>
                <div className="mt-4 rounded-xl border border-[#243056] bg-[#101832] p-4">
                  <p className="text-[11px] uppercase tracking-wider text-[#74809e]">
                    Current plan
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {planWallet?.planName || "No plan"}
                  </p>
                  {planWallet?.planCode && (
                    <p className="mt-1 text-xs text-[#74809e]">{planWallet.planCode}</p>
                  )}
                </div>

                {planSuccess && (
                  <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
                    {planSuccess}
                  </p>
                )}

                <label className="mt-4 block text-xs text-[#8995b3]">
                  Service plan
                  <select
                    required
                    value={selectedPlanUuid}
                    onChange={(event) => setSelectedPlanUuid(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#293354] bg-[#10172d] px-3 text-sm text-white outline-none"
                  >
                    {plans.map((plan) => (
                      <option key={plan.plan_uuid} value={plan.plan_uuid}>
                        {plan.name}
                        {plan.is_default ? " (default)" : ""}
                        {plan.tts_credits_per_1000_chars
                          ? ` · TTS ₹${Number(plan.tts_credits_per_1000_chars)}/1k`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="mt-2 text-xs text-[#74809e]">
                  Usage rates from the selected plan apply on the user’s next STT/TTS/LLM
                  charges.
                </p>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={closePlanModal}
                    className="flex-1 rounded-lg border border-[#293354] py-2.5 text-sm text-[#b6c0d6] hover:text-white"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={planSaving || !selectedPlanUuid}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#5d50e8] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <CreditCard size={15} />
                    {planSaving ? "Assigning…" : "Assign plan"}
                  </button>
                </div>
              </>
            ) : null}
          </form>
        </div>
      )}
    </main>
  );
}
