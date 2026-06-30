import type { PlanType } from "@/generated/studio/client";
import { shouldGrantCredits } from "@ludenlab/billing";
import { prisma } from "@studio/lib/db";
import { grantCredits } from "@studio/lib/credits";

/**
 * Merkezi billing köprüsü (e-posta).
 *
 * Apex (ludenlab.com) Paynkolay ödemesi alır → `billing.Subscription` ACTIVE olur, AMA
 * studio'nun `Therapist.planType`'ı güncellenmez. Bu fonksiyon farkı kapatır
 * ("modül-tarafı reconcile"):
 *  - Aynı Supabase'in `billing` şemasını e-posta ile okur (studio'nun kendi Prisma + $queryRaw).
 *  - STUDIO için ACTIVE merkezi abonelik yerel planType'tan ÜSTÜNSE → yükseltir
 *    (planType + studentLimit + pdfEnabled) ve dönem kredisini BİR KEZ verir.
 *  - SADECE yükseltir, asla düşürmez → manuel/comp PRO grant'leri korunur.
 *  - Kredi idempotency: yerel `Subscription(centralSubscriptionId)` çıpası = merkezi
 *    `Subscription.id` (sağlayıcı-bağımsız; her zaman dolu). lastCreditedPeriodEnd CAS.
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
  ref: string; // merkezi Subscription.id (idempotency çıpası — her zaman dolu)
  periodEnd: Date | null;
};

/** Merkezi plan kodu → studio PlanType (kodlar enum adlarıyla birebir). */
function toPlanType(code: string): PlanType | null {
  return code === "PRO" || code === "ADVANCED" || code === "ENTERPRISE" ? (code as PlanType) : null;
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
             sub."id"               AS ref,
             sub."currentPeriodEnd" AS "periodEnd"
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
    // planType merkezi planla BİREBİR senkron (downgrade DAHİL — central billing otorite).
    const isUpgrade = (RANK[therapist.planType] ?? 0) < (RANK[target] ?? 0);
    const needsSync = (RANK[therapist.planType] ?? 0) !== (RANK[target] ?? 0); // up VEYA down

    const localPlan = await prisma.plan.findFirst({ where: { type: target } });
    if (!localPlan) {
      console.error("[central reconcile] eşleşen yerel Plan yok:", target);
      return;
    }

    // Idempotency çıpası: yerel Subscription mirror'u (centralSubscriptionId = merkezi sub.id).
    const existing = await prisma.subscription.findUnique({
      where: { centralSubscriptionId: central.ref },
      select: { id: true, lastCreditedPeriodEnd: true },
    });

    const periodEnd = central.periodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const renewalDue = !existing || shouldGrantCredits(existing.lastCreditedPeriodEnd);

    // İş yoksa (plan aynı + kredi dönemi sürüyor + senkron gerekmiyor) her render'da yazma yapma.
    if (!isUpgrade && !renewalDue && !needsSync) return;

    const DAY = 24 * 60 * 60 * 1000;
    const claimBefore = new Date(Date.now() + DAY); // shouldGrantCredits ile aynı ~1g tampon

    const granted = await prisma.$transaction(async (tx) => {
      let didGrant = false;

      // Mirror'u oluştur/güncelle. lastCreditedPeriodEnd create'te null → kredi kararını
      // aşağıdaki atomik "claim" verir (ilk-görüş + yenileme tek yoldan).
      await tx.subscription.upsert({
        where: { centralSubscriptionId: central.ref },
        create: {
          therapistId,
          planId: localPlan.id,
          status: "ACTIVE",
          billingCycle: central.interval === "YEARLY" ? "YEARLY" : "MONTHLY",
          currentPeriodEnd: periodEnd,
          centralSubscriptionId: central.ref,
          lastCreditedPeriodEnd: null,
        },
        update: {
          status: "ACTIVE",
          planId: localPlan.id,
          cancelledAt: null,
          ...(central.periodEnd ? { currentPeriodEnd: central.periodEnd } : {}),
        },
      });

      // Atomik kredi "claim": kazananı tek SQL + satır kilidi belirler → çift-yükleme YOK.
      if (localPlan.creditAmount > 0) {
        const claim = await tx.subscription.updateMany({
          where: {
            centralSubscriptionId: central.ref,
            OR: [{ lastCreditedPeriodEnd: null }, { lastCreditedPeriodEnd: { lte: claimBefore } }],
          },
          data: { lastCreditedPeriodEnd: periodEnd },
        });
        if (claim.count === 1) {
          await grantCredits(therapistId, localPlan.creditAmount, `Merkezi abonelik kredisi (${target})`, tx);
          didGrant = true;
        }
      }

      // Plan nitelikleri aktif merkezi abonelikle hizalanır; planType yalnız yükseltmede değişir.
      await tx.therapist.update({
        where: { id: therapistId },
        data: {
          planType: target, // birebir senkron (downgrade dahil)
          studentLimit: localPlan.studentLimit,
          pdfEnabled: localPlan.pdfEnabled,
        },
      });

      return didGrant;
    });

    if (granted || isUpgrade) {
      console.log(
        `[central reconcile] ${therapist.email}: ${therapist.planType}${isUpgrade ? `→${target}` : " (yenileme)"}` +
          (granted ? ` (+${localPlan.creditAmount} kredi)` : ""),
      );
    }
  } catch (e) {
    // Best-effort — render'ı bozma.
    console.error("[central reconcile] hata:", e instanceof Error ? e.message : String(e));
  }
}
