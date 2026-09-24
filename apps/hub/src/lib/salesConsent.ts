import { prisma } from "@/lib/db";

/**
 * Mesafeli satış onayının SÜRÜMÜ. `/kosullar` (Mesafeli Satış Sözleşmesi, cayma ve iade
 * maddeleri) değiştiğinde bu değer de değiştirilmeli: sunucu eski sürümle gelen onayı kabul
 * etmez ve kullanıcıya kutuları yeniden gösterir; kayıt hangi metnin onaylandığını ispatlar.
 */
export const SALES_CONSENT_VERSION = "2026-09-24";

export type SalesConsentKind = "CHECKOUT" | "UPGRADE";

/**
 * Onayı kaydeder. FIRLATIR — çağıran, kayıt yazılamadıysa tahsilata GİTMEMELİ
 * (onayın ispatı olmadan ödeme almak, onay almamakla aynı hukuki sonucu doğurur).
 */
export async function recordSalesConsent(input: {
  accountId: string;
  billingPlanId: string;
  kind: SalesConsentKind;
  ip: string | null;
  checkoutToken?: string;
}): Promise<void> {
  await prisma.salesConsent.create({
    data: {
      accountId: input.accountId,
      billingPlanId: input.billingPlanId,
      kind: input.kind,
      version: SALES_CONSENT_VERSION,
      checkoutToken: input.checkoutToken ?? null,
      ip: input.ip,
    },
  });
}
