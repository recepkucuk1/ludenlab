import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@studio/lib/db";
import { requireAuth } from "@studio/lib/auth-helpers";
import { isAssistantPlan } from "@studio/lib/plans";
import { ensureStudentAlias } from "@studio/lib/pseudonym";
import { observationBodySchema, stripHtmlTags, zodError } from "@studio/lib/validation";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/bodyLimit";
import { streamingJson } from "@/lib/streamingJson";
import { runAssistant } from "@studio/lib/assistant/run";
import { OBSERVATIONS_PER_DAY, trGunBaslangici } from "@studio/lib/assistant/dailyCap";
import { logError } from "@studio/lib/utils";

/**
 * Öğrenci asistanı: gözlem → günlük kaydı → AI önerileri (2026-10 tasarımı §5.1).
 * Plan kapısı: FREE 403. Günlük tavan: öğrenci başına 10 gözlem / TR takvim günü (429).
 * Kredi YOK. `observationId` verilirse yeniden deneme: insert ve tavan sayımı atlanır (gözlem başına 24 saatte 3).
 * O anki gözlem bağlam bloğunun "Son gözlemler" alanına girmez (prompt'ta ayrıca "YENİ GÖZLEM").
 */

/** Ya yeni gözlem metni ya da yeniden deneme için mevcut gözlem id'si. */
/** Gözlem başına yeniden deneme tavanı (24 saat, bellek içi). */
const RETRIES_PER_OBSERVATION = 3;

const bodySchema = z.union([observationBodySchema, z.object({ observationId: z.string().min(1) })]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  const therapistId = session.user.id;

  const { allowed, retryAfter } = rateLimit(`assistant:${therapistId}`, 5);
  if (!allowed) return rateLimitResponse(retryAfter);

  try {
    const { id } = await params;
    // Sahiplik + gerekli alanlar tek sorguda (requireStudentOwnership'in `select` tipi `undefined`'a çözülüyor).
    const student = await prisma.student.findFirst({
      where: { id, therapistId },
      select: { id: true, name: true, llmAlias: true, therapistId: true, curriculumIds: true, aiProfile: true },
    });
    if (!student) return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 });

    const therapist = await prisma.therapist.findUnique({ where: { id: therapistId }, select: { planType: true } });
    if (!therapist || !isAssistantPlan(therapist.planType)) {
      return NextResponse.json(
        { error: "Öğrenci asistanı ücretli planlarda kullanılabilir.", code: "PLAN_REQUIRED" },
        { status: 403 },
      );
    }

    const body = await readJsonBody(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const parsed = bodySchema.safeParse(body.data);
    if (!parsed.success) return NextResponse.json({ error: zodError(parsed.error) }, { status: 400 });

    // Gözlem kaydı — AI çağrısından ÖNCE (çağrı patlasa da girdi kalır). Yeniden denemede atlanır.
    let observation: { id: string; text: string; createdAt: Date };
    if ("observationId" in parsed.data) {
      // Yeniden deneme günlük tavana girmez; sınırsız Sonnet çağrısı olmasın diye gözlem başına 24 saatte 3.
      const yeniden = rateLimit(`assistant:retry:${parsed.data.observationId}`, RETRIES_PER_OBSERVATION, 24 * 3600_000);
      if (!yeniden.allowed) return rateLimitResponse(yeniden.retryAfter);
      const mevcut = await prisma.studentObservation.findFirst({
        where: { id: parsed.data.observationId, studentId: id, therapistId },
        select: { id: true, text: true, createdAt: true },
      });
      if (!mevcut) return NextResponse.json({ error: "Gözlem bulunamadı" }, { status: 404 });
      observation = mevcut;
    } else {
      const text = stripHtmlTags(parsed.data.text).trim();
      if (!text) return NextResponse.json({ error: "Gözlem boş olamaz" }, { status: 400 });
      const bugun = await prisma.studentObservation.count({
        where: { studentId: id, therapistId, createdAt: { gte: trGunBaslangici() } },
      });
      if (bugun >= OBSERVATIONS_PER_DAY) {
        return NextResponse.json(
          { error: `Bugünlük gözlem tavanı doldu (${OBSERVATIONS_PER_DAY}). Yarın devam edin.`, code: "DAILY_CAP" },
          { status: 429 },
        );
      }
      observation = await prisma.studentObservation.create({
        data: { studentId: id, therapistId, text },
        select: { id: true, text: true, createdAt: true },
      });
    }

    const llmAlias = await ensureStudentAlias({ id: student.id, name: student.name, llmAlias: student.llmAlias, therapistId });

    // Yavaş kısım SSE-heartbeat içinde (Safari 60 sn). runAssistant fırlatmaz.
    return streamingJson(async () => {
      const out = await runAssistant(prisma, {
        student: { ...student, llmAlias },
        therapistId,
        observation: observation.text,
        observationId: observation.id,
      });
      return { status: 200, body: { observation, ...out } };
    });
  } catch (error) {
    logError("POST /studio/api/students/[id]/assistant", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
