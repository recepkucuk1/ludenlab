import { prisma } from "@studio/lib/db";
import { CREDIT_COSTS } from "@studio/lib/plans";
import type { Prisma } from "@/generated/studio/client";

/**
 * Non-atomic credit check (no deduction). Use as a fast pre-flight before expensive operations.
 * Always follow up with deductCredits() in the same request to atomically deduct.
 */
export async function checkCredits(
  therapistId: string,
  type: keyof typeof CREDIT_COSTS
): Promise<{ ok: boolean; credits: number }> {
  const cost = CREDIT_COSTS[type];
  const therapist = await prisma.therapist.findUnique({
    where: { id: therapistId },
    select: { credits: true },
  });
  const credits = therapist?.credits ?? 0;
  return { ok: credits >= cost, credits };
}

type CreditCostKey = keyof typeof CREDIT_COSTS;

const DESCRIPTIONS: Record<CreditCostKey, string> = {
  card_generate: "Öğrenme kartı üretimi",
  ai_profile:    "AI profil oluşturma",
};

/**
 * Atomically deducts credits from a therapist account.
 * Returns { ok: true } on success, { ok: false, credits: number } if insufficient.
 *
 * When passed a transaction client (`tx`), the deduction joins that transaction
 * instead of starting a new one — required when an outer flow needs to roll
 * back the whole operation on failure (e.g. AI generation).
 */
export async function deductCredits(
  therapistId: string,
  type: CreditCostKey,
  tx?: Prisma.TransactionClient,
): Promise<{ ok: true } | { ok: false; credits: number }> {
  const cost = CREDIT_COSTS[type];

  const run = async (
    client: Prisma.TransactionClient,
  ): Promise<{ ok: true } | { ok: false; credits: number }> => {
    // Atomik düşüm: koşullu updateMany (WHERE credits>=cost) tek SQL ifadesinde
    // satır kilidiyle çalışır → READ COMMITTED'da bile yarışa karşı güvenli, negatife düşmez.
    const dec = await client.therapist.updateMany({
      where: { id: therapistId, credits: { gte: cost } },
      data: { credits: { decrement: cost } },
    });

    if (dec.count === 0) {
      const t = await client.therapist.findUnique({
        where: { id: therapistId },
        select: { credits: true },
      });
      return { ok: false as const, credits: t?.credits ?? 0 };
    }

    await client.creditTransaction.create({
      data: {
        therapistId,
        amount: cost,
        type: "SPEND",
        description: DESCRIPTIONS[type],
      },
    });

    return { ok: true as const };
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}

/**
 * Atomically grants credits to a therapist account.
 * Used by admin credit top-ups, signup bonuses and (soon) iyzico payment
 * webhooks. Always creates a matching `CreditTransaction(EARN)` entry so the
 * ledger stays in sync with `Therapist.credits`.
 *
 * When passed a transaction client, the grant joins that transaction — so
 * callers can couple the grant to other side-effects (e.g. creating a
 * Subscription row on successful payment) and roll everything back together.
 */
export async function grantCredits(
  therapistId: string,
  amount: number,
  description: string,
  tx?: Prisma.TransactionClient,
): Promise<{ newBalance: number }> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("grantCredits: amount must be a positive integer");
  }

  const run = async (client: Prisma.TransactionClient): Promise<{ newBalance: number }> => {
    const updated = await client.therapist.update({
      where: { id: therapistId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    });
    await client.creditTransaction.create({
      data: {
        therapistId,
        amount,
        type: "EARN",
        description,
      },
    });
    return { newBalance: updated.credits };
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}

/**
 * Atomically revokes credits from a therapist account — admin refund flow.
 *
 * Yetersiz bakiyede `{ ok: false }` döner — caller UI'da uyarır. Sessiz clamp
 * yapmıyoruz çünkü audit'te "ne kadar düşürüldü" net olmalı; admin amount'u
 * kararlı verir. `grantCredits`'in simetrik karşılığı: bakiyeyi düşürür ve
 * `CreditTransaction(SPEND)` yazar.
 */
export async function revokeCredits(
  therapistId: string,
  amount: number,
  description: string,
  tx?: Prisma.TransactionClient,
): Promise<{ ok: true; newBalance: number } | { ok: false; credits: number }> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("revokeCredits: amount must be a positive integer");
  }

  const run = async (
    client: Prisma.TransactionClient,
  ): Promise<{ ok: true; newBalance: number } | { ok: false; credits: number }> => {
    const therapist = await client.therapist.findUnique({
      where: { id: therapistId },
      select: { credits: true },
    });
    if (!therapist) throw new Error("Therapist not found");
    if (therapist.credits < amount) {
      return { ok: false as const, credits: therapist.credits };
    }
    const updated = await client.therapist.update({
      where: { id: therapistId },
      data: { credits: { decrement: amount } },
      select: { credits: true },
    });
    await client.creditTransaction.create({
      data: {
        therapistId,
        amount,
        type: "SPEND",
        description,
      },
    });
    return { ok: true as const, newBalance: updated.credits };
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}
