import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { retrieveCheckoutForm } from "@/lib/iyzico";
import { auth } from "@/auth";
import { mapIyzicoSubscriptionStatus, moduleReturnUrl } from "@ludenlab/billing";
import { getClientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * iyzico checkout callback (apex). iyzico POST eder → token'ı S2S retrieve ile doğrula
 * (callback'in kendisine güvenme) → merkezi `billing.Subscription` upsert → kullanıcıyı
 * modüle 303 ile döndür. Payment (tahsilat) kaydı BURADA YAZILMAZ — tek kaynak webhook
 * (subscription.order.success; ilk ödeme dahil). Kredi/erişim modül reconcile'ının işi.
 */
function redirectTo(url: string) {
  return NextResponse.redirect(url, { status: 303 }); // POST → GET
}
function errBack(reason: string, req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  return NextResponse.redirect(new URL(`/odeme/hata?reason=${encodeURIComponent(reason)}`, base), {
    status: 303,
  });
}

/**
 * iyzico checkout token'ının kaba biçim kontrolü (2026-08 denetimi #53/#47).
 * Amaç doğrulama DEĞİL — doğrulamayı S2S `retrieveCheckoutForm` yapar; amaç, ÇÖP girdiyle
 * sağlayıcıya istek atmamak. Token'lar uzun, tek parça, URL-güvenli dizelerdir.
 */
function looksLikeCheckoutToken(token: string): boolean {
  return token.length >= 16 && token.length <= 256 && /^[A-Za-z0-9._~-]+$/.test(token);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const token = form.get("token");
    if (typeof token !== "string" || !token) return errBack("missing_token", req);

    // ── AMPLİFİKASYON KAPISI (denetim #53) ──
    // Bu uç KİMLİKSİZDİR (iyzico buraya cross-site POST eder) ve her istek iyzico'ya bir
    // S2S `retrieve` çağrısı doğuruyordu: çöp token'la ateş eden biri, tek istekle bizim
    // adımıza sağlayıcıya istek ürettirebiliyordu. Önce ucuz biçim kontrolü, sonra
    // kaynak başına hız sınırı; ikisini de geçmeyen istek sağlayıcıya HİÇ ulaşmaz.
    if (!looksLikeCheckoutToken(token)) return errBack("invalid_token", req);

    const ip = getClientIp(req.headers);
    if (ip !== "unknown" && !rateLimit(`odeme:sonuc:${ip}`, 20).allowed) {
      return errBack("rate_limited", req);
    }

    const result = await retrieveCheckoutForm(token);
    if (result.status !== "success" || !result.referenceCode) {
      console.error("[odeme/sonuc] iyzico", result.errorCode, result.errorMessage);
      return errBack(result.errorMessage || "payment_failed", req);
    }

    const {
      referenceCode, // subscriptionReferenceCode
      subscriptionStatus,
      pricingPlanReferenceCode,
      customerReferenceCode,
    } = result;

    // Hesabı belirle — ÜÇ kademeli (2026-08 güvenlik denetimi #12):
    //   1) Oturum çerezi — bu callback TARAYICIDAN POST edilir ve SameSite=Lax olduğu için
    //      çerez GELMEYEBİLİR; tek başına güvenilmez.
    //   2) iyzico müşteri ref'i — İLK ödemede Account'ta henüz YOKTUR (iyzico müşteriyi
    //      checkout sırasında yaratır), yani ilk ödemede bu da boş döner.
    //   3) ÖDEME NİYETİ — init'te token↔hesap bağı yazıldı; çerezden bağımsız ve ilk
    //      ödemede de çalışır. Bu kademe olmadan "para çekildi ama abonelik yok" oluşuyordu.
    // NİYET OTORİTERDİR (2026-09 denetimi): oturum çerezi, ödemeyi BAŞLATAN hesaba ait
    // olmayabilir (paylaşılan cihaz ya da başka hesapla açık ikinci sekme) — eskiden oturum
    // ilk sırada olduğu için abonelik YANLIŞ hesaba yazılabiliyordu. Niyet, init'te
    // token↔hesap bağını yazar; tahsilatın gerçek sahibi odur. Oturum ve müşteri ref'i
    // yalnız yedek kademelerdir.
    const intent = await prisma.paymentIntent.findUnique({ where: { clientRefCode: token } });
    const session = await auth();
    let account = intent
      ? await prisma.account.findUnique({ where: { id: intent.accountId } })
      : null;
    if (account && session?.user?.id && session.user.id !== account.id) {
      console.warn("[odeme/sonuc] oturumdaki hesap ödeme niyetinden FARKLI — niyet otoriter", {
        intentAccount: account.id,
      });
    }
    if (!account && customerReferenceCode) {
      account = await prisma.account.findFirst({ where: { iyzicoCustomerRef: customerReferenceCode } });
    }
    if (!account && session?.user?.id) {
      account = await prisma.account.findUnique({ where: { id: session.user.id } });
    }
    if (!account) {
      console.error("[odeme/sonuc] hesap çözülemedi — token/customerRef eşleşmedi", {
        hasSession: Boolean(session?.user?.id),
        hasCustomerRef: Boolean(customerReferenceCode),
        hasIntent: Boolean(intent),
      });
      return errBack("user_not_found", req);
    }

    // Planı OTORİTER olarak iyzico'nun döndürdüğü ref'ten bul (query'e güvenme).
    if (!pricingPlanReferenceCode) return errBack("plan_not_found", req);
    const plan = await prisma.billingPlan.findUnique({ where: { iyzicoPlanRef: pricingPlanReferenceCode } });
    if (!plan) {
      console.error("[odeme/sonuc] eşleşen plan yok:", pricingPlanReferenceCode);
      return errBack("plan_not_found", req);
    }

    const status = mapIyzicoSubscriptionStatus(subscriptionStatus);
    // Geçici tahmin: ilk order.success webhook'u iyzico'nun GERÇEK endDate'iyle düzeltir.
    const periodEnd = new Date(Date.now() + (plan.interval === "YEARLY" ? 365 : 30) * 24 * 60 * 60 * 1000);

    await prisma.subscription.upsert({
      where: { iyzicoSubscriptionRef: referenceCode },
      update: {
        status,
        module: plan.module,
        billingPlanId: plan.id,
        pendingBillingPlanId: null, // yeni ödeme → varsa bekleyen downgrade sıfırla
        iyzicoPricingPlanRef: pricingPlanReferenceCode,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
      },
      create: {
        accountId: account.id,
        module: plan.module,
        billingPlanId: plan.id,
        status,
        iyzicoSubscriptionRef: referenceCode,
        iyzicoPricingPlanRef: pricingPlanReferenceCode,
        currentPeriodEnd: periodEnd,
      },
    });

    if (customerReferenceCode && !account.iyzicoCustomerRef) {
      await prisma.account.update({
        where: { id: account.id },
        data: { iyzicoCustomerRef: customerReferenceCode },
      });
    }

    // Niyet tüketildi (tekrar kullanılamasın; token zaten iyzico tarafında tek seferlik).
    if (intent && intent.status !== "CONSUMED") {
      await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: { status: "CONSUMED" },
      });
    }

    // plan.module BRYTAKIP içerebilir ama checkout yalnız STUDIO/ATOLYE üretir → savunmacı.
    if (plan.module !== "STUDIO" && plan.module !== "ATOLYE") {
      return redirectTo(process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin);
    }
    return redirectTo(moduleReturnUrl(plan.module));
  } catch (e) {
    console.error("[odeme/sonuc] error", e);
    return errBack("internal_error", req);
  }
}
