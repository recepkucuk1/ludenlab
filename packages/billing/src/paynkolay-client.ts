/**
 * Paynkolay (nkolay VPOS) istemcisi — config ile. createXClient factory kalıbı:
 * createPaynkolayClient(config) → metot nesnesi.
 *
 * Seçilen mimari (Paynkolay):
 *  - İlk ödeme: HOSTED FORM (kart Paynkolay'da, PCI sizde değil) → buildHostedPaymentForm
 *  - Tokenizasyon: ilk ödemede csAutoSave=true → dönen csToken saklanır
 *  - Yenileme: chargeStoredCard (S2S, token ile, 3DS'siz)
 *  - Teyit: listTransactions (PaymentList) — callback'e GÜVENME, sunucudan doğrula
 *  - İptal/iade: cancelOrRefund (Cancel sx)
 *
 * Paynkolay async webhook SUNMAZ; başarı senkron callback + PaymentList ile doğrulanır
 * (bkz. paynkolay-callback.ts).
 */
import type {
  ChargeStoredCardInput,
  HostedPaymentForm,
  HostedPaymentInput,
  PaynkolayClient,
  PaynkolayConfig,
  PaynkolayPaymentResult,
  SavedCard,
  SavedCardListResult,
  SimpleResult,
  TransactionListInput,
  TransactionListItem,
  TransactionListResult,
  CancelRefundInput,
} from "./paynkolay-types";
import {
  cancelRefundHash,
  cardDeleteHash,
  cardListHash,
  formatRnd,
  paymentHash,
  paymentListHash,
} from "./paynkolay-hash";

type RawResponse = Record<string, unknown>;

/** Skaler değeri string'e çevirir (sayı dahil); nesne/boş → undefined. */
function toStr(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "object") return undefined;
  return String(v);
}

/** application/x-www-form-urlencoded POST + JSON/text yanıt. */
async function postForm(url: string, fields: Record<string, string | number>): Promise<RawResponse> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) body.set(k, String(v));
  // DOĞRULANDI (sandbox): urlencoded kabul ediliyor (multipart da çalışıyor). Yanıt content-type
  // "text/plain" ama gövde JSON → aşağıda JSON.parse.
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as RawResponse;
  } catch {
    return { _httpStatus: res.status, _raw: text };
  }
}

/**
 * PaymentList/CardStorage yanıt payload'unu `result` altında döner; ödeme/iptal DÜZ döner.
 * DOĞRULANDI (sandbox): PaymentList → { result: { RESPONSE_CODE, LIST } }; Payment/Cancel → düz.
 */
function resultOf(raw: RawResponse): RawResponse {
  return raw.result && typeof raw.result === "object" ? (raw.result as RawResponse) : raw;
}

/** Paynkolay başarı kodu: RESPONSE_CODE == 2 (düz ya da `result` altında). */
function okFromResponseCode(raw: RawResponse): "success" | "failure" {
  const r = resultOf(raw);
  const code = r.RESPONSE_CODE ?? r.responseCode;
  return String(code) === "2" ? "success" : "failure";
}

export function createPaynkolayClient(config: PaynkolayConfig): PaynkolayClient {
  const { salesSx, listSx, cancelSx, merchantSecretKey, baseUrl } = config;
  const host = baseUrl.replace(/\/+$/, "");

  return {
    buildHostedPaymentForm(input: HostedPaymentInput): HostedPaymentForm {
      const rnd = input.rnd ?? formatRnd();
      const amount = String(input.amount); // DOĞRULANDI: "1.00" (nokta, 2 hane)
      // DOĞRULANDI (sandbox): hash'teki customerKey DAİMA "" — csAutoSave olsa bile (C2 testi geçti,
      // C3 KEY'i hash'e koyunca "Hash Data Uyuşmazlığı" verdi). csCustomerKey aşağıda yalnız FORM'da.
      const hashDataV2 = paymentHash(
        {
          sx: salesSx,
          clientRefCode: input.clientRefCode,
          amount,
          successUrl: input.successUrl,
          failUrl: input.failUrl,
          rnd,
          customerKey: "",
        },
        merchantSecretKey,
      );
      const fields: Record<string, string> = {
        sx: salesSx,
        clientRefCode: input.clientRefCode,
        amount,
        successUrl: input.successUrl,
        failUrl: input.failUrl,
        installmentNo: String(input.installmentNo ?? 1),
        use3D: "true",
        transactionType: "SALES",
        rnd,
        hashDatav2: hashDataV2,
        environment: "API",
        currencyNumber: "949",
        cardHolderIP: input.cardHolderIP,
      };
      if (input.saveCard) {
        fields.csAutoSave = "true";
        if (input.customerKey) fields.csCustomerKey = input.customerKey; // FORM-only (hash'e girmez)
      }
      const c = input.customer;
      if (c) {
        if (c.nameSurname) fields.namesurname = c.nameSurname;
        if (c.email) fields.email = c.email;
        if (c.phone) fields.phone = c.phone;
        if (c.tckn) fields.tckn = c.tckn;
        if (c.address) fields.adress = c.address; // Paynkolay alan adı "adress" (sic)
      }
      return { action: `${host}/Vpos`, fields };
    },

    async chargeStoredCard(input: ChargeStoredCardInput): Promise<PaynkolayPaymentResult> {
      const rnd = formatRnd();
      const amount = String(input.amount);
      // API endpoint'i (/Vpos/v1/Payment) saklama/token bağlamında hash'te csCustomerKey ister
      // (DOĞRULANDI: csAutoSave+"" → "Hash Data Uyuşmazlığı"; csAutoSave+csCustomerKey → kabul).
      // TODO(sandbox): gerçek saklı token charge'ı (csToken ile) birebir doğrulanmalı — 3DS sandbox'ı flaky.
      const hashDataV2 = paymentHash(
        {
          sx: salesSx,
          clientRefCode: input.clientRefCode,
          amount,
          successUrl: input.successUrl,
          failUrl: input.failUrl,
          rnd,
          customerKey: input.csCustomerKey,
        },
        merchantSecretKey,
      );
      const fields: Record<string, string | number> = {
        sx: salesSx,
        clientRefCode: input.clientRefCode,
        amount,
        successUrl: input.successUrl,
        failUrl: input.failUrl,
        installmentNo: input.installmentNo ?? 1,
        use3D: "false", // TODO(sandbox): bazı bankalar saklı kartta da 3DS zorlayabilir
        transactionType: "SALES",
        rnd,
        hashDatav2: hashDataV2,
        environment: "API",
        currencyNumber: "949",
        csCustomerKey: input.csCustomerKey,
        cardHolderIP: input.cardHolderIP,
      };
      if (input.csToken) fields.csToken = input.csToken;
      if (input.csTranId) fields.csTranId = input.csTranId;
      const raw = await postForm(`${host}/Vpos/v1/Payment`, fields);
      return {
        status: okFromResponseCode(raw),
        responseCode: toStr(raw.RESPONSE_CODE ?? raw.responseCode),
        responseData: toStr(raw.RESPONSE_DATA ?? raw.responseData),
        authCode: toStr(raw.AUTH_CODE ?? raw.authCode),
        referenceCode: toStr(raw.REFERENCE_CODE ?? raw.referenceCode),
        raw,
      };
    },

    async listTransactions(input: TransactionListInput): Promise<TransactionListResult> {
      const clientRefCode = input.clientRefCode ?? "";
      const hashDataV2 = paymentListHash(
        { sx: listSx, startDate: input.startDate, endDate: input.endDate, clientRefCode },
        merchantSecretKey,
      );
      const raw = await postForm(`${host}/Vpos/Payment/PaymentList`, {
        sx: listSx,
        startDate: input.startDate,
        endDate: input.endDate,
        clientRefCode,
        hashDatav2: hashDataV2,
      });
      // DOĞRULANDI (sandbox): işlemler { result: { RESPONSE_CODE, LIST: [...] } } zarfında gelir.
      const r = resultOf(raw);
      const list: unknown[] = Array.isArray(r.LIST) ? (r.LIST as unknown[]) : [];
      const items: TransactionListItem[] = list.map((v): TransactionListItem => {
        const o = (v ?? {}) as Record<string, unknown>;
        return {
          referenceCode: toStr(o.REFERENCE_CODE ?? o.referenceCode),
          status: toStr(o.STATUS ?? o.status),
          amount: toStr(o.TRANSACTION_AMOUNT ?? o.amount),
          trxDate: toStr(o.TRX_DATE ?? o.trxDate),
        };
      });
      return { status: items.length ? "success" : okFromResponseCode(raw), items, raw };
    },

    async cancelOrRefund(input: CancelRefundInput): Promise<SimpleResult> {
      const amount = String(input.amount);
      const hashDataV2 = cancelRefundHash(
        { sx: cancelSx, referenceCode: input.referenceCode, type: input.type, amount, trxDate: input.trxDate },
        merchantSecretKey,
      );
      const raw = await postForm(`${host}/Vpos/v1/CancelRefundPayment`, {
        sx: cancelSx,
        referenceCode: input.referenceCode,
        type: input.type,
        amount,
        trxDate: input.trxDate,
        hashDatav2: hashDataV2,
      });
      return { status: okFromResponseCode(raw), responseCode: toStr(raw.responseCode ?? raw.RESPONSE_CODE), raw };
    },

    async listSavedCards(customerKey: string): Promise<SavedCardListResult> {
      // TODO(sandbox): kart saklama servisleri hangi sx ile? (satış sx varsayıldı) teyit.
      const hashDataV2 = cardListHash({ sx: salesSx, customerKey }, merchantSecretKey);
      const raw = await postForm(`${host}/Vpos/Payment/CardStorageCardList`, {
        sx: salesSx,
        customerKey,
        hashDatav2: hashDataV2,
      });
      // Kart listesi de `result` zarfında varsayıldı (kart-saklama sandbox'ta test EDİLMEDİ).
      const r = resultOf(raw);
      const list: unknown[] = Array.isArray(r.LIST)
        ? (r.LIST as unknown[])
        : Array.isArray(r.cards)
          ? (r.cards as unknown[])
          : Array.isArray(r.CARDS)
            ? (r.CARDS as unknown[])
            : [];
      const cards: SavedCard[] = list.map((v): SavedCard => {
        const o = (v ?? {}) as Record<string, unknown>;
        return {
          token: toStr(o.token ?? o.TOKEN),
          cardAlias: toStr(o.csCardAlias ?? o.cardAlias),
          maskedNumber: toStr(o.maskedNumber ?? o.cardNumber),
        };
      });
      return { status: cards.length ? "success" : okFromResponseCode(raw), cards, raw };
    },

    async deleteSavedCard(customerKey: string, token: string): Promise<SimpleResult> {
      const hashDataV2 = cardDeleteHash({ sx: salesSx, customerKey, token }, merchantSecretKey);
      const raw = await postForm(`${host}/Vpos/Payment/CardStorageCardDelete`, {
        sx: salesSx,
        customerKey,
        token,
        hashDatav2: hashDataV2,
      });
      return { status: okFromResponseCode(raw), responseCode: toStr(raw.responseCode ?? raw.RESPONSE_CODE), raw };
    },
  };
}
