import type { Kamera, V3 } from "./izometri.ts";
import type { YiginId } from "./olaylar.ts";

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

/** Yük desteleri etiketlerinin yeri (yığın başına): S3 tablanın solunda olduğu için çipi altta ve sağ hizalı (başlığa girmesin). */
export const YUK_CIP_YERI: Record<YiginId, { x: number; y: number; hiza: "sol" | "sag" }> = {
  S1: { x: 1450, y: 190, hiza: "sol" },
  S2: { x: 1580, y: 300, hiza: "sol" },
  S3: { x: 1040, y: 900, hiza: "sag" },
  S4: { x: 1560, y: 830, hiza: "sol" },
};
