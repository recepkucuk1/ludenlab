import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  paymentIntent: { findUnique: vi.fn(), update: vi.fn() },
  billingPlan: { findUnique: vi.fn() },
  account: { findUnique: vi.fn(), findFirst: vi.fn() },
};
const retrieveCheckoutForm = vi.fn();
const provisionFromCheckout = vi.fn();

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/iyzico", () => ({ retrieveCheckoutForm }));
vi.mock("@/lib/checkoutProvision", () => ({ provisionFromCheckout }));
vi.mock("@/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/rateLimit", () => ({ getClientIp: () => "unknown", rateLimit: () => ({ allowed: true }) }));

const { POST } = await import("./route");

const TOKEN = "tok_abcdefghijklmnop";
const post = () => {
  const body = new FormData();
  body.set("token", TOKEN);
  return POST(new Request("https://ludenlab.com/odeme/sonuc", { method: "POST", body }) as never);
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = "https://ludenlab.com";
  prisma.billingPlan.findUnique.mockResolvedValue({ module: "STUDIO" });
  prisma.account.findUnique.mockResolvedValue({ id: "acc_1" });
  retrieveCheckoutForm.mockResolvedValue({ status: "success", referenceCode: "SUB1", pricingPlanReferenceCode: "P" });
  provisionFromCheckout.mockResolvedValue({ kind: "created", module: "STUDIO", subscriptionId: "s" });
});

describe("POST /odeme/sonuc", () => {
  it("TEKRAR: tüketilmiş niyette sağlayıcıya gitmez, aboneliğe yazmaz, modüle döner", async () => {
    prisma.paymentIntent.findUnique.mockResolvedValue({
      id: "pi_1",
      status: "CONSUMED",
      accountId: "acc_1",
      billingPlanId: "plan_1",
    });

    const res = await post();

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).not.toContain("/odeme/hata");
    expect(retrieveCheckoutForm).not.toHaveBeenCalled();
    expect(provisionFromCheckout).not.toHaveBeenCalled();
    expect(prisma.paymentIntent.update).not.toHaveBeenCalled();
  });

  it("ilk callback: niyetin hesabına kurar ve niyeti tüketir", async () => {
    prisma.paymentIntent.findUnique.mockResolvedValue({
      id: "pi_1",
      status: "PENDING",
      accountId: "acc_1",
      billingPlanId: "plan_1",
    });

    const res = await post();

    expect(provisionFromCheckout).toHaveBeenCalledWith("acc_1", expect.objectContaining({ referenceCode: "SUB1" }));
    expect(prisma.paymentIntent.update).toHaveBeenCalledWith({ where: { id: "pi_1" }, data: { status: "CONSUMED" } });
    expect(res.headers.get("location")).not.toContain("/odeme/hata");
  });

  it("yinelenen abonelikte kullanıcıyı iade bilgisiyle hata sayfasına yollar", async () => {
    prisma.paymentIntent.findUnique.mockResolvedValue({
      id: "pi_1",
      status: "PENDING",
      accountId: "acc_1",
      billingPlanId: "plan_1",
    });
    provisionFromCheckout.mockResolvedValue({ kind: "duplicate", module: "STUDIO", providerClosed: true });

    const res = await post();

    expect(res.headers.get("location")).toContain("/odeme/hata?reason=duplicate_subscription");
    expect(prisma.paymentIntent.update).toHaveBeenCalled(); // tekrar işlenmesin
  });
});
