/**
 * Paynkolay (nkolay VPOS) hashDataV2 üretimi — saf.
 *
 * Tüm imzalar: alanları "|" ile birleştir (merchantSecretKey EN SONDA) → SHA-512 → Base64.
 * Alan SIRASI endpoint'e göre değişir ve KRİTİKTİR (en sık entegrasyon hatası kaynağı).
 * Kaynak: Paynkolay Postman koleksiyonu pre-request script'leri (doğrulanmış).
 *   https://paynkolay.com.tr/entegrasyon/assets/postman/paynkolay.postman_collection.json
 */
import { createHash } from "node:crypto";

/** parts'ı "|" ile birleştirip SHA-512 → Base64 döner. Secret parts'ın SON elemanı olmalı. */
function sha512Base64Pipe(parts: Array<string | number>): string {
  return createHash("sha512").update(parts.join("|"), "utf8").digest("base64");
}

/** Ödeme (/Vpos/v1/Payment): sx|clientRefCode|amount|successUrl|failUrl|rnd|customerKey|secret */
export function paymentHash(
  p: {
    sx: string;
    clientRefCode: string;
    amount: string | number;
    successUrl: string;
    failUrl: string;
    rnd: string;
    // DOĞRULANDI (sandbox) — ENDPOINT'E GÖRE FARKLI:
    //  • Hosted /Vpos: customerKey hash'te DAİMA "" (csAutoSave olsa bile; KEY koyarsan mismatch).
    //  • API /Vpos/v1/Payment: saklama/token varsa (csAutoSave/csToken) hash'te customerKey=csCustomerKey,
    //    saklama yoksa "". (csAutoSave+"" → mismatch, csAutoSave+csCustomerKey → kabul.)
    customerKey: string;
  },
  secret: string,
): string {
  return sha512Base64Pipe([
    p.sx,
    p.clientRefCode,
    p.amount,
    p.successUrl,
    p.failUrl,
    p.rnd,
    p.customerKey,
    secret,
  ]);
}

/** İşlem listele/teyit (/Vpos/Payment/PaymentList): sx|startDate|endDate|clientRefCode|secret */
export function paymentListHash(
  p: { sx: string; startDate: string; endDate: string; clientRefCode: string },
  secret: string,
): string {
  return sha512Base64Pipe([p.sx, p.startDate, p.endDate, p.clientRefCode, secret]);
}

/**
 * İptal/İade (/Vpos/v1/CancelRefundPayment): sx|referenceCode|type|amount|trxDate|secret
 * NOT: iptal/iade SATIŞ sx'i DEĞİL, ayrı Cancel sx ile imzalanır.
 */
export function cancelRefundHash(
  p: {
    sx: string;
    referenceCode: string;
    type: "cancel" | "refund";
    amount: string | number;
    trxDate: string;
  },
  secret: string,
): string {
  // DOĞRULANDI (sandbox): referenceCode = Paynkolay REFERENCE_CODE (IKSIRPF...), Cancel sx ile
  // imzalanır, başarılı iptal döndü (RESPONSE_CODE=2). trxDate için bkz. formatTrxDate.
  return sha512Base64Pipe([p.sx, p.referenceCode, p.type, p.amount, p.trxDate, secret]);
}

/** Kayıtlı kart listele (/Vpos/Payment/CardStorageCardList): sx|customerKey|secret */
export function cardListHash(p: { sx: string; customerKey: string }, secret: string): string {
  return sha512Base64Pipe([p.sx, p.customerKey, secret]);
}

/** Kayıtlı kart sil (/Vpos/Payment/CardStorageCardDelete): sx|customerKey|token|secret */
export function cardDeleteHash(
  p: { sx: string; customerKey: string; token: string },
  secret: string,
): string {
  return sha512Base64Pipe([p.sx, p.customerKey, p.token, secret]);
}

/**
 * Gelen callback doğrulaması (successUrl/failUrl'e POST edilen alanlardan):
 *   MERCHANT_NO|REFERENCE_CODE|RESPONSE_CODE|TRANSACTION_AMOUNT|RND|TIMESTAMP|secret
 * ⚠️ TODO(sandbox): HENÜZ DOĞRULANAMADI. S2S ödeme yanıtının kendi hashDatav2'si bu formülle
 * — ve 1170 permütasyon/ayraç/secret-konumu varyasyonuyla — yeniden üretilemedi. Gerçek bir
 * 3DS callback POST'u (public successUrl ile) yakalanıp alan ADLARI + SIRASI doğrulanmalı.
 * Not: yanıtta RND epoch-ms ("1781868190087") gelir, TimeStamp null olabilir.
 */
export function callbackHash(
  p: {
    MERCHANT_NO: string;
    REFERENCE_CODE: string;
    RESPONSE_CODE: string | number;
    TRANSACTION_AMOUNT: string | number;
    RND: string;
    TIMESTAMP: string;
  },
  secret: string,
): string {
  return sha512Base64Pipe([
    p.MERCHANT_NO,
    p.REFERENCE_CODE,
    p.RESPONSE_CODE,
    p.TRANSACTION_AMOUNT,
    p.RND,
    p.TIMESTAMP,
    secret,
  ]);
}

/**
 * rnd üretici (giden istekler için).
 * DOĞRULANDI (sandbox): tireli "dd-MM-yyyy HH:mm:ss" — bu formatla ödeme başarıyla onaylandı.
 */
export function formatRnd(d: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}`;
}

/**
 * Cancel/refund trxDate formatı: yyyy.MM.dd.
 * DOĞRULANDI (sandbox): "2026.06.19" kabul; "19.06.2026" → ParseException ("yyyyMMdd" de çalışır).
 */
export function formatTrxDate(d: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
