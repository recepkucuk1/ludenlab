import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { computeBadges, toDateStr, calculateStreak, type BadgeStats } from "@/lib/badges";
import { logError } from "@/lib/utils";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const therapistId = session.user.id;

    const [totalStudents, completedProgress, workedStudents, allCards] = await Promise.all([
      prisma.student.count({ where: { therapistId } }),
      prisma.studentProgress.findMany({
        where: { therapistId, status: { in: ["completed", "mastered"] } },
        select: { studentId: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
      prisma.studentProgress.findMany({
        where: { therapistId },
        select: { studentId: true },
        distinct: ["studentId"],
        take: 100,
      }),
      prisma.card.findMany({
        where: { therapistId },
        select: { toolType: true },
      }),
    ]);

    const activeDays = new Set(completedProgress.map((p) => toDateStr(p.updatedAt)));
    const currentStreak = calculateStreak(activeDays);

    // Tool type counts
    const toolTypeCounts: Record<string, number> = {};
    for (const card of allCards) {
      toolTypeCounts[card.toolType] = (toolTypeCounts[card.toolType] ?? 0) + 1;
    }
    const uniqueToolTypes = Object.keys(toolTypeCounts).length;

    const stats: BadgeStats = {
      totalStudents,
      totalCompletedGoals: completedProgress.length,
      totalCards: allCards.length,
      currentStreak,
      uniqueStudentsWorked: workedStudents.length,
      toolTypeCounts,
      uniqueToolTypes,
    };

    return NextResponse.json({ badges: computeBadges(stats), stats });
  } catch (error) {
    logError("GET /api/stats/badges", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
