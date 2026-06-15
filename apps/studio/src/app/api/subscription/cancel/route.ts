import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Cancel the current user's active subscription — DEFERRED mode.
 *
 * We do NOT call iyzico here. Instead we mark the subscription CANCELLED
 * locally, keeping `iyzicoSubscriptionRef` intact and recurring still ON
 * at iyzico's side. This gives us a true "Resume" capability — the user
 * can undo the cancellation any time before period-end and we just clear
 * the flag, no payment side effects.
 *
 * The actual iyzico cancel is performed by /api/cron/subscription-cleanup
 * (daily cron, ~24h before currentPeriodEnd). That cron also downgrades the
 * Therapist to FREE. If for some reason cron does not run before iyzico's
 * renewal date, iyzico WILL charge the renewal — that is the cost of this
 * design and why the daily cron is required infrastructure.
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
