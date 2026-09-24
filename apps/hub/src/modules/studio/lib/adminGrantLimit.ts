import { prisma } from "@studio/lib/db";
import { billingAlarm } from "@/lib/billingAlarm";

/**
 * Admin başına 24 saatte verilebilecek toplam üretim hakkı (2026-09 denetimi #20).
 *
 * Tek bir admin çağrı başına 100.000 hak verebiliyor ve çağrı sayısında sınır yoktu —
 * ele geçirilmiş bir admin oturumu ya da hata, sınırsız AI maliyeti demekti. En büyük
 * ücretli plan ayda 500 hak; bu tavan olağan destek işlerini (telafi, kampanya) rahatça
 * karşılar. Aşan işlem reddedilir ve alarm verilir (ikinci bir kişinin görmesi için).
 */
export const DAILY_ADMIN_GRANT_CAP = 5000;

const GRANT_ACTIONS = ["credits.grant", "credits.bulk-grant"];

/** Bu admin'in son 24 saatte verdiği toplam hak (audit kayıtlarından). */
async function grantedLast24h(actorId: string): Promise<number> {
  const rows = await prisma.auditLog.findMany({
    where: {
      actorId,
      action: { in: GRANT_ACTIONS },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { diff: true },
  });
  return rows.reduce((sum, r) => {
    const amount = (r.diff as { amount?: unknown } | null)?.amount;
    return sum + (typeof amount === "number" && amount > 0 ? amount : 0);
  }, 0);
}

/** `total` hak verilebilir mi? Değilse alarm verir ve kalan miktarı döner. */
export async function checkAdminGrantAllowance(
  actorId: string,
  total: number,
): Promise<{ ok: true } | { ok: false; remaining: number }> {
  const used = await grantedLast24h(actorId);
  const remaining = Math.max(0, DAILY_ADMIN_GRANT_CAP - used);
  if (total <= remaining) return { ok: true };
  billingAlarm("admin günlük hak tavanını aşmaya çalıştı", { actorId, requested: total, used });
  return { ok: false, remaining };
}
