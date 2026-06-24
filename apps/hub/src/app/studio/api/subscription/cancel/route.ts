import { NextResponse } from "next/server";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { prisma as centralBilling } from "@/lib/db";

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

    // 1) OTORİTE: merkezi billing.Subscription → CANCELED. Yenileme cron'u ve
    // reconcile status='ACTIVE' filtreli olduğundan tahsilat durur ve iptal kalır.
    // Para-kritik: hata YUTULMAZ — fırlatırsa catch → 500, yerel mirror'a dokunmadan
    // (tutarlı durum; kullanıcı "iptal ettim" sanıp tahsilat sürmesin).
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
        await centralBilling.subscription.updateMany({
          where: { accountId: central.id, module: "STUDIO", status: "ACTIVE" },
          data: { status: "CANCELED", cancelledAt: new Date() },
        });
      }
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
      cancelledAt: updated.cancelledAt,
      currentPeriodEnd: updated.currentPeriodEnd,
      message: `Aboneliğiniz iptal edildi. ${updated.currentPeriodEnd.toLocaleDateString(
        "tr-TR",
      )} tarihine kadar mevcut planınızın özelliklerini kullanmaya devam edebilirsiniz. İptal kararınızdan vazgeçerseniz "Aboneliği Devam Ettir" butonunu kullanabilirsiniz.`,
    });
  } catch (error) {
    console.error("[cancel] error:", error);
    return NextResponse.json(
      { error: "Sunucu hatası. Daha sonra tekrar deneyin." },
      { status: 500 },
    );
  }
}
