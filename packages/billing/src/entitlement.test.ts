import { describe, expect, it } from "vitest";
import { isPastDueExpired, PAST_DUE_GRACE_DAYS, resolveEntitlement } from "./entitlement";

/**
 * Regresyon kilidi — "SÜRESİZ PAST_DUE grace" (2026-08 güvenlik denetimi #24).
 *
 * Eski davranış: `PAST_DUE` KOŞULSUZ `{ active: true, access: "warn" }` dönüyordu ve bu
 * durumdan çıkış yolu YOKTU (sweep cron'u PAST_DUE'ya bakmıyor; webhook ancak iyzico
 * cancelled/expired gönderirse durumu değiştiriyor). Kartı kalıcı başarısız olan hesap
 * ücretli erişimini süresiz sürdürüyordu.
 *
 * Yeni sözleşme: grace, son ÖDENMİŞ dönem sonundan itibaren PAST_DUE_GRACE_DAYS gün sürer.
 */
const DAY = 24 * 60 * 60 * 1000;
const periodEnd = new Date("2026-09-01T00:00:00Z");
const at = (offsetMs: number) => new Date(periodEnd.getTime() + offsetMs);

describe("isPastDueExpired", () => {
  it("dönem sonu HENÜZ gelmediyse grace dolmamıştır", () => {
    expect(isPastDueExpired(periodEnd, at(-5 * DAY))).toBe(false);
  });

  it("grace penceresi içinde dolmamıştır", () => {
    expect(isPastDueExpired(periodEnd, at(1 * DAY))).toBe(false);
    expect(isPastDueExpired(periodEnd, at((PAST_DUE_GRACE_DAYS - 1) * DAY))).toBe(false);
  });

  it("tam sınırda (grace'in son anı) HÂLÂ dolmamıştır — sınır dahil", () => {
    expect(isPastDueExpired(periodEnd, at(PAST_DUE_GRACE_DAYS * DAY))).toBe(false);
  });

  it("sınırın 1 ms ötesinde dolmuştur", () => {
    expect(isPastDueExpired(periodEnd, at(PAST_DUE_GRACE_DAYS * DAY + 1))).toBe(true);
  });

  it("dönem sonu YOKSA fail-closed (hiç başarılı tahsilat kanıtı yok)", () => {
    expect(isPastDueExpired(null, periodEnd)).toBe(true);
    expect(isPastDueExpired(undefined, periodEnd)).toBe(true);
  });

  it("geçersiz tarihte fail-closed — fırlatmaz", () => {
    expect(isPastDueExpired("olmayan-tarih", periodEnd)).toBe(true);
  });

  it("string/number tarihleri de kabul eder (pg sürücü farkına dayanıklı)", () => {
    expect(isPastDueExpired(periodEnd.toISOString(), at(1 * DAY))).toBe(false);
    expect(isPastDueExpired(periodEnd.getTime(), at(30 * DAY))).toBe(true);
  });
});

describe("resolveEntitlement — PAST_DUE", () => {
  it("grace içinde erişim sürer ama 'ödeme güncelle' bandı gösterilir", () => {
    const e = resolveEntitlement({ status: "PAST_DUE", currentPeriodEnd: periodEnd }, at(2 * DAY));
    expect(e.active).toBe(true);
    expect(e.access).toBe("warn");
    expect(e.status).toBe("PAST_DUE");
  });

  it("grace dolunca erişim KAPANIR (asıl regresyon)", () => {
    const e = resolveEntitlement({ status: "PAST_DUE", currentPeriodEnd: periodEnd }, at(30 * DAY));
    expect(e.active).toBe(false);
    expect(e.access).toBe("choose");
    expect(e.status).toBe("PAST_DUE"); // durum korunur — UI "ödeme başarısız" diyebilsin
  });

  it("dönem sonu bilinmiyorsa erişim verilmez", () => {
    const e = resolveEntitlement({ status: "PAST_DUE", currentPeriodEnd: null }, periodEnd);
    expect(e.active).toBe(false);
  });
});

describe("resolveEntitlement — diğer durumlar (davranış değişmedi)", () => {
  it("ACTIVE ve TRIAL tam erişim verir", () => {
    for (const status of ["ACTIVE", "TRIAL"] as const) {
      const e = resolveEntitlement({ status, currentPeriodEnd: periodEnd }, at(365 * DAY));
      expect(e).toMatchObject({ active: true, access: "allow", status });
    }
  });

  it("PENDING / CANCELED / EXPIRED erişim vermez", () => {
    for (const status of ["PENDING", "CANCELED", "EXPIRED"] as const) {
      const e = resolveEntitlement({ status, currentPeriodEnd: periodEnd }, at(-1 * DAY));
      expect(e).toMatchObject({ active: false, access: "choose", status });
    }
  });

  it("abonelik yoksa NONE", () => {
    expect(resolveEntitlement(null)).toMatchObject({ active: false, access: "choose", status: "NONE" });
  });
});
