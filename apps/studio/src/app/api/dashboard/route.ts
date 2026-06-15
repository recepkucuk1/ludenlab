import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/utils";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const therapistId = session.user.id;

    const [categoryGroups, recentCardsRaw, recentStudentsRaw, totalStudents] = await Promise.all([
      prisma.card.groupBy({
        by: ["category"],
        where: { therapistId },
        _count: true,
      }),
      prisma.card.findMany({
        where: { therapistId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          category: true,
          difficulty: true,
          createdAt: true,
          student: { select: { id: true, name: true } },
        },
      }),
      prisma.student.findMany({
        where: { therapistId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { cards: true } } },
      }),
      prisma.student.count({ where: { therapistId } }),
    ]);

    const byCategory: Record<string, number> = {};
    let totalCards = 0;
    for (const group of categoryGroups) {
      if (group.category) byCategory[group.category] = group._count;
      totalCards += group._count;
    }

    const recentStudents = recentStudentsRaw.map((s) => ({
      id: s.id,
      name: s.name,
      workArea: s.workArea,
      createdAt: s.createdAt,
      cardCount: s._count.cards,
    }));

    return NextResponse.json({
      stats: { students: totalStudents, cards: totalCards, byCategory },
      recentCards: recentCardsRaw,
      recentStudents,
    });
  } catch (error) {
    logError("GET /api/dashboard", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
