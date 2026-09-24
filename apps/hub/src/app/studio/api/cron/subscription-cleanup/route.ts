import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cronAuth";
import { prisma } from "@studio/lib/db";
import { recordAudit } from "@studio/lib/audit";

/**
 * Günlük cron — vadesi geçmiş iptal edilmiş abonelikleri kapatır.
 *
 * İptal deferred (bkz. /studio/api/subscription/cancel): kullanıcı dönem sonuna kadar
 * erişimini korur. Sağlayıcı-tarafı recurring YOK → yenileme cron'u CANCELLED
 * abonelikleri zaten çekmez; bu cron sadece dönem bitince status=EXPIRED + Therapist FREE yapar.
 *
 * Zamanlama (günlük 04:00 TR):
 *   0 4 * * *  curl -sS -X POST https://ludenlab.com/studio/api/cron/subscription-cleanup \
 *     -H "Authorization: Bearer $CRON_SECRET"
 * İdempotent: EXPIRED'e çekilen satır sonraki sorgularda dışlanır.
 */
export async function POST(req: NextRequest) {
  // Sabit süreli Bearer doğrulaması (denetim #34) — ortak yardımcı.
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

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
        // Sonradan alınmış YENİ aktif abonelik varsa planı düşürme (2026-09 denetimi #23).
        const active = await tx.subscription.count({
          where: { therapistId: sub.therapistId, status: "ACTIVE" },
        });
        if (active > 0) return;
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
