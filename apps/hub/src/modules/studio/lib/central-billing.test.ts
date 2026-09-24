import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regresyon kilidi — MERKEZDE BİTEN ABONELİK MODÜLE YANSIMIYORDU (2026-09 denetimi).
 * iyzico tarafındaki sona erme/iptal yalnız merkezi satırı değiştiriyordu; yerel mirror
 * ACTIVE kaldığı için ücretli plan süresiz sürüyordu.
 */

process.env.NEXT_PUBLIC_CENTRAL_BILLING = "true";

const tx = {
  subscription: { updateMany: vi.fn() },
  therapist: { update: vi.fn() },
};
const prisma = {
  therapist: { findUnique: vi.fn() },
  subscription: { findMany: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
  plan: { findFirst: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
};
vi.mock("@studio/lib/db", () => ({ prisma }));

const { reconcileCentralEntitlement } = await import("./central-billing");

/** $queryRaw etiketli şablon çağrısını SQL metnine göre yanıtlar. */
function centralRows(rows: { active?: unknown[]; ended?: unknown[]; pastDue?: unknown[] }) {
  prisma.$queryRaw.mockImplementation(async (strings: TemplateStringsArray) => {
    const sql = strings.join("?");
    if (sql.includes("IN ('CANCELED', 'EXPIRED')")) return rows.ended ?? [];
    if (sql.includes("'PAST_DUE'")) return rows.pastDue ?? [];
    return rows.active ?? [];
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  prisma.therapist.findUnique.mockResolvedValue({ planType: "PRO", email: "t@x.com", freeCreditsRenewedAt: null });
  prisma.subscription.updateMany.mockResolvedValue({ count: 1 });
  prisma.plan.findFirst.mockResolvedValue(null);
});

describe("reconcileCentralEntitlement — merkezde biten abonelik", () => {
  it("merkezde EXPIRED olan aboneliğin mirror'unu kapatır ve planı FREE'ye düşürür", async () => {
    centralRows({ ended: [{ ref: "central_1" }] });
    prisma.subscription.findMany.mockResolvedValue([{ id: "mirror_1" }]);

    await reconcileCentralEntitlement("th_1");

    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { centralSubscriptionId: { in: ["central_1"] }, status: "ACTIVE" },
      data: { status: "CANCELLED", currentPeriodEnd: expect.any(Date) },
    });
    expect(tx.therapist.update).toHaveBeenCalledWith({
      where: { id: "th_1" },
      data: { planType: "FREE", studentLimit: 2, pdfEnabled: false },
    });
  });

  it("merkezi aboneliği hiç olmayan MANUEL grant'e dokunmaz", async () => {
    centralRows({});
    prisma.subscription.findMany.mockResolvedValue([]);

    await reconcileCentralEntitlement("th_1");

    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
    expect(tx.therapist.update).not.toHaveBeenCalled();
  });

  it("aktif sorgu bayat ACTIVE satırı dışlar (dönem sonu eşiği parametresi)", async () => {
    centralRows({});
    prisma.subscription.findMany.mockResolvedValue([]);

    await reconcileCentralEntitlement("th_1");

    const activeCall = prisma.$queryRaw.mock.calls.find(([s]) =>
      (s as TemplateStringsArray).join("?").includes("sub.status = 'ACTIVE'\n"),
    );
    expect(activeCall).toBeDefined();
    expect((activeCall![0] as TemplateStringsArray).join("?")).toContain('sub."currentPeriodEnd" >= ?');
  });

  it("FREE hesapta merkez sorgusu yapmaz", async () => {
    prisma.therapist.findUnique.mockResolvedValue({ planType: "FREE", email: "t@x.com", freeCreditsRenewedAt: new Date() });
    centralRows({});

    await reconcileCentralEntitlement("th_1");

    const endedCall = prisma.$queryRaw.mock.calls.find(([s]) =>
      (s as TemplateStringsArray).join("?").includes("IN ('CANCELED', 'EXPIRED')"),
    );
    expect(endedCall).toBeUndefined();
  });
});
