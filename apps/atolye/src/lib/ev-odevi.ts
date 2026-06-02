import { z } from "zod";
import { ogrenciProfiliSchema } from "./ogrenci-profili";
import { mebHedefFields } from "./meb-hedef";

/* Ev Ödevi Aracı (ÖÖG) — form alanları. Profil omurgasını genişletir. */

export const evOdeviInputSchema = ogrenciProfiliSchema.extend({
  hedefKonu: z.string().trim().min(3).max(300),
  gunSayisi: z.number().int().min(1).max(7).default(3),
  ekstraNot: z.string().trim().max(500).optional(),
  ...mebHedefFields,
});

export type EvOdeviInput = z.infer<typeof evOdeviInputSchema>;
