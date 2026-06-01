import { z } from "zod";
import { ogrenciProfiliSchema } from "./ogrenci-profili";

/* Sosyal Öykü & Duygu-Düzenleme Senaryosu — form alanları. Profil omurgasını genişletir. */

export const BAKIS_ACISI_KEYS = ["birinci_kisi", "ucuncu_kisi"] as const;

export const sosyalOykuInputSchema = ogrenciProfiliSchema.extend({
  durum: z.string().trim().min(1, "Durum/senaryo gerekli").max(300),
  bakisAcisi: z.enum(BAKIS_ACISI_KEYS).default("birinci_kisi"),
  hedefBeceri: z.string().trim().max(200).optional(),
});

export type SosyalOykuInput = z.infer<typeof sosyalOykuInputSchema>;
