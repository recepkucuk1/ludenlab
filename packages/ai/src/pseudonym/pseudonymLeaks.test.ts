import { describe, expect, it } from "vitest";
import { ALIAS_POOL, nameClass, pickAlias, pseudonymizeText, rehydrateText } from "./index";

/**
 * Regresyon kilidi — RUMUZ KAPISININ ÜÇ TÜRKÇE KAÇAĞI + havuz kirliliği (2026-09 denetimi).
 *
 * Kapı "en görünür kanalı kapattı" ama üç yazım biçimini kaçırıyordu; üçü de denetimde
 * kodu FİİLEN çalıştırarak kanıtlandı, hiçbiri testte yoktu:
 *   · "ELİF"  → JS'in `i` bayrağı Türkçe İ'yi i'ye KATLAMAZ (U+0130 basit katlamada eşleşmez)
 *   · "Alinin" → uzmanlar eki kesme işaretsiz yazar; kapı yalnız "Ali'nin" biçimini görüyordu
 *   · "Gokce" → aksansız yazım (klavye alışkanlığı) hiç eşleşmiyordu
 *
 * Dördüncüsü ters yönde: rumuz havuzu SÖZLÜK KELİMELERİ içeriyordu (Mavi, Gül, Öykü…).
 * `rehydrateText` rumuzu metinde nerede görse değiştirdiği için klinik belge bozuluyordu:
 * "Sosyal Öykü" → "Sosyal Ahmet", "mavi kalem" → "Ali kalem".
 */
describe("kaçak 1 — Türkçe büyük İ", () => {
  it("BÜYÜK harfle yazılmış ad da rumuzlanır", () => {
    const out = pseudonymizeText("ELİF bugün seansa geldi.", [{ real: "Elif", alias: "Ece" }]);
    expect(out).not.toMatch(/ELİF/);
    expect(out).toContain("Ece");
  });

  it("noktalı/noktasız i ayrımı KORUNUR — farklı harflerdir", () => {
    // "Ilgaz" ile "İlgaz" ayrı adlardır; biri diğerini eşleştirmemeli.
    const out = pseudonymizeText("Ilgaz geldi.", [{ real: "İlgaz", alias: "Ece" }]);
    expect(out).toBe("Ilgaz geldi.");
  });
});

describe("kaçak 2 — kesme işaretsiz ek", () => {
  it("\"Alinin\" gibi bitişik ek yazımı da rumuzlanır", () => {
    const out = pseudonymizeText("Alinin annesi aradı.", [{ real: "Ali", alias: "Ece" }]);
    expect(out).not.toMatch(/Ali/);
    expect(out).toContain("Ece");
  });

  it("yönelme ve ayrılma ekleri de yakalanır", () => {
    for (const yazim of ["Aliye", "Aliden", "Alide"]) {
      const out = pseudonymizeText(`${yazim} verildi.`, [{ real: "Ali", alias: "Ece" }]);
      expect(out, yazim).not.toMatch(/Ali/);
    }
  });

  it("ek OLMAYAN devam BOZULMAZ — asıl yanlış-pozitif riski budur", () => {
    for (const kelime of ["Alic", "Aliş", "Aliğ", "Alican", "Aline"]) {
      expect(pseudonymizeText(`${kelime} kelimesi`, [{ real: "Ali", alias: "Ece" }]), kelime).toBe(
        `${kelime} kelimesi`,
      );
    }
  });
});

describe("kaçak 3 — aksansız yazım", () => {
  it("\"Gokce\" yazımı \"Gökçe\" adını rumuzlar", () => {
    const out = pseudonymizeText("Gokce bugün katıldı.", [{ real: "Gökçe", alias: "Ece" }]);
    expect(out).not.toMatch(/Gokce/i);
    expect(out).toContain("Ece");
  });

  it("aksansız eşleme daha uzun kelimeyi bozmaz", () => {
    expect(pseudonymizeText("Gokcen geldi.", [{ real: "Gökçe", alias: "Ece" }])).toBe(
      "Gokcen geldi.",
    );
  });
});

describe("kaçak 4 — havuzdaki sözlük kelimeleri çıktıyı bozuyordu", () => {
  const SOZLUK = [
    "mavi", "gül", "deniz", "öykü", "bulut", "umut", "toprak", "ışık", "melek",
    "nehir", "nil", "barış", "ufuk", "rüya", "sema", "onur", "ada", "duru",
    "kuzey", "lale", "çınar", "hale", "emir", "yaren",
  ];

  it("rumuz havuzunda gündelik sözlük kelimesi bulunmaz", () => {
    const kirli = ALIAS_POOL.filter((n) => SOZLUK.includes(n.toLocaleLowerCase("tr")));
    expect(kirli).toEqual([]);
  });

  it("küçük harfli sözlük kullanımı gerçek ada ÇEVRİLMEZ", () => {
    const out = rehydrateText("Bugün mavi kalemi seçti.", [{ real: "Ali", alias: "Mavi" }]);
    expect(out).toBe("Bugün mavi kalemi seçti.");
  });

  it("büyük harfle başlayan rumuz (ekiyle birlikte) yine gerçek ada çevrilir", () => {
    const out = rehydrateText("Mavi'nin ödevi hazır.", [{ real: "Ali", alias: "Mavi" }]);
    expect(out).toBe("Ali'nin ödevi hazır.");
  });

  it("havuz daraltması rumuzsuz bırakmaz — temsilî adların hepsi rumuz alır", () => {
    for (const ad of ["Ali", "Ece", "Deniz", "Mehmet", "Pınar", "Elif", "Gökçe", "Eymen B", "Zeynep"]) {
      const alias = pickAlias(ad, { scope: "t1" });
      expect(alias, ad).not.toBe("Öğrenci");
      expect(nameClass(alias), ad).toBe(nameClass(ad));
    }
  });
});
