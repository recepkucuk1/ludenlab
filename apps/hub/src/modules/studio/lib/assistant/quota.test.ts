import { describe, expect, it, vi } from "vitest";
import { ASSISTANT_USAGE_ENDPOINT, assistantQuota } from "./quota";

describe("assistantQuota", () => {
  it("TR ay başından itibaren, uzman + endpoint ile sayar; PRO'da 150'de dolar", async () => {
    const count = vi.fn().mockResolvedValue(150);
    const q = await assistantQuota({ apiUsageLog: { count } }, "t1", "PRO", new Date("2026-10-18T12:00:00Z"));
    expect(count).toHaveBeenCalledWith({ where: { therapistId: "t1", endpoint: ASSISTANT_USAGE_ENDPOINT, createdAt: { gte: new Date("2026-09-30T21:00:00.000Z") } } });
    expect(q).toEqual({ used: 150, cap: 150, reached: true });
  });
  it("ENTERPRISE sınırsız", async () => {
    const q = await assistantQuota({ apiUsageLog: { count: vi.fn().mockResolvedValue(9999) } }, "t1", "ENTERPRISE");
    expect(q.reached).toBe(false);
    expect(q.cap).toBe(-1);
  });
  it("sayım patlarsa kota açık sayılır", async () => {
    const q = await assistantQuota({ apiUsageLog: { count: vi.fn().mockRejectedValue(new Error("db")) } }, "t1", "PRO");
    expect(q).toEqual({ used: 0, cap: 150, reached: false });
  });
});
