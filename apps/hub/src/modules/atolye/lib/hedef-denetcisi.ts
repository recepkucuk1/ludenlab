// apps/hub/src/modules/atolye/lib/hedef-denetcisi.ts
import { z } from "zod";
import { hedefMetniSchema } from "@/lib/hedefDenetimi/schema";
import { KADEME, type Kademe } from "./bep";
import { mebHedefFields } from "./meb-hedef";
import { ogrenciProfiliSchema } from "./ogrenci-profili";

/* Hedef Denetçisi — form alanları (spec §6.1). Profil omurgasından yalnız kimlik (ad, kademe, yaş); tanı profili,
   güçlü yönler vb. İSTENMEZ ve prompt'a gitmez (denetim biçimseldir; daha az PII). Client + server paylaşır. */

export const HEDEF_DENETIM_DOC_TYPE = "hedef_denetim";

export const hedefDenetcisiInputSchema = ogrenciProfiliSchema
  .pick({ rumuz: true, kademe: true, yas: true })
  .extend({ hedef: hedefMetniSchema, ...mebHedefFields });
export type HedefDenetcisiInput = z.infer<typeof hedefDenetcisiInputSchema>;

/** Prompt bağlamı: "İlkokul (1–4. sınıf), 8 yaş". */
export function kademeYasMetni(kademe: Kademe, yas?: number | null): string {
  return `${KADEME[kademe]}${yas ? `, ${yas} yaş` : ""}`;
}
