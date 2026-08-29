import { NextRequest, NextResponse } from "next/server";
import { validateAvatarDataUrl } from "@/lib/imageDataUrl";
import { auth } from "@atolye/auth";
import { prisma } from "@atolye/lib/db";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const { dataUrl } = body as { dataUrl: string };

    // İÇERİK doğrulaması (denetim #39): eskiden yalnız `data:image/png;` ÖNEKİ
    // kontrol ediliyordu — önek istemci yazımıdır, keyfi bayt rahatça geçiyordu.
    // Artık base64'ün ilk baytları gerçekten o formatın imzası mı, sunucuda bakılır.
    const check = validateAvatarDataUrl(dataUrl, 300 * 1024);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    await prisma.account.update({
      where: { id: session.user.id },
      data: { avatarUrl: dataUrl },
    });

    return NextResponse.json({ avatarUrl: dataUrl });
  } catch (error) {
    console.error("PUT /atolye/api/profile/avatar", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
