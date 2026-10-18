// apps/hub/src/modules/studio/lib/assistant/schema.ts
import { z } from "zod";
import { PROFIL_BOLUMLERI } from "@studio/lib/studentContext";
import { ASSISTANT_TOOLS, ASSISTANT_TOOL_PARAM_SCHEMAS } from "@studio/lib/toolSchemas";

/**
 * Asistan öneri sözleşmesi. Model JSON döner; burada zod + iş kuralıyla süzülür. Geçersiz öneri
 * SESSİZCE elenir (uzmana yarım kart gösterilmez). Durumlar progress PUT'unun kabul ettiği
 * `progressStatusSchema` alt kümesidir: `not_started` asla önerilmez; `completed → in_progress`
 * (hedefi geri alma) klinikte regresyon görüldüğü için bilerek serbesttir.
 */
export const MAX_SUGGESTIONS = 4;
const REASON_MAX = 200;
const NOTE_MAX = 300;

export const goalStatusSuggestion = z.object({
  kind: z.literal("goal_status"),
  goalId: z.string().min(1),
  status: z.enum(["in_progress", "completed"]),
  reason: z.string().trim().min(1).max(REASON_MAX),
});

export const profileNoteSuggestion = z.object({
  kind: z.literal("profile_note"),
  section: z.enum(PROFIL_BOLUMLERI),
  // Markdown profile istemci "- " ekleyerek yazar ve başlıklara göre ayrıştırır: tek satır, başlık/işaret yok.
  text: z
    .string()
    .trim()
    .min(1)
    .max(NOTE_MAX)
    .transform((t) => t.replace(/\s+/g, " "))
    .refine((t) => !/^#/.test(t) && !/^[-*]\s/.test(t), "madde başlığı/işareti olamaz"),
  reason: z.string().trim().min(1).max(REASON_MAX),
});

export const generateToolSuggestion = z.object({
  kind: z.literal("generate_tool"),
  tool: z.enum(ASSISTANT_TOOLS),
  params: z.record(z.string(), z.unknown()),
  reason: z.string().trim().min(1).max(REASON_MAX),
});

export const suggestionSchema = z.discriminatedUnion("kind", [goalStatusSuggestion, profileNoteSuggestion, generateToolSuggestion]);
export type Suggestion = z.infer<typeof suggestionSchema>;

export interface GoalRow {
  id: string;
  code: string;
  title: string;
  /** progress satırı yoksa "not_started". */
  status: string;
}

/**
 * `goals` sunucuda, YALNIZ bu öğrencinin müfredatlarından kurulmalıdır. Bu doğrulayıcı yetki sınırı
 * DEĞİLDİR; sahiplik denetimini progress PUT'u yapar.
 */
export interface ValidationContext {
  goals: GoalRow[];
  hasProfile: boolean;
}

/** Ham model çıktısından ({ suggestions: [...] }) geçerli, tekrarsız, en çok 4 öneri. */
export function validateSuggestions(raw: unknown, ctx: ValidationContext): Suggestion[] {
  const liste =
    raw && typeof raw === "object" && Array.isArray((raw as { suggestions?: unknown }).suggestions)
      ? (raw as { suggestions: unknown[] }).suggestions
      : [];
  const hedef = new Map(ctx.goals.map((g) => [g.id, g]));
  const gorulen = new Set<string>();
  const out: Suggestion[] = [];

  for (const aday of liste) {
    if (out.length >= MAX_SUGGESTIONS) break;
    const p = suggestionSchema.safeParse(aday);
    if (!p.success) continue;
    const s = p.data;

    let anahtar: string;
    if (s.kind === "goal_status") {
      const g = hedef.get(s.goalId);
      if (!g || g.status === s.status) continue;
      anahtar = `goal:${s.goalId}`;
    } else if (s.kind === "profile_note") {
      if (!ctx.hasProfile) continue;
      anahtar = `profile:${s.section}:${s.text.trim().toLocaleLowerCase("tr")}`;
    } else {
      const sema = ASSISTANT_TOOL_PARAM_SCHEMAS[s.tool];
      const q = sema.safeParse(s.params);
      if (!q.success) continue;
      s.params = q.data as Record<string, unknown>;
      anahtar = `tool:${s.tool}`;
    }
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    out.push(s);
  }
  return out;
}
