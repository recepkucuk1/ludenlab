import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const MODULES = ["STUDIO", "ATOLYE"] as const;
const INTERVALS = ["MONTHLY", "YEARLY"] as const;

/**
 * Apex checkout init. Oturum + merkezi billing.BillingPlan lookup → mevcut aboneliğe göre
 * downgrade/aynı-plan yolları (ödeme GEREKTİRMEZ, çalışır) ya da ödeme başlatma.
 *
 * ⚠️ ÖDEME BAŞLATMA GEÇİCİ KAPALI: Paynkolay kaldırıldı (sağlayıcı değişimi), PayTR
 * entegrasyonu bekleniyor. Ödeme gerektiren yol 503 { paymentsDisabled } döner;
 * CheckoutClient bunu kullanıcıya "ödemeler yenileniyor" olarak gösterir.
 * (Fatura-profili kapısı + PaymentIntent + hosted form akışı git geçmişinde —
 * PayTR'de aynı iskelet geri gelir.)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

    const { module, code, interval } = (await req.json()) as {
      module?: string;
      code?: string;
      interval?: string;
    };
    if (
      !module ||
      !MODULES.includes(module as (typeof MODULES)[number]) ||
      !interval ||
      !INTERVALS.includes(interval as (typeof INTERVALS)[number]) ||
      !code
    ) {
      return NextResponse.json({ error: "Geçersiz plan parametreleri." }, { status: 400 });
    }

    const account = await prisma.account.findUnique({ where: { id: session.user.id } });
    if (!account) return NextResponse.json({ error: "Hesap bulunamadı." }, { status: 404 });

    const plan = await prisma.billingPlan.findUnique({
      where: {
        module_code_interval: {
          module: module as (typeof MODULES)[number],
          code,
          interval: interval as (typeof INTERVALS)[number],
        },
      },
    });
    if (!plan || !plan.active) return NextResponse.json({ error: "Plan bulunamadı." }, { status: 404 });

    // ── Mevcut aboneliğe göre upgrade/downgrade ayrımı ──
    const existing = await prisma.subscription.findFirst({
      where: { accountId: account.id, module: module as (typeof MODULES)[number] },
      orderBy: { createdAt: "desc" },
      include: { billingPlan: true },
    });
    const RANK: Record<string, number> = { PRO: 1, ADVANCED: 2, ENTERPRISE: 3 };

    if (existing?.status === "ACTIVE" && existing.billingPlanId === plan.id) {
      // Aynı plan zaten aktif → tekrar ödeme ALMA. Bekleyen downgrade varsa iptal et (vazgeçildi).
      if (existing.pendingBillingPlanId) {
        await prisma.subscription.update({
          where: { id: existing.id },
          data: { pendingBillingPlanId: null },
        });
        return NextResponse.json({
          alreadyActive: true,
          downgradeCancelled: true,
          message: "Plan değişikliği iptal edildi; mevcut planınız devam ediyor.",
        });
      }
      return NextResponse.json({ alreadyActive: true, message: "Bu plan zaten aktif." });
    }

    if (
      existing?.status === "ACTIVE" &&
      existing.billingPlan &&
      (RANK[plan.code] ?? 0) < (RANK[existing.billingPlan.code] ?? 0)
    ) {
      // DOWNGRADE: ödeme YOK. pendingBillingPlanId yaz → kullanıcı dönem sonuna kadar mevcut
      // (yüksek) planında kalır; yenileme gelecek dönemde bu planı uygular.
      await prisma.subscription.update({
        where: { id: existing.id },
        data: { pendingBillingPlanId: plan.id },
      });
      const end = existing.currentPeriodEnd;
      return NextResponse.json({
        downgradeScheduled: true,
        appliesAt: end?.toISOString() ?? null,
        message: end
          ? `Plan değişikliğiniz ${end.toLocaleDateString("tr-TR")} tarihindeki bir sonraki yenilemede uygulanacak. O tarihe kadar mevcut planınızı kullanmaya devam edersiniz.`
          : "Plan değişikliğiniz bir sonraki yenilemede uygulanacak.",
      });
    }

    // Upgrade / yeni abonelik = ÖDEME gerektirir → sağlayıcı geçişi bitene kadar kapalı.
    return NextResponse.json(
      {
        paymentsDisabled: true,
        message:
          "Ödeme sistemimiz şu anda yenileniyor. Kısa süre içinde tekrar deneyebilirsiniz — anlayışınız için teşekkürler.",
      },
      { status: 503 },
    );
  } catch (e) {
    console.error("[odeme/init] error", e);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
