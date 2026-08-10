import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cancelSubscription, upgradeSubscription } from "@/lib/iyzico";

export const runtime = "nodejs";

const ONE_DAY = 24 * 60 * 60 * 1000;

/** iyzico "zaten iptal" hatasını idempotent başarı say. */
function isAlreadyCancelled(msg: string | undefined): boolean {
  return !!msg && /already|zaten|cancel/i.test(msg);
}

/**
 * Günlük merkezi iyzico sweep cron'u (iki faz; yenilemeyi iyzico yönettiği için
 * ÇEKİM yapmaz — yalnız iyzico'ya niyet bildirir):
 *
 *  FAZ A — iptal bildirimi: kullanıcı iptali DEFERRED'dır (modül cancel rotaları yalnız
 *    DB günceller → "Devam ettir" mümkün). Dönem sonuna ≤24h kala hâlâ CANCELED ise
 *    iyzico'ya cancelSubscription → dönem sonundaki yenileme bastırılır. Dönemi geçmiş
 *    CANCELED'lar için de idempotent tekrar (Faz A kaçmışsa güvenlik ağı).
 *
 *  FAZ B — bekleyen DOWNGRADE: ACTIVE + pendingBillingPlanId + dönem sonuna ≤36h →
 *    iyzico upgradeSubscription(NOW, düşük plan) → gelecek dönem düşük fiyattan yenilenir;
 *    billingPlanId uygulanır, pending temizlenir. (Birkaç saat erken geçiş kabul edilir.)
 *
 * Zamanlama (Hostinger hPanel → Cron Jobs, günlük 03:00 TR):
 *   0 3 * * *  curl -sS -X POST https://ludenlab.com/api/iyzico/cron/sweep \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(req: NextRequest) {
  const provided = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected) {
    console.error("[iyzico sweep] CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (provided !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const in24h = new Date(now.getTime() + ONE_DAY);
  const in36h = new Date(now.getTime() + 1.5 * ONE_DAY);

  // ── FAZ A: iptal bildirimi (dönem sonu ≤24h ya da geçmiş) ──
  const cancelTargets = await prisma.subscription.findMany({
    where: {
      status: "CANCELED",
      iyzicoSubscriptionRef: { not: null },
      currentPeriodEnd: { lte: in24h },
    },
    select: { id: true, iyzicoSubscriptionRef: true },
  });
  const cancelled: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const sub of cancelTargets) {
    try {
      const r = await cancelSubscription(sub.iyzicoSubscriptionRef!);
      const ok = r.status === "success" || isAlreadyCancelled(r.errorMessage);
      if (ok) {
        // Tekrar denememek için ref'i temizle (iyzico tarafı kapandı; kayıt tarihsel kalır).
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { iyzicoSubscriptionRef: null },
        });
      } else {
        console.error("[iyzico sweep A] cancel failed", sub.id, r.errorCode, r.errorMessage);
      }
      cancelled.push({ id: sub.id, ok, error: ok ? undefined : r.errorMessage });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[iyzico sweep A] exception", sub.id, message);
      cancelled.push({ id: sub.id, ok: false, error: message });
    }
  }

  // ── FAZ B: bekleyen downgrade (dönem sonu ≤36h) ──
  const pendingTargets = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      pendingBillingPlanId: { not: null },
      iyzicoSubscriptionRef: { not: null },
      currentPeriodEnd: { lte: in36h },
    },
    select: { id: true, iyzicoSubscriptionRef: true, pendingBillingPlanId: true },
  });
  const downgraded: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const sub of pendingTargets) {
    try {
      const plan = await prisma.billingPlan.findUnique({ where: { id: sub.pendingBillingPlanId! } });
      if (!plan?.iyzicoPlanRef) {
        downgraded.push({ id: sub.id, ok: false, error: "pending_plan_unconfigured" });
        continue;
      }
      const r = await upgradeSubscription({
        subscriptionReferenceCode: sub.iyzicoSubscriptionRef!,
        newPricingPlanReferenceCode: plan.iyzicoPlanRef,
        upgradePeriod: "NOW",
      });
      if (r.status === "success") {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            billingPlanId: plan.id,
            pendingBillingPlanId: null,
            iyzicoSubscriptionRef: r.referenceCode ?? sub.iyzicoSubscriptionRef,
            iyzicoPricingPlanRef: plan.iyzicoPlanRef,
          },
        });
        downgraded.push({ id: sub.id, ok: true });
      } else {
        console.error("[iyzico sweep B] upgrade failed", sub.id, r.errorCode, r.errorMessage);
        downgraded.push({ id: sub.id, ok: false, error: r.errorMessage });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[iyzico sweep B] exception", sub.id, message);
      downgraded.push({ id: sub.id, ok: false, error: message });
    }
  }

  return NextResponse.json({
    timestamp: now.toISOString(),
    cancelNotified: cancelled,
    pendingApplied: downgraded,
  });
}
