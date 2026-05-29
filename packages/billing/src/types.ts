/* ============================================================
   @ludenlab/billing — ARAYÜZ KABUĞU (Faz 2)
   Burada YALNIZCA sözleşmeler var. Gerçek iyzico mantığı Faz 5'te
   Studio'dan terfi edilecek (bkz. ROADMAP.md). iyzico en sonda.
   ============================================================ */

export type BillingProduct = "studio" | "atolye" | "bry";

export type SubscriptionStatus =
  | "TRIAL"
  | "PENDING"
  | "ACTIVE"
  | "CANCELLED"
  | "EXPIRED"
  | "PAST_DUE";

export type BillingCycle = "MONTHLY" | "YEARLY";

/** iyzico X-IYZ-SIGNATURE-V3 HMAC'inin üzerine kurulduğu alanlar. */
export interface IyzicoSignatureFields {
  iyziEventType: string;
  subscriptionReferenceCode: string;
  orderReferenceCode: string;
  customerReferenceCode: string;
}

export type IyzicoEventType =
  | "subscription.order.success"
  | "subscription.order.failure"
  | "subscription.cancelled"
  | "subscription.expired";

/** Sağlayıcıdan bağımsız, normalize edilmiş webhook olayı. */
export interface NormalizedWebhookEvent {
  eventType: IyzicoEventType | (string & {});
  subscriptionReferenceCode: string;
  orderReferenceCode: string;
  customerReferenceCode: string;
  raw: unknown;
}

export interface FulfillmentContext {
  event: NormalizedWebhookEvent;
}

/**
 * Ürün-başına fulfillment. Tek webhook router'ı, aboneliği sahiplenen
 * handler'ı bulup ilgili olay metodunu çağırır:
 *   studio → kredi · atolye → erişim · bry → lisans
 */
export interface FulfillmentHandler {
  readonly product: BillingProduct;
  /** Bu abonelik ref'i bu ürüne mi ait? (router yönlendirmesi için) */
  owns(subscriptionReferenceCode: string): Promise<boolean>;
  onSuccess(ctx: FulfillmentContext): Promise<void>;
  onFailure(ctx: FulfillmentContext): Promise<void>;
  onCancelled(ctx: FulfillmentContext): Promise<void>;
  onExpired(ctx: FulfillmentContext): Promise<void>;
}

export interface WebhookRouterConfig {
  merchantId: string;
  secretKey: string;
  handlers: FulfillmentHandler[];
}

export interface CheckoutInput {
  product: BillingProduct;
  pricingPlanReferenceCode: string;
  callbackUrl: string;
  customer: {
    name: string;
    surname: string;
    email: string;
    gsmNumber: string;
    identityNumber: string;
  };
}

export interface CheckoutResult {
  status: "success" | "failure";
  checkoutFormContent?: string;
  token?: string;
  errorMessage?: string;
}

export interface IyzicoConfig {
  apiKey: string;
  secretKey: string;
  merchantId: string;
  baseUrl: string;
}

/** Faz 5'te gerçeklenecek iyzico Subscription API v2 sarmalayıcısı. */
export interface IyzicoClient {
  initializeCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  cancelSubscription(subscriptionReferenceCode: string): Promise<void>;
}

/** Faz 5'te gerçeklenecek webhook router (verify + idempotent + route). */
export interface WebhookRouter {
  handle(rawBody: string, signatureHeader: string | null): Promise<{ ok: boolean; routedTo?: BillingProduct }>;
}
