# Reels 2 — Öğrenme Kartı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reels 2'yi ("Pazar akşamı, yine kartlar" → Studio Öğrenme Kartı → gerçek PDF → esenlik → kapanış) mevcut reels altyapısı üzerinde üretmek.

**Architecture:** Altyapı (`src/reels-lib/`) Reels 1 planında kuruldu ve değişmez; yalnız r1'deki `Headline` ortak kütüphaneye taşınır. Gerçek PDF görseli, ürünün kendi `CardPDFDocument` bileşeni (apps/hub) esbuild ile paketlenip kurgu kart verisiyle render edilerek üretilir → `pdftoppm` ile PNG → `public/real/r2-kart.png` (commit'lenir). Kart verisi tek kaynak: `src/reels/r2-kartlar/cardData.ts` (hem PDF hem sahne maketi kullanır).

**Tech Stack:** Remotion 4.0.484, React 19, `@react-pdf/renderer` ^4.3.2 (hub ile aynı), esbuild 0.28.1 (JS API), `pdftoppm` (Homebrew poppler), Node 24 `node --test`.

**Spec:** `docs/superpowers/specs/2026-09-16-instagram-lansman-reels-design.md`
**Önceki plan:** `docs/superpowers/plans/2026-09-16-instagram-reels-altyapi-r1.md`

**Önemli bağlam:**
- Studio "Öğrenme Kartı" **kelime kartı DEĞİLDİR**: bir çalıştırmada TEK yapılandırılmış seans kartı üretir — girdiler: kategori (Konuşma/Dil/İşitme), yaş grubu, zorluk, çalışma odağı; çıktı: başlık, amaç, materyaller, uygulama adımları, etkinlikler (tekrar sayılı), uzman notları, ilerleme göstergeleri, ev ödevi. Görsel ÜRETMEZ. (Kaynak: `apps/hub/src/modules/studio/lib/prompts/index.ts:33`, `components/cards/CardGeneratorForm.tsx`.) Temmuz videosundaki `OgrenmeKartlari` sahnesi bunu yanlış anlatıyor — örnek ALINMAZ.
- Kullanıcı kararları (2026-09-16): s2 seslendirmesi değişti (aşağıda); PDF içeriği kurgu, şablon gerçek; prod'a dokunulmaz; ücretsiz plan tanıtılmaz; Studio kitlesi "Dil ve konuşma alanında çalışan uzmanlar".
- `promo/package.json` zaten `"type": "module"`; devDependencies'te `@react-pdf/renderer`, `clsx`, `tailwind-merge`, `esbuild` kurulu (hub `utils.ts` clsx/tailwind-merge import ettiği için paket gerekir).
- Tüm komutlar `promo/` içinden. Commit mesajları `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` ile biter.

---

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `promo/src/reels-lib/Headline.tsx` (yeni, r1'den taşınır) | Satır satır yaylanan büyük başlık |
| `promo/src/reels/r1-lansman/scenes.tsx` (değişir) | `Headline`'ı ortak kütüphaneden import eder |
| `promo/src/reels/r2-kartlar/cardData.ts` | Kurgu /s/ kartı (GeneratedCard şekli) — PDF + maket ortak |
| `promo/src/reels/r2-kartlar/script.ts` | Reels 2 metinleri |
| `promo/src/reels/r2-kartlar/Clock.tsx` | Akşama ilerleyen duvar saati |
| `promo/src/reels/r2-kartlar/Mug.tsx` | Buharı tüten kupa |
| `promo/src/reels/r2-kartlar/CardMock.tsx` | Bölüm bölüm dolan öğrenme kartı maketi |
| `promo/src/reels/r2-kartlar/scenes.tsx` | S1–S5 |
| `promo/src/reels/r2-kartlar/Reel.tsx` | Kompozisyon bileşeni |
| `promo/scripts/assets/r2-card-entry.tsx` | Hub `CardPDFDocument` + cardData → PDF (esbuild girişi; tsc dışı) |
| `promo/scripts/render-card-asset.ts` | esbuild paketle → PDF → PNG |
| `promo/public/real/r2-kart.png` | Üretilen gerçek PDF sayfası (commit'lenir) |
| `promo/scripts/reels.ts`, `promo/src/Root.tsx`, `promo/package.json`, `promo/tsconfig.json` (değişir) | kayıt, betik, tsc hariç tutma |
| `promo/tests/cardData.test.ts` | Kart verisinin ürün şemasına ve içerik kurallarına uyumu |
| `docs/superpowers/specs/2026-09-16-instagram-lansman-reels-design.md` (değişir) | R2 s2 metni + ekran notları |

---

### Task 1: Headline'ı ortak kütüphaneye taşı

**Files:**
- Create: `promo/src/reels-lib/Headline.tsx`
- Modify: `promo/src/reels/r1-lansman/scenes.tsx`

- [ ] **Step 1: Ortak bileşeni oluştur** (r1'deki kodun aynısı, `export` edilmiş)

`promo/src/reels-lib/Headline.tsx`:
```tsx
import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../brand";

/** Satır satır yaylanan büyük başlık; son satır turuncu vurgulu. */
export const Headline: React.FC<{ lines: string[]; top: number; fontSize: number; delay: number }> = ({
  lines,
  top,
  fontSize,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top }}>
      {lines.map((line, i) => {
        const p = spring({ frame: frame - delay - i * 10, fps, config: { damping: 13 } });
        return (
          <div
            key={line}
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize,
              lineHeight: 1.1,
              color: i === lines.length - 1 ? colors.orange : colors.ink,
              opacity: p,
              transform: `translateY(${(1 - p) * 60}px)`,
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 2: r1'den yerel `Headline` tanımını sil, import et**

`promo/src/reels/r1-lansman/scenes.tsx` içinde `const Headline: React.FC<...> = (...) => { ... };` bloğunun tamamını sil ve importlara ekle:
```tsx
import { Headline } from "../../reels-lib/Headline";
```

- [ ] **Step 3: Regresyon kontrolü** — r1 değişmemeli

Run:
```bash
npm run typecheck && npx remotion still src/index.ts R1-Lansman out/chk-r1-170.png --frame=170
```
Expected: typecheck 0; PNG'de "Yalnız / değilsin." ve dalga Reels 1 ile aynı konumda.

- [ ] **Step 4: Commit**
```bash
git add src/reels-lib/Headline.tsx src/reels/r1-lansman/scenes.tsx
git commit -m "refactor(promo): Headline ortak reels kütüphanesine taşındı"
```

---

### Task 2: Kurgu kart verisi (TDD)

**Files:**
- Create: `promo/src/reels/r2-kartlar/cardData.ts`
- Test: `promo/tests/cardData.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

`promo/tests/cardData.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { r2Card } from "../src/reels/r2-kartlar/cardData.ts";

test("kart ürünün GeneratedCard alanlarının hepsini dolu taşır", () => {
  for (const key of ["title", "objective", "therapistNotes", "homeExercise"] as const) {
    assert.ok(r2Card[key].length > 0, key);
  }
  assert.ok(r2Card.materials.length >= 3);
  assert.ok(r2Card.instructions.length >= 3);
  assert.ok(r2Card.exercises.length >= 2);
  assert.ok(r2Card.progressIndicators.length >= 2);
  assert.equal(r2Card.category, "speech");
  assert.equal(r2Card.difficulty, "medium");
  assert.equal(r2Card.ageGroup, "3-6");
});

test("adımlar ürün biçiminde 'Adım N:' ile başlar (PDF bunu kırpar)", () => {
  r2Card.instructions.forEach((s, i) => assert.match(s, new RegExp(`^Adım ${i + 1}: `)));
});

test("içerik kuralları: öğrenci adı / hız iddiası yok", () => {
  const all = JSON.stringify(r2Card);
  assert.doesNotMatch(all, /saniye|dakikada/i);
  assert.doesNotMatch(all, /\b(Ali|Ayşe|Eymen|Zeynep|Elif)\b/);
});
```

- [ ] **Step 2: Başarısız olduğunu doğrula**

Run: `npm test` → FAIL `Cannot find module .../cardData.ts`.

- [ ] **Step 3: Veriyi yaz**

`promo/src/reels/r2-kartlar/cardData.ts`:
```ts
/**
 * Reels 2 için KURGU öğrenme kartı — ürünün GeneratedCard şekliyle birebir
 * (apps/hub/src/modules/studio/lib/prompts/index.ts). Hem gerçek PDF şablonu
 * (scripts/assets/r2-card-entry.tsx) hem sahne maketi bunu kullanır.
 */
export const r2Card = {
  title: "/s/ Sesini Kelime Başında Üretme",
  objective:
    "Çocuk, görsel ve işitsel ipucu desteğiyle /s/ sesini kelime başı pozisyonunda 10 denemenin 8'inde doğru üretir.",
  materials: ["El aynası", "/s/ ile başlayan resimli kartlar", "Yılan kuklası", "Pekiştireç çıkartmaları"],
  instructions: [
    "Adım 1: Aynada dil ucunun alt dişlerin arkasındaki yerini birlikte gösterin.",
    "Adım 2: Yılan kuklasıyla uzun 'sss' sesini oyunlaştırarak modelleyin.",
    "Adım 3: Sesi hecelerde (sa, se, si, so, su) tekrar ettirin.",
    "Adım 4: Resimli kartlarla kelime başı /s/ üretimine geçin; doğru üretimleri çıkartmayla pekiştirin.",
  ],
  exercises: [
    {
      name: "Yılan Oyunu",
      description: "Kukla kartların üzerinden geçerken çocuk uzun 'sss' sesi çıkarır.",
      repetitions: "5 tekrar",
    },
    {
      name: "Hece Merdiveni",
      description: "Her basamakta bir hece söylenir: sa, se, si, so, su.",
      repetitions: "3 tur",
    },
    {
      name: "Kart Avı",
      description: "Seçilen resmin adı söylenir: sabun, saat, simit, soğan.",
      repetitions: "10 deneme",
    },
  ],
  therapistNotes:
    "Dil ucu dişler arasına kayarsa aynadaki görsel ipucuna geri dönün. Başarı %80'e ulaşınca kelime ortası pozisyona geçin.",
  progressIndicators: [
    "/s/ sesini izole olarak ipucusuz üretir",
    "Hecelerde 5 denemenin 4'ünde doğru üretir",
    "Kelime başında 10 denemenin 8'inde doğru üretir",
  ],
  homeExercise:
    "Evde /s/ ile başlayan 5 nesne bulun ve her birinin adını günde iki kez birlikte söyleyin.",
  category: "speech",
  difficulty: "medium",
  ageGroup: "3-6",
} as const;
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npm test` → `ℹ pass 13`, `ℹ fail 0`.

- [ ] **Step 5: Commit**
```bash
git add src/reels/r2-kartlar/cardData.ts tests/cardData.test.ts
git commit -m "feat(promo): Reels 2 kurgu öğrenme kartı verisi"
```

---

### Task 3: Gerçek PDF görselini üret

**Files:**
- Create: `promo/scripts/assets/r2-card-entry.tsx`
- Create: `promo/scripts/render-card-asset.ts`
- Modify: `promo/tsconfig.json`, `promo/package.json`
- Create (üretilen): `promo/public/real/r2-kart.png`

- [ ] **Step 1: esbuild giriş dosyası**

`@studio` alias'ı yalnız esbuild paketlemesinde çözülür; bu yüzden `scripts/assets` tsc dışında tutulur.

`promo/scripts/assets/r2-card-entry.tsx`:
```tsx
import React from "react";
import { renderToFile } from "@react-pdf/renderer";
import { CardPDFDocument } from "@studio/components/cards/CardPDFDocument";
import type { GeneratedCard } from "@studio/lib/prompts";
import { r2Card } from "../../src/reels/r2-kartlar/cardData";

export const renderCardPdf = (outPath: string) =>
  renderToFile(<CardPDFDocument card={r2Card as unknown as GeneratedCard} />, outPath);
```

- [ ] **Step 2: Çalıştırıcı betik**

`CardPDFDocument` font yolunu `window.location.origin + "/fonts"` ile kurar; Node'da `window`'u hub'ın `public/` klasörüne işaret eden bir sahteyle tanımlarız → NotoSans yerel dosyadan yüklenir.

`promo/scripts/render-card-asset.ts`:
```ts
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const PROMO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HUB = resolve(PROMO, "../apps/hub");
const OUT_DIR = resolve(PROMO, "out/assets");
const BUNDLE = resolve(OUT_DIR, "r2-card.mjs");
const PDF = resolve(OUT_DIR, "r2-kart.pdf");
const PNG_BASE = resolve(PROMO, "public/real/r2-kart");

mkdirSync(OUT_DIR, { recursive: true });

await build({
  entryPoints: [resolve(PROMO, "scripts/assets/r2-card-entry.tsx")],
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  alias: { "@studio": resolve(HUB, "src/modules/studio") },
  // Hub dosyaları kendi node_modules'ünü (worktree'de yok) değil promo'nunkini kullansın.
  nodePaths: [resolve(PROMO, "node_modules")],
  external: ["@react-pdf/renderer", "react"],
  outfile: BUNDLE,
  logLevel: "warning",
});

(globalThis as { window?: unknown }).window = { location: { origin: resolve(HUB, "public") } };
const { renderCardPdf } = (await import(pathToFileURL(BUNDLE).href)) as {
  renderCardPdf: (out: string) => Promise<void>;
};
await renderCardPdf(PDF);

// İlk sayfa, 200 dpi PNG (A4 → 1654×2339)
execFileSync("pdftoppm", ["-png", "-r", "200", "-f", "1", "-l", "1", "-singlefile", PDF, PNG_BASE], {
  stdio: "inherit",
});
console.log(`✓ ${PNG_BASE}.png`);
```

- [ ] **Step 3: tsconfig + npm betiği**

`promo/tsconfig.json` — `"include"` satırından sonra ekle:
```json
  "exclude": ["scripts/assets"]
```
`promo/package.json` scripts'e ekle:
```json
    "asset:r2": "node scripts/render-card-asset.ts"
```

- [ ] **Step 4: Çalıştır ve doğrula**

Run:
```bash
which pdftoppm && npm run typecheck && npm run asset:r2 && sips -g pixelWidth -g pixelHeight public/real/r2-kart.png
```
Expected: `✓ .../public/real/r2-kart.png`, `pixelWidth: 1654`, `pixelHeight: 2339`.

Sonra PNG'yi aç (Read aracı) ve kontrol et: Studio logosu, "Konuşma · Orta · 3–6 yaş" rozetleri, başlık "/s/ Sesini Kelime Başında Üretme", Türkçe karakterler bozuk değil, materyaller/adımlar/etkinlikler görünür, öğrenci adı YOK.

- [ ] **Step 5: Commit**
```bash
git add scripts/assets/r2-card-entry.tsx scripts/render-card-asset.ts tsconfig.json package.json package-lock.json public/real/r2-kart.png
git commit -m "feat(promo): Reels 2 gerçek PDF görseli — ürün şablonu + kurgu kart"
```

---

### Task 4: Reels 2 metni + spec güncellemesi

**Files:**
- Create: `promo/src/reels/r2-kartlar/script.ts`
- Modify: `promo/scripts/reels.ts`
- Modify: `docs/superpowers/specs/2026-09-16-instagram-lansman-reels-design.md`

- [ ] **Step 1: Metin**

`promo/src/reels/r2-kartlar/script.ts`:
```ts
import type { ReelScript } from "../../reels-lib/types";

export const r2Script: ReelScript = {
  id: "r2",
  slug: "r2-kartlar",
  title: "Öğrenme kartı",
  scenes: [
    {
      id: "s1",
      vo: "Pazar akşamı, yarınki seanslar için yine kart hazırlıyorsun.",
      screen: "Pazar akşamı. Yine kartlar.",
      defaultSec: 3.5,
    },
    {
      id: "s2",
      vo: "Studio'da çalışma odağını yaz; amacı, materyalleri ve adımlarıyla bir öğrenme kartı hazırlansın.",
      screen: "Konuşma · 3–6 yaş · Orta → /s/ sesi üretimi → kart bölüm bölüm doluyor",
      defaultSec: 6,
    },
    {
      id: "s3",
      vo: "Gözden geçir, PDF olarak indir.",
      screen: "Gerçek PDF sayfası + PDF indir",
      defaultSec: 3.5,
    },
    {
      id: "s4",
      vo: "Materyal hazır, akşamın senin.",
      screen: "Esenliğin de işinin parçası.",
      defaultSec: 3,
    },
    {
      id: "s5",
      vo: "Studio'yu keşfet: ludenlab nokta com.",
      screen: "Kapanış kartı (STUDIO)",
      defaultSec: 3.5,
      minSec: 3.5,
      hideCaption: true,
    },
  ],
};
```

- [ ] **Step 2: Kayıt listesi**

`promo/scripts/reels.ts` — import ekle ve listeyi genişlet:
```ts
import { r1Script } from "../src/reels/r1-lansman/script.ts";
import { r2Script } from "../src/reels/r2-kartlar/script.ts";
import type { ReelScript } from "../src/reels-lib/types.ts";

export type ReelEntry = { script: ReelScript; compositionId: string };

/** Yeni reels eklendikçe buraya ve src/Root.tsx'e eklenir. */
export const REELS: ReelEntry[] = [
  { script: r1Script, compositionId: "R1-Lansman" },
  { script: r2Script, compositionId: "R2-Kartlar" },
];
```

- [ ] **Step 3: Spec'i güncelle**

`docs/superpowers/specs/2026-09-16-instagram-lansman-reels-design.md` "Reels 2 — Öğrenme kartları" tablosunda:
- s2 satırı → `| s2 | Studio'da çalışma odağını yaz; amacı, materyalleri ve adımlarıyla bir öğrenme kartı hazırlansın. | Kategori/yaş/zorluk + odak yazılıyor → kart bölüm bölüm doluyor |`
- s3 "Ekran" hücresi → `Gerçek PDF sayfası (ürün şablonu, kurgu içerik)`

"İçerik kuralları" listesine ekle:
```markdown
- **Öğrenme Kartı kelime kartı değildir:** tek, yapılandırılmış seans kartı (amaç, materyaller, adımlar, etkinlikler, uzman notları, ilerleme, ev ödevi). Temmuz videosundaki kelime-kartı sahnesi örnek alınmaz.
```
"Görsel yaklaşım" altındaki "Reels 2, 4, 5" maddesini şöyle değiştir:
```markdown
- **Reels 2, 4, 5:** gerçek PDF sayfası — ürünün kendi PDF bileşeni `promo/` içinde kurgu içerikle render edilir (`npm run asset:r2`), prod'a dokunulmaz → `promo/public/real/`.
```

- [ ] **Step 4: Doğrula + commit**

Run: `npm run -s scripts` → `=== r2 — Öğrenme kartı ===` altında 5 satır. `npm run typecheck` → 0.
```bash
git add src/reels/r2-kartlar/script.ts scripts/reels.ts ../docs/superpowers/specs/2026-09-16-instagram-lansman-reels-design.md
git commit -m "feat(promo): Reels 2 metni — s2 gerçek ürüne göre güncellendi"
```

---

### Task 5: Sahne parçaları — Clock, Mug, CardMock

**Files:**
- Create: `promo/src/reels/r2-kartlar/Clock.tsx`
- Create: `promo/src/reels/r2-kartlar/Mug.tsx`
- Create: `promo/src/reels/r2-kartlar/CardMock.tsx`

- [ ] **Step 1: Clock** — akrep/yelkovan 18:00'den 21:40'a hızla ilerler

`promo/src/reels/r2-kartlar/Clock.tsx`:
```tsx
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { colors } from "../../brand";

export const Clock: React.FC<{ size: number; fromMin: number; toMin: number; durationFrames: number }> = ({
  size,
  fromMin,
  toMin,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const minutes = interpolate(frame, [0, durationFrames], [fromMin, toMin], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const hourDeg = (minutes / 60) * 30;
  const minuteDeg = (minutes % 60) * 6;
  const hand = (len: number, width: number, deg: number, color: string): React.CSSProperties => ({
    position: "absolute",
    left: size / 2 - width / 2,
    top: size / 2 - len,
    width,
    height: len,
    borderRadius: width,
    background: color,
    transformOrigin: "50% 100%",
    transform: `rotate(${deg}deg)`,
  });
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        background: colors.white,
        border: `6px solid ${colors.ink}`,
        boxShadow: `10px 10px 0 ${colors.ink}`,
      }}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: size / 2 - 4,
            top: 18,
            width: 8,
            height: i % 3 === 0 ? 34 : 18,
            borderRadius: 4,
            background: colors.ink,
            transformOrigin: `50% ${size / 2 - 18}px`,
            transform: `rotate(${i * 30}deg)`,
          }}
        />
      ))}
      <div style={hand(size * 0.26, 16, hourDeg, colors.ink)} />
      <div style={hand(size * 0.38, 10, minuteDeg, colors.orange)} />
      <div
        style={{
          position: "absolute",
          left: size / 2 - 16,
          top: size / 2 - 16,
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: colors.ink,
        }}
      />
    </div>
  );
};
```

- [ ] **Step 2: Mug** — kupa + dalgalanarak yükselen üç buhar çizgisi

`promo/src/reels/r2-kartlar/Mug.tsx`:
```tsx
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../../brand";

const STEAM_PATH = "M20 120 Q 0 90, 20 60 T 20 0";

export const Mug: React.FC<{ scale: number }> = ({ scale }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "relative", width: 420, height: 520, transform: `scale(${scale})` }}>
      {[0, 1, 2].map((i) => {
        const t = ((frame + i * 14) % 42) / 42;
        return (
          <svg
            key={i}
            width={40}
            height={120}
            viewBox="0 0 40 120"
            style={{
              position: "absolute",
              left: 110 + i * 70,
              top: 40 - t * 50,
              opacity: interpolate(t, [0, 0.3, 1], [0, 0.9, 0]),
            }}
          >
            <path d={STEAM_PATH} stroke={colors.gray} strokeWidth={9} strokeLinecap="round" fill="none" />
          </svg>
        );
      })}
      <div
        style={{
          position: "absolute",
          right: 10,
          top: 250,
          width: 130,
          height: 150,
          borderRadius: "0 70px 70px 0",
          border: `22px solid ${colors.ink}`,
          borderLeft: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 180,
          width: 300,
          height: 320,
          background: colors.orange,
          border: `6px solid ${colors.ink}`,
          borderRadius: "18px 18px 70px 70px",
          boxShadow: `10px 10px 0 ${colors.ink}`,
        }}
      />
    </div>
  );
};
```

- [ ] **Step 3: CardMock** — ürün kartının bölümleri sırayla dolar (veri `cardData.ts`'ten)

`promo/src/reels/r2-kartlar/CardMock.tsx`:
```tsx
import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../brand";
import { PosterCard } from "../../lib/PosterCard";
import { r2Card } from "./cardData";

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 26, letterSpacing: 4, color: colors.gray, marginBottom: 10 }}>
    {children}
  </div>
);

export const CardMock: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (d: number) => spring({ frame: frame - start - d, fps, config: { damping: 14 } });
  const reveal = (p: number): React.CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * 30}px)` });
  const card = s(0);
  return (
    <PosterCard style={{ width: 900, padding: "34px 40px", ...reveal(card) }}>
      <div style={{ ...reveal(s(4)), fontFamily: fonts.display, fontWeight: 800, fontSize: 50, color: colors.ink, lineHeight: 1.1 }}>
        {r2Card.title}
      </div>
      <div style={{ ...reveal(s(10)), marginTop: 22 }}>
        <SectionTitle>AMAÇ</SectionTitle>
        <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 32, lineHeight: 1.35, color: colors.ink }}>
          {r2Card.objective}
        </div>
      </div>
      <div style={{ ...reveal(s(18)), marginTop: 22 }}>
        <SectionTitle>MATERYALLER</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {r2Card.materials.map((m, i) => {
            const p = s(20 + i * 3);
            return (
              <span
                key={m}
                style={{
                  fontFamily: fonts.body,
                  fontWeight: 500,
                  fontSize: 28,
                  background: colors.paleBlue,
                  borderRadius: 999,
                  padding: "8px 20px",
                  opacity: p,
                  transform: `scale(${0.6 + 0.4 * p})`,
                }}
              >
                {m}
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ ...reveal(s(32)), marginTop: 22 }}>
        <SectionTitle>UYGULAMA ADIMLARI</SectionTitle>
        {r2Card.instructions.slice(0, 3).map((step, i) => {
          const p = s(34 + i * 5);
          return (
            <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 10, ...reveal(p) }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  background: colors.studioBlue,
                  color: colors.white,
                  fontFamily: fonts.body,
                  fontWeight: 700,
                  fontSize: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 28, lineHeight: 1.35, color: colors.ink }}>
                {step.replace(/^Adım \d+:\s*/, "")}
              </span>
            </div>
          );
        })}
      </div>
    </PosterCard>
  );
};
```

- [ ] **Step 4: Tip kontrolü + commit**

Run: `npm run typecheck` → 0.
```bash
git add src/reels/r2-kartlar/Clock.tsx src/reels/r2-kartlar/Mug.tsx src/reels/r2-kartlar/CardMock.tsx
git commit -m "feat(promo): Reels 2 sahne parçaları — saat, kupa, kart maketi"
```

---

### Task 6: Reels 2 sahneleri, kompozisyon ve kare kontrolü

**Files:**
- Create: `promo/src/reels/r2-kartlar/scenes.tsx`
- Create: `promo/src/reels/r2-kartlar/Reel.tsx`
- Modify: `promo/src/Root.tsx`

- [ ] **Step 1: Sahneler**

Dikey bütçe (altyazı kutusu ~1380 px'ten başlar, güvenli alan üst 200): s2'de başlık 220, seçim çipleri ~340, odak girişi ~430, kart maketi 560'tan aşağı.

`promo/src/reels/r2-kartlar/scenes.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { LayoutGrid } from "lucide-react";
import { colors, fonts } from "../../brand";
import { Cursor } from "../../lib/Cursor";
import { PosterCard } from "../../lib/PosterCard";
import { ToolHeader } from "../../lib/ToolHeader";
import { TypeWriter } from "../../lib/TypeWriter";
import { EndCard } from "../../reels-lib/EndCard";
import { Headline } from "../../reels-lib/Headline";
import { CardMock } from "./CardMock";
import { Clock } from "./Clock";
import { Mug } from "./Mug";

export const S1Aksam: React.FC = () => (
  <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
    <div style={{ marginTop: 300 }}>
      <Clock size={480} fromMin={18 * 60} toMin={21 * 60 + 40} durationFrames={60} />
    </div>
    <Headline lines={["Pazar akşamı.", "Yine kartlar."]} top={960} fontSize={120} delay={10} />
  </AbsoluteFill>
);

const CHOICES = ["Konuşma", "3–6 yaş", "Orta"];

export const S2Uret: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (d: number) => spring({ frame: frame - d, fps, config: { damping: 13 } });
  const input = s(10);
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", paddingTop: 220 }}>
      <ToolHeader icon={<LayoutGrid size={52} strokeWidth={2.4} />} title="Öğrenme Kartı" />
      <div style={{ display: "flex", gap: 16, marginTop: 30 }}>
        {CHOICES.map((c, i) => {
          const p = s(4 + i * 3);
          return (
            <span
              key={c}
              style={{
                fontFamily: fonts.body,
                fontWeight: 700,
                fontSize: 34,
                color: colors.white,
                background: colors.studioBlue,
                border: `3px solid ${colors.ink}`,
                borderRadius: 999,
                padding: "10px 26px",
                opacity: p,
                transform: `scale(${0.6 + 0.4 * p})`,
              }}
            >
              {c}
            </span>
          );
        })}
      </div>
      <PosterCard style={{ width: 900, padding: "20px 32px", marginTop: 26, opacity: input, transform: `translateY(${(1 - input) * 40}px)` }}>
        <TypeWriter text="/s/ sesi üretimi" start={14} framesPerChar={2} fontSize={44} />
      </PosterCard>
      <div style={{ marginTop: 34 }}>
        <CardMock start={50} />
      </div>
    </AbsoluteFill>
  );
};

const PDF_CLICK = 40;

export const S3Pdf: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const page = spring({ frame, fps, config: { damping: 14 } });
  const btn = spring({ frame: frame - 18, fps, config: { damping: 11 } });
  const dip = interpolate(frame, [PDF_CLICK - 4, PDF_CLICK, PDF_CLICK + 6], [1, 0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const arrow = frame > PDF_CLICK ? Math.abs(Math.sin((frame - PDF_CLICK) / 5)) * 16 : 0;
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <PosterCard
        radius={12}
        shadow={12}
        style={{
          marginTop: 240,
          width: 760,
          overflow: "hidden",
          opacity: page,
          transform: `translateY(${(1 - page) * 400}px) rotate(${-2 * page}deg)`,
        }}
      >
        <Img src={staticFile("real/r2-kart.png")} style={{ width: "100%", display: "block" }} />
      </PosterCard>
      <div
        style={{
          position: "absolute",
          left: 560,
          top: 1110,
          display: "flex",
          alignItems: "center",
          gap: 18,
          background: colors.orange,
          border: `4px solid ${colors.ink}`,
          boxShadow: `6px 6px 0 ${colors.ink}`,
          borderRadius: 20,
          padding: "22px 40px",
          fontFamily: fonts.body,
          fontWeight: 700,
          fontSize: 48,
          color: colors.white,
          opacity: btn,
          transform: `scale(${btn * dip})`,
        }}
      >
        <span style={{ display: "inline-block", transform: `translateY(${arrow}px)` }}>↓</span>
        PDF indir
      </div>
      <Cursor
        appearAt={20}
        clickAt={PDF_CLICK}
        keyframes={[
          { frame: 20, x: 960, y: 1340 },
          { frame: PDF_CLICK - 4, x: 820, y: 1170 },
        ]}
      />
    </AbsoluteFill>
  );
};

export const S4Esenlik: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mug = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <div style={{ marginTop: 260 }}>
        <Mug scale={0.9 * mug} />
      </div>
      <Headline lines={["Esenliğin de", "işinin parçası."]} top={880} fontSize={112} delay={8} />
    </AbsoluteFill>
  );
};

export const S5Kapanis: React.FC = () => <EndCard product="STUDIO" />;
```

Not: `PosterCard`'ın `rotate` prop'u kullanılmaz; `style.transform` onu ezeceği için dönüş doğrudan `style.transform` içinde verilir.

- [ ] **Step 2: Kompozisyon bileşeni**

`promo/src/reels/r2-kartlar/Reel.tsx`:
```tsx
import React from "react";
import { ReelFrame } from "../../reels-lib/ReelFrame";
import type { ReelProps } from "../../reels-lib/voiceover";
import { r2Script } from "./script";
import { S1Aksam, S2Uret, S3Pdf, S4Esenlik, S5Kapanis } from "./scenes";

const SCENES: Record<string, React.FC> = {
  s1: S1Aksam,
  s2: S2Uret,
  s3: S3Pdf,
  s4: S4Esenlik,
  s5: S5Kapanis,
};

export const R2Kartlar: React.FC<ReelProps> = (props) => <ReelFrame reel={r2Script} scenes={SCENES} {...props} />;
```

- [ ] **Step 3: Root'a kaydet**

`promo/src/Root.tsx` importlarına ekle:
```tsx
import { r2Script } from "./reels/r2-kartlar/script";
import { R2Kartlar } from "./reels/r2-kartlar/Reel";
```
`R1-Lansman` kompozisyonundan sonra ekle:
```tsx
    <Composition
      id="R2-Kartlar"
      component={R2Kartlar}
      durationInFrames={1}
      {...REEL}
      defaultProps={EMPTY_REEL_PROPS}
      calculateMetadata={reelMetadata(r2Script)}
    />
```

- [ ] **Step 4: Tip kontrolü + testler**

Run: `npm run typecheck && npm test` → 0; `ℹ pass 13`.

- [ ] **Step 5: Kare kontrolleri**

Zaman çizelgesi (ses yok): s1 0–104, s2 105–284, s3 285–389, s4 390–479, s5 480–584 (585 kare = 19,5 sn).

Run:
```bash
for f in 70 150 270 340 380 440 560; do npx remotion still src/index.ts R2-Kartlar out/r2-$f.png --frame=$f; done
npx remotion still src/index.ts R2-Kartlar out/r2-safe-270.png --frame=270 --props='{"safeArea":true,"timeline":{"scenes":[],"durationInFrames":1}}'
```
Kareleri PIL ile tek kontakt sayfasında birleştirip incele (Remotion'ın paketli ffmpeg'inde hstack yok):
```bash
python3 -c "
from PIL import Image
n=['70','150','270','340','380','440','560','safe-270']
ims=[Image.open(f'out/r2-{i}.png').resize((360,640)) for i in n]
s=Image.new('RGB',(370*4,650*2),'white')
for i,im in enumerate(ims): s.paste(im,((i%4)*370,(i//4)*650))
s.save('out/r2-sheet.png')"
```
Expected:
- 70: saat ~21:40'ta, "Pazar akşamı. / Yine kartlar." taşmıyor
- 150: başlık, 3 çip, "/s/ sesi üretimi" yazılıyor, kart maketi başlamış
- 270: kart maketinde başlık, amaç, materyaller, adımlar görünür; altyazı kutusuyla ÇAKIŞMA YOK (safe-270'te kırmızı bantlara taşma yok)
- 340: PDF sayfası eğik duruyor, "PDF indir" butonu
- 380: imleç butona tıklamış, ok zıplıyor
- 440: kupa + buhar, "Esenliğin de / işinin parçası."
- 560: STUDIO etiketli kapanış kartı

Çakışma/taşma varsa: kart maketinde `fontSize`'ları veya `instructions.slice(0, 3)` sayısını düşür; s3'te sayfa genişliğini (760) küçült. Tekrar üret ve kontrol et.

- [ ] **Step 6: Commit**
```bash
git add src/reels/r2-kartlar/scenes.tsx src/reels/r2-kartlar/Reel.tsx src/Root.tsx
git commit -m "feat(promo): Reels 2 'Öğrenme kartı' sahneleri ve kompozisyonu"
```

---

### Task 7: Render ve teslim

- [ ] **Step 1: Render**

Run:
```bash
rm -f out/*.png
npm run reel -- r2
rm -f out/reels/r2-kartlar-vo.mp4
npx remotion ffprobe -v error -show_entries format=duration -of csv=p=0 out/reels/r2-kartlar.mp4
```
Expected: süre `19.500000`. (Ses dosyası yokken `-vo` çıktısı sessizdir; yanıltmasın diye silinir.)

- [ ] **Step 2: Sahne sınırı kontrolü**

Run:
```bash
for f in 104 105 284 285 389 390; do npx remotion still src/index.ts R2-Kartlar out/b2-$f.png --frame=$f; done
```
Kontakt sayfasıyla incele: geçişler kesme olarak kabul edilebilir (her sahne yeni mesaj), ama hiçbir karede yarım/bozuk öğe olmamalı. Sonra `rm -f out/b2-*.png`.

- [ ] **Step 3: Teslim**

`out/reels/r2-kartlar.mp4` kullanıcıya gönderilir. Seslendirme metni değişen satır (s2) kullanıcıya ayrıca bildirilir.
