import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { diagnoseIyzicoSignature, verifyIyzicoSignature, normalizeIyzicoEvent } from "@ludenlab/billing";
import { prisma } from "@/lib/db";
import { retrieveSubscription } from "@/lib/iyzico";
import { resolveSubscriptionPeriodEnd } from "@/lib/iyzicoOps";
import { buildInvoiceSnapshot } from "@/lib/invoiceIdentity";

export const runtime = "nodejs";

/**
 * Tek apex iyzico webhook ucu (ludenlab.com/api/iyzico/webhook — iyzico panelde bu URL).
 * verify (X-IYZ-SIGNATURE-V3) → normalize → `WebhookEvent` idempotency (CAS) →
 * merkezi `billing.Subscription` güncelle + BAŞARILI tahsilatı `Payment`'a yaz
 * (fatura listesinin TEK kaynağı — ilk ödeme + yenilemeler; clientRefCode unique).
 * Kredi/erişim modül reconcile'ının işi. Hata → 500 (iyzico retry), imza → 401.
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
    // Tanı (2026-09-19): uç açıldığından beri hiçbir bildirimi kabul etmedi. Hangi formülle
    // imzalandığını ölçer; yalnız bayrak/alan adı/varyant adı yazar, değer ya da sır YAZMAZ.
    const merchantId = process.env.IYZICO_MERCHANT_ID ?? "";
    const secretKey = process.env.IYZICO_SECRET_KEY ?? "";
    const diagnosis = diagnoseIyzicoSignature(sig, event.raw, merchantId, secretKey);

    // 2026-09-20 canlı kanıtı: gerçek `subscription.order.success` bildiriminde
    // `x-iyz-signature-v3` HİÇ YOK. İmza başka bir başlıkla mı geliyor? Başlık
    // ADLARINI (değerleri DEĞİL) ve imza olabilecek adayların varyant sonucunu yaz.
    const headerNames: string[] = [];
    const candidates: { name: string; length: number; format: string; matchedVariant: string }[] = [];
    req.headers.forEach((value, name) => {
      headerNames.push(name);
      if (/iyz|signature|sign|hash|hmac/i.test(name)) {
        const d = diagnoseIyzicoSignature(value, event.raw, merchantId, secretKey);
        candidates.push({ name, length: d.header.length, format: d.header.format, matchedVariant: d.matchedVariant });
      }
    });

    console.warn(
      "[iyzico webhook] geçersiz imza",
      JSON.stringify({ ...diagnosis, headerNames: headerNames.sort(), candidates }),
    );
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

  // Yenileme/başarı (ACTIVE) ise dönem sonunu iyzico'nun GERÇEK endDate'inden al →
  // drift ve ilk-dönem çift-sayımı olmaz. Tx DIŞINDA (harici API tx'i bekletmesin).
  let iyzicoPeriodEnd: Date | null = null;
  let retrieved: Awaited<ReturnType<typeof retrieveSubscription>> | null = null;
  if (eventStatus(event.eventType) === "ACTIVE") {
    try {
      retrieved = await retrieveSubscription(event.subscriptionReferenceCode);
      iyzicoPeriodEnd = resolveSubscriptionPeriodEnd(retrieved);
    } catch (e) {
      console.error("[iyzico webhook] retrieveSubscription başarısız → now+interval fallback", e);
    }
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        // CAS: yalnız received/failed iken processed'a alan kazanır (paralel retry-safe).
        const claim = await tx.webhookEvent.updateMany({
          where: { id: delivery.id, status: { in: ["received", "failed"] } },
          data: { status: "processed", processedAt: new Date(), error: null },
        });
        if (claim.count === 0) return; // başka istek kapattı

        let sub = await tx.subscription.findUnique({
          where: { iyzicoSubscriptionRef: event.subscriptionReferenceCode },
          include: { billingPlan: true },
        });

        const status = eventStatus(event.eventType);

        // GÜVENLİK AĞI (2026-08 güvenlik denetimi #12): abonelik bu DB'de yoksa ve olay
        // BAŞARILI bir tahsilat ise, callback (/odeme/sonuc) hiç çalışmamış olabilir →
        // müşteri ödedi ama aboneliği yok. Burada iyzico'nun kendi verisinden provision
        // etmeyi dener (müşteri ref → Account, plan ref → BillingPlan). Çözülemezse
        // sessiz geçilir (bry gibi KARDEŞ ÜRÜNlerin abonelikleri bu DB'de olmayabilir),
        // ama artık GÖRÜNÜR biçimde loglanır — eskiden iz bırakmadan yutuluyordu.
        if (!sub && status === "ACTIVE") {
          const customerRef = event.customerReferenceCode || retrieved?.customerReferenceCode || "";
          const planRef = retrieved?.pricingPlanReferenceCode || "";
          const [orphanAccount, orphanPlan] = await Promise.all([
            customerRef
              ? tx.account.findFirst({ where: { iyzicoCustomerRef: customerRef }, select: { id: true } })
              : Promise.resolve(null),
            planRef ? tx.billingPlan.findUnique({ where: { iyzicoPlanRef: planRef } }) : Promise.resolve(null),
          ]);

          if (orphanAccount && orphanPlan) {
            const days = orphanPlan.interval === "YEARLY" ? 365 : 30;
            await tx.subscription.create({
              data: {
                accountId: orphanAccount.id,
                module: orphanPlan.module,
                billingPlanId: orphanPlan.id,
                status: "ACTIVE",
                iyzicoSubscriptionRef: event.subscriptionReferenceCode,
                iyzicoPricingPlanRef: planRef,
                currentPeriodEnd: iyzicoPeriodEnd ?? new Date(Date.now() + days * 24 * 60 * 60 * 1000),
              },
            });
            sub = await tx.subscription.findUnique({
              where: { iyzicoSubscriptionRef: event.subscriptionReferenceCode },
              include: { billingPlan: true },
            });
            console.warn(
              "[iyzico webhook] callback kaçtı → abonelik webhook'tan provision edildi",
              event.subscriptionReferenceCode,
            );
          } else {
            console.warn("[iyzico webhook] sahipsiz BAŞARILI tahsilat — provision edilemedi", {
              subscriptionRef: event.subscriptionReferenceCode,
              resolvedAccount: Boolean(orphanAccount),
              resolvedPlan: Boolean(orphanPlan),
            });
          }
        }

        if (!sub) return; // bu DB'de yok — sessiz geç (bry ayrı ürün/DB)

        if (!status) {
          await tx.webhookEvent.update({ where: { id: delivery.id }, data: { module: sub.module } });
          return; // bilinmeyen olay: sahipli ama durum değişmez
        }

        // İPTALİ GERİ ALMA KORUMASI (2026-09 denetimi): kullanıcı iptal ettiyse gelen bir
        // "order.success" aboneliği sessizce ACTIVE'e döndürüyordu — iptal iradesi kaybolur,
        // modül reconcile'ı planı geri yükseltir ve kullanıcı iptalini yeniden yapmak zorunda
        // kalır. Para HAREKET ETTİYSE fatura yine yazılır (aşağıda), ama durum CANCELED kalır.
        const iptalKorunuyor = sub.status === "CANCELED" && status !== "EXPIRED";
        if (iptalKorunuyor) {
          console.error(
            "[iyzico webhook] İPTAL EDİLMİŞ ABONELİKTE OLAY — durum korunuyor, İNCELE",
            { sub: sub.id, event: event.eventType, ref: event.subscriptionReferenceCode },
          );
        }

        const days = sub.billingPlan?.interval === "YEARLY" ? 365 : 30;
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            status: iptalKorunuyor ? sub.status : status,
            ...(status === "ACTIVE" && !iptalKorunuyor
              ? { currentPeriodEnd: iyzicoPeriodEnd ?? new Date(Date.now() + days * 24 * 60 * 60 * 1000) }
              : {}),
            ...(status === "CANCELED" ? { cancelledAt: sub.cancelledAt ?? new Date() } : {}),
          },
        });

        // BAŞARILI tahsilat → Payment (fatura listesi; tek yazım noktası burası).
        // clientRefCode = iyzico order ref (olay bazında unique) → tekrar teslimler idempotent.
        if (status === "ACTIVE") {
          const orderRef = event.orderReferenceCode || event.iyziReferenceCode;
          const prior = await tx.payment.count({ where: { accountId: sub.accountId, module: sub.module } });
          // Fatura kimliği TAHSİLAT ANINDA dondurulur (VUK): sonradan profil değişse de bu
          // kaydın faturası işlem anındaki alıcıya kesilir. Yalnız yeni kayıtta yazılır.
          const payer = await tx.account.findUnique({
            where: { id: sub.accountId },
            select: { email: true, name: true, billingProfile: true },
          });
          const invoiceSnapshot = payer
            ? (buildInvoiceSnapshot(payer, payer.billingProfile, { capturedAt: new Date() }) as Prisma.InputJsonValue)
            : undefined;
          await tx.payment.upsert({
            where: { clientRefCode: `iyz-order-${orderRef}` },
            update: {},
            create: {
              accountId: sub.accountId,
              module: sub.module,
              billingPlanId: sub.billingPlanId,
              amount: sub.billingPlan?.price ?? 0,
              kind: prior === 0 ? "INITIAL" : "RENEWAL",
              clientRefCode: `iyz-order-${orderRef}`,
              providerRef: event.orderReferenceCode || event.subscriptionReferenceCode,
              ...(invoiceSnapshot ? { invoiceSnapshot } : {}),
            },
          });
        }

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
