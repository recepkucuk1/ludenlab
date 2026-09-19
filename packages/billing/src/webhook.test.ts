import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { diagnoseIyzicoSignature, normalizeIyzicoEvent, verifyIyzicoSignature } from "./webhook";

/**
 * Para yolunun GİRİŞ KAPISI — 2026-09 denetimine kadar tek testi yoktu.
 *
 * Bu doğrulama yanlışlıkla gevşerse (alan sırası değişir, kısa devre kaldırılır, boş secret
 * kabul edilir) herkes bize sahte "ödeme başarılı" gönderip ücretli erişim açtırabilir.
 * Aşağıdaki hex, üretim kodundan BAĞIMSIZ olarak hesaplanıp gömülmüştür: formülü değiştiren
 * her değişiklik bu testi kırar.
 */
const MERCHANT = "M123";
const SECRET = "S456";
const ALANLAR = {
  iyziEventType: "subscription.order.success",
  subscriptionReferenceCode: "SUB1",
  orderReferenceCode: "ORD1",
  customerReferenceCode: "CUS1",
};
const GECERLI_IMZA = "3e82454594181da647f8200a78efde6051683e67265ea9b6fc9ed509a0c2c81e";

describe("verifyIyzicoSignature", () => {
  it("doğru imzayı kabul eder (altın vektör)", () => {
    expect(verifyIyzicoSignature(GECERLI_IMZA, ALANLAR, MERCHANT, SECRET)).toBe(true);
  });

  it("büyük harfli imza da kabul edilir", () => {
    expect(verifyIyzicoSignature(GECERLI_IMZA.toUpperCase(), ALANLAR, MERCHANT, SECRET)).toBe(true);
  });

  it("tek alan değişse imza tutmaz", () => {
    expect(
      verifyIyzicoSignature(GECERLI_IMZA, { ...ALANLAR, orderReferenceCode: "ORD2" }, MERCHANT, SECRET),
    ).toBe(false);
  });

  it("yanlış secret ya da merchant reddedilir", () => {
    expect(verifyIyzicoSignature(GECERLI_IMZA, ALANLAR, MERCHANT, "BASKA")).toBe(false);
    expect(verifyIyzicoSignature(GECERLI_IMZA, ALANLAR, "BASKA", SECRET)).toBe(false);
  });

  it("imza başlığı yoksa reddedilir", () => {
    expect(verifyIyzicoSignature(null, ALANLAR, MERCHANT, SECRET)).toBe(false);
  });

  it("secret ya da merchant yapılandırılmamışsa FAIL-CLOSED", () => {
    expect(verifyIyzicoSignature(GECERLI_IMZA, ALANLAR, MERCHANT, "")).toBe(false);
    expect(verifyIyzicoSignature(GECERLI_IMZA, ALANLAR, "", SECRET)).toBe(false);
  });

  it("farklı uzunluktaki imza kıyaslamada patlamaz", () => {
    expect(verifyIyzicoSignature("kisa", ALANLAR, MERCHANT, SECRET)).toBe(false);
  });

  it("müşteri ref'i olmayan olayda da tutarlı çalışır", () => {
    const alanlar = { ...ALANLAR, customerReferenceCode: undefined };
    const imzasiz = verifyIyzicoSignature(GECERLI_IMZA, alanlar, MERCHANT, SECRET);
    expect(imzasiz).toBe(false); // CUS1 ile hesaplanan imza, ref'siz veriye uymaz
  });
});

describe("normalizeIyzicoEvent", () => {
  it("geçerli gövdeyi normalize eder", () => {
    const e = normalizeIyzicoEvent(
      JSON.stringify({
        iyziEventType: "subscription.order.success",
        iyziReferenceCode: "EVT1",
        subscriptionReferenceCode: "SUB1",
        orderReferenceCode: "ORD1",
        customerReferenceCode: "CUS1",
      }),
    );
    expect(e).toMatchObject({ eventType: "subscription.order.success", iyziReferenceCode: "EVT1" });
  });

  it("bozuk JSON null döner", () => {
    expect(normalizeIyzicoEvent("{bozuk")).toBeNull();
  });

  it("olay kimliği yoksa null döner (idempotency anahtarı zorunlu)", () => {
    expect(
      normalizeIyzicoEvent(
        JSON.stringify({ iyziEventType: "subscription.order.success", subscriptionReferenceCode: "SUB1" }),
      ),
    ).toBeNull();
  });

  it("abonelik ref'i yoksa null döner", () => {
    expect(
      normalizeIyzicoEvent(JSON.stringify({ iyziEventType: "x", iyziReferenceCode: "EVT1" })),
    ).toBeNull();
  });
});

describe("diagnoseIyzicoSignature", () => {
  // Varyantlar burada ÜRETİM KODUNDAN BAĞIMSIZ hesaplanır.
  const hex = (data: string, key = SECRET) => createHmac("sha256", key).update(data, "utf8").digest("hex");
  const b64 = (data: string, key = SECRET) => createHmac("sha256", key).update(data, "utf8").digest("base64");
  const payload = {
    iyziEventType: "subscription.order.success",
    iyziReferenceCode: "IYZ1",
    subscriptionReferenceCode: "SUB1",
    orderReferenceCode: "ORD1",
    customerReferenceCode: "CUS1",
    merchantId: "M123",
  };
  const t = "subscription.order.success";

  it("belgelenen formülü tanır ve hex biçimini raporlar", () => {
    const d = diagnoseIyzicoSignature(GECERLI_IMZA, payload, MERCHANT, SECRET);
    expect(d.matchedVariant).toBe("dokuman");
    expect(d.header).toEqual({ present: true, length: 64, format: "hex" });
    expect(d.eventType).toBe(t);
    expect(d.payloadMerchant).toBe("eslesiyor");
  });

  it("müşteri ref'siz formülü ayırt eder", () => {
    const sig = hex(MERCHANT + SECRET + t + "SUB1" + "ORD1");
    expect(diagnoseIyzicoSignature(sig, payload, MERCHANT, SECRET).matchedVariant).toBe("musterisiz");
  });

  it("merchant'sız formülü ayırt eder", () => {
    const sig = hex(SECRET + t + "SUB1" + "ORD1" + "CUS1");
    expect(diagnoseIyzicoSignature(sig, payload, MERCHANT, SECRET).matchedVariant).toBe("merchantsiz");
  });

  it("payload'daki farklı merchantId ile imzalanmışsa onu söyler", () => {
    const p = { ...payload, merchantId: "M999" };
    const sig = hex("M999" + SECRET + t + "SUB1" + "ORD1" + "CUS1");
    const d = diagnoseIyzicoSignature(sig, p, MERCHANT, SECRET);
    expect(d.matchedVariant).toBe("payloadMerchant");
    expect(d.payloadMerchant).toBe("farkli");
  });

  it("base64 kodlu imzayı tanır", () => {
    const sig = b64(MERCHANT + SECRET + t + "SUB1" + "ORD1" + "CUS1");
    const d = diagnoseIyzicoSignature(sig, payload, MERCHANT, SECRET);
    expect(d.matchedVariant).toBe("base64");
    expect(d.header.format).toBe("base64");
  });

  it("hiçbiri tutmazsa 'yok' der (farklı secret = başka hesap/ortam)", () => {
    const sig = hex(MERCHANT + "BASKA" + t + "SUB1" + "ORD1" + "CUS1", "BASKA");
    expect(diagnoseIyzicoSignature(sig, payload, MERCHANT, SECRET).matchedVariant).toBe("yok");
  });

  it("başlık yoksa bunu raporlar", () => {
    const d = diagnoseIyzicoSignature(null, payload, MERCHANT, SECRET);
    expect(d.header).toEqual({ present: false, length: 0, format: "yok" });
    expect(d.matchedVariant).toBe("yok");
  });

  it("alan ADLARINI ve ref varlığını verir; hiçbir değer, sır ya da imza sızdırmaz", () => {
    const d = diagnoseIyzicoSignature(GECERLI_IMZA, payload, MERCHANT, SECRET);
    expect(d.payloadKeys).toEqual(Object.keys(payload).sort());
    expect(d.refsPresent).toEqual({ subscription: true, order: true, customer: true, iyziReference: true });
    const s = JSON.stringify(d);
    for (const gizli of [SECRET, MERCHANT, "SUB1", "ORD1", "CUS1", "IYZ1", GECERLI_IMZA]) {
      expect(s).not.toContain(gizli);
    }
  });

  it("payload'da merchantId yoksa 'yok' der", () => {
    const { merchantId: _, ...p } = payload;
    expect(diagnoseIyzicoSignature(GECERLI_IMZA, p, MERCHANT, SECRET).payloadMerchant).toBe("yok");
  });
});
