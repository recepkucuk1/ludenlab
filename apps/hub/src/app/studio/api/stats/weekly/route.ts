import { NextResponse } from "next/server";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { logError } from "@studio/lib/utils";
import { TAMAMLANAN_DURUMLAR } from "@studio/lib/studentContext";

/* Haftalık pano istatistikleri. Faz 0 (2026-11): "Günlük Seri" kalktı — uzmana dönük dışsal
   motivasyon öğesiydi (spec 2026-11-03 §7). Yerine `goalsWorked`: son 7 günde kaydı (durum ya da not)
   güncellenen öğrenci×hedef satırı sayısı. Rozet rotası (`stats/badges`) kendi seri hesabını korur. */
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
    // "mastered" hedef takibinin yazdığı durum; "completed" eski kayıtların takma adı (studentContext ile aynı liste).
    const goalsCompleted = recentProgress.filter((p) => (TAMAMLANAN_DURUMLAR as readonly string[]).includes(p.status)).length;
    // `StudentProgress` öğrenci×hedef başına tek satırdır (@@unique([studentId, goalId])):
    // satır sayısı = bu hafta kaydı (durum ya da not) güncellenen hedef sayısı.
    const goalsWorked = recentProgress.length;

    return NextResponse.json({ studentsWorked, goalsCompleted, cardsCreated, goalsWorked });
  } catch (error) {
    logError("GET /studio/api/stats/weekly", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
