import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@atolye/auth";
import { prisma } from "@atolye/lib/db";
import { rateLimit, rateLimitResponse } from "@atolye/lib/rateLimit";

export const runtime = "nodejs";

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifre zorunludur."),
  newPassword: z.string().min(8, "Yeni şifre en az 8 karakter olmalıdır.").max(100),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { allowed, retryAfter } = rateLimit(`profile:password:${session.user.id}`, 3);
    if (!allowed) return rateLimitResponse(retryAfter);

    const parsed = passwordChangeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Geçersiz istek verisi" },
        { status: 400 }
      );
    }
    const { currentPassword, newPassword } = parsed.data;

    const account = await prisma.account.findUnique({
      where: { id: session.user.id },
    });

    if (!account) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, account.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Mevcut şifre yanlış." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.account.update({
      where: { id: session.user.id },
      data: { passwordHash: hashed },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /atolye/api/profile/password", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
