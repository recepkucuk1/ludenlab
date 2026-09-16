# Reels 5 — MEB Hedefinden Taslağa (Atölye) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serinin son videosu: "Hedef belli, plan nerede?" → Atölye Seans Planı'nda MEB Modül → Bölüm → Hedef → hedef davranış seçimi → gerçek PDF'li seans planı TASLAĞI → "Evrakla değil, çocukla geçen bir gün" + 172 hedef sayacı → ATÖLYE kapanışı.

**Architecture:** Altyapı değişmez. MEB seçimi resmî veriden (`apps/hub/src/modules/atolye/lib/meb-program.ts`) alınır; kopyalanan kod/metinlerin resmî veriyle birebir aynı olduğu testle doğrulanır. Seans planı kurgu Markdown'dır (ürün prompt'unun istediği yapıda). PDF **ürünün gerçek fonksiyonuyla** üretilir: `downloadDraftPdf` (`@atolye/lib/pdf`) esbuild ile paketlenir, tarayıcı parçaları (`document.createElement`, `URL.createObjectURL`) Node'da taklit edilip Blob yakalanır — şablon kopyası YOK.

**Tech Stack:** Remotion 4.0.484, `@react-pdf/renderer`, `unified`/`remark-parse`/`remark-gfm`/`zod` (hub sürümleri, promo devDeps'e kuruldu), esbuild, `pdftoppm`, `node --test`.

**Önemli bağlam (koddan doğrulandı):**
- Araç: `SeansPlaniTool.tsx` — Öğrenci, Kademe, Alan, "Bu seansın hedefi", süre, ilgi alanları + `MebHedefSelect` (Modül → Bölüm → Hedef açılır listeleri + "Hedef davranışlar" checklist'i; isteğe bağlı).
- Çıktı: Markdown taslak (`seans-prompts.ts`): Seans Künyesi (tablo) · Etkinlik Akışı (*Isınma* · *Ana Etkinlik(ler)* · *Tekrar/Oyun* · *Kapanış*, süre dağılımıyla) · Materyaller · Ölçme · Ev Görevi · Sonraki Adım. Panel (`ToolResult.tsx`): "Çıktı bir taslaktır… Tanı koymaz." uyarısı, "yazılıyor…" canlı açılış, PDF indir / Kopyala / Öğrenciye ata.
- Atölye görsel üretmez; her çıktı TASLAK (spec içerik kuralı). "dakikalar içinde" iddiası sitede var → kullanılabilir.
- Seçilen MEB hedefi: Modül 3 Okuma ve Yazma → 3.1 Erken Okuryazarlık → 3.1.2 "Sözcüklerin hece özelliklerini ayırt eder." → 3.1.2.1, 3.1.2.2.
- Program sayıları: 6 modül · 30 bölüm · 172 hedef · 1079 hedef davranış (meb-program.ts başlık yorumu; test doğrular).
- Seslendirme spec ile aynı (5 sahne; s5 kapanış kartında altyazısız).

---

### Task 1: Veri (TDD) — MEB seçimi + taslak Markdown

**Files:** Create `promo/src/reels/r5-meb-atolye/plan.ts`, `promo/tests/r5Plan.test.ts`

- [ ] **Step 1: Başarısız test** — `promo/tests/r5Plan.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { MEB_MODULLER } from "../../apps/hub/src/modules/atolye/lib/meb-program.ts";
import { R5_MEB, R5_PLAN_MD, R5_COUNTS } from "../src/reels/r5-meb-atolye/plan.ts";

test("MEB seçimi resmî veriyle birebir aynı", () => {
  const modul = MEB_MODULLER.find((m) => m.no === R5_MEB.modul.no)!;
  assert.equal(modul.ad, R5_MEB.modul.ad);
  const bolum = modul.bolumler.find((b) => b.kod === R5_MEB.bolum.kod)!;
  assert.equal(bolum.ad, R5_MEB.bolum.ad);
  const hedef = bolum.hedefler.find((h) => h.kod === R5_MEB.hedef.kod)!;
  assert.equal(hedef.metin, R5_MEB.hedef.metin);
  for (const d of R5_MEB.davranislar) {
    assert.equal(hedef.hedefDavranislar.find((x) => x.kod === d.kod)?.metin, d.metin);
  }
});

test("program sayıları gerçek veriden", () => {
  const hedefler = MEB_MODULLER.flatMap((m) => m.bolumler.flatMap((b) => b.hedefler));
  assert.equal(MEB_MODULLER.length, R5_COUNTS.modul);
  assert.equal(hedefler.length, R5_COUNTS.hedef);
  assert.equal(hedefler.flatMap((h) => h.hedefDavranislar).length, R5_COUNTS.davranis);
});

test("taslak ürün prompt'unun bölümlerini taşır, ad/hız iddiası yok", () => {
  for (const h of ["Seans Künyesi", "Etkinlik Akışı", "Materyaller", "Ölçme", "Ev Görevi", "Sonraki Adım"]) {
    assert.match(R5_PLAN_MD, new RegExp(`## ${h}`));
  }
  for (const a of ["Isınma", "Ana Etkinlik", "Tekrar/Oyun", "Kapanış"]) assert.match(R5_PLAN_MD, new RegExp(a));
  assert.doesNotMatch(R5_PLAN_MD, /saniye|dakikada|\b(Ali|Ayşe|Eymen|Zeynep|Elif)\b/);
});
```

- [ ] **Step 2:** `npm test` → FAIL (plan.ts yok).

- [ ] **Step 3:** `promo/src/reels/r5-meb-atolye/plan.ts`:
```ts
/**
 * Reels 5 verisi. MEB seçimi resmî programdan birebir (tests/r5Plan.test.ts
 * apps/hub/.../meb-program.ts ile karşılaştırır). Seans planı KURGU bir taslaktır;
 * yapısı ürün prompt'unun istediği yapıdır (apps/hub/.../seans-prompts.ts).
 */
export const R5_MEB = {
  modul: { no: 3, ad: "Okuma ve Yazma" },
  bolum: { kod: "3.1", ad: "Erken Okuryazarlık" },
  hedef: { kod: "3.1.2", metin: "Sözcüklerin hece özelliklerini ayırt eder." },
  davranislar: [
    { kod: "3.1.2.1", metin: "Söylenen sözcükleri hecelerine ayırır." },
    { kod: "3.1.2.2", metin: "Söylenen bir sözcüğün ilk hecesini söyler." },
  ],
} as const;

export const R5_COUNTS = { modul: 6, hedef: 172, davranis: 1079 } as const;

/** Etkinlik akışı — hem Markdown'da hem sahne maketinde. */
export const R5_FLOW = [
  { ad: "Isınma", dk: 5, metin: "Adını el çırparak heceler; her hecede bir alkış." },
  { ad: "Ana Etkinlik 1", dk: 15, metin: "Hece treni: resimli kartlardaki sözcükleri vagonlara hece hece yerleştirir. (3.1.2.1)" },
  { ad: "Ana Etkinlik 2", dk: 10, metin: "İlk hece avı: söylenen sözcüğün ilk hecesiyle başlayan kartı bulur. (3.1.2.2)" },
  { ad: "Tekrar/Oyun", dk: 7, metin: "Hece zıplama: her hece için yere çizili bir kareye zıplar." },
  { ad: "Kapanış", dk: 3, metin: "En sevdiği sözcüğü heceleyerek söyler; çıkartmayla pekiştirilir." },
] as const;

export const R5_PLAN_MD = `## Seans Künyesi

| Öğrenci | Alan | Süre | Hedef |
|---|---|---|---|
| Öğrenci A | Okuma | 40 dk | Sözcükleri hecelerine ayırır, ilk heceyi söyler |

**MEB hedefi:** ${R5_MEB.hedef.kod} ${R5_MEB.hedef.metin} (${R5_MEB.davranislar.map((d) => d.kod).join(", ")})

## Etkinlik Akışı

${R5_FLOW.map((f) => `- *${f.ad}* (${f.dk} dk): ${f.metin}`).join("\n")}

## Materyaller

- Resimli sözcük kartları (8 adet)
- Tren vagonu şablonu ve renkli pullar
- Yere çizilmiş 4 kare

## Ölçme

- 3.1.2.1: 10 sözcükte doğru heceleme sayısı (hedef %80)
- 3.1.2.2: 8 sözcükte doğru ilk hece sayısı (hedef %75)

## Ev Görevi

Evdeki 5 eşyanın adını aileyle birlikte el çırparak heceleyin.

## Sonraki Adım

%80'e ulaşılırsa son heceyi söyleme davranışına (3.1.2.3) geçin.
`;
```

- [ ] **Step 4:** `npm test` → `ℹ pass 22`, `ℹ fail 0`. `npm run typecheck` → 0 (tsconfig `include` `tests`'i kapsar; `../../apps/hub/...` importu tip kontrolünde çözülür — sorun çıkarsa `tests/r5Plan.test.ts`'e `// @ts-nocheck` KOYMA, hatayı raporla).

- [ ] **Step 5: Commit** — `feat(promo): Reels 5 verisi — resmî MEB hedefi + kurgu seans planı taslağı`

---

### Task 2: PDF — ürünün gerçek `downloadDraftPdf` fonksiyonu

**Files:** Create `promo/scripts/assets/r5-draft-entry.tsx`; Modify `promo/scripts/render-card-asset.ts`, `promo/package.json`; Create (üretilen) `promo/public/real/r5-taslak.png`

- [ ] **Step 1:** `promo/scripts/assets/r5-draft-entry.tsx`:
```tsx
/**
 * Atölye'nin GERÇEK PDF fonksiyonu (apps/hub/src/modules/atolye/lib/pdf.tsx →
 * downloadDraftPdf) — kopya değil. Fonksiyon tarayıcıda Blob'u <a download> ile
 * indirir; Node'da document/URL parçalarını taklit edip Blob'u yakalıyoruz.
 * window.location.origin'i çalıştırıcı (render-card-asset.ts) hub public/'e ayarlar.
 */
import { writeFileSync } from "node:fs";
import { downloadDraftPdf } from "@atolye/lib/pdf";
import { R5_PLAN_MD } from "../../src/reels/r5-meb-atolye/plan";

export const renderDraftPdf = async (outPath: string) => {
  let captured: Blob | undefined;
  (globalThis as { document?: unknown }).document = { createElement: () => ({ click() {} }) };
  URL.createObjectURL = (b: Blob) => {
    captured = b;
    return "blob:promo";
  };
  URL.revokeObjectURL = () => {};
  await downloadDraftPdf("Seans Planı", R5_PLAN_MD);
  if (!captured) throw new Error("downloadDraftPdf Blob üretmedi");
  writeFileSync(outPath, Buffer.from(await captured.arrayBuffer()));
};
```

- [ ] **Step 2:** `render-card-asset.ts`: `ASSETS`'e `r5: { entry: "r5-draft-entry.tsx", exportName: "renderDraftPdf", png: "public/real/r5-taslak" },` ekle; `build` çağrısındaki `alias`'ı `{ "@studio": resolve(HUB, "src/modules/studio"), "@atolye": resolve(HUB, "src/modules/atolye") }` yap. `package.json`: `"asset:r5": "node scripts/render-card-asset.ts r5",`.

- [ ] **Step 3:** `npm run typecheck && npm run asset:r5 && sips -g pixelWidth -g pixelHeight public/real/r5-taslak.png` → 1654×2339. Read ile incele: Atölye logosu, "Seans Planı" başlığı, künye tablosu, MEB hedefi satırı, akış maddeleri, alttaki TASLAK notu.

- [ ] **Step 4:** Regresyon: `npm run asset:r2 && npm run asset:r3 && npm run asset:r4 && git status --short public/real` → değişiklik yok.

- [ ] **Step 5: Commit** — `feat(promo): Reels 5 PDF — Atölye'nin gerçek downloadDraftPdf fonksiyonuyla`

---

### Task 3: Metin + kayıt

- [ ] `promo/src/reels/r5-meb-atolye/script.ts`:
```ts
import type { ReelScript } from "../../reels-lib/types";

export const r5Script: ReelScript = {
  id: "r5",
  slug: "r5-meb-atolye",
  title: "MEB hedefinden taslağa",
  scenes: [
    { id: "s1", vo: "Hedef belli; ona uygun seans planını hazırlamak ise saatler alıyor.", screen: "Hedef belli. Plan nerede?", defaultSec: 4 },
    {
      id: "s2",
      vo: "Atölye'de MEB'in öğrenme güçlüğü destek eğitim programından hedefini seç.",
      screen: "Modül → Bölüm → Hedef → hedef davranışlar",
      defaultSec: 5.5,
    },
    {
      id: "s3",
      vo: "Seans planı taslağın dakikalar içinde hazır; son söz her zaman senin.",
      screen: "Gerçek PDF taslak + akış + TASLAK damgası",
      defaultSec: 5,
    },
    { id: "s4", vo: "Evrakla değil, çocukla geçen bir gün.", screen: "172 hedef · resmî kodlarıyla", defaultSec: 3.5 },
    { id: "s5", vo: "Atölye'yi keşfet: ludenlab nokta com.", screen: "Kapanış kartı (ATÖLYE)", defaultSec: 3.5, minSec: 3.5, hideCaption: true },
  ],
};
```
- [ ] `scripts/reels.ts`'e `r5Script` / `R5-MebAtolye` ekle; spec'te "Reels 5" tablosunda s3 Ekran hücresini `Gerçek PDF taslak (ürün fonksiyonu, kurgu içerik) + akış + TASLAK damgası`, s4 Ekran hücresini `Evrakla değil, çocukla geçen bir gün. + 172 hedef · 1079 hedef davranış sayacı` yap.
- [ ] `npm run -s scripts | tail -6 && npm run typecheck` → commit `feat(promo): Reels 5 metni`

---

### Task 4: Sahneler + kompozisyon + kare kontrolü

- [ ] `promo/src/reels/r5-meb-atolye/scenes.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CalendarDays, Check, ChevronDown, FileQuestion } from "lucide-react";
import { colors, fonts } from "../../brand";
import { Cursor } from "../../lib/Cursor";
import { PosterCard } from "../../lib/PosterCard";
import { EndCard } from "../../reels-lib/EndCard";
import { Headline } from "../../reels-lib/Headline";
import { R5_COUNTS, R5_FLOW, R5_MEB } from "./plan";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Atölye aksanı turuncu; başlık ikonu kutusu Studio'nun mavi ToolHeader'ı yerine turuncu. */
const AtolyeHeader: React.FC<{ title: string; progress: number }> = ({ title, progress }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 26, opacity: progress, transform: `translateY(${(1 - progress) * 40}px)` }}>
    <div
      style={{
        width: 92,
        height: 92,
        borderRadius: 24,
        background: colors.orange,
        border: `3px solid ${colors.ink}`,
        boxShadow: `6px 6px 0 ${colors.ink}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: colors.white,
      }}
    >
      <CalendarDays size={50} strokeWidth={2.4} />
    </div>
    <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 72, color: colors.ink }}>{title}</div>
  </div>
);

export const S1Plan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const goal = spring({ frame, fps, config: { damping: 13 } });
  const doc = spring({ frame: frame - 10, fps, config: { damping: 13 } });
  const wobble = Math.sin(frame / 5) * 4;
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <PosterCard
        bg={colors.white}
        style={{ marginTop: 250, width: 880, padding: "26px 34px", opacity: goal, transform: `translateX(${(1 - goal) * -160}px) rotate(-2deg)` }}
      >
        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 28, letterSpacing: 4, color: colors.green }}>
          BEP HEDEFİ ✓
        </div>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 46, color: colors.ink, marginTop: 8 }}>
          {R5_MEB.hedef.metin}
        </div>
      </PosterCard>
      <PosterCard
        style={{
          marginTop: 40,
          width: 520,
          height: 380,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: doc,
          transform: `translateY(${(1 - doc) * 120}px) rotate(${2 + wobble * 0.3}deg)`,
        }}
      >
        <div style={{ transform: `rotate(${wobble}deg)` }}>
          <FileQuestion size={200} color={colors.orange} strokeWidth={1.8} />
        </div>
      </PosterCard>
      <Headline lines={["Hedef belli.", "Plan nerede?"]} top={1060} fontSize={112} delay={14} />
    </AbsoluteFill>
  );
};

/** Açılır liste: seçim anına kadar boş, sonra değer yazılır ve yeşil tik. */
const Dropdown: React.FC<{ label: string; value: string; pickAt: number; appearAt: number }> = ({ label, value, pickAt, appearAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - appearAt, fps, config: { damping: 13 } });
  const picked = frame >= pickAt;
  const flash = interpolate(frame, [pickAt, pickAt + 10], [1, 0], clamp);
  return (
    <div style={{ width: 900, opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 30, letterSpacing: 4, color: colors.gray, marginBottom: 10 }}>{label}</div>
      <PosterCard
        shadow={6}
        bg={picked ? colors.white : colors.cream}
        style={{
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          outline: flash > 0 ? `${8 * flash}px solid ${colors.orange}` : undefined,
        }}
      >
        <span style={{ flex: 1, fontFamily: fonts.body, fontWeight: 700, fontSize: 38, color: picked ? colors.ink : colors.gray }}>
          {picked ? value : `${label} seçin…`}
        </span>
        {picked ? <Check size={42} color={colors.green} strokeWidth={3} /> : <ChevronDown size={42} color={colors.ink} strokeWidth={3} />}
      </PosterCard>
    </div>
  );
};

const PICKS = [26, 46, 66];

export const S2Meb: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = spring({ frame, fps, config: { damping: 13 } });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", paddingTop: 220, gap: 26 }}>
      <AtolyeHeader title="Seans Planı" progress={head} />
      <Dropdown label="Modül" value={`${R5_MEB.modul.no} · ${R5_MEB.modul.ad}`} appearAt={6} pickAt={PICKS[0]} />
      <Dropdown label="Bölüm" value={`${R5_MEB.bolum.kod} · ${R5_MEB.bolum.ad}`} appearAt={12} pickAt={PICKS[1]} />
      <Dropdown label="Hedef" value={`${R5_MEB.hedef.kod} · ${R5_MEB.hedef.metin}`} appearAt={18} pickAt={PICKS[2]} />
      <div style={{ width: 900, display: "flex", flexDirection: "column", gap: 10 }}>
        {R5_MEB.davranislar.map((d, i) => {
          const at = PICKS[2] + 12 + i * 8;
          const p = spring({ frame: frame - at, fps, config: { damping: 12 } });
          return (
            <div key={d.kod} style={{ display: "flex", alignItems: "center", gap: 16, opacity: p, transform: `translateX(${(1 - p) * -60}px)` }}>
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  border: `3px solid ${colors.ink}`,
                  background: colors.green,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Check size={30} color={colors.white} strokeWidth={3.5} />
              </span>
              <span style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 30, color: colors.ink }}>
                <b>{d.kod}</b> {d.metin}
              </span>
            </div>
          );
        })}
      </div>
      <Cursor
        appearAt={14}
        clickAt={PICKS[0]}
        keyframes={[
          { frame: 14, x: 900, y: 1300 },
          { frame: PICKS[0] - 4, x: 820, y: 395 },
          { frame: PICKS[1] - 4, x: 820, y: 575 },
          { frame: PICKS[2] - 4, x: 820, y: 755 },
        ]}
      />
    </AbsoluteFill>
  );
};

const STAMP_AT = 40;

export const S3Taslak: React.FC = () => {
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
          marginTop: 220,
          width: 900,
          height: 760,
          overflow: "hidden",
          opacity: page,
          transform: `translateY(${(1 - page) * 400 + shake}px) rotate(${-1.2 * page}deg)`,
        }}
      >
        <Img src={staticFile("real/r5-taslak.png")} style={{ width: 960, display: "block", marginLeft: -30, marginTop: -20 }} />
      </PosterCard>
      <div style={{ position: "absolute", top: 1000, left: 90, right: 90, display: "flex", gap: 10 }}>
        {R5_FLOW.map((f, i) => {
          const p = spring({ frame: frame - 14 - i * 5, fps, config: { damping: 12 } });
          const main = f.ad.startsWith("Ana");
          return (
            <div
              key={f.ad}
              style={{
                flex: f.dk,
                minWidth: 0,
                height: 110,
                borderRadius: 16,
                border: `3px solid ${colors.ink}`,
                background: main ? colors.orange : colors.white,
                color: main ? colors.white : colors.ink,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: fonts.body,
                fontWeight: 700,
                opacity: p,
                transform: `scaleY(${p})`,
                transformOrigin: "bottom",
              }}
            >
              <span style={{ fontSize: 22, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "95%" }}>
                {f.ad.replace(" 1", "").replace(" 2", "")}
              </span>
              <span style={{ fontSize: 30 }}>{f.dk} dk</span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 520,
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 120,
          color: colors.orange,
          border: `10px solid ${colors.orange}`,
          borderRadius: 24,
          padding: "4px 44px",
          background: "rgba(255,255,255,0.88)",
          opacity: frame < STAMP_AT ? 0 : 1,
          transform: `translate(-50%, 0) rotate(-10deg) scale(${1 + (1 - stamp) * 1.6})`,
        }}
      >
        TASLAK
      </div>
      <div
        style={{
          position: "absolute",
          top: 1150,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: fonts.body,
          fontWeight: 700,
          fontSize: 38,
          color: colors.ink,
          opacity: spring({ frame: frame - STAMP_AT - 10, fps, config: { damping: 13 } }),
        }}
      >
        Son söz uzmanın ✍️
      </div>
    </AbsoluteFill>
  );
};

export const S4Cocuk: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const count = Math.round(interpolate(frame, [4, 40], [0, R5_COUNTS.hedef], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 }));
  const count2 = Math.round(interpolate(frame, [10, 46], [0, R5_COUNTS.davranis], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 }));
  const card = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <div style={{ display: "flex", gap: 30, marginTop: 300, opacity: card, transform: `scale(${0.7 + 0.3 * card})` }}>
        {[
          { n: count, label: "MEB hedefi" },
          { n: count2, label: "hedef davranış" },
        ].map((c, i) => (
          <PosterCard key={c.label} bg={i === 0 ? colors.orange : colors.white} style={{ width: 400, padding: "34px 20px", textAlign: "center", transform: `rotate(${i ? 2 : -2}deg)` }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 130, lineHeight: 1, color: i === 0 ? colors.white : colors.ink }}>{c.n}</div>
            <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 36, marginTop: 10, color: i === 0 ? colors.white : colors.gray }}>{c.label}</div>
          </PosterCard>
        ))}
      </div>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 32, color: colors.gray, marginTop: 34, opacity: card }}>
        resmî kodlarıyla
      </div>
      <Headline lines={["Evrakla değil,", "çocukla geçen bir gün."]} top={940} fontSize={100} delay={12} />
    </AbsoluteFill>
  );
};

export const S5Kapanis: React.FC = () => <EndCard product="ATÖLYE" />;
```

- [ ] `Reel.tsx` (desen aynı; `R5MebAtolye`), `Root.tsx`'e `R5-MebAtolye`.
- [ ] `npm run typecheck && npm test` → 0; `ℹ pass 22`.
- [ ] Kare kontrolü. Zaman çizelgesi (ses yok): s1 0–119, s2 120–284, s3 285–434, s4 435–539, s5 540–644 (645 kare = 21,5 sn). Kareler: 90, 200, 260, 390, 500, 620 + safe-260. Beklenen: s2 dropdown'lar sırayla dolu + 2 davranış tikli, imleç her seçimde ilgili kutuda; s3 PDF + TASLAK damgası + süre şeridi + "Son söz uzmanın"; s4 sayaçlar 172 / 1079; EndCard ATÖLYE; altyazı/güvenli alan çakışması yok. Hedef değeri tek satıra sığmazsa Dropdown `fontSize`'ı 34'e indir.
- [ ] Commit `feat(promo): Reels 5 'MEB hedefinden taslağa' sahneleri ve kompozisyonu`

### Task 5: Render + teslim

- [ ] `npm run reel -- r5` → `-vo` sil → süre `21.500000`; sahne sınırı kareleri (119/120, 284/285, 434/435, 539/540) kontakt; gönder.
