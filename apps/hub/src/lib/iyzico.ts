/**
 * hub iyzico istemcisi — ortak @ludenlab/billing istemcisini env ile sarar.
 * Apex (ludenlab.com) tek iyzico-facing yüzey: checkout init + callback + webhook
 * burada. Gerçek mantık pakette (iyzipay SDK). atolye lib/iyzico.ts deseni.
 */
import { createIyzicoClient, type IyzicoClient } from "@ludenlab/billing";

let _client: IyzicoClient | null = null;
function client(): IyzicoClient {
  if (!_client) {
    _client = createIyzicoClient({
      apiKey: process.env.IYZICO_API_KEY ?? "",
      secretKey: process.env.IYZICO_SECRET_KEY ?? "",
      baseUrl: process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com",
    });
  }
  return _client;
}

export const createProduct: IyzicoClient["createProduct"] = (...a) => client().createProduct(...a);
export const listProducts: IyzicoClient["listProducts"] = (...a) => client().listProducts(...a);
export const createPricingPlan: IyzicoClient["createPricingPlan"] = (...a) => client().createPricingPlan(...a);
export const listPricingPlans: IyzicoClient["listPricingPlans"] = (...a) => client().listPricingPlans(...a);
export const initializeCheckoutForm: IyzicoClient["initializeCheckoutForm"] = (...a) => client().initializeCheckoutForm(...a);
export const retrieveCheckoutForm: IyzicoClient["retrieveCheckoutForm"] = (...a) => client().retrieveCheckoutForm(...a);
export const retrieveSubscription: IyzicoClient["retrieveSubscription"] = (...a) => client().retrieveSubscription(...a);
export const cancelSubscription: IyzicoClient["cancelSubscription"] = (...a) => client().cancelSubscription(...a);
export const upgradeSubscription: IyzicoClient["upgradeSubscription"] = (...a) => client().upgradeSubscription(...a);
