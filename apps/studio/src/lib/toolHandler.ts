import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ToolType } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { anthropic, MODEL } from "@/lib/anthropic";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { extractJson } from "@/lib/utils";
import { logUsage } from "@/lib/usage";

type StudentSelect = {
  id: string;
  name: string;
  birthDate: Date | null;
  workArea: string;
  diagnosis: string | null;
};

export interface ToolConfig<T extends z.ZodTypeAny> {
  /** Rate limit key prefix (e.g. "social-story") */
  rateLimitKey: string;
  /** Zod schema for request body */
  bodySchema: T;
  /** Credit cost for this tool */
  cost: number;
  /** System prompt for Claude */
  systemPrompt: string;
  /** Tool type stored in Card.toolType */
  toolType: ToolType;
  /** Card category — fallback when student has no workArea or studentId is absent */
  category: string;
  /** When true, Card.category is set from student.workArea (overrides `category` field if student is present) */
  categoryFromWorkArea?: boolean;
  /** Default difficulty */
  difficulty?: string;
  /** Default age group */
  defaultAgeGroup?: string;
  /** Credit transaction description */
  creditDescription: string;
  /** Max tokens for Claude response */
  maxTokens?: number;

  /**
   * Whether studentId is required (default: true).
   * If false, tools can work without a student selected.
   */
  studentRequired?: boolean;

  /**
   * Build the user prompt from parsed body + student.
   * Return the prompt string.
   */
  buildUserPrompt: (data: z.infer<T>, student: StudentSelect | null, ageText: string) => string;

  /**
   * Optional: derive ageGroup from student age. If not provided, uses defaultAgeGroup.
   */
  deriveAgeGroup?: (studentAgeYears: number | null) => string;

  /**
   * Optional: enrich the parsed AI content with metadata before saving.
   */
  enrichContent?: (content: Record<string, unknown>, data: z.infer<T>) => void;

  /**
   * Response key name (e.g. "story", "drill", "homework"). Used in JSON response.
   */
  responseKey: string;

  /**
   * Optional: fallback title if AI doesn't return one.
   */
  fallbackTitle?: string | ((data: z.infer<T>, student: StudentSelect | null) => string);
}

function calcAgeYears(birthDate: Date): number {
  return new Date().getFullYear() - new Date(birthDate).getFullYear();
}

function calcAgeText(birthDate: Date | null): string {
  if (!birthDate) return "";
  const years = calcAgeYears(birthDate);
  return `${years} yaşında`;
}

function defaultAgeGroupFromYears(years: number | null): string {
  if (years === null) return "7-12";
  if (years <= 6) return "3-6";
  if (years <= 12) return "7-12";
  if (years <= 18) return "13-18";
  return "adult";
}

export function createToolHandler<T extends z.ZodTypeAny>(config: ToolConfig<T>) {
  return async function POST(request: NextRequest) {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
      }

      const { allowed, retryAfter } = rateLimit(`${config.rateLimitKey}:${session.user.id}`, 2);
      if (!allowed) return rateLimitResponse(retryAfter);

      const parsed = config.bodySchema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json(
          { error: (parsed as { error: z.ZodError }).error.issues[0]?.message ?? "Geçersiz istek" },
          { status: 400 },
        );
      }
      const data = parsed.data as z.infer<T>;
      const studentId = (data as Record<string, unknown>).studentId as string | undefined;

      // Student lookup
      let student: StudentSelect | null = null;
      if (studentId) {
        student = await prisma.student.findFirst({
          where: { id: studentId, therapistId: session.user.id },
          select: { id: true, name: true, birthDate: true, workArea: true, diagnosis: true },
        });
        if (!student && config.studentRequired !== false) {
          return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 403 });
        }
      } else if (config.studentRequired !== false) {
        return NextResponse.json({ error: "Öğrenci seçilmedi" }, { status: 400 });
      }

      // Credit pre-check
      const therapist = await prisma.therapist.findUnique({
        where: { id: session.user.id },
        select: { credits: true },
      });
      if (!therapist || therapist.credits < config.cost) {
        return NextResponse.json(
          { error: `Yetersiz kredi. Mevcut: ${therapist?.credits ?? 0}, Gerekli: ${config.cost}` },
          { status: 403 },
        );
      }

      // Age
      const ageText = student?.birthDate ? calcAgeText(student.birthDate) : "";
      const ageYears = student?.birthDate ? calcAgeYears(student.birthDate) : null;
      const ageGroup = config.deriveAgeGroup
        ? config.deriveAgeGroup(ageYears)
        : (config.defaultAgeGroup ?? defaultAgeGroupFromYears(ageYears));

      // Build prompt & call Claude
      //
      // - `system` array formatında: prompt caching (ephemeral, 5 dk TTL)
      //   için `cache_control` eklemek gerekiyor. Ardışık tool çağrılarında
      //   input %90 ucuza geliyor (read $0.30/MTok vs normal $3/MTok).
      // - `temperature: 0.5`: klinik içerik için default 1.0 çok yaratıcı;
      //   tool'larda daha deterministik çıktı hem kaliteyi tutarlı tutuyor
      //   hem output şişkinliğini azaltıyor.
      const userPrompt = config.buildUserPrompt(data, student, ageText);
      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: config.maxTokens ?? 4096,
        temperature: 0.5,
        system: [
          {
            type: "text",
            text: config.systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userPrompt }],
      });

      // Teknik maliyet telemetrisi — kredi sisteminden bağımsız, admin panel
      // aggregate'i için. Fire-and-forget, hata fırlatmaz.
      logUsage(session.user.id, `tools/${config.rateLimitKey}`, message.usage);

      const rawContent = message.content[0];
      if (rawContent.type !== "text") throw new Error("Beklenmeyen içerik tipi");

      const aiContent = extractJson(rawContent.text);

      // Enrich with metadata
      config.enrichContent?.(aiContent, data);

      // Resolve fallback title
      const fallback = typeof config.fallbackTitle === "function"
        ? config.fallbackTitle(data, student)
        : (config.fallbackTitle ?? config.toolType);

      // Atomic save + credit deduction
      const dbCard = await prisma.$transaction(async (tx) => {
        const fresh = await tx.therapist.findUnique({
          where: { id: session.user.id },
          select: { credits: true },
        });
        if (!fresh || fresh.credits < config.cost) throw new Error("INSUFFICIENT_CREDITS");

        const resolvedCategory = config.categoryFromWorkArea && student
          ? student.workArea
          : config.category;

        const created = await tx.card.create({
          data: {
            title: (aiContent.title as string) ?? fallback,
            content: aiContent as Parameters<typeof prisma.card.create>[0]["data"]["content"],
            toolType: config.toolType,
            category: resolvedCategory,
            difficulty: config.difficulty ?? "medium",
            ageGroup,
            therapistId: session.user.id,
            studentId: student?.id ?? null,
          },
        });

        await tx.therapist.update({
          where: { id: session.user.id },
          data: { credits: { decrement: config.cost } },
        });
        await tx.creditTransaction.create({
          data: {
            therapistId: session.user.id,
            amount: config.cost,
            type: "SPEND",
            description: config.creditDescription,
          },
        });

        return created;
      });

      return NextResponse.json({ success: true, [config.responseKey]: aiContent, cardId: dbCard.id });
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
        return NextResponse.json({ error: "Yetersiz kredi." }, { status: 403 });
      }
      console.error(`[/api/tools/${config.rateLimitKey}] HATA:`, error);
      return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
    }
  };
}
