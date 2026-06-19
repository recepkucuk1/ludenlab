import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@atolye/lib/db";
import { recordAudit } from "@atolye/lib/audit";

/**
 * Günlük cron — vadesi geçmiş iptal edilmiş abonelikleri kapatır (Account FREE).
 *
 * İptal deferred (bkz. /atolye/api/subscription/cancel). Paynkolay'da sağlayıcı-tarafı
 * recurring YOK → yenileme cron'u CANCELED abonelikleri çekmez; bu cron sadece dönem
 * bitince Account.planType=FREE yapar. (atolye SubscriptionStatus'te EXPIRED yok → status
 * CANCELED kalır; idempotency "Account zaten FREE değilse" filtresiyle sağlanır.)
 *
 * Zamanlama (günlük 04:00 TR):
 *   0 4 * * *  curl -sS -X POST https://ludenlab.com/atolye/api/cron/subscription-cleanup \
 *     -H "Authorization: Bearer $CRON_SECRET"
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
    where: {
      status: "CANCELED",
      currentPeriodEnd: { lte: now },
      account: { planType: { not: "FREE" } }, // idempotency: zaten FREE'ye düşmüşse atla
    },
    select: { id: true, accountId: true },
  });

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const sub of targets) {
    try {
      await prisma.account.update({ where: { id: sub.accountId }, data: { planType: "FREE" } });
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
