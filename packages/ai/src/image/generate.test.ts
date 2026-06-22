import { describe, it, expect, vi } from "vitest";
import { generateImage } from "./generate";
import type { GenerateImageDeps } from "./generate";

function mkDeps(over: Partial<GenerateImageDeps> = {}): GenerateImageDeps {
  return {
    provider: {
      model: "gpt-image-1-mini",
      generate: vi.fn(async () => ({
        bytes: new Uint8Array([1, 2, 3]),
        contentType: "image/png",
        model: "gpt-image-1-mini",
      })),
    },
    cache: {
      find: vi.fn(async () => null),
      save: vi.fn(async () => {}),
    },
    storage: {
      upload: vi.fn(async () => "https://cdn.example/img.png"),
    },
    ...over,
  };
}

describe("generateImage", () => {
  it("cache HIT: üretim yapmaz, kayıtlı URL'i döner", async () => {
    const deps = mkDeps({
      cache: { find: vi.fn(async () => ({ publicUrl: "https://cdn.example/cached.png" })), save: vi.fn(async () => {}) },
    });
    const out = await generateImage({ word: "sandal", visualPrompt: "a sandal (footwear)" }, deps);

    expect(out).toEqual({ publicUrl: "https://cdn.example/cached.png", cacheHit: true });
    expect(deps.provider.generate).not.toHaveBeenCalled();
    expect(deps.storage.upload).not.toHaveBeenCalled();
    expect(deps.cache.save).not.toHaveBeenCalled();
  });

  it("cache MISS: üretir, yükler, kaydeder, yeni URL'i döner", async () => {
    const deps = mkDeps();
    const out = await generateImage({ word: "Sandal", visualPrompt: "a sandal (footwear)" }, deps);

    expect(out).toEqual({ publicUrl: "https://cdn.example/img.png", cacheHit: false });

    expect(deps.provider.generate).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining("a sandal (footwear)") }),
    );

    expect(deps.cache.save).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheKey: "sandal|v2|gpt-image-1-mini",
        wordNormalized: "sandal",
        model: "gpt-image-1-mini",
        styleVersion: "v2",
        publicUrl: "https://cdn.example/img.png",
      }),
    );
  });

  it("storage path ASCII-güvenlidir (| / \\ boşluk + Türkçe/özel karakter yok → Supabase 'Invalid key' önlenir)", async () => {
    const deps = mkDeps();
    await generateImage({ word: "km/h ölçer", visualPrompt: "a speedometer" }, deps);

    const [pathArg] = (deps.storage.upload as ReturnType<typeof vi.fn>).mock.calls[0];
    // Supabase storage object key'i ASCII olmalı — Türkçe/boşluk/ayraç "Invalid key" verir.
    expect(pathArg).toMatch(/^[a-z0-9._-]+$/);
    expect(pathArg).toMatch(/\.png$/);

    // storagePath cache.save'e de geçer (orchestrator→cache sözleşmesi)
    expect(deps.cache.save).toHaveBeenCalledWith(
      expect.objectContaining({ storagePath: pathArg }),
    );
  });

  it("storage path Türkçe harf İÇERMEZ ve çat≠şat çakışması olmaz", async () => {
    const depsA = mkDeps();
    await generateImage({ word: "çat", visualPrompt: "x" }, depsA);
    const [pathA] = (depsA.storage.upload as ReturnType<typeof vi.fn>).mock.calls[0];

    const depsB = mkDeps();
    await generateImage({ word: "şat", visualPrompt: "x" }, depsB);
    const [pathB] = (depsB.storage.upload as ReturnType<typeof vi.fn>).mock.calls[0];

    expect(pathA).not.toBe(pathB); // çat ≠ şat → farklı path (hash ayrımı)
    expect(pathA).not.toMatch(/[çğışüöâîû]/); // Türkçe harf YOK (Supabase reddeder)
    expect(pathB).not.toMatch(/[çğışüöâîû]/);
  });
});
