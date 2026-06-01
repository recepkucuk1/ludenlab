import { z } from "zod";
import { ogrenciProfiliSchema } from "./ogrenci-profili";

/* Diskalkuli Sayı & Matematik Destek Seti — form alanları. Profil omurgasını genişletir. */

export const MAT_ALAN_KEYS = [
  "sayi_hissi",
  "sayi_buyukluk",
  "islem_akiciligi",
  "problem_cozme",
] as const;
export const SOMUTLUK_KEYS = ["somut", "yari_somut", "soyut"] as const;

export const matematikInputSchema = ogrenciProfiliSchema.extend({
  alanProfili: z.enum(MAT_ALAN_KEYS).default("sayi_hissi"),
  kazanimKonu: z.string().trim().min(1, "Kazanım/konu gerekli").max(200),
  somutlukDuzeyi: z.enum(SOMUTLUK_KEYS).default("somut"),
});

export type MatematikInput = z.infer<typeof matematikInputSchema>;
