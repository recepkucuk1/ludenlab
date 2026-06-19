# Görsel Üretim — Faz 1: Servis Çekirdeği — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `packages/ai` içinde sağlayıcı-bağımsız bir görsel-üretim çekirdeği kurmak — bir prompt verince görsel byte'ları döndüren provider'lar (OpenAI GPT Image Mini + Flux) ve test edilmiş saf yardımcılar (kelime normalize, cache anahtarı, prompt şablonu, sağlayıcı seçimi).

**Architecture:** Mevcut `packages/ai` deseni (`client.ts` singleton + barrel `index.ts`) izlenir. Yeni `src/image/` alt-modülü: saf fonksiyonlar (test edilir) + `ImageProvider` arayüzü + iki adapter (network, manuel doğrulanır). Storage/DB/cache bu fazda YOK — Faz 2'de gelir. Bu faz çıktısı: "prompt → `{ bytes, contentType, model }`".

**Tech Stack:** TypeScript (ESM), pnpm workspaces, turbo, vitest (bu fazda ilk kez kurulur), `openai` SDK, `@fal-ai/client`.

**Spec:** `docs/superpowers/specs/2026-06-19-artikulasyon-gorsel-uretim-design.md` (Bölüm 4.1–4.3).

**Doğrulama disiplini:** Saf mantık (normalize, cacheKey, imagePrompt, selectProvider) → vitest ile TDD. Network adapter'lar (OpenAI/Flux) → manuel doğrulama (typecheck + lint; gerçek çağrı Faz 2/5'te key'lerle).

---

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `packages/ai/vitest.config.ts` (yeni) | vitest yapılandırması |
| `packages/ai/src/image/normalize.ts` (yeni) | `normalizeWord()` — Türkçe normalize |
| `packages/ai/src/image/cacheKey.ts` (yeni) | `buildCacheKey()` — cache anahtarı |
| `packages/ai/src/image/imagePrompt.ts` (yeni) | `buildImagePrompt()` — sabit stil şablonu |
| `packages/ai/src/image/types.ts` (yeni) | `ImageProvider`, `ImageGenerateInput`, `ImageGenerateResult` |
| `packages/ai/src/image/providers/openai.ts` (yeni) | `OpenAIImageProvider` (gpt-image-1-mini) |
| `packages/ai/src/image/providers/flux.ts` (yeni) | `FluxProvider` (fal.ai flux/schnell) |
| `packages/ai/src/image/selectProvider.ts` (yeni) | `selectProvider()` — env'den provider |
| `packages/ai/src/image/index.ts` (yeni) | image modülü barrel export |
| `packages/ai/src/index.ts` (değişir) | image barrel'ı paket dışına aç |
| `packages/ai/package.json` (değişir) | deps + test script |
| `turbo.json` (değişir) | `test` task |
| `package.json` (değişir) | root `test` script |

`*.test.ts` dosyaları ilgili kaynak dosyanın yanında durur (`normalize.test.ts`, `cacheKey.test.ts`, `imagePrompt.test.ts`, `selectProvider.test.ts`).

---

## Task 1: vitest altyapısı

**Files:**
- Modify: `packages/ai/package.json`
- Create: `packages/ai/vitest.config.ts`
- Create: `packages/ai/src/image/__smoke.test.ts` (geçici; Task 9'da silinir)
- Modify: `turbo.json`
- Modify: `package.json` (root)

- [ ] **Step 1: vitest'i `@ludenlab/ai`'ye devDependency olarak ekle**

Run:
```bash
pnpm --filter @ludenlab/ai add -D vitest
```
Expected: `packages/ai/package.json` `devDependencies`'ine `vitest` eklenir, `pnpm-lock.yaml` güncellenir.

- [ ] **Step 2: `packages/ai/package.json`'a test script'leri ekle**

`scripts` bloğunu şu hale getir (mevcut `lint`/`typecheck` korunur):
```json
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 3: `packages/ai/vitest.config.ts` oluştur**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Geçici smoke test yaz**

`packages/ai/src/image/__smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("vitest altyapısı", () => {
  it("çalışıyor", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Smoke testi çalıştır**

Run:
```bash
pnpm --filter @ludenlab/ai test
```
Expected: PASS — 1 passed (`__smoke.test.ts`).

- [ ] **Step 6: `turbo.json`'a `test` task ekle**

`tasks` objesine (`typecheck`'ten sonra) ekle:
```json
    "test": {
      "dependsOn": ["^build"]
    },
```

- [ ] **Step 7: Root `package.json`'a `test` script ekle**

`scripts` bloğuna ekle:
```json
    "test": "turbo run test",
```

- [ ] **Step 8: Commit**

```bash
git add packages/ai/package.json packages/ai/vitest.config.ts packages/ai/src/image/__smoke.test.ts turbo.json package.json pnpm-lock.yaml
git commit -m "test(ai): vitest altyapısı + image modülü iskeleti"
```

---

## Task 2: `normalizeWord` (TDD)

Türkçe-duyarlı kelime normalizasyonu. Cache anahtarının temeli. Türkçe locale lowercase kritik: `"I".toLocaleLowerCase("tr")` → `"ı"`, `"İ"` → `"i"`.

**Files:**
- Create: `packages/ai/src/image/normalize.test.ts`
- Create: `packages/ai/src/image/normalize.ts`

- [ ] **Step 1: Başarısız testi yaz**

`packages/ai/src/image/normalize.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { normalizeWord } from "./normalize";

describe("normalizeWord", () => {
  it("küçük harfe çevirir ve trim'ler", () => {
    expect(normalizeWord("  Sandal  ")).toBe("sandal");
  });

  it("Türkçe İ/I'yı doğru indirger", () => {
    expect(normalizeWord("İĞNE")).toBe("iğne");
    expect(normalizeWord("ISPANAK")).toBe("ıspanak");
  });

  it("baş/son noktalama ve fazla boşluğu temizler", () => {
    expect(normalizeWord("şapka.")).toBe("şapka");
    expect(normalizeWord('"top"!')).toBe("top");
    expect(normalizeWord("el   feneri")).toBe("el feneri");
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run:
```bash
pnpm --filter @ludenlab/ai test normalize
```
Expected: FAIL — `Failed to resolve import "./normalize"` / `normalizeWord is not a function`.

- [ ] **Step 3: Minimal implementasyon**

`packages/ai/src/image/normalize.ts`:
```ts
/**
 * Görsel cache'i için kelimeyi tek biçime indirger.
 * Türkçe locale lowercase (İ→i, I→ı), trim, noktalama temizliği, tek boşluk.
 */
export function normalizeWord(word: string): string {
  return word
    .toLocaleLowerCase("tr-TR")
    .replace(/[.,;:!?"'()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run:
```bash
pnpm --filter @ludenlab/ai test normalize
```
Expected: PASS — 3 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/ai/src/image/normalize.ts packages/ai/src/image/normalize.test.ts
git commit -m "feat(ai/image): normalizeWord — Türkçe kelime normalize"
```

---

## Task 3: `buildCacheKey` (TDD)

Cache anahtarı: `normalize(word)|styleVersion|model`.

**Files:**
- Create: `packages/ai/src/image/cacheKey.test.ts`
- Create: `packages/ai/src/image/cacheKey.ts`

- [ ] **Step 1: Başarısız testi yaz**

`packages/ai/src/image/cacheKey.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildCacheKey } from "./cacheKey";

describe("buildCacheKey", () => {
  it("normalize edilmiş kelime + stil + model birleştirir", () => {
    expect(
      buildCacheKey({ word: "Sandal", styleVersion: "v1", model: "gpt-image-1-mini" }),
    ).toBe("sandal|v1|gpt-image-1-mini");
  });

  it("aynı kelimenin farklı yazımları aynı anahtara düşer", () => {
    const a = buildCacheKey({ word: "ŞAPKA.", styleVersion: "v1", model: "m" });
    const b = buildCacheKey({ word: " şapka ", styleVersion: "v1", model: "m" });
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run:
```bash
pnpm --filter @ludenlab/ai test cacheKey
```
Expected: FAIL — `Failed to resolve import "./cacheKey"`.

- [ ] **Step 3: Minimal implementasyon**

`packages/ai/src/image/cacheKey.ts`:
```ts
import { normalizeWord } from "./normalize";

export interface CacheKeyInput {
  word: string;
  styleVersion: string;
  model: string;
}

/** Global görsel cache anahtarı. Aynı kelime+stil+model → aynı anahtar. */
export function buildCacheKey(input: CacheKeyInput): string {
  return `${normalizeWord(input.word)}|${input.styleVersion}|${input.model}`;
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run:
```bash
pnpm --filter @ludenlab/ai test cacheKey
```
Expected: PASS — 2 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/ai/src/image/cacheKey.ts packages/ai/src/image/cacheKey.test.ts
git commit -m "feat(ai/image): buildCacheKey — global görsel cache anahtarı"
```

---

## Task 4: `buildImagePrompt` (TDD)

Sabit stil şablonu — tutarlılığın kaynağı. Claude'un ürettiği İngilizce `visualPrompt` (ör. `"a sandal (footwear)"`) bu şablona gömülür.

**Files:**
- Create: `packages/ai/src/image/imagePrompt.test.ts`
- Create: `packages/ai/src/image/imagePrompt.ts`

- [ ] **Step 1: Başarısız testi yaz**

`packages/ai/src/image/imagePrompt.test.ts`:
```ts
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

  it("STYLE_VERSION dışa açıktır (cache anahtarı için)", () => {
    expect(typeof STYLE_VERSION).toBe("string");
    expect(STYLE_VERSION.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run:
```bash
pnpm --filter @ludenlab/ai test imagePrompt
```
Expected: FAIL — `Failed to resolve import "./imagePrompt"`.

- [ ] **Step 3: Minimal implementasyon**

`packages/ai/src/image/imagePrompt.ts`:
```ts
/**
 * Stil şablonu sürümü. Şablon değişirse artır (eski görseller ayrı cache'lenir,
 * geçersiz kılınmaz). Cache anahtarına dahil edilir.
 */
export const STYLE_VERSION = "v1";

/**
 * Sabit çocuk-dostu illüstrasyon stili. `subject` = Claude'un kelime için
 * yazdığı İngilizce görsel tanımı (disambiguation içerir).
 */
export function buildImagePrompt(subject: string): string {
  const s = subject.trim();
  return (
    `Simple friendly flat illustration of a single ${s}, ` +
    `centered, plain white background, bright cheerful colors, ` +
    `clear recognizable shape, no text, children's educational flashcard style.`
  );
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run:
```bash
pnpm --filter @ludenlab/ai test imagePrompt
```
Expected: PASS — 3 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/ai/src/image/imagePrompt.ts packages/ai/src/image/imagePrompt.test.ts
git commit -m "feat(ai/image): buildImagePrompt + STYLE_VERSION — sabit stil şablonu"
```

---

## Task 5: `ImageProvider` arayüzü ve tipleri

Saf tip tanımı (test yok — tip katmanı; typecheck doğrular).

**Files:**
- Create: `packages/ai/src/image/types.ts`

- [ ] **Step 1: Tip dosyasını oluştur**

`packages/ai/src/image/types.ts`:
```ts
/** Görsel üretim girdisi. */
export interface ImageGenerateInput {
  /** Modele giden nihai prompt (buildImagePrompt çıktısı). */
  prompt: string;
  /** Kare boyut; varsayılan "1024x1024". */
  size?: string;
}

/** Üretilen ham görsel. */
export interface ImageGenerateResult {
  bytes: Uint8Array;
  /** MIME tipi, ör. "image/png". */
  contentType: string;
  /** Üreten model kimliği. */
  model: string;
}

/** Sağlayıcı-bağımsız görsel üretici. Adapter'lar bunu uygular. */
export interface ImageProvider {
  /** Model kimliği (ör. "gpt-image-1-mini"). */
  readonly model: string;
  generate(input: ImageGenerateInput): Promise<ImageGenerateResult>;
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
pnpm --filter @ludenlab/ai typecheck
```
Expected: PASS — hata yok.

- [ ] **Step 3: Commit**

```bash
git add packages/ai/src/image/types.ts
git commit -m "feat(ai/image): ImageProvider arayüzü ve tipleri"
```

---

## Task 6: `OpenAIImageProvider` (manuel doğrulama)

gpt-image-1-mini adapter'ı. Network — gerçek çağrı Faz 2/5'te. Bu task'ta typecheck + lint doğrular.

**Files:**
- Modify: `packages/ai/package.json` (openai dep)
- Create: `packages/ai/src/image/providers/openai.ts`

- [ ] **Step 1: `openai` SDK'yı ve Node tiplerini ekle**

`generate()` Node'un `Buffer` global'ini kullanıyor; tipin tanınması için `@types/node` garanti edilir (zaten transitively varsa no-op, zararsız).

Run:
```bash
pnpm --filter @ludenlab/ai add openai
pnpm --filter @ludenlab/ai add -D @types/node
```
Expected: `dependencies`'e `openai`, `devDependencies`'e `@types/node` eklenir.

- [ ] **Step 2: Adapter'ı yaz**

`packages/ai/src/image/providers/openai.ts`:
```ts
import OpenAI from "openai";
import type { ImageProvider, ImageGenerateInput, ImageGenerateResult } from "../types";

/**
 * OpenAI GPT Image 1 Mini adapter. gpt-image-1 ailesi yanıtı b64_json döner.
 * `quality: "low"` maliyet-bilinçli varsayılan (POC'ta ayarlanabilir).
 */
export class OpenAIImageProvider implements ImageProvider {
  readonly model = "gpt-image-1-mini";
  private client: OpenAI;

  constructor(apiKey: string | undefined = process.env.OPENAI_API_KEY) {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY tanımlı değil — OpenAIImageProvider başlatılamıyor.");
    }
    this.client = new OpenAI({ apiKey });
  }

  async generate(input: ImageGenerateInput): Promise<ImageGenerateResult> {
    const res = await this.client.images.generate({
      model: this.model,
      prompt: input.prompt,
      size: (input.size ?? "1024x1024") as "1024x1024",
      quality: "low",
    });

    const b64 = res.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("OpenAI görsel döndürmedi (b64_json boş).");
    }

    return {
      bytes: new Uint8Array(Buffer.from(b64, "base64")),
      contentType: "image/png",
      model: this.model,
    };
  }
}
```

- [ ] **Step 3: Typecheck + lint**

Run:
```bash
pnpm --filter @ludenlab/ai typecheck && pnpm --filter @ludenlab/ai lint
```
Expected: PASS — hata yok. (Tip uyuşmazlığı çıkarsa OpenAI SDK'nın `images.generate` imzasına göre `size`/`quality` literal tiplerini düzelt.)

- [ ] **Step 4: Commit**

```bash
git add packages/ai/package.json packages/ai/src/image/providers/openai.ts pnpm-lock.yaml
git commit -m "feat(ai/image): OpenAIImageProvider (gpt-image-1-mini)"
```

---

## Task 7: `FluxProvider` (manuel doğrulama)

fal.ai flux/schnell adapter'ı (POC alternatifi). Network — typecheck + lint doğrular.

**Files:**
- Modify: `packages/ai/package.json` (@fal-ai/client dep)
- Create: `packages/ai/src/image/providers/flux.ts`

- [ ] **Step 1: `@fal-ai/client`'ı ekle**

Run:
```bash
pnpm --filter @ludenlab/ai add @fal-ai/client
```
Expected: `dependencies`'e `@fal-ai/client` eklenir.

- [ ] **Step 2: Adapter'ı yaz**

`packages/ai/src/image/providers/flux.ts`:
```ts
import { fal } from "@fal-ai/client";
import type { ImageProvider, ImageGenerateInput, ImageGenerateResult } from "../types";

/**
 * fal.ai Flux schnell adapter (POC alternatifi). Sonuç bir görsel URL'i döner;
 * byte'lara çevirmek için fetch edilir.
 */
export class FluxProvider implements ImageProvider {
  readonly model = "fal-ai/flux/schnell";

  constructor(apiKey: string | undefined = process.env.FAL_KEY) {
    if (!apiKey) {
      throw new Error("FAL_KEY tanımlı değil — FluxProvider başlatılamıyor.");
    }
    fal.config({ credentials: apiKey });
  }

  async generate(input: ImageGenerateInput): Promise<ImageGenerateResult> {
    const result = await fal.subscribe(this.model, {
      input: { prompt: input.prompt, image_size: "square_hd", num_images: 1 },
    });

    const url = (result.data as { images?: { url?: string }[] })?.images?.[0]?.url;
    if (!url) {
      throw new Error("Flux görsel döndürmedi (url boş).");
    }

    const resp = await fetch(url);
    const bytes = new Uint8Array(await resp.arrayBuffer());
    return { bytes, contentType: "image/png", model: this.model };
  }
}
```

- [ ] **Step 3: Typecheck + lint**

Run:
```bash
pnpm --filter @ludenlab/ai typecheck && pnpm --filter @ludenlab/ai lint
```
Expected: PASS — hata yok. (`@fal-ai/client` API imzası farklıysa `fal.subscribe` çağrısını paketin güncel imzasına göre düzelt; dönüş tipi cast'i `result.data` şekline göre ayarla.)

- [ ] **Step 4: Commit**

```bash
git add packages/ai/package.json packages/ai/src/image/providers/flux.ts pnpm-lock.yaml
git commit -m "feat(ai/image): FluxProvider (fal.ai flux/schnell)"
```

---

## Task 8: `selectProvider` (TDD)

Env'deki `IMAGE_PROVIDER`'a göre adapter seçer. Constructor'lar network yapmaz (sadece client kurar) → instance üretimi test edilebilir.

**Files:**
- Create: `packages/ai/src/image/selectProvider.test.ts`
- Create: `packages/ai/src/image/selectProvider.ts`

- [ ] **Step 1: Başarısız testi yaz**

`packages/ai/src/image/selectProvider.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { selectProvider } from "./selectProvider";

describe("selectProvider", () => {
  it("varsayılan olarak OpenAI seçer", () => {
    const p = selectProvider({ OPENAI_API_KEY: "test-key" });
    expect(p.model).toBe("gpt-image-1-mini");
  });

  it("IMAGE_PROVIDER=flux için Flux seçer", () => {
    const p = selectProvider({ IMAGE_PROVIDER: "flux", FAL_KEY: "test-key" });
    expect(p.model).toBe("fal-ai/flux/schnell");
  });

  it("bilinmeyen provider için hata fırlatır", () => {
    expect(() => selectProvider({ IMAGE_PROVIDER: "midjourney" })).toThrow(/IMAGE_PROVIDER/);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run:
```bash
pnpm --filter @ludenlab/ai test selectProvider
```
Expected: FAIL — `Failed to resolve import "./selectProvider"`.

- [ ] **Step 3: Minimal implementasyon**

`packages/ai/src/image/selectProvider.ts`:
```ts
import type { ImageProvider } from "./types";
import { OpenAIImageProvider } from "./providers/openai";
import { FluxProvider } from "./providers/flux";

type Env = Record<string, string | undefined>;

/** `IMAGE_PROVIDER` env'ine göre görsel sağlayıcısını döndürür (varsayılan: openai). */
export function selectProvider(env: Env = process.env): ImageProvider {
  const provider = env.IMAGE_PROVIDER ?? "openai";
  switch (provider) {
    case "openai":
      return new OpenAIImageProvider(env.OPENAI_API_KEY);
    case "flux":
      return new FluxProvider(env.FAL_KEY);
    default:
      throw new Error(`Bilinmeyen IMAGE_PROVIDER: "${provider}" (openai | flux bekleniyor).`);
  }
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run:
```bash
pnpm --filter @ludenlab/ai test selectProvider
```
Expected: PASS — 3 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/ai/src/image/selectProvider.ts packages/ai/src/image/selectProvider.test.ts
git commit -m "feat(ai/image): selectProvider — env'den sağlayıcı seçimi"
```

---

## Task 9: Barrel export + temizlik + bütünsel doğrulama

**Files:**
- Create: `packages/ai/src/image/index.ts`
- Modify: `packages/ai/src/index.ts`
- Delete: `packages/ai/src/image/__smoke.test.ts`

- [ ] **Step 1: image modülü barrel'ını oluştur**

`packages/ai/src/image/index.ts`:
```ts
export { normalizeWord } from "./normalize";
export { buildCacheKey } from "./cacheKey";
export type { CacheKeyInput } from "./cacheKey";
export { buildImagePrompt, STYLE_VERSION } from "./imagePrompt";
export { selectProvider } from "./selectProvider";
export { OpenAIImageProvider } from "./providers/openai";
export { FluxProvider } from "./providers/flux";
export type { ImageProvider, ImageGenerateInput, ImageGenerateResult } from "./types";
```

- [ ] **Step 2: Paket barrel'ından image modülünü dışa aç**

`packages/ai/src/index.ts` sonuna ekle:
```ts
export * as image from "./image";
```

- [ ] **Step 3: Geçici smoke testi sil**

Run:
```bash
git rm packages/ai/src/image/__smoke.test.ts
```

- [ ] **Step 4: Tüm doğrulamalar**

Run:
```bash
pnpm --filter @ludenlab/ai test && pnpm --filter @ludenlab/ai typecheck && pnpm --filter @ludenlab/ai lint
```
Expected: PASS — tüm testler geçer (normalize, cacheKey, imagePrompt, selectProvider), typecheck temiz, lint temiz.

- [ ] **Step 5: Commit**

```bash
git add packages/ai/src/image/index.ts packages/ai/src/index.ts
git commit -m "feat(ai/image): barrel export + smoke temizliği"
```

---

## Faz 1 tamamlanma kriteri

- `import { image } from "@ludenlab/ai"` ile `image.selectProvider()`, `image.normalizeWord()`, `image.buildCacheKey()`, `image.buildImagePrompt()`, `image.STYLE_VERSION` erişilebilir.
- Saf mantık testlerle güvencede; provider'lar typecheck/lint'ten geçti (gerçek çağrı Faz 2/5).
- Storage/DB/cache YOK — Faz 2'nin girdisi bu çekirdek.

## Faz 1 sonrası açık not (Faz 2'ye taşınır)

- OpenAI/Flux gerçek çağrı testi env key'leriyle Faz 2'de yapılır.
- `images.generate` / `fal.subscribe` imzaları SDK sürümüne göre değişebilir; adapter'larda işaretli düzeltme noktaları var.
