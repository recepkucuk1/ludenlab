import type { WordBank } from "./types";

/** "/k/" | "k" | " /Ş/ " → "k" / "ş" (Türkçe küçük harf, slash/boşluk temizlenir). */
export function soundToLetter(sound: string): string {
  return sound.replace(/\//g, "").trim().toLocaleLowerCase("tr-TR");
}

/**
 * Uzman-onaylı kelime bankası. Anahtar = sesin sade harfi ("k","g","r","l","y","s","ş","z","d").
 * Kapsam ve doldurma için bkz. plan "İçerik Doldurma" bölümü.
 */
export const WORD_BANK: WordBank = {};
