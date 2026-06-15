import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const curricula = await prisma.curriculum.findMany({
      orderBy: { code: "asc" },
      include: {
        goals: { orderBy: { code: "asc" } },
      },
    });

    return NextResponse.json({ curricula });
  } catch (error) {
    console.error("[curriculum]", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
