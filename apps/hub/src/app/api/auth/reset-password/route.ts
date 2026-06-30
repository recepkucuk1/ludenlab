import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit, rateLimitResponse, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(1, "Geçersiz sıfırlama linki."),
  password: z.string().min(8, "Şifre en az 8 karakter").max(200),
});

/**
 * Sıfırlama token'ı + yeni şifre → passwordHash güncellenir, token temizlenir (tek kullanımlık).
 * Token DB'de sha256 olarak saklı; gelen ham token hash'lenip aranır. Süre dolduysa reddedilir.
 * Link tıklaması e-posta sahipliğini kanıtladığından emailVerified de true yapılır (doğrulanmamış
 * kullanıcı sıfırlama sonrası giriş yapabilsin — login gate emailVerified ister).
 *
 * NOT: Login köprüde MERKEZİ Account şifresini kullanır → yalnız bunu güncellemek yeterli
 * (modül şifreleri auth'ta kullanılmaz; account/password route ile aynı davranış).
 */
export async function POST(request: NextRequest) {
  try {
    // Token tahmin/deneme saldırısına karşı IP başına sınırla.
    const { allowed, retryAfter } = rateLimit(`reset-password:${getClientIp(request.headers)}`, 5);
    if (!allowed) return rateLimitResponse(retryAfter);

    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Form geçersiz." },
        { status: 422 },
      );
    }

    const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");

    const account = await prisma.account.findUnique({
      where: { passwordResetToken: tokenHash },
      select: { id: true, passwordResetExpires: true },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Geçersiz veya kullanılmış sıfırlama linki. Yeni link talep edin." },
        { status: 400 },
      );
    }

    if (account.passwordResetExpires && account.passwordResetExpires < new Date()) {
      return NextResponse.json(
        { error: "Sıfırlama linkinin süresi dolmuş. Yeni link talep edin." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.account.update({
      where: { id: account.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        emailVerified: true, // emaillenen linke tıklamak e-posta sahipliğini kanıtlar
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/reset-password", error);
    return NextResponse.json({ error: "Şifre sıfırlanırken bir hata oluştu." }, { status: 500 });
  }
}
