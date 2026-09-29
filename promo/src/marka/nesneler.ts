import { dikdortgenTaban, type V2, type V3 } from "./izometri.ts";

/** Tohumlu rastgele (mulberry32): aynı tohum her render'da aynı yığını verir. */
export const rng = (tohum: number) => {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** opaklik: saydamlık, yalnız kartına dönüşen üst kâğıtta (moduller.ts) ve Çocuk'ta kalkan kâğıtlarda (cocukKapanis.ts); yoksa tam opak. */
export type Kagit = { taban: V2[]; z0: number; h: number; ust: boolean; sekme: string | null; opaklik?: number };
export type Yigin = { cx: number; cy: number; kagitlar: Kagit[]; ustZ: number };
export type YiginAyar = {
  cx: number;
  cy: number;
  adet: number;
  tohum?: number;
  /** Kâğıtların dağınıklığı (radyan ve birim); 0 = hizalı deste. */
  sapma?: number;
  /** En üst kâğıdın köşesindeki modül rengi (Studio mavisi, Atölye sarısı). */
  sekme?: string | null;
  w?: number;
  d?: number;
  t?: number;
  z?: number;
  /** En üst kâğıda yazı çizgileri çizilsin mi. */
  cizgili?: boolean;
};

export const yigin = ({ cx, cy, adet, tohum = 1, sapma = 0.1, sekme = null, w = 1.25, d = 0.9, t = 0.1, z = 0, cizgili = true }: YiginAyar): Yigin => {
  const r = rng(tohum);
  const kagitlar: Kagit[] = [];
  for (let i = 0; i < adet; i++) {
    const aci = (r() - 0.5) * 2 * sapma, ox = (r() - 0.5) * sapma * 0.7, oy = (r() - 0.5) * sapma * 0.7;
    const son = i === adet - 1;
    kagitlar.push({ taban: dikdortgenTaban(cx + ox, cy + oy, w, d, aci), z0: z + i * t, h: t, ust: son && cizgili, sekme: son ? sekme : null });
  }
  return { cx, cy, kagitlar, ustZ: z + adet * t };
};

// Üst yüzde (u, v) noktası: taban köşeleri c0 (sol üst), c1 (sağ üst), c3 (sol alt) üzerinden.
const ustNokta = (k: Kagit, u: number, v: number): V3 => {
  const zt = k.z0 + k.h;
  const [c0, c1, , c3] = k.taban;
  return [c0[0] + u * (c1[0] - c0[0]) + v * (c3[0] - c0[0]), c0[1] + u * (c1[1] - c0[1]) + v * (c3[1] - c0[1]), zt];
};

/** Üst yüzdeki üç yazı çizgisi (başlangıç, bitiş). */
export const kagitCizgileri = (k: Kagit): [V3, V3][] =>
  ([[0.3, 0.84], [0.5, 0.84], [0.7, 0.58]] as const).map(([v, e]) => [ustNokta(k, 0.34, v), ustNokta(k, e, v)]);

/** Üst yüzün sol üst köşesindeki renkli sekme. */
export const sekmeDortgeni = (k: Kagit): V3[] => [ustNokta(k, 0.08, 0.14), ustNokta(k, 0.24, 0.14), ustNokta(k, 0.24, 0.42), ustNokta(k, 0.08, 0.42)];
