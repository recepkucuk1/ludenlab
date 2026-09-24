import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regresyon kilidi — kredi TOCTOU'su (2026-08 güvenlik denetimi #22).
 *
 * Eski akış "bakiyeye BAK → AI'ı çağır → sonra DÜŞ" idi; aradaki pencerede eşzamanlı
 * istekler aynı bakiyeyi görüp HEPSİ AI'ı çağırabiliyordu. Yeni sözleşme:
 *   · rezervasyon TEK koşullu updateMany'dir (kontrol + düşüm ayrılamaz),
 *   · rezervasyon başarısızsa defterde İZ KALMAZ,
 *   · iade asla fırlatmaz (çağıranın hata yolunu bozmasın).
 *
 * DB'ye gitmeden sözleşmeyi kilitliyoruz: prisma taklit edilir, çağrıların ŞEKLİ doğrulanır.
 */
const updateMany = vi.fn();
const createTxn = vi.fn();
const update = vi.fn();
const findTherapist = vi.fn();
const countTxn = vi.fn();

vi.mock("@studio/lib/db", () => ({
  prisma: {
    // $transaction(cb) — callback'i taklit istemciyle çalıştırır (gerçek Prisma davranışı).
    $transaction: (cb: (tx: unknown) => unknown) =>
      Promise.resolve(
        cb({
          therapist: { updateMany, update, findUnique: findTherapist },
          creditTransaction: { create: createTxn },
        }),
      ),
    therapist: { findUnique: findTherapist },
    creditTransaction: { count: countTxn },
  },
}));

vi.mock("@studio/lib/plans", () => ({
  CREDIT_COSTS: { card_generate: 1, ai_profile: 2 },
  PLAN_CONFIG: { FREE: { creditAmount: 2 }, PRO: { creditAmount: 100 }, ENTERPRISE: { creditAmount: -1 } },
}));

const { DAILY_REFUND_CAP, refundCredits, refundCreditsFor, reserveCredits, reserveCreditsFor } = await import(
  "./credits"
);

beforeEach(() => {
  updateMany.mockReset();
  createTxn.mockReset();
  update.mockReset();
  update.mockResolvedValue({ credits: 0 });
  createTxn.mockResolvedValue({});
  findTherapist.mockReset();
  findTherapist.mockResolvedValue({ planType: "PRO" });
  countTxn.mockReset();
  countTxn.mockResolvedValue(0);
});

describe("reserveCredits", () => {
  it("KOŞULLU tek update ile düşer — kontrol ve düşüm ayrılamaz", async () => {
    updateMany.mockResolvedValue({ count: 1 });

    await expect(reserveCredits("t1", 3, "Test üretimi")).resolves.toBe(true);

    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "t1", credits: { gte: 3 } }, // ← yarışa karşı asıl koruma
      data: { credits: { decrement: 3 } },
    });
  });

  it("başarılı rezervasyon deftere SPEND yazar (bakiye ↔ defter tutarlı kalır)", async () => {
    updateMany.mockResolvedValue({ count: 1 });

    await reserveCredits("t1", 2, "Test üretimi");

    expect(createTxn).toHaveBeenCalledWith({
      data: { therapistId: "t1", amount: 2, type: "SPEND", description: "Test üretimi" },
    });
  });

  it("bakiye yetmezse false döner ve deftere HİÇBİR iz bırakmaz", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(reserveCredits("t1", 5, "Test üretimi")).resolves.toBe(false);
    expect(createTxn).not.toHaveBeenCalled();
  });

  it("maliyet 0/negatifse DB'ye hiç gitmez", async () => {
    await expect(reserveCredits("t1", 0, "Bedava")).resolves.toBe(true);
    expect(updateMany).not.toHaveBeenCalled();
    expect(createTxn).not.toHaveBeenCalled();
  });

  it("anahtarlı sarmalayıcı maliyeti ve açıklamayı sabit tablodan alır", async () => {
    updateMany.mockResolvedValue({ count: 1 });

    await reserveCreditsFor("t1", "ai_profile");

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "t1", credits: { gte: 2 } },
      data: { credits: { decrement: 2 } },
    });
    expect(createTxn).toHaveBeenCalledWith({
      data: { therapistId: "t1", amount: 2, type: "SPEND", description: "AI profil oluşturma" },
    });
  });
});

describe("refundCredits", () => {
  it("hakkı geri yükler ve deftere EARN yazar", async () => {
    await refundCredits("t1", 2, "Test — iade");

    expect(update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { credits: { increment: 2 } },
      select: { credits: true },
    });
    expect(createTxn).toHaveBeenCalledWith({
      data: { therapistId: "t1", amount: 2, type: "EARN", description: "Test — iade" },
    });
  });

  it("iade patlasa bile FIRLATMAZ — çağıranın hata yolunu bozmaz", async () => {
    update.mockRejectedValue(new Error("DB düştü"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(refundCredits("t1", 1, "Test — iade")).resolves.toBeUndefined();

    expect(logged).toHaveBeenCalled(); // sessizce yutulmaz — elle düzeltilebilsin
    logged.mockRestore();
  });

  it("anahtarlı iade, açıklamaya gerekçeyi ekler", async () => {
    await refundCreditsFor("t1", "card_generate", "üretim tamamlanamadı");

    expect(createTxn).toHaveBeenCalledWith({
      data: {
        therapistId: "t1",
        amount: 1,
        type: "EARN",
        description: "Öğrenme kartı üretimi — iade (üretim tamamlanamadı)",
      },
    });
  });
});

describe("sınırsız plan (2026-09 denetimi #22)", () => {
  it("ENTERPRISE'ta rezervasyon düşüm YAPMAZ ve başarılıdır", async () => {
    findTherapist.mockResolvedValue({ planType: "ENTERPRISE" });

    await expect(reserveCredits("t1", 1, "Test üretimi")).resolves.toBe(true);
    expect(updateMany).not.toHaveBeenCalled();
    expect(createTxn).not.toHaveBeenCalled();
  });

  it("ENTERPRISE'ta iade de yapılmaz (bedava hak birikmez)", async () => {
    findTherapist.mockResolvedValue({ planType: "ENTERPRISE" });

    await refundCredits("t1", 1, "Test — iade");
    expect(update).not.toHaveBeenCalled();
  });
});

describe("günlük iade tavanı (2026-09 denetimi #16)", () => {
  it("24 saatte tavan dolduysa iade YAPILMAZ", async () => {
    countTxn.mockResolvedValue(DAILY_REFUND_CAP);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await refundCredits("t1", 1, "Test — iade (bozuk çıktı)");

    expect(update).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("maliyetsiz (önbellekten) iade tavana tabi değildir", async () => {
    countTxn.mockResolvedValue(DAILY_REFUND_CAP);

    await refundCredits("t1", 1, "Görsel — iade (tümü önbellekten)", { providerCostIncurred: false });

    expect(countTxn).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });
});
