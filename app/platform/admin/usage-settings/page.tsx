import Link from "next/link";

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl text-[#d7def0]">
      <p className="font-mono text-[11px] tracking-[.24em] text-[#8f82ff]">CONTROL PANEL</p>
      <h1 className="mt-3 text-4xl font-extrabold text-white">Usage settings moved</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#8995b3]">
        TTS, STT, and LLM wallet rates are now configured per plan when you create or edit a
        plan. Assign users to a plan from the Users screen to apply those rates.
      </p>
      <Link
        href="/platform/admin/plans"
        className="mt-8 inline-flex rounded-lg bg-[#5d50e8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6a5cf4]"
      >
        Open Plans & pricing
      </Link>
    </main>
  );
}
