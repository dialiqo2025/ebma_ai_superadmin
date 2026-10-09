"use client";

import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false, href = "/home" }: { compact?: boolean; href?: string }) {
  return (
    <Link href={href} className="inline-flex w-max items-center" aria-label="Ebma.ai home">
      <Image
        src={compact ? "/ebma-mark.svg?v=ebma-rising-star" : "/ebma-logo.svg?v=ebma-rising-star"}
        alt="ebma"
        width={compact ? 40 : 146}
        height={compact ? 40 : 41}
        className="block h-auto object-contain"
        unoptimized
        priority
      />
    </Link>
  );
}
