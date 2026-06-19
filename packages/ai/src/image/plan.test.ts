import { describe, it, expect } from "vitest";
import { planImageGeneration } from "./plan";

const items = [
  { word: "sandal", visualPrompt: "a sandal (footwear)" },          // 0: hedef
  { word: "top", visualPrompt: "a ball", imageUrl: "https://x/t.png" }, // 1: zaten var
  { word: "kuş" },                                                   // 2: visualPrompt yok → atla (no_visual)
  { visualPrompt: "no word here" },                                 // 3: word yok → atla (no_word)
];

describe("planImageGeneration", () => {
  it("index verilmezse yalnız visualPrompt'u olan item'ları hedefler", () => {
    const plan = planImageGeneration(items);
    expect(plan.targets).toEqual([
      { index: 0, word: "sandal", visualPrompt: "a sandal (footwear)" },
    ]);
    expect(plan.skipped).toEqual([
      { index: 1, reason: "already_has_image" },
      { index: 2, reason: "no_visual" },
      { index: 3, reason: "no_word" },
    ]);
  });

  it("boş visualPrompt'u atlar (Türkçe word'e düşmez)", () => {
    const withEmpty = [
      { word: "sandal", visualPrompt: "a sandal (footwear)" },
      { word: "vücut", visualPrompt: "" },
      { word: "kuş", visualPrompt: "a bird" },
    ];
    const plan = planImageGeneration(withEmpty);
    expect(plan.targets).toEqual([
      { index: 0, word: "sandal", visualPrompt: "a sandal (footwear)" },
      { index: 2, word: "kuş", visualPrompt: "a bird" },
    ]);
    expect(plan.skipped).toEqual([{ index: 1, reason: "no_visual" }]);
  });

  it("istenen index'lere daralır", () => {
    const plan = planImageGeneration(items, [0]);
    expect(plan.targets).toEqual([{ index: 0, word: "sandal", visualPrompt: "a sandal (footwear)" }]);
    expect(plan.skipped).toEqual([]);
  });

  it("var olmayan index'i atlar", () => {
    const plan = planImageGeneration(items, [99]);
    expect(plan.targets).toEqual([]);
    expect(plan.skipped).toEqual([{ index: 99, reason: "out_of_range" }]);
  });
});
