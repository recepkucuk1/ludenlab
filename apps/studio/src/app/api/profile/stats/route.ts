import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logError, formatDate } from "@/lib/utils";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const therapistId = session.user.id;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [thisMonthCards, lastMonthCards, allCards, students] = await Promise.all([
      prisma.card.findMany({
        where: { therapistId, createdAt: { gte: thisMonthStart } },
        select: { toolType: true },
      }),
      prisma.card.count({
        where: { therapistId, createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
      }),
      prisma.card.findMany({
        where: { therapistId },
        select: { toolType: true },
      }),
      prisma.student.count({ where: { therapistId } }),
    ]);

    // This month by tool type
    const thisMonthByType: Record<string, number> = {};
    for (const c of thisMonthCards) {
      thisMonthByType[c.toolType] = (thisMonthByType[c.toolType] ?? 0) + 1;
    }

    // All time by tool type
    const allTimeByType: Record<string, number> = {};
    for (const c of allCards) {
      allTimeByType[c.toolType] = (allTimeByType[c.toolType] ?? 0) + 1;
    }

    // Most used tool this month
    let topTool = "";
    let topCount = 0;
    for (const [type, count] of Object.entries(thisMonthByType)) {
      if (count > topCount) { topCount = count; topTool = type; }
    }

    // Last 3 months trend
    const months: { month: string; count: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await prisma.card.count({
        where: { therapistId, createdAt: { gte: start, lt: end } },
      });
      months.push({
        month: formatDate(start, "monthYear"),
        count,
      });
    }

    return NextResponse.json({
      thisMonth: { count: thisMonthCards.length, byToolType: thisMonthByType },
      lastMonth: { count: lastMonthCards },
      allTime: { byToolType: allTimeByType, total: allCards.length },
      topToolThisMonth: topTool,
      students,
      last3Months: months,
    });
  } catch (error) {
    logError("GET /api/profile/stats", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
