import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { logError } from "@/lib/utils";
import { REVENUE_STATS_SINCE } from "@/lib/constants";

/**
 * Admin revenue dashboard data.
 *
 * MRR: ACTIVE sub'ları planlarıyla join'ler — MONTHLY için plan.monthlyPrice,
 * YEARLY için plan.yearlyPrice/12. Sonuçlar kuruş cinsinden döner; UI ₺'ye böler.
 * ARR = MRR × 12.
 *
 * Churn: updatedAt'a göre son N gün içinde CANCELLED/EXPIRED'a düşmüş sub
 * sayısı. Manual override `updatedAt`'ı değiştireceği için %100 doğru değil —
 * gerçek doğruluk için AuditLog state-transition diff'lerinden hesaplamak lazım.
 * Şimdilik bu yaklaşım pratiktir; admin'e dipnotla iletilir.
 *
 * Renewal risk: önümüzdeki 30 gün içinde currentPeriodEnd dolan ACTIVE sub'lar
 * + therapist enrichment. iyzico cycle hazırlığı için ana liste.
 *
 * Cutoff: tüm sub sorguları `createdAt >= REVENUE_STATS_SINCE` ile filtrelenir.
 * Test/dev döneminde oluşturulmuş sub'lar metrikleri kirletmez.
 */
export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  try {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const minus30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const minus90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [activeSubs, churn30, churn90, renewals] = await Promise.all([
      prisma.subscription.findMany({
        where: { status: "ACTIVE", createdAt: { gte: REVENUE_STATS_SINCE } },
        select: {
          id: true,
          billingCycle: true,
          currentPeriodEnd: true,
          plan: { select: { type: true, monthlyPrice: true, yearlyPrice: true } },
        },
      }),
      prisma.subscription.count({
        where: {
          status: { in: ["CANCELLED", "EXPIRED"] },
          updatedAt: { gte: minus30 },
          createdAt: { gte: REVENUE_STATS_SINCE },
        },
      }),
      prisma.subscription.count({
        where: {
          status: { in: ["CANCELLED", "EXPIRED"] },
          updatedAt: { gte: minus90 },
          createdAt: { gte: REVENUE_STATS_SINCE },
        },
      }),
      prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
          currentPeriodEnd: { gte: now, lte: in30Days },
          createdAt: { gte: REVENUE_STATS_SINCE },
        },
        orderBy: { currentPeriodEnd: "asc" },
        select: {
          id: true,
          currentPeriodEnd: true,
          billingCycle: true,
          iyzicoSubscriptionRef: true,
          therapist: { select: { id: true, name: true, email: true, planType: true } },
          plan: { select: { type: true } },
        },
      }),
    ]);

    // MRR (kuruş) — yearly'ler 12'ye bölünür
    let mrrCents = 0;
    const planBreakdown: Record<string, { count: number; mrrCents: number }> = {};
    for (const s of activeSubs) {
      const monthly = s.billingCycle === "YEARLY"
        ? Math.round(s.plan.yearlyPrice / 12)
        : s.plan.monthlyPrice;
      mrrCents += monthly;
      const key = s.plan.type;
      if (!planBreakdown[key]) planBreakdown[key] = { count: 0, mrrCents: 0 };
      planBreakdown[key].count += 1;
      planBreakdown[key].mrrCents += monthly;
    }
    const arrCents = mrrCents * 12;

    // Churn rate: dönem başındaki aktif sub sayısı ≈ şu anki aktif + dönemde düşen.
    const activeNow = activeSubs.length;
    const churnRate30 = activeNow + churn30 > 0 ? churn30 / (activeNow + churn30) : 0;

    return NextResponse.json({
      since: REVENUE_STATS_SINCE.toISOString(),
      summary: {
        mrrCents,
        arrCents,
        activeSubs: activeNow,
        churn30,
        churn90,
        churnRate30,
      },
      planBreakdown,
      renewals: renewals.map((r) => ({
        id: r.id,
        currentPeriodEnd: r.currentPeriodEnd,
        billingCycle: r.billingCycle,
        iyzicoSubscriptionRef: r.iyzicoSubscriptionRef,
        plan: r.plan.type,
        therapist: r.therapist,
      })),
    });
  } catch (error) {
    logError("admin/revenue", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
