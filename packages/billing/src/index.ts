export type {
  BillingProduct,
  SubscriptionStatus,
  BillingCycle,
  IyzicoSignatureFields,
  IyzicoEventType,
  NormalizedWebhookEvent,
  FulfillmentContext,
  FulfillmentHandler,
  WebhookRouterConfig,
  CheckoutInput,
  CheckoutResult,
  IyzicoConfig,
  IyzicoClient,
  WebhookRouter,
} from "./types";

import type { IyzicoClient, IyzicoConfig, WebhookRouter, WebhookRouterConfig } from "./types";

const NOT_IMPL = "[@ludenlab/billing] Faz 2'de yalnız arayüz kabuğu. Gerçek iyzico mantığı Faz 5'te (iyzico en sonda) — bkz. ROADMAP.md.";

/** Faz 5'te Studio'dan terfi edilecek. Şimdilik bilinçli olarak fırlatır. */
export function createIyzicoClient(_config: IyzicoConfig): IyzicoClient {
  throw new Error(NOT_IMPL);
}

/** Faz 5'te tek webhook router'ı burada gerçeklenecek. */
export function createWebhookRouter(_config: WebhookRouterConfig): WebhookRouter {
  throw new Error(NOT_IMPL);
}
