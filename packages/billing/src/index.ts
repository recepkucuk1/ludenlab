/* ============================================================
   @ludenlab/billing — iyzico abonelik altyapısı (ortak)
   Gerçek uygulama: iyzico istemci + imza + webhook router.
   studio · atolye · bry bu paketi tüketir.
   ============================================================ */

export type {
  BillingProduct,
  BillingCycle,
  IyzicoConfig,
  IyzicoResult,
  IyzicoAddress,
  IyzicoCustomer,
  PricingPlanItem,
  ProductItem,
  ProductResult,
  ProductListResult,
  PricingPlanResult,
  PricingPlanListResult,
  CheckoutFormInitResult,
  CheckoutFormRetrieveResult,
  SubscriptionRetrieveResult,
  SubscriptionCancelResult,
  SubscriptionUpgradeResult,
  CreatePricingPlanInput,
  InitCheckoutFormInput,
  UpgradeSubscriptionInput,
  IyzicoClient,
  IyzicoEventType,
  NormalizedWebhookEvent,
  FulfillmentContext,
  FulfillmentHandler,
  WebhookRouterConfig,
  WebhookResult,
  WebhookRouter,
} from "./types";

export { createIyzicoClient } from "./iyzico-client";
export {
  createWebhookRouter,
  verifyIyzicoSignature,
  normalizeIyzicoEvent,
  diagnoseIyzicoSignature,
  type SignatureDiagnosis,
} from "./webhook";
export { buildCheckoutUrl, moduleReturnUrl } from "./urls";
export type { CheckoutModule, CheckoutInterval } from "./urls";
export {
  resolveEntitlement,
  readCentralEntitlement,
  isPastDueExpired,
  PAST_DUE_GRACE_DAYS,
} from "./entitlement";
export type { Entitlement, EntitlementStatus, EntitlementAccess } from "./entitlement";
export {
  shouldGrantCredits,
  shouldRevokeModulePlan,
  creditClaimThreshold,
  CREDIT_ANCHOR_TOLERANCE_DAYS,
} from "./credits";

/* 2026-09 denetimi — para yolu senkronu için eklenen ortak parçalar. */
export { mapIyzicoSubscriptionStatus, isKnownIyzicoSubscriptionStatus } from "./subscriptionStatus";
export type { CentralSubscriptionStatus } from "./subscriptionStatus";
export { periodCreditAmount } from "./credits";
export { ACTIVE_STALE_GRACE_DAYS, isActiveStale } from "./entitlement";
export { creditSetDelta, monthStartUTC, shouldRefillFreeCredits } from "./freeCredits";
export type { CreditLedgerDelta } from "./freeCredits";
