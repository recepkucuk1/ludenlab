import type { WordBank } from "./types";

/** "/k/" | "k" | " /Ş/ " → "k" / "ş" (Türkçe küçük harf, slash/boşluk temizlenir). */
export function soundToLetter(sound: string): string {
  return sound.replace(/\//g, "").trim().toLocaleLowerCase("tr-TR");
}

/**
 * Uzman-onaylı kelime bankası. Anahtar = sesin sade harfi ("k","g","r","l","y","s","ş","z","d").
 * Kapsam ve doldurma için bkz. plan "İçerik Doldurma" bölümü.
 */
export const WORD_BANK: WordBank = {
  d: {
    initial: [
      { word: "dolap", syllableBreak: "do-lap", visualPrompt: "a wooden wardrobe cabinet" },
      { word: "dere", syllableBreak: "de-re", visualPrompt: "a small stream flowing through grass" },
      { word: "diş", syllableBreak: "diş", visualPrompt: "a single white tooth" },
      { word: "davul", syllableBreak: "da-vul", visualPrompt: "a drum" },
      { word: "deniz", syllableBreak: "de-niz", visualPrompt: "the blue sea with gentle waves" },
      { word: "dudak", syllableBreak: "du-dak", visualPrompt: "a pair of lips" },
    ],
    medial: [
      { word: "adım", syllableBreak: "a-dım", visualPrompt: "a single footprint on the ground" },
      { word: "merdiven", syllableBreak: "mer-di-ven", visualPrompt: "a staircase" },
      { word: "badem", syllableBreak: "ba-dem", visualPrompt: "a few almonds" },
      { word: "bardak", syllableBreak: "bar-dak", visualPrompt: "a drinking glass" },
      { word: "ördek", syllableBreak: "ör-dek", visualPrompt: "a duck" },
      { word: "yıldız", syllableBreak: "yıl-dız", visualPrompt: "a yellow five-pointed star" },
    ],
    // Türkçe'de sözcük sonu sertleşmesi (d→t) nedeniyle sonda /d/ ≈ yoktur → boş.
    final: [],
  },
};
