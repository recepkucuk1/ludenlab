import { describe, expect, it } from "vitest";
import { ACTIVE_STALE_GRACE_DAYS, isActiveStale, resolveEntitlement } from "./entitlement";

/**
 * Regresyon kilidi — "WEBHOOK GELMEZSE SÜRESİZ ACTIVE" (2026-09 denetimi, P1).
 *
 * Durumu ilerleten TEK kaynak webhook'tu: imza/URL yanlışsa ya da iyzico bildirimi hiç
 * ulaşmazsa abonelik `/odeme/sonuc`'un bıraktığı "ACTIVE, periodEnd = now+30g" hâlinde
 * DONUYORDU — erişim süresiz açık, fatura yok, kredi bir daha yüklenmiyor. Canlı veride
 * tam olarak bu görüldü: iyzico ref'li ACTIVE abonelik, sıfır webhook, sıfır ödeme.
 *
 * Kural: ödenmiş dönemin sonundan GRACE kadar sonra hâlâ ACTIVE görünüyorsa erişim kapanır.
 * Dönem sonu BİLİNMİYORSA (null) kapatmayız — bu ayrı bir veri durumu ve ödeyen müşteriyi
 * kesmek yanlış olur; kapattığımız şey "dönemi kanıtlı biçimde geçmiş" abonelik.
 */
const gunSonra = (base: Date, gun: number) => new Date(base.getTime() + gun * 24 * 60 * 60 * 1000);
const DONEM_SONU = new Date("2026-09-19T12:00:00Z");

describe("isActiveStale", () => {
  it("dönem sürerken bayat değildir", () => {
    expect(isActiveStale(DONEM_SONU, gunSonra(DONEM_SONU, -5))).toBe(false);
  });

  it("dönem yeni bitmişken grace içinde bayat sayılmaz", () => {
    expect(isActiveStale(DONEM_SONU, gunSonra(DONEM_SONU, ACTIVE_STALE_GRACE_DAYS - 1))).toBe(false);
  });

  it("grace dolduktan sonra bayattır", () => {
    expect(isActiveStale(DONEM_SONU, gunSonra(DONEM_SONU, ACTIVE_STALE_GRACE_DAYS + 1))).toBe(true);
  });

  it("dönem sonu bilinmiyorsa bayat SAYILMAZ (ödeyen müşteriyi kesme)", () => {
    expect(isActiveStale(null, new Date())).toBe(false);
  });
});

describe("resolveEntitlement — bayat ACTIVE", () => {
  it("dönemi çoktan geçmiş ACTIVE erişim vermez", () => {
    const e = resolveEntitlement(
      { status: "ACTIVE", currentPeriodEnd: DONEM_SONU },
      gunSonra(DONEM_SONU, ACTIVE_STALE_GRACE_DAYS + 3),
    );
    expect(e.active).toBe(false);
    expect(e.access).toBe("choose");
  });

  it("dönemi süren ACTIVE tam erişim alır", () => {
    const e = resolveEntitlement(
      { status: "ACTIVE", currentPeriodEnd: DONEM_SONU },
      gunSonra(DONEM_SONU, -1),
    );
    expect(e.active).toBe(true);
    expect(e.access).toBe("allow");
  });

  it("TRIAL bu kuraldan etkilenmez", () => {
    const e = resolveEntitlement(
      { status: "TRIAL", currentPeriodEnd: DONEM_SONU },
      gunSonra(DONEM_SONU, ACTIVE_STALE_GRACE_DAYS + 3),
    );
    expect(e.active).toBe(true);
  });
});
