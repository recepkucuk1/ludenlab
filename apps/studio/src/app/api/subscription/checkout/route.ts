import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { initializeCheckoutForm } from "@/lib/iyzico";

/** Normalize phone to iyzico format: +905XXXXXXXXX */
function formatGsmNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Strip everything except digits and leading +
  let cleaned = phone.replace(/[^\d+]/g, "");
  // If starts with 0, replace with +90
  if (cleaned.startsWith("0")) cleaned = "+90" + cleaned.slice(1);
  // If starts with 90 (no +), add +
  if (cleaned.startsWith("90") && !cleaned.startsWith("+")) cleaned = "+" + cleaned;
  // If starts with 5 (just the number), add +90
  if (cleaned.startsWith("5")) cleaned = "+90" + cleaned;
  // Validate: must be +90 followed by 10 digits
  if (/^\+90\d{10}$/.test(cleaned)) return cleaned;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { planType, cycle } = body;

    if (!planType || (cycle !== "monthly" && cycle !== "yearly")) {
      return NextResponse.json(
        { error: "Invalid plan or cycle" },
        { status: 400 }
      );
    }

    // 1. Get user details for iyzico customer
    const therapist = await prisma.therapist.findUnique({
      where: { id: session.user.id },
    });

    if (!therapist) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Get the requested Plan from DB
    const plan = await prisma.plan.findUnique({
      where: { type: planType },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const pricingPlanRef =
      cycle === "monthly" ? plan.iyzicoMonthlyPlanRef : plan.iyzicoYearlyPlanRef;

    if (!pricingPlanRef) {
      return NextResponse.json(
        { error: "Plan configuration is missing iyzico references" },
        { status: 500 }
      );
    }

    // 3. Prepare iyzico checkout form initialization.
    // Base URL comes from env — never from the Host header (injection risk).
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      console.error("[Checkout Init] NEXT_PUBLIC_APP_URL is not set");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }
    const callbackUrl = `${baseUrl}/api/subscription/callback`;

    // Dummy data for required iyzico fields since we don't collect address in LudenLab yet
    const dummyAddress = {
      contactName: therapist.name || "Terapist",
      city: "Istanbul",
      district: "Kadikoy",
      country: "Turkey",
      address: "LudenLab Adres Bilgisi Mevcut Degil",
      zipCode: "34000",
    };

    const checkoutFormRes = await initializeCheckoutForm({
      pricingPlanReferenceCode: pricingPlanRef,
      callbackUrl,
      customer: {
        name: therapist.name?.split(" ")[0] || "LudenLab",
        surname: therapist.name?.split(" ").slice(1).join(" ") || "Terapisti",
        identityNumber: "11111111111", // Required by standard flow, dummy in sandbox
        email: therapist.email,
        gsmNumber: formatGsmNumber(therapist.phone) || "+905350000000",
        billingAddress: dummyAddress,
        shippingAddress: dummyAddress,
      },
    });

    if (checkoutFormRes.status === "failure" || !checkoutFormRes.token) {
      console.error("[Checkout Initialization Failed]", checkoutFormRes);
      return NextResponse.json(
        { error: "Failed to initialize payment gateway" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      token: checkoutFormRes.token,
      checkoutFormContent: checkoutFormRes.checkoutFormContent,
    });
  } catch (error) {
    console.error("[Checkout Init Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
