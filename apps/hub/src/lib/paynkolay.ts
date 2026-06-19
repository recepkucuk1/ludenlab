/**
 * hub Paynkolay (nkolay VPOS) istemcisi — ortak @ludenlab/billing istemcisini env ile sarar.
 * Apex (ludenlab.com) tek Paynkolay-facing yüzey: hosted form init + senkron callback + yenileme.
 * Gerçek mantık pakette (paynkolay-client). env'i sarıp createPaynkolayClient'i tekil tutar.
 *
 * Paynkolay async webhook SUNMAZ → başarı senkron callback (/odeme/sonuc) + listTransactions
 * (PaymentList) ile doğrulanır; abonelik yenileme cron + chargeStoredCard ile yapılır.
 */
import { createPaynkolayClient, type PaynkolayClient } from "@ludenlab/billing";

let _client: PaynkolayClient | null = null;
function client(): PaynkolayClient {
  if (!_client) {
    _client = createPaynkolayClient({
      salesSx: process.env.PAYNKOLAY_SALES_SX ?? "",
      listSx: process.env.PAYNKOLAY_LIST_SX ?? "",
      cancelSx: process.env.PAYNKOLAY_CANCEL_SX ?? "",
      merchantSecretKey: process.env.PAYNKOLAY_MERCHANT_SECRET_KEY ?? "",
      baseUrl: process.env.PAYNKOLAY_BASE_URL || "https://paynkolaytest.nkolayislem.com.tr",
    });
  }
  return _client;
}

export const buildHostedPaymentForm: PaynkolayClient["buildHostedPaymentForm"] = (...a) =>
  client().buildHostedPaymentForm(...a);
export const chargeStoredCard: PaynkolayClient["chargeStoredCard"] = (...a) => client().chargeStoredCard(...a);
export const listTransactions: PaynkolayClient["listTransactions"] = (...a) => client().listTransactions(...a);
export const cancelOrRefund: PaynkolayClient["cancelOrRefund"] = (...a) => client().cancelOrRefund(...a);
export const listSavedCards: PaynkolayClient["listSavedCards"] = (...a) => client().listSavedCards(...a);
export const deleteSavedCard: PaynkolayClient["deleteSavedCard"] = (...a) => client().deleteSavedCard(...a);
