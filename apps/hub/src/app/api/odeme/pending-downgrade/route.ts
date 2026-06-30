import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Oturumdaki kullanıcının ZAMANLANMIŞ downgrade'leri (modül başına en çok bir tane).
 * Banner bileşeni bunu okur → "PRO'ya geçiş [tarih]'te · Vazgeç" gösterir.
 * pendingBillingPlanId merkezi billing.Subscription'da; mevcut + bekleyen plan adı çözülür.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ pending: [] });

    const subs = await prisma.subscription.findMany({
      where: { accountId: session.user.id, status: "ACTIVE", pendingBillingPlanId: { not: null } },
      include: { billingPlan: true },
      orderBy: { createdAt: "desc" },
    });
    if (!subs.length) return NextResponse.json({ pending: [] });

    // Bekleyen planları tek sorguda çöz (id → BillingPlan).
    const pendingIds = [...new Set(subs.map((s) => s.pendingBillingPlanId).filter((x): x is string => !!x))];
    const pendingPlans = await prisma.billingPlan.findMany({ where: { id: { in: pendingIds } } });
    const byId = new Map(pendingPlans.map((p) => [p.id, p]));

    // Modül başına yalnız en güncel kayıt (subs createdAt DESC sıralı).
    const seen = new Set<string>();
    const pending = subs
      .filter((s) => {
        if (seen.has(s.module)) return false;
        seen.add(s.module);
        return true;
      })
      .map((s) => {
        const pp = s.pendingBillingPlanId ? byId.get(s.pendingBillingPlanId) : undefined;
        return {
          module: s.module,
          currentPlanName: s.billingPlan?.name ?? null,
          currentPlanCode: s.billingPlan?.code ?? null,
          pendingPlanName: pp?.name ?? null,
          pendingPlanCode: pp?.code ?? null,
          appliesAt: s.currentPeriodEnd?.toISOString() ?? null,
        };
      })
      .filter((p) => p.pendingPlanCode); // bekleyen plan çözülemezse gösterme

    return NextResponse.json({ pending });
  } catch (e) {
    console.error("[odeme/pending-downgrade] error", e);
    return NextResponse.json({ pending: [] });
  }
}
