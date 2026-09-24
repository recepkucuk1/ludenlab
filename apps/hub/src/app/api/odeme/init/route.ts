import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { initializeCheckoutForm, retrieveSubscription, upgradeSubscription } from "@/lib/iyzico";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { cancelAtProviderAndVerify, resolveSubscriptionPeriodEnd } from "@/lib/iyzicoOps";
import { billingAlarm } from "@/lib/billingAlarm";
import { recordSalesConsent, SALES_CONSENT_VERSION } from "@/lib/salesConsent";

export const runtime = "nodejs";

const MODULES = ["STUDIO", "ATOLYE"] as const;
const INTERVALS = ["MONTHLY", "YEARLY"] as const;

/**
 * Apex checkout init (iyzico native Abonelik v2). Oturum + merkezi BillingPlan lookup →
 * mevcut aboneliğe göre dallanır:
 *  - aynı plan aktif → no-op (+ bekleyen downgrade'i iptal)
 *  - DOWNGRADE → pendingBillingPlanId yazılır (ödeme YOK; cron sweep dönem sonunda iyzico
 *    upgrade'iyle uygular) — kullanıcı dönem sonuna kadar yüksek planında kalır
 *  - UPGRADE (aktif iyzico aboneliği varsa) → iyzico upgradeSubscription(NOW) — form YOK
 *  - yeni abonelik / iyzico-ref'siz hesap → fatura-profili kapısı (428) → iyzico checkout formu
 * Kart iyzico sayfasında girilir (PCI bizde değil); yenilemeyi iyzico yönetir, webhook bildirir.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

    // Kullanıcı başına hız sınırı (denetim #52): her çağrı iyzico'da checkout formu /
    // upgrade üretir — kimlikli ama MALİYETLİ bir dış işlem. Meşru kullanım dakikada
    // birkaç denemeyi geçmez; döngüye giren bir istemci sağlayıcıyı boşuna yormasın.
    const { allowed, retryAfter } = rateLimit(`odeme:init:${session.user.id}`, 8);
    if (!allowed) return rateLimitResponse(retryAfter);

    const { module, code, interval, confirm, consentVersion } = (await req.json()) as {
      module?: string;
      code?: string;
      interval?: string;
      confirm?: boolean;
      consentVersion?: string;
    };
    if (
      !module ||
      !MODULES.includes(module as (typeof MODULES)[number]) ||
      !interval ||
      !INTERVALS.includes(interval as (typeof INTERVALS)[number]) ||
      !code
    ) {
      return NextResponse.json({ error: "Geçersiz plan parametreleri." }, { status: 400 });
    }

    const account = await prisma.account.findUnique({ where: { id: session.user.id } });
    if (!account) return NextResponse.json({ error: "Hesap bulunamadı." }, { status: 404 });

    const plan = await prisma.billingPlan.findUnique({
      where: {
        module_code_interval: {
          module: module as (typeof MODULES)[number],
          code,
          interval: interval as (typeof INTERVALS)[number],
        },
      },
    });
    if (!plan || !plan.active) return NextResponse.json({ error: "Plan bulunamadı." }, { status: 404 });
    if (!plan.iyzicoPlanRef) {
      console.error("[odeme/init] planın iyzicoPlanRef'i yok:", plan.id);
      return NextResponse.json({ error: "Plan ödeme için yapılandırılmamış." }, { status: 500 });
    }

    // ── Mevcut aboneliğe göre dallanma ──
    // Önce CANLI (ACTIVE/PAST_DUE) abonelik aranır, yoksa en yenisi. Eskiden yalnız "en
    // yeni satır" okunuyordu: daha yeni bir CANCELED/PENDING satır, daha eski ama hâlâ
    // ACTIVE aboneliği gizliyor ve yanına İKİNCİ bir canlı abonelik açılabiliyordu.
    const moduleKey = module as (typeof MODULES)[number];
    const existing =
      (await prisma.subscription.findFirst({
        where: { accountId: account.id, module: moduleKey, status: { in: ["ACTIVE", "PAST_DUE"] } },
        orderBy: { createdAt: "desc" },
        include: { billingPlan: true },
      })) ??
      (await prisma.subscription.findFirst({
        where: { accountId: account.id, module: moduleKey },
        orderBy: { createdAt: "desc" },
        include: { billingPlan: true },
      }));
    const RANK: Record<string, number> = { PRO: 1, ADVANCED: 2, ENTERPRISE: 3 };

    // ── AÇIK ONAY KAPISI (2026-09 denetimi) ──
    // /odeme sayfası init'i açılır açılmaz çağırır. Mevcut aboneliği DEĞİŞTİREN dallar
    // (yükseltme = anında tahsilat, düşürme, bekleyen düşürmeyi iptal, ödemesi alınamayan
    // aboneliği kapatma) eskiden onaysız çalışıyordu: aktif bir aboneye gönderilen
    // `/odeme?code=ENTERPRISE&interval=YEARLY` linki tek tıkla kartından çekim yaptırıyordu.
    // Bu dallar artık önce ne olacağını anlatan bir özet döner; istemci kullanıcı "Onayla"
    // deyince `confirm: true` ile tekrar çağırır. (Çapraz-site POST zaten Origin kontrolüne
    // takılır; `confirm` bayrağını yalnız kendi sayfamız, kullanıcı tıklayınca gönderir.)
    const priceText = `${Number(plan.price).toLocaleString("tr-TR")} ₺ / ${plan.interval === "YEARLY" ? "yıl" : "ay"}`;
    const currentName = existing?.billingPlan?.name ?? "mevcut planınız";
    const needsConfirm = (
      change: string,
      title: string,
      message: string,
      confirmLabel: string,
      requiresConsent = false,
    ) =>
      NextResponse.json({
        confirmRequired: true,
        change,
        title,
        message,
        confirmLabel,
        ...(requiresConsent ? { requiresConsent: true, consentVersion: SALES_CONSENT_VERSION } : {}),
      });
    // Tahsilata giden yollar (yeni checkout, anında yükseltme) ayrıca GÜNCEL sözleşme
    // sürümüne açık onay ister (mesafeli satış; cayma hakkının sona ermesine önceden onay).
    const consentOk = Boolean(confirm) && consentVersion === SALES_CONSENT_VERSION;
    const clientIp = getClientIp(req.headers);
    const ipForRecord = clientIp === "unknown" ? null : clientIp;

    // Sağlayıcıya İLETİLMİŞ düşürme (sweep B1) geri alınamaz / değiştirilemez: yerel alanı
    // oynatmak iyzico ile kaydı ayrıştırırdı. Yalnız yükseltme (yeni tahsilat) serbest.
    const providerLocked = Boolean(existing?.pendingPlanAppliesAt);
    const lockedResponse = () =>
      NextResponse.json(
        {
          error:
            "Zamanlanmış plan değişikliğiniz ödeme sağlayıcısına iletildi ve artık değiştirilemiyor. Yeni dönem başladıktan sonra dilediğiniz plana geçebilirsiniz.",
        },
        { status: 409 },
      );

    // Aynı kademede YILLIK → AYLIK geçiş de düşürmedir: ödenmiş yıllık dönem bitmeden
    // "NOW" ile aylığa geçirmek kalan yıllık süreyi yakardı. Zamanlanır, anında uygulanmaz.
    const rankOf = (c: string | undefined) => RANK[c ?? ""] ?? 0;
    const isDowngrade =
      existing?.billingPlan != null &&
      (rankOf(plan.code) < rankOf(existing.billingPlan.code) ||
        (rankOf(plan.code) === rankOf(existing.billingPlan.code) &&
          existing.billingPlan.interval === "YEARLY" &&
          plan.interval === "MONTHLY"));

    if (existing?.status === "ACTIVE" && existing.billingPlanId === plan.id) {
      // Aynı plan zaten aktif → tekrar ödeme ALMA. Bekleyen downgrade varsa iptal et (vazgeçildi).
      if (existing.pendingBillingPlanId) {
        if (providerLocked) return lockedResponse();
        if (!confirm) {
          return needsConfirm(
            "cancelDowngrade",
            "Plan değişikliğinden vazgeç",
            `Zamanlanmış plan değişikliğiniz iptal edilecek ve ${currentName} planınız yenilemede aynen devam edecek.`,
            "Değişikliği iptal et",
          );
        }
        // CAS: sweep B1 arada iletmişse temizleme yapılmaz.
        const cleared = await prisma.subscription.updateMany({
          where: { id: existing.id, pendingPlanAppliesAt: null },
          data: { pendingBillingPlanId: null },
        });
        if (cleared.count === 0) return lockedResponse();
        return NextResponse.json({
          alreadyActive: true,
          downgradeCancelled: true,
          message: "Plan değişikliği iptal edildi; mevcut planınız devam ediyor.",
        });
      }
      return NextResponse.json({ alreadyActive: true, message: "Bu plan zaten aktif." });
    }

    if (existing?.status === "ACTIVE" && isDowngrade) {
      // DOWNGRADE: ödeme YOK. Sweep dönem sonuna ~36h kala iyzico'ya iletir, yerel planı
      // dönem sonunda uygular (bkz. sweep B1/B2).
      if (providerLocked) return lockedResponse();
      if (!confirm) {
        const when = existing.currentPeriodEnd
          ? `${existing.currentPeriodEnd.toLocaleDateString("tr-TR")} tarihindeki yenilemede`
          : "bir sonraki yenilemede";
        return needsConfirm(
          "downgrade",
          "Plan düşürme",
          `${currentName} planınız ${when} ${plan.name} planına (${priceText}) geçecek. O tarihe kadar mevcut planınızı kullanmaya devam edersiniz.`,
          "Plan değişikliğini onayla",
        );
      }
      const scheduled = await prisma.subscription.updateMany({
        where: { id: existing.id, pendingPlanAppliesAt: null },
        data: { pendingBillingPlanId: plan.id },
      });
      if (scheduled.count === 0) return lockedResponse();
      const end = existing.currentPeriodEnd;
      return NextResponse.json({
        downgradeScheduled: true,
        appliesAt: end?.toISOString() ?? null,
        message: end
          ? `Plan değişikliğiniz ${end.toLocaleDateString("tr-TR")} tarihindeki bir sonraki yenilemede uygulanacak. O tarihe kadar mevcut planınızı kullanmaya devam edersiniz.`
          : "Plan değişikliğiniz bir sonraki yenilemede uygulanacak.",
      });
    }

    // UPGRADE: aktif iyzico aboneliği varsa form YOK — iyzico tarafında plan yükselt (NOW).
    if (existing?.status === "ACTIVE" && existing.iyzicoSubscriptionRef) {
      if (!consentOk) {
        return needsConfirm(
          "upgrade",
          "Plan yükseltme",
          `${currentName} planınız hemen ${plan.name} planına (${priceText}) yükseltilecek. Ücret, kayıtlı kartınızdan iyzico tarafından tahsil edilir.`,
          "Yükseltmeyi onayla",
          true,
        );
      }

      // EŞZAMANLILIK KİLİDİ: iki sekmeden aynı anda gelen onaylı yükseltmenin İKİSİ de
      // iyzico'ya gidiyordu. Okuduğumuz sürüm (updatedAt) hâlâ güncelse satırı "alırız";
      // kaybeden istek sağlayıcıya hiç ulaşmaz.
      const claim = await prisma.subscription.updateMany({
        where: { id: existing.id, updatedAt: existing.updatedAt },
        data: { updatedAt: new Date() },
      });
      if (claim.count === 0) {
        return NextResponse.json(
          { error: "Aboneliğiniz az önce güncellendi. Sayfayı yenileyip tekrar deneyin." },
          { status: 409 },
        );
      }

      // Onay kaydı tahsilattan ÖNCE: yazılamazsa yükseltme yapılmaz (ispatsız tahsilat yok).
      await recordSalesConsent({
        accountId: account.id,
        billingPlanId: plan.id,
        kind: "UPGRADE",
        ip: ipForRecord,
      });

      const up = await upgradeSubscription({
        subscriptionReferenceCode: existing.iyzicoSubscriptionRef,
        newPricingPlanReferenceCode: plan.iyzicoPlanRef,
        upgradePeriod: "NOW",
      });
      if (up.status !== "success") {
        console.error("[odeme/init] iyzico upgrade failure", up.errorCode, up.errorMessage);
        return NextResponse.json(
          { error: up.errorMessage || "Plan yükseltme başarısız oldu." },
          { status: 502 },
        );
      }
      // iyzico upgrade'te abonelik ref'i DEĞİŞEBİLİR (yeni ref döner) → güncelle.
      const newRef = up.referenceCode ?? existing.iyzicoSubscriptionRef;
      // "NOW" yeni bir dönem başlatabilir → dönem sonunu sağlayıcıdan oku (okunamazsa eskisi kalır).
      let periodEnd: Date | null = null;
      try {
        const fresh = await retrieveSubscription(newRef);
        if (fresh.status === "success") periodEnd = resolveSubscriptionPeriodEnd(fresh);
      } catch {
        // dönem sonu yazılmaz; sweep C / webhook düzeltir
      }
      try {
        await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            billingPlanId: plan.id,
            pendingBillingPlanId: null,
            pendingPlanAppliesAt: null,
            iyzicoSubscriptionRef: newRef,
            iyzicoPricingPlanRef: plan.iyzicoPlanRef,
            ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
          },
        });
      } catch (e) {
        // iyzico yükseltti ama kayıt yazılamadı: yerel ref/plan bayat → webhook eşleşmez.
        // Elle hizalanmalı; bunu kimse görmezse müşteri üst plan ücreti öder, alt planı kullanır.
        billingAlarm("iyzico YÜKSELTİLDİ ama yerel kayıt yazılamadı — elle hizala", {
          sub: existing.id,
          newRef,
          planId: plan.id,
          error: e instanceof Error ? e.message : String(e),
        });
        throw e;
      }
      return NextResponse.json({
        upgraded: true,
        message: `${plan.name} planına geçişiniz tamamlandı. Yeni planınız hemen aktif.`,
      });
    }

    // ── ÇİFT ABONELİK KAPISI (2026-09 denetimi) ──
    // Buraya gelindiyse YENİ bir abonelik açılacak. Eski kayıtta hâlâ canlı bir sağlayıcı
    // ref'i varsa (PAST_DUE hesap "kartımı güncelleyeyim" diye yeniden satın alıyor, ya da
    // sweep iptali henüz bildirmemiş), iyzico'da İKİ abonelik oluşur ve eskisinin retry'ı
    // tutarsa aynı müşteriden iki kez tahsilat yapılır. Kapatılamıyorsa checkout AÇILMAZ:
    // iki canlı abonelik, bir hata mesajından çok daha pahalıdır.
    //
    // Yeni abonelik = tahsilat → önce açık onay (mesafeli satış). Ödemesi alınamayan
    // (PAST_DUE) abonelik hâlâ kullanıcınındır (grace penceresi) — onun kapatılacağı da
    // aynı ekranda söylenir; onaysız HİÇBİR şey kapatılmaz.
    if (!consentOk) {
      const replacing = existing?.status === "PAST_DUE" && existing.iyzicoSubscriptionRef;
      return needsConfirm(
        replacing ? "replace" : "checkout",
        replacing ? "Aboneliği yenile" : plan.name,
        replacing
          ? `Ödemesi alınamayan ${currentName} aboneliğiniz kapatılacak ve ${plan.name} (${priceText}) için yeni ödeme formu açılacak.`
          : `${plan.name} aboneliği: ${priceText}. Abonelik her dönem sonunda otomatik yenilenir; dilediğiniz zaman iptal edebilirsiniz. Ödeme bir sonraki adımda iyzico güvenli ödeme formunda alınır.`,
        "Ödemeye geç",
        true,
      );
    }
    if (existing?.iyzicoSubscriptionRef) {
      const providerResult = await cancelAtProviderAndVerify(existing.iyzicoSubscriptionRef);
      if (providerResult.closed) {
        await prisma.subscription.update({
          where: { id: existing.id },
          data: { iyzicoSubscriptionRef: null },
        });
      } else {
        console.error("[odeme/init] eski abonelik sağlayıcıda kapatılamadı — yeni checkout açılmadı", {
          sub: existing.id,
          observed: providerResult.observed,
          error: providerResult.error,
        });
        return NextResponse.json(
          {
            error:
              "Önceki aboneliğiniz ödeme sağlayıcısında kapatılamadı. Birkaç dakika sonra tekrar deneyin; sorun sürerse bize yazın.",
          },
          { status: 409 },
        );
      }
    }

    // ── Yeni abonelik → FATURA KAPISI + iyzico checkout formu ──
    // Her tahsilat e-Arşiv/e-Fatura gerektirir → profil olmadan ödeme başlatılmaz (428).
    const billingProfile = await prisma.billingProfile.findUnique({
      where: { accountId: account.id },
    });
    // Telefonu olmayan eski profiller de tamamlatılır: iyzico'ya sabit/uydurma numara
    // gönderilmez (2026-09 denetimi #24).
    if (!billingProfile || !billingProfile.phone) {
      return NextResponse.json(
        {
          billingProfileRequired: true,
          message: billingProfile
            ? "Ödemeye geçmeden önce fatura bilgilerine cep telefonunu ekle."
            : "Ödemeye geçmeden önce fatura bilgilerin gerekli.",
        },
        { status: 428 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      console.error("[odeme/init] NEXT_PUBLIC_APP_URL tanımsız");
      return NextResponse.json({ error: "Sunucu yapılandırması eksik." }, { status: 500 });
    }

    // iyzico zorunlu alanları FATURA PROFİLİNDEN (dummy değil — 0011/0023 ile toplanıyor).
    // identityNumber: bireysel TCKN, şahıs şirketinde 11 haneli vergi no (TCKN); ikisi de
    // yoksa (TCKN'siz bireysel ya da VKN'li tüzel kişi) iyzico'nun belgelenmiş nötr değeri.
    // Faturadaki kimlik iyzico'dan değil fatura profilinden gelir.
    const identityNumber =
      billingProfile.tckn ||
      (billingProfile.taxNumber?.length === 11 ? billingProfile.taxNumber : null) ||
      "11111111111";
    const fullName = billingProfile.fullName || account.name || "LudenLab Üye";
    const address = {
      contactName: fullName,
      city: billingProfile.city || "Istanbul",
      district: billingProfile.district || billingProfile.city || "Merkez",
      country: "Turkey",
      address: billingProfile.address || `${billingProfile.city} / Türkiye`,
      zipCode: "34000",
    };
    const res = await initializeCheckoutForm({
      pricingPlanReferenceCode: plan.iyzicoPlanRef,
      callbackUrl: `${baseUrl}/odeme/sonuc`,
      customer: {
        name: fullName.split(" ")[0] || "LudenLab",
        surname: fullName.split(" ").slice(1).join(" ") || "Üye",
        identityNumber,
        email: account.email,
        gsmNumber: billingProfile.phone,
        billingAddress: address,
        shippingAddress: address,
      },
    });

    if (res.status === "failure" || !res.token) {
      console.error("[odeme/init] iyzico failure", res.errorCode, res.errorMessage);
      return NextResponse.json({ error: res.errorMessage || "Ödeme başlatılamadı." }, { status: 502 });
    }

    // ÖDEME NİYETİ (2026-08 güvenlik denetimi #12): checkout token'ını hesap+plana bağla.
    // iyzico callback'i (POST /odeme/sonuc) TARAYICIDAN gelir ve SameSite=Lax nedeniyle
    // oturum çerezi TAŞIMAYABİLİR; ilk ödemede `Account.iyzicoCustomerRef` de henüz boştur
    // (iyzico müşteriyi checkout sırasında yaratır). O durumda callback hesabı çözemeyip
    // "user_not_found" ile dönüyordu → PARA ÇEKİLDİ ama abonelik/erişim/fatura YOK.
    // Bu kayıt, callback'in çerezden bağımsız olarak hesabı bulmasını garanti eder.
    // Best-effort: intent yazılamazsa ödeme akışını bloklamayız (callback'in başka
    // çözüm yolları da var), ama loglarız.
    try {
      await prisma.paymentIntent.create({
        data: { clientRefCode: res.token, accountId: account.id, billingPlanId: plan.id },
      });
    } catch (intentErr) {
      console.error("[odeme/init] PaymentIntent yazılamadı", intentErr);
    }

    // Onay kaydı form GÖSTERİLMEDEN önce: yazılamazsa form dönmez (kullanılmayan token zararsız).
    await recordSalesConsent({
      accountId: account.id,
      billingPlanId: plan.id,
      kind: "CHECKOUT",
      ip: ipForRecord,
      checkoutToken: res.token,
    });

    return NextResponse.json({ token: res.token, checkoutFormContent: res.checkoutFormContent });
  } catch (e) {
    console.error("[odeme/init] error", e);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
