import { describe, it, expect } from "vitest";
import { buildImagePrompt, STYLE_VERSION, imageStyleFor } from "./imagePrompt";

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

describe("imageStyleFor", () => {
  it("FLUX modeli için ayarlı şablon + fluxv3 sürümü döner", () => {
    const { buildPrompt, styleVersion } = imageStyleFor("fal-ai/flux/schnell");
    expect(styleVersion).toBe("fluxv3");
    const p = buildPrompt("a bar of soap");
    expect(p).toContain("a bar of soap");
    expect(p).toContain("no face"); // kawaii yüz engeli
    expect(p).toContain("fully colored"); // monokrom/line-art engeli
    expect(p).toContain("no text");
    expect(p).not.toContain("sticker"); // "sticker"/"vector" metin sızıntısı davet ediyordu
  });

  it("OpenAI modeli için v2 şablonu döner (değişmedi)", () => {
    const { buildPrompt, styleVersion } = imageStyleFor("gpt-image-1-mini");
    expect(styleVersion).toBe("v2");
    expect(buildPrompt("a cat")).toContain("children's educational flashcard");
  });

  it("bilinmeyen/diğer model OpenAI varsayılanına düşer", () => {
    expect(imageStyleFor("some-other-model").styleVersion).toBe("v2");
  });
});
