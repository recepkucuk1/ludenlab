import type { V2, V3 } from "./izometri.ts";

// Film durumunun parça tipleri (filmDurumu.ts ve moduller.ts paylaşır).

export type EtiketDurumu = {
  id: string;
  /** Çizginin vardığı dünya noktası. */
  capa: V3;
  /** Varsa çapa ekran noktası (2B karta bağlı etiketler); capa yerine kullanılır. */
  capaEkran?: V2;
  x: number;
  y: number;
  hiza: "sol" | "sag";
  metin: string;
  nokta?: string;
  gorunum: number;
  ilerleme: number;
  cikis: number;
};

export type MetinDurumu = {
  id: string;
  satirlar: string[];
  top: number;
  font: "baslik" | "govde";
  boyut: number;
  agirlik: number;
  renk: string;
  opaklik: number;
  acilis: number[];
  cikis: number;
  /** Varsa en büyük genişlik (px): metin bu genişlikte kendiliğinden kırılır. */
  genislik?: number;
};

export type CipDurumu = { id: string; x: number; y: number; metin: string; nokta?: string; gorunum: number; cikis: number };

/** Ürünün gerçek çıktısı: 2B kart (merkezden konum, ölçek, perspektifli rotateY, eğim). sira: 0 önde, büyük arkada. */
export type KartDurumu = {
  id: string;
  resim: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  olcek: number;
  rotY: number;
  egim: number;
  opaklik: number;
  cikis: number;
  sira: number;
};

/** Bölüm kilidi: numara + büyük harf ad. */
export type KilitDurumu = { id: string; numara: string; kelime: string; top: number; gorunum: number; cikis: number };

/** TASLAK damgası. */
export type DamgaDurumu = { x: number; y: number; olcek: number; aci: number; opaklik: number; cikis: number };
