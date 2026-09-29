import { izd, type Kamera, type V2, type V3 } from "./izometri.ts";

// Kapanış yörüngeleri (spec "6 · Kapanış"): bloğun ortasından geçen, yarıçapı r olan iki çember.
// A yatay (tabla turunun izi). B, A'nın tabla düzlemindeki bir menteşe ekseni etrafında kalkmış hâli; son eğimde
// izdüşümü dikey bir elips olur ve LudenLab işaretinin dikey yörüngesiyle aynı kısa/uzun oranını taşır.
// Saf geometri: 3B nokta → izdüşüm → ön/arka koşuları → 2B elips dönüşümü (işarete oturma). Zamanlama cocukKapanis.ts'te.

/** 2B elips: merkez, yarı eksenler (a ≥ b), a ekseninin açısı (radyan, ekran: y aşağı). */
export type Elips = { cx: number; cy: number; a: number; b: number; aci: number };

/**
 * LudenLab işaretinin iki yörüngesi (logo viewBox birimi, 611 × 260). `public/brand/ludenlab-logo.svg`'deki turuncu
 * işaret yolunun iki yörüngesinin orta çizgisine uydurulan elipsler (ışınlarla bant ortası + en küçük kareler;
 * Plan 3C ölçümü; tests/marka-yorunge.test.ts resmî yola karşı denetler). İkisi aynı elips (87 × 25), ~103° dönük.
 * kesisim: iki yörüngenin ortak iç bölgesinin ağırlık merkezi (blok buraya akar). kalinlik: işaretin alanı / iki
 * elipsin çevresi (ortalama bant kalınlığı).
 */
export const ISARET = {
  genis: { cx: 498.3, cy: 139.8, a: 87.17, b: 25.07, aci: (-13.44 * Math.PI) / 180 } as Elips,
  dikey: { cx: 463.76, cy: 108.77, a: 87.03, b: 24.92, aci: (89.33 * Math.PI) / 180 } as Elips,
  kesisim: [465.7, 145.8] as V2,
  kalinlik: 8.6,
};

/**
 * LudenLab işaretinin yolu (logo viewBox birimi): `public/brand/ludenlab-logo.svg`'deki turuncu işaret yolunun aynısı
 * (tests/marka-yorunge.test.ts denetler). Halkalar sönerken bu biçime kırpılır (cocukKapanis.ts, sahne3b.tsx Yorunge):
 * işaretin kalınlığı yer yer değişir, halkanınki tekdüze; kırpılmasa ince yerlerde işaretin dışına taşar.
 */
export const ISARET_YOLU =
  "M591.16,117.7l-.02-.1c-4.3-15.99-30.29-16.21-38.88-16.28-18.52.3-38.38,3.42-58.85,9.17-.82-15.97-3.01-32.6-6.6-49.59-1.81-7.69-6.43-27.31-14.84-36.45-1.81-2.02-3.94-3.64-6.44-4.39-.87-.26-1.76-.41-2.69-.44h-.15c-12.85.63-19.31,24.15-23.05,41.81-3,14.99-4.81,31.14-5.38,48.03-.26,8.8-.2,16.96.2,24.64-7.59,4.32-16.11,10.08-20.42,16.35-1.53,2.18-2.62,4.56-2.8,7.11-.07.92-.02,1.84.16,2.76l.03.15c2.43,8.68,15.21,11.8,28.87,12.79,2.77,10.09,9.55,30.42,24.44,30.69h.11c15.83-.61,21.98-23.62,24.22-32.97,5.43-.76,10.93-1.66,16.48-2.72,23.63-4.63,42.16-10.53,58.32-18.58,7.59-3.91,30.67-15.82,27.3-31.98h0ZM433.65,168.35c-4.58-.61-16.6-2.24-18.56-8.83,0-.03-.01-.05-.02-.08-.26-1.48,0-3.02.7-4.59,1.3-2.7,4.47-6.48,11.89-11.57,2.31-1.48,4.68-2.86,7.08-4.16.77,10.67,2.22,20.42,4.39,29.63-1.83-.1-3.65-.23-5.48-.41h0ZM470.79,182.07l-.03.07c-.76,1.44-2.18,4.13-3.74,5.93-1.25,1.44-3.49,1.5-4.79.11-1.72-1.83-3.86-5.23-6.2-10.76-.48-1.24-.94-2.48-1.39-3.73.93,0,1.85,0,2.75-.03,5.62-.15,11.36-.49,17.19-1.01-1.09,3.26-2.31,6.38-3.78,9.42h0ZM479.04,155.36c-.79,3.74-1.59,7.25-2.47,10.57-7.65,1.41-15.57,2.44-23.59,2.84-3.67-11.58-5.97-23.55-7.47-34.89,12.56-5.48,25.65-9.16,38.04-11.96-.88,11.65-2.39,22.86-4.51,33.44h0ZM484.28,108.91c-.05,1.47-.13,2.91-.2,4.37-12.43,3.94-25.02,8.82-37.66,14.6-.47.23-1,.49-1.56.76-.78-6.8-1.3-13.3-1.69-19.26-.99-21.42-.95-46.47,6.89-69.85,1.61-4.32,5.86-15.66,12.74-16.1h.08c1.52.07,2.97.68,4.35,1.71,2.35,1.87,5.33,5.79,8.65,14.11,8.34,23.19,8.92,48.24,8.39,69.67h.01,0ZM576.29,123.63c-1.41,2.08-4.25,4.92-9.15,8.41-20.33,13.72-44.73,21.95-63.67,27.57-4.13,1.14-8.42,2.27-12.82,3.33,2.33-13.52,3.35-28,3.08-43.17,16.18-3.09,31.91-4.84,46.76-5.22,10.52-.17,19.3.13,27.94,2.11l.07.02c1.58.42,4.52,1.21,6.62,2.32,1.68.89,2.24,3.06,1.17,4.64h0Z";

/**
 * Dikey yörüngenin menteşe ekseni (tabla düzleminde, x ekseninden açı) ve son eğimi: çember bu eksen etrafında
 * `egim` kadar kalkınca izdüşümünün uzun ekseni ekranda tam dikey, kısa/uzun oranı `oran` olur.
 * Türetme: normal n = (sin ψ sin φ, −cos ψ sin φ, cos φ); dikeylik n·(−1,−1,2) = 0, oran |n·(1,1,1)|/√3.
 */
export const dikeyEgim = (oran: number) => {
  const D = (2 * oran) / Math.sqrt(3 - oran * oran);
  return { eksen: Math.PI / 4 + Math.asin(D / Math.SQRT2), egim: Math.atan(2 / D) };
};

const DIKEY = dikeyEgim(ISARET.dikey.b / ISARET.dikey.a);

export const YORUNGE = {
  /** Bloğun ortası: iki çemberin ortak merkezi. */
  merkez: [0, 0, 0.5] as V3,
  /** Yarıçap (dünya): 1,2'de yatay halkanın arka yayı bloğun arkasına ~33 px girer, yığınlara ≥ 22 px uzak kalır. */
  r: 1.2,
  /** Tam çemberin doğru parçası sayısı. */
  parca: 128,
  /** Turuncu dolgunun genişliği (px, 1920'de); ink kılıf iki yanda CIZGI.ince kadar taşar. */
  kalinlik: 8,
  /** A'nın çizime başladığı açı: ekranda sol uç (burada ön/arka sınırı). A, tabla dönüşü yönünde (θ azalarak) çizilir. */
  basAci: (3 * Math.PI) / 4,
  eksen: DIKEY.eksen,
  egim: DIKEY.egim,
};

const [MX, MY, MZ] = YORUNGE.merkez;

/** A (yatay) çemberinin θ açısındaki dünya noktası. */
export const halkaA = (t: number): V3 => [MX + YORUNGE.r * Math.cos(t), MY + YORUNGE.r * Math.sin(t), MZ];

/** B çemberi: menteşe ekseni a ile e2 = z × a tabanında; e2 yönü `egim` kadar yukarı kalkar (egim 0'da A ile çakışır). */
export const halkaB = (t: number, egim: number): V3 => {
  const [ca, sa] = [Math.cos(YORUNGE.eksen), Math.sin(YORUNGE.eksen)];
  const c = YORUNGE.r * Math.cos(t);
  const s = YORUNGE.r * Math.sin(t);
  return [MX + c * ca - s * sa * Math.cos(egim), MY + c * sa + s * ca * Math.cos(egim), MZ + s * Math.sin(egim)];
};

/** A'nın çizilmiş kısmı: basAci'dan θ azalarak, tam turun `oran`ı kadar (0 → boş, 1 → kapalı çember). */
export const halkaANoktalari = (oran: number): V3[] => {
  const o = Math.min(1, Math.max(0, oran));
  if (o <= 0) return [];
  const tam = Math.floor(o * YORUNGE.parca);
  const ps: V3[] = [];
  for (let i = 0; i <= tam; i++) ps.push(halkaA(YORUNGE.basAci - (2 * Math.PI * i) / YORUNGE.parca));
  if (o * YORUNGE.parca > tam) ps.push(halkaA(YORUNGE.basAci - 2 * Math.PI * o));
  return ps;
};

/** B'nin kapalı çemberi (parca + 1 nokta, son = ilk). */
export const halkaBNoktalari = (egim: number): V3[] =>
  Array.from({ length: YORUNGE.parca + 1 }, (_, i) => halkaB((2 * Math.PI * i) / YORUNGE.parca, egim));

/** Görüş yönünde (1,1,1) merkezden uzaklık: > 0 ise nokta bloğun önünde. r ≥ 1,2'de blok siluetiyle örtüşen her
 *  nokta bloğun tümüyle önünde ya da arkasındadır (küp, merkezden 0,866'lık kürenin içinde). */
export const onde = (p: V3) => p[0] - MX + (p[1] - MY) + (p[2] - MZ) > 0;

export type Kosu = { on: boolean; noktalar: V3[] };

/** Çember noktalarını ön/arka koşulara böler (parça orta noktasına göre). Kapalı çemberde ilk ve son koşu aynı
 *  taraftaysa birleşir. Komşu koşular sınır noktasını paylaşır. */
export const kosular = (noktalar: V3[]): Kosu[] => {
  const k: Kosu[] = [];
  for (let i = 0; i + 1 < noktalar.length; i++) {
    const [p, q] = [noktalar[i], noktalar[i + 1]];
    const on = onde([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]);
    const son = k[k.length - 1];
    if (son && son.on === on) son.noktalar.push(q);
    else k.push({ on, noktalar: [p, q] });
  }
  const kapali = noktalar.length > 2 && noktalar[0].every((v, i) => Math.abs(v - noktalar[noktalar.length - 1][i]) < 1e-9);
  if (kapali && k.length > 1 && k[0].on === k[k.length - 1].on) {
    const son = k.pop()!;
    k[0] = { on: son.on, noktalar: [...son.noktalar, ...k[0].noktalar.slice(1)] };
  }
  return k;
};

/** 3B çemberin (merkez + cos t·u + sin t·v) ekrandaki elipsi. */
export const izdusumElipsi = (merkez: V3, u: V3, v: V3, k: Kamera): Elips => {
  const o = izd([0, 0, 0], k);
  const [pu, pv] = [u, v].map((w) => {
    const q = izd(w, k);
    return [q[0] - o[0], q[1] - o[1]];
  });
  const [cx, cy] = izd(merkez, k);
  // M = [pu pv]; M·Mᵀ'nin özdeğerleri yarı eksenlerin kareleri, ilk özvektör uzun eksen.
  const p = pu[0] * pu[0] + pv[0] * pv[0];
  const r = pu[1] * pu[1] + pv[1] * pv[1];
  const q = pu[0] * pu[1] + pv[0] * pv[1];
  const orta = (p + r) / 2;
  const fark = Math.sqrt(((p - r) / 2) ** 2 + q * q);
  return { cx, cy, a: Math.sqrt(orta + fark), b: Math.sqrt(Math.max(0, orta - fark)), aci: 0.5 * Math.atan2(2 * q, p - r) };
};

/** A'nın ve `egim`deki B'nin izdüşüm elipsleri. */
export const halkaAElipsi = (k: Kamera) => izdusumElipsi(YORUNGE.merkez, [YORUNGE.r, 0, 0], [0, YORUNGE.r, 0], k);
export const halkaBElipsi = (egim: number, k: Kamera) => {
  const [ca, sa] = [Math.cos(YORUNGE.eksen), Math.sin(YORUNGE.eksen)];
  const r = YORUNGE.r;
  return izdusumElipsi(YORUNGE.merkez, [r * ca, r * sa, 0], [-r * sa * Math.cos(egim), r * ca * Math.cos(egim), r * Math.sin(egim)], k);
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Kaynak elipsi u oranında hedef elipse götüren 2B dönüşüm: merkez, yarı eksenler ve açı doğrusal ilerler; u = 0'da
 * birim dönüşüm, u = 1'de kaynak elipsin her noktası hedef elipsin üstündedir. Açı hedefe en yakın eşdeğerden
 * (π katları) başlar: elips yarım turdan fazla dönmez.
 */
export const elipsDonusumu = (kaynak: Elips, hedef: Elips, u: number) => {
  const a0 = kaynak.aci + Math.PI * Math.round((hedef.aci - kaynak.aci) / Math.PI);
  const aci = lerp(a0, hedef.aci, u);
  const [c0, s0, c1, s1] = [Math.cos(a0), Math.sin(a0), Math.cos(aci), Math.sin(aci)];
  const sa = lerp(kaynak.a, hedef.a, u) / kaynak.a;
  const sb = lerp(kaynak.b, hedef.b, u) / kaynak.b;
  const [cx, cy] = [lerp(kaynak.cx, hedef.cx, u), lerp(kaynak.cy, hedef.cy, u)];
  return (p: V2): V2 => {
    const [x, y] = [p[0] - kaynak.cx, p[1] - kaynak.cy];
    const ex = (x * c0 + y * s0) * sa;
    const ey = (-x * s0 + y * c0) * sb;
    return [cx + ex * c1 - ey * s1, cy + ex * s1 + ey * c1];
  };
};

/** Elipsin (merkez etrafında) normalleştirilmiş yarıçapı: 1 → nokta elipsin üstünde. */
export const elipsYaricapi = (e: Elips, p: V2) => {
  const [x, y] = [p[0] - e.cx, p[1] - e.cy];
  const [c, s] = [Math.cos(e.aci), Math.sin(e.aci)];
  return Math.hypot((x * c + y * s) / e.a, (-x * s + y * c) / e.b);
};
