import { z } from "zod";
import { ogrenciProfiliSchema } from "./ogrenci-profili";
import { mebHedefFields } from "./meb-hedef";

/* Veli / Ev Destek Mektubu — form alanları. Profil omurgasını genişletir. */

export const VELI_AMAC_KEYS = ["bilgilendirme", "ev_etkinligi", "gorusme_ozeti"] as const;

export const veliMektubuInputSchema = ogrenciProfiliSchema.extend({
  amac: z.enum(VELI_AMAC_KEYS).default("bilgilendirme"),
  notlar: z.string().trim().max(500).optional(),
  ...mebHedefFields,
});

export type VeliMektubuInput = z.infer<typeof veliMektubuInputSchema>;
