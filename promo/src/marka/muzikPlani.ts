import type { Bolum, BolumId } from "./zaman.ts";

// Marka filmi müzik düzenlemesi (spec: Ses). Düzen bölüm başınadır: akor her bölümün ilk vuruşundan
// sayılarak 4 vuruşta bir değişir, bölüm 4'ün katı değilse son akor kısa kalır. Böylece aynı düzen
// ölçüye oturmayan 9:16 bölüm başlarına da hizmet eder. Bölüm, öncekinin son akoruyla başlamaz (akorSegmentleri).
// Sentez scripts/lib/muzik.ts'te.

export type AkorAdi = "C" | "G" | "Am" | "F";

/** Akor tonları (MIDI): kök, üçlü, beşli, oktav — C4 çevresinde (pad bu sesleri çalar). */
export const AKOR_TONLARI: Record<AkorAdi, readonly number[]> = {
  C: [60, 64, 67, 72],
  G: [55, 59, 62, 67],
  Am: [57, 60, 64, 69],
  F: [53, 57, 60, 65],
};

/** Arpej desenleri: akor tonu sırası (0 kök … 3 oktav). */
export const ARPEJ = [0, 1, 2, 3, 2, 1, 2, 3] as const;
/** Atölye çeşitlemesi: Alberti benzeri kök–beşli–üçlü–beşli. */
export const ARPEJ_ATOLYE = [0, 2, 1, 2, 3, 2, 1, 2] as const;

export type Katmanlar = {
  /** atak sn (varsayılan 0,6); parlak: üst kısmi seslerin payı. */
  pad: { ses: number; atak?: number; parlak?: number };
  /** oktav: akor tonlarının 1 oktav üstüne (+1) ek kayma; ikinciYari: bölümün ikinci yarısında girer. */
  marimba?: { ritim: "dortluk" | "sekizlik" | "tek-1-3"; desen: readonly number[]; ses: number; oktav?: number; ikinciYari?: boolean };
  /** sonum: bas notasının sönüm çarpanı (varsayılan 1; küçük = uzun, bağlı çalar → 2. ve 4. vuruş boş kalmaz). */
  bas?: { ritim: "kok-besli" | "sekizlik" | "ilk"; ses: number; sonum?: number };
  kick?: { ritim: "1-3" | "her-vurus"; ses: number };
  shaker?: { ses: number };
  /** Her akorun ilk vuruşunda yumuşak çan (kökün iki oktav üstü). */
  zil?: { ses: number };
  /** Bölüt boyunca pad ve marimba yükselir (kapanış G'si). */
  crescendo?: boolean;
};

export type BolumDuzeni = {
  akorlar: readonly AkorAdi[];
  /** Bölüt indeksine göre katmanlar; son eleman sonraki bölütlerde sürer. */
  katmanlar: readonly Katmanlar[];
  /** Kurulum: kısa bölüm kurulumun son basamaklarını çalar (hep zirvede biter). */
  insa?: boolean;
  /** Bölümün son vuruşu yalnız pad (+ bir sonraki akora ters şişen pad). */
  nefes?: boolean;
};

/**
 * Studio/Atölye groove'u. Bas bağlı çalar (sönüm 0,2) ve kick hafiftir: 1./3. vuruşlar 2./4.'den önceki 3,7–4,0 dB yerine
 * ~1,7–1,9 dB yüksek kalır (nabız var, pompa yok).
 */
const ORTA_GROOVE: Katmanlar = {
  pad: { ses: 0.07 },
  marimba: { ritim: "sekizlik", desen: ARPEJ, ses: 0.13 },
  bas: { ritim: "kok-besli", ses: 0.1, sonum: 0.2 },
  kick: { ritim: "1-3", ses: 0.09 },
  shaker: { ses: 0.045 },
};

/** Yük basamağı: her bölüt bir katman ekler ve bir tık yükselir (kazanç ≈ +1 dB/bölüt). */
const yukBasamagi = (g: number, ek: Partial<Katmanlar> = {}): Katmanlar => ({
  pad: { ses: 0.05 * g },
  marimba: { ritim: "sekizlik", desen: ARPEJ, ses: 0.11 * g },
  bas: { ritim: "kok-besli", ses: 0.11 * g },
  ...ek,
});

/** Spec: "Yük'te yoğunluk artar, v24'te pad'e iner, Dönüş'te geri açılır, Çocuk'ta seyrelir, v93'te son akor". */
export const DUZEN: Record<BolumId, BolumDuzeni> = {
  kanca: {
    akorlar: ["Am", "F"],
    katmanlar: [{ pad: { ses: 0.05, atak: 0.3 }, marimba: { ritim: "dortluk", desen: [0, 1, 2, 3], ses: 0.12, ikinciYari: true } }],
  },
  yuk: {
    akorlar: ["Am", "F", "C", "G"],
    insa: true,
    nefes: true,
    katmanlar: [
      yukBasamagi(1),
      yukBasamagi(1.12, { kick: { ritim: "1-3", ses: 0.14 } }),
      yukBasamagi(1.25, { kick: { ritim: "1-3", ses: 0.15 }, shaker: { ses: 0.045 } }),
      yukBasamagi(1.38, {
        marimba: { ritim: "sekizlik", desen: ARPEJ, ses: 0.14, oktav: 1 },
        kick: { ritim: "her-vurus", ses: 0.17 },
        shaker: { ses: 0.05 },
      }),
    ],
  },
  donus: {
    akorlar: ["C", "G"],
    katmanlar: [
      {
        pad: { ses: 0.085, parlak: 0.3 },
        marimba: { ritim: "sekizlik", desen: ARPEJ, ses: 0.15, oktav: 1 },
        bas: { ritim: "sekizlik", ses: 0.21 },
        kick: { ritim: "her-vurus", ses: 0.21 },
        shaker: { ses: 0.055 },
      },
    ],
  },
  studio: { akorlar: ["C", "G", "Am", "F"], katmanlar: [ORTA_GROOVE] },
  atolye: {
    // G'den başlar: Studio C'de biter (v49–52), Atölye'nin ilk vuruşunda (tabla dönüşü) akor değişsin diye.
    akorlar: ["G", "Am", "F", "C"],
    katmanlar: [{ ...ORTA_GROOVE, marimba: { ritim: "sekizlik", desen: ARPEJ_ATOLYE, ses: 0.13 }, zil: { ses: 0.05 } }],
  },
  cocuk: {
    akorlar: ["F", "C", "Am", "F"],
    katmanlar: [{ pad: { ses: 0.06 }, marimba: { ritim: "tek-1-3", desen: [2, 1], ses: 0.12 }, bas: { ritim: "ilk", ses: 0.11 } }],
  },
  kapanis: {
    akorlar: ["G"],
    katmanlar: [{ pad: { ses: 0.08 }, marimba: { ritim: "sekizlik", desen: ARPEJ, ses: 0.14 }, crescendo: true }],
  },
};

/** Son akor: alçak C bas, C4–E4–G4 pad, 80 ms arayla C5–E5–G5–C6 marimba rulosu; sona dek çınlar. */
export const SON_AKOR = {
  akor: "C" as AkorAdi,
  bas: 36,
  basSes: 0.13,
  pad: [60, 64, 67],
  padSes: 0.08,
  rulo: [72, 76, 79, 84],
  ruloAraSn: 0.08,
  ruloSes: 0.085,
};

/** Karışım: giriş/çıkış süreleri, tepe seviyesi, nefes şişmesi. */
export const MIKS = { girisSn: 0.3, cikisSn: 1.0, tepeDbfs: -3, nefesSes: 0.1 };

export type AkorSegmenti = { bolum: BolumId; indeks: number; akor: AkorAdi; ilk: number; son: number; kapanisAkoru: boolean };

/**
 * Bölümleri akor bölütlerine ayırır. Kapanışta `sonAkorVurusu`ndan (varsayılan kapanış.ilk + 4) önceki
 * vuruşlar G bölütleri, sonrası tek son akor bölütüdür.
 */
export function akorSegmentleri(bolumler: Bolum[], sonAkorVurusu?: number): AkorSegmenti[] {
  const cikti: AkorSegmenti[] = [];
  for (const b of bolumler) {
    const duzen = DUZEN[b.id];
    const kapanis = b.id === "kapanis";
    const sonIlk = kapanis ? (sonAkorVurusu ?? b.ilk + 4) : b.son + 1;
    if (kapanis && (sonIlk < b.ilk || sonIlk > b.son)) {
      throw new RangeError(`son akor vuruşu ${sonIlk} kapanış (${b.ilk}–${b.son}) dışında`);
    }
    // Bölüm sınırında akor hep değişir: bölümün ilk akoru öncekinin son akoruysa liste bir akor kaydırılır
    // (9:16'da Studio v25–28 G'de biter, Atölye Am'den başlar; Çocuk da F yerine C'den). 16:9'da eşleşme yok.
    const kayma = cikti.length > 0 && cikti[cikti.length - 1].akor === duzen.akorlar[0] ? 1 : 0;
    let indeks = 0;
    for (let v = b.ilk; v < sonIlk; v += 4, indeks++) {
      const akor = duzen.akorlar[(indeks + kayma) % duzen.akorlar.length];
      cikti.push({ bolum: b.id, indeks, akor, ilk: v, son: Math.min(v + 3, sonIlk - 1), kapanisAkoru: false });
    }
    if (kapanis) cikti.push({ bolum: b.id, indeks, akor: SON_AKOR.akor, ilk: sonIlk, son: b.son, kapanisAkoru: true });
  }
  return cikti;
}

/** Vuruşun düştüğü akor bölütü. */
export const vurustakiAkor = (bolumler: Bolum[], vurus: number, sonAkorVurusu?: number) =>
  akorSegmentleri(bolumler, sonAkorVurusu).find((s) => s.ilk <= vurus && vurus <= s.son);

/** Bölütün katman indeksi; `insa` bölümünde n bölüt kurulumun son n basamağını çalar. */
export function katmanSec(bolum: BolumId, indeks: number, bolutSayisi: number): number {
  const d = DUZEN[bolum];
  const ofset = d.insa ? Math.max(0, d.katmanlar.length - bolutSayisi) : 0;
  return Math.min(d.katmanlar.length - 1, indeks + ofset);
}
