/* ============================================================
   @ludenlab/billing — iyzico abonelik altyapısı (ortak)
   studio · atolye · bry tarafından tüketilir. Kaynak-olarak
   (transpilePackages) kullanılır; ürün-özel DB/fulfillment
   uygulamada FulfillmentHandler ile sağlanır.
   ============================================================ */

export type BillingProduct = "studio" | "atolye" | "bry";

export type BillingCycle = "MONTHLY" | "YEARLY";

/** iyzico istemci yapılandırması (SDK için merchantId gerekmez; webhook için gerekir). */
export interface IyzicoConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

// ─── İstemci sonuç tipleri (yanıt data|kök normalize edilmiştir) ──────────────

export interface IyzicoResult {
  status: "success" | "failure";
  errorCode?: string;
  errorMessage?: string;
}

export interface IyzicoAddress {
  contactName: string;
  city: string;
  district: string;
  country: string;
  address: string;
  zipCode: string;
}

export interface IyzicoCustomer {
  name: string;
  surname: string;
  identityNumber: string;
  email: string;
  gsmNumber: string;
  billingAddress: IyzicoAddress;
  shippingAddress: IyzicoAddress;
}

export interface PricingPlanItem {
  referenceCode: string;
  name: string;
  price: number;
  paymentInterval: string;
  paymentIntervalCount: number;
}

export interface ProductItem {
  referenceCode: string;
  name: string;
  description?: string;
  pricingPlans: PricingPlanItem[];
}

export interface ProductResult extends IyzicoResult {
  referenceCode?: string;
}
export interface ProductListResult extends IyzicoResult {
  items: ProductItem[];
}
export interface PricingPlanResult extends IyzicoResult {
  referenceCode?: string;
}
export interface PricingPlanListResult extends IyzicoResult {
  items: PricingPlanItem[];
}
export interface CheckoutFormInitResult extends IyzicoResult {
  token?: string;
  checkoutFormContent?: string;
}
export interface CheckoutFormRetrieveResult extends IyzicoResult {
  referenceCode?: string; // subscriptionReferenceCode
  parentReferenceCode?: string;
  pricingPlanReferenceCode?: string;
  customerReferenceCode?: string;
  subscriptionStatus?: string;
}
export interface SubscriptionRetrieveResult extends IyzicoResult {
  referenceCode?: string;
  pricingPlanReferenceCode?: string;
  customerReferenceCode?: string;
  subscriptionStatus?: string;
}
export interface SubscriptionCancelResult extends IyzicoResult {
  referenceCode?: string;
}

export interface CreatePricingPlanInput {
  productReferenceCode: string;
  name: string;
  price: number;
  paymentInterval?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  paymentIntervalCount?: number;
  trialPeriodDays?: number;
}

export interface InitCheckoutFormInput {
  pricingPlanReferenceCode: string;
  callbackUrl: string;
  customer: IyzicoCustomer;
  subscriptionInitialStatus?: "ACTIVE" | "PENDING";
}

/** iyzico Subscription API v2 istemcisi (config ile oluşturulur — env'siz). */
export interface IyzicoClient {
  createProduct(name: string, description?: string): Promise<ProductResult>;
  listProducts(page?: number, count?: number): Promise<ProductListResult>;
  createPricingPlan(input: CreatePricingPlanInput): Promise<PricingPlanResult>;
  listPricingPlans(productReferenceCode: string, page?: number, count?: number): Promise<PricingPlanListResult>;
  initializeCheckoutForm(input: InitCheckoutFormInput): Promise<CheckoutFormInitResult>;
  retrieveCheckoutForm(token: string): Promise<CheckoutFormRetrieveResult>;
  retrieveSubscription(subscriptionReferenceCode: string): Promise<SubscriptionRetrieveResult>;
  cancelSubscription(subscriptionReferenceCode: string): Promise<SubscriptionCancelResult>;
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

export type IyzicoEventType =
  | "subscription.order.success"
  | "subscription.order.failure"
  | "subscription.unpaid"
  | "subscription.cancelled"
  | "subscription.expired"
  | (string & {});

/** Sağlayıcıdan bağımsız, normalize edilmiş webhook olayı. */
export interface NormalizedWebhookEvent {
  eventType: IyzicoEventType;
  iyziReferenceCode: string; // olay benzersiz kimliği (idempotency anahtarı)
  subscriptionReferenceCode: string;
  orderReferenceCode: string;
  customerReferenceCode: string;
  raw: Record<string, unknown>;
}

export interface FulfillmentContext {
  event: NormalizedWebhookEvent;
}

/**
 * Ürün-başına fulfillment. Tek webhook router'ı, aboneliği sahiplenen
 * handler'ı (owns) bulup ilgili olay metodunu çağırır:
 *   studio → kredi · atolye → erişim/kredi · bry → lisans
 * İdempotency + DB kalıcılığı HANDLER'ın sorumluluğundadır (atomik).
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
  /** Yerel handler'larca sahiplenilmeyen webhook'lar bu URL'lere FAN-OUT edilir
      (tek iyzico hesabı / tek webhook → çok app). Forward'lanan istekler leaf modda
      işlenir (x-ll-forwarded), yani tekrar forward etmez → döngü yok. */
  forwardUrls?: string[];
}

export interface WebhookResult {
  ok: boolean;
  status?: number; // HTTP önerisi (geçersiz imza 401, kötü payload 400, hata 500)
  routedTo?: BillingProduct;
  forwarded?: boolean;
  reason?: string;
}

/** verify + idempotent (handler) + route eden tek webhook router.
    `opts.forwarded` = bu istek başka bir app'ten forward edildi (leaf modu → tekrar forward yok). */
export interface WebhookRouter {
  handle(
    rawBody: string,
    signatureHeader: string | null,
    opts?: { forwarded?: boolean },
  ): Promise<WebhookResult>;
}
