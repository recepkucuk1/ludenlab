// Edge runtime Sentry init. Aktif edge route'umuz yok ama Next.js middleware
// veya gelecekteki edge route'lar için hazır.
import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env.SENTRY_DSN ??
  "https://6003a0f2c768d250ee4b34fbb4f118ea@o4511298910683136.ingest.de.sentry.io/4511298916974672";

Sentry.init({
  dsn,
  tracesSampleRate: 0.1,
  debug: false,
  environment: process.env.NODE_ENV,
});
