import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { logError } from "@/lib/utils";

/**
 * Admin impersonate — destek vakaları için "bu kullanıcı olarak giriş".
 *
 * Mevcut autoLoginToken altyapısını kullanır (`auth.ts` Credentials provider'da
 * tanımlı). Plain token UI'ya döner, UI signIn'a iletir, NextAuth target user
 * olarak yeni session açar. Token tek kullanımlık (auth.ts kullandıktan sonra
 * siler) ve 5 dk TTL.
 *
 * Güvenlik:
 *   - Self-block: kendi hesabın için anlamsız
 *   - Suspended user'a giriş açılmaz (auth.ts auto-login path zaten engeller,
 *     burada erken dönüyoruz ki audit boşa kayıt edilmesin)
 *   - Email verified olmayan user'a da giriş açılmaz (aynı sebep)
 *   - Audit her zaman yazılır — bu hassas bir eylem
 *   - Rate limit: 5/dk per admin (yanlışlıkla bot impersonate engeli)
 */
const TTL_MS = 5 * 60 * 1000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;

  const { allowed, retryAfter } = rateLimit(`admin:impersonate:${session.user.id}`, 5);
  if (!allowed) return rateLimitResponse(retryAfter);

  try {
    const { id } = await params;
    if (id === session.user.id) {
      return NextResponse.json({ error: "Kendi hesabınızı impersonate edemezsiniz" }, { status: 400 });
    }

    const target = await prisma.therapist.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true,
        suspended: true, emailVerified: true,
        supportAccessExpiresAt: true, supportAccessReason: true,
      },
    });
    if (!target) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }
    if (target.suspended) {
      return NextResponse.json({ error: "Askıdaki kullanıcıya giriş yapılamaz" }, { status: 400 });
    }
    if (!target.emailVerified) {
      return NextResponse.json({ error: "Email doğrulanmamış kullanıcıya giriş yapılamaz" }, { status: 400 });
    }
    // KVKK consent kontrolü — kullanıcının açık rızası olmadan impersonate
    // edilemez. Audit'te de reason kayıt edilir.
    const now = new Date();
    if (!target.supportAccessExpiresAt || target.supportAccessExpiresAt <= now) {
      return NextResponse.json(
        { error: "Bu kullanıcı destek erişimine izin vermemiş", code: "NO_CONSENT" },
        { status: 403 },
      );
    }

    const plainToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");
    const expires = new Date(Date.now() + TTL_MS);

    await prisma.$transaction(async (tx) => {
      await tx.therapist.update({
        where: { id },
        data: { autoLoginToken: tokenHash, autoLoginExpires: expires },
      });
      await recordAudit(
        {
          actorId: session.user.id,
          action: "user.impersonate-start",
          targetType: "therapist",
          targetId: id,
          diff: {
            targetEmail: target.email,
            ttlMs: TTL_MS,
            consent: {
              expiresAt: target.supportAccessExpiresAt!.toISOString(),
              reason: target.supportAccessReason ?? null,
            },
          },
          ip: getClientIp(request.headers),
        },
        tx,
      );
    });

    return NextResponse.json({ token: plainToken, target: { id: target.id, name: target.name, email: target.email } });
  } catch (error) {
    logError("admin/impersonate", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
