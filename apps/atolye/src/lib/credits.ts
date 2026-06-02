import type { RunPromptResult } from "@ludenlab/ai";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { COST_PER_GENERATION } from "./plans";
import { logUsage } from "./usage";

/* Kullanıcı kredi sistemi. Bakiye = Account.credits; her hareket CreditTransaction'a yazılır. */

export async function getBalance(accountId: string): Promise<number> {
  const a = await prisma.account.findUnique({ where: { id: accountId }, select: { credits: true } });
  return a?.credits ?? 0;
}

/** tx İÇİNDE kredi yükle — çağıranın transaction'ına dahil olur (nested transaction YOK).
    callback/webhook gibi zaten $transaction içinde olan yerlerden bunu kullan. */
export async function grantCreditsOnTx(
  tx: Prisma.TransactionClient,
  accountId: string,
  amount: number,
  reason: string,
): Promise<number> {
  const updated = await tx.account.update({
    where: { id: accountId },
    data: { credits: { increment: amount } },
    select: { credits: true },
  });
  await tx.creditTransaction.create({ data: { accountId, amount, type: "EARN", reason } });
  return updated.credits;
}

/** Bağımsız kredi yükleme (kendi transaction'ı). tx içindeysen grantCreditsOnTx kullan. */
export async function grantCredits(accountId: string, amount: number, reason: string): Promise<number> {
  return prisma.$transaction((tx) => grantCreditsOnTx(tx, accountId, amount, reason));
}

/** Yeni bir kredi dönemi mi? callback (ilk ödeme) ile webhook (order.success) saniyeler
    arası farkla çağrılabilir; dönem-sonu >1 gün ileri ise yeni dönem (yenileme) sayılır.
    Böylece aynı dönem için mükerrer kredi yüklenmez (callback↔webhook idempotency). */
export function isNewCreditPeriod(last: Date | null | undefined, next: Date): boolean {
  if (!last) return true;
  return next.getTime() - last.getTime() > 24 * 60 * 60 * 1000;
}

export function listCreditTxns(accountId: string, take = 20) {
  return prisma.creditTransaction.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

type WithCreditsResult =
  | { ok: true; result: RunPromptResult; balance: number }
  | { ok: false; status: number; error: string };

/** Üretimden ÖNCE bakiye kontrol (yetersizse API çağrısı YAPILMADAN reddet);
    üretim BAŞARILIYSA krediyi düş + deftere yaz + kullanım/maliyeti logla. */
export async function withCredits(
  accountId: string,
  gen: () => Promise<RunPromptResult>,
): Promise<WithCreditsResult> {
  const cost = COST_PER_GENERATION;
  const acc = await prisma.account.findUnique({
    where: { id: accountId },
    select: { credits: true },
  });
  if (!acc || acc.credits < cost) {
    return { ok: false, status: 402, error: "Krediniz yetersiz. Planınızı yükseltin." };
  }
  const result = await gen();
  const [updated] = await prisma.$transaction([
    prisma.account.update({
      where: { id: accountId },
      data: { credits: { decrement: cost } },
      select: { credits: true },
    }),
    prisma.creditTransaction.create({
      data: { accountId, amount: -cost, type: "SPEND", reason: "Araç üretimi" },
    }),
  ]);
  await logUsage(accountId, result.model, result.usage); // admin gözlem (best-effort)
  return { ok: true, result, balance: updated.credits };
}
