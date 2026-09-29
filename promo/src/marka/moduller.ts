import { Easing, interpolate } from "remotion";
import type { DamgaDurumu, EtiketDurumu, KartDurumu, KilitDurumu, MetinDurumu } from "./durumTipleri.ts";
import type { V2, V3 } from "./izometri.ts";
import { ETIKETLER, METIN } from "./metin.ts";
import { ATOLYE, STUDIO } from "./olaylar.ts";
import { RENK } from "./tema.ts";
import { BOLUMLER_169, kare } from "./zaman.ts";

// Studio (v33–52) ve Atölye (v53–72) katmanı: etiketler, metinler, gerçek çıktı kartları, kilitler, damga,
// odak dışı soluklaştırma ve kartına dönüşen üst kâğıt. Saf: kare → katman. Kamera/tabla filmDurumu.ts'tedir.

export type ModulKatmani = {
  etiketler: EtiketDurumu[];
  metinler: MetinDurumu[];
  kartlar: KartDurumu[];
  kilitler: KilitDurumu[];
  damga: DamgaDurumu | null;
  /** Soluklaştırma (1 = tam renk): odak dışı blok ve modül yığınının rengi %30'a iner (tabla üstüne karışır, opak kalır). */
  soluk: { blok: number; studio: number; atolye: number };
  /** Kartına dönüşen üst kâğıt: kart açıkken modül yığınından eksilen sayı (0 veya 1). */
  eksik: { studio: number; atolye: number };
  /** Eksik üst kâğıdın opaklığı: kart belirirken 6 karede söner (çapraz geçiş), kart giderken 12 karede geri gelir.
   *  Yalnız eksik = 1 iken anlamlı; eksik = 0'da yığın zaten tam. */
  ust: { studio: number; atolye: number };
};

const ara = (f: number, a: number, b: number, easing: (t: number) => number = (t) => t) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
const cikisAri = (f: number, k: number) => ara(f, k, k + 12);
/** Çıkışlar (blur-out 12 kare) sonraki öğenin girişinden bu kadar önce başlar: o belirirken bu neredeyse gitmiştir. */
export const ERKEN = 6;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const K33 = kare(STUDIO.tabla);
const K53 = kare(ATOLYE.tabla);
const K73 = kare(BOLUMLER_169.find((b) => b.id === "cocuk")!.ilk);

/** Kartlar yığından rotateY 35° → 0 ile açılır (stil kılavuzu). */
const ACILIS_ACI = 35;

/** Studio'nun ön kartı (Artikülasyon, yatay kırpım) ve destedeki iki kartın ofseti. cy: destenin arka kartı ve
 *  çevrilirken perspektifle büyüyen kenar künyedeki adrese (sağ üst, y ≈ 80–105) değmesin; alt kenar yığının üstünde. */
export const STUDIO_KART = { cx: 1340, cy: 380, w: 600, h: 392, egim: -2 };
const DESTE = [
  { dx: 22, dy: -18, egim: 1 },
  { dx: 46, dy: -36, egim: 3 },
];
const STUDIO_RESIMLER = ["real/r3-kagit.png", "real/r4-hikaye.png", "real/r2-kart.png"];
/** Studio yığınının tepesi ekranda (kamera s 120, ox 1335, oy 650, tabla −180°): kart buradan açılır. */
const STUDIO_YIGIN_EKRAN: V2 = [1340, 701];
/** Atölye kartı (seans planı taslağı, dikey) ve yığın tepesi (kamera s 130, ox 1626, oy 640, tabla −270°). */
export const ATOLYE_KART = { cx: 1400, cy: 447, w: 420, h: 594, egim: 2 };
const ATOLYE_YIGIN_EKRAN: V2 = [1350, 533];
const ATOLYE_YIGIN_DUNYA: V3 = [1.2, 1.25, 0.8];

type EtiketTemeli = Omit<EtiketDurumu, "gorunum" | "ilerleme" | "cikis">;
/** Vuruşunda raptiyeye varan etiket: çip 18 karede netleşir, çizgi son 10 karede hızlanarak varır; cikisKare'de çıkar. */
const vurusEtiketi = (f: number, v: number, cikisKare: number, e: EtiketTemeli): EtiketDurumu | null => {
  const k = kare(v);
  if (f < k - 24) return null;
  const cikis = cikisAri(f, cikisKare);
  if (cikis >= 1) return null;
  return { ...e, gorunum: ara(f, k - 24, k - 6, Easing.out(Easing.quad)), ilerleme: ara(f, k - 10, k, Easing.in(Easing.quad)), cikis };
};

const metin = (
  f: number,
  id: string,
  satirlar: string[],
  top: number,
  bicim: { font: "baslik" | "govde"; boyut: number; agirlik: number; renk: string; opaklik: number; genislik?: number },
  girisV: number,
  cikisKare: number,
): MetinDurumu | null => {
  const k = kare(girisV);
  if (f < k) return null;
  const cikis = cikisAri(f, cikisKare);
  if (cikis >= 1) return null;
  return { id, satirlar, top, ...bicim, acilis: satirlar.map((_, i) => ara(f, k + 5 * i, k + 5 * i + 14, Easing.out(Easing.cubic))), cikis };
};

const KITLE = { font: "govde" as const, boyut: 42, agirlik: 500, renk: RENK.ink, opaklik: 0.85 };
const CUMLE = { font: "govde" as const, boyut: 54, agirlik: 700, renk: RENK.teal, opaklik: 1 };
const KUCUK = { font: "govde" as const, boyut: 30, agirlik: 500, renk: RENK.ink, opaklik: 0.7, genislik: 640 };
/** Araçlar satırı iki satıra kendiliğinden kırılınca sayı adından kopuyordu ("ve 8 / araç daha"): kuyruk ayrı satır. */
const aracSatirlari = (s: string) => s.split(/ (?=ve \d+ araç daha$)/);

const studioKartlari = (f: number): KartDurumu[] => {
  const k41 = kare(STUDIO.kart);
  if (f < k41) return [];
  const cikis = cikisAri(f, K53);
  if (cikis >= 1) return [];
  const u = ara(f, k41, k41 + 36, Easing.out(Easing.cubic));
  const deste = ara(f, k41 + 24, k41 + 36);
  const [c1, c2] = STUDIO.cevir.map((v) => kare(v));
  // Çevirmeler vuruşta başlar: sayfa sesiyle örtüşür. Ön kart 8 karede gider, arkadakiler 2 kare gecikmeyle öne kayar.
  const cevrim = [ara(f, c1, c1 + 8, Easing.in(Easing.quad)), ara(f, c2, c2 + 8, Easing.in(Easing.quad)), 0];
  const kayma = ara(f, c1 + 2, c1 + 10, Easing.out(Easing.cubic)) + ara(f, c2 + 2, c2 + 10, Easing.out(Easing.cubic));
  const kartlar: KartDurumu[] = [];
  for (let i = 0; i < 3; i++) {
    if (cevrim[i] >= 1) continue;
    const sira = Math.max(0, i - kayma);
    const alt = Math.min(1, Math.floor(sira));
    const t = sira - alt;
    const poz = (s: number) => (s === 0 ? { dx: 0, dy: 0, egim: STUDIO_KART.egim } : DESTE[s - 1]);
    const a = poz(alt);
    const b = poz(Math.min(2, alt + 1));
    let cx = STUDIO_KART.cx + lerp(a.dx, b.dx, t);
    let cy = STUDIO_KART.cy + lerp(a.dy, b.dy, t);
    let olcek = 1;
    let rotY = -90 * cevrim[i];
    const opaklik = i === 0 ? ara(f, k41, k41 + 6) : deste;
    if (i === 0) {
      cx = lerp(STUDIO_YIGIN_EKRAN[0], cx, u);
      cy = lerp(STUDIO_YIGIN_EKRAN[1], cy, u);
      olcek = lerp(0.2, 1, u);
      rotY += ACILIS_ACI * (1 - u);
    }
    kartlar.push({ id: `studio-${i}`, resim: STUDIO_RESIMLER[i], cx, cy, w: STUDIO_KART.w, h: STUDIO_KART.h, olcek, rotY, egim: lerp(a.egim, b.egim, t), opaklik, cikis, sira: i - kayma });
  }
  return kartlar;
};

const atolyeKarti = (f: number): KartDurumu[] => {
  const k61 = kare(ATOLYE.kart);
  if (f < k61) return [];
  const cikis = cikisAri(f, K73);
  if (cikis >= 1) return [];
  const u = ara(f, k61, k61 + 36, Easing.out(Easing.cubic));
  return [
    {
      id: "atolye-0",
      resim: "real/r5-taslak.png",
      cx: lerp(ATOLYE_YIGIN_EKRAN[0], ATOLYE_KART.cx, u),
      cy: lerp(ATOLYE_YIGIN_EKRAN[1], ATOLYE_KART.cy, u),
      w: ATOLYE_KART.w,
      h: ATOLYE_KART.h,
      olcek: lerp(0.2, 1, u),
      rotY: ACILIS_ACI * (1 - u),
      egim: ATOLYE_KART.egim,
      opaklik: ara(f, k61, k61 + 6),
      cikis,
      sira: 0,
    },
  ];
};

/** Kartına dönüşen üst kâğıdın opaklığı. Kart 6 karede belirir, kâğıt aynı sürede söner (toplam görünürlük 1);
 *  kart donus'ta 12 karelik blur-out'a girerken kâğıt aynı sürede geri belirir. */
const ustKagit = (f: number, acilis: number, donus: number) => 1 - ara(f, acilis, acilis + 6) + ara(f, donus, donus + 12);

export const modulKatmani = (f: number): ModulKatmani => {
  const etiketler: EtiketDurumu[] = [];
  const ekle = (e: EtiketDurumu | null) => {
    if (e) etiketler.push(e);
  };
  const kS = kare(STUDIO.kart);
  const kA = kare(ATOLYE.kart);
  const studioYer = [
    { capa: [-0.95, -1.2, 0.8] as V3, x: 1150, y: 640, hiza: "sag" as const },
    { capa: [-1.25, -1.2, 0.8] as V3, x: 1520, y: 600, hiza: "sol" as const },
    { capa: [-1.6, -1.2, 0.4] as V3, x: 1540, y: 860, hiza: "sol" as const },
  ];
  STUDIO.etiketler.forEach((v, i) => ekle(vurusEtiketi(f, v, kS - ERKEN, { id: `studio-${i}`, ...studioYer[i], metin: ETIKETLER.studio[i], nokta: RENK.studio })));
  // Kart etiketleri: başlığın solu ve sağ alttaki görsel (rüzgâr; çizgi kelimeyi kesmesin diye görselin sol ucu).
  // İkincisinin çipi kartın altında, tablada: kartın sağında ~310 px'lik çipe yer yok (kadraj dışına taşardı).
  const kartYer = [
    { capa: [0, 0, 0] as V3, capaEkran: [1075, 214] as V2, x: 1010, y: 214, hiza: "sag" as const },
    { capa: [0, 0, 0] as V3, capaEkran: [1472, 450] as V2, x: 1440, y: 650, hiza: "sol" as const },
  ];
  // Kart etiketleri ilk çevirme başlamadan 6 kare önce çıkar: ön kart 8 karede gider, etiket kartsız kalıp işaret etmesin.
  STUDIO.kartEtiketleri.forEach((v, i) =>
    ekle(vurusEtiketi(f, v, kare(STUDIO.cevir[0]) - ERKEN, { id: `studio-kart-${i}`, ...kartYer[i], metin: ETIKETLER.studioKart[i] })),
  );
  // Basamaklar sağ kenar payına (1800) sığar: en uzun çip ("hedef 3.1.2") ~212 px. Her çapa, üstteki çipin alt kenarında.
  const basamakYer = [
    { capa: ATOLYE_YIGIN_DUNYA, x: 1365, y: 330, hiza: "sol" as const },
    { capa: [0, 0, 0] as V3, capaEkran: [1405, 357] as V2, x: 1465, y: 430, hiza: "sol" as const },
    { capa: [0, 0, 0] as V3, capaEkran: [1505, 457] as V2, x: 1565, y: 530, hiza: "sol" as const },
  ];
  ATOLYE.basamaklar.forEach((v, i) => ekle(vurusEtiketi(f, v, kA - ERKEN, { id: `basamak-${i}`, ...basamakYer[i], metin: ETIKETLER.atolye[i], nokta: RENK.atolye })));
  // "etkinlik akışı" çipi kartın sağ kenar payına biner (kartın sağ kenarı ≈1617): sağında 220 px'lik çipe yer yok.
  const atolyeKartYer = [
    { capa: [0, 0, 0] as V3, capaEkran: [1212, 302] as V2, x: 1150, y: 300, hiza: "sag" as const },
    { capa: [0, 0, 0] as V3, capaEkran: [1484, 379] as V2, x: 1540, y: 470, hiza: "sol" as const },
  ];
  ATOLYE.kartEtiketleri.forEach((v, i) => ekle(vurusEtiketi(f, v, K73, { id: `atolye-kart-${i}`, ...atolyeKartYer[i], metin: ETIKETLER.atolyeKart[i] })));

  const metinler = [
    metin(f, "studio-kitle", METIN.studio.ekran[0].split("\n"), 520, KITLE, STUDIO.kitle, kS),
    metin(f, "studio-cumle", METIN.studio.ekran[1].split("\n"), 520, CUMLE, STUDIO.cumle, K53),
    metin(f, "studio-araclar", aracSatirlari(METIN.studio.ekran[2]), 760, KUCUK, STUDIO.araclar, K53),
    metin(f, "atolye-kitle", METIN.atolye.ekran[0].split("\n"), 490, KITLE, ATOLYE.kitle, kA),
    metin(f, "atolye-meb", [METIN.atolye.ekran[1]], 620, { ...KUCUK, agirlik: 600 }, ATOLYE.meb, kA),
    metin(f, "atolye-cumle", METIN.atolye.ekran[2].split("\n"), 490, CUMLE, ATOLYE.cumle, K73),
    metin(f, "atolye-sonsoz", [METIN.atolye.ekran[3]], 720, { font: "govde", boyut: 40, agirlik: 600, renk: RENK.ink, opaklik: 0.9 }, ATOLYE.sonSoz, K73),
    metin(f, "atolye-araclar", aracSatirlari(METIN.atolye.ekran[4]), 800, KUCUK, ATOLYE.araclar, K73),
  ].filter((m): m is MetinDurumu => m !== null);

  const kilitler: KilitDurumu[] = [];
  // Studio kilidi Atölye kilidinden (K53 + 6'da belirir) önce gider; iki kutu üst üste görünmez.
  const cS = cikisAri(f, K53 - ERKEN);
  if (f >= K33 && cS < 1) kilitler.push({ id: "kilit-studio", numara: "01", kelime: METIN.studio.baslik[0], top: 360, gorunum: ara(f, K33 + 6, K33 + 24), cikis: cS });
  const cA = cikisAri(f, K73);
  if (f >= K53 && cA < 1) kilitler.push({ id: "kilit-atolye", numara: "02", kelime: METIN.atolye.baslik[0], top: 330, gorunum: ara(f, K53 + 6, K53 + 24), cikis: cA });

  const kD = kare(ATOLYE.damga);
  const g = ara(f, kD - 6, kD, Easing.in(Easing.quad));
  const damga: DamgaDurumu | null = f >= kD - 6 && cA < 1 ? { x: 1460, y: 227, olcek: 1.6 - 0.6 * g, aci: -10, opaklik: g, cikis: cA } : null;

  const solS = ara(f, K33, K33 + 18);
  const solA = ara(f, K53, K53 + 18);
  return {
    etiketler,
    metinler,
    kartlar: [...studioKartlari(f), ...atolyeKarti(f)],
    kilitler,
    damga,
    soluk: { blok: 1 - 0.7 * solS, studio: 1 - 0.7 * solA, atolye: 1 - 0.7 * solS + 0.7 * solA },
    eksik: { studio: f >= kS && f < K53 + 12 ? 1 : 0, atolye: f >= kA && f < K73 + 12 ? 1 : 0 },
    ust: { studio: ustKagit(f, kS, K53), atolye: ustKagit(f, kA, K73) },
  };
};
