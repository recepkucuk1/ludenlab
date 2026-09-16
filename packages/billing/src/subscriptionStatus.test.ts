import { describe, expect, it } from "vitest";
import { mapIyzicoSubscriptionStatus } from "./subscriptionStatus";

/**
 * Sağlayıcı durumu → merkezi abonelik durumu. Bu eşleme ESKİDEN `/odeme/sonuc`
 * içinde gömülüydü; sweep'in "dönemi geçmiş ACTIVE"i sağlayıcıdan senkronlaması için
 * de gerektiğinden tek yere alındı. İki kopyanın ayrışması para-kritik olurdu.
 */
describe("mapIyzicoSubscriptionStatus", () => {
  it("aktif ve yükseltilmiş abonelikler ACTIVE sayılır", () => {
    expect(mapIyzicoSubscriptionStatus("ACTIVE")).toBe("ACTIVE");
    expect(mapIyzicoSubscriptionStatus("UPGRADED")).toBe("ACTIVE");
  });

  it("ödenmemiş abonelik PAST_DUE olur", () => {
    expect(mapIyzicoSubscriptionStatus("UNPAID")).toBe("PAST_DUE");
  });

  it("iptal ve bitiş durumları korunur (iki L'li varyant dahil)", () => {
    expect(mapIyzicoSubscriptionStatus("CANCELED")).toBe("CANCELED");
    expect(mapIyzicoSubscriptionStatus("CANCELLED")).toBe("CANCELED");
    expect(mapIyzicoSubscriptionStatus("EXPIRED")).toBe("EXPIRED");
  });

  it("büyük/küçük harf ve boşluk sağlayıcıya bırakılmaz", () => {
    expect(mapIyzicoSubscriptionStatus("active")).toBe("ACTIVE");
    expect(mapIyzicoSubscriptionStatus("  Unpaid  ")).toBe("PAST_DUE");
  });

  it("bilinmeyen ya da eksik durum PENDING'e düşer (erişim açmaz)", () => {
    expect(mapIyzicoSubscriptionStatus("WHATEVER")).toBe("PENDING");
    expect(mapIyzicoSubscriptionStatus(undefined)).toBe("PENDING");
    expect(mapIyzicoSubscriptionStatus("")).toBe("PENDING");
  });
});
