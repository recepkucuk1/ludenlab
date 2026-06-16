import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/atolye/client";
import { createWebhookRouter, type FulfillmentContext, type FulfillmentHandler } from "@ludenlab/billing";
import { prisma } from "@atolye/lib/db";
import { grantCreditsOnTx, shouldGrantCredits } from "@atolye/lib/credits";

export const runtime = "nodejs";

/**
 * iyzico webhook — ortak @ludenlab/billing router'ı + atölye fulfillment handler.
 *
 * Router (pakette): imza doğrula → normalize → sahiplenen handler'ı bul → ilgili
 * olay metodunu çağır; atölye DB'sinde olmayan abonelikleri brytakip'e forward et.
 * İdempotency + DB + kredi BU handler'ın işidir (WebhookDelivery CAS + atomik tx).
 */

type FulfillAction = "success" | "failure" | "cancelled" | "expired";

async function fulfill(ctx: FulfillmentContext, action: FulfillAction): Promise<void> {
  const { iyziReferenceCode, subscriptionReferenceCode, raw } = ctx.event;

  // Phase 1 — receipt (idempotency). Daha önce processed ise erken dön.
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

  // Phase 2 — ana iş. Hata olursa Phase 3'te 'failed' işaretlenir + rethrow (router 500).
  try {
    await prisma.$transaction(
      async (tx) => {
        // CAS: yalnız received/failed iken processed'a alan kazanır.
        const claim = await tx.webhookDelivery.updateMany({
          where: { id: delivery.id, status: { in: ["received", "failed"] } },
          data: { status: "processed", processedAt: new Date(), error: null },
        });
        if (claim.count === 0) return; // başka paralel istek kapattı; idempotent çıkış

        const subscription = await tx.subscription.findUnique({
          where: { iyzicoSubscriptionRef: subscriptionReferenceCode },
          include: { plan: true, account: true },
        });
        if (!subscription) return; // owns() true'ydu ama yarış olabilir; processed kapanır

        if (action === "success") {
          const newPeriodEnd = new Date(
            Date.now() + (subscription.billingCycle === "YEARLY" ? 365 : 30) * 24 * 60 * 60 * 1000,
          );
          // Bu dönem callback'te zaten kredilenmişse tekrar yükleme (callback↔webhook idempotency).
          const grant =
            subscription.plan.creditAmount > 0 &&
            shouldGrantCredits(subscription.lastCreditedPeriodEnd);

          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              status: "ACTIVE",
              currentPeriodEnd: newPeriodEnd,
              ...(grant ? { lastCreditedPeriodEnd: newPeriodEnd } : {}),
            },
          });
          if (grant) {
            await grantCreditsOnTx(
              tx,
              subscription.account.id,
              subscription.plan.creditAmount,
              `Abonelik Ödemesi (${subscription.plan.type})`,
            );
          }
        } else if (action === "failure") {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: { status: "PENDING" },
          });
        } else if (action === "cancelled" || action === "expired") {
          if (subscription.status !== "CANCELED") {
            await tx.subscription.update({
              where: { id: subscription.id },
              data: { status: "CANCELED", cancelledAt: subscription.cancelledAt ?? new Date() },
            });
          }
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

const atolyeHandler: FulfillmentHandler = {
  product: "atolye",
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

// Tek iyzico hesabı / tek webhook → bu app sahiplenmezse kardeş app'lere fan-out.
// IYZICO_WEBHOOK_FORWARD_URLS = virgülle ayrılmış (studio + brytakip webhook uçları).
const forwardUrls = (process.env.IYZICO_WEBHOOK_FORWARD_URLS ?? process.env.BRYTAKIP_WEBHOOK_URL ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const router = createWebhookRouter({
  merchantId: process.env.IYZICO_MERCHANT_ID ?? "",
  secretKey: process.env.IYZICO_SECRET_KEY ?? "",
  handlers: [atolyeHandler],
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
