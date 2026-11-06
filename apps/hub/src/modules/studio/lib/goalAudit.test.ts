// apps/hub/src/modules/studio/lib/goalAudit.test.ts
import { describe, expect, it, vi } from "vitest";
import { GOAL_AUDIT_ENDPOINT, goalAuditBugun, usageToLog } from "./goalAudit";

describe("goalAudit", () => {
  it("günlük sayım: etiket + TR günü; sayım patlarsa 0 (açık)", async () => {
    const count = vi.fn(async (_a: unknown) => 4);
    expect(await goalAuditBugun({ apiUsageLog: { count } }, "t1", new Date("2026-11-05T22:30:00Z"))).toBe(4);
    expect(count).toHaveBeenCalledWith({ where: { therapistId: "t1", endpoint: GOAL_AUDIT_ENDPOINT, createdAt: { gte: new Date("2026-11-05T21:00:00.000Z") } } });
    const patlayan = vi.fn(async (_a: unknown): Promise<number> => { throw new Error("db"); });
    expect(await goalAuditBugun({ apiUsageLog: { count: patlayan } }, "t1")).toBe(0);
    expect(GOAL_AUDIT_ENDPOINT).toBe("students/goal-audit");
  });
  it("usageToLog: @ludenlab/ai TokenUsage → Anthropic usage biçimi", () => {
    expect(usageToLog({ inputTokens: 10, outputTokens: 5, cacheReadTokens: 2, cacheCreationTokens: 1 })).toEqual({
      input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 2, cache_creation_input_tokens: 1,
    });
  });
});
