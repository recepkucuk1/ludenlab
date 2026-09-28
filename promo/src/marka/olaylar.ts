// Vuruş olayları: görüntü (acilisDurumu.ts, filmDurumu.ts) ve efekt izi (scripts/lib/sfx.ts) aynı sayıları okur.

export type SesTuru = "whoosh" | "tok" | "tik" | "kagit" | "donus";
/** vurus: 1'den sayılır; vurusSure: whoosh ve dönüş gibi süreli seslerin vuruş cinsinden uzunluğu. */
export type SesOlayi = { vurus: number; tur: SesTuru; vurusSure?: number };

/** Kanca (v1–8) görüntü vuruşları (spec "0 · Kanca"). */
export const KANCA = {
  /** Blok düşmeye başlar. */
  dusus: 1,
  /** Blok yuvasına tok oturur. */
  inis: 3,
  /** Başlık satırlarının açıldığı vuruşlar ("HER ÇOCUK", "AYRI."). */
  baslik: [1, 3],
  /** Üst cümle ("Özel eğitimde"). */
  ustCumle: 5,
  /** Etiket çizgilerinin raptiyeye vardığı vuruşlar (HEDEFLER sırasıyla). */
  etiketler: [5, 6, 7],
} as const;

export type YiginId = "S1" | "S2" | "S3" | "S4";
/** Bir deste: vuruşunda yığınına iner; etiketliyse o vuruşta adı görünür. */
export type Deste = { vurus: number; yigin: YiginId; adet: number; etiket?: string };

/** Yük (v9–24, spec "1 · Yük"): her vuruşta bir deste; desteler büyür, ön yığın (S4) v22'de bloğu örter. */
export const YUK: { baslik: number; altCumle: number; desteler: readonly Deste[] } = {
  baslik: 9,
  altCumle: 19,
  desteler: [
    { vurus: 9, yigin: "S3", adet: 2, etiket: "seans planı" },
    { vurus: 10, yigin: "S1", adet: 2 },
    { vurus: 11, yigin: "S2", adet: 3, etiket: "BEP" },
    { vurus: 12, yigin: "S4", adet: 3 },
    { vurus: 13, yigin: "S3", adet: 3, etiket: "çalışma kâğıdı" },
    { vurus: 14, yigin: "S1", adet: 4 },
    { vurus: 15, yigin: "S2", adet: 4, etiket: "veli mektubu" },
    { vurus: 16, yigin: "S4", adet: 4 },
    { vurus: 17, yigin: "S3", adet: 5, etiket: "hedef takibi" },
    { vurus: 18, yigin: "S1", adet: 5 },
    { vurus: 19, yigin: "S2", adet: 5, etiket: "ev ödevi" },
    { vurus: 20, yigin: "S4", adet: 6 },
    { vurus: 21, yigin: "S3", adet: 4, etiket: "rapor" },
    { vurus: 22, yigin: "S4", adet: 8 },
  ],
};

/** Dönüş (v25–32, spec "2 · Dönüş"). */
export const DONUS = {
  /** Tabla −90° döner, kamera nefes alır, kâğıtlar kalkar. */
  tabla: 25,
  /** "Bu yükü tek başına…" satır satır. */
  cumle: 26,
  /** Kâğıtlar modül yığınlarına oturdukça tık. */
  yerlesme: [26, 27, 28],
  /** Künye (logo + adres) gelir. */
  kunye: 29,
  /** "01 Studio", "02 Atölye" çipleri. */
  cipler: [29, 30],
} as const;

const olaylar: SesOlayi[] = [
  { vurus: KANCA.dusus, tur: "whoosh", vurusSure: KANCA.inis - KANCA.dusus },
  { vurus: KANCA.inis, tur: "tok" },
  ...KANCA.etiketler.map((vurus): SesOlayi => ({ vurus, tur: "tik" })),
  ...YUK.desteler.map((d): SesOlayi => ({ vurus: d.vurus, tur: "kagit" })),
  { vurus: DONUS.tabla, tur: "donus", vurusSure: 2 },
  ...DONUS.yerlesme.map((vurus): SesOlayi => ({ vurus, tur: "tik" })),
  { vurus: DONUS.kunye, tur: "tik" },
];

/** 16:9 ses olayları, vuruş sırasıyla (kararlı sıralama: aynı vuruştakiler listedeki sırayı korur). */
export const SESLER_169: SesOlayi[] = [...olaylar].sort((a, b) => a.vurus - b.vurus);
