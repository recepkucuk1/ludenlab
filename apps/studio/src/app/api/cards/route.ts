import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit") ?? "1000", 10)));
    const skip  = (page - 1) * limit;

    const [total, cards] = await Promise.all([
      prisma.card.count({ where: { therapistId: session.user.id } }),
      prisma.card.findMany({
        where: { therapistId: session.user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          category: true,
          toolType: true,
          difficulty: true,
          ageGroup: true,
          createdAt: true,
          curriculumGoalIds: true,
          content: true,
          student: { select: { id: true, name: true } },
          _count: { select: { assignments: true } },
        },
      }),
    ]);

    return NextResponse.json({ cards, total, page, hasMore: skip + limit < total });
  } catch (error) {
    logError("GET /api/cards", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
