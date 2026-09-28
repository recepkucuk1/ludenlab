import type { Kamera, V3 } from "./izometri.ts";

/** Genel plan (storyboard F2, F10): tabla sağda, blok ortasında; metin sütunu solda. */
export const GENEL_KAMERA: Kamera = { s: 100, ox: 1340, oy: 560, don: 0 };

export type HedefYerlesimi = {
  /** Çizginin vardığı dünya noktası. */
  capa: V3;
  /** Çipin hizalı kenarı (px, 1920×1080). */
  x: number;
  y: number;
  hiza: "sol" | "sag";
};

/**
 * HEDEFLER sırasıyla etiket yerleşimi. Onay kapısı 1: iki çapa bloğun üst yüzünde, üçüncüsü tablada;
 * yan yüzler boş kalır, raptiye bloğun yüzüyle karışmaz.
 */
export const HEDEF_YERLESIMI: readonly HedefYerlesimi[] = [
  { capa: [-0.3, 0.3, 1], x: 1150, y: 330, hiza: "sag" },
  { capa: [0.3, -0.3, 1], x: 1520, y: 330, hiza: "sol" },
  { capa: [0.85, 0.15, 0], x: 1540, y: 740, hiza: "sol" },
];
