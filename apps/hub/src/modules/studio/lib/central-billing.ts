import type { PlanType } from "@/generated/studio/client";
import { prisma } from "@studio/lib/db";
import { grantCredits } from "@studio/lib/credits";

/**
 * Merkezi billing köprüsü (e-posta).
 *
 * Apex (ludenlab.com) ödeme alır → `billing.Subscription` oluşur, AMA studio'nun
 * `Therapist.planType`'ı güncellenmez (checkout artık apex'te; eski yerel iyzico
 * callback'i ölü). Bu fonksiyon farkı kapatır — "modül-tarafı reconcile":
 *
 *  - Aynı Supabase'in `billing` şemasını e-posta ile okur (AYRI bağlantı YOK;
 *    studio'nun kendi Prisma connection'ı + $queryRaw — DB kullanıcısı ortak).
 *  - STUDIO için ACTIVE merkezi abonelik yerel planType'tan ÜSTÜNSE → yükseltir
 *    (planType + studentLimit + pdfEnabled) ve dönem kredisini BİR KEZ verir.
 *  - SADECE yükseltir, asla düşürmez → manuel/comp PRO grant'leri korunur.
 *  - Kredi idempotency: yerel `Subscription(iyzicoSubscriptionRef)` ilk kez
 *    yaratılırken verilir; sonraki render'larda tekrar verilmez.
 *
 * Best-effort: her hata yutulur, sayfa render'ını ASLA bozmaz.
 * Flag: NEXT_PUBLIC_CENTRAL_BILLING === "true".
 */

const CENTRAL_ON = process.env.NEXT_PUBLIC_CENTRAL_BILLING === "true";
const RANK: Record<string, number> = { FREE: 0, PRO: 1, ADVANCED: 2, ENTERPRISE: 3 };

type CentralRow = {
  status: string;
  code: string; // billing.BillingPlan.code → "PRO" | "ADVANCED" | ...
  interval: string; // "MONTHLY" | "YEARLY"
  ref: string | null; // iyzicoSubscriptionRef
  pricingPlanRef: string | null;
  periodEnd: Date | null;
  customerRef: string | null;
};

/** Merkezi plan kodu → studio PlanType (kodlar enum adlarıyla birebir). */
function toPlanType(code: string): PlanType | null {
  return code === "PRO" || code === "ADVANCED" || code === "ENTERPRISE"
    ? (code as PlanType)
    : null;
}

export async function reconcileCentralEntitlement(therapistId: string): Promise<void> {
  if (!CENTRAL_ON || !therapistId) return;
  try {
    const therapist = await prisma.therapist.findUnique({
      where: { id: therapistId },
      select: { planType: true, email: true },
    });
    if (!therapist?.email) return;
    if ((RANK[therapist.planType] ?? 0) >= RANK.ENTERPRISE) return; // zaten en üst kademe

    const rows = await prisma.$queryRaw<CentralRow[]>`
      SELECT sub.status,
             bp.code,
             bp.interval,
             sub."iyzicoSubscriptionRef" AS ref,
             sub."iyzicoPricingPlanRef"  AS "pricingPlanRef",
             sub."currentPeriodEnd"      AS "periodEnd",
             a."iyzicoCustomerRef"       AS "customerRef"
      FROM billing."Subscription" sub
      JOIN billing."Account"     a  ON a.id  = sub."accountId"
      JOIN billing."BillingPlan" bp ON bp.id = sub."billingPlanId"
      WHERE lower(a.email) = lower(${therapist.email})
        AND sub.module = 'STUDIO'
        AND sub.status = 'ACTIVE'
      ORDER BY sub."currentPeriodEnd" DESC NULLS LAST
      LIMIT 1`;

    const central = rows[0];
    if (!central) return; // aktif merkezi abonelik yok → dokunma

    const target = toPlanType(central.code);
    if (!target) return;
    if ((RANK[therapist.planType] ?? 0) >= (RANK[target] ?? 0)) return; // yükseltme gerekmez

    const localPlan = await prisma.plan.findFirst({ where: { type: target } });
    if (!localPlan) {
      console.error("[central reconcile] eşleşen yerel Plan yok:", target);
      return;
    }

    const existing = central.ref
      ? await prisma.subscription.findUnique({
          where: { iyzicoSubscriptionRef: central.ref },
          select: { id: true },
        })
      : null;

    await prisma.$transaction(async (tx) => {
      // Yerel Subscription mirror'u (idempotency çıpası + studio /abonelik tutarlılığı).
      if (central.ref) {
        await tx.subscription.upsert({
          where: { iyzicoSubscriptionRef: central.ref },
          create: {
            therapistId,
            planId: localPlan.id,
            status: "ACTIVE",
            billingCycle: central.interval === "YEARLY" ? "YEARLY" : "MONTHLY",
            currentPeriodEnd: central.periodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            iyzicoSubscriptionRef: central.ref,
            iyzicoCustomerRef: central.customerRef,
            iyzicoPricingPlanRef: central.pricingPlanRef,
          },
          update: {
            status: "ACTIVE",
            planId: localPlan.id,
            cancelledAt: null,
            ...(central.periodEnd ? { currentPeriodEnd: central.periodEnd } : {}),
          },
        });
      }

      await tx.therapist.update({
        where: { id: therapistId },
        data: {
          planType: target,
          studentLimit: localPlan.studentLimit,
          pdfEnabled: localPlan.pdfEnabled,
        },
      });

      // Kredi: yalnızca bu merkezi aboneliği İLK kez gördüğümüzde (mirror yokken).
      if (!existing && localPlan.creditAmount > 0) {
        await grantCredits(
          therapistId,
          localPlan.creditAmount,
          `Merkezi abonelik kredisi (${target})`,
          tx,
        );
      }
    });

    console.log(
      `[central reconcile] ${therapist.email}: ${therapist.planType}→${target}` +
        (existing ? " (kredi atlandı)" : ` (+${localPlan.creditAmount} kredi)`),
    );
  } catch (e) {
    // Best-effort — render'ı bozma.
    console.error("[central reconcile] hata:", e instanceof Error ? e.message : String(e));
  }
}
