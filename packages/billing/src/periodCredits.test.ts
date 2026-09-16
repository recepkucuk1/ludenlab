import { describe, expect, it } from "vitest";
import { periodCreditAmount } from "./credits";

/**
 * Regresyon kilidi — YILLIK ABONE, AYLIK VAAT EDİLEN HAKKIN 1/12'sini ALIYORDU
 * (2026-09 denetimi, P1).
 *
 * Kredi yüklemesi DÖNEM başına bir kezdir (bkz. shouldGrantCredits). Yıllık planda dönem
 * 365 gün olduğu için plan tanımındaki "aylık 100 hak" yılda bir kez, 100 olarak
 * yükleniyordu. Fiyat kartları ve Koşullar aylık hakkı vaat ediyor → yıllık dönemde
 * hak 12 katı yüklenmeli.
 */
describe("periodCreditAmount", () => {
  it("aylık dönemde plan hakkı aynen yüklenir", () => {
    expect(periodCreditAmount(100, "MONTHLY")).toBe(100);
    expect(periodCreditAmount(2, "MONTHLY")).toBe(2);
  });

  it("yıllık dönemde aylık hak 12 ile çarpılır", () => {
    expect(periodCreditAmount(100, "YEARLY")).toBe(1200);
    expect(periodCreditAmount(500, "YEARLY")).toBe(6000);
  });

  it("sınırsız (-1) çarpılmaz", () => {
    expect(periodCreditAmount(-1, "YEARLY")).toBe(-1);
    expect(periodCreditAmount(-1, "MONTHLY")).toBe(-1);
  });

  it("hak yoksa yıllıkta da yoktur", () => {
    expect(periodCreditAmount(0, "YEARLY")).toBe(0);
  });

  it("bilinmeyen dönem aylık kabul edilir (fazla hak DAĞITMAZ)", () => {
    expect(periodCreditAmount(100, "WEEKLY")).toBe(100);
    expect(periodCreditAmount(100, undefined)).toBe(100);
  });
});
