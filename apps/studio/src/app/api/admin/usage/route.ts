import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { logError } from "@/lib/utils";

/**
 * Admin global AI usage dashboard.
 *
 * Pencere: query string'teki `days` (default 30, max 90). Tek seferde tüm
 * ApiUsageLog satırlarını çekmiyoruz — JS-side tüketim sayfa istek hızını
 * bozar; bunun yerine Prisma `groupBy` ile veritabanında aggregate yapıyoruz.
 *
 * Sinyaller:
 *   - totals: cost / call / token sayımları + cache hit ratio
 *   - daily: günlük cost + call (bar grafik)
 *   - byEndpoint / byModel: pasta/bar dağılım
 *   - topUsers: top-10 maliyetli kullanıcı (therapist enrich)
 */
export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const daysRaw = parseInt(searchParams.get("days") ?? "30");
    const days = Math.min(Math.max(daysRaw || 30, 1), 90);

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);

    const where = { createdAt: { gte: since } };

    const [allLogs, byEndpoint, byModel, byTherapist] = await Promise.all([
      // Daily aggregate için satırları çekiyoruz; toplam log sayısı 30 günde
      // genelde on binlerin altındadır. Üzerinde sorun olursa raw SQL date_trunc
      // ile DB-tarafında group'la.
      prisma.apiUsageLog.findMany({
        where,
        select: {
          createdAt: true,
          costUsd: true,
          inputTokens: true,
          outputTokens: true,
          cacheReadTokens: true,
          cacheWriteTokens: true,
        },
      }),
      prisma.apiUsageLog.groupBy({
        by: ["endpoint"],
        where,
        _sum: { costUsd: true },
        _count: { _all: true },
      }),
      prisma.apiUsageLog.groupBy({
        by: ["model"],
        where,
        _sum: { costUsd: true },
        _count: { _all: true },
      }),
      prisma.apiUsageLog.groupBy({
        by: ["therapistId"],
        where,
        _sum: { costUsd: true },
        _count: { _all: true },
        orderBy: { _sum: { costUsd: "desc" } },
        take: 10,
      }),
    ]);

    const dailyMap = new Map<string, { date: string; cost: number; calls: number; cacheReads: number; inputTokens: number }>();
    let totalCost = 0;
    let totalCalls = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheReadTokens = 0;
    let totalCacheWriteTokens = 0;

    for (const l of allLogs) {
      const day = l.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(day) ?? { date: day, cost: 0, calls: 0, cacheReads: 0, inputTokens: 0 };
      const c = Number(l.costUsd);
      entry.cost += c;
      entry.calls += 1;
      entry.cacheReads += l.cacheReadTokens;
      entry.inputTokens += l.inputTokens;
      dailyMap.set(day, entry);
      totalCost += c;
      totalCalls += 1;
      totalInputTokens += l.inputTokens;
      totalOutputTokens += l.outputTokens;
      totalCacheReadTokens += l.cacheReadTokens;
      totalCacheWriteTokens += l.cacheWriteTokens;
    }

    const totalReadable = totalInputTokens + totalCacheReadTokens + totalCacheWriteTokens;
    const cacheHitRate = totalReadable > 0 ? totalCacheReadTokens / totalReadable : 0;

    // Daily array — son N gün, 0 olan günleri de doldur (grafik düzgün görünsün)
    const daily: Array<{ date: string; cost: number; calls: number }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const e = dailyMap.get(key);
      daily.push({ date: key, cost: e?.cost ?? 0, calls: e?.calls ?? 0 });
    }

    // Top-users enrichment
    const topUserIds = byTherapist.map((t) => t.therapistId);
    const therapists = topUserIds.length
      ? await prisma.therapist.findMany({
          where: { id: { in: topUserIds } },
          select: { id: true, name: true, email: true, planType: true },
        })
      : [];
    const therapistMap = Object.fromEntries(therapists.map((t) => [t.id, t]));

    return NextResponse.json({
      since: since.toISOString(),
      days,
      totals: {
        cost: totalCost,
        calls: totalCalls,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        cacheReadTokens: totalCacheReadTokens,
        cacheWriteTokens: totalCacheWriteTokens,
        cacheHitRate,
      },
      daily,
      byEndpoint: byEndpoint
        .map((g) => ({ endpoint: g.endpoint, cost: Number(g._sum.costUsd ?? 0), calls: g._count._all }))
        .sort((a, b) => b.cost - a.cost),
      byModel: byModel
        .map((g) => ({ model: g.model, cost: Number(g._sum.costUsd ?? 0), calls: g._count._all }))
        .sort((a, b) => b.cost - a.cost),
      topUsers: byTherapist.map((t) => ({
        therapistId: t.therapistId,
        cost: Number(t._sum.costUsd ?? 0),
        calls: t._count._all,
        therapist: therapistMap[t.therapistId] ?? null,
      })),
    });
  } catch (error) {
    logError("admin/usage", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
