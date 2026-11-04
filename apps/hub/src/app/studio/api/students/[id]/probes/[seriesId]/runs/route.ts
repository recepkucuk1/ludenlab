// apps/hub/src/app/studio/api/students/[id]/probes/[seriesId]/runs/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/studio/client";
import { prisma } from "@studio/lib/db";
import { requireAuth, requireStudentOwnership } from "@studio/lib/auth-helpers";
import { readJsonBody } from "@/lib/bodyLimit";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { stripHtmlTags, zodError } from "@studio/lib/validation";
import { logError } from "@studio/lib/utils";
import { createRunSchema, type ProbeRunDto, type ProbeWord } from "@studio/lib/probe/schema";
import { scoreItems } from "@studio/lib/probe/score";

/* Koşu kaydı (spec §6): öğeler serinin kelime listesiyle birebir ve aynı sırada; puan sunucuda. Pasif seride de
   ölçüm alınabilir. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; seriesId: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  const limit = rateLimit(`probe:${session.user.id}`, 30);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  try {
    const { id, seriesId } = await params;
    const ownership = await requireStudentOwnership(id, session.user.id);
    if (ownership instanceof NextResponse) return ownership;

    const series = (await prisma.probeSeries.findFirst({
      where: { id: seriesId, studentId: id, therapistId: session.user.id },
      select: { id: true, words: true },
    })) as { id: string; words: unknown } | null;
    if (!series) return NextResponse.json({ error: "Seri bulunamadı" }, { status: 404 });

    const body = await readJsonBody(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const parsed = createRunSchema.safeParse(body.data);
    if (!parsed.success) return NextResponse.json({ error: zodError(parsed.error) }, { status: 400 });

    const words = (series.words as ProbeWord[]).map((w) => w.word);
    const gelen = parsed.data.items.map((i) => i.word);
    if (words.length !== gelen.length || words.some((w, i) => w !== gelen[i])) {
      return NextResponse.json({ error: "Öğeler serinin kelime listesiyle aynı sırada olmalı" }, { status: 400 });
    }
    const skor = scoreItems(parsed.data.items);
    if (skor.total === 0) return NextResponse.json({ error: "Boş prob kaydedilemez" }, { status: 400 });
    const note = parsed.data.note ? stripHtmlTags(parsed.data.note) || null : null;

    const run = (await prisma.probeRun.create({
      data: {
        seriesId: series.id,
        therapistId: session.user.id,
        items: parsed.data.items as unknown as Prisma.InputJsonValue,
        correct: skor.correct,
        total: skor.total,
        pct: skor.pct,
        cuedCount: skor.cuedCount,
        note,
      },
      select: { id: true, date: true, pct: true, correct: true, total: true, cuedCount: true, note: true },
    })) as { id: string; date: Date; pct: number; correct: number; total: number; cuedCount: number; note: string | null };
    const dto: ProbeRunDto = { ...run, date: run.date.toISOString() };
    return NextResponse.json({ run: dto }, { status: 201 });
  } catch (error) {
    logError("POST /studio/api/students/[id]/probes/[seriesId]/runs", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
