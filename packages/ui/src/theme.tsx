"use client";

import { ThemeProvider as NextThemeProvider, useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "./lib/cn";

/** next-themes sarmalayıcı. <html suppressHydrationWarning> ile birlikte kullanın. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="luden-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  );
}

/** Açık/koyu tema düğmesi. Hydration uyumsuzluğunu önlemek için mount-guard'lı. */
export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
      className={cn("p-btn p-btn--ghost p-btn--sm", className)}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      suppressHydrationWarning
    >
      {mounted ? (
        isDark ? (
          <Sun size={18} aria-hidden />
        ) : (
          <Moon size={18} aria-hidden />
        )
      ) : (
        <span style={{ width: 18, height: 18, display: "inline-block" }} />
      )}
    </button>
  );
}
