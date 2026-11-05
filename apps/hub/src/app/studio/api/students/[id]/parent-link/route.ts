// apps/hub/src/app/studio/api/students/[id]/parent-link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@studio/lib/db";
import { requireAuth, requireStudentOwnership } from "@studio/lib/auth-helpers";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { logError } from "@studio/lib/utils";
import { recordAudit } from "@studio/lib/audit";
import { getBaseUrl } from "@studio/lib/baseUrl";
import { generateToken } from "@studio/lib/parentLink/token";
import type { ParentLinkDto } from "@studio/lib/parentLink/schema";

/* Veli bağlantısı yönetimi (spec §7). Sahiplik uzman + öğrenci; plan kapısı yok. Audit diff'inde token YOK. */
type Row = { id: string; token: string; answerCount: number; lastAnsweredAt: Date | null; createdAt: Date };
const SELECT = { id: true, token: true, answerCount: true, lastAnsweredAt: true, createdAt: true };
const toDto = (r: Row): ParentLinkDto => ({
  id: r.id, url: `${getBaseUrl().replace(/\/+$/, "")}/veli/${r.token}`, answerCount: r.answerCount,
  lastAnsweredAt: r.lastAnsweredAt ? r.lastAnsweredAt.toISOString() : null, createdAt: r.createdAt.toISOString(),
});

async function kapi(request: NextRequest, params: Promise<{ id: string }>) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  const limit = rateLimit(`parent-link:${session.user.id}`, 30);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  const { id } = await params;
  const ownership = await requireStudentOwnership(id, session.user.id);
  if (ownership instanceof NextResponse) return ownership;
  return { id, therapistId: session.user.id, ip: getClientIp(request.headers) };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const k = await kapi(request, params);
  if (k instanceof Response) return k;
  try {
    const row = (await prisma.parentLink.findFirst({ where: { studentId: k.id, therapistId: k.therapistId, active: true }, select: SELECT })) as Row | null;
    return NextResponse.json({ link: row ? toDto(row) : null });
  } catch (error) {
    logError("GET /studio/api/students/[id]/parent-link", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const k = await kapi(request, params);
  if (k instanceof Response) return k;
  try {
    const now = new Date();
    let created: Row;
    try {
      // Pasifleştir + oluştur tek transaction; öğrenci başına tek aktif bağlantı kısmi tekil indeksle garanti (P2002 → 409).
      const [eski, yeni] = (await prisma.$transaction([
        prisma.parentLink.updateMany({ where: { studentId: k.id, therapistId: k.therapistId, active: true }, data: { active: false, revokedAt: now } }),
        prisma.parentLink.create({ data: { studentId: k.id, therapistId: k.therapistId, token: generateToken(), active: true }, select: SELECT }),
      ])) as [{ count: number }, Row];
      created = yeni;
      await recordAudit({ actorId: k.therapistId, action: "parentLink.create", targetType: "student", targetId: k.id, diff: { renewed: eski.count > 0 }, ip: k.ip });
    } catch (err) {
      if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
        return NextResponse.json({ error: "Bağlantı az önce oluşturuldu; sayfayı yenileyin" }, { status: 409 });
      }
      throw err;
    }
    return NextResponse.json({ link: toDto(created) }, { status: 201 });
  } catch (error) {
    logError("POST /studio/api/students/[id]/parent-link", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const k = await kapi(request, params);
  if (k instanceof Response) return k;
  try {
    const { count } = await prisma.parentLink.updateMany({ where: { studentId: k.id, therapistId: k.therapistId, active: true }, data: { active: false, revokedAt: new Date() } });
    if (count === 0) return NextResponse.json({ error: "Aktif bağlantı yok" }, { status: 404 });
    await recordAudit({ actorId: k.therapistId, action: "parentLink.revoke", targetType: "student", targetId: k.id, ip: k.ip });
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("DELETE /studio/api/students/[id]/parent-link", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
