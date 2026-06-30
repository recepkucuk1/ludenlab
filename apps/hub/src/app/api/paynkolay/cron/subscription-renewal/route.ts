import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chargeStoredCard } from "@/lib/paynkolay";

export const runtime = "nodejs";

const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * Günlük cron — Paynkolay aboneliklerini saklı kart token'ı ile yeniler (merkezi billing).
 *
 * Paynkolay native recurring SUNMAZ → yenilemeyi BİZ yönetiriz. Vadesi 24s içinde dolacak
 * (ya da geçmiş) ACTIVE + token'lı abonelikleri chargeStoredCard ile çeker:
 *   başarılı → currentPeriodEnd +interval (ACTIVE kalır)
 *   başarısız → PAST_DUE (grace; entitlement "warn" gösterir, ertesi gün tekrar denenir)
 *
 * Zamanlama (günlük 03:00 TR):
 *   0 3 * * *  curl -sS -X POST https://ludenlab.com/api/paynkolay/cron/subscription-renewal \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * İdempotency: clientRefCode dönem-deterministik (renew<subId>P<periodDay>). TODO(sandbox):
 * Paynkolay'ın duplicate clientRefCode'u reddettiği gerçek token-charge ile doğrulanmalı
 * (çift-çekim koruması) — 3DS ACS dönünce token yakalanıp test edilecek.
 */
export async function POST(req: NextRequest) {
  const provided = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected) {
    console.error("[paynkolay-renewal] CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ludenlab.com";
  const now = new Date();
  const dueBy = new Date(now.getTime() + ONE_DAY);

  const due = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      paynkolayCardToken: { not: null },
      paynkolayCustomerKey: { not: null },
      currentPeriodEnd: { lte: dueBy },
    },
    include: { billingPlan: true },
  });

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const sub of due) {
    if (!sub.billingPlan) {
      results.push({ id: sub.id, ok: false, error: "no_plan" });
      continue;
    }
    try {
      // Bekleyen plan değişimi (downgrade) varsa bu dönem ONU uygula; yoksa mevcut plan.
      const planToCharge = sub.pendingBillingPlanId
        ? await prisma.billingPlan.findUnique({ where: { id: sub.pendingBillingPlanId } })
        : sub.billingPlan;
      if (!planToCharge) {
        results.push({ id: sub.id, ok: false, error: "pending_plan_not_found" });
        continue;
      }
      const periodDay = Math.floor((sub.currentPeriodEnd ?? now).getTime() / ONE_DAY);
      const res = await chargeStoredCard({
        clientRefCode: `renew${sub.id}P${periodDay}`,
        amount: Number(planToCharge.price).toFixed(2),
        successUrl: `${baseUrl}/odeme/sonuc`,
        failUrl: `${baseUrl}/odeme/hata`,
        cardHolderIP: "0.0.0.0", // sunucu-taraf; gerçek IP yok
        csCustomerKey: sub.paynkolayCustomerKey!,
        csToken: sub.paynkolayCardToken!,
      });
      if (res.status === "success") {
        const days = planToCharge.interval === "YEARLY" ? 365 : 30;
        const base = sub.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: "ACTIVE",
            billingPlanId: planToCharge.id, // bekleyen plan uygulandı (downgrade gerçekleşti)
            pendingBillingPlanId: null,
            currentPeriodEnd: new Date(base.getTime() + days * ONE_DAY),
            paynkolayRefCode: res.referenceCode ?? sub.paynkolayRefCode,
          },
        });
        results.push({ id: sub.id, ok: true });
      } else {
        await prisma.subscription.update({ where: { id: sub.id }, data: { status: "PAST_DUE" } });
        results.push({ id: sub.id, ok: false, error: res.responseCode ?? "charge_failed" });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[paynkolay-renewal] exception", sub.id, message);
      results.push({ id: sub.id, ok: false, error: message });
    }
  }

  return NextResponse.json({
    timestamp: now.toISOString(),
    considered: due.length,
    ok: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
