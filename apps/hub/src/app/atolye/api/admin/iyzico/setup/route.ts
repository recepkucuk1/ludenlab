import { NextResponse } from "next/server";
import { auth } from "@atolye/auth";
import { isAdmin } from "@atolye/lib/admin";
import { prisma } from "@atolye/lib/db";
import { PLAN_CONFIG } from "@atolye/lib/plans";
import {
  createProduct,
  listProducts,
  createPricingPlan,
  listPricingPlans,
} from "@atolye/lib/iyzico";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * iyzico ürün + fiyatlandırma planı PROVISIONING (idempotent, admin-gated).
 *
 * Ne yapar:
 *  1. "LudenLab Atölye" abonelik ÜRÜNÜ'nü garanti eder (yoksa oluşturur).
 *  2. PRO ve ADVANCED için AYLIK fiyatlandırma planlarını garanti eder
 *     (fiyat plans.ts ile hizalı — terapimat/studio ile aynı).
 *  3. DB `Plan` tablosunu iyzico referanslarıyla upsert eder. Checkout akışı
 *     bu refleri okur; bu route çalışmadan ödeme alınamaz.
 *
 * iyzico merchant hesabı studio/brytakip ile PAYLAŞIMLI olduğundan ürün/plan
 * adları "Atölye" ile namespace'lenir (çakışma olmasın).
 *
 * Tekrar çalıştırmak güvenli: var olanı bulur, yoksa oluşturur.
 *
 *   curl -X POST https://atolye.ludenlab.com/api/admin/iyzico/setup \
 *     -H "Cookie: <admin oturum cookie'si>"
 */

const PRODUCT_NAME = "LudenLab Atölye";

type PaidPlan = {
  type: "PRO" | "ADVANCED";
  monthlyName: string; // iyzico aylık plan adı
  yearlyName: string; // iyzico yıllık plan adı
  monthlyKurus: number;
  yearlyKurus: number; // %15 indirimli (plans.ts)
  credits: number;
};

const PAID_PLANS: PaidPlan[] = [
  {
    type: "PRO",
    monthlyName: "Atölye Pro Aylık",
    yearlyName: "Atölye Pro Yıllık",
    monthlyKurus: PLAN_CONFIG.PRO.monthlyKurus,
    yearlyKurus: PLAN_CONFIG.PRO.yearlyKurus,
    credits: PLAN_CONFIG.PRO.credits,
  },
  {
    type: "ADVANCED",
    monthlyName: "Atölye Gelişmiş Aylık",
    yearlyName: "Atölye Gelişmiş Yıllık",
    monthlyKurus: PLAN_CONFIG.ADVANCED.monthlyKurus,
    yearlyKurus: PLAN_CONFIG.ADVANCED.yearlyKurus,
    credits: PLAN_CONFIG.ADVANCED.credits,
  },
];

export async function POST(req: Request) {
  // İki yol: (a) admin oturumu, (b) Authorization: Bearer $CRON_SECRET
  // (b) tarayıcısız/operatör kurulumu için (Hostinger'da shell yok).
  const session = await auth();
  const authz = req.headers.get("authorization");
  const bySecret = !!process.env.CRON_SECRET && authz === `Bearer ${process.env.CRON_SECRET}`;
  const byAdmin = !!session?.user?.id && isAdmin(session.user.role);
  if (!bySecret && !byAdmin) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  if (!process.env.IYZICO_API_KEY || !process.env.IYZICO_SECRET_KEY) {
    return NextResponse.json(
      { error: "iyzico anahtarları tanımlı değil (IYZICO_API_KEY / IYZICO_SECRET_KEY)." },
      { status: 503 },
    );
  }

  const report: Record<string, unknown> = { product: null, plans: [], dbPlans: [] };

  try {
    // ── 1. Ürün ──────────────────────────────────────────────────────────────
    const existingProducts = await listProducts();
    if (existingProducts.status !== "success") {
      return NextResponse.json(
        { error: "iyzico ürün listesi alınamadı.", detail: existingProducts.errorMessage },
        { status: 502 },
      );
    }

    let productRef = existingProducts.items.find((p) => p.name === PRODUCT_NAME)?.referenceCode;
    let productCreated = false;

    if (!productRef) {
      const created = await createProduct(PRODUCT_NAME, "LudenLab Atölye abonelik paketleri");
      if (created.status !== "success" || !created.referenceCode) {
        return NextResponse.json(
          { error: "iyzico ürünü oluşturulamadı.", detail: created.errorMessage },
          { status: 502 },
        );
      }
      productRef = created.referenceCode;
      productCreated = true;
    }
    report.product = { referenceCode: productRef, created: productCreated };

    // ── 2 & 3. Plan başına: fiyat planını garanti et + DB upsert ──────────────
    const existingPlans = await listPricingPlans(productRef);
    const planItems = existingPlans.status === "success" ? existingPlans.items ?? [] : [];

    const plansReport: unknown[] = [];

    // İsimle bul, yoksa oluştur → { ref, created }. idempotent.
    async function ensurePlan(
      productReferenceCode: string,
      name: string,
      kurus: number,
      interval: "MONTHLY" | "YEARLY",
    ): Promise<{ ref?: string; created: boolean; error?: string }> {
      const existing = planItems.find((it) => it.name === name)?.referenceCode;
      if (existing) return { ref: existing, created: false };
      const created = await createPricingPlan({
        productReferenceCode,
        name,
        price: kurus / 100, // iyzico TL major-unit ister (44900 kuruş → 449)
        paymentInterval: interval,
        paymentIntervalCount: 1,
      });
      if (created.status !== "success" || !created.referenceCode) {
        return { created: false, error: created.errorMessage };
      }
      return { ref: created.referenceCode, created: true };
    }

    for (const p of PAID_PLANS) {
      const monthly = await ensurePlan(productRef, p.monthlyName, p.monthlyKurus, "MONTHLY");
      if (!monthly.ref) {
        plansReport.push({ type: p.type, ok: false, error: monthly.error });
        continue;
      }
      const yearly = await ensurePlan(productRef, p.yearlyName, p.yearlyKurus, "YEARLY");

      await prisma.plan.upsert({
        where: { type: p.type },
        update: {
          creditAmount: p.credits,
          monthlyPrice: p.monthlyKurus,
          yearlyPrice: p.yearlyKurus,
          iyzicoProductRef: productRef,
          iyzicoMonthlyPlanRef: monthly.ref,
          ...(yearly.ref ? { iyzicoYearlyPlanRef: yearly.ref } : {}),
        },
        create: {
          type: p.type,
          creditAmount: p.credits,
          monthlyPrice: p.monthlyKurus,
          yearlyPrice: p.yearlyKurus,
          iyzicoProductRef: productRef,
          iyzicoMonthlyPlanRef: monthly.ref,
          ...(yearly.ref ? { iyzicoYearlyPlanRef: yearly.ref } : {}),
        },
      });

      plansReport.push({
        type: p.type,
        ok: true,
        monthly: { ref: monthly.ref, created: monthly.created },
        yearly: { ref: yearly.ref, created: yearly.created, error: yearly.error },
      });
    }
    report.plans = plansReport;

    // ── FREE & ENTERPRISE: iyzico'suz DB satırları (tamlık için) ──────────────
    await prisma.plan.upsert({
      where: { type: "FREE" },
      update: { creditAmount: PLAN_CONFIG.FREE.credits, monthlyPrice: 0, yearlyPrice: 0 },
      create: { type: "FREE", creditAmount: PLAN_CONFIG.FREE.credits, monthlyPrice: 0, yearlyPrice: 0 },
    });
    await prisma.plan.upsert({
      where: { type: "ENTERPRISE" },
      update: { creditAmount: 0, monthlyPrice: 0, yearlyPrice: 0 },
      create: { type: "ENTERPRISE", creditAmount: 0, monthlyPrice: 0, yearlyPrice: 0 },
    });

    const dbPlans = await prisma.plan.findMany({
      select: {
        type: true,
        creditAmount: true,
        monthlyPrice: true,
        yearlyPrice: true,
        iyzicoProductRef: true,
        iyzicoMonthlyPlanRef: true,
        iyzicoYearlyPlanRef: true,
      },
      orderBy: { monthlyPrice: "asc" },
    });
    report.dbPlans = dbPlans;

    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    console.error("[iyzico setup] error:", error);
    const message = error instanceof Error ? error.message : "bilinmeyen hata";
    return NextResponse.json({ error: "Provisioning hatası: " + message, partial: report }, { status: 500 });
  }
}
