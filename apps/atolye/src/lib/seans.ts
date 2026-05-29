import { z } from "zod";
import { ALAN_KEYS, KADEME_KEYS } from "./bep";

/* Seans Planı Üreteci — form alanları. KADEME/ALAN bep.ts'ten paylaşılır. */

export const seansInputSchema = z.object({
  rumuz: z.string().trim().min(1, "Kod/rumuz gerekli").max(40),
  kademe: z.enum(KADEME_KEYS),
  alan: z.enum(ALAN_KEYS),
  seansHedefi: z
    .string()
    .trim()
    .min(1, "Bu seansın hedefi gerekli")
    .max(1000),
  sureDk: z.coerce.number().int().min(15).max(120).default(40),
  ilgiAlanlari: z.string().trim().max(500).optional().default(""),
  sonSeansNotu: z.string().trim().max(2000).optional().default(""),
  materyalKisiti: z.string().trim().max(500).optional().default(""),
});

export type SeansInput = z.infer<typeof seansInputSchema>;
