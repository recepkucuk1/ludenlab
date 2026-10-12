import { describe, expect, it } from "vitest";
import { harmonizeSuffix, nameClass, pickAlias, pseudonymizeText, rehydrateText } from "./index";

/**
 * Regresyon kilidi — DÖRDÜNCÜ Türkçe kaçak: EK UYUMU, DEĞİŞTİRME tarafında (2026-10).
 *
 * İlk üç kaçak (büyük İ, kesmesiz ek, aksansız yazım) EŞLEŞTİRİCİ tarafındaydı: ad
 * bulunamıyordu. Bu dördüncüsü farklı: ad BULUNUYOR ama yerine konan rumuz, ekle UYUMSUZ.
 *
 * Sebep: rumuz, tam adın SON kelimesine (soyad) göre sınıf-eşli seçilir — "Ela Demir'in"
 * doğru çıksın diye. Oysa uzmanlar serbest metinde çoğu kez YALNIZ ADI ekiyle yazar:
 * "Ela'nın sınıfta söz almak için el kaldırıp beklemesi". "Ela" (kalın-düz, ünlüyle biter)
 * ile "Demir" (ince-düz, ötümlü ünsüzle biter) farklı sınıfta → rumuz "Kerem" + korunan
 * ek "'nın" = "Kerem'nın" ✗. Prompt bozuk Türkçe alıyor; model bu biçimi kopyalarsa
 * geri-çevirme uzmana "Ela Demir'nın" gösteriyor.
 *
 * Çözüm: ek, YERİNE KONAN adın ses sınıfına yeniden uyarlanır — iki yönde de. Sınıf zaten
 * uyumluysa (tam ad/soyad eşleşmesi) uyarlama hiçbir şeyi değiştirmez (idempotent).
 */

// Sabit rumuzlar: sınıfı SOYADLA eşleşen ama ADLA eşleşmeyen çiftler.
//   "Ela Demir": Demir FU-C1 ≈ Kerem ; Ela BU-V   (ünlüyle biten ad → ünsüzle biten rumuz)
//   "Mert Kaya": Kaya  BU-V  ≈ Asya  ; Mert FU-C0 (ünsüzle biten ad → ünlüyle biten rumuz)
const ELA = { real: "Ela Demir", alias: "Kerem" };
const MERT = { real: "Mert Kaya", alias: "Asya" };

describe("test verisinin sınıf ön koşulu", () => {
  it("rumuzlar soyadla aynı, adla farklı sınıfta", () => {
    expect(nameClass("Kerem")).toBe(nameClass("Demir"));
    expect(nameClass("Kerem")).not.toBe(nameClass("Ela"));
    expect(nameClass("Asya")).toBe(nameClass("Kaya"));
    expect(nameClass("Asya")).not.toBe(nameClass("Mert"));
  });
});

describe("harmonizeSuffix — ekin yazımını hedef adın sınıfına çevirir", () => {
  it.each([
    ["nın", "Kerem", "in"], // tamlayan: kaynaştırma n düşer, ı→i
    ["in", "Asya", "nın"], // tamlayan: kaynaştırma n gelir, i→ı
    ["ya", "Kerem", "e"], // yönelme: kaynaştırma y düşer
    ["e", "Asya", "ya"], // yönelme: kaynaştırma y gelir
    ["yı", "Kerem", "i"], // belirtme
    ["i", "Asya", "yı"],
    ["da", "Kerem", "de"], // bulunma
    ["te", "Asya", "da"], // ötümsüz t → ötümlü d (ünlüden sonra)
    ["de", "Mehmet", "te"], // ötümlü d → ötümsüz t (sert ünsüzden sonra)
    ["den", "Mehmet", "ten"], // ayrılma
    ["yla", "Kerem", "le"], // vasıta
    ["le", "Asya", "yla"],
    ["lar", "Kerem", "ler"], // çoğul
    ["lı", "Kerem", "li"], // -li
    ["nin", "Pınar", "ın"], // kalın-düz
    ["nin", "Doruk", "un"], // kalın-yuvarlak
    ["nin", "Göktuğ", "un"], // son ünlü u → kalın-yuvarlak
    ["nın", "Şule", "nin"], // ince-düz ünlüyle biten
  ])("%s + %s → %s", (ek, hedef, beklenen) => {
    expect(harmonizeSuffix(ek, hedef)).toBe(beklenen);
  });

  it("ek zaten uyumluysa aynen döner (idempotent)", () => {
    expect(harmonizeSuffix("in", "Kerem")).toBe("in");
    expect(harmonizeSuffix("nın", "Asya")).toBe("nın");
    expect(harmonizeSuffix("te", "Mehmet")).toBe("te");
  });

  it("BÜYÜK yazılmış ek büyük kalır", () => {
    expect(harmonizeSuffix("NIN", "Kerem")).toBe("İN");
    expect(harmonizeSuffix("YA", "Kerem")).toBe("E");
  });

  it("tanınmayan ek olduğu gibi bırakılır", () => {
    expect(harmonizeSuffix("m", "Kerem")).toBe("m");
    expect(harmonizeSuffix("nınki", "Kerem")).toBe("nınki");
  });

  it("hedefin sınıfı hesaplanamıyorsa (ünlüsüz) ek olduğu gibi kalır", () => {
    expect(harmonizeSuffix("nın", "B")).toBe("nın");
    expect(harmonizeSuffix("nın", "")).toBe("nın");
  });
});

describe("yalnız AD + ek → ek rumuzun sınıfına uyarlanır (ünlüyle biten ad → ünsüzle biten rumuz)", () => {
  it.each([
    ["Ela'nın çantası", "Kerem'in çantası"], // tamlayan
    ["Ela'ya verildi", "Kerem'e verildi"], // yönelme
    ["Ela'yı gördüm", "Kerem'i gördüm"], // belirtme
    ["Ela'da kaldı", "Kerem'de kaldı"], // bulunma
    ["Ela'dan aldım", "Kerem'den aldım"], // ayrılma
    ["Ela'yla oynadı", "Kerem'le oynadı"], // vasıta
    ["Ela'lar geldi", "Kerem'ler geldi"], // çoğul
  ])("%s → %s", (girdi, beklenen) => {
    expect(pseudonymizeText(girdi, [ELA])).toBe(beklenen);
  });

  it("kesmesiz yazım: \"Elanın\" → \"Keremin\"", () => {
    expect(pseudonymizeText("Elanın çantası", [ELA])).toBe("Keremin çantası");
  });

  it("BÜYÜK yazım: \"ELA'YA\" → ek büyük harfle uyarlanır", () => {
    expect(pseudonymizeText("ELA'YA verildi", [ELA])).toBe("Kerem'E verildi");
  });

  it("kıvrık kesme (’) korunur", () => {
    expect(pseudonymizeText("Ela’nın çantası", [ELA])).toBe("Kerem’in çantası");
  });

  it("uzmanın gerçek sosyal öykü cümlesi", () => {
    expect(
      pseudonymizeText("Ela'nın sınıfta söz almak için el kaldırıp beklemesi", [ELA]),
    ).toBe("Kerem'in sınıfta söz almak için el kaldırıp beklemesi");
  });

  it("aynı metinde birden çok geçiş, her biri ayrı uyarlanır", () => {
    expect(pseudonymizeText("Ela'ya göre Ela'nın sırası.", [ELA])).toBe(
      "Kerem'e göre Kerem'in sırası.",
    );
  });
});

describe("ters yön: ünsüzle biten ad → ünlüyle biten rumuz (kaynaştırma ünsüzü EKLENİR)", () => {
  it.each([
    ["Mert'in ödevi", "Asya'nın ödevi"],
    ["Mert'e verildi", "Asya'ya verildi"],
    ["Mert'i gördüm", "Asya'yı gördüm"],
    ["Mert'te kaldı", "Asya'da kaldı"], // ötümsüz t → d
    ["Mert'ten aldım", "Asya'dan aldım"],
    ["Mert'le oynadı", "Asya'yla oynadı"],
    ["Mertin ödevi", "Asyanın ödevi"], // kesmesiz
  ])("%s → %s", (girdi, beklenen) => {
    expect(pseudonymizeText(girdi, [MERT])).toBe(beklenen);
  });
});

describe("tam ad / soyad biçimleri DEĞİŞMEZ — sınıf zaten uyumlu, uyarlama idempotent", () => {
  it.each([
    ["Ela Demir'in çantası", "Kerem'in çantası"],
    ["Ela Demir'e verildi", "Kerem'e verildi"],
    ["Demir'in çantası", "Kerem'in çantası"],
    ["Ela Demirin çantası", "Keremin çantası"],
  ])("%s → %s", (girdi, beklenen) => {
    expect(pseudonymizeText(girdi, [ELA])).toBe(beklenen);
  });

  it.each([
    ["Mert Kaya'nın ödevi", "Asya'nın ödevi"],
    ["Kaya'ya verildi", "Asya'ya verildi"],
  ])("%s → %s", (girdi, beklenen) => {
    expect(pseudonymizeText(girdi, [MERT])).toBe(beklenen);
  });
});

describe("rehydrate — modelin kopyaladığı bozuk biçim de GERÇEK adın sınıfına uyarlanır", () => {
  it("\"Kerem'nın\" (prompt'tan kopyalanmış bozuk ek) → \"Ela Demir'in\"", () => {
    expect(rehydrateText("Kerem'nın çantası hazır.", [ELA])).toBe("Ela Demir'in çantası hazır.");
  });

  it("doğru biçim olduğu gibi geçer", () => {
    expect(rehydrateText("Kerem'in çantası hazır.", [ELA])).toBe("Ela Demir'in çantası hazır.");
    expect(rehydrateText("Asya'ya verildi.", [MERT])).toBe("Mert Kaya'ya verildi.");
  });

  it("yedek rumuz \"Öğrenci\" farklı sınıfta olsa da ek gerçek ada uyar", () => {
    expect(
      rehydrateText("Öğrenci'nin ödevi hazır.", [{ real: "Mert Kaya", alias: "Öğrenci" }]),
    ).toBe("Mert Kaya'nın ödevi hazır.");
    expect(rehydrateText("Öğrenci'ye verildi.", [{ real: "Ela Demir", alias: "Öğrenci" }])).toBe(
      "Ela Demir'e verildi.",
    );
  });

  it("BÜYÜK başlıkta ek büyük kalır", () => {
    expect(rehydrateText("KEREM'İN HAFTALIK PLANI", [ELA])).toBe("Ela Demir'İN HAFTALIK PLANI");
  });

  it("küçük harfli geçiş yine ÇEVRİLMEZ (sözlük kelimesi koruması gevşemedi)", () => {
    expect(rehydrateText("kerem'in çantası", [ELA])).toBe("kerem'in çantası");
    expect(rehydrateText("keremin çantası", [ELA])).toBe("keremin çantası");
  });
});

describe("uçtan uca: uzman yalnız adı yazar → prompt → model → uzman", () => {
  it("prompt'ta ek doğru; model prompt'u aynen kopyalasa bile uzmana doğru Türkçe döner", () => {
    const real = "Ela Demir";
    const alias = pickAlias(real, { scope: "t1" });
    const map = [{ real, alias }];

    const prompt = pseudonymizeText("Ela'nın sınıfta söz almak için el kaldırıp beklemesi", map);
    expect(prompt).not.toMatch(/Ela/);
    // Rumuz "Demir" sınıfında (ince-düz, ötümlü ünsüz) → tamlayan eki MUTLAKA "'in".
    expect(prompt).toBe(`${alias}'in sınıfta söz almak için el kaldırıp beklemesi`);

    expect(rehydrateText(prompt, map)).toBe(
      "Ela Demir'in sınıfta söz almak için el kaldırıp beklemesi",
    );
  });

  it("temsilî adlar × ekler: prompt'taki ek rumuza, dönen ek gerçek ada uyar", () => {
    const names = ["Ela Demir", "Mert Kaya", "Ayşe Yılmaz", "Ömer Koç", "Zeynep Öztürk", "Umut Şahin", "Elif Su"];
    // Kanonik yüzeyler — hedef ada göre yeniden üretilir.
    const morphemes = ["nin", "ye", "yi", "de", "den", "yle", "ler"];
    for (const real of names) {
      const alias = pickAlias(real, { scope: "t1" });
      const map = [{ real, alias }];
      const first = real.split(" ")[0]!;
      for (const m of morphemes) {
        const written = `${first}'${harmonizeSuffix(m, first)} ödevi`;
        const prompt = pseudonymizeText(written, map);
        expect(prompt, written).toBe(`${alias}'${harmonizeSuffix(m, alias)} ödevi`);
        expect(rehydrateText(prompt, map), written).toBe(`${real}'${harmonizeSuffix(m, real)} ödevi`);
      }
    }
  });
});

describe("eşleştirici DARALMADI / GENİŞLEMEDİ — kesmesiz ek listesi aynı", () => {
  // 2026-09 kapısının bilerek dar tuttuğu kesmesiz ek listesi — hepsi hâlâ yakalanır.
  const KESMESIZ = [
    "nden", "ndan", "nde", "nda", "nin", "nın", "nun", "nün",
    "den", "dan", "ten", "tan", "ler", "lar", "yle", "yla",
    "yi", "yı", "yu", "yü", "ye", "ya", "de", "da", "te", "ta",
    "in", "ın", "un", "ün", "le", "la", "li", "lı", "lu", "lü",
  ];

  it("36 kesmesiz ekin hepsi yakalanır", () => {
    for (const ek of KESMESIZ) {
      const out = pseudonymizeText(`Ali${ek} geldi.`, [{ real: "Ali", alias: "Ece" }]);
      expect(out, ek).not.toMatch(/Ali/);
    }
  });

  it("TEK harflik ek kesmesiz yazımda yutulmaz (gündelik kelime koruması)", () => {
    for (const kelime of ["Alie", "Alia", "Alii", "Aliı", "Alim"]) {
      expect(pseudonymizeText(`${kelime} dedi.`, [{ real: "Ali", alias: "Ece" }]), kelime).toBe(
        `${kelime} dedi.`,
      );
    }
  });

  it("kesmeli TEK harflik ek YAKALANIR ve uyarlanır", () => {
    expect(pseudonymizeText("Mert'e verildi.", [MERT])).toBe("Asya'ya verildi.");
    expect(pseudonymizeText("Mert'i gördüm.", [MERT])).toBe("Asya'yı gördüm.");
  });

  it("tanınmayan kesmeli ek: ad yine temizlenir, ek olduğu gibi kalır (bilinen sınır)", () => {
    const out = pseudonymizeText("Ela'm ve Ela'nınki", [ELA]);
    expect(out).not.toMatch(/Ela/);
    expect(out).toContain("Kerem");
  });

  it("küçük harfli sözlük kelimesi + ek bozulmaz (\"adada\" ≠ \"Ada'da\")", () => {
    expect(pseudonymizeText("adada yürüdük.", [{ real: "Ada", alias: "Ece" }])).toBe("adada yürüdük.");
  });
});
