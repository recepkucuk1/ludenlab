/* ============================================================
   @ludenlab/billing — abonelik altyapısı (ortak, sağlayıcı-bağımsız).
   Entitlement/kredi/checkout-url yardımcıları. studio · atolye · hub tüketir.
   NOT: Paynkolay istemcisi kaldırıldı (sağlayıcı değişimi — PayTR entegrasyonu
   gelene kadar ödeme başlatma kapalı; git geçmişinde: paynkolay-*.ts).
   ============================================================ */

export { buildCheckoutUrl, moduleReturnUrl } from "./urls";
export type { CheckoutModule, CheckoutInterval } from "./urls";
export { resolveEntitlement, readCentralEntitlement } from "./entitlement";
export type { Entitlement, EntitlementStatus, EntitlementAccess } from "./entitlement";
export { shouldGrantCredits } from "./credits";
