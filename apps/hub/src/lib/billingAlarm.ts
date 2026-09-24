import * as Sentry from "@sentry/nextjs";

/**
 * Para yolunda "birinin bakması gereken" başarısızlık → log + Sentry.
 *
 * NEDEN (2026-09 denetimi): iptal doğrulanamadı, plan değişikliği sağlayıcıya iletilemedi,
 * yinelenen abonelik gibi durumlar yalnız `console.error` ile yazılıyordu. Sentry varsayılan
 * entegrasyonları konsol çıktısını YAKALAMAZ ve Hostinger logu her deploy'da sıfırlanır —
 * yani bu alarmlar kimseye ulaşmıyordu. Burada açıkça Sentry olayı üretilir (DSN yoksa
 * SDK no-op; davranış yalnız log olarak kalır).
 *
 * `context`e KİŞİSEL VERİ YAZMA (e-posta, ad, TCKN): kimlik/ref yeterli.
 */
export function billingAlarm(message: string, context: Record<string, unknown> = {}): void {
  console.error(`[billing-alarm] ${message}`, context);
  try {
    Sentry.captureMessage(message, { level: "error", tags: { area: "billing" }, extra: context });
  } catch {
    // Alarm yolu asıl işi asla bozmamalı.
  }
}
