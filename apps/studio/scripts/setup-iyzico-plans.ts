/**
 * iyzico Ürün & Ödeme Planı Kurulum Script'i
 *
 * Bu script tek seferlik çalıştırılır. iyzico sandbox'ta LudenLab ürünü
 * ve 4 adet ödeme planı (PRO Aylık, PRO Yıllık, ADVANCED Aylık, ADVANCED Yıllık)
 * oluşturur. Oluşturulan referans kodlarını Plan tablosuna yazar.
 *
 * Kullanım:
 *   npx tsx scripts/setup-iyzico-plans.ts
 */

import "dotenv/config";
import {
  createProduct,
  createPricingPlan,
  listProducts,
  listPricingPlans,
} from "../src/lib/iyzico";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PLANS = [
  {
    type: "PRO" as const,
    monthlyName: "Pro Paket - Aylık",
    monthlyPrice: 449, // TL
    yearlyName: "Pro Paket - Yıllık",
    yearlyPrice: 4579.80, // TL (yıllık, %15 indirimli: 449 * 12 * 0.85 = 4579.80)
  },
  {
    type: "ADVANCED" as const,
    monthlyName: "Advanced Paket - Aylık",
    monthlyPrice: 1999, // TL
    yearlyName: "Advanced Paket - Yıllık",
    yearlyPrice: 20389.80, // TL (yıllık, %15 indirimli)
  },
];

async function main() {
  console.log("🚀 iyzico Ürün & Plan Kurulumu Başlıyor...\n");

  // ── 1. Mevcut ürünleri kontrol et ─────────────────────────────────────

  const existingProducts = await listProducts();
  const ludenLabProduct = existingProducts.data?.items?.find(
    (p) => p.name === "LudenLab"
  );

  let productRef: string;

  if (ludenLabProduct) {
    console.log(`✅ Mevcut ürün bulundu: ${ludenLabProduct.referenceCode}`);
    productRef = ludenLabProduct.referenceCode;
  } else {
    // ── 2. Ürün oluştur ──────────────────────────────────────────────────
    console.log("📦 LudenLab ürünü oluşturuluyor...");
    const productRes = await createProduct(
      "LudenLab",
      "Dil, konuşma ve işitme uzmanları için AI destekli platform aboneliği"
    );

    if (productRes.status !== "success" || !productRes.data) {
      console.error("❌ Ürün oluşturulamadı:", productRes);
      process.exit(1);
    }

    productRef = productRes.data.referenceCode;
    console.log(`✅ Ürün oluşturuldu: ${productRef}`);
  }

    // ── 3. Ödeme planlarını oluştur / Bul ─────────────────────────────────────
    
  const existingPlansRes = await listPricingPlans(productRef);
  const existingPlans = existingPlansRes.data?.items ?? [];

  for (const plan of PLANS) {
    console.log(`\n── ${plan.type} Planları ──`);

    // Aylık planı bul veya oluştur
    let monthlyRef = existingPlans.find(p => p.name === plan.monthlyName)?.referenceCode;
    if (!monthlyRef) {
        console.log(`  📝 ${plan.monthlyName} oluşturuluyor (${plan.monthlyPrice} TL/ay)...`);
        const monthlyRes = await createPricingPlan({
          productReferenceCode: productRef,
          name: plan.monthlyName,
          price: plan.monthlyPrice,
          paymentInterval: "MONTHLY",
          paymentIntervalCount: 1,
          currencyCode: "TRY",
        });
        if (monthlyRes.status === "success" && monthlyRes.data) {
          monthlyRef = monthlyRes.data.referenceCode;
          console.log(`  ✅ Aylık plan: ${monthlyRef}`);
        } else {
          console.error(`  ❌ Aylık plan oluşturulamadı:`, monthlyRes.errorMessage ?? monthlyRes);
        }
    } else {
        console.log(`  ✅ Aylık plan (Zaten mevcut): ${monthlyRef}`);
    }

    // Yıllık planı bul veya oluştur
    let yearlyRef = existingPlans.find(p => p.name === plan.yearlyName)?.referenceCode;
    if (!yearlyRef) {
        console.log(`  📝 ${plan.yearlyName} oluşturuluyor (${plan.yearlyPrice} TL/yıl)...`);
        const yearlyRes = await createPricingPlan({
          productReferenceCode: productRef,
          name: plan.yearlyName,
          price: plan.yearlyPrice,
          paymentInterval: "YEARLY",
          paymentIntervalCount: 1,
          currencyCode: "TRY",
        });
        if (yearlyRes.status === "success" && yearlyRes.data) {
          yearlyRef = yearlyRes.data.referenceCode;
          console.log(`  ✅ Yıllık plan: ${yearlyRef}`);
        } else {
          console.error(`  ❌ Yıllık plan oluşturulamadı:`, yearlyRes.errorMessage ?? yearlyRes);
        }
    } else {
        console.log(`  ✅ Yıllık plan (Zaten mevcut): ${yearlyRef}`);
    }

    // ── 4. Plan tablosunu güncelle ──────────────────────────────────────

    await prisma.plan.upsert({
      where: { type: plan.type },
      update: {
        iyzicoProductRef: productRef,
        iyzicoMonthlyPlanRef: monthlyRef,
        iyzicoYearlyPlanRef: yearlyRef,
        monthlyPrice: Math.round(plan.monthlyPrice * 100),
        yearlyPrice: Math.round(plan.yearlyPrice * 100),
      },
      create: {
        type: plan.type,
        studentLimit: plan.type === "PRO" ? 200 : -1,
        creditAmount: plan.type === "PRO" ? 2000 : 10000,
        monthlyPrice: Math.round(plan.monthlyPrice * 100), // kuruş cinsinden
        yearlyPrice: Math.round(plan.yearlyPrice * 100),
        pdfEnabled: true,
        iyzicoProductRef: productRef,
        iyzicoMonthlyPlanRef: monthlyRef,
        iyzicoYearlyPlanRef: yearlyRef,
      },
    });

    console.log(`  💾 Plan tablosu güncellendi (${plan.type})`);
  }

  // FREE ve ENTERPRISE planları iyzico'da yoktur — sadece DB'de olduğundan emin ol
  for (const fallback of [
    { type: "FREE" as const, studentLimit: 2, credit: 40, mP: 0, yP: 0, pdf: false },
    { type: "ENTERPRISE" as const, studentLimit: -1, credit: -1, mP: 0, yP: 0, pdf: true },
  ]) {
    await prisma.plan.upsert({
      where: { type: fallback.type },
      update: {},
      create: {
        type: fallback.type,
        studentLimit: fallback.studentLimit,
        creditAmount: fallback.credit,
        monthlyPrice: fallback.mP,
        yearlyPrice: fallback.yP,
        pdfEnabled: fallback.pdf,
      },
    });
  }

  console.log("\n🎉 Kurulum tamamlandı!\n");

  // Son durumu göster
  const allPlans = await prisma.plan.findMany({ orderBy: { type: "asc" } });
  console.table(
    allPlans.map((p) => ({
      Tip: p.type,
      "Aylık (TL)": p.monthlyPrice / 100,
      "Yıllık (TL)": p.yearlyPrice / 100,
      "iyzico Aylık Ref": p.iyzicoMonthlyPlanRef ?? "—",
      "iyzico Yıllık Ref": p.iyzicoYearlyPlanRef ?? "—",
    }))
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
