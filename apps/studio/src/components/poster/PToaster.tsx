"use client";
import { Toaster } from "sonner";

/**
 * Poster-themed sonner wrapper. All `toast(...)` call sites unchanged.
 * Uses CSS-var tokens so dark poster palette flips automatically.
 */
export function PToaster() {
  return (
    <Toaster
      position="bottom-right"
      duration={3000}
      toastOptions={{
        style: {
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          background: "var(--poster-panel)",
          color: "var(--poster-ink)",
          border: "2px solid var(--poster-ink)",
          borderRadius: 14,
          boxShadow: "0 6px 0 var(--poster-ink)",
          padding: "12px 14px",
        },
        classNames: {
          success: "poster-toast-success",
          error: "poster-toast-error",
          warning: "poster-toast-warning",
          info: "poster-toast-info",
        },
      }}
    />
  );
}
