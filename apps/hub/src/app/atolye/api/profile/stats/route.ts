import { NextResponse } from "next/server";
import { auth } from "@atolye/auth";
import { prisma } from "@atolye/lib/db";

export const runtime = "nodejs";

const TR_MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const monthLabel = (d: Date) => `${TR_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const ownerId = session.user.id;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Üretilen materyaller GeneratedDocument'tir; Case (öğrenci) üzerinden hesaba bağlıdır.
    const docWhere = { case: { ownerId } };

    const [thisMonthDocs, lastMonthDocs, allDocs, students] = await Promise.all([
      prisma.generatedDocument.findMany({
        where: { ...docWhere, createdAt: { gte: thisMonthStart } },
        select: { type: true },
      }),
      prisma.generatedDocument.count({
        where: { ...docWhere, createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
      }),
      prisma.generatedDocument.findMany({
        where: docWhere,
        select: { type: true },
      }),
      prisma.case.count({ where: { ownerId } }),
    ]);

    // Bu ay tipe göre
    const thisMonthByType: Record<string, number> = {};
    for (const d of thisMonthDocs) {
      thisMonthByType[d.type] = (thisMonthByType[d.type] ?? 0) + 1;
    }

    // Tüm zamanlar tipe göre
    const allTimeByType: Record<string, number> = {};
    for (const d of allDocs) {
      allTimeByType[d.type] = (allTimeByType[d.type] ?? 0) + 1;
    }

    // Bu ay en çok kullanılan araç
    let topTool = "";
    let topCount = 0;
    for (const [type, count] of Object.entries(thisMonthByType)) {
      if (count > topCount) {
        topCount = count;
        topTool = type;
      }
    }

    // Son 3 ay trendi
    const months: { month: string; count: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await prisma.generatedDocument.count({
        where: { ...docWhere, createdAt: { gte: start, lt: end } },
      });
      months.push({ month: monthLabel(start), count });
    }

    return NextResponse.json({
      thisMonth: { count: thisMonthDocs.length, byToolType: thisMonthByType },
      lastMonth: { count: lastMonthDocs },
      allTime: { byToolType: allTimeByType, total: allDocs.length },
      topToolThisMonth: topTool,
      students,
      last3Months: months,
    });
  } catch (error) {
    console.error("GET /atolye/api/profile/stats", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
