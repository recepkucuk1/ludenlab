import { NextResponse } from "next/server";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";

/**
 * Undo a deferred cancellation.
 *
 * Works while status = CANCELLED AND currentPeriodEnd > now() (period not yet
 * expired by the cleanup cron). After expiry, resume requires a new checkout
 * (the UI falls back to opening the checkout modal).
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
