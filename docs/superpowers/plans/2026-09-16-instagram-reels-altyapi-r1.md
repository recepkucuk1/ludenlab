# Instagram Reels Altyapısı + Reels 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `promo/` içinde seslendirme süresine göre kendini zamanlayan ortak reels altyapısını kurmak ve seri açılışı olan "LudenLab yayında" (Reels 1) videosunu render etmek.

**Architecture:** Her reels bir `script.ts` (sahne id, seslendirme, ekran yazısı, varsayılan süre) + sahne bileşenlerinden oluşur. `calculateMetadata` `public/vo/<reel>-<sahne>.mp3` sürelerini okur, saf `buildTimeline` fonksiyonu sahne karelerini hesaplar; ses yoksa varsayılan süre kullanılır. `ReelFrame` sahneleri, sesi ve kelime kelime altyazıyı dizer. Reels 2–5 bu altyapı üzerine ayrı planlarla eklenecek (gerçek görsel varlıkları gerektirir).

**Tech Stack:** Remotion 4.0.484, React 19, TypeScript 5, `@remotion/media-utils` (ses süresi), Node 24 yerleşik test koşucusu (`node --test`, TS tip-silme ile).

**Spec:** `docs/superpowers/specs/2026-09-16-instagram-lansman-reels-design.md`

**Önemli bağlam:**
- `promo/` pnpm workspace DIŞINDA; kendi `npm` kurulumu var. Tüm komutlar `promo/` içinden çalışır.
- Mevcut `StudioTanitim916` kompozisyonu ve `src/scenes/*` DEĞİŞMEZ; `src/lib/*` yardımcıları yeniden kullanılır.
- Marka: `src/brand.ts` renk/font değerleri marka dokümanıyla birebir; yeni renk ekleme. Atölye aksanı = `colors.orange`, Studio aksanı = `colors.studioBlue`.
- Instagram güvenli alanı: üst 200 px, alt 320 px'e kritik yazı konmaz.
- Hız iddiası, "saniyeler", "1 dakikada" gibi ifadeler YASAK (spec "İçerik kuralları").

---

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `promo/src/reels-lib/types.ts` | `SceneScript`, `ReelScript`, `TimelineScene`, `Timeline` tipleri |
| `promo/src/reels-lib/dims.ts` | FPS, boyut, güvenli alan sabitleri |
| `promo/src/reels-lib/timeline.ts` | Saf: ses yolları + sahne kare hesabı |
| `promo/src/reels-lib/captionTiming.ts` | Saf: karede kaç kelime görünür |
| `promo/src/reels-lib/Caption.tsx` | Kelime kelime yanan altyazı kutusu |
| `promo/src/reels-lib/SafeArea.tsx` | Önizleme için kırmızı güvenli alan bantları |
| `promo/src/reels-lib/EndCard.tsx` | Ortak kapanış kartı |
| `promo/src/reels-lib/voiceover.ts` | Ses sürelerini yükleme + `reelMetadata` |
| `promo/src/reels-lib/ReelFrame.tsx` | Sahne dizisi + ses + altyazı iskeleti, `ReelProps` |
| `promo/src/reels/r1-lansman/script.ts` | Reels 1 metinleri |
| `promo/src/reels/r1-lansman/LaunchBoard.tsx` | S3/S4 ortak "yayında" panosu |
| `promo/src/reels/r1-lansman/scenes.tsx` | Reels 1 sahneleri S1–S5 |
| `promo/src/reels/r1-lansman/Reel.tsx` | Reels 1 kompozisyon bileşeni |
| `promo/scripts/reels.ts` | Node betikleri için reels kayıt listesi |
| `promo/scripts/print-scripts.ts` | Seslendirme metinlerini dosya adlarıyla yazdırır |
| `promo/scripts/render-reel.ts` | Seslendirmeli + sessiz render |
| `promo/tests/*.test.ts` | Saf fonksiyon testleri |
| `promo/src/Root.tsx` (değişir) | `R1-Lansman` kompozisyonu eklenir |
| `promo/package.json`, `promo/tsconfig.json` (değişir) | bağımlılık, betikler, TS ayarı |

---

### Task 1: Bağımlılıklar, test ve tip kontrol iskeleti

**Files:**
- Modify: `promo/package.json`
- Modify: `promo/tsconfig.json`
- Create: `promo/public/vo/.gitkeep`, `promo/public/real/.gitkeep`

- [ ] **Step 1: Bağımlılıkları kur**

Run (`promo/` içinde):
```bash
npm ci --no-audit --no-fund
npm i --no-audit --no-fund @remotion/media-utils@4.0.484
npm i -D --no-audit --no-fund @types/node@24
```
Expected: hata yok; `package.json` dependencies'te `@remotion/media-utils`, devDependencies'te `@types/node`.

- [ ] **Step 2: `package.json` scripts bloğunu değiştir**

```json
  "scripts": {
    "studio": "remotion studio src/index.ts",
    "render916": "remotion render src/index.ts StudioTanitim916 out/studio-tanitim-916.mp4",
    "test": "node --test 'tests/*.test.ts'",
    "typecheck": "tsc",
    "scripts": "node scripts/print-scripts.ts",
    "reel": "node scripts/render-reel.ts",
    "reels": "node scripts/render-reel.ts all"
  },
```

- [ ] **Step 3: `tsconfig.json`'u güncelle**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "lib": ["DOM", "ES2022"],
    "types": ["node"]
  },
  "include": ["src", "scripts", "tests", "remotion.config.ts"]
}
```

- [ ] **Step 4: Varlık klasörlerini oluştur**

```bash
mkdir -p public/vo public/real && touch public/vo/.gitkeep public/real/.gitkeep
```

- [ ] **Step 5: Mevcut projenin hâlâ tip kontrolünden geçtiğini doğrula**

Run: `npm run typecheck`
Expected: çıkış kodu 0, çıktı yok.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json public/vo/.gitkeep public/real/.gitkeep
git commit -m "chore(promo): reels altyapısı için bağımlılık, test ve betik iskeleti"
```

---

### Task 2: Tipler, sabitler ve zaman çizelgesi (TDD)

**Files:**
- Create: `promo/src/reels-lib/types.ts`
- Create: `promo/src/reels-lib/dims.ts`
- Create: `promo/src/reels-lib/timeline.ts`
- Test: `promo/tests/timeline.test.ts`

- [ ] **Step 1: Tipleri yaz**

`promo/src/reels-lib/types.ts`:
```ts
export type SceneScript = {
  id: string;
  /** Seslendirme metni — altyazı da bundan üretilir. */
  vo: string;
  /** Ekrandaki ana yazı / sahne notu (spec tablosundaki "Ekran" sütunu). */
  screen: string;
  /** Ses dosyası yokken sahne süresi (sn). */
  defaultSec: number;
  /** Kapanış kartı gibi yazının zaten ekranda olduğu sahnelerde altyazıyı gizler. */
  hideCaption?: boolean;
};

export type ReelScript = {
  /** "r1" — ses dosyası öneki ve betik argümanı. */
  id: string;
  /** "r1-lansman" — çıktı dosya adı. */
  slug: string;
  title: string;
  scenes: SceneScript[];
};

export type TimelineScene = {
  id: string;
  from: number;
  durationInFrames: number;
  /** Altyazının tamamlanacağı kare sayısı (sahne başından). */
  captionFrames: number;
  /** `public/` altındaki yol; ses yoksa null. */
  audioSrc: string | null;
};

export type Timeline = {
  scenes: TimelineScene[];
  durationInFrames: number;
};
```

`promo/src/reels-lib/dims.ts`:
```ts
export const REEL = { fps: 30, width: 1080, height: 1920 } as const;

/** Instagram arayüzünün kapattığı bantlar (px). */
export const SAFE_TOP = 200;
export const SAFE_BOTTOM = 320;
```

- [ ] **Step 2: Başarısız testi yaz**

`promo/tests/timeline.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { AUDIO_PAD_SEC, buildTimeline, voPath } from "../src/reels-lib/timeline.ts";
import type { SceneScript } from "../src/reels-lib/types.ts";

const scenes: SceneScript[] = [
  { id: "s1", vo: "bir iki", screen: "", defaultSec: 3 },
  { id: "s2", vo: "üç", screen: "", defaultSec: 2 },
];

test("voPath reels ve sahne id'sinden public yolu üretir", () => {
  assert.equal(voPath("r1", "s2"), "vo/r1-s2.mp3");
});

test("ses yoksa varsayılan süre kullanılır ve sahneler art arda dizilir", () => {
  const t = buildTimeline("r1", scenes, [null, null], 30);
  assert.deepEqual(t.scenes, [
    { id: "s1", from: 0, durationInFrames: 90, captionFrames: 72, audioSrc: null },
    { id: "s2", from: 90, durationInFrames: 60, captionFrames: 48, audioSrc: null },
  ]);
  assert.equal(t.durationInFrames, 150);
});

test("ses varsa süre = ses + nefes payı, altyazı ses bitince tamamlanır", () => {
  const t = buildTimeline("r1", scenes, [2, null], 30);
  const expected = Math.ceil((2 + AUDIO_PAD_SEC) * 30);
  assert.deepEqual(t.scenes[0], {
    id: "s1",
    from: 0,
    durationInFrames: expected,
    captionFrames: 60,
    audioSrc: "vo/r1-s1.mp3",
  });
  assert.equal(t.scenes[1].from, expected);
  assert.equal(t.durationInFrames, expected + 60);
});

test("eksik süre dizisi elemanı ses yok sayılır", () => {
  const t = buildTimeline("r1", scenes, [], 30);
  assert.equal(t.durationInFrames, 150);
});
```

- [ ] **Step 3: Testin başarısız olduğunu doğrula**

Run: `npm test`
Expected: FAIL — `Cannot find module .../src/reels-lib/timeline.ts`.

- [ ] **Step 4: Uygulamayı yaz**

`promo/src/reels-lib/timeline.ts`:
```ts
import type { SceneScript, Timeline, TimelineScene } from "./types";

/** Ses bittikten sonra sahne geçişinden önce bırakılan nefes payı. */
export const AUDIO_PAD_SEC = 0.4;
/** Ses yokken altyazının sahnenin ne kadarında tamamlanacağı. */
const SILENT_CAPTION_RATIO = 0.8;

export const voPath = (reelId: string, sceneId: string) => `vo/${reelId}-${sceneId}.mp3`;

export function buildTimeline(
  reelId: string,
  scenes: SceneScript[],
  durationsSec: (number | null)[],
  fps: number,
): Timeline {
  let from = 0;
  const out: TimelineScene[] = scenes.map((scene, i) => {
    const audioSec = durationsSec[i] ?? null;
    const durationInFrames =
      audioSec === null ? Math.round(scene.defaultSec * fps) : Math.ceil((audioSec + AUDIO_PAD_SEC) * fps);
    const captionFrames =
      audioSec === null ? Math.round(durationInFrames * SILENT_CAPTION_RATIO) : Math.ceil(audioSec * fps);
    const item: TimelineScene = {
      id: scene.id,
      from,
      durationInFrames,
      captionFrames,
      audioSrc: audioSec === null ? null : voPath(reelId, scene.id),
    };
    from += durationInFrames;
    return item;
  });
  return { scenes: out, durationInFrames: from };
}
```

- [ ] **Step 5: Testlerin geçtiğini doğrula**

Run: `npm test && npm run typecheck`
Expected: `ℹ pass 4`, `ℹ fail 0`; typecheck çıkış 0.

- [ ] **Step 6: Commit**

```bash
git add src/reels-lib/types.ts src/reels-lib/dims.ts src/reels-lib/timeline.ts tests/timeline.test.ts
git commit -m "feat(promo): reels zaman çizelgesi — ses süresinden sahne kareleri"
```

---

### Task 3: Altyazı zamanlaması (TDD) + Caption bileşeni

**Files:**
- Create: `promo/src/reels-lib/captionTiming.ts`
- Create: `promo/src/reels-lib/Caption.tsx`
- Test: `promo/tests/captionTiming.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

`promo/tests/captionTiming.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitWords, visibleWordCount } from "../src/reels-lib/captionTiming.ts";

test("splitWords boşlukları normalize eder", () => {
  assert.deepEqual(splitWords("  Yalnız   değilsin. "), ["Yalnız", "değilsin."]);
});

test("ilk karede ilk kelime görünür", () => {
  assert.equal(visibleWordCount(4, 0, 40), 1);
});

test("kelimeler süreye eşit dağılır", () => {
  assert.equal(visibleWordCount(4, 9, 40), 1);
  assert.equal(visibleWordCount(4, 10, 40), 2);
  assert.equal(visibleWordCount(4, 39, 40), 4);
});

test("süre bitince ve sonrasında hepsi görünür, asla fazlası değil", () => {
  assert.equal(visibleWordCount(4, 40, 40), 4);
  assert.equal(visibleWordCount(4, 500, 40), 4);
});

test("negatif kare 0, sıfır süre hepsini gösterir", () => {
  assert.equal(visibleWordCount(4, -1, 40), 0);
  assert.equal(visibleWordCount(4, 0, 0), 4);
});
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npm test`
Expected: FAIL — `Cannot find module .../captionTiming.ts`.

- [ ] **Step 3: Uygulamayı yaz**

`promo/src/reels-lib/captionTiming.ts`:
```ts
export const splitWords = (text: string) => text.split(/\s+/).filter(Boolean);

/** `frame` anında yanmış kelime sayısı; kelimeler `captionFrames` boyunca eşit aralıkla yanar. */
export function visibleWordCount(wordCount: number, frame: number, captionFrames: number): number {
  if (frame < 0) return 0;
  if (captionFrames <= 0) return wordCount;
  return Math.min(wordCount, Math.floor((frame * wordCount) / captionFrames) + 1);
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npm test`
Expected: `ℹ pass 9`, `ℹ fail 0`.

- [ ] **Step 5: Caption bileşenini yaz**

Tüm kelimeler baştan soluk yerleşir (düzen zıplamaz), sırası gelen yanar; o an söylenen kelime turuncu, altyazı bitince hepsi mürekkep rengi.

`promo/src/reels-lib/Caption.tsx`:
```tsx
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors, fonts } from "../brand";
import { splitWords, visibleWordCount } from "./captionTiming";
import { SAFE_BOTTOM } from "./dims";

export const Caption: React.FC<{ text: string; captionFrames: number }> = ({ text, captionFrames }) => {
  const frame = useCurrentFrame();
  const words = splitWords(text);
  const shown = visibleWordCount(words.length, frame, captionFrames);
  const done = frame >= captionFrames;
  const appear = interpolate(frame, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: SAFE_BOTTOM + 20,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: colors.white,
          border: `3px solid ${colors.ink}`,
          borderRadius: 20,
          boxShadow: `6px 6px 0 ${colors.ink}`,
          padding: "22px 34px",
          maxWidth: 900,
          textAlign: "center",
          fontFamily: fonts.body,
          fontWeight: 700,
          fontSize: 46,
          lineHeight: 1.3,
          color: colors.ink,
          opacity: appear,
        }}
      >
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              opacity: i < shown ? 1 : 0.18,
              color: !done && i === shown - 1 ? colors.orange : colors.ink,
            }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 6: Tip kontrolü**

Run: `npm run typecheck`
Expected: çıkış 0.

- [ ] **Step 7: Commit**

```bash
git add src/reels-lib/captionTiming.ts src/reels-lib/Caption.tsx tests/captionTiming.test.ts
git commit -m "feat(promo): kelime kelime yanan reels altyazısı"
```

---

### Task 4: SafeArea, EndCard, seslendirme yükleme ve ReelFrame

**Files:**
- Create: `promo/src/reels-lib/SafeArea.tsx`
- Create: `promo/src/reels-lib/EndCard.tsx`
- Create: `promo/src/reels-lib/voiceover.ts`
- Create: `promo/src/reels-lib/ReelFrame.tsx`

- [ ] **Step 1: SafeArea**

`promo/src/reels-lib/SafeArea.tsx`:
```tsx
import React from "react";
import { AbsoluteFill } from "remotion";
import { SAFE_BOTTOM, SAFE_TOP } from "./dims";

const band: React.CSSProperties = { position: "absolute", left: 0, right: 0, background: "rgba(255,0,0,0.25)" };

/** Yalnız önizleme: Instagram arayüzünün kapattığı bantları gösterir. */
export const SafeArea: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div style={{ ...band, top: 0, height: SAFE_TOP }} />
    <div style={{ ...band, bottom: 0, height: SAFE_BOTTOM }} />
  </AbsoluteFill>
);
```

- [ ] **Step 2: EndCard**

Mevcut `src/scenes/Cta.tsx` dilinden türetilir (koyu teal dairesel geçiş, tipografik wordmark, turuncu buton); alttaki telif satırı güvenli alana düştüğü için yok, teklif satırı eklendi.

`promo/src/reels-lib/EndCard.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../brand";

export const OFFER = "Ücretsiz başla · Ayda 2 hak · Kart gerekmez";

export const EndCard: React.FC<{ product?: "STUDIO" | "ATÖLYE" }> = ({ product }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wipe = interpolate(frame, [0, 14], [0, 1600], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 13 } });
  const logo = s(10);
  const sub = s(20);
  const offer = s(26);
  const btn = s(34);
  const pulse = 1 + 0.04 * Math.sin(frame / 8);
  return (
    <AbsoluteFill style={{ background: colors.cream }}>
      <AbsoluteFill
        style={{
          background: colors.darkTeal,
          clipPath: `circle(${wipe}px at 50% 50%)`,
          alignItems: "center",
          justifyContent: "center",
          gap: 34,
          paddingBottom: 120,
        }}
      >
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 150,
            opacity: logo,
            transform: `translateY(${(1 - logo) * 50}px)`,
          }}
        >
          <span style={{ color: colors.logoCream }}>Luden</span>
          <span style={{ color: colors.orange }}>Lab</span>
        </div>
        {product ? (
          <div
            style={{
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: 52,
              letterSpacing: 22,
              color: colors.lightBlueText,
              opacity: sub,
            }}
          >
            {product}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 42,
            color: colors.logoCream,
            opacity: offer,
            transform: `translateY(${(1 - offer) * 30}px)`,
          }}
        >
          {OFFER}
        </div>
        <div
          style={{
            marginTop: 30,
            background: colors.orange,
            border: `4px solid ${colors.logoCream}`,
            borderRadius: 22,
            padding: "28px 80px",
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 58,
            color: colors.white,
            opacity: btn,
            transform: `scale(${btn * pulse})`,
          }}
        >
          ludenlab.com
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Seslendirme yükleme + metadata**

Dosya yoksa `getAudioDurationInSeconds` reddeder → `null` (varsayılan süre). Not: bu fonksiyon Remotion 4.0.484'te "deprecated" işaretli ama çalışır; Mediabunny'ye geçiş kapsam dışı.

`promo/src/reels-lib/voiceover.ts`:
```ts
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { staticFile, type CalculateMetadataFunction } from "remotion";
import { REEL } from "./dims";
import { buildTimeline, voPath } from "./timeline";
import type { ReelScript, Timeline } from "./types";

export type ReelProps = { timeline: Timeline; safeArea: boolean };

export const EMPTY_REEL_PROPS: ReelProps = {
  timeline: { scenes: [], durationInFrames: 1 },
  safeArea: false,
};

export async function loadVoDurations(reel: ReelScript): Promise<(number | null)[]> {
  return Promise.all(
    reel.scenes.map(async (scene) => {
      try {
        return await getAudioDurationInSeconds(staticFile(voPath(reel.id, scene.id)));
      } catch {
        return null;
      }
    }),
  );
}

export const reelMetadata =
  (reel: ReelScript): CalculateMetadataFunction<ReelProps> =>
  async ({ props }) => {
    const timeline = buildTimeline(reel.id, reel.scenes, await loadVoDurations(reel), REEL.fps);
    return { durationInFrames: timeline.durationInFrames, props: { ...props, timeline } };
  };
```

- [ ] **Step 4: ReelFrame**

`promo/src/reels-lib/ReelFrame.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile } from "remotion";
import { colors } from "../brand";
import { Caption } from "./Caption";
import { SafeArea } from "./SafeArea";
import type { ReelScript } from "./types";
import type { ReelProps } from "./voiceover";

/**
 * Sahne bileşenleri kendi karelerine göre animasyon yapar ve ~2 sn içinde
 * oturmalıdır: sahne süresi seslendirmeye göre kısalabilir.
 */
export const ReelFrame: React.FC<ReelProps & { reel: ReelScript; scenes: Record<string, React.FC> }> = ({
  reel,
  scenes,
  timeline,
  safeArea,
}) => (
  <AbsoluteFill style={{ background: colors.cream }}>
    {timeline.scenes.map((t) => {
      const script = reel.scenes.find((s) => s.id === t.id);
      const Scene = scenes[t.id];
      if (!script || !Scene) throw new Error(`${reel.id}: '${t.id}' sahnesi tanımsız`);
      return (
        <Sequence key={t.id} name={t.id} from={t.from} durationInFrames={t.durationInFrames}>
          <Scene />
          {t.audioSrc ? <Html5Audio src={staticFile(t.audioSrc)} /> : null}
          {script.hideCaption ? null : <Caption text={script.vo} captionFrames={t.captionFrames} />}
        </Sequence>
      );
    })}
    {safeArea ? <SafeArea /> : null}
  </AbsoluteFill>
);
```

- [ ] **Step 5: Tip kontrolü ve testler**

Run: `npm run typecheck && npm test`
Expected: typecheck çıkış 0; `ℹ pass 9`.

- [ ] **Step 6: Commit**

```bash
git add src/reels-lib/SafeArea.tsx src/reels-lib/EndCard.tsx src/reels-lib/voiceover.ts src/reels-lib/ReelFrame.tsx
git commit -m "feat(promo): reels iskeleti — ses süresinden metadata, kapanış kartı, güvenli alan"
```

---

### Task 5: Reels 1 metni, kayıt listesi ve metin çıktısı

**Files:**
- Create: `promo/src/reels/r1-lansman/script.ts`
- Create: `promo/scripts/reels.ts`
- Create: `promo/scripts/print-scripts.ts`

- [ ] **Step 1: Reels 1 metni (spec'teki onaylı metin, birebir)**

`promo/src/reels/r1-lansman/script.ts`:
```ts
import type { ReelScript } from "../../reels-lib/types";

export const r1Script: ReelScript = {
  id: "r1",
  slug: "r1-lansman",
  title: "LudenLab yayında",
  scenes: [
    {
      id: "s1",
      vo: "Özel eğitimde her çocuk için ayrı bir materyal hazırlıyorsun.",
      screen: "Her çocuk ayrı. Her materyal ayrı.",
      defaultSec: 3.5,
    },
    {
      id: "s2",
      vo: "Bu yükü artık tek başına taşımak zorunda değilsin.",
      screen: "Yalnız değilsin.",
      defaultSec: 3,
    },
    {
      id: "s3",
      vo: "Yapay zekâ destekli Luden Lab yayında. Dil ve konuşma uzmanları için Studio,",
      screen: "LudenLab yayında · Studio",
      defaultSec: 4,
    },
    {
      id: "s4",
      vo: "özel eğitim öğretmenleri için Atölye.",
      screen: "Atölye",
      defaultSec: 3,
    },
    {
      id: "s5",
      vo: "Ücretsiz başla, kart gerekmez. ludenlab nokta com.",
      screen: "Kapanış kartı",
      defaultSec: 3.5,
      hideCaption: true,
    },
  ],
};
```

- [ ] **Step 2: Node betikleri için kayıt listesi**

`promo/scripts/reels.ts`:
```ts
import { r1Script } from "../src/reels/r1-lansman/script.ts";
import type { ReelScript } from "../src/reels-lib/types.ts";

export type ReelEntry = { script: ReelScript; compositionId: string };

/** Yeni reels eklendikçe buraya ve src/Root.tsx'e eklenir. */
export const REELS: ReelEntry[] = [{ script: r1Script, compositionId: "R1-Lansman" }];
```

- [ ] **Step 3: Metin çıktısı betiği**

Altyazıda "Luden Lab" / "ludenlab nokta com" görünmesi bilinçli: ses aracı doğru okusun diye metin tek kaynak; ekrandaki marka yazımı sahne görsellerinde ayrıca doğru yazılır.

`promo/scripts/print-scripts.ts`:
```ts
import { REELS } from "./reels.ts";
import { voPath } from "../src/reels-lib/timeline.ts";

for (const { script } of REELS) {
  console.log(`\n=== ${script.id} — ${script.title} ===`);
  for (const scene of script.scenes) {
    console.log(`public/${voPath(script.id, scene.id)}\t${scene.vo}`);
  }
}
```

- [ ] **Step 4: Çalıştırıp doğrula**

Run: `npm run scripts`
Expected:
```
=== r1 — LudenLab yayında ===
public/vo/r1-s1.mp3	Özel eğitimde her çocuk için ayrı bir materyal hazırlıyorsun.
...
public/vo/r1-s5.mp3	Ücretsiz başla, kart gerekmez. ludenlab nokta com.
```

- [ ] **Step 5: Tip kontrolü + commit**

Run: `npm run typecheck` → çıkış 0.
```bash
git add src/reels/r1-lansman/script.ts scripts/reels.ts scripts/print-scripts.ts
git commit -m "feat(promo): Reels 1 metni + seslendirme metin çıktısı"
```

---

### Task 6: Reels 1 sahneleri ve kompozisyon

**Files:**
- Create: `promo/src/reels/r1-lansman/LaunchBoard.tsx`
- Create: `promo/src/reels/r1-lansman/scenes.tsx`
- Create: `promo/src/reels/r1-lansman/Reel.tsx`
- Modify: `promo/src/Root.tsx`

- [ ] **Step 1: LaunchBoard (S3 ve S4 ortak pano)**

S3 panoyu animasyonla kurar; S4 aynı panoyu hazır halde gösterip yalnız Atölye kartını ekler — sahne sınırında görsel zıplama olmaz.

`promo/src/reels/r1-lansman/LaunchBoard.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../brand";
import { PosterCard } from "../../lib/PosterCard";

const ModuleCard: React.FC<{ title: string; line: string; accent: string; progress: number }> = ({
  title,
  line,
  accent,
  progress,
}) => (
  <PosterCard
    style={{
      marginTop: 50,
      padding: "36px 44px",
      borderLeft: `18px solid ${accent}`,
      opacity: progress,
      transform: `translateX(${(1 - progress) * -140}px)`,
    }}
  >
    <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 84, color: accent, lineHeight: 1 }}>
      {title}
    </div>
    <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 46, color: colors.ink, marginTop: 14 }}>
      {line}
    </div>
  </PosterCard>
);

export const LaunchBoard: React.FC<{ enter: boolean; showAtolye: boolean }> = ({ enter, showAtolye }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 13 } });
  const badge = enter ? s(0) : 1;
  const mark = enter ? s(6) : 1;
  const studio = enter ? s(18) : 1;
  const atolye = showAtolye ? s(4) : 0;
  return (
    <AbsoluteFill style={{ background: colors.cream, padding: "260px 90px 0" }}>
      <div
        style={{
          alignSelf: "flex-start",
          background: colors.orange,
          color: colors.white,
          fontFamily: fonts.body,
          fontWeight: 700,
          fontSize: 38,
          letterSpacing: 8,
          padding: "12px 28px",
          borderRadius: 999,
          border: `3px solid ${colors.ink}`,
          opacity: badge,
          transform: `scale(${0.6 + 0.4 * badge})`,
        }}
      >
        YAYINDA
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 170,
          lineHeight: 1,
          marginTop: 30,
          opacity: mark,
          transform: `translateY(${(1 - mark) * 50}px)`,
        }}
      >
        <span style={{ color: colors.ink }}>Luden</span>
        <span style={{ color: colors.orange }}>Lab</span>
      </div>
      <ModuleCard title="Studio" line="Dil ve konuşma uzmanları için" accent={colors.studioBlue} progress={studio} />
      <ModuleCard title="Atölye" line="Özel eğitim öğretmenleri için" accent={colors.orange} progress={atolye} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Sahneler**

`promo/src/reels/r1-lansman/scenes.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../brand";
import { PosterCard } from "../../lib/PosterCard";
import { Squiggle } from "../../lib/Squiggle";
import { EndCard } from "../../reels-lib/EndCard";
import { LaunchBoard } from "./LaunchBoard";

/** Dağınık materyal sayfaları: x, y, son açı, gecikme. */
const SHEETS = [
  { x: 90, y: 300, r: -12, d: 0 },
  { x: 640, y: 250, r: 9, d: 4 },
  { x: 360, y: 420, r: -4, d: 8 },
  { x: 760, y: 540, r: 14, d: 12 },
  { x: 130, y: 610, r: 7, d: 16 },
];

const Sheet: React.FC<{ rotate: number; style: React.CSSProperties }> = ({ rotate, style }) => (
  <PosterCard rotate={rotate} shadow={6} style={{ position: "absolute", width: 220, height: 280, padding: 26, ...style }}>
    <div style={{ height: 18, width: "70%", background: colors.paleBlue, borderRadius: 9, marginBottom: 16 }} />
    <div style={{ height: 14, width: "90%", background: colors.cream, borderRadius: 7, marginBottom: 12 }} />
    <div style={{ height: 14, width: "60%", background: colors.cream, borderRadius: 7 }} />
  </PosterCard>
);

const Headline: React.FC<{ lines: string[]; top: number; fontSize: number; delay: number }> = ({
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

export const S1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: colors.cream }}>
      {SHEETS.map((s, i) => {
        const p = spring({ frame: frame - s.d, fps, config: { damping: 14 } });
        return <Sheet key={i} rotate={s.r * p} style={{ left: s.x, top: s.y - (1 - p) * 500, opacity: p }} />;
      })}
      <Headline lines={["Her çocuk ayrı.", "Her materyal ayrı."]} top={1000} fontSize={96} delay={18} />
    </AbsoluteFill>
  );
};

export const S2Yalniz: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settle = spring({ frame, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill style={{ background: colors.cream }}>
      {SHEETS.slice(0, 3).map((s, i) => (
        <Sheet
          key={i}
          rotate={s.r + (i * 3 - 3 - s.r) * settle}
          style={{ left: s.x + (430 + i * 18 - s.x) * settle, top: s.y + (380 + i * 18 - s.y) * settle }}
        />
      ))}
      <Headline lines={["Yalnız", "değilsin."]} top={960} fontSize={150} delay={6} />
      <div style={{ position: "absolute", left: 90, top: 1300 }}>
        <Squiggle start={24} />
      </div>
    </AbsoluteFill>
  );
};

export const S3Studio: React.FC = () => <LaunchBoard enter showAtolye={false} />;

export const S4Atolye: React.FC = () => <LaunchBoard enter={false} showAtolye />;

export const S5Kapanis: React.FC = () => <EndCard />;
```

- [ ] **Step 3: Kompozisyon bileşeni**

`promo/src/reels/r1-lansman/Reel.tsx`:
```tsx
import React from "react";
import { ReelFrame } from "../../reels-lib/ReelFrame";
import type { ReelProps } from "../../reels-lib/voiceover";
import { r1Script } from "./script";
import { S1Hook, S2Yalniz, S3Studio, S4Atolye, S5Kapanis } from "./scenes";

const SCENES: Record<string, React.FC> = {
  s1: S1Hook,
  s2: S2Yalniz,
  s3: S3Studio,
  s4: S4Atolye,
  s5: S5Kapanis,
};

export const R1Lansman: React.FC<ReelProps> = (props) => <ReelFrame reel={r1Script} scenes={SCENES} {...props} />;
```

- [ ] **Step 4: Root'a kaydet**

`promo/src/Root.tsx` — importların sonuna ekle:
```tsx
import { REEL } from "./reels-lib/dims";
import { EMPTY_REEL_PROPS, reelMetadata } from "./reels-lib/voiceover";
import { r1Script } from "./reels/r1-lansman/script";
import { R1Lansman } from "./reels/r1-lansman/Reel";
```
`Root` içindeki fragment'ın sonuna (`<Composition id="Cta" .../>` satırından sonra) ekle:
```tsx
    <Composition
      id="R1-Lansman"
      component={R1Lansman}
      durationInFrames={1}
      {...REEL}
      defaultProps={EMPTY_REEL_PROPS}
      calculateMetadata={reelMetadata(r1Script)}
    />
```

- [ ] **Step 5: Tip kontrolü + testler**

Run: `npm run typecheck && npm test`
Expected: typecheck 0; `ℹ pass 9`.

- [ ] **Step 6: Kare kontrolleri (ses yok → varsayılan süreler)**

Zaman çizelgesi: s1 0–104, s2 105–194, s3 195–314, s4 315–404, s5 405–509 (toplam 510 kare = 17 sn).

Run:
```bash
for f in 60 170 290 390 480; do npx remotion still src/index.ts R1-Lansman out/r1-$f.png --frame=$f; done
npx remotion still src/index.ts R1-Lansman out/r1-safe-390.png --frame=390 --props='{"safeArea":true,"timeline":{"scenes":[],"durationInFrames":1}}'
```
Expected: 6 PNG. Her birini görsel olarak incele:
- 60: dağınık sayfalar + "Her çocuk ayrı. / Her materyal ayrı." (taşma yok, satır kırılmıyor) + altta altyazı kutusu
- 170: sayfalar üst üste toplanmış, "Yalnız değilsin." + dalga
- 290: YAYINDA rozeti, LudenLab, Studio kartı
- 390: Atölye kartı da görünür
- 480: koyu teal kapanış, teklif satırı tek satır, ludenlab.com butonu; altyazı YOK
- safe-390: kırmızı bantlarla yazı çakışmıyor (altyazı kutusu alt bandın üstünde)

Yazı taşıyorsa ilgili `fontSize` değerini düşür, stilleri tekrar üret, sonra devam et.

- [ ] **Step 7: Commit**

```bash
git add src/reels/r1-lansman/LaunchBoard.tsx src/reels/r1-lansman/scenes.tsx src/reels/r1-lansman/Reel.tsx src/Root.tsx
git commit -m "feat(promo): Reels 1 'LudenLab yayında' sahneleri ve kompozisyonu"
```

---

### Task 7: Render betiği + ses yolunun uçtan uca doğrulanması

**Files:**
- Create: `promo/scripts/render-reel.ts`

- [ ] **Step 1: Render betiği**

`promo/scripts/render-reel.ts`:
```ts
import { execFileSync } from "node:child_process";
import { REELS } from "./reels.ts";

const args = process.argv.slice(2);
const ids = args[0] === "all" ? REELS.map((r) => r.script.id) : args;
const unknown = ids.filter((id) => !REELS.some((r) => r.script.id === id));

if (ids.length === 0 || unknown.length > 0) {
  const known = REELS.map((r) => r.script.id).join("|");
  console.error(`Kullanım: npm run reel -- <${known}> | npm run reels${unknown.length ? `\nBilinmeyen: ${unknown.join(", ")}` : ""}`);
  process.exit(1);
}

const render = (compositionId: string, out: string, extra: string[] = []) =>
  execFileSync("npx", ["remotion", "render", "src/index.ts", compositionId, out, ...extra], { stdio: "inherit" });

for (const id of ids) {
  const { script, compositionId } = REELS.find((r) => r.script.id === id)!;
  render(compositionId, `out/reels/${script.slug}-vo.mp4`);
  render(compositionId, `out/reels/${script.slug}.mp4`, ["--muted"]);
}
```

- [ ] **Step 2: Hatalı kullanımı doğrula**

Run: `npm run reel -- r9`
Expected: `Kullanım: npm run reel -- <r1> | npm run reels` + `Bilinmeyen: r9`, çıkış kodu 1.

- [ ] **Step 3: Test sesiyle zamanlamanın sese uyduğunu doğrula**

2 sn'lik geçici bir test tonu oluştur (commit EDİLMEZ):
```bash
npx remotion ffmpeg -y -f lavfi -i "sine=frequency=440:duration=2" public/vo/r1-s1.mp3
npm run reel -- r1
npx remotion ffprobe -v error -show_entries format=duration -of csv=p=0 out/reels/r1-lansman-vo.mp4
npx remotion ffprobe -v error -show_entries stream=codec_type -of csv=p=0 out/reels/r1-lansman.mp4
```
Expected:
- s1 = ceil(2.4 × 30) = 72 kare → toplam 72 + 90 + 120 + 90 + 105 = 477 kare → süre ≈ `15.9`
- `-vo.mp4` içinde ses akışı var; sessiz `r1-lansman.mp4` için ikinci komut yalnız `video` basar.

- [ ] **Step 4: Test sesini sil ve sessiz nihai render'ı al**

```bash
rm public/vo/r1-s1.mp3
npm run reel -- r1
npx remotion ffprobe -v error -show_entries format=duration -of csv=p=0 out/reels/r1-lansman.mp4
```
Expected: süre ≈ `17.0` (510 kare). `git status` içinde `public/vo/` altında mp3 YOK.

- [ ] **Step 5: MP4'ü izle**

`out/reels/r1-lansman.mp4` dosyasını aç; sahne geçişlerinde zıplama, altyazı ile sahne yazısı çakışması, kapanışta altyazı olmaması kontrol edilir.

- [ ] **Step 6: Commit**

```bash
git add scripts/render-reel.ts
git commit -m "feat(promo): reels render betiği — seslendirmeli + sessiz çıktı"
```

---

## Kullanıcıya teslim notu (plan sonunda)

- Sessiz önizleme: `promo/out/reels/r1-lansman.mp4`.
- Ses dosyaları gelince: `public/vo/r1-s1.mp3 … r1-s5.mp3` olarak koy → `npm run reel -- r1` → süreler kendiliğinden sese uyar.
- Tek dosya gelirse: sahne sınırı saniyeleri ayrı bir görevde `script.ts`'e eklenecek (bu planın kapsamında değil — YAGNI, gerekirse).
- Sıradaki planlar: Reels 2–5 (her biri gerçek görsel varlık toplama + sahneler).
