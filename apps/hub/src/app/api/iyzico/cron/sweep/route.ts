import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cronAuth";
import { prisma } from "@/lib/db";
import { cancelSubscription, retrieveSubscription, upgradeSubscription } from "@/lib/iyzico";

export const runtime = "nodejs";

const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * iyzico'da aboneliğin KAPALI sayıldığı durumlar.
 * (iyzico "CANCELED" yazıyor; iki L'li varyant savunma amaçlı.)
 */
const CLOSED_AT_PROVIDER = new Set(["CANCELED", "CANCELLED", "EXPIRED"]);

/**
 * İptalin GERÇEKTEN gerçekleştiğini sağlayıcıdan doğrular (2026-08 denetimi #32).
 *
 * SORUN: eski kod iptali hata MESAJINI regex'leyerek doğruluyordu:
 *   `/already|zaten|cancel/i` → mesajında "cancel" geçen HER hata "başarı" sayılıyordu.
 * İşlemin adı zaten "cancel" olduğu için iyzico'nun olağan hata metinleri ("Subscription
 * cannot be cancelled", "not found for cancel operation"…) bu kalıba UYAR. Sonuç: iptal
 * başarısızken başarı sanılıyor, ardından `iyzicoSubscriptionRef` TEMİZLENDİĞİ için bir daha
 * hiç denenmiyordu → bizim DB'de CANCELED, iyzico'da hâlâ aktif: müşteriden tahsilat sürer.
 *
 * ÇÖZÜM: cevabı yorumlamayı tamamen bırak, DURUMU sor. Bu, kod tabanının başka yerinde
 * zaten uygulanan disiplin (bkz. /odeme/sonuc — "callback'e güvenme, S2S doğrula").
 * Doğrulanamazsa ref KORUNUR → yarınki cron tekrar dener (iptal idempotent).
 */
async function confirmCancelledAtProvider(
  ref: string,
): Promise<{ closed: boolean; observed: string }> {
  const r = await retrieveSubscription(ref);
  if (r.status !== "success") {
    return { closed: false, observed: `retrieve_failed:${r.errorCode ?? r.errorMessage ?? "?"}` };
  }
  const status = (r.subscriptionStatus ?? "").toUpperCase();
  return { closed: CLOSED_AT_PROVIDER.has(status), observed: status || "unknown" };
}

/**
 * Günlük merkezi iyzico sweep cron'u (iki faz; yenilemeyi iyzico yönettiği için
 * ÇEKİM yapmaz — yalnız iyzico'ya niyet bildirir):
 *
 *  FAZ A — iptal bildirimi: kullanıcı iptali DEFERRED'dır (modül cancel rotaları yalnız
 *    DB günceller → "Devam ettir" mümkün). Dönem sonuna ≤24h kala hâlâ CANCELED ise
 *    iyzico'ya cancelSubscription → dönem sonundaki yenileme bastırılır. Dönemi geçmiş
 *    CANCELED'lar için de idempotent tekrar (Faz A kaçmışsa güvenlik ağı).
 *
 *  FAZ B — bekleyen DOWNGRADE: ACTIVE + pendingBillingPlanId + dönem sonuna ≤36h →
 *    iyzico upgradeSubscription(NOW, düşük plan) → gelecek dönem düşük fiyattan yenilenir;
 *    billingPlanId uygulanır, pending temizlenir. (Birkaç saat erken geçiş kabul edilir.)
 *
 * Zamanlama (Hostinger hPanel → Cron Jobs, günlük 03:00 TR):
 *   0 3 * * *  curl -sS -X POST https://ludenlab.com/api/iyzico/cron/sweep \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(req: NextRequest) {
  // Sabit süreli Bearer doğrulaması (denetim #34) — ortak yardımcı.
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const now = new Date();
  const in24h = new Date(now.getTime() + ONE_DAY);
  const in36h = new Date(now.getTime() + 1.5 * ONE_DAY);

  // ── FAZ A: iptal bildirimi (dönem sonu ≤24h ya da geçmiş) ──
  const cancelTargets = await prisma.subscription.findMany({
    where: {
      status: "CANCELED",
      iyzicoSubscriptionRef: { not: null },
      currentPeriodEnd: { lte: in24h },
    },
    select: { id: true, iyzicoSubscriptionRef: true },
  });
  const cancelled: Array<{ id: string; ok: boolean; observed?: string; error?: string }> = [];
  for (const sub of cancelTargets) {
    const ref = sub.iyzicoSubscriptionRef!;
    try {
      const r = await cancelSubscription(ref);

      // Cevap ne derse desin sağlayıcıdaki GERÇEK durumu doğrula (denetim #32) — "zaten
      // iptal" durumu da buradan doğal olarak geçer, ayrıca mesaj eşlemeye gerek yok.
      const { closed, observed } = await confirmCancelledAtProvider(ref);

      if (closed) {
        // Tekrar denememek için ref'i temizle (iyzico tarafı kapandı; kayıt tarihsel kalır).
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { iyzicoSubscriptionRef: null },
        });
        cancelled.push({ id: sub.id, ok: true, observed });
      } else {
        // ref KORUNUR → yarın tekrar denenir. Sessizce "başarı" saymak, müşteriden
        // tahsilatın sürmesi demekti; görünür alarm bırakıyoruz.
        console.error(
          `[iyzico sweep A] İPTAL DOĞRULANAMADI — sub=${sub.id} ref=${ref} sağlayıcı-durumu=${observed} ` +
            `cancelYanıtı=${r.status}/${r.errorCode ?? "-"} · ref korundu, yarın tekrar denenecek`,
        );
        cancelled.push({ id: sub.id, ok: false, observed, error: r.errorMessage ?? observed });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[iyzico sweep A] exception", sub.id, message);
      cancelled.push({ id: sub.id, ok: false, error: message });
    }
  }

  // ── FAZ B: bekleyen downgrade (dönem sonu ≤36h) ──
  const pendingTargets = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      pendingBillingPlanId: { not: null },
      iyzicoSubscriptionRef: { not: null },
      currentPeriodEnd: { lte: in36h },
    },
    select: { id: true, iyzicoSubscriptionRef: true, pendingBillingPlanId: true },
  });
  const downgraded: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const sub of pendingTargets) {
    try {
      const plan = await prisma.billingPlan.findUnique({ where: { id: sub.pendingBillingPlanId! } });
      if (!plan?.iyzicoPlanRef) {
        downgraded.push({ id: sub.id, ok: false, error: "pending_plan_unconfigured" });
        continue;
      }
      const r = await upgradeSubscription({
        subscriptionReferenceCode: sub.iyzicoSubscriptionRef!,
        newPricingPlanReferenceCode: plan.iyzicoPlanRef,
        upgradePeriod: "NOW",
      });
      if (r.status === "success") {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            billingPlanId: plan.id,
            pendingBillingPlanId: null,
            iyzicoSubscriptionRef: r.referenceCode ?? sub.iyzicoSubscriptionRef,
            iyzicoPricingPlanRef: plan.iyzicoPlanRef,
          },
        });
        downgraded.push({ id: sub.id, ok: true });
      } else {
        console.error("[iyzico sweep B] upgrade failed", sub.id, r.errorCode, r.errorMessage);
        downgraded.push({ id: sub.id, ok: false, error: r.errorMessage });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[iyzico sweep B] exception", sub.id, message);
      downgraded.push({ id: sub.id, ok: false, error: message });
    }
  }

  return NextResponse.json({
    timestamp: now.toISOString(),
    cancelNotified: cancelled,
    pendingApplied: downgraded,
  });
}
