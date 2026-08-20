import { NextRequest, NextResponse } from "next/server";
import { auth } from "@studio/auth";
import { changePasswordByEmail } from "@/lib/password";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { logError } from "@studio/lib/utils";
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

    // OTORİTE = merkezi Account (giriş onu kullanır). Modül-yerel hash'e karşı doğrulamak
    // ve yalnız onu yazmak, şifre değişikliğini ETKİSİZ bırakıyordu (2026-08 denetimi #07).
    // changePasswordByEmail: merkezi hash'e karşı doğrular → merkezi hash'i yazar →
    // sessionVersion++ (eski oturumlar düşer) → modül kopyalarını senkronlar.
    const email = session.user.email;
    if (!email) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    const result = await changePasswordByEmail(email, currentPassword, newPassword);
    if (!result.ok) {
      return result.reason === "not_found"
        ? NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 })
        : NextResponse.json({ error: "Mevcut şifre yanlış." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("PUT /studio/api/profile/password", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
