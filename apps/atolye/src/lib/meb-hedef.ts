import { z } from "zod";
import { mebHedef } from "./meb-program";

/* Paylaşılan MEB hedef seçimi — araçlar `ogrenciProfiliSchema.extend({ ...mebHedefFields })`
   ile opt-in eder; <MebHedefSelect> aynı form state'ini besler.
   `mebToPrompt()` (meb-program.ts) seçimi prompt bloğuna çevirir.
   Client + server paylaşır (server-only kod YOK). */

/** Zod alanları — tool şemasına `.extend({ ...mebHedefFields })` ile eklenir. */
export const mebHedefFields = {
  /** Seçilen hedefin resmî kodu, ör. "5.1.14". Boş/yoksa MEB hedefi seçilmemiştir. */
  mebHedefKod: z
    .string()
    .trim()
    .refine((k) => mebHedef(k) !== undefined, "Geçersiz MEB hedef kodu")
    .optional(),
  /** İşaretli hedef davranış kodları (4. seviye). Boşsa hedefin tüm davranışları kastedilir. */
  mebDavranisKodlari: z.array(z.string().trim()).default([]),
};

export const mebHedefSchema = z.object(mebHedefFields);
export type MebHedefInput = z.infer<typeof mebHedefSchema>;

/* ——— Client form state (kontrollü; cascading seçici için seviye seviye tutulur) ——— */

export interface MebHedefState {
  modulNo: string; // "" | "5"
  bolumKod: string; // "" | "5.1"
  hedefKod: string; // "" | "5.1.14"
  davranisKodlari: string[];
}

export const emptyMebHedef: MebHedefState = {
  modulNo: "",
  bolumKod: "",
  hedefKod: "",
  davranisKodlari: [],
};

/** Form state → API payload (mebHedefFields şekli). Hedef seçili değilse davranışlar düşer. */
export function mebHedefPayload(s: MebHedefState): {
  mebHedefKod?: string;
  mebDavranisKodlari: string[];
} {
  return {
    mebHedefKod: s.hedefKod || undefined,
    mebDavranisKodlari: s.hedefKod ? s.davranisKodlari : [],
  };
}
