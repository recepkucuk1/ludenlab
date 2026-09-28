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
/** Deste bu kadar karede, yığının DUSUS_Z birim üstünden (kadraj dışından) ivmeyle düşer; tam vuruşta iner. */
export const DUSUS_KARE = 12;
export const DUSUS_Z = 7;

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

/** Modül yığınının, varan kâğıt indiğinde sahip olacağı yükseklik: ilk iniş 1, son iniş tam MODUL_ADET. */
const modulAdedi = (varan: number, n: number) =>
  varan === 0 ? 0 : n <= 1 ? MODUL_ADET : 1 + Math.floor(((MODUL_ADET - 1) * (varan - 1)) / (n - 1));

const merkezVeAci = (k: Kagit): { c: V2; aci: number } => {
  const [c0, c1, c2] = k.taban;
  return { c: [(c0[0] + c2[0]) / 2, (c0[1] + c2[1]) / 2], aci: Math.atan2(c1[1] - c0[1], c1[0] - c0[0]) };
};

/** Bir uçuş: kaynak duruşu (merkez, açı, z0) ve iniş yüksekliği yükleme anında bir kez hesaplanır. */
type Kalkis = { id: YiginId; indeks: number; kare: number; c: V2; aci: number; z0: number; hedefZ: number };

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
  // Atölye'nin kaynakları (S4, S2) modül yerlerinde duruyor (Atölye S4'ün, Studio S2'nin 0.18 yanında); ilk inişten
  // önce hepsi kalkar, yığınlar iç içe geçmez. Bu, Dönüş'ün enerji patlaması: ilk anda yığınlar birden boşalır.
  const bit = m === "atolye" ? bas + UCUS_KARE - 1 : kare(DONUS.yerlesme[DONUS.yerlesme.length - 1]) - UCUS_KARE;
  const n = sira.length;
  return sira.map((s, j) => {
    const kaynak = yukYigini(s.id, s.indeks + 1).kagitlar[s.indeks];
    const { c, aci } = merkezVeAci(kaynak);
    // Kâğıt, iniş sonrası yığının en üst kâğıdı olacağı yere iner: alt yüzü (yeni yükseklik − 1 kâğıt).
    return { ...s, kare: bas + (n === 1 ? 0 : (j * (bit - bas)) / (n - 1)), c, aci, z0: kaynak.z0, hedefZ: (modulAdedi(j + 1, n) - 1) * KAGIT_T };
  });
};
const KALKIS: Record<ModulId, Kalkis[]> = { studio: kalkislar("studio"), atolye: kalkislar("atolye") };

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
    const adet = modulAdedi(varan, liste.length);
    const [mx, my] = MODUL_YERI[m];
    if (adet > 0) gruplar.push({ p: [mx, my, 0], kagitlar: modulYigini(m, adet).kagitlar });
    for (const k of liste) {
      if (f < k.kare || f >= k.kare + UCUS_KARE) continue;
      // Son çizilen kare (ceil(kare + UCUS_KARE) − 1) tam hedefte biter; sonraki karede kâğıt yığının parçası olur.
      const son = Math.ceil(k.kare + UCUS_KARE) - 1;
      const u = Math.min(1, (f - k.kare) / Math.max(1, son - k.kare));
      const e = Easing.inOut(Easing.cubic)(u);
      const cx = k.c[0] + (mx - k.c[0]) * e;
      const cy = k.c[1] + (my - k.c[1]) * e;
      const z = k.z0 + (k.hedefZ - k.z0) * e + 1.2 * Math.sin(Math.PI * u);
      gruplar.push({
        p: [cx, cy, z],
        kagitlar: [{ taban: dikdortgenTaban(cx, cy, KAGIT_W, KAGIT_D, k.aci * (1 - e)), z0: z, h: KAGIT_T, ust: true, sekme: null }],
      });
    }
  }
  return gruplar;
};
