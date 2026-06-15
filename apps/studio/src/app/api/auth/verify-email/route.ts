import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/utils";

// Auto-login token 5 dakika geçerli — verify sonrası hemen kullanılır
const AUTO_LOGIN_TTL_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Geçersiz token." }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const therapist = await prisma.therapist.findUnique({
      where: { emailVerifyToken: tokenHash },
      select: { id: true, emailVerified: true, emailVerifyExpires: true },
    });

    if (!therapist) {
      return NextResponse.json(
        { error: "Geçersiz veya süresi dolmuş doğrulama linki." },
        { status: 400 }
      );
    }

    if (therapist.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    if (therapist.emailVerifyExpires && therapist.emailVerifyExpires < new Date()) {
      return NextResponse.json(
        { error: "Doğrulama linkinin süresi dolmuş. Yeni link talep edin." },
        { status: 400 }
      );
    }

    // Auto-login için tek kullanımlık token üret
    const autoLoginPlainToken = crypto.randomBytes(32).toString("hex");
    const autoLoginHash = crypto
      .createHash("sha256")
      .update(autoLoginPlainToken)
      .digest("hex");
    const autoLoginExpires = new Date(Date.now() + AUTO_LOGIN_TTL_MS);

    await prisma.therapist.update({
      where: { id: therapist.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
        autoLoginToken: autoLoginHash,
        autoLoginExpires,
      },
    });

    return NextResponse.json({ success: true, autoLoginToken: autoLoginPlainToken });
  } catch (error) {
    logError("GET /api/auth/verify-email", error);
    return NextResponse.json({ error: "Doğrulama sırasında hata oluştu." }, { status: 500 });
  }
}
