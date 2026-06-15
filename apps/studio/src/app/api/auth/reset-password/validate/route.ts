import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/utils";

/**
 * Reset-password sayfası açılır açılmaz token'ı doğrular.
 * Şifre girmeden önce geçersiz/expired token'lar yakalanır.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ valid: false, reason: "missing" }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
      select: { expiresAt: true },
    });

    if (!resetToken) {
      return NextResponse.json({ valid: false, reason: "invalid" });
    }
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json({ valid: false, reason: "expired" });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    logError("[reset-password/validate]", error);
    return NextResponse.json({ valid: false, reason: "error" }, { status: 500 });
  }
}
