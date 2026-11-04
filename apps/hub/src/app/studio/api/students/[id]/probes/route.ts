// apps/hub/src/app/studio/api/students/[id]/probes/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/studio/client";
import { prisma } from "@studio/lib/db";
import { requireAuth, requireStudentOwnership } from "@studio/lib/auth-helpers";
import { readJsonBody } from "@/lib/bodyLimit";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { zodError } from "@studio/lib/validation";
import { logError } from "@studio/lib/utils";
import { lookupCachedWordImage } from "@studio/lib/generateWordImage";
import { createSeriesSchema, type ProbeSeriesDto, type ProbeWord } from "@studio/lib/probe/schema";
import { BankaYetersizError, buildSeriesWords } from "@studio/lib/probe/buildSeries";

/* Ölçüm probu serileri (spec §6). AI yok, kredi yok, plan kapısı yok; sahiplik `requireStudentOwnership`. */

const LEVEL = "word";

type SeriesRow = {
  id: string; sound: string; position: string; level: string; active: boolean; words: unknown; createdAt: Date;
  runs: { id: string; date: Date; pct: number; correct: number; total: number; cuedCount: number; note: string | null }[];
};

function toDto(s: SeriesRow): ProbeSeriesDto {
  return {
    id: s.id,
    sound: s.sound,
    position: s.position as ProbeSeriesDto["position"],
    level: s.level,
    active: s.active,
    words: (s.words as ProbeWord[]) ?? [],
    createdAt: s.createdAt.toISOString(),
    runs: s.runs.map((r) => ({ id: r.id, date: r.date.toISOString(), pct: r.pct, correct: r.correct, total: r.total, cuedCount: r.cuedCount, note: r.note })),
  };
}

const SERIES_SELECT = {
  id: true, sound: true, position: true, level: true, active: true, words: true, createdAt: true,
  runs: { orderBy: { date: "asc" as const }, select: { id: true, date: true, pct: true, correct: true, total: true, cuedCount: true, note: true } },
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  try {
    const { id } = await params;
    const ownership = await requireStudentOwnership(id, session.user.id);
    if (ownership instanceof NextResponse) return ownership;

    const rows = (await prisma.probeSeries.findMany({
      where: { studentId: id, therapistId: session.user.id },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      select: SERIES_SELECT,
    })) as SeriesRow[];
    return NextResponse.json({ series: rows.map(toDto) });
  } catch (error) {
    logError("GET /studio/api/students/[id]/probes", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  const limit = rateLimit(`probe:${session.user.id}`, 30);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  try {
    const { id } = await params;
    const ownership = await requireStudentOwnership(id, session.user.id);
    if (ownership instanceof NextResponse) return ownership;

    const body = await readJsonBody(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const parsed = createSeriesSchema.safeParse(body.data);
    if (!parsed.success) return NextResponse.json({ error: zodError(parsed.error) }, { status: 400 });
    const { sound, position, count } = parsed.data;

    let words: ProbeWord[];
    try {
      words = await buildSeriesWords(sound, position, count, { lookupImage: lookupCachedWordImage });
    } catch (err) {
      if (err instanceof BankaYetersizError) return NextResponse.json({ error: err.message }, { status: 400 });
      throw err;
    }

    // Aynı anahtardaki aktif seri pasifleşir (koşuları kalır); yeni seri aktif açılır. Tek işlemde:
    // çift gönderimde iki aktif seri kalmasın (kalite incelemesi, Task 1).
    const [, created] = (await prisma.$transaction([
      prisma.probeSeries.updateMany({
        where: { studentId: id, therapistId: session.user.id, sound, position, level: LEVEL, active: true },
        data: { active: false },
      }),
      prisma.probeSeries.create({
        data: { studentId: id, therapistId: session.user.id, sound, position, level: LEVEL, words: words as unknown as Prisma.InputJsonValue, active: true },
        select: SERIES_SELECT,
      }),
    ])) as [unknown, SeriesRow];
    return NextResponse.json({ series: toDto(created) }, { status: 201 });
  } catch (error) {
    logError("POST /studio/api/students/[id]/probes", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
