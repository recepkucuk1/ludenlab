# LudenLab Marka Filmi · Plan 3B: Studio ve Atölye (v33–72)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filmin 0:19,2–0:43,2 aralığını kurmak: tabla −180°'ye döner, kamera Studio yığınına iter; üst kâğıt gerçek Artikülasyon kâğıdına açılır, deste iki kez çevrilir. Sonra tabla −270°'ye döner, kamera Atölye yığınına; MEB basamakları iner, üst kâğıt seans planı taslağına açılır, TASLAK damgası vurur.

**Architecture:** Plan 3A'nın sürekli sahnesi genişler. Bölüm katmanı (etiketler, metinler, kartlar, kilitler, damga, soluklaştırma) yeni saf modül `moduller.ts`'te üretilir; `filmDurumu.ts` kamera (s, ox, oy), tabla ve itme izlerini uzatıp katmanı birleştirir. Durum tipleri `durumTipleri.ts`'e taşınır. 2B çıktı kartları (`CiktiKarti`) sahnenin kamera kapsayıcısı içinde çizilir; etiketleri karta ekran koordinatıyla bağlanır (`capaEkran`).

**Tech Stack:** Remotion 4.0.484 (`interpolate`, `Easing`, `Img`, `staticFile`), React 19, TypeScript (`node --test`), sistem ffmpeg.

**Spec:** `docs/superpowers/specs/2026-09-28-ludenlab-marka-filmi-design.md` ("3 · Studio", "4 · Atölye", "İçerik kuralları", "Görsel dil")
**Önceki:** Plan 3A bitti (fe4765d, 115 test). Kullanıcı gece "her şeyi bitir" dedi; onay kapıları öz-denetimdir.

## Tasarım kararları (bu plan)

- **Geometri** (Plan 3A'dan): Studio yığını dünya `(−1.25, −1.2)`, Atölye `(1.2, 1.25)`. Tabla v33'te −180°'ye (Studio öne-ortaya gelir), v53'te −270°'ye (Atölye sola gelir) döner; her dönüş 36 kare, `Easing.inOut(Easing.sin)`.
- **Kamera:** Studio `s 120, ox 1335, oy 650` (Studio yığınının tepesi ekranda ≈ (1340, 701); kart onun üstünde açılır). Atölye `s 130, ox 1626, oy 640` (storyboard F8: yığın tepesi ≈ (1350, 533), tabla sağa taşar). Geçişler 36 kare.
- **Odak:** odak dışı blok ve modül yığını %30 opaklığa iner (18 kare).
- **Kartlar:** gerçek PDF görüntüleri `public/real/` (r3 Artikülasyon, r4 Sosyal Hikaye, r2 Öğrenme Kartı; r5 seans planı taslağı), üstten kırpılır. Kart yığından (ölçek 0,2, rotateY 70°) çıkıp 36 karede yerine açılır; deste çevirmede öndeki kart rotateY 0 → −90° döner, arkadakiler bir sıra öne gelir.
- **İçerik:** Atölye bölümünde görsel üretimi çağrıştıran öğe yok (yalnız metin taslağı); MEB tam adıyla; araç sayıları koddan (Studio 10, Atölye 11).

## Kurallar (tüm görevler)

- Çalışma dizini: `/Users/recepkucuk/ludenlab/.claude/worktrees/ludenlab-marka-filmi/promo` (dal `claude/ludenlab-marka-filmi`). Ana checkout'a dokunma. Push yok.
- `src/marka/` içi göreli içe aktarmalar uzantılı; yalnız silinebilir TS sözdizimi; `Root.tsx` uzantısız. macOS büyük/küçük harf duyarsız: yeni dosya adları çakışmasın.
- Node testleri `remotion`'dan `interpolate`/`Easing` içe aktarabilir; `.tsx` node testine girmez.
- Ücretli betik çalıştırma. Commit: Türkçe; `Co-Authored-By` satırı ajanın kendi sistem hatırlatmasındaki satır. Push yok.
- Başlangıç: 115 test.

## Dosya haritası

| Dosya | Durum | Sorumluluk |
|---|---|---|
| `src/marka/olaylar.ts` | değişir | `STUDIO`, `ATOLYE`; `sayfa` sesi, `perde` |
| `scripts/lib/sfx.ts` | değişir | `sayfa` sesi, perdeli `tik` |
| `src/marka/metin.ts` | değişir | Studio/Atölye satır kırılımları, `ETIKETLER` |
| `src/marka/durumTipleri.ts` | yeni | film durumunun parça tipleri |
| `src/marka/kagitAkisi.ts` | değişir | `KagitGrubu.id`, `KagitGrubu.opaklik` |
| `src/marka/moduller.ts` | yeni | Studio + Atölye katmanı (saf) |
| `src/marka/filmDurumu.ts` | değişir | kamera/tabla/itme izleri, katman birleştirme, soluklaştırma, eksik kâğıt |
| `src/marka/yazi.tsx` | değişir | `MetinBlogu` (`genislik`, `sol`), `Kilit`, `CiktiKarti`, `Damga` |
| `src/marka/FilmSahnesi.tsx` | değişir | kartlar, damga, kilitler, `capaEkran`, soluklaştırma |
| `tests/marka-moduller.test.ts` | yeni | katman testleri |

---

### Task 1: Studio ve Atölye olayları + sesler

**Files:** Modify `promo/src/marka/olaylar.ts`, `promo/scripts/lib/sfx.ts`, `promo/src/marka/AcilisFoyu.tsx` (yalnız `SES_ADI`), `promo/tests/marka-olaylar.test.ts`, `promo/tests/sfx.test.ts`

Bu görev tek commit'tir (yeni ses türü sfx'i öğretmeden testler kırmızı kalır).

- [ ] **Step 1: Testleri güncelle ve ekle** — `tests/marka-olaylar.test.ts`:
  - içe aktarma: `import { ATOLYE, DONUS, KANCA, SESLER_169, STUDIO, YUK } from "../src/marka/olaylar.ts";`
  - "kanca: whoosh inişte biter…" testinde tok satırını Kanca'yla sınırla: `SESLER_169.filter((s) => s.tur === "tok" && s.vurus <= 8)`.
  - "dönüş: tabla sesi v25'te…" testini şununla değiştir:
```ts
test("dönüş: tabla sesi v25'te 2 vuruş; yerleşme tıkları ve künye tıkı", () => {
  const donus = (s: { vurus: number }) => s.vurus >= DONUS.tabla && s.vurus <= 32;
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "donus" && donus(s)).map((s) => [s.vurus, s.vurusSure]), [[DONUS.tabla, 2]]);
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "tik" && s.vurus > 8 && donus(s)).map((s) => s.vurus), [...DONUS.yerlesme, DONUS.kunye]);
});
```
  - dosya sonuna:
```ts
test("studio: dönüş, etiket tıkları, kart açılışı ve iki deste çevirme", () => {
  const b = (s: { vurus: number }) => s.vurus >= 33 && s.vurus <= 52;
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "donus" && b(s)).map((s) => s.vurus), [STUDIO.tabla]);
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "tik" && b(s)).map((s) => s.vurus), [...STUDIO.etiketler, ...STUDIO.kartEtiketleri]);
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "sayfa" && b(s)).map((s) => s.vurus), [STUDIO.kart, ...STUDIO.cevir]);
});

test("atölye: basamak tıklarında perde yükselir, damgada tok", () => {
  const b = (s: { vurus: number }) => s.vurus >= 53 && s.vurus <= 72;
  const basamak = SESLER_169.filter((s) => s.tur === "tik" && ATOLYE.basamaklar.includes(s.vurus as 57 | 58 | 59));
  assert.deepEqual(basamak.map((s) => s.vurus), [...ATOLYE.basamaklar]);
  const perdeler = basamak.map((s) => s.perde ?? 1);
  assert.ok(perdeler[0] < perdeler[1] && perdeler[1] < perdeler[2], `${perdeler}`);
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "tok" && b(s)).map((s) => s.vurus), [ATOLYE.damga]);
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "sayfa" && b(s)).map((s) => s.vurus), [ATOLYE.kart]);
});

test("studio ve atölye vuruşları kendi bölümlerinde", () => {
  const b = (id: string) => BOLUMLER_169.find((x) => x.id === id)!;
  const s = [STUDIO.tabla, STUDIO.kilit, STUDIO.kitle, ...STUDIO.etiketler, STUDIO.kart, STUDIO.cumle, ...STUDIO.kartEtiketleri, STUDIO.araclar, ...STUDIO.cevir];
  for (const v of s) assert.ok(v >= b("studio").ilk && v <= b("studio").son, `studio ${v}`);
  const a = [ATOLYE.tabla, ATOLYE.kilit, ATOLYE.kitle, ATOLYE.meb, ...ATOLYE.basamaklar, ATOLYE.kart, ATOLYE.cumle, ATOLYE.damga, ATOLYE.sonSoz, ...ATOLYE.kartEtiketleri, ATOLYE.araclar];
  for (const v of a) assert.ok(v >= b("atolye").ilk && v <= b("atolye").son, `atölye ${v}`);
});
```
`tests/sfx.test.ts` sonuna:
```ts
test("sayfa sesleri kendi vuruşlarında duyulur", () => {
  for (const s of SESLER_169.filter((s) => s.tur === "sayfa")) {
    const t0 = saniye(s.vurus);
    assert.ok(rms(t0 + 0.05, t0 + 0.2) > 4 * rms(t0 - 0.2, t0 - 0.05), `v${s.vurus}`);
  }
});

test("basamak tıklarının perdesi yükselir (sıfır geçişi artar)", () => {
  const gecis = (t0: number) => {
    const i0 = Math.round((t0 + 0.004) * ORNEKLEME), i1 = Math.round((t0 + 0.024) * ORNEKLEME);
    let n = 0;
    for (let i = i0 + 1; i < i1; i++) if (Math.sign(iz[i]) !== Math.sign(iz[i - 1])) n++;
    return n;
  };
  const g = SESLER_169.filter((s) => s.tur === "tik" && (s.perde ?? 1) > 1 || (s.tur === "tik" && s.vurus === 57)).map((s) => gecis(saniye(s.vurus)));
  assert.equal(g.length, 3);
  assert.ok(g[0] < g[1] && g[1] < g[2], `${g}`);
});
```
Run: `node --test tests/marka-olaylar.test.ts` → FAIL (`STUDIO` yok).

- [ ] **Step 2: `olaylar.ts`** — `SesTuru` ve `SesOlayi`'yi değiştir:
```ts
export type SesTuru = "whoosh" | "tok" | "tik" | "kagit" | "donus" | "sayfa";
/** vurus: 1'den sayılır; vurusSure: süreli seslerin vuruş cinsinden uzunluğu; perde: tık perdesi çarpanı (1 = temel). */
export type SesOlayi = { vurus: number; tur: SesTuru; vurusSure?: number; perde?: number };
```
`DONUS` tanımından sonra ekle:
```ts
/** Studio (v33–52, spec "3 · Studio"). */
export const STUDIO = {
  /** Tabla −180°, kamera Studio yığınına; "01 STUDIO" kilidi. */
  tabla: 33,
  kilit: 33,
  /** "Dil ve konuşma alanında çalışan uzmanlar için." */
  kitle: 34,
  /** dil, konuşma, işitme etiketleri raptiyeye varır. */
  etiketler: [37, 38, 39],
  /** Üst kâğıt kalkar, Artikülasyon kâğıdına açılır (2 vuruş). */
  kart: 41,
  /** "Hedef sesi seç; …" */
  cumle: 42,
  /** hedef ses: /r/, görseliyle kelimeler. */
  kartEtiketleri: [44, 45],
  /** "Öğrenme Kartı · Sosyal Hikaye · Artikülasyon ve 7 araç daha" */
  araclar: 47,
  /** Deste çevrilir: Sosyal Hikaye, sonra Öğrenme Kartı öne gelir. */
  cevir: [48, 50],
} as const;

/** Atölye (v53–72, spec "4 · Atölye"). */
export const ATOLYE = {
  /** Tabla −270°, kamera Atölye yığınına; "02 ATÖLYE" kilidi. */
  tabla: 53,
  kilit: 53,
  /** "Öğrenme güçlüğü alanında çalışan uzmanlar için." */
  kitle: 54,
  /** MEB program adı · 172 hedef. */
  meb: 55,
  /** modül → bölüm → hedef basamakları (perde yükselir). */
  basamaklar: [57, 58, 59],
  /** Üst kâğıt seans planı taslağına açılır (2 vuruş). */
  kart: 61,
  /** "Hedefini seç; …" */
  cumle: 62,
  /** TASLAK damgası iner. */
  damga: 65,
  /** "Son söz her zaman senin." */
  sonSoz: 66,
  /** MEB hedefi 3.1.2, etkinlik akışı. */
  kartEtiketleri: [67, 68],
  /** "Seans Planı · BEP & Rapor · Veli Mektubu ve 8 araç daha" */
  araclar: 69,
} as const;
```
`olaylar` dizisine (künye tıkından sonra) ekle:
```ts
  { vurus: STUDIO.tabla, tur: "donus", vurusSure: 2 },
  ...STUDIO.etiketler.map((vurus): SesOlayi => ({ vurus, tur: "tik" })),
  { vurus: STUDIO.kart, tur: "sayfa" },
  ...STUDIO.kartEtiketleri.map((vurus): SesOlayi => ({ vurus, tur: "tik" })),
  ...STUDIO.cevir.map((vurus): SesOlayi => ({ vurus, tur: "sayfa" })),
  { vurus: ATOLYE.tabla, tur: "donus", vurusSure: 2 },
  ...ATOLYE.basamaklar.map((vurus, i): SesOlayi => ({ vurus, tur: "tik", perde: 1 + 0.13 * i })),
  { vurus: ATOLYE.kart, tur: "sayfa" },
  { vurus: ATOLYE.damga, tur: "tok" },
  ...ATOLYE.kartEtiketleri.map((vurus): SesOlayi => ({ vurus, tur: "tik" })),
```
(İlk basamağın perdesi 1'dir: `perde: 1` açıkça yazılır; sfx testi ilk basamağı vuruşuyla, diğerlerini `perde > 1` ile bulur.)

- [ ] **Step 3: `sfx.ts`** — `tik`'i perdeli yap (perde 1'de çıktı birebir aynı):
```ts
  // Etiket varışı: kısa, parlak tık; perde çarpanı basamak tıklarında yükselir.
  const tik = (perde = 1) =>
    uret(0.08, (t) => {
      const ton = (Math.sin(2 * Math.PI * 2200 * perde * t) * 0.6 + Math.sin(2 * Math.PI * 3300 * perde * t) * 0.18) * Math.exp(-t * 90);
      const tiklama = t < 0.003 ? gurultu() * 0.3 * (1 - t / 0.003) : 0;
      return ton + tiklama;
    });
```
`donus` tanımından sonra ekle:
```ts
  // Sayfa açılma/çevirme: yükselen bant süpürmesiyle kısa, gövdesiz hışırtı.
  const sayfa = () => {
    let lp = 0;
    let hp = 0;
    let onceki = 0;
    return uret(0.28, (t) => {
      const u = t / 0.28;
      const kesim = 900 + 3500 * u;
      const a = 1 - Math.exp((-2 * Math.PI * kesim) / sr);
      lp += a * (gurultu() - lp);
      hp = 0.97 * (hp + lp - onceki);
      onceki = lp;
      return 0.6 * hp * Math.pow(Math.sin(Math.PI * u), 1.5);
    });
  };
```
`switch`'te `case "tik"`'i `ekle(t0, tik(s.perde ?? 1));` yap ve `default`'tan önce ekle:
```ts
      case "sayfa":
        ekle(t0, sayfa());
        break;
```
`AcilisFoyu.tsx`'teki `SES_ADI`'ye `sayfa: "sayfa"` ekle (föy yalnız v≤8'i çizer; tip tamlığı için).

- [ ] **Step 4:** `npm test && npm run typecheck` → `ℹ fail 0` (olaylar +3, sfx +2 → 120). "tok inişte güçlü bir darbe" kırılırsa DUR, tepe değerlerini raporla. `npm run marka:sfx` → `(… olay, 100 BPM, … sn)` satırını raporla.
- [ ] **Step 5: Commit** — `feat(promo/marka): Studio ve Atölye olayları, sayfa sesi, perdeli tık`

---

### Task 2: Studio/Atölye metinleri (`metin.ts`)

**Files:** Modify `promo/src/marka/metin.ts`, `promo/tests/marka-metin.test.ts`

- [ ] **Step 1: Testler** — `tests/marka-metin.test.ts`:
  - içe aktarma: `import { ETIKETLER, HEDEFLER, MEB_PROGRAM, METIN, kelimeSayisi } from "../src/marka/metin.ts";`
  - `tumMetin`'e ekle: `.concat(Object.values(ETIKETLER).flat())`
  - "kitle yazımı" testini satır kırılımına dayanıklı yap:
```ts
test("kitle yazımı", () => {
  const tek = (l: readonly string[]) => l.map((s) => s.replace(/\n/g, " "));
  assert.ok(tek(METIN.studio.ekran).includes("Dil ve konuşma alanında çalışan uzmanlar için."));
  assert.ok(tek(METIN.atolye.ekran).includes("Öğrenme güçlüğü alanında çalışan uzmanlar için."));
});
```
  - sona ekle:
```ts
test("Studio ve Atölye cümleleri satır satır", () => {
  assert.deepEqual(METIN.studio.ekran[1].split("\n"), ["Hedef sesi seç;", "kelimeler görselleriyle", "gelsin."]);
  assert.deepEqual(METIN.atolye.ekran[2].split("\n"), ["Hedefini seç;", "seans planı taslağın", "hazırlansın."]);
});

test("etiketler: Studio üç alan, Atölye üç basamak, kart etiketleri ikişer", () => {
  assert.equal(ETIKETLER.studio.length, 3);
  assert.equal(ETIKETLER.atolye.length, 3);
  assert.equal(ETIKETLER.studioKart.length, 2);
  assert.equal(ETIKETLER.atolyeKart.length, 2);
});
```
Run → FAIL.

- [ ] **Step 2: Uygula** — `metin.ts`'te `studio.ekran` ve `atolye.ekran`'ı değiştir:
```ts
    ekran: [
      "Dil ve konuşma alanında\nçalışan uzmanlar için.",
      "Hedef sesi seç;\nkelimeler görselleriyle\ngelsin.",
      "Öğrenme Kartı · Sosyal Hikaye · Artikülasyon ve 7 araç daha",
    ],
```
```ts
    ekran: [
      "Öğrenme güçlüğü alanında\nçalışan uzmanlar için.",
      `MEB ${MEB_PROGRAM} · 172 hedef`,
      "Hedefini seç;\nseans planı taslağın\nhazırlansın.",
      "Son söz her zaman senin.",
      "Seans Planı · BEP & Rapor · Veli Mektubu ve 8 araç daha",
    ],
```
`HEDEFLER`'den sonra ekle:
```ts
/** Studio ve Atölye bölümlerinin etiketleri (içerik denetimi bunları da tarar). */
export const ETIKETLER = {
  studio: ["dil", "konuşma", "işitme"],
  studioKart: ["hedef ses: /r/", "görseliyle kelimeler"],
  atolye: ["modül", "bölüm", "hedef 3.1.2"],
  atolyeKart: ["MEB hedefi 3.1.2", "etkinlik akışı"],
  damga: ["TASLAK"],
} as const;
```
- [ ] **Step 3:** `npm test && npm run typecheck` → `ℹ fail 0` (122).
- [ ] **Step 4: Commit** — `feat(promo/marka): Studio ve Atölye metinleri, bölüm etiketleri`

---

### Task 3: Durum tipleri ve kâğıt grubu kimliği

**Files:** Create `promo/src/marka/durumTipleri.ts`; Modify `promo/src/marka/filmDurumu.ts`, `promo/src/marka/kagitAkisi.ts`

Davranış değişmez; testler ve render aynı kalır.

- [ ] **Step 1: `durumTipleri.ts`**
```ts
import type { V2, V3 } from "./izometri.ts";

// Film durumunun parça tipleri (filmDurumu.ts ve moduller.ts paylaşır).

export type EtiketDurumu = {
  id: string;
  /** Çizginin vardığı dünya noktası. */
  capa: V3;
  /** Varsa çapa ekran noktası (2B karta bağlı etiketler); capa yerine kullanılır. */
  capaEkran?: V2;
  x: number;
  y: number;
  hiza: "sol" | "sag";
  metin: string;
  nokta?: string;
  gorunum: number;
  ilerleme: number;
  cikis: number;
};

export type MetinDurumu = {
  id: string;
  satirlar: string[];
  top: number;
  font: "baslik" | "govde";
  boyut: number;
  agirlik: number;
  renk: string;
  opaklik: number;
  acilis: number[];
  cikis: number;
  /** Varsa en büyük genişlik (px): metin bu genişlikte kendiliğinden kırılır. */
  genislik?: number;
};

export type CipDurumu = { id: string; x: number; y: number; metin: string; nokta?: string; gorunum: number; cikis: number };

/** Ürünün gerçek çıktısı: 2B kart (merkezden konum, ölçek, perspektifli rotateY, eğim). sira: 0 önde, büyük arkada. */
export type KartDurumu = {
  id: string;
  resim: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  olcek: number;
  rotY: number;
  egim: number;
  opaklik: number;
  cikis: number;
  sira: number;
};

/** Bölüm kilidi: numara + büyük harf ad. */
export type KilitDurumu = { id: string; numara: string; kelime: string; top: number; gorunum: number; cikis: number };

/** TASLAK damgası. */
export type DamgaDurumu = { x: number; y: number; olcek: number; aci: number; opaklik: number; cikis: number };
```

- [ ] **Step 2: `filmDurumu.ts`** — dosyadaki `EtiketDurumu`, `MetinDurumu`, `CipDurumu` tip tanımlarını sil; yerine en üste:
```ts
import type { CipDurumu, EtiketDurumu, MetinDurumu } from "./durumTipleri.ts";
export type { CipDurumu, DamgaDurumu, EtiketDurumu, KartDurumu, KilitDurumu, MetinDurumu } from "./durumTipleri.ts";
```

- [ ] **Step 3: `kagitAkisi.ts`** — `KagitGrubu`'yu genişlet ve grup kimliklerini ver:
```ts
/** id: "S1"–"S4" (Yük yığınları), "modul-studio" / "modul-atolye", "ucan-<modül>-<sıra>". opaklik: odak dışı soluklaştırma. */
export type KagitGrubu = { id: string; p: V3; kagitlar: Kagit[]; opaklik?: number };
```
`kagitSahnesi` içindeki üç `gruplar.push(...)` çağrısına `id` ekle: Yük yığınlarına `id` (`"S1"` …), modül yığınına `` `modul-${m}` ``, uçan kâğıda `` `ucan-${m}-${j}` `` (uçuş döngüsünü `liste.forEach((k, j) => …)` ya da indeksli `for` ile yaz).

- [ ] **Step 4:** `npm test && npm run typecheck` → `ℹ pass 122`, `ℹ fail 0`.
- [ ] **Step 5: Commit** — `refactor(promo/marka): durum tipleri ayrı dosyada, kâğıt grubu kimliği`

---

### Task 4: Studio ve Atölye katmanı (`moduller.ts`)

**Files:** Create `promo/src/marka/moduller.ts`; Test `promo/tests/marka-moduller.test.ts`

- [ ] **Step 1: Başarısız testi yaz** — `tests/marka-moduller.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { modulKatmani, STUDIO_KART } from "../src/marka/moduller.ts";
import { ATOLYE, STUDIO } from "../src/marka/olaylar.ts";
import { kare } from "../src/marka/zaman.ts";

const K33 = kare(STUDIO.tabla);
const K53 = kare(ATOLYE.tabla);
const K73 = kare(73);
const etiket = (f: number, id: string) => modulKatmani(f).etiketler.find((e) => e.id === id);
const kart = (f: number, id: string) => modulKatmani(f).kartlar.find((k) => k.id === id);

test("Studio etiketleri vuruşlarında raptiyeye varır, kart açılırken çıkar", () => {
  STUDIO.etiketler.forEach((v, i) => {
    assert.ok(etiket(kare(v) - 1, `studio-${i}`)!.ilerleme < 1, `v${v}`);
    assert.equal(etiket(kare(v), `studio-${i}`)!.ilerleme, 1, `v${v}`);
  });
  assert.equal(etiket(kare(STUDIO.kart) + 12, "studio-0"), undefined);
});

test("Atölye basamakları vuruşlarında varır; ikinci ve üçüncü bir öncekine bağlı", () => {
  ATOLYE.basamaklar.forEach((v, i) => {
    const e = etiket(kare(v), `basamak-${i}`)!;
    assert.equal(e.ilerleme, 1, `v${v}`);
    if (i > 0) assert.ok(e.capaEkran, `basamak ${i} ekran çapası`);
  });
});

test("Studio kartı yığından açılır: başta küçük ve dönük, 36 karede yerinde", () => {
  const k41 = kare(STUDIO.kart);
  assert.equal(kart(k41 - 1, "studio-0"), undefined);
  const bas = kart(k41, "studio-0")!;
  assert.ok(bas.olcek < 0.3 && bas.rotY > 60, `${bas.olcek} ${bas.rotY}`);
  const son = kart(k41 + 36, "studio-0")!;
  assert.equal(son.olcek, 1);
  assert.equal(son.rotY, 0);
  assert.equal(son.cx, STUDIO_KART.cx);
  assert.equal(son.cy, STUDIO_KART.cy);
});

test("deste çevirme: v48'de Artikülasyon döner, Sosyal Hikaye öne; v50'de Öğrenme Kartı öne", () => {
  const [c1, c2] = STUDIO.cevir.map((v) => kare(v));
  assert.equal(kart(c1, "studio-0")?.opaklik ?? 0, 0);
  const r4 = kart(c1 + 4, "studio-1")!;
  assert.equal(r4.sira, 0);
  assert.equal(r4.cx, STUDIO_KART.cx);
  const r2 = kart(c2 + 4, "studio-2")!;
  assert.equal(r2.sira, 0);
  assert.equal(r2.cy, STUDIO_KART.cy);
});

test("TASLAK damgası v65'te tam ölçekte iner", () => {
  const k = kare(ATOLYE.damga);
  assert.equal(modulKatmani(k - 7).damga?.opaklik ?? 0, 0);
  const d = modulKatmani(k).damga!;
  assert.equal(d.opaklik, 1);
  assert.ok(Math.abs(d.olcek - 1) < 1e-9, `${d.olcek}`);
});

test("kilitler: 01 Studio v33'te, 02 Atölye v53'te; Studio kilidi Atölye'de çıkar", () => {
  assert.equal(modulKatmani(K33 + 24).kilitler.find((k) => k.id === "kilit-studio")!.gorunum, 1);
  assert.equal(modulKatmani(K53 + 12).kilitler.find((k) => k.id === "kilit-studio"), undefined);
  assert.equal(modulKatmani(K53 + 24).kilitler.find((k) => k.id === "kilit-atolye")!.gorunum, 1);
});

test("odak: Studio'da blok ve Atölye yığını soluk; Atölye'de blok ve Studio yığını soluk", () => {
  const yakin = (x: number[], y: number[]) => x.every((v, i) => Math.abs(v - y[i]) < 1e-9);
  const s = modulKatmani(K33 + 18).soluk;
  assert.ok(yakin([s.blok, s.studio, s.atolye], [0.3, 1, 0.3]), `${[s.blok, s.studio, s.atolye]}`);
  const a = modulKatmani(K53 + 18).soluk;
  assert.ok(yakin([a.blok, a.studio, a.atolye], [0.3, 0.3, 1]), `${[a.blok, a.studio, a.atolye]}`);
});

test("kartına dönüşen üst kâğıt yığından eksilir", () => {
  assert.equal(modulKatmani(kare(STUDIO.kart) - 1).eksik.studio, 0);
  assert.equal(modulKatmani(kare(STUDIO.kart)).eksik.studio, 1);
  assert.equal(modulKatmani(K53 + 12).eksik.studio, 0);
  assert.equal(modulKatmani(kare(ATOLYE.kart)).eksik.atolye, 1);
  assert.equal(modulKatmani(K73 - 1).eksik.atolye, 1);
});

test("Atölye bölümünde görsel üretimi çağrıştıran kart yok (yalnız taslak)", () => {
  const kartlar = modulKatmani(kare(70)).kartlar;
  assert.deepEqual(kartlar.map((k) => k.resim), ["real/r5-taslak.png"]);
});
```
Run → FAIL.

- [ ] **Step 2: Uygula** — `src/marka/moduller.ts`:
```ts
import { Easing, interpolate } from "remotion";
import type { DamgaDurumu, EtiketDurumu, KartDurumu, KilitDurumu, MetinDurumu } from "./durumTipleri.ts";
import type { V2, V3 } from "./izometri.ts";
import { ETIKETLER, METIN } from "./metin.ts";
import { ATOLYE, STUDIO } from "./olaylar.ts";
import { RENK } from "./tema.ts";
import { BOLUMLER_169, kare } from "./zaman.ts";

// Studio (v33–52) ve Atölye (v53–72) katmanı: etiketler, metinler, gerçek çıktı kartları, kilitler, damga,
// odak dışı soluklaştırma ve kartına dönüşen üst kâğıt. Saf: kare → katman. Kamera/tabla filmDurumu.ts'tedir.

export type ModulKatmani = {
  etiketler: EtiketDurumu[];
  metinler: MetinDurumu[];
  kartlar: KartDurumu[];
  kilitler: KilitDurumu[];
  damga: DamgaDurumu | null;
  /** Opaklık: odak dışı blok ve modül yığını %30'a iner. */
  soluk: { blok: number; studio: number; atolye: number };
  /** Kartına dönüşen üst kâğıt: modül yığınından eksilen sayı. */
  eksik: { studio: number; atolye: number };
};

const ara = (f: number, a: number, b: number, easing: (t: number) => number = (t) => t) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
const cikisAri = (f: number, k: number) => ara(f, k, k + 12);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const K33 = kare(STUDIO.tabla);
const K53 = kare(ATOLYE.tabla);
const K73 = kare(BOLUMLER_169.find((b) => b.id === "cocuk")!.ilk);

/** Studio'nun ön kartı (Artikülasyon, yatay kırpım) ve destedeki iki kartın ofseti. */
export const STUDIO_KART = { cx: 1340, cy: 316, w: 600, h: 392, egim: -2 };
const DESTE = [
  { dx: 22, dy: -18, egim: 1 },
  { dx: 46, dy: -36, egim: 3 },
];
const STUDIO_RESIMLER = ["real/r3-kagit.png", "real/r4-hikaye.png", "real/r2-kart.png"];
/** Studio yığınının tepesi ekranda (kamera s 120, ox 1335, oy 650, tabla −180°): kart buradan açılır. */
const STUDIO_YIGIN_EKRAN: V2 = [1340, 701];
/** Atölye kartı (seans planı taslağı, dikey) ve yığın tepesi (kamera s 130, ox 1626, oy 640, tabla −270°). */
export const ATOLYE_KART = { cx: 1400, cy: 447, w: 420, h: 594, egim: 2 };
const ATOLYE_YIGIN_EKRAN: V2 = [1350, 533];
const ATOLYE_YIGIN_DUNYA: V3 = [1.2, 1.25, 0.8];

type EtiketTemeli = Omit<EtiketDurumu, "gorunum" | "ilerleme" | "cikis">;
/** Vuruşunda raptiyeye varan etiket: çip 18 karede netleşir, çizgi son 10 karede hızlanarak varır; cikisKare'de çıkar. */
const vurusEtiketi = (f: number, v: number, cikisKare: number, e: EtiketTemeli): EtiketDurumu | null => {
  const k = kare(v);
  if (f < k - 24) return null;
  const cikis = cikisAri(f, cikisKare);
  if (cikis >= 1) return null;
  return { ...e, gorunum: ara(f, k - 24, k - 6, Easing.out(Easing.quad)), ilerleme: ara(f, k - 10, k, Easing.in(Easing.quad)), cikis };
};

const metin = (
  f: number,
  id: string,
  satirlar: string[],
  top: number,
  bicim: { font: "baslik" | "govde"; boyut: number; agirlik: number; renk: string; opaklik: number; genislik?: number },
  girisV: number,
  cikisKare: number,
): MetinDurumu | null => {
  const k = kare(girisV);
  if (f < k) return null;
  const cikis = cikisAri(f, cikisKare);
  if (cikis >= 1) return null;
  return { id, satirlar, top, ...bicim, acilis: satirlar.map((_, i) => ara(f, k + 5 * i, k + 5 * i + 14, Easing.out(Easing.cubic))), cikis };
};

const KITLE = { font: "govde" as const, boyut: 42, agirlik: 500, renk: RENK.ink, opaklik: 0.85 };
const CUMLE = { font: "govde" as const, boyut: 54, agirlik: 700, renk: RENK.teal, opaklik: 1 };
const KUCUK = { font: "govde" as const, boyut: 30, agirlik: 500, renk: RENK.ink, opaklik: 0.7, genislik: 640 };

const studioKartlari = (f: number): KartDurumu[] => {
  const k41 = kare(STUDIO.kart);
  if (f < k41) return [];
  const cikis = cikisAri(f, K53);
  if (cikis >= 1) return [];
  const u = ara(f, k41, k41 + 36, Easing.out(Easing.cubic));
  const deste = ara(f, k41 + 24, k41 + 36);
  const [c1, c2] = STUDIO.cevir.map((v) => kare(v));
  const cevrim = [ara(f, c1 - 8, c1, Easing.in(Easing.quad)), ara(f, c2 - 8, c2, Easing.in(Easing.quad)), 0];
  const kayma = ara(f, c1 - 4, c1 + 4, Easing.out(Easing.cubic)) + ara(f, c2 - 4, c2 + 4, Easing.out(Easing.cubic));
  const kartlar: KartDurumu[] = [];
  for (let i = 0; i < 3; i++) {
    if (cevrim[i] >= 1) continue;
    const sira = Math.max(0, i - kayma);
    const alt = Math.min(1, Math.floor(sira));
    const t = sira - alt;
    const poz = (s: number) => (s === 0 ? { dx: 0, dy: 0, egim: STUDIO_KART.egim } : DESTE[s - 1]);
    const a = poz(alt);
    const b = poz(Math.min(2, alt + 1));
    let cx = STUDIO_KART.cx + lerp(a.dx, b.dx, t);
    let cy = STUDIO_KART.cy + lerp(a.dy, b.dy, t);
    let olcek = 1;
    let rotY = -90 * cevrim[i];
    let opaklik = i === 0 ? ara(f, k41, k41 + 6) : deste;
    if (i === 0) {
      cx = lerp(STUDIO_YIGIN_EKRAN[0], cx, u);
      cy = lerp(STUDIO_YIGIN_EKRAN[1], cy, u);
      olcek = lerp(0.2, 1, u);
      rotY += 70 * (1 - u);
    }
    kartlar.push({ id: `studio-${i}`, resim: STUDIO_RESIMLER[i], cx, cy, w: STUDIO_KART.w, h: STUDIO_KART.h, olcek, rotY, egim: lerp(a.egim, b.egim, t), opaklik, cikis, sira: i - kayma });
  }
  return kartlar;
};

const atolyeKarti = (f: number): KartDurumu[] => {
  const k61 = kare(ATOLYE.kart);
  if (f < k61) return [];
  const cikis = cikisAri(f, K73);
  if (cikis >= 1) return [];
  const u = ara(f, k61, k61 + 36, Easing.out(Easing.cubic));
  return [
    {
      id: "atolye-0",
      resim: "real/r5-taslak.png",
      cx: lerp(ATOLYE_YIGIN_EKRAN[0], ATOLYE_KART.cx, u),
      cy: lerp(ATOLYE_YIGIN_EKRAN[1], ATOLYE_KART.cy, u),
      w: ATOLYE_KART.w,
      h: ATOLYE_KART.h,
      olcek: lerp(0.2, 1, u),
      rotY: 70 * (1 - u),
      egim: ATOLYE_KART.egim,
      opaklik: ara(f, k61, k61 + 6),
      cikis,
      sira: 0,
    },
  ];
};

export const modulKatmani = (f: number): ModulKatmani => {
  const etiketler: EtiketDurumu[] = [];
  const ekle = (e: EtiketDurumu | null) => {
    if (e) etiketler.push(e);
  };
  const kS = kare(STUDIO.kart);
  const kA = kare(ATOLYE.kart);
  const studioYer = [
    { capa: [-0.95, -1.2, 0.8] as V3, x: 1150, y: 640, hiza: "sag" as const },
    { capa: [-1.25, -1.2, 0.8] as V3, x: 1520, y: 600, hiza: "sol" as const },
    { capa: [-1.6, -1.2, 0.4] as V3, x: 1540, y: 860, hiza: "sol" as const },
  ];
  STUDIO.etiketler.forEach((v, i) => ekle(vurusEtiketi(f, v, kS, { id: `studio-${i}`, ...studioYer[i], metin: ETIKETLER.studio[i], nokta: RENK.studio })));
  const kartYer = [
    { capa: [0, 0, 0] as V3, capaEkran: [1075, 150] as V2, x: 1010, y: 150, hiza: "sag" as const },
    { capa: [0, 0, 0] as V3, capaEkran: [1508, 398] as V2, x: 1680, y: 430, hiza: "sol" as const },
  ];
  STUDIO.kartEtiketleri.forEach((v, i) =>
    ekle(vurusEtiketi(f, v, kare(STUDIO.cevir[0]) - 8, { id: `studio-kart-${i}`, ...kartYer[i], metin: ETIKETLER.studioKart[i] })),
  );
  const basamakYer = [
    { capa: ATOLYE_YIGIN_DUNYA, x: 1440, y: 330, hiza: "sol" as const },
    { capa: [0, 0, 0] as V3, capaEkran: [1480, 357] as V2, x: 1540, y: 430, hiza: "sol" as const },
    { capa: [0, 0, 0] as V3, capaEkran: [1580, 457] as V2, x: 1640, y: 530, hiza: "sol" as const },
  ];
  ATOLYE.basamaklar.forEach((v, i) => ekle(vurusEtiketi(f, v, kA, { id: `basamak-${i}`, ...basamakYer[i], metin: ETIKETLER.atolye[i], nokta: RENK.atolye })));
  const atolyeKartYer = [
    { capa: [0, 0, 0] as V3, capaEkran: [1212, 302] as V2, x: 1150, y: 300, hiza: "sag" as const },
    { capa: [0, 0, 0] as V3, capaEkran: [1484, 379] as V2, x: 1650, y: 470, hiza: "sol" as const },
  ];
  ATOLYE.kartEtiketleri.forEach((v, i) => ekle(vurusEtiketi(f, v, K73, { id: `atolye-kart-${i}`, ...atolyeKartYer[i], metin: ETIKETLER.atolyeKart[i] })));

  const metinler = [
    metin(f, "studio-kitle", METIN.studio.ekran[0].split("\n"), 520, KITLE, STUDIO.kitle, kS),
    metin(f, "studio-cumle", METIN.studio.ekran[1].split("\n"), 520, CUMLE, STUDIO.cumle, K53),
    metin(f, "studio-araclar", [METIN.studio.ekran[2]], 760, KUCUK, STUDIO.araclar, K53),
    metin(f, "atolye-kitle", METIN.atolye.ekran[0].split("\n"), 490, KITLE, ATOLYE.kitle, kA),
    metin(f, "atolye-meb", [METIN.atolye.ekran[1]], 620, { ...KUCUK, agirlik: 600 }, ATOLYE.meb, kA),
    metin(f, "atolye-cumle", METIN.atolye.ekran[2].split("\n"), 490, CUMLE, ATOLYE.cumle, K73),
    metin(f, "atolye-sonsoz", [METIN.atolye.ekran[3]], 720, { font: "govde", boyut: 40, agirlik: 600, renk: RENK.ink, opaklik: 0.9 }, ATOLYE.sonSoz, K73),
    metin(f, "atolye-araclar", [METIN.atolye.ekran[4]], 800, KUCUK, ATOLYE.araclar, K73),
  ].filter((m): m is MetinDurumu => m !== null);

  const kilitler: KilitDurumu[] = [];
  const cS = cikisAri(f, K53);
  if (f >= K33 && cS < 1) kilitler.push({ id: "kilit-studio", numara: "01", kelime: METIN.studio.baslik[0], top: 360, gorunum: ara(f, K33 + 6, K33 + 24), cikis: cS });
  const cA = cikisAri(f, K73);
  if (f >= K53 && cA < 1) kilitler.push({ id: "kilit-atolye", numara: "02", kelime: METIN.atolye.baslik[0], top: 330, gorunum: ara(f, K53 + 6, K53 + 24), cikis: cA });

  const kD = kare(ATOLYE.damga);
  const g = ara(f, kD - 6, kD, Easing.in(Easing.quad));
  const damga: DamgaDurumu | null = f >= kD - 6 && cA < 1 ? { x: 1560, y: 250, olcek: 1.6 - 0.6 * g, aci: -10, opaklik: g, cikis: cA } : null;

  const solS = ara(f, K33, K33 + 18);
  const solA = ara(f, K53, K53 + 18);
  return {
    etiketler,
    metinler,
    kartlar: [...studioKartlari(f), ...atolyeKarti(f)],
    kilitler,
    damga,
    soluk: { blok: 1 - 0.7 * solS, studio: 1 - 0.7 * solA, atolye: 1 - 0.7 * solS + 0.7 * solA },
    eksik: { studio: f >= kS && f < K53 + 12 ? 1 : 0, atolye: f >= kA && f < K73 + 12 ? 1 : 0 },
  };
};
```
- [ ] **Step 3:** `node --test tests/marka-moduller.test.ts` → `ℹ pass 9`. `npm test && npm run typecheck` → `ℹ fail 0`. Bir test plan koduna karşı kırılırsa değerleri yazdır, analiz et, raporla (testi sessizce gevşetme).
- [ ] **Step 4: Commit** — `feat(promo/marka): Studio ve Atölye katmanı (moduller)`

---

### Task 5: Metin genişliği, kilit, çıktı kartı, damga (`yazi.tsx`)

**Files:** Modify `promo/src/marka/yazi.tsx`

- [ ] **Step 1: Referans** — `npm run marka:stil && cp out/marka/stil-karesi.png out/marka/ref-stil-3b.png`
- [ ] **Step 2: `MetinBlogu`'na `genislik` ve `sol`** — prop tipine `genislik?: number; sol?: number;` ekle, imzada `genislik, sol = TUVAL_169.sol` al; stilde `left: sol,` ve `maxWidth: genislik,` kullan (başka değişiklik yok).
- [ ] **Step 3: `Kilit`, `CiktiKarti`, `Damga`** — `import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";` zaten var. `MetinBlogu`'dan sonra ekle:
```tsx
/** Bölüm kilidi (rehber): krem kare + blursuz ofset gölge içinde numara, yanında büyük harf bölüm adı.
 *  gorunum 0–1: kare haptan kareye dönüşerek bulanıktan netleşir, ad ardından soldan sağa açılır. */
export const Kilit: React.FC<{ numara: string; kelime: string; top: number; gorunum: number }> = ({ numara, kelime, top, gorunum }) => {
  if (gorunum <= 0) return null;
  const kutu = Math.min(1, gorunum * 1.6);
  const ad = Math.max(0, (gorunum - 0.35) / 0.65);
  const r = 62 - 40 * kutu;
  return (
    <>
      <div style={{ position: "absolute", left: TUVAL_169.sol, top, width: 124, height: 124, opacity: kutu, filter: kutu < 1 ? `blur(${(1 - kutu) * 16}px)` : undefined }}>
        <div style={{ position: "absolute", left: 7, top: 7, width: 124, height: 124, borderRadius: r, background: RENK.ink }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: r,
            background: RENK.kagitBeyaz,
            border: `3px solid ${RENK.ink}`,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT.baslik,
            fontWeight: 800,
            fontSize: 58,
            color: RENK.teal,
          }}
        >
          {numara}
        </div>
      </div>
      <MetinBlogu satirlar={[kelime]} top={top + 62 - (112 * 0.95) / 2} sol={TUVAL_169.sol + 162} font="baslik" boyut={112} agirlik={800} renk={RENK.teal} acilis={[ad]} />
    </>
  );
};

/** Ürünün gerçek çıktısı: Poster çerçeveli kart (ink kenar, blursuz ofset gölge), görsel üstten kırpılır.
 *  Konum merkezden; olcek, perspektifli rotateY (derece) ve egim (derece) animasyon içindir. */
export const CiktiKarti: React.FC<{ resim: string; cx: number; cy: number; w: number; h: number; olcek: number; rotY: number; egim: number; opaklik: number }> = ({
  resim,
  cx,
  cy,
  w,
  h,
  olcek,
  rotY,
  egim,
  opaklik,
}) =>
  opaklik <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        opacity: opaklik,
        transform: `perspective(1600px) rotateY(${rotY}deg) rotate(${egim}deg) scale(${olcek})`,
        transformOrigin: "center",
      }}
    >
      <div style={{ position: "absolute", left: 10, top: 10, width: w, height: h, borderRadius: 14, background: RENK.ink }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 14, overflow: "hidden", background: "#ffffff", border: `3px solid ${RENK.ink}`, boxSizing: "border-box" }}>
        <Img src={staticFile(resim)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
      </div>
    </div>
  );

/** TASLAK damgası: ink çerçeveli, eğik; olcek ve opaklık vuruşa iniş içindir. */
export const Damga: React.FC<{ x: number; y: number; olcek: number; aci: number; opaklik: number; metin: string }> = ({ x, y, olcek, aci, opaklik, metin }) =>
  opaklik <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: x - 138,
        top: y - 46,
        width: 276,
        height: 92,
        opacity: opaklik,
        transform: `rotate(${aci}deg) scale(${olcek})`,
        borderRadius: 10,
        border: `5px solid ${RENK.ink}`,
        background: "rgba(255,253,248,0.94)",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT.baslik,
        fontWeight: 800,
        fontSize: 54,
        letterSpacing: "0.09em",
        color: RENK.ink,
      }}
    >
      {metin}
    </div>
  );
```
- [ ] **Step 4:** `npm run typecheck && npm test`; stil karesi piksel eşitliği: `npm run marka:stil` sonra PIL ile `ref-stil-3b.png` karşılaştırması → `None`.
- [ ] **Step 5: Commit** — `feat(promo/marka): kilit, çıktı kartı, damga; metin genişliği`

---

### Task 6: Film durumu v33–72 (`filmDurumu.ts`)

**Files:** Modify `promo/src/marka/filmDurumu.ts`, `promo/tests/marka-film.test.ts`

- [ ] **Step 1: Testleri ekle** — `tests/marka-film.test.ts` içe aktarmalarına `import { izd } from "../src/marka/izometri.ts";` (gorunur'un yanına), `import { MODUL_YERI } from "../src/marka/kagitAkisi.ts";`, `import { ATOLYE, STUDIO } from "../src/marka/olaylar.ts";` ekle (mevcut olaylar importuna birleştir) ve sona:
```ts
const K33 = kare(STUDIO.tabla);
const K53 = kare(ATOLYE.tabla);
const K73 = kare(73);

test("tabla v33'te −180°, v53'te −270°; kamera Studio'da 120, Atölye'de 130", () => {
  const s = filmDurumu(K33 + 36);
  assert.ok(Math.abs(s.kamera.don + Math.PI) < 1e-9);
  assert.equal(s.kamera.s, 120);
  const a = filmDurumu(K53 + 36);
  assert.ok(Math.abs(a.kamera.don + (3 * Math.PI) / 2) < 1e-9);
  assert.equal(a.kamera.s, 130);
});

test("odak yığınları ekranda beklenen yerde", () => {
  const s = filmDurumu(K33 + 36).kamera;
  const [sx, sy] = izd([MODUL_YERI.studio[0], MODUL_YERI.studio[1], 0.8], s);
  assert.ok(Math.abs(sx - 1340) < 6 && Math.abs(sy - 701) < 6, `${sx} ${sy}`);
  const a = filmDurumu(K53 + 36).kamera;
  const [ax, ay] = izd([MODUL_YERI.atolye[0], MODUL_YERI.atolye[1], 0.8], a);
  assert.ok(Math.abs(ax - 1350) < 6 && Math.abs(ay - 533) < 6, `${ax} ${ay}`);
});

test("Studio ve Atölye katmanı filme geçer; odak dışı soluk", () => {
  const d = filmDurumu(K33 + 30);
  assert.ok(Math.abs(d.blok.opaklik - 0.3) < 1e-9);
  assert.ok(Math.abs(d.kagitlar.find((g) => g.id === "modul-atolye")!.opaklik! - 0.3) < 1e-9);
  assert.ok(Math.abs(d.kagitlar.find((g) => g.id === "modul-studio")!.opaklik! - 1) < 1e-9);
  assert.ok(d.kilitler.some((k) => k.id === "kilit-studio"));
  assert.ok(filmDurumu(kare(STUDIO.kart) + 40).kartlar.length === 3);
});

test("kart açılınca Studio yığını bir kâğıt eksik", () => {
  const n = (f: number) => filmDurumu(f).kagitlar.find((g) => g.id === "modul-studio")!.kagitlar.length;
  assert.equal(n(kare(STUDIO.kart) - 1), 8);
  assert.equal(n(kare(STUDIO.kart)), 7);
});

test("hareket v33–72 boyunca sürekli", () => {
  for (let f = SON; f < K73 - 1; f++) {
    const a = filmDurumu(f);
    const b = filmDurumu(f + 1);
    assert.ok(Math.abs(b.itme - a.itme) < 0.025, `itme f=${f}`);
    assert.ok(Math.abs(b.kamera.don - a.kamera.don) < 0.1, `don f=${f}`);
    assert.ok(Math.abs(b.kamera.s - a.kamera.s) < 1.5, `s f=${f}`);
    assert.ok(Math.abs(b.kamera.ox - a.kamera.ox) < 20 && Math.abs(b.kamera.oy - a.kamera.oy) < 20, `o f=${f}`);
  }
});
```
Run → FAIL (`blok.opaklik`, `kilitler` yok).

- [ ] **Step 2: Uygula** — `filmDurumu.ts`:
  - İçe aktarmalar: `import { MODUL_ADET, modulYigini, type ModulId } from "./kagitAkisi.ts";` (mevcut kagitAkisi importuna birleştir), `import { modulKatmani } from "./moduller.ts";`, `import { ATOLYE, STUDIO } from "./olaylar.ts";` (mevcut olaylar importuna birleştir), durum tiplerine `DamgaDurumu, KartDurumu, KilitDurumu` ekle.
  - `FilmDurumu` tipine alanlar: `blok: { z: number; aci: V3; yuz: number; opaklik: number };` ve `kartlar: KartDurumu[]; kilitler: KilitDurumu[]; damga: DamgaDurumu | null;`
  - Sabitler (`STUDIO_BAS` yanına): `const K33 = kare(STUDIO.tabla); const K53 = kare(ATOLYE.tabla); const K73 = kare(BOLUMLER_169.find((b) => b.id === "cocuk")!.ilk);`
  - `tablaAcisi`'ne anahtarları ekle:
```ts
const tablaAcisi = izlek([
  { f: K25, d: 0 },
  { f: K25 + 36, d: -Math.PI / 2, e: Easing.inOut(Easing.sin) },
  { f: K33, d: -Math.PI / 2 },
  { f: K33 + 36, d: -Math.PI, e: Easing.inOut(Easing.sin) },
  { f: K53, d: -Math.PI },
  { f: K53 + 36, d: (-3 * Math.PI) / 2, e: Easing.inOut(Easing.sin) },
]);
const e36 = Easing.inOut(Easing.sin);
// Kamera: genel plan → Studio yığını (s 120) → Atölye yığını (s 130, storyboard F8).
const kameraS = izlek([{ f: K33, d: 100 }, { f: K33 + 36, d: 120, e: e36 }, { f: K53, d: 120 }, { f: K53 + 36, d: 130, e: e36 }]);
const kameraOx = izlek([{ f: K33, d: 1340 }, { f: K33 + 36, d: 1335, e: e36 }, { f: K53, d: 1335 }, { f: K53 + 36, d: 1626, e: e36 }]);
const kameraOy = izlek([{ f: K33, d: 560 }, { f: K33 + 36, d: 650, e: e36 }, { f: K53, d: 650 }, { f: K53 + 36, d: 640, e: e36 }]);
```
  (`tablaAcisi`'nin ilk iki anahtarı Plan 3A'daki 36 kare/sin değerleriyle aynı olmalı; dosyadakiyle karşılaştır.)
  - `yukDonusItmesi` anahtarlarının sonuna ekle: `{ f: K53, d: 1.04 }, { f: K53 + 18, d: 1.0, e: Easing.inOut(Easing.cubic) }, { f: K73, d: 1.03 }`.
  - `filmDurumu` içinde, `return`'den önce:
```ts
  const m = f >= K33 ? modulKatmani(f) : null;
  const soluk = m?.soluk ?? { blok: 1, studio: 1, atolye: 1 };
  const eksik = m?.eksik ?? { studio: 0, atolye: 0 };
  const kagitlar = kagitSahnesi(f).map((g) => {
    for (const mid of ["studio", "atolye"] as ModulId[]) {
      if (g.id !== `modul-${mid}`) continue;
      const adet = g.kagitlar.length === MODUL_ADET ? MODUL_ADET - eksik[mid] : g.kagitlar.length;
      return { ...g, kagitlar: adet === g.kagitlar.length ? g.kagitlar : modulYigini(mid, adet).kagitlar, opaklik: soluk[mid] };
    }
    return g;
  });
  if (m) {
    etiketler.push(...m.etiketler);
    metinler.push(...m.metinler);
  }
```
  - `return` nesnesinde: `kamera: { s: kameraS(f), ox: kameraOx(f), oy: kameraOy(f), don: tablaAcisi(f) },` (GENEL_KAMERA yerine; `f < K33` iken değerler GENEL_KAMERA ile aynıdır), `blok: { z: a.blokZ, aci: a.blokAci, yuz: a.yuz, opaklik: soluk.blok },`, `kagitlar,`, `kartlar: m?.kartlar ?? [],`, `kilitler: m?.kilitler ?? [],`, `damga: m?.damga ?? null,`.
- [ ] **Step 3:** `node --test tests/marka-film.test.ts` → yeni 5 dahil geçer; `npm test && npm run typecheck` → `ℹ fail 0`.
- [ ] **Step 4: Commit** — `feat(promo/marka): film durumu Studio ve Atölye (kamera, tabla, katman)`

---

### Task 7: Sahne çizimi ve v33–72 render'ı

**Files:** Modify `promo/src/marka/FilmSahnesi.tsx`

- [ ] **Step 1: `FilmSahnesi.tsx`** — içe aktarmalara `Damga, CiktiKarti, Kilit` (yazi.tsx'ten) ve `ETIKETLER` (metin.ts'ten) ekle. Değişiklikler:
  - `DerinlikSirali` öğeleri: kâğıt gruplarına `opaklik: g.opaklik`, blok öğesine `opaklik: durum.blok.opaklik` ver.
  - Kapsayıcı içinde, `</svg>`'den hemen sonra ve etiketlerden önce:
```tsx
        {[...durum.kartlar]
          .sort((a, b) => b.sira - a.sira)
          .map((k) => (
            <Cikis key={k.id} c={k.cikis} koken="center">
              <CiktiKarti resim={k.resim} cx={k.cx} cy={k.cy} w={k.w} h={k.h} olcek={k.olcek} rotY={k.rotY} egim={k.egim} opaklik={k.opaklik} />
            </Cikis>
          ))}
        {durum.damga ? (
          <Cikis c={durum.damga.cikis} koken="center">
            <Damga x={durum.damga.x} y={durum.damga.y} olcek={durum.damga.olcek} aci={durum.damga.aci} opaklik={durum.damga.opaklik} metin={ETIKETLER.damga[0]} />
          </Cikis>
        ) : null}
```
  - Etiket çapası: `capa={e.capaEkran ?? izd(e.capa, k)}`.
  - Metinler: `MetinBlogu`'na `genislik={m.genislik}` geçir.
  - Metinlerden sonra kilitler:
```tsx
      {durum.kilitler.map((k) => (
        <Cikis key={k.id} c={k.cikis}>
          <Kilit numara={k.numara} kelime={k.kelime} top={k.top} gorunum={k.gorunum} />
        </Cikis>
      ))}
```
- [ ] **Step 2:** `npm run typecheck && npm test` → temiz, `ℹ fail 0`.
- [ ] **Step 3: Önceki bölümler değişmedi** — `npx remotion still src/index.ts MarkaFilmi169 out/marka/film-500-3b.png --frame=500`; Plan 3A render'ından aynı kareyi çıkar (`ffmpeg -v error -y -i out/marka/film-169-v1-32.mp4 -vf "select=eq(n\,500)" -vframes 1 out/marka/film-500-3a.png`) ve Read ile ikisine bak: aynı sahne (mp4 sıkıştırma farkı dışında). Fark varsa DUR.
- [ ] **Step 4: v33–72 render ve kareler**
```bash
npm run marka:film -- --frames=560-1310 && mv out/marka/film-169.mp4 out/marka/film-169-v33-72.mp4
for f in 40 100 150 190 230 260 300 330 380 420 460 520 560 620 700 745; do ffmpeg -v error -y -i out/marka/film-169-v33-72.mp4 -vf "select=eq(n\,$f)" -vframes 1 out/marka/film3b-k$f.png; done
ffmpeg -v error -y -i out/marka/film-169-v33-72.mp4 -vf "select=not(mod(n\,6)),scale=384:-1,tile=8x16" -frames:v 1 out/marka/film-v33-72-kontak.png
npm run elestiri -- out/marka/film-169-v33-72.mp4
```
(Klipteki n, filmde 560 + n'dir.) Karelere Read ile bak ve doğrula:
1. **Studio girişi (n40–100):** tabla dönüyor, kamera Studio yığınına iniyor; Dönüş metni çıkıyor; "01 STUDIO" kilidi haptan kareye geliyor; blok ve Atölye yığını soluk.
2. **Studio etiketleri (n150):** dil / konuşma / işitme çipleri mavi noktalı, çizgiler yığına bağlı; başlık sütununa girmiyor.
3. **Kart açılışı (n190–230):** üst kâğıt yığından küçük ve dönük çıkıp Artikülasyon kâğıdına açılıyor; kâğıdın görselleri (robot, roket, radyo…) okunur; arkada iki kart görünür; "Hedef sesi seç; …" üç satır.
4. **Kart etiketleri ve deste (n260–330):** "hedef ses: /r/" ve "görseliyle kelimeler" karta bağlı; v48'de öndeki kart dönüp kayboluyor, Sosyal Hikaye öne; v50'de Öğrenme Kartı öne; araçlar satırı görünür.
5. **Atölye girişi (n380–420):** tabla ikinci kez dönüyor; Studio kartları çıkıyor; kamera Atölye yığınına (sol-orta); "02 ATÖLYE" kilidi; kitle ve MEB satırı (tam ad) görünür, taşmıyor.
6. **Basamaklar (n460–520):** modül → bölüm → hedef 3.1.2 çipleri sarı noktalı, sırayla iniyor, aralarında noktalı bağlar.
7. **Taslak (n560–620):** üst kâğıt seans planı taslağına açılıyor; TASLAK damgası v65'te vuruyor; "Hedefini seç; …" ve "Son söz her zaman senin."; kart etiketleri.
8. **Son (n700–745):** araçlar satırı; hiçbir öğe kadraj dışına taşmıyor; metinler üst üste binmiyor.
Eleştiri: donuk an yok; sayfa, tık ve tok sesleri vuruşlarda.
Bir madde tutmazsa ilgili değeri (`moduller.ts` yerleri/zamanları, `filmDurumu.ts` kamera) düzelt, testleri ve render'ı yeniden koş, raporla.
- [ ] **Step 5: Commit** — `feat(promo/marka): Studio ve Atölye sahnesi (v33–72)`

## Plan 3C'ye devredilenler
- Çocuk (v73–88): tabla −360°, kamera genel plana; modül yığınları incelip F10 yerlerine (`(−1.6, 1.5)` Studio, `(1.5, −1.6)` Atölye) kayar; soluklaştırma kalkar; hedef etiketleri modül renkleriyle döner; "VAKTİN ÇOCUĞA KALSIN."
- Atölye kartı ve damgası v73'te çıkar (bu planda hazır); Atölye yığını v73+12'de yeniden 8.
