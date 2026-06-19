# Görselli Çalışma Kâğıdı + Kalite Düzeltmeleri — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Artikülasyon sonucunu görsel-odaklı flashcard grid'e (ekran + PDF, tüm seviyeler, 3 sütun, hece/pozisyon yok) dönüştürmek ve canlıda gözlenen görsel/PDF bug'larını düzeltmek.

**Architecture:** Saf mantık düzeltmeleri `packages/ai`'de TDD (`plan.ts` boş-visualPrompt skip, `imagePrompt.ts` no-text v2). Ekranda ortak bir `FlashcardGrid` bileşeni hem tool sayfasında hem kütüphanede kullanılır (eski seviye-özel tablo view'ları kalkar). PDF `downloadArticulationPDF` flashcard grid'e geçer + her görseli güvenli sarar (bozuk URL tüm PDF'i çökertmesin). Claude SYSTEM_PROMPT'u İngilizce visualPrompt'u zorunlu kılar.

**Tech Stack:** React 19 (client), `@react-pdf/renderer`, vitest, Tailwind + `var(--poster-*)`.

**Spec:** `docs/superpowers/specs/2026-06-19-gorsel-calisma-kagidi-design.md`.

**Doğrulama:** `plan.ts` + `imagePrompt.ts` → vitest TDD. UI/PDF/prompt → manuel typecheck (`cd apps/hub && node_modules/.bin/tsc --noEmit`, yalnız pre-existing CardGeneratorForm hatası beklenir) + Claude Preview.

---

## Dosya yapısı

| Dosya | Değişiklik |
|---|---|
| `packages/ai/src/image/plan.ts` (değişir) | boş `visualPrompt` → skip `"no_visual"`; word'e düşme kaldırılır |
| `packages/ai/src/image/plan.test.ts` (değişir) | yeni davranış testleri |
| `packages/ai/src/image/imagePrompt.ts` (değişir) | no-text güçlendirme + `STYLE_VERSION` v2 |
| `packages/ai/src/image/imagePrompt.test.ts` (değişir) | v2 + no-text testleri |
| `apps/hub/src/modules/studio/components/cards/FlashcardGrid.tsx` (yeni) | ortak flashcard grid bileşeni |
| `apps/hub/src/app/studio/(main)/tools/articulation/page.tsx` (değişir) | DrillResultView → FlashcardGrid; "Çalışma Kâğıdı (PDF)" düğmesi |
| `apps/hub/src/modules/studio/components/cards/ArticulationView.tsx` (değişir) | seviye view'ları → FlashcardGrid |
| `apps/hub/src/app/studio/(main)/cards/[id]/page.tsx` (değişir) | `downloadArticulationPDF` → flashcard grid + görsel güvenli sarma |
| `apps/hub/src/app/studio/api/tools/articulation/route.ts` (değişir) | SYSTEM_PROMPT: İngilizce visualPrompt zorunlu + word-eşleşme |

---

## Task 1: `plan.ts` — boş visualPrompt → skip (TDD)

Kök neden: boş `visualPrompt` Türkçe `word`'e düşüyor (`?? word`) → model karışıyor / moderasyon reddi.

**Files:**
- Modify: `packages/ai/src/image/plan.test.ts`
- Modify: `packages/ai/src/image/plan.ts`

- [ ] **Step 1: Testleri güncelle (yeni davranış)**

`packages/ai/src/image/plan.test.ts` — mevcut `items` dizisine boş-visualPrompt item ekle ve yeni davranışı doğrula. Dosyadaki `describe`'a şu testi EKLE:
```ts
  it("boş visualPrompt'u atlar (Türkçe word'e düşmez)", () => {
    const withEmpty = [
      { word: "sandal", visualPrompt: "a sandal (footwear)" }, // 0: hedef
      { word: "vücut", visualPrompt: "" },                      // 1: boş → skip
      { word: "kuş", visualPrompt: "a bird" },                  // 2: hedef
    ];
    const plan = planImageGeneration(withEmpty);
    expect(plan.targets).toEqual([
      { index: 0, word: "sandal", visualPrompt: "a sandal (footwear)" },
      { index: 2, word: "kuş", visualPrompt: "a bird" },
    ]);
    expect(plan.skipped).toEqual([{ index: 1, reason: "no_visual" }]);
  });
```
Ayrıca mevcut "index verilmezse uygun tüm item'ları hedefler" testindeki item 2 (`{ word: "kuş" }`, visualPrompt yok) artık **target değil skip** olacak — o testi güncelle: `kuş` (visualPrompt yok) artık `skipped: { index: 2, reason: "no_visual" }`, ve targets'tan çıkar. Düzeltilmiş beklenti:
```ts
  it("index verilmezse yalnız visualPrompt'u olan item'ları hedefler", () => {
    const plan = planImageGeneration(items);
    expect(plan.targets).toEqual([
      { index: 0, word: "sandal", visualPrompt: "a sandal (footwear)" },
    ]);
    expect(plan.skipped).toEqual([
      { index: 1, reason: "already_has_image" },
      { index: 2, reason: "no_visual" },
      { index: 3, reason: "no_word" },
    ]);
  });
```

- [ ] **Step 2: Testi çalıştır, kırmızı gör**

Run: `pnpm --filter @ludenlab/ai test plan`
Expected: FAIL (eski kod `kuş`'u word'e düşürüp target yapıyor; `no_visual` reason yok).

- [ ] **Step 3: Implementasyon**

`packages/ai/src/image/plan.ts` — `SkippedItem.reason` union'ına `"no_visual"` ekle ve fallback'i kaldır. `for` döngüsünü şu hale getir (word check'ten sonra visualPrompt check ekle, fallback kaldır):
```ts
export interface SkippedItem {
  index: number;
  reason: "out_of_range" | "already_has_image" | "no_word" | "no_visual";
}
```
ve döngü içi (mevcut `if (!item.word)` bloğundan sonra):
```ts
    if (!item.word) {
      skipped.push({ index, reason: "no_word" });
      continue;
    }
    const vp = item.visualPrompt?.trim();
    if (!vp) {
      skipped.push({ index, reason: "no_visual" });
      continue;
    }
    targets.push({ index, word: item.word, visualPrompt: vp });
```
(Eski `visualPrompt: item.visualPrompt ?? item.word` fallback'i SİL.)

- [ ] **Step 4: Yeşil gör**

Run: `pnpm --filter @ludenlab/ai test plan`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add packages/ai/src/image/plan.ts packages/ai/src/image/plan.test.ts
git commit -m "fix(ai/image): boş visualPrompt → skip (Türkçe word'e düşme kaldırıldı)"
```

### Task 1 bağlamı
- Çalışma dizini: `/Users/recepkucuk/ludenlab/.claude/worktrees/amazing-cartwright-cc4d66`. Worktree, branch `claude/amazing-cartwright-cc4d66`, NOT main.
- `plan.ts` şu an: `targets.push({ index, word, visualPrompt: item.visualPrompt ?? item.word })`. Yeni: boş/whitespace visualPrompt → `no_visual` skip.

---

## Task 2: `imagePrompt.ts` — no-text v2 (TDD)

**Files:**
- Modify: `packages/ai/src/image/imagePrompt.test.ts`
- Modify: `packages/ai/src/image/imagePrompt.ts`

- [ ] **Step 1: Testleri güncelle**

`imagePrompt.test.ts` — STYLE_VERSION v2 + güçlendirilmiş no-text bekle:
```ts
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
```
(Mevcut "STYLE_VERSION dışa açıktır" testi varsa onu bu yeni `v2` testiyle değiştir; mevcut "özneyi gömer" / "trim" testleri kalır.)

- [ ] **Step 2: Kırmızı gör**

Run: `pnpm --filter @ludenlab/ai test imagePrompt`
Expected: FAIL (STYLE_VERSION "v1"; "no letters/words/labels" yok).

- [ ] **Step 3: Implementasyon**

`imagePrompt.ts`:
```ts
export const STYLE_VERSION = "v2";

export function buildImagePrompt(subject: string): string {
  const s = subject.trim();
  // DİKKAT: Bu metni değiştirirsen STYLE_VERSION'ı artır — yoksa cache stale kalır.
  return (
    `Simple friendly flat illustration of a single ${s}, ` +
    `centered, plain white background, bright cheerful colors, ` +
    `clear recognizable shape, children's educational flashcard style, ` +
    `no text, no letters, no words, no labels, no writing on the object.`
  );
}
```

- [ ] **Step 4: Yeşil gör**

Run: `pnpm --filter @ludenlab/ai test imagePrompt`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add packages/ai/src/image/imagePrompt.ts packages/ai/src/image/imagePrompt.test.ts
git commit -m "fix(ai/image): no-text güçlendirme + STYLE_VERSION v2"
```

---

## Task 3: SYSTEM_PROMPT — İngilizce visualPrompt zorunlu + word eşleşme

**Files:**
- Modify: `apps/hub/src/app/studio/api/tools/articulation/route.ts`

- [ ] **Step 1: visualPrompt kurallarını güncelle**

`route.ts` SYSTEM_PROMPT içindeki mevcut "ÖNEMLİ — items[] içindeki "visualPrompt" alanı" bloğunu şununla DEĞİŞTİR:
```
ÖNEMLİ — items[] içindeki "visualPrompt" alanı (görsel üretimi için):
- visualPrompt İNGİLİZCE yazılmalı (görsel üretim modeli İngilizce'de daha isabetli).
- visualPrompt, "word" ile BİREBİR AYNI nesneyi betimlemeli. Alakasız bir nesne YAZMA
  (ör. "top" için "a flower" yazma — "top" için "a ball" yaz).
- Tek, net, somut bir nesne betimle. Belirsizlik varsa parantezle netleştir:
  "sandal" → "a sandal (footwear)" veya bağlama göre "a small rowing boat".
- Kelime SOMUT bir nesneyse visualPrompt'u MUTLAKA doldur (boş bırakma).
- Yalnız GERÇEKTEN görselleştirilemeyen soyut kelimelerde (ör. "sevgi", "hız") visualPrompt'u boş bırak ("").
- Stil betimleme (renk, arka plan) YAZMA — stil sistem tarafından eklenir.
```

- [ ] **Step 2: typecheck**

Run: `cd /Users/recepkucuk/ludenlab/.claude/worktrees/amazing-cartwright-cc4d66/apps/hub && node_modules/.bin/tsc --noEmit`
Expected: yalnız pre-existing `CardGeneratorForm.tsx` hatası.

- [ ] **Step 3: Commit**
```bash
git add apps/hub/src/app/studio/api/tools/articulation/route.ts
git commit -m "fix(studio/artikulasyon): SYSTEM_PROMPT — İngilizce visualPrompt zorunlu + word eşleşme"
```

### Task 3 bağlamı
- Yalnız `SYSTEM_PROMPT` string'ini düzenle; handler config'e dokunma. `apps/hub` typecheck'te 1 pre-existing hata (CardGeneratorForm) var — senin işin değil.

---

## Task 4: `FlashcardGrid` ortak bileşeni

Hem tool sayfası hem kütüphanenin kullanacağı tek grid. Görsel + kelime (hedef ses vurgulu); opsiyonel cümle; opsiyonel "+ görsel" düğmesi (tool page).

**Files:**
- Create: `apps/hub/src/modules/studio/components/cards/FlashcardGrid.tsx`

- [ ] **Step 1: Bileşeni yaz**

`apps/hub/src/modules/studio/components/cards/FlashcardGrid.tsx`:
```tsx
"use client";

export interface FlashcardItem {
  word?: string;
  sentence?: string;
  imageUrl?: string;
}

function highlightSound(text: string, sounds: string[]) {
  if (!sounds.length) return <>{text}</>;
  const letters = sounds.map((s) => s.replace(/\//g, "")).filter(Boolean);
  if (!letters.length) return <>{text}</>;
  const pattern = new RegExp(
    `(${letters.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <span key={i} className="font-extrabold text-[var(--poster-accent)]">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function FlashcardGrid({
  items,
  sounds,
  showSentence = false,
  cardId = null,
  onAddImage,
  busy = false,
}: {
  items: FlashcardItem[];
  sounds: string[];
  showSentence?: boolean;
  cardId?: string | null;
  onAddImage?: (index: number) => void;
  busy?: boolean;
}) {
  const canAdd = !!onAddImage && !!cardId;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex flex-col items-center rounded-xl border-2 border-[var(--poster-ink)] bg-white p-3 text-center shadow-[0_2px_0_var(--poster-ink)]"
        >
          <div className="flex h-28 w-28 items-center justify-center">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.word ?? ""} className="h-28 w-28 object-contain" />
            ) : canAdd ? (
              <button
                type="button"
                onClick={() => onAddImage!(i)}
                disabled={busy}
                className="rounded-lg border-2 border-dashed border-[var(--poster-ink-faint)] px-3 py-2 text-xs font-bold text-[var(--poster-ink-3)] disabled:opacity-50"
              >
                + görsel
              </button>
            ) : (
              <span className="text-2xl text-[var(--poster-ink-faint)]">—</span>
            )}
          </div>
          <p className="mt-2 text-lg font-bold text-[var(--poster-ink)]">
            {highlightSound(item.word ?? "", sounds)}
          </p>
          {showSentence && item.sentence && (
            <p className="mt-1 text-xs leading-snug text-[var(--poster-ink-2)]">
              {highlightSound(item.sentence, sounds)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: typecheck**

Run: `cd /Users/recepkucuk/ludenlab/.claude/worktrees/amazing-cartwright-cc4d66/apps/hub && node_modules/.bin/tsc --noEmit`
Expected: yalnız pre-existing CardGeneratorForm hatası.

- [ ] **Step 3: Commit**
```bash
git add apps/hub/src/modules/studio/components/cards/FlashcardGrid.tsx
git commit -m "feat(studio/artikulasyon): FlashcardGrid ortak bileşeni"
```

### Task 4 bağlamı
- `var(--poster-*)` CSS değişkenleri global (Studio teması). Tailwind class formu (`text-[var(--poster-ink)]`) projede yaygın.
- `highlightSound` mantığı mevcut `ArticulationView.tsx`/`page.tsx`'ten birebir uyarlandı.

---

## Task 5: Tool sayfası — DrillResultView → FlashcardGrid + PDF düğmesi

**Files:**
- Modify: `apps/hub/src/app/studio/(main)/tools/articulation/page.tsx`

- [ ] **Step 1: FlashcardGrid'i import et ve DrillResultView'ı sadeleştir**

Üstte import ekle:
```ts
import { FlashcardGrid } from "@studio/components/cards/FlashcardGrid";
```
`DrillResultView` içindeki seviye-switch'i (`IsolatedView`/`SyllableView`/`WordView`/`SentenceView`/`ContextualView` çağrıları) TEK FlashcardGrid ile değiştir. `DrillResultView`'ın render gövdesindeki o blok şu olsun:
```tsx
      <div>
        <FlashcardGrid
          items={drill.items}
          sounds={sounds}
          showSentence={drill.level === "sentence" || drill.level === "contextual"}
          cardId={cardId}
          onAddImage={(i) => cardId && onAddImage(i)}
          busy={imagesBusy}
        />
      </div>
```
Artık kullanılmayan lokal view bileşenlerini (`IsolatedView`, `SyllableView`, `WordView`, `SentenceView`, `ContextualView`, `ItemImageCell`) ve onların `highlightSound` kopyasını SİL (FlashcardGrid kendi içinde barındırıyor). `DrillResultView`'ın imzası mevcut `{ drill, cardId, onAddImage, imagesBusy }` ile aynı kalır.

- [ ] **Step 2: "Çalışma Kâğıdı (PDF)" düğmesi**

Sonuç kartındaki "Sonraki adım" buton grubuna (Kütüphaneye Git / Yeni Üret yanına) bir PDF düğmesi ekle. Üstte import:
```ts
import { downloadArticulationWorksheetPDF } from "@studio/components/cards/articulationWorksheetPdf";
```
ve buton (savedCardId varken, drill state'ini geçir):
```tsx
          {savedCardId && (
            <PBtn as="button" variant="white" size="md"
              onClick={() => downloadArticulationWorksheetPDF({ title: drill!.title, targetSounds: drill!.targetSounds, positions: drill!.positions, level: drill!.level, items: drill!.items })}
              style={{ flex: 1, minWidth: 140 }}>
              Çalışma Kâğıdı (PDF)
            </PBtn>
          )}
```
(Bu yardımcı Task 7'de oluşturulacak — paylaşılan PDF fonksiyonu.)

- [ ] **Step 3: typecheck**

Run: `cd .../apps/hub && node_modules/.bin/tsc --noEmit`
Expected: yalnız pre-existing CardGeneratorForm hatası. (Task 7 henüz yapılmadıysa `articulationWorksheetPdf` import'u kırılır — Task 7 ile birlikte değerlendir; bu task'ı Task 7'den SONRA commit etmek istersen Step 2'yi Task 7 sonrası ekle.)

- [ ] **Step 4: Commit**
```bash
git add "apps/hub/src/app/studio/(main)/tools/articulation/page.tsx"
git commit -m "feat(studio/artikulasyon): tool page flashcard grid + Çalışma Kâğıdı PDF düğmesi"
```

### Task 5 bağlamı
- `drill.items` tipi `DrillItem[]` (word/sentence/visualPrompt/imageUrl). `FlashcardItem` bunun alt kümesiyle uyumlu (word/sentence/imageUrl).
- `onAddImage`/`imagesBusy` zaten DrillResultView prop'larında var (Faz 4); FlashcardGrid'e geçiriliyor.
- SIRA NOTU: Task 7 (PDF yardımcısı) bu task'ın PDF import'u için gereklidir; uygulayıcı Task 7'yi Task 5'in PDF düğmesinden önce yapabilir.

---

## Task 6: Kütüphane — ArticulationView → FlashcardGrid

**Files:**
- Modify: `apps/hub/src/modules/studio/components/cards/ArticulationView.tsx`

- [ ] **Step 1: Seviye view'larını FlashcardGrid ile değiştir**

`ArticulationView.tsx`'te seviye-switch (`IsolatedView`/`SyllableView`/`WordView`/`SentenceView`/`ContextualView`) yerine FlashcardGrid kullan. Import:
```ts
import { FlashcardGrid } from "./FlashcardGrid";
```
Render gövdesindeki seviye bloğunu:
```tsx
      <div>
        <FlashcardGrid
          items={drill.items}
          sounds={sounds}
          showSentence={drill.level === "sentence" || drill.level === "contextual"}
        />
      </div>
```
(Salt-okunur: `onAddImage`/`cardId` verilmez → görseli olmayan kartlar "—" gösterir.) Kullanılmayan lokal view bileşenlerini + `highlightSound` kopyasını SİL. Cue/expertNotes/homeGuidance blokları kalır.

- [ ] **Step 2: typecheck + Commit**

Run: `cd .../apps/hub && node_modules/.bin/tsc --noEmit` → yalnız pre-existing hata.
```bash
git add apps/hub/src/modules/studio/components/cards/ArticulationView.tsx
git commit -m "feat(studio/artikulasyon): kütüphane görünümü flashcard grid"
```

---

## Task 7: Çalışma Kâğıdı PDF (flashcard grid + görsel güvenli sarma)

Mevcut `downloadArticulationPDF` (cards/[id]) tablo + bozuk-görsel-çökertir. Yeni: paylaşılan bir yardımcı modül; flashcard grid; her görsel güvenli (yüklenemezse o kart görselsiz, PDF üretilir).

**Files:**
- Create: `apps/hub/src/modules/studio/components/cards/articulationWorksheetPdf.tsx`
- Modify: `apps/hub/src/app/studio/(main)/cards/[id]/page.tsx`

- [ ] **Step 1: Paylaşılan PDF yardımcısını yaz**

`apps/hub/src/modules/studio/components/cards/articulationWorksheetPdf.tsx`:
```tsx
export interface WorksheetContent {
  title: string;
  targetSounds?: string[];
  positions?: string[];
  level?: string;
  items: Array<{ word?: string; sentence?: string; imageUrl?: string }>;
}

// react-pdf Image bozuk URL'de tüm render'ı çökertir → önce HEAD ile erişilebilir URL'leri süz.
async function reachable(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "GET", mode: "cors" });
    return r.ok;
  } catch {
    return false;
  }
}

export async function downloadArticulationWorksheetPDF(content: WorksheetContent) {
  const { pdf, Document, Page, Text, View, Image, StyleSheet, Font } = await import("@react-pdf/renderer");

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`, fontWeight: "bold" },
    ],
  });

  // Görselleri önceden doğrula; erişilemeyenleri imageUrl'siz bırak (PDF çökmesin).
  const items = await Promise.all(
    content.items.map(async (it) => ({
      ...it,
      imageUrl: it.imageUrl && (await reachable(it.imageUrl)) ? it.imageUrl : undefined,
    })),
  );

  const showSentence = content.level === "sentence" || content.level === "contextual";

  const styles = StyleSheet.create({
    page: { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 32, backgroundColor: "#fff" },
    title: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 12 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    card: { width: "31%", borderWidth: 2, borderColor: "#18181b", borderRadius: 10, padding: 8, alignItems: "center" },
    img: { width: 96, height: 96, objectFit: "contain", marginBottom: 6 },
    imgEmpty: { width: 96, height: 96, marginBottom: 6 },
    word: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 14, color: "#18181b", textAlign: "center" },
    sentence: { fontFamily: "NotoSans", fontSize: 8, color: "#52525b", textAlign: "center", marginTop: 3 },
  });

  const Doc = () => (
    <Document title={content.title} author="LudenLab">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{content.title}</Text>
        <View style={styles.grid}>
          {items.map((it, i) => (
            <View key={i} style={styles.card}>
              {it.imageUrl ? (
                <Image src={it.imageUrl} style={styles.img} />
              ) : (
                <View style={styles.imgEmpty} />
              )}
              <Text style={styles.word}>{it.word ?? ""}</Text>
              {showSentence && it.sentence ? <Text style={styles.sentence}>{it.sentence}</Text> : null}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${content.title.replace(/\s+/g, "_")}_calisma_kagidi.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Kütüphane kart detayını yeni yardımcıya bağla**

`cards/[id]/page.tsx`'te eski `downloadArticulationPDF` çağrısını yeni yardımcıyla değiştir. Üstte import:
```ts
import { downloadArticulationWorksheetPDF } from "@studio/components/cards/articulationWorksheetPdf";
```
`handleDownloadPDF`'teki `ARTICULATION_DRILL` dalında:
```ts
} else if (tt === "ARTICULATION_DRILL") {
  const c = card.content as unknown as { title: string; targetSounds?: string[]; positions?: string[]; level?: string; items: Array<{ word?: string; sentence?: string; imageUrl?: string }> };
  await downloadArticulationWorksheetPDF({ title: card.title, targetSounds: c.targetSounds, positions: c.positions, level: c.level, items: c.items ?? [] });
}
```
Eski lokal `downloadArticulationPDF` fonksiyonunu (satır ~133-216) SİL (artık paylaşılan yardımcı kullanılıyor).

- [ ] **Step 3: typecheck**

Run: `cd .../apps/hub && node_modules/.bin/tsc --noEmit`
Expected: yalnız pre-existing CardGeneratorForm hatası.

- [ ] **Step 4: Commit**
```bash
git add apps/hub/src/modules/studio/components/cards/articulationWorksheetPdf.tsx "apps/hub/src/app/studio/(main)/cards/[id]/page.tsx"
git commit -m "fix(studio/artikulasyon): çalışma kâğıdı PDF (flashcard grid + görsel güvenli sarma)"
```

### Task 7 bağlamı
- `reachable()` her görseli üretimden önce GET ile dener; CORS/404 olanları eler → react-pdf yalnız geçerli URL'lerle render → çökme yok. (Supabase public bucket CORS açık; erişilemeyen nadir görsel elenir.)
- Paylaşılan yardımcı sayesinde tool page (Task 5) ve kütüphane aynı PDF'i üretir.

---

## Task 8: Bütünsel doğrulama

- [ ] **Step 1: ai testleri + typecheck**

Run:
```bash
pnpm --filter @ludenlab/ai test && pnpm --filter @ludenlab/ai typecheck
cd /Users/recepkucuk/ludenlab/.claude/worktrees/amazing-cartwright-cc4d66/apps/hub && node_modules/.bin/tsc --noEmit
```
Expected: `@ludenlab/ai` tüm testler geçer + typecheck temiz; hub typecheck YALNIZ pre-existing `CardGeneratorForm.tsx` hatasını gösterir (FlashcardGrid/PDF/prompt dosyalarından sıfır yeni hata).

- [ ] **Step 2: Claude Preview**

`preview_start` → artikülasyon sonucu flashcard grid mi, "Çalışma Kâğıdı (PDF)" düğmesi var mı; kütüphane kart detayı grid mi. `preview_screenshot`. (Gerçek görsel/PDF için canlı/key gerekir.)

- [ ] **Step 3: (commit gerekmez)**

---

## Tamamlanma kriteri
- Artikülasyon sonucu + kütüphane: flashcard grid (görsel+kelime, hedef ses vurgulu, 3 sütun, hece/pozisyon yok, tüm seviyeler).
- Tool sayfasında "Çalışma Kâğıdı (PDF)" düğmesi; PDF flashcard grid; bozuk görsel PDF'i çökertmez.
- Boş visualPrompt artık Türkçe kelimeye düşmüyor (skip); no-text v2; Claude İngilizce visualPrompt zorunlu + word eşleşme.
- ai testleri yeşil; hub typecheck yalnız pre-existing hata.

## Açık notlar
- Gerçek görsel kalite iyileşmesi (no-text v2, fallback) ancak yeni üretimde gözlenir (eski v1 cache stale).
- Cümle seviyesi kartında uzun cümle taşabilir → küçük font + wrap ile sınırlandı; sorun olursa cümleyi karta sığacak şekilde kısalt (sonraki iterasyon).
