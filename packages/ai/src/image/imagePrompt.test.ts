import { describe, it, expect } from "vitest";
import {
  buildImagePrompt,
  STYLE_VERSION,
  imageStyleFor,
  buildSceneImagePrompt,
} from "./imagePrompt";

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

describe("sahne stili (sosyal hikaye)", () => {
  it("scene şablonu sahneyi anlatır, metni yasaklar, AMA tek-nesne/yüz kısıtı KOYMAZ", () => {
    const p = buildSceneImagePrompt("a child brushing teeth at a sink");
    expect(p).toContain("a child brushing teeth at a sink");
    expect(p).toContain("storybook");
    expect(p).toContain("no text");
    expect(p).not.toContain("single "); // tek-nesne flashcard kuralı sahnede olmamalı
    expect(p).not.toContain("no face"); // sosyal hikaye insan/yüz içerir
  });

  it("imageStyleFor(openai, 'scene') → scene-v1 + sahne şablonu", () => {
    const { buildPrompt, styleVersion } = imageStyleFor("gpt-image-1-mini", "scene");
    expect(styleVersion).toBe("scene-v1");
    expect(buildPrompt("two kids sharing toys")).toContain("storybook");
  });

  it("imageStyleFor(flux, 'scene') → flux-scene-v1; kelime stilinden AYRI cache", () => {
    const scene = imageStyleFor("fal-ai/flux/schnell", "scene");
    const word = imageStyleFor("fal-ai/flux/schnell", "word");
    expect(scene.styleVersion).toBe("flux-scene-v1");
    expect(word.styleVersion).toBe("fluxv3");
    expect(scene.styleVersion).not.toBe(word.styleVersion);
  });

  it("kind varsayılanı 'word' (geriye-uyum)", () => {
    expect(imageStyleFor("gpt-image-1-mini").styleVersion).toBe("v2");
  });
});
