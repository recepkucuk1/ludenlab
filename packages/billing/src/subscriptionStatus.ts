/**
 * Sağlayıcı (iyzico) abonelik durumu → merkezi `billing.Subscription.status`.
 *
 * Bu eşleme ESKİDEN yalnız `/odeme/sonuc` içinde gömülüydü. Sweep cron'unun "dönemi
 * geçmiş ACTIVE" abonelikleri sağlayıcıdan senkronlaması için de gerektiğinden tek yere
 * alındı: iki kopyanın zamanla ayrışması para-kritik olurdu (biri iptali görür, diğeri
 * görmez). Bilinmeyen durum ACTIVE'e DÜŞMEZ — erişim açan yön hep açık kanıt ister.
 */
export type CentralSubscriptionStatus = "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";

export function mapIyzicoSubscriptionStatus(
  providerStatus: string | null | undefined,
): CentralSubscriptionStatus {
  switch ((providerStatus ?? "").trim().toUpperCase()) {
    case "ACTIVE":
    case "UPGRADED":
      return "ACTIVE";
    case "PENDING":
      return "PENDING";
    case "UNPAID":
      return "PAST_DUE";
    case "CANCELED":
    case "CANCELLED": // sağlayıcı yazımı değişirse diye
      return "CANCELED";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return "PENDING";
  }
}
