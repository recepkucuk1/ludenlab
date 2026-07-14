import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listTransactions, listSavedCards, paynkolayCustomerKeyFor } from "@/lib/paynkolay";
import { moduleReturnUrl } from "@ludenlab/billing";

export const runtime = "nodejs";

function redirectTo(url: string) {
  return NextResponse.redirect(url, { status: 303 }); // POST → GET
}
function errBack(reason: string, req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  return NextResponse.redirect(new URL(`/odeme/hata?reason=${encodeURIComponent(reason)}`, base), {
    status: 303,
  });
}
function ddmmyyyy(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}
function moduleRedirect(module: string, req: NextRequest) {
  // plan.module BRYTAKIP içerebilir ama checkout yalnız STUDIO/ATOLYE üretir → savunmacı.
  if (module !== "STUDIO" && module !== "ATOLYE") {
    return redirectTo(process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin);
  }
  return redirectTo(moduleReturnUrl(module));
}

/**
 * Paynkolay hosted-form callback (apex). Paynkolay successUrl'e POST eder.
 *
 * GÜVEN MODELİ: callback hash'i sandbox'ta doğrulanamadı (3DS ACS down) → callback'in
 * KENDİSİNE GÜVENMİYORUZ. Otorite = listTransactions (PaymentList, S2S imzalı, hash'i
 * DOĞRULANMIŞ) → STATUS=SUCCESS. Sahte callback bile PaymentList'te SUCCESS göstermez.
 * Saklı kart token'ı da callback'ten değil listSavedCards'tan (otoriter) alınır.
 * Kredi/erişim grant'ı BURADA YAPILMAZ — modülün reconcile'i (entitlement) yapar.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const clientRefCode = String(form.get("CLIENT_REFERENCE_CODE") ?? form.get("clientRefCode") ?? "");
    if (!clientRefCode) return errBack("missing_ref", req);

    const intent = await prisma.paymentIntent.findUnique({ where: { clientRefCode } });
    if (!intent) return errBack("intent_not_found", req);

    const plan = await prisma.billingPlan.findUnique({ where: { id: intent.billingPlanId } });
    if (!plan) return errBack("plan_not_found", req);

    // İdempotent: niyet zaten işlendiyse aboneliği tekrar kurma, modüle dön.
    if (intent.status === "CONSUMED") return moduleRedirect(plan.module, req);

    // OTORİTER teyit: PaymentList'te bu clientRefCode SUCCESS mı? (callback'e güvenme)
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // gün-sınırı toleransı
    const list = await listTransactions({
      startDate: ddmmyyyy(start),
      endDate: ddmmyyyy(now),
      clientRefCode,
    });
    const paid = list.items.find((t) => (t.status ?? "").toUpperCase() === "SUCCESS");
    if (!paid) {
      console.error(
        "[odeme/sonuc] PaymentList SUCCESS yok",
        clientRefCode,
        list.items.map((i) => i.status),
      );
      return errBack("payment_not_confirmed", req);
    }

    // Saklı kart token'ını otoriter kaynaktan al (yenileme için). Hata olursa engellemez.
    // Anahtar = init'te kayda gönderilen TÜRETİLMİŞ ≤11 karakter değer (accountId değil).
    const customerKey = paynkolayCustomerKeyFor(intent.accountId);
    let cardToken: string | undefined;
    try {
      const cards = await listSavedCards(customerKey);
      cardToken = cards.cards.find((c) => c.token)?.token;
    } catch (e) {
      console.error("[odeme/sonuc] listSavedCards hata (token sonra alınabilir)", e);
    }

    const periodEnd = new Date(
      now.getTime() + (plan.interval === "YEARLY" ? 365 : 30) * 24 * 60 * 60 * 1000,
    );

    // (account, module) için tek abonelik: varsa ACTIVE'e güncelle, yoksa oluştur.
    const existing = await prisma.subscription.findFirst({
      where: { accountId: intent.accountId, module: plan.module },
      orderBy: { createdAt: "desc" },
    });
    const data = {
      status: "ACTIVE" as const,
      module: plan.module,
      billingPlanId: plan.id,
      pendingBillingPlanId: null, // ödeme (upgrade/yeni) → varsa bekleyen downgrade'i sıfırla
      currentPeriodEnd: periodEnd,
      paynkolayClientRefCode: clientRefCode,
      paynkolayCustomerKey: customerKey, // türetilmiş ≤11 anahtar — cron çekimi bununla yapar
      paynkolayRefCode: paid.referenceCode ?? null,
      cancelledAt: null,
      ...(cardToken ? { paynkolayCardToken: cardToken } : {}),
    };
    if (existing) {
      await prisma.subscription.update({ where: { id: existing.id }, data });
    } else {
      await prisma.subscription.create({ data: { accountId: intent.accountId, ...data } });
    }

    // Tahsilat kaydı (fatura kesme listesi) — clientRefCode unique → tekrar çağrılar idempotent.
    await prisma.payment.upsert({
      where: { clientRefCode },
      update: {},
      create: {
        accountId: intent.accountId,
        module: plan.module,
        billingPlanId: plan.id,
        amount: plan.price,
        kind: "INITIAL",
        clientRefCode,
        paynkolayRefCode: paid.referenceCode ?? null,
      },
    });

    await prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: "CONSUMED" } });

    return moduleRedirect(plan.module, req);
  } catch (e) {
    console.error("[odeme/sonuc] error", e);
    return errBack("internal_error", req);
  }
}
