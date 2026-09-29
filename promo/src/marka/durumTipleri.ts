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

/** Halkanın logo işaretine kırpılması: işaretin yolu (logo viewBox birimi, yorunge.ts ISARET_YOLU) translate(x y)
 *  scale(olcek) ile kamera kapsayıcısına taşınır. genisleme: işaretin kaç px genişletildiği (0 = tam işaret). */
export type YorungeKirpmasi = { x: number; y: number; olcek: number; genisleme: number };

/** Kapanış yörüngesinin bir koşusu (kamera kapsayıcısında 2B). on: bloğun önünde çizilir. cizgi: ink kılıfın yolu;
 *  dolgu: turuncu yol (ön koşuda komşu arka koşulara taşar: ek yerinde kılıfın yuvarlak ucu görünmez).
 *  kalinlik: dolgu genişliği (px); kilif: kılıfın opaklığı (0–1); opaklik: bütün koşunun opaklığı;
 *  kirpma: varsa koşu yalnız (genişletilmiş) logo işaretinin içinde çizilir. */
export type YorungeCizimi = { id: string; on: boolean; cizgi: V2[]; dolgu: V2[]; kalinlik: number; kilif: number; opaklik: number; kirpma: YorungeKirpmasi | null };

/** Bloğun kapanıştaki 2B yolu: blok merkezinin ekran noktası (kaynak) merkez'e taşınır ve olcek'le küçülür. */
export type BlokIzi = { kaynak: V2; merkez: V2; olcek: number };

/** Kapanış: tabla ve yığınların çekilmesi (ayrı katmanda bulanıklık px, opaklık, odak etrafında ölçek). */
export type ArkaCekilme = { bulaniklik: number; opaklik: number; olcek: number };

/** Kapanış kartı: resmî logo kilidi, slogan, Studio/Atölye hapları ve ludenlab.com düğmesi. itme: ekran ortası
 *  etrafında son yavaş itme. gorunum: bulanıktan netleşme; acilis: maske; basma: düğme yüzünün gölgeye inişi. */
export type KapanisDurumu = {
  itme: number;
  logo: { x: number; y: number; w: number; gorunum: number };
  slogan: { metin: string; top: number; acilis: number };
  cagri: {
    top: number;
    cipler: { metin: string; nokta: string; gorunum: number }[];
    dugme: { metin: string; gorunum: number; basma: number };
  };
};
