# Artikülasyon Küratе Kelime Bankası — Implementasyon Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Artikülasyon kelime düzeyi alıştırmalarını AI-üretimi yerine uzman-onaylı küratе kelime bankasından besle; uydurma/soyut/yanlış-ses kelimeleri ve sayı tutarsızlığını deterministik olarak ortadan kaldır.

**Architecture:** `packages/ai/src/articulation` altında saf bir kelime bankası (veri) + `selectWords` seçicisi. Artikülasyon endpoint'i banka-içi sesler + uygun seviyelerde Claude yerine bankayı kullanır (kelime düzeyi tamamen bankadan; cümle/bağlam kelime bankadan + Claude cümle yazar). Seçim `buildUserPrompt`'ta yapılıp `data` üzerinde saklanır, `enrichContent`'te tüketilir. Banka-dışı sesler mevcut AI yolunda kalır. Tema tamamen kaldırılır.

**Tech Stack:** TypeScript, vitest (packages/ai), Next.js App Router (apps/hub), Zod, createToolHandler.

**Kapsam notu:** Bu plan **makineyi** (kod) kurar ve `/d/` için küçük bir onaylı tohum bankasıyla uçtan uca çalışır hale getirir. **Tam içerik doldurma** (9 ses × 3 pozisyon × ≥30 kelime) ayrı, interaktif bir süreçtir (Bölüm "İçerik Doldurma" — ben üretirim, kullanıcı onaylar, commit). Makine yokken bile araç banka-dışı AI yoluyla çalışır.

Spec: `docs/superpowers/specs/2026-06-21-artikulasyon-kelime-bankasi-design.md`

---

## Dosya Yapısı

| Dosya | Sorumluluk |
|---|---|
| `packages/ai/src/articulation/types.ts` | `BankWord`, `Position`, `SelectedWord` tipleri |
| `packages/ai/src/articulation/wordBank.ts` | `WORD_BANK` verisi (onaylı kelimeler) + `soundToLetter` |
| `packages/ai/src/articulation/selectWords.ts` | `selectWords` saf seçici |
| `packages/ai/src/articulation/*.test.ts` | selectWords + banka-bütünlük testleri |
| `packages/ai/src/index.ts` | barrel: `articulation` namespace export |
| `apps/hub/.../api/tools/articulation/route.ts` | tema kaldır; banka entegrasyonu |
| `apps/hub/.../tools/articulation/page.tsx` | tema UI/state kaldır; görsel hata mesajı |

---

## Task 1: Banka tipleri + soundToLetter (saf, TDD)

**Files:**
- Create: `packages/ai/src/articulation/types.ts`
- Create: `packages/ai/src/articulation/wordBank.ts` (şimdilik sadece `soundToLetter` + boş `WORD_BANK`)
- Test: `packages/ai/src/articulation/soundToLetter.test.ts`

- [ ] **Step 1: Failing test yaz**

`packages/ai/src/articulation/soundToLetter.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { soundToLetter } from "./wordBank";

describe("soundToLetter", () => {
  it("/k/ → k", () => expect(soundToLetter("/k/")).toBe("k"));
  it("/ş/ → ş (Türkçe küçük harf korunur)", () => expect(soundToLetter("/Ş/")).toBe("ş"));
  it("slash'sız da çalışır", () => expect(soundToLetter("z")).toBe("z"));
  it("boşlukları kırpar", () => expect(soundToLetter(" /r/ ")).toBe("r"));
});
```

- [ ] **Step 2: Test'i çalıştır, fail gör**

Run: `pnpm --filter @ludenlab/ai test soundToLetter`
Expected: FAIL — "soundToLetter is not a function" / modül yok.

- [ ] **Step 3: Tipleri + soundToLetter'ı yaz**

`packages/ai/src/articulation/types.ts`:
```ts
export type Position = "initial" | "medial" | "final";

export interface BankWord {
  /** Gerçek Türkçe kelime, ör. "dolap" */
  word: string;
  /** Hece bölünmesi, ör. "do-lap" */
  syllableBreak: string;
  /** İngilizce, tek somut nesne, ör. "a wooden wardrobe cabinet" */
  visualPrompt: string;
}

export interface SelectedWord extends BankWord {
  position: Position;
  /** syllableBreak'ten türetilir (tire sayısı + 1) */
  syllableCount: number;
}

/** Ses (harf) → pozisyon → kelime listesi */
export type WordBank = Record<string, Record<Position, BankWord[]>>;
```

`packages/ai/src/articulation/wordBank.ts`:
```ts
import type { WordBank } from "./types";

/** "/k/" | "k" | " /Ş/ " → "k" / "ş" (Türkçe küçük harf, slash/boşluk temizlenir). */
export function soundToLetter(sound: string): string {
  return sound.replace(/\//g, "").trim().toLocaleLowerCase("tr-TR");
}

/**
 * Uzman-onaylı kelime bankası. Anahtar = sesin sade harfi ("k","g","r","l","y","s","ş","z","d").
 * Kapsam ve doldurma için bkz. plan "İçerik Doldurma" bölümü.
 */
export const WORD_BANK: WordBank = {};
```

- [ ] **Step 4: Test'i çalıştır, pass gör**

Run: `pnpm --filter @ludenlab/ai test soundToLetter`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**
```bash
git add packages/ai/src/articulation/types.ts packages/ai/src/articulation/wordBank.ts packages/ai/src/articulation/soundToLetter.test.ts
git commit -m "feat(ai/articulation): banka tipleri + soundToLetter (TDD)"
```

---

## Task 2: selectWords seçici (saf, TDD)

**Files:**
- Create: `packages/ai/src/articulation/selectWords.ts`
- Test: `packages/ai/src/articulation/selectWords.test.ts`

- [ ] **Step 1: Failing test yaz**

`packages/ai/src/articulation/selectWords.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { selectWords } from "./selectWords";
import type { WordBank } from "./types";

const w = (word: string) => ({ word, syllableBreak: word, visualPrompt: "x" });
const BANK: WordBank = {
  k: {
    initial: [w("kalem"), w("kedi"), w("kapı")],
    medial: [w("makas"), w("bakar")],
    final: [w("ekmek")],
  },
};
// Deterministik rng: her zaman 0 → ilk elemanı seçer
const rng0 = () => 0;

describe("selectWords", () => {
  it("seçilen pozisyonların birleşiminden en fazla `count` kelime döner", () => {
    const r = selectWords(BANK, "k", ["initial", "medial"], 3, rng0);
    expect(r).toHaveLength(3);
    for (const it of r) expect(it.word).toBeTypeOf("string");
  });

  it("tekrarsızdır (aynı kelime iki kez gelmez)", () => {
    const r = selectWords(BANK, "k", ["initial", "medial", "final"], 6);
    const words = r.map((x) => x.word);
    expect(new Set(words).size).toBe(words.length);
  });

  it("mevcut kelimeden fazlası istenince var olan kadarını döner", () => {
    const r = selectWords(BANK, "k", ["final"], 10);
    expect(r).toHaveLength(1); // final'de 1 kelime var
    expect(r[0]!.word).toBe("ekmek");
    expect(r[0]!.position).toBe("final");
  });

  it("syllableCount'u syllableBreak'ten türetir", () => {
    const bank: WordBank = { d: { initial: [{ word: "dolap", syllableBreak: "do-lap", visualPrompt: "x" }], medial: [], final: [] } };
    const r = selectWords(bank, "d", ["initial"], 1);
    expect(r[0]!.syllableCount).toBe(2);
  });

  it("banka-dışı ses için boş döner", () => {
    expect(selectWords(BANK, "z", ["initial"], 5)).toEqual([]);
  });
});
```

- [ ] **Step 2: Test'i çalıştır, fail gör**

Run: `pnpm --filter @ludenlab/ai test selectWords`
Expected: FAIL — modül yok.

- [ ] **Step 3: selectWords'ü yaz**

`packages/ai/src/articulation/selectWords.ts`:
```ts
import type { WordBank, Position, SelectedWord } from "./types";

function syllableCountOf(syllableBreak: string): number {
  return syllableBreak.split("-").length;
}

/**
 * Bankadan, seçilen pozisyonların birleşiminden rastgele + tekrarsız en fazla `count` kelime seçer.
 * `rng` enjekte edilebilir (test); [0,1) döndürmeli. Mevcut < count ise hepsini döner.
 */
export function selectWords(
  bank: WordBank,
  sound: string,
  positions: Position[],
  count: number,
  rng: () => number = Math.random,
): SelectedWord[] {
  const perSound = bank[sound];
  if (!perSound) return [];

  // Pozisyon birleşimini düzleştir (pozisyon bilgisi korunur)
  const pool: SelectedWord[] = [];
  for (const pos of positions) {
    for (const bw of perSound[pos] ?? []) {
      pool.push({ ...bw, position: pos, syllableCount: syllableCountOf(bw.syllableBreak) });
    }
  }

  // Fisher–Yates (rng enjekte) ile karıştır, ilk `count`'u al
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, Math.max(0, count));
}
```

- [ ] **Step 4: Test'i çalıştır, pass gör**

Run: `pnpm --filter @ludenlab/ai test selectWords`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**
```bash
git add packages/ai/src/articulation/selectWords.ts packages/ai/src/articulation/selectWords.test.ts
git commit -m "feat(ai/articulation): selectWords seçici (saf, TDD)"
```

---

## Task 3: Banka-bütünlük testi + barrel export

**Files:**
- Create: `packages/ai/src/articulation/bankIntegrity.test.ts`
- Modify: `packages/ai/src/index.ts`

- [ ] **Step 1: Bütünlük testini yaz**

`packages/ai/src/articulation/bankIntegrity.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { WORD_BANK } from "./wordBank";

describe("WORD_BANK bütünlüğü", () => {
  for (const [sound, positions] of Object.entries(WORD_BANK)) {
    for (const [pos, words] of Object.entries(positions)) {
      for (const w of words) {
        it(`${sound}/${pos} "${w.word}": hedef harfi içerir + alanlar dolu`, () => {
          expect(w.word.toLocaleLowerCase("tr-TR")).toContain(sound);
          expect(w.syllableBreak.replace(/-/g, "")).toBe(w.word);
          expect(w.visualPrompt.trim().length).toBeGreaterThan(0);
        });
      }
    }
  }
  it("en az bir test çalışsın (boş bankada da geçer)", () => expect(true).toBe(true));
});
```
> Not: Banka boşken bu dosya yalnız son testi çalıştırır (geçer). Kelime eklendikçe her kelime otomatik denetlenir.

- [ ] **Step 2: Test'i çalıştır**

Run: `pnpm --filter @ludenlab/ai test bankIntegrity`
Expected: PASS (banka boş → 1 test).

- [ ] **Step 3: Barrel export ekle**

`packages/ai/src/index.ts` içine ekle (mevcut `image` export deseniyle aynı):
```ts
export * as articulation from "./articulation";
```
Ve `packages/ai/src/articulation/index.ts` oluştur:
```ts
export * from "./types";
export * from "./wordBank";
export * from "./selectWords";
```

- [ ] **Step 4: Tüm ai testlerini + barrel'ı doğrula**

Run: `pnpm --filter @ludenlab/ai test 2>&1 | grep -E "Test Files|Tests"`
Expected: tüm test dosyaları geçer (yeni 3 + mevcutlar).

- [ ] **Step 5: Commit**
```bash
git add packages/ai/src/articulation/index.ts packages/ai/src/articulation/bankIntegrity.test.ts packages/ai/src/index.ts
git commit -m "feat(ai/articulation): bütünlük testi + barrel export"
```

---

## Task 4: Tema'yı tamamen kaldır

**Files:**
- Modify: `apps/hub/src/app/studio/api/tools/articulation/route.ts` (bodySchema, buildUserPrompt, enrichContent)
- Modify: `apps/hub/src/app/studio/(main)/tools/articulation/page.tsx` (theme state + UI)

- [ ] **Step 1: route.ts'ten tema'yı sök**

`route.ts`:
- bodySchema'dan `theme: z.string().optional(),` satırını SİL.
- `buildUserPrompt` içindeki theme satırını SİL:
  ```ts
  ${data.theme && data.theme !== "none" ? `- Tema: ${data.theme}` : "- Tema: Karışık (tema yok)"}
  ```
- `enrichContent` içindeki `if (data.theme && data.theme !== "none") content.theme = data.theme;` satırını SİL. (enrichContent içindeki hedef-harf filtresi şimdilik KALSIN — Task 6'da banka-dışı yol için güvence.)

- [ ] **Step 2: page.tsx'ten tema UI'ını sök**

`page.tsx`:
- `const [theme, setTheme] = useState…` state'ini SİL.
- POST body'sindeki `theme: theme === "none" ? undefined : theme,` satırını SİL.
- handleReset içindeki `setTheme("none");` satırını SİL.
- Tema seçim `<select>`/dropdown JSX bloğunu SİL.
- "Tema" ile ilgili label/yardımcı sabitleri (varsa) SİL.

- [ ] **Step 3: Typecheck**

Run: `cd apps/hub && node_modules/.bin/tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `1` (yalnız pre-existing CardGeneratorForm). Tema kaynaklı yeni hata olmamalı.

- [ ] **Step 4: Commit**
```bash
git add "apps/hub/src/app/studio/api/tools/articulation/route.ts" "apps/hub/src/app/studio/(main)/tools/articulation/page.tsx"
git commit -m "feat(studio/artikulasyon): tema seçeneği tamamen kaldırıldı"
```

---

## Task 5: Banka entegrasyonu — kelime düzeyi enjeksiyonu

**Files:**
- Modify: `apps/hub/src/app/studio/api/tools/articulation/route.ts`

**Bağlam:** `createToolHandler` akışı: `buildUserPrompt(data,…)` → Claude → `enrichContent(content, data)`. Seçimi `buildUserPrompt`'ta yapıp `data` üzerinde saklayacağız, `enrichContent`'te tüketeceğiz. Banka-içi = (tam 1 hedef ses) ve `soundToLetter`'ı `WORD_BANK`'te var ve o ses için seçilen pozisyonlarda kelime var.

- [ ] **Step 1: Yardımcıları ve stash tipini ekle (route.ts üstüne)**

```ts
import { articulation } from "@ludenlab/ai";

type BankStash = { __bankWords?: articulation.SelectedWord[] };

/** Banka-içi mi + uygulanabilir mi? Tam 1 hedef ses ve bankada o ses varsa, seçili kelimeleri döner; yoksa null. */
function pickBankWords(data: {
  targetSounds: string[];
  positions: ("initial" | "medial" | "final")[];
  itemCount: number;
  level: string;
}): articulation.SelectedWord[] | null {
  if (data.targetSounds.length !== 1) return null;
  const letter = articulation.soundToLetter(data.targetSounds[0]!);
  if (!articulation.WORD_BANK[letter]) return null;
  if (!["word", "sentence", "contextual"].includes(data.level)) return null;
  const picked = articulation.selectWords(articulation.WORD_BANK, letter, data.positions, data.itemCount);
  return picked.length > 0 ? picked : null;
}
```

- [ ] **Step 2: buildUserPrompt'ta seç + sakla + (kelime düzeyi) Claude'a item üretme**

`buildUserPrompt(data, student, ageText)` başına ekle:
```ts
const bankWords = pickBankWords(data);
if (bankWords) {
  (data as typeof data & BankStash).__bankWords = bankWords;
}
```
Ve prompt'un sonuna, banka varsa, seviyeye göre yönerge ekle:
```ts
${bankWords ? (
  data.level === "word"
    ? `\nÖNEMLİ: items[] ÜRETME — kelimeler sistem tarafından sabit listeden eklenecek. Yalnız title, expertNotes, cueTypes, homeGuidance alanlarını doldur, "items": [] bırak.`
    : `\nÖNEMLİ: SADECE şu kelimeleri AYNI SIRADA kullan, başka kelime EKLEME/DEĞİŞTİRME: ${bankWords.map((w) => w.word).join(", ")}. Her kelime için items[] içinde bir öğe oluştur.`
) : ""}
```

- [ ] **Step 3: enrichContent'te enjekte et**

`enrichContent(content, data)` içine, mevcut hedef-harf filtresinden ÖNCE ekle:
```ts
const stash = (data as typeof data & BankStash).__bankWords;
if (stash) {
  if (data.level === "word") {
    // Kelime düzeyi: item'ları tamamen bankadan kur (Claude'unkini yok say).
    content.items = stash.map((w) => ({
      word: w.word,
      syllableCount: w.syllableCount,
      syllableBreak: w.syllableBreak,
      position: w.position,
      targetSound: data.targetSounds[0],
      visualPrompt: w.visualPrompt,
    }));
  } else {
    // Cümle/bağlam: Claude'un cümlesini koru, kelime/hece/görsel'i bankadan otoriter yaz.
    const items = Array.isArray(content.items) ? content.items : [];
    content.items = stash.map((w, i) => {
      const src = (items[i] ?? {}) as Record<string, unknown>;
      return {
        ...src,
        word: w.word,
        syllableCount: w.syllableCount,
        syllableBreak: w.syllableBreak,
        position: w.position,
        targetSound: data.targetSounds[0],
        visualPrompt: w.visualPrompt,
      };
    });
  }
  return; // banka yolu: hedef-harf filtresine gerek yok
}
// (buradan sonrası mevcut hedef-harf filtresi — banka-DIŞI sesler için güvence)
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/hub && node_modules/.bin/tsc --noEmit 2>&1 | grep "error TS" | grep -v CardGeneratorForm || echo OK`
Expected: `OK` (yeni hata yok). `data.level`, `data.positions`, `data.itemCount`, `data.targetSounds` bodySchema'da var (mevcut şema).

- [ ] **Step 5: Commit**
```bash
git add "apps/hub/src/app/studio/api/tools/articulation/route.ts"
git commit -m "feat(studio/artikulasyon): banka entegrasyonu — kelime düzeyi enjeksiyon + cümle/bağlam otoriter kelime"
```

---

## Task 6: Görsel hata mesajı (boş kart yerine net bilgi)

**Files:**
- Modify: `apps/hub/src/app/studio/(main)/tools/articulation/page.tsx` (`generateImagesFor`)

**Bağlam:** Mevcut `generateImagesFor` (İterasyon 4): toplam başarı 0 ise `toast.error("Görsel üretilemedi — birazdan 'görsel ekle' ile tekrar deneyebilirsin")`. Banka yolu kelimeleri garanti ettiğinden, kalan tek görsel-eksikliği sebebi servis-tarafı (FLUX). Mesajı netleştir + kısmî başarıda da bilgilendir.

- [ ] **Step 1: Toast mesajlarını netleştir**

`generateImagesFor` sonundaki bildirim bloğunu güncelle:
```ts
if (totalOk > 0) toast.success(`${totalOk} görsel eklendi (${totalCredits} kredi)`);
if (rateLimited) {
  toast.error("Çok fazla istek — birazdan eksik görselleri 'görsel ekle' ile tamamlayabilirsin");
} else {
  const eksik = itemIndexes.length - totalOk;
  if (eksik > 0) {
    toast.error(`${eksik} görsel üretilemedi (görsel servisi geçici dolu olabilir) — kartlardaki 'görsel ekle' ile tek tek tamamlayabilirsin`);
  }
}
```

- [ ] **Step 2: Typecheck + Preview**

Run: `cd apps/hub && node_modules/.bin/tsc --noEmit 2>&1 | grep -c "error TS"` → `1` (pre-existing).
Preview: tool sayfasını aç, bir alıştırma üret (banka-dışı ses de olur), görsel akışında toast'ların göründüğünü gözlemle.

- [ ] **Step 3: Commit**
```bash
git add "apps/hub/src/app/studio/(main)/tools/articulation/page.tsx"
git commit -m "feat(studio/artikulasyon): görsel eksikliğinde net hata mesajı"
```

---

## Task 7: `/d/` tohum bankası + uçtan uca doğrulama

**Files:**
- Modify: `packages/ai/src/articulation/wordBank.ts`

> Bu task makineyi gerçek (küçük) veriyle uçtan uca kanıtlar. Tam ≥30 doldurma "İçerik Doldurma" bölümünde.

- [ ] **Step 1: `/d/` için küçük onaylı tohum ekle**

`WORD_BANK`'i doldur (bu liste implementasyon sırasında kullanıcı onayından geçer — aşağıdakiler başlangıç önerisidir):
```ts
export const WORD_BANK: WordBank = {
  d: {
    initial: [
      { word: "dolap", syllableBreak: "do-lap", visualPrompt: "a wooden wardrobe cabinet" },
      { word: "dere", syllableBreak: "de-re", visualPrompt: "a small stream flowing through grass" },
      { word: "diş", syllableBreak: "diş", visualPrompt: "a single white tooth" },
      { word: "davul", syllableBreak: "da-vul", visualPrompt: "a drum" },
      { word: "deniz", syllableBreak: "de-niz", visualPrompt: "the blue sea with gentle waves" },
      { word: "dudak", syllableBreak: "du-dak", visualPrompt: "a pair of lips" },
    ],
    medial: [
      { word: "adım", syllableBreak: "a-dım", visualPrompt: "a single footprint on the ground" },
      { word: "merdiven", syllableBreak: "mer-di-ven", visualPrompt: "a staircase" },
      { word: "badem", syllableBreak: "ba-dem", visualPrompt: "a few almonds" },
      { word: "bardak", syllableBreak: "bar-dak", visualPrompt: "a drinking glass" },
      { word: "ördek", syllableBreak: "ör-dek", visualPrompt: "a duck" },
      { word: "yıldız", syllableBreak: "yıl-dız", visualPrompt: "a yellow five-pointed star" },
    ],
    // Türkçe'de sözcük sonu sertleşmesi (d→t) nedeniyle sonda /d/ ≈ yoktur → boş.
    final: [],
  },
};
```
> ⚠️ Bu `/d/` tohumu (initial+medial) "İçerik Doldurma" prosedürüyle kullanıcı onayına sunulup ≥30'a genişletilecek. Tohum yalnız makineyi uçtan uca test etmek için.

- [ ] **Step 2: Bütünlük testi + tüm ai testleri**

Run: `pnpm --filter @ludenlab/ai test 2>&1 | grep -E "Test Files|Tests|FAIL"`
Expected: tümü geçer (her `/d/` kelimesi: harf "d" içerir, syllableBreak↔word tutar, visualPrompt dolu; `final: []` → o pozisyon için test yok). Bütünlük testi bir gün yanlış kelime girilirse (harf yok / syllableBreak↔word tutmaz) yakalar.

- [ ] **Step 3: Uçtan uca Preview (banka yolu)**

Preview: tool sayfasında `/d/`, **Kelime Düzeyi**, 10 öğe seç → üret. Beklenen: yalnız bankadaki gerçek `/d/` kelimeleri, **uydurma yok**, sayı = min(10, mevcut). Görselli kutu işaretliyse görseller bankadaki visualPrompt'larla üretilir.

- [ ] **Step 4: Commit**
```bash
git add packages/ai/src/articulation/wordBank.ts
git commit -m "feat(ai/articulation): /d/ tohum bankası (uçtan uca doğrulama)"
```

---

## İçerik Doldurma (interaktif, plan-dışı autonomous akış)

Bu bölüm bite-sized değildir — **insan onayı** gerektirir. Her banka-içi ses için (öncelik: d, k, g, r, l, y, s, ş, z):

1. **Üret (ajan):** Ses × pozisyon için ≥30 aday `{word, syllableBreak, visualPrompt}` üret. Ses-bilgisi kuralları: hedef harf ilgili pozisyonda; sözcük-sonu sertleşmesini bil (sonda /g/,/d/ ≈ boş, /z/ sınırlı); somut + yaşa uygun; visualPrompt İngilizce tek nesne.
2. **Onayla (kullanıcı):** Liste kullanıcıya sunulur; ekle/çıkar/düzelt. Onaylananlar `WORD_BANK`'e işlenir.
3. **Doğrula + commit:** `pnpm --filter @ludenlab/ai test bankIntegrity` geçer; commit.

> Araç her aşamada çalışır: doldurulmuş sesler bankadan (güvenilir), kalanlar AI yolundan beslenir.

---

## Doğrulama (plan sonu)

- `pnpm --filter @ludenlab/ai test` → tüm test dosyaları geçer.
- `cd apps/hub && node_modules/.bin/tsc --noEmit` → yalnız 1 pre-existing hata (CardGeneratorForm).
- Preview: `/d/` kelime düzeyi → bankadan gerçek kelimeler, uydurma yok, sayı tutar.
- Banka-dışı ses (ör. `/ç/`) → mevcut AI yolu hâlâ çalışır (regresyon yok).
