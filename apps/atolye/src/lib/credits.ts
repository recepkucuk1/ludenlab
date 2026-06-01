import type { RunPromptResult } from "@ludenlab/ai";
import { prisma } from "./db";
import { COST_PER_GENERATION } from "./plans";
import { logUsage } from "./usage";

/* Kullanıcı kredi sistemi. Bakiye = Account.credits; her hareket CreditTransaction'a yazılır. */

export async function getBalance(accountId: string): Promise<number> {
  const a = await prisma.account.findUnique({ where: { id: accountId }, select: { credits: true } });
  return a?.credits ?? 0;
}

export async function grantCredits(accountId: string, amount: number, reason: string): Promise<number> {
  const [updated] = await prisma.$transaction([
    prisma.account.update({
      where: { id: accountId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    }),
    prisma.creditTransaction.create({ data: { accountId, amount, type: "EARN", reason } }),
  ]);
  return updated.credits;
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
