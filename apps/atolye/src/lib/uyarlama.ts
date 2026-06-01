import { z } from "zod";
import { ogrenciProfiliSchema } from "./ogrenci-profili";

/* Bireysel Uyarlama (Accommodation) Önericisi — form alanları. Profil omurgasını genişletir. */

export const UYARLAMA_ORTAM_KEYS = [
  "kaynastirma",
  "ozel_egitim_sinifi",
  "destek_egitim_odasi",
  "ev",
] as const;

export const uyarlamaInputSchema = ogrenciProfiliSchema.extend({
  ders: z.string().trim().max(120).optional(),
  ortam: z.enum(UYARLAMA_ORTAM_KEYS).default("kaynastirma"),
});

export type UyarlamaInput = z.infer<typeof uyarlamaInputSchema>;
