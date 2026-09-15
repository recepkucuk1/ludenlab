import { afterEach, describe, expect, it, vi } from "vitest";
import { hcaptchaEnabled, verifyHcaptcha } from "./hcaptcha";

/**
 * hCaptcha (2026-08 denetimi #15'in ikinci yarısı): kayıt ucu bot koruması.
 * Tasarım: HCAPTCHA_SECRET yoksa özellik KAPALI (her şey geçer) — anahtarlar girilene
 * kadar deploy güvenli. Secret varsa token zorunlu; hCaptcha API'si ulaşılamazsa
 * FAIL-CLOSED (bot kapısı, kullanılabilirlik değil güvenlik kontrolü).
 */
type FetchLike = typeof fetch;
const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

describe("hcaptcha", () => {
  const orig = process.env.HCAPTCHA_SECRET;
  afterEach(() => {
    if (orig === undefined) delete process.env.HCAPTCHA_SECRET;
    else process.env.HCAPTCHA_SECRET = orig;
  });

  it("secret yoksa kapalı: token olmasa da geçer", async () => {
    delete process.env.HCAPTCHA_SECRET;
    expect(hcaptchaEnabled()).toBe(false);
    const fetchMock = vi.fn() as unknown as FetchLike;
    expect(await verifyHcaptcha(undefined, null, fetchMock)).toEqual({ ok: true, reason: "disabled" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("secret varsa token zorunlu", async () => {
    process.env.HCAPTCHA_SECRET = "0xSECRET";
    expect(hcaptchaEnabled()).toBe(true);
    const fetchMock = vi.fn() as unknown as FetchLike;
    expect(await verifyHcaptcha("", null, fetchMock)).toEqual({ ok: false, reason: "missing-token" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("siteverify success → ok; secret ve token form gövdesinde, remoteip verilirse eklenir", async () => {
    process.env.HCAPTCHA_SECRET = "0xSECRET";
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe("https://api.hcaptcha.com/siteverify");
      const body = init?.body as URLSearchParams;
      expect(body.get("secret")).toBe("0xSECRET");
      expect(body.get("response")).toBe("tok-123");
      expect(body.get("remoteip")).toBe("203.0.113.9");
      return jsonResponse({ success: true });
    }) as unknown as FetchLike;
    expect(await verifyHcaptcha("tok-123", "203.0.113.9", fetchMock)).toEqual({ ok: true });
  });

  it("siteverify success:false → hata kodlarıyla reddeder", async () => {
    process.env.HCAPTCHA_SECRET = "0xSECRET";
    const fetchMock = vi.fn(async () => jsonResponse({ success: false, "error-codes": ["invalid-input-response"] })) as unknown as FetchLike;
    expect(await verifyHcaptcha("tok", null, fetchMock)).toEqual({ ok: false, reason: "invalid-input-response" });
  });

  it("HTTP hatası ve ağ hatası → fail-closed", async () => {
    process.env.HCAPTCHA_SECRET = "0xSECRET";
    const http500 = vi.fn(async () => jsonResponse({}, 500)) as unknown as FetchLike;
    expect(await verifyHcaptcha("tok", null, http500)).toEqual({ ok: false, reason: "http-500" });
    const network = vi.fn(async () => { throw new Error("ECONNRESET"); }) as unknown as FetchLike;
    expect(await verifyHcaptcha("tok", null, network)).toEqual({ ok: false, reason: "network" });
  });
});
