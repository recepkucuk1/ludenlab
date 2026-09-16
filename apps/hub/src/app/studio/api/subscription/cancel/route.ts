import { NextResponse } from "next/server";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { prisma as centralBilling } from "@/lib/db";
import { cancelAtProviderAndVerify } from "@/lib/iyzicoOps";

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
        const centralSub = await centralBilling.subscription.findFirst({
          where: { accountId: central.id, module: "STUDIO", status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          select: { id: true, iyzicoSubscriptionRef: true, currentPeriodEnd: true },
        });

        await centralBilling.subscription.updateMany({
          where: { accountId: central.id, module: "STUDIO", status: "ACTIVE" },
          data: { status: "CANCELED", cancelledAt: new Date() },
        });

        // SWEEP KÖR NOKTASI (2026-09 denetimi): iptal sağlayıcıya yalnız GÜNLÜK sweep ile
        // bildiriliyordu. Dönemi 24 saatten yakın bir abonelikte, kullanıcı sweep geçtikten
        // sonra iptal ederse yenileme bir sonraki sweep'ten ÖNCE çekilir — kullanıcı iptal
        // ettiğini sanırken parası gider. Bu pencerede iptali HEMEN bildiririz.
        // Daha uzak dönemlerde ertelenmiş bırakılır: "Aboneliği Devam Ettir" çalışmayı
        // sürdürsün diye (sağlayıcıda kapatılan abonelik geri açılamaz).
        const ref = centralSub?.iyzicoSubscriptionRef;
        const periodEnd = centralSub?.currentPeriodEnd;
        if (ref && periodEnd && periodEnd.getTime() - Date.now() <= 24 * 60 * 60 * 1000) {
          const providerResult = await cancelAtProviderAndVerify(ref);
          if (providerResult.closed) {
            await centralBilling.subscription.update({
              where: { id: centralSub!.id },
              data: { iyzicoSubscriptionRef: null },
            });
          } else {
            // ref KORUNUR → sweep yarın tekrar dener (iptal idempotenttir).
            console.error("[cancel] sağlayıcı iptali doğrulanamadı — ref korundu", {
              sub: centralSub!.id,
              observed: providerResult.observed,
              error: providerResult.error,
            });
          }
        }
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
