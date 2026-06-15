"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "system" | "dark";

const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Açık tema", Icon: Sun },
  { value: "system", label: "Sistem teması", Icon: Monitor },
  { value: "dark", label: "Koyu tema", Icon: Moon },
];

/**
 * 3-state segmented theme toggle — light / system / dark.
 *
 * Variants:
 *   - "segmented" (default): full segmented control with 3 buttons
 *   - "compact": single icon button that cycles through themes
 */
export function ThemeToggle({
  variant = "segmented",
  className,
}: {
  variant?: "segmented" | "compact";
  className?: string;
}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch — render skeleton until client has settled
  if (!mounted) {
    return (
      <div
        className={cn(
          variant === "segmented"
            ? "h-8 w-[108px] rounded-lg bg-muted/50 animate-pulse"
            : "h-8 w-8 rounded-lg bg-muted/50 animate-pulse",
          className
        )}
        aria-hidden
      />
    );
  }

  if (variant === "compact") {
    const current = (theme as Theme) ?? "system";
    const next: Theme =
      current === "light" ? "dark" : current === "dark" ? "system" : "light";
    const CurrentIcon =
      resolvedTheme === "dark" ? Moon : current === "system" ? Monitor : Sun;

    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={`Temayı değiştir (şu an: ${THEMES.find((t) => t.value === current)?.label ?? ""})`}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg",
          "text-muted-foreground hover:text-foreground hover:bg-muted",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        <CurrentIcon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema seçimi"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5",
        "border border-border/60",
        className
      )}
    >
      {THEMES.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex h-7 min-w-7 flex-1 items-center justify-center rounded-md px-2",
              "transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
