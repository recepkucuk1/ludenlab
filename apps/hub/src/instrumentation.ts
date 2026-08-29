import * as Sentry from "@sentry/nextjs";

/**
 * Next.js açılış kancası — sunucu süreci başlarken BİR KEZ çalışır.
 * İki işi var: ortam denetimi (#25) ve hata enstrümantasyonu (#38).
 */
export async function register() {
  // Yalnız Node.js runtime'ında (edge/proxy derlemesinde process.env aynı değil).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // BUILD sırasında ÇALIŞTIRMA. `next build` NODE_ENV=production ile koşar; runtime env'i
  // (iyzico anahtarları vb.) build ortamında bulunmayabilir ve ölümcül kontrol DEPLOY'U
  // patlatırdı. Denetimin amacı çalışan sunucuyu doğrulamak, derlemeyi değil.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  /**
   * Sentry (2026-08 denetimi #38): paket bağımlılıklarda vardı ama HİÇ bağlanmamıştı —
   * yani prod'daki hatalar yalnız Hostinger log dosyasında kalıyordu; kimse bakmadıkça
   * ödeme/cron/webhook hataları sessizce birikiyordu. Güvenlik düzeltmelerinin çoğu
   * "başarısızlığı GÖRÜNÜR kıl" ilkesine dayanıyor (kredi iadesi, iptal doğrulaması,
   * kütük yazımı); o loglar bir yere akmazsa o ilke kâğıt üstünde kalır.
   *
   * DSN YOKSA SESSİZ: `dsn: undefined` ile SDK devre dışı kalır. Böylece bu değişiklik
   * env eklenene kadar davranışı DEĞİŞTİRMEZ — kurulum sırası: önce kod, sonra DSN.
   */
  const dsn = process.env.SENTRY_DSN?.trim();
  if (dsn) {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      // Örnekleme: hata yakalama tam, iz (trace) düşük — tek Node sürecinde ek yük olmasın.
      tracesSampleRate: 0.05,
      // PII göndermiyoruz: çocuk verisi taşıyan bir üründe varsayılan olarak KAPALI kalmalı.
      sendDefaultPii: false,
    });
  }

  const { assertEnv } = await import("@/lib/env");
  assertEnv();
}

/**
 * Next.js sunucu tarafı istek hatalarını Sentry'ye iletir (DSN yoksa no-op).
 * Route handler / RSC içinde yakalanmayan her hata buradan geçer.
 */
export const onRequestError = Sentry.captureRequestError;
