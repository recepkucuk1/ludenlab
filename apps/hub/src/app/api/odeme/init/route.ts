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
