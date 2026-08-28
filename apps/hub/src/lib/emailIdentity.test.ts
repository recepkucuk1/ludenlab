import { describe, expect, it } from "vitest";
import { canonicalEmail } from "./emailIdentity";

/**
 * Kanonik e-posta — YALNIZCA kötüye kullanım sayaçları (rate-limit) için.
 *
 * NEDEN (2026-08 denetimi #15): kayıt/mail uçları e-postayı yalnız `toLowerCase().trim()`
 * ile normalize ediyordu. Oysa `ali@gmail.com`, `ali+1@gmail.com`, `a.l.i@gmail.com`
 * AYNI kutuya düşer. Sonuç: (a) `+etiket` ile sınırsız FREE hesap → sınırsız bedava üretim,
 * (b) e-posta başına limit `+1`, `+2`… ile kolayca atlatılır.
 *
 * KAPSAM SINIRI: bu değer kimlik/tekillik için KULLANILMAZ, yalnız sayaç anahtarıdır.
 * Kayıt engellenmez (ürün kararı) — `ali+ludenlab@gmail.com` gibi meşru etiket kullanan
 * kullanıcılar mağdur olmasın diye.
 */
describe("canonicalEmail", () => {
  it("küçültür ve boşluk kırpar", () => {
    expect(canonicalEmail("  Ali@Example.COM ")).toBe("ali@example.com");
  });

  it("Gmail: +etiket ve NOKTALARI yok sayar (aynı kutu)", () => {
    const same = [
      "ali@gmail.com",
      "ali+1@gmail.com",
      "ali+ludenlab@gmail.com",
      "a.l.i@gmail.com",
      "A.Li+test@Gmail.com",
      "ali@googlemail.com", // Gmail'in ikinci alan adı
    ];
    for (const e of same) expect(canonicalEmail(e)).toBe("ali@gmail.com");
  });

  it("Gmail DIŞINDA noktaları KORUR (farklı adres olabilir)", () => {
    // Bu sağlayıcılarda nokta anlamlıdır; birleştirmek masum kullanıcıları
    // birbirinin sayacına bağlardı.
    expect(canonicalEmail("a.li@yandex.com")).not.toBe(canonicalEmail("ali@yandex.com"));
    expect(canonicalEmail("a.li@sirket.com.tr")).not.toBe(canonicalEmail("ali@sirket.com.tr"));
  });

  it("+etiketi yaygın sağlayıcılarda ve genel olarak ayıklar", () => {
    expect(canonicalEmail("ali+spam@outlook.com")).toBe("ali@outlook.com");
    expect(canonicalEmail("ali+x@yandex.com")).toBe("ali@yandex.com");
    expect(canonicalEmail("ali+x@sirket.com.tr")).toBe("ali@sirket.com.tr");
  });

  it("farklı kişileri BİRLEŞTİRMEZ", () => {
    expect(canonicalEmail("ali@gmail.com")).not.toBe(canonicalEmail("veli@gmail.com"));
    expect(canonicalEmail("ali@gmail.com")).not.toBe(canonicalEmail("ali@outlook.com"));
  });

  it("bozuk/eksik girdide çökmez, girdiyi aynen döndürür", () => {
    expect(canonicalEmail("")).toBe("");
    expect(canonicalEmail("@")).toBe("@");
    expect(canonicalEmail("düz-metin")).toBe("düz-metin");
    expect(canonicalEmail("a@b@c")).toBe("a@b@c");
  });

  it("yalnızca etiketten oluşan yerel kısmı boşaltmaz", () => {
    // "+etiket@gmail.com" → yerel kısım boş kalırdı; olduğu gibi bırak.
    expect(canonicalEmail("+etiket@gmail.com")).toBe("+etiket@gmail.com");
  });
});
