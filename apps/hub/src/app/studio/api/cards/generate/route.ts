import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL } from "@studio/lib/anthropic";
import { logUsage } from "@studio/lib/usage";
import {
  buildCardPrompt,
  CARD_SYSTEM_PROMPT,
  CARD_TOOL,
  type StudentContext,
} from "@studio/lib/prompts";
import { prisma } from "@studio/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { streamingJson } from "@/lib/streamingJson";
import { cardGenerateBodySchema, zodError } from "@studio/lib/validation";
import { checkCredits, deductCredits } from "@studio/lib/credits";
import { ensureStudentAlias, restoreNameDeep, scrub } from "@studio/lib/pseudonym";
import type { NameMapping } from "@ludenlab/ai";
import { CREDIT_COSTS } from "@studio/lib/plans";
import { requireAuth, requireStudentOwnership } from "@studio/lib/auth-helpers";
import { logError } from "@studio/lib/utils";

const RECENT_CARDS_LIMIT = 5;

function calcAgeYears(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  const ms = Date.now() - new Date(birthDate).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25));
}

export async function POST(request: NextRequest) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;

  const { allowed, retryAfter } = rateLimit(
    `cards:generate:${session.user.id}`,
    2,
  );
  if (!allowed) return rateLimitResponse(retryAfter);

  try {
    const parsed = cardGenerateBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: zodError(parsed.error) },
        { status: 400 },
      );
    }
    const {
      category,
      difficulty,
      ageGroup,
      focusArea,
      studentId,
      curriculumGoalIds = [],
    } = parsed.data;

    // Hızlı kredi ön kontrolü — UX için, gerçek kilit transaction içinde.
    const creditCheck = await checkCredits(session.user.id, "card_generate");
    if (!creditCheck.ok) {
      return NextResponse.json(
        {
          error: `Üretim hakkınız tükendi. Yeni dönemde yenilenir; dilerseniz planınızı yükseltin.`,
        },
        { status: 403 },
      );
    }

    if (studentId) {
      const ownership = await requireStudentOwnership(
        studentId,
        session.user.id,
      );
      if (ownership instanceof NextResponse) return ownership;
    }

    // Seçilen tüm müfredat hedeflerini DB'den al ve prompt metnini oluştur
    let curriculumGoalText: string | undefined;
    if (curriculumGoalIds.length > 0) {
      const goals = await prisma.curriculumGoal.findMany({
        where: { id: { in: curriculumGoalIds } },
        include: { curriculum: { select: { code: true, title: true } } },
      });
      if (goals.length > 0) {
        curriculumGoalText = goals
          .map((g) => `- ${g.code}: ${g.title} (${g.curriculum.title})`)
          .join("\n");
      }
    }

    // Öğrenci bağlamı — "isabet" için en büyük sinyal. Tek Promise.all ile
    // paralel olarak student + son kartlar + tamamlanmış hedefler çekiyoruz.
    let studentContext: StudentContext | undefined;
    let nameMap: NameMapping | null = null;
    if (studentId) {
      const [student, recentCards, completedProgress] = await Promise.all([
        prisma.student.findUnique({
          where: { id: studentId },
          select: {
            id: true,
            name: true,
            birthDate: true,
            workArea: true,
            diagnosis: true,
            notes: true,
            aiProfile: true,
            llmAlias: true,
          },
        }),
        prisma.card.findMany({
          where: { studentId, therapistId: session.user.id },
          select: { title: true, difficulty: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: RECENT_CARDS_LIMIT,
        }),
        prisma.studentProgress.findMany({
          where: {
            studentId,
            therapistId: session.user.id,
            status: "completed",
          },
          select: { goal: { select: { code: true } } },
        }),
      ]);

      if (student) {
        // ── ÇOCUK PII KAPISI (2026-08 denetimi #09) ──
        // Prompt'a RUMUZ gider. Ad yalnız `name` alanında değil; terapist notlarında,
        // tanıda, daha önce üretilmiş aiProfile'da ve kart BAŞLIKLARINDA da geçer —
        // hepsi taranır. (aiProfile/başlıklar daha önce gerçek adla kaydedilmiş olabilir;
        // burada temizlenmeleri "bileşik sızıntı"yı kapatır.)
        const alias = await ensureStudentAlias({
          id: student.id,
          name: student.name,
          llmAlias: student.llmAlias,
          therapistId: session.user.id,
        });
        const map: NameMapping = { real: student.name, alias };
        nameMap = map;
        studentContext = {
          name: alias,
          ageYears: calcAgeYears(student.birthDate),
          workArea: student.workArea,
          diagnosis: scrub(student.diagnosis, map),
          notes: scrub(student.notes, map),
          aiProfile: scrub(student.aiProfile, map),
          recentCards: recentCards.map((c) => ({
            ...c,
            title: scrub(c.title, map) ?? c.title,
          })),
          completedGoalCodes: completedProgress.map((p) => p.goal.code),
        };
      }
    }

    const userPrompt = buildCardPrompt({
      category,
      difficulty,
      ageGroup,
      focusArea,
      curriculumGoalText,
      studentContext,
    });

    // Yavaş kısım (Claude + commit) SSE-heartbeat içinde — Safari 60 sn
    // zaman aşımına takılmasın (bkz. @/lib/streamingJson).
    return streamingJson(async () => {
      try {
        // Claude çağrısı — tool-use ile structured output, static kuralları
        // prompt-cache'e al, klinik içerik için temperature'ı düşür.
        const message = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 4096,
          temperature: 0.4,
          system: [
            {
              type: "text",
              text: CARD_SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          tools: [CARD_TOOL],
          tool_choice: { type: "tool", name: CARD_TOOL.name },
          messages: [{ role: "user", content: userPrompt }],
        });

        if (message.stop_reason === "max_tokens") {
          throw new Error(
            "Yanıt çok uzun, token limiti aşıldı. Lütfen tekrar deneyin.",
          );
        }

        // Teknik maliyet telemetrisi — fire-and-forget, generation'ı bloklamaz.
        // Admin panelindeki aylık maliyet aggregate'inin kaynağı da bu.
        logUsage(session.user.id, "cards/generate", message.usage);

        // Tool-use yanıtını bul — tool_choice=tool zorladığı için her zaman
        // tool_use content bloğu dönmesini bekliyoruz.
        const toolUse = message.content.find(
          (block) => block.type === "tool_use",
        );
        if (!toolUse || toolUse.type !== "tool_use") {
          throw new Error("Claude emit_card aracını çağırmadı");
        }

        // Rumuz → GERÇEK ad (kaydetmeden ve döndürmeden önce; iç içe tüm string'lerde).
        const cardContent = nameMap
          ? restoreNameDeep(toolUse.input as Record<string, unknown>, nameMap)
          : (toolUse.input as Record<string, unknown>);
        const card = { ...cardContent, category, difficulty, ageGroup };

        // Kart kaydet + krediyi atomik düş — deductCredits'e tx geçiyoruz ki
        // create fail ederse debit de geri alınsın.
        const dbCard = await prisma.$transaction(async (tx) => {
          const deduction = await deductCredits(
            session.user.id,
            "card_generate",
            tx,
          );
          if (!deduction.ok) throw new Error("INSUFFICIENT_CREDITS");

          return tx.card.create({
            data: {
              title: (cardContent.title as string) ?? "Öğrenme Kartı",
              content: cardContent as Parameters<
                typeof prisma.card.create
              >[0]["data"]["content"],
              category,
              difficulty,
              ageGroup,
              therapistId: session.user.id,
              studentId: studentId ?? null,
              curriculumGoalIds,
            },
          });
        });

        return {
          status: 200,
          body: { success: true, card, cardId: dbCard.id },
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "INSUFFICIENT_CREDITS"
        ) {
          return {
            status: 403,
            body: { error: "Üretim hakkınız tükendi. Kart oluşturulamadı." },
          };
        }
        logError("POST /studio/api/cards/generate", error);
        return { status: 500, body: { error: "Bir hata oluştu" } };
      }
    });
  } catch (error) {
    logError("POST /studio/api/cards/generate", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
