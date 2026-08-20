import { describe, expect, it } from "vitest";
import { shouldGrantCredits } from "./credits";

/**
 * Regresyon kilidi — P0 "dönem-sonu kredi sızıntısı" (2026-08 güvenlik denetimi #01).
 *
 * Eski davranış now-tabanlıydı (`now >= lastCreditedPeriodEnd - 1g`): reconcile kredi
 * çıpasını AYNI `periodEnd` değerine yazdığı için, dönem sonuna 24 saatten az kala koşul
 * her render'da yeniden true oluyor ve tam plan kredisi tekrar tekrar yükleniyordu.
 *
 * Yeni sözleşme DÖNEM-tabanlıdır: yalnız merkezi dönem sonu, kredilenmiş dönemden
 * İLERİ gittiyse yükle. Çıpa bir kez `periodEnd`'e yazılınca aynı dönem bir daha kazanamaz.
 */
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("shouldGrantCredits", () => {
  it("hiç kredilenmemiş abonelikte (ilk görüş) yükler", () => {
    expect(shouldGrantCredits(null, new Date("2026-09-01T00:00:00Z"))).toBe(true);
    expect(shouldGrantCredits(undefined, new Date("2026-09-01T00:00:00Z"))).toBe(true);
  });

  it("dönem ilerlediğinde (yenileme) yükler", () => {
    const credited = new Date("2026-09-01T00:00:00Z");
    const renewed = new Date("2026-10-01T00:00:00Z");
    expect(shouldGrantCredits(credited, renewed)).toBe(true);
  });

  it("aynı dönem için İKİNCİ kez yüklemez (çıpa == periodEnd)", () => {
    const periodEnd = new Date("2026-09-01T00:00:00Z");
    expect(shouldGrantCredits(periodEnd, periodEnd)).toBe(false);
  });

  it("P0: dönem sonuna <24 saat kala tekrar tekrar yüklemez", () => {
    // Çıpa zaten bu dönemin sonuna yazılmış; "now" dönem sonuna 1 saat kalmış olsun.
    const periodEnd = new Date("2026-09-01T00:00:00Z");
    const now = new Date(periodEnd.getTime() - HOUR);

    // Aynı dönemde kaç kez sorulursa sorulsun cevap HAYIR olmalı (F5 döngüsü).
    for (let i = 0; i < 5; i++) {
      expect(shouldGrantCredits(periodEnd, periodEnd, now)).toBe(false);
    }
  });

  it("P0: dönem sonu GEÇMİŞTE kalsa (yenileme gecikmesi) bile tekrar yüklemez", () => {
    const periodEnd = new Date("2026-09-01T00:00:00Z");
    const now = new Date(periodEnd.getTime() + 3 * DAY); // webhook gecikti, status ACTIVE
    expect(shouldGrantCredits(periodEnd, periodEnd, now)).toBe(false);
  });

  it("merkezi dönem sonu bilinmiyorsa (null) yüklemez — hareketli çıpa döngüsünü kapatır", () => {
    // periodEnd null iken çağıran taraf `now + 30g` gibi HAREKETLİ bir değer türetirse
    // her render'da ileri kayar ve döngü yeniden doğardı; burada fail-closed davranırız.
    expect(shouldGrantCredits(null, null)).toBe(false);
    expect(shouldGrantCredits(new Date("2026-08-01T00:00:00Z"), undefined)).toBe(false);
  });

  it("geri giden dönem sonunda (veri anomalisi) yüklemez", () => {
    const credited = new Date("2026-10-01T00:00:00Z");
    const older = new Date("2026-09-01T00:00:00Z");
    expect(shouldGrantCredits(credited, older)).toBe(false);
  });
});
