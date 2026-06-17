import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * E-posta doğrulama: /verify-email sayfası bu ucu çağırır (token query ile).
 * Başarı → emailVerified=true + token temizlenir. Auto-login YOK (kullanıcı /giris'e döner).
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Geçersiz doğrulama linki." }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const account = await prisma.account.findUnique({
      where: { emailVerifyToken: tokenHash },
      select: { id: true, emailVerified: true, emailVerifyExpires: true },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Geçersiz veya kullanılmış doğrulama linki." },
        { status: 400 },
      );
    }

    if (account.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    if (account.emailVerifyExpires && account.emailVerifyExpires < new Date()) {
      return NextResponse.json(
        { error: "Doğrulama linkinin süresi dolmuş. Yeni link talep edin." },
        { status: 400 },
      );
    }

    await prisma.account.update({
      where: { id: account.id },
      data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpires: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("GET /api/auth/verify-email", error);
    return NextResponse.json({ error: "Doğrulama sırasında bir hata oluştu." }, { status: 500 });
  }
}
