// apps/hub/evals/tools/studio/articulation/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { articulationChecks, containsWord, keepsFinalPosition, letterOf, stems, syllabify } from "./checks";

const body = (level: "isolated" | "syllable" | "word" | "sentence" | "contextual", extra = {}) => ({
  targetSounds: ["/r/"], positions: ["final" as const], level, itemCount: 3, ...extra,
});
const base = { title: "T", expertNotes: "Dil ucu", cueTypes: ["görsel"], homeGuidance: "Evde" };

describe("artikülasyon yardımcıları (eski düzenekten)", () => {
  it("letterOf, stems, containsWord, keepsFinalPosition, syllabify", () => {
    expect(letterOf("/Ş/")).toBe("ş");
    expect(stems("kitap")).toContain("kitab");
    expect(containsWord("Kitabı aldı", "kitap")).toBe(true);
    expect(keepsFinalPosition("Bu bir kar.", "kar")).toBe(true);
    expect(keepsFinalPosition("Karı gördü.", "kar")).toBe(false);
    expect(syllabify("kapı")).toEqual(["ka", "pı"]);
  });
});

describe("articulationChecks", () => {
  it("cümle düzeyi: kelime cümlede (ekli de olur), hedef harf kelimede, sonda ek yok", () => {
    const out = { ...base, items: [
      { word: "kar", sentence: "Dışarıda kar var.", position: "final", targetSound: "/r/" },
      { word: "bir", sentence: "Bir elma aldım.", position: "final", targetSound: "/r/" },
      { word: "sar", sentence: "Sarı çiçek.", position: "final", targetSound: "/r/" },
    ] };
    const r = articulationChecks({ body: body("sentence"), output: out, raw: out, text: "" });
    // "Sarı" ekli hâliyle kelimeyi içerir (containsWord gövde eşler) ama sonda eksiz DEĞİL: iki kontrol bunu ayırır.
    expect(r.details.cumle_kelime).toBe(1);
    expect(r.details.hedef_harf).toBe(1);
    expect(r.details.sonda_eksiz).toBeCloseTo(2 / 3);
    expect(r.hard).toEqual([]);
  });
  it("bağlam düzeyi: paragraf en az 3 cümle", () => {
    const out = { ...base, items: [{ word: "kar", sentence: "Kar yağdı. Çocuklar sevindi. Kardan adam yaptılar.", position: "final", targetSound: "/r/" }] };
    const r = articulationChecks({ body: body("contextual", { itemCount: 1 }), output: out, raw: out, text: "" });
    expect(r.details.paragraf).toBe(1);
  });
  it("hece düzeyi: hece türü etiketi ve örnek kelime heceyi içerir", () => {
    const out = { ...base, items: [{ word: "ra", syllableType: "açık", exampleWord: "radyo", targetSound: "/r/", position: "initial" }, { word: "ar", syllableType: "yarım", exampleWord: "kedi", targetSound: "/r/", position: "final" }] };
    const r = articulationChecks({ body: body("syllable", { itemCount: 2 }), output: out, raw: out, text: "" });
    expect(r.details.hece_turu).toBe(0.5);
    expect(r.details.ornek_kelime).toBe(0.5);
  });
  it("kelime düzeyi + öğrencili banka kaybı: boş items sert hata DEĞİL; öğrencisiz boş items sert hata", () => {
    const out = { ...base, items: [] };
    const ogrencili = articulationChecks({ body: body("word"), output: out, raw: out, text: "", ogrencili: true });
    expect(ogrencili.hard).toEqual([]);
    const ogrencisiz = articulationChecks({ body: body("word"), output: out, raw: out, text: "", ogrencili: false });
    expect(ogrencisiz.hard).toContain("oge_yok");
  });
  it("alanlar: başlık/not/ipucu/ev rehberi eksikse düşer", () => {
    const out = { title: "", expertNotes: "", cueTypes: [], homeGuidance: "", items: [{ word: "r", targetSound: "/r/" }] };
    const r = articulationChecks({ body: body("isolated", { itemCount: 1 }), output: out, raw: out, text: "" });
    expect(r.details.alanlar).toBe(0);
  });
});
