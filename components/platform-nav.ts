import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Braces,
  LayoutDashboard,
  MessagesSquare,
  ShieldCheck,
  Mic2,
  Volume2,
  Users,
  Settings2,
  CreditCard,
  Activity,
  Receipt,
} from "lucide-react";

export type PlatformNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  beta?: boolean;
  adminOnly?: boolean;
  capability?: "stt" | "tts" | "llm";
};

export const platformNav: PlatformNavItem[] = [
  { label: "Overview", href: "/platform", icon: LayoutDashboard },
  { label: "Speech To Text", href: "/platform/speech-to-text", icon: Mic2, capability: "stt" },
  { label: "Text To Speech", href: "/platform/text-to-speech", icon: Volume2, capability: "tts" },
  {
    label: "Voice Assistant",
    href: "/platform/voice-assistant",
    icon: MessagesSquare,
    beta: true,
    capability: "llm",
  },
  { label: "LLM Studio", href: "#", icon: Bot, beta: true, capability: "llm" },
  { label: "API Keys", href: "/platform/api-keys", icon: Braces },
  { label: "Usage", href: "/platform/usage", icon: BarChart3 },
  { label: "Subscriptions", href: "/platform/subscriptions", icon: Activity },
  { label: "Transactions", href: "/platform/transactions", icon: Receipt },
  { label: "Admin Console", href: "/platform/admin", icon: ShieldCheck, adminOnly: true },
];

export const adminNav: PlatformNavItem[] = [
  { label: "Users", href: "/platform/admin/users", icon: Users },
  { label: "User Usage", href: "/platform/admin/user-usage", icon: BarChart3 },
  { label: "Usage Settings", href: "/platform/admin/usage-settings", icon: Settings2 },
  { label: "LLM Settings", href: "/platform/admin/llm-settings", icon: Bot },
  { label: "Plans & Pricing", href: "/platform/admin/plans", icon: CreditCard },
  { label: "Subscriptions", href: "/platform/admin/subscriptions", icon: Activity },
  { label: "Transactions", href: "/platform/admin/transactions", icon: Receipt },
];
