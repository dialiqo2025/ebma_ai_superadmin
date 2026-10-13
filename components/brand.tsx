"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";

export function Brand({ compact = false, href = "/home" }: { compact?: boolean; href?: string }) {
  const { theme } = useTheme();
  const logoSrc = compact
    ? "/ebma-icon.png"
    : theme === "dark"
      ? "/ebma-logo-dark.png"
      : "/ebma-logo-light.png";

  return (
    <Link href={href} className="inline-flex w-max items-center" aria-label="ebma.ai home">
      <Image
        src={logoSrc}
        alt="ebma.ai"
        width={compact ? 40 : 152}
        height={compact ? 40 : 42}
        className="block h-auto max-h-[42px] w-auto object-contain"
        priority
        unoptimized
      />
    </Link>
  );
}
