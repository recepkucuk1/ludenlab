import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { buildCsv } from "@/lib/csv";
import { logError } from "@/lib/utils";

/**
 * Audit log CSV export — mevcut filtre setiyle eşleşen tüm kayıtlar.
 *
 * Audit listesi cursor-pagination ile sınırlı (max 200/sayfa). Yıllık raporlama
 * için tüm filtre eşleşmesini tek dosyada vermek pratik. Üst sınır: 10.000 satır
 * — daha fazlasını indirmek isteyen filtre daraltsın (tarih aralığı vb).
 *
 * Filtre query param'ları `/api/admin/audit` ile aynı semantik.
 */
const MAX_ROWS = 10000;

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

    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
    });

    const actorIds = Array.from(new Set(rows.map((r) => r.actorId).filter((x): x is string => !!x)));
    const actors = actorIds.length
      ? await prisma.therapist.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const actorMap = Object.fromEntries(actors.map((a) => [a.id, a]));

    const headers = ["Tarih", "Action", "Actor ID", "Actor Ad", "Actor Email", "Target Type", "Target ID", "IP", "Diff"];
    const keys = ["createdAt", "action", "actorId", "actorName", "actorEmail", "targetType", "targetId", "ip", "diff"];
    const flat = rows.map((r) => {
      const actor = r.actorId ? actorMap[r.actorId] : null;
      return {
        createdAt: r.createdAt,
        action: r.action,
        actorId: r.actorId ?? "system",
        actorName: actor?.name ?? "",
        actorEmail: actor?.email ?? "",
        targetType: r.targetType,
        targetId: r.targetId,
        ip: r.ip ?? "",
        diff: r.diff ?? "",
      };
    });

    const csv = buildCsv(headers, flat, keys);
    const ts = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ludenlab-audit-${ts}.csv"`,
      },
    });
  } catch (error) {
    logError("admin/audit/export", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
