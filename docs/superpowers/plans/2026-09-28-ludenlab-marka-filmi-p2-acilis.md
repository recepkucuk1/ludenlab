# LudenLab Marka Filmi · Plan 2: Açılış (Kanca, v1–8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filmin ilk 5 saniyesini (Kanca: blok düşer, yuvasına oturur, "HER ÇOCUK AYRI.", üç hedef etiketi vuruşta çizilir) efektleriyle 16:9 MP4 olarak üretmek; yanında açılış föyü ve eleştiri raporu. Bu, spec'teki **Onay kapısı 2**'dir.

**Architecture:** Luden `ReelsAcilis` düzeni: sahne, bir durum nesnesinin saf fonksiyonu (`AcilisSahnesi`); animasyon kare → durum eşlemesidir (`acilisDurumu`, node testli); föy aynı fonksiyondan seçilmiş kareleri çizer. Vuruş olayları (`olaylar.ts`) tek kaynaktır: hem görüntü zamanlaması hem efekt izi (`scripts/lib/sfx.ts`) onu okur. Plan 1'in altyapısı (izometri, nesneler, metin, bileşenler) genişletilir, yeniden yazılmaz.

**Tech Stack:** Remotion 4.0.484 (`interpolate`, `Easing`, `Html5Audio`), React 19, TypeScript (Node 24 tip ayıklamasıyla `node --test`), sistem ffmpeg/ffprobe (`/opt/homebrew/bin`), Python PIL (yalnız doğrulama).

**Spec:** `docs/superpowers/specs/2026-09-28-ludenlab-marka-filmi-design.md` ("0 · Kanca", "Görsel dil", "Ses", "Doğrulama")
**Plan 1:** `docs/superpowers/plans/2026-09-28-ludenlab-marka-filmi-p1-stil-karesi.md` (bitti; onay kapısı 1 geçti: anlatıcı Chris, künyede renkli logo, raptiyeler üst yüzde, yüz büyük)

**Kapsam dışı (Plan 3):** müzik, seslendirme, tabla dönüşleri, Yük ve sonrası bölümler, ses seviyesi normalizasyonu. Açılışta **künye yok** (spec: künye v29'da gelir).

## Kurallar (tüm görevler)

- Çalışma dizini: `/Users/recepkucuk/ludenlab/.claude/worktrees/ludenlab-marka-filmi/promo` (dal `claude/ludenlab-marka-filmi`). Ana checkout'a dokunma. Push yok.
- `src/marka/` içindeki göreli içe aktarmalar uzantılı (`./x.ts`, `./y.tsx`); yalnız silinebilir TS sözdizimi. `Root.tsx` uzantısız içe aktarır (mevcut düzen).
- **Dosya adı çakışması yasak:** macOS büyük/küçük harf duyarsız; `acilis.ts` ile `Acilis.tsx` aynı uzantısız yola çözülebilir. Bu yüzden adlar: `acilisDurumu.ts`, `AcilisSahnesi.tsx`, `MarkaAcilis.tsx`, `AcilisFoyu.tsx`.
- Node testleri `remotion` paketinden `interpolate`/`Easing` içe aktarabilir (doğrulandı); `.tsx` dosyaları node testine girmez.
- Ücretli API çağıran betikleri (`npm run tts`, `npm run marka:tts`) çalıştırma.
- Commit: Türkçe `feat(promo/marka): …` / `test(…)` / `refactor(…)`; `Co-Authored-By` satırı her ajanın kendi sistem hatırlatmasındaki satırdır. Push yok.
- Test raporlayıcısı `ℹ pass N` / `ℹ fail 0` yazar. Başlangıç: 57 test.

## Dosya haritası

| Dosya | Durum | Sorumluluk |
|---|---|---|
| `src/marka/metin.ts` | değişir | `baslik` alanı: büyük harf başlıklar satır satır |
| `src/marka/yerlesim.ts` | yeni | genel plan kamerası, hedef etiketlerinin yerleşimi (StilKaresi ve açılış paylaşır) |
| `src/marka/olaylar.ts` | yeni | Kanca görüntü vuruşları + 16:9 ses olay listesi (tek zaman kaynağı) |
| `src/marka/acilisDurumu.ts` | yeni | kare → açılış durumu (saf) |
| `scripts/lib/sfx.ts` | yeni | olay listesinden efekt izi + WAV yazıcı (saf) |
| `scripts/marka-sfx.ts` | yeni | `public/marka/sfx-169.wav` üretir |
| `src/marka/sahne3b.tsx` | değişir | `NoktaliCizgi` ilerleme, `Blok` yüz opaklığı, `Yuva`, `HavaGolgesi` |
| `src/marka/yazi.tsx` | değişir | `Zemin` kayma, başlık maskesi, `UstCumle`, `Cip` görünüm, `Etiket` ilerleme |
| `src/marka/StilKaresi.tsx` | değişir | `baslik` ve `yerlesim.ts`'i kullanır |
| `src/marka/AcilisSahnesi.tsx` | yeni | durum → kare |
| `src/marka/MarkaAcilis.tsx` | yeni | kompozisyon (görüntü + efekt) |
| `src/marka/AcilisFoyu.tsx` | yeni | açılış föyü (Still) |
| `scripts/elestiri.ts` | yeni | render denetimi (kontak, telefon, donukluk, ses) |
| `src/Root.tsx`, `package.json`, `.gitignore` | değişir | kayıtlar, komutlar, üretilen WAV |
| `tests/marka-yerlesim.test.ts`, `tests/marka-olaylar.test.ts`, `tests/marka-acilis.test.ts`, `tests/sfx.test.ts` | yeni | birim testler |

---

### Task 1: Başlık satırları (`metin.ts`)

**Neden:** Başlıklar ekranda satır satır açılıyor ("HER ÇOCUK" v1'de, "AYRI." v3'te). Satır kırılımı metnin parçası olmalı; `split(" ")` "HER ÇOCUK AYRI."'yı yanlış böler.

**Files:**
- Modify: `promo/src/marka/metin.ts`
- Modify: `promo/tests/marka-metin.test.ts`
- Modify: `promo/src/marka/StilKaresi.tsx` (son satırdaki `Baslik`)

- [ ] **Step 1: Mevcut stil karesini sakla (piksel karşılaştırması için)**

```bash
npm run marka:stil && cp out/marka/stil-karesi.png out/marka/stil-karesi-onceki.png
```
Expected: `out/marka/stil-karesi-onceki.png` var.

- [ ] **Step 2: Başarısız testi yaz**

`promo/tests/marka-metin.test.ts` içinde `tumMetin` tanımını şununla değiştir:
```ts
const tumMetin = Object.values(METIN)
  .flatMap((m) => [...m.baslik, ...m.ekran, m.vo])
  .concat(HEDEFLER.map((h) => h.metin));
```
ve dosyanın sonuna ekle:
```ts
test("başlıklar büyük harf, satırlara bölünmüş ve satır başına en çok 12 karakter", () => {
  for (const m of Object.values(METIN)) {
    for (const s of m.baslik) {
      assert.equal(s, s.toLocaleUpperCase("tr"), s);
      assert.ok(s.length <= 12, `${s}: ${s.length} karakter`);
    }
  }
  assert.deepEqual(METIN.kanca.baslik, ["HER ÇOCUK", "AYRI."]);
  assert.deepEqual(METIN.cocuk.baslik, ["VAKTİN", "ÇOCUĞA", "KALSIN."]);
});
```

- [ ] **Step 3: Testin başarısız olduğunu gör**

Run: `node --test tests/marka-metin.test.ts`
Expected: FAIL (`m.baslik` tanımsız → `TypeError: m.baslik is not iterable`).

- [ ] **Step 4: Uygula**

`promo/src/marka/metin.ts` içinde `BolumMetni` tipini ve `METIN` nesnesini şununla değiştir (diğer dışa aktarımlar aynı kalır):
```ts
export type BolumMetni = {
  /** Büyük harf başlık; her eleman bir satır (satır kırılımı burada verilir). Başlığı olmayan bölümde boş. */
  baslik: string[];
  /** Başlık dışındaki ekran metinleri, okunma sırasıyla (animasyon sırası bölüm kodunda). */
  ekran: string[];
  /** Seslendirme satırı; TTS yazımıyla ("Luden Lab", "ludenlab nokta com"). */
  vo: string;
};

export const METIN: Record<BolumId, BolumMetni> = {
  kanca: {
    baslik: ["HER ÇOCUK", "AYRI."],
    ekran: ["Özel eğitimde"],
    vo: "Özel eğitimde her çocuk ayrı.",
  },
  yuk: {
    baslik: ["HER MATERYAL", "AYRI."],
    ekran: ["Evrak büyüdükçe masada çocuğa yer kalmıyor."],
    vo: "Her çocuğa ayrı materyal, ayrı plan, ayrı rapor. Evrak büyüdükçe masada çocuğa yer kalmıyor.",
  },
  donus: {
    baslik: [],
    ekran: ["Bu yükü tek başına taşımak zorunda değilsin.", "01 Studio", "02 Atölye"],
    vo: "Bu yükü tek başına taşımak zorunda değilsin.",
  },
  studio: {
    baslik: ["STUDIO"],
    ekran: [
      "Dil ve konuşma alanında çalışan uzmanlar için.",
      "Hedef sesi seç; kelimeler görselleriyle gelsin.",
      "Öğrenme Kartı · Sosyal Hikaye · Artikülasyon ve 7 araç daha",
    ],
    vo: "Studio, dil ve konuşma alanında çalışan uzmanlar için. Hedef sesi seç, kelimeler görselleriyle gelsin.",
  },
  atolye: {
    baslik: ["ATÖLYE"],
    ekran: [
      "Öğrenme güçlüğü alanında çalışan uzmanlar için.",
      `MEB ${MEB_PROGRAM} · 172 hedef`,
      "Hedefini seç; seans planı taslağın hazırlansın.",
      "Son söz her zaman senin.",
      "Seans Planı · BEP & Rapor · Veli Mektubu ve 8 araç daha",
    ],
    vo: "Atölye, öğrenme güçlüğü alanında çalışan uzmanlar için. Hedefini seç, seans planı taslağın hazırlansın. Son söz her zaman senin.",
  },
  cocuk: {
    baslik: ["VAKTİN", "ÇOCUĞA", "KALSIN."],
    ekran: [],
    vo: "Vaktin çocuğa kalsın.",
  },
  kapanis: {
    baslik: ["HER ŞEY", "ÇOCUĞUN", "ETRAFINDA."],
    ekran: ["Özel eğitimde yapay zekâ destekli öğrenme yönetimi.", "Studio", "Atölye", "ludenlab.com"],
    vo: "Luden Lab. Her şey çocuğun etrafında. ludenlab nokta com.",
  },
};
```

`promo/src/marka/StilKaresi.tsx` son satırlarındaki
```tsx
    <Baslik satirlar={METIN.cocuk.ekran[0].split(" ")} top={360} />
```
satırını şununla değiştir:
```tsx
    <Baslik satirlar={METIN.cocuk.baslik} top={360} />
```

- [ ] **Step 5: Testler ve tip denetimi**

Run: `npm test && npm run typecheck`
Expected: `ℹ pass 58`, `ℹ fail 0`; `tsc` çıktısız.

- [ ] **Step 6: Stil karesi piksel piksel aynı**

```bash
npm run marka:stil && python3 -c "from PIL import Image, ImageChops; a=Image.open('out/marka/stil-karesi-onceki.png').convert('RGB'); b=Image.open('out/marka/stil-karesi.png').convert('RGB'); print(ImageChops.difference(a,b).getbbox())"
```
Expected: `None` (fark yok). `None` değilse DUR ve bildir.

- [ ] **Step 7: Commit**

```bash
git add src/marka/metin.ts tests/marka-metin.test.ts src/marka/StilKaresi.tsx
git commit -m "refactor(promo/marka): başlıklar satır satır metin.ts'te"
```
(Commit gövdesine kendi `Co-Authored-By` satırını ekle.)

---

### Task 2: Ortak yerleşim (`yerlesim.ts`)

**Neden:** Onay kapısı 1'de onaylanan etiket çapaları ve kamera hem stil karesinde (F10) hem açılışta (F2) kullanılıyor; tek yerde durmalı.

**Files:**
- Create: `promo/src/marka/yerlesim.ts`
- Test: `promo/tests/marka-yerlesim.test.ts`
- Modify: `promo/src/marka/StilKaresi.tsx`

- [ ] **Step 1: Başarısız testi yaz**

`promo/tests/marka-yerlesim.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { izd } from "../src/marka/izometri.ts";
import { HEDEFLER } from "../src/marka/metin.ts";
import { GENEL_KAMERA, HEDEF_YERLESIMI } from "../src/marka/yerlesim.ts";

test("her hedefin bir yerleşimi var", () => {
  assert.equal(HEDEF_YERLESIMI.length, HEDEFLER.length);
});

test("etiket çapaları bloğun yan yüzlerinde değil (onay kapısı 1)", () => {
  for (const { capa } of HEDEF_YERLESIMI) {
    const [x, y, z] = capa;
    const ustYuzde = z === 1 && Math.abs(x) <= 0.5 && Math.abs(y) <= 0.5;
    const tablada = z === 0 && (Math.abs(x) > 0.5 || Math.abs(y) > 0.5);
    assert.ok(ustYuzde || tablada, `${capa}`);
  }
});

test("genel plan kamerası: blok ekranın sağ yarısında", () => {
  assert.ok(izd([0, 0, 0.5], GENEL_KAMERA)[0] > 960);
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `node --test tests/marka-yerlesim.test.ts`
Expected: FAIL, `Cannot find module '…/src/marka/yerlesim.ts'`.

- [ ] **Step 3: Uygula**

`promo/src/marka/yerlesim.ts`:
```ts
import type { Kamera, V3 } from "./izometri.ts";

/** Genel plan (storyboard F2, F10): tabla sağda, blok ortasında; metin sütunu solda. */
export const GENEL_KAMERA: Kamera = { s: 100, ox: 1340, oy: 560, don: 0 };

export type HedefYerlesimi = {
  /** Çizginin vardığı dünya noktası. */
  capa: V3;
  /** Çipin hizalı kenarı (px, 1920×1080). */
  x: number;
  y: number;
  hiza: "sol" | "sag";
};

/**
 * HEDEFLER sırasıyla etiket yerleşimi. Onay kapısı 1: iki çapa bloğun üst yüzünde, üçüncüsü tablada;
 * yan yüzler boş kalır, raptiye bloğun yüzüyle karışmaz.
 */
export const HEDEF_YERLESIMI: readonly HedefYerlesimi[] = [
  { capa: [-0.3, 0.3, 1], x: 1150, y: 330, hiza: "sag" },
  { capa: [0.3, -0.3, 1], x: 1520, y: 330, hiza: "sol" },
  { capa: [0.85, 0.15, 0], x: 1540, y: 740, hiza: "sol" },
];
```

`promo/src/marka/StilKaresi.tsx` dosyasının tamamını şununla değiştir:
```tsx
import React from "react";
import { AbsoluteFill } from "remotion";
import { izd } from "./izometri.ts";
import { HEDEFLER, METIN } from "./metin.ts";
import { yigin } from "./nesneler.ts";
import { Blok, DerinlikSirali, KagitYigini, Tabla, Tanimlar } from "./sahne3b.tsx";
import { RENK, TUVAL_169 } from "./tema.ts";
import { GENEL_KAMERA, HEDEF_YERLESIMI } from "./yerlesim.ts";
import { Baslik, Etiket, Kunye, Zemin } from "./yazi.tsx";

// Storyboard F10 (0:45,6 · vuruş 77): tabla tam turu tamamladı; iki modül kenarda ince dosya, blok ortada tek başına.
const K = GENEL_KAMERA;
const STUDIO = yigin({ cx: -1.6, cy: 1.5, adet: 3, tohum: 21, sapma: 0.02, sekme: RENK.studio });
const ATOLYE = yigin({ cx: 1.5, cy: -1.6, adet: 3, tohum: 23, sapma: 0.02, sekme: RENK.atolye });
const modulRengi = (m: "studio" | "atolye") => (m === "studio" ? RENK.studio : RENK.atolye);

export const StilKaresi: React.FC = () => (
  <AbsoluteFill>
    <Zemin />
    <svg width={TUVAL_169.w} height={TUVAL_169.h} style={{ position: "absolute", inset: 0 }}>
      <Tanimlar />
      <Tabla k={K} />
      <DerinlikSirali
        k={K}
        ogeler={[
          { p: [STUDIO.cx, STUDIO.cy, 0], ciz: <KagitYigini y={STUDIO} k={K} /> },
          { p: [ATOLYE.cx, ATOLYE.cy, 0], ciz: <KagitYigini y={ATOLYE} k={K} /> },
          { p: [0, 0, 0], ciz: <Blok k={K} /> },
        ]}
      />
    </svg>
    {HEDEFLER.map((h, i) => {
      const y = HEDEF_YERLESIMI[i];
      return <Etiket key={h.metin} capa={izd(y.capa, K)} x={y.x} y={y.y} hiza={y.hiza} metin={h.metin} nokta={modulRengi(h.modul)} />;
    })}
    <Kunye />
    <Baslik satirlar={METIN.cocuk.baslik} top={360} />
  </AbsoluteFill>
);
```

- [ ] **Step 4: Testler, tip denetimi, piksel eşitliği**

```bash
npm test && npm run typecheck && npm run marka:stil && python3 -c "from PIL import Image, ImageChops; a=Image.open('out/marka/stil-karesi-onceki.png').convert('RGB'); b=Image.open('out/marka/stil-karesi.png').convert('RGB'); print(ImageChops.difference(a,b).getbbox())"
```
Expected: `ℹ pass 61`, `ℹ fail 0`; tsc temiz; son satır `None`.

- [ ] **Step 5: Commit**

```bash
git add src/marka/yerlesim.ts tests/marka-yerlesim.test.ts src/marka/StilKaresi.tsx
git commit -m "refactor(promo/marka): kamera ve hedef etiket yerleşimi tek yerde"
```

---

### Task 3: Vuruş olayları (`olaylar.ts`)

**Files:**
- Create: `promo/src/marka/olaylar.ts`
- Test: `promo/tests/marka-olaylar.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

`promo/tests/marka-olaylar.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { HEDEFLER, METIN } from "../src/marka/metin.ts";
import { KANCA, SESLER_169 } from "../src/marka/olaylar.ts";
import { BOLUMLER_169 } from "../src/marka/zaman.ts";

test("ses olayları vuruş ızgarasında, sıralı ve film içinde", () => {
  const son = BOLUMLER_169[BOLUMLER_169.length - 1].son;
  let onceki = 0;
  for (const s of SESLER_169) {
    assert.ok(Number.isInteger(s.vurus), `${s.vurus}`);
    assert.ok(s.vurus >= 1 && s.vurus <= son, `${s.vurus}`);
    assert.ok(s.vurus >= onceki, `sıra: ${s.vurus}`);
    onceki = s.vurus;
  }
});

test("kanca: whoosh inişte biter, tok inişte, her etikette tık", () => {
  const w = SESLER_169.find((s) => s.tur === "whoosh")!;
  assert.equal(w.vurus, KANCA.dusus);
  assert.equal(w.vurus + (w.vurusSure ?? 0), KANCA.inis);
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "tok").map((s) => s.vurus), [KANCA.inis]);
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "tik").map((s) => s.vurus), [...KANCA.etiketler]);
});

test("kanca vuruşları Kanca bölümünün içinde", () => {
  const kanca = BOLUMLER_169.find((b) => b.id === "kanca")!;
  for (const v of [KANCA.dusus, KANCA.inis, ...KANCA.baslik, KANCA.ustCumle, ...KANCA.etiketler]) {
    assert.ok(v >= kanca.ilk && v <= kanca.son, `${v}`);
  }
});

test("etiket ve başlık vuruşları metinle eşleşir", () => {
  assert.equal(KANCA.etiketler.length, HEDEFLER.length);
  assert.equal(KANCA.baslik.length, METIN.kanca.baslik.length);
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `node --test tests/marka-olaylar.test.ts`
Expected: FAIL, `Cannot find module '…/src/marka/olaylar.ts'`.

- [ ] **Step 3: Uygula**

`promo/src/marka/olaylar.ts`:
```ts
// Vuruş olayları: görüntü (acilisDurumu.ts) ve efekt izi (scripts/lib/sfx.ts) aynı sayıları okur.
// Plan 3 bu listeyi filmin tamamına genişletir.

export type SesTuru = "whoosh" | "tok" | "tik";
/** vurus: 1'den sayılır; vurusSure: whoosh gibi süreli seslerin vuruş cinsinden uzunluğu. */
export type SesOlayi = { vurus: number; tur: SesTuru; vurusSure?: number };

/** Kanca (v1–8) görüntü vuruşları (spec "0 · Kanca"). */
export const KANCA = {
  /** Blok düşmeye başlar. */
  dusus: 1,
  /** Blok yuvasına tok oturur. */
  inis: 3,
  /** Başlık satırlarının açıldığı vuruşlar ("HER ÇOCUK", "AYRI."). */
  baslik: [1, 3],
  /** Üst cümle ("Özel eğitimde"). */
  ustCumle: 5,
  /** Etiket çizgilerinin raptiyeye vardığı vuruşlar (HEDEFLER sırasıyla). */
  etiketler: [5, 6, 7],
} as const;

/** 16:9 ses olayları. */
export const SESLER_169: SesOlayi[] = [
  { vurus: KANCA.dusus, tur: "whoosh", vurusSure: KANCA.inis - KANCA.dusus },
  { vurus: KANCA.inis, tur: "tok" },
  ...KANCA.etiketler.map((vurus): SesOlayi => ({ vurus, tur: "tik" })),
];
```

- [ ] **Step 4: Testin geçtiğini gör**

Run: `node --test tests/marka-olaylar.test.ts`
Expected: `ℹ pass 4`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/marka/olaylar.ts tests/marka-olaylar.test.ts
git commit -m "feat(promo/marka): Kanca vuruş olayları ve 16:9 ses listesi"
```

---

### Task 4: Açılış durumu (`acilisDurumu.ts`)

**Files:**
- Create: `promo/src/marka/acilisDurumu.ts`
- Test: `promo/tests/marka-acilis.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

`promo/tests/marka-acilis.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { ACILIS_KARE, DUSUS_YUKSEKLIGI, acilisDurumu } from "../src/marka/acilisDurumu.ts";
import { KANCA } from "../src/marka/olaylar.ts";
import { kare } from "../src/marka/zaman.ts";

const INIS = kare(KANCA.inis);

test("açılış 8 vuruş + 6 kare = 150 kare", () => {
  assert.equal(ACILIS_KARE, 150);
});

test("ilk kare: blok yukarıda, yüz ve etiketler yok, yuva görünür, kamera genel planda", () => {
  const d = acilisDurumu(0);
  assert.equal(d.blokZ, DUSUS_YUKSEKLIGI);
  assert.equal(d.yuz, 0);
  assert.equal(d.yuva, 1);
  assert.deepEqual(d.etiketCip, [0, 0, 0]);
  assert.deepEqual(d.etiketCizgi, [0, 0, 0]);
  assert.equal(d.kamera, 1);
  assert.equal(d.sarsinti, 0);
});

test("düşüş ivmeli: yükseklik her karede azalır, hız artar", () => {
  let oncekiZ = acilisDurumu(0).blokZ;
  let oncekiHiz = 0;
  for (let f = 1; f <= INIS; f++) {
    const z = acilisDurumu(f).blokZ;
    const hiz = oncekiZ - z;
    assert.ok(hiz > 0, `f=${f}`);
    assert.ok(hiz >= oncekiHiz - 1e-9, `f=${f}`);
    oncekiZ = z;
    oncekiHiz = hiz;
  }
});

test("iniş: vuruşun tam üstünde yerde ve düz; zıplamadan oturur", () => {
  assert.ok(acilisDurumu(INIS - 1).blokZ > 0);
  const d = acilisDurumu(INIS);
  assert.equal(d.blokZ, 0);
  assert.ok(d.blokAci.every((v) => v === 0), `${d.blokAci}`);
  let onceki = Infinity;
  for (let f = INIS; f <= INIS + 12; f++) {
    const s = acilisDurumu(f);
    assert.equal(s.blokZ, 0);
    assert.ok(s.sarsinti >= 0 && s.sarsinti <= onceki, `f=${f}`);
    onceki = s.sarsinti;
  }
  assert.equal(acilisDurumu(INIS).sarsinti, 6);
  assert.equal(acilisDurumu(INIS + 6).sarsinti, 0);
});

test("yüz inişten sonra belirir, yuva inişte söner", () => {
  assert.equal(acilisDurumu(INIS).yuz, 0);
  assert.equal(acilisDurumu(INIS + 12).yuz, 1);
  assert.equal(acilisDurumu(INIS - 1).yuva, 1);
  assert.equal(acilisDurumu(INIS + 6).yuva, 0);
});

test("başlık satırları kendi vuruşlarında açılır", () => {
  KANCA.baslik.forEach((v, i) => {
    assert.equal(acilisDurumu(kare(v) - 1).satirlar[i], 0, `satır ${i}`);
    assert.equal(acilisDurumu(kare(v) + 10).satirlar[i], 1, `satır ${i}`);
  });
});

test("üst cümle kendi vuruşunda açılır", () => {
  assert.equal(acilisDurumu(kare(KANCA.ustCumle) - 1).ust, 0);
  assert.equal(acilisDurumu(kare(KANCA.ustCumle) + 14).ust, 1);
});

test("etiket: çip önce netleşir, çizgi raptiyeye tam vuruşunda varır", () => {
  KANCA.etiketler.forEach((v, i) => {
    assert.equal(acilisDurumu(kare(v) - 16).etiketCip[i], 0, `çip ${i}`);
    assert.equal(acilisDurumu(kare(v) - 4).etiketCip[i], 1, `çip ${i}`);
    assert.equal(acilisDurumu(kare(v) - 10).etiketCizgi[i], 0, `çizgi ${i}`);
    assert.ok(acilisDurumu(kare(v) - 1).etiketCizgi[i] < 1, `çizgi ${i}`);
    assert.equal(acilisDurumu(kare(v)).etiketCizgi[i], 1, `çizgi ${i}`);
  });
});

test("kamera en çok %3 iter ve geri gitmez; sahne hiç durmaz", () => {
  let oncekiK = 1;
  let oncekiKayma = -1;
  for (let f = 0; f < ACILIS_KARE; f++) {
    const d = acilisDurumu(f);
    assert.ok(d.kamera >= oncekiK - 1e-12 && d.kamera <= 1.03 + 1e-12, `f=${f}`);
    assert.ok(d.kayma > oncekiKayma, `f=${f}`);
    oncekiK = d.kamera;
    oncekiKayma = d.kayma;
  }
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `node --test tests/marka-acilis.test.ts`
Expected: FAIL, `Cannot find module '…/src/marka/acilisDurumu.ts'`.

- [ ] **Step 3: Uygula**

`promo/src/marka/acilisDurumu.ts`:
```ts
import { Easing, interpolate } from "remotion";
import type { V3 } from "./izometri.ts";
import { KANCA } from "./olaylar.ts";
import { kare } from "./zaman.ts";

// Açılış (Kanca, v1–8): sahne birkaç sürekli değişkenin saf fonksiyonu. Animasyon (MarkaAcilis.tsx)
// bu durumu kare kare üretir; föy (AcilisFoyu.tsx) seçilmiş anlarını çizer.

export type AcilisDurumu = {
  /** Bloğun tabla üstünden yüksekliği (dünya birimi; 0 = yerinde). */
  blokZ: number;
  /** Bloğun taklası (radyan); yerde tam [0, 0, 0]. */
  blokAci: V3;
  /** 0–1: bloğun yüzü (inişten sonra belirir). */
  yuz: number;
  /** 0–1: tabladaki kesikli yuva (inişte söner). */
  yuva: number;
  /** Başlık satırlarının açılma oranı (0–1). */
  satirlar: number[];
  /** 0–1: üst cümle ("Özel eğitimde"). */
  ust: number;
  /** Her etiket çipinin netleşmesi (0–1), HEDEFLER sırasıyla. */
  etiketCip: number[];
  /** Her etiket çizgisinin ilerlemesi (0–1; 1 = raptiyeye vardı). */
  etiketCizgi: number[];
  /** Sahne ölçeği (1 = genel plan). */
  kamera: number;
  /** İniş anında sahnenin aşağı kayması (px). */
  sarsinti: number;
  /** Zemin ızgarasının sürekli kayması (px): sahne hiç durmaz. */
  kayma: number;
  /** Zemin ışığının yatay konumu (0–1). */
  isik: number;
};

/** Blok bu yükseklikten (kadrajın üstünden) düşer. */
export const DUSUS_YUKSEKLIGI = 7;
/** 8 vuruş + sonraki ölçünün ilk 6 karesi. */
export const ACILIS_KARE = kare(9) + 6;

const ara = (f: number, a: number, b: number, easing: (t: number) => number = (t) => t) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

export const acilisDurumu = (f: number): AcilisDurumu => {
  const inis = kare(KANCA.inis);
  // Serbest düşüş (ivmeli); takla inişe doğru söner, inişte tam sıfır.
  const dus = ara(f, kare(KANCA.dusus), inis);
  const donus = 1 - Easing.inOut(Easing.cubic)(dus);
  const satir = (v: number) => ara(f, kare(v), kare(v) + 10, Easing.out(Easing.cubic));
  // Çip bulanıktan netleşir, sonra çizgi 10 karede raptiyeye gider ve tam vuruşta varır.
  const cip = (v: number) => ara(f, kare(v) - 16, kare(v) - 4, Easing.out(Easing.cubic));
  const cizgi = (v: number) => ara(f, kare(v) - 10, kare(v), Easing.inOut(Easing.cubic));
  const sonra = f - inis;
  return {
    blokZ: DUSUS_YUKSEKLIGI * (1 - dus * dus),
    blokAci: [0.45 * donus, -0.3 * donus, 0.55 * donus],
    yuz: ara(f, inis + 4, inis + 12),
    yuva: 1 - ara(f, inis, inis + 6),
    satirlar: KANCA.baslik.map(satir),
    ust: ara(f, kare(KANCA.ustCumle), kare(KANCA.ustCumle) + 14, Easing.out(Easing.cubic)),
    etiketCip: KANCA.etiketler.map(cip),
    etiketCizgi: KANCA.etiketler.map(cizgi),
    // Spec: kamera çok yavaş iter (5 sn'de %2–4).
    kamera: 1 + 0.03 * ara(f, 0, ACILIS_KARE, Easing.inOut(Easing.sin)),
    // Tok iniş: 6 px aşağı, 6 karede zıplamadan yerine döner.
    sarsinti: sonra < 0 ? 0 : 6 * Math.max(0, 1 - sonra / 6) ** 2,
    kayma: f * 0.4,
    isik: 0.7 + 0.05 * (f / ACILIS_KARE),
  };
};
```

- [ ] **Step 4: Testin geçtiğini gör**

Run: `node --test tests/marka-acilis.test.ts`
Expected: `ℹ pass 9`, `ℹ fail 0`.

- [ ] **Step 5: Tüm testler ve tip denetimi**

Run: `npm test && npm run typecheck`
Expected: `ℹ pass 74`, `ℹ fail 0`; tsc temiz.

- [ ] **Step 6: Commit**

```bash
git add src/marka/acilisDurumu.ts tests/marka-acilis.test.ts
git commit -m "feat(promo/marka): açılış durumu (düşüş, iniş, başlık, etiketler, kamera)"
```

---

### Task 5: Efekt izi (`scripts/lib/sfx.ts`, `scripts/marka-sfx.ts`)

**Files:**
- Create: `promo/scripts/lib/sfx.ts`
- Create: `promo/scripts/marka-sfx.ts`
- Test: `promo/tests/sfx.test.ts`
- Modify: `promo/package.json`, `promo/.gitignore`

- [ ] **Step 1: Başarısız testi yaz**

`promo/tests/sfx.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { ORNEKLEME, sesIzi, wavYaz } from "../scripts/lib/sfx.ts";
import { SESLER_169 } from "../src/marka/olaylar.ts";
import { BPM, saniye } from "../src/marka/zaman.ts";

const iz = sesIzi(SESLER_169, BPM);
const rms = (a: number, b: number) => {
  const i0 = Math.max(0, Math.round(a * ORNEKLEME)), i1 = Math.round(b * ORNEKLEME);
  let s = 0;
  for (let i = i0; i < i1; i++) s += iz[i] ** 2;
  return Math.sqrt(s / Math.max(1, i1 - i0));
};

test("iz son olayı ve 2 sn kuyruğu kapsar", () => {
  const son = Math.max(...SESLER_169.map((s) => saniye(s.vurus) + (s.vurusSure ?? 0) * (60 / BPM)));
  assert.ok(Math.abs(iz.length - ORNEKLEME * (son + 2)) <= 1, `${iz.length}`);
});

test("her tık vuruşunda duyulur, öncesi sessiz", () => {
  for (const s of SESLER_169.filter((s) => s.tur === "tik")) {
    const t0 = saniye(s.vurus);
    assert.ok(rms(t0, t0 + 0.02) > 10 * rms(t0 - 0.06, t0 - 0.01), `v${s.vurus}`);
  }
});

test("tok inişte güçlü bir darbe (tepesi genel tepenin en az %70'i)", () => {
  const t0 = saniye(SESLER_169.find((s) => s.tur === "tok")!.vurus);
  let tepe = 0, tokTepe = 0;
  iz.forEach((x, i) => {
    tepe = Math.max(tepe, Math.abs(x));
    if (i >= t0 * ORNEKLEME && i < (t0 + 0.05) * ORNEKLEME) tokTepe = Math.max(tokTepe, Math.abs(x));
  });
  assert.ok(tokTepe >= 0.7 * tepe, `${tokTepe} / ${tepe}`);
});

test("aynı girdi aynı iz (tohumlu gürültü)", () => {
  assert.ok(Buffer.from(sesIzi(SESLER_169, BPM).buffer).equals(Buffer.from(iz.buffer)));
});

test("WAV: başlık, iki kanal, tepe 0,8", () => {
  const w = wavYaz(iz);
  assert.equal(w.toString("ascii", 0, 4), "RIFF");
  assert.equal(w.toString("ascii", 8, 12), "WAVE");
  assert.equal(w.readUInt16LE(22), 2);
  assert.equal(w.readUInt32LE(24), ORNEKLEME);
  assert.equal(w.length, 44 + iz.length * 4);
  let tepe = 0;
  for (let i = 44; i < w.length; i += 2) tepe = Math.max(tepe, Math.abs(w.readInt16LE(i)));
  assert.ok(Math.abs(tepe - Math.round(0.8 * 32767)) <= 1, `${tepe}`);
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `node --test tests/sfx.test.ts`
Expected: FAIL, `Cannot find module '…/scripts/lib/sfx.ts'`.

- [ ] **Step 3: `scripts/lib/sfx.ts`**

`promo/scripts/lib/sfx.ts`:
```ts
import type { SesOlayi } from "../../src/marka/olaylar.ts";

// Vuruş ızgarasındaki olaylardan efekt izi (LudenMain/video/scripts/sfx.mjs'ten uyarlandı).
// Bağımlılıksız; tohumlu gürültü: aynı olay listesi her zaman aynı izi verir.

export const ORNEKLEME = 44100;

/** Olay listesini mono örneklere çevirir; son olaydan sonra 2 sn kuyruk bırakır. */
export function sesIzi(olaylar: SesOlayi[], bpm: number, sr = ORNEKLEME): Float32Array {
  const vurusSn = 60 / bpm;
  const zaman = (v: number) => (v - 1) * vurusSn;
  const sure = Math.max(...olaylar.map((s) => zaman(s.vurus) + (s.vurusSure ?? 0) * vurusSn)) + 2;
  const cikis = new Float32Array(Math.ceil(sr * sure));

  let tohum = 11;
  const gurultu = () => ((tohum = (tohum * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const uret = (sn: number, f: (t: number) => number) => {
    const o = new Float32Array(Math.floor(sn * sr));
    for (let i = 0; i < o.length; i++) o[i] = f(i / sr);
    return o;
  };
  const ekle = (t0: number, o: Float32Array) => {
    const bas = Math.round(t0 * sr);
    for (let i = 0; i < o.length && bas + i < cikis.length; i++) if (bas + i >= 0) cikis[bas + i] += o[i];
  };

  // Kesim frekansı yükselen gürültü; tam bitiş anında (iniş) susar.
  const whoosh = (sn: number) => {
    let lp = 0;
    return uret(sn, (t) => {
      const u = t / sn;
      const kesim = 250 + 3200 * u * u;
      const a = 1 - Math.exp((-2 * Math.PI * kesim) / sr);
      lp += a * (gurultu() - lp);
      const zarf = Math.pow(u, 1.6) * Math.min(1, (sn - t) / 0.03);
      return 0.5 * zarf * lp;
    });
  };
  // Ahşap blok inişi: alçak gövde darbesi + kısa tahta tıkırtısı.
  const tok = () => {
    let faz = 0;
    return uret(0.45, (t) => {
      faz += (2 * Math.PI * (55 + 60 * Math.exp(-t * 30))) / sr;
      const govde = Math.sin(faz) * Math.exp(-t * 10) * 0.85;
      const tahta = (Math.sin(2 * Math.PI * 680 * t) * 0.3 + Math.sin(2 * Math.PI * 1150 * t) * 0.18) * Math.exp(-t * 45);
      const tik = t < 0.004 ? gurultu() * 0.25 * (1 - t / 0.004) : 0;
      return govde + tahta + tik;
    });
  };
  // Etiket varışı: kısa, parlak tık.
  const tik = () =>
    uret(0.08, (t) => {
      const ton = (Math.sin(2 * Math.PI * 2200 * t) * 0.6 + Math.sin(2 * Math.PI * 3300 * t) * 0.18) * Math.exp(-t * 90);
      const tiklama = t < 0.003 ? gurultu() * 0.3 * (1 - t / 0.003) : 0;
      return ton + tiklama;
    });

  for (const s of olaylar) {
    const t0 = zaman(s.vurus);
    switch (s.tur) {
      case "whoosh":
        ekle(t0, whoosh((s.vurusSure ?? 1) * vurusSn));
        break;
      case "tok":
        ekle(t0, tok());
        break;
      case "tik":
        ekle(t0, tik());
        break;
      default: {
        const bilinmeyen: never = s.tur;
        throw new Error(`bilinmeyen ses: ${String(bilinmeyen)}`);
      }
    }
  }
  return cikis;
}

/** Tepesi 0,8'e ölçeklenmiş, iki kanalı eş 16 bit PCM WAV (müzikle aynı kanal düzeni). */
export function wavYaz(ornekler: Float32Array, sr = ORNEKLEME): Buffer {
  let tepe = 0;
  for (const x of ornekler) tepe = Math.max(tepe, Math.abs(x));
  const kazanc = tepe > 0 ? 0.8 / tepe : 0;
  const N = ornekler.length;
  const buf = Buffer.alloc(44 + N * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + N * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    const o = Math.max(-32768, Math.min(32767, Math.round(ornekler[i] * kazanc * 32767)));
    buf.writeInt16LE(o, 44 + i * 4);
    buf.writeInt16LE(o, 46 + i * 4);
  }
  return buf;
}
```

- [ ] **Step 4: Testin geçtiğini gör**

Run: `node --test tests/sfx.test.ts`
Expected: `ℹ pass 5`, `ℹ fail 0`.

- [ ] **Step 5: CLI, komut, gitignore**

`promo/scripts/marka-sfx.ts`:
```ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SESLER_169 } from "../src/marka/olaylar.ts";
import { BPM } from "../src/marka/zaman.ts";
import { ORNEKLEME, sesIzi, wavYaz } from "./lib/sfx.ts";

/** Marka filmi efekt izi: olay listesinden public/marka/sfx-169.wav (render komutları önce bunu çağırır). */
const PROMO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cikti = resolve(PROMO, "public/marka/sfx-169.wav");
mkdirSync(dirname(cikti), { recursive: true });
const iz = sesIzi(SESLER_169, BPM);
writeFileSync(cikti, wavYaz(iz));
console.log(`${cikti} yazıldı (${SESLER_169.length} olay, ${BPM} BPM, ${(iz.length / ORNEKLEME).toFixed(1)} sn)`);
```

`promo/package.json` → `scripts` içine (`"marka:tts"` satırından sonra, önceki satıra virgül ekleyerek):
```json
    "marka:sfx": "node scripts/marka-sfx.ts"
```

`promo/.gitignore` sonuna ekle (üretilen dosya; kaynak olay listesi):
```
public/marka/sfx-*.wav
```

Run: `npm run marka:sfx`
Expected: `…/public/marka/sfx-169.wav yazıldı (5 olay, 100 BPM, 5.6 sn)`; `git status --short` WAV'ı göstermez.

- [ ] **Step 6: Tüm testler, tip denetimi, commit**

Run: `npm test && npm run typecheck` → `ℹ pass 79`, `ℹ fail 0`; tsc temiz.
```bash
git add scripts/lib/sfx.ts scripts/marka-sfx.ts tests/sfx.test.ts package.json .gitignore
git commit -m "feat(promo/marka): olay listesinden efekt izi (whoosh, tok, tık)"
```

---

### Task 6: Bileşen genişletmeleri (`sahne3b.tsx`, `yazi.tsx`)

Birim testi yok (JSX); doğrulama tip denetimi ve stil karesinin görsel eşdeğerliği.

**Files:**
- Modify: `promo/src/marka/sahne3b.tsx`
- Modify: `promo/src/marka/yazi.tsx`

- [ ] **Step 1: `sahne3b.tsx`: `NoktaliCizgi` ilerlemesi**

Mevcut `NoktaliCizgi` bileşenini şununla değiştir:
```tsx
/** Etiket çizgisi: yuvarlak uçlu noktalar. ilerleme: a'dan b'ye çizilen kısım (0–1). */
export const NoktaliCizgi: React.FC<{ a: V2; b: V2; opaklik?: number; ilerleme?: number }> = ({ a, b, opaklik = 0.7, ilerleme = 1 }) => {
  if (ilerleme <= 0) return null;
  const p = Math.min(1, ilerleme);
  const son: V2 = [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p];
  return (
    <path d={`M${a[0]} ${a[1]}L${son[0]} ${son[1]}`} fill="none" stroke={RENK.ink} strokeOpacity={opaklik} strokeWidth={4} strokeLinecap="round" strokeDasharray="0.1 11" />
  );
};
```

- [ ] **Step 2: `sahne3b.tsx`: `Blok` yüz opaklığı**

`Blok` bileşeninin imzasını ve yüz koşulunu değiştir: `yuz?: boolean` → `yuz?: number` (0–1 opaklık, varsayılan 1); düzlük denetimi toleranslı. Bileşenin tamamı:
```tsx
/** Turuncu blok = çocuk. Düz dururken +y yüzünde iki göz ve gülüş; yuz: yüzün opaklığı (0–1). */
export const Blok: React.FC<{ k: Kamera; m?: V3; a?: number; aci?: V3; yuz?: number }> = ({ k, m = BLOK_MERKEZ, a = 1, aci = [0, 0, 0], yuz = 1 }) => {
  const h = a / 2;
  const duz = aci.every((v) => Math.abs(v) < 1e-6);
  const yuzGorunur = duz && yuz > 0 && gorunur({ n: [0, 1, 0] }, k);
  return (
    <g>
      <Cisim yuzler={kup(m, a, aci)} k={k} boya={BOYA.turuncu} />
      {yuzGorunur ? (
        <g
          opacity={yuz}
          transform={yuzMatrisi(
            [m[0] - h * 0.82, m[1] + h, m[2] + h * 0.8],
            [m[0] + h * 0.82, m[1] + h, m[2] + h * 0.8],
            [m[0] - h * 0.82, m[1] + h, m[2] - h * 0.82],
            k,
          )}
        >
          <circle cx={20} cy={24} r={5.5} fill={RENK.krem} />
          <circle cx={44} cy={24} r={5.5} fill={RENK.krem} />
          <path d="M15 38Q32 54 49 38" fill="none" stroke={RENK.krem} strokeWidth={4.8} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </g>
      ) : null}
    </g>
  );
};
```

- [ ] **Step 3: `sahne3b.tsx`: `Yuva` ve `HavaGolgesi`**

`Blok`'tan sonra ekle:
```tsx
/** Tablanın ortasındaki kesikli yuva: blok inmeden önce yerini gösterir. */
export const Yuva: React.FC<{ k: Kamera; opaklik?: number }> = ({ k, opaklik = 1 }) =>
  opaklik <= 0 ? null : (
    <path
      d={yol(yuvarlakTaban(-0.62, -0.62, 0.62, 0.62, 0.14).map(([x, y]) => [x, y, 0.001] as V3), k)}
      fill="none"
      stroke={RENK.ink}
      strokeOpacity={0.4 * opaklik}
      strokeWidth={2.5}
      strokeDasharray="10 9"
      strokeLinecap="round"
    />
  );

/**
 * Havadaki bloğun tablaya düşen gölgesi. Bulanıklık yok (Poster kuralı): keskin kenarlı, düz ink.
 * yakinlik: 0 = çok yüksekte (küçük, soluk), 1 = yere değmek üzere (büyük, koyu).
 */
export const HavaGolgesi: React.FC<{ k: Kamera; yakinlik: number }> = ({ k, yakinlik }) => {
  const y = Math.min(1, Math.max(0, yakinlik));
  const r = 0.25 + 0.25 * y;
  return <path d={yol(yuvarlakTaban(-r, -r, r, r, 0.08).map(([gx, gy]) => [gx, gy, 0.002] as V3), k)} fill={RENK.ink} fillOpacity={0.05 + 0.07 * y} />;
};
```

- [ ] **Step 4: `yazi.tsx`: zemin kayması, maske, başlık, üst cümle**

`Zemin` bileşenini şununla değiştir (ızgara katmanı `kayma` kadar izometrik x yönünde kayar):
```tsx
/** Krem zemin + 60 px ızgara + yumuşak ışık + gren. isik: ışığın yatay konumu (0–1); kayma: ızgaranın kayması (px). */
export const Zemin: React.FC<{ isik?: number; kayma?: number }> = ({ isik = 0.7, kayma = 0 }) => (
  <AbsoluteFill style={{ background: RENK.krem }}>
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${IZGARA} 1.5px, transparent 1.5px), linear-gradient(90deg, ${IZGARA} 1.5px, transparent 1.5px)`,
        backgroundSize: "60px 60px",
        backgroundPosition: `${kayma * 0.866}px ${kayma * 0.5}px`,
      }}
    />
    <AbsoluteFill style={{ background: `radial-gradient(900px 700px at ${isik * 100}% 38%, rgba(255,255,255,0.55), transparent 70%)` }} />
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.07, mixBlendMode: "multiply" }}>
      <filter id="mk-gren" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency={0.8} numOctaves={2} seed={7} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#mk-gren)" />
    </svg>
  </AbsoluteFill>
);
```

`Kunye` bileşeninden sonra ekle:
```tsx
// Soldan sağa yumuşak kenarlı maske: p = 0 gizli, 1 tam açık (LudenMain kagit.tsx). Taşan harf parçaları da
// maskenin içinde kalsın diye kutu dikeyde 0,2em büyütülüp aynı kadar geri çekilir (kapsayıcı flex sütun).
// p = 1'de maske hiç uygulanmaz: tam açık metin maskesiz çizilir.
const maske = (p: number): React.CSSProperties => {
  if (p >= 1) return {};
  const x = Math.max(0, p) * 112 - 12;
  const m = `linear-gradient(90deg, #000 ${x}%, transparent ${x + 12}%)`;
  return { WebkitMaskImage: m, maskImage: m, padding: "0.2em 0", margin: "-0.2em 0" };
};
```

`Baslik` bileşenini şununla değiştir:
```tsx
/** Büyük harf başlık (Bricolage 800, teal); her eleman bir satır. acilis: satır başına açılma oranı (0–1). */
export const Baslik: React.FC<{ satirlar: string[]; top: number; boyut?: number; acilis?: number[] }> = ({ satirlar, top, boyut = 104, acilis }) => (
  <div
    style={{
      position: "absolute",
      left: TUVAL_169.sol,
      top,
      display: "flex",
      flexDirection: "column",
      fontFamily: FONT.baslik,
      fontWeight: 800,
      fontSize: boyut,
      lineHeight: 0.95,
      letterSpacing: "0.005em",
      color: RENK.teal,
    }}
  >
    {satirlar.map((s, i) => (
      <div key={i} style={maske(acilis?.[i] ?? 1)}>
        {s}
      </div>
    ))}
  </div>
);

/** Başlığın üstündeki cümle (Satoshi 500); acilis: soldan sağa açılma oranı (0–1). */
export const UstCumle: React.FC<{ metin: string; top: number; acilis?: number }> = ({ metin, top, acilis = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: TUVAL_169.sol,
      top,
      display: "flex",
      flexDirection: "column",
      fontFamily: FONT.govde,
      fontWeight: 500,
      fontSize: 44,
      lineHeight: 1.3,
      color: RENK.ink,
      opacity: 0.85,
    }}
  >
    <div style={maske(acilis)}>{metin}</div>
  </div>
);
```

- [ ] **Step 5: `yazi.tsx`: çip görünümü ve etiket ilerlemesi**

`Cip` bileşenine `gorunum` ekle (varsayılan 1; <1 iken opaklık ve 16 px'e kadar bulanıklık). Bileşenin tamamı:
```tsx
/** Hap çip. hiza "sol": sol kenarı x'te; "sag": sağ kenarı x'te. Dikeyde y'ye ortalı. nokta: modül rengi.
 *  gorunum: 0–1 bulanıktan netleşme (spec: 16 px → 0 + opaklık). */
export const Cip: React.FC<{ x: number; y: number; metin: string; hiza?: Hiza; nokta?: string; gorunum?: number }> = ({ x, y, metin, hiza = "sol", nokta, gorunum = 1 }) => {
  const { width } = useVideoConfig();
  if (gorunum <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        ...(hiza === "sol" ? { left: x } : { right: width - x }),
        transform: "translateY(-50%)",
        height: 54,
        padding: "0 22px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderRadius: 999,
        background: RENK.kagitBeyaz,
        border: `2.5px solid ${RENK.ink}`,
        boxSizing: "border-box",
        fontFamily: FONT.govde,
        fontWeight: 700,
        fontSize: 28,
        color: RENK.ink,
        whiteSpace: "nowrap",
        opacity: gorunum,
        filter: gorunum < 1 ? `blur(${(1 - gorunum) * 16}px)` : undefined,
      }}
    >
      {nokta ? <span style={{ width: 16, height: 16, borderRadius: 8, background: nokta, border: `2px solid ${RENK.ink}`, boxSizing: "border-box" }} /> : null}
      {metin}
    </div>
  );
};
```

`Etiket` bileşenini şununla değiştir (çizgi çipten çapaya doğru çizilir ve vuruşta varır; raptiye varışta belirir):
```tsx
/**
 * Noktalı etiket: çipin hizalı kenarından (x, y) çapaya çizgi; çizgi vardığında çapada raptiye.
 * gorunum: çipin netleşmesi (0–1); ilerleme: çizginin çapaya ilerlemesi (0–1).
 */
export const Etiket: React.FC<{ capa: V2; x: number; y: number; metin: string; hiza?: Hiza; nokta?: string; gorunum?: number; ilerleme?: number }> = ({
  capa,
  x,
  y,
  metin,
  hiza,
  nokta,
  gorunum = 1,
  ilerleme = 1,
}) => {
  const { width, height } = useVideoConfig();
  return (
    <>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <NoktaliCizgi a={[x, y]} b={capa} ilerleme={ilerleme} />
        {ilerleme >= 1 ? <Raptiye p={capa} /> : null}
      </svg>
      <Cip x={x} y={y} metin={metin} hiza={hiza} nokta={nokta} gorunum={gorunum} />
    </>
  );
};
```

- [ ] **Step 6: Tip denetimi ve testler**

Run: `npm run typecheck && npm test`
Expected: tsc temiz; `ℹ pass 79`, `ℹ fail 0`.

- [ ] **Step 7: Stil karesi görsel olarak aynı**

```bash
npm run marka:stil && python3 -c "from PIL import Image, ImageChops; a=Image.open('out/marka/stil-karesi-onceki.png').convert('RGB'); b=Image.open('out/marka/stil-karesi.png').convert('RGB'); print(ImageChops.difference(a,b).getbbox())"
```
Expected: `None` ya da yalnız etiket çizgileri bölgesinde küçük bir kutu (çizgi yönü çipten çapaya döndüğü için nokta dizisinin başlangıcı kayabilir). `out/marka/stil-karesi.png`'yi Read ile aç: blok, yüz, yığınlar, çipler, başlık ve raptiyeler onaylı kareyle aynı görünmeli. Başka bir fark varsa DUR ve bildir.

- [ ] **Step 8: Commit**

```bash
git add src/marka/sahne3b.tsx src/marka/yazi.tsx
git commit -m "feat(promo/marka): animasyon için bileşen genişletmeleri (maske, çip görünümü, çizgi ilerlemesi, yuva, gölge)"
```

---

### Task 7: Açılış sahnesi ve kompozisyonu

**Files:**
- Create: `promo/src/marka/AcilisSahnesi.tsx`
- Create: `promo/src/marka/MarkaAcilis.tsx`
- Modify: `promo/src/Root.tsx` (satır 29'daki `import { StilKaresi } …` satırının altına iki import; satır 97'deki `<Still id="MarkaStilKaresi" …/>` satırının altına bir `<Composition>`)
- Modify: `promo/package.json`

- [ ] **Step 1: `AcilisSahnesi.tsx`**

`promo/src/marka/AcilisSahnesi.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { DUSUS_YUKSEKLIGI, type AcilisDurumu } from "./acilisDurumu.ts";
import { izd, type V3 } from "./izometri.ts";
import { HEDEFLER, METIN } from "./metin.ts";
import { BLOK_MERKEZ, Blok, HavaGolgesi, NoktaliCizgi, Tabla, Tanimlar, Yuva } from "./sahne3b.tsx";
import { GENEL_KAMERA, HEDEF_YERLESIMI } from "./yerlesim.ts";
import { Baslik, Etiket, UstCumle, Zemin } from "./yazi.tsx";

// Kanca (v1–8, storyboard F1–F2). Sahne, açılış durumunun saf fonksiyonu; animasyon ve föy aynı bileşeni çizer.
// Metin sütunu kameradan bağımsız; tabla, blok ve etiketler kamerayla birlikte bloğa doğru iter.
const K = GENEL_KAMERA;
const ODAK = izd(BLOK_MERKEZ, K);

export const AcilisSahnesi: React.FC<{ durum: AcilisDurumu }> = ({ durum }) => {
  const { width, height } = useVideoConfig();
  const havada = durum.blokZ > 0.02;
  const blokM: V3 = [BLOK_MERKEZ[0], BLOK_MERKEZ[1], BLOK_MERKEZ[2] + durum.blokZ];
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Zemin isik={durum.isik} kayma={durum.kayma} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateY(${durum.sarsinti}px) scale(${durum.kamera})`,
          transformOrigin: `${ODAK[0]}px ${ODAK[1]}px`,
        }}
      >
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <Tanimlar />
          <Tabla k={K} />
          <Yuva k={K} opaklik={durum.yuva} />
          {havada ? (
            <>
              <HavaGolgesi k={K} yakinlik={1 - durum.blokZ / DUSUS_YUKSEKLIGI} />
              <NoktaliCizgi a={izd([0, 0, 0.001], K)} b={izd([0, 0, durum.blokZ], K)} opaklik={0.45} />
            </>
          ) : null}
          <Blok k={K} m={blokM} aci={durum.blokAci} yuz={durum.yuz} />
        </svg>
        {HEDEFLER.map((h, i) => {
          const y = HEDEF_YERLESIMI[i];
          return (
            <Etiket
              key={h.metin}
              capa={izd(y.capa, K)}
              x={y.x}
              y={y.y}
              hiza={y.hiza}
              metin={h.metin}
              gorunum={durum.etiketCip[i]}
              ilerleme={durum.etiketCizgi[i]}
            />
          );
        })}
      </div>
      <UstCumle metin={METIN.kanca.ekran[0]} top={400} acilis={durum.ust} />
      <Baslik satirlar={METIN.kanca.baslik} top={480} acilis={durum.satirlar} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: `MarkaAcilis.tsx`**

`promo/src/marka/MarkaAcilis.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, Html5Audio, staticFile, useCurrentFrame } from "remotion";
import { AcilisSahnesi } from "./AcilisSahnesi.tsx";
import { acilisDurumu } from "./acilisDurumu.ts";

/** Açılış (Kanca, v1–8 + 6 kare), onay kapısı 2. Efekt: public/marka/sfx-169.wav (`npm run marka:sfx`). */
export const MarkaAcilis169: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <AcilisSahnesi durum={acilisDurumu(f)} />
      <Html5Audio src={staticFile("marka/sfx-169.wav")} volume={0.9} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Root kaydı ve komut**

`promo/src/Root.tsx`, `import { StilKaresi } from "./marka/StilKaresi";` satırının altına:
```tsx
import { MarkaAcilis169 } from "./marka/MarkaAcilis";
import { ACILIS_KARE } from "./marka/acilisDurumu";
import { FPS } from "./marka/zaman";
```
`<Still id="MarkaStilKaresi" component={StilKaresi} width={1920} height={1080} />` satırının altına:
```tsx
    <Composition id="MarkaAcilis169" component={MarkaAcilis169} durationInFrames={ACILIS_KARE} fps={FPS} width={1920} height={1080} />
```
(`Composition` Root'ta zaten içe aktarılıyor.)

`promo/package.json` → `scripts` içine (`"marka:sfx"` satırından sonra, virgülle):
```json
    "marka:acilis": "node scripts/marka-sfx.ts && remotion render src/index.ts MarkaAcilis169 out/marka/acilis-169.mp4"
```

- [ ] **Step 4: Tip denetimi ve render**

Run: `npm run typecheck && npm run marka:acilis`
Expected: tsc temiz; `out/marka/acilis-169.mp4` yazılır (150 kare, 5,0 sn, 1920×1080, sesli).

- [ ] **Step 5: Anahtar kareleri çıkar ve görsel doğrula**

```bash
for f in 20 36 50 74 112 149; do ffmpeg -v error -y -i out/marka/acilis-169.mp4 -vf "select=eq(n\,$f)" -vframes 1 out/marka/acilis-k$f.png; done
```
Her PNG'yi Read ile aç. Hepsi doğru olmalı:
1. **k20** (düşüş): blok havada, taklalı; altında noktalı iniş çizgisi ve keskin kenarlı soluk gölge; tabla ortasında kesikli yuva; solda yalnız "HER ÇOCUK"; künye yok; yüz yok.
2. **k36** (iniş): blok yuvasında, düz; yüz henüz yok; "AYRI." açılmaya başlamış ya da henüz görünmüyor.
3. **k50**: yüz görünür (dik iki göz + gülüş, sol yüzde); "HER ÇOCUK / AYRI." tam; yuva görünmez.
4. **k74**: "Özel eğitimde" açılıyor; "/r/ sesi" çipi net, çizgisi bloğun üst yüzündeki raptiyeye varmış.
5. **k112**: üç etiket de tam; raptiyeler bloğun üst yüzünde (ikisi) ve tablada (biri).
6. **k149**: kare 5'le aynı düzen, kamera hafifçe (≤%3) itmiş; hiçbir öğe kadrajdan taşmıyor.

Bir madde tutmazsa ilgili bileşeni/durumu düzelt, testleri ve render'ı yeniden koş, değişikliği raporla.

- [ ] **Step 6: Commit**

```bash
git add src/marka/AcilisSahnesi.tsx src/marka/MarkaAcilis.tsx src/Root.tsx package.json
git commit -m "feat(promo/marka): açılış sahnesi ve 16:9 kompozisyonu"
```

---

### Task 8: Açılış föyü

**Files:**
- Create: `promo/src/marka/AcilisFoyu.tsx`
- Modify: `promo/src/Root.tsx` (Task 7'de eklenen importların altına bir import; `MarkaAcilis169` `<Composition>`'ının altına bir `<Still>`)
- Modify: `promo/package.json`

- [ ] **Step 1: `AcilisFoyu.tsx`**

`promo/src/marka/AcilisFoyu.tsx`:
```tsx
import React from "react";
import { AbsoluteFill } from "remotion";
import { AcilisSahnesi } from "./AcilisSahnesi.tsx";
import { acilisDurumu } from "./acilisDurumu.ts";
import { KANCA, SESLER_169, type SesTuru } from "./olaylar.ts";
import { FONT, RENK } from "./tema.ts";
import { VURUS_KARE, kare } from "./zaman.ts";

// Açılış föyü (onay kapısı 2): animasyonun kendi durum fonksiyonundan seçilmiş üç an + 8 vuruşluk zaman çizgisi.
export const FOY_BOYUT = { w: 1920, h: 1180 } as const;
const KARE_G = 560;
const ARA = 60;
const SOL = 60;
const VURUS_PX = 220;
const SES_ADI: Record<SesTuru, string> = { whoosh: "whoosh", tok: "tok", tik: "tık" };

const KARELER: { f: number; zaman: string; vurus: string; olay: string; ses: string }[] = [
  {
    f: 29,
    zaman: "0:00–0:01,2",
    vurus: "vuruş 1–3",
    olay: "Blok taklayla düşer; noktalı çizgi yuvayı, keskin kenarlı gölge yaklaşmayı gösterir. «HER ÇOCUK» soldan sağa açılır. Logo yok.",
    ses: "whoosh, inişte susar",
  },
  {
    f: kare(KANCA.inis) + 14,
    zaman: "0:01,2",
    vurus: "vuruş 3",
    olay: "Blok yuvasına tok oturur, zıplamaz; sahne 6 px sarsılır. «AYRI.» açılır, bloğun yüzü belirir.",
    ses: "tok, vuruşun üstünde",
  },
  {
    f: kare(8) + 6,
    zaman: "0:02,4–0:04,8",
    vurus: "vuruş 5–8",
    olay: "«Özel eğitimde» açılır; her vuruşta bir etiket çizgisi raptiyesine varır: /r/ sesi, okuma akıcılığı, sıra beklemek. Kamera bloğa %3 iter.",
    ses: "her etikette tık",
  },
];

const Zamanlama: React.FC<{ y: number }> = ({ y }) => {
  const x = (vurus: number) => SOL + 20 + vurus * VURUS_PX;
  return (
    <svg width={FOY_BOYUT.w} height={140} style={{ position: "absolute", left: 0, top: y, overflow: "visible" }}>
      <line x1={x(0)} y1={52} x2={x(8)} y2={52} stroke={RENK.teal} strokeWidth={2} />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i}>
          <line x1={x(i)} y1={i % 4 === 0 ? 38 : 44} x2={x(i)} y2={60} stroke={RENK.teal} strokeWidth={i % 4 === 0 ? 3 : 2} />
          {i < 8 ? (
            <text x={x(i) + 8} y={84} fontFamily={FONT.govde} fontWeight={700} fontSize={20} fill={RENK.teal} fillOpacity={0.55}>
              {i + 1}
            </text>
          ) : null}
        </g>
      ))}
      {KARELER.map((k, i) => {
        const cx = x(k.f / VURUS_KARE);
        return (
          <g key={i}>
            <circle cx={cx} cy={17} r={16} fill={RENK.turuncu} />
            <text x={cx} y={24} textAnchor="middle" fontFamily={FONT.govde} fontWeight={700} fontSize={20} fill="#fff">
              {i + 1}
            </text>
          </g>
        );
      })}
      {SESLER_169.filter((s) => s.vurus <= 8).map((s, i) => (
        <g key={i}>
          <circle cx={x(s.vurus - 1) + 12} cy={112} r={5} fill={RENK.turuncu} />
          <text x={x(s.vurus - 1) + 24} y={119} fontFamily={FONT.govde} fontWeight={700} fontSize={20} fill={RENK.teal} fillOpacity={0.75}>
            {SES_ADI[s.tur]}
          </text>
        </g>
      ))}
      <text x={x(8)} y={119} textAnchor="end" fontFamily={FONT.govde} fontWeight={700} fontSize={20} fill={RENK.teal} fillOpacity={0.75}>
        Yük →
      </text>
    </svg>
  );
};

export const AcilisFoyu: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#f3e8d6", fontFamily: FONT.govde, color: RENK.teal }}>
    <div style={{ position: "absolute", left: SOL, top: 56 }}>
      <div style={{ fontFamily: FONT.baslik, fontWeight: 800, fontSize: 44 }}>AÇILIŞ · MASANIN ÖBÜR TARAFI</div>
      <div style={{ fontWeight: 500, fontSize: 26, opacity: 0.7, marginTop: 6 }}>İlk 4,8 saniye · 100 BPM · 1 vuruş = 0,6 sn · 16:9</div>
    </div>
    {KARELER.map((k, i) => (
      <div key={i} style={{ position: "absolute", left: SOL + i * (KARE_G + ARA), top: 170, width: KARE_G }}>
        <div
          style={{
            position: "relative",
            width: KARE_G,
            height: (KARE_G * 1080) / 1920,
            borderRadius: 18,
            overflow: "hidden",
            border: `2px solid ${RENK.ink}`,
            boxShadow: `8px 8px 0 ${RENK.ink}`,
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${KARE_G / 1920})`, transformOrigin: "0 0" }}>
            <AcilisSahnesi durum={acilisDurumu(k.f)} />
          </div>
        </div>
        <div style={{ marginTop: 26, display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontWeight: 700, fontSize: 30, color: RENK.turuncu }}>{i + 1}</span>
          <span style={{ fontWeight: 700, fontSize: 26 }}>{k.zaman}</span>
          <span style={{ fontWeight: 500, fontSize: 24, opacity: 0.6 }}>{k.vurus}</span>
        </div>
        <div style={{ fontWeight: 500, fontSize: 23, lineHeight: 1.36, marginTop: 10 }}>{k.olay}</div>
        <div style={{ fontWeight: 700, fontSize: 22, marginTop: 12, opacity: 0.75 }}>Ses: {k.ses}</div>
      </div>
    ))}
    <Zamanlama y={900} />
  </AbsoluteFill>
);
```

- [ ] **Step 2: Root kaydı ve komut**

`promo/src/Root.tsx`, `import { FPS } from "./marka/zaman";` satırının altına:
```tsx
import { AcilisFoyu, FOY_BOYUT } from "./marka/AcilisFoyu";
```
`<Composition id="MarkaAcilis169" …/>` satırının altına:
```tsx
    <Still id="MarkaAcilisFoyu" component={AcilisFoyu} width={FOY_BOYUT.w} height={FOY_BOYUT.h} />
```

`promo/package.json` → `scripts` içine (`"marka:acilis"` satırından sonra, virgülle):
```json
    "marka:foy": "remotion still src/index.ts MarkaAcilisFoyu out/marka/acilis-foyu.png"
```

- [ ] **Step 3: Tip denetimi ve render**

Run: `npm run typecheck && npm run marka:foy`
Expected: tsc temiz; `out/marka/acilis-foyu.png` (1920×1180).

- [ ] **Step 4: Görsel doğrulama**

`out/marka/acilis-foyu.png`'yi Read ile aç: başlık ve alt satır; üç çerçeveli kare (ink kenar + blursuz ofset gölge) animasyonun 29., 50. ve 132. karelerinin aynısı (Task 7'deki k50 ile karşılaştır); altlarında numara, zaman, vuruş, olay, ses; en altta 8 vuruşluk çizgi, 1–2–3 kare işaretleri ve whoosh/tok/tık ses işaretleri; hiçbir metin taşmıyor ya da üst üste binmiyor. Taşma varsa `KARELER` metnini ya da `Zamanlama`'nın `y` değerini düzelt, yeniden render et.

- [ ] **Step 5: Commit**

```bash
git add src/marka/AcilisFoyu.tsx src/Root.tsx package.json
git commit -m "feat(promo/marka): açılış föyü"
```

---

### Task 9: Eleştiri föyü (`scripts/elestiri.ts`)

**Files:**
- Create: `promo/scripts/elestiri.ts`
- Modify: `promo/package.json`

- [ ] **Step 1: Betiği yaz**

`promo/scripts/elestiri.ts` (LudenMain `video/scripts/elestiri.mjs`'in karşılığı; sistem ffmpeg/ffprobe kullanır):
```ts
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * Render'ı göstermeden önce denetler (spec "Doğrulama"): kontak föyü, 360 px telefon föyü, donuk anlar, ses.
 *   npm run elestiri -- out/marka/acilis-169.mp4 [cikti-klasoru]
 * Donukluk: 0,5 sn'yi aşan, −50 dB altında değişen anlar (sahne hiç durmaz).
 * Ses: EBU R128 bütünleşik yükseklik, gerçek tepe ve ani ses anları (efektler vuruşta mı?).
 * Not: MP4'te AAC sesi ~45 ms geciktirir; ses anları buna göre okunur.
 */
const [video, klasorArg] = process.argv.slice(2);
if (!video) {
  console.error("Kullanım: npm run elestiri -- <video.mp4> [cikti-klasoru]");
  process.exit(1);
}
const klasor = klasorArg ?? join("out", "elestiri", basename(video, ".mp4"));
mkdirSync(klasor, { recursive: true });

const ff = (args: string[]) => spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 1 << 28 });
const sure = Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video], { encoding: "utf8" }).stdout);
if (!Number.isFinite(sure) || sure <= 0) throw new Error(`Süre okunamadı: ${video}`);
const saniye = Math.ceil(sure);

ff(["-y", "-v", "error", "-i", video, "-vf", `fps=4,scale=320:-1,tile=5x${Math.ceil((saniye * 4) / 5)}:padding=4:color=0x333333`, "-frames:v", "1", join(klasor, "kontak.png")]);
ff(["-y", "-v", "error", "-i", video, "-vf", `fps=1,scale=360:-1,tile=3x${Math.ceil(saniye / 3)}:padding=6:color=0x333333`, "-frames:v", "1", join(klasor, "telefon.png")]);

const donuk = [...ff(["-i", video, "-vf", "freezedetect=n=-50dB:d=0.5", "-map", "0:v:0", "-f", "null", "-"]).stderr.matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_duration: ([\d.]+)/g)].map((m) => ({
  bas: Number(m[1]),
  sure: Number(m[2]),
}));

const olcum = ff(["-i", video, "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr;
const lufs = /Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS/.exec(olcum)?.[1] ?? "?";
const tepe = /True peak:\s+Peak:\s+(-?[\d.]+) dBFS/.exec(olcum)?.[1] ?? "?";

const pcm = spawnSync("ffmpeg", ["-v", "error", "-i", video, "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], { maxBuffer: 1 << 28 }).stdout as Buffer;
const PENCERE = 160; // 10 ms
const db: number[] = [];
for (let i = 0; i + PENCERE <= pcm.length / 2; i += PENCERE) {
  let s = 0;
  for (let j = 0; j < PENCERE; j++) {
    const x = pcm.readInt16LE((i + j) * 2) / 32768;
    s += x * x;
  }
  db.push(10 * Math.log10(s / PENCERE + 1e-12));
}
const anlar: number[] = [];
for (let i = 3; i < db.length; i++) {
  const once = Math.max(db[i - 3], db[i - 2], db[i - 1]);
  if (db[i] - once >= 6 && db[i] > -35 && (!anlar.length || i * 0.01 - anlar[anlar.length - 1] > 0.2)) anlar.push(Number((i * 0.01).toFixed(2)));
}

const rapor = [
  `video: ${video} (${sure.toFixed(2)} sn)`,
  `donuk anlar (≥0,5 sn): ${donuk.length ? donuk.map((d) => `${d.bas.toFixed(1)}s+${d.sure.toFixed(1)}`).join(", ") : "yok"}`,
  `ses: ${lufs} LUFS, gerçek tepe ${tepe} dBFS`,
  `ani ses anları (sn): ${anlar.join(" ") || "yok"}`,
  `föyler: ${join(klasor, "kontak.png")}, ${join(klasor, "telefon.png")}`,
].join("\n");
writeFileSync(join(klasor, "rapor.txt"), rapor + "\n");
console.log(rapor);
```

`promo/package.json` → `scripts` içine (`"marka:foy"` satırından sonra, virgülle):
```json
    "elestiri": "node scripts/elestiri.ts"
```

- [ ] **Step 2: Tip denetimi ve çalıştır**

Run: `npm run typecheck && npm run elestiri -- out/marka/acilis-169.mp4`
Expected: tsc temiz; rapor:
- `donuk anlar (≥0,5 sn): yok`
- `ani ses anları`: tok ve tıklar 1,2 / 2,4 / 3,0 / 3,6 sn civarında (AAC gecikmesiyle +0,05 sn'ye kadar); whoosh yükselirken 1,2'den önce bir an daha görünebilir; 3,6'dan sonra ani an yok.
- `out/elestiri/acilis-169/kontak.png` ve `telefon.png` var.

Donuk an çıkarsa DUR ve bildir (spec: sahne hiç durmaz).

- [ ] **Step 3: Föyleri görsel doğrula**

`out/elestiri/acilis-169/telefon.png`'yi Read ile aç: 360 px genişlikte başlık okunur, blok ve yüz seçilir, çipler okunur (küçük ama seçilebilir).

- [ ] **Step 4: Commit**

```bash
git add scripts/elestiri.ts package.json
git commit -m "feat(promo): render eleştiri föyü (kontak, telefon, donukluk, ses)"
```

---

### Task 10: Onay kapısı 2

**Files:** yok (teslim)

- [ ] **Step 1: Son render'lar**

```bash
npm test && npm run typecheck && npm run marka:acilis && npm run marka:foy && npm run elestiri -- out/marka/acilis-169.mp4
```
Expected: testler yeşil (`ℹ fail 0`), tsc temiz, üç çıktı güncel.

- [ ] **Step 2: Kullanıcıya teslim**

SendUserFile (status `normal`): `out/marka/acilis-169.mp4`, `out/marka/acilis-foyu.png`, `out/elestiri/acilis-169/telefon.png`. Mesajda:
- Ne görülüyor (düşüş, iniş, başlık, etiketler; künye yok; müzik ve seslendirme Plan 3'te, burada yalnız efekt).
- Eleştiri raporunun özeti (donuk an, ses anları).
- Onaylanacaklar: düşüş hızı ve takla, iniş sarsıntısı, yüzün belirme anı, etiket ritmi, kamera itmesi, efektlerin karakteri.

- [ ] **Step 3: Onayı bekle**

Plan 3'e (tam kurgu 16:9 + müzik + seslendirme) onaydan sonra geçilir. Geri bildirim durum değerleriyle ilgiliyse `acilisDurumu.ts`'i (ve gerekiyorsa testlerini), bileşenle ilgiliyse ilgili `.tsx`'i düzelt; render + eleştiri + teslimi tekrarla; her düzeltme ayrı commit.

## Plan 3'e devredilenler (Plan 1 incelemelerinden)

- Tabla dönüş yönü negatif olsun (4 × −90°): +y yüzündeki yüz Dönüş ve Çocuk bölümlerinde görünür kalır.
- `zaman.ts` toplamları `kare()` üzerinden (başka BPM'li müzik gelirse şart).
- 9:16 seslendirme satırları (Dönüş, Atölye) bölümlerine sığmıyor: kısaltılacak; 9:16 için sığma testi.
- Seslendirme sığma testi gerçek mp3 süresini kullansın.
- Nokta deseni ve gren için sabit SVG id'leri; 9:16 için `Kunye`/`Baslik` sol boşluğu prop'u.
