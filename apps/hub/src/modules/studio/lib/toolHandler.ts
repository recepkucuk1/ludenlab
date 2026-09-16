import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ToolType } from "@/generated/studio/client";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { anthropic, MODEL } from "@studio/lib/anthropic";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/bodyLimit";
import { streamingJson } from "@/lib/streamingJson";
import { extractJson } from "@studio/lib/utils";
import { logUsage } from "@studio/lib/usage";
import { refundCredits, reserveCredits } from "@studio/lib/credits";
import { ensureStudentAlias, restoreNameDeep, scrub } from "@studio/lib/pseudonym";
import type { NameMapping } from "@ludenlab/ai";

/**
 * NOT: `name` bu tipte, PROMPT'A GİDEN ada karşılık gelir — yani araçlara ulaştığında
 * RUMUZDUR (bkz. çocuk-PII kapısı, denetim #09). Gerçek ad `nameMap.real`de tutulur ve
 * yalnız çıktı üretildikten sonra geri konur.
 */
type StudentSelect = {
  id: string;
  name: string;
  birthDate: Date | null;
  workArea: string;
  diagnosis: string | null;
  llmAlias?: string | null;
};

/**
 * `buildUserPrompt`'a verilen bağlam. Bir araç, prompt'unu kurarken EK SORGU yapmak
 * zorundaysa (ör. haftalık planın geçmiş kartları) bunu kendi rotasında DEĞİL burada
 * yapar; böylece rumuz/kredi/gövde kapısının dışına çıkmak gerekmeyen tek yol kalır.
 */
export interface ToolPromptContext {
  /** Oturumdaki uzmanın kimliği — ek sorgular bununla kapsamlanır. */
  therapistId: string;
  /** Serbest metinde geçen gerçek adı rumuzla değiştirir (öğrenci yoksa metni aynen döner). */
  scrubText: (text: string | null | undefined) => string;
}

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
  buildUserPrompt: (
    data: z.infer<T>,
    student: StudentSelect | null,
    ageText: string,
    ctx: ToolPromptContext,
  ) => string | Promise<string>;

  /**
   * Optional: derive ageGroup from student age. If not provided, uses defaultAgeGroup.
   */
  deriveAgeGroup?: (studentAgeYears: number | null) => string;

  /**
   * Optional: enrich the parsed AI content with metadata before saving.
   */
  enrichContent?: (
    content: Record<string, unknown>,
    data: z.infer<T>,
  ) => void | Promise<void>;

  /**
   * Response key name (e.g. "story", "drill", "homework"). Used in JSON response.
   */
  responseKey: string;

  /**
   * Optional: fallback title if AI doesn't return one.
   */
  fallbackTitle?:
    | string
    | ((data: z.infer<T>, student: StudentSelect | null) => string);
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

export function createToolHandler<T extends z.ZodTypeAny>(
  config: ToolConfig<T>,
) {
  return async function POST(request: NextRequest) {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
      }

      const { allowed, retryAfter } = rateLimit(
        `${config.rateLimitKey}:${session.user.id}`,
        2,
      );
      if (!allowed) return rateLimitResponse(retryAfter);

      // Gövde SAYARAK okunur (denetim #29): content-length yalan/eksik olsa da sınır uygulanır.
      const body = await readJsonBody(request);
      if (!body.ok) {
        return NextResponse.json({ error: body.error }, { status: body.status });
      }

      const parsed = config.bodySchema.safeParse(body.data);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error:
              (parsed as { error: z.ZodError }).error.issues[0]?.message ??
              "Geçersiz istek",
          },
          { status: 400 },
        );
      }
      const data = parsed.data as z.infer<T>;
      const studentId = (data as Record<string, unknown>).studentId as
        | string
        | undefined;

      // Student lookup
      let student: StudentSelect | null = null;
      // Gerçek ad ↔ rumuz eşlemesi — prompt'a rumuz gider, çıktıda gerçek ad geri gelir.
      let nameMap: NameMapping | null = null;
      if (studentId) {
        student = await prisma.student.findFirst({
          where: { id: studentId, therapistId: session.user.id },
          select: {
            id: true,
            name: true,
            birthDate: true,
            workArea: true,
            diagnosis: true,
            llmAlias: true,
          },
        });
        if (!student && config.studentRequired !== false) {
          return NextResponse.json(
            { error: "Öğrenci bulunamadı" },
            { status: 403 },
          );
        }

        // ── ÇOCUK PII KAPISI (2026-08 denetimi #09) ──
        // Buradan sonra `student` nesnesi RUMUZLU: tüm araçlar `buildUserPrompt`'a bunu
        // aldığı için 8 aracın hepsi tek noktadan korunur. Tanı gibi serbest metinlerde
        // geçen ad da temizlenir. Gerçek ad çıktı üretildikten sonra geri konur.
        if (student) {
          const alias = await ensureStudentAlias({
            id: student.id,
            name: student.name,
            llmAlias: student.llmAlias,
            therapistId: session.user.id,
          });
          nameMap = { real: student.name, alias };
          student = {
            ...student,
            name: alias,
            diagnosis: scrub(student.diagnosis, nameMap),
          };
        }
      } else if (config.studentRequired !== false) {
        return NextResponse.json(
          { error: "Öğrenci seçilmedi" },
          { status: 400 },
        );
      }

      // ── KREDİ REZERVASYONU (2026-08 denetimi #22) ──
      // Eskiden: bakiyeye BAK → Claude'u çağır → sonra DÜŞ. Aradaki pencerede eşzamanlı
      // istekler aynı bakiyeyi görüyordu: hepsi ön-kontrolü geçip Claude'u çağırıyor
      // (faturayı biz ödüyoruz), sonunda yalnız biri düşebiliyordu. Artık hak PAHALI
      // ÇAĞRIDAN ÖNCE atomik olarak rezerve edilir; kaybeden istek AI'ı hiç çağırmaz.
      // Üretim başarısız olursa aşağıdaki `refundReservation` ile iade edilir.
      const reserved = await reserveCredits(
        session.user.id,
        config.cost,
        config.creditDescription,
      );
      if (!reserved) {
        return NextResponse.json(
          {
            error: `Üretim hakkınız tükendi. Yeni dönemde yenilenir; dilerseniz planınızı yükseltin.`,
          },
          { status: 403 },
        );
      }

      // Age
      const ageText = student?.birthDate ? calcAgeText(student.birthDate) : "";
      const ageYears = student?.birthDate
        ? calcAgeYears(student.birthDate)
        : null;
      const ageGroup = config.deriveAgeGroup
        ? config.deriveAgeGroup(ageYears)
        : (config.defaultAgeGroup ?? defaultAgeGroupFromYears(ageYears));

      // Yavaş kısım (Claude + commit) SSE-heartbeat içinde koşar; Safari'nin
      // 60 sn sessizlik zaman aşımı ping'lerle atlatılır (bkz. @/lib/streamingJson).
      return streamingJson(async () => {
        // Rezerve edilen hakkın İADESİ — üretim tamamlanamazsa çağrılır. Tek sefer çalışır.
        // İade de deftere (EARN) yazılır → bakiye ↔ defter tutarlılığı her an korunur.
        let held = true;
        const refundReservation = async (reason: string) => {
          if (!held) return;
          held = false;
          // refundCredits fırlatmaz; iade edilemezse GÖRÜNÜR loglar.
          await refundCredits(
            session.user.id,
            config.cost,
            `${config.creditDescription} — iade (${reason})`,
          );
        };

        try {
          // Build prompt & call Claude
          //
          // - `system` array formatında: prompt caching (ephemeral, 5 dk TTL)
          //   için `cache_control` eklemek gerekiyor. Ardışık tool çağrılarında
          //   input %90 ucuza geliyor (read $0.30/MTok vs normal $3/MTok).
          // - `temperature: 0.5`: klinik içerik için default 1.0 çok yaratıcı;
          //   tool'larda daha deterministik çıktı hem kaliteyi tutarlı tutuyor
          //   hem output şişkinliğini azaltıyor.
          const promptCtx: ToolPromptContext = {
            therapistId: session.user.id,
            // Öğrenci alanları dışındaki serbest metinlerde (kart başlıkları, oturum
            // notları, uzmanın ek notu) geçen gerçek adı da rumuzla değiştirir.
            scrubText: (text) => (nameMap ? scrub(text, nameMap) : text) ?? "",
          };
          const userPrompt = await config.buildUserPrompt(
            data,
            student,
            ageText,
            promptCtx,
          );
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
          logUsage(
            session.user.id,
            `tools/${config.rateLimitKey}`,
            message.usage,
          );

          const rawContent = message.content[0];
          if (rawContent.type !== "text")
            throw new Error("Beklenmeyen içerik tipi");

          const parsed = extractJson(rawContent.text);
          // Rumuz → GERÇEK ad: kaydetmeden ve döndürmeden önce, iç içe tüm string'lerde
          // (başlık, hikâye cümleleri, hücre kelimeleri…). Sağlayıcı gerçek adı hiç görmedi;
          // terapist ise her yerde gerçek adı görür. Ekler bozulmaz — rumuz ses-sınıfı eşli.
          const aiContent = nameMap ? restoreNameDeep(parsed, nameMap) : parsed;

          // Enrich with metadata (async olabilir — ör. cache'ten görsel iliştirme)
          await config.enrichContent?.(aiContent, data);

          // Resolve fallback title
          const fallback =
            typeof config.fallbackTitle === "function"
              ? config.fallbackTitle(data, student)
              : (config.fallbackTitle ?? config.toolType);

          // Kartı kaydet. Kredi düşümü + defter kaydı BURADA DEĞİL — üretimden ÖNCE
          // rezerve edildi (denetim #22). Bu blok patlarsa aşağıdaki catch iade eder.
          const dbCard = await prisma.$transaction(async (tx) => {
            const resolvedCategory =
              config.categoryFromWorkArea && student
                ? student.workArea
                : config.category;

            const created = await tx.card.create({
              data: {
                title: (aiContent.title as string) ?? fallback,
                content: aiContent as Parameters<
                  typeof prisma.card.create
                >[0]["data"]["content"],
                toolType: config.toolType,
                category: resolvedCategory,
                difficulty: config.difficulty ?? "medium",
                ageGroup,
                therapistId: session.user.id,
                studentId: student?.id ?? null,
              },
            });

            return created;
          });

          held = false; // üretim tamamlandı → rezervasyon gerçek harcamaya dönüştü

          return {
            status: 200,
            body: {
              success: true,
              [config.responseKey]: aiContent,
              cardId: dbCard.id,
            },
          };
        } catch (error) {
          // AI çağrısı, JSON çözümleme, zenginleştirme ya da kayıt patladı → üretim yok,
          // hak kullanıcıya geri verilir.
          await refundReservation("üretim tamamlanamadı");
          console.error(
            `[/studio/api/tools/${config.rateLimitKey}] HATA:`,
            error,
          );
          return { status: 500, body: { error: "Bir hata oluştu" } };
        }
      });
    } catch (error) {
      console.error(`[/studio/api/tools/${config.rateLimitKey}] HATA:`, error);
      return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
    }
  };
}
