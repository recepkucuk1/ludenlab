# Görsel Üretim — Faz 2: Kalıcılık & Cache — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Kelime + İngilizce görsel-tanımı → kalıcı, global cache'li görsel URL'i" akışını kurmak: Faz 1 çekirdeğinin üstüne bağımlılık-enjekteli bir `generateImage` orchestrator'ı (packages/ai), bir `GeneratedImage` Prisma modeli + idempotent SQL (billing şeması), Supabase Storage bucket + upload helper, ve bunları birbirine bağlayan app-tarafı concrete'ler.

**Architecture:** Orchestration mantığı `packages/ai/src/image/generate.ts` içinde SAF tutulur — `ImageCacheStore` ve `ImageStorage` *arayüzlerini* enjekte alır, hiçbir DB/storage SDK'sına bağlı değildir → mock'larla TDD edilebilir. `apps/hub` bu arayüzleri concrete uygular: `PrismaImageCache` (billing."GeneratedImage") ve `SupabaseToolImageStorage` (tool-images bucket), artı ikisini orchestrator'a bağlayan `generateWordImage` sarmalayıcısı. DB migration mevcut repo desenini izler (raw idempotent SQL `prisma/sql/`, `prisma migrate` YOK). Tablo + bucket Supabase MCP ile uygulanır.

**Tech Stack:** TypeScript ESM, Prisma 7 (driver-adapter, generator `prisma-client`), `@supabase/supabase-js` (yeni), vitest, Supabase Storage. Cache global, anahtar = `buildCacheKey` (Faz 1).

**Spec:** `docs/superpowers/specs/2026-06-19-artikulasyon-gorsel-uretim-design.md` (Bölüm 4.1, 4.3, 5). Faz 1 planı: `docs/superpowers/plans/2026-06-19-gorsel-uretim-faz1-servis-cekirdegi.md`.

**Doğrulama disiplini:** Orchestrator (saf, DI) → vitest TDD. Prisma model + SQL + Supabase storage + concrete binding → manuel doğrulama (typecheck + gerçek MCP uygulaması + okuma). Gerçek uçtan-uca görsel üretim (API key'li) Faz 3/5'te.

**Ön koşul (kullanıcı/operatör sağlar):** Çalışma zamanı için `.env`'e `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` (ve opsiyonel `FAL_KEY`). Servis-rol anahtarı gizlidir; plan onu `.env.example`'a yalnızca yer-tutucu olarak ekler.

---

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `packages/ai/src/image/generate.ts` (yeni) | `generateImage(input, deps)` orchestrator + `ImageCacheStore`/`ImageStorage` arayüzleri |
| `packages/ai/src/image/generate.test.ts` (yeni) | orchestrator TDD (mock deps; cache-hit/miss) |
| `packages/ai/src/image/index.ts` (değişir) | generate + arayüzleri dışa aç |
| `apps/hub/prisma/studio/schema.prisma` (değişir) | `GeneratedImage` modeli |
| `apps/hub/prisma/sql/0006_generated_images.sql` (yeni) | idempotent billing tablosu |
| `apps/hub/src/lib/storage/toolImages.ts` (yeni) | `SupabaseToolImageStorage` (supabase-js upload + public URL) |
| `apps/hub/src/modules/studio/lib/imageCache.ts` (yeni) | `PrismaImageCache` (billing."GeneratedImage" CRUD) |
| `apps/hub/src/modules/studio/lib/generateWordImage.ts` (yeni) | concrete'leri orchestrator'a bağlayan sarmalayıcı |
| `apps/hub/package.json` (değişir) | `@supabase/supabase-js` dep |
| `apps/hub/.env.example` (değişir) | storage + image env yer-tutucuları |

---

## Task 1: `generateImage` orchestrator (packages/ai, TDD)

Saf, bağımlılık-enjekteli. Faz 1'in saf parçalarını (`buildCacheKey`, `buildImagePrompt`, `STYLE_VERSION`, `normalizeWord`) kullanır; DB/storage'ı arayüz olarak alır.

**Files:**
- Create: `packages/ai/src/image/generate.test.ts`
- Create: `packages/ai/src/image/generate.ts`

- [ ] **Step 1: Başarısız testi yaz**

`packages/ai/src/image/generate.test.ts`:
```ts
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

    // prompt sabit stil şablonundan geçer
    expect(deps.provider.generate).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining("a sandal (footwear)") }),
    );

    // kayıt normalize edilmiş kelime + provider.model + cacheKey içerir
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
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run:
```bash
pnpm --filter @ludenlab/ai test generate
```
Expected: FAIL — `Failed to resolve import "./generate"`.

- [ ] **Step 3: Minimal implementasyon**

`packages/ai/src/image/generate.ts`:
```ts
import type { ImageProvider } from "./types";
import { buildCacheKey } from "./cacheKey";
import { buildImagePrompt, STYLE_VERSION } from "./imagePrompt";
import { normalizeWord } from "./normalize";

/** Cache'te bulunan görsel (yalnız tüketicinin ihtiyacı olan alan). */
export interface CachedImage {
  publicUrl: string;
}

/** Görsel cache deposu (app concrete uygular; ör. Prisma). */
export interface ImageCacheStore {
  find(cacheKey: string): Promise<CachedImage | null>;
  save(record: {
    cacheKey: string;
    wordNormalized: string;
    styleVersion: string;
    model: string;
    prompt: string;
    storagePath: string;
    publicUrl: string;
  }): Promise<void>;
}

/** Görsel deposu (app concrete uygular; ör. Supabase Storage). upload → public URL. */
export interface ImageStorage {
  upload(path: string, bytes: Uint8Array, contentType: string): Promise<string>;
}

export interface GenerateImageDeps {
  provider: ImageProvider;
  cache: ImageCacheStore;
  storage: ImageStorage;
}

export interface GenerateImageInput {
  /** Hedef kelime (cache anahtarı bundan türer). */
  word: string;
  /** Claude'un ürettiği İngilizce görsel tanımı (disambiguation). */
  visualPrompt: string;
}

export interface GenerateImageOutput {
  publicUrl: string;
  cacheHit: boolean;
}

/** cacheKey → storage-güvenli dosya yolu (| ve boşluk yerine güvenli karakter). */
function storagePathFor(cacheKey: string): string {
  return `${cacheKey.replace(/\|/g, "_").replace(/\s+/g, "-")}.png`;
}

/**
 * Kelimeyi kalıcı, global-cache'li bir görsel URL'ine çevirir.
 * Saf orchestration: provider/cache/storage enjekte edilir (test edilebilir).
 */
export async function generateImage(
  input: GenerateImageInput,
  deps: GenerateImageDeps,
): Promise<GenerateImageOutput> {
  const { provider, cache, storage } = deps;
  const cacheKey = buildCacheKey({
    word: input.word,
    styleVersion: STYLE_VERSION,
    model: provider.model,
  });

  const hit = await cache.find(cacheKey);
  if (hit) {
    return { publicUrl: hit.publicUrl, cacheHit: true };
  }

  const prompt = buildImagePrompt(input.visualPrompt);
  const { bytes, contentType } = await provider.generate({ prompt });

  const storagePath = storagePathFor(cacheKey);
  const publicUrl = await storage.upload(storagePath, bytes, contentType);

  await cache.save({
    cacheKey,
    wordNormalized: normalizeWord(input.word),
    styleVersion: STYLE_VERSION,
    model: provider.model,
    prompt,
    storagePath,
    publicUrl,
  });

  return { publicUrl, cacheHit: false };
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run:
```bash
pnpm --filter @ludenlab/ai test generate
```
Expected: PASS — 3 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/ai/src/image/generate.ts packages/ai/src/image/generate.test.ts
git commit -m "feat(ai/image): generateImage orchestrator (DI, cache-hit/miss) + test"
```

## Task 1 bağlamı

- Çalışma dizini: `/Users/recepkucuk/ludenlab/.claude/worktrees/amazing-cartwright-cc4d66` (worktree, branch `claude/amazing-cartwright-cc4d66`, NOT main).
- `packages/ai/src/image/` Faz 1'den şunları içerir: `normalize.ts` (`normalizeWord`), `cacheKey.ts` (`buildCacheKey`), `imagePrompt.ts` (`buildImagePrompt`, `STYLE_VERSION`), `types.ts` (`ImageProvider`). Bunları import et, yeniden yazma.
- vitest kurulu; `vi` mock'ları `import { vi } from "vitest"`.

---

## Task 2: image barrel'ına `generate` ekle + paket kökünden düz tip export

**Files:**
- Modify: `packages/ai/src/image/index.ts`
- Modify: `packages/ai/src/index.ts`

- [ ] **Step 1: image barrel'ına ekle**

`packages/ai/src/image/index.ts` sonuna ekle (mevcut export'lar korunur):
```ts
export { generateImage } from "./generate";
export type {
  GenerateImageInput,
  GenerateImageOutput,
  GenerateImageDeps,
  ImageCacheStore,
  ImageStorage,
  CachedImage,
} from "./generate";
```

- [ ] **Step 2: Paket kökünden image tiplerini DÜZ export et**

Faz 1'de `packages/ai/src/index.ts` yalnız `export * as image from "./image"` (namespace) içeriyor — bu, değerler (`image.generateImage()`) için yeterli ama app concrete'leri `import type { ImageStorage } from "@ludenlab/ai"` ile tipleri TOP-LEVEL bekliyor. Tipleri kökten de düz export et. `packages/ai/src/index.ts` sonuna ekle (mevcut `export * as image` korunur):
```ts
export type {
  ImageProvider,
  ImageGenerateInput,
  ImageGenerateResult,
  ImageCacheStore,
  ImageStorage,
  CachedImage,
  GenerateImageInput,
  GenerateImageOutput,
  GenerateImageDeps,
} from "./image";
```

- [ ] **Step 3: Doğrula + commit**

Run:
```bash
pnpm --filter @ludenlab/ai test && pnpm --filter @ludenlab/ai typecheck
```
Expected: PASS — tüm testler geçer, typecheck temiz.

```bash
git add packages/ai/src/image/index.ts packages/ai/src/index.ts
git commit -m "feat(ai/image): generateImage barrel + paket kökünden düz tip export"
```

---

## Task 3: `GeneratedImage` Prisma modeli + generate

**Files:**
- Modify: `apps/hub/prisma/studio/schema.prisma`

- [ ] **Step 1: Modeli ekle**

`apps/hub/prisma/studio/schema.prisma` dosyasının sonuna (son model `WebhookDelivery`'den sonra) ekle:
```prisma
/// Global görsel üretim cache'i — kelime→üretilmiş görsel. PII içermez
/// (yalnız normalize kelime + prompt + storage URL). cacheKey = `kelime|stil|model`.
model GeneratedImage {
  id             String   @id @default(cuid())
  cacheKey       String   @unique
  wordNormalized String
  styleVersion   String
  model          String
  prompt         String   @db.Text
  storagePath    String
  publicUrl      String
  createdAt      DateTime @default(now())

  @@index([wordNormalized])
}
```

- [ ] **Step 2: Prisma client'ı yeniden üret**

Run:
```bash
cd /Users/recepkucuk/ludenlab/.claude/worktrees/amazing-cartwright-cc4d66/apps/hub && node_modules/.bin/prisma generate --schema prisma/studio/schema.prisma
```
Expected: `src/generated/studio` yeniden üretilir; çıktıda `GeneratedImage` modeli olur. (Eğer `node_modules/.bin/prisma` worktree'de yoksa: `cd /Users/recepkucuk/ludenlab/apps/hub && pnpm prisma generate --schema prisma/studio/schema.prisma` gerçek kökten.)

- [ ] **Step 3: typecheck (generate edilen client erişilebilir mi)**

Run:
```bash
cd /Users/recepkucuk/ludenlab/.claude/worktrees/amazing-cartwright-cc4d66/apps/hub && node_modules/.bin/tsc --noEmit
```
Expected: PASS (yeni model tipleri çözülür). Worktree typecheck çalışmazsa gerçek kökten dene.

- [ ] **Step 4: Commit**

```bash
git add apps/hub/prisma/studio/schema.prisma apps/hub/src/generated/studio
git commit -m "feat(studio/db): GeneratedImage modeli (görsel cache)"
```
(Not: `src/generated/studio` repoda izleniyorsa commit'le; `.gitignore`'daysa yalnız schema.prisma'yı commit'le — `git status` ile kontrol et.)

---

## Task 4: idempotent SQL migration dosyası

Mevcut `prisma/sql/000X` desenini birebir izler (idempotent, additive, billing şeması, başlıkta hedef DB).

**Files:**
- Create: `apps/hub/prisma/sql/0006_generated_images.sql`

- [ ] **Step 1: SQL dosyasını yaz**

`apps/hub/prisma/sql/0006_generated_images.sql`:
```sql
-- 0006_generated_images.sql
-- HEDEF DB: billing şeması (HUB_DATABASE_URL — Studio Supabase, proje kgbhvruzoaqwwwkhzdex).
-- Görsel üretim cache'i: kelime → üretilmiş görsel (GLOBAL, PII YOK). prisma/schema.prisma
-- GeneratedImage modeliyle BİREBİR. prisma migrate / db push YOK — pg/MCP ile uygulanır (bkz. 0001).
-- ADDITIVE + IDEMPOTENT (CREATE ... IF NOT EXISTS). public şemaya DOKUNMAZ.

CREATE TABLE IF NOT EXISTS billing."GeneratedImage" (
  "id"             TEXT PRIMARY KEY,
  "cacheKey"       TEXT NOT NULL,
  "wordNormalized" TEXT NOT NULL,
  "styleVersion"   TEXT NOT NULL,
  "model"          TEXT NOT NULL,
  "prompt"         TEXT NOT NULL,
  "storagePath"    TEXT NOT NULL,
  "publicUrl"      TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "GeneratedImage_cacheKey_key"
  ON billing."GeneratedImage" ("cacheKey");

CREATE INDEX IF NOT EXISTS "GeneratedImage_wordNormalized_idx"
  ON billing."GeneratedImage" ("wordNormalized");
```

- [ ] **Step 2: Commit**

```bash
git add apps/hub/prisma/sql/0006_generated_images.sql
git commit -m "feat(studio/db): 0006 GeneratedImage idempotent SQL migration"
```

---

## Task 5: Supabase MCP — tabloyu uygula (ONAY GEREKTİRİR)

Bu task subagent'a verilMEZ; **controller (ana ajan) Supabase MCP ile yürütür** ve her adımı kullanıcıya onaylatır. Hedef: Studio projesi `kgbhvruzoaqwwwkhzdex`, billing şeması.

- [ ] **Step 1: Projeyi ve şemayı doğrula**

MCP: `list_projects` → `kgbhvruzoaqwwwkhzdex` (Studio) doğrula. `list_tables` (schema: billing) → mevcut billing tablolarını gör, `GeneratedImage` henüz yok.

- [ ] **Step 2: Migration'ı uygula**

MCP: `apply_migration` (name: `0006_generated_images`, query: Task 4'teki SQL içeriği birebir). Kullanıcıya SQL'i göster, onay al, uygula.

- [ ] **Step 3: Doğrula**

MCP: `list_tables` (schema: billing) → `GeneratedImage` görünür. `execute_sql`: `SELECT count(*) FROM billing."GeneratedImage";` → 0 satır, hata yok. `get_advisors` (security) → yeni tablo için kritik uyarı yok (yeni tablo billing şemasında, public veri-API'sine kapalı; mevcut RLS deseniyle tutarlı).

---

## Task 6: Supabase MCP — tool-images bucket (ONAY GEREKTİRİR)

Controller MCP ile yürütür. public-read bucket.

- [ ] **Step 1: Mevcut bucket'ları listele**

MCP `execute_sql`: `SELECT id, name, public FROM storage.buckets;` → `tool-images` henüz yok.

- [ ] **Step 2: Bucket'ı oluştur (idempotent)**

MCP `execute_sql` (kullanıcı onayıyla):
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('tool-images', 'tool-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
```

- [ ] **Step 3: Doğrula**

MCP `execute_sql`: `SELECT id, public FROM storage.buckets WHERE id = 'tool-images';` → 1 satır, `public = true`. (Yükleme service-role anahtarıyla yapılacağı için ek RLS politikası gerekmez; public=true okumayı CDN'den açar.)

---

## Task 7: Supabase Storage upload helper (app concrete)

`ImageStorage` arayüzünü Supabase ile uygular.

**Files:**
- Modify: `apps/hub/package.json` (@supabase/supabase-js)
- Create: `apps/hub/src/lib/storage/toolImages.ts`

- [ ] **Step 1: supabase-js ekle**

Run:
```bash
pnpm --filter @ludenlab/hub add @supabase/supabase-js
```

- [ ] **Step 2: Helper'ı yaz**

`apps/hub/src/lib/storage/toolImages.ts`:
```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ImageStorage } from "@ludenlab/ai";

const BUCKET = process.env.TOOL_IMAGES_BUCKET ?? "tool-images";

let _client: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tanımlı değil — storage başlatılamıyor.");
    }
    _client = createClient(url, key, { auth: { persistSession: false } });
  }
  return _client;
}

/** Supabase Storage tool-images bucket'ına yükler; kalıcı public URL döner. */
export const supabaseToolImageStorage: ImageStorage = {
  async upload(path: string, bytes: Uint8Array, contentType: string): Promise<string> {
    const { error } = await client()
      .storage.from(BUCKET)
      .upload(path, bytes, { contentType, upsert: true });
    if (error) {
      throw new Error(`Storage upload hatası (${path}): ${error.message}`);
    }
    const { data } = client().storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },
};
```

- [ ] **Step 3: typecheck**

Run (gerçek kökten lint/typecheck daha güvenilir — worktree symlink boşluğu):
```bash
cd /Users/recepkucuk/ludenlab/.claude/worktrees/amazing-cartwright-cc4d66/apps/hub && node_modules/.bin/tsc --noEmit
```
Expected: PASS. (`ImageStorage` `@ludenlab/ai`'den çözülmeli; çözülmezse `pnpm install` gerçek kökten.)

- [ ] **Step 4: Commit**

```bash
git add apps/hub/package.json apps/hub/src/lib/storage/toolImages.ts pnpm-lock.yaml
git commit -m "feat(hub/storage): SupabaseToolImageStorage (tool-images upload)"
```

---

## Task 8: Prisma cache (app concrete) + `generateWordImage` sarmalayıcısı

`ImageCacheStore`'u Prisma ile uygular ve orchestrator'ı concrete'lerle bağlar.

**Files:**
- Create: `apps/hub/src/modules/studio/lib/imageCache.ts`
- Create: `apps/hub/src/modules/studio/lib/generateWordImage.ts`

- [ ] **Step 1: Prisma cache'i yaz**

`apps/hub/src/modules/studio/lib/imageCache.ts`:
```ts
import { prisma } from "@studio/lib/db";
import type { ImageCacheStore } from "@ludenlab/ai";

/** GeneratedImage tablosuyla görsel cache. cacheKey unique → tekil lookup. */
export const prismaImageCache: ImageCacheStore = {
  async find(cacheKey: string) {
    const row = await prisma.generatedImage.findUnique({
      where: { cacheKey },
      select: { publicUrl: true },
    });
    return row ? { publicUrl: row.publicUrl } : null;
  },

  async save(record) {
    // Yarış güvenli: aynı cacheKey paralel üretilirse ikinci create unique
    // ihlali atar; upsert ile no-op'a çeviriyoruz (ilk yazan kazanır).
    await prisma.generatedImage.upsert({
      where: { cacheKey: record.cacheKey },
      create: { ...record },
      update: {},
    });
  },
};
```

- [ ] **Step 2: Sarmalayıcıyı yaz**

`apps/hub/src/modules/studio/lib/generateWordImage.ts`:
```ts
import { image } from "@ludenlab/ai";
import { prismaImageCache } from "./imageCache";
import { supabaseToolImageStorage } from "@/lib/storage/toolImages";

/**
 * Bir kelimeyi (Claude'un İngilizce görsel-tanımıyla) kalıcı, cache'li görsel
 * URL'ine çevirir. Provider env'den seçilir; cache + storage concrete'leri burada bağlanır.
 */
export function generateWordImage(input: { word: string; visualPrompt: string }) {
  return image.generateImage(input, {
    provider: image.selectProvider(),
    cache: prismaImageCache,
    storage: supabaseToolImageStorage,
  });
}
```

- [ ] **Step 3: typecheck**

Run:
```bash
cd /Users/recepkucuk/ludenlab/.claude/worktrees/amazing-cartwright-cc4d66/apps/hub && node_modules/.bin/tsc --noEmit
```
Expected: PASS. `prisma.generatedImage` Task 3'teki generate sonrası mevcut olmalı; değilse Task 3 Step 2'yi tekrar çalıştır.

- [ ] **Step 4: Commit**

```bash
git add apps/hub/src/modules/studio/lib/imageCache.ts apps/hub/src/modules/studio/lib/generateWordImage.ts
git commit -m "feat(studio): PrismaImageCache + generateWordImage (orchestrator binding)"
```

---

## Task 9: env örnekleri + bütünsel doğrulama

**Files:**
- Modify: `apps/hub/.env.example`

- [ ] **Step 1: env yer-tutucularını ekle**

`apps/hub/.env.example` sonuna ekle:
```bash
# ── Görsel üretim (Faz 2+) ──
# Görsel sağlayıcısı: openai (varsayılan) | flux
IMAGE_PROVIDER=openai
OPENAI_API_KEY=
# FAL_KEY=                                 # IMAGE_PROVIDER=flux ise

# Supabase Storage (tool-images bucket = Studio projesi kgbhvruzoaqwwwkhzdex).
# SERVICE_ROLE_KEY GİZLİDİR — yalnız sunucu .env'inde, commit edilmez.
SUPABASE_URL=https://kgbhvruzoaqwwwkhzdex.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
TOOL_IMAGES_BUCKET=tool-images
```

- [ ] **Step 2: Bütünsel doğrulama**

Run (packages/ai testleri worktree'den; hub typecheck gerçek kökten daha güvenilir):
```bash
pnpm --filter @ludenlab/ai test && pnpm --filter @ludenlab/ai typecheck
cd /Users/recepkucuk/ludenlab && pnpm --filter @ludenlab/hub typecheck
```
Expected: `@ludenlab/ai` tüm testler geçer + typecheck temiz; hub typecheck temiz.

- [ ] **Step 3: Commit**

```bash
git add apps/hub/.env.example
git commit -m "chore(hub): görsel üretim + storage env örnekleri"
```

---

## Faz 2 tamamlanma kriteri

- `generateWordImage({ word, visualPrompt })` çağrılabilir: provider env'den seçilir, cache (billing."GeneratedImage") kontrol edilir, miss'te üretip Supabase tool-images'a yükler, kaydeder, `{ publicUrl, cacheHit }` döner.
- Orchestrator mantığı testlerle (cache-hit/miss) güvencede; concrete'ler typecheck'ten geçti.
- billing."GeneratedImage" tablosu + tool-images bucket Supabase'de canlı (MCP ile doğrulandı).
- Gerçek uçtan-uca üretim (API key + canlı çağrı) Faz 3'te endpoint + Faz 5 POC ile.

## Açık notlar (Faz 3'e taşınır)

- `generateWordImage`'ı çağıracak endpoint + kredi düşümü + telemetri (cacheHit) Faz 3.
- Claude system prompt'unun İngilizce `visualPrompt` üretmesi Faz 3.
- Gerçek görsel kalite/maliyet teyidi (GPT vs Flux) Faz 5 POC.
- Race: `upsert` ilk-yazan-kazanır; nadir çift-üretimde fazladan storage upload olabilir (zararsız, upsert URL'i ilk kazananla tutar) — gerekiyorsa Faz 3'te storage upsert idempotency'siyle ele alınır.
