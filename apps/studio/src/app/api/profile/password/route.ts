import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { logError } from "@/lib/utils";
import { z } from "zod";

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

    const therapist = await prisma.therapist.findUnique({
      where: { id: session.user.id },
    });

    if (!therapist) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, therapist.password);
    if (!isValid) {
      return NextResponse.json({ error: "Mevcut şifre yanlış." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.therapist.update({
      where: { id: session.user.id },
      data: { password: hashed },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("PUT /api/profile/password", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
