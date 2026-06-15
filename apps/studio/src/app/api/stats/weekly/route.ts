import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toDateStr, calculateStreak } from "@/lib/badges";
import { logError } from "@/lib/utils";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const therapistId = session.user.id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [recentProgress, cardsCreated, allCompleted] = await Promise.all([
      // Son 7 günde progress güncellenen kayıtlar
      prisma.studentProgress.findMany({
        where: { therapistId, updatedAt: { gte: sevenDaysAgo } },
        select: { studentId: true, status: true },
      }),
      // Son 7 günde üretilen kart sayısı
      prisma.card.count({
        where: { therapistId, createdAt: { gte: sevenDaysAgo } },
      }),
      // Streak için tamamlanan hedefler (son 100)
      prisma.studentProgress.findMany({
        where: { therapistId, status: "completed" },
        select: { updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
    ]);

    const studentsWorked = new Set(recentProgress.map((p) => p.studentId)).size;
    const goalsCompleted = recentProgress.filter((p) => p.status === "completed").length;

    const activeDays = new Set(allCompleted.map((p) => toDateStr(p.updatedAt)));
    const streak = calculateStreak(activeDays);

    return NextResponse.json({ studentsWorked, goalsCompleted, cardsCreated, streak });
  } catch (error) {
    logError("GET /api/stats/weekly", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
