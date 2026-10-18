// apps/hub/src/modules/studio/lib/prefill.test.ts
import { describe, expect, it } from "vitest";
import { PREFILL_MAX_BYTES, decodePrefill, encodePrefill } from "./prefill";

describe("prefill", () => {
  it("gidiş-dönüş: nesne base64url'e kodlanır ve aynen çözülür", () => {
    const girdi = { targetSounds: ["/r/", "/ş/"], level: "word", itemCount: 12, theme: "çiçekler ğüşıöç" };
    const kod = encodePrefill(girdi);
    expect(kod).toMatch(/^[A-Za-z0-9_-]+$/); // URL güvenli, '=' yok
    expect(decodePrefill(kod)).toEqual(girdi);
  });

  it("bozuk base64 / bozuk JSON / dizi / null → null", () => {
    expect(decodePrefill("%%%")).toBeNull();
    expect(decodePrefill(Buffer.from("{bozuk").toString("base64url"))).toBeNull();
    expect(decodePrefill(Buffer.from("[1,2]").toString("base64url"))).toBeNull();
    expect(decodePrefill(Buffer.from("null").toString("base64url"))).toBeNull();
    expect(decodePrefill(null)).toBeNull();
    expect(decodePrefill("")).toBeNull();
  });

  it("2 KB üstü reddedilir", () => {
    const buyuk = encodePrefill({ theme: "a".repeat(PREFILL_MAX_BYTES) });
    expect(decodePrefill(buyuk)).toBeNull();
  });
});
