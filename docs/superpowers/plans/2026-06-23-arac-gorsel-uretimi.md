# Araçlara On-Demand Görsel Üretimi (İletişim Panosu · Eşleştirme · Sesletim) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Üç Studio aracına (comm-board, matching-game, phonation) "Görsel üret" butonu (kredi karşılığı, on-demand) ekle — terapist materyali üretip butona basınca o materyalin görsele-değer bölümünün nesne-stili görselleri üretilir, ekranda + PDF'te gösterilir.

**Architecture:** Kanıtlanmış `social-story` görsel akışının birebir kopyası, ama nesne-stili (`generateWordImage`) + bulk buton (default değil, on-demand). Her araç için: (1) route system-prompt'una ilgili dizinin her elemanına `visualPrompt` (İngilizce, tek somut nesne) + `imageUrl` alanı; (2) `/images` endpoint (sosyal-hikaye desenini araç dizisine uyarlar, `generateWordImage` çağırır, cache-hit ücretsiz, kredi 1/üretilen); (3) UI'da "Görsel üret" butonu + handler; (4) View'da `imageUrl` render; (5) PDF'te `Image` render (`reachableImage` koruması). Yeni image-modül kodu YOK — mevcut `generateWordImage` (nesne flashcard stili) tüm bu araçlara uyar.

**Tech Stack:** Next.js App Router (server route handlers + "use client" sayfalar), Prisma (atomik kredi+content tx), `@ludenlab/ai` image modülü (`generateWordImage`), `@react-pdf/renderer` (PDF), FLUX schnell sağlayıcı.

**Verification notu:** Bu araçların route/UI/PDF katmanında birim test ÇERÇEVESİ YOK (kod tabanı: vitest yalnız `packages/ai`; UI için manuel typecheck + preview). Bu plandaki doğrulama = `pnpm exec tsc --noEmit` (yalnız önceden-var-olan `CardGeneratorForm.tsx` hatası kabul) + PDF için Node `renderToFile` ile gerçek-veri render-kontrolü (sosyal-hikaye PDF'inde kullanılan teknik) + deploy. Yeni pure-logic eklenmediğinden yeni vitest yok.

---

## Ortak Referans: `/images` endpoint şablonu

Her aracın `/images/route.ts`'i **`apps/hub/src/app/studio/api/tools/social-story/images/route.ts`**'in birebir kopyasıdır; YALNIZCA şu noktalar değişir:
- `card.toolType !== "<TOOLTYPE>"` kontrolü,
- içerikten hedef toplama: `sentences[]` yerine ilgili dizi(ler) (`cells[]` / `pairs[]` / `grid.cells[]`+`objects[]`+`wordChain[]`),
- üretici: `generateSceneImage({ visualPrompt })` yerine **`generateWordImage({ word, visualPrompt })`** (nesne stili),
- rate-limit anahtarı + kredi açıklaması metni,
- body alanı: `sentenceIndexes` yerine `<x>Indexes` (opsiyonel).

Geri kalan her şey aynı: auth, ownership, `mapWithConcurrency(targets, 6, …)`, `generated = results.filter(r => r.imageUrl && !r.cacheHit).length`, `spend = generated * 1`, atomik tx (taze content oku → `imageUrl` yaz → kredi düş → 0 ise tx satırı yazma), `reachable` gerektirmez (o PDF tarafında).

## Ortak Referans: UI buton + handler şablonu

Her sayfada, sonuç araç-çubuğuna şu buton eklenir (mevcut PDF butonlarının yanına):
```tsx
<PBtn variant="white" onClick={handleGenerateImages} disabled={imagesLoading}
  icon={<ImageIcon style={{ width: 14, height: 14 }} />}>
  {imagesLoading ? "Görseller üretiliyor…" : "Görsel üret"}
</PBtn>
```
ve handler (sosyal-hikaye `generateSceneImages` deseninin aynısı, chunk'lı):
```tsx
const [imagesLoading, setImagesLoading] = useState(false);
async function handleGenerateImages() {
  if (!savedCardId) return;
  setImagesLoading(true);
  try {
    const res = await fetch("/studio/api/tools/<TOOL>/images", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: savedCardId }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Görsel üretilemedi"); return; }
    // taze içeriği setState ile güncelle (data.results[].index + imageUrl)
    set<Content>((prev) => prev ? applyImages(prev, data.results) : prev);
    const ok = (data.results as Array<{ imageUrl?: string }>).filter(r => r.imageUrl).length;
    if (ok > 0 && (data.creditsSpent ?? 0) > 0) toast.success(`${ok} görsel üretildi (${data.creditsSpent} kredi)`);
  } catch { toast.error("Görsel üretiminde bağlantı hatası"); }
  finally { setImagesLoading(false); }
}
```
`ImageIcon` = `lucide-react`'ten `Image as ImageIcon` (JSX `Image` çakışmasını önler).

---

# FAZ 1 — İletişim Panosu (Comm Board) ⭐ en yüksek değer

AAC panosu doğası gereği resimle çalışır; her hücre bir sembol. `cells[]` → her hücreye nesne görseli.

### Task 1.1: Route — her hücreye `visualPrompt`

**Files:** Modify `apps/hub/src/app/studio/api/tools/comm-board/route.ts`

- [ ] **Step 1: System prompt'taki cell şablonuna `visualPrompt` ekle.** `"visualDescription": "..."` satırının hemen ardına ekle:
```
      "visualPrompt": "English description of a SINGLE clear icon/symbol for this word on a plain white background (e.g. 'a glass of water', 'a red apple', 'a toilet'). Concrete, simple, no text.",
```
- [ ] **Step 2: Prompt kurallarına zorunluluk satırı ekle** (output-format bloğunun hemen üstündeki kurallara):
```
- Her hücre için MUTLAKA "visualPrompt" ver: o kelimeyi tek, net bir simge/ikonla anlatan İNGİLİZCE kısa tanım (tek nesne, sade, metin yok). AAC sembolü gibi.
```
- [ ] **Step 3: Typecheck.** Run: `cd apps/hub && pnpm exec tsc --noEmit 2>&1 | grep -c "error TS"` → beklenen: `1` (yalnız CardGeneratorForm).
- [ ] **Step 4: Commit.** `git add apps/hub/src/app/studio/api/tools/comm-board/route.ts && git commit -m "feat(comm-board): her hücreye İngilizce visualPrompt (AAC sembolü)"`

### Task 1.2: `/images` endpoint

**Files:** Create `apps/hub/src/app/studio/api/tools/comm-board/images/route.ts`

- [ ] **Step 1: social-story/images/route.ts'i kopyala, şu farklarla yaz:**
  - import: `generateWordImage` (generateSceneImage değil) — `import { generateWordImage } from "@studio/lib/generateWordImage";`
  - `interface BoardCell { word?: string; visualPrompt?: string; imageUrl?: string }`
  - body: `cellIndexes` (opsiyonel) + `cardId`
  - rate-limit: `comm-board-images:${session.user.id}`
  - toolType kontrolü: `card.toolType !== "COMMUNICATION_BOARD"` → 422 "Bu araç yalnız iletişim panosu kartlarında çalışır"
  - içerik: `const content = card.content as { cells?: BoardCell[] } | null; const cells = content?.cells ?? [];`
  - hedefler: `cells.forEach((c, i) => { ... vp = c.visualPrompt?.trim(); if (vp && !c.imageUrl) targets.push({ index: i, word: c.word ?? "", visualPrompt: vp }); })`
  - üretim: `mapWithConcurrency(targets, 6, (t) => generateWordImage({ word: t.word || t.visualPrompt, visualPrompt: t.visualPrompt }))`
  - tx içinde: `freshCells[s.index] = { ...freshCells[s.index], imageUrl: s.imageUrl }` ve `content: { ...freshContent, cells: freshCells }`
  - kredi açıklaması: `İletişim panosu görseli (${generated} üretildi)`
- [ ] **Step 2: Typecheck.** Run: `cd apps/hub && pnpm exec tsc --noEmit 2>&1 | grep "comm-board/images" || echo TEMIZ` → beklenen: `TEMIZ`
- [ ] **Step 3: Commit.** `git add apps/hub/src/app/studio/api/tools/comm-board/images/route.ts && git commit -m "feat(comm-board): /images endpoint (nesne stili, cache-hit ücretsiz)"`

### Task 1.3: UI — buton + handler + interface

**Files:** Modify `apps/hub/src/app/studio/(main)/tools/comm-board/page.tsx`, `apps/hub/src/modules/studio/components/cards/CommBoardView.tsx`

- [ ] **Step 1: `CommBoardCell` interface'ine `imageUrl?: string` ekle** (CommBoardView.tsx, `visualDescription: string;` satırının altına):
```ts
  imageUrl?: string;
```
- [ ] **Step 2: page.tsx import** — `import { ..., Image as ImageIcon } from "lucide-react";` (mevcut lucide importuna ekle).
- [ ] **Step 3: page.tsx state + handler** — Ortak Referans buton+handler şablonunu uygula (`<TOOL>` = `comm-board`, `<Content>` = `board`/`setBoard`). `applyImages`:
```ts
function applyImages(prev: typeof board, results: Array<{ index: number; imageUrl?: string }>) {
  if (!prev) return prev;
  const cells = prev.cells.slice();
  for (const r of results) if (r.imageUrl) cells[r.index] = { ...cells[r.index], imageUrl: r.imageUrl };
  return { ...prev, cells };
}
```
  (inline yaz; ayrı dosya gerekmez.)
- [ ] **Step 4: page.tsx — "Görsel üret" butonunu sonuç araç-çubuğuna ekle** (mevcut "PDF — Pano" PBtn'inin yanına, Ortak Referans buton bloğu).
- [ ] **Step 5: Typecheck.** Run: `cd apps/hub && pnpm exec tsc --noEmit 2>&1 | grep -E "comm-board|CommBoardView" || echo TEMIZ` → `TEMIZ`
- [ ] **Step 6: Commit.** `git add -A apps/hub/src/app/studio/(main)/tools/comm-board apps/hub/src/modules/studio/components/cards/CommBoardView.tsx && git commit -m "feat(comm-board): Görsel üret butonu + handler"`

### Task 1.4: View — hücrede görsel

**Files:** Modify `apps/hub/src/modules/studio/components/cards/CommBoardView.tsx:73-112` (BoardCell)

- [ ] **Step 1: `visualDescription` placeholder div'ini koşullu görselle değiştir.** Mevcut `<div className="flex-1 flex items-center justify-center ... ">…visualDescription…</div>` yerine:
```tsx
      {cell.imageUrl ? (
        <img src={cell.imageUrl} alt={cell.word} className="my-1 aspect-square w-full rounded-lg bg-white object-contain" />
      ) : (
        <div className="my-1 flex min-h-[48px] flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white/60 px-2 py-1.5">
          <p className="text-center text-[10px] italic leading-snug text-zinc-500">{cell.visualDescription}</p>
        </div>
      )}
```
- [ ] **Step 2: Typecheck** (yukarıdaki gibi) → `TEMIZ`.
- [ ] **Step 3: Commit.** `git commit -am "feat(comm-board): hücrede AAC görseli (yoksa metin tarifi)"`

### Task 1.5: PDF — pano hücrelerinde görsel

**Files:** Modify `apps/hub/src/app/studio/(main)/tools/comm-board/page.tsx` (board PDF, ~lines 87-197)

- [ ] **Step 1: `@react-pdf/renderer` importuna `Image` ekle** (board PDF fonksiyonundaki dynamic import).
- [ ] **Step 2: `reachableImage` helper'ı ekle** (yoksa) — bu fonksiyonun başına (cards/[id]/page.tsx'tekinin aynısı):
```ts
async function reachableImage(url: string): Promise<boolean> {
  try { const r = await fetch(url, { method: "GET", mode: "cors" }); return r.ok; } catch { return false; }
}
```
- [ ] **Step 3: Hücreleri render etmeden önce erişilebilir görselleri süz** (cells map'inden önce):
```ts
const cellsV = await Promise.all(cells.map(async (c) => ({ ...c, imageUrl: c.imageUrl && (await reachableImage(c.imageUrl)) ? c.imageUrl : undefined })));
```
  ve render'da `cells` yerine `cellsV` kullan.
- [ ] **Step 4: Hücre kutusuna (`<View style={[S.cellBox...]}>`) koşullu Image ekle** (kelimenin üstüne):
```tsx
{cell.imageUrl ? <Image src={cell.imageUrl} style={{ width: cellW - 16, height: 44, objectFit: "contain", marginBottom: 3 }} /> : null}
```
- [ ] **Step 5: Render-kontrol (PDF gerçek-veri doğrulama).** `_pdfcheck.tsx` geçici script yaz (sosyal-hikaye doğrulamasındaki gibi): board PDF Doc'unu birebir kopyala, DB'den bir COMMUNICATION_BOARD kartının `content`'ini (cells + imageUrl varsa) çek, `renderToFile("/tmp/cb.pdf")`, sonra `/tmp/cb.pdf`'i görsel oku. (Görseli olan bir kart yoksa, bir kartı önce uygulamada "Görsel üret" ile doldur veya bu adımı deploy-sonrası manuel doğrulamaya bırak ve scripti silme.) Script'i sonra sil.
- [ ] **Step 6: Typecheck** → `TEMIZ`.
- [ ] **Step 7: Commit + deploy.** `git add -A && git commit -m "feat(comm-board): PDF hücrelerinde görsel (reachable korumalı)" && git push origin HEAD:main`

### Task 1.6: Faz 1 doğrulama
- [ ] **Step 1: Tam tsc** — `cd apps/hub && pnpm exec tsc --noEmit 2>&1 | grep -c "error TS"` → `1`.
- [ ] **Step 2: Deploy edildi (Task 1.5).** Kullanıcı uygulamada: pano üret → "Görsel üret" → hücrelerde AAC sembolleri → PDF'te görseller. (Kredi: hücre sayısı kadar, cache-hit ücretsiz.)

---

# FAZ 2 — Eşleştirme Oyunu (Matching Game)

`pairs[]` → her çiftte **Kart A**'nın nesne görseli (resim-kelime eşleştirme). Model yalnız cardA somut/imgelenebilir bir kelimeyse `visualPrompt` üretir.

### Task 2.1: Route — çiftlere `visualPrompt`

**Files:** Modify `apps/hub/src/app/studio/api/tools/matching-game/route.ts`

- [ ] **Step 1: pair şablonuna alan ekle** (`"hint": ...` satırının yanına):
```
      "visualPrompt": "İngilizce: SADECE cardA somut, çizilebilir bir nesne/varlıksa onun tek-nesne görsel tanımı (ör. 'a red apple'). cardA soyut/cümleyse bu alanı boş bırak (\"\")."
```
- [ ] **Step 2: Kurallara not ekle:**
```
- Görsel: Mümkün olduğunda cardA somut bir nesne olsun ve "visualPrompt" (İngilizce, tek nesne) ver — böylece resim-kelime eşleştirmeye dönüşür. Soyut eşleştirmelerde visualPrompt boş ("") kalsın.
```
- [ ] **Step 3: Typecheck** → `1`.  **Step 4: Commit** `feat(matching-game): cardA için opsiyonel visualPrompt`

### Task 2.2: `/images` endpoint

**Files:** Create `apps/hub/src/app/studio/api/tools/matching-game/images/route.ts`

- [ ] **Step 1: Şablonu yaz, farklar:**
  - `interface MatchPair { cardA?: string; visualPrompt?: string; imageUrl?: string }`
  - toolType: `MATCHING_GAME`, rate-limit `matching-game-images`, body `pairIndexes`
  - içerik: `content.pairs`; hedef: `vp = p.visualPrompt?.trim(); if (vp && !p.imageUrl) targets.push({ index, word: p.cardA ?? "", visualPrompt: vp })`
  - üretici: `generateWordImage({ word: t.word || t.visualPrompt, visualPrompt: t.visualPrompt })`
  - tx: `freshPairs[s.index] = { ...freshPairs[s.index], imageUrl: s.imageUrl }`, `content: { ...fresh, pairs: freshPairs }`
  - açıklama: `Eşleştirme görseli (${generated} üretildi)`
- [ ] **Step 2: Typecheck** → `TEMIZ`.  **Step 3: Commit** `feat(matching-game): /images endpoint`

### Task 2.3: UI — buton + handler + interface

**Files:** Modify `apps/hub/src/app/studio/(main)/tools/matching-game/page.tsx`, `apps/hub/src/modules/studio/components/cards/MatchingGameView.tsx`

- [ ] **Step 1: `MatchingPair` interface'ine `imageUrl?: string`** (MatchingGameView.tsx).
- [ ] **Step 2: page.tsx import `Image as ImageIcon`.**
- [ ] **Step 3: Buton+handler şablonu** (`<TOOL>`=matching-game, `<Content>`=game/setGame). `applyImages`: `pairs[r.index] = { ...pairs[r.index], imageUrl }`.
- [ ] **Step 4: Butonu sonuç başlığındaki rozet/görünüm-değiştirici satırına ekle** (Tablo/Kartlar toggle'ının yanına, `<div style={{ display: "inline-flex", padding: 3, ...`'ten önce ayrı bir PBtn).
- [ ] **Step 5: Typecheck** → `TEMIZ`.  **Step 6: Commit** `feat(matching-game): Görsel üret butonu`

### Task 2.4: View — Kart A'da görsel (tablo + kartlar)

**Files:** Modify `apps/hub/src/modules/studio/components/cards/MatchingGameView.tsx:76-101`, `apps/hub/src/app/studio/(main)/tools/matching-game/page.tsx` (PrintableCards + tablo)

- [ ] **Step 1: MatchingGameView tablo — Kart A hücresine görsel.** cardA `<td>`'sini güncelle:
```tsx
<td className="px-3 py-2.5 text-sm font-medium text-[var(--poster-ink)]">
  <div className="flex items-center gap-2">
    {pair.imageUrl && <img src={pair.imageUrl} alt={pair.cardA} className="h-10 w-10 shrink-0 rounded bg-white object-contain" />}
    <span>{pair.cardA}</span>
  </div>
</td>
```
- [ ] **Step 2: page.tsx sonuç tablosunda (viewMode==="table") aynı Kart A hücresine aynı görsel bloğunu ekle** (lines ~684 cardA `<td>`).
- [ ] **Step 3: `PrintableCards` (kartlar görünümü) — cardA kartına görsel ekle** (her cardA kartının metninin üstüne `{pair.imageUrl && <img ... className="mb-1 h-16 w-full object-contain" />}`).
- [ ] **Step 4: Typecheck** → `TEMIZ`.  **Step 5: Commit** `feat(matching-game): Kart A'da görsel (tablo+kartlar)`

### Task 2.5: PDF — Kart A görselleri

**Files:** Modify `apps/hub/src/app/studio/(main)/tools/matching-game/page.tsx` (table PDF ~177-274 + cards PDF ~276-380)

- [ ] **Step 1: Her iki PDF fonksiyonunda `@react-pdf/renderer` importuna `Image` + `reachableImage` helper + pairs ön-süzme** (`pairsV = await Promise.all(pairs.map(... reachableImage ...))`), render'da `pairsV` kullan.
- [ ] **Step 2: Table PDF — cardA hücresine koşullu `<Image src={pair.imageUrl} style={{ width: 28, height: 28, objectFit: "contain", marginRight: 4 }} />`.**
- [ ] **Step 3: Cards PDF — cardA kartına koşullu `<Image ... style={{ width: '100%', height: 50, objectFit: 'contain', marginBottom: 3 }} />`.**
- [ ] **Step 4: Render-kontrol** (`_pdfcheck.tsx`, bir MATCHING_GAME kartının content'iyle, görseli olan bir çift varsa) → `/tmp/mg.pdf` görsel oku → sil. (Yoksa deploy-sonrası manuel.)
- [ ] **Step 5: Typecheck** → `1`.  **Step 6: Commit + deploy** `feat(matching-game): PDF Kart A görselleri` + `git push origin HEAD:main`

---

# FAZ 3 — Sesletim Oyunları (Phonation)

En karmaşık: 5 aktivite tipi, 3 dizi şekli. Görsele-değer kelimeler: `objects[]` (sound_hunt), `grid.cells[]` (bingo/snakes_ladders/sound_maze), `wordChain[]` (word_chain). Her elemana `visualPrompt` + `imageUrl`.

### Task 3.1: Route — elemanlara `visualPrompt`

**Files:** Modify `apps/hub/src/app/studio/api/tools/phonation/route.ts`

- [ ] **Step 1: System prompt'ta `grid.cells[]`, `objects[]`, `wordChain[]` eleman şablonlarının HER BİRİNE `"visualPrompt": "İngilizce, bu kelimeyi/nesneyi anlatan tek somut nesne görsel tanımı (ör. 'a yellow banana'). Soyut/uygun değilse boş bırak."` ekle.**
- [ ] **Step 2: Kural notu:** `- grid hücreleri, nesneler ve kelime-zinciri öğelerinin her birine, kelime somut bir nesneyse "visualPrompt" (İngilizce, tek nesne) ekle.`
- [ ] **Step 3: Typecheck** → `1`.  **Step 4: Commit** `feat(phonation): grid/objects/wordChain elemanlarına visualPrompt`

### Task 3.2: `/images` endpoint (çok-dizili)

**Files:** Create `apps/hub/src/app/studio/api/tools/phonation/images/route.ts`

- [ ] **Step 1: Şablonu yaz; hedef toplama ÜÇ diziyi de tarar.** İçerik: `content as { grid?: { cells?: Cell[] }, objects?: Obj[], wordChain?: Chain[] }`. Hedefleri tek listede topla, her hedefe `kind: "grid"|"object"|"chain"` + `index` koy:
```ts
const targets: Array<{ kind: "grid"|"object"|"chain"; index: number; word: string; visualPrompt: string }> = [];
(content?.grid?.cells ?? []).forEach((c, i) => { const vp = c.visualPrompt?.trim(); if (vp && !c.imageUrl) targets.push({ kind: "grid", index: i, word: c.word ?? "", visualPrompt: vp }); });
(content?.objects ?? []).forEach((o, i) => { const vp = o.visualPrompt?.trim(); if (vp && !o.imageUrl) targets.push({ kind: "object", index: i, word: o.name ?? "", visualPrompt: vp }); });
(content?.wordChain ?? []).forEach((w, i) => { const vp = w.visualPrompt?.trim(); if (vp && !w.imageUrl) targets.push({ kind: "chain", index: i, word: w.word ?? "", visualPrompt: vp }); });
```
  Üretim aynı (`generateWordImage`). tx'te `kind`'e göre doğru diziye yaz: `if (s.kind==="grid") freshGrid.cells[s.index].imageUrl=...` vb., sonra `content: { ...fresh, grid: {...fresh.grid, cells: freshGridCells}, objects: freshObjects, wordChain: freshChain }`. Sonuç `results`'ta `index` yerine global sıra; istemci `kind+index` ile eşleştirir → istemciye `results: [{ kind, index, imageUrl, cacheHit }]` döndür.
- [ ] **Step 2: Typecheck** → `TEMIZ`.  **Step 3: Commit** `feat(phonation): /images endpoint (grid+objects+wordChain)`

### Task 3.3: UI — buton + handler + interface'ler

**Files:** Modify `apps/hub/src/app/studio/(main)/tools/phonation/page.tsx`, `apps/hub/src/modules/studio/components/cards/PhonationView.tsx`

- [ ] **Step 1: `GridCell`, `PhonationObject`, `WordChainItem` interface'lerine `visualPrompt?: string; imageUrl?: string` ekle** (PhonationView.tsx).
- [ ] **Step 2: page.tsx import `Image as ImageIcon`.**
- [ ] **Step 3: Buton+handler** (`<TOOL>`=phonation, `<Content>`=activity/setActivity). `applyImages` `kind+index`'e göre doğru diziyi günceller:
```ts
function applyImages(prev, results) {
  if (!prev) return prev;
  const next = { ...prev, grid: prev.grid ? { ...prev.grid, cells: [...(prev.grid.cells ?? [])] } : prev.grid, objects: [...(prev.objects ?? [])], wordChain: [...(prev.wordChain ?? [])] };
  for (const r of results) if (r.imageUrl) {
    if (r.kind === "grid" && next.grid) next.grid.cells[r.index] = { ...next.grid.cells[r.index], imageUrl: r.imageUrl };
    else if (r.kind === "object") next.objects[r.index] = { ...next.objects[r.index], imageUrl: r.imageUrl };
    else if (r.kind === "chain") next.wordChain[r.index] = { ...next.wordChain[r.index], imageUrl: r.imageUrl };
  }
  return next;
}
```
- [ ] **Step 4: Butonu sonuç araç-çubuğuna ekle** (mevcut "PDF İndir" PBtn yanına).
- [ ] **Step 5: Typecheck** → `TEMIZ`.  **Step 6: Commit** `feat(phonation): Görsel üret butonu + handler`

### Task 3.4: View — 5 aktivite tipinde görsel

**Files:** Modify `apps/hub/src/modules/studio/components/cards/PhonationView.tsx`

- [ ] **Step 1: SoundHuntView (objects grid) — her nesne div'inin başına** `{obj.imageUrl && <img src={obj.imageUrl} alt={obj.name} className="mx-auto mb-1 aspect-square w-full rounded bg-white object-contain" />}` (obj.name `<p>`'sinden önce).
- [ ] **Step 2: BingoView — hücreyi yükselt + görsel:** hücre `<div>`'ini `flex-col` yap, `{cell.imageUrl && <img ... className="mb-1 h-10 w-10 object-contain" />}` ekle, `min-h-[60px]` → `min-h-[72px]`.
- [ ] **Step 3: SnakesLaddersView — hücreye küçük görsel** `{cell.imageUrl && <img ... className="h-7 w-7 object-contain" />}` (position ile word arasına).
- [ ] **Step 4: WordChainView — kelime kartına görsel** `{item.imageUrl && <img ... className="mx-auto mb-1 h-12 w-12 object-contain" />}` (word `<span>`'inden önce).
- [ ] **Step 5: SoundMazeView — hücreye görsel** `{cell.imageUrl && <img ... className="mx-auto mb-0.5 h-8 w-8 object-contain" />}` (word `<span>`'inden önce).
- [ ] **Step 6: Typecheck** → `TEMIZ`.  **Step 7: Commit** `feat(phonation): 5 aktivite tipinde görsel render`

### Task 3.5: PDF — 5 tipte görsel

**Files:** Modify `apps/hub/src/app/studio/(main)/tools/phonation/page.tsx` (her aktivite-tipi PDF bloğu)

- [ ] **Step 1: `Image` import + `reachableImage` helper + üç diziyi de ön-süz** (`gridV`, `objectsV`, `chainV` — her birinde imageUrl reachable kontrolü).
- [ ] **Step 2: Sound Hunt PDF — nesne satırına/hücresine `<Image style={{ width: 36, height: 36, objectFit: "contain" }} />`.**
- [ ] **Step 3: Bingo PDF — hücreye görsel (kelimenin üstüne, height ayarı).**
- [ ] **Step 4: Snakes & Ladders PDF — hücreye küçük görsel.**
- [ ] **Step 5: Word Chain PDF — kelime hücresine görsel.**
- [ ] **Step 6: Sound Maze PDF — hücreye görsel.**
- [ ] **Step 7: Render-kontrol** (`_pdfcheck.tsx`, bir PHONATION_ACTIVITY kartı, tercihen görseli olan; en az bir aktivite-tipini render et) → `/tmp/ph.pdf` oku → sil.
- [ ] **Step 8: Typecheck** → `1`.  **Step 9: Commit + deploy** `feat(phonation): PDF görselleri (5 tip)` + `git push origin HEAD:main`

### Task 3.6: Faz 3 doğrulama
- [ ] **Step 1: Tam tsc** → `1`.
- [ ] **Step 2: Deploy edildi.** Kullanıcı: sesletim aktivitesi üret → "Görsel üret" → aktivite tipine göre görseller → PDF.

---

## Self-Review

**1. Spec coverage:** Kullanıcı isteği = 3 araca (Ev Ödevi hariç) on-demand kredi-karşılığı "Görsel üret" butonu, görsele-değer bölüme. Faz 1 (comm-board cells), Faz 2 (matching cardA), Faz 3 (phonation grid/objects/chain) → üçü de kapsanıyor. Oturum Özeti + Haftalık Plan değerlendirmede elendi (kapsam dışı, doğru). ✓

**2. Placeholder taraması:** Endpoint'ler "social-story şablonunu kopyala + şu farklar" diyor — bu kasıtlı (DRY: 130 satırlık birebir-aynı endpoint'i 3 kez kopyalamak yerine kanıtlanmış dosyayı referans + somut diff listesi). Her diff somut (alan adı, toolType, üretici fn). UI buton+handler ortak şablonu da somut kod. "TBD/handle edge cases" yok. ✓

**3. Tip tutarlılığı:** Her araçta eklenen alanlar tutarlı: `visualPrompt?: string` (route prompt çıktısı) + `imageUrl?: string` (endpoint yazar, view/PDF okur). Endpoint `results` şekli: comm-board/matching `{index, imageUrl, cacheHit}`, phonation `{kind, index, imageUrl, cacheHit}` (çok-dizili olduğu için kind eklendi — istemci applyImages buna göre). Tutarlı. ✓

**4. Belirsizlik:** matching-game "hangi taraf görsel" → cardA (model yalnız somut cardA'da visualPrompt üretir) olarak netleştirildi. phonation çok-dizi → `kind` ayrımıyla netleştirildi. ✓

**Doğrulama gerçekçiliği:** Route/UI/PDF biriminin vitest'i yok (kod tabanı gerçeği) → tsc + PDF render-kontrol + deploy. Yeni pure-logic yok → yeni vitest yok. Bu kod tabanının kuralına uygun.
