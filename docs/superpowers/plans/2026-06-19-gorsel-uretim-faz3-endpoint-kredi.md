# Görsel Üretim — Faz 3: Endpoint + Kredi + Claude Prompt — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Artikülasyon drill'indeki kelimelere görsel üretimini bir API akışı haline getirmek: Claude her kelimeye İngilizce `visualPrompt` yazsın; bir endpoint cardId (+ opsiyonel item index'leri) alıp `generateWordImage` ile görselleri üretsin, `Card.content.items[].imageUrl`'e yazsın, görsel başına 1 kredi düşsün (koşulsuz, başarısız ücretsiz), cacheHit telemetrisi loglasın.

**Architecture:** Saf hedef-seçim mantığı (`planImageGeneration`) `packages/ai`'de TDD edilir. Entegrasyon endpoint'i `apps/hub`'da mevcut desenleri izler: `auth` + `rateLimit` + Card ownership (`findFirst({id,therapistId})`) + `generateWordImage` (Faz 2) paralel (`allSettled`) + `Card.content` merge + atomik kredi (`$transaction`, `credits.spend` deseni). Görsel telemetrisi console-log (cacheHit) — `logUsage` token-merkezli olduğu için ona zorlanmaz.

**Tech Stack:** Next.js API route (ESM), Prisma 7 (studioDb), zod, `@ludenlab/ai` (`generateWordImage`, `planImageGeneration`), vitest.

**Spec:** `docs/superpowers/specs/2026-06-19-artikulasyon-gorsel-uretim-design.md` (Bölüm 4.2, 6, 7). Faz 2 planı: `docs/superpowers/plans/2026-06-19-gorsel-uretim-faz2-kalicilik-cache.md`.

**Doğrulama disiplini:** `planImageGeneration` (saf) → vitest TDD. SYSTEM_PROMPT + endpoint (entegrasyon: DB, generateWordImage, kredi) → manuel doğrulama (typecheck; gerçek uçtan-uca üretim Faz 5 POC'ta, OPENAI_API_KEY + SUPABASE_SERVICE_ROLE_KEY ile).

**Ön koşul (runtime, kullanıcı):** Gerçek üretim testi için `.env`'de `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STUDIO_DATABASE_URL` (Faz 2'de .env.example'a eklendi).

---

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `packages/ai/src/image/plan.ts` (yeni) | `planImageGeneration(items, requestedIndexes?)` — hedef seçim + atlama |
| `packages/ai/src/image/plan.test.ts` (yeni) | plan TDD |
| `packages/ai/src/image/index.ts` (değişir) | plan export |
| `packages/ai/src/index.ts` (değişir) | plan tiplerini düz export |
| `apps/hub/src/app/studio/api/tools/articulation/route.ts` (değişir) | SYSTEM_PROMPT: İngilizce visualPrompt |
| `apps/hub/src/app/studio/api/tools/articulation/images/route.ts` (yeni) | görsel üretim endpoint'i |

---

## Task 1: `planImageGeneration` saf hedef-seçimi (packages/ai, TDD)

Hangi item'lara görsel üretileceğini saf kurallarla seçer: istenen index'ler (yoksa hepsi); zaten `imageUrl`'i olanı, `word`'ü olmayanı atla; `visualPrompt` yoksa `word`'e düş.

**Files:**
- Create: `packages/ai/src/image/plan.test.ts`
- Create: `packages/ai/src/image/plan.ts`

- [ ] **Step 1: Başarısız testi yaz**

`packages/ai/src/image/plan.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { planImageGeneration } from "./plan";

const items = [
  { word: "sandal", visualPrompt: "a sandal (footwear)" },          // 0: hedef
  { word: "top", visualPrompt: "a ball", imageUrl: "https://x/t.png" }, // 1: zaten var
  { word: "kuş" },                                                   // 2: visualPrompt yok → word'e düş
  { visualPrompt: "no word here" },                                 // 3: word yok → atla
];

describe("planImageGeneration", () => {
  it("index verilmezse uygun tüm item'ları hedefler", () => {
    const plan = planImageGeneration(items);
    expect(plan.targets).toEqual([
      { index: 0, word: "sandal", visualPrompt: "a sandal (footwear)" },
      { index: 2, word: "kuş", visualPrompt: "kuş" },
    ]);
    expect(plan.skipped).toEqual([
      { index: 1, reason: "already_has_image" },
      { index: 3, reason: "no_word" },
    ]);
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
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run:
```bash
pnpm --filter @ludenlab/ai test plan
```
Expected: FAIL — `Failed to resolve import "./plan"`.

- [ ] **Step 3: Minimal implementasyon**

`packages/ai/src/image/plan.ts`:
```ts
/** Görsel üretimine aday item (artikülasyon drill item'ının alt kümesi). */
export interface PlannableItem {
  word?: string;
  visualPrompt?: string;
  imageUrl?: string;
}

export interface ImageTarget {
  index: number;
  word: string;
  visualPrompt: string;
}

export interface SkippedItem {
  index: number;
  reason: "out_of_range" | "already_has_image" | "no_word";
}

export interface ImagePlan {
  targets: ImageTarget[];
  skipped: SkippedItem[];
}

/**
 * Hangi item'lara görsel üretileceğini saf kurallarla belirler.
 * - requestedIndexes verilmezse tüm item'lar aday.
 * - Zaten imageUrl'i olan → atla (idempotent; "yeniden üret" MVP dışı).
 * - word'ü olmayan → atla.
 * - visualPrompt yoksa word'e düşülür.
 */
export function planImageGeneration(
  items: PlannableItem[],
  requestedIndexes?: number[],
): ImagePlan {
  const indices = requestedIndexes ?? items.map((_, i) => i);
  const targets: ImageTarget[] = [];
  const skipped: SkippedItem[] = [];

  for (const index of indices) {
    const item = items[index];
    if (!item) {
      skipped.push({ index, reason: "out_of_range" });
      continue;
    }
    if (item.imageUrl) {
      skipped.push({ index, reason: "already_has_image" });
      continue;
    }
    if (!item.word) {
      skipped.push({ index, reason: "no_word" });
      continue;
    }
    targets.push({ index, word: item.word, visualPrompt: item.visualPrompt ?? item.word });
  }

  return { targets, skipped };
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run:
```bash
pnpm --filter @ludenlab/ai test plan
```
Expected: PASS — 3 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/ai/src/image/plan.ts packages/ai/src/image/plan.test.ts
git commit -m "feat(ai/image): planImageGeneration — saf hedef-seçim mantığı + test"
```

### Task 1 bağlamı
- Çalışma dizini: `/Users/recepkucuk/ludenlab/.claude/worktrees/amazing-cartwright-cc4d66` (worktree, branch `claude/amazing-cartwright-cc4d66`, NOT main).
- vitest kurulu; `pnpm --filter @ludenlab/ai test <pattern>`. Strict TDD.
- Bu saf bir fonksiyon; DB/IO yok. `PlannableItem` artikülasyon item'ının yalnız ihtiyaç duyulan alanlarını modeller.

---

## Task 2: plan'ı barrel'lara ekle

**Files:**
- Modify: `packages/ai/src/image/index.ts`
- Modify: `packages/ai/src/index.ts`

- [ ] **Step 1: image barrel'ına ekle**

`packages/ai/src/image/index.ts` sonuna:
```ts
export { planImageGeneration } from "./plan";
export type { PlannableItem, ImageTarget, SkippedItem, ImagePlan } from "./plan";
```

- [ ] **Step 2: paket kökü düz tip export'a ekle**

`packages/ai/src/index.ts` içindeki `export type { ... } from "./image";` bloğuna `PlannableItem, ImageTarget, SkippedItem, ImagePlan` tiplerini ekle (mevcut tipler korunur). `planImageGeneration` zaten `image` namespace üzerinden erişilebilir olacak.

- [ ] **Step 3: Doğrula + commit**

Run:
```bash
pnpm --filter @ludenlab/ai test && pnpm --filter @ludenlab/ai typecheck
```
Expected: PASS — tüm testler + typecheck temiz.

```bash
git add packages/ai/src/image/index.ts packages/ai/src/index.ts
git commit -m "feat(ai/image): planImageGeneration barrel + tip export"
```

---

## Task 3: SYSTEM_PROMPT — İngilizce visualPrompt

Claude artikülasyon drill üretirken her item'ın `visualPrompt`'unu İngilizce, tek somut nesne, belirsizlik giderilmiş yazsın (görsel modeli için).

**Files:**
- Modify: `apps/hub/src/app/studio/api/tools/articulation/route.ts`

- [ ] **Step 1: SYSTEM_PROMPT'a visualPrompt kuralı ekle**

`route.ts` içindeki `SYSTEM_PROMPT` string'inde, items[] içindeki "word" alanını anlatan bloktan sonra (JSON örneğinden önce) şu kuralı ekle:
```
ÖNEMLİ — items[] içindeki "visualPrompt" alanı (görsel üretimi için):
- visualPrompt İNGİLİZCE yazılmalı (görsel üretim modeli İngilizce'de daha isabetli).
- Kelimenin GÖRSELLEŞTİRİLEBİLİR somut karşılığını betimle; tek, net bir nesne.
- Belirsizlik varsa parantezle netleştir: "sandal" → "a sandal (footwear)" veya bağlama göre "a small rowing boat".
- Soyut/görselleştirilemez kelimelerde visualPrompt'u boş bırak ("").
- Stil betimleme (renk, arka plan) YAZMA — stil sistem tarafından eklenir.
```

Ayrıca JSON örneğindeki `"visualPrompt": "sandal görseli"` satırını şununla değiştir:
```
      "visualPrompt": "a sandal (footwear)"
```

- [ ] **Step 2: typecheck (string değişikliği — kırılma olmamalı)**

Run:
```bash
cd /Users/recepkucuk/ludenlab/.claude/worktrees/amazing-cartwright-cc4d66/apps/hub && node_modules/.bin/tsc --noEmit
```
Expected: yalnız bilinen pre-existing `CardGeneratorForm.tsx` hatası; bu dosyadan yeni hata yok.

- [ ] **Step 3: Commit**

```bash
git add apps/hub/src/app/studio/api/tools/articulation/route.ts
git commit -m "feat(studio/artikulasyon): Claude visualPrompt İngilizce + disambiguation"
```

### Task 3 bağlamı
- `route.ts` `createToolHandler` kullanıyor; `SYSTEM_PROMPT` büyük bir template string. Yalnız o string'i düzenliyorsun — handler mantığına dokunma.
- `apps/hub` typecheck'te 1 PRE-EXISTING hata var (`CardGeneratorForm.tsx:149`, Zod/hookform) — senin işin değil, görmezden gel; yeni hata olmadığını doğrula.

---

## Task 4: Görsel üretim endpoint'i

`POST /studio/api/tools/articulation/images` — cardId (+ opsiyonel itemIndexes) alır; planlar, üretir (paralel), `Card.content`'e yazar, kredi düşer (görsel başına 1, koşulsuz; başarısız ücretsiz), cacheHit loglar.

**Files:**
- Create: `apps/hub/src/app/studio/api/tools/articulation/images/route.ts`

- [ ] **Step 1: Endpoint'i yaz**

`apps/hub/src/app/studio/api/tools/articulation/images/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { logError } from "@studio/lib/utils";
import { image } from "@ludenlab/ai";
import { generateWordImage } from "@studio/lib/generateWordImage";

const bodySchema = z.object({
  cardId: z.string().min(1),
  itemIndexes: z.array(z.number().int().nonnegative()).optional(),
});

const CREDIT_PER_IMAGE = 1;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { allowed, retryAfter } = rateLimit(`articulation-images:${session.user.id}`, 4);
    if (!allowed) return rateLimitResponse(retryAfter);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Geçersiz istek" },
        { status: 400 },
      );
    }
    const { cardId, itemIndexes } = parsed.data;

    // Ownership + içerik
    const card = await prisma.card.findFirst({
      where: { id: cardId, therapistId: session.user.id },
      select: { id: true, content: true, toolType: true },
    });
    if (!card) {
      return NextResponse.json({ error: "Kart bulunamadı" }, { status: 404 });
    }

    const content = card.content as { items?: image.PlannableItem[] } | null;
    const items = content?.items ?? [];
    const plan = image.planImageGeneration(items, itemIndexes);

    if (plan.targets.length === 0) {
      return NextResponse.json({ results: [], creditsSpent: 0, skipped: plan.skipped });
    }

    // Kredi ön-kontrol (en fazla hedef sayısı kadar gerekecek)
    const therapist = await prisma.therapist.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });
    const needed = plan.targets.length * CREDIT_PER_IMAGE;
    if (!therapist || therapist.credits < needed) {
      return NextResponse.json(
        { error: `Yetersiz kredi. Gerekli: ${needed}, Mevcut: ${therapist?.credits ?? 0}` },
        { status: 402 },
      );
    }

    // Üretim — paralel; her biri bağımsız başarısız olabilir.
    const settled = await Promise.allSettled(
      plan.targets.map((t) => generateWordImage({ word: t.word, visualPrompt: t.visualPrompt })),
    );

    // Sonuçları işle: başarılıları content'e yaz, cacheHit logla.
    const nextItems = items.slice();
    const results: Array<{ index: number; word: string; imageUrl?: string; cacheHit?: boolean; error?: boolean }> = [];
    let succeeded = 0;
    for (let i = 0; i < plan.targets.length; i++) {
      const t = plan.targets[i]!;
      const r = settled[i]!;
      if (r.status === "fulfilled") {
        succeeded++;
        nextItems[t.index] = { ...nextItems[t.index], imageUrl: r.value.publicUrl };
        results.push({ index: t.index, word: t.word, imageUrl: r.value.publicUrl, cacheHit: r.value.cacheHit });
        // Telemetri: operatör cache oranını/marjı görür (logUsage token-merkezli; burada console).
        console.log(`[image] tools/articulation word="${t.word}" cacheHit=${r.value.cacheHit} therapist=${session.user.id}`);
      } else {
        logError("articulation/images generateWordImage", r.reason);
        results.push({ index: t.index, word: t.word, error: true });
      }
    }

    if (succeeded === 0) {
      return NextResponse.json({ results, creditsSpent: 0, skipped: plan.skipped });
    }

    // Atomik: kredi (başarılı sayı kadar) + content güncelle. Başarısız üretim ücretsiz.
    const spend = succeeded * CREDIT_PER_IMAGE;
    const tx = await prisma.$transaction(async (db) => {
      const fresh = await db.therapist.findUnique({
        where: { id: session.user.id },
        select: { credits: true },
      });
      if (!fresh || fresh.credits < spend) {
        return { ok: false as const, credits: fresh?.credits ?? 0 };
      }
      const updated = await db.therapist.update({
        where: { id: session.user.id },
        data: { credits: { decrement: spend } },
        select: { credits: true },
      });
      await db.creditTransaction.create({
        data: {
          therapistId: session.user.id,
          amount: spend,
          type: "SPEND",
          description: `Artikülasyon görsel üretimi (${succeeded} görsel)`,
        },
      });
      await db.card.update({
        where: { id: cardId },
        data: {
          // Prisma Json alanı `object` kabul etmez; toolHandler.ts'teki cast desenini izle.
          content: { ...(content ?? {}), items: nextItems } as Parameters<
            typeof db.card.update
          >[0]["data"]["content"],
        },
      });
      return { ok: true as const, credits: updated.credits };
    });

    if (!tx.ok) {
      // Görseller üretildi (cache'te kalıcı) ama kredi yetmedi → karta yazılmadı, ücret alınmadı.
      return NextResponse.json({ error: "Yetersiz kredi", credits: tx.credits }, { status: 402 });
    }

    return NextResponse.json({ results, creditsSpent: spend, credits: tx.credits, skipped: plan.skipped });
  } catch (error) {
    logError("POST /studio/api/tools/articulation/images", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
```

- [ ] **Step 2: typecheck**

Run:
```bash
cd /Users/recepkucuk/ludenlab/.claude/worktrees/amazing-cartwright-cc4d66/apps/hub && node_modules/.bin/tsc --noEmit
```
Expected: yalnız pre-existing `CardGeneratorForm.tsx` hatası; bu yeni dosyadan SIFIR hata. (`image.PlannableItem` / `image.planImageGeneration` namespace üzerinden, `generateWordImage` Faz 2'den çözülür.)

- [ ] **Step 3: Commit**

```bash
git add apps/hub/src/app/studio/api/tools/articulation/images/route.ts
git commit -m "feat(studio/artikulasyon): görsel üretim endpoint (toplu+tek, kredi 1/görsel, cacheHit log)"
```

### Task 4 bağlamı
- Mevcut desenleri izle: `auth()` → `session.user.id`; ownership `prisma.card.findFirst({ where: { id, therapistId } })`; kredi `$transaction` (bkz. `credits/spend/route.ts`); rate limit `rateLimit(key, perMin)`.
- `generateWordImage` (Faz 2, `@studio/lib/generateWordImage`) `{ publicUrl, cacheHit }` döner; env'den provider seçer, cache'ler, Supabase'e yükler.
- `Card.content` `Json`; `items` dizisini kopyalayıp `imageUrl` ekleyip `prisma.card.update({ data: { content } })` ile yazıyoruz.
- Kredi modeli: görsel başına 1 kredi KOŞULSUZ (cache-hit dahil); yalnız BAŞARILI üretim ücretlenir (allSettled rejected → ücretsiz). Ön-kontrol hedef sayısına göre; nihai düşüm başarılı sayıya göre, transaction'da tekrar doğrulanır.
- `apps/hub` typecheck'te 1 pre-existing hata (CardGeneratorForm) — senin işin değil.

---

## Task 5: bütünsel doğrulama

- [ ] **Step 1: ai testleri + typecheck**

Run:
```bash
pnpm --filter @ludenlab/ai test && pnpm --filter @ludenlab/ai typecheck
```
Expected: tüm `@ludenlab/ai` testleri (plan dahil) geçer; typecheck temiz.

- [ ] **Step 2: hub typecheck**

Run:
```bash
cd /Users/recepkucuk/ludenlab/.claude/worktrees/amazing-cartwright-cc4d66/apps/hub && node_modules/.bin/tsc --noEmit
```
Expected: YALNIZ pre-existing `CardGeneratorForm.tsx(149,27)` hatası; Faz 3 dosyalarından (`plan.ts`, `articulation/route.ts`, `articulation/images/route.ts`) sıfır yeni hata.

- [ ] **Step 3: (commit gerekmez — doğrulama task'ı)**

---

## Faz 3 tamamlanma kriteri

- Claude artikülasyon drill'inde İngilizce `visualPrompt` üretir.
- `POST /studio/api/tools/articulation/images` cardId (+ opsiyonel itemIndexes) ile çağrılabilir; planlar, üretir, `Card.content.items[].imageUrl`'e yazar, görsel başına 1 kredi düşer, cacheHit loglar, kısmi başarıyı düzgün döndürür.
- `planImageGeneration` testlerle güvencede; endpoint typecheck'ten geçti.
- Gerçek uçtan-uca üretim (canlı OpenAI + Supabase) Faz 5 POC'ta key'lerle doğrulanır.

## Açık notlar (Faz 4 / 5'e taşınır)

- Formdaki "görselli üret" kutusu + kart görünümünde "görsel ekle" düğmesi + PDF/çalışma sayfası = Faz 4 (bu endpoint'i tüketir).
- "Görselli üret" işaretliyse drill üretiminden hemen sonra bu endpoint çağrılır (Faz 4 UI akışı).
- Gerçek görsel kalitesi + GPT vs Flux + maliyet teyidi = Faz 5 POC.
- İleride: "yeniden üret" (imageUrl'i olanı zorla yenile) + elle yükleme (MVP dışı).
