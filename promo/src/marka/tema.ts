import type { Boya } from "./izometri.ts";

// LudenLab marka filmi değerleri (docs/brand/ludenlab-gorsel-tasarim-claude-project.md; spec "Görsel dil").
export const RENK = {
  krem: "#fff8ec",
  kagitBeyaz: "#fffdf8",
  ink: "#0e1e26",
  teal: "#023435",
  turuncu: "#fe703a",
  studio: "#4a90e2",
  atolye: "#ffce52",
  tablaYan: "#f2e3cc",
} as const;

export const BOYA: Record<"kagit" | "turuncu", Boya> = {
  kagit: { ust: "#ffffff", sol: "#f5eee3", sag: "#e7ddcc" },
  turuncu: { ust: "#ff9468", sol: "#fe703a", sag: "#dd5a27" },
};

export const FONT = {
  baslik: "'Bricolage Grotesque', sans-serif",
  govde: "'Satoshi', sans-serif",
} as const;

/** Çizgi kalınlıkları (1920 genişlikte px). */
export const CIZGI = { kalin: 3.2, ince: 2.2 } as const;

/** 16:9 tuval ve metin sütununun sol kenarı. */
export const TUVAL_169 = { w: 1920, h: 1080, sol: 120 } as const;

/** Hap çip ölçüleri (px): yazi.tsx'teki Cip ve sınır testi aynı sayıları okur. nokta: modül noktası + boşluk (16 + 10). */
export const CIP = { boyut: 28, yan: 22, kenar: 2.5, nokta: 26 } as const;

/** TASLAK damgasının doğal boyutu (px). Seans planı görselinin başlık bölümüne (üst kenar ile "MEB hedefi" satırı arası,
 *  kartın kendi çerçevesinde ~149 px) −10° eğikken dört köşesiyle sığsın diye 276×92'den küçültüldü. */
export const DAMGA_BOYUT = { w: 252, h: 84 } as const;

/** Resmî logo kilidinin (public/brand/ludenlab-logo.svg) viewBox boyutu. */
export const LOGO_VIEWBOX = { w: 611, h: 260 } as const;

/** Kapanış düğmesi (Poster): yükseklik, yan boşluk, yazı boyu, köşe yarıçapı, blursuz ofset gölge (px). */
export const DUGME = { yukseklik: 68, yan: 34, boyut: 32, kose: 16, golge: 8 } as const;
