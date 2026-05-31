import { z } from "zod";
import { ogrenciProfiliSchema } from "./ogrenci-profili";

/* Çok Duyulu Materyal & Çalışma Yaprağı Üreteci — form alanları.
   Öğrenci profili omurgasını genişletir. */

export const MATERYAL_TUR_KEYS = ["calisma_yapragi", "etkinlik", "okuma_metni", "alistirma"] as const;
export const ZORLUK_VARYANT_KEYS = ["tek", "kolay_orta", "kolay_orta_ileri"] as const;

export const materyalInputSchema = ogrenciProfiliSchema.extend({
  materyalTuru: z.enum(MATERYAL_TUR_KEYS).default("calisma_yapragi"),
  konu: z.string().trim().min(1, "Konu/beceri gerekli").max(200),
  zorlukVaryanti: z.enum(ZORLUK_VARYANT_KEYS).default("kolay_orta"),
  cevapAnahtari: z.boolean().default(true),
});

export type MateryalInput = z.infer<typeof materyalInputSchema>;
