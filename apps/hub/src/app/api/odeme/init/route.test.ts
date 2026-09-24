import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  account: { findUnique: vi.fn() },
  billingPlan: { findUnique: vi.fn() },
  subscription: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  billingProfile: { findUnique: vi.fn() },
  paymentIntent: { create: vi.fn() },
};
const upgradeSubscription = vi.fn();
const initializeCheckoutForm = vi.fn();
const retrieveSubscription = vi.fn();
const cancelAtProviderAndVerify = vi.fn();
const recordSalesConsent = vi.fn();

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/iyzico", () => ({ upgradeSubscription, initializeCheckoutForm, retrieveSubscription }));
vi.mock("@/lib/iyzicoOps", () => ({
  cancelAtProviderAndVerify,
  resolveSubscriptionPeriodEnd: () => new Date("2026-11-20T00:00:00Z"),
}));
vi.mock("@/lib/billingAlarm", () => ({ billingAlarm: vi.fn() }));
vi.mock("@/lib/salesConsent", () => ({ recordSalesConsent, SALES_CONSENT_VERSION: "v-test" }));
vi.mock("@/auth", () => ({ auth: vi.fn().mockResolvedValue({ user: { id: "acc_1" } }) }));
vi.mock("@/lib/rateLimit", () => ({
  getClientIp: () => "1.2.3.4",
  rateLimit: () => ({ allowed: true, retryAfter: 0 }),
  rateLimitResponse: vi.fn(),
}));

const { POST } = await import("./route");

const PRO = { id: "plan_pro", code: "PRO", name: "Studio Pro Aylık", interval: "MONTHLY", price: 449, active: true, iyzicoPlanRef: "R_PRO" };
const PRO_Y = { ...PRO, id: "plan_pro_y", name: "Studio Pro Yıllık", interval: "YEARLY", iyzicoPlanRef: "R_PRO_Y" };
const ADV = { id: "plan_adv", code: "ADVANCED", name: "Studio Advanced Aylık", interval: "MONTHLY", price: 1999, active: true, iyzicoPlanRef: "R_ADV" };
const UPDATED_AT = new Date("2026-09-01T00:00:00Z");
const activePro = {
  id: "sub_1",
  status: "ACTIVE",
  billingPlanId: PRO.id,
  billingPlan: PRO,
  pendingBillingPlanId: null,
  pendingPlanAppliesAt: null,
  iyzicoSubscriptionRef: "SUB_REF",
  currentPeriodEnd: new Date("2026-10-20T00:00:00Z"),
  updatedAt: UPDATED_AT,
};
const CONSENT = { confirm: true, consentVersion: "v-test" };

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
  prisma.account.findUnique.mockResolvedValue({ id: "acc_1", email: "a@b.c", name: "A B" });
  prisma.subscription.findFirst.mockResolvedValue(activePro);
  prisma.subscription.updateMany.mockResolvedValue({ count: 1 });
  upgradeSubscription.mockResolvedValue({ status: "success", referenceCode: "SUB_REF" });
  retrieveSubscription.mockResolvedValue({ status: "success" });
  recordSalesConsent.mockResolvedValue(undefined);
});

describe("POST /api/odeme/init — açık onay kapısı", () => {
  it("UPGRADE onaysız çağrıda iyzico'ya GİTMEZ, özet + sözleşme onayı ister", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(ADV);

    const data = await (await post({ code: "ADVANCED" })).json();

    expect(data).toMatchObject({ confirmRequired: true, change: "upgrade", requiresConsent: true, consentVersion: "v-test" });
    expect(data.message).toContain("Studio Advanced Aylık");
    expect(upgradeSubscription).not.toHaveBeenCalled();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it("UPGRADE eski sözleşme sürümüyle onaylanırsa yine özet döner", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(ADV);
    const data = await (await post({ code: "ADVANCED", confirm: true, consentVersion: "eski" })).json();
    expect(data.confirmRequired).toBe(true);
    expect(upgradeSubscription).not.toHaveBeenCalled();
  });

  it("UPGRADE onaylı çağrıda: onay KAYDI tahsilattan önce, sonra iyzico, dönem sonu senkronu", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(ADV);

    const data = await (await post({ code: "ADVANCED", ...CONSENT })).json();

    expect(data.upgraded).toBe(true);
    expect(recordSalesConsent).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: "acc_1", billingPlanId: ADV.id, kind: "UPGRADE", ip: "1.2.3.4" }),
    );
    expect(recordSalesConsent.mock.invocationCallOrder[0]!).toBeLessThan(upgradeSubscription.mock.invocationCallOrder[0]!);
    const update = prisma.subscription.update.mock.calls[0]![0];
    expect(update.data).toMatchObject({ billingPlanId: ADV.id, pendingPlanAppliesAt: null });
    expect(update.data.currentPeriodEnd).toEqual(new Date("2026-11-20T00:00:00Z"));
  });

  it("UPGRADE eşzamanlı istekte (sürüm kilidi kaybedilince) iyzico'ya GİTMEZ", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(ADV);
    prisma.subscription.updateMany.mockResolvedValueOnce({ count: 0 });

    const res = await post({ code: "ADVANCED", ...CONSENT });

    expect(res.status).toBe(409);
    expect(prisma.subscription.updateMany.mock.calls[0]![0].where).toEqual({ id: "sub_1", updatedAt: UPDATED_AT });
    expect(upgradeSubscription).not.toHaveBeenCalled();
  });

  it("onay kaydı yazılamazsa yükseltme YAPILMAZ", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(ADV);
    recordSalesConsent.mockRejectedValueOnce(new Error("db down"));

    const res = await post({ code: "ADVANCED", ...CONSENT });

    expect(res.status).toBe(500);
    expect(upgradeSubscription).not.toHaveBeenCalled();
  });

  it("DOWNGRADE onaysız çağrıda zamanlanmaz", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(PRO);
    prisma.subscription.findFirst.mockResolvedValue({ ...activePro, billingPlanId: ADV.id, billingPlan: ADV });

    const data = await (await post({ code: "PRO" })).json();

    expect(data).toMatchObject({ confirmRequired: true, change: "downgrade" });
    expect(data.requiresConsent).toBeUndefined(); // düşürme tahsilat değil
    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
  });

  it("aynı kademede YILLIK → AYLIK düşürme sayılır (anında yükseltme DEĞİL)", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(PRO);
    prisma.subscription.findFirst.mockResolvedValue({ ...activePro, billingPlanId: PRO_Y.id, billingPlan: PRO_Y });

    const data = await (await post({ code: "PRO", confirm: true })).json();

    expect(data.downgradeScheduled).toBe(true);
    expect(upgradeSubscription).not.toHaveBeenCalled();
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { id: "sub_1", pendingPlanAppliesAt: null },
      data: { pendingBillingPlanId: PRO.id },
    });
  });

  it("bekleyen düşürmeyi iptal onaysız yapılmaz", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(PRO);
    prisma.subscription.findFirst.mockResolvedValue({ ...activePro, pendingBillingPlanId: "plan_x" });

    const data = await (await post({ code: "PRO" })).json();

    expect(data).toMatchObject({ confirmRequired: true, change: "cancelDowngrade" });
    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
  });

  it("sağlayıcıya İLETİLMİŞ düşürme geri alınamaz (409)", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(PRO);
    prisma.subscription.findFirst.mockResolvedValue({
      ...activePro,
      pendingBillingPlanId: "plan_x",
      pendingPlanAppliesAt: new Date("2026-10-20T00:00:00Z"),
    });

    const res = await post({ code: "PRO", confirm: true });

    expect(res.status).toBe(409);
    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
  });

  it("PAST_DUE aboneliği onaysız sağlayıcıda KAPATMAZ; özet + sözleşme onayı ister", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(PRO);
    prisma.subscription.findFirst.mockResolvedValue({ ...activePro, status: "PAST_DUE" });

    const data = await (await post({ code: "PRO" })).json();

    expect(data).toMatchObject({ confirmRequired: true, change: "replace", requiresConsent: true });
    expect(cancelAtProviderAndVerify).not.toHaveBeenCalled();
  });

  it("YENİ abonelik: onay olmadan ödeme formu açılmaz", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(PRO);
    prisma.subscription.findFirst.mockResolvedValue(null);

    const data = await (await post({ code: "PRO" })).json();

    expect(data).toMatchObject({ confirmRequired: true, change: "checkout", requiresConsent: true });
    expect(initializeCheckoutForm).not.toHaveBeenCalled();
  });

  it("YENİ abonelik onaylıysa form açılır ve onay token'la kaydedilir", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(PRO);
    prisma.subscription.findFirst.mockResolvedValue(null);
    prisma.billingProfile.findUnique.mockResolvedValue({ fullName: "A B", city: "İstanbul", phone: "+905321234567" });
    initializeCheckoutForm.mockResolvedValue({ status: "success", token: "TOK", checkoutFormContent: "<div/>" });
    process.env.NEXT_PUBLIC_APP_URL = "https://ludenlab.com";

    const data = await (await post({ code: "PRO", ...CONSENT })).json();

    expect(data.token).toBe("TOK");
    expect(recordSalesConsent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "CHECKOUT", checkoutToken: "TOK", billingPlanId: PRO.id }),
    );
  });

  it("telefonu olmayan eski fatura profili ödemeden önce tamamlatılır (sahte numara gitmez)", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(PRO);
    prisma.subscription.findFirst.mockResolvedValue(null);
    prisma.billingProfile.findUnique.mockResolvedValue({ fullName: "A B", city: "İstanbul", phone: null });

    const res = await post({ code: "PRO", ...CONSENT });

    expect(res.status).toBe(428);
    expect(initializeCheckoutForm).not.toHaveBeenCalled();
  });

  it("iyzico'ya profildeki gerçek telefon gider", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(PRO);
    prisma.subscription.findFirst.mockResolvedValue(null);
    prisma.billingProfile.findUnique.mockResolvedValue({ fullName: "A B", city: "İstanbul", phone: "+905321234567", tckn: "10000000146" });
    initializeCheckoutForm.mockResolvedValue({ status: "success", token: "TOK", checkoutFormContent: "<div/>" });

    await post({ code: "PRO", ...CONSENT });

    const customer = initializeCheckoutForm.mock.calls[0]![0].customer;
    expect(customer.gsmNumber).toBe("+905321234567");
    expect(customer.identityNumber).toBe("10000000146");
  });

  it("canlı abonelik önceliklidir: ilk sorgu ACTIVE/PAST_DUE ile filtrelenir", async () => {
    prisma.billingPlan.findUnique.mockResolvedValue(ADV);
    await post({ code: "ADVANCED" });
    expect(prisma.subscription.findFirst.mock.calls[0]![0].where.status).toEqual({ in: ["ACTIVE", "PAST_DUE"] });
  });
});
