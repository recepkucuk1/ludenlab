import type { WordBank } from "./types";
import { words as k } from "./banks/k";
import { words as g } from "./banks/g";
import { words as r } from "./banks/r";
import { words as l } from "./banks/l";
import { words as y } from "./banks/y";
import { words as s } from "./banks/s";
import { words as sh } from "./banks/sh";
import { words as z } from "./banks/z";
import { words as d } from "./banks/d";

/** "/k/" | "k" | " /Ş/ " → "k" / "ş" (Türkçe küçük harf, slash/boşluk temizlenir). */
export function soundToLetter(sound: string): string {
  return sound.replace(/\//g, "").trim().toLocaleLowerCase("tr-TR");
}

/**
 * Uzman-onaylı küratе kelime bankası. Anahtar = sesin sade harfi.
 * Kapsam: k g r l y s ş z d × başta/ortada/sonda. Bazı pozisyonlar Türkçe ses-bilgisi
 * gereği seyrek/boştur (sonda /g/, /d/ ≈ yok — sözcük-sonu sertleşmesi; başta /r/, /l/ az — alıntı).
 * Her kelime bütünlük testinden geçer (pozisyon + hece + dolu görsel-tanım).
 */
export const WORD_BANK: WordBank = { k, g, r, l, y, s, "ş": sh, z, d };
