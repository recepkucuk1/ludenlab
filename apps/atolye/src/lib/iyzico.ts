/**
 * iyzico Subscription API v2 — resmî `iyzipay` Node.js SDK sarmalayıcısı.
 *
 * iyzico yanıt şekli (deneysel olarak doğrulandı):
 *   • BAŞARI: { status:"success", systemTime, data:{...} }  ← payload `data` altında
 *   • HATA:   { status:"failure", errorCode, errorMessage } ← düz
 *   • checkout init: token + checkoutFormContent kökte gelebilir.
 * `payload()` her iki şekle de dayanıklı (data varsa data, yoksa kök).
 */

import Iyzipay from "iyzipay";

// Lazy init — build zamanında env yok; ilk API çağrısında oluşturulur.
let _iyzipay: Iyzipay | null = null;
function getClient(): Iyzipay {
  if (!_iyzipay) {
    _iyzipay = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY ?? "",
      secretKey: process.env.IYZICO_SECRET_KEY ?? "",
      uri: process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com",
    });
  }
  return _iyzipay;
}

interface RawResponse {
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  systemTime?: number;
  token?: string;
  checkoutFormContent?: string;
  data?: unknown;
  [k: string]: unknown;
}

/** SDK callback'ini Promise'e çevirir. */
function run(exec: (cb: (err: Error | null, result: unknown) => void) => void): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    exec((err, result) => {
      if (err) reject(err);
      else resolve((result ?? {}) as RawResponse);
    });
  });
}

const conversationId = () => Date.now().toString();

/** Başarı payload'u: data nesnesi varsa o, yoksa kök yanıt. */
function payload(raw: RawResponse): Record<string, unknown> {
  return (raw.data && typeof raw.data === "object" ? raw.data : raw) as Record<string, unknown>;
}
function asStr(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
function asNum(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}
function okStatus(raw: RawResponse): "success" | "failure" {
  return raw.status === "success" ? "success" : "failure";
}

// ─── Ortak çıktı ─────────────────────────────────────────────────────────────

export interface IyzicoResult {
  status: "success" | "failure";
  errorCode?: string;
  errorMessage?: string;
}

// ─── Müşteri (checkout için) ─────────────────────────────────────────────────

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

// ─── Plan & ürün öğeleri ─────────────────────────────────────────────────────

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

function mapPlanItem(v: unknown): PricingPlanItem {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    referenceCode: asStr(o.referenceCode) ?? "",
    name: asStr(o.name) ?? "",
    price: asNum(o.price) ?? 0,
    paymentInterval: asStr(o.paymentInterval) ?? "",
    paymentIntervalCount: asNum(o.paymentIntervalCount) ?? 1,
  };
}
function mapProductItem(v: unknown): ProductItem {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    referenceCode: asStr(o.referenceCode) ?? "",
    name: asStr(o.name) ?? "",
    description: asStr(o.description),
    pricingPlans: Array.isArray(o.pricingPlans) ? o.pricingPlans.map(mapPlanItem) : [],
  };
}

// ─── Ürün API ────────────────────────────────────────────────────────────────

export interface ProductResult extends IyzicoResult {
  referenceCode?: string;
}
export interface ProductListResult extends IyzicoResult {
  items: ProductItem[];
}

export async function createProduct(name: string, description?: string): Promise<ProductResult> {
  const raw = await run((cb) =>
    getClient().subscriptionProduct.create(
      { locale: "TR", conversationId: conversationId(), name, description },
      cb,
    ),
  );
  const d = payload(raw);
  return {
    status: okStatus(raw),
    errorCode: raw.errorCode,
    errorMessage: raw.errorMessage,
    referenceCode: asStr(d.referenceCode) ?? asStr(d.productReferenceCode),
  };
}

export async function listProducts(page = 1, count = 100): Promise<ProductListResult> {
  const raw = await run((cb) =>
    getClient().subscriptionProduct.retrieveList(
      { locale: "TR", conversationId: conversationId(), page, count },
      cb,
    ),
  );
  const d = payload(raw);
  const items = Array.isArray(d.items) ? d.items.map(mapProductItem) : [];
  return { status: okStatus(raw), errorCode: raw.errorCode, errorMessage: raw.errorMessage, items };
}

// ─── Fiyatlandırma Planı API ─────────────────────────────────────────────────

interface CreatePricingPlanInput {
  productReferenceCode: string;
  name: string;
  price: number;
  paymentInterval?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  paymentIntervalCount?: number;
  trialPeriodDays?: number;
}

export interface PricingPlanResult extends IyzicoResult {
  referenceCode?: string;
}
export interface PricingPlanListResult extends IyzicoResult {
  items: PricingPlanItem[];
}

export async function createPricingPlan(input: CreatePricingPlanInput): Promise<PricingPlanResult> {
  const raw = await run((cb) =>
    getClient().subscriptionPricingPlan.create(
      {
        locale: "TR",
        conversationId: conversationId(),
        currencyCode: "TRY",
        planPaymentType: "RECURRING",
        paymentInterval: "MONTHLY",
        paymentIntervalCount: 1,
        trialPeriodDays: 0,
        ...input,
      },
      cb,
    ),
  );
  const d = payload(raw);
  return {
    status: okStatus(raw),
    errorCode: raw.errorCode,
    errorMessage: raw.errorMessage,
    referenceCode: asStr(d.referenceCode) ?? asStr(d.pricingPlanReferenceCode),
  };
}

export async function listPricingPlans(
  productReferenceCode: string,
  page = 1,
  count = 100,
): Promise<PricingPlanListResult> {
  const raw = await run((cb) =>
    getClient().subscriptionPricingPlan.retrieveList(
      { locale: "TR", conversationId: conversationId(), productReferenceCode, page, count },
      cb,
    ),
  );
  const d = payload(raw);
  const items = Array.isArray(d.items) ? d.items.map(mapPlanItem) : [];
  return { status: okStatus(raw), errorCode: raw.errorCode, errorMessage: raw.errorMessage, items };
}

// ─── Checkout Form API ───────────────────────────────────────────────────────

interface InitCheckoutFormInput {
  pricingPlanReferenceCode: string;
  callbackUrl: string;
  customer: IyzicoCustomer;
  subscriptionInitialStatus?: "ACTIVE" | "PENDING";
}

export interface CheckoutFormInitResult extends IyzicoResult {
  token?: string;
  checkoutFormContent?: string;
}

export async function initializeCheckoutForm(
  input: InitCheckoutFormInput,
): Promise<CheckoutFormInitResult> {
  const { subscriptionInitialStatus = "ACTIVE", ...rest } = input;
  const raw = await run((cb) =>
    getClient().subscriptionCheckoutForm.initialize(
      { locale: "TR", conversationId: conversationId(), subscriptionInitialStatus, ...rest },
      cb,
    ),
  );
  const d = payload(raw);
  return {
    status: okStatus(raw),
    errorCode: raw.errorCode,
    errorMessage: raw.errorMessage,
    token: raw.token ?? asStr(d.token),
    checkoutFormContent: raw.checkoutFormContent ?? asStr(d.checkoutFormContent),
  };
}

/** Checkout sonucu — abonelik referansı + plan/müşteri ref'i. */
export interface CheckoutFormRetrieveResult extends IyzicoResult {
  referenceCode?: string; // subscriptionReferenceCode
  parentReferenceCode?: string;
  pricingPlanReferenceCode?: string;
  customerReferenceCode?: string;
  subscriptionStatus?: string;
}

export async function retrieveCheckoutForm(token: string): Promise<CheckoutFormRetrieveResult> {
  // SDK retrieve yolu: /v2/subscription/checkoutform/{checkoutFormToken}.
  // @types/iyzipay yanlışlıkla `token` der; gerçek SDK `checkoutFormToken` okur → ikisini de ver.
  const reqData = {
    locale: "TR" as const,
    conversationId: conversationId(),
    token,
    checkoutFormToken: token,
  };
  const raw = await run((cb) => getClient().subscriptionCheckoutForm.retrieve(reqData, cb));
  const d = payload(raw);
  return {
    status: okStatus(raw),
    errorCode: raw.errorCode,
    errorMessage: raw.errorMessage,
    referenceCode: asStr(d.referenceCode),
    parentReferenceCode: asStr(d.parentReferenceCode),
    pricingPlanReferenceCode: asStr(d.pricingPlanReferenceCode),
    customerReferenceCode: asStr(d.customerReferenceCode),
    subscriptionStatus: asStr(d.subscriptionStatus),
  };
}

// ─── Abonelik Yönetimi ───────────────────────────────────────────────────────

export interface SubscriptionRetrieveResult extends IyzicoResult {
  referenceCode?: string;
  pricingPlanReferenceCode?: string;
  customerReferenceCode?: string;
  subscriptionStatus?: string;
}

export async function retrieveSubscription(
  subscriptionReferenceCode: string,
): Promise<SubscriptionRetrieveResult> {
  const raw = await run((cb) =>
    getClient().subscription.retrieve(
      { locale: "TR", conversationId: conversationId(), subscriptionReferenceCode },
      cb,
    ),
  );
  const d = payload(raw);
  return {
    status: okStatus(raw),
    errorCode: raw.errorCode,
    errorMessage: raw.errorMessage,
    referenceCode: asStr(d.referenceCode),
    pricingPlanReferenceCode: asStr(d.pricingPlanReferenceCode),
    customerReferenceCode: asStr(d.customerReferenceCode),
    subscriptionStatus: asStr(d.subscriptionStatus),
  };
}

export interface SubscriptionCancelResult extends IyzicoResult {
  referenceCode?: string;
}

export async function cancelSubscription(
  subscriptionReferenceCode: string,
): Promise<SubscriptionCancelResult> {
  const raw = await run((cb) =>
    getClient().subscription.cancel(
      { locale: "TR", conversationId: conversationId(), subscriptionReferenceCode },
      cb,
    ),
  );
  const d = payload(raw);
  return {
    status: okStatus(raw),
    errorCode: raw.errorCode,
    errorMessage: raw.errorMessage,
    referenceCode: asStr(d.referenceCode),
  };
}
