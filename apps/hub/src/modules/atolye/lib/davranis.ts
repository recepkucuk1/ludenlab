import { z } from "zod";
import { ogrenciProfiliSchema } from "./ogrenci-profili";
import { mebHedefFields } from "./meb-hedef";

/* DEHB Davranış Destek Planı — form alanları. Profil omurgasını genişletir. */

export const ORTAM_KEYS = ["sinif", "ev", "seans", "genel"] as const;

export const davranisInputSchema = ogrenciProfiliSchema.extend({
  hedefDavranis: z.string().trim().min(1, "Hedef davranış gerekli").max(400),
  ortam: z.enum(ORTAM_KEYS).default("sinif"),
  siklikSure: z.string().trim().max(200).optional(),
  ...mebHedefFields,
});

export type DavranisInput = z.infer<typeof davranisInputSchema>;

/** Pekiştirme bölümünün sonuna aynen basılan not (Faz 0): bu araç DİL KURALI'nın ödül maddesinin tek
    istisnasıdır; istisnanın koşulu sönümlenmedir. Client + server güvenli (eval kontrolü de okur). */
export const PEKISTIRME_NOTU =
  "Not: Pekiştirme bu planda geçici bir köprüdür; sönümlenme basamakları uygulanmadan plan tamamlanmış sayılmaz.";
