import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const { dataUrl } = body as { dataUrl: string };

    const ALLOWED_MIME = ["data:image/png;", "data:image/jpeg;", "data:image/webp;", "data:image/jpg;"];
    if (!dataUrl || !ALLOWED_MIME.some((m) => dataUrl.startsWith(m))) {
      return NextResponse.json({ error: "Sadece PNG, JPEG ve WebP formatları desteklenir" }, { status: 400 });
    }

    // Kaba boyut kontrolü: base64 uzunluğu / 1.33 ≈ bayt
    const approxBytes = (dataUrl.length * 3) / 4;
    if (approxBytes > 300 * 1024) {
      return NextResponse.json({ error: "Görsel 300KB'dan küçük olmalı (sıkıştırılmış)" }, { status: 400 });
    }

    await prisma.account.update({
      where: { id: session.user.id },
      data: { avatarUrl: dataUrl },
    });

    return NextResponse.json({ avatarUrl: dataUrl });
  } catch (error) {
    console.error("PUT /api/profile/avatar", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
