import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { logError } from "@/lib/utils";

/**
 * Admin System Health snapshot.
 *
 * Sinyaller:
 *   - lastCron: en son `cron.*` audit kaydı (subscription-cleanup heartbeat).
 *     24 saatten eski ise "stale" — cron muhtemelen koşmuyor.
 *   - lastWebhook: WebhookDelivery max(receivedAt). Aynı eşik (24h) "iyzico
 *     trafiği yok" sinyali.
 *   - webhook24h: status sayımları (received/processed/failed) — failed > 0
 *     uyarı olarak gösterilir.
 *   - audit24h: toplam audit hareketi — sistem aktivitesi göstergesi.
 *   - apiUsage1h: son 1 saatte API çağrı sayısı + maliyet (sentry'le birlikte
 *     yük resmi için).
 *
 * DB up/down kontrolü: bu endpoint'in cevap vermesi DB'nin ayakta olduğunu
 * söyler — ayrı bir ping eklemiyoruz.
 */
export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      lastCronRaw,
      lastWebhook,
      webhook24hCounts,
      audit24h,
      apiUsage1h,
    ] = await Promise.all([
      prisma.auditLog.findFirst({
        where: { action: { startsWith: "cron." } },
        orderBy: { createdAt: "desc" },
        select: { id: true, action: true, diff: true, createdAt: true },
      }),
      prisma.webhookDelivery.findFirst({
        orderBy: { receivedAt: "desc" },
        select: {
          id: true,
          provider: true,
          status: true,
          receivedAt: true,
          processedAt: true,
        },
      }),
      prisma.webhookDelivery.groupBy({
        by: ["status"],
        where: { receivedAt: { gte: dayAgo } },
        _count: { _all: true },
      }),
      prisma.auditLog.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.apiUsageLog.aggregate({
        where: { createdAt: { gte: hourAgo } },
        _count: { _all: true },
        _sum: { costUsd: true },
      }),
    ]);

    const webhookCounts: Record<string, number> = { received: 0, processed: 0, failed: 0 };
    for (const c of webhook24hCounts) webhookCounts[c.status] = c._count._all;

    return NextResponse.json({
      checkedAt: now.toISOString(),
      lastCron: lastCronRaw,
      lastWebhook,
      webhook24h: webhookCounts,
      audit24h,
      apiUsage1h: {
        calls: apiUsage1h._count._all,
        costUsd: Number(apiUsage1h._sum.costUsd ?? 0),
      },
    });
  } catch (error) {
    logError("admin/health", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
