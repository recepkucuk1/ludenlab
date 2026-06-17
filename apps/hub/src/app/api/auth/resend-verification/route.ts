import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, rateLimitResponse, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Doğrulama linki 24 saat geçerli.
const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

/**
 * Doğrulama e-postasını yeniden gönderir. Enumeration güvenli: kullanıcı yoksa ya da
 * zaten doğrulanmışsa da `{ success: true }` döner (varlık sızdırmaz).
 */
export async function POST(request: NextRequest) {
  try {
    // Mail-gönderen public uç → IP başına rate-limit (mail-bomb önlemi).
    const { allowed, retryAfter } = rateLimit(`resend-verify:${getClientIp(request.headers)}`, 3);
    if (!allowed) return rateLimitResponse(retryAfter);

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: true });

    const { email } = parsed.data;

    const account = await prisma.account.findUnique({
      where: { email },
      select: { id: true, emailVerified: true },
    });

    if (!account || account.emailVerified) {
      return NextResponse.json({ success: true });
    }

    const plainToken = crypto.randomUUID();
    const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");
    const verifyExpires = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);

    await prisma.account.update({
      where: { id: account.id },
      data: { emailVerifyToken: tokenHash, emailVerifyExpires: verifyExpires },
    });

    try {
      await sendVerificationEmail(email, plainToken);
    } catch (mailErr) {
      console.error("[resend-verification] e-posta gönderilemedi", mailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/resend-verification", error);
    return NextResponse.json({ error: "Bir hata oluştu." }, { status: 500 });
  }
}
