// apps/hub/src/modules/studio/lib/assistant/dailyCap.test.ts
import { describe, expect, it } from "vitest";
import { OBSERVATIONS_PER_DAY, trGunBaslangici } from "./dailyCap";

describe("trGunBaslangici", () => {
  it("TR gece yarısından sonra (01:30 TR, 19 Eki) → 19 Eki 00:00 TR", () => {
    expect(trGunBaslangici(new Date("2026-10-18T22:30:00Z")).toISOString()).toBe("2026-10-18T21:00:00.000Z");
  });
  it("TR gece yarısından önce (23:59 TR, 18 Eki) → 18 Eki 00:00 TR", () => {
    expect(trGunBaslangici(new Date("2026-10-18T20:59:00Z")).toISOString()).toBe("2026-10-17T21:00:00.000Z");
  });
  it("tavan 10", () => expect(OBSERVATIONS_PER_DAY).toBe(10));
});
