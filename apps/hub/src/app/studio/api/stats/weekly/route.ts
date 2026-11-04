import { NextResponse } from "next/server";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { logError } from "@studio/lib/utils";

/* Haftalık pano istatistikleri. Faz 0 (2026-11): "Günlük Seri" (`streak`) kalktı — uzmana dönük dışsal
   motivasyon öğesiydi (spec 2026-11-03 §7). Yerine `goalsWorked`: son 7 günde durumu güncellenen
   öğrenci×hedef satırı sayısı. Rozet rotası (`stats/badges`) kendi seri hesabını korur. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const therapistId = session.user.id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [recentProgress, cardsCreated] = await Promise.all([
      // Son 7 günde progress güncellenen kayıtlar
      prisma.studentProgress.findMany({
        where: { therapistId, updatedAt: { gte: sevenDaysAgo } },
        select: { studentId: true, status: true },
      }),
      // Son 7 günde üretilen kart sayısı
      prisma.card.count({
        where: { therapistId, createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    const studentsWorked = new Set(recentProgress.map((p) => p.studentId)).size;
    const goalsCompleted = recentProgress.filter((p) => p.status === "completed").length;
    // `StudentProgress` öğrenci×hedef başına tek satırdır (@@unique([studentId, goalId])):
    // satır sayısı = bu hafta durumu güncellenen hedef sayısı.
    const goalsWorked = recentProgress.length;

    return NextResponse.json({ studentsWorked, goalsCompleted, cardsCreated, goalsWorked });
  } catch (error) {
    logError("GET /studio/api/stats/weekly", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
