import Image from "next/image";
import Link from "next/link";

export function Brand({
  compact = false,
  href = "/home",
}: {
  compact?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex w-max items-center gap-1.5"
      aria-label="ebma AI home"
    >
      <Image
        src={compact ? "/ebma-mark.svg" : "/ebma-logo.svg"}
        alt="ebma"
        width={compact ? 40 : 112}
        height={compact ? 40 : 40}
        className="block object-contain"
        priority
      />
      {!compact && (
        <span className="border-l border-[#3c4368] pl-2 font-heading text-[12px] font-semibold tracking-[0.18em] text-[#b3b8d2]">
          AI
        </span>
      )}
    </Link>
  );
}
