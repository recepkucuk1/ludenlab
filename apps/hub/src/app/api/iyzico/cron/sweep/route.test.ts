import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  subscription: { findMany: vi.fn(), update: vi.fn() },
  billingPlan: { findUnique: vi.fn() },
  paymentIntent: { findMany: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  account: { findUnique: vi.fn() },
};
const retrieveSubscription = vi.fn();
const upgradeSubscription = vi.fn();
const retrieveCheckoutForm = vi.fn();
const cancelAtProviderAndVerify = vi.fn();
const recordAudit = vi.fn();
const billingAlarm = vi.fn();

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/cronAuth", () => ({ requireCronSecret: () => null }));
vi.mock("@/lib/iyzico", () => ({ retrieveSubscription, upgradeSubscription, retrieveCheckoutForm }));
vi.mock("@/lib/checkoutProvision", () => ({ provisionFromCheckout: vi.fn() }));
vi.mock("@/lib/iyzicoOps", async () => {
  const real = await vi.importActual<typeof import("@/lib/iyzicoOps")>("@/lib/iyzicoOps");
  return { resolveSubscriptionPeriodEnd: real.resolveSubscriptionPeriodEnd, cancelAtProviderAndVerify };
});
vi.mock("@/lib/billingAlarm", () => ({ billingAlarm }));
vi.mock("@studio/lib/audit", () => ({ recordAudit }));

const { POST } = await import("./route");

const run = () => POST(new Request("https://ludenlab.com/api/iyzico/cron/sweep", { method: "POST" }) as never);
const DAY = 24 * 60 * 60 * 1000;

/** findMany'yi faz sorgusunun `where`ine göre yanıtla. */
function subsByPhase(p: { A?: unknown[]; B1?: unknown[]; B2?: unknown[]; C?: unknown[] }) {
  prisma.subscription.findMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
    if (where.status === "CANCELED") return p.A ?? [];
    if (where.pendingPlanAppliesAt === null) return p.B1 ?? [];
    if (where.pendingPlanAppliesAt) return p.B2 ?? [];
    return p.C ?? [];
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  subsByPhase({});
  prisma.paymentIntent.findMany.mockResolvedValue([]);
  prisma.paymentIntent.deleteMany.mockResolvedValue({ count: 0 });
});

describe("iyzico sweep", () => {
  it("B1: düşürmeyi sağlayıcıya iletir ama YEREL planı değiştirmez; orijinal dönem sonunu saklar", async () => {
    const end = new Date(Date.now() + DAY);
    subsByPhase({ B1: [{ id: "s1", iyzicoSubscriptionRef: "R1", pendingBillingPlanId: "p_low", currentPeriodEnd: end }] });
    prisma.billingPlan.findUnique.mockResolvedValue({ id: "p_low", iyzicoPlanRef: "PLAN_LOW" });
    upgradeSubscription.mockResolvedValue({ status: "success", referenceCode: "R1" });
    retrieveSubscription.mockResolvedValue({
      status: "success",
      orders: [{ orderStatus: "SUCCESS", endPeriod: end.getTime() }],
    });

    const res = await run();

    expect(res.status).toBe(200);
    const data = prisma.subscription.update.mock.calls[0]![0].data;
    expect(data).toEqual({ iyzicoSubscriptionRef: "R1", iyzicoPricingPlanRef: "PLAN_LOW", pendingPlanAppliesAt: end });
    expect(data.billingPlanId).toBeUndefined();
  });

  it("B1: sağlayıcı YENİ dönem başlattıysa yerel planı hemen uygular (üst plan kredisi sızmaz)", async () => {
    const end = new Date(Date.now() + DAY);
    const newEnd = Date.now() + 30 * DAY;
    subsByPhase({ B1: [{ id: "s1", iyzicoSubscriptionRef: "R1", pendingBillingPlanId: "p_low", currentPeriodEnd: end }] });
    prisma.billingPlan.findUnique.mockResolvedValue({ id: "p_low", iyzicoPlanRef: "PLAN_LOW" });
    upgradeSubscription.mockResolvedValue({ status: "success", referenceCode: "R2" });
    retrieveSubscription.mockResolvedValue({ status: "success", orders: [{ orderStatus: "SUCCESS", endPeriod: newEnd }] });

    await run();

    expect(prisma.subscription.update.mock.calls[0]![0].data).toMatchObject({
      iyzicoSubscriptionRef: "R2",
      billingPlanId: "p_low",
      pendingBillingPlanId: null,
      pendingPlanAppliesAt: null,
      currentPeriodEnd: new Date(newEnd),
    });
  });

  it("B2: iletilmiş düşürmenin yerel planını dönem sonu geçince uygular", async () => {
    subsByPhase({ B2: [{ id: "s1", pendingBillingPlanId: "p_low" }] });

    await run();

    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { billingPlanId: "p_low", pendingBillingPlanId: null, pendingPlanAppliesAt: null },
    });
  });

  it("C: tanınmayan sağlayıcı durumu kaydın durumunu DEĞİŞTİRMEZ ve 500 döner", async () => {
    subsByPhase({ C: [{ id: "s1", iyzicoSubscriptionRef: "R1" }] });
    retrieveSubscription.mockResolvedValue({ status: "success", subscriptionStatus: "SUSPENDED" });

    const res = await run();

    expect(res.status).toBe(500);
    expect(prisma.subscription.update.mock.calls[0]![0].data.status).toBeUndefined();
    expect(billingAlarm).toHaveBeenCalled();
  });

  it("C: sağlayıcı ACTIVE ama dönem hâlâ geçmişse başarı SAYMAZ", async () => {
    subsByPhase({ C: [{ id: "s1", iyzicoSubscriptionRef: "R1" }] });
    retrieveSubscription.mockResolvedValue({
      status: "success",
      subscriptionStatus: "ACTIVE",
      orders: [{ orderStatus: "SUCCESS", endPeriod: Date.now() - 3 * DAY }],
    });

    const body = await (await run()).json();

    expect(body.ok).toBe(false);
    expect(body.staleActiveResynced[0]).toMatchObject({ ok: false, error: "donem_hala_gecmis" });
  });

  it("bir fazın çökmesi diğerlerini atlatmaz; heartbeat yine yazılır", async () => {
    prisma.subscription.findMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.status === "CANCELED") throw new Error("db timeout");
      return [];
    });

    const res = await run();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.phaseErrors).toEqual([{ phase: "A", error: "db timeout" }]);
    expect(prisma.paymentIntent.deleteMany).toHaveBeenCalled(); // D yine koştu
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "cron.iyzico-sweep", diff: expect.objectContaining({ phaseErrors: ["A"] }) }),
    );
  });

  it("her şey yolundaysa 200 ve heartbeat", async () => {
    const res = await run();
    expect(res.status).toBe(200);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "cron.iyzico-sweep" }));
  });
});
