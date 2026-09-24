import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cronAuth";
import { prisma } from "@/lib/db";
import { retrieveCheckoutForm, retrieveSubscription, upgradeSubscription } from "@/lib/iyzico";
import { provisionFromCheckout } from "@/lib/checkoutProvision";
import { cancelAtProviderAndVerify, resolveSubscriptionPeriodEnd } from "@/lib/iyzicoOps";
import { mapIyzicoSubscriptionStatus } from "@ludenlab/billing";

export const runtime = "nodejs";

const ONE_DAY = 24 * 60 * 60 * 1000;
/** Callback'e tanınan süre: bundan genç niyetler hâlâ tarayıcıda tamamlanıyor olabilir. */
const RECOVERY_MIN_AGE_MS = 15 * 60 * 1000;
/** Gece başına sağlayıcıya sorulan en fazla niyet (sweep'in süresini sınırlar). */
const RECOVERY_BATCH = 50;

/**
 * Günlük merkezi iyzico sweep cron'u (dört faz; yenilemeyi iyzico yönettiği için
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
 *  FAZ C — BAYAT ACTIVE senkronu: dönemi geçmiş ama hâlâ ACTIVE görünen abonelikler için
 *    sağlayıcıdan gerçek durum + dönem sonu okunur. Webhook'un tek nokta olmasının yedeği.
 *
 *  FAZ D — PENDING ödeme niyetleri: 15 dk'dan eskiler iyzico'ya sorulur, ödenmişse abonelik
 *    kurtarılır (callback hiç gelmemiş); 7 günden eski ödenmemişler silinir.
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
    const r = await cancelAtProviderAndVerify(ref);
    if (r.closed) {
      // Sağlayıcı tarafı kapandı → tekrar denememek için ref temizlenir (kayıt tarihsel kalır).
      await prisma.subscription.update({ where: { id: sub.id }, data: { iyzicoSubscriptionRef: null } });
      cancelled.push({ id: sub.id, ok: true, observed: r.observed });
    } else {
      // ref KORUNUR → yarın tekrar denenir. Sessizce "başarı" saymak, müşteriden tahsilatın
      // sürmesi demekti; görünür alarm bırakıyoruz.
      console.error(
        `[iyzico sweep A] İPTAL DOĞRULANAMADI — sub=${sub.id} ref=${ref} sağlayıcı-durumu=${r.observed} ` +
          `hata=${r.error ?? "-"} · ref korundu, yarın tekrar denenecek`,
      );
      cancelled.push({ id: sub.id, ok: false, observed: r.observed, error: r.error ?? r.observed });
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

  // ── FAZ C: dönemi GEÇMİŞ ama hâlâ ACTIVE görünenleri sağlayıcıdan senkronla ──
  // Durumu ilerleten tek kaynak webhook'tu: bildirim hiç gelmezse abonelik
  // "ACTIVE + dönem çoktan bitmiş" hâlinde donuyor (erişim süresiz açık, fatura yok,
  // kredi yüklenmiyor). Canlı veride tam olarak bu görüldü (2026-09 denetimi). Burada
  // gerçeği SAĞLAYICIYA soruyoruz; webhook'un yedeği.
  const staleTargets = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      iyzicoSubscriptionRef: { not: null },
      currentPeriodEnd: { lt: new Date(now.getTime() - ONE_DAY) },
    },
    select: { id: true, iyzicoSubscriptionRef: true },
  });
  const resynced: Array<{ id: string; ok: boolean; status?: string; periodEnd?: string | null; error?: string }> = [];
  for (const sub of staleTargets) {
    try {
      const r = await retrieveSubscription(sub.iyzicoSubscriptionRef!);
      if (r.status !== "success") {
        console.error("[iyzico sweep C] retrieve başarısız", sub.id, r.errorCode, r.errorMessage);
        resynced.push({ id: sub.id, ok: false, error: r.errorMessage ?? r.errorCode });
        continue;
      }
      const mapped = mapIyzicoSubscriptionStatus(r.subscriptionStatus);
      // Dönem sonu `orders[]`ten gelir; üst düzey endDate canlıda GELMİYOR (2026-09-21).
      const end = resolveSubscriptionPeriodEnd(r);
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: mapped, ...(end ? { currentPeriodEnd: end } : {}) },
      });
      // SESSİZ BAŞARI YOK: hâlâ ACTIVE ve tarih çözülemediyse kayıt bayat kalır → ok:false.
      if (mapped === "ACTIVE" && !end) {
        console.error(
          `[iyzico sweep C] dönem sonu çözümlenemedi — kayıt BAYAT kalıyor: sub=${sub.id}`,
        );
        resynced.push({ id: sub.id, ok: false, status: mapped, periodEnd: null, error: "period_end_cozumlenemedi" });
        continue;
      }
      if (mapped !== "ACTIVE" || end) {
        console.warn(
          `[iyzico sweep C] bayat ACTIVE senkronlandı — sub=${sub.id} sağlayıcı=${r.subscriptionStatus ?? "?"} → ${mapped}`,
        );
      }
      resynced.push({ id: sub.id, ok: true, status: mapped, periodEnd: end?.toISOString() ?? null });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[iyzico sweep C] exception", sub.id, message);
      resynced.push({ id: sub.id, ok: false, error: message });
    }
  }

  // ── FAZ D: ödeme niyetleri — önce KURTAR, sonra temizle ──
  // Her checkout bir PaymentIntent yazar; yalnız BAŞARILI callback onu CONSUMED yapar.
  // Callback tarayıcıya bağlıdır: kullanıcı ödemeden hemen sonra sekmeyi kapatırsa iyzico
  // parayı çeker ama /odeme/sonuc HİÇ çağrılmaz. Webhook'un yedeği de ilk ödemede hesabı
  // bulamaz (müşteri ref'i callback'te yazılıyordu). Eskiden bu niyetler 7 gün sonra
  // sağlayıcıya SORULMADAN siliniyordu → "para çekildi, abonelik yok" kalıcılaşıyordu.
  // Artık her PENDING niyet silinmeden önce iyzico'ya sorulur; ödenmişse abonelik,
  // callback ile AYNI kuralla (provisionFromCheckout) kurulur.
  const recoverTargets = await prisma.paymentIntent.findMany({
    where: {
      status: "PENDING",
      // Callback'in kendi işini bitirmesine zaman tanı.
      createdAt: { lt: new Date(now.getTime() - RECOVERY_MIN_AGE_MS) },
    },
    // En yeni önce: ödenmiş-ama-kaybolmuş checkout en çok son günlerde olur; terk edilmiş
    // eski formlar partiyi doldurup yenileri bekletmesin.
    orderBy: { createdAt: "desc" },
    take: RECOVERY_BATCH,
    select: { id: true, clientRefCode: true, accountId: true },
  });
  const recovered: Array<{ id: string; ok: boolean; outcome?: string; error?: string }> = [];
  for (const intent of recoverTargets) {
    try {
      const r = await retrieveCheckoutForm(intent.clientRefCode);
      // Ödenmemiş/terk edilmiş form → dokunma; 7 günü doldurunca aşağıda silinir.
      if (r.status !== "success" || !r.referenceCode) continue;

      const account = await prisma.account.findUnique({
        where: { id: intent.accountId },
        select: { id: true },
      });
      if (!account) {
        console.error(
          `[iyzico sweep D] ÖDENMİŞ checkout'un hesabı yok (silinmiş olabilir) — intent=${intent.id} · elle incele`,
        );
        recovered.push({ id: intent.id, ok: false, error: "account_missing" });
        continue;
      }

      const outcome = await provisionFromCheckout(account.id, r);
      if (outcome.kind === "plan_not_found") {
        recovered.push({ id: intent.id, ok: false, error: "plan_not_found" });
        continue;
      }
      await prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: "CONSUMED" } });
      if (outcome.kind === "created") {
        console.warn(
          `[iyzico sweep D] callback'i hiç gelmemiş ÖDENMİŞ checkout kurtarıldı — intent=${intent.id} sub=${outcome.subscriptionId}`,
        );
      }
      recovered.push({ id: intent.id, ok: outcome.kind !== "duplicate", outcome: outcome.kind });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[iyzico sweep D] exception", intent.id, message);
      recovered.push({ id: intent.id, ok: false, error: message });
    }
  }

  const staleIntents = await prisma.paymentIntent.deleteMany({
    where: { status: "PENDING", createdAt: { lt: new Date(now.getTime() - 7 * ONE_DAY) } },
  });

  return NextResponse.json({
    timestamp: now.toISOString(),
    cancelNotified: cancelled,
    pendingApplied: downgraded,
    staleActiveResynced: resynced,
    intentsRecovered: recovered,
    staleIntentsDeleted: staleIntents.count,
  });
}
