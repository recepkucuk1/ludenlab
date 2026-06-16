import { Pool } from "pg";
import type { PlanType } from "@/generated/atolye/client";
import { readCentralEntitlement, type Entitlement } from "@ludenlab/billing";
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
  return readCentralEntitlement(
    (text, params) => centralPool().query(text, params),
    email,
    "ATOLYE",
  );
}

/* ─── Modül-tarafı reconcile (fulfillment) ─────────────────────────────────
 * Apex (ludenlab.com) ödeme alır → merkezi `billing.Subscription` oluşur, AMA
 * atolye'nin `Account.planType`'ı güncellenmez (checkout apex'te; flag açıkken
 * atolye yerel iyzico callback'i devre dışı). Bu fark "modül-tarafı reconcile"
 * ile kapatılır (studio'daki Therapist reconcile'ının atolye karşılığı):
 *  - Merkezi billing'i AYRI Supabase'den (CENTRAL_BILLING_DATABASE_URL, centralPool)
 *    e-posta ile okur — studio'dan farkı: ortak DB değil, ayrı bağlantı.
 *  - ATOLYE için ACTIVE abonelik yerel planType'tan ÜSTÜNSE → yükseltir + dönem
 *    kredisini BİR KEZ verir. SADECE yükseltir (manuel/comp PRO korunur).
 *  - Kredi idempotency: yerel `Subscription(iyzicoSubscriptionRef)` çıpası.
 * Best-effort: hata yutulur, sayfa render'ını ASLA bozmaz. Flag: NEXT_PUBLIC_CENTRAL_BILLING.
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

/** Merkezi plan kodu → atolye PlanType (kodlar enum adlarıyla birebir). */
function toPlanType(code: string): PlanType | null {
  return code === "PRO" || code === "ADVANCED" || code === "ENTERPRISE" ? (code as PlanType) : null;
}

export async function reconcileCentralEntitlement(accountId: string): Promise<void> {
  if (!CENTRAL_ON || !accountId) return;
  if (!process.env.CENTRAL_BILLING_DATABASE_URL) return; // merkez DB bağlantısı yoksa sessiz geç (yarı-config)
  try {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { planType: true, email: true, iyzicoCustomerRef: true },
    });
    if (!account?.email) return;
    if ((RANK[account.planType] ?? 0) >= RANK.ENTERPRISE) return; // zaten en üst kademe

    const res = await centralPool().query(
      `SELECT sub.status,
              bp.code,
              bp.interval,
              sub."iyzicoSubscriptionRef" AS ref,
              sub."iyzicoPricingPlanRef"  AS "pricingPlanRef",
              sub."currentPeriodEnd"      AS "periodEnd",
              a."iyzicoCustomerRef"       AS "customerRef"
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
    if ((RANK[account.planType] ?? 0) >= (RANK[target] ?? 0)) return; // yükseltme gerekmez

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

    const periodEnd = central.periodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      // Yerel Subscription mirror'u (idempotency çıpası + /abonelik tutarlılığı).
      if (central.ref) {
        await tx.subscription.upsert({
          where: { iyzicoSubscriptionRef: central.ref },
          create: {
            accountId,
            planId: localPlan.id,
            status: "ACTIVE",
            billingCycle: central.interval === "YEARLY" ? "YEARLY" : "MONTHLY",
            currentPeriodEnd: periodEnd,
            iyzicoSubscriptionRef: central.ref,
            iyzicoPricingPlanRef: central.pricingPlanRef,
            lastCreditedPeriodEnd: !existing && localPlan.creditAmount > 0 ? periodEnd : null,
          },
          update: {
            status: "ACTIVE",
            planId: localPlan.id,
            cancelledAt: null,
            ...(central.periodEnd ? { currentPeriodEnd: central.periodEnd } : {}),
          },
        });
      }

      await tx.account.update({
        where: { id: accountId },
        data: {
          planType: target,
          ...(!account.iyzicoCustomerRef && central.customerRef
            ? { iyzicoCustomerRef: central.customerRef }
            : {}),
        },
      });

      // Kredi: yalnız bu merkezi aboneliği İLK kez gördüğümüzde (mirror yokken).
      if (!existing && localPlan.creditAmount > 0) {
        await grantCreditsOnTx(tx, accountId, localPlan.creditAmount, `Merkezi abonelik kredisi (${target})`);
      }
    });

    console.log(
      `[central reconcile] ${account.email}: ${account.planType}→${target}` +
        (existing ? " (kredi atlandı)" : ` (+${localPlan.creditAmount} kredi)`),
    );
  } catch (e) {
    // Best-effort — render'ı bozma.
    console.error("[central reconcile] hata:", e instanceof Error ? e.message : String(e));
  }
}
