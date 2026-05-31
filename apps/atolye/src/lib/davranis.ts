import { z } from "zod";
import { ogrenciProfiliSchema } from "./ogrenci-profili";

/* DEHB Davranış Destek Planı — form alanları. Profil omurgasını genişletir. */

export const ORTAM_KEYS = ["sinif", "ev", "seans", "genel"] as const;

export const davranisInputSchema = ogrenciProfiliSchema.extend({
  hedefDavranis: z.string().trim().min(1, "Hedef davranış gerekli").max(400),
  ortam: z.enum(ORTAM_KEYS).default("sinif"),
  siklikSure: z.string().trim().max(200).optional(),
});

export type DavranisInput = z.infer<typeof davranisInputSchema>;
