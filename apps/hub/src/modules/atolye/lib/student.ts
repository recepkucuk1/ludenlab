import { z } from "zod";
import { KADEME_KEYS } from "./bep";
import { GUCLUK_DUZEYI_KEYS, TANI_KEYS } from "./ogrenci-profili";

/* Öğrenci kaydı (roster) zod şeması — create (POST) + patch (PATCH) paylaşır.
   PII alanları (displayName/okul/veliIletisim) yalnız roster içindir; AI'a gitmez. */

/** Alan sınırları tek yerde — form da aynı sınırı uygular (sunucu reddetmesin). */
export const STUDENT_SINIR = {
  code: 120,
  gucluYonler: 500,
  ilgiAlanlari: 300,
  okul: 120,
  veliIletisim: 200,
  notes: 4000,
  mebBolum: 10,
} as const;

/** Boşaltılabilir alanlar null kabul eder: istemci boş alanı null gönderip temizler. */
const yas = z.coerce.number().int().min(3).max(22).nullish();
const metin = (max: number) => z.string().trim().max(max).nullish();

export const studentSchema = z.object({
  code: z.string().trim().min(1, "Ad Soyad gerekli").max(STUDENT_SINIR.code),
  kademe: z.enum(KADEME_KEYS),
  yas,
  taniProfili: z.array(z.enum(TANI_KEYS)).optional(),
  guclukDuzeyi: z.enum(GUCLUK_DUZEYI_KEYS).optional(),
  gucluYonler: metin(STUDENT_SINIR.gucluYonler),
  ilgiAlanlari: metin(STUDENT_SINIR.ilgiAlanlari),
  okul: metin(STUDENT_SINIR.okul),
  veliIletisim: metin(STUDENT_SINIR.veliIletisim),
  notes: metin(STUDENT_SINIR.notes),
  /** Çalışılan MEB bölüm kodları (ör. "3.1","5.2"); modül koddan türetilir. */
  mebBolumler: z.array(z.string().trim().max(STUDENT_SINIR.mebBolum)).optional().default([]),
});

/**
 * Kısmi güncelleme. `mebBolumler` BURADA varsayılansız yeniden tanımlanır: `partial()` iç
 * varsayılanı koruduğu için, yalnız ad ya da yalnız not gönderen istek sunucuya
 * `mebBolumler: []` olarak ulaşıyor ve öğrencinin çalışılan MEB modüllerini siliyordu
 * (2026-09-17 denetimi; `student.test.ts` bunu kilitler).
 */
export const studentPatchSchema = studentSchema.partial().extend({
  mebBolumler: z.array(z.string().trim().max(STUDENT_SINIR.mebBolum)).optional(),
});

export type StudentFormInput = z.infer<typeof studentSchema>;
