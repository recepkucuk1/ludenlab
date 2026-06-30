import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { buildHostedPaymentForm } from "@/lib/paynkolay";

export const runtime = "nodejs";

const MODULES = ["STUDIO", "ATOLYE"] as const;
const INTERVALS = ["MONTHLY", "YEARLY"] as const;

/**
 * Apex checkout init (Paynkolay). Oturum + merkezi billing.BillingPlan lookup →
 * PaymentIntent (clientRefCode ile callback'e bağlanır; Subscription'a DOKUNULMAZ →
 * mevcut erişim korunur) → imzalı hosted form. Kart Paynkolay sayfasında girilir (PCI
 * bizde değil); csAutoSave ile token'lanır (yenileme cron'u bu token'ı kullanır).
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
      // (yüksek) planında kalır; yenileme cron'u gelecek dönemde bu planı (fiyat + billingPlanId) uygular.
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

    // Upgrade ya da yeni abonelik → imzalı hosted form (hemen ödeme).
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      console.error("[odeme/init] NEXT_PUBLIC_APP_URL tanımsız");
      return NextResponse.json({ error: "Sunucu yapılandırması eksik." }, { status: 500 });
    }

    // clientRefCode: callback'i niyete bağlayan benzersiz alfanumerik ref.
    const clientRefCode = `pk${Date.now().toString(36)}${randomBytes(5).toString("hex")}`;
    await prisma.paymentIntent.create({
      data: { clientRefCode, accountId: account.id, billingPlanId: plan.id },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
    const form = buildHostedPaymentForm({
      clientRefCode,
      amount: Number(plan.price).toFixed(2),
      successUrl: `${baseUrl}/odeme/sonuc`,
      failUrl: `${baseUrl}/odeme/hata`,
      cardHolderIP: ip,
      saveCard: true, // csAutoSave → kartı token'la (yenileme için)
      customerKey: account.id, // csCustomerKey — kart saklama/yenileme kimliği
      customer: { nameSurname: account.name ?? undefined, email: account.email },
    });

    return NextResponse.json({ action: form.action, fields: form.fields });
  } catch (e) {
    console.error("[odeme/init] error", e);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
