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
        cacheKey: "sandal|v1|gpt-image-1-mini",
        wordNormalized: "sandal",
        model: "gpt-image-1-mini",
        styleVersion: "v1",
        publicUrl: "https://cdn.example/img.png",
      }),
    );
  });

  it("storage'a giden path cacheKey'den türetilir ve storage-güvenlidir (| ve boşluk yok)", async () => {
    const deps = mkDeps();
    await generateImage({ word: "el feneri", visualPrompt: "a flashlight" }, deps);

    const [pathArg] = (deps.storage.upload as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(pathArg).not.toContain("|");
    expect(pathArg).not.toContain(" ");
    expect(pathArg).toMatch(/\.png$/);
  });
});
