import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { initializeCheckoutForm, upgradeSubscription } from "@/lib/iyzico";

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

    const { module, code, interval } = (await req.json()) as {
      module?: string;
      code?: string;
      interval?: string;
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
    const existing = await prisma.subscription.findFirst({
      where: { accountId: account.id, module: module as (typeof MODULES)[number] },
      orderBy: { createdAt: "desc" },
      include: { billingPlan: true },
    });
    const RANK: Record<string, number> = { PRO: 1, ADVANCED: 2, ENTERPRISE: 3 };

    if (existing?.status === "ACTIVE" && existing.billingPlanId === plan.id) {
      // Aynı plan zaten aktif → tekrar ödeme ALMA. Bekleyen downgrade varsa iptal et (vazgeçildi).
      if (existing.pendingBillingPlanId) {
        await prisma.subscription.update({
          where: { id: existing.id },
          data: { pendingBillingPlanId: null },
        });
        return NextResponse.json({
          alreadyActive: true,
          downgradeCancelled: true,
          message: "Plan değişikliği iptal edildi; mevcut planınız devam ediyor.",
        });
      }
      return NextResponse.json({ alreadyActive: true, message: "Bu plan zaten aktif." });
    }

    if (
      existing?.status === "ACTIVE" &&
      existing.billingPlan &&
      (RANK[plan.code] ?? 0) < (RANK[existing.billingPlan.code] ?? 0)
    ) {
      // DOWNGRADE: ödeme YOK. Cron sweep dönem sonuna ~24h kala iyzico upgrade'iyle uygular.
      await prisma.subscription.update({
        where: { id: existing.id },
        data: { pendingBillingPlanId: plan.id },
      });
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
      await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          billingPlanId: plan.id,
          pendingBillingPlanId: null,
          iyzicoSubscriptionRef: up.referenceCode ?? existing.iyzicoSubscriptionRef,
          iyzicoPricingPlanRef: plan.iyzicoPlanRef,
        },
      });
      return NextResponse.json({
        upgraded: true,
        message: `${plan.name} planına geçişiniz tamamlandı. Yeni planınız hemen aktif.`,
      });
    }

    // ── Yeni abonelik → FATURA KAPISI + iyzico checkout formu ──
    // Her tahsilat e-Arşiv/e-Fatura gerektirir → profil olmadan ödeme başlatılmaz (428).
    const billingProfile = await prisma.billingProfile.findUnique({
      where: { accountId: account.id },
    });
    if (!billingProfile) {
      return NextResponse.json(
        { billingProfileRequired: true, message: "Ödemeye geçmeden önce fatura bilgilerin gerekli." },
        { status: 428 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      console.error("[odeme/init] NEXT_PUBLIC_APP_URL tanımsız");
      return NextResponse.json({ error: "Sunucu yapılandırması eksik." }, { status: 500 });
    }

    // iyzico zorunlu alanları FATURA PROFİLİNDEN (dummy değil — 0011 ile toplanıyor).
    // identityNumber: bireysel TCKN (11) varsa o; yoksa iyzico'nun kabul ettiği nötr değer.
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
        identityNumber: billingProfile.tckn || "11111111111",
        email: account.email,
        gsmNumber: "+905350000000",
        billingAddress: address,
        shippingAddress: address,
      },
    });

    if (res.status === "failure" || !res.token) {
      console.error("[odeme/init] iyzico failure", res.errorCode, res.errorMessage);
      return NextResponse.json({ error: res.errorMessage || "Ödeme başlatılamadı." }, { status: 502 });
    }

    return NextResponse.json({ token: res.token, checkoutFormContent: res.checkoutFormContent });
  } catch (e) {
    console.error("[odeme/init] error", e);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
