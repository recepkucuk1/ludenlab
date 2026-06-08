import { prisma } from "@/lib/db";
import { resolveEntitlement, type Entitlement } from "@ludenlab/billing";

type Module = "STUDIO" | "ATOLYE" | "BRYTAKIP";

/**
 * Merkezi `billing.Subscription`'dan (accountId, module) için entitlement.
 * Hub'ın kendi sayfaları + `/api/entitlement` bunu kullanır.
 */
export async function getEntitlement(accountId: string, module: Module): Promise<Entitlement> {
  const sub = await prisma.subscription.findFirst({
    where: { accountId, module },
    orderBy: { createdAt: "desc" },
    select: { status: true, currentPeriodEnd: true },
  });
  return resolveEntitlement(sub);
}

/**
 * E-posta köprüsü: modüller kendi kullanıcısının e-postasıyla merkezi entitlement'ı okur
 * (tam SSO'dan önceki hafif model — modül auth'una dokunmadan).
 */
export async function getEntitlementByEmail(email: string, module: Module): Promise<Entitlement> {
  const account = await prisma.account.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true },
  });
  if (!account) return resolveEntitlement(null);
  return getEntitlement(account.id, module);
}
