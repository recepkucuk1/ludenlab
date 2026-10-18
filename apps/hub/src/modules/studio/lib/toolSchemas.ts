// apps/hub/src/modules/studio/lib/toolSchemas.ts
import { z } from "zod";

/**
 * Asistanın ön-doldurduğu dört aracın gövde şemaları — TEK KAYNAK. Rotalar buradan import eder;
 * asistan `generate_tool.params`'ı ve araç sayfaları `prefill`'i aynı şemayla doğrular.
 * Prompt'a giren her alan sınırlı (denetim #29): girdi boyutu = doğrudan LLM maliyeti.
 */
export const articulationBodySchema = z.object({
  studentId:    z.string().optional(),
  targetSounds: z.array(z.string().max(20)).min(1, "En az bir hedef ses seçin").max(20),
  positions:    z.array(z.enum(["initial", "medial", "final"])).min(1),
  level:        z.enum(["isolated", "syllable", "word", "sentence", "contextual"]),
  itemCount:    z.number().int().min(5).max(30),
});

export const phonationBodySchema = z.object({
  studentId:    z.string().optional(),
  targetSounds: z.array(z.string().max(20)).min(1, "En az bir hedef ses seçin").max(20),
  activityType: z.enum(["sound_hunt", "bingo", "snakes_ladders", "sound_maze"]),
  difficulty:   z.enum(["easy", "medium", "hard"]),
  itemCount:    z.number().int().min(8).max(25),
  theme:        z.string().max(100).optional(),
});

export const matchingGameBodySchema = z.object({
  studentId:  z.string().optional(),
  matchType:  z.enum(["definition", "image_desc", "synonym", "antonym", "category", "sentence"]),
  pairCount:  z.enum(["6", "8", "10", "12"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  theme:      z.string().max(100).optional(),
  goalTitle:  z.string().max(300).optional(),
});

export const homeworkBodySchema = z.object({
  studentId:    z.string().min(1),
  targetArea:   z.string().min(1).max(300),
  duration:     z.enum(["10", "15", "20"]),
  parentLevel:  z.enum(["basic", "detailed"]),
  materialType: z.enum(["exercise", "observation", "daily_activity"]),
  extraNote:    z.string().max(500).optional(),
});

/** Asistanın önerebildiği araçlar; anahtar = sayfa yolu parçası (`/studio/tools/<key>`). */
export const ASSISTANT_TOOLS = ["articulation", "phonation", "matching-game", "homework"] as const;
export type AssistantTool = (typeof ASSISTANT_TOOLS)[number];

/** `studentId` düşülmüş (asistan onu URL'de ayrıca taşır) parametre şemaları. */
export const ASSISTANT_TOOL_PARAM_SCHEMAS: Record<AssistantTool, z.ZodTypeAny> = {
  "articulation":  articulationBodySchema.omit({ studentId: true }),
  "phonation":     phonationBodySchema.omit({ studentId: true }),
  "matching-game": matchingGameBodySchema.omit({ studentId: true }),
  "homework":      homeworkBodySchema.omit({ studentId: true }),
};

export const ASSISTANT_TOOL_LABEL: Record<AssistantTool, string> = {
  "articulation":  "Artikülasyon Alıştırması",
  "phonation":     "Sesletim",
  "matching-game": "Kelime Eşleştirme",
  "homework":      "Ev Ödevi Materyali",
};
