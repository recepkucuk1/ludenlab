import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { rateLimit, rateLimitResponse, getClientIp } from "@/lib/rateLimit";
import { sendVerificationEmail } from "@/lib/email";
import { logError } from "@/lib/utils";
import { resendVerificationBodySchema } from "@/lib/validation";

// Email verify token 24 saat geçerli — kullanıcı sonra tıklayabilir
const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const { allowed, retryAfter } = rateLimit(`resend-verify:${ip}`, 3);
    if (!allowed) return rateLimitResponse(retryAfter);

    const body = await request.json().catch(() => null);
    const parsed = resendVerificationBodySchema.safeParse(body);

    // Geçersiz email → success dön (enumeration önlemi)
    if (!parsed.success) return NextResponse.json({ success: true });

    const { email } = parsed.data;

    const therapist = await prisma.therapist.findUnique({
      where: { email },
      select: { id: true, emailVerified: true },
    });

    // emailVerified ise veya kullanıcı yoksa success dön
    if (!therapist || therapist.emailVerified) {
      return NextResponse.json({ success: true });
    }

    const plainToken = crypto.randomUUID();
    const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");
    const verifyExpires = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);

    await prisma.therapist.update({
      where: { id: therapist.id },
      data: { emailVerifyToken: tokenHash, emailVerifyExpires: verifyExpires },
    });

    try {
      await sendVerificationEmail(email, plainToken);
    } catch (emailErr) {
      logError("[resend-verification] Email gönderilemedi", emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("POST /api/auth/resend-verification", error);
    return NextResponse.json({ error: "Hata oluştu." }, { status: 500 });
  }
}
