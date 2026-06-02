import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const account = await prisma.account.findUnique({
      where: { id: session.user.id },
      select: { credits: true, planType: true },
    });

    if (!account) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({
      credits: account.credits,
      planType: account.planType,
    });
  } catch (error) {
    console.error("GET /api/credits", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
