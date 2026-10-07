"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "./theme-provider";

export function Brand({ compact = false, href = "/home" }: { compact?: boolean; href?: string }) {
  const { theme } = useTheme();
  const mode = theme === "dark" ? "dark" : "light";
  return (
    <Link href={href} className="inline-flex w-max items-center" aria-label="Ebma.ai home">
      <Image
        src={compact ? `/ebma-mark-${mode}.png` : `/ebma-logo-${mode}.png`}
        alt="Ebma.ai"
        width={compact ? 40 : 146}
        height={compact ? 40 : 41}
        className="block h-auto object-contain"
        priority
      />
    </Link>
  );
}
