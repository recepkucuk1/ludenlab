import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { grantCreditsOnTx, isNewCreditPeriod } from "@/lib/credits";

/**
 * iyzico X-IYZ-SIGNATURE-V3 imza doğrulaması.
 *
 * İmza: HMAC-SHA256(secretKey, merchantId + secretKey + iyziEventType
 *                              + subscriptionReferenceCode + orderReferenceCode
 *                              + customerReferenceCode)
 * Çıktı: HEX (küçük harf)
 * Kaynak: https://docs.iyzico.com/ek-servisler/webhook#abonelik-bildirimleri
 */
function verifyIyzicoSignature(
  headerSig: string | null,
  fields: {
    iyziEventType: string;
    subscriptionReferenceCode: string;
    orderReferenceCode: string;
    customerReferenceCode?: string;
  },
): boolean {
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const merchantId = process.env.IYZICO_MERCHANT_ID;

  if (!secretKey || !merchantId) {
    console.error("[iyzico webhook] IYZICO_SECRET_KEY veya IYZICO_MERCHANT_ID eksik");
    return false;
  }
  if (!headerSig) return false;

  const data =
    merchantId +
    secretKey +
    fields.iyziEventType +
    fields.subscriptionReferenceCode +
    fields.orderReferenceCode +
    (fields.customerReferenceCode || "");

  const expected = crypto.createHmac("sha256", secretKey).update(data, "utf8").digest("hex");
  const provided = headerSig.toLowerCase();

  // timingSafeEqual throws on length mismatch — short-circuit safely.
  if (expected.length !== provided.length) return false;

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

/**
 * iyzico Webhook handler
 *
 * Desteklenen eventler:
 * - subscription.order.success
 * - subscription.order.failure
 * - subscription.cancelled
 * - subscription.expired
 *
 * WebhookDelivery yazma sözleşmesi (admin observability için kritik):
 *   1. Payload parse + imza geçtikten sonra `received` upsert (attempts++).
 *   2. Aynı externalId daha önce "processed" ise erken döneriz — yine attempts++
 *      sayaca yansır.
 *   3. Ana iş başarısı durumunda "processed" + processedAt; subscription bizim
 *      sistemimizde yoksa yine "processed" olarak kapatılır (admin filtreyle ayırır).
 *   4. Ana işte hata fırlarsa "failed" + error stringi kaydedilir.
 * İmza fail / payload eksikse DB'ye yazılmaz (kötü-niyetli istek gürültüsü).
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const iyziEventType = typeof event.iyziEventType === "string" ? event.iyziEventType : "";
  const iyziReferenceCode = typeof event.iyziReferenceCode === "string" ? event.iyziReferenceCode : "";
  const subscriptionReferenceCode = typeof event.subscriptionReferenceCode === "string" ? event.subscriptionReferenceCode : "";

  if (!iyziEventType || !iyziReferenceCode || !subscriptionReferenceCode) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const sig = req.headers.get("x-iyz-signature-v3");
  if (
    !verifyIyzicoSignature(sig, {
      iyziEventType,
      subscriptionReferenceCode,
      orderReferenceCode: typeof event.orderReferenceCode === "string" ? event.orderReferenceCode : "",
      customerReferenceCode: typeof event.customerReferenceCode === "string" ? event.customerReferenceCode : "",
    })
  ) {
    console.warn("[iyzico webhook] Geçersiz imza");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ─── Multi-tenant router ──────────────────────────────────────────────────
  // iyzico merchant hesabı brytakip ile paylaşımlı. Webhook URL'i ludenlab'a
  // ayarlı; bu subscription ludenlab DB'sinde yoksa brytakip'in olabilir,
  // imza geçti — orijinal payload + imza header'ıyla forward et.
  try {
    const localSub = await prisma.subscription.findUnique({
      where: { iyzicoSubscriptionRef: subscriptionReferenceCode },
      select: { id: true },
    });
    if (!localSub) {
      const fwdUrl = process.env.BRYTAKIP_WEBHOOK_URL ?? "https://brytakip.com/api/webhooks/iyzico";
      try {
        const fwd = await fetch(fwdUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-iyz-signature-v3": sig ?? "",
          },
          body: rawBody,
        });
        console.log(
          `[iyzico webhook] Sub ${subscriptionReferenceCode} not in ludenlab DB → forwarded to brytakip (${fwd.status})`,
        );
      } catch (err) {
        console.error("[iyzico webhook] Forward to brytakip failed", err);
      }
      // Forward sonucundan bağımsız 200 dön — iyzico retry kuyruğuna takılmasın.
      return NextResponse.json({ ok: true, forwarded: "brytakip" });
    }
  } catch (err) {
    console.error("[iyzico webhook] Router lookup error", err);
    // Hata durumunda ludenlab kendi handler'ına devam etsin (best-effort).
  }

  // Phase 1 — receipt kaydı. Daha önce processed ise upsert sadece sayacı artırır.
  const delivery = await prisma.webhookDelivery.upsert({
    where: { provider_externalId: { provider: "iyzico", externalId: iyziReferenceCode } },
    create: {
      provider: "iyzico",
      externalId: iyziReferenceCode,
      payload: event as unknown as Prisma.InputJsonValue,
      status: "received",
    },
    update: {
      attempts: { increment: 1 },
      payload: event as unknown as Prisma.InputJsonValue,
      error: null,
    },
  });

  if (delivery.status === "processed") {
    console.log(`[iyzico webhook] Event ${iyziReferenceCode} already processed (attempt ${delivery.attempts}).`);
    return NextResponse.json({ ok: true, message: "Already processed" });
  }

  // Phase 2 — ana iş. Hata olursa Phase 3'te delivery 'failed' yapılır.
  try {
    await prisma.$transaction(async (tx) => {
      // CAS: yalnızca received/failed iken processed'a alabilen kazanır.
      const claim = await tx.webhookDelivery.updateMany({
        where: { id: delivery.id, status: { in: ["received", "failed"] } },
        data: { status: "processed", processedAt: new Date(), error: null },
      });
      if (claim.count === 0) {
        // Başka bir paralel istek bizden önce kapattı; idempotent erken çıkış.
        return;
      }

      const subscription = await tx.subscription.findUnique({
        where: { iyzicoSubscriptionRef: subscriptionReferenceCode },
        include: { plan: true, account: true },
      });

      if (!subscription) {
        console.warn(`[iyzico webhook] Sub Ref ${subscriptionReferenceCode} not found in DB`);
        // Delivery yine processed olarak kapanır; admin payload üzerinden ayırt eder.
        return;
      }

      if (iyziEventType === "subscription.order.success") {
        const newPeriodEnd = new Date(
          Date.now() + (subscription.billingCycle === "YEARLY" ? 365 : 30) * 24 * 60 * 60 * 1000,
        );
        // Bu dönem callback'te zaten kredilenmişse tekrar yükleme (callback↔webhook idempotency).
        const grant =
          subscription.plan.creditAmount > 0 &&
          isNewCreditPeriod(subscription.lastCreditedPeriodEnd, newPeriodEnd);

        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "ACTIVE",
            currentPeriodEnd: newPeriodEnd,
            ...(grant ? { lastCreditedPeriodEnd: newPeriodEnd } : {}),
          },
        });

        if (grant) {
          await grantCreditsOnTx(tx, subscription.account.id, subscription.plan.creditAmount, `Abonelik Ödemesi (${subscription.plan.type})`);
        }
      } else if (
        iyziEventType === "subscription.order.failure" ||
        iyziEventType === "subscription.unpaid"
      ) {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: { status: "PENDING" },
        });
      } else if (iyziEventType === "subscription.cancelled") {
        if (subscription.status !== "CANCELED") {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              status: "CANCELED",
              cancelledAt: subscription.cancelledAt ?? new Date(),
            },
          });
        }
      } else if (iyziEventType === "subscription.expired") {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "CANCELED",
            cancelledAt: subscription.cancelledAt ?? new Date(),
          },
        });
      }
    }, { timeout: 15000 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[iyzico Webhook Error]", error);
    const errMsg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    // Phase 3 — failure trail. Update'in kendisi de fail ederse logla, 500'le geç.
    try {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: "failed", error: errMsg.slice(0, 4000) },
      });
    } catch (markErr) {
      console.error("[iyzico Webhook] failed-state mark error", markErr);
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
