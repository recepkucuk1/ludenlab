import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/studio/client";
import { prisma } from "@studio/lib/db";
import { requireAdmin } from "@studio/lib/auth-helpers";
import { logError } from "@studio/lib/utils";

/**
 * Admin audit log viewer.
 *
 * Filtreler: actorId, action (exact), targetType (exact), targetId (substring),
 * tarih aralığı (createdAt). Pagination: cursor-based + take (default 50).
 * Yanıt: rows + actor enrichment map + distinct action/targetType listeleri +
 * son 24 saat / 7 gün / toplam sayım. UI dropdown'larını ve stat kartlarını besler.
 */
export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const actorId = searchParams.get("actorId") ?? undefined;
    const action = searchParams.get("action") ?? undefined;
    const targetType = searchParams.get("targetType") ?? undefined;
    const targetId = searchParams.get("targetId") ?? undefined;
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const cursor = searchParams.get("cursor") ?? undefined;
    const takeRaw = parseInt(searchParams.get("take") ?? "50");
    const take = Math.min(Math.max(takeRaw || 50, 1), 200);

    const where: Prisma.AuditLogWhereInput = {};
    if (actorId === "system") where.actorId = null;
    else if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = { contains: targetId, mode: "insensitive" };

    const createdAt: Prisma.DateTimeFilter = {};
    if (fromParam) {
      const d = new Date(fromParam);
      if (!isNaN(d.getTime())) createdAt.gte = d;
    }
    if (toParam) {
      const d = new Date(toParam);
      if (!isNaN(d.getTime())) createdAt.lte = d;
    }
    if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [rows, distinctActions, distinctTargetTypes, totalForFilter, count24h, count7d, countAll] =
      await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: take + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
        prisma.auditLog.findMany({
          distinct: ["action"],
          select: { action: true },
          orderBy: { action: "asc" },
        }),
        prisma.auditLog.findMany({
          distinct: ["targetType"],
          select: { targetType: true },
          orderBy: { targetType: "asc" },
        }),
        prisma.auditLog.count({ where }),
        prisma.auditLog.count({ where: { createdAt: { gte: dayAgo } } }),
        prisma.auditLog.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.auditLog.count(),
      ]);

    const hasMore = rows.length > take;
    const trimmed = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;

    // Actor enrichment — silinmiş kullanıcılarda relation tutmadığımız için manuel join.
    const actorIds = Array.from(
      new Set(trimmed.map((r) => r.actorId).filter((x): x is string => !!x)),
    );
    const actors = actorIds.length
      ? await prisma.therapist.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const actorMap = Object.fromEntries(actors.map((a) => [a.id, { name: a.name, email: a.email }]));

    return NextResponse.json({
      rows: trimmed,
      nextCursor,
      total: totalForFilter,
      counts: { last24h: count24h, last7d: count7d, all: countAll },
      actors: actorMap,
      distinctActions: distinctActions.map((d) => d.action),
      distinctTargetTypes: distinctTargetTypes.map((d) => d.targetType),
    });
  } catch (error) {
    logError("admin/audit", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
