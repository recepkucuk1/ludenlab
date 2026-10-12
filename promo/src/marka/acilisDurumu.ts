import { Easing, interpolate } from "remotion";
import type { V3 } from "./izometri.ts";
import { KANCA } from "./olaylar.ts";
import { kare } from "./zaman.ts";

// Açılış (Kanca, v1–8): sahne birkaç sürekli değişkenin saf fonksiyonu. Animasyon (MarkaAcilis.tsx)
// bu durumu kare kare üretir; föy (AcilisFoyu.tsx) seçilmiş anlarını çizer.

export type AcilisDurumu = {
  /** Bloğun tabla üstünden yüksekliği (dünya birimi; 0 = yerinde). */
  blokZ: number;
  /** Bloğun taklası (radyan); yerde tam [0, 0, 0]. */
  blokAci: V3;
  /** 0–1: bloğun yüzü (inişten sonra belirir). */
  yuz: number;
  /** 0–1: tabladaki kesikli yuva (inişte söner). */
  yuva: number;
  /** Başlık satırlarının açılma oranı (0–1). */
  satirlar: number[];
  /** 0–1: üst cümle ("Özel eğitimde"). */
  ust: number;
  /** Her etiket çipinin netleşmesi (0–1), HEDEFLER sırasıyla. */
  etiketCip: number[];
  /** Her etiket çizgisinin ilerlemesi (0–1; 1 = raptiyeye vardı). */
  etiketCizgi: number[];
  /** Sahne ölçeği (1 = genel plan). */
  kamera: number;
  /** İniş anında sahnenin aşağı kayması (px). */
  sarsinti: number;
  /** Zemin ızgarasının sürekli kayması (px): sahne hiç durmaz. */
  kayma: number;
  /** Zemin ışığının yatay konumu (0–1). */
  isik: number;
};

/** Blok bu yükseklikten (kadrajın üstünden) düşer. */
export const DUSUS_YUKSEKLIGI = 7;
/** 8 vuruş + sonraki ölçünün ilk 6 karesi. */
export const ACILIS_KARE = kare(9) + 6;

const ara = (f: number, a: number, b: number, easing: (t: number) => number = (t) => t) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

export const acilisDurumu = (f: number): AcilisDurumu => {
  const inis = kare(KANCA.inis);
  // Serbest düşüş (ivmeli). Takla düşüşün görünen kısmında seçilir (kadrajın altında hâlâ dönüyor),
  // inişe varınca tam sıfırlanır: blok yerine düz oturur.
  const dus = ara(f, kare(KANCA.dusus), inis);
  const donus = 1 - Easing.in(Easing.quad)(dus);
  const satir = (v: number) => ara(f, kare(v), kare(v) + 10, Easing.out(Easing.cubic));
  // Çip 18 karede bulanıktan netleşir (rehber: 0,5–0,7 sn); çizgi son 10 karede hızlanarak
  // raptiyeye tam vuruşunda varır (çizgi başlarken çip neredeyse net).
  const cip = (v: number) => ara(f, kare(v) - 24, kare(v) - 6, Easing.out(Easing.quad));
  const cizgi = (v: number) => ara(f, kare(v) - 10, kare(v), Easing.in(Easing.quad));
  const sonra = f - inis;
  return {
    blokZ: DUSUS_YUKSEKLIGI * (1 - dus * dus),
    blokAci: [0.45 * donus, -0.3 * donus, 0.55 * donus],
    yuz: ara(f, inis + 4, inis + 12),
    yuva: 1 - ara(f, inis, inis + 6),
    satirlar: KANCA.baslik.map(satir),
    ust: ara(f, kare(KANCA.ustCumle), kare(KANCA.ustCumle) + 14, Easing.out(Easing.cubic)),
    etiketCip: KANCA.etiketler.map(cip),
    etiketCizgi: KANCA.etiketler.map(cizgi),
    // Spec: kamera çok yavaş iter (5 sn'de %2–4). Doğrusal itiş: bölüm sınırına kadar hiç durmaz.
    kamera: 1 + 0.03 * (f / ACILIS_KARE),
    // Tok iniş: 6 px aşağı, 6 karede zıplamadan yerine döner.
    sarsinti: sonra < 0 ? 0 : 6 * Math.max(0, 1 - sonra / 6) ** 2,
    kayma: f * 0.4,
    isik: 0.7 + 0.05 * (f / ACILIS_KARE),
  };
};
