import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/studio/client";
import { createWebhookRouter, type FulfillmentContext, type FulfillmentHandler } from "@ludenlab/billing";
import { prisma } from "@studio/lib/db";
import { grantCredits } from "@studio/lib/credits";

export const runtime = "nodejs";

/**
 * iyzico webhook — ortak @ludenlab/billing router'ı + studio fulfillment handler.
 * Router (pakette): imza doğrula → normalize → sahiplenen handler'ı bul → olay metodu;
 * studio DB'sinde olmayan abonelikler kardeş app'lere fan-out edilir.
 * İdempotency (WebhookDelivery CAS) + DB + kredi BU handler'ın işidir.
 */

type FulfillAction = "success" | "failure" | "cancelled" | "expired";

async function fulfill(ctx: FulfillmentContext, action: FulfillAction): Promise<void> {
  const { iyziReferenceCode, subscriptionReferenceCode, raw } = ctx.event;

  const delivery = await prisma.webhookDelivery.upsert({
    where: { provider_externalId: { provider: "iyzico", externalId: iyziReferenceCode } },
    create: {
      provider: "iyzico",
      externalId: iyziReferenceCode,
      payload: raw as unknown as Prisma.InputJsonValue,
      status: "received",
    },
    update: {
      attempts: { increment: 1 },
      payload: raw as unknown as Prisma.InputJsonValue,
      error: null,
    },
  });
  if (delivery.status === "processed") return;

  try {
    await prisma.$transaction(
      async (tx) => {
        const claim = await tx.webhookDelivery.updateMany({
          where: { id: delivery.id, status: { in: ["received", "failed"] } },
          data: { status: "processed", processedAt: new Date(), error: null },
        });
        if (claim.count === 0) return;

        const subscription = await tx.subscription.findUnique({
          where: { iyzicoSubscriptionRef: subscriptionReferenceCode },
          include: { plan: true, therapist: true },
        });
        if (!subscription) return;

        if (action === "success") {
          const newPeriodEnd = new Date(
            Date.now() + (subscription.billingCycle === "YEARLY" ? 365 : 30) * 24 * 60 * 60 * 1000,
          );
          await tx.subscription.update({
            where: { id: subscription.id },
            data: { status: "ACTIVE", currentPeriodEnd: newPeriodEnd },
          });
          if (subscription.plan.creditAmount > 0) {
            await grantCredits(
              subscription.therapist.id,
              subscription.plan.creditAmount,
              `Abonelik Ödemesi (${subscription.plan.type})`,
              tx,
            );
          }
        } else if (action === "failure") {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: { status: "PENDING" },
          });
          await tx.therapist.update({
            where: { id: subscription.therapist.id },
            data: { planType: "FREE", studentLimit: 2, pdfEnabled: false },
          });
        } else if (action === "cancelled") {
          if (subscription.status !== "EXPIRED") {
            await tx.subscription.update({
              where: { id: subscription.id },
              data: { status: "CANCELLED", cancelledAt: subscription.cancelledAt ?? new Date() },
            });
          }
        } else if (action === "expired") {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: { status: "EXPIRED", cancelledAt: subscription.cancelledAt ?? new Date() },
          });
          await tx.therapist.update({
            where: { id: subscription.therapist.id },
            data: { planType: "FREE", studentLimit: 2, pdfEnabled: false },
          });
        }
      },
      { timeout: 15000 },
    );
  } catch (error) {
    const errMsg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    try {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: "failed", error: errMsg.slice(0, 4000) },
      });
    } catch (markErr) {
      console.error("[iyzico webhook] failed-state mark error", markErr);
    }
    throw error; // router 500 döndürsün → iyzico retry eder
  }
}

const studioHandler: FulfillmentHandler = {
  product: "studio",
  async owns(subscriptionReferenceCode) {
    const s = await prisma.subscription.findUnique({
      where: { iyzicoSubscriptionRef: subscriptionReferenceCode },
      select: { id: true },
    });
    return !!s;
  },
  onSuccess: (ctx) => fulfill(ctx, "success"),
  onFailure: (ctx) => fulfill(ctx, "failure"),
  onCancelled: (ctx) => fulfill(ctx, "cancelled"),
  onExpired: (ctx) => fulfill(ctx, "expired"),
};

const forwardUrls = (process.env.IYZICO_WEBHOOK_FORWARD_URLS ?? process.env.BRYTAKIP_WEBHOOK_URL ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const router = createWebhookRouter({
  merchantId: process.env.IYZICO_MERCHANT_ID ?? "",
  secretKey: process.env.IYZICO_SECRET_KEY ?? "",
  handlers: [studioHandler],
  forwardUrls,
});

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("x-iyz-signature-v3");
  const forwarded = req.headers.get("x-ll-forwarded") === "1";

  const result = await router.handle(rawBody, sig, { forwarded });

  if (!result.ok) {
    if (result.status === 401) console.warn("[iyzico webhook] Geçersiz imza");
    if (result.status === 500) console.error("[iyzico webhook] fulfillment hatası", result.reason);
    return NextResponse.json({ error: result.reason ?? "error" }, { status: result.status ?? 400 });
  }

  return NextResponse.json({ ok: true, routedTo: result.routedTo, forwarded: result.forwarded ?? false });
}
