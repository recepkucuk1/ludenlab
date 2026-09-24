import { NextResponse } from "next/server";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { cancelCentralSubscription, cancelMessage } from "@/lib/centralCancel";

/**
 * Cancel the current user's active subscription — DEFERRED mode.
 *
 * OTORİTE = merkezi billing.Subscription. Hem yenileme cron'u (saklı karttan
 * chargeStoredCard) hem modül reconcile, merkezi aboneliği status='ACTIVE' ile
 * okur; bu yüzden iptal MERKEZİ tabloya da yazılmalı (CANCELED) — yoksa iptal
 * sonrası tahsilat sürer ve reconcile iptali geri alır. Yerel mirror UI/resume
 * için CANCELLED yapılır. Kullanıcı dönem sonuna kadar erişimini korur; cleanup
 * cron (/studio/api/cron/subscription-cleanup) süre dolunca FREE'ye düşürür.
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
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Aktif aboneliğiniz bulunamadı." },
        { status: 404 },
      );
    }

    // 1) OTORİTE: merkezi billing.Subscription → CANCELED (ortak kural: lib/centralCancel).
    // Para-kritik: merkez kaydedilemezse yerel mirror'a DOKUNULMAZ ve iptal reddedilir —
    // kullanıcı "iptal ettim" sanıp tahsilat sürmesin.
    const me = await prisma.therapist.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });
    const central = await cancelCentralSubscription({
      module: "STUDIO",
      email: me?.email,
      centralSubscriptionId: subscription.centralSubscriptionId,
    });
    if (!central.ok) {
      return NextResponse.json(
        {
          error:
            "Aboneliğiniz ödeme sisteminde bulunamadığı için iptal edilemedi. Lütfen info@ludenlab.com adresine yazın; tahsilatın durdurulduğundan emin olalım.",
        },
        { status: 409 },
      );
    }

    // 2) Yerel mirror (UI/resume durumu).
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      providerPending: central.providerPending,
      cancelledAt: updated.cancelledAt,
      currentPeriodEnd: updated.currentPeriodEnd,
      message: cancelMessage(updated.currentPeriodEnd, central.providerPending),
    });
  } catch (error) {
    console.error("[cancel] error:", error);
    return NextResponse.json(
      { error: "Sunucu hatası. Daha sonra tekrar deneyin." },
      { status: 500 },
    );
  }
}
