// apps/hub/src/modules/studio/lib/assistant/run.ts
import type { NameMapping } from "@ludenlab/ai";
import { anthropic, MODEL } from "@studio/lib/anthropic";
import { logUsage } from "@studio/lib/usage";
import { extractJson } from "@studio/lib/utils";
import { scrub, restoreNameDeep } from "@studio/lib/pseudonym";
import { loadStudentContext } from "@studio/lib/studentContext";
import { ASSISTANT_SYSTEM_PROMPT, buildAssistantUserPrompt } from "./prompt";
import { validateSuggestions, type GoalRow, type Suggestion } from "./schema";

/**
 * Tek asistan çağrısı. HİÇ fırlatmaz: model/JSON hatası boş öneri + uyarı döner (gözlem rotada
 * zaten kaydedildi). Rumuz kapısı: gözlem metni `scrub` ile, blok `loadStudentContext` ile
 * rumuzlu gider; `reason` metinleri `restoreNameDeep` ile gerçek ada döner.
 */
type AssistantPrisma = Parameters<typeof loadStudentContext>[0] & {
  curriculum: { findMany(args: unknown): Promise<unknown> };
  studentProgress: { findMany(args: unknown): Promise<unknown> };
};

export interface RunAssistantInput {
  student: { id: string; name: string; llmAlias: string; therapistId: string; curriculumIds: string[]; aiProfile: string | null };
  therapistId: string;
  observation: string;
  /** Kayıtlı gözlemin id'si: bağlam bloğunun "Son gözlemler" alanından dışlanır (iki kez gitmesin). */
  observationId?: string;
}

export interface RunAssistantOutput {
  suggestions: Suggestion[];
  warning?: string;
}

export const ASSISTANT_MAX_TOKENS = 1200;

/** Öğrencinin müfredat hedefleri + mevcut ilerleme durumu (satır yoksa "not_started"). */
async function loadGoals(prisma: AssistantPrisma, s: RunAssistantInput["student"]): Promise<GoalRow[]> {
  if (!s.curriculumIds.length) return [];
  const [mufredatlar, ilerleme] = await Promise.all([
    prisma.curriculum.findMany({
      where: { id: { in: s.curriculumIds } },
      select: { goals: { select: { id: true, code: true, title: true }, orderBy: { code: "asc" } } },
    }) as Promise<{ goals: { id: string; code: string; title: string }[] }[]>,
    prisma.studentProgress.findMany({
      where: { studentId: s.id, therapistId: s.therapistId },
      select: { goalId: true, status: true },
    }) as Promise<{ goalId: string; status: string }[]>,
  ]);
  const durum = new Map(ilerleme.map((p) => [p.goalId, p.status]));
  return mufredatlar.flatMap((m) => m.goals).map((g) => ({ ...g, status: durum.get(g.id) ?? "not_started" }));
}

export async function runAssistant(prisma: AssistantPrisma, input: RunAssistantInput): Promise<RunAssistantOutput> {
  const map: NameMapping = { real: input.student.name, alias: input.student.llmAlias };
  // Hedefler yüklenemezse liste boş kalır → doğrulayıcı goal_status önerilerini eler, çağrı sürer.
  const goals = await loadGoals(prisma, input.student).catch((e) => {
    console.warn("[assistant] hedefler yüklenemedi, goal_status üretilmez", e);
    return [] as GoalRow[];
  });
  const hasProfile = Boolean(input.student.aiProfile?.trim());

  try {
    // loadStudentContext kendi içinde fırlatmaz; yine de sözleşme gereği try içinde.
    const studentBlock = await loadStudentContext(prisma, {
      studentId: input.student.id,
      therapistId: input.therapistId,
      nameMap: map,
      excludeObservationId: input.observationId,
    });
    const userPrompt = buildAssistantUserPrompt({
      studentBlock,
      observation: scrub(input.observation, map) ?? input.observation,
      goals,
      hasProfile,
    });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: ASSISTANT_MAX_TOKENS,
      temperature: 0.3,
      system: [{ type: "text", text: ASSISTANT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt }],
    });
    logUsage(input.therapistId, "students/assistant", message.usage);
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n");
    const raw = extractJson(text);
    const suggestions = validateSuggestions(raw, { goals, hasProfile });
    return { suggestions: restoreNameDeep(suggestions, map) };
  } catch (e) {
    console.error("[assistant] öneri üretilemedi:", e);
    return { suggestions: [], warning: "Öneri üretilemedi" };
  }
}
