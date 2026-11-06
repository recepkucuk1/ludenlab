// apps/hub/src/modules/studio/lib/age.test.ts
import { describe, expect, it } from "vitest";
import { calcAgeText, calcAgeYears } from "./age";

describe("age", () => {
  it("yıl farkı; metin 'N yaşında'; doğum tarihi yoksa boş", () => {
    const simdi = new Date(2026, 10, 6);
    expect(calcAgeYears(new Date(2019, 3, 10), simdi)).toBe(7);
    expect(calcAgeText(new Date(2019, 3, 10), simdi)).toBe("7 yaşında");
    expect(calcAgeText(null, simdi)).toBe("");
  });
});
