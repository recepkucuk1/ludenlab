import type { PlanType, Prisma } from "@/generated/studio/client";
import { maskEmail } from "@/lib/logRedact";
import {
  creditSetDelta,
  isPastDueExpired,
  monthStartUTC,
  periodCreditAmount,
  shouldGrantCredits,
  shouldRefillFreeCredits,
  shouldRevokeModulePlan,
} from "@ludenlab/billing";
import { prisma } from "@studio/lib/db";

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
async function revokeEndedPlan(therapistId: string, planType: PlanType): Promise<boolean> {
  if (planType === "FREE") return false; // hızlı çıkış — sorgu bile atma

  const ended = await prisma.subscription.findMany({
    where: { therapistId, status: "CANCELLED", currentPeriodEnd: { lte: new Date() } },
    select: { id: true },
  });
  if (!shouldRevokeModulePlan(planType, ended.length)) return false;

  await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: { id: { in: ended.map((e) => e.id) } },
      data: { status: "EXPIRED" },
    });
    await downgradeToFree(tx, therapistId);
  });
  console.log(`[central reconcile] sona ermiş abonelik → FREE (therapist=${therapistId})`);
  return true;
}

/** FREE varsayılanları — cron ile birebir aynı (studio/api/cron/subscription-cleanup). */
async function downgradeToFree(
  tx: Prisma.TransactionClient,
  therapistId: string,
): Promise<void> {
  await tx.therapist.update({
    where: { id: therapistId },
    data: { planType: "FREE", studentLimit: 2, pdfEnabled: false },
  });
}

/**
 * ÖDEMESİ BAŞARISIZ (PAST_DUE) + grace penceresi dolmuş aboneliği FREE'ye düşürür
 * (2026-08 denetimi #24).
 *
 * Ana sorgu yalnız `status = 'ACTIVE'` satırlarını arar; PAST_DUE bir abonelik oraya
 * düşmez, yerel mirror'ı da hâlâ ACTIVE olduğu için `revokeEndedPlan` (CANCELLED arar)
 * onu YAKALAMAZ. Sonuç: kartı kalıcı başarısız olan hesap ücretli planını SÜRESİZ
 * koruyordu. Grace penceresi `@ludenlab/billing` ile ORTAK — merkezi entitlement kararı
 * ile modül planı aynı anda değişir, aralarında açık kalmaz.
 */
async function revokePastDuePlan(
  therapistId: string,
  planType: PlanType,
  email: string,
): Promise<void> {
  if (planType === "FREE") return; // hızlı çıkış — sorgu bile atma

  const rows = await prisma.$queryRaw<Array<{ ref: string; periodEnd: Date | null }>>`
    SELECT sub."id" AS ref, sub."currentPeriodEnd" AS "periodEnd"
    FROM billing."Subscription" sub
    JOIN billing."Account" a ON a.id = sub."accountId"
    WHERE lower(a.email) = lower(${email})
      AND sub.module = 'STUDIO'
      AND sub.status = 'PAST_DUE'
    ORDER BY sub."currentPeriodEnd" DESC NULLS LAST
    LIMIT 1`;

  const pastDue = rows[0];
  if (!pastDue) return; // PAST_DUE abonelik yok
  if (!isPastDueExpired(pastDue.periodEnd)) return; // grace sürüyor → erişim devam

  await prisma.$transaction(async (tx) => {
    // Mirror'ı da EXPIRED'a çek: ödeme düzelirse ana akış upsert ile ACTIVE'e döndürür
    // ve yeni dönem kredisini yeniden yükler (kendi kendine iyileşme korunur).
    await tx.subscription.updateMany({
      where: { centralSubscriptionId: pastDue.ref },
      data: { status: "EXPIRED" },
    });
    await downgradeToFree(tx, therapistId);
  });
  console.log(`[central reconcile] PAST_DUE grace doldu → FREE (therapist=${therapistId})`);
}

/**
 * Bakiyeyi hedefe ATAR (ARTIRMAZ) ve aradaki farkı deftere yazar.
 *
 * DEVRETMEME (2026-09-16 ürün kararı): Koşullar "haklar sonraki döneme devretmez" diyordu,
 * kod ise `increment` ile devrediyordu. Artık dönem başında bakiye plan hakkına eşitlenir.
 * Defter değişmezi (`bakiye = ΣEARN − ΣSPEND`) korunsun diye fark kaydedilir; artan hak
 * varsa bu kayıt HARCAMA olur. İADE yolu bu fonksiyondan GEÇMEZ — iade hâlâ artırmadır,
 * yoksa başarısız üretimin iadesi bakiyeyi eziyordu.
 */
async function setCreditsTo(
  tx: Prisma.TransactionClient,
  therapistId: string,
  target: number,
  earnReason: string,
): Promise<void> {
  const row = await tx.therapist.findUnique({ where: { id: therapistId }, select: { credits: true } });
  const delta = creditSetDelta(row?.credits ?? 0, target);
  await tx.therapist.update({ where: { id: therapistId }, data: { credits: target } });
  if (delta.kind === "none") return;
  await tx.creditTransaction.create({
    data: {
      therapistId,
      amount: delta.amount,
      type: delta.kind === "earn" ? "EARN" : "SPEND",
      description: delta.kind === "earn" ? earnReason : "Devretmeyen hak (dönem sonu sıfırlama)",
    },
  });
}

/**
 * ÜCRETSİZ PLAN AYLIK YENİLEMESİ (2026-09-16 ürün kararı).
 *
 * Ücretsiz kullanıcının merkezi aboneliği YOKTUR → dönem kredisini yükleyen ana dal ona hiç
 * uğramaz ve hak yalnız kayıtta bir kez veriliyordu; oysa fiyat kartları "ayda 2 üretim
 * hakkı" diyor. Çıpa hesabın üzerinde (`freeCreditsRenewedAt`) çünkü tutunacak abonelik
 * satırı yok. Yükleme ATOMİK: ay koşulu tek UPDATE'te → eşzamanlı render'lar çift yüklemez.
 * Cron'a bağlanmadı (bu projede cron'lar sessizce ölmüştü); render'da kendi kendine iyileşir.
 */
async function refillFreeCredits(therapistId: string): Promise<void> {
  const now = new Date();
  const me = await prisma.therapist.findUnique({
    where: { id: therapistId },
    select: { planType: true, freeCreditsRenewedAt: true },
  });
  if (!me || me.planType !== "FREE") return;
  if (!shouldRefillFreeCredits(me.freeCreditsRenewedAt, now)) return;

  const freePlan = await prisma.plan.findFirst({ where: { type: "FREE" } });
  const target = freePlan?.creditAmount ?? 0;
  if (target <= 0) return;

  await prisma.$transaction(async (tx) => {
    const claim = await tx.therapist.updateMany({
      where: {
        id: therapistId,
        planType: "FREE",
        OR: [{ freeCreditsRenewedAt: null }, { freeCreditsRenewedAt: { lt: monthStartUTC(now) } }],
      },
      data: { freeCreditsRenewedAt: now },
    });
    if (claim.count === 0) return; // başka bir render bu ayın hakkını zaten yükledi
    await setCreditsTo(tx, therapistId, target, "Ücretsiz plan aylık üretim hakkı");
  });
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
      const revoked = await revokeEndedPlan(therapistId, therapist.planType);
      // İptal edilmemiş ama ÖDEMESİ BAŞARISIZ (PAST_DUE) abonelikler de grace dolunca düşer.
      if (!revoked) await revokePastDuePlan(therapistId, therapist.planType, therapist.email);
      // Ücretsiz plandaysa (baştan ya da yukarıdaki düşüşle) bu ayın hakkını yükle.
      await refillFreeCredits(therapistId);
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

    // YILLIK DÖNEM HAKKI (2026-09 denetimi): plan tanımındaki `creditAmount` AYLIK haktır,
    // yükleme ise dönem başına bir kezdir. Yıllık abone bu yüzden vaat edilenin 1/12'sini
    // alıyordu. `-1` (sınırsız) ve `0` çarpılmaz.
    const donemHakki = periodCreditAmount(localPlan.creditAmount, central.interval);
    const donemEtiketi = central.interval === "YEARLY" ? "Yıllık" : "Aylık";

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
      if (donemHakki > 0 && creditAnchor) {
        const claim = await tx.subscription.updateMany({
          where: {
            centralSubscriptionId: central.ref,
            OR: [{ lastCreditedPeriodEnd: null }, { lastCreditedPeriodEnd: { lt: creditAnchor } }],
          },
          data: { lastCreditedPeriodEnd: creditAnchor },
        });
        if (claim.count === 1) {
          await setCreditsTo(tx, therapistId, donemHakki, `${donemEtiketi} üretim hakkı yüklemesi (${target})`);
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
        `[central reconcile] ${maskEmail(therapist.email)}: ${therapist.planType}${isUpgrade ? `→${target}` : " (yenileme)"}` +
          (granted ? ` (+${donemHakki} hak)` : ""),
      );
    }
  } catch (e) {
    // Best-effort — render'ı bozma.
    console.error("[central reconcile] hata:", e instanceof Error ? e.message : String(e));
  }
}
