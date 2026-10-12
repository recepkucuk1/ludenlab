# Reels 4 — Sosyal Hikaye Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reels 4'ü ("Sıra beklemek çok zor" → Studio Sosyal Hikaye'de durum/ortam seçimi → her cümlesi görselli hikaye → gerçek PDF → "Her çocuğa kendi hikayesi" → kapanış) mevcut altyapı üzerinde üretmek.

**Architecture:** Altyapı (`src/reels-lib/`) değişmez. Sahne görselleri Studio'nun global önbelleğinden (`GeneratedImage`, stil `flux-scene-v1`, anahtar = İngilizce visualPrompt, PII yok) salt okunur indirilir → `public/real/r4/`. Hikaye metni kurgu Türkçe, ürünün `SocialStoryContent` şekliyle `story.ts`'te tek kaynak. PDF, kart detay sayfasına gömülü şablonun (`downloadSocialStoryPDF`, dışa aktarılmıyor) sadık kopyasıyla render edilir; `render-card-asset.ts`'e `r4` eklenir.

**Tech Stack:** Remotion 4.0.484, React 19, `@react-pdf/renderer`, esbuild, `pdftoppm`, `sips`, `curl`, `node --test`.

**Spec:** `docs/superpowers/specs/2026-09-16-instagram-lansman-reels-design.md`

**Önemli bağlam (koddan doğrulandı):**
- Araç: "Sosyal Hikaye" (`apps/hub/src/app/studio/(main)/tools/social-story/page.tsx`). Girdiler: Öğrenci (zorunlu), Sosyal Durum (hazır seçenekler: Sıra bekleme, Selamlaşma, Paylaşma, Duygularını ifade etme, … veya serbest metin), Ortam (Okul, Ev, Park, Market, Hastane, Rehabilitasyon merkezi), Hikaye Uzunluğu (short/medium/long).
- Çıktı (`SocialStoryView.tsx`): başlık + cümle kartları; her cümlede **tür rozeti** (Tanımlayıcı / Perspektif / Yönlendirici / Olumlu) + metin + **cümle başına otomatik görsel**; Uzman Notları, Veli Rehberi.
- PDF (`app/studio/(main)/cards/[id]/page.tsx` `downloadSocialStoryPDF`): başlık, 2'li satırlarda hücre (görsel 175pt + rozet + metin), Uzman Notları (sarı), Veli Rehberi (mavi). Tür renkleri: descriptive `#107996`, perspective `#023435`, directive `#FE703A`, affirmative `#b45309`.
- Seslendirme: son cümle R3'teki gibi bölünür: s5 "Her çocuğa kendi hikayesi." (başlık sahnesi) + s6 "ludenlab nokta com." (kapanış). Diğer cümleler spec ile aynı.
- Komutlar `promo/` içinden; commit'ler `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` ile biter.

---

### Task 1: Hikaye verisi (TDD) + sahne görselleri

**Files:** Create `promo/src/reels/r4-sosyal-hikaye/story.ts`, `promo/scripts/fetch-r4-images.ts`, `promo/tests/r4Story.test.ts`; Modify `promo/package.json`; Create (üretilen) `promo/public/real/r4/s{1..4}.png`

- [ ] **Step 1: Başarısız test**

`promo/tests/r4Story.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { r4Story } from "../src/reels/r4-sosyal-hikaye/story.ts";

test("Carol Gray: dört cümle türünün hepsi, sırayla", () => {
  assert.deepEqual(
    r4Story.sentences.map((s) => s.type),
    ["descriptive", "perspective", "directive", "affirmative"],
  );
});

test("her cümlenin yerel görseli var", () => {
  for (const s of r4Story.sentences) {
    assert.ok(existsSync(resolve(import.meta.dirname, "../public", s.file)), s.file);
  }
});

test("içerik kuralları: öğrenci adı / hız iddiası yok", () => {
  const all = JSON.stringify(r4Story);
  assert.doesNotMatch(all, /saniye|dakikada/i);
  assert.doesNotMatch(all, /\b(Ali|Ayşe|Eymen|Zeynep|Elif|Deniz)\b/);
});
```

- [ ] **Step 2:** `npm test` → FAIL (modül yok).

- [ ] **Step 3: Veri**

`promo/src/reels/r4-sosyal-hikaye/story.ts`:
```ts
const BUCKET = "https://kgbhvruzoaqwwwkhzdex.supabase.co/storage/v1/object/public/tool-images";

/**
 * Reels 4 için KURGU sosyal hikaye — ürünün SocialStoryContent şekli
 * (apps/hub/src/modules/studio/components/cards/SocialStoryView.tsx).
 * Görseller Studio'nun global sahne önbelleğinden (flux-scene-v1, PII yok),
 * yerel kopyaları `npm run fetch:r4` ile public/real/r4/ altına iner.
 */
export const r4Story = {
  title: "Markette Sıra Bekliyorum",
  sentences: [
    {
      type: "descriptive",
      text: "Bazen annemle markete giderim. Kasada sıra olabilir.",
      file: "real/r4/s1.png",
      sourceUrl: `${BUCKET}/a_young_boy_holding_a_small_shopping_basket_walking_toward_a_checkout_counter_in-15pa8pt.png`,
    },
    {
      type: "perspective",
      text: "Sıradaki insanlar da kendi sıralarını bekler.",
      file: "real/r4/s2.png",
      sourceUrl: `${BUCKET}/a_few_people_standing_in_a_checkout_line_at_a_grocery_store_each_holding_their_i-4x0etg.png`,
    },
    {
      type: "directive",
      text: "Sıram gelene kadar ellerimi yanımda tutup sakince bekleyebilirim.",
      file: "real/r4/s3.png",
      sourceUrl: `${BUCKET}/a_young_boy_standing_quietly_next_to_an_adult_in_a_checkout_line_hands_at_his_si-1wv90zu.png`,
    },
    {
      type: "affirmative",
      text: "Sıramı beklediğimde kendimle gurur duyarım.",
      file: "real/r4/s4.png",
      sourceUrl: `${BUCKET}/a_young_boy_smiling_proudly_at_a_checkout_counter_as_the_cashier_gives_him_a_thu-1v34i1v.png`,
    },
  ],
  expertNotes:
    "Hikayeyi markete gitmeden önce birlikte okuyun. Bekleme sırasında sayı saymak ya da sepetteki ürünleri söylemek gibi bir görev verin.",
  homeGuidance:
    "Evde küçük sıra oyunları oynayın (oyuncak sırası, lavabo sırası). Sakince beklediğinde davranışı adıyla övün.",
} as const;

export const SENTENCE_TYPE = {
  descriptive: { label: "Tanımlayıcı", pdfColor: "#107996" },
  perspective: { label: "Perspektif", pdfColor: "#023435" },
  directive: { label: "Yönlendirici", pdfColor: "#FE703A" },
  affirmative: { label: "Olumlu", pdfColor: "#b45309" },
} as const;
```

- [ ] **Step 4: İndirme betiği**

`promo/scripts/fetch-r4-images.ts`:
```ts
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { r4Story } from "../src/reels/r4-sosyal-hikaye/story.ts";

const PUBLIC = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
mkdirSync(resolve(PUBLIC, "real/r4"), { recursive: true });

for (const { file, sourceUrl } of r4Story.sentences) {
  const out = resolve(PUBLIC, file);
  // Yalnız herkese açık önbellek dosyasını okur; DB'ye/Storage'a yazma yok.
  execFileSync("curl", ["-sf", "-o", out, sourceUrl]);
  execFileSync("sips", ["-Z", "640", out], { stdio: "ignore" });
  console.log(`✓ public/${file}`);
}
```
`package.json` scripts: `"fetch:r4": "node scripts/fetch-r4-images.ts",`

- [ ] **Step 5:** `npm run fetch:r4 && npm test` → 4 ✓; `ℹ pass 19`, `ℹ fail 0`.

- [ ] **Step 6: Commit** — `feat(promo): Reels 4 kurgu sosyal hikaye + önbellekten sahne görselleri`

---

### Task 2: PDF görseli

**Files:** Create `promo/scripts/assets/r4-story-entry.tsx`; Modify `promo/scripts/render-card-asset.ts`, `promo/package.json`; Create (üretilen) `promo/public/real/r4-hikaye.png`

- [ ] **Step 1: Şablon kopyası**

`promo/scripts/assets/r4-story-entry.tsx`:
```tsx
/**
 * apps/hub/src/app/studio/(main)/cards/[id]/page.tsx → downloadSocialStoryPDF
 * içindeki Doc şablonunun SADIK KOPYASI (orijinal dışa aktarılmıyor). Şablon
 * değişirse burası da güncellenmeli.
 */
import React from "react";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToFile } from "@react-pdf/renderer";
import { resolve } from "node:path";
import { SENTENCE_TYPE, r4Story } from "../../src/reels/r4-sosyal-hikaye/story";

export const renderStoryPdf = (outPath: string, promoRoot: string, hubPublic: string) => {
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${hubPublic}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${hubPublic}/fonts/NotoSans-Bold.ttf`, fontWeight: "bold" },
    ],
  });

  const sentences = r4Story.sentences.map((s) => ({ ...s, imageUrl: resolve(promoRoot, "public", s.file) }));
  const rows: (typeof sentences)[] = [];
  for (let i = 0; i < sentences.length; i += 2) rows.push(sentences.slice(i, i + 2));

  const styles = StyleSheet.create({
    page: { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 44, backgroundColor: "#fff" },
    title: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 16 },
    gridRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
    cell: { width: "47%", padding: 8, backgroundColor: "#faf9f6", borderRadius: 8, borderWidth: 1, borderColor: "#ececec" },
    cellImg: { width: "100%", height: 175, objectFit: "contain", borderRadius: 5, marginBottom: 6, backgroundColor: "#fff" },
    badge: { fontWeight: "bold", fontSize: 7.5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, alignSelf: "flex-start", marginBottom: 4 },
    text: { fontSize: 9.5, lineHeight: 1.45, color: "#3f3f46" },
    section: { marginTop: 14, padding: 10, borderRadius: 6 },
    secTitle: { fontWeight: "bold", fontSize: 9, marginBottom: 4 },
    secText: { fontSize: 9, lineHeight: 1.6 },
  });

  const Doc = () => (
    <Document title={r4Story.title} author="LudenLab">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{r4Story.title}</Text>
        {rows.map((pair, ri) => (
          <View key={ri} style={styles.gridRow} wrap={false}>
            {pair.map((s, ci) => {
              const t = SENTENCE_TYPE[s.type];
              return (
                <View key={ci} style={styles.cell}>
                  <Image src={s.imageUrl} style={styles.cellImg} />
                  <Text style={[styles.badge, { backgroundColor: `${t.pdfColor}20`, color: t.pdfColor }]}>{t.label}</Text>
                  <Text style={styles.text}>{s.text}</Text>
                </View>
              );
            })}
          </View>
        ))}
        <View style={[styles.section, { backgroundColor: "#fffbeb" }]}>
          <Text style={[styles.secTitle, { color: "#92400e" }]}>Uzman Notları</Text>
          <Text style={[styles.secText, { color: "#78350f" }]}>{r4Story.expertNotes}</Text>
        </View>
        <View style={[styles.section, { backgroundColor: "#eff6ff" }]}>
          <Text style={[styles.secTitle, { color: "#1e40af" }]}>Veli Rehberi</Text>
          <Text style={[styles.secText, { color: "#1e3a8a" }]}>{r4Story.homeGuidance}</Text>
        </View>
      </Page>
    </Document>
  );

  return renderToFile(<Doc />, outPath);
};
```

- [ ] **Step 2:** `render-card-asset.ts` `ASSETS` nesnesine ekle:
```ts
  r4: { entry: "r4-story-entry.tsx", exportName: "renderStoryPdf", png: "public/real/r4-hikaye" },
```
`package.json`: `"asset:r4": "node scripts/render-card-asset.ts r4",`

- [ ] **Step 3:** `npm run typecheck && npm run asset:r4 && sips -g pixelWidth -g pixelHeight public/real/r4-hikaye.png` → `1654 × 2339`. PNG'yi Read ile incele: başlık, 2×2 hücre, rozet renkleri, Uzman Notları + Veli Rehberi, Türkçe karakterler doğru.

- [ ] **Step 4: Commit** — `feat(promo): Reels 4 sosyal hikaye PDF görseli`

---

### Task 3: Metin + kayıt + spec

- [ ] **Step 1:** `promo/src/reels/r4-sosyal-hikaye/script.ts`:
```ts
import type { ReelScript } from "../../reels-lib/types";

export const r4Script: ReelScript = {
  id: "r4",
  slug: "r4-sosyal-hikaye",
  title: "Her çocuğa kendi hikayesi",
  scenes: [
    { id: "s1", vo: "Sıra beklemek, bazı çocuklar için çok zor.", screen: "Sıra beklemek çok zor.", defaultSec: 3.5 },
    {
      id: "s2",
      vo: "Studio'da durumu yaz; Carol Gray formatında bir sosyal hikaye hazırlansın.",
      screen: "Sosyal Hikaye: Sıra bekleme · Market → başlık",
      defaultSec: 5,
    },
    { id: "s3", vo: "Her cümlenin kendi görseli var.", screen: "4 cümle kartı: tür rozeti + gerçek sahne görseli", defaultSec: 4.5 },
    { id: "s4", vo: "Öğrencine özel, yazdırmaya hazır.", screen: "Gerçek PDF + Yazdır", defaultSec: 3.5 },
    { id: "s5", vo: "Her çocuğa kendi hikayesi.", screen: "Her çocuğa kendi hikayesi.", defaultSec: 3 },
    { id: "s6", vo: "ludenlab nokta com.", screen: "Kapanış kartı (STUDIO)", defaultSec: 3.5, minSec: 3.5, hideCaption: true },
  ],
};
```

- [ ] **Step 2:** `scripts/reels.ts`'e `import { r4Script } from "../src/reels/r4-sosyal-hikaye/script.ts";` ve `{ script: r4Script, compositionId: "R4-SosyalHikaye" }`.

- [ ] **Step 3: Spec** — "Reels 4" tablosunu şununla değiştir:
```markdown
| Sahne | Seslendirme | Ekran |
|---|---|---|
| s1 | Sıra beklemek, bazı çocuklar için çok zor. | Sıra beklemek çok zor. |
| s2 | Studio'da durumu yaz; Carol Gray formatında bir sosyal hikaye hazırlansın. | Sıra bekleme · Market seçiliyor → hikaye başlığı |
| s3 | Her cümlenin kendi görseli var. | 4 cümle kartı: tür rozeti + gerçek sahne görseli |
| s4 | Öğrencine özel, yazdırmaya hazır. | Gerçek PDF (ürün şablonu, kurgu içerik) + Yazdır |
| s5 | Her çocuğa kendi hikayesi. | Her çocuğa kendi hikayesi. |
| s6 | ludenlab nokta com. | Kapanış kartı (STUDIO) |
```

- [ ] **Step 4:** `npm run -s scripts | tail -7 && npm run typecheck` → commit `feat(promo): Reels 4 metni`

---

### Task 4: Sahneler + kompozisyon + kare kontrolü

- [ ] **Step 1:** `promo/src/reels/r4-sosyal-hikaye/scenes.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BookOpen, Hourglass, Printer } from "lucide-react";
import { colors, fonts } from "../../brand";
import { Cursor } from "../../lib/Cursor";
import { PosterCard } from "../../lib/PosterCard";
import { ToolHeader } from "../../lib/ToolHeader";
import { EndCard } from "../../reels-lib/EndCard";
import { Headline } from "../../reels-lib/Headline";
import { SENTENCE_TYPE, r4Story } from "./story";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const S1Zor: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12 } });
  // Kum saati iki kez ters döner
  const flip = interpolate(frame % 45, [25, 40], [0, 180], clamp) + Math.floor(frame / 45) * 180;
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <PosterCard
        radius={60}
        style={{
          marginTop: 320,
          width: 420,
          height: 420,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: pop,
          transform: `scale(${0.6 + 0.4 * pop})`,
        }}
      >
        <div style={{ transform: `rotate(${flip}deg)` }}>
          <Hourglass size={240} color={colors.orange} strokeWidth={2} />
        </div>
      </PosterCard>
      <Headline lines={["Sıra beklemek", "çok zor."]} top={940} fontSize={124} delay={10} />
    </AbsoluteFill>
  );
};

const SITUATIONS = ["Sıra bekleme", "Selamlaşma", "Paylaşma", "Yardım isteme"];
const ENVIRONMENTS = ["Okul", "Park", "Market"];
const PICK_AT = 30;

const Chip: React.FC<{ label: string; active: boolean; activeBg: string; progress: number }> = ({
  label,
  active,
  activeBg,
  progress,
}) => (
  <span
    style={{
      fontFamily: fonts.body,
      fontWeight: 700,
      fontSize: 36,
      padding: "12px 28px",
      borderRadius: 999,
      border: `3px solid ${colors.ink}`,
      background: active ? activeBg : colors.white,
      color: active ? colors.white : colors.ink,
      opacity: progress,
      transform: `scale(${0.6 + 0.4 * progress})`,
      display: "inline-block",
    }}
  >
    {label}
  </span>
);

const labelStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontWeight: 700,
  fontSize: 30,
  letterSpacing: 6,
  color: colors.gray,
  alignSelf: "flex-start",
  marginLeft: 90,
};

export const S2Durum: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (d: number) => spring({ frame: frame - d, fps, config: { damping: 13 } });
  const picked = frame >= PICK_AT;
  const env = s(PICK_AT + 6);
  const title = spring({ frame: frame - PICK_AT - 22, fps, config: { damping: 11 } });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", paddingTop: 240 }}>
      <ToolHeader icon={<BookOpen size={52} strokeWidth={2.4} />} title="Sosyal Hikaye" />
      <div style={{ ...labelStyle, marginTop: 50, opacity: s(4) }}>SOSYAL DURUM</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, width: 900, marginTop: 16 }}>
        {SITUATIONS.map((t, i) => (
          <Chip key={t} label={t} active={i === 0 && picked} activeBg={colors.orange} progress={s(6 + i * 3)} />
        ))}
      </div>
      <div style={{ ...labelStyle, marginTop: 40, opacity: env }}>ORTAM</div>
      <div style={{ display: "flex", gap: 16, width: 900, marginTop: 16 }}>
        {ENVIRONMENTS.map((t, i) => (
          <Chip key={t} label={t} active={i === 2} activeBg={colors.studioBlue} progress={env} />
        ))}
      </div>
      <PosterCard
        bg={colors.paleBlue}
        style={{
          marginTop: 56,
          width: 900,
          padding: "30px 36px",
          opacity: title,
          transform: `translateY(${(1 - title) * 60}px) rotate(${-1.5 * title}deg)`,
        }}
      >
        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 28, letterSpacing: 4, color: colors.studioBlue }}>
          CAROL GRAY FORMATI
        </div>
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 64, color: colors.ink, marginTop: 8 }}>
          {r4Story.title}
        </div>
      </PosterCard>
      <Cursor
        appearAt={8}
        clickAt={PICK_AT}
        keyframes={[
          { frame: 8, x: 760, y: 1250 },
          { frame: PICK_AT - 4, x: 230, y: 560 },
        ]}
      />
    </AbsoluteFill>
  );
};

/** Ürün arayüzündeki rozet eşlemesi (mavi / mürekkep / turuncu / sarı), marka tonlarıyla. */
const BADGE: Record<string, { bg: string; fg: string }> = {
  descriptive: { bg: colors.paleBlue, fg: colors.studioBlue },
  perspective: { bg: colors.cream, fg: colors.ink },
  directive: { bg: colors.cream, fg: colors.orange },
  affirmative: { bg: colors.logoCream, fg: colors.amber },
};

export const S3Cumleler: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center", paddingTop: 220 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 440px)", gap: 28 }}>
        {r4Story.sentences.map((st, i) => {
          const p = spring({ frame: frame - i * 7, fps, config: { damping: 12 } });
          const b = BADGE[st.type];
          return (
            <PosterCard
              key={st.type}
              style={{
                padding: 16,
                opacity: p,
                transform: `translateY(${(1 - p) * 120}px) rotate(${(i % 2 ? 1.2 : -1.2) * p}deg)`,
              }}
            >
              <Img src={staticFile(st.file)} style={{ width: "100%", height: 330, objectFit: "cover", borderRadius: 14, display: "block" }} />
              <span
                style={{
                  display: "inline-block",
                  marginTop: 12,
                  fontFamily: fonts.body,
                  fontWeight: 700,
                  fontSize: 22,
                  padding: "4px 14px",
                  borderRadius: 999,
                  background: b.bg,
                  color: b.fg,
                  border: `2px solid ${b.fg}`,
                }}
              >
                {SENTENCE_TYPE[st.type].label}
              </span>
              <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 26, lineHeight: 1.3, color: colors.ink, marginTop: 8, height: 102 }}>
                {st.text}
              </div>
            </PosterCard>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const PRINT_AT = 34;

export const S4Pdf: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const page = spring({ frame, fps, config: { damping: 14 } });
  const btn = spring({ frame: frame - 14, fps, config: { damping: 11 } });
  const dip = interpolate(frame, [PRINT_AT - 4, PRINT_AT, PRINT_AT + 6], [1, 0.9, 1], clamp);
  const badge = spring({ frame: frame - PRINT_AT - 6, fps, config: { damping: 9, stiffness: 170 } });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <PosterCard
        radius={16}
        shadow={12}
        style={{
          marginTop: 230,
          width: 900,
          height: 1000,
          overflow: "hidden",
          opacity: page,
          transform: `translateY(${(1 - page) * 400}px) rotate(${-1.2 * page}deg)`,
        }}
      >
        <Img src={staticFile("real/r4-hikaye.png")} style={{ width: 960, display: "block", marginLeft: -30, marginTop: -30 }} />
      </PosterCard>
      <div
        style={{
          position: "absolute",
          top: 250,
          right: 70,
          fontFamily: fonts.body,
          fontWeight: 700,
          fontSize: 40,
          color: colors.white,
          background: colors.studioBlue,
          border: `4px solid ${colors.ink}`,
          borderRadius: 999,
          padding: "12px 30px",
          opacity: frame < PRINT_AT + 6 ? 0 : 1,
          transform: `rotate(6deg) scale(${badge})`,
        }}
      >
        Öğrencine özel
      </div>
      <div
        style={{
          position: "absolute",
          left: 600,
          top: 1110,
          display: "flex",
          alignItems: "center",
          gap: 16,
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
        <Printer size={48} strokeWidth={2.6} />
        Yazdır
      </div>
      <Cursor
        appearAt={16}
        clickAt={PRINT_AT}
        keyframes={[
          { frame: 16, x: 980, y: 1400 },
          { frame: PRINT_AT - 4, x: 860, y: 1150 },
        ]}
      />
    </AbsoluteFill>
  );
};

export const S5Kendi: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 11 } });
  return (
    <AbsoluteFill style={{ background: colors.cream, alignItems: "center" }}>
      <PosterCard
        style={{
          marginTop: 250,
          padding: 18,
          opacity: pop,
          transform: `scale(${0.7 + 0.3 * pop}) rotate(${-4 + 4 * pop + Math.sin(frame / 16) * 1.5}deg)`,
        }}
      >
        <Img src={staticFile(r4Story.sentences[3].file)} style={{ width: 520, height: 520, objectFit: "cover", borderRadius: 16, display: "block" }} />
      </PosterCard>
      <Headline lines={["Her çocuğa", "kendi hikayesi."]} top={930} fontSize={120} delay={8} />
    </AbsoluteFill>
  );
};

export const S6Kapanis: React.FC = () => <EndCard product="STUDIO" />;
```

- [ ] **Step 2:** `Reel.tsx` (R2/R3 ile aynı desen: `SCENES = { s1: S1Zor, s2: S2Durum, s3: S3Cumleler, s4: S4Pdf, s5: S5Kendi, s6: S6Kapanis }`, `export const R4SosyalHikaye`), `Root.tsx`'e `R4-SosyalHikaye` kompozisyonu.

- [ ] **Step 3:** `npm run typecheck && npm test` → 0; `ℹ pass 19`.

- [ ] **Step 4: Kare kontrolü.** Zaman çizelgesi (ses yok): s1 0–104, s2 105–254, s3 255–389, s4 390–494, s5 495–584, s6 585–689 (690 kare = 23 sn). Kareler: 80, 200, 370, 460, 560, 670 + safe-370. Beklenen: s2'de "Sıra bekleme" turuncu seçili, Market mavi, başlık kartı; s3'te 2×2 kart altyazıyla çakışmıyor; s4'te "Öğrencine özel" rozeti + Yazdır tıklaması; s5 başlık + gururlu çocuk görseli. Çakışmada s3 görsel yüksekliğini (330) düşür.

- [ ] **Step 5: Commit** — `feat(promo): Reels 4 'Her çocuğa kendi hikayesi' sahneleri ve kompozisyonu`

---

### Task 5: Render + teslim

- [ ] `npm run reel -- r4`, `-vo.mp4` sil, süre `23.000000`; sahne sınırı kareleri (104/105, 254/255, 389/390, 494/495) kontakt sayfası; `out/reels/r4-sosyal-hikaye.mp4` gönder. Bildir: s5/s6 bölünmesi (`r4-s5.mp3`, `r4-s6.mp3`).
