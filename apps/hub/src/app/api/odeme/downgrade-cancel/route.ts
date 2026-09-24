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

    // Değişiklik iyzico'ya iletildiyse (sweep B1) sağlayıcı zaten alt planda; burada yalnız
    // yerel alanı temizlemek iki tarafı AYRIŞTIRIRDI (kullanıcı üst planı görür, iyzico alt
    // planı çeker). Geri almak için yeni dönemde yeniden yükseltme gerekir.
    if (sub.pendingPlanAppliesAt) {
      return NextResponse.json(
        {
          error:
            "Plan değişikliğiniz ödeme sağlayıcısına iletildi ve artık geri alınamıyor. Yeni dönem başladıktan sonra dilediğiniz plana yükseltebilirsiniz.",
        },
        { status: 409 },
      );
    }

    // CAS: sweep B1 aynı anda iletmişse (pendingPlanAppliesAt dolduysa) temizleme yapılmaz.
    const cleared = await prisma.subscription.updateMany({
      where: { id: sub.id, pendingPlanAppliesAt: null },
      data: { pendingBillingPlanId: null },
    });
    if (cleared.count === 0) {
      return NextResponse.json(
        { error: "Plan değişikliğiniz ödeme sağlayıcısına iletildi ve artık geri alınamıyor." },
        { status: 409 },
      );
    }
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
