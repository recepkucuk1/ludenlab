import { describe, it, expect } from "vitest";
import { selectWords, selectWordsMulti } from "./selectWords";
import type { WordBank } from "./types";

const w = (word: string) => ({ word, syllableBreak: word, visualPrompt: "x" });
const BANK: WordBank = {
  k: {
    initial: [w("kalem"), w("kedi"), w("kapı")],
    medial: [w("makas"), w("bakar")],
    final: [w("ekmek")],
  },
};
// Deterministik rng: her zaman 0 → ilk elemanı seçer
const rng0 = () => 0;

describe("selectWords", () => {
  it("seçilen pozisyonların birleşiminden en fazla `count` kelime döner", () => {
    const r = selectWords(BANK, "k", ["initial", "medial"], 3, rng0);
    expect(r).toHaveLength(3);
    for (const it of r) expect(it.word).toBeTypeOf("string");
  });

  it("tekrarsızdır (aynı kelime iki kez gelmez)", () => {
    const r = selectWords(BANK, "k", ["initial", "medial", "final"], 6);
    const words = r.map((x) => x.word);
    expect(new Set(words).size).toBe(words.length);
  });

  it("mevcut kelimeden fazlası istenince var olan kadarını döner", () => {
    const r = selectWords(BANK, "k", ["final"], 10);
    expect(r).toHaveLength(1); // final'de 1 kelime var
    expect(r[0]!.word).toBe("ekmek");
    expect(r[0]!.position).toBe("final");
  });

  it("syllableCount'u syllableBreak'ten türetir", () => {
    const bank: WordBank = { d: { initial: [{ word: "dolap", syllableBreak: "do-lap", visualPrompt: "x" }], medial: [], final: [] } };
    const r = selectWords(bank, "d", ["initial"], 1);
    expect(r[0]!.syllableCount).toBe(2);
  });

  it("banka-dışı ses için boş döner", () => {
    expect(selectWords(BANK, "z", ["initial"], 5)).toEqual([]);
  });
});

const MULTI: WordBank = {
  k: { initial: [w("kalem"), w("kapı"), w("koşu")], medial: [], final: [] },
  s: { initial: [w("sabun"), w("salata"), w("su")], medial: [], final: [] },
};

describe("selectWordsMulti", () => {
  it("birden çok sesin BANKA kelimelerini birleştirir; her kelime kendi sesini taşır", () => {
    const r = selectWordsMulti(MULTI, ["/k/", "/s/"], ["initial"], 4);
    expect(r.length).toBeGreaterThan(0);
    const kWords = new Set(["kalem", "kapı", "koşu"]);
    const sWords = new Set(["sabun", "salata", "su"]);
    for (const it of r) {
      expect(kWords.has(it.word) || sWords.has(it.word)).toBe(true); // YALNIZCA banka kelimeleri
      expect(it.targetSound).toBe(kWords.has(it.word) ? "/k/" : "/s/");
    }
  });

  it("count'a indirir ve tekrarsızdır", () => {
    const r = selectWordsMulti(MULTI, ["/k/", "/s/"], ["initial"], 3);
    expect(r).toHaveLength(3);
    const words = r.map((x) => x.word);
    expect(new Set(words).size).toBe(words.length);
  });

  it("bankada olmayan sesi atlar; hiçbiri bankada yoksa boş döner", () => {
    const r = selectWordsMulti(MULTI, ["/k/", "/z/"], ["initial"], 5); // z bankada yok
    expect(r.every((x) => x.targetSound === "/k/")).toBe(true);
    expect(selectWordsMulti(MULTI, ["/z/", "/r/"], ["initial"], 5)).toEqual([]);
  });
});
