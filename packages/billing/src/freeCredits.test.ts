import { describe, expect, it } from "vitest";
import { creditSetDelta, monthStartUTC, shouldRefillFreeCredits } from "./freeCredits";

/**
 * İKİ ÜRÜN KARARI (2026-09-16, kurucu):
 *   ① Ücretsiz plan AYDA 2 üretim hakkı alacak — şimdiye kadar hak yalnız KAYITTA
 *     veriliyordu, aylık yenileme hiç yoktu. Ücretsiz kullanıcının merkezi aboneliği
 *     olmadığı için dönem kredisini yükleyen reconcile dalı onlara hiç uğramıyor.
 *   ② Haklar SONRAKİ DÖNEME DEVRETMEYECEK — Koşullar zaten "devretmez" diyordu, kod ise
 *     devrediyordu. Yükleme artık ARTIRMA değil ATAMA: dönem başında bakiye plan hakkına
 *     eşitlenir, artan hak yanar.
 *
 * Yenileme ÇIPASI takvim ayıdır ve UTC'ye göre hesaplanır. Türkiye saatiyle arada birkaç
 * saatlik kayma olur; aylık bir yenilemede bu fark kullanıcı lehine/aleyhine anlamlı
 * değildir ve tek bir kesin sınır, saat dilimi hatalarından daha güvenlidir.
 */
describe("monthStartUTC", () => {
  it("içinde bulunulan ayın ilk anını verir", () => {
    expect(monthStartUTC(new Date("2026-09-16T07:30:00Z")).toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
  });

  it("ay sınırının kendisi zaten ay başıdır", () => {
    expect(monthStartUTC(new Date("2026-09-01T00:00:00Z")).toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
  });

  it("yıl sınırını doğru geçer", () => {
    expect(monthStartUTC(new Date("2027-01-03T12:00:00Z")).toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    );
  });
});

describe("shouldRefillFreeCredits", () => {
  const simdi = new Date("2026-09-16T07:30:00Z");

  it("hiç yüklenmemişse yüklenir", () => {
    expect(shouldRefillFreeCredits(null, simdi)).toBe(true);
    expect(shouldRefillFreeCredits(undefined, simdi)).toBe(true);
  });

  it("geçen ay yüklenmişse yeniden yüklenir", () => {
    expect(shouldRefillFreeCredits(new Date("2026-08-31T23:59:59Z"), simdi)).toBe(true);
  });

  it("bu ay yüklenmişse TEKRAR yüklenmez", () => {
    expect(shouldRefillFreeCredits(new Date("2026-09-01T00:00:00Z"), simdi)).toBe(false);
    expect(shouldRefillFreeCredits(new Date("2026-09-15T23:00:00Z"), simdi)).toBe(false);
  });

  it("ileri tarihli çıpa yükleme AÇMAZ (saat kayması güvenliği)", () => {
    expect(shouldRefillFreeCredits(new Date("2026-10-05T00:00:00Z"), simdi)).toBe(false);
  });
});

describe("creditSetDelta — atama yapılırken defter tutarlı kalır", () => {
  it("bakiye hedefin altındaysa aradaki fark KAZANÇ yazılır", () => {
    expect(creditSetDelta(0, 2)).toEqual({ kind: "earn", amount: 2 });
    expect(creditSetDelta(100, 1200)).toEqual({ kind: "earn", amount: 1100 });
  });

  it("DEVRETMEME: artan hak varsa fark HARCAMA olarak yazılır", () => {
    expect(creditSetDelta(5, 2)).toEqual({ kind: "spend", amount: 3 });
    expect(creditSetDelta(40, 0)).toEqual({ kind: "spend", amount: 40 });
  });

  it("bakiye zaten hedefteyse defter kaydı YAZILMAZ", () => {
    expect(creditSetDelta(2, 2)).toEqual({ kind: "none", amount: 0 });
  });
});
