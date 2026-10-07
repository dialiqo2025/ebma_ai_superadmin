import { ChangePasswordForm } from "@/components/change-password-form";
import Link from "next/link";

export default function SettingsPage() {
  return <><ChangePasswordForm /><div className="mx-auto mt-5 max-w-[520px]"><Link href="/platform/settings/llm" className="block rounded-xl border border-brand-border bg-brand-soft p-4 text-sm text-text hover:border-brand-border"><span className="font-semibold">LLM configuration</span><span className="mt-1 block text-xs text-muted">Choose your provider and model when your plan supports user-managed LLM.</span></Link></div></>;
}
