import { describe, expect, it } from "vitest";
import { validateAvatarDataUrl } from "./imageDataUrl";

/**
 * Regresyon kilidi — avatar yalnız ÖNEKLE doğrulanıyordu (2026-08 denetimi #39).
 * Önek istemci yazımıdır: `data:image/png;base64,<keyfi bayt>` geçiyordu.
 */
const MAX = 300 * 1024;
const url = (mime: string, bytes: number[]) =>
  `data:image/${mime};base64,${Buffer.from(Uint8Array.from(bytes)).toString("base64")}`;

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 1, 2, 3];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 9, 9, 9];
const WEBP = [0x52, 0x49, 0x46, 0x46, 40, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1, 2, 3];

describe("validateAvatarDataUrl — kabul edilenler", () => {
  it("gerçek PNG/JPEG/WebP geçer", () => {
    expect(validateAvatarDataUrl(url("png", PNG), MAX)).toMatchObject({ ok: true, format: "png" });
    expect(validateAvatarDataUrl(url("jpeg", JPEG), MAX)).toMatchObject({ ok: true, format: "jpeg" });
    expect(validateAvatarDataUrl(url("webp", WEBP), MAX)).toMatchObject({ ok: true, format: "webp" });
  });

  it("image/jpg öneki de JPEG sayılır", () => {
    expect(validateAvatarDataUrl(url("jpg", JPEG), MAX)).toMatchObject({ ok: true, format: "jpeg" });
  });
});

describe("validateAvatarDataUrl — reddedilenler", () => {
  it("PNG olduğunu SÖYLEYEN ama olmayan içerik reddedilir (asıl regresyon)", () => {
    const fake = `data:image/png;base64,${Buffer.from("<svg onload=alert(1)></svg>").toString("base64")}`;
    expect(validateAvatarDataUrl(fake, MAX)).toMatchObject({ ok: false });
  });

  it("format karıştırma reddedilir (JPEG baytları PNG diye gelirse)", () => {
    expect(validateAvatarDataUrl(url("png", JPEG), MAX)).toMatchObject({ ok: false });
    expect(validateAvatarDataUrl(url("webp", PNG), MAX)).toMatchObject({ ok: false });
  });

  it("SVG önekli data-URL hiç kabul edilmez", () => {
    const svg = `data:image/svg+xml;base64,${Buffer.from("<svg/>").toString("base64")}`;
    expect(validateAvatarDataUrl(svg, MAX)).toMatchObject({ ok: false });
  });

  it("boyut sınırı imza kontrolünden ÖNCE uygulanır", () => {
    const big = `data:image/png;base64,${"A".repeat(MAX * 2)}`;
    const r = validateAvatarDataUrl(big, MAX);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/KB/);
  });

  it("boş/yanlış tipte girdide çökmez", () => {
    expect(validateAvatarDataUrl(null, MAX)).toMatchObject({ ok: false });
    expect(validateAvatarDataUrl("", MAX)).toMatchObject({ ok: false });
    expect(validateAvatarDataUrl(42, MAX)).toMatchObject({ ok: false });
    expect(validateAvatarDataUrl("data:image/png;base64,", MAX)).toMatchObject({ ok: false });
  });
});
