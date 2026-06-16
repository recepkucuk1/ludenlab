import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@atolye/lib/db";
import { retrieveCheckoutForm } from "@atolye/lib/iyzico";
import { auth } from "@atolye/auth";
import { grantCreditsOnTx, shouldGrantCredits } from "@atolye/lib/credits";

/**
 * 303 redirect so a POST from iyzico is converted to a GET by the browser.
 *
 * IMPORTANT: must use NEXT_PUBLIC_APP_URL as the base, not req.url. In
 * Next.js standalone behind a reverse proxy (Hostinger LiteSpeed) req.url
 * resolves to the internal bind address (http://0.0.0.0:3000/...) which
 * the browser can't reach.
 */
function seeOther(path: string, req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  return NextResponse.redirect(new URL(path, base), { status: 303 });
}

type LocalSubStatus = "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELED";

/** iyzico abonelik durumu → yerel enum. */
function mapSubStatus(s: string | undefined): LocalSubStatus {
  switch (s) {
    case "ACTIVE":
    case "UPGRADED":
      return "ACTIVE";
    case "PENDING":
      return "PENDING";
    case "UNPAID":
      return "PAST_DUE";
    case "CANCELED":
    case "EXPIRED":
      return "CANCELED";
    default:
      return "PENDING";
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token = formData.get("token") as string;

    if (!token) {
      return seeOther("/abonelik/error?reason=missing_token", req);
    }

    // 1. Retrieve the outcome from iyzico. Fields come back FLAT (not under .data).
    const result = await retrieveCheckoutForm(token);

    if (result.status !== "success" || !result.referenceCode) {
      console.error("[iyzico callback error]", result);
      return seeOther(
        `/abonelik/error?reason=${encodeURIComponent(result.errorMessage || "payment_failed")}`,
        req,
      );
    }

    const {
      referenceCode, // subscriptionReferenceCode
      subscriptionStatus,
      pricingPlanReferenceCode,
      customerReferenceCode,
    } = result;

    console.log("[iyzico callback] data:", JSON.stringify(result, null, 2));

    // 2. Identify the user — prefer session, fallback to iyzico customer ref.
    const session = await auth();
    let account = null;

    if (session?.user?.id) {
      account = await prisma.account.findUnique({ where: { id: session.user.id } });
    }

    if (!account && customerReferenceCode) {
      account = await prisma.account.findFirst({
        where: { iyzicoCustomerRef: customerReferenceCode },
      });
    }

    if (!account) {
      console.error(
        "[iyzico callback] Account not found. session:",
        session?.user?.id,
        "customerRef:",
        customerReferenceCode,
      );
      return seeOther("/abonelik/error?reason=user_not_found", req);
    }

    // 3. Find the plan authoritatively via the iyzico pricing plan ref iyzico
    //    returned. Never trust a plan type from the query string — it could be
    //    tampered with to upgrade a user who paid for a cheaper plan.
    const plan = await prisma.plan.findFirst({
      where: {
        OR: [
          { iyzicoMonthlyPlanRef: pricingPlanReferenceCode },
          { iyzicoYearlyPlanRef: pricingPlanReferenceCode },
        ],
      },
    });

    if (!plan) {
      console.error(
        "[iyzico callback] No plan matches pricingPlanRef:",
        pricingPlanReferenceCode,
      );
      return seeOther("/abonelik/error?reason=plan_not_found", req);
    }

    const billingCycle =
      plan.iyzicoYearlyPlanRef === pricingPlanReferenceCode ? "YEARLY" : "MONTHLY";
    const localStatus = mapSubStatus(subscriptionStatus);
    const newPeriodEnd = new Date(
      Date.now() + (billingCycle === "YEARLY" ? 365 : 30) * 24 * 60 * 60 * 1000,
    );

    // 4. Persist the subscription and grant initial credits.
    //    Kredi grant'ı dönem-başına idempotent: bu dönem (callback ya da webhook)
    //    zaten kredilenmişse tekrar yüklemeyiz. lastCreditedPeriodEnd işareti tutar.
    await prisma.$transaction(async (tx) => {
      const existing = await tx.subscription.findUnique({
        where: { iyzicoSubscriptionRef: referenceCode },
        select: { lastCreditedPeriodEnd: true },
      });
      const grant =
        localStatus === "ACTIVE" &&
        plan.creditAmount > 0 &&
        shouldGrantCredits(existing?.lastCreditedPeriodEnd ?? null);

      await tx.subscription.upsert({
        where: { iyzicoSubscriptionRef: referenceCode },
        update: {
          status: localStatus,
          billingCycle,
          iyzicoPricingPlanRef: pricingPlanReferenceCode,
          currentPeriodEnd: newPeriodEnd,
          cancelledAt: null,
          planId: plan.id,
          ...(grant ? { lastCreditedPeriodEnd: newPeriodEnd } : {}),
        },
        create: {
          accountId: account.id,
          planId: plan.id,
          status: localStatus,
          billingCycle,
          currentPeriodEnd: newPeriodEnd,
          iyzicoSubscriptionRef: referenceCode,
          iyzicoPricingPlanRef: pricingPlanReferenceCode,
          ...(grant ? { lastCreditedPeriodEnd: newPeriodEnd } : {}),
        },
      });

      await tx.account.update({
        where: { id: account.id },
        data: {
          planType: plan.type,
          // iyzico müşteri referansını sakla — sonraki webhook/iptal için.
          ...(customerReferenceCode ? { iyzicoCustomerRef: customerReferenceCode } : {}),
        },
      });

      if (grant) {
        await grantCreditsOnTx(tx, account.id, plan.creditAmount, `Abonelik Başlangıç Kredisi (${plan.type})`);
      }
    }, { timeout: 15000 });

    return seeOther("/abonelik/success", req);
  } catch (error) {
    console.error("[Subscription Callback Error]", error);
    return seeOther("/abonelik/error?reason=internal_error", req);
  }
}
