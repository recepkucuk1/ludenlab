import type { PlanType } from "@/generated/studio/client";
import { shouldGrantCredits, shouldRevokeModulePlan } from "@ludenlab/billing";
import { prisma } from "@studio/lib/db";
import { grantCredits } from "@studio/lib/credits";

/**
 * Merkezi billing köprüsü (e-posta).
 *
 * Apex (ludenlab.com) ödeme alır → `billing.Subscription` ACTIVE olur, AMA
 * studio'nun `Therapist.planType`'ı güncellenmez. Bu fonksiyon farkı kapatır
 * ("modül-tarafı reconcile"):
 *  - Aynı Supabase'in `billing` şemasını e-posta ile okur (studio'nun kendi Prisma + $queryRaw).
 *  - STUDIO için ACTIVE merkezi abonelik yerel planType'tan ÜSTÜNSE → yükseltir
 *    (planType + studentLimit + pdfEnabled) ve dönem kredisini BİR KEZ verir.
 *  - Aktif merkezi abonelik VARSA planType onunla birebir senkronlanır (downgrade dahil).
 *  - Aktif abonelik YOKSA: yalnız GERÇEKTEN sona ermiş (iptal + dönemi geçmiş) aboneliği
 *    olanlar FREE'ye düşer; merkezi aboneliği hiç olmayan manuel/comp grant'lere DOKUNULMAZ.
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

/**
 * Sona ermiş aboneliği olan ücretli modül planını FREE'ye düşürür (kendi kendine iyileşme).
 *
 * `subscription-cleanup` cron'unun yaptığı işin AYNISI, ama render zamanında ve idempotent.
 * Cron prod'da hiç çalışmamıştı ve sessizce başarısızdı → entitlement'ı tek bir ops
 * artefaktına bağlı bırakmıyoruz (bkz. shouldRevokeModulePlan dokümantasyonu).
 *
 * GÜVENLİK: yalnız GERÇEKTEN sona ermiş (CANCELLED + dönemi geçmiş) mirror'ı olanlar düşer;
 * admin'in elle plan verdiği (mirror'ı olmayan) hesaplara DOKUNULMAZ.
 */
async function revokeEndedPlan(therapistId: string, planType: PlanType): Promise<void> {
  if (planType === "FREE") return; // hızlı çıkış — sorgu bile atma

  const ended = await prisma.subscription.findMany({
    where: { therapistId, status: "CANCELLED", currentPeriodEnd: { lte: new Date() } },
    select: { id: true },
  });
  if (!shouldRevokeModulePlan(planType, ended.length)) return;

  await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: { id: { in: ended.map((e) => e.id) } },
      data: { status: "EXPIRED" },
    });
    // FREE varsayılanları cron ile birebir aynı (studio/api/cron/subscription-cleanup).
    await tx.therapist.update({
      where: { id: therapistId },
      data: { planType: "FREE", studentLimit: 2, pdfEnabled: false },
    });
  });
  console.log(`[central reconcile] sona ermiş abonelik → FREE (therapist=${therapistId})`);
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
    if (!central) {
      // Aktif merkezi abonelik YOK. Eskiden burada sessizce dönülüyordu ve planType'ı
      // FREE'ye çeken TEK yol `subscription-cleanup` cron'uydu — o da prod'da hiç
      // çalışmamıştı (audit'te 0 heartbeat) → iptal + dönem bitiminden bir ay sonra bile
      // ADVANCED/PRO erişim sürüyordu. Artık entitlement her render'da kendi kendini
      // iyileştirir; cron sessizce ölse bile doğru kalır (cron toplu temizlik için kalır).
      await revokeEndedPlan(therapistId, therapist.planType);
      return;
    }

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

    // Kredi ÇIPASI yalnız GERÇEK dönem sonu olabilir. `periodEnd` fallback'i (now+30g) her
    // render'da ileri kayan HAREKETLİ bir değerdir; çıpa olarak kullanılırsa "her yenilemede
    // yeniden yükle" döngüsü doğar (P0 — 2026-08 denetimi #01). Dönem bilinmiyorsa kredi yok.
    const creditAnchor = central.periodEnd;
    const renewalDue = shouldGrantCredits(existing?.lastCreditedPeriodEnd, creditAnchor);

    // İş yoksa (mirror var + plan aynı + kredi dönemi sürüyor + senkron gerekmiyor) her
    // render'da yazma yapma. Mirror yoksa (ilk görüş) kredi olmasa da oluşturmak için devam et.
    if (existing && !isUpgrade && !renewalDue && !needsSync) return;

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
      // KOŞUL DÖNEM-TABANLI (`lt: creditAnchor`): çıpa bir kez bu dönemin sonuna yazılınca
      // aynı dönem bir daha eşleşemez → dönem başına TAM BİR yükleme (bkz. shouldGrantCredits).
      if (localPlan.creditAmount > 0 && creditAnchor) {
        const claim = await tx.subscription.updateMany({
          where: {
            centralSubscriptionId: central.ref,
            OR: [{ lastCreditedPeriodEnd: null }, { lastCreditedPeriodEnd: { lt: creditAnchor } }],
          },
          data: { lastCreditedPeriodEnd: creditAnchor },
        });
        if (claim.count === 1) {
          await grantCredits(therapistId, localPlan.creditAmount, `Aylık üretim hakkı yüklemesi (${target})`, tx);
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
          (granted ? ` (+${localPlan.creditAmount} hak)` : ""),
      );
    }
  } catch (e) {
    // Best-effort — render'ı bozma.
    console.error("[central reconcile] hata:", e instanceof Error ? e.message : String(e));
  }
}
