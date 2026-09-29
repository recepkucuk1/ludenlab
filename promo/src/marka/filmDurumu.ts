import { Easing, interpolate } from "remotion";
import type { CipDurumu, DamgaDurumu, EtiketDurumu, KartDurumu, KilitDurumu, MetinDurumu } from "./durumTipleri.ts";
import { acilisDurumu } from "./acilisDurumu.ts";
import { izd, type Kamera, type V2, type V3 } from "./izometri.ts";
import { izlek } from "./izlek.ts";
import { KAGIT_T, MODUL_ADET, YIGIN_YERI, inmisAdet, kagitSahnesi, modulYigini, type KagitGrubu, type ModulId } from "./kagitAkisi.ts";
import { HEDEFLER, METIN } from "./metin.ts";
import { modulKatmani } from "./moduller.ts";
import { ATOLYE, DONUS, STUDIO, YUK } from "./olaylar.ts";
import { RENK } from "./tema.ts";
import { GENEL_KAMERA, HEDEF_YERLESIMI, YUK_CIP_YERI } from "./yerlesim.ts";
import { BOLUMLER_169, kare } from "./zaman.ts";

export type { CipDurumu, DamgaDurumu, EtiketDurumu, KartDurumu, KilitDurumu, MetinDurumu } from "./durumTipleri.ts";

// Filmin tek sürekli sahnesi: kare → durum. Kanca kareleri açılışın (acilisDurumu) birebir aynısıdır;
// sonraki bölümler aynı dünyada devam eder (tabla, blok, kâğıtlar, kamera). Plan 3A: v1–32; Plan 3B: v33–72.

export type FilmDurumu = {
  kamera: Kamera;
  /** Kameranın yavaş itmesi (CSS ölçeği, odak etrafında). */
  itme: number;
  odak: V2;
  sarsinti: number;
  kayma: number;
  isik: number;
  /** opaklik: odak dışı soluklaştırma (Studio ve Atölye bölümlerinde blok %30'a iner). */
  blok: { z: number; aci: V3; yuz: number; opaklik: number };
  yuva: number;
  kagitlar: KagitGrubu[];
  etiketler: EtiketDurumu[];
  metinler: MetinDurumu[];
  cipler: CipDurumu[];
  kartlar: KartDurumu[];
  kilitler: KilitDurumu[];
  damga: DamgaDurumu | null;
  kunye: number;
};

const ara = (f: number, a: number, b: number, easing: (t: number) => number = (t) => t) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
const cikisAri = (f: number, v: number) => ara(f, v, v + 12);

const K9 = kare(YUK.baslik);
const K25 = kare(DONUS.tabla);
const STUDIO_BAS = kare(BOLUMLER_169.find((b) => b.id === "studio")!.ilk);
const K33 = kare(STUDIO.tabla);
const K53 = kare(ATOLYE.tabla);
const K73 = kare(BOLUMLER_169.find((b) => b.id === "cocuk")!.ilk);
const ODAK = izd([0, 0, 0.5], GENEL_KAMERA);

const tablaAcisi = izlek([
  { f: K25, d: 0 },
  { f: K25 + 36, d: -Math.PI / 2, e: Easing.inOut(Easing.sin) },
  { f: K33, d: -Math.PI / 2 },
  { f: K33 + 36, d: -Math.PI, e: Easing.inOut(Easing.sin) },
  { f: K53, d: -Math.PI },
  { f: K53 + 36, d: (-3 * Math.PI) / 2, e: Easing.inOut(Easing.sin) },
]);
const e36 = Easing.inOut(Easing.sin);
// Kamera: genel plan → Studio yığını (s 120) → Atölye yığını (s 130, storyboard F8).
const kameraS = izlek([{ f: K33, d: 100 }, { f: K33 + 36, d: 120, e: e36 }, { f: K53, d: 120 }, { f: K53 + 36, d: 130, e: e36 }]);
const kameraOx = izlek([{ f: K33, d: 1340 }, { f: K33 + 36, d: 1335, e: e36 }, { f: K53, d: 1335 }, { f: K53 + 36, d: 1626, e: e36 }]);
const kameraOy = izlek([{ f: K33, d: 560 }, { f: K33 + 36, d: 650, e: e36 }, { f: K53, d: 650 }, { f: K53 + 36, d: 640, e: e36 }]);
// Kanca'dan sonra kamera hiç durmaz: Yük boyunca itme sürer (kadraj daralır), Dönüş'te %14 geri çekilip nefes alır,
// sonra Studio'ya doğru yavaşça yeniden iter.
const yukDonusItmesi = izlek([
  { f: K9, d: acilisDurumu(K9).kamera },
  { f: K25, d: 1.07 },
  { f: K25 + 18, d: 0.93, e: Easing.inOut(Easing.cubic) },
  { f: kare(28), d: 1.0, e: Easing.inOut(Easing.cubic) },
  { f: STUDIO_BAS, d: 1.02 },
  { f: K53, d: 1.04 },
  { f: K53 + 18, d: 1.0, e: Easing.inOut(Easing.cubic) },
  { f: K73, d: 1.03 },
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
      { id: "cip-studio", x: 120, y: 720, metin: METIN.donus.ekran[1], nokta: RENK.studio, gorunum: ara(f, c1 - 18, c1, Easing.out(Easing.quad)), cikis: donusCikis },
      { id: "cip-atolye", x: 120, y: 790, metin: METIN.donus.ekran[2], nokta: RENK.atolye, gorunum: ara(f, c2 - 18, c2, Easing.out(Easing.quad)), cikis: donusCikis },
    );
  }

  const m = f >= K33 ? modulKatmani(f) : null;
  const soluk = m?.soluk ?? { blok: 1, studio: 1, atolye: 1 };
  const eksik = m?.eksik ?? { studio: 0, atolye: 0 };
  const kagitlar = kagitSahnesi(f).map((g) => {
    for (const mid of ["studio", "atolye"] as ModulId[]) {
      if (g.id !== `modul-${mid}`) continue;
      const adet = g.kagitlar.length === MODUL_ADET ? MODUL_ADET - eksik[mid] : g.kagitlar.length;
      return { ...g, kagitlar: adet === g.kagitlar.length ? g.kagitlar : modulYigini(mid, adet).kagitlar, opaklik: soluk[mid] };
    }
    return g;
  });
  if (m) {
    etiketler.push(...m.etiketler);
    metinler.push(...m.metinler);
  }

  const kunyeKare = kare(DONUS.kunye);
  return {
    kamera: { s: kameraS(f), ox: kameraOx(f), oy: kameraOy(f), don: tablaAcisi(f) },
    itme: f < K9 ? a.kamera : yukDonusItmesi(f),
    odak: ODAK,
    sarsinti: a.sarsinti,
    kayma: f * 0.4,
    isik: f < K9 ? a.isik : acilisDurumu(K9).isik + 0.1 * Math.sin((2 * Math.PI * (f - K9)) / 750),
    blok: { z: a.blokZ, aci: a.blokAci, yuz: a.yuz, opaklik: soluk.blok },
    yuva: a.yuva,
    kagitlar,
    etiketler,
    metinler,
    cipler,
    kartlar: m?.kartlar ?? [],
    kilitler: m?.kilitler ?? [],
    damga: m?.damga ?? null,
    kunye: ara(f, kunyeKare - 10, kunyeKare),
  };
};
