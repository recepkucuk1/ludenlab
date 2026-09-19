import { describe, it, expect, vi } from "vitest";
import { generateImage, lookupCachedImage } from "./generate";
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

  it("storage path ASCII-güvenlidir (Supabase 'Invalid key' önlenir)", async () => {
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

  it("storage path Türkçe harf İÇERMEZ ve çat≠şat çakışması olmaz (hash ayrımı)", async () => {
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

  it("kind='scene': sahne stil-sürümüyle AYRI cache anahtarı + sahne şablonu kullanır", async () => {
    const deps = mkDeps();
    await generateImage({ word: "morning routine", visualPrompt: "a child waking up", kind: "scene" }, deps);
    expect(deps.cache.save).toHaveBeenCalledWith(
      expect.objectContaining({ cacheKey: "morning routine|scene-v1|gpt-image-1-mini", styleVersion: "scene-v1" }),
    );
    expect(deps.provider.generate).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining("storybook") }),
    );
  });

  /**
   * Regresyon kilidi — "sahne görselinde public storage anahtarı PII/klinik metin gömüyor"
   * (2026-08 güvenlik denetimi #31). Eskiden object key = cacheKey'in ilk 80 karakterinin
   * slug'ıydı; sosyal-hikâyede `word` TAM SAHNE TANIMI olduğu için klinik cümleler
   * tahmin edilebilir bir PUBLIC URL'e yazılıyordu.
   */
  it("object key girdi metninden HİÇBİR parça taşımaz (opak hash)", async () => {
    const deps = mkDeps();
    const scene = "a young boy named Ayla standing in a kitchen speaking loudly to his mother";
    await generateImage({ word: scene, visualPrompt: scene, kind: "scene" }, deps);

    const [pathArg] = (deps.storage.upload as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(pathArg).toMatch(/^[0-9a-f]{32}\.png$/); // yalnız hash
    for (const token of ["boy", "ayla", "kitchen", "mother", "young", "standing"]) {
      expect(pathArg.toLowerCase()).not.toContain(token);
    }
  });

  it("JPEG dönen sağlayıcıda object key .jpg uzantısı alır (içerik türüyle tutarlı)", async () => {
    const deps = mkDeps({
      provider: {
        model: "gpt-image-1-mini",
        generate: vi.fn(async () => ({
          bytes: new Uint8Array([0xff, 0xd8, 0xff]),
          contentType: "image/jpeg",
          model: "gpt-image-1-mini",
        })),
      },
    });
    await generateImage({ word: "kedi", visualPrompt: "a cat" }, deps);

    const [pathArg, , contentType] = (deps.storage.upload as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(pathArg).toMatch(/^[0-9a-f]{32}\.jpg$/);
    expect(contentType).toBe("image/jpeg");
  });

  it("aynı girdi HEP aynı object key'i verir (tekrar üretim yinelenen nesne bırakmaz)", async () => {
    const a = mkDeps();
    const b = mkDeps();
    await generateImage({ word: "kedi", visualPrompt: "a cat" }, a);
    await generateImage({ word: "kedi", visualPrompt: "a cat" }, b);
    expect((a.storage.upload as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      (b.storage.upload as ReturnType<typeof vi.fn>).mock.calls[0][0],
    );
  });

  it("sahne prompt'u global cache tablosuna YAZILMAZ; kelime prompt'u yazılır", async () => {
    const sceneDeps = mkDeps();
    await generateImage(
      { word: "s", visualPrompt: "a child crying in a therapy room", kind: "scene" },
      sceneDeps,
    );
    const [sceneSaved] = (sceneDeps.cache.save as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(sceneSaved.prompt).not.toContain("therapy room");
    expect(sceneSaved.prompt).toContain("saklanmaz");

    // Kelime görselinde prompt operasyonel değeri için KORUNUR.
    const wordDeps = mkDeps();
    await generateImage({ word: "sandalye", visualPrompt: "a chair" }, wordDeps);
    const [wordSaved] = (wordDeps.cache.save as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(wordSaved.prompt).toContain("a chair");
  });
});

describe("lookupCachedImage", () => {
  it("cache HIT: kayıtlı URL'i döner (üretim/kayıt YOK)", async () => {
    const find = vi.fn(async () => ({ publicUrl: "https://cdn.example/cached.png" }));
    const url = await lookupCachedImage("kuş", {
      provider: { model: "fal-ai/flux/schnell" },
      cache: { find },
    });
    expect(url).toBe("https://cdn.example/cached.png");
    // FLUX sağlayıcı → fluxv3 stil anahtarı (generateImage ile AYNI anahtar)
    expect(find).toHaveBeenCalledWith("kuş|fluxv3|fal-ai/flux/schnell");
  });

  it("cache MISS: null döner", async () => {
    const url = await lookupCachedImage("kuş", {
      provider: { model: "fal-ai/flux/schnell" },
      cache: { find: vi.fn(async () => null) },
    });
    expect(url).toBeNull();
  });

  it("sağlayıcı-stil duyarlı anahtar kullanır (openai → v2)", async () => {
    const find = vi.fn(async () => null);
    await lookupCachedImage("Sandal", { provider: { model: "gpt-image-1-mini" }, cache: { find } });
    expect(find).toHaveBeenCalledWith("sandal|v2|gpt-image-1-mini");
  });

  it("kind='scene': sahne anahtarıyla arar (kelime cache'inden ayrı)", async () => {
    const find = vi.fn(async () => null);
    await lookupCachedImage("morning routine", { provider: { model: "gpt-image-1-mini" }, cache: { find } }, "scene");
    expect(find).toHaveBeenCalledWith("morning routine|scene-v1|gpt-image-1-mini");
  });
});
