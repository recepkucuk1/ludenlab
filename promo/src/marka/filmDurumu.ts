import { Easing, interpolate } from "remotion";
import { acilisDurumu } from "./acilisDurumu.ts";
import { izd, type Kamera, type V2, type V3 } from "./izometri.ts";
import { izlek } from "./izlek.ts";
import { KAGIT_T, YIGIN_YERI, inmisAdet, kagitSahnesi, type KagitGrubu } from "./kagitAkisi.ts";
import { HEDEFLER, METIN } from "./metin.ts";
import { DONUS, YUK } from "./olaylar.ts";
import { RENK } from "./tema.ts";
import { GENEL_KAMERA, HEDEF_YERLESIMI, YUK_CIP_YERI } from "./yerlesim.ts";
import { BOLUMLER_169, kare } from "./zaman.ts";

// Filmin tek sürekli sahnesi: kare → durum. Kanca kareleri açılışın (acilisDurumu) birebir aynısıdır;
// sonraki bölümler aynı dünyada devam eder (tabla, blok, kâğıtlar, kamera). Plan 3A: v1–32.

export type EtiketDurumu = {
  id: string;
  capa: V3;
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
};
export type CipDurumu = { id: string; x: number; y: number; metin: string; nokta?: string; gorunum: number; cikis: number };
export type FilmDurumu = {
  kamera: Kamera;
  /** Kameranın yavaş itmesi (CSS ölçeği, odak etrafında). */
  itme: number;
  odak: V2;
  sarsinti: number;
  kayma: number;
  isik: number;
  blok: { z: number; aci: V3; yuz: number };
  yuva: number;
  kagitlar: KagitGrubu[];
  etiketler: EtiketDurumu[];
  metinler: MetinDurumu[];
  cipler: CipDurumu[];
  kunye: number;
};

const ara = (f: number, a: number, b: number, easing: (t: number) => number = (t) => t) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
const cikisAri = (f: number, v: number) => ara(f, v, v + 8);

const K9 = kare(YUK.baslik);
const K25 = kare(DONUS.tabla);
const STUDIO_BAS = kare(BOLUMLER_169.find((b) => b.id === "studio")!.ilk);
const ODAK = izd([0, 0, 0.5], GENEL_KAMERA);

const tablaAcisi = izlek([
  { f: K25, d: 0 },
  { f: K25 + 27, d: -Math.PI / 2, e: Easing.inOut(Easing.cubic) },
]);
// Kanca'dan sonra: Yük boyunca itme sürer (kadraj daralır); Dönüş'te %14 geri çekilip nefes alır.
const yukDonusItmesi = izlek([
  { f: K9, d: acilisDurumu(K9).kamera },
  { f: kare(24), d: 1.07 },
  { f: K25, d: 1.07 },
  { f: K25 + 18, d: 0.93, e: Easing.inOut(Easing.cubic) },
  { f: kare(28), d: 1.0, e: Easing.inOut(Easing.cubic) },
]);

export const filmDurumu = (f: number): FilmDurumu => {
  // Kanca'nın son hâli (etiket ve metin çıkışı için); Kanca içinde tam o kare.
  const a = acilisDurumu(Math.min(f, K9 - 1));
  const kancaCikis = cikisAri(f, K9);
  const yukCikis = cikisAri(f, K25);
  const donusCikis = cikisAri(f, STUDIO_BAS);

  const etiketler: EtiketDurumu[] = [];
  if (kancaCikis < 1) {
    HEDEFLER.forEach((h, i) => {
      const y = HEDEF_YERLESIMI[i];
      etiketler.push({ id: `hedef-${i}`, capa: y.capa, x: y.x, y: y.y, hiza: y.hiza, metin: h.metin, gorunum: a.etiketCip[i], ilerleme: a.etiketCizgi[i], cikis: kancaCikis });
    });
  }
  for (const d of YUK.desteler) {
    if (!d.etiket) continue;
    const v = kare(d.vurus);
    if (f < v - 6 || f > v + 24) continue;
    const g = ara(f, v - 6, v, Easing.out(Easing.quad));
    const [cx, cy] = YIGIN_YERI[d.yigin];
    const yer = YUK_CIP_YERI[d.yigin];
    etiketler.push({
      id: `deste-${d.vurus}`,
      capa: [cx, cy, inmisAdet(d.yigin, v) * KAGIT_T],
      x: yer.x,
      y: yer.y,
      hiza: yer.hiza,
      metin: d.etiket,
      gorunum: g,
      ilerleme: g,
      cikis: ara(f, v + 18, v + 24),
    });
  }

  const metinler: MetinDurumu[] = [];
  if (kancaCikis < 1) {
    metinler.push(
      { id: "kanca-ust", satirlar: [METIN.kanca.ekran[0]], top: 400, font: "govde", boyut: 44, agirlik: 500, renk: RENK.ink, opaklik: 0.85, acilis: [a.ust], cikis: kancaCikis },
      { id: "kanca-baslik", satirlar: METIN.kanca.baslik, top: 480, font: "baslik", boyut: 104, agirlik: 800, renk: RENK.teal, opaklik: 1, acilis: a.satirlar, cikis: kancaCikis },
    );
  }
  if (f >= K9 && yukCikis < 1) {
    const K10 = kare(YUK.baslik + 1);
    metinler.push({
      id: "yuk-baslik",
      satirlar: METIN.yuk.baslik,
      top: 470,
      font: "baslik",
      boyut: 88,
      agirlik: 800,
      renk: RENK.teal,
      opaklik: 1,
      acilis: [ara(f, K9 + 6, K9 + 16, Easing.out(Easing.cubic)), ara(f, K10, K10 + 10, Easing.out(Easing.cubic))],
      cikis: yukCikis,
    });
    const alt = METIN.yuk.ekran[0].split("\n");
    const K19 = kare(YUK.altCumle);
    metinler.push({
      id: "yuk-alt",
      satirlar: alt,
      top: 660,
      font: "govde",
      boyut: 42,
      agirlik: 500,
      renk: RENK.ink,
      opaklik: 0.85,
      acilis: alt.map((_, i) => ara(f, K19 + 4 * i, K19 + 4 * i + 14, Easing.out(Easing.cubic))),
      cikis: yukCikis,
    });
  }
  const cipler: CipDurumu[] = [];
  if (f >= K25 && donusCikis < 1) {
    const satirlar = METIN.donus.ekran[0].split("\n");
    const K26 = kare(DONUS.cumle);
    metinler.push({
      id: "donus-cumle",
      satirlar,
      top: 420,
      font: "govde",
      boyut: 60,
      agirlik: 700,
      renk: RENK.teal,
      opaklik: 1,
      acilis: satirlar.map((_, i) => ara(f, K26 + 5 * i, K26 + 5 * i + 12, Easing.out(Easing.cubic))),
      cikis: donusCikis,
    });
    const [c1, c2] = DONUS.cipler.map((v) => kare(v));
    cipler.push(
      { id: "cip-studio", x: 120, y: 720, metin: METIN.donus.ekran[1], nokta: RENK.studio, gorunum: ara(f, c1 - 8, c1, Easing.out(Easing.quad)), cikis: donusCikis },
      { id: "cip-atolye", x: 120, y: 790, metin: METIN.donus.ekran[2], nokta: RENK.atolye, gorunum: ara(f, c2 - 8, c2, Easing.out(Easing.quad)), cikis: donusCikis },
    );
  }

  const kunyeKare = kare(DONUS.kunye);
  return {
    kamera: { ...GENEL_KAMERA, don: tablaAcisi(f) },
    itme: f < K9 ? a.kamera : yukDonusItmesi(f),
    odak: ODAK,
    sarsinti: a.sarsinti,
    kayma: f * 0.4,
    isik: f < K9 ? a.isik : acilisDurumu(K9).isik + 0.1 * Math.sin((2 * Math.PI * (f - K9)) / 750),
    blok: { z: a.blokZ, aci: a.blokAci, yuz: a.yuz },
    yuva: a.yuva,
    kagitlar: kagitSahnesi(f),
    etiketler,
    metinler,
    cipler,
    kunye: ara(f, kunyeKare - 10, kunyeKare),
  };
};
