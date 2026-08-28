import { describe, expect, it } from "vitest";
import { nameClass, pickAlias, pseudonymizeText, rehydrateText } from "./index";

/**
 * Çocuk PII'sinin LLM'e gitmemesi için takma-ad katmanı (2026-08 denetimi #09).
 *
 * SÖZLEŞME: gerçek ad hiçbir zaman sağlayıcıya gitmez; yerine ÇOCUK BAŞINA SABİT bir
 * rumuz gider. Dönen metinde rumuz gerçek adla değiştirilir. Terapist hep gerçek adı görür.
 *
 * TÜRKÇE KRİTİK DETAYI: LLM rumuzu ÇEKİMLER ("Ece'nin", "Ece'ye"). Düz değiştirme ancak
 * rumuz, gerçek adın SON KELİMESİYLE aynı ses sınıfındaysa doğru Türkçe üretir — çünkü ek
 * son kelimeye takılır ("Ali Yılmaz'ın"). Sınıf uyuşmazsa "Ali'in", "Ali'e" gibi bozuk
 * çıktılar oluşur ki klinik belgede kabul edilemez.
 */
describe("nameClass", () => {
  it("son ünlünün uyum sınıfını ve ünlü/ünsüz bitişini ayırt eder", () => {
    // ince-düz + ünlüyle biter
    expect(nameClass("Ali")).toBe(nameClass("Ece"));
    // ince-düz + ünsüzle biter (ötümlü)
    expect(nameClass("Deniz")).toBe(nameClass("Kerem"));
    // ünlüyle biten ile ünsüzle biten AYNI olamaz (ek tamponu farklı: 'nin' vs 'in')
    expect(nameClass("Ali")).not.toBe(nameClass("Deniz"));
  });

  it("ötümlü/ötümsüz son ünsüzü ayırır (locative -de/-te)", () => {
    // Mehmet → "Mehmet'te" (ötümsüz t) ; Kerem → "Kerem'de" (ötümlü m)
    expect(nameClass("Mehmet")).not.toBe(nameClass("Kerem"));
  });

  it("kalın ve ince ünlüyü ayırır", () => {
    // Pınar → "Pınar'ın" (kalın) ; Kerem → "Kerem'in" (ince)
    expect(nameClass("Pınar")).not.toBe(nameClass("Kerem"));
  });
});

describe("pickAlias", () => {
  it("aynı çocuk için HER ZAMAN aynı rumuzu verir (kümülatif tutarlılık)", () => {
    const a = pickAlias("Ali Yılmaz", { scope: "therapist-1" });
    const b = pickAlias("Ali Yılmaz", { scope: "therapist-1" });
    expect(a).toBe(b);
  });

  it("rumuz, gerçek adın SON KELİMESİYLE aynı ses sınıfında olur", () => {
    const alias = pickAlias("Ali Yılmaz", { scope: "t1" });
    expect(nameClass(alias)).toBe(nameClass("Yılmaz"));
  });

  it("gerçek adı asla rumuz olarak seçmez", () => {
    const alias = pickAlias("Ece", { scope: "t1" });
    expect(alias.toLocaleLowerCase("tr")).not.toBe("ece");
  });

  it("aynı terapistte çakışmayı önler (taken)", () => {
    const first = pickAlias("Ali Yılmaz", { scope: "t1" });
    const second = pickAlias("Veli Yılmaz", { scope: "t1", taken: [first] });
    expect(second).not.toBe(first);
    expect(nameClass(second)).toBe(nameClass("Yılmaz"));
  });
});

describe("pseudonymize → LLM çekimi → rehydrate (uçtan uca Türkçe)", () => {
  const cases: Array<{ real: string; suffix: string }> = [
    { real: "Ali", suffix: "'nin" },
    { real: "Ece", suffix: "'ye" },
    { real: "Deniz", suffix: "'in" },
    { real: "Mehmet", suffix: "'te" },
    { real: "Pınar", suffix: "'ın" },
    { real: "Ali Yılmaz", suffix: "'ın" },
  ];

  for (const { real, suffix } of cases) {
    it(`"${real}${suffix}" doğru üretilir`, () => {
      const alias = pickAlias(real, { scope: "t1" });
      // LLM'in yaptığı: rumuza ekin AYNISINI takar (sınıf eşleştiği için ek aynıdır)
      const llmOutput = `${alias}${suffix} ödevi hazır.`;
      const shown = rehydrateText(llmOutput, [{ real, alias }]);
      expect(shown).toBe(`${real}${suffix} ödevi hazır.`);
    });
  }
});

describe("pseudonymizeText — serbest metindeki adı da temizler", () => {
  it("uzman notlarındaki gerçek adı rumuzla değiştirir", () => {
    const alias = pickAlias("Ali Yılmaz", { scope: "t1" });
    const notes = "Ali bugün seansa isteksiz geldi. Ali'nin annesi aradı.";
    const out = pseudonymizeText(notes, [{ real: "Ali Yılmaz", alias }]);
    expect(out).not.toMatch(/Ali/);
    expect(out).toContain(alias);
    // ekler korunur (rumuz sınıf-uyumlu olduğu için Türkçe bozulmaz)
    expect(out).toContain(`${alias}'nin`);
  });

  it("soyadını da temizler", () => {
    const alias = pickAlias("Ali Yılmaz", { scope: "t1" });
    const out = pseudonymizeText("Yılmaz ailesi görüşme istedi.", [
      { real: "Ali Yılmaz", alias },
    ]);
    expect(out).not.toMatch(/Yılmaz/);
  });

  it("adın parçası olan daha uzun kelimeleri BOZMAZ", () => {
    const out = pseudonymizeText("Alic markası ve alışveriş.", [
      { real: "Ali", alias: "Ece" },
    ]);
    expect(out).toBe("Alic markası ve alışveriş.");
  });

  it("TÜRKÇE harf sınırı: adın devamı Türkçe harfse eşleşmez", () => {
    // Bu test, LETTER karakter kümesindeki eksik/bozuk harfleri yakalar — ASCII \b
    // Türkçe harflerde yanlış çalışır ve "Aliğ"/"Aliş" içindeki "Ali"yi eşleştirirdi.
    for (const word of ["Aliğ", "Aliş", "Aliç", "Aliı", "Aliİ", "AliÖ", "AliÜ"]) {
      expect(pseudonymizeText(`${word} kelimesi`, [{ real: "Ali", alias: "Ece" }])).toBe(
        `${word} kelimesi`,
      );
    }
  });

  it("boş/eksik girdide çökmez", () => {
    expect(pseudonymizeText("", [{ real: "Ali", alias: "Ece" }])).toBe("");
    expect(pseudonymizeText("metin", [])).toBe("metin");
  });
});
