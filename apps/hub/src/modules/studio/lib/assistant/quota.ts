// apps/hub/src/modules/studio/lib/assistant/quota.ts
import type { PlanType } from "@/generated/studio/client";
import { ASSISTANT_MONTHLY_CAP, isAssistantMonthlyCapReached } from "@studio/lib/plans";
import { trAyBaslangici } from "./dailyCap";

/** Asistan çağrılarının `logUsage` etiketi — sayım bununla yapılır. */
export const ASSISTANT_USAGE_ENDPOINT = "students/assistant";

type QuotaPrisma = { apiUsageLog: { count(args: unknown): Promise<number> } };

export interface AssistantQuota {
  used: number;
  /** -1 = sınırsız. */
  cap: number;
  reached: boolean;
}

/**
 * Uzmanın bu TR ayındaki asistan çağrı sayısı (yeniden denemeler dahil; `logUsage` her gerçek
 * model çağrısında yazar). Sayım patlarsa kota DOLU sayılmaz (uzmanı cezalandırma), uyarı loglanır.
 */
export async function assistantQuota(prisma: QuotaPrisma, therapistId: string, planType: PlanType, now = new Date()): Promise<AssistantQuota> {
  const cap = ASSISTANT_MONTHLY_CAP[planType];
  let used = 0;
  try {
    used = await prisma.apiUsageLog.count({
      where: { therapistId, endpoint: ASSISTANT_USAGE_ENDPOINT, createdAt: { gte: trAyBaslangici(now) } },
    });
  } catch (e) {
    console.warn("[assistant] kota sayımı yapılamadı, açık sayıldı", e);
  }
  return { used, cap, reached: isAssistantMonthlyCapReached(planType, used) };
}
