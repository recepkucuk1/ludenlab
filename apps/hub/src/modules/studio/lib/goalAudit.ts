// apps/hub/src/modules/studio/lib/goalAudit.ts
import type { TokenUsage } from "@ludenlab/ai";
import { trGunBaslangici } from "@/lib/trZaman";
import type { AnthropicUsageLike } from "@studio/lib/usage";

/* Hedef denetçisi Studio yüzeyi (spec §7.2). Günlük sınır `ApiUsageLog` sayımıyla (etiket aşağıda; parse hatası da
   loglandığı için sayılır). Sayım patlarsa açık sayılır (asistan ilkesi). */

export const GOAL_AUDIT_ENDPOINT = "students/goal-audit";
export const GOAL_AUDIT_RATE_PER_MIN = 6;

type SayimPrisma = { apiUsageLog: { count(args: unknown): Promise<number> } };

export async function goalAuditBugun(prisma: SayimPrisma, therapistId: string, now: Date = new Date()): Promise<number> {
  try {
    return await prisma.apiUsageLog.count({ where: { therapistId, endpoint: GOAL_AUDIT_ENDPOINT, createdAt: { gte: trGunBaslangici(now) } } });
  } catch (e) {
    console.warn("[goalAudit] günlük sayım yapılamadı, açık sayıldı", e);
    return 0;
  }
}

/** `@ludenlab/ai` TokenUsage → Studio `logUsage` girdisi. */
export function usageToLog(u: TokenUsage): AnthropicUsageLike {
  return { input_tokens: u.inputTokens, output_tokens: u.outputTokens, cache_read_input_tokens: u.cacheReadTokens, cache_creation_input_tokens: u.cacheCreationTokens };
}
