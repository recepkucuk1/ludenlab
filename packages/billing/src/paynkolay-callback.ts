/**
 * Paynkolay gelen callback doğrulaması — saf. Paynkolay async webhook SUNMAZ;
 * successUrl/failUrl'e senkron POST gelir ve "successUrl'e düşmek BAŞARI DEĞİLDİR".
 *
 * Üç katmanlı kontrol (bu fonksiyon ilk ikisini yapar; üçüncüyü çağıran yapar):
 *  1) hashDataV2 yeniden hesapla + timing-safe karşılaştır (istek gerçekten Paynkolay'dan mı?)
 *  2) RESPONSE_CODE == 2 && AUTH_CODE geçerli (boş/0/00 değil)
 *  3) [çağıran] listTransactions (PaymentList) ile STATUS=SUCCESS + tutar/ref teyidi
 */
import { timingSafeEqual } from "node:crypto";
import { callbackHash } from "./paynkolay-hash";

/** successUrl/failUrl'e POST edilen alanlar (gerekli alt küme + esnek index). */
export interface PaynkolayCallbackFields {
  MERCHANT_NO?: string;
  REFERENCE_CODE?: string;
  RESPONSE_CODE?: string;
  RESPONSE_DATA?: string;
  TRANSACTION_AMOUNT?: string;
  AUTH_CODE?: string;
  CLIENT_REFERENCE_CODE?: string;
  RND?: string;
  TIMESTAMP?: string;
  /** Güncel yanıt hash'i (doküman: büyük V). Bazı yerlerde "hashDatav2" da görülebilir. */
  hashDataV2?: string;
  hashDatav2?: string;
  /** csAutoSave ile saklandıysa dönen kart token'ı (alan adı sandbox'ta teyit). */
  csToken?: string;
  [k: string]: string | undefined;
}

export interface PaynkolayCallbackResult {
  /** İmza geçerli ve istek gerçekten Paynkolay'dan mı? */
  ok: boolean;
  /** Ödeme gerçekten başarılı mı? (ok && RESPONSE_CODE==2 && AUTH_CODE geçerli) */
  isSuccess: boolean;
  reason?: "invalid_hash" | "declined" | "missing_fields";
  referenceCode?: string;
  clientRefCode?: string;
  authCode?: string;
  amount?: string;
  csToken?: string;
}

/** AUTH_CODE geçerli mi? Boş, "0" ve "00" başarısızdır. */
function authCodeValid(authCode: string | undefined): boolean {
  if (!authCode) return false;
  const a = authCode.trim();
  return a !== "" && a !== "0" && a !== "00";
}

/**
 * Callback'i doğrular. Önce imza (Paynkolay'dan mı?), sonra iş sonucu (başarılı mı?).
 * isSuccess=true OLSA BİLE çağıran, PaymentList ile sunucu-taraf teyidini yapmalıdır.
 */
export function verifyPaynkolayCallback(
  fields: PaynkolayCallbackFields,
  merchantSecretKey: string,
): PaynkolayCallbackResult {
  const { MERCHANT_NO, REFERENCE_CODE, RESPONSE_CODE, TRANSACTION_AMOUNT, RND, TIMESTAMP } = fields;
  const providedHash = fields.hashDataV2 ?? fields.hashDatav2;

  if (
    !MERCHANT_NO ||
    !REFERENCE_CODE ||
    RESPONSE_CODE === undefined ||
    TRANSACTION_AMOUNT === undefined ||
    !RND ||
    !TIMESTAMP ||
    !providedHash
  ) {
    return { ok: false, isSuccess: false, reason: "missing_fields" };
  }

  const expected = callbackHash(
    { MERCHANT_NO, REFERENCE_CODE, RESPONSE_CODE, TRANSACTION_AMOUNT, RND, TIMESTAMP },
    merchantSecretKey,
  );

  // timing-safe — uzunluk farkında erken çık (timingSafeEqual eşit uzunluk ister).
  const a = Buffer.from(expected);
  const b = Buffer.from(providedHash);
  const hashOk = a.length === b.length && timingSafeEqual(a, b);
  if (!hashOk) return { ok: false, isSuccess: false, reason: "invalid_hash" };

  const isSuccess = String(RESPONSE_CODE) === "2" && authCodeValid(fields.AUTH_CODE);
  return {
    ok: true,
    isSuccess,
    reason: isSuccess ? undefined : "declined",
    referenceCode: REFERENCE_CODE,
    clientRefCode: fields.CLIENT_REFERENCE_CODE,
    authCode: fields.AUTH_CODE,
    amount: TRANSACTION_AMOUNT,
    csToken: fields.csToken,
  };
}
