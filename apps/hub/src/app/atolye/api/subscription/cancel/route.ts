import { NextResponse } from "next/server";
import { auth } from "@atolye/auth";
import { prisma } from "@atolye/lib/db";

/**
 * Cancel the current user's active subscription — DEFERRED mode.
 *
 * Mark the subscription CANCELED locally; the user keeps access until
 * period-end and can undo via "Resume". Paynkolay has NO provider-side
 * recurring — the renewal cron simply will not charge a CANCELED sub, so there
 * is nothing to cancel at the provider. The cleanup cron (/atolye/api/cron/subscription-cleanup)
 * downgrades the Account to FREE once the period has passed.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        accountId: session.user.id,
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

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "CANCELED",
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
