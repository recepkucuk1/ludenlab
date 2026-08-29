import { describe, expect, it } from "vitest";
import { maskEmail } from "./logRedact";

/** Regresyon kilidi — loglarda düz e-posta (2026-08 denetimi #37). */
describe("maskEmail", () => {
  it("yerel kısmı maskeler, alan adını bırakır (hata ayıklama için yeterli)", () => {
    expect(maskEmail("recep@ludenlab.com")).toBe("r****@ludenlab.com");
    expect(maskEmail("a@b.com")).toBe("a*@b.com");
  });

  it("alt alan adlı ve + etiketli adreslerde bozulmaz", () => {
    expect(maskEmail("ali+etiket@mail.example.co.uk")).toBe("a*********@mail.example.co.uk") // "ali+etiket" = 10 karakter → 1 baş + 9 yıldız;
  });

  it("birden çok @ varsa SONUNCUSUNU ayraç sayar", () => {
    expect(maskEmail("a@b@c.com")).toBe("a**@c.com");
  });

  it("boş/geçersiz girdide çökmez ve veri sızdırmaz", () => {
    expect(maskEmail(null)).toBe("<yok>");
    expect(maskEmail(undefined)).toBe("<yok>");
    expect(maskEmail("   ")).toBe("<yok>");
    expect(maskEmail("@yok.com")).toBe("<geçersiz>");
    expect(maskEmail("adsız")).toBe("<geçersiz>");
  });
});
