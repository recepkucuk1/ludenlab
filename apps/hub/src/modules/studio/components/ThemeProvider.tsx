"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { MotionConfig } from "framer-motion";

/**
 * 3-state theme provider backed by next-themes.
 *   - "light" / "dark" / "system" (default: "light" — dark is opt-in)
 *   - class-based (.dark on <html>)
 *   - persisted via localStorage key `luden-theme`
 *   - disableTransitionOnChange: avoids color flicker on toggle
 *
 * FOUC is prevented by the inline script in `app/layout.tsx`, which only
 * applies .dark on app sub-routes (/studio/* · /atolye/*) for an explicit
 * "dark" choice (or "system" + OS-dark). Landing/auth routes stay light.
 *
 * MotionConfig reducedMotion="user" makes every framer-motion element
 * respect prefers-reduced-motion: reduce automatically (entrance,
 * stagger, slide, hover lift). No per-component opt-in needed.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      storageKey="luden-theme"
      disableTransitionOnChange
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemesProvider>
  );
}
