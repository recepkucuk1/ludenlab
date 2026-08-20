import { NextResponse } from "next/server";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { prisma as centralBilling } from "@/lib/db";

/**
 * Undo a deferred cancellation.
 *
 * Works while status = CANCELLED AND currentPeriodEnd > now() (period not yet
 * expired by the cleanup cron). After expiry, resume requires a new checkout
 * (the UI falls back to opening the checkout modal).
 *
 * Simetri (B1): iptal merkezi billing.Subscription'ı CANCELED yaptığı için resume
 * de merkezi tabloyu (dönem içindeyse) ACTIVE'e geri almalı — yoksa yenileme cron'u
 * yine çalışmaz ve dönem sonunda erişim beklenmedik biçimde düşer.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        therapistId: session.user.id,
        status: "CANCELLED",
        currentPeriodEnd: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            "Devam ettirilebilecek bir abonelik bulunamadı. Yeni bir abonelik başlatabilirsiniz.",
        },
        { status: 404 },
      );
    }

    // 1) OTORİTE: merkezi billing.Subscription → ACTIVE (yalnız dönem içindeyken).
    const me = await prisma.therapist.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });
    if (me?.email) {
      const central = await centralBilling.account.findFirst({
        where: { email: { equals: me.email, mode: "insensitive" } },
        select: { id: true },
      });
      if (central) {
        const centralSub = await centralBilling.subscription.findFirst({
          where: {
            accountId: central.id,
            module: "STUDIO",
            status: "CANCELED",
            currentPeriodEnd: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, iyzicoSubscriptionRef: true },
        });

        // SAĞLAYICI KAPISI (2026-08 güvenlik denetimi #08): sweep cron'u dönem sonuna ≤24h
        // kala iyzico'ya iptali bildirir ve `iyzicoSubscriptionRef`'i NULL'lar. Ref yokken
        // "devam ettir" demek, ödemesi ASLA gelmeyecek bir aboneliği ACTIVE yapmaktı:
        // iyzico çekmez, webhook eşleşmez, cleanup cron'u yalnız CANCELLED mirror'a baktığı
        // için de hiç düşmezdi → süresiz ücretsiz PRO (üstüne #01 ile sonsuz kredi).
        // Sağlayıcı tarafında canlı abonelik yoksa devam ettirmek ANLAMSIZ: yeni checkout şart.
        if (!centralSub?.iyzicoSubscriptionRef) {
          return NextResponse.json(
            {
              error:
                "Aboneliğiniz ödeme sağlayıcısında kapatıldığı için devam ettirilemiyor. Lütfen yeni bir abonelik başlatın.",
              requiresCheckout: true,
            },
            { status: 409 },
          );
        }

        await centralBilling.subscription.update({
          where: { id: centralSub.id },
          data: { status: "ACTIVE", cancelledAt: null },
        });
      }
    }

    // 2) Yerel mirror.
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "ACTIVE",
        cancelledAt: null,
      },
    });

    return NextResponse.json({
      ok: true,
      currentPeriodEnd: updated.currentPeriodEnd,
      message: "Aboneliğiniz devam ediyor!",
    });
  } catch (error) {
    console.error("[resume] error:", error);
    return NextResponse.json(
      { error: "Sunucu hatası. Daha sonra tekrar deneyin." },
      { status: 500 },
    );
  }
}
