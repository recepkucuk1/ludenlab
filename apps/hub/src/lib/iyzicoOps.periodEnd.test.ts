import { describe, expect, it } from "vitest";
import { resolveSubscriptionPeriodEnd } from "./iyzicoOps";

/**
 * 2026-09-21 canlı kanıtı: iyzico abonelik yanıtında ÜST DÜZEY `endDate` YOK.
 * Dönem bilgisi `orders[]` içinde ve epoch MİLİSANİYE. Sweep C yalnız `endDate`e
 * baktığı için tarihi güncellemeden "ok" diyordu (sessiz başarı) → bayat ACTIVE
 * iki gün boyunca düzelmedi.
 */
const AGU20 = 1787234836340;
const EYL20 = 1789913236340;
const EKI20 = 1792505236340;
const KAS20 = 1795183636339;

const canliYanit = {
  status: "success" as const,
  subscriptionStatus: "ACTIVE",
  orders: [
    { startPeriod: EKI20, endPeriod: KAS20, orderStatus: "WAITING", price: 449 },
    { startPeriod: EYL20, endPeriod: EKI20, orderStatus: "SUCCESS", price: 449 },
    { startPeriod: AGU20, endPeriod: EYL20, orderStatus: "SUCCESS", price: 449 },
  ],
};

describe("resolveSubscriptionPeriodEnd", () => {
  it("ÖDENMİŞ siparişlerin en geç bitişini döner (WAITING sayılmaz)", () => {
    expect(resolveSubscriptionPeriodEnd(canliYanit)?.getTime()).toBe(EKI20);
  });

  it("üst düzey endDate varsa onu tercih eder", () => {
    const d = resolveSubscriptionPeriodEnd({ ...canliYanit, endDate: "2026-12-31T00:00:00Z" });
    expect(d?.toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });

  it("sipariş dizisi sırasız gelse de en geç ödenmişi bulur", () => {
    const karisik = { ...canliYanit, orders: [...canliYanit.orders].reverse() };
    expect(resolveSubscriptionPeriodEnd(karisik)?.getTime()).toBe(EKI20);
  });

  it("epoch yerine ISO metin gelse de çalışır", () => {
    const iso = { orders: [{ endPeriod: "2026-10-20T14:07:16Z", orderStatus: "SUCCESS" }] };
    expect(resolveSubscriptionPeriodEnd(iso)?.toISOString()).toBe("2026-10-20T14:07:16.000Z");
  });

  it("ödenmiş sipariş yoksa null (sessiz başarı YOK)", () => {
    expect(resolveSubscriptionPeriodEnd({ orders: [{ endPeriod: KAS20, orderStatus: "WAITING" }] })).toBeNull();
    expect(resolveSubscriptionPeriodEnd({ orders: [] })).toBeNull();
    expect(resolveSubscriptionPeriodEnd({})).toBeNull();
  });

  it("çözümlenemeyen tarihleri yok sayar", () => {
    const bozuk = { orders: [{ endPeriod: "abc", orderStatus: "SUCCESS" }, { endPeriod: EYL20, orderStatus: "SUCCESS" }] };
    expect(resolveSubscriptionPeriodEnd(bozuk)?.getTime()).toBe(EYL20);
  });
});
