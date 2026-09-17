import type { Kademe } from "./bep";
import type { GuclukDuzeyi, Tani } from "./ogrenci-profili";

/** Öğrenci ekleme/düzenleme formunun durumu (metin alanları boş string tutar). */
export interface StudentFormState {
  code: string; // Ad Soyad
  kademe: Kademe;
  yas: string;
  taniProfili: Tani[];
  guclukDuzeyi: GuclukDuzeyi;
  gucluYonler: string;
  ilgiAlanlari: string;
  notes: string;
  mebBolumler: string[];
}

/**
 * Form durumu → PATCH/POST gövdesi.
 *
 * Boşaltılan alan `undefined` ile gövdeden düşüyordu; sunucu yalnız gelen alanları
 * güncellediği için "Öğrenci güncellendi" deniyor ama eski metin kalıyordu. Artık boş alan
 * `null` gider ve sunucu onu temizler (2026-09-17 denetimi).
 */
export function studentFormPayload(f: StudentFormState) {
  const metin = (v: string) => (v.trim() === "" ? null : v.trim());
  return {
    code: f.code.trim(),
    kademe: f.kademe,
    yas: f.yas.trim() === "" ? null : Number(f.yas),
    taniProfili: f.taniProfili,
    guclukDuzeyi: f.guclukDuzeyi,
    gucluYonler: metin(f.gucluYonler),
    ilgiAlanlari: metin(f.ilgiAlanlari),
    notes: metin(f.notes),
    mebBolumler: f.mebBolumler,
  };
}
