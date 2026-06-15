import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { sendSupportConsentNotification } from "@/lib/email";
import { getBaseUrl } from "@/lib/baseUrl";
import { logError } from "@/lib/utils";

/**
 * KVKK consent endpoint — kullanıcının "destek ekibi hesabıma geçici erişebilir"
 * iznini yönetir. Aktif consent yoksa admin impersonate yapamaz (403).
 *
 *   GET    — mevcut consent durumu
 *   POST   — yeni consent ver / mevcut consent'i uzat (gün cinsinden, max 7)
 *   DELETE — consent'i hemen iptal et
 *
 * Audit: `support.consent.grant` / `support.consent.revoke`. Actor her zaman
 * kullanıcının kendisidir — admin bu endpoint'i çağıramaz (RBAC değil, eylem
 * sahipliği için).
 */
const MAX_DAYS = 7;

const grantSchema = z.object({
  days: z.number().int().min(1).max(MAX_DAYS),
  reason: z.string().min(2).max(500).optional(),
});

export async function GET() {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;

  try {
    const t = await prisma.therapist.findUnique({
      where: { id: session.user.id },
      select: { supportAccessExpiresAt: true, supportAccessReason: true },
    });
    if (!t) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

    const now = new Date();
    const active = t.supportAccessExpiresAt != null && t.supportAccessExpiresAt > now;

    return NextResponse.json({
      active,
      expiresAt: t.supportAccessExpiresAt,
      reason: t.supportAccessReason,
    });
  } catch (error) {
    logError("profile/support-access GET", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;

  try {
    const parsed = grantSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz istek (1–7 gün arası)" }, { status: 400 });
    }
    const { days, reason } = parsed.data;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.therapist.update({
        where: { id: session.user.id },
        data: {
          supportAccessExpiresAt: expiresAt,
          supportAccessReason: reason ?? null,
        },
        select: {
          id: true, name: true, email: true,
          supportAccessExpiresAt: true, supportAccessReason: true,
        },
      });
      await recordAudit(
        {
          actorId: session.user.id,
          action: "support.consent.grant",
          targetType: "therapist",
          targetId: session.user.id,
          diff: { expiresAt: expiresAt.toISOString(), days, reason: reason ?? null },
          ip: getClientIp(request.headers),
        },
        tx,
      );
      return t;
    });

    // Admin bildirimi — transaction dışında (bir mail fail ana akışı kesmesin)
    // ve cevabı bekletmeden ateşle-ve-unut yapıyoruz.
    void (async () => {
      try {
        const admins = await prisma.therapist.findMany({
          where: { role: "admin", suspended: false },
          select: { email: true },
        });
        const detailUrl = `${getBaseUrl()}/admin/users/${updated.id}`;
        await sendSupportConsentNotification(
          admins.map((a) => a.email),
          { name: updated.name, email: updated.email },
          { expiresAt, reason: reason ?? null },
          detailUrl,
        );
      } catch (e) {
        logError("[support-access] admin notify", e);
      }
    })();

    return NextResponse.json({
      active: true,
      expiresAt: updated.supportAccessExpiresAt,
      reason: updated.supportAccessReason,
    });
  } catch (error) {
    logError("profile/support-access POST", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.therapist.update({
        where: { id: session.user.id },
        data: { supportAccessExpiresAt: null, supportAccessReason: null },
      });
      await recordAudit(
        {
          actorId: session.user.id,
          action: "support.consent.revoke",
          targetType: "therapist",
          targetId: session.user.id,
          ip: getClientIp(request.headers),
        },
        tx,
      );
    });
    return NextResponse.json({ active: false, expiresAt: null, reason: null });
  } catch (error) {
    logError("profile/support-access DELETE", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
