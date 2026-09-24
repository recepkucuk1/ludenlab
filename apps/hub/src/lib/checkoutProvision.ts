import { mapIyzicoSubscriptionStatus, type CheckoutFormRetrieveResult } from "@ludenlab/billing";
import { prisma } from "@/lib/db";
import { retrieveSubscription } from "@/lib/iyzico";
import { cancelAtProviderAndVerify, resolveSubscriptionPeriodEnd } from "@/lib/iyzicoOps";

/**
 * Doğrulanmış (S2S retrieve edilmiş) bir iyzico checkout'undan merkezi aboneliği kurar.
 *
 * İki çağıranı var ve AYNI kuralla çalışmaları para-kritiktir:
 *  - `/odeme/sonuc` — iyzico'nun tarayıcı üzerinden POST ettiği callback;
 *  - sweep cron'u — callback HİÇ gelmediyse (kullanıcı ödeme sonrası sekmeyi kapattı)
 *    bekleyen ödeme niyetini iyzico'ya sorup aboneliği kurtarır.
 *
 * KURALLAR (2026-09 denetimi):
 *  1. MEVCUT ABONELİĞE DOKUNMAZ. Aynı sağlayıcı ref'i zaten kayıtlıysa (callback tekrarı,
 *     yenileme, sweep ile yarış) hiçbir alan yazılmaz. Eskiden her tekrar upsert'ün
 *     `update` dalını koşturuyordu: dönem sonu ileri kayıyor (→ kredi yeniden doluyordu),
 *     `cancelledAt` siliniyor ve iptal edilmiş abonelik ACTIVE'e dönüyordu (→ sweep iyzico
 *     iptalini hiç göndermiyor, müşteriden tahsilat sürüyordu).
 *  2. DÖNEM SONU SAĞLAYICIDAN okunur (`orders[]`); okunamazsa tahmin yazılır. Tahminin
 *     gerçeğe düzeltilmesi kredi yüklemez (bkz. `creditClaimThreshold`).
 *  3. İKİNCİ CANLI ABONELİK AÇILMAZ. Hesabın bu modülde zaten canlı (iyzico ref'li
 *     ACTIVE/PAST_DUE) aboneliği varken gelen ödeme — iki sekme, geri tuşu — yeni bir
 *     yinelenen tahsilat demektir: yenisi iyzico'da iptal edilir, kayıt CANCELED olarak
 *     tutulur (iade için iz) ve alarm loglanır. İptal doğrulanamazsa ref korunur; sweep
 *     A fazı ertesi gece yeniden dener.
 */

export type ProvisionOutcome =
  | { kind: "created"; module: string; subscriptionId: string }
  | { kind: "existing"; module: string }
  | { kind: "duplicate"; module: string; providerClosed: boolean }
  | { kind: "plan_not_found" };

const LIVE = ["ACTIVE", "PAST_DUE"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: unknown }).code === "P2002";
}

/** Sağlayıcıdaki GERÇEK dönem sonu; okunamazsa plan aralığından tahmin. */
async function resolvePeriodEnd(ref: string, interval: string): Promise<Date> {
  try {
    const sub = await retrieveSubscription(ref);
    if (sub.status === "success") {
      const end = resolveSubscriptionPeriodEnd(sub);
      if (end) return end;
    }
    console.warn("[checkoutProvision] dönem sonu sağlayıcıdan okunamadı — tahmin yazılıyor", {
      retrieve: sub.status,
      errorCode: sub.errorCode,
    });
  } catch (e) {
    console.warn("[checkoutProvision] dönem sonu okunamadı — tahmin yazılıyor", e instanceof Error ? e.message : e);
  }
  return new Date(Date.now() + (interval === "YEARLY" ? 365 : 30) * DAY_MS);
}

async function rememberCustomerRef(accountId: string, customerRef: string | undefined): Promise<void> {
  if (!customerRef) return;
  // Yalnız boşsa yaz — başka bir müşteri ref'ini ezme.
  await prisma.account.updateMany({
    where: { id: accountId, iyzicoCustomerRef: null },
    data: { iyzicoCustomerRef: customerRef },
  });
}

export async function provisionFromCheckout(
  accountId: string,
  retrieved: Pick<
    CheckoutFormRetrieveResult,
    "referenceCode" | "pricingPlanReferenceCode" | "customerReferenceCode" | "subscriptionStatus"
  >,
): Promise<ProvisionOutcome> {
  const ref = retrieved.referenceCode;
  const planRef = retrieved.pricingPlanReferenceCode;
  if (!ref || !planRef) return { kind: "plan_not_found" };

  // Plan OTORİTER olarak iyzico'nun döndürdüğü ref'ten bulunur (query'e güvenme).
  const plan = await prisma.billingPlan.findUnique({ where: { iyzicoPlanRef: planRef } });
  if (!plan) {
    console.error("[checkoutProvision] eşleşen plan yok:", planRef);
    return { kind: "plan_not_found" };
  }

  // Kural 1: kayıtlı abonelik → dokunma.
  const known = await prisma.subscription.findUnique({
    where: { iyzicoSubscriptionRef: ref },
    select: { id: true },
  });
  if (known) {
    await rememberCustomerRef(accountId, retrieved.customerReferenceCode);
    return { kind: "existing", module: plan.module };
  }

  const status = mapIyzicoSubscriptionStatus(retrieved.subscriptionStatus);

  const handleDuplicate = async (): Promise<ProvisionOutcome> => {
    const provider = await cancelAtProviderAndVerify(ref);
    console.error(
      "[checkoutProvision] YİNELENEN ABONELİK — hesabın bu modülde canlı aboneliği varken ikinci ödeme alındı; " +
        "yenisi iyzico'da iptal edildi. İLK TAHSİLAT İÇİN İADE GEREKİR.",
      {
        accountId,
        module: plan.module,
        ref,
        providerClosed: provider.closed,
        observed: provider.observed,
        error: provider.error,
      },
    );
    const now = new Date();
    try {
      await prisma.subscription.create({
        data: {
          accountId,
          module: plan.module,
          billingPlanId: plan.id,
          status: "CANCELED",
          cancelledAt: now,
          // Dönem sonu "şimdi": sweep A (CANCELED + ref + dönem sonu ≤24h) iptal doğrulanamadıysa
          // ertesi gece yeniden dener, doğrulanınca ref'i temizler.
          currentPeriodEnd: now,
          iyzicoSubscriptionRef: ref,
          iyzicoPricingPlanRef: planRef,
        },
      });
    } catch (e) {
      // Eşzamanlı tekrar aynı ref'i yazdıysa kayıt zaten var — sorun değil.
      if (!isUniqueViolation(e)) throw e;
    }
    await rememberCustomerRef(accountId, retrieved.customerReferenceCode);
    return { kind: "duplicate", module: plan.module, providerClosed: provider.closed };
  };

  // Kural 3: canlı abonelik varken ikinci canlı abonelik açma.
  if (status === "ACTIVE" || status === "PAST_DUE") {
    const live = await prisma.subscription.findFirst({
      where: {
        accountId,
        module: plan.module,
        status: { in: [...LIVE] },
        iyzicoSubscriptionRef: { not: null },
      },
      select: { id: true },
    });
    if (live) return handleDuplicate();
  }

  const currentPeriodEnd = await resolvePeriodEnd(ref, plan.interval);

  try {
    const created = await prisma.subscription.create({
      data: {
        accountId,
        module: plan.module,
        billingPlanId: plan.id,
        status,
        iyzicoSubscriptionRef: ref,
        iyzicoPricingPlanRef: planRef,
        currentPeriodEnd,
      },
      select: { id: true },
    });
    await rememberCustomerRef(accountId, retrieved.customerReferenceCode);
    return { kind: "created", module: plan.module, subscriptionId: created.id };
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    // Yarış: ya aynı ref eşzamanlı yazıldı (callback ↔ sweep/webhook) ya da iki farklı
    // checkout aynı anda canlı abonelik açmaya çalıştı (0019 kısmi benzersiz indeksi).
    const raced = await prisma.subscription.findUnique({
      where: { iyzicoSubscriptionRef: ref },
      select: { id: true },
    });
    if (raced) return { kind: "existing", module: plan.module };
    return handleDuplicate();
  }
}
