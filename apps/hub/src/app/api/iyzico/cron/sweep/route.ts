import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cronAuth";
import { prisma } from "@/lib/db";
import { retrieveCheckoutForm, retrieveSubscription, upgradeSubscription } from "@/lib/iyzico";
import { provisionFromCheckout } from "@/lib/checkoutProvision";
import { cancelAtProviderAndVerify, resolveSubscriptionPeriodEnd } from "@/lib/iyzicoOps";
import { billingAlarm } from "@/lib/billingAlarm";
import { recordAudit } from "@studio/lib/audit";
import { isKnownIyzicoSubscriptionStatus, mapIyzicoSubscriptionStatus } from "@ludenlab/billing";

export const runtime = "nodejs";

const ONE_DAY = 24 * 60 * 60 * 1000;
/** Callback'e tanınan süre: bundan genç niyetler hâlâ tarayıcıda tamamlanıyor olabilir. */
const RECOVERY_MIN_AGE_MS = 15 * 60 * 1000;
/** Gece başına sağlayıcıya sorulan en fazla niyet (sweep'in süresini sınırlar). */
const RECOVERY_BATCH = 50;
/** Faz başına en fazla kayıt — birikmiş bir kuyruk tek gecede HTTP zaman aşımına düşmesin. */
const PHASE_BATCH = 200;

type Item = { id: string; ok: boolean; error?: string; [k: string]: unknown };

/**
 * Günlük merkezi iyzico sweep cron'u (yenilemeyi iyzico yönettiği için ÇEKİM yapmaz —
 * yalnız iyzico'ya niyet bildirir ve kayıtları sağlayıcıyla hizalar):
 *
 *  FAZ A — iptal bildirimi: kullanıcı iptali DEFERRED'dır (modül cancel rotaları yalnız
 *    DB günceller → "Devam ettir" mümkün). Dönem sonuna ≤48h kala hâlâ CANCELED ise
 *    iyzico'ya cancelSubscription → dönem sonundaki yenileme bastırılır. Pencere günlük
 *    aralığın İKİ katıdır: bir gece sweep kaçsa bile iptal yenilemeden önce iletilir.
 *    Dönemi geçmiş CANCELED'lar için de idempotent tekrar (güvenlik ağı).
 *
 *  FAZ B — bekleyen DÜŞÜRME, iki adım (2026-09 denetimi):
 *    B1 — ACTIVE + pendingBillingPlanId + dönem sonuna ≤36h + henüz iletilmemiş →
 *      iyzico upgradeSubscription(NOW, düşük plan). iyzico yalnız "NOW" kabul ettiği için
 *      sağlayıcı tarafı birkaç saat erken değişir; YEREL plan değişmez, orijinal dönem sonu
 *      `pendingPlanAppliesAt`e yazılır. (Eskiden yerel plan da hemen düşüyor, kullanıcı
 *      kendisine söylenen tarihten ~36 saat önce üst plan erişimini kaybediyordu.)
 *      İstisna: sağlayıcı değişiklikle YENİ dönem başlattıysa yerel plan hemen uygulanır.
 *    B2 — `pendingPlanAppliesAt` geçmiş → yerel plan uygulanır, bekleyen alanlar temizlenir.
 *
 *  FAZ C — BAYAT ACTIVE senkronu: dönemi geçmiş ama hâlâ ACTIVE görünen abonelikler için
 *    sağlayıcıdan gerçek durum + dönem sonu okunur. Webhook'un yedeği. Tanınmayan sağlayıcı
 *    durumu kaydı DEĞİŞTİRMEZ (alarm); dönem hâlâ geçmişse başarı SAYILMAZ.
 *
 *  FAZ D — PENDING ödeme niyetleri: 15 dk'dan eskiler iyzico'ya sorulur, ödenmişse abonelik
 *    kurtarılır (callback hiç gelmemiş); 7 günden eski ödenmemişler silinir.
 *
 * SONUÇ: herhangi bir öğe ya da faz başarısızsa yanıt 500'dür (gövde yine tam rapor) —
 * `cron-call.sh` 2xx dışını hata olarak loglar; eskiden her koşulda 200 dönüyordu. Her
 * çalışma Studio AuditLog'a `cron.iyzico-sweep` heartbeat'i yazar (admin Sistem Sağlığı).
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
  const in48h = new Date(now.getTime() + 2 * ONE_DAY);
  const in36h = new Date(now.getTime() + 1.5 * ONE_DAY);

  // Faz izolasyonu: bir fazın DB/ağ hatası diğerlerini atlatmasın (eskiden A'daki tek
  // bir sorgu hatası B, C ve D'yi de sessizce iptal ediyordu).
  const phaseErrors: Array<{ phase: string; error: string }> = [];
  async function phase(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      phaseErrors.push({ phase: name, error });
      billingAlarm(`iyzico sweep faz ${name} çöktü`, { error });
    }
  }

  // ── FAZ A: iptal bildirimi (dönem sonu ≤48h ya da geçmiş) ──
  const cancelled: Item[] = [];
  await phase("A", async () => {
    const targets = await prisma.subscription.findMany({
      where: {
        status: "CANCELED",
        iyzicoSubscriptionRef: { not: null },
        currentPeriodEnd: { lte: in48h },
      },
      select: { id: true, iyzicoSubscriptionRef: true },
      take: PHASE_BATCH,
    });
    for (const sub of targets) {
      const ref = sub.iyzicoSubscriptionRef!;
      const r = await cancelAtProviderAndVerify(ref);
      if (r.closed) {
        // Sağlayıcı tarafı kapandı → tekrar denememek için ref temizlenir (kayıt tarihsel kalır).
        await prisma.subscription.update({ where: { id: sub.id }, data: { iyzicoSubscriptionRef: null } });
        cancelled.push({ id: sub.id, ok: true, observed: r.observed });
      } else {
        // ref KORUNUR → yarın tekrar denenir. Sessizce "başarı" saymak, müşteriden tahsilatın
        // sürmesi demekti; görünür alarm bırakıyoruz.
        billingAlarm("iyzico sweep A: iptal doğrulanamadı — ref korundu, yarın tekrar denenecek", {
          sub: sub.id,
          observed: r.observed,
          error: r.error,
        });
        cancelled.push({ id: sub.id, ok: false, observed: r.observed, error: r.error ?? r.observed });
      }
    }
  });

  // ── FAZ B1: bekleyen düşürmeyi sağlayıcıya ilet (dönem sonu ≤36h) ──
  const downgradeSent: Item[] = [];
  await phase("B1", async () => {
    const targets = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        pendingBillingPlanId: { not: null },
        pendingPlanAppliesAt: null,
        iyzicoSubscriptionRef: { not: null },
        currentPeriodEnd: { lte: in36h },
      },
      select: { id: true, iyzicoSubscriptionRef: true, pendingBillingPlanId: true, currentPeriodEnd: true },
      take: PHASE_BATCH,
    });
    for (const sub of targets) {
      try {
        const plan = await prisma.billingPlan.findUnique({ where: { id: sub.pendingBillingPlanId! } });
        if (!plan?.iyzicoPlanRef) {
          billingAlarm("iyzico sweep B1: bekleyen planın iyzico ref'i yok", { sub: sub.id });
          downgradeSent.push({ id: sub.id, ok: false, error: "pending_plan_unconfigured" });
          continue;
        }
        const r = await upgradeSubscription({
          subscriptionReferenceCode: sub.iyzicoSubscriptionRef!,
          newPricingPlanReferenceCode: plan.iyzicoPlanRef,
          upgradePeriod: "NOW",
        });
        if (r.status !== "success") {
          billingAlarm("iyzico sweep B1: düşürme sağlayıcıya iletilemedi", {
            sub: sub.id,
            errorCode: r.errorCode,
            error: r.errorMessage,
          });
          downgradeSent.push({ id: sub.id, ok: false, error: r.errorMessage });
          continue;
        }
        const newRef = r.referenceCode ?? sub.iyzicoSubscriptionRef!;
        // Sağlayıcı "NOW" ile YENİ bir dönem başlattıysa (alt plandan tahsilat yapıldıysa)
        // eski dönem fiilen bitmiştir: yerel planı beklemeden uygula. Aksi hâlde yeni dönem
        // sonu (webhook) üst plan kredisini alt plan ücretine yeniden yüklerdi.
        let providerEnd: Date | null = null;
        try {
          const fresh = await retrieveSubscription(newRef);
          if (fresh.status === "success") providerEnd = resolveSubscriptionPeriodEnd(fresh);
        } catch {
          // okunamazsa iki adımlı yola düş (B2 orijinal dönem sonunda uygular)
        }
        const original = sub.currentPeriodEnd;
        const newPeriodStarted = Boolean(
          providerEnd && original && providerEnd.getTime() > original.getTime() + ONE_DAY,
        );
        await prisma.subscription.update({
          where: { id: sub.id },
          data: newPeriodStarted
            ? {
                iyzicoSubscriptionRef: newRef,
                iyzicoPricingPlanRef: plan.iyzicoPlanRef,
                billingPlanId: plan.id,
                pendingBillingPlanId: null,
                pendingPlanAppliesAt: null,
                currentPeriodEnd: providerEnd!,
              }
            : {
                iyzicoSubscriptionRef: newRef,
                iyzicoPricingPlanRef: plan.iyzicoPlanRef,
                // Yerel plan ORİJİNAL dönem sonunda (B2) uygulanır; o ana kadar kullanıcı üst planda.
                pendingPlanAppliesAt: original ?? now,
              },
        });
        downgradeSent.push({ id: sub.id, ok: true, appliedNow: newPeriodStarted });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        billingAlarm("iyzico sweep B1: istisna", { sub: sub.id, error: message });
        downgradeSent.push({ id: sub.id, ok: false, error: message });
      }
    }
  });

  // ── FAZ B2: iletilmiş düşürmenin yerel planını dönem sonu geçince uygula ──
  const downgradeApplied: Item[] = [];
  await phase("B2", async () => {
    const targets = await prisma.subscription.findMany({
      where: { pendingBillingPlanId: { not: null }, pendingPlanAppliesAt: { lte: now } },
      select: { id: true, pendingBillingPlanId: true },
      take: PHASE_BATCH,
    });
    for (const sub of targets) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { billingPlanId: sub.pendingBillingPlanId, pendingBillingPlanId: null, pendingPlanAppliesAt: null },
      });
      downgradeApplied.push({ id: sub.id, ok: true });
    }
  });

  // ── FAZ C: dönemi GEÇMİŞ ama hâlâ ACTIVE görünenleri sağlayıcıdan senkronla ──
  // Durumu ilerleten tek kaynak webhook'tu: bildirim hiç gelmezse abonelik
  // "ACTIVE + dönem çoktan bitmiş" hâlinde donuyordu. Burada gerçeği SAĞLAYICIYA soruyoruz.
  const resynced: Item[] = [];
  await phase("C", async () => {
    const targets = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        iyzicoSubscriptionRef: { not: null },
        currentPeriodEnd: { lt: new Date(now.getTime() - ONE_DAY) },
      },
      select: { id: true, iyzicoSubscriptionRef: true },
      take: PHASE_BATCH,
    });
    for (const sub of targets) {
      try {
        const r = await retrieveSubscription(sub.iyzicoSubscriptionRef!);
        if (r.status !== "success") {
          billingAlarm("iyzico sweep C: retrieve başarısız", { sub: sub.id, errorCode: r.errorCode, error: r.errorMessage });
          resynced.push({ id: sub.id, ok: false, error: r.errorMessage ?? r.errorCode });
          continue;
        }
        // Dönem sonu `orders[]`ten gelir; üst düzey endDate canlıda GELMİYOR (2026-09-21).
        const end = resolveSubscriptionPeriodEnd(r);
        const known = isKnownIyzicoSubscriptionStatus(r.subscriptionStatus);
        // Tanınmayan durum PENDING'e eşlenirdi ve ödeyen kullanıcının erişimi kesilirdi →
        // durum YAZILMAZ; yalnız (varsa) dönem sonu güncellenir.
        const mapped = known ? mapIyzicoSubscriptionStatus(r.subscriptionStatus) : null;
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { ...(mapped ? { status: mapped } : {}), ...(end ? { currentPeriodEnd: end } : {}) },
        });

        if (!known) {
          billingAlarm("iyzico sweep C: tanınmayan sağlayıcı durumu — kayıt durumu korundu", {
            sub: sub.id,
            providerStatus: r.subscriptionStatus ?? null,
          });
          resynced.push({ id: sub.id, ok: false, error: "bilinmeyen_saglayici_durumu" });
          continue;
        }
        // SESSİZ BAŞARI YOK: hâlâ ACTIVE ve dönem çözülemediyse ya da çözülen dönem de
        // geçmişteyse (sağlayıcı yeniden tahsilat deniyor) kayıt bayat kalır → ok:false.
        if (mapped === "ACTIVE" && (!end || end.getTime() <= now.getTime())) {
          billingAlarm("iyzico sweep C: ACTIVE kayıt hâlâ bayat", {
            sub: sub.id,
            periodEnd: end?.toISOString() ?? null,
          });
          resynced.push({
            id: sub.id,
            ok: false,
            status: mapped,
            periodEnd: end?.toISOString() ?? null,
            error: end ? "donem_hala_gecmis" : "period_end_cozumlenemedi",
          });
          continue;
        }
        console.warn(
          `[iyzico sweep C] bayat ACTIVE senkronlandı — sub=${sub.id} sağlayıcı=${r.subscriptionStatus ?? "?"} → ${mapped}`,
        );
        resynced.push({ id: sub.id, ok: true, status: mapped, periodEnd: end?.toISOString() ?? null });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        billingAlarm("iyzico sweep C: istisna", { sub: sub.id, error: message });
        resynced.push({ id: sub.id, ok: false, error: message });
      }
    }
  });

  // ── FAZ D: ödeme niyetleri — önce KURTAR, sonra temizle ──
  // Her checkout bir PaymentIntent yazar; yalnız BAŞARILI callback onu CONSUMED yapar.
  // Callback tarayıcıya bağlıdır: kullanıcı ödemeden hemen sonra sekmeyi kapatırsa iyzico
  // parayı çeker ama /odeme/sonuc HİÇ çağrılmaz. Webhook'un yedeği de ilk ödemede hesabı
  // bulamaz (müşteri ref'i callback'te yazılıyordu). Eskiden bu niyetler 7 gün sonra
  // sağlayıcıya SORULMADAN siliniyordu → "para çekildi, abonelik yok" kalıcılaşıyordu.
  // Artık her PENDING niyet silinmeden önce iyzico'ya sorulur; ödenmişse abonelik,
  // callback ile AYNI kuralla (provisionFromCheckout) kurulur.
  const recovered: Item[] = [];
  let staleIntentsDeleted = 0;
  await phase("D", async () => {
    const targets = await prisma.paymentIntent.findMany({
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
    for (const intent of targets) {
      try {
        const r = await retrieveCheckoutForm(intent.clientRefCode);
        // Ödenmemiş/terk edilmiş form → dokunma; 7 günü doldurunca aşağıda silinir.
        if (r.status !== "success" || !r.referenceCode) continue;

        const account = await prisma.account.findUnique({
          where: { id: intent.accountId },
          select: { id: true },
        });
        if (!account) {
          billingAlarm("iyzico sweep D: ödenmiş checkout'un hesabı yok (silinmiş olabilir) — elle incele", {
            intent: intent.id,
          });
          recovered.push({ id: intent.id, ok: false, error: "account_missing" });
          continue;
        }

        const outcome = await provisionFromCheckout(account.id, r);
        if (outcome.kind === "plan_not_found") {
          billingAlarm("iyzico sweep D: ödenmiş checkout'un planı bulunamadı", { intent: intent.id });
          recovered.push({ id: intent.id, ok: false, error: "plan_not_found" });
          continue;
        }
        await prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: "CONSUMED" } });
        if (outcome.kind === "created") {
          console.warn(
            `[iyzico sweep D] callback'i hiç gelmemiş ÖDENMİŞ checkout kurtarıldı — intent=${intent.id} sub=${outcome.subscriptionId}`,
          );
        }
        // Yinelenen abonelik alarmı provisionFromCheckout içinde verildi (iade gerekiyor).
        recovered.push({ id: intent.id, ok: outcome.kind !== "duplicate", outcome: outcome.kind });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        billingAlarm("iyzico sweep D: istisna", { intent: intent.id, error: message });
        recovered.push({ id: intent.id, ok: false, error: message });
      }
    }

    const deleted = await prisma.paymentIntent.deleteMany({
      where: { status: "PENDING", createdAt: { lt: new Date(now.getTime() - 7 * ONE_DAY) } },
    });
    staleIntentsDeleted = deleted.count;
  });

  const all = [...cancelled, ...downgradeSent, ...downgradeApplied, ...resynced, ...recovered];
  const failed = all.filter((i) => !i.ok).length;
  const healthy = failed === 0 && phaseErrors.length === 0;

  // Heartbeat — admin Sistem Sağlığı bu kaydı okur. KİMLİK YOK: yalnız sayılar.
  await recordAudit({
    actorId: null,
    action: "cron.iyzico-sweep",
    targetType: "system",
    targetId: "cron",
    diff: {
      timestamp: now.toISOString(),
      considered: all.length,
      ok: all.length - failed,
      failed,
      phaseErrors: phaseErrors.map((p) => p.phase),
      cancelNotified: cancelled.length,
      downgradeSent: downgradeSent.length,
      downgradeApplied: downgradeApplied.length,
      staleActiveResynced: resynced.length,
      intentsRecovered: recovered.length,
      staleIntentsDeleted,
    },
  });

  return NextResponse.json(
    {
      timestamp: now.toISOString(),
      ok: healthy,
      phaseErrors,
      cancelNotified: cancelled,
      downgradeSent,
      downgradeApplied,
      staleActiveResynced: resynced,
      intentsRecovered: recovered,
      staleIntentsDeleted,
    },
    { status: healthy ? 200 : 500 },
  );
}
