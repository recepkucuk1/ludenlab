// apps/hub/src/modules/studio/lib/probe/score.test.ts
import { describe, expect, it } from "vitest";
import { scoreItems } from "./score";

describe("scoreItems", () => {
  it("bağımsız doğru sayılır; ipuçlu doğru yüzdeye girmez ama cuedCount'a girer", () => {
    expect(
      scoreItems([
        { correct: true, cued: false },
        { correct: true, cued: true },
        { correct: false, cued: false },
        { correct: false, cued: true },
      ]),
    ).toEqual({ correct: 1, total: 4, pct: 25, cuedCount: 2 });
  });
  it("yüzde yuvarlanır (7/9 → 78)", () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ correct: i < 7, cued: false }));
    expect(scoreItems(items).pct).toBe(78);
  });
  it("boş liste → 0/0/0", () => {
    expect(scoreItems([])).toEqual({ correct: 0, total: 0, pct: 0, cuedCount: 0 });
  });
});
