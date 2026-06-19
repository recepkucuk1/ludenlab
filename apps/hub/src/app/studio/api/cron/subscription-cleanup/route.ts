import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@studio/lib/db";
import { recordAudit } from "@studio/lib/audit";

/**
 * Günlük cron — vadesi geçmiş iptal edilmiş abonelikleri kapatır.
 *
 * İptal deferred (bkz. /studio/api/subscription/cancel): kullanıcı dönem sonuna kadar
 * erişimini korur. Paynkolay'da sağlayıcı-tarafı recurring YOK → yenileme cron'u CANCELLED
 * abonelikleri zaten çekmez; bu cron sadece dönem bitince status=EXPIRED + Therapist FREE yapar.
 *
 * Zamanlama (günlük 04:00 TR):
 *   0 4 * * *  curl -sS -X POST https://ludenlab.com/studio/api/cron/subscription-cleanup \
 *     -H "Authorization: Bearer $CRON_SECRET"
 * İdempotent: EXPIRED'e çekilen satır sonraki sorgularda dışlanır.
 */
export async function POST(req: NextRequest) {
  const provided = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected) {
    console.error("[cron] CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const targets = await prisma.subscription.findMany({
    where: { status: "CANCELLED", currentPeriodEnd: { lte: now } },
    select: { id: true, therapistId: true },
  });

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const sub of targets) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } });
        await tx.therapist.update({
          where: { id: sub.therapistId },
          data: { planType: "FREE", studentLimit: 2, pdfEnabled: false },
        });
      });
      results.push({ id: sub.id, ok: true });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[cron] downgrade exception", sub.id, message);
      results.push({ id: sub.id, ok: false, error: message });
    }
  }

  // Heartbeat — admin System Health "son cron çalışması"nı bu kayıttan okur.
  await recordAudit({
    actorId: null,
    action: "cron.subscription-cleanup",
    targetType: "system",
    targetId: "cron",
    diff: {
      timestamp: now.toISOString(),
      considered: targets.length,
      ok: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    },
  });

  return NextResponse.json({
    timestamp: now.toISOString(),
    considered: targets.length,
    ok: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
