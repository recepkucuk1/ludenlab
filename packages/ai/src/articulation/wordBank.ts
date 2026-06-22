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
import { words as f } from "./banks/f";
import { words as v } from "./banks/v";
import { words as h } from "./banks/h";
import { words as c } from "./banks/c";
import { words as ch } from "./banks/ch";
import { words as t } from "./banks/t";
import { words as b } from "./banks/b";
import { words as p } from "./banks/p";
import { words as m } from "./banks/m";
import { words as n } from "./banks/n";
import { words as j } from "./banks/j";
import { words as gyumusak } from "./banks/gyumusak";
import { words as u } from "./banks/u";
import { words as uu } from "./banks/uumlaut";
import { words as a } from "./banks/a";
import { words as e } from "./banks/e";
import { words as idotless } from "./banks/idotless";
import { words as i } from "./banks/i";
import { words as o } from "./banks/o";
import { words as ou } from "./banks/oumlaut";

/** "/k/" | "k" | " /Ş/ " → "k" / "ş" (Türkçe küçük harf, slash/boşluk temizlenir). */
export function soundToLetter(sound: string): string {
  return sound.replace(/\//g, "").trim().toLocaleLowerCase("tr-TR");
}

/**
 * Uzman-onaylı küratе kelime bankası. Anahtar = sesin sade harfi.
 * Kapsam: k g r l y s ş z d f v h c ç t b j ğ u ü a e ı i o ö × başta/ortada/sonda. Bazı pozisyonlar Türkçe ses-bilgisi
 * gereği seyrek/boştur (sonda /g/, /d/, /b/, /c/ ≈ yok — sözcük-sonu sertleşmesi; başta /r/, /l/ az — alıntı;
 * başta /ğ/ tamamen yok — Türkçe fonotaktik kural; başta /ü/ az — somut isim sayısı sınırlı;
 * başta /ı/ az — Türkçe doğal kısıtı; başta /ö/ az — Türkçe doğal kısıtı;
 * sonda /ö/ yok — Türkçe fonotaktik kural).
 * Her kelime bütünlük testinden geçer (pozisyon + hece + dolu görsel-tanım).
 */
export const WORD_BANK: WordBank = { k, g, r, l, y, s, "ş": sh, z, d, f, v, h, c, "ç": ch, t, b, p, m, n, j, "ğ": gyumusak, u, "ü": uu, a, e, "ı": idotless, i, o, "ö": ou };
