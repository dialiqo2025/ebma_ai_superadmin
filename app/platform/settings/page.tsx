import { ChangePasswordForm } from "@/components/change-password-form";
import Link from "next/link";

export default function SettingsPage() {
  return <><ChangePasswordForm /><div className="mx-auto mt-5 max-w-[520px]"><Link href="/platform/settings/llm" className="block rounded-xl border border-[#293354] bg-[#151a30] p-4 text-sm text-white hover:border-[#6558e9]"><span className="font-semibold">LLM configuration</span><span className="mt-1 block text-xs text-[#8995b3]">Choose your provider and model when your plan supports user-managed LLM.</span></Link></div></>;
}
