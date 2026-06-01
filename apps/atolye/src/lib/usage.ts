import { estimateCostUsd, estimateCredits, type TokenUsage } from "@ludenlab/ai";
import { prisma } from "./db";

/* AI üretim kullanım/maliyet kaydı (admin gözlem). logUsage ana akışı ASLA bozmaz. */

export async function logUsage(accountId: string, model: string, usage: TokenUsage): Promise<void> {
  try {
    await prisma.apiUsageLog.create({
      data: {
        accountId,
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheReadTokens: usage.cacheReadTokens ?? 0,
        costUsd: estimateCostUsd(model, usage),
        credits: estimateCredits(model, usage),
      },
    });
  } catch (e) {
    console.error("[usage] kaydedilemedi", e);
  }
}

export async function usageStats(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const logs = await prisma.apiUsageLog.findMany({
    where: { createdAt: { gte: since } },
    select: {
      accountId: true,
      model: true,
      inputTokens: true,
      outputTokens: true,
      costUsd: true,
      credits: true,
      createdAt: true,
    },
  });

  const totals = logs.reduce(
    (a, l) => ({
      calls: a.calls + 1,
      inputTokens: a.inputTokens + l.inputTokens,
      outputTokens: a.outputTokens + l.outputTokens,
      costUsd: a.costUsd + l.costUsd,
      credits: a.credits + l.credits,
    }),
    { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, credits: 0 },
  );

  const modelMap = new Map<string, { calls: number; costUsd: number }>();
  const dayMap = new Map<string, { calls: number; costUsd: number }>();
  const accMap = new Map<string, { calls: number; costUsd: number }>();
  for (const l of logs) {
    const m = modelMap.get(l.model) ?? { calls: 0, costUsd: 0 };
    m.calls++;
    m.costUsd += l.costUsd;
    modelMap.set(l.model, m);
    const dk = l.createdAt.toISOString().slice(0, 10);
    const d = dayMap.get(dk) ?? { calls: 0, costUsd: 0 };
    d.calls++;
    d.costUsd += l.costUsd;
    dayMap.set(dk, d);
    if (l.accountId) {
      const a = accMap.get(l.accountId) ?? { calls: 0, costUsd: 0 };
      a.calls++;
      a.costUsd += l.costUsd;
      accMap.set(l.accountId, a);
    }
  }
  const byModel = [...modelMap.entries()].map(([model, v]) => ({ model, ...v })).sort((a, b) => b.costUsd - a.costUsd);
  const daily = [...dayMap.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));
  const topIds = [...accMap.entries()].sort((a, b) => b[1].costUsd - a[1].costUsd).slice(0, 10);
  const accounts = topIds.length
    ? await prisma.account.findMany({
        where: { id: { in: topIds.map(([id]) => id) } },
        select: { id: true, email: true, name: true },
      })
    : [];
  const enrich = new Map(accounts.map((a) => [a.id, a]));
  const topAccounts = topIds.map(([id, v]) => ({ id, ...v, account: enrich.get(id) ?? null }));

  return { days, totals, byModel, daily, topAccounts };
}
