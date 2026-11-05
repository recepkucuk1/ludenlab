import { z } from "zod";

/* Veli formu (spec §6). İstemci + sunucu paylaşır; server-only import YOK. */
export interface Chip { key: string; label: string }
export const EASY_CHIPS = [
  { key: "istekle_oturdu", label: "İstekle oturdu" },
  { key: "soyledi", label: "Hedef sesi/kelimeleri söyledi" },
  { key: "oyunu_sevdi", label: "Oyunu sevdi" },
  { key: "kendi_basladi", label: "Kendi başladı" },
] as const satisfies readonly Chip[];
export const HARD_CHIPS = [
  { key: "oturmak_istemedi", label: "Oturmak istemedi" },
  { key: "zorlandi", label: "Zorlandı" },
  { key: "zaman_bulamadik", label: "Zaman bulamadık" },
  { key: "anlamadik", label: "Yönergeyi anlamadık" },
] as const satisfies readonly Chip[];

export type EasyKey = (typeof EASY_CHIPS)[number]["key"];
export type HardKey = (typeof HARD_CHIPS)[number]["key"];
const easyKeys = EASY_CHIPS.map((c) => c.key) as [EasyKey, ...EasyKey[]];
const hardKeys = HARD_CHIPS.map((c) => c.key) as [HardKey, ...HardKey[]];
const tekrarsiz = <T>(arr: T[]) => new Set(arr).size === arr.length;

export const PARENT_NOTE_MAX = 300;

export const parentFeedbackSchema = z.object({
  days: z.number().int().min(0).max(7),
  easy: z.array(z.enum(easyKeys)).max(EASY_CHIPS.length).refine(tekrarsiz, "Tekrar eden seçim").default([]),
  hard: z.array(z.enum(hardKeys)).max(HARD_CHIPS.length).refine(tekrarsiz, "Tekrar eden seçim").default([]),
  note: z.string().trim().max(PARENT_NOTE_MAX).optional(),
});
export type ParentFeedbackBody = z.infer<typeof parentFeedbackSchema>;

/** Gözlem.meta (Json) — yalnız source=parent. */
export interface ParentFeedbackMeta { days: number; easy: string[]; hard: string[] }

/** Uzman tarafı DTO. */
export interface ParentLinkDto {
  id: string;
  url: string;
  answerCount: number;
  lastAnsweredAt: string | null;
  createdAt: string;
}

/** Küçük harf çip etiketi (metin derleme için). */
export function chipLabelLower(key: EasyKey | HardKey): string {
  const c = ([...EASY_CHIPS, ...HARD_CHIPS] as readonly Chip[]).find((x) => x.key === key);
  return (c?.label ?? key).toLocaleLowerCase("tr-TR");
}
