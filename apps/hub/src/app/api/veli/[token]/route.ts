// apps/hub/src/app/api/veli/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/studio/client";
import { prisma } from "@studio/lib/db";
import { readJsonBody } from "@/lib/bodyLimit";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { zodError } from "@studio/lib/validation";
import { logError } from "@studio/lib/utils";
import { recordAudit } from "@studio/lib/audit";
import { isTokenShape } from "@studio/lib/parentLink/token";
import { parentFeedbackSchema, type ParentFeedbackMeta } from "@studio/lib/parentLink/schema";
import { composeObservationText } from "@studio/lib/parentLink/composeText";

/* Veli sayfasının açık API'si (spec §6). Oturum YOK; yetki = aktif token. Çocuk verisi hiçbir yanıtta yok.
   Loglarda token yer almaz. */
const GECERSIZ = { error: "Bağlantı geçersiz" };

async function aktifBaglanti(token: string) {
  if (!isTokenShape(token)) return null;
  const link = await prisma.parentLink.findUnique({
    where: { token },
    select: { id: true, studentId: true, therapistId: true, active: true, therapist: { select: { name: true } } },
  });
  return link && link.active ? link : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const limit = rateLimit(`veli-get:${getClientIp(request.headers)}`, 60);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  try {
    const { token } = await params;
    const link = await aktifBaglanti(token);
    if (!link) return NextResponse.json(GECERSIZ, { status: 404 });
    return NextResponse.json({ therapistName: link.therapist.name });
  } catch (error) {
    logError("GET /api/veli/[token]", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(request.headers);
  const { token } = await params;
  if (!isTokenShape(token)) return NextResponse.json(GECERSIZ, { status: 404 });
  const l1 = rateLimit(`veli-post:${token}`, 3, 3600_000);
  if (!l1.allowed) return rateLimitResponse(l1.retryAfter);
  const l2 = rateLimit(`veli-post:${ip}`, 10, 3600_000);
  if (!l2.allowed) return rateLimitResponse(l2.retryAfter);
  try {
    const body = await readJsonBody(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const parsed = parentFeedbackSchema.safeParse(body.data);
    if (!parsed.success) return NextResponse.json({ error: zodError(parsed.error) }, { status: 400 });

    const link = await aktifBaglanti(token);
    if (!link) return NextResponse.json(GECERSIZ, { status: 404 });

    const meta: ParentFeedbackMeta = { days: parsed.data.days, easy: parsed.data.easy, hard: parsed.data.hard };
    const text = composeObservationText(parsed.data);
    await prisma.$transaction([
      prisma.studentObservation.create({
        data: { studentId: link.studentId, therapistId: link.therapistId, source: "parent", meta: meta as unknown as Prisma.InputJsonValue, text },
      }),
      prisma.parentLink.update({ where: { id: link.id }, data: { answerCount: { increment: 1 }, lastAnsweredAt: new Date() } }),
    ]);
    await recordAudit({ actorId: null, action: "parentFeedback.receive", targetType: "student", targetId: link.studentId, diff: { days: parsed.data.days }, ip });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    logError("POST /api/veli/[token]", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
