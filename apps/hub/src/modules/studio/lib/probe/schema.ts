// apps/hub/src/modules/studio/lib/probe/schema.ts
import { z } from "zod";

/* Ölçüm probu — zod şemaları ve sabitler (spec 2026-11-04 §4–§6). Client + server paylaşır (server-only
   import YOK; banka buraya girmez — PROBE_SOUNDS elle listelenir, schema.test.ts bankayla eşleşmesini kilitler). */

export const PROBE_POSITIONS = ["initial", "medial", "final"] as const;
export type ProbePosition = (typeof PROBE_POSITIONS)[number];
export const POSITION_LABEL: Record<ProbePosition, string> = { initial: "kelime başı", medial: "kelime ortası", final: "kelime sonu" };
/** Bağlam satırı ve kart başlığı için kısa ad. */
export const POSITION_KISA: Record<ProbePosition, string> = { initial: "başta", medial: "ortada", final: "sonda" };

export const PROBE_LEVELS = ["word"] as const; // ileride: isolated | syllable | sentence
export const LEVEL_KISA: Record<(typeof PROBE_LEVELS)[number], string> = { word: "kelime" };

export const PROBE_COUNT = { min: 5, max: 20, default: 10 } as const;
/** Bankada bu kadardan az kelime varsa seri açılmaz (spec §5). */
export const PROBE_MIN_BANK_WORDS = 3;

/** Bankadaki 29 ses — `articulation.WORD_BANK` anahtarlarıyla birebir (testle kilitli). */
export const PROBE_SOUNDS = [
  "/k/", "/g/", "/r/", "/l/", "/y/", "/s/", "/ş/", "/z/", "/d/", "/f/", "/v/", "/h/", "/c/", "/ç/", "/t/", "/b/",
  "/p/", "/m/", "/n/", "/j/", "/ğ/", "/u/", "/ü/", "/a/", "/e/", "/ı/", "/i/", "/o/", "/ö/",
] as const;

/** "/r/" biçimi; yalnız bankadaki 29 ses (PROBE_SOUNDS). */
export const soundSchema = z.string().trim().pipe(z.enum(PROBE_SOUNDS));

export const createSeriesSchema = z.object({
  sound: soundSchema,
  position: z.enum(PROBE_POSITIONS),
  count: z.number().int().min(PROBE_COUNT.min).max(PROBE_COUNT.max).default(PROBE_COUNT.default),
});
export type CreateSeriesBody = z.infer<typeof createSeriesSchema>;

export const runItemSchema = z.object({
  word: z.string().min(1).max(40),
  correct: z.boolean(),
  cued: z.boolean().default(false),
});
export type RunItem = z.infer<typeof runItemSchema>;

export const createRunSchema = z.object({
  items: z.array(runItemSchema).min(1).max(PROBE_COUNT.max),
  note: z.string().trim().max(300).optional(),
});
export type CreateRunBody = z.infer<typeof createRunSchema>;

/** Seriye yazılan kelime kaydı (Json). */
export interface ProbeWord {
  word: string;
  syllableBreak: string;
  imageUrl: string | null;
}

/** API'nin döndürdüğü seri (koşular tarih ARTAN, grafik sırası). */
export interface ProbeSeriesDto {
  id: string;
  sound: string;
  position: ProbePosition;
  level: string;
  active: boolean;
  words: ProbeWord[];
  createdAt: string;
  runs: ProbeRunDto[];
}
export interface ProbeRunDto {
  id: string;
  date: string;
  pct: number;
  correct: number;
  total: number;
  cuedCount: number;
  note: string | null;
}
