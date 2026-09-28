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
