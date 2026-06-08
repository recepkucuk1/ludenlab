/**
 * iyzico Subscription API v2 — resmî `iyzipay` Node.js SDK sarmalayıcısı (config ile).
 *
 * iyzico yanıt şekli: BAŞARI → { status, systemTime, data:{...} } (payload `data` altında),
 * HATA → { status:"failure", errorCode, errorMessage } (düz). checkout init: token +
 * checkoutFormContent kökte gelebilir. `payload()` her ikisine de dayanıklı.
 */

import Iyzipay from "iyzipay";
import type {
  CheckoutFormInitResult,
  CheckoutFormRetrieveResult,
  CreatePricingPlanInput,
  InitCheckoutFormInput,
  IyzicoClient,
  IyzicoConfig,
  PricingPlanItem,
  PricingPlanListResult,
  PricingPlanResult,
  ProductItem,
  ProductListResult,
  ProductResult,
  SubscriptionCancelResult,
  SubscriptionRetrieveResult,
  SubscriptionUpgradeResult,
  UpgradeSubscriptionInput,
} from "./types";

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

function mapPlanItem(v: unknown): PricingPlanItem {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    referenceCode: asStr(o.referenceCode) ?? "",
    name: asStr(o.name) ?? "",
    price: asNum(o.price) ?? 0,
    paymentInterval: asStr(o.paymentInterval) ?? "",
    paymentIntervalCount: asNum(o.paymentIntervalCount) ?? 1,
    trialPeriodDays: asNum(o.trialPeriodDays),
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

/** Config'ten bir iyzico istemcisi oluşturur. İçteki SDK lazy başlatılır. */
export function createIyzicoClient(config: IyzicoConfig): IyzicoClient {
  let _sdk: Iyzipay | null = null;
  const sdk = (): Iyzipay => {
    if (!_sdk) {
      _sdk = new Iyzipay({
        apiKey: config.apiKey,
        secretKey: config.secretKey,
        uri: config.baseUrl || "https://sandbox-api.iyzipay.com",
      });
    }
    return _sdk;
  };

  return {
    async createProduct(name, description): Promise<ProductResult> {
      const raw = await run((cb) =>
        sdk().subscriptionProduct.create(
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
    },

    async listProducts(page = 1, count = 100): Promise<ProductListResult> {
      const raw = await run((cb) =>
        sdk().subscriptionProduct.retrieveList(
          { locale: "TR", conversationId: conversationId(), page, count },
          cb,
        ),
      );
      const d = payload(raw);
      const items = Array.isArray(d.items) ? d.items.map(mapProductItem) : [];
      return { status: okStatus(raw), errorCode: raw.errorCode, errorMessage: raw.errorMessage, items };
    },

    async createPricingPlan(input: CreatePricingPlanInput): Promise<PricingPlanResult> {
      const raw = await run((cb) =>
        sdk().subscriptionPricingPlan.create(
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
    },

    async listPricingPlans(productReferenceCode, page = 1, count = 100): Promise<PricingPlanListResult> {
      const raw = await run((cb) =>
        sdk().subscriptionPricingPlan.retrieveList(
          { locale: "TR", conversationId: conversationId(), productReferenceCode, page, count },
          cb,
        ),
      );
      const d = payload(raw);
      const items = Array.isArray(d.items) ? d.items.map(mapPlanItem) : [];
      return { status: okStatus(raw), errorCode: raw.errorCode, errorMessage: raw.errorMessage, items };
    },

    async initializeCheckoutForm(input: InitCheckoutFormInput): Promise<CheckoutFormInitResult> {
      const { subscriptionInitialStatus = "ACTIVE", ...rest } = input;
      const raw = await run((cb) =>
        sdk().subscriptionCheckoutForm.initialize(
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
        tokenExpireTime: asNum(raw.tokenExpireTime ?? (d as Record<string, unknown>).tokenExpireTime),
      };
    },

    async retrieveCheckoutForm(token: string): Promise<CheckoutFormRetrieveResult> {
      // SDK retrieve yolu: /v2/subscription/checkoutform/{checkoutFormToken}.
      // @types/iyzipay yanlışlıkla `token` der; gerçek SDK `checkoutFormToken` okur → ikisini de ver.
      const reqData = {
        locale: "TR" as const,
        conversationId: conversationId(),
        token,
        checkoutFormToken: token,
      };
      const raw = await run((cb) => sdk().subscriptionCheckoutForm.retrieve(reqData, cb));
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
        trialDays: asNum(d.trialDays),
        trialEndDate: asStr(d.trialEndDate),
        startDate: asStr(d.startDate),
      };
    },

    async retrieveSubscription(subscriptionReferenceCode): Promise<SubscriptionRetrieveResult> {
      const raw = await run((cb) =>
        sdk().subscription.retrieve(
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
        startDate: asStr(d.startDate),
        endDate: asStr(d.endDate),
        trialEndDate: asStr(d.trialEndDate),
      };
    },

    async cancelSubscription(subscriptionReferenceCode): Promise<SubscriptionCancelResult> {
      const raw = await run((cb) =>
        sdk().subscription.cancel(
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
    },

    async upgradeSubscription(input: UpgradeSubscriptionInput): Promise<SubscriptionUpgradeResult> {
      // SDK: POST /v2/subscription/subscriptions/{subscriptionReferenceCode}/upgrade.
      // subscriptionReferenceCode → path; newPricingPlanReferenceCode/upgradePeriod/useTrial → body.
      // Plan değişimi (tier ya da MONTHLY↔YEARLY) için; varsayılan upgradePeriod "NOW".
      const raw = await run((cb) =>
        sdk().subscription.upgrade(
          { locale: "TR", conversationId: conversationId(), upgradePeriod: "NOW", ...input },
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
    },
  };
}
