import { describe, it, expect } from "vitest";
import { buildImagePrompt, STYLE_VERSION } from "./imagePrompt";

describe("buildImagePrompt", () => {
  it("özneyi sabit çocuk-dostu stil şablonuna gömer", () => {
    const p = buildImagePrompt("a sandal (footwear)");
    expect(p).toContain("a sandal (footwear)");
    expect(p).toContain("single");
    expect(p).toContain("plain white background");
    expect(p).toContain("children's educational flashcard");
    expect(p).toContain("no text");
  });

  it("özneyi trim'ler", () => {
    expect(buildImagePrompt("  a cat  ")).toContain("single a cat,");
  });

  it("STYLE_VERSION v2", () => {
    expect(STYLE_VERSION).toBe("v2");
  });

  it("metin/harf/kelime/etiketi açıkça yasaklar", () => {
    const p = buildImagePrompt("a soap bar");
    expect(p).toContain("no text");
    expect(p).toContain("no letters");
    expect(p).toContain("no words");
    expect(p).toContain("no labels");
  });
});
