# LudenLab Studio Tanıtım Videosu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remotion ile 30 saniyelik, 1080×1920 (9:16), 30fps, marka "Poster" dilinde Studio tanıtım MP4'ü üretmek.

**Architecture:** Repo kökünde bağımsız `promo/` Remotion projesi. 6 sahne ayrı React bileşeni, ortak `brand.ts` token dosyası ve `lib/` motion parçaları. Her sahne için ayrı debug `<Composition>` (still ile doğrulama) + tek master kompozisyon `StudioTanitim916`. Görsel doğrulama: `npx remotion still` → PNG'yi gözle incele (Read).

**Tech Stack:** Remotion 4, React 19, TypeScript, lucide-react. Fontlar CDN'den (`Bricolage Grotesque` Google Fonts, `Satoshi` Fontshare) `delayRender` ile yüklenir.

**Spec:** `docs/superpowers/specs/2026-07-04-studio-tanitim-video-design.md`

**Zaman cetveli (30fps):** Hook 0–90 · Dashboard 90–240 · Öğrenme Kartları 240–420 · Sesletim 420–570 · Sosyal Öykü 570–750 · CTA 750–900.

**Doğrulama still kareleri (master komp içinde):** 60, 200, 350, 500, 680, 850.

---

### Task 1: Proje iskeleti + marka token'ları + font yükleme

**Files:**
- Create: `promo/package.json`, `promo/tsconfig.json`, `promo/remotion.config.ts`, `promo/.gitignore`
- Create: `promo/src/index.ts`, `promo/src/Root.tsx`, `promo/src/brand.ts`, `promo/src/fonts.ts`

- [ ] **Step 1: Dosyaları yaz**

`promo/package.json`:
```json
{
  "name": "ludenlab-promo",
  "private": true,
  "scripts": {
    "studio": "remotion studio src/index.ts",
    "render916": "remotion render src/index.ts StudioTanitim916 out/studio-tanitim-916.mp4"
  },
  "dependencies": {
    "@remotion/cli": "^4.0.0",
    "lucide-react": "^0.525.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "remotion": "^4.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "typescript": "^5.5.0"
  }
}
```

`promo/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "lib": ["DOM", "ES2022"]
  },
  "include": ["src", "remotion.config.ts"]
}
```

`promo/remotion.config.ts`:
```ts
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
```

`promo/.gitignore`:
```
node_modules/
out/
```

`promo/src/brand.ts` (değerler `docs/brand/ludenlab-gorsel-tasarim-claude-project.md`'den birebir):
```ts
export const colors = {
  cream: "#fff8ec",
  ink: "#0e1e26",
  orange: "#fe703a",
  studioBlue: "#4a90e2",
  darkTeal: "#023435",
  logoCream: "#f5e8c7",
  white: "#ffffff",
  green: "#0f6e56",
  paleBlue: "#e6f0fa",
  amber: "#ba7517",
  gray: "#5f5e5a",
  lightBlueText: "#8fd0e8",
};

export const fonts = {
  display: "'Bricolage Grotesque', sans-serif",
  body: "'Satoshi', sans-serif",
};
```

`promo/src/fonts.ts`:
```ts
import { continueRender, delayRender } from "remotion";

const LINKS = [
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=block",
  "https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=block",
];

if (typeof document !== "undefined") {
  const handle = delayRender("fontlar yükleniyor");
  for (const href of LINKS) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
  (async () => {
    await Promise.all([
      document.fonts.load("800 100px 'Bricolage Grotesque'"),
      document.fonts.load("500 100px Satoshi"),
      document.fonts.load("700 100px Satoshi"),
    ]);
    await document.fonts.ready;
    continueRender(handle);
  })();
}
```

`promo/src/index.ts`:
```ts
import { registerRoot } from "remotion";
import { Root } from "./Root";

registerRoot(Root);
```

`promo/src/Root.tsx` (geçici font/renk test kompozisyonu — Task 3–8'de sahne kompozisyonları eklenecek):
```tsx
import React from "react";
import { AbsoluteFill, Composition } from "remotion";
import "./fonts";
import { colors, fonts } from "./brand";

const BrandTest: React.FC = () => (
  <AbsoluteFill style={{ background: colors.cream, justifyContent: "center", alignItems: "center", gap: 30 }}>
    <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 90, color: colors.ink }}>
      Bricolage — ışğüçöâ
    </div>
    <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 60, color: colors.orange }}>
      Satoshi — ışğüçöâ
    </div>
  </AbsoluteFill>
);

export const Root: React.FC = () => (
  <>
    <Composition id="BrandTest" component={BrandTest} durationInFrames={30} fps={30} width={1080} height={1920} />
  </>
);
```

- [ ] **Step 2: Bağımlılıkları kur**

Run: `cd promo && npm install`
Expected: hatasız biter, `node_modules/` oluşur.

- [ ] **Step 3: Font test still'i al ve incele**

Run: `cd promo && npx remotion still src/index.ts BrandTest out/test-brand.png --frame=0`
Expected: PNG oluşur. PNG'yi Read ile aç: iki satır farklı fontta, Türkçe karakterler (ı ş ğ ü ç ö â) bozulmamış, zemin krem. Fontlar fallback'e düşmüşse (iki satır aynı görünüyorsa) `fonts.ts` yüklemesini düzelt.

- [ ] **Step 4: Commit**

```bash
git add promo/ && git commit -m "feat(promo): Remotion iskeleti + marka token'ları + CDN font yükleme"
```

---

### Task 2: Ortak motion parçaları (lib)

**Files:**
- Create: `promo/src/lib/PosterCard.tsx`, `promo/src/lib/TypeWriter.tsx`, `promo/src/lib/Squiggle.tsx`, `promo/src/lib/Cursor.tsx`, `promo/src/lib/ToolHeader.tsx`

- [ ] **Step 1: Bileşenleri yaz**

`promo/src/lib/PosterCard.tsx`:
```tsx
import React from "react";
import { colors } from "../brand";

export const PosterCard: React.FC<{
  rotate?: number;
  shadow?: number;
  bg?: string;
  radius?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ rotate = 0, shadow = 8, bg = colors.white, radius = 24, style, children }) => (
  <div
    style={{
      background: bg,
      border: `3px solid ${colors.ink}`,
      borderRadius: radius,
      boxShadow: `${shadow}px ${shadow}px 0 ${colors.ink}`,
      transform: `rotate(${rotate}deg)`,
      ...style,
    }}
  >
    {children}
  </div>
);
```

`promo/src/lib/TypeWriter.tsx`:
```tsx
import React from "react";
import { useCurrentFrame } from "remotion";
import { colors, fonts } from "../brand";

export const TypeWriter: React.FC<{
  text: string;
  start: number;
  framesPerChar?: number;
  fontSize?: number;
}> = ({ text, start, framesPerChar = 3, fontSize = 52 }) => {
  const frame = useCurrentFrame();
  const chars = Math.max(0, Math.floor((frame - start) / framesPerChar));
  const shown = text.slice(0, chars);
  const caretOn = Math.floor(frame / 12) % 2 === 0;
  return (
    <span style={{ fontFamily: fonts.body, fontWeight: 500, fontSize, color: colors.ink }}>
      {shown}
      <span style={{ color: colors.orange, opacity: caretOn ? 1 : 0 }}>|</span>
    </span>
  );
};
```

`promo/src/lib/Squiggle.tsx`:
```tsx
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../brand";

export const Squiggle: React.FC<{ start: number; width?: number; color?: string }> = ({
  start,
  width = 420,
  color = colors.orange,
}) => {
  const frame = useCurrentFrame();
  const len = 600;
  const off = interpolate(frame, [start, start + 20], [len, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <svg width={width} height={36} viewBox="0 0 420 36" fill="none">
      <path
        d="M8 22 Q 42 6, 76 22 T 144 22 T 212 22 T 280 22 T 348 22 T 412 22"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={off}
      />
    </svg>
  );
};
```

`promo/src/lib/Cursor.tsx`:
```tsx
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../brand";

export const Cursor: React.FC<{
  keyframes: { frame: number; x: number; y: number }[];
  clickAt?: number;
  appearAt: number;
}> = ({ keyframes, clickAt, appearAt }) => {
  const frame = useCurrentFrame();
  const fs = keyframes.map((k) => k.frame);
  const x = interpolate(frame, fs, keyframes.map((k) => k.x), {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, fs, keyframes.map((k) => k.y), {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const clickScale =
    clickAt === undefined
      ? 1
      : interpolate(frame, [clickAt - 4, clickAt, clickAt + 6], [1, 0.7, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const opacity = interpolate(frame, [appearAt, appearAt + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 44,
        height: 44,
        borderRadius: 22,
        background: colors.ink,
        opacity: opacity * 0.85,
        transform: `scale(${clickScale})`,
        border: `3px solid ${colors.cream}`,
      }}
    />
  );
};
```

`promo/src/lib/ToolHeader.tsx`:
```tsx
import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../brand";

export const ToolHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 13 } });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        opacity: s,
        transform: `translateY(${(1 - s) * 40}px)`,
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 24,
          background: colors.studioBlue,
          border: `3px solid ${colors.ink}`,
          boxShadow: `6px 6px 0 ${colors.ink}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.white,
        }}
      >
        {icon}
      </div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 76, color: colors.ink }}>{title}</div>
    </div>
  );
};
```

- [ ] **Step 2: Tip kontrolü**

Run: `cd promo && npx tsc --noEmit`
Expected: hatasız.

- [ ] **Step 3: Commit**

```bash
git add promo/src/lib && git commit -m "feat(promo): PosterCard, TypeWriter, Squiggle, Cursor, ToolHeader motion parçaları"
```

---

### Task 3: Sahne 1 — Hook (0–90)

**Files:**
- Create: `promo/src/scenes/Hook.tsx`
- Modify: `promo/src/Root.tsx` (Hook debug kompozisyonu ekle)

- [ ] **Step 1: Sahneyi yaz**

`promo/src/scenes/Hook.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../brand";
import { Squiggle } from "../lib/Squiggle";

const WORDS = ["Seans", "materyali", "hazırlamak", "saatler", "almasın."];

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const label = spring({ frame: frame - 3, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ background: colors.cream, justifyContent: "center", padding: 90 }}>
      <div
        style={{
          fontFamily: fonts.body,
          fontWeight: 700,
          fontSize: 40,
          letterSpacing: 10,
          color: colors.orange,
          marginBottom: 56,
          opacity: label,
        }}
      >
        LUDENLAB STUDIO
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", columnGap: 30 }}>
        {WORDS.map((w, i) => {
          const s = spring({ frame: frame - 8 - i * 5, fps, config: { damping: 13 } });
          return (
            <span
              key={w}
              style={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: 112,
                lineHeight: 1.18,
                color: colors.ink,
                opacity: s,
                display: "inline-block",
                transform: `translateY(${(1 - s) * 60}px)`,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      <div style={{ marginTop: 48 }}>
        <Squiggle start={45} />
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Root'a debug kompozisyonu ekle**

`promo/src/Root.tsx` içinde import bloğuna `import { Hook } from "./scenes/Hook";` ekle; `</>` kapanışından önce şu satırı ekle:
```tsx
    <Composition id="Hook" component={Hook} durationInFrames={90} fps={30} width={1080} height={1920} />
```

- [ ] **Step 3: Still al ve incele**

Run: `cd promo && npx remotion still src/index.ts Hook out/hook-60.png --frame=60`
Expected: PNG'de tam metin görünür, kelimeler taşmıyor, squiggle çizilmiş, Türkçe karakterler doğru. Sorun varsa font boyutu/padding ayarla, still'i tekrar al.

- [ ] **Step 4: Commit**

```bash
git add promo/src && git commit -m "feat(promo): Hook sahnesi — kinetik başlık + squiggle"
```

---

### Task 4: Sahne 2 — Dashboard (90–240)

**Files:**
- Create: `promo/src/scenes/Dashboard.tsx`
- Modify: `promo/src/Root.tsx`

- [ ] **Step 1: Sahneyi yaz**

`promo/src/scenes/Dashboard.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CalendarDays, Users } from "lucide-react";
import { colors, fonts } from "../brand";
import { PosterCard } from "../lib/PosterCard";
import { Cursor } from "../lib/Cursor";

export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = spring({ frame, fps, config: { damping: 13 } });
  const panel = spring({ frame: frame - 8, fps, config: { damping: 14 }, durationInFrames: 35 });
  const chip = (d: number) => spring({ frame: frame - d, fps, config: { damping: 12 } });
  const btnScale = interpolate(frame, [116, 122, 130], [1, 0.93, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", padding: 70 }}>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 72,
          color: colors.ink,
          marginTop: 20,
          opacity: title,
          transform: `translateY(${(1 - title) * 40}px)`,
        }}
      >
        Tüm çalışmanız tek panelde
      </div>
      <PosterCard
        style={{
          width: 880,
          marginTop: 56,
          padding: 44,
          display: "flex",
          flexDirection: "column",
          gap: 30,
          transform: `translateY(${(1 - panel) * 1100}px)`,
        }}
      >
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 52, color: colors.ink }}>Merhaba!</div>
        <div style={{ display: "flex", gap: 26 }}>
          <PosterCard bg={colors.paleBlue} rotate={-1.5} shadow={5} style={{ flex: 1, padding: 26, opacity: chip(24) }}>
            <Users size={44} color={colors.studioBlue} strokeWidth={2.4} />
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 64, color: colors.ink }}>12</div>
            <div style={{ fontFamily: fonts.body, fontSize: 34, color: colors.gray }}>öğrenci</div>
          </PosterCard>
          <PosterCard rotate={1} shadow={5} style={{ flex: 1, padding: 26, opacity: chip(30) }}>
            <CalendarDays size={44} color={colors.orange} strokeWidth={2.4} />
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 64, color: colors.ink }}>5</div>
            <div style={{ fontFamily: fonts.body, fontSize: 34, color: colors.gray }}>bugünkü seans</div>
          </PosterCard>
        </div>
        <PosterCard shadow={5} style={{ padding: 30, opacity: chip(38) }}>
          <div style={{ fontFamily: fonts.body, fontSize: 32, color: colors.gray, marginBottom: 18 }}>Bugünkü takvim</div>
          {[100, 78, 56].map((w, i) => (
            <div
              key={i}
              style={{
                height: 34,
                width: `${w}%`,
                background: colors.paleBlue,
                border: `2px solid ${colors.ink}`,
                borderRadius: 10,
                marginBottom: 14,
              }}
            />
          ))}
        </PosterCard>
        <div
          style={{
            alignSelf: "center",
            background: colors.studioBlue,
            border: `3px solid ${colors.ink}`,
            borderRadius: 18,
            boxShadow: `6px 6px 0 ${colors.ink}`,
            padding: "22px 70px",
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 42,
            color: colors.white,
            opacity: chip(46),
            transform: `scale(${btnScale})`,
          }}
        >
          Araçlar →
        </div>
      </PosterCard>
      <Cursor
        appearAt={85}
        keyframes={[
          { frame: 85, x: 850, y: 1600 },
          { frame: 114, x: 540, y: 1320 },
        ]}
        clickAt={122}
      />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Root'a ekle**

Import: `import { Dashboard } from "./scenes/Dashboard";` ve kompozisyon satırı:
```tsx
    <Composition id="Dashboard" component={Dashboard} durationInFrames={150} fps={30} width={1080} height={1920} />
```

- [ ] **Step 3: Still al ve incele (imleç konumu dahil)**

Run: `cd promo && npx remotion still src/index.ts Dashboard out/dash-125.png --frame=125`
Expected: panel tam yerleşmiş, imleç "Araçlar →" butonunun üzerinde (tık anı). İmleç butondan uzaksa `Cursor keyframes` x/y değerlerini PNG'ye göre düzelt, tekrar still al.

- [ ] **Step 4: Commit**

```bash
git add promo/src && git commit -m "feat(promo): Dashboard sahnesi — panel, stat çipleri, imleç tıklaması"
```

---

### Task 5: Sahne 3 — Öğrenme Kartları (240–420)

**Files:**
- Create: `promo/src/scenes/OgrenmeKartlari.tsx`
- Modify: `promo/src/Root.tsx`

- [ ] **Step 1: Sahneyi yaz**

`promo/src/scenes/OgrenmeKartlari.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Apple, Bike, Car, LayoutGrid, Sun } from "lucide-react";
import { colors, fonts } from "../brand";
import { PosterCard } from "../lib/PosterCard";
import { ToolHeader } from "../lib/ToolHeader";
import { TypeWriter } from "../lib/TypeWriter";

const CARDS = [
  { word: "araba", Icon: Car, rot: -2, color: colors.studioBlue, delay: 66 },
  { word: "elma", Icon: Apple, rot: 1.5, color: colors.orange, delay: 72 },
  { word: "güneş", Icon: Sun, rot: 1, color: colors.amber, delay: 78 },
  { word: "bisiklet", Icon: Bike, rot: -1, color: colors.green, delay: 84 },
];

export const OgrenmeKartlari: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inputIn = spring({ frame: frame - 8, fps, config: { damping: 13 } });
  const caption = spring({ frame: frame - 125, fps, config: { damping: 13 } });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", padding: 70, gap: 44 }}>
      <div style={{ marginTop: 20 }}>
        <ToolHeader icon={<LayoutGrid size={52} strokeWidth={2.4} />} title="Öğrenme Kartları" />
      </div>
      <PosterCard
        style={{
          width: 880,
          padding: "28px 36px",
          opacity: inputIn,
          transform: `translateY(${(1 - inputIn) * 60}px)`,
        }}
      >
        <TypeWriter text="günlük nesneler" start={16} />
      </PosterCard>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 44, width: 880 }}>
        {CARDS.map(({ word, Icon, rot, color, delay }) => {
          const s = spring({ frame: frame - delay, fps, config: { damping: 12 } });
          return (
            <PosterCard
              key={word}
              rotate={rot * s}
              style={{
                height: 420,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 26,
                opacity: s,
                transform: `translateY(${(1 - s) * 120}px) rotate(${rot * s}deg) scale(${0.7 + 0.3 * s})`,
              }}
            >
              <Icon size={150} color={color} strokeWidth={1.8} />
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 56, color: colors.ink }}>{word}</div>
            </PosterCard>
          );
        })}
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontWeight: 500,
          fontSize: 46,
          color: colors.gray,
          opacity: caption,
        }}
      >
        Kelimeyi yaz, kartlar hazır.
      </div>
    </AbsoluteFill>
  );
};
```

Not: `PosterCard` hem `rotate` prop'u hem `style.transform` alıyor; `style` spread'i sonda olduğu için `style.transform` kazanır — rotate'i transform içinde veriyoruz, `rotate` prop'unun etkisi yok. Kod bilinçli böyle.

- [ ] **Step 2: Root'a ekle**

Import: `import { OgrenmeKartlari } from "./scenes/OgrenmeKartlari";` ve:
```tsx
    <Composition id="OgrenmeKartlari" component={OgrenmeKartlari} durationInFrames={180} fps={30} width={1080} height={1920} />
```

- [ ] **Step 3: Still al ve incele**

Run: `cd promo && npx remotion still src/index.ts OgrenmeKartlari out/kartlar-110.png --frame=110`
Expected: input'ta "günlük nesneler" tam yazılmış, 4 kart yerleşmiş, taşma yok. Frame 30'da da bir still al (`out/kartlar-30.png`): yazı yarım, kartlar henüz yok — daktilo efekti çalışıyor.

- [ ] **Step 4: Commit**

```bash
git add promo/src && git commit -m "feat(promo): Öğrenme Kartları sahnesi — daktilo input + stagger kartlar"
```

---

### Task 6: Sahne 4 — Sesletim (420–570)

**Files:**
- Create: `promo/src/scenes/Sesletim.tsx`
- Modify: `promo/src/Root.tsx`

- [ ] **Step 1: Sahneyi yaz**

`promo/src/scenes/Sesletim.tsx`:
```tsx
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AudioLines, FileDown, Image as ImageIcon } from "lucide-react";
import { colors, fonts } from "../brand";
import { PosterCard } from "../lib/PosterCard";
import { ToolHeader } from "../lib/ToolHeader";

const PHONEMES = ["/r/", "/s/", "/k/"];
const WORDS = [
  { word: "araba", delay: 48 },
  { word: "resim", delay: 56 },
  { word: "armut", delay: 64 },
];

export const Sesletim: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chipsIn = spring({ frame: frame - 10, fps, config: { damping: 13 } });
  const selBg = interpolateColors(frame, [26, 36], [colors.white, colors.studioBlue]);
  const selFg = interpolateColors(frame, [26, 36], [colors.gray, colors.white]);
  const selPop = 1 + 0.12 * Math.sin(Math.PI * interpolate(frame, [26, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const stampS = spring({ frame: frame - 105, fps, config: { damping: 11 } });
  const stampScale = interpolate(stampS, [0, 1], [2.4, 1]);
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", padding: 70, gap: 46 }}>
      <div style={{ marginTop: 20 }}>
        <ToolHeader icon={<AudioLines size={52} strokeWidth={2.4} />} title="Sesletim" />
      </div>
      <div style={{ display: "flex", gap: 24, opacity: chipsIn }}>
        {PHONEMES.map((p, i) => {
          const selected = i === 0;
          return (
            <div
              key={p}
              style={{
                background: selected ? selBg : colors.white,
                color: selected ? selFg : colors.gray,
                border: `3px solid ${colors.ink}`,
                borderRadius: 999,
                boxShadow: `5px 5px 0 ${colors.ink}`,
                padding: "16px 44px",
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: 52,
                transform: selected ? `scale(${selPop})` : undefined,
              }}
            >
              {p}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 30, width: 880 }}>
        {WORDS.map(({ word, delay }) => {
          const s = spring({ frame: frame - delay, fps, config: { damping: 13 } });
          return (
            <PosterCard
              key={word}
              style={{
                padding: 30,
                display: "flex",
                alignItems: "center",
                gap: 30,
                opacity: s,
                transform: `translateX(${(1 - s) * 300}px)`,
              }}
            >
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 20,
                  background: colors.paleBlue,
                  border: `2px solid ${colors.ink}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ImageIcon size={54} color={colors.studioBlue} strokeWidth={2} />
              </div>
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 60, color: colors.ink }}>{word}</div>
            </PosterCard>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 220,
          right: 120,
          opacity: stampS,
          transform: `scale(${stampScale}) rotate(-7deg)`,
        }}
      >
        <PosterCard bg={colors.green} shadow={6} style={{ padding: "24px 44px", display: "flex", alignItems: "center", gap: 20 }}>
          <FileDown size={48} color={colors.white} strokeWidth={2.4} />
          <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 46, color: colors.white }}>PDF hazır</span>
        </PosterCard>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Root'a ekle**

Import: `import { Sesletim } from "./scenes/Sesletim";` ve:
```tsx
    <Composition id="Sesletim" component={Sesletim} durationInFrames={150} fps={30} width={1080} height={1920} />
```

- [ ] **Step 3: Still al ve incele**

Run: `cd promo && npx remotion still src/index.ts Sesletim out/sesletim-120.png --frame=120`
Expected: /r/ çipi mavi dolgulu, 3 kelime kartı yerleşmiş, "PDF hazır" rozeti görünür (damga sonrası).

- [ ] **Step 4: Commit**

```bash
git add promo/src && git commit -m "feat(promo): Sesletim sahnesi — fonem seçimi, kelime listesi, PDF damgası"
```

---

### Task 7: Sahne 5 — Sosyal Öykü (570–750)

**Files:**
- Create: `promo/src/scenes/SosyalOyku.tsx`
- Modify: `promo/src/Root.tsx`

- [ ] **Step 1: Sahneyi yaz**

`promo/src/scenes/SosyalOyku.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BookOpen, School } from "lucide-react";
import { colors, fonts } from "../brand";
import { PosterCard } from "../lib/PosterCard";
import { ToolHeader } from "../lib/ToolHeader";

const PAGES = [
  { rot: -9, x: -200, z: 1 },
  { rot: 8, x: 200, z: 2 },
  { rot: 0, x: 0, z: 3 },
];

export const SosyalOyku: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fan = spring({ frame: frame - 18, fps, config: { damping: 13 }, durationInFrames: 35 });
  const caption = spring({ frame: frame - 120, fps, config: { damping: 13 } });
  const lineW = (base: number, d: number) =>
    interpolate(frame, [60 + d, 80 + d], [0, base], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", padding: 70 }}>
      <div style={{ marginTop: 20 }}>
        <ToolHeader icon={<BookOpen size={52} strokeWidth={2.4} />} title="Sosyal Öykü" />
      </div>
      <div style={{ position: "relative", width: 880, height: 900, marginTop: 60 }}>
        {PAGES.map(({ rot, x, z }, i) => (
          <PosterCard
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: 60,
              width: 520,
              height: 720,
              zIndex: z,
              padding: 36,
              display: "flex",
              flexDirection: "column",
              gap: 24,
              transform: `translateX(-50%) translateX(${x * fan}px) rotate(${rot * fan}deg)`,
            }}
          >
            {z === 3 ? (
              <>
                <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 50, color: colors.ink }}>
                  Okula gidiyorum
                </div>
                <div
                  style={{
                    flex: 1,
                    background: colors.paleBlue,
                    border: `2px solid ${colors.ink}`,
                    borderRadius: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <School size={130} color={colors.studioBlue} strokeWidth={1.6} />
                </div>
                {[100, 84, 58].map((w, j) => (
                  <div
                    key={j}
                    style={{
                      height: 22,
                      width: `${lineW(w, j * 6)}%`,
                      background: "#e5e0d2",
                      borderRadius: 8,
                    }}
                  />
                ))}
              </>
            ) : null}
          </PosterCard>
        ))}
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontWeight: 500,
          fontSize: 46,
          color: colors.gray,
          opacity: caption,
        }}
      >
        Kişiye özel öyküler, hazır PDF.
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Root'a ekle**

Import: `import { SosyalOyku } from "./scenes/SosyalOyku";` ve:
```tsx
    <Composition id="SosyalOyku" component={SosyalOyku} durationInFrames={180} fps={30} width={1080} height={1920} />
```

- [ ] **Step 3: Still al ve incele**

Run: `cd promo && npx remotion still src/index.ts SosyalOyku out/oyku-110.png --frame=110`
Expected: üç sayfa yelpaze açılmış, öndeki sayfada başlık + okul görseli + metin çizgileri dolu.

- [ ] **Step 4: Commit**

```bash
git add promo/src && git commit -m "feat(promo): Sosyal Öykü sahnesi — yelpaze sayfalar"
```

---

### Task 8: Sahne 6 — CTA (750–900) + logo varlıkları

**Files:**
- Create: `promo/src/scenes/Cta.tsx`
- Create: `promo/public/luden-logo-mark.png` (kopya)
- Modify: `promo/src/Root.tsx`

- [ ] **Step 1: Logo varlığını kopyala**

Run: `mkdir -p promo/public && cp apps/hub/public/luden-logo-mark.png promo/public/`

- [ ] **Step 2: Sahneyi yaz**

`promo/src/scenes/Cta.tsx`:
```tsx
import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fonts } from "../brand";

export const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wipe = interpolate(frame, [0, 16], [0, 1600], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logo = spring({ frame: frame - 12, fps, config: { damping: 12 } });
  const studio = spring({ frame: frame - 24, fps, config: { damping: 13 } });
  const btn = spring({ frame: frame - 34, fps, config: { damping: 12 } });
  const pulse = 1 + 0.04 * Math.sin(frame / 8);
  return (
    <AbsoluteFill style={{ background: colors.cream }}>
      <AbsoluteFill
        style={{
          background: colors.darkTeal,
          clipPath: `circle(${wipe}px at 50% 50%)`,
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
        }}
      >
        <Img
          src={staticFile("luden-logo-mark.png")}
          style={{
            width: 190,
            opacity: logo,
            transform: `scale(${0.5 + 0.5 * logo}) rotate(${(1 - logo) * -40}deg)`,
          }}
        />
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 130,
            opacity: logo,
            transform: `translateY(${(1 - logo) * 50}px)`,
          }}
        >
          <span style={{ color: colors.logoCream }}>Luden</span>
          <span style={{ color: colors.orange }}>Lab</span>
        </div>
        <div
          style={{
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 52,
            letterSpacing: 22,
            color: colors.lightBlueText,
            opacity: studio,
          }}
        >
          STUDIO
        </div>
        <div
          style={{
            marginTop: 40,
            background: colors.orange,
            border: `4px solid ${colors.logoCream}`,
            borderRadius: 22,
            padding: "28px 80px",
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 54,
            color: colors.white,
            opacity: btn,
            transform: `scale(${btn * pulse})`,
          }}
        >
          ludenlab.com
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 90,
            fontFamily: fonts.body,
            fontSize: 32,
            color: colors.logoCream,
            opacity: 0.6 * studio,
          }}
        >
          © 2026 LudenLab · Made in Türkiye
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Root'a ekle**

Import: `import { Cta } from "./scenes/Cta";` ve:
```tsx
    <Composition id="Cta" component={Cta} durationInFrames={150} fps={30} width={1080} height={1920} />
```

- [ ] **Step 4: Still al ve incele**

Run: `cd promo && npx remotion still src/index.ts Cta out/cta-60.png --frame=60`
Expected: koyu teal zemin tam açılmış, logo mark + "LudenLab" + "STUDIO" + turuncu buton ortalı, footer okunur.

- [ ] **Step 5: Commit**

```bash
git add promo/ && git commit -m "feat(promo): CTA sahnesi — teal wipe, logo, ludenlab.com butonu"
```

---

### Task 9: Master kompozisyon + final render + doğrulama

**Files:**
- Modify: `promo/src/Root.tsx` (master `StudioTanitim916` eklenir)

- [ ] **Step 1: Root.tsx'i son haline getir**

`promo/src/Root.tsx` (tam dosya):
```tsx
import React from "react";
import { AbsoluteFill, Composition, Sequence } from "remotion";
import "./fonts";
import { colors } from "./brand";
import { Hook } from "./scenes/Hook";
import { Dashboard } from "./scenes/Dashboard";
import { OgrenmeKartlari } from "./scenes/OgrenmeKartlari";
import { Sesletim } from "./scenes/Sesletim";
import { SosyalOyku } from "./scenes/SosyalOyku";
import { Cta } from "./scenes/Cta";

const Video916: React.FC = () => (
  <AbsoluteFill style={{ background: colors.cream }}>
    <Sequence durationInFrames={90}>
      <Hook />
    </Sequence>
    <Sequence from={90} durationInFrames={150}>
      <Dashboard />
    </Sequence>
    <Sequence from={240} durationInFrames={180}>
      <OgrenmeKartlari />
    </Sequence>
    <Sequence from={420} durationInFrames={150}>
      <Sesletim />
    </Sequence>
    <Sequence from={570} durationInFrames={180}>
      <SosyalOyku />
    </Sequence>
    <Sequence from={750} durationInFrames={150}>
      <Cta />
    </Sequence>
  </AbsoluteFill>
);

const DIM = { fps: 30, width: 1080, height: 1920 } as const;

export const Root: React.FC = () => (
  <>
    <Composition id="StudioTanitim916" component={Video916} durationInFrames={900} {...DIM} />
    <Composition id="Hook" component={Hook} durationInFrames={90} {...DIM} />
    <Composition id="Dashboard" component={Dashboard} durationInFrames={150} {...DIM} />
    <Composition id="OgrenmeKartlari" component={OgrenmeKartlari} durationInFrames={180} {...DIM} />
    <Composition id="Sesletim" component={Sesletim} durationInFrames={150} {...DIM} />
    <Composition id="SosyalOyku" component={SosyalOyku} durationInFrames={180} {...DIM} />
    <Composition id="Cta" component={Cta} durationInFrames={150} {...DIM} />
  </>
);
```
(BrandTest kompozisyonu silinir.)

- [ ] **Step 2: Kontrol still'leri al**

Run:
```bash
cd promo
for f in 60 200 350 500 680 850; do npx remotion still src/index.ts StudioTanitim916 out/master-$f.png --frame=$f; done
```
Expected: 6 PNG. Her birini Read ile incele: doğru sahne, taşma yok, Türkçe karakterler doğru.

- [ ] **Step 3: Final render**

Run: `cd promo && npx remotion render src/index.ts StudioTanitim916 out/studio-tanitim-916.mp4`
Expected: hatasız, `out/studio-tanitim-916.mp4` oluşur.

- [ ] **Step 4: Çıktıyı teknik doğrula**

Run: `ffprobe -v error -show_entries stream=width,height,r_frame_rate,duration -of default=noprint_wrappers=1 promo/out/studio-tanitim-916.mp4`
Expected: `width=1080`, `height=1920`, `r_frame_rate=30/1`, `duration≈30.0`. (ffprobe yoksa `npx remotion versions` ortamındaki ffprobe: `npx remotion ffprobe ...` kullan.)

- [ ] **Step 5: Commit**

```bash
git add promo/src && git commit -m "feat(promo): master kompozisyon StudioTanitim916 + final render doğrulaması"
```

---

## Self-review notları

- Spec kapsama: 6 sahne (Task 3–8), marka dili (Task 1–2 token/parçalar), font garanti (Task 1 delayRender), hassasiyet (kurgusal veriler, isim yok), teslimat/doğrulama (Task 9) — tam.
- 16:9, müzik, gerçek ekran görüntüsü: spec'te kapsam dışı, planda yok (YAGNI).
- Tip tutarlılığı: `colors`/`fonts` alanları tüm sahnelerde `brand.ts` tanımıyla eşleşiyor; lib bileşen prop'ları kullanımlarla uyumlu.
- Test altyapısı yok (video projesi); doğrulama still-PNG göz kontrolü + tsc + ffprobe ile.
