import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const MODULES = ["STUDIO", "ATOLYE"] as const;

/**
 * Zamanlanmış downgrade'i İPTAL et ("vazgeç"). Kullanıcının ilgili modüldeki ACTIVE
 * aboneliğinin pendingBillingPlanId'sini temizler → mevcut (yüksek) plan kesintisiz devam eder.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

    const { module } = (await req.json()) as { module?: string };
    if (!module || !MODULES.includes(module as (typeof MODULES)[number])) {
      return NextResponse.json({ error: "Geçersiz modül." }, { status: 400 });
    }

    const sub = await prisma.subscription.findFirst({
      where: {
        accountId: session.user.id,
        module: module as (typeof MODULES)[number],
        status: "ACTIVE",
        pendingBillingPlanId: { not: null },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!sub) {
      return NextResponse.json({ ok: true, cancelled: false, message: "Bekleyen plan değişikliği yok." });
    }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { pendingBillingPlanId: null },
    });
    return NextResponse.json({
      ok: true,
      cancelled: true,
      message: "Plan değişikliği iptal edildi; mevcut planınız devam ediyor.",
    });
  } catch (e) {
    console.error("[odeme/downgrade-cancel] error", e);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
