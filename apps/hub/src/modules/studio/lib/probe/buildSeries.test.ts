// apps/hub/src/modules/studio/lib/probe/buildSeries.test.ts
import { describe, expect, it, vi } from "vitest";
import { articulation } from "@ludenlab/ai";
import { BankaYetersizError, buildSeriesWords } from "./buildSeries";

/* Bankadan deterministik seçim (enjekte rng) + önbellek görsel (taklit). Banka gerçek. */
const sabitRng = () => 0; // Fisher–Yates'te j=0 → sıra deterministik
const lookup = vi.fn(async (w: string) => (w.length % 2 === 0 ? `https://img/${w}.jpg` : null));

describe("buildSeriesWords", () => {
  it("istenen adette kelime, her birinde word/syllableBreak/imageUrl; görsel null olabilir", async () => {
    const words = await buildSeriesWords("/r/", "initial", 10, { lookupImage: lookup, rng: sabitRng });
    expect(words).toHaveLength(10);
    for (const w of words) {
      expect(w.word).toBeTruthy();
      expect(w.syllableBreak).toContain(w.word.slice(0, 1));
      expect(w.imageUrl === null || w.imageUrl.startsWith("https://")).toBe(true);
    }
    expect(new Set(words.map((w) => w.word)).size).toBe(10);
    expect(lookup).toHaveBeenCalledTimes(10);
  });
  it("aynı rng ile aynı set (sabit set sözleşmesi)", async () => {
    const a = await buildSeriesWords("/s/", "final", 8, { lookupImage: lookup, rng: sabitRng });
    const b = await buildSeriesWords("/s/", "final", 8, { lookupImage: lookup, rng: sabitRng });
    expect(a.map((w) => w.word)).toEqual(b.map((w) => w.word));
  });
  it("bankada count'tan az ama ≥3 kelime varsa olan kadar döner", async () => {
    const letter = Object.keys(articulation.WORD_BANK).find((l) => {
      const n = articulation.WORD_BANK[l]!.initial.length;
      return n >= 3 && n < 20;
    })!;
    const n = articulation.WORD_BANK[letter]!.initial.length;
    const words = await buildSeriesWords(`/${letter}/`, "initial", 20, { lookupImage: lookup, rng: sabitRng });
    expect(words).toHaveLength(n);
  });
  it("bankada 3'ten az kelime → BankaYetersizError (başta /ğ/ hiç yok)", async () => {
    await expect(buildSeriesWords("/ğ/", "initial", 10, { lookupImage: lookup, rng: sabitRng })).rejects.toBeInstanceOf(BankaYetersizError);
  });
  it("görsel araması patlarsa o kelime null kalır, set yine döner", async () => {
    const kirik = vi.fn(async () => { throw new Error("storage"); });
    const words = await buildSeriesWords("/k/", "initial", 5, { lookupImage: kirik, rng: sabitRng });
    expect(words).toHaveLength(5);
    expect(words.every((w) => w.imageUrl === null)).toBe(true);
  });
});
