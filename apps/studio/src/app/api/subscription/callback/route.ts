import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { retrieveCheckoutForm } from "@/lib/iyzico";
import { auth } from "@/auth";
import { grantCredits } from "@/lib/credits";

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

type StudioSubStatus = "PENDING" | "ACTIVE" | "CANCELLED" | "EXPIRED";

/** iyzico abonelik durumu → studio enum. */
function mapSubStatus(s: string | undefined): StudioSubStatus {
  switch (s) {
    case "ACTIVE":
    case "UPGRADED":
      return "ACTIVE";
    case "CANCELED":
    case "CANCELLED":
      return "CANCELLED";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return "PENDING"; // PENDING, UNPAID, …
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token = formData.get("token") as string;

    if (!token) {
      return seeOther("/subscription/error?reason=missing_token", req);
    }

    // 1. Retrieve the outcome from iyzico. Alanlar KÖKTE gelir (data altında değil).
    const result = await retrieveCheckoutForm(token);

    if (result.status !== "success" || !result.referenceCode) {
      console.error("[iyzico callback error]", result);
      return seeOther(
        `/subscription/error?reason=${encodeURIComponent(result.errorMessage || "payment_failed")}`,
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
    let therapist = null;

    if (session?.user?.id) {
      therapist = await prisma.therapist.findUnique({ where: { id: session.user.id } });
    }

    if (!therapist && customerReferenceCode) {
      const existing = await prisma.subscription.findFirst({
        where: { iyzicoCustomerRef: customerReferenceCode },
        select: { therapistId: true },
      });
      if (existing) {
        therapist = await prisma.therapist.findUnique({ where: { id: existing.therapistId } });
      }
    }

    if (!therapist) {
      console.error(
        "[iyzico callback] Therapist not found. session:",
        session?.user?.id,
        "customerRef:",
        customerReferenceCode,
      );
      return seeOther("/subscription/error?reason=user_not_found", req);
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
      return seeOther("/subscription/error?reason=plan_not_found", req);
    }

    const billingCycle =
      plan.iyzicoYearlyPlanRef === pricingPlanReferenceCode ? "YEARLY" : "MONTHLY";
    const localStatus = mapSubStatus(subscriptionStatus);

    // 4. Persist the subscription and grant initial credits.
    //    iyzico sandbox does not fire subscription.order.success for the initial
    //    payment, so we grant here. Renewals are handled by the webhook, which
    //    is idempotent via WebhookDelivery — no double-grant risk.
    await prisma.$transaction(async (tx) => {
      await tx.subscription.upsert({
        where: { iyzicoSubscriptionRef: referenceCode },
        update: {
          status: localStatus,
          billingCycle,
          iyzicoCustomerRef: customerReferenceCode,
          iyzicoPricingPlanRef: pricingPlanReferenceCode,
          currentPeriodEnd: new Date(
            Date.now() + (billingCycle === "YEARLY" ? 365 : 30) * 24 * 60 * 60 * 1000,
          ),
          cancelledAt: null,
          planId: plan.id,
        },
        create: {
          therapistId: therapist.id,
          planId: plan.id,
          status: localStatus,
          billingCycle,
          currentPeriodEnd: new Date(
            Date.now() + (billingCycle === "YEARLY" ? 365 : 30) * 24 * 60 * 60 * 1000,
          ),
          iyzicoSubscriptionRef: referenceCode,
          iyzicoCustomerRef: customerReferenceCode,
          iyzicoPricingPlanRef: pricingPlanReferenceCode,
        },
      });

      await tx.therapist.update({
        where: { id: therapist.id },
        data: {
          planType: plan.type,
          studentLimit: plan.studentLimit,
          pdfEnabled: plan.pdfEnabled,
        },
      });

      if (plan.creditAmount > 0) {
        await grantCredits(
          therapist.id,
          plan.creditAmount,
          `Abonelik Başlangıç Kredisi (${plan.type})`,
          tx,
        );
      }
    });

    return seeOther("/subscription/success", req);
  } catch (error) {
    console.error("[Subscription Callback Error]", error);
    return seeOther("/subscription/error?reason=internal_error", req);
  }
}
