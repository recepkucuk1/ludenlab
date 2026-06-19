/* ============================================================
   @ludenlab/billing — Paynkolay (nkolay VPOS) abonelik altyapısı (ortak).
   Sağlayıcı-bağımsız entitlement/kredi + Paynkolay istemci/hash/callback.
   studio · atolye · hub bu paketi tüketir.
   ============================================================ */

export { buildCheckoutUrl, moduleReturnUrl } from "./urls";
export type { CheckoutModule, CheckoutInterval } from "./urls";
export { resolveEntitlement, readCentralEntitlement } from "./entitlement";
export type { Entitlement, EntitlementStatus, EntitlementAccess } from "./entitlement";
export { shouldGrantCredits } from "./credits";

/* ── Paynkolay (nkolay VPOS) ── */
export { createPaynkolayClient } from "./paynkolay-client";
export {
  paymentHash,
  paymentListHash,
  cancelRefundHash,
  cardListHash,
  cardDeleteHash,
  callbackHash,
  formatRnd,
  formatTrxDate,
} from "./paynkolay-hash";
export { verifyPaynkolayCallback } from "./paynkolay-callback";
export type { PaynkolayCallbackFields, PaynkolayCallbackResult } from "./paynkolay-callback";
export type {
  PaynkolayConfig,
  PaynkolayClient,
  PaynkolayCustomer,
  HostedPaymentInput,
  HostedPaymentForm,
  ChargeStoredCardInput,
  PaynkolayPaymentResult,
  TransactionListInput,
  TransactionListItem,
  TransactionListResult,
  CancelRefundInput,
  SimpleResult,
  SavedCard,
  SavedCardListResult,
} from "./paynkolay-types";
