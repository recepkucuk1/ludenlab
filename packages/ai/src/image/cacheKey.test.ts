import { describe, it, expect } from "vitest";
import { buildCacheKey } from "./cacheKey";

describe("buildCacheKey", () => {
  it("normalize edilmiş kelime + stil + model birleştirir", () => {
    expect(
      buildCacheKey({ word: "Sandal", styleVersion: "v1", model: "gpt-image-1-mini" }),
    ).toBe("sandal|v1|gpt-image-1-mini");
  });

  it("aynı kelimenin farklı yazımları aynı anahtara düşer", () => {
    const a = buildCacheKey({ word: "ŞAPKA.", styleVersion: "v1", model: "m" });
    const b = buildCacheKey({ word: " şapka ", styleVersion: "v1", model: "m" });
    expect(a).toBe(b);
  });
});
