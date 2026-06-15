// Client-side Sentry init. Tarayıcıda yüklenen JavaScript'in attığı hatalar.
// Next.js bu dosyayı otomatik olarak client bundle'a dahil eder.
import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://6003a0f2c768d250ee4b34fbb4f118ea@o4511298910683136.ingest.de.sentry.io/4511298916974672";

Sentry.init({
  dsn,
  // Performance trace örnekleme — düşük maliyet için %10.
  tracesSampleRate: 0.1,
  // Hata olan oturumları %100 kaydet, normal oturumları %10.
  // Replay sayesinde kullanıcı hatadan önce ne tıkladıysa görüyorsun.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  // Replay'de PII korumak için input'ları maskele (KVKK için kritik).
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],
  debug: false,
  environment: process.env.NODE_ENV,
});

// Next.js App Router gezinme zamanlamasını Sentry trace'lerine bağlar.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
