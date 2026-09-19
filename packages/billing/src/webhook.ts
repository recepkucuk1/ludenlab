/**
 * iyzico webhook: imza doğrulama + normalize + ürün-başına yönlendirme (router).
 *
 * Router: verify → normalize → sahiplenen handler'ı (owns) bul → ilgili olay
 * metodunu çağır. Hiçbiri sahiplenmezse forwardUrl'e ilet (çok-kiracılı merchant).
 * İdempotency + DB kalıcılığı handler'ın işidir (atomik).
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  FulfillmentContext,
  FulfillmentHandler,
  NormalizedWebhookEvent,
  WebhookRouter,
  WebhookRouterConfig,
  WebhookResult,
} from "./types";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * iyzico X-IYZ-SIGNATURE-V3 doğrulaması.
 * İmza = HMAC-SHA256(secretKey, merchantId + secretKey + iyziEventType
 *        + subscriptionReferenceCode + orderReferenceCode + customerReferenceCode), HEX küçük.
 * Kaynak: https://docs.iyzico.com/ek-servisler/webhook#abonelik-bildirimleri
 */
export function verifyIyzicoSignature(
  headerSig: string | null,
  fields: {
    iyziEventType: string;
    subscriptionReferenceCode: string;
    orderReferenceCode: string;
    customerReferenceCode?: string;
  },
  merchantId: string,
  secretKey: string,
): boolean {
  if (!secretKey || !merchantId || !headerSig) return false;

  const data =
    merchantId +
    secretKey +
    fields.iyziEventType +
    fields.subscriptionReferenceCode +
    fields.orderReferenceCode +
    (fields.customerReferenceCode || "");

  const expected = createHmac("sha256", secretKey).update(data, "utf8").digest("hex");
  const provided = headerSig.toLowerCase();

  // timingSafeEqual uzunluk farkında atar — önce kısa devre.
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

export interface SignatureDiagnosis {
  eventType: string;
  header: { present: boolean; length: number; format: "hex" | "base64" | "diger" | "yok" };
  /** Payload'daki merchantId env'dekiyle aynı mı — DEĞER yazılmaz. */
  payloadMerchant: "eslesiyor" | "farkli" | "yok";
  refsPresent: { subscription: boolean; order: boolean; customer: boolean; iyziReference: boolean };
  payloadKeys: string[];
  /** Başlıkla eşleşen imza formülü varyantının ADI; hiçbiri tutmazsa "yok". */
  matchedVariant: string;
}

/**
 * Reddedilen bir imza için TANI (2026-09-19): canlıda uç açıldığından beri HİÇBİR bildirimi
 * kabul etmedi (WebhookEvent = 0 satır; 20.08'deki gerçek ₺449 tahsilat kayda geçmedi).
 * Env değerleri ve formül doğru görünüyor → hangi formülle imzalandığını KANITLA ölçüyoruz.
 *
 * Çıktı yalnız bayrak + alan ADI + varyant ADI taşır: değer, sır, ref ya da imza YAZILMAZ.
 * Kabul kararını ETKİLEMEZ — doğrulama `verifyIyzicoSignature`'da kalır.
 */
export function diagnoseIyzicoSignature(
  headerSig: string | null,
  payload: Record<string, unknown>,
  merchantId: string,
  secretKey: string,
): SignatureDiagnosis {
  const type = str(payload.iyziEventType);
  const sub = str(payload.subscriptionReferenceCode);
  const order = str(payload.orderReferenceCode);
  const cust = str(payload.customerReferenceCode);
  const pm = payload.merchantId == null ? "" : String(payload.merchantId);

  const raw = (headerSig ?? "").trim();
  const format: SignatureDiagnosis["header"]["format"] = !raw
    ? "yok"
    : /^[0-9a-f]{64}$/i.test(raw)
      ? "hex"
      : /^[A-Za-z0-9+/]{43}=$/.test(raw)
        ? "base64"
        : "diger";

  const hmac = (data: string, enc: "hex" | "base64") =>
    createHmac("sha256", secretKey).update(data, "utf8").digest(enc);
  const variants: [string, () => string][] = [
    ["dokuman", () => hmac(merchantId + secretKey + type + sub + order + cust, "hex")],
    ["musterisiz", () => hmac(merchantId + secretKey + type + sub + order, "hex")],
    ["merchantsiz", () => hmac(secretKey + type + sub + order + cust, "hex")],
    ["payloadMerchant", () => (pm && pm !== merchantId ? hmac(pm + secretKey + type + sub + order + cust, "hex") : "")],
    ["base64", () => hmac(merchantId + secretKey + type + sub + order + cust, "base64")],
  ];

  let matchedVariant = "yok";
  if (raw && secretKey) {
    for (const [name, compute] of variants) {
      const expected = compute();
      const same =
        format === "base64" ? expected === raw : expected.toLowerCase() === raw.toLowerCase();
      if (expected && same) {
        matchedVariant = name;
        break;
      }
    }
  }

  return {
    eventType: type,
    header: { present: Boolean(raw), length: raw.length, format },
    payloadMerchant: !pm ? "yok" : pm === merchantId ? "eslesiyor" : "farkli",
    refsPresent: {
      subscription: Boolean(sub),
      order: Boolean(order),
      customer: Boolean(cust),
      iyziReference: Boolean(str(payload.iyziReferenceCode)),
    },
    payloadKeys: Object.keys(payload).sort(),
    matchedVariant,
  };
}

/** Ham gövdeyi normalize edilmiş olaya çevirir (alanlar eksikse null). */
export function normalizeIyzicoEvent(rawBody: string): NormalizedWebhookEvent | null {
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return null;
  }
  const eventType = str(event.iyziEventType);
  const iyziReferenceCode = str(event.iyziReferenceCode);
  const subscriptionReferenceCode = str(event.subscriptionReferenceCode);
  if (!eventType || !iyziReferenceCode || !subscriptionReferenceCode) return null;

  return {
    eventType,
    iyziReferenceCode,
    subscriptionReferenceCode,
    orderReferenceCode: str(event.orderReferenceCode),
    customerReferenceCode: str(event.customerReferenceCode),
    raw: event,
  };
}

export function createWebhookRouter(config: WebhookRouterConfig): WebhookRouter {
  return {
    async handle(
      rawBody: string,
      signatureHeader: string | null,
      opts?: { forwarded?: boolean },
    ): Promise<WebhookResult> {
      const event = normalizeIyzicoEvent(rawBody);
      if (!event) return { ok: false, status: 400, reason: "invalid_payload" };

      if (
        !verifyIyzicoSignature(
          signatureHeader,
          {
            iyziEventType: event.eventType,
            subscriptionReferenceCode: event.subscriptionReferenceCode,
            orderReferenceCode: event.orderReferenceCode,
            customerReferenceCode: event.customerReferenceCode,
          },
          config.merchantId,
          config.secretKey,
        )
      ) {
        return { ok: false, status: 401, reason: "invalid_signature" };
      }

      // 1) Yerel bir handler sahipleniyor mu?
      let owner: FulfillmentHandler | undefined;
      for (const h of config.handlers) {
        if (await h.owns(event.subscriptionReferenceCode)) {
          owner = h;
          break;
        }
      }

      // 2) Sahip bulundu → ilgili olay metodunu çağır (idempotency handler'da).
      if (owner) {
        const ctx: FulfillmentContext = { event };
        try {
          switch (event.eventType) {
            case "subscription.order.success":
              await owner.onSuccess(ctx);
              break;
            case "subscription.order.failure":
            case "subscription.unpaid":
              await owner.onFailure(ctx);
              break;
            case "subscription.cancelled":
              await owner.onCancelled(ctx);
              break;
            case "subscription.expired":
              await owner.onExpired(ctx);
              break;
            default:
              // bilinmeyen olay — sahipli ama işlenmez; sessizce geç.
              break;
          }
        } catch {
          return { ok: false, status: 500, routedTo: owner.product, reason: "fulfillment_error" };
        }
        return { ok: true, routedTo: owner.product };
      }

      // 3) Yerelde sahipsiz. Bu istek başka app'ten forward edildiyse (leaf) tekrar forward ETME.
      if (opts?.forwarded) return { ok: true, reason: "unrouted-leaf" };

      // 4) Entry: kardeş app'lere fan-out — her biri leaf modunda kendi DB'sini kontrol eder.
      const targets = config.forwardUrls ?? [];
      if (targets.length > 0) {
        await Promise.allSettled(
          targets.map((url) =>
            fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-iyz-signature-v3": signatureHeader ?? "",
                "x-ll-forwarded": "1",
              },
              body: rawBody,
            }),
          ),
        );
        return { ok: true, forwarded: true };
      }

      return { ok: true, reason: "unrouted" };
    },
  };
}
