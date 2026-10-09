import { describe, expect, it, vi } from "vitest";

/**
 * Studio takma-ad sarmalayıcısı — uzmanın YALNIZ ADI ekiyle yazdığı serbest metin.
 *
 * Sosyal öykü formunun `situation` alanına uzman doğal biçimde "Ela'nın sınıfta söz almak
 * için el kaldırıp beklemesi" yazar. Rumuz soyada göre sınıf-eşli seçildiği için ek,
 * rumuzun sınıfına yeniden uyarlanmalı; dönüşte model bozuk biçimi kopyalamış olsa bile
 * uzman doğru Türkçe görmeli. (@ludenlab/ai tarafındaki asıl kilit:
 * packages/ai/src/pseudonym/pseudonymSuffixHarmony.test.ts — burası sarmalayıcının
 * aynı davranışı taşıdığını doğrular.)
 */
vi.mock("@studio/lib/db", () => ({ prisma: {} }));

const { restoreName, restoreNameDeep, scrub, scrubDeep } = await import("./pseudonym");

// Demir (ince-düz, ötümlü ünsüz) ≈ Kerem ; Ela (kalın-düz, ünlüyle biter) ≠ Kerem
const map = { real: "Ela Demir", alias: "Kerem" };

describe("scrub / scrubDeep — ek rumuzun sınıfına uyar", () => {
  it("sosyal öykü durumu: \"Ela'nın\" → \"Kerem'in\"", () => {
    expect(scrub("Ela'nın sınıfta söz almak için el kaldırıp beklemesi", map)).toBe(
      "Kerem'in sınıfta söz almak için el kaldırıp beklemesi",
    );
  });

  it("form alanlarının tamamında (kesmeli + kesmesiz + büyük)", () => {
    expect(
      scrubDeep(
        { situation: "Ela'nın çantası", goals: ["Elanın sırası", "ELA'YA söz"], notes: null },
        map,
      ),
    ).toEqual({
      situation: "Kerem'in çantası",
      goals: ["Keremin sırası", "Kerem'E söz"],
      notes: null,
    });
  });

  it("tam ad biçimi değişmez", () => {
    expect(scrub("Ela Demir'in çantası", map)).toBe("Kerem'in çantası");
  });
});

describe("restoreName / restoreNameDeep — bozuk kopya da doğru Türkçeye döner", () => {
  it("model prompt'taki bozuk eki kopyalasa bile: \"Kerem'nın\" → \"Ela Demir'in\"", () => {
    expect(restoreName("Kerem'nın çantası hazır.", map)).toBe("Ela Demir'in çantası hazır.");
  });

  it("doğru biçim olduğu gibi geçer", () => {
    expect(restoreName("Kerem'in çantası hazır.", map)).toBe("Ela Demir'in çantası hazır.");
  });

  it("görsel prompt alanı RUMUZLU kalır, diğerleri uyarlanarak çevrilir", () => {
    expect(
      restoreNameDeep(
        { title: "Kerem'nın günü", sentences: ["Kerem'in sırası"], visualPrompt: "Kerem waits" },
        map,
      ),
    ).toEqual({
      title: "Ela Demir'in günü",
      sentences: ["Ela Demir'in sırası"],
      visualPrompt: "Kerem waits",
    });
  });
});
