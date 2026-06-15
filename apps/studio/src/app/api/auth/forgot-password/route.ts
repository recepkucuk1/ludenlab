import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { rateLimit, rateLimitResponse, getClientIp } from "@/lib/rateLimit";
import { sendPasswordResetEmail } from "@/lib/email";
import { logError } from "@/lib/utils";
import { forgotPasswordBodySchema } from "@/lib/validation";
import { getBaseUrl } from "@/lib/baseUrl";

// 30 dakika — best practice: kısa TTL
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const { allowed, retryAfter } = rateLimit(`forgot-password:${ip}`, 5);
    if (!allowed) return rateLimitResponse(retryAfter);

    const body = await request.json().catch(() => null);
    const parsed = forgotPasswordBodySchema.safeParse(body);

    // Geçersiz format → yine de success dön (enumeration önlemi)
    if (!parsed.success) return NextResponse.json({ success: true });

    const { email } = parsed.data;

    const therapist = await prisma.therapist.findUnique({ where: { email } });
    if (!therapist) return NextResponse.json({ success: true });

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    // Eski tokenları silip yenisini atomik olarak oluştur
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: therapist.id } }),
      prisma.passwordResetToken.create({
        data: { token: tokenHash, userId: therapist.id, expiresAt },
      }),
    ]);

    const resetUrl = `${getBaseUrl()}/reset-password/${token}`;

    try {
      await sendPasswordResetEmail(email, resetUrl);
    } catch (emailErr) {
      logError("[forgot-password] Email gönderilemedi", emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("[forgot-password] Beklenmeyen hata", error);
    return NextResponse.json({ error: "Bir hata oluştu, tekrar deneyin." }, { status: 500 });
  }
}
