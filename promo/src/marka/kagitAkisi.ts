import { Easing } from "remotion";
import { dikdortgenTaban, type V2, type V3 } from "./izometri.ts";
import { yigin, type Kagit } from "./nesneler.ts";
import { DONUS, YUK, type YiginId } from "./olaylar.ts";
import { RENK } from "./tema.ts";
import { kare } from "./zaman.ts";

// Yük ve Dönüş'ün kâğıtları. Yük: desteler vuruşunda yığınlara iner. Dönüş: kâğıtlar iki modül yığınına uçar.
// Saf: kare → çizilecek kâğıt grupları (her grup derinlik sıralamasında tek öğe). Yığınlar önek-kararlıdır:
// aynı tohumla fazla kâğıt üretmek alttakileri kıpırdatmaz, bu yüzden her kare yığın baştan üretilir.

export const KAGIT_T = 0.1;
const KAGIT_W = 1.25;
const KAGIT_D = 0.9;

/** Yük yığınlarının dünya yeri (Yük boyunca tabla dönmez). S4 önde: büyüyünce bloğu örter. */
export const YIGIN_YERI: Record<YiginId, V2> = { S1: [-1.45, -1.45], S2: [1.35, -1.35], S3: [-1.35, 1.35], S4: [1.1, 1.1] };
const TOHUM: Record<YiginId, number> = { S1: 3, S2: 5, S3: 7, S4: 9 };
/** Deste bu kadar karede, yığının DUSUS_Z birim üstünden ivmeyle düşer; tam vuruşta iner. */
export const DUSUS_KARE = 9;
export const DUSUS_Z = 3;

export type ModulId = "studio" | "atolye";
/** Modül yığınlarının dünya yeri: tabla −180°'de Studio, −270°'de Atölye ekranda sol-orta odağa gelir. */
export const MODUL_YERI: Record<ModulId, V2> = { studio: [1.2, -1.25], atolye: [1.25, 1.2] };
export const MODUL_ADET = 8;
const MODUL_KAYNAK: Record<ModulId, [YiginId, YiginId]> = { studio: ["S3", "S1"], atolye: ["S4", "S2"] };
export const MODUL_SEKME: Record<ModulId, string> = { studio: RENK.studio, atolye: RENK.atolye };
export const MODUL_TOHUM: Record<ModulId, number> = { studio: 21, atolye: 23 };
/** Bir kâğıdın uçuşu; kalkışlar Dönüş'ün 2. karesinden son yerleşme vuruşuna UCUS_KARE kala biter. */
export const UCUS_KARE = 14;

/** f karesine kadar yığına inmiş kâğıt sayısı. */
export const inmisAdet = (id: YiginId, f: number) =>
  YUK.desteler.filter((d) => d.yigin === id && kare(d.vurus) <= f).reduce((s, d) => s + d.adet, 0);

const yukYigini = (id: YiginId, adet: number) => yigin({ cx: YIGIN_YERI[id][0], cy: YIGIN_YERI[id][1], adet, tohum: TOHUM[id], t: KAGIT_T });

/** Modül yığını (Dönüş sonrasında da kullanılır): hizalı, üst kâğıtta modül sekmesi. */
export const modulYigini = (m: ModulId, adet: number) =>
  yigin({ cx: MODUL_YERI[m][0], cy: MODUL_YERI[m][1], adet, tohum: MODUL_TOHUM[m], sapma: 0.02, sekme: MODUL_SEKME[m], t: KAGIT_T });

type Kalkis = { id: YiginId; indeks: number; kare: number };

/** Kaynak kâğıtların kalkış sırası: iki kaynak yığının tepesinden dönüşümlü; kareler eşit aralıkla yayılır. */
const kalkislar = (m: ModulId): Kalkis[] => {
  const yukSonu = kare(YUK.desteler[YUK.desteler.length - 1].vurus);
  const kuyruk = (id: YiginId) => {
    const n = inmisAdet(id, yukSonu);
    return Array.from({ length: n }, (_, i) => n - 1 - i);
  };
  const [a, b] = MODUL_KAYNAK[m];
  const qa = kuyruk(a);
  const qb = kuyruk(b);
  const sira: { id: YiginId; indeks: number }[] = [];
  while (qa.length || qb.length) {
    if (qa.length) sira.push({ id: a, indeks: qa.shift()! });
    if (qb.length) sira.push({ id: b, indeks: qb.shift()! });
  }
  const bas = kare(DONUS.tabla) + 2;
  const bit = kare(DONUS.yerlesme[DONUS.yerlesme.length - 1]) - UCUS_KARE;
  const n = sira.length;
  return sira.map((s, j) => ({ ...s, kare: bas + (n === 1 ? 0 : (j * (bit - bas)) / (n - 1)) }));
};
const KALKIS: Record<ModulId, Kalkis[]> = { studio: kalkislar("studio"), atolye: kalkislar("atolye") };

const merkezVeAci = (k: Kagit): { c: V2; aci: number } => {
  const [c0, c1, c2] = k.taban;
  return { c: [(c0[0] + c2[0]) / 2, (c0[1] + c2[1]) / 2], aci: Math.atan2(c1[1] - c0[1], c1[0] - c0[0]) };
};

export type KagitGrubu = { p: V3; kagitlar: Kagit[] };

/** f karesinde çizilecek kâğıt grupları: Yük yığınları (+ düşen deste), modül yığınları, uçan kâğıtlar. */
export const kagitSahnesi = (f: number): KagitGrubu[] => {
  const gruplar: KagitGrubu[] = [];
  const kalkan = new Map<YiginId, number>();
  for (const m of ["studio", "atolye"] as const) {
    for (const k of KALKIS[m]) if (k.kare <= f) kalkan.set(k.id, (kalkan.get(k.id) ?? 0) + 1);
  }

  for (const id of ["S1", "S2", "S3", "S4"] as const) {
    const inen = inmisAdet(id, f);
    const kalan = inen - (kalkan.get(id) ?? 0);
    const kagitlar: Kagit[] = kalan > 0 ? yukYigini(id, kalan).kagitlar : [];
    const dusen = YUK.desteler.find((d) => d.yigin === id && f > kare(d.vurus) - DUSUS_KARE && f < kare(d.vurus));
    if (dusen) {
      const u = (f - (kare(dusen.vurus) - DUSUS_KARE)) / DUSUS_KARE;
      const dz = DUSUS_Z * (1 - u * u);
      kagitlar.push(...yukYigini(id, inen + dusen.adet).kagitlar.slice(inen).map((k) => ({ ...k, z0: k.z0 + dz })));
    }
    if (kagitlar.length) gruplar.push({ p: [YIGIN_YERI[id][0], YIGIN_YERI[id][1], 0], kagitlar });
  }

  for (const m of ["studio", "atolye"] as const) {
    const liste = KALKIS[m];
    const varan = liste.filter((k) => k.kare + UCUS_KARE <= f).length;
    const adet = Math.ceil((MODUL_ADET * varan) / liste.length);
    const [mx, my] = MODUL_YERI[m];
    if (adet > 0) gruplar.push({ p: [mx, my, 0], kagitlar: modulYigini(m, adet).kagitlar });
    for (const k of liste) {
      if (f < k.kare || f >= k.kare + UCUS_KARE) continue;
      const u = (f - k.kare) / UCUS_KARE;
      const e = Easing.inOut(Easing.cubic)(u);
      const kaynak = yukYigini(k.id, k.indeks + 1).kagitlar[k.indeks];
      const { c, aci } = merkezVeAci(kaynak);
      const hedefZ = adet * KAGIT_T;
      const cx = c[0] + (mx - c[0]) * e;
      const cy = c[1] + (my - c[1]) * e;
      const z = kaynak.z0 + (hedefZ - kaynak.z0) * e + 1.2 * Math.sin(Math.PI * u);
      gruplar.push({
        p: [cx, cy, z],
        kagitlar: [{ taban: dikdortgenTaban(cx, cy, KAGIT_W, KAGIT_D, aci * (1 - e)), z0: z, h: KAGIT_T, ust: false, sekme: null }],
      });
    }
  }
  return gruplar;
};
