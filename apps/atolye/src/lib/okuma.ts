import { z } from "zod";
import { ogrenciProfiliSchema } from "./ogrenci-profili";

/* Disleksi Okuma-Akıcılık Seti — form alanları. Profil omurgasını genişletir. */

export const OKUMA_DUZEY_KEYS = ["hece", "kelime", "cumle", "paragraf"] as const;

export const okumaInputSchema = ogrenciProfiliSchema.extend({
  okumaDuzeyi: z.enum(OKUMA_DUZEY_KEYS).default("kelime"),
  hedefAkicilik: z.string().trim().max(120).optional(),
  takilanDesenler: z.string().trim().max(300).optional(),
});

export type OkumaInput = z.infer<typeof okumaInputSchema>;
