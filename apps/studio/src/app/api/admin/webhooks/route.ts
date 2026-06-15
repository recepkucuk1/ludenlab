import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { logError } from "@/lib/utils";

/**
 * Admin webhook delivery viewer.
 *
 * Filtreler: provider, status (received|processed|failed), externalId substring,
 * tarih aralığı (receivedAt). Pagination: cursor-based + take (default 50).
 * Yanıt aynı zamanda son 30 gün için status sayımları + provider listesi döner —
 * admin sayfası stat kartları ve filter dropdown'ları için.
 */
export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") ?? undefined;
    const statusParam = searchParams.get("status") ?? undefined;
    const externalId = searchParams.get("externalId") ?? undefined;
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const cursor = searchParams.get("cursor") ?? undefined;
    const takeRaw = parseInt(searchParams.get("take") ?? "50");
    const take = Math.min(Math.max(takeRaw || 50, 1), 200);

    const allowedStatuses = ["received", "processed", "failed"];
    const status = statusParam && allowedStatuses.includes(statusParam) ? statusParam : undefined;

    const where: Prisma.WebhookDeliveryWhereInput = {};
    if (provider) where.provider = provider;
    if (status) where.status = status;
    if (externalId) where.externalId = { contains: externalId, mode: "insensitive" };

    const receivedAt: Prisma.DateTimeFilter = {};
    if (fromParam) {
      const d = new Date(fromParam);
      if (!isNaN(d.getTime())) receivedAt.gte = d;
    }
    if (toParam) {
      const d = new Date(toParam);
      if (!isNaN(d.getTime())) receivedAt.lte = d;
    }
    if (Object.keys(receivedAt).length > 0) where.receivedAt = receivedAt;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // +1 take ile fetch ediyoruz — hasMore sinyali ve nextCursor üretmek için.
    const [rows, statusCounts30d, providers, totalForFilter] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.webhookDelivery.groupBy({
        by: ["status"],
        where: { receivedAt: { gte: thirtyDaysAgo } },
        _count: { _all: true },
      }),
      prisma.webhookDelivery.findMany({
        distinct: ["provider"],
        select: { provider: true },
        orderBy: { provider: "asc" },
      }),
      prisma.webhookDelivery.count({ where }),
    ]);

    const hasMore = rows.length > take;
    const trimmed = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;

    const counts: Record<string, number> = { received: 0, processed: 0, failed: 0 };
    for (const c of statusCounts30d) {
      counts[c.status] = c._count._all;
    }

    return NextResponse.json({
      rows: trimmed,
      nextCursor,
      total: totalForFilter,
      providers: providers.map((p) => p.provider),
      counts30d: counts,
    });
  } catch (error) {
    logError("admin/webhooks", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
