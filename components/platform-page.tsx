"use client";

import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  FileAudio,
  Gauge,
  Mic2,
  Plus,
  RefreshCcw,
  Sparkles,
  Volume2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "./ui/button";

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function PlatformPage() {
  const { displayName } = useAuth();
  const [apiKey, setApiKey] = useState("ebma_live_7Qm8xP2K9d4sL1N6R8vT");
  const [showKey, setShowKey] = useState(true);
  const [copied, setCopied] = useState(false);

  const copyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      window.prompt("Copy your API key", apiKey);
    }
  };

  const regenerateApiKey = () => {
    const next = `ebma_live_${Math.random().toString(36).slice(2, 12).toUpperCase()}`;
    setApiKey(next);
    setShowKey(true);
    setCopied(false);
  };

  return (
    <>
      <div className="flex items-end justify-between max-[560px]:items-start">
        <div>
          <p className="mb-2 text-[12px] font-bold tracking-[0.12em] text-[#9aa5b8]">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="mb-1.5 font-heading text-[27px] font-semibold tracking-[-0.03em] max-[560px]:text-[22px]">
            Good morning, {displayName} <span className="text-[#a779f0]">✦</span>
          </h1>
          <span className="text-[12px] text-[#a0acc0]">
            Here&apos;s what&apos;s happening in your workspace.
          </span>
        </div>
        <Button className="max-[560px]:px-3 max-[560px]:text-[0px] max-[560px]:[&_svg]:h-[18px] max-[560px]:[&_svg]:w-[18px]">
          <Plus size={17} /> Create project
        </Button>
      </div>

      <div className="my-[27px] mb-[34px] flex h-[57px] items-center justify-between rounded-[10px] border border-[rgba(111,98,231,.35)] bg-[linear-gradient(90deg,rgba(91,79,233,.14),rgba(155,92,246,.05))] px-[17px] max-[560px]:h-auto max-[560px]:min-h-[62px] max-[560px]:p-3">
        <div className="flex items-center gap-2.5 text-[12px] text-[#b0b8cc] max-[560px]:items-start">
          <Sparkles size={18} className="shrink-0 text-[#aa78f3]" />
          <span className="max-[560px]:leading-normal">
            <strong className="mr-1 text-[#d9dbea]">Your AI workspace is ready.</strong>
            Try a model in the playground or make your first API call.
          </span>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 border-0 bg-transparent text-[12px] font-bold text-[#9e93ef] max-[560px]:hidden"
        >
          View quickstart <ArrowRight size={15} />
        </button>
      </div>

      <section>
        <div>
          <h2 className="mb-1 font-heading text-[15px] font-semibold">Start building</h2>
          <p className="text-[12px] text-[#9aa5b8]">
            Choose a capability to open its playground.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3.5 max-[560px]:grid-cols-1">
          <QuickCard
            accent="#38bdf8"
            icon={<Mic2 />}
            label="STT"
            title="Speech to text"
            description="Transcribe audio with speed and accuracy across languages."
            href="/platform/speech-to-text"
            action="Open playground"
            demo={
              <div className="mt-4 flex h-14 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#313a5e] bg-[#0f1325] text-[12px] text-[#9aa5b8]">
                <div className="pt-1">
                <FileAudio size={17} className="text-[#fff]" />
                <span className="text-[#fff]">Drop an audio file here</span>
                <small className="text-[12px] text-[#fff]">MP3, WAV · 25MB max</small>
                </div>
              </div>
            }
          />
          <QuickCard
            accent="#9b5cf6"
            icon={<Volume2 />}
            label="TTS"
            title="Text to speech"
            description="Create expressive, natural speech from any text."
            href="/platform/text-to-speech"
            action="Open playground"
            demo={
              <div className="mt-4 flex h-14 flex-row items-center gap-2 rounded-lg border border-dashed border-[#313a5e] bg-[#0f1325] px-2.5 text-[12px] text-[#9aa5b8]">
                <button
                  type="button"
                  className="grid h-[25px] w-[25px] place-items-center rounded-full border-0 bg-[#6558df] text-[12px] text-white"
                >
                  ▶
                </button>
                <div className="flex h-[25px] flex-1 items-center gap-0.5">
                  {Array.from({ length: 24 }, (_, i) => (
                    <i
                      key={i}
                      className="w-0.5 rounded-sm bg-[#836bed]"
                      style={{ height: `${5 + ((i * 9) % 20)}px` }}
                    />
                  ))}
                </div>
                <small>0:08</small>
              </div>
            }
          />
          <QuickCard
            accent="#ec72ce"
            icon={<Bot />}
            label="GEMINI"
            title="Voice assistant"
            description="Talk to a Gemini-powered assistant and hear it reply in your language."
            href="/platform/voice-assistant"
            action="Open assistant"
            demo={
              <div className="mt-4 flex h-14 flex-row items-center justify-start gap-1.5 rounded-lg border border-dashed border-[#313a5e] bg-[#0f1325] px-[11px] text-[12px] text-[#9aa5b8]">
                <span className="grid h-[26px] w-[26px] place-items-center rounded-lg bg-[rgba(236,114,206,.1)]">
                  <Sparkles size={14} />
                </span>
                <p className="text-[12px] text-[#fff]">How can I help you build today?</p>
              </div>
            }
          />
        </div>
      </section>

      <div className="mt-[27px] grid grid-cols-[1.65fr_.75fr] gap-3.5 max-[1050px]:grid-cols-1">
        <section className="rounded-[13px] border border-[#293152] bg-[#12162a] p-[18px]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="mb-1 font-heading text-[15px] font-semibold">Usage this month</h2>
              <p className="text-[12px] text-[#9aa5b8]">September 1 – 25</p>
            </div>
            <button
              type="button"
              className="flex items-center gap-1 border-0 bg-transparent text-[12px] text-[#8176d5]"
            >
              View details <ArrowRight size={14} />
            </button>
          </div>
          <div className="mt-[23px] grid grid-cols-3 max-[560px]:gap-[13px]">
            {[
              {
                icon: <Activity size={15} />,
                label: "API requests",
                value: "1,760",
                meta: (
                  <>
                    <i className="not-italic text-[#49bd96]">↗ 12.4%</i> from last month
                  </>
                ),
              },
              {
                icon: <Clock3 size={15} />,
                label: "Audio processed",
                value: "2h 14m",
                meta: "of 10 hours included",
              },
              {
                icon: <Gauge size={15} />,
                label: "Avg. latency",
                value: (
                  <>
                    184<em className="ml-0.5 text-[12px] not-italic text-[#a0acc0]">ms</em>
                  </>
                ),
                meta: (
                  <>
                    <i className="not-italic text-[#49bd96]">↘ 8.2%</i> improvement
                  </>
                ),
              },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className={cx(
                  "px-[17px] max-[560px]:px-[7px]",
                  index === 0 && "pl-0",
                  index < 2 && "border-r border-[#252c4b]",
                )}
              >
                <span className="flex items-center gap-1 text-[12px] text-[#a0acc0]">
                  {stat.icon} {stat.label}
                </span>
                <strong className="my-2 block font-heading text-[22px] font-semibold max-[560px]:text-base">
                  {stat.value}
                </strong>
                <small className="text-[12px] text-gray-400">{stat.meta}</small>
              </div>
            ))}
          </div>
          <div className="relative mt-[17px] h-[135px] max-[560px]:h-[110px]">
            <div className="absolute inset-x-0 top-0 bottom-4 flex flex-col justify-between">
              <i className="block border-t border-dashed border-[#252c49]" />
              <i className="block border-t border-dashed border-[#252c49]" />
              <i className="block border-t border-dashed border-[#252c49]" />
              <i className="block border-t border-dashed border-[#252c49]" />
            </div>
            <svg
              viewBox="0 0 640 120"
              preserveAspectRatio="none"
              className="absolute inset-x-0 top-0 bottom-4 h-[calc(100%-16px)] w-full"
            >
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#7c70f6" stopOpacity=".35" />
                  <stop offset="1" stopColor="#7c70f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 100 C40 95,55 75,90 79 S140 100,170 65 S225 42,258 52 S315 82,350 58 S405 22,440 35 S495 72,530 44 S590 28,640 14 L640 120 L0 120Z"
                fill="url(#chartFill)"
              />
              <path
                d="M0 100 C40 95,55 75,90 79 S140 100,170 65 S225 42,258 52 S315 82,350 58 S405 22,440 35 S495 72,530 44 S590 28,640 14"
                fill="none"
                stroke="#8b7cf6"
                strokeWidth="2.5"
              />
            </svg>
            <div className="absolute inset-x-0 bottom-0 flex justify-between text-[12px] text-[#8b98ae]">
              <span>Sep 1</span>
              <span>Sep 7</span>
              <span>Sep 13</span>
              <span>Sep 19</span>
              <span>Sep 25</span>
            </div>
          </div>
        </section>

        <section className="rounded-[13px] border border-[#293152] bg-[#12162a] p-[18px] max-[1050px]:min-h-[220px]">
          <div>
            <h2 className="mb-1 font-heading text-[15px] font-semibold">API key</h2>
            <p className="text-[12px] text-[#9aa5b8]">Use this key in your application.</p>
          </div>
          <div className="my-[21px] mb-2 flex h-10 items-center justify-between rounded-lg border border-[#293252] bg-[#0e1223] pl-[11px]">
            <code className="text-[12px] text-[#9da3bd]">
              {showKey ? apiKey : "ebma_live_••••••••••••••"}
            </code>
            <div className="flex h-full">
              <button
                type="button"
                className="grid h-full w-[38px] place-items-center border-0 border-l border-[#293252] bg-transparent text-[#a8b4c8]"
                onClick={() => setShowKey((value) => !value)}
                title={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                type="button"
                className="grid h-full w-[38px] place-items-center border-0 border-l border-[#293252] bg-transparent text-[#a8b4c8]"
                onClick={copyApiKey}
                title={copied ? "Copied" : "Copy API key"}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
          </div>
          <div className="flex justify-between text-[12px] text-[#8b98ae]">
            <span>
              Status <i className="ml-1 not-italic text-[#4dd0a3]">Active</i>
            </span>
            <span>Created Sep 22, 2026</span>
          </div>
          <button
            type="button"
            className="my-[18px] flex h-8 w-full items-center justify-center gap-1 rounded-[7px] border border-[#2e3657] bg-[#181d34] text-[12px] font-bold text-[#979db8]"
            onClick={regenerateApiKey}
          >
            <RefreshCcw size={14} /> Generate new key
          </button>
          <div className="flex items-center gap-2 border-t border-[#252c4b] pt-[15px] text-[#897ee0]">
            <Zap size={16} />
            <div className="flex flex-1 flex-col gap-0.5">
              <strong className="text-[12px] text-[#b5bad0]">Make your first API call</strong>
              <span className="text-[12px] text-[#8b98ae]">Follow our 5-minute quickstart</span>
            </div>
            <ArrowRight size={15} />
          </div>
        </section>
      </div>
    </>
  );
}

function QuickCard({
  accent,
  icon,
  label,
  title,
  description,
  href,
  action,
  demo,
}: {
  accent: string;
  icon: ReactNode;
  label: string;
  title: string;
  description: string;
  href: string;
  action: string;
  demo: ReactNode;
}) {
  return (
    <article className="relative min-h-[280px] overflow-hidden rounded-[13px] border border-[#293152] bg-[#12162a] p-[18px] max-[560px]:min-h-[270px]">
      <div
        className="pointer-events-none absolute -top-[50px] -right-[50px] h-[140px] w-[140px] rounded-full opacity-[0.09] blur-[80px]"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="flex items-center justify-between">
        <span
          className="grid h-[37px] w-[37px] place-items-center rounded-[10px] border border-[#323b61] bg-[#181e37]"
          style={{ color: accent }}
        >
          {icon}
        </span>
        <small className="text-[12px] tracking-[0.11em] text-[#8b98ae]">{label}</small>
      </div>
      <h3 className="mt-[15px] mb-1.5 font-heading text-sm font-semibold">{title}</h3>
      <p className="m-0 text-[12px] leading-[1.55] text-white">{description}</p>
      {demo}
      <Link
        href={href}
        className="absolute right-[18px] bottom-[17px] left-[18px] flex justify-between border-0 border-t border-[#252c4b] bg-transparent pt-[13px] text-[12px] font-bold text-[#a5aac3]"
      >
        {action} <ArrowRight size={15} />
      </Link>
    </article>
  );
}
