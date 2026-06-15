// Server-side Sentry init. Imported by instrumentation.ts when running in Node runtime.
// Captures errors from API routes, server components, server actions, and route handlers.
import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env.SENTRY_DSN ??
  "https://6003a0f2c768d250ee4b34fbb4f118ea@o4511298910683136.ingest.de.sentry.io/4511298916974672";

Sentry.init({
  dsn,
  // 10% transaction sampling — yeterli sinyal, düşük maliyet. Lansman sonrası
  // trafik bilince ayarlanır.
  // 10% transaction sampling — yeterli sinyal, düşük maliyet.
  // Lansman sonrası trafik bilince ayarlanır.
  tracesSampleRate: 0.1,
  debug: false,
  // Source dosyalarını ve ortamı raporlarda görünür kıl.
  environment: process.env.NODE_ENV,
  // Sağlık kontrolü/uptime ping'leri Sentry'ye gitmesin.
  ignoreTransactions: ["GET /api/health"],
});
