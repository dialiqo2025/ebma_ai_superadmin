"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  return (
    <div role="group" aria-label="Color theme" className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface-raised p-1">
      <button type="button" aria-label="Use light theme" aria-pressed={theme === "light"} title="Light theme" onClick={() => setTheme("light")} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors ${theme === "light" ? "bg-brand-gradient text-on-brand" : "text-muted hover:text-text"}`}>
        <Sun size={15} /><span className={compact ? "sr-only" : ""}>Light</span>
      </button>
      <button type="button" aria-label="Use dark theme" aria-pressed={theme === "dark"} title="Dark theme" onClick={() => setTheme("dark")} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors ${theme === "dark" ? "bg-brand-gradient text-on-brand" : "text-muted hover:text-text"}`}>
        <Moon size={15} /><span className={compact ? "sr-only" : ""}>Dark</span>
      </button>
    </div>
  );
}
