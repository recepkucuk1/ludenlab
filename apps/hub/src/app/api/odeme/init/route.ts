import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { initializeCheckoutForm } from "@/lib/iyzico";

export const runtime = "nodejs";

const MODULES = ["STUDIO", "ATOLYE", "BRYTAKIP"] as const;
const INTERVALS = ["MONTHLY", "YEARLY"] as const;

/**
 * Apex checkout init. Oturum + merkezi `billing.BillingPlan` lookup → iyzico
 * checkout formu. callbackUrl env'den (Host header'a güvenme — injection).
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
    const callbackUrl = `${baseUrl}/odeme/sonuc`;

    // LudenLab adres/kimlik toplamıyor → iyzico zorunlu alanları için dummy (sandbox).
    const dummyAddress = {
      contactName: account.name || "LudenLab",
      city: "Istanbul",
      district: "Kadikoy",
      country: "Turkey",
      address: "Adres bilgisi mevcut degil",
      zipCode: "34000",
    };

    const res = await initializeCheckoutForm({
      pricingPlanReferenceCode: plan.iyzicoPlanRef,
      callbackUrl,
      customer: {
        name: account.name?.split(" ")[0] || "LudenLab",
        surname: account.name?.split(" ").slice(1).join(" ") || "Uye",
        identityNumber: "11111111111", // dummy (sandbox); prod'da gerekirse toplanır
        email: account.email,
        gsmNumber: "+905350000000",
        billingAddress: dummyAddress,
        shippingAddress: dummyAddress,
      },
    });

    if (res.status === "failure" || !res.token) {
      console.error("[odeme/init] iyzico failure", res.errorCode, res.errorMessage);
      return NextResponse.json({ error: res.errorMessage || "Ödeme başlatılamadı." }, { status: 502 });
    }

    return NextResponse.json({ token: res.token, checkoutFormContent: res.checkoutFormContent });
  } catch (e) {
    console.error("[odeme/init] error", e);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
