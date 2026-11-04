// apps/hub/src/modules/studio/lib/probe/schema.test.ts
import { describe, expect, it } from "vitest";
import { articulation } from "@ludenlab/ai";
import { PROBE_COUNT, PROBE_POSITIONS, PROBE_SOUNDS, createRunSchema, createSeriesSchema } from "./schema";

describe("createSeriesSchema", () => {
  it("geçerli gövde: ses '/r/' biçimi, pozisyon enum, adet varsayılan 10", () => {
    const r = createSeriesSchema.parse({ sound: " /r/ ", position: "initial" });
    expect(r).toEqual({ sound: "/r/", position: "initial", count: 10 });
  });
  it("ses biçimi: slash'sız, çok harfli, büyük harf reddedilir; Türkçe tek harf kabul", () => {
    expect(createSeriesSchema.safeParse({ sound: "r", position: "initial" }).success).toBe(false);
    expect(createSeriesSchema.safeParse({ sound: "/rr/", position: "initial" }).success).toBe(false);
    expect(createSeriesSchema.safeParse({ sound: "/R/", position: "initial" }).success).toBe(false);
    expect(createSeriesSchema.safeParse({ sound: "/ş/", position: "final" }).success).toBe(true);
    expect(createSeriesSchema.safeParse({ sound: "/x/", position: "initial" }).success).toBe(false);
    expect(createSeriesSchema.safeParse({ sound: "/İ/", position: "initial" }).success).toBe(false);
    expect(createSeriesSchema.safeParse({ sound: "/I/", position: "initial" }).success).toBe(false);
    expect(createSeriesSchema.safeParse({ sound: "/ı/", position: "initial" }).success).toBe(true);
  });
  it("adet 5–20 dışı reddedilir", () => {
    expect(createSeriesSchema.safeParse({ sound: "/r/", position: "initial", count: 4 }).success).toBe(false);
    expect(createSeriesSchema.safeParse({ sound: "/r/", position: "initial", count: 21 }).success).toBe(false);
    expect(PROBE_COUNT).toEqual({ min: 5, max: 20, default: 10 });
  });
  it("PROBE_SOUNDS bankadaki her sesi ve yalnız onları listeler", () => {
    const bankada = Object.keys(articulation.WORD_BANK).map((l) => `/${l}/`).sort();
    expect([...PROBE_SOUNDS].sort()).toEqual(bankada);
    expect(PROBE_POSITIONS).toEqual(["initial", "medial", "final"]);
  });
});

describe("createRunSchema", () => {
  it("öğeler 1–20, cued varsayılan false, not ≤300", () => {
    const r = createRunSchema.parse({ items: [{ word: "resim", correct: true }], note: " iyi " });
    expect(r.items[0]).toEqual({ word: "resim", correct: true, cued: false });
    expect(r.note).toBe("iyi");
    expect(createRunSchema.safeParse({ items: [] }).success).toBe(false);
    const yirmiBir = Array.from({ length: 21 }, () => ({ word: "x", correct: true }));
    expect(createRunSchema.safeParse({ items: yirmiBir }).success).toBe(false);
    expect(createRunSchema.parse({ items: [{ word: "x", correct: true }], pct: 100 })).not.toHaveProperty("pct");
    expect(createRunSchema.safeParse({ items: [{ word: "x", correct: true }], note: "a".repeat(301) }).success).toBe(false);
  });
});
