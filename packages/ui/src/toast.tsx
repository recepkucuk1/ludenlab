"use client";

import { Toaster } from "sonner";

export { toast } from "sonner";

/** Poster temalı sonner toaster. App layout'ında bir kez render edin. */
export function PToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          border: "var(--poster-border)",
          borderRadius: "var(--poster-radius-md)",
          boxShadow: "var(--poster-shadow-md)",
          background: "var(--poster-panel)",
          color: "var(--poster-ink)",
          fontFamily: "inherit",
        },
      }}
    />
  );
}
