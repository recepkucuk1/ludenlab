# Reels 3 — Artikülasyon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reels 3'ü ("/r/ sesi için kelime + görsel avı" → Artikülasyon Alıştırması'nda ses seçimi → gerçek önbellek görselleriyle kelime kartları → gerçek çalışma kâğıdı PDF'i → esenlik → kapanış) mevcut reels altyapısı üzerinde üretmek.

**Architecture:** Altyapı (`src/reels-lib/`: zaman çizelgesi, altyazı, IntroBurst açılışı, hareketli EndCard) değişmez. Gerçek kelime görselleri Studio'nun global görsel önbelleğinden (`GeneratedImage` tablosu → Supabase Storage `tool-images`, PII yok) **salt okunur** indirilip 512 px'e küçültülür → `public/real/r3/`. Çalışma kâğıdı PDF'i, ürünün tarayıcıya gömülü şablonunun (`articulationWorksheetPdf.tsx`, dışa aktarılmıyor) sadık kopyasıyla yerel görsellerden render edilir. Kelime listesi tek kaynak: `src/reels/r3-artikulasyon/words.ts`.

**Tech Stack:** Remotion 4.0.484, React 19, `@react-pdf/renderer`, esbuild JS API, `pdftoppm`, `sips` (macOS), `curl`, Node 24 `node --test`.

**Spec:** `docs/superpowers/specs/2026-09-16-instagram-lansman-reels-design.md`
**Önceki planlar:** `2026-09-16-instagram-reels-altyapi-r1.md`, `2026-09-16-instagram-reels-r2-kartlar.md`

**Önemli bağlam (koddan doğrulandı):**
- Araç: "Artikülasyon Alıştırması" (`apps/hub/src/app/studio/(main)/tools/articulation/page.tsx`). Girdiler: hedef ses çipleri gruplu (`Akıcı: /r/ /l/ /n/ /m/`), ses pozisyonu (`Başta / Ortada / Sonda`), seviye (`İzole Ses / Hece Düzeyi / Kelime / Cümle / Bağlam`), öğe sayısı (10–30).
- Çıktı: kelime kartı ızgarası; her kartta görsel + kelime, **hedef harf turuncu kalın** vurgulu (`FlashcardGrid.tsx` `highlightSound`). "Çalışma Kâğıdı (PDF)": başlık + 3 sütunlu görsel/kelime kart ızgarası (`articulationWorksheetPdf.tsx`).
- Önbellekteki /r/ görsellerinden **"reçel" (İngilizce "Fruit Jam" yazısı) ve "rende" ("Kyl" yazı artefaktı) KULLANILMAZ**. Seçilen 6 temiz kelime: robot, roket, radyo, rakam, rampa, rüzgâr (DB'de `rüzgar`).
- Seslendirme metni değişmez; yalnız son cümle iki sahneye bölünür (esenlik başlığı ekranda görünsün diye): s5 "Aramaya değil, çocuğa vakit ayır." + s6 "ludenlab nokta com." (kapanış kartı).
- Tüm komutlar `promo/` içinden. Commit mesajları `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` ile biter.

---

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `promo/src/reels/r3-artikulasyon/words.ts` | 6 kelime: görünen yazım, yerel dosya, kaynak URL |
| `promo/tests/r3Words.test.ts` | kelimeler /r/ ile başlar, dosyalar mevcut, yasaklı görseller yok |
| `promo/scripts/fetch-r3-images.ts` | önbellekten indir → 512 px PNG → `public/real/r3/` |
| `promo/public/real/r3/*.png` | 6 gerçek görsel (commit'lenir) |
| `promo/scripts/assets/r3-worksheet-entry.tsx` | ürün çalışma kâğıdı şablonunun kopyası → PDF |
| `promo/scripts/render-card-asset.ts` (değişir) | `r2`/`r3` argümanlı genel PDF→PNG çalıştırıcı |
| `promo/public/real/r3-kagit.png` | çalışma kâğıdı sayfa görseli (commit'lenir) |
| `promo/src/reels/r3-artikulasyon/script.ts` | Reels 3 metinleri (6 sahne) |
| `promo/src/reels/r3-artikulasyon/scenes.tsx` | S1–S6 |
| `promo/src/reels/r3-artikulasyon/Reel.tsx` | kompozisyon bileşeni |
| `promo/scripts/reels.ts`, `promo/src/Root.tsx`, `promo/package.json` (değişir) | kayıt, betikler |
| spec (değişir) | R3 tablo: s5/s6 bölünmesi, görsel notları |

---

### Task 1: Kelime listesi (TDD) + görselleri indir

**Files:**
- Create: `promo/src/reels/r3-artikulasyon/words.ts`
- Create: `promo/scripts/fetch-r3-images.ts`
- Test: `promo/tests/r3Words.test.ts`
- Modify: `promo/package.json`
- Create (üretilen): `promo/public/real/r3/{robot,roket,radyo,rakam,rampa,ruzgar}.png`

- [ ] **Step 1: Başarısız testi yaz**

`promo/tests/r3Words.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { R3_WORDS } from "../src/reels/r3-artikulasyon/words.ts";

test("6 kelime, hepsi /r/ ile başlar", () => {
  assert.equal(R3_WORDS.length, 6);
  for (const w of R3_WORDS) assert.match(w.word, /^r/);
});

test("artefaktlı görseller (reçel 'Fruit Jam', rende 'Kyl') seçilmez", () => {
  for (const w of R3_WORDS) assert.doesNotMatch(w.sourceUrl, /recel|rende/);
});

test("her kelimenin yerel görseli public/real/r3 altında var", () => {
  for (const w of R3_WORDS) {
    assert.ok(existsSync(resolve(import.meta.dirname, "../public", w.file)), w.file);
  }
});
```

- [ ] **Step 2: Başarısız olduğunu doğrula**

Run: `npm test` → FAIL `Cannot find module .../words.ts`.

- [ ] **Step 3: Kelime listesi**

`promo/src/reels/r3-artikulasyon/words.ts`:
```ts
const BUCKET = "https://kgbhvruzoaqwwwkhzdex.supabase.co/storage/v1/object/public/tool-images";

/**
 * Reels 3 kelimeleri — Studio'nun global görsel önbelleğinden (GeneratedImage,
 * stil fluxv3, PII yok). `file` public/ altındaki yerel kopyadır
 * (npm run fetch:r3). "reçel" ve "rende" görselleri yazı artefaktı içerdiği için alınmadı.
 */
export const R3_WORDS = [
  { word: "robot", file: "real/r3/robot.png", sourceUrl: `${BUCKET}/robot_fluxv3_fal-ai_flux_schnell.png` },
  { word: "roket", file: "real/r3/roket.png", sourceUrl: `${BUCKET}/roket_fluxv3_fal-ai_flux_schnell.png` },
  { word: "radyo", file: "real/r3/radyo.png", sourceUrl: `${BUCKET}/gpt-radyo_fluxv3_fal-ai_flux_schnell.png` },
  { word: "rakam", file: "real/r3/rakam.png", sourceUrl: `${BUCKET}/gpt-rakam_fluxv3_fal-ai_flux_schnell.png` },
  { word: "rampa", file: "real/r3/rampa.png", sourceUrl: `${BUCKET}/gpt-rampa_fluxv3_fal-ai_flux_schnell.png` },
  { word: "rüzgâr", file: "real/r3/ruzgar.png", sourceUrl: `${BUCKET}/gpt-ruzgar_fluxv3_fal-ai_flux_schnell.png` },
] as const;
```

- [ ] **Step 4: İndirme betiği**

`promo/scripts/fetch-r3-images.ts`:
```ts
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { R3_WORDS } from "../src/reels/r3-artikulasyon/words.ts";

const PUBLIC = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
mkdirSync(resolve(PUBLIC, "real/r3"), { recursive: true });

for (const { word, file, sourceUrl } of R3_WORDS) {
  const out = resolve(PUBLIC, file);
  // Yalnız herkese açık önbellek dosyasını okur; DB'ye/Storage'a yazma yok.
  execFileSync("curl", ["-sf", "-o", out, sourceUrl]);
  // 1024 → 512 px: reels'te kart görseli ~300 px, repo'yu şişirmesin.
  execFileSync("sips", ["-Z", "512", out], { stdio: "ignore" });
  console.log(`✓ ${word} → public/${file}`);
}
```

`promo/package.json` scripts'e ekle:
```json
    "fetch:r3": "node scripts/fetch-r3-images.ts",
```

- [ ] **Step 5: Çalıştır + testler**

Run:
```bash
npm run fetch:r3 && sips -g pixelWidth public/real/r3/robot.png && du -sh public/real/r3 && npm test
```
Expected: 6 `✓` satırı; `pixelWidth: 512`; klasör < 2 MB; `ℹ pass 16`, `ℹ fail 0`.

- [ ] **Step 6: Commit**
```bash
git add src/reels/r3-artikulasyon/words.ts scripts/fetch-r3-images.ts tests/r3Words.test.ts package.json public/real/r3
git commit -m "feat(promo): Reels 3 kelimeleri + önbellekten gerçek görseller"
```

---

### Task 2: Çalışma kâğıdı PDF'i + genel PDF çalıştırıcı

**Files:**
- Create: `promo/scripts/assets/r3-worksheet-entry.tsx`
- Modify: `promo/scripts/render-card-asset.ts`
- Modify: `promo/package.json`
- Create (üretilen): `promo/public/real/r3-kagit.png`

- [ ] **Step 1: Şablon kopyası**

Ürün şablonu tarayıcı fonksiyonunun içine gömülü (`downloadArticulationWorksheetPDF`, dışa aktarılmıyor; blob/`document` kullanıyor). Stil ve yapı birebir kopyalanır; yalnız görseller yerel dosyadan okunur.

`promo/scripts/assets/r3-worksheet-entry.tsx`:
```tsx
/**
 * apps/hub/src/modules/studio/components/cards/articulationWorksheetPdf.tsx
 * içindeki Doc şablonunun SADIK KOPYASI (orijinal dışa aktarılmıyor). Şablon
 * değişirse burası da güncellenmeli.
 */
import React from "react";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToFile } from "@react-pdf/renderer";
import { resolve } from "node:path";
import { R3_WORDS } from "../../src/reels/r3-artikulasyon/words";

export const renderWorksheetPdf = (outPath: string, promoRoot: string, hubPublic: string) => {
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${hubPublic}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${hubPublic}/fonts/NotoSans-Bold.ttf`, fontWeight: "bold" },
    ],
  });

  const styles = StyleSheet.create({
    page: { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 32, backgroundColor: "#fff" },
    title: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 12 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    card: { width: "31%", borderWidth: 2, borderColor: "#18181b", borderRadius: 10, padding: 8, alignItems: "center" },
    img: { width: 96, height: 96, objectFit: "contain", marginBottom: 6 },
    word: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 14, color: "#18181b", textAlign: "center" },
  });

  const Doc = () => (
    <Document title="/r/ Sesi — Kelime Başı Çalışması" author="LudenLab">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>/r/ Sesi — Kelime Başı Çalışması</Text>
        <View style={styles.grid}>
          {R3_WORDS.map((w) => (
            <View key={w.word} style={styles.card}>
              <Image src={resolve(promoRoot, "public", w.file)} style={styles.img} />
              <Text style={styles.word}>{w.word}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );

  return renderToFile(<Doc />, outPath);
};
```

- [ ] **Step 2: Çalıştırıcıyı `r2`/`r3` argümanlı yap**

`promo/scripts/render-card-asset.ts` dosyasının tamamını değiştir:
```ts
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const PROMO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HUB = resolve(PROMO, "../apps/hub");
const HUB_PUBLIC = resolve(HUB, "public");
const OUT_DIR = resolve(PROMO, "out/assets");

type Asset = { entry: string; exportName: string; png: string };
const ASSETS: Record<string, Asset> = {
  r2: { entry: "r2-card-entry.tsx", exportName: "renderCardPdf", png: "public/real/r2-kart" },
  r3: { entry: "r3-worksheet-entry.tsx", exportName: "renderWorksheetPdf", png: "public/real/r3-kagit" },
};

const id = process.argv[2] ?? "";
const asset = ASSETS[id];
if (!asset) {
  console.error(`Kullanım: node scripts/render-card-asset.ts <${Object.keys(ASSETS).join("|")}>`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const bundle = resolve(OUT_DIR, `${id}.mjs`);
const pdf = resolve(OUT_DIR, `${id}.pdf`);

await build({
  entryPoints: [resolve(PROMO, "scripts/assets", asset.entry)],
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  alias: { "@studio": resolve(HUB, "src/modules/studio") },
  // Hub dosyaları kendi node_modules'ünü (worktree'de yok) değil promo'nunkini kullansın.
  nodePaths: [resolve(PROMO, "node_modules")],
  external: ["@react-pdf/renderer", "react"],
  outfile: bundle,
  logLevel: "warning",
});

// CardPDFDocument font yolunu window.location.origin + "/fonts" ile kurar:
// Node'da hub'ın public/ klasörüne işaret ettiriyoruz → NotoSans yerel dosyadan yüklenir.
(globalThis as { window?: unknown }).window = { location: { origin: HUB_PUBLIC } };
const mod = (await import(pathToFileURL(bundle).href)) as Record<
  string,
  (out: string, promoRoot: string, hubPublic: string) => Promise<void>
>;
await mod[asset.exportName](pdf, PROMO, HUB_PUBLIC);

// İlk sayfa, 200 dpi PNG (A4 → 1654×2339)
execFileSync("pdftoppm", ["-png", "-r", "200", "-f", "1", "-l", "1", "-singlefile", pdf, resolve(PROMO, asset.png)], {
  stdio: "inherit",
});
console.log(`✓ ${asset.png}.png`);
```

`promo/package.json` scripts: `"asset:r2"` satırını değiştir ve `asset:r3` ekle:
```json
    "asset:r2": "node scripts/render-card-asset.ts r2",
    "asset:r3": "node scripts/render-card-asset.ts r3",
```

- [ ] **Step 3: Regresyon (r2 aynı PNG'yi üretmeli) + r3 üret**

Run:
```bash
npm run typecheck && npm run asset:r2 && git status --short public/real/r2-kart.png && npm run asset:r3 && sips -g pixelWidth -g pixelHeight public/real/r3-kagit.png
```
Expected: `✓ public/real/r2-kart.png`; `git status` r2-kart.png için boş çıktı YA DA yalnızca tarih kaynaklı değişiklik (PDF'teki bugünün tarihi aynı gün aynıdır → değişiklik beklenmez); `✓ public/real/r3-kagit.png`, `1654 × 2339`.

PNG'yi Read ile incele: başlık "/r/ Sesi — Kelime Başı Çalışması", 3 sütunlu 2 satır kart, 6 görsel + kelime, Türkçe "â/ü" doğru.

- [ ] **Step 4: Commit**
```bash
git add scripts/assets/r3-worksheet-entry.tsx scripts/render-card-asset.ts package.json public/real/r3-kagit.png
git commit -m "feat(promo): Reels 3 çalışma kâğıdı PDF'i — genel PDF çalıştırıcı (r2|r3)"
```

---

### Task 3: Reels 3 metni + spec

**Files:**
- Create: `promo/src/reels/r3-artikulasyon/script.ts`
- Modify: `promo/scripts/reels.ts`
- Modify: `docs/superpowers/specs/2026-09-16-instagram-lansman-reels-design.md`

- [ ] **Step 1: Metin**

`promo/src/reels/r3-artikulasyon/script.ts`:
```ts
import type { ReelScript } from "../../reels-lib/types";

export const r3Script: ReelScript = {
  id: "r3",
  slug: "r3-artikulasyon",
  title: "Hedef ses, görseliyle",
  scenes: [
    {
      id: "s1",
      vo: "R sesi için onlarca kelime, her birine bir görsel… Saatlerce arama.",
      screen: "/r/ sesi için kelime + görsel avı?",
      defaultSec: 4,
    },
    { id: "s2", vo: "Studio'da hedef sesi seç.", screen: "Ses çipleri → /r/ · Başta", defaultSec: 3 },
    {
      id: "s3",
      vo: "Kelimeler, görselleriyle birlikte gelsin.",
      screen: "Gerçek önbellek görselleriyle 6 kelime kartı",
      defaultSec: 4,
    },
    { id: "s4", vo: "Çalışma kâğıdın yazdırmaya hazır.", screen: "Gerçek çalışma kâğıdı + HAZIR damgası", defaultSec: 3.5 },
    { id: "s5", vo: "Aramaya değil, çocuğa vakit ayır.", screen: "Aramaya değil, çocuğa vakit ayır.", defaultSec: 3 },
    {
      id: "s6",
      vo: "ludenlab nokta com.",
      screen: "Kapanış kartı (STUDIO)",
      defaultSec: 3.5,
      minSec: 3.5,
      hideCaption: true,
    },
  ],
};
```

- [ ] **Step 2: Kayıt listesi**

`promo/scripts/reels.ts`:
```ts
import { r1Script } from "../src/reels/r1-lansman/script.ts";
import { r2Script } from "../src/reels/r2-kartlar/script.ts";
import { r3Script } from "../src/reels/r3-artikulasyon/script.ts";
import type { ReelScript } from "../src/reels-lib/types.ts";

export type ReelEntry = { script: ReelScript; compositionId: string };

/** Yeni reels eklendikçe buraya ve src/Root.tsx'e eklenir. */
export const REELS: ReelEntry[] = [
  { script: r1Script, compositionId: "R1-Lansman" },
  { script: r2Script, compositionId: "R2-Kartlar" },
  { script: r3Script, compositionId: "R3-Artikulasyon" },
];
```

- [ ] **Step 3: Spec**

"Reels 3 — Hedef ses, görseliyle" tablosunu şununla değiştir:
```markdown
| Sahne | Seslendirme | Ekran |
|---|---|---|
| s1 | R sesi için onlarca kelime, her birine bir görsel… Saatlerce arama. | /r/ sesi için kelime + görsel avı? |
| s2 | Studio'da hedef sesi seç. | Ses çipleri → /r/ · Başta |
| s3 | Kelimeler, görselleriyle birlikte gelsin. | Gerçek önbellek görselleriyle 6 kelime kartı (hedef harf turuncu) |
| s4 | Çalışma kâğıdın yazdırmaya hazır. | Gerçek çalışma kâğıdı + HAZIR damgası |
| s5 | Aramaya değil, çocuğa vakit ayır. | Aramaya değil, çocuğa vakit ayır. |
| s6 | ludenlab nokta com. | Kapanış kartı (STUDIO) |
```
"Görsel yaklaşım" altındaki Reels 3 maddesine ekle: ` Seçilen: robot, roket, radyo, rakam, rampa, rüzgâr — "reçel" (İngilizce yazı) ve "rende" ("Kyl" artefaktı) görselleri kusurlu olduğu için alınmadı (ürün önbelleğinde de düzeltilmeli).`

- [ ] **Step 4: Doğrula + commit**

Run: `npm run -s scripts | tail -7 && npm run typecheck` → r3 altında 6 satır; tsc 0.
```bash
git add src/reels/r3-artikulasyon/script.ts scripts/reels.ts ../docs/superpowers/specs/2026-09-16-instagram-lansman-reels-design.md
git commit -m "feat(promo): Reels 3 metni — kapanış cümlesi esenlik sahnesine bölündü"
```

---

### Task 4: Sahneler, kompozisyon, kare kontrolü

**Files:**
- Create: `promo/src/reels/r3-artikulasyon/scenes.tsx`
- Create: `promo/src/reels/r3-artikulasyon/Reel.tsx`
- Modify: `promo/src/Root.tsx`

- [ ] **Step 1: Sahneler**

Dikey bütçe: içerik 220–1350 px; altyazı kutusu ~1380'den başlar.

`promo/src/reels/r3-artikulasyon/scenes.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AudioLines, Search } from "lucide-react";
import { colors, fonts } from "../../brand";
import { Cursor } from "../../lib/Cursor";
import { PosterCard } from "../../lib/PosterCard";
import { ToolHeader } from "../../lib/ToolHeader";
import { EndCard } from "../../reels-lib/EndCard";
import { Headline } from "../../reels-lib/Headline";
import { R3_WORDS } from "./words";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Dağınık arama sekmeleri: x, y, açı, gecikme, sorgu. */
const TABS = [
  { x: 80, y: 260, r: -6, d: 0, q: "r ile başlayan kelimeler" },
  { x: 300, y: 420, r: 4, d: 6, q: "robot resmi çocuk" },
  { x: 120, y: 580, r: -3, d: 12, q: "roket çizimi" },
  { x: 360, y: 740, r: 7, d: 18, q: "radyo görseli ücretsiz" },
];

export const S1Arama: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: colors.cream }}>
      {TABS.map((t, i) => {
        const p = spring({ frame: frame - t.d, fps, config: { damping: 13 } });
        const shake = frame > 30 ? Math.sin(frame / 2 + i) * 3 : 0;
        return (
          <PosterCard
            key={i}
            shadow={6}
            style={{
              position: "absolute",
              left: t.x,
              top: t.y,
              width: 640,
              padding: "22px 28px",
              display: "flex",
              alignItems: "center",
              gap: 18,
              opacity: p,
              transform: `translateX(${(1 - p) * -200 + shake}px) rotate(${t.r * p}deg)`,
            }}
          >
            <Search size={40} color={colors.gray} strokeWidth={2.6} />
            <span style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 36, color: colors.ink }}>{t.q}</span>
          </PosterCard>
        );
      })}
      <Headline lines={["/r/ sesi için", "kelime + görsel avı?"]} top={960} fontSize={100} delay={14} />
    </AbsoluteFill>
  );
};

const LIQUIDS = ["/r/", "/l/", "/n/", "/m/"];
const PICK_AT = 34;

export const S2Ses: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (d: number) => spring({ frame: frame - d, fps, config: { damping: 13 } });
  const picked = frame >= PICK_AT;
  const pickPop = spring({ frame: frame - PICK_AT, fps, config: { damping: 8, stiffness: 160 } });
  const pos = s(PICK_AT + 8);
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", paddingTop: 260 }}>
      <ToolHeader icon={<AudioLines size={52} strokeWidth={2.4} />} title="Artikülasyon" />
      <div style={{ ...labelStyle, marginTop: 60, opacity: s(6) }}>HEDEF SES · AKICI</div>
      <div style={{ display: "flex", gap: 26, marginTop: 20 }}>
        {LIQUIDS.map((snd, i) => {
          const p = s(8 + i * 4);
          const isR = i === 0;
          const active = isR && picked;
          return (
            <PosterCard
              key={snd}
              bg={active ? colors.orange : colors.white}
              radius={28}
              style={{
                width: 190,
                height: 190,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: 76,
                color: active ? colors.white : colors.ink,
                opacity: p,
                transform: `scale(${(0.6 + 0.4 * p) * (active ? 1 + 0.12 * (1 - pickPop) : 1)})`,
              }}
            >
              {snd}
            </PosterCard>
          );
        })}
      </div>
      <div style={{ ...labelStyle, marginTop: 70, opacity: pos }}>SES POZİSYONU</div>
      <div style={{ display: "flex", gap: 20, marginTop: 20, opacity: pos, transform: `translateY(${(1 - pos) * 30}px)` }}>
        {["Başta", "Ortada", "Sonda"].map((p, i) => (
          <span
            key={p}
            style={{
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: 42,
              padding: "14px 34px",
              borderRadius: 999,
              border: `3px solid ${colors.ink}`,
              background: i === 0 ? colors.studioBlue : colors.white,
              color: i === 0 ? colors.white : colors.ink,
            }}
          >
            {p}
          </span>
        ))}
      </div>
      <Cursor
        appearAt={12}
        clickAt={PICK_AT}
        keyframes={[
          { frame: 12, x: 700, y: 1250 },
          { frame: PICK_AT - 4, x: 250, y: 640 },
        ]}
      />
    </AbsoluteFill>
  );
};

const labelStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontWeight: 700,
  fontSize: 32,
  letterSpacing: 6,
  color: colors.gray,
};

/** Ürün gibi: hedef harf turuncu, kalın. */
const Highlighted: React.FC<{ word: string }> = ({ word }) => (
  <>
    {word.split("").map((ch, i) => (
      <span key={i} style={ch.toLowerCase() === "r" ? { color: colors.orange, fontWeight: 900 } : undefined}>
        {ch}
      </span>
    ))}
  </>
);

export const S3Kartlar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", paddingTop: 240 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 430px)", gap: 34 }}>
        {R3_WORDS.map((w, i) => {
          const p = spring({ frame: frame - i * 5, fps, config: { damping: 11 } });
          const bob = Math.sin((frame + i * 9) / 14) * 5;
          return (
            <PosterCard
              key={w.word}
              style={{
                height: 330,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: p,
                transform: `translateY(${(1 - p) * 140 + bob}px) scale(${0.7 + 0.3 * p}) rotate(${(i % 2 ? 1.5 : -1.5) * p}deg)`,
              }}
            >
              <Img src={staticFile(w.file)} style={{ width: 220, height: 220, objectFit: "contain" }} />
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 56, color: colors.ink }}>
                <Highlighted word={w.word} />
              </div>
            </PosterCard>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const STAMP_AT = 30;

export const S4Kagit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const page = spring({ frame, fps, config: { damping: 14 } });
  const stamp = spring({ frame: frame - STAMP_AT, fps, config: { damping: 9, stiffness: 180 } });
  const shake = interpolate(frame, [STAMP_AT, STAMP_AT + 3, STAMP_AT + 6], [0, 8, 0], clamp);
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <PosterCard
        radius={16}
        shadow={12}
        style={{
          marginTop: 240,
          width: 900,
          height: 1060,
          overflow: "hidden",
          opacity: page,
          transform: `translateY(${(1 - page) * 400 + shake}px) rotate(${1.5 * page}deg)`,
        }}
      >
        <Img src={staticFile("real/r3-kagit.png")} style={{ width: 1000, display: "block", marginLeft: -50, marginTop: -40 }} />
      </PosterCard>
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 1030,
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 110,
          color: colors.green,
          border: `10px solid ${colors.green}`,
          borderRadius: 24,
          padding: "6px 40px",
          background: "rgba(255,255,255,0.85)",
          opacity: frame < STAMP_AT ? 0 : 1,
          transform: `translate(-50%, 0) rotate(-12deg) scale(${1 + (1 - stamp) * 1.6})`,
        }}
      >
        HAZIR ✓
      </div>
    </AbsoluteFill>
  );
};

export const S5Esenlik: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <div style={{ display: "flex", gap: 30, marginTop: 330 }}>
        {R3_WORDS.slice(0, 3).map((w, i) => {
          const p = spring({ frame: frame - i * 4, fps, config: { damping: 12 } });
          return (
            <Img
              key={w.word}
              src={staticFile(w.file)}
              style={{
                width: 250,
                height: 250,
                objectFit: "contain",
                opacity: p,
                transform: `translateY(${(1 - p) * 80 + Math.sin((frame + i * 10) / 12) * 10}px)`,
              }}
            />
          );
        })}
      </div>
      <Headline lines={["Aramaya değil,", "çocuğa vakit ayır."]} top={860} fontSize={108} delay={10} />
    </AbsoluteFill>
  );
};

export const S6Kapanis: React.FC = () => <EndCard product="STUDIO" />;
```

- [ ] **Step 2: Kompozisyon bileşeni**

`promo/src/reels/r3-artikulasyon/Reel.tsx`:
```tsx
import React from "react";
import { ReelFrame } from "../../reels-lib/ReelFrame";
import type { ReelProps } from "../../reels-lib/voiceover";
import { r3Script } from "./script";
import { S1Arama, S2Ses, S3Kartlar, S4Kagit, S5Esenlik, S6Kapanis } from "./scenes";

const SCENES: Record<string, React.FC> = {
  s1: S1Arama,
  s2: S2Ses,
  s3: S3Kartlar,
  s4: S4Kagit,
  s5: S5Esenlik,
  s6: S6Kapanis,
};

export const R3Artikulasyon: React.FC<ReelProps> = (props) => (
  <ReelFrame reel={r3Script} scenes={SCENES} {...props} />
);
```

- [ ] **Step 3: Root'a kaydet**

`promo/src/Root.tsx` importlarına ekle:
```tsx
import { r3Script } from "./reels/r3-artikulasyon/script";
import { R3Artikulasyon } from "./reels/r3-artikulasyon/Reel";
```
`R2-Kartlar` kompozisyonundan sonra ekle:
```tsx
    <Composition
      id="R3-Artikulasyon"
      component={R3Artikulasyon}
      durationInFrames={1}
      {...REEL}
      defaultProps={EMPTY_REEL_PROPS}
      calculateMetadata={reelMetadata(r3Script)}
    />
```

- [ ] **Step 4: Tip kontrolü + testler**

Run: `npm run typecheck && npm test` → 0; `ℹ pass 16`.

- [ ] **Step 5: Kare kontrolleri**

Zaman çizelgesi (ses yok): s1 0–119, s2 120–209, s3 210–329, s4 330–434, s5 435–524, s6 525–629 (630 kare = 21 sn).

Run:
```bash
for f in 80 170 290 400 500 610; do npx remotion still src/index.ts R3-Artikulasyon out/r3-$f.png --frame=$f; done
npx remotion still src/index.ts R3-Artikulasyon out/r3-safe-290.png --frame=290 --props='{"safeArea":true,"timeline":{"scenes":[],"durationInFrames":1}}'
python3 -c "
from PIL import Image
n=['80','170','290','400','500','610','safe-290']
ims=[Image.open(f'out/r3-{i}.png').resize((360,640)) for i in n]
s=Image.new('RGB',(370*4,650*2),'white')
for i,im in enumerate(ims): s.paste(im,((i%4)*370,(i//4)*650))
s.save('out/r3-sheet.png')"
```
Read ile `out/r3-sheet.png` incele. Expected:
- 80: 4 arama sekmesi dağınık, "/r/ sesi için / kelime + görsel avı?" taşmıyor
- 170: Artikülasyon başlığı, /r/ turuncu seçili, "Başta" mavi, imleç /r/ üzerinde
- 290: 2×3 gerçek görselli kart, "r" harfleri turuncu; safe-290'da kartların son satırı altyazı kutusu / alt bantla ÇAKIŞMIYOR
- 400: çalışma kâğıdı + yeşil "HAZIR ✓" damgası
- 500: 3 görsel süzülüyor, "Aramaya değil, / çocuğa vakit ayır."
- 610: STUDIO kapanış

Çakışma varsa: s3'te kart `height` (330) ve görsel boyutunu (220) düşür; s1'de başlık `fontSize`'ı düşür. Tekrar üret, kontrol et.

- [ ] **Step 6: Commit**
```bash
git add src/reels/r3-artikulasyon/scenes.tsx src/reels/r3-artikulasyon/Reel.tsx src/Root.tsx
git commit -m "feat(promo): Reels 3 'Hedef ses, görseliyle' sahneleri ve kompozisyonu"
```

---

### Task 5: Render ve teslim

- [ ] **Step 1: Render**
```bash
rm -f out/*.png
npm run reel -- r3
rm -f out/reels/r3-artikulasyon-vo.mp4
npx remotion ffprobe -v error -show_entries format=duration -of csv=p=0 out/reels/r3-artikulasyon.mp4
```
Expected: `21.000000`.

- [ ] **Step 2: Sahne sınırı kontrolü**
```bash
for f in 119 120 209 210 329 330 434 435; do npx remotion still src/index.ts R3-Artikulasyon out/b3-$f.png --frame=$f; done
```
Kontakt sayfasıyla incele (yarım/bozuk öğe yok), sonra `rm -f out/b3-*.png`.

- [ ] **Step 3: Teslim**

`out/reels/r3-artikulasyon.mp4` kullanıcıya gönderilir. Bildirilecekler: s5/s6 bölünmesi (ses dosyası `r3-s5.mp3` + `r3-s6.mp3` olarak iki parça), reçel/rende görsellerindeki ürün kusuru.
