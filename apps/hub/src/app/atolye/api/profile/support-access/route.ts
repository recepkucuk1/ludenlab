import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@atolye/auth";
import { prisma } from "@atolye/lib/db";
import { recordAudit } from "@atolye/lib/audit";
import { getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * KVKK rıza endpoint'i — kullanıcının "destek ekibi hesabıma geçici erişebilir"
 * iznini yönetir.
 *
 *   GET    — mevcut rıza durumu
 *   POST   — yeni rıza ver / mevcut rızayı uzat (gün cinsinden, max 7)
 *   DELETE — rızayı hemen iptal et
 *
 * Audit: `support.consent.grant` / `support.consent.revoke`. Actor her zaman
 * kullanıcının kendisidir. (Studio'da ayrıca admin'e e-posta gider; Atölye'de
 * mail altyapısı olmadığından bu bildirim atlanmıştır — rıza + audit tutulur.)
 */
const MAX_DAYS = 7;

const grantSchema = z.object({
  days: z.number().int().min(1).max(MAX_DAYS),
  reason: z.string().min(2).max(500).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const a = await prisma.account.findUnique({
      where: { id: session.user.id },
      select: { supportAccessExpiresAt: true, supportAccessReason: true },
    });
    if (!a) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

    const now = new Date();
    const active = a.supportAccessExpiresAt != null && a.supportAccessExpiresAt > now;

    return NextResponse.json({
      active,
      expiresAt: a.supportAccessExpiresAt,
      reason: a.supportAccessReason,
    });
  } catch (error) {
    console.error("atolye profile/support-access GET", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const parsed = grantSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz istek (1–7 gün arası)" }, { status: 400 });
    }
    const { days, reason } = parsed.data;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const updated = await prisma.account.update({
      where: { id: session.user.id },
      data: {
        supportAccessExpiresAt: expiresAt,
        supportAccessReason: reason ?? null,
      },
      select: { supportAccessExpiresAt: true, supportAccessReason: true },
    });

    // Audit best-effort (kendi içinde hata yutar; ana akışı bozmaz).
    await recordAudit({
      actorId: session.user.id,
      action: "support.consent.grant",
      targetType: "account",
      targetId: session.user.id,
      diff: { expiresAt: expiresAt.toISOString(), days, reason: reason ?? null },
      ip: getClientIp(request.headers),
    });

    return NextResponse.json({
      active: true,
      expiresAt: updated.supportAccessExpiresAt,
      reason: updated.supportAccessReason,
    });
  } catch (error) {
    console.error("atolye profile/support-access POST", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    await prisma.account.update({
      where: { id: session.user.id },
      data: { supportAccessExpiresAt: null, supportAccessReason: null },
    });

    await recordAudit({
      actorId: session.user.id,
      action: "support.consent.revoke",
      targetType: "account",
      targetId: session.user.id,
      ip: getClientIp(request.headers),
    });

    return NextResponse.json({ active: false, expiresAt: null, reason: null });
  } catch (error) {
    console.error("atolye profile/support-access DELETE", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
