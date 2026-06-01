import { z } from "zod";
import { KADEME_KEYS } from "./bep";
import { GUCLUK_DUZEYI_KEYS, TANI_KEYS } from "./ogrenci-profili";

/* Öğrenci kaydı (roster) zod şeması — create (POST) + patch (PATCH) paylaşır.
   PII alanları (displayName/okul/veliIletisim) yalnız roster içindir; AI'a gitmez. */

export const studentSchema = z.object({
  code: z.string().trim().min(1, "Ad Soyad gerekli").max(120),
  kademe: z.enum(KADEME_KEYS),
  yas: z.coerce.number().int().min(3).max(22).optional(),
  taniProfili: z.array(z.enum(TANI_KEYS)).optional(),
  guclukDuzeyi: z.enum(GUCLUK_DUZEYI_KEYS).optional(),
  gucluYonler: z.string().trim().max(500).optional(),
  ilgiAlanlari: z.string().trim().max(300).optional(),
  okul: z.string().trim().max(120).optional(),
  veliIletisim: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export const studentPatchSchema = studentSchema.partial();

export type StudentFormInput = z.infer<typeof studentSchema>;
