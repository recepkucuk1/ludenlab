import { Pool } from "pg";
import type { PlanType } from "@/generated/atolye/client";
import { readCentralEntitlement, shouldGrantCredits, type Entitlement } from "@ludenlab/billing";
import { prisma } from "@atolye/lib/db";
import { grantCreditsOnTx } from "@atolye/lib/credits";

/**
 * Merkezi billing DB (Studio Supabase, `billing` şeması) — SALT OKUMA (e-posta köprüsü).
 * atolye KENDİ klinik DB'sine (`ATOLYE_DATABASE_URL`) dokunmaz; bu AYRI bağlantı.
 * Tam SSO'dan önceki hafif model: atolye kullanıcısı → e-posta → merkezi Account → Subscription.
 * Prod öncesi: salt-okuma, least-privilege rol.
 */
let pool: Pool | null = null;
function centralPool(): Pool {
  if (!pool) {
    const url = process.env.CENTRAL_BILLING_DATABASE_URL ?? "";
    pool = new Pool({
      connectionString: url.replace(/[?&]schema=billing/, ""),
      ssl: url.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
      max: 2,
    });
  }
  return pool;
}

/** Bu e-postanın ATOLYE modülündeki merkezi abonelik durumu (allow/warn/choose). */
export async function centralEntitlement(email: string): Promise<Entitlement> {
  return readCentralEntitlement((text, params) => centralPool().query(text, params), email, "ATOLYE");
}

/* ─── Modül-tarafı reconcile (fulfillment) ─────────────────────────────────
 * Apex (ludenlab.com) Paynkolay ödemesi alır → merkezi `billing.Subscription` ACTIVE olur,
 * AMA atolye'nin `Account.planType`'ı güncellenmez. Bu fark "modül-tarafı reconcile" ile
 * kapatılır (studio'daki Therapist reconcile'ının atolye karşılığı):
 *  - Merkezi billing'i AYRI Supabase'den (CENTRAL_BILLING_DATABASE_URL, centralPool) okur.
 *  - ATOLYE için ACTIVE abonelik yerel planType'tan ÜSTÜNSE → yükseltir + dönem kredisini
 *    BİR KEZ verir. SADECE yükseltir (manuel/comp PRO korunur).
 *  - Kredi idempotency: yerel `Subscription(centralSubscriptionId)` çıpası = merkezi
 *    `Subscription.id` (her zaman dolu; sağlayıcı-bağımsız).
 * Best-effort: hata yutulur. Flag: NEXT_PUBLIC_CENTRAL_BILLING.
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

/** Merkezi plan kodu → atolye PlanType (kodlar enum adlarıyla birebir). */
function toPlanType(code: string): PlanType | null {
  return code === "PRO" || code === "ADVANCED" || code === "ENTERPRISE" ? (code as PlanType) : null;
}

export async function reconcileCentralEntitlement(accountId: string): Promise<void> {
  if (!CENTRAL_ON || !accountId) return;
  if (!process.env.CENTRAL_BILLING_DATABASE_URL) return; // merkez DB bağlantısı yoksa sessiz geç
  try {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { planType: true, email: true },
    });
    if (!account?.email) return;
    if ((RANK[account.planType] ?? 0) >= RANK.ENTERPRISE) return; // zaten en üst kademe

    const res = await centralPool().query(
      `SELECT sub.status,
              bp.code,
              bp.interval,
              sub."id"               AS ref,
              sub."currentPeriodEnd" AS "periodEnd"
       FROM billing."Subscription" sub
       JOIN billing."Account"     a  ON a.id  = sub."accountId"
       JOIN billing."BillingPlan" bp ON bp.id = sub."billingPlanId"
       WHERE lower(a.email) = lower($1)
         AND sub.module = 'ATOLYE'
         AND sub.status = 'ACTIVE'
       ORDER BY sub."currentPeriodEnd" DESC NULLS LAST
       LIMIT 1`,
      [account.email],
    );
    const central = res.rows[0] as CentralRow | undefined;
    if (!central) return; // aktif merkezi ATOLYE aboneliği yok → dokunma

    const target = toPlanType(central.code);
    if (!target) return;
    // planType merkezi planla BİREBİR senkron (downgrade DAHİL — central billing otorite).
    const isUpgrade = (RANK[account.planType] ?? 0) < (RANK[target] ?? 0);
    const needsSync = (RANK[account.planType] ?? 0) !== (RANK[target] ?? 0); // up VEYA down

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

      // Mirror'u oluştur/güncelle. lastCreditedPeriodEnd'e create'te DOKUNMA (null) →
      // kredi kararını aşağıdaki atomik "claim" verir (ilk-görüş + yenileme tek yoldan).
      await tx.subscription.upsert({
        where: { centralSubscriptionId: central.ref },
        create: {
          accountId,
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

      // Atomik kredi "claim": yalnız hiç yüklenmemişse (null) ya da kredilenmiş dönem geçtiyse
      // kazanır; kazananı tek SQL + satır kilidi belirler → çift-yükleme YOK.
      if (localPlan.creditAmount > 0) {
        const claim = await tx.subscription.updateMany({
          where: {
            centralSubscriptionId: central.ref,
            OR: [{ lastCreditedPeriodEnd: null }, { lastCreditedPeriodEnd: { lte: claimBefore } }],
          },
          data: { lastCreditedPeriodEnd: periodEnd },
        });
        if (claim.count === 1) {
          await grantCreditsOnTx(tx, accountId, localPlan.creditAmount, `Merkezi abonelik kredisi (${target})`);
          didGrant = true;
        }
      }

      if (isUpgrade || needsSync) {
        await tx.account.update({ where: { id: accountId }, data: { planType: target } });
      }

      return didGrant;
    });

    if (granted || isUpgrade) {
      console.log(
        `[central reconcile] ${account.email}: ${account.planType}${isUpgrade ? `→${target}` : " (yenileme)"}` +
          (granted ? ` (+${localPlan.creditAmount} kredi)` : ""),
      );
    }
  } catch (e) {
    // Best-effort — render'ı bozma.
    console.error("[central reconcile] hata:", e instanceof Error ? e.message : String(e));
  }
}
