// Vuruş olayları: görüntü (acilisDurumu.ts) ve efekt izi (scripts/lib/sfx.ts) aynı sayıları okur.
// Plan 3 bu listeyi filmin tamamına genişletir.

export type SesTuru = "whoosh" | "tok" | "tik";
/** vurus: 1'den sayılır; vurusSure: whoosh gibi süreli seslerin vuruş cinsinden uzunluğu. */
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

/** 16:9 ses olayları. */
export const SESLER_169: SesOlayi[] = [
  { vurus: KANCA.dusus, tur: "whoosh", vurusSure: KANCA.inis - KANCA.dusus },
  { vurus: KANCA.inis, tur: "tok" },
  ...KANCA.etiketler.map((vurus): SesOlayi => ({ vurus, tur: "tik" })),
];
