import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  billingPlan: { findUnique: vi.fn() },
  subscription: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  account: { updateMany: vi.fn(), findUnique: vi.fn() },
};
const sendPurchaseConfirmationEmail = vi.fn();
const retrieveSubscription = vi.fn();
const cancelAtProviderAndVerify = vi.fn();

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/iyzico", () => ({ retrieveSubscription }));
vi.mock("@/lib/email", () => ({ sendPurchaseConfirmationEmail }));
vi.mock("@/lib/billingAlarm", () => ({ billingAlarm: vi.fn() }));
vi.mock("@/lib/iyzicoOps", async () => {
  const real = await vi.importActual<typeof import("./iyzicoOps")>("./iyzicoOps");
  return { resolveSubscriptionPeriodEnd: real.resolveSubscriptionPeriodEnd, cancelAtProviderAndVerify };
});

const { provisionFromCheckout } = await import("./checkoutProvision");

const PLAN = { id: "plan_pro", module: "STUDIO", interval: "MONTHLY", name: "Studio Pro Aylık", price: 449 };
const CHECKOUT = {
  referenceCode: "SUB_NEW",
  pricingPlanReferenceCode: "PLAN_REF",
  customerReferenceCode: "CUS1",
  subscriptionStatus: "ACTIVE",
};
const REAL_END = Date.UTC(2026, 9, 20, 10, 0, 0); // 20.10 — 31 günlük ay

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  prisma.billingPlan.findUnique.mockResolvedValue(PLAN);
  prisma.subscription.findUnique.mockResolvedValue(null);
  prisma.subscription.findFirst.mockResolvedValue(null);
  prisma.subscription.create.mockResolvedValue({ id: "sub_1" });
  prisma.account.updateMany.mockResolvedValue({ count: 1 });
  prisma.account.findUnique.mockResolvedValue({ email: "a@b.c" });
  sendPurchaseConfirmationEmail.mockResolvedValue(undefined);
  retrieveSubscription.mockResolvedValue({
    status: "success",
    orders: [{ orderStatus: "SUCCESS", endPeriod: REAL_END }],
  });
  cancelAtProviderAndVerify.mockResolvedValue({ closed: true, observed: "CANCELED", alreadyClosed: false });
});

describe("provisionFromCheckout", () => {
  it("yeni aboneliği sağlayıcının GERÇEK dönem sonuyla kurar (tahmin değil)", async () => {
    const out = await provisionFromCheckout("acc_1", CHECKOUT);

    expect(out).toEqual({ kind: "created", module: "STUDIO", subscriptionId: "sub_1" });
    const data = prisma.subscription.create.mock.calls[0]![0].data;
    expect(data.status).toBe("ACTIVE");
    expect(data.iyzicoSubscriptionRef).toBe("SUB_NEW");
    expect((data.currentPeriodEnd as Date).getTime()).toBe(REAL_END);
    expect(prisma.account.updateMany).toHaveBeenCalledWith({
      where: { id: "acc_1", iyzicoCustomerRef: null },
      data: { iyzicoCustomerRef: "CUS1" },
    });
    // Satın alma onayı e-postası (beklenmeden gönderilir).
    await vi.waitFor(() =>
      expect(sendPurchaseConfirmationEmail).toHaveBeenCalledWith(
        "a@b.c",
        expect.objectContaining({ planName: "Studio Pro Aylık", interval: "MONTHLY" }),
      ),
    );
  });

  it("e-posta gönderilemezse abonelik kurulumu yine başarılıdır", async () => {
    sendPurchaseConfirmationEmail.mockRejectedValue(new Error("smtp down"));
    const out = await provisionFromCheckout("acc_1", CHECKOUT);
    expect(out.kind).toBe("created");
  });

  it("dönem sonu okunamazsa plan aralığından tahmin yazar", async () => {
    retrieveSubscription.mockResolvedValue({ status: "failure", errorCode: "X" });
    const before = Date.now();
    await provisionFromCheckout("acc_1", CHECKOUT);
    const end = (prisma.subscription.create.mock.calls[0]![0].data.currentPeriodEnd as Date).getTime();
    expect(end).toBeGreaterThanOrEqual(before + 29 * 24 * 3600 * 1000);
  });

  it("TEKRAR: kayıtlı ref'e HİÇBİR alan yazmaz (iptal geri alınmaz, dönem ileri kaymaz)", async () => {
    prisma.subscription.findUnique.mockResolvedValue({ id: "sub_old" });

    const out = await provisionFromCheckout("acc_1", CHECKOUT);

    expect(out).toEqual({ kind: "existing", module: "STUDIO" });
    expect(prisma.subscription.create).not.toHaveBeenCalled();
    expect(retrieveSubscription).not.toHaveBeenCalled();
    expect(sendPurchaseConfirmationEmail).not.toHaveBeenCalled(); // tekrar → ikinci e-posta yok
    expect(cancelAtProviderAndVerify).not.toHaveBeenCalled();
  });

  it("YİNELENEN: canlı abonelik varken gelen ödemeyi iyzico'da iptal eder, CANCELED kaydeder", async () => {
    prisma.subscription.findFirst.mockResolvedValue({ id: "sub_live" });

    const out = await provisionFromCheckout("acc_1", CHECKOUT);

    expect(out).toEqual({ kind: "duplicate", module: "STUDIO", providerClosed: true });
    expect(cancelAtProviderAndVerify).toHaveBeenCalledWith("SUB_NEW");
    const data = prisma.subscription.create.mock.calls[0]![0].data;
    expect(data.status).toBe("CANCELED");
    // Ref korunur: iptal doğrulanamadıysa sweep A yeniden dener, tekrar callback'i "existing" görür.
    expect(data.iyzicoSubscriptionRef).toBe("SUB_NEW");
    expect((data.currentPeriodEnd as Date).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("YARIŞ: kısmi benzersiz indeks ihlalinde (P2002) yinelenen yoluna düşer", async () => {
    prisma.subscription.create
      .mockRejectedValueOnce(Object.assign(new Error("unique"), { code: "P2002" }))
      .mockResolvedValueOnce({ id: "sub_dup" });

    const out = await provisionFromCheckout("acc_1", CHECKOUT);

    expect(out.kind).toBe("duplicate");
    expect(cancelAtProviderAndVerify).toHaveBeenCalledWith("SUB_NEW");
  });

  it("YARIŞ: aynı ref eşzamanlı yazıldıysa (P2002) mevcut sayar, iptal ETMEZ", async () => {
    prisma.subscription.create.mockRejectedValueOnce(Object.assign(new Error("unique"), { code: "P2002" }));
    prisma.subscription.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "sub_raced" });

    const out = await provisionFromCheckout("acc_1", CHECKOUT);

    expect(out).toEqual({ kind: "existing", module: "STUDIO" });
    expect(cancelAtProviderAndVerify).not.toHaveBeenCalled();
  });

  it("bilinmeyen plan ref'inde abonelik kurmaz", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(null);
    expect(await provisionFromCheckout("acc_1", CHECKOUT)).toEqual({ kind: "plan_not_found" });
    expect(prisma.subscription.create).not.toHaveBeenCalled();
  });
});
