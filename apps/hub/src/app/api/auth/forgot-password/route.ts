import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, rateLimitResponse, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Sıfırlama linki 1 saat geçerli.
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

/**
 * "Şifremi unuttum" — parola sıfırlama e-postası gönderir. Enumeration güvenli: hesap yoksa da
 * `{ success: true }` döner (varlık sızdırmaz). Token e-postayla HAM gider, DB'de yalnız sha256'sı
 * saklanır; süresi 1 saat. Mevcut sıfırlama token'ı varsa üzerine yazılır (son link geçerli).
 */
export async function POST(request: NextRequest) {
  try {
    // Mail-gönderen public uç → IP başına rate-limit (mail-bomb / enumeration önlemi).
    const { allowed, retryAfter } = rateLimit(`forgot-password:${getClientIp(request.headers)}`, 3);
    if (!allowed) return rateLimitResponse(retryAfter);

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: true });

    const { email } = parsed.data;

    const account = await prisma.account.findUnique({
      where: { email },
      select: { id: true },
    });

    // Hesap yoksa sessizce başarı dön (e-posta enumerasyonunu engelle).
    if (!account) return NextResponse.json({ success: true });

    const plainToken = crypto.randomUUID();
    const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");
    const resetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await prisma.account.update({
      where: { id: account.id },
      data: { passwordResetToken: tokenHash, passwordResetExpires: resetExpires },
    });

    try {
      await sendPasswordResetEmail(email, plainToken);
    } catch (mailErr) {
      console.error("[forgot-password] e-posta gönderilemedi", mailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/forgot-password", error);
    return NextResponse.json({ error: "Bir hata oluştu." }, { status: 500 });
  }
}
