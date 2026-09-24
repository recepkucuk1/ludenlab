import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  subscription: { findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  account: { findFirst: vi.fn() },
};
const cancelAtProviderAndVerify = vi.fn();
const billingAlarm = vi.fn();

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/iyzicoOps", () => ({ cancelAtProviderAndVerify }));
vi.mock("@/lib/billingAlarm", () => ({ billingAlarm }));

const { cancelCentralSubscription, cancelMessage } = await import("./centralCancel");

const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  prisma.subscription.findUnique.mockResolvedValue({ accountId: "acc_1" });
  prisma.subscription.updateMany.mockResolvedValue({ count: 1 });
  cancelAtProviderAndVerify.mockResolvedValue({ closed: true, observed: "CANCELED" });
});

describe("cancelCentralSubscription", () => {
  it("mirror'ın bağlı olduğu merkezi kayıt YOKSA iptali reddeder (sessiz ok:true yok)", async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);

    const r = await cancelCentralSubscription({ module: "STUDIO", email: "a@b.c", centralSubscriptionId: "c1" });

    expect(r).toEqual({ ok: false, reason: "central_missing" });
    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
    expect(billingAlarm).toHaveBeenCalled();
  });

  it("bağ varsa e-posta aramaz; ACTIVE ve PAST_DUE aboneliği CANCELED yapar", async () => {
    prisma.subscription.findMany.mockResolvedValue([
      { id: "s1", iyzicoSubscriptionRef: "R1", currentPeriodEnd: new Date(Date.now() + 10 * 24 * HOUR) },
    ]);

    const r = await cancelCentralSubscription({ module: "STUDIO", email: "a@b.c", centralSubscriptionId: "c1" });

    expect(r).toEqual({ ok: true, providerPending: false, hadCentral: true });
    expect(prisma.account.findFirst).not.toHaveBeenCalled();
    expect(prisma.subscription.findMany.mock.calls[0]![0].where.status).toEqual({ in: ["ACTIVE", "PAST_DUE"] });
    // Dönem uzak → sağlayıcıya ertelenmiş (devam ettirilebilsin).
    expect(cancelAtProviderAndVerify).not.toHaveBeenCalled();
  });

  it("yenilemeye <24h kala sağlayıcı iptali doğrulanamazsa providerPending + alarm", async () => {
    prisma.subscription.findMany.mockResolvedValue([
      { id: "s1", iyzicoSubscriptionRef: "R1", currentPeriodEnd: new Date(Date.now() + 5 * HOUR) },
    ]);
    cancelAtProviderAndVerify.mockResolvedValue({ closed: false, observed: "ACTIVE", error: "timeout" });

    const r = await cancelCentralSubscription({ module: "ATOLYE", email: null, centralSubscriptionId: "c1" });

    expect(r).toEqual({ ok: true, providerPending: true, hadCentral: true });
    expect(prisma.subscription.update).not.toHaveBeenCalled(); // ref korunur → sweep A tekrar dener
    expect(billingAlarm).toHaveBeenCalled();
  });

  it("bağsız (eski/elle verilmiş) mirror'da merkezi hesap yoksa yalnız yerel iptal", async () => {
    prisma.account.findFirst.mockResolvedValue(null);

    const r = await cancelCentralSubscription({ module: "STUDIO", email: "a@b.c", centralSubscriptionId: null });

    expect(r).toEqual({ ok: true, providerPending: false, hadCentral: false });
  });
});

describe("cancelMessage", () => {
  it("sağlayıcı iletimi bekliyorsa bunu açıkça söyler", () => {
    expect(cancelMessage(new Date("2026-10-20T00:00:00Z"), true)).toContain("henüz iletilemedi");
    expect(cancelMessage(new Date("2026-10-20T00:00:00Z"), false)).toContain("Aboneliğiniz iptal edildi");
  });
});
