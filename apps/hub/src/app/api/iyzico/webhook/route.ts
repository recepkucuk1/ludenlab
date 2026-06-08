import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { verifyIyzicoSignature, normalizeIyzicoEvent } from "@ludenlab/billing";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Tek apex iyzico webhook ucu (ludenlab.com/api/iyzico/webhook).
 * verify (X-IYZ-SIGNATURE-V3) → normalize → `WebhookEvent` idempotency (CAS) →
 * merkezi `billing.Subscription` durumunu güncelle. Modül-özel fulfillment
 * (kredi/erişim/lisans) Faz C (fan-out / entitlement). Her durumda hızlı yanıt;
 * hata → 500 (iyzico retry eder), imza geçersiz → 401, kötü payload → 400.
 */
function eventStatus(
  eventType: string,
): "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED" | null {
  switch (eventType) {
    case "subscription.order.success":
      return "ACTIVE";
    case "subscription.order.failure":
    case "subscription.unpaid":
      return "PAST_DUE";
    case "subscription.cancelled":
      return "CANCELED";
    case "subscription.expired":
      return "EXPIRED";
    default:
      return null; // bilinmeyen/işlenmeyen olay
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("x-iyz-signature-v3");

  const event = normalizeIyzicoEvent(rawBody);
  if (!event) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const valid = verifyIyzicoSignature(
    sig,
    {
      iyziEventType: event.eventType,
      subscriptionReferenceCode: event.subscriptionReferenceCode,
      orderReferenceCode: event.orderReferenceCode,
      customerReferenceCode: event.customerReferenceCode,
    },
    process.env.IYZICO_MERCHANT_ID ?? "",
    process.env.IYZICO_SECRET_KEY ?? "",
  );
  if (!valid) {
    console.warn("[iyzico webhook] geçersiz imza");
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  // İdempotency: olay kimliğini WebhookEvent'e yaz. Zaten processed ise erken çık.
  const delivery = await prisma.webhookEvent.upsert({
    where: { externalId: event.iyziReferenceCode },
    create: {
      externalId: event.iyziReferenceCode,
      eventType: event.eventType,
      payload: event.raw as Prisma.InputJsonValue,
      status: "received",
    },
    update: { attempts: { increment: 1 }, payload: event.raw as Prisma.InputJsonValue, error: null },
  });
  if (delivery.status === "processed") return NextResponse.json({ ok: true, dedup: true });

  try {
    await prisma.$transaction(
      async (tx) => {
        // CAS: yalnız received/failed iken processed'a alan kazanır (paralel retry-safe).
        const claim = await tx.webhookEvent.updateMany({
          where: { id: delivery.id, status: { in: ["received", "failed"] } },
          data: { status: "processed", processedAt: new Date(), error: null },
        });
        if (claim.count === 0) return; // başka istek kapattı

        const sub = await tx.subscription.findUnique({
          where: { iyzicoSubscriptionRef: event.subscriptionReferenceCode },
          include: { billingPlan: true },
        });
        if (!sub) return; // bu DB'de yok — merkez modelde tüm abonelikler burada olmalı; sessiz geç

        const status = eventStatus(event.eventType);
        if (!status) {
          await tx.webhookEvent.update({ where: { id: delivery.id }, data: { module: sub.module } });
          return; // bilinmeyen olay: sahipli ama durum değişmez
        }

        const days = sub.billingPlan?.interval === "YEARLY" ? 365 : 30;
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            status,
            ...(status === "ACTIVE"
              ? { currentPeriodEnd: new Date(Date.now() + days * 24 * 60 * 60 * 1000) }
              : {}),
            ...(status === "CANCELED" ? { cancelledAt: sub.cancelledAt ?? new Date() } : {}),
          },
        });
        await tx.webhookEvent.update({ where: { id: delivery.id }, data: { module: sub.module } });
      },
      { timeout: 15000 },
    );
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    await prisma.webhookEvent
      .update({ where: { id: delivery.id }, data: { status: "failed", error: msg.slice(0, 4000) } })
      .catch((markErr) => console.error("[iyzico webhook] failed-mark error", markErr));
    console.error("[iyzico webhook] fulfillment error", msg);
    return NextResponse.json({ error: "fulfillment_error" }, { status: 500 }); // iyzico retry
  }

  return NextResponse.json({ ok: true });
}
