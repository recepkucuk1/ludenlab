import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { retrieveCheckoutForm } from "@/lib/iyzico";
import { auth } from "@/auth";
import { moduleReturnUrl } from "@ludenlab/billing";

export const runtime = "nodejs";

/**
 * iyzico checkout callback (apex). iyzico POST eder → token al → aboneliği doğrula
 * → merkezi `billing.Subscription` upsert → kullanıcıyı modül subdomain'ine 303 ile döndür.
 * Kredi/erişim grant'ı BURADA YAPILMAZ — o modülün işi (webhook fan-out / entitlement).
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

/** iyzico abonelik durumu → merkezi SubscriptionStatus. */
function mapStatus(s: string | undefined): "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED" {
  switch (s) {
    case "ACTIVE":
    case "UPGRADED":
      return "ACTIVE";
    case "PENDING":
      return "PENDING";
    case "UNPAID":
      return "PAST_DUE";
    case "CANCELED":
      return "CANCELED";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return "PENDING";
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const token = form.get("token");
    if (typeof token !== "string" || !token) return errBack("missing_token", req);

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

    // Hesabı belirle: önce oturum, sonra iyzico müşteri ref'i.
    const session = await auth();
    let account = session?.user?.id
      ? await prisma.account.findUnique({ where: { id: session.user.id } })
      : null;
    if (!account && customerReferenceCode) {
      account = await prisma.account.findFirst({ where: { iyzicoCustomerRef: customerReferenceCode } });
    }
    if (!account) return errBack("user_not_found", req);

    // Planı OTORİTER olarak iyzico'nun döndürdüğü ref'ten bul (query'e güvenme).
    if (!pricingPlanReferenceCode) return errBack("plan_not_found", req);
    const plan = await prisma.billingPlan.findUnique({ where: { iyzicoPlanRef: pricingPlanReferenceCode } });
    if (!plan) {
      console.error("[odeme/sonuc] eşleşen plan yok:", pricingPlanReferenceCode);
      return errBack("plan_not_found", req);
    }

    const status = mapStatus(subscriptionStatus);
    const periodEnd = new Date(Date.now() + (plan.interval === "YEARLY" ? 365 : 30) * 24 * 60 * 60 * 1000);

    await prisma.subscription.upsert({
      where: { iyzicoSubscriptionRef: referenceCode },
      update: {
        status,
        module: plan.module,
        billingPlanId: plan.id,
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

    // Modül subdomain'ine dön (abonelik durumu orada okunur — entitlement guard, P7).
    return redirectTo(moduleReturnUrl(plan.module));
  } catch (e) {
    console.error("[odeme/sonuc] error", e);
    return errBack("internal_error", req);
  }
}
