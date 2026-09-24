import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  account: { findUnique: vi.fn() },
  billingPlan: { findUnique: vi.fn() },
  subscription: { findFirst: vi.fn(), update: vi.fn() },
  billingProfile: { findUnique: vi.fn() },
  paymentIntent: { create: vi.fn() },
};
const upgradeSubscription = vi.fn();
const initializeCheckoutForm = vi.fn();
const cancelAtProviderAndVerify = vi.fn();

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/iyzico", () => ({ upgradeSubscription, initializeCheckoutForm }));
vi.mock("@/lib/iyzicoOps", () => ({ cancelAtProviderAndVerify }));
vi.mock("@/auth", () => ({ auth: vi.fn().mockResolvedValue({ user: { id: "acc_1" } }) }));
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: () => ({ allowed: true, retryAfter: 0 }),
  rateLimitResponse: vi.fn(),
}));

const { POST } = await import("./route");

const PRO = { id: "plan_pro", code: "PRO", name: "Studio Pro Aylık", interval: "MONTHLY", price: 449, active: true, iyzicoPlanRef: "R_PRO" };
const ADV = { id: "plan_adv", code: "ADVANCED", name: "Studio Advanced Aylık", interval: "MONTHLY", price: 1999, active: true, iyzicoPlanRef: "R_ADV" };
const activePro = {
  id: "sub_1",
  status: "ACTIVE",
  billingPlanId: PRO.id,
  billingPlan: PRO,
  pendingBillingPlanId: null,
  iyzicoSubscriptionRef: "SUB_REF",
  currentPeriodEnd: new Date("2026-10-20T00:00:00Z"),
};

const post = (body: Record<string, unknown>) =>
  POST(
    new Request("https://ludenlab.com/api/odeme/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module: "STUDIO", interval: "MONTHLY", ...body }),
    }) as never,
  );

beforeEach(() => {
  vi.clearAllMocks();
  prisma.account.findUnique.mockResolvedValue({ id: "acc_1", email: "a@b.c" });
  prisma.subscription.findFirst.mockResolvedValue(activePro);
  upgradeSubscription.mockResolvedValue({ status: "success", referenceCode: "SUB_REF" });
});

describe("POST /api/odeme/init — açık onay kapısı", () => {
  it("UPGRADE onaysız çağrıda iyzico'ya GİTMEZ, özet döner", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(ADV);

    const res = await post({ code: "ADVANCED" });
    const data = await res.json();

    expect(data.confirmRequired).toBe(true);
    expect(data.change).toBe("upgrade");
    expect(data.message).toContain("Studio Advanced Aylık");
    expect(upgradeSubscription).not.toHaveBeenCalled();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it("UPGRADE onaylı çağrıda uygulanır", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(ADV);

    const data = await (await post({ code: "ADVANCED", confirm: true })).json();

    expect(data.upgraded).toBe(true);
    expect(upgradeSubscription).toHaveBeenCalledTimes(1);
  });

  it("DOWNGRADE onaysız çağrıda zamanlanmaz", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(PRO);
    prisma.subscription.findFirst.mockResolvedValue({ ...activePro, billingPlanId: ADV.id, billingPlan: ADV });

    const data = await (await post({ code: "PRO" })).json();

    expect(data).toMatchObject({ confirmRequired: true, change: "downgrade" });
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it("bekleyen düşürmeyi iptal onaysız yapılmaz", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(PRO);
    prisma.subscription.findFirst.mockResolvedValue({ ...activePro, pendingBillingPlanId: "plan_x" });

    const data = await (await post({ code: "PRO" })).json();

    expect(data).toMatchObject({ confirmRequired: true, change: "cancelDowngrade" });
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it("PAST_DUE aboneliği onaysız sağlayıcıda KAPATMAZ", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(PRO);
    prisma.subscription.findFirst.mockResolvedValue({ ...activePro, status: "PAST_DUE" });

    const data = await (await post({ code: "PRO" })).json();

    expect(data).toMatchObject({ confirmRequired: true, change: "replace" });
    expect(cancelAtProviderAndVerify).not.toHaveBeenCalled();
  });

  it("canlı abonelik önceliklidir: ilk sorgu ACTIVE/PAST_DUE ile filtrelenir", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(ADV);
    await post({ code: "ADVANCED" });
    expect(prisma.subscription.findFirst.mock.calls[0]![0].where.status).toEqual({ in: ["ACTIVE", "PAST_DUE"] });
  });
});
