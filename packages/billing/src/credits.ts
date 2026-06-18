/**
 * Kredi/abonelik yardımcıları — modül-bağımsız (saf) kısım. Prisma'ya dokunmaz;
 * modüller (studio/atolye) kendi client + modelleriyle çağırır.
 */

/**
 * Bir abonelik dönemi için kredi yüklenmeli mi? Modül-tarafı reconcile, yenileme
 * idempotency'sinde kullanır: kredilenmiş dönem (lastCreditedPeriodEnd) bittiyse
 * (~now, ~1 gün erken tampon → erken çekim) yeni dönem kredisi yüklenir. now-tabanlı,
 * eşik yok → callback↔webhook gecikmesinden bağımsız güvenli.
 */
export function shouldGrantCredits(
  lastCreditedPeriodEnd: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!lastCreditedPeriodEnd) return true;
  const DAY = 24 * 60 * 60 * 1000;
  return now.getTime() >= lastCreditedPeriodEnd.getTime() - DAY;
}
