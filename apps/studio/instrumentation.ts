import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture errors thrown inside server-side React (page.tsx, layout.tsx, route.ts)
// and ship them to Sentry. Without this, server-rendered errors are silent.
export const onRequestError = Sentry.captureRequestError;
