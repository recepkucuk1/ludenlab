import { describe, expect, it } from "vitest";
import { isCsrfExemptPath, isValidRequestOrigin } from "./csrf";

/**
 * Regresyon kilidi — "CSRF savunması yalnız SameSite=Lax" (2026-08 denetimi #28).
 * Sözleşme: cross-site durum değiştiren istek reddedilir, meşru akışlar kırılmaz.
 */
const APP = "https://ludenlab.com";
const base = { host: "ludenlab.com", appUrl: APP, origin: null, secFetchSite: null };

describe("isValidRequestOrigin — güvenli metotlar", () => {
  it("GET/HEAD/OPTIONS hiç kontrol edilmez", () => {
    for (const method of ["GET", "HEAD", "OPTIONS", "get"]) {
      expect(isValidRequestOrigin({ ...base, method, origin: "https://evil.com", secFetchSite: "cross-site" })).toBe(true);
    }
  });
});

describe("isValidRequestOrigin — reddedilenler", () => {
  it("başka siteden gelen POST reddedilir (asıl saldırı)", () => {
    expect(isValidRequestOrigin({ ...base, method: "POST", origin: "https://evil.com", secFetchSite: "cross-site" })).toBe(false);
  });

  it("Sec-Fetch-Site yokken bile yabancı Origin reddedilir", () => {
    expect(isValidRequestOrigin({ ...base, method: "POST", origin: "https://evil.com" })).toBe(false);
  });

  it("benzeyen alan adı kabul edilmez (nokta sınırı)", () => {
    expect(isValidRequestOrigin({ ...base, method: "POST", origin: "https://xludenlab.com" })).toBe(false);
    expect(isValidRequestOrigin({ ...base, method: "POST", origin: "https://ludenlab.com.evil.net" })).toBe(false);
  });

  it("Origin: null (sandbox iframe) cross-site sinyaliyle reddedilir", () => {
    expect(isValidRequestOrigin({ ...base, method: "POST", origin: "null", secFetchSite: "cross-site" })).toBe(false);
  });

  it("cross-site geldi ama Origin yoksa reddedilir", () => {
    expect(isValidRequestOrigin({ ...base, method: "POST", origin: null, secFetchSite: "cross-site" })).toBe(false);
  });
});

describe("isValidRequestOrigin — kırılmaması gerekenler", () => {
  it("kendi sayfamızdan gelen POST geçer", () => {
    expect(isValidRequestOrigin({ ...base, method: "POST", origin: APP, secFetchSite: "same-origin" })).toBe(true);
  });

  it("alt alan adı (SSO: studio.ludenlab.com) geçer", () => {
    expect(isValidRequestOrigin({ ...base, method: "POST", origin: "https://studio.ludenlab.com" })).toBe(true);
  });

  it("apex'e POST eden alt alan adı ve tersi geçer", () => {
    expect(
      isValidRequestOrigin({ method: "POST", host: "studio.ludenlab.com", appUrl: APP, origin: APP, secFetchSite: null }),
    ).toBe(true);
  });

  it("tarayıcı olmayan çağıran (webhook/cron: başlık yok) geçer", () => {
    expect(isValidRequestOrigin({ ...base, method: "POST" })).toBe(true);
  });

  it("Sec-Fetch-Site: none (adres çubuğundan) geçer", () => {
    expect(isValidRequestOrigin({ ...base, method: "POST", secFetchSite: "none" })).toBe(true);
  });

  it("appUrl tanımsızsa istek Host'una göre karar verir", () => {
    expect(isValidRequestOrigin({ method: "POST", host: "ludenlab.com", appUrl: null, origin: APP, secFetchSite: null })).toBe(true);
    expect(isValidRequestOrigin({ method: "POST", host: "ludenlab.com", appUrl: null, origin: "https://evil.com", secFetchSite: null })).toBe(false);
  });

  it("port farkı aynı host'u bozmaz — dev (localhost:3000)", () => {
    expect(
      isValidRequestOrigin({ method: "POST", host: "localhost:3000", appUrl: "http://localhost:3000", origin: "http://localhost:3000", secFetchSite: null }),
    ).toBe(true);
  });
});

describe("isCsrfExemptPath", () => {
  it("sağlayıcı webhook'u ve cron muaf", () => {
    expect(isCsrfExemptPath("/api/iyzico/webhook")).toBe(true);
    expect(isCsrfExemptPath("/api/iyzico/cron/sweep")).toBe(true);
  });

  it("normal uçlar muaf DEĞİL", () => {
    expect(isCsrfExemptPath("/api/account/password")).toBe(false);
    expect(isCsrfExemptPath("/api/account/delete")).toBe(false);
    expect(isCsrfExemptPath("/api/odeme/init")).toBe(false);
    expect(isCsrfExemptPath("/api/iyzico/webhookX")).toBe(false);
  });
});
