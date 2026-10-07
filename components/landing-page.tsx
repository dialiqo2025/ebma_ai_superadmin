"use client";

import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Blocks,
  Bot,
  Braces,
  Check,
  ChevronRight,
  CirclePlay,
  Code2,
  Globe2,
  Headphones,
  Languages,
  Menu,
  MessageSquareText,
  Mic2,
  MoveRight,
  ShieldCheck,
  Sparkles,
  Volume2,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Brand } from "./brand";
import { Button } from "./ui/button";

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const container =
  "mx-auto w-[min(1180px,calc(100%-48px))] max-[820px]:w-[calc(100%-32px)]";

const serviceAccents = {
  cyan: {
    glow: "bg-brand",
    accent: "text-cyan",
    waveBar: "bg-brand-gradient",
  },
  violet: {
    glow: "bg-brand-soft",
    accent: "text-accent",
    waveBar: "bg-brand-gradient",
  },
  pink: {
    glow: "bg-brand",
    accent: "text-accent",
    waveBar: "bg-brand-gradient",
  },
} as const;

const services = [
  {
    icon: Mic2,
    eyebrow: "Speech to text",
    title: "Every word, captured.",
    description:
      "Turn live or recorded speech into accurate, structured text—built for real conversations, accents, and noisy environments.",
    tags: ["Live transcription", "Speaker detection", "Multilingual"],
    color: "cyan" as const,
    visual: "wave" as const,
  },
  {
    icon: Volume2,
    eyebrow: "Text to speech",
    title: "Voices that feel human.",
    description:
      "Create expressive, natural speech for agents, products, and content with voices your users will want to listen to.",
    tags: ["Natural voices", "Low latency", "Custom expression"],
    color: "violet" as const,
    visual: "voice" as const,
  },
  {
    icon: Bot,
    eyebrow: "Language intelligence",
    title: "Answers with context.",
    description:
      "Build capable AI assistants powered by Gemini—grounded in your information and designed for useful, reliable conversations.",
    tags: ["Gemini powered", "Long context", "Tool ready"],
    color: "pink" as const,
    visual: "chat" as const,
  },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="overflow-hidden">
      <nav className="absolute inset-x-0 top-0 z-20 h-20 border-b border-white/[0.06] bg-theme-header backdrop-blur-[14px] max-[820px]:h-[68px]">
        <div
          className={cx(
            container,
            "relative flex h-full items-center justify-between",
          )}
        >
          <Brand />
          <div
            className={cx(
              "ml-auto mr-9 flex items-center gap-8 max-[1050px]:mr-[18px] max-[1050px]:gap-[19px]",
              "max-[820px]:hidden",
              menuOpen &&
                "max-[820px]:absolute max-[820px]:left-0 max-[820px]:right-0 max-[820px]:top-[75px] max-[820px]:mx-0 max-[820px]:flex max-[820px]:w-auto max-[820px]:flex-col max-[820px]:items-stretch max-[820px]:gap-0 max-[820px]:rounded-[14px] max-[820px]:border max-[820px]:border-border max-[820px]:bg-surface max-[820px]:p-3 max-[820px]:shadow-[0_20px_50px_#03040b]",
            )}
          >
            <a
              href="#products"
              onClick={() => setMenuOpen(false)}
              className="text-[13px] font-semibold text-muted transition-colors duration-200 hover:text-text max-[820px]:px-[13px] max-[820px]:py-[13px]"
            >
              Products
            </a>
            <a
              href="#developers"
              onClick={() => setMenuOpen(false)}
              className="text-[13px] font-semibold text-muted transition-colors duration-200 hover:text-text max-[820px]:px-[13px] max-[820px]:py-[13px]"
            >
              Developers
            </a>
            <a
              href="#enterprise"
              onClick={() => setMenuOpen(false)}
              className="text-[13px] font-semibold text-muted transition-colors duration-200 hover:text-text max-[820px]:px-[13px] max-[820px]:py-[13px]"
            >
              Enterprise
            </a>
            <a
              href="#contact"
              onClick={() => setMenuOpen(false)}
              className="text-[13px] font-semibold text-muted transition-colors duration-200 hover:text-text max-[820px]:px-[13px] max-[820px]:py-[13px]"
            >
              Contact us
            </a>
            <div className="hidden max-[820px]:mt-2 max-[820px]:grid max-[820px]:grid-cols-[1fr_1.3fr] max-[820px]:gap-2">
              <Button variant="ghost" href="/">
                Log in
              </Button>
              <Button variant="primary" href="/?mode=signup">
                Start building <ArrowRight size={16} />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-[13px] max-[820px]:hidden">
            <Link
              href="/"
              className="px-2.5 py-2.5 text-[13px] font-[650] text-muted hover:text-text"
            >
              Log in
            </Link>
            <Button variant="outline" href="#contact" className="max-[1050px]:hidden">
              Contact us
            </Button>
            <Button variant="primary" href="/?mode=signup">
              Start building <ArrowRight size={16} />
            </Button>
          </div>
          <button
            type="button"
            className="hidden max-[820px]:absolute max-[820px]:right-0 max-[820px]:grid max-[820px]:h-[39px] max-[820px]:w-[39px] max-[820px]:place-items-center max-[820px]:rounded-[10px] max-[820px]:border max-[820px]:border-border max-[820px]:bg-surface max-[820px]:text-text"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <section className="relative min-h-[850px] bg-[radial-gradient(circle_at_72%_32%,rgba(91,79,233,.14),transparent_29%),linear-gradient(180deg,#090b17,#0a0d1a)] pt-20 max-[820px]:min-h-0 max-[820px]:pt-[68px] max-[560px]:min-h-0">
        <div className="pointer-events-none absolute -left-[380px] -top-[250px] h-[760px] w-[760px] rounded-full bg-brand-soft opacity-[.12] blur-[160px]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[.12] [background-image:linear-gradient(rgba(130,140,190,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(130,140,190,.16)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]"
          aria-hidden
        />
        <div
          className={cx(
            container,
            "relative grid min-h-[668px] grid-cols-2 items-center gap-[62px] pt-[50px] max-[1050px]:gap-[35px] max-[820px]:grid-cols-1 max-[820px]:px-0 max-[820px]:py-[90px] max-[820px]:pb-[65px] max-[560px]:gap-[55px] max-[560px]:pt-[75px]",
          )}
        >
          <div className="relative z-[2] animate-[fade-up_.8s_ease_both] max-[820px]:min-w-0 max-[820px]:text-center">
            <div className="mx-auto flex w-max items-center gap-2 rounded-full border border-brand-border bg-brand-soft px-3 py-2 text-[12px] font-[750] uppercase tracking-[0.1em] text-accent max-[820px]:mx-auto">
              <Sparkles size={14} /> One platform. Every conversation.
            </div>
            <h1 className="my-[26px] mb-6 font-heading text-[clamp(50px,5vw,70px)] font-[650] leading-[1.03] tracking-[-0.055em] max-[560px]:text-[38px] max-[560px]:[overflow-wrap:anywhere]">
              Intelligence that
              <br />
              <span className="bg-brand-gradient bg-clip-text text-transparent max-[560px]:text-[0.94em]">
                speaks your language.
              </span>
            </h1>
            <p className="m-0 max-w-[570px] text-lg leading-[1.7] text-muted max-[820px]:mx-auto max-[560px]:text-[15px]">
              Power the next generation of voice and language experiences with AI
              that listens, speaks, and understands.
            </p>
            <div className="mt-[34px] flex gap-3 max-[820px]:justify-center max-[560px]:flex-col">
              <Button variant="primary" large href="/?mode=signup" className="max-[560px]:w-full">
                Build with ebma <ArrowRight size={18} />
              </Button>
              <Button variant="quiet" large href="#products" className="max-[560px]:w-full">
                <CirclePlay size={19} /> Explore products
              </Button>
            </div>
            <div className="mt-[25px] flex gap-[22px] text-[12px] text-accent max-[820px]:justify-center max-[560px]:flex-wrap max-[560px]:gap-x-4 max-[560px]:gap-y-2.5">
              <span className="flex items-center gap-[5px]">
                <Check size={14} className="text-success" /> Start free
              </span>
              <span className="flex items-center gap-[5px]">
                <Check size={14} className="text-success" /> No card required
              </span>
              <span className="flex items-center gap-[5px]">
                <Check size={14} className="text-success" /> API-ready
              </span>
            </div>
          </div>

          <div className="relative z-[2] w-full animate-[fade-up_.8s_ease_both] [animation-delay:150ms] max-[820px]:mx-auto max-[820px]:w-[min(600px,100%)]">
            <div className="pointer-events-none absolute inset-x-0 top-[10%] bottom-[10%] rounded-full bg-brand-a opacity-[.22] blur-[100px]" />
            <div className="relative overflow-hidden rounded-[19px] border border-brand-border bg-surface shadow-[0_40px_90px_rgba(0,0,0,.5),inset_0_1px_rgba(255,255,255,.05)] [transform:perspective(1200px)_rotateY(-3deg)_rotateX(1deg)] max-[820px]:[transform:none]">
              <div className="flex h-[52px] items-center justify-between border-b border-brand-border bg-brand-soft px-4">
                <div className="flex gap-1.5">
                  <i className="block h-[7px] w-[7px] rounded-full bg-danger-soft" />
                  <i className="block h-[7px] w-[7px] rounded-full bg-warning-soft" />
                  <i className="block h-[7px] w-[7px] rounded-full bg-success-soft" />
                </div>
                <div className="flex items-center gap-[7px] text-[12px] text-muted">
                  <span className="inline-block h-[7px] w-[7px] rounded-full bg-success shadow-[0_0_0_4px_rgba(52,211,153,.12)]" />{" "}
                  Live playground
                </div>
                <div className="flex items-center gap-1 text-[12px] text-success">
                  <Zap size={12} /> 184ms
                </div>
              </div>
              <div className="flex h-[52px] gap-6 border-b border-brand-border px-[18px] max-[560px]:gap-4">
                <button
                  type="button"
                  className="relative cursor-pointer border-0 bg-transparent p-0 text-[12px] text-text after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-brand-gradient after:content-['']"
                >
                  Speech to text
                </button>
                <button
                  type="button"
                  className="cursor-pointer border-0 bg-transparent p-0 text-[12px] text-accent"
                >
                  Text to speech
                </button>
                <button
                  type="button"
                  className="cursor-pointer border-0 bg-transparent p-0 text-[12px] text-accent"
                >
                  LLM
                </button>
              </div>
              <div className="p-[22px] max-[560px]:p-[15px]">
                <div className="flex items-center justify-between text-[12px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <Globe2 size={14} /> English (India)
                  </span>
                  <span className="text-muted">● Ready</span>
                </div>
                <div className="relative my-4 rounded-[13px] border border-brand-border bg-brand-soft px-[22px] pb-[15px] pt-6">
                  <div className="absolute left-[11px] top-[5px] font-[500] font-[Georgia] text-[31px] text-accent">
                    “
                  </div>
                  <p className="m-0 font-heading text-base font-medium leading-[1.6] text-text">
                    Intelligence should feel natural—like a conversation, not a
                    command.
                  </p>
                  <div className="mt-[18px] flex justify-between text-[12px] uppercase tracking-[0.08em] text-muted">
                    <span>Speaker 1</span>
                    <span>00:04.8</span>
                  </div>
                </div>
                <div className="my-[17px] flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Pause"
                    className="grid h-[35px] w-[35px] place-items-center rounded-full border-0 bg-brand-gradient text-on-brand"
                  >
                    <span className="h-[11px] w-2 border-l-2 border-r-2 border-white" />
                  </button>
                  <div className="flex h-[42px] flex-1 items-center gap-[3px] overflow-hidden">
                    {Array.from({ length: 42 }, (_, i) => (
                      <i
                        key={i}
                        className="min-w-0.5 w-0.5 rounded bg-brand-gradient"
                        style={{ height: `${12 + ((i * 17) % 32)}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-[12px] text-muted">0:05</span>
                </div>
                <div className="flex items-center justify-between border-t border-brand-border pt-3.5 text-[12px] text-muted">
                  <span className="flex items-center gap-[5px]">
                    <Languages size={14} /> Auto language detection
                  </span>
                  <span className="text-success">98.7% confidence</span>
                </div>
              </div>
            </div>
            <div className="absolute -left-9 bottom-[75px] flex items-center gap-[7px] rounded-[10px] border border-brand-border bg-surface-raised px-[13px] py-2.5 text-[12px] text-muted shadow-[0_15px_30px_#050710] max-[1050px]:left-[-10px] max-[560px]:hidden [&_svg]:text-accent">
              <AudioLines size={16} /> Streaming
            </div>
            <div className="absolute -right-[19px] top-[84px] flex items-center gap-[7px] rounded-[10px] border border-brand-border bg-surface-raised px-[13px] py-2.5 text-[12px] text-muted shadow-[0_15px_30px_#050710] max-[560px]:hidden [&_svg]:text-accent">
              <Sparkles size={16} /> AI enriched
            </div>
          </div>
        </div>
        <div
          className={cx(
            container,
            "relative flex min-h-[100px] items-center justify-between border-t border-white/[0.06] text-accent max-[820px]:min-h-[130px] max-[820px]:flex-col max-[820px]:justify-center max-[820px]:gap-[17px]",
          )}
        >
          <p className="m-0 text-[12px] uppercase tracking-[0.12em] max-[820px]:m-0">
            One API for every voice experience
          </p>
          <div className="flex gap-10 max-[820px]:flex-wrap max-[820px]:justify-center max-[820px]:gap-5 max-[560px]:gap-3">
            <span className="font-heading text-[13px] font-semibold text-accent max-[560px]:text-[12px]">
              Contact centers
            </span>
            <span className="font-heading text-[13px] font-semibold text-accent max-[560px]:text-[12px]">
              Voice agents
            </span>
            <span className="font-heading text-[13px] font-semibold text-accent max-[560px]:text-[12px]">
              Media
            </span>
            <span className="font-heading text-[13px] font-semibold text-accent max-[560px]:text-[12px]">
              Education
            </span>
            <span className="font-heading text-[13px] font-semibold text-accent max-[560px]:text-[12px]">
              Enterprise
            </span>
          </div>
        </div>
      </section>

      <section
        className="border-t border-white/[0.04] bg-brand-soft py-[120px] max-[820px]:py-[90px]"
        id="products"
      >
        <div className={container}>
          <div className="mb-[55px] flex items-end justify-between max-[820px]:block">
            <div>
              <span className="inline-flex items-center gap-[7px] text-[12px] font-extrabold uppercase tracking-[0.13em] text-accent">
                The ebma intelligence stack
              </span>
              <h2 className="mt-[15px] font-heading text-[clamp(35px,4vw,50px)] font-semibold leading-[1.12] tracking-[-0.04em] max-[560px]:text-[34px]">
                From sound to understanding.
                <br />
                All in one place.
              </h2>
            </div>
            <p className="mb-[5px] mt-0 max-w-[380px] text-sm leading-[1.7] text-muted max-[820px]:mt-5 max-[560px]:text-[13px]">
              Composable AI capabilities that work beautifully on their own—and
              even better together.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-[18px] max-[1050px]:gap-3 max-[820px]:grid-cols-1">
            {services.map((service, index) => {
              const accent = serviceAccents[service.color];
              return (
                <article
                  key={service.title}
                  className="group relative min-h-[540px] overflow-hidden rounded-[20px] border border-brand-border bg-[linear-gradient(145deg,var(--theme-surface-raised),var(--theme-surface))] p-6 transition duration-300 hover:-translate-y-[5px] hover:border-brand-border hover:shadow-[0_25px_50px_rgba(2,4,12,.35)] max-[1050px]:p-5 max-[820px]:min-h-[515px]"
                >
                  <div
                    className={cx(
                      "pointer-events-none absolute -right-[110px] -top-[130px] h-[250px] w-[250px] rounded-full opacity-[.11] blur-[90px]",
                      accent.glow,
                    )}
                  />
                  <div
                    className={cx(
                      "grid h-[43px] w-[43px] place-items-center rounded-xl border border-brand-border bg-brand-soft",
                      accent.accent,
                    )}
                  >
                    <service.icon size={22} />
                  </div>
                  <span className="absolute right-6 top-[29px] font-heading text-[12px] font-semibold text-accent">
                    0{index + 1}
                  </span>
                  <div className="mt-9">
                    <span
                      className={cx(
                        "text-[12px] font-extrabold uppercase tracking-[0.12em]",
                        accent.accent,
                      )}
                    >
                      {service.eyebrow}
                    </span>
                    <h3 className="my-2.5 font-heading text-[25px] font-semibold tracking-[-0.03em]">
                      {service.title}
                    </h3>
                    <p className="m-0 text-[13px] leading-[1.65] text-muted">
                      {service.description}
                    </p>
                  </div>
                  <div className="-mx-6 my-[25px] mb-5 flex h-[117px] items-center border-y border-brand-border bg-brand-soft px-6 py-5">
                    {service.visual === "wave" && (
                      <div className="flex h-[42px] flex-1 items-center justify-center gap-[3px] overflow-hidden">
                        {Array.from({ length: 34 }, (_, i) => (
                          <i
                            key={i}
                            className={cx("w-[3px] min-w-[3px] rounded", accent.waveBar)}
                            style={{ height: `${8 + ((i * 13) % 40)}px` }}
                          />
                        ))}
                      </div>
                    )}
                    {service.visual === "voice" && (
                      <div className="relative flex w-full items-center justify-center">
                        <div className="relative mx-auto h-[67px] w-[67px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#cab1ff,#7356e5_42%,#31216f_75%)] shadow-[0_0_35px_rgba(155,92,246,.3)] before:pointer-events-none before:absolute before:-inset-2 before:rounded-full before:border before:border-[rgba(155,92,246,.28)] before:content-[''] after:pointer-events-none after:absolute after:-inset-[15px] after:rounded-full after:border after:border-[rgba(155,92,246,.28)] after:opacity-45 after:content-['']">
                          <span className="absolute inset-[20%] rounded-full border border-white/25" />
                          <i className="absolute inset-[33%] rounded-full border border-white/25" />
                        </div>
                        <div className="absolute inset-x-0 mt-[94px] text-center text-[12px] text-muted">
                          Generating natural speech...
                        </div>
                      </div>
                    )}
                    {service.visual === "chat" && (
                      <div className="flex w-full flex-col items-stretch justify-center gap-2">
                        <div className="max-w-[90%] self-end rounded-lg bg-brand-soft px-2.5 py-2 text-[12px] leading-[1.4] text-muted">
                          Summarize the customer&apos;s request
                        </div>
                        <div className="flex max-w-[90%] items-start gap-1.5 rounded-lg border border-brand-border bg-brand-soft px-2.5 py-2 text-[12px] leading-[1.4] text-muted">
                          <WandSparkles size={14} className="min-w-[14px] text-accent" />{" "}
                          The customer would like to upgrade their plan...
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {service.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-brand-border px-[9px] py-1.5 text-[12px] text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Link
                    href="/?mode=signup"
                    className="absolute inset-x-6 bottom-6 flex items-center justify-between text-[12px] font-bold text-text"
                  >
                    Explore {service.eyebrow.toLowerCase()}{" "}
                    <ArrowRight size={15} className={accent.accent} />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="relative bg-bg-deep py-[120px] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_80%_50%,rgba(91,79,233,.13),transparent_30%)] before:content-[''] max-[820px]:py-[90px]"
        id="developers"
      >
        <div className={cx(container, "relative grid grid-cols-[0.9fr_1.1fr] items-center gap-[95px] max-[820px]:grid-cols-1 max-[820px]:gap-[55px]")}>
          <div className="max-[820px]:text-center">
            <span className="inline-flex items-center gap-[7px] text-[12px] font-extrabold uppercase tracking-[0.13em] text-accent max-[820px]:justify-center">
              <Braces size={14} /> Built for developers
            </span>
            <h2 className="my-[17px] mb-[22px] font-heading text-[48px] font-semibold leading-[1.12] tracking-[-0.04em] max-[560px]:text-[34px]">
              One clean API.
              <br />
              <span className="bg-brand-gradient bg-clip-text text-transparent">
                Infinite possibilities.
              </span>
            </h2>
            <p className="text-sm leading-[1.7] text-muted">
              Go from first request to production without wrestling with
              infrastructure. Simple APIs, familiar SDKs, and documentation built
              for momentum.
            </p>
            <div className="my-[34px] grid gap-5 max-[820px]:mx-auto max-[820px]:max-w-[480px] max-[820px]:text-left">
              <div className="flex items-center gap-3.5">
                <span className="grid h-10 w-10 place-items-center rounded-[11px] border border-brand-border bg-brand-soft text-accent">
                  <Zap size={18} />
                </span>
                <p className="m-0 text-[12px] text-muted">
                  <strong className="mb-1 block text-xs text-text">
                    Fast by default
                  </strong>
                  Low-latency APIs built for real-time products.
                </p>
              </div>
              <div className="flex items-center gap-3.5">
                <span className="grid h-10 w-10 place-items-center rounded-[11px] border border-brand-border bg-brand-soft text-accent">
                  <ShieldCheck size={18} />
                </span>
                <p className="m-0 text-[12px] text-muted">
                  <strong className="mb-1 block text-xs text-text">
                    Secure at every layer
                  </strong>
                  Your data stays protected and under your control.
                </p>
              </div>
              <div className="flex items-center gap-3.5">
                <span className="grid h-10 w-10 place-items-center rounded-[11px] border border-brand-border bg-brand-soft text-accent">
                  <Blocks size={18} />
                </span>
                <p className="m-0 text-[12px] text-muted">
                  <strong className="mb-1 block text-xs text-text">
                    Designed to compose
                  </strong>
                  Use one capability or connect the whole stack.
                </p>
              </div>
            </div>
            <Link
              href="/?mode=signup"
              className="inline-flex items-center gap-2.5 text-xs font-bold text-accent"
            >
              Read the API docs <MoveRight size={18} />
            </Link>
          </div>
          <div className="overflow-hidden rounded-[18px] border border-brand-border bg-brand-soft shadow-[0_35px_80px_rgba(0,0,0,.4)]">
            <div className="flex h-[54px] items-center gap-[25px] border-b border-brand-border px-[18px] text-[12px] text-muted">
              <span className="text-muted">
                <span className="mr-[5px] bg-brand-soft p-[3px] text-[12px] text-text">
                  TS
                </span>{" "}
                Node.js
              </span>
              <span>Python</span>
              <button
                type="button"
                className="ml-auto rounded-[7px] border border-brand-border bg-brand-soft px-2.5 py-1.5 text-[12px] text-muted"
              >
                Copy
              </button>
            </div>
            <pre className="m-0 min-h-[340px] overflow-auto p-[28px_30px] font-mono text-xs leading-[2.1] text-muted max-[560px]:px-[18px] max-[560px]:py-5 max-[560px]:text-[12px]">
              <code>
                <span className="text-accent">import</span> {"{ EbmaAI }"}{" "}
                <span className="text-accent">from</span>{" "}
                <span className="text-success">&quot;@ebma/ai&quot;</span>;
                {"\n\n"}
                <span className="text-accent">const</span> ebma ={" "}
                <span className="text-accent">new</span>{" "}
                <span className="text-cyan">EbmaAI</span>({"{"}
                {"\n"} apiKey: process.env.
                <span className="text-warning">EBMA_API_KEY</span>
                {"\n"}
                {"}"});
                {"\n\n"}
                <span className="text-accent">const</span> transcript ={" "}
                <span className="text-accent">await</span> ebma.speech.
                <span className="text-cyan">transcribe</span>({"{"}
                {"\n"} audio: audioFile,
                {"\n"} language:{" "}
                <span className="text-success">&quot;auto&quot;</span>,
                {"\n"} diarize:{" "}
                <span className="text-warning">true</span>
                {"\n"}
                {"}"});
                {"\n\n"}
                console.
                <span className="text-cyan">log</span>(transcript.text);
              </code>
            </pre>
            <div className="flex h-11 items-center justify-between border-t border-brand-border bg-brand-soft px-[18px] text-[12px] text-muted">
              <span className="flex items-center gap-[5px] text-success">
                <Check size={13} /> 200 OK
              </span>
              <span>184 ms</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-brand-soft py-[120px] max-[820px]:py-[90px]" id="enterprise">
        <div className={container}>
          <div className="text-center">
            <span className="inline-flex items-center gap-[7px] text-[12px] font-extrabold uppercase tracking-[0.13em] text-accent">
              Made for real work
            </span>
            <h2 className="my-[15px] font-heading text-[clamp(35px,4vw,50px)] font-semibold leading-[1.12] tracking-[-0.04em] max-[560px]:text-[34px]">
              AI that moves business forward.
            </h2>
            <p className="text-sm text-muted">
              From the first customer hello to the millionth conversation.
            </p>
          </div>
          <div className="mt-[50px] grid grid-cols-[1.25fr_1fr_1fr] gap-[18px] max-[820px]:grid-cols-2 max-[560px]:grid-cols-1">
            <div className="relative min-h-[384px] overflow-hidden rounded-[18px] border border-brand-border bg-brand-soft p-[27px] max-[820px]:col-span-full max-[560px]:col-span-auto">
              <div className="relative -mx-[27px] -mt-[27px] mb-[26px] h-[152px] border-b border-brand-border bg-surface">
                <div className="absolute left-[65px] top-[37px] grid h-[76px] w-[76px] place-items-center rounded-full border border-brand-border bg-brand-soft text-accent shadow-[0_0_0_10px_rgba(91,79,233,.05),0_0_0_20px_rgba(91,79,233,.025)]">
                  <Headphones />
                  <span className="absolute bottom-[5px] right-[3px] h-[13px] w-[13px] rounded-full border-[3px] border-brand-border bg-success" />
                </div>
                <div className="absolute right-[38px] top-[50px] rounded-[9px] border border-brand-border bg-brand-soft px-[11px] py-[9px] text-[12px] text-muted">
                  <span className="inline-block h-[7px] w-[7px] rounded-full bg-success shadow-[0_0_0_4px_rgba(52,211,153,.12)]" />{" "}
                  Live call
                  <div className="mt-[5px] flex h-[22px] items-center gap-0.5">
                    {Array.from({ length: 18 }, (_, i) => (
                      <i
                        key={i}
                        className="w-0.5 rounded-sm bg-brand-soft"
                        style={{ height: `${6 + ((i * 7) % 17)}px` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-accent">
                Customer experience
              </span>
              <h3 className="my-3 font-heading text-xl font-semibold leading-[1.3] tracking-[-0.02em]">
                Understand every conversation.
              </h3>
              <p className="text-xs leading-[1.7] text-muted">
                Transcribe, analyze, and act on customer calls as they happen.
              </p>
              <a
                href="#contact"
                className="absolute bottom-[26px] flex items-center gap-[5px] text-[12px] font-bold text-muted"
              >
                Explore contact center AI <ChevronRight size={16} />
              </a>
            </div>
            <div className="relative min-h-[384px] overflow-hidden rounded-[18px] border border-brand-border bg-brand-soft p-[27px]">
              <div className="mb-[65px] grid h-[46px] w-[46px] place-items-center rounded-xl border border-brand-border bg-brand-soft text-accent">
                <MessageSquareText />
              </div>
              <span className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-accent">
                Conversational AI
              </span>
              <h3 className="my-3 font-heading text-xl font-semibold leading-[1.3] tracking-[-0.02em]">
                Agents people enjoy talking to.
              </h3>
              <p className="text-xs leading-[1.7] text-muted">
                Natural voice agents that understand context, intent, and nuance.
              </p>
              <a
                href="#contact"
                className="absolute bottom-[26px] flex items-center gap-[5px] text-[12px] font-bold text-muted"
              >
                Explore voice agents <ChevronRight size={16} />
              </a>
            </div>
            <div className="relative min-h-[384px] overflow-hidden rounded-[18px] border border-brand-border bg-brand-soft p-[27px]">
              <div className="mb-[65px] grid h-[46px] w-[46px] place-items-center rounded-xl border border-brand-border bg-brand-soft text-accent">
                <Code2 />
              </div>
              <span className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-accent">
                Product teams
              </span>
              <h3 className="my-3 font-heading text-xl font-semibold leading-[1.3] tracking-[-0.02em]">
                Put voice at the heart of your product.
              </h3>
              <p className="text-xs leading-[1.7] text-muted">
                Ship accessible, intelligent voice features without building the
                stack.
              </p>
              <a
                href="#contact"
                className="absolute bottom-[26px] flex items-center gap-[5px] text-[12px] font-bold text-muted"
              >
                Explore embedded AI <ChevronRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        className="relative grid h-[510px] place-items-center overflow-hidden bg-brand-gradient after:pointer-events-none after:absolute after:inset-0 after:[background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] after:[background-size:58px_58px] after:content-[''] max-[560px]:h-[540px]"
        id="contact"
      >
        <div className="pointer-events-none absolute -left-[260px] -top-[25px] h-[560px] w-[560px] rounded-full border border-white/20" />
        <div className="pointer-events-none absolute -right-[160px] top-[50px] h-[420px] w-[420px] rounded-full border border-white/20" />
        <div className={cx(container, "relative z-[2] text-center text-on-brand")}>
          <span className="inline-flex items-center gap-[7px] text-[12px] font-extrabold uppercase tracking-[0.13em] text-on-brand">
            Your next idea starts here
          </span>
          <h2 className="my-4 font-heading text-[50px] font-[620] leading-[1.08] tracking-[-0.045em] max-[560px]:text-[39px]">
            Let&apos;s make AI
            <br />
            <span className="text-on-brand">
              sound more human.
            </span>
          </h2>
          <p className="mx-auto mb-[30px] max-w-[570px] text-sm leading-[1.7] text-on-brand">
            Start building for free, or talk to our team about bringing ebma AI to
            your organization.
          </p>
          <div className="flex justify-center gap-3 max-[560px]:flex-col max-[560px]:items-stretch">
            <Button variant="light" large href="/?mode=signup">
              Start building free <ArrowRight size={18} />
            </Button>
            <Button variant="glass" large href="mailto:hello@ebma.ai">
              Talk to our team
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-brand-soft">
        <div
          className={cx(
            container,
            "flex justify-between py-[75px] pb-[65px] max-[820px]:gap-[50px] max-[560px]:block max-[560px]:py-[55px]",
          )}
        >
          <div>
            <Brand />
            <p className="my-[22px] mb-8 text-xs leading-[1.7] text-accent">
              Voice and language intelligence
              <br />
              for every product and person.
            </p>
            <span className="text-[12px] uppercase tracking-[0.1em] text-accent">
              Made with purpose in India.
            </span>
          </div>
          <div className="flex gap-20 max-[1050px]:gap-[45px] max-[820px]:gap-[30px] max-[560px]:mt-[45px] max-[560px]:grid max-[560px]:grid-cols-2 max-[560px]:gap-[35px]">
            <div className="flex flex-col gap-[13px]">
              <strong className="mb-[5px] text-[12px] uppercase tracking-[0.1em] text-muted">
                Products
              </strong>
              <a href="#products" className="text-[12px] text-accent hover:text-text">
                Speech to text
              </a>
              <a href="#products" className="text-[12px] text-accent hover:text-text">
                Text to speech
              </a>
              <a href="#products" className="text-[12px] text-accent hover:text-text">
                Language model
              </a>
            </div>
            <div className="flex flex-col gap-[13px]">
              <strong className="mb-[5px] text-[12px] uppercase tracking-[0.1em] text-muted">
                Developers
              </strong>
              <a href="#developers" className="text-[12px] text-accent hover:text-text">
                Documentation
              </a>
              <a href="#developers" className="text-[12px] text-accent hover:text-text">
                API reference
              </a>
              <a href="#developers" className="text-[12px] text-accent hover:text-text">
                Playground
              </a>
            </div>
            <div className="flex flex-col gap-[13px]">
              <strong className="mb-[5px] text-[12px] uppercase tracking-[0.1em] text-muted">
                Company
              </strong>
              <a href="#contact" className="text-[12px] text-accent hover:text-text">
                About
              </a>
              <a href="#contact" className="text-[12px] text-accent hover:text-text">
                Contact
              </a>
              <a href="#contact" className="text-[12px] text-accent hover:text-text">
                Careers
              </a>
            </div>
          </div>
        </div>
        <div
          className={cx(
            container,
            "flex h-[66px] items-center justify-between border-t border-brand-border text-[12px] text-accent max-[560px]:h-[85px] max-[560px]:flex-col max-[560px]:justify-center max-[560px]:gap-2.5",
          )}
        >
          <span>© {new Date().getFullYear()} ebma AI. All rights reserved.</span>
          <div className="flex gap-5">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
