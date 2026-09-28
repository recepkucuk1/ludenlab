# LudenLab Marka Filmi · Plan 3A: Film İskeleti, Yük ve Dönüş (v1–32)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 60 saniyelik 16:9 filmin sürekli sahnesini (`MarkaFilmi169`) kurmak ve ilk 32 vuruşunu (Kanca + Yük + Dönüş, 0:00–0:19,2) efektleriyle çalışır hale getirmek: desteler vuruşta yığınlara iner, ön yığın bloğu örter; tabla −90° döner, kâğıtlar iki modül yığınına uçar, künye gelir.

**Architecture:** Açılıştaki düzen filme genişler: `filmDurumu(f)` (saf, node testli) tüm sahneyi tek durum nesnesi olarak üretir; `FilmSahnesi` onu çizer. Kanca kareleri `acilisDurumu`'ndan birebir türetilir (onaylı açılış filmde aynen görünür). Kâğıt akışı (`kagitAkisi.ts`) ayrı saf modül; zaman anahtarları `izlek.ts` ile; vuruşlar `olaylar.ts`'te tek kaynak (görüntü + efekt).

**Tech Stack:** Remotion 4.0.484, React 19, TypeScript (`node --test`, Node 24 tip ayıklaması), sistem ffmpeg, Python PIL (doğrulama).

**Spec:** `docs/superpowers/specs/2026-09-28-ludenlab-marka-filmi-design.md` ("1 · Yük", "2 · Dönüş", "Görsel dil", "Ses")
**Önceki:** Plan 2 bitti (8822fe3, 85 test). Kullanıcı gece "her şeyi bitir" dedi: onay kapıları öz-denetim olarak işler, kararlar raporlanır.

## Tasarım kararları (bu plan)

- **Tabla negatif yönde döner** (Plan 1 incelemesi): +y yüzündeki yüz Dönüş (−90°) ve Çocuk (−360°) bölümlerinde görünür.
- **Modül yığınları dünya koordinatında sabit:** Studio `(1.2, −1.25)`, Atölye `(1.25, 1.2)`. Tabla −180°'deyken Studio, −270°'deyken Atölye ekranın sol-orta odağına gelir (Plan 3B).
- **Yük desteleri** (her vuruşta bir deste, desteler büyür): S1 11, S2 12, S3 14, S4 21 kâğıt; S4 öndedir ve v22'de bloğu örter. Etiketli 7 deste (sol/sağ dönüşümlü).
- **Dönüş:** Studio ← S3 + S1 (25 kâğıt), Atölye ← S4 + S2 (33 kâğıt); kâğıtlar v25+2 → v28 arasında yayılarak kalkar, 14 karede yay çizerek uçar; modül yığını 8 kâğıda kadar büyür.
- **Metin:** Kanca metni v9'da çıkar (rehber: bulanıklaşıp derinliğe kaçma); Yük başlığı 88 px (12 karakterlik "HER MATERYAL" tablaya değmesin).

## Kurallar (tüm görevler)

- Çalışma dizini: `/Users/recepkucuk/ludenlab/.claude/worktrees/ludenlab-marka-filmi/promo` (dal `claude/ludenlab-marka-filmi`). Ana checkout'a dokunma. Push yok.
- `src/marka/` içi göreli içe aktarmalar uzantılı; yalnız silinebilir TS sözdizimi; `Root.tsx` uzantısız içe aktarır. macOS büyük/küçük harf duyarsız: yeni dosya adları mevcutlarla (uzantısız hâlleriyle) çakışmasın.
- Node testleri `remotion`'dan `interpolate`/`Easing` içe aktarabilir; `.tsx` node testine girmez.
- Ücretli betik çalıştırma (`npm run tts`, `npm run marka:tts`).
- Commit: Türkçe; `Co-Authored-By` satırı ajanın kendi sistem hatırlatmasındaki satır. Push yok.
- Başlangıç: 85 test.

## Dosya haritası

| Dosya | Durum | Sorumluluk |
|---|---|---|
| `src/marka/zaman.ts` | değişir | toplamlar `kare()` üzerinden |
| `src/marka/metin.ts` | değişir | Yük alt cümlesi ve Dönüş cümlesinde satır kırılımı (`\n`) |
| `src/marka/izlek.ts` | yeni | anahtar kareli geçiş (kamera, tabla, itme) |
| `src/marka/olaylar.ts` | değişir | `YUK`, `DONUS`, yeni ses olayları |
| `scripts/lib/sfx.ts` | değişir | `kagit` ve `donus` sesleri |
| `src/marka/kagitAkisi.ts` | yeni | Yük desteleri + Dönüş uçuşu → çizilecek kâğıt grupları |
| `src/marka/yazi.tsx` | değişir | `MetinBlogu`, `Cikis`; `Baslik`/`UstCumle` ona dayanır |
| `src/marka/sahne3b.tsx` | değişir | `KagitListesi` (`KagitYigini` ona dayanır) |
| `src/marka/yerlesim.ts` | değişir | `YUK_CIP_YERI` |
| `src/marka/filmDurumu.ts` | yeni | kare → film durumu (v1–32) |
| `src/marka/FilmSahnesi.tsx` | yeni | film durumu → kare |
| `src/marka/MarkaFilmi.tsx` | yeni | `MarkaFilmi169` kompozisyonu |
| `src/Root.tsx`, `package.json` | değişir | kayıt, `marka:film` |
| `tests/marka-izlek.test.ts`, `tests/marka-kagit-akisi.test.ts`, `tests/marka-film.test.ts` | yeni | birim testler |

---

### Task 1: Toplamlar `kare()` üzerinden (`zaman.ts`)

**Neden:** Başka BPM'li bir müzik gelirse vuruş başına kare kesirli olur; toplam ve bölüm süreleri `kare()`'nin yuvarlamasıyla tutarlı kalmalı (Plan 1 incelemesi).

**Files:** Modify `promo/src/marka/zaman.ts`; Test `promo/tests/marka-zaman.test.ts`

- [ ] **Step 1: Başarısız testi yaz** — `tests/marka-zaman.test.ts` sonuna ekle:
```ts
test("bölümler kare düzeyinde bitişik ve toplamı toplamKare", () => {
  for (const liste of [BOLUMLER_169, BOLUMLER_916]) {
    let bas = 0;
    for (const b of liste) {
      const { from, durationInFrames } = bolumKare(b);
      assert.equal(from, bas, b.id);
      assert.ok(Number.isInteger(durationInFrames), b.id);
      bas = from + durationInFrames;
    }
    assert.equal(bas, toplamKare(liste));
  }
});
```
Run: `node --test tests/marka-zaman.test.ts` → mevcut kodla da GEÇER (100 BPM'de 18 tam sayı). Bu bir koruma testidir; Step 2'deki değişiklik davranışı değiştirmez.

- [ ] **Step 2: Uygula** — `toplamKare` ve `bolumKare`'yi şununla değiştir:
```ts
export const toplamKare = (b: Bolum[]) => kare(b[b.length - 1].son + 1);
export const bolumKare = (b: Bolum) => ({ from: kare(b.ilk), durationInFrames: kare(b.son + 1) - kare(b.ilk) });
```
- [ ] **Step 3:** `npm test && npm run typecheck` → `ℹ pass 86`, `ℹ fail 0`; tsc temiz.
- [ ] **Step 4: Commit** — `refactor(promo/marka): bölüm süreleri kare() yuvarlamasıyla`

---

### Task 2: Satır kırılımları (`metin.ts`)

**Files:** Modify `promo/src/marka/metin.ts`, `promo/tests/marka-metin.test.ts`

- [ ] **Step 1: Başarısız testi yaz** — `tests/marka-metin.test.ts` sonuna:
```ts
test("çok satırlı cümleler satır satır verilir", () => {
  assert.deepEqual(METIN.yuk.ekran[0].split("\n"), ["Evrak büyüdükçe masada", "çocuğa yer kalmıyor."]);
  assert.deepEqual(METIN.donus.ekran[0].split("\n"), ["Bu yükü tek başına", "taşımak zorunda", "değilsin."]);
});
```
Run → FAIL (satır kırılımı yok).

- [ ] **Step 2: Uygula** — `metin.ts`'te iki satırı değiştir:
  - `yuk.ekran`: `["Evrak büyüdükçe masada\nçocuğa yer kalmıyor."]`
  - `donus.ekran[0]`: `"Bu yükü tek başına\ntaşımak zorunda\ndeğilsin."`
  (Diğer metinler ve `vo` aynı. İçerik denetimi `kat()` ile boşlukları katladığı için etkilenmez.)
- [ ] **Step 3:** `npm test && npm run typecheck` → `ℹ pass 87`.
- [ ] **Step 4: Commit** — `feat(promo/marka): Yük ve Dönüş cümlelerinde satır kırılımı`

---

### Task 3: Anahtar kareli geçiş (`izlek.ts`)

**Files:** Create `promo/src/marka/izlek.ts`; Test `promo/tests/marka-izlek.test.ts`

- [ ] **Step 1: Başarısız testi yaz** — `tests/marka-izlek.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { Easing } from "remotion";
import { izlek } from "../src/marka/izlek.ts";

test("anahtarlardan önce ilk, sonra son değer; anahtarlarda tam değer", () => {
  const z = izlek([{ f: 10, d: 1 }, { f: 20, d: 3 }, { f: 30, d: 0 }]);
  assert.equal(z(0), 1);
  assert.equal(z(10), 1);
  assert.equal(z(20), 3);
  assert.equal(z(30), 0);
  assert.equal(z(99), 0);
  assert.equal(z(15), 2);
});

test("parçanın eğrisi bitiş anahtarında verilir", () => {
  const z = izlek([{ f: 0, d: 0 }, { f: 10, d: 1, e: Easing.in(Easing.quad) }]);
  assert.ok(Math.abs(z(5) - 0.25) < 1e-9);
});

test("artmayan anahtarlar reddedilir", () => {
  assert.throws(() => izlek([{ f: 5, d: 0 }, { f: 5, d: 1 }]));
  assert.throws(() => izlek([]));
});
```
Run → FAIL (modül yok).

- [ ] **Step 2: Uygula** — `src/marka/izlek.ts`:
```ts
import { interpolate } from "remotion";

/** Anahtar kare: f karesinde değer d; bir önceki anahtardan buraya e eğrisiyle gelinir (varsayılan doğrusal). */
export type Anahtar = { f: number; d: number; e?: (t: number) => number };

/** Parça parça geçiş: ilk anahtardan önce ilk değer, sondan sonra son değer. Anahtarlar f'ye göre kesin artan olmalı. */
export const izlek = (anahtarlar: Anahtar[]) => {
  if (anahtarlar.length === 0) throw new Error("izlek: anahtar yok");
  for (let i = 1; i < anahtarlar.length; i++) {
    if (!(anahtarlar[i].f > anahtarlar[i - 1].f)) throw new Error(`izlek: anahtarlar artan değil (${anahtarlar[i].f})`);
  }
  return (f: number): number => {
    if (f <= anahtarlar[0].f) return anahtarlar[0].d;
    for (let i = 1; i < anahtarlar.length; i++) {
      const a = anahtarlar[i - 1];
      const b = anahtarlar[i];
      if (f <= b.f) return interpolate(f, [a.f, b.f], [a.d, b.d], { easing: b.e ?? ((t) => t) });
    }
    return anahtarlar[anahtarlar.length - 1].d;
  };
};
```
- [ ] **Step 3:** `node --test tests/marka-izlek.test.ts` → `ℹ pass 3`; `npm test && npm run typecheck` → `ℹ pass 90`.
- [ ] **Step 4: Commit** — `feat(promo/marka): anahtar kareli geçiş (izlek)`

---

### Task 4: Yük ve Dönüş olayları (`olaylar.ts`)

**Files:** Modify `promo/src/marka/olaylar.ts`, `promo/tests/marka-olaylar.test.ts`, `promo/tests/marka-metin.test.ts`

- [ ] **Step 1: Testleri yaz**

`tests/marka-olaylar.test.ts`: içe aktarmayı `import { DONUS, KANCA, SESLER_169, YUK } from "../src/marka/olaylar.ts";` yap. "kanca: whoosh inişte biter…" testindeki tık satırını Kanca'yla sınırla:
```ts
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "tik" && s.vurus <= 8).map((s) => s.vurus), [...KANCA.etiketler]);
```
ve dosya sonuna ekle:
```ts
test("yük: v9–22 her vuruşta bir deste; son yığınlar 11/12/14/21", () => {
  assert.deepEqual(YUK.desteler.map((d) => d.vurus), [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
  const toplam = (id: string) => YUK.desteler.filter((d) => d.yigin === id).reduce((s, d) => s + d.adet, 0);
  assert.deepEqual(["S1", "S2", "S3", "S4"].map(toplam), [11, 12, 14, 21]);
  assert.equal(YUK.desteler.filter((d) => d.etiket).length, 7);
});

test("yük: her deste inişinde kâğıt sesi", () => {
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "kagit").map((s) => s.vurus), YUK.desteler.map((d) => d.vurus));
});

test("dönüş: tabla sesi v25'te 2 vuruş; yerleşme tıkları ve künye tıkı", () => {
  const d = SESLER_169.filter((s) => s.tur === "donus");
  assert.deepEqual(d.map((s) => [s.vurus, s.vurusSure]), [[DONUS.tabla, 2]]);
  assert.deepEqual(SESLER_169.filter((s) => s.tur === "tik" && s.vurus > 8).map((s) => s.vurus), [...DONUS.yerlesme, DONUS.kunye]);
});

test("yük ve dönüş vuruşları kendi bölümlerinde", () => {
  const b = (id: string) => BOLUMLER_169.find((x) => x.id === id)!;
  for (const v of [YUK.baslik, YUK.altCumle, ...YUK.desteler.map((d) => d.vurus)]) assert.ok(v >= b("yuk").ilk && v <= b("yuk").son, `${v}`);
  for (const v of [DONUS.tabla, DONUS.cumle, DONUS.kunye, ...DONUS.cipler, ...DONUS.yerlesme]) assert.ok(v >= b("donus").ilk && v <= b("donus").son, `${v}`);
});
```

`tests/marka-metin.test.ts`: içe aktarmaya `import { YUK } from "../src/marka/olaylar.ts";` ekle; `tumMetin`'i Yük etiketlerini de tarayacak şekilde değiştir:
```ts
const tumMetin = Object.values(METIN)
  .flatMap((m) => [...m.baslik, ...m.ekran, m.vo])
  .concat(HEDEFLER.map((h) => h.metin))
  .concat(YUK.desteler.flatMap((d) => (d.etiket ? [d.etiket] : [])));
```
Run: `node --test tests/marka-olaylar.test.ts` → FAIL (`YUK` yok).

- [ ] **Step 2: Uygula** — `src/marka/olaylar.ts`'in tamamı:
```ts
// Vuruş olayları: görüntü (acilisDurumu.ts, filmDurumu.ts) ve efekt izi (scripts/lib/sfx.ts) aynı sayıları okur.

export type SesTuru = "whoosh" | "tok" | "tik" | "kagit" | "donus";
/** vurus: 1'den sayılır; vurusSure: whoosh ve dönüş gibi süreli seslerin vuruş cinsinden uzunluğu. */
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

export type YiginId = "S1" | "S2" | "S3" | "S4";
/** Bir deste: vuruşunda yığınına iner; etiketliyse o vuruşta adı görünür. */
export type Deste = { vurus: number; yigin: YiginId; adet: number; etiket?: string };

/** Yük (v9–24, spec "1 · Yük"): her vuruşta bir deste; desteler büyür, ön yığın (S4) v22'de bloğu örter. */
export const YUK: { baslik: number; altCumle: number; desteler: readonly Deste[] } = {
  baslik: 9,
  altCumle: 19,
  desteler: [
    { vurus: 9, yigin: "S3", adet: 2, etiket: "seans planı" },
    { vurus: 10, yigin: "S1", adet: 2 },
    { vurus: 11, yigin: "S2", adet: 3, etiket: "BEP" },
    { vurus: 12, yigin: "S4", adet: 3 },
    { vurus: 13, yigin: "S3", adet: 3, etiket: "çalışma kâğıdı" },
    { vurus: 14, yigin: "S1", adet: 4 },
    { vurus: 15, yigin: "S2", adet: 4, etiket: "veli mektubu" },
    { vurus: 16, yigin: "S4", adet: 4 },
    { vurus: 17, yigin: "S3", adet: 5, etiket: "hedef takibi" },
    { vurus: 18, yigin: "S1", adet: 5 },
    { vurus: 19, yigin: "S2", adet: 5, etiket: "ev ödevi" },
    { vurus: 20, yigin: "S4", adet: 6 },
    { vurus: 21, yigin: "S3", adet: 4, etiket: "rapor" },
    { vurus: 22, yigin: "S4", adet: 8 },
  ],
};

/** Dönüş (v25–32, spec "2 · Dönüş"). */
export const DONUS = {
  /** Tabla −90° döner, kamera nefes alır, kâğıtlar kalkar. */
  tabla: 25,
  /** "Bu yükü tek başına…" satır satır. */
  cumle: 26,
  /** Kâğıtlar modül yığınlarına oturdukça tık. */
  yerlesme: [26, 27, 28],
  /** Künye (logo + adres) gelir. */
  kunye: 29,
  /** "01 Studio", "02 Atölye" çipleri. */
  cipler: [29, 30],
} as const;

const olaylar: SesOlayi[] = [
  { vurus: KANCA.dusus, tur: "whoosh", vurusSure: KANCA.inis - KANCA.dusus },
  { vurus: KANCA.inis, tur: "tok" },
  ...KANCA.etiketler.map((vurus): SesOlayi => ({ vurus, tur: "tik" })),
  ...YUK.desteler.map((d): SesOlayi => ({ vurus: d.vurus, tur: "kagit" })),
  { vurus: DONUS.tabla, tur: "donus", vurusSure: 2 },
  ...DONUS.yerlesme.map((vurus): SesOlayi => ({ vurus, tur: "tik" })),
  { vurus: DONUS.kunye, tur: "tik" },
];

/** 16:9 ses olayları, vuruş sırasıyla (kararlı sıralama: aynı vuruştakiler listedeki sırayı korur). */
export const SESLER_169: SesOlayi[] = [...olaylar].sort((a, b) => a.vurus - b.vurus);
```
- [ ] **Step 3:** `npm test && npm run typecheck`. Beklenen: olaylar ve metin testleri geçer. **`tests/sfx.test.ts` şimdi kırılır** (sfx.ts yeni türleri bilmiyor → `bilinmeyen ses: kagit`). Bu beklenen; Task 5 düzeltir. Başka kırmızı varsa DUR.
- [ ] **Step 4: Commit** — `feat(promo/marka): Yük desteleri ve Dönüş olayları` (sfx testi kırmızıyken commit etmek yerine Task 5 ile birlikte commit etmek istersen, bu adımı Task 5'in commit'ine birleştir ve raporda belirt.)

---

### Task 5: Kâğıt ve dönüş sesleri (`scripts/lib/sfx.ts`)

**Files:** Modify `promo/scripts/lib/sfx.ts`, `promo/tests/sfx.test.ts`

- [ ] **Step 1: Testleri güncelle** — `tests/sfx.test.ts`:
  - "her tık vuruşunda duyulur, öncesi sessiz" testinde filtreyi Kanca'yla sınırla: `SESLER_169.filter((s) => s.tur === "tik" && s.vurus <= 8)`.
  - Dosya sonuna ekle:
```ts
test("kâğıt sesleri deste vuruşlarında duyulur", () => {
  for (const s of SESLER_169.filter((s) => s.tur === "kagit")) {
    const t0 = saniye(s.vurus);
    assert.ok(rms(t0, t0 + 0.05) > 4 * rms(t0 - 0.2, t0 - 0.05), `v${s.vurus}`);
  }
});

test("tabla dönüş sesi ortasında en güçlü (yükselip alçalır)", () => {
  const s = SESLER_169.find((s) => s.tur === "donus")!;
  const t0 = saniye(s.vurus), sure = (s.vurusSure ?? 1) * (60 / BPM);
  const orta = rms(t0 + sure * 0.4, t0 + sure * 0.6);
  assert.ok(orta > 3 * rms(t0, t0 + sure * 0.08), "baş");
  assert.ok(orta > 3 * rms(t0 + sure * 0.92, t0 + sure), "son");
});
```
Run → FAIL (`bilinmeyen ses: kagit`).

- [ ] **Step 2: Uygula** — `scripts/lib/sfx.ts`'te `tik` tanımından sonra iki üretici ekle:
```ts
  // Kâğıt destesi inişi: kesimi hızla düşen kısa hışırtı + hafif gövde.
  const kagit = () => {
    let lp = 0;
    return uret(0.22, (t) => {
      const kesim = 300 + 1800 * Math.exp(-t * 18);
      const a = 1 - Math.exp((-2 * Math.PI * kesim) / sr);
      lp += a * (gurultu() - lp);
      const hisirti = lp * Math.exp(-t * 22) * 0.9;
      const govde = Math.sin(2 * Math.PI * 140 * t) * Math.exp(-t * 35) * 0.25;
      return hisirti + govde;
    });
  };
  // Tabla dönüşü: yükselip alçalan yumuşak hava sesi (LudenMain "gecis").
  const donus = (sn: number) => {
    let lp = 0;
    return uret(sn, (t) => {
      const u = t / sn;
      const kesim = 400 + 2200 * Math.sin(Math.PI * u);
      const a = 1 - Math.exp((-2 * Math.PI * kesim) / sr);
      lp += a * (gurultu() - lp);
      return 0.32 * Math.pow(Math.sin(Math.PI * u), 2) * lp;
    });
  };
```
ve `switch`'e iki `case` ekle (`default`'tan önce):
```ts
      case "kagit":
        ekle(t0, kagit());
        break;
      case "donus":
        ekle(t0, donus((s.vurusSure ?? 1) * vurusSn));
        break;
```
- [ ] **Step 3:** `node --test tests/sfx.test.ts` → hepsi geçer (7). "tok inişte güçlü bir darbe" testi kırılırsa (kâğıt seslerinin tepesi toku geçtiyse) DUR ve ölçtüğün tepe değerlerini raporla; eşiği kendin değiştirme.
- [ ] **Step 4:** `npm test && npm run typecheck` → `ℹ fail 0`. `npm run marka:sfx` → `(24 olay, 100 BPM, 18.8 sn)`.
- [ ] **Step 5: Commit** — `feat(promo/marka): kâğıt ve tabla dönüş sesleri`

---

### Task 6: Kâğıt akışı (`kagitAkisi.ts`)

**Files:** Create `promo/src/marka/kagitAkisi.ts`; Test `promo/tests/marka-kagit-akisi.test.ts`

- [ ] **Step 1: Başarısız testi yaz** — `tests/marka-kagit-akisi.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { DUSUS_KARE, KAGIT_T, MODUL_ADET, MODUL_YERI, YIGIN_YERI, inmisAdet, kagitSahnesi } from "../src/marka/kagitAkisi.ts";
import { DONUS, YUK, type YiginId } from "../src/marka/olaylar.ts";
import { kare } from "../src/marka/zaman.ts";

const IDLER: YiginId[] = ["S1", "S2", "S3", "S4"];
const yer = (g: { p: number[] }, p: readonly number[]) => g.p[0] === p[0] && g.p[1] === p[1];
const modulAdet = (f: number) =>
  kagitSahnesi(f)
    .filter((g) => yer(g, MODUL_YERI.studio) || yer(g, MODUL_YERI.atolye))
    .reduce((s, g) => s + g.kagitlar.length, 0);

test("Yük başlamadan tablada kâğıt yok", () => {
  assert.equal(kagitSahnesi(kare(YUK.baslik) - DUSUS_KARE).length, 0);
});

test("Yük sonunda yığınlar 11/12/14/21", () => {
  assert.deepEqual(IDLER.map((id) => inmisAdet(id, kare(24))), [11, 12, 14, 21]);
});

test("deste tam vuruşunda iner; bir kare önce yığının üstünde havada", () => {
  for (const d of YUK.desteler) {
    const v = kare(d.vurus);
    const once = inmisAdet(d.yigin, v - 1);
    assert.equal(inmisAdet(d.yigin, v) - once, d.adet, `v${d.vurus}`);
    const g = kagitSahnesi(v - 1).find((g) => yer(g, YIGIN_YERI[d.yigin]))!;
    assert.equal(g.kagitlar.length, once + d.adet, `v${d.vurus}`);
    assert.ok(g.kagitlar[once].z0 > once * KAGIT_T + 1e-6, `v${d.vurus}`);
  }
});

test("dönüş sonunda kaynaklar boş, iki modül yığını 8'er, havada kâğıt yok", () => {
  const g = kagitSahnesi(kare(DONUS.yerlesme[DONUS.yerlesme.length - 1]));
  assert.equal(g.length, 2);
  for (const m of g) assert.equal(m.kagitlar.length, MODUL_ADET);
});

test("dönüşte uçan kâğıtlar yay çizer", () => {
  const f = kare(DONUS.tabla) + 2 + 7;
  const ucanlar = kagitSahnesi(f).filter((g) => g.kagitlar.length === 1 && !g.kagitlar[0].ust && g.kagitlar[0].sekme === null);
  assert.ok(ucanlar.length > 0);
  assert.ok(ucanlar.some((g) => g.p[2] > 1.2));
});

test("dönüşte modül yığınları yalnız büyür, kaynaklar yalnız küçülür", () => {
  let oncekiModul = 0;
  let oncekiKaynak = Infinity;
  for (let f = kare(DONUS.tabla); f <= kare(29); f++) {
    const m = modulAdet(f);
    const k = kagitSahnesi(f).filter((g) => IDLER.some((id) => yer(g, YIGIN_YERI[id]))).reduce((s, g) => s + g.kagitlar.length, 0);
    assert.ok(m >= oncekiModul, `modül f=${f}`);
    assert.ok(k <= oncekiKaynak, `kaynak f=${f}`);
    oncekiModul = m;
    oncekiKaynak = k;
  }
});
```
Run → FAIL (modül yok).

- [ ] **Step 2: Uygula** — `src/marka/kagitAkisi.ts`:
```ts
import { Easing } from "remotion";
import { dikdortgenTaban, type V2, type V3 } from "./izometri.ts";
import { yigin, type Kagit } from "./nesneler.ts";
import { DONUS, YUK, type YiginId } from "./olaylar.ts";
import { RENK } from "./tema.ts";
import { kare } from "./zaman.ts";

// Yük ve Dönüş'ün kâğıtları. Yük: desteler vuruşunda yığınlara iner. Dönüş: kâğıtlar iki modül yığınına uçar.
// Saf: kare → çizilecek kâğıt grupları (her grup derinlik sıralamasında tek öğe). Yığınlar önek-kararlıdır:
// aynı tohumla fazla kâğıt üretmek alttakileri kıpırdatmaz, bu yüzden her kare yığın baştan üretilir.

export const KAGIT_T = 0.1;
const KAGIT_W = 1.25;
const KAGIT_D = 0.9;

/** Yük yığınlarının dünya yeri (Yük boyunca tabla dönmez). S4 önde: büyüyünce bloğu örter. */
export const YIGIN_YERI: Record<YiginId, V2> = { S1: [-1.45, -1.45], S2: [1.35, -1.35], S3: [-1.35, 1.35], S4: [1.1, 1.1] };
const TOHUM: Record<YiginId, number> = { S1: 3, S2: 5, S3: 7, S4: 9 };
/** Deste bu kadar karede, yığının DUSUS_Z birim üstünden ivmeyle düşer; tam vuruşta iner. */
export const DUSUS_KARE = 9;
export const DUSUS_Z = 3;

export type ModulId = "studio" | "atolye";
/** Modül yığınlarının dünya yeri: tabla −180°'de Studio, −270°'de Atölye ekranda sol-orta odağa gelir. */
export const MODUL_YERI: Record<ModulId, V2> = { studio: [1.2, -1.25], atolye: [1.25, 1.2] };
export const MODUL_ADET = 8;
const MODUL_KAYNAK: Record<ModulId, [YiginId, YiginId]> = { studio: ["S3", "S1"], atolye: ["S4", "S2"] };
export const MODUL_SEKME: Record<ModulId, string> = { studio: RENK.studio, atolye: RENK.atolye };
export const MODUL_TOHUM: Record<ModulId, number> = { studio: 21, atolye: 23 };
/** Bir kâğıdın uçuşu; kalkışlar Dönüş'ün 2. karesinden son yerleşme vuruşuna UCUS_KARE kala biter. */
export const UCUS_KARE = 14;

/** f karesine kadar yığına inmiş kâğıt sayısı. */
export const inmisAdet = (id: YiginId, f: number) =>
  YUK.desteler.filter((d) => d.yigin === id && kare(d.vurus) <= f).reduce((s, d) => s + d.adet, 0);

const yukYigini = (id: YiginId, adet: number) => yigin({ cx: YIGIN_YERI[id][0], cy: YIGIN_YERI[id][1], adet, tohum: TOHUM[id], t: KAGIT_T });

/** Modül yığını (Dönüş sonrasında da kullanılır): hizalı, üst kâğıtta modül sekmesi. */
export const modulYigini = (m: ModulId, adet: number) =>
  yigin({ cx: MODUL_YERI[m][0], cy: MODUL_YERI[m][1], adet, tohum: MODUL_TOHUM[m], sapma: 0.02, sekme: MODUL_SEKME[m], t: KAGIT_T });

type Kalkis = { id: YiginId; indeks: number; kare: number };

/** Kaynak kâğıtların kalkış sırası: iki kaynak yığının tepesinden dönüşümlü; kareler eşit aralıkla yayılır. */
const kalkislar = (m: ModulId): Kalkis[] => {
  const yukSonu = kare(YUK.desteler[YUK.desteler.length - 1].vurus);
  const kuyruk = (id: YiginId) => {
    const n = inmisAdet(id, yukSonu);
    return Array.from({ length: n }, (_, i) => n - 1 - i);
  };
  const [a, b] = MODUL_KAYNAK[m];
  const qa = kuyruk(a);
  const qb = kuyruk(b);
  const sira: { id: YiginId; indeks: number }[] = [];
  while (qa.length || qb.length) {
    if (qa.length) sira.push({ id: a, indeks: qa.shift()! });
    if (qb.length) sira.push({ id: b, indeks: qb.shift()! });
  }
  const bas = kare(DONUS.tabla) + 2;
  const bit = kare(DONUS.yerlesme[DONUS.yerlesme.length - 1]) - UCUS_KARE;
  const n = sira.length;
  return sira.map((s, j) => ({ ...s, kare: bas + (n === 1 ? 0 : (j * (bit - bas)) / (n - 1)) }));
};
const KALKIS: Record<ModulId, Kalkis[]> = { studio: kalkislar("studio"), atolye: kalkislar("atolye") };

const merkezVeAci = (k: Kagit): { c: V2; aci: number } => {
  const [c0, c1, c2] = k.taban;
  return { c: [(c0[0] + c2[0]) / 2, (c0[1] + c2[1]) / 2], aci: Math.atan2(c1[1] - c0[1], c1[0] - c0[0]) };
};

export type KagitGrubu = { p: V3; kagitlar: Kagit[] };

/** f karesinde çizilecek kâğıt grupları: Yük yığınları (+ düşen deste), modül yığınları, uçan kâğıtlar. */
export const kagitSahnesi = (f: number): KagitGrubu[] => {
  const gruplar: KagitGrubu[] = [];
  const kalkan = new Map<YiginId, number>();
  for (const m of ["studio", "atolye"] as const) {
    for (const k of KALKIS[m]) if (k.kare <= f) kalkan.set(k.id, (kalkan.get(k.id) ?? 0) + 1);
  }

  for (const id of ["S1", "S2", "S3", "S4"] as const) {
    const inen = inmisAdet(id, f);
    const kalan = inen - (kalkan.get(id) ?? 0);
    const kagitlar: Kagit[] = kalan > 0 ? yukYigini(id, kalan).kagitlar : [];
    const dusen = YUK.desteler.find((d) => d.yigin === id && f > kare(d.vurus) - DUSUS_KARE && f < kare(d.vurus));
    if (dusen) {
      const u = (f - (kare(dusen.vurus) - DUSUS_KARE)) / DUSUS_KARE;
      const dz = DUSUS_Z * (1 - u * u);
      kagitlar.push(...yukYigini(id, inen + dusen.adet).kagitlar.slice(inen).map((k) => ({ ...k, z0: k.z0 + dz })));
    }
    if (kagitlar.length) gruplar.push({ p: [YIGIN_YERI[id][0], YIGIN_YERI[id][1], 0], kagitlar });
  }

  for (const m of ["studio", "atolye"] as const) {
    const liste = KALKIS[m];
    const varan = liste.filter((k) => k.kare + UCUS_KARE <= f).length;
    const adet = Math.ceil((MODUL_ADET * varan) / liste.length);
    const [mx, my] = MODUL_YERI[m];
    if (adet > 0) gruplar.push({ p: [mx, my, 0], kagitlar: modulYigini(m, adet).kagitlar });
    for (const k of liste) {
      if (f < k.kare || f >= k.kare + UCUS_KARE) continue;
      const u = (f - k.kare) / UCUS_KARE;
      const e = Easing.inOut(Easing.cubic)(u);
      const kaynak = yukYigini(k.id, k.indeks + 1).kagitlar[k.indeks];
      const { c, aci } = merkezVeAci(kaynak);
      const hedefZ = adet * KAGIT_T;
      const cx = c[0] + (mx - c[0]) * e;
      const cy = c[1] + (my - c[1]) * e;
      const z = kaynak.z0 + (hedefZ - kaynak.z0) * e + 1.2 * Math.sin(Math.PI * u);
      gruplar.push({
        p: [cx, cy, z],
        kagitlar: [{ taban: dikdortgenTaban(cx, cy, KAGIT_W, KAGIT_D, aci * (1 - e)), z0: z, h: KAGIT_T, ust: false, sekme: null }],
      });
    }
  }
  return gruplar;
};
```
- [ ] **Step 3:** `node --test tests/marka-kagit-akisi.test.ts` → `ℹ pass 6`. `npm test && npm run typecheck` → `ℹ fail 0`.
- [ ] **Step 4: Commit** — `feat(promo/marka): Yük desteleri ve Dönüş kâğıt uçuşu (kagitAkisi)`

---

> **Uygulama notu (inceleme sonrası, a977335):** Modül yığınları S2/S4 ile çakıştığı için Atölye'nin kaynakları (S4, S2) ilk inişten önce topluca kalkar (`bit = bas + UCUS_KARE − 1`); Atölye v26–27 arasında tamamlanır (kare 461), Studio v28'de (486). Desteler kadraj dışından düşer (`DUSUS_Z = 7`, `DUSUS_KARE = 12`). Her uçuşun sabit hedef yüksekliği var, modül sayısı son inişte 8'e ulaşır (`1 + floor(7·(varan−1)/(n−1))`), uçan kâğıt yazı çizgilerini korur. Testler: 9 (3B çakışma testi dahil). Suite: 105.

---

### Task 7: Genel metin bloğu, çıkış sarmalı, kâğıt listesi

**Files:** Modify `promo/src/marka/yazi.tsx`, `promo/src/marka/sahne3b.tsx`

- [ ] **Step 1: Referans kareleri sakla**
```bash
npm run marka:stil && cp out/marka/stil-karesi.png out/marka/ref-stil.png
npx remotion still src/index.ts MarkaAcilis169 out/marka/ref-acilis-50.png --frame=50
npx remotion still src/index.ts MarkaAcilis169 out/marka/ref-acilis-132.png --frame=132
```

- [ ] **Step 2: `yazi.tsx`: `MetinBlogu` ve `Cikis`; `Baslik` ve `UstCumle` ona dayansın**

`maske` tanımından sonra ekle:
```tsx
/** Sol sütunda satır satır metin: her satır kendi genişliğinde soldan sağa maskeyle açılır (acilis: satır başına 0–1). */
export const MetinBlogu: React.FC<{
  satirlar: string[];
  top: number;
  font: "baslik" | "govde";
  boyut: number;
  agirlik: number;
  renk: string;
  opaklik?: number;
  acilis?: number[];
}> = ({ satirlar, top, font, boyut, agirlik, renk, opaklik = 1, acilis }) => (
  <div
    style={{
      position: "absolute",
      left: TUVAL_169.sol,
      top,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      fontFamily: font === "baslik" ? FONT.baslik : FONT.govde,
      fontWeight: agirlik,
      fontSize: boyut,
      lineHeight: font === "baslik" ? 0.95 : 1.3,
      letterSpacing: font === "baslik" ? "0.005em" : undefined,
      color: renk,
      opacity: opaklik,
    }}
  >
    {satirlar.map((s, i) => (
      <div key={i} style={maske(acilis?.[i] ?? 1)}>
        {s}
      </div>
    ))}
  </div>
);

/** Çıkış (rehber: bulanıklaşıp derinliğe kaçma, 0 → 20 px, ölçek 1 → 0,9). c: 0 dokunulmaz, 1 hiç çizilmez. */
export const Cikis: React.FC<{ c: number; koken?: string; children: React.ReactNode }> = ({ c, koken = "left center", children }) => {
  if (c >= 1) return null;
  if (c <= 0) return <>{children}</>;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - c, filter: `blur(${20 * c}px)`, transform: `scale(${1 - 0.1 * c})`, transformOrigin: koken }}>
      {children}
    </div>
  );
};
```
`Baslik` ve `UstCumle`'yi şununla değiştir (görünüm birebir aynı kalır):
```tsx
/** Büyük harf başlık (Bricolage 800, teal); her eleman bir satır. acilis: satır başına açılma oranı (0–1). */
export const Baslik: React.FC<{ satirlar: string[]; top: number; boyut?: number; acilis?: number[] }> = ({ satirlar, top, boyut = 104, acilis }) => (
  <MetinBlogu satirlar={satirlar} top={top} font="baslik" boyut={boyut} agirlik={800} renk={RENK.teal} acilis={acilis} />
);

/** Başlığın üstündeki cümle (Satoshi 500); acilis: soldan sağa açılma oranı (0–1). */
export const UstCumle: React.FC<{ metin: string; top: number; acilis?: number }> = ({ metin, top, acilis = 1 }) => (
  <MetinBlogu satirlar={[metin]} top={top} font="govde" boyut={44} agirlik={500} renk={RENK.ink} opaklik={0.85} acilis={[acilis]} />
);
```

- [ ] **Step 3: `sahne3b.tsx`: `KagitListesi`**

İçe aktarmaya `type Kagit` ekle: `import { kagitCizgileri, sekmeDortgeni, type Kagit, type Yigin } from "./nesneler.ts";`. `KagitYigini`'yi şu ikisiyle değiştir:
```tsx
/** Kâğıt listesi alttan üste; ust bayraklı kâğıtta yazı çizgileri, sekmeli kâğıtta modül sekmesi. */
export const KagitListesi: React.FC<{ kagitlar: Kagit[]; k: Kamera }> = ({ kagitlar, k }) => (
  <g>
    {kagitlar.map((kg, i) => (
      <g key={i}>
        <Cisim yuzler={prizma(kg.taban, kg.z0, kg.h)} k={k} boya={BOYA.kagit} desen={false} kalinlik={CIZGI.ince} />
        {kg.ust
          ? kagitCizgileri(kg).map(([a, b], j) => {
              const [p, q] = [izd(a, k), izd(b, k)];
              return <line key={j} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={RENK.ink} strokeOpacity={0.32} strokeWidth={3} strokeLinecap="round" />;
            })
          : null}
        {kg.sekme ? <path d={yol(sekmeDortgeni(kg), k)} fill={kg.sekme} stroke={RENK.ink} strokeWidth={CIZGI.ince} strokeLinejoin="round" /> : null}
      </g>
    ))}
  </g>
);

/** Kâğıt yığını: KagitListesi'nin yığın verisiyle kullanımı. */
export const KagitYigini: React.FC<{ y: Yigin; k: Kamera }> = ({ y, k }) => <KagitListesi kagitlar={y.kagitlar} k={k} />;
```

- [ ] **Step 4: Tip denetimi ve piksel eşitliği**
```bash
npm run typecheck && npm test
npm run marka:stil
npx remotion still src/index.ts MarkaAcilis169 out/marka/yeni-acilis-50.png --frame=50
npx remotion still src/index.ts MarkaAcilis169 out/marka/yeni-acilis-132.png --frame=132
python3 -c "
from PIL import Image, ImageChops
for a,b in [('ref-stil','stil-karesi'),('ref-acilis-50','yeni-acilis-50'),('ref-acilis-132','yeni-acilis-132')]:
    x=Image.open(f'out/marka/{a}.png').convert('RGB'); y=Image.open(f'out/marka/{b}.png').convert('RGB')
    print(a, ImageChops.difference(x,y).getbbox())"
```
Expected: tsc temiz, testler yeşil, üç satır da `None`. Değilse DUR ve bildir.

- [ ] **Step 5: Commit** — `refactor(promo/marka): genel metin bloğu, çıkış sarmalı, kâğıt listesi`

---

### Task 8: Film durumu (`filmDurumu.ts`, v1–32)

**Files:** Modify `promo/src/marka/yerlesim.ts`; Create `promo/src/marka/filmDurumu.ts`; Test `promo/tests/marka-film.test.ts`

- [ ] **Step 1: `yerlesim.ts`'e Yük çiplerinin yeri** — dosya sonuna ekle (`YiginId` için `import type { YiginId } from "./olaylar.ts";` ekle):
```ts
/** Yük desteleri etiketlerinin yeri (yığın başına): S3 tablanın solunda olduğu için çipi altta ve sağ hizalı (başlığa girmesin). */
export const YUK_CIP_YERI: Record<YiginId, { x: number; y: number; hiza: "sol" | "sag" }> = {
  S1: { x: 1450, y: 190, hiza: "sol" },
  S2: { x: 1700, y: 400, hiza: "sol" },
  S3: { x: 1040, y: 900, hiza: "sag" },
  S4: { x: 1560, y: 830, hiza: "sol" },
};
```

- [ ] **Step 2: Başarısız testi yaz** — `tests/marka-film.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { acilisDurumu } from "../src/marka/acilisDurumu.ts";
import { filmDurumu } from "../src/marka/filmDurumu.ts";
import { gorunur } from "../src/marka/izometri.ts";
import { DONUS, KANCA, YUK } from "../src/marka/olaylar.ts";
import { kare } from "../src/marka/zaman.ts";

const K9 = kare(YUK.baslik);
const K25 = kare(DONUS.tabla);
const SON = kare(33) - 1;
const metin = (f: number, id: string) => filmDurumu(f).metinler.find((m) => m.id === id);

test("Kanca kareleri açılışın birebir aynısı", () => {
  for (const f of [0, 20, 36, 50, 74, 112, K9 - 1]) {
    const a = acilisDurumu(f);
    const d = filmDurumu(f);
    assert.equal(d.itme, a.kamera, `f=${f}`);
    assert.equal(d.sarsinti, a.sarsinti, `f=${f}`);
    assert.equal(d.blok.z, a.blokZ, `f=${f}`);
    assert.deepEqual(d.blok.aci, a.blokAci, `f=${f}`);
    assert.equal(d.blok.yuz, a.yuz, `f=${f}`);
    assert.equal(d.yuva, a.yuva, `f=${f}`);
    assert.equal(d.kamera.don, 0, `f=${f}`);
    assert.deepEqual(metin(f, "kanca-baslik")!.acilis, a.satirlar, `f=${f}`);
    assert.deepEqual(metin(f, "kanca-ust")!.acilis, [a.ust], `f=${f}`);
    // v9 destesinin etiketi 6 kare önceden belirir; Kanca karşılaştırması yalnız hedef etiketleri.
    const hedef = d.etiketler.filter((e) => e.id.startsWith("hedef"));
    assert.deepEqual(hedef.map((e) => e.ilerleme), a.etiketCizgi, `f=${f}`);
    assert.deepEqual(hedef.map((e) => e.gorunum), a.etiketCip, `f=${f}`);
    assert.equal(d.kunye, 0);
  }
});

test("Kanca metni ve etiketleri v9'da çıkar, Yük başlığı ardından açılır", () => {
  assert.ok(metin(K9 + 8, "kanca-baslik") === undefined);
  assert.ok(filmDurumu(K9 + 8).etiketler.every((e) => !e.id.startsWith("hedef")));
  const y = metin(K9 + 20, "yuk-baslik")!;
  assert.equal(y.acilis[0], 1);
  assert.deepEqual(y.satirlar, ["HER MATERYAL", "AYRI."]);
});

test("her etiketli deste etiketi raptiyesine deste vuruşunda varır", () => {
  for (const d of YUK.desteler.filter((d) => d.etiket)) {
    const v = kare(d.vurus);
    const e = (f: number) => filmDurumu(f).etiketler.find((x) => x.id === `deste-${d.vurus}`);
    assert.ok(e(v - 1)!.ilerleme < 1, `v${d.vurus}`);
    assert.equal(e(v)!.ilerleme, 1, `v${d.vurus}`);
    assert.equal(e(v + 30), undefined, `v${d.vurus}`);
  }
});

test("tabla v25'te −90° döner, yüz görünür kalır", () => {
  assert.equal(filmDurumu(K25).kamera.don, 0);
  const d = filmDurumu(K25 + 27);
  assert.ok(Math.abs(d.kamera.don + Math.PI / 2) < 1e-9);
  assert.ok(gorunur({ n: [0, 1, 0] }, d.kamera));
  assert.ok(Math.abs(filmDurumu(SON).kamera.don + Math.PI / 2) < 1e-9);
});

test("künye v29'da gelir; Dönüş cümlesi ve çipleri görünür", () => {
  assert.equal(filmDurumu(kare(DONUS.kunye) - 11).kunye, 0);
  assert.equal(filmDurumu(kare(DONUS.kunye)).kunye, 1);
  const d = filmDurumu(kare(31));
  assert.deepEqual(metin(kare(31), "donus-cumle")!.acilis, [1, 1, 1]);
  assert.deepEqual(d.cipler.map((c) => c.gorunum), [1, 1]);
});

test("hareket sürekli: ardışık karelerde itme ve dönüş sıçramaz, zemin hep kayar", () => {
  for (let f = 0; f < SON; f++) {
    const a = filmDurumu(f);
    const b = filmDurumu(f + 1);
    assert.ok(Math.abs(b.itme - a.itme) < 0.02, `itme f=${f}`);
    assert.ok(Math.abs(b.kamera.don - a.kamera.don) < 0.1, `don f=${f}`);
    assert.ok(b.kayma > a.kayma, `kayma f=${f}`);
  }
});

test("Kanca'da ilk vuruşlar değişmedi (KANCA sabitleri)", () => {
  assert.equal(KANCA.inis, 3);
});
```
Run → FAIL (modül yok).

- [ ] **Step 3: Uygula** — `src/marka/filmDurumu.ts`:
```ts
import { Easing, interpolate } from "remotion";
import { acilisDurumu } from "./acilisDurumu.ts";
import { izd, type Kamera, type V2, type V3 } from "./izometri.ts";
import { izlek } from "./izlek.ts";
import { KAGIT_T, YIGIN_YERI, inmisAdet, kagitSahnesi, type KagitGrubu } from "./kagitAkisi.ts";
import { HEDEFLER, METIN } from "./metin.ts";
import { DONUS, YUK } from "./olaylar.ts";
import { RENK } from "./tema.ts";
import { GENEL_KAMERA, HEDEF_YERLESIMI, YUK_CIP_YERI } from "./yerlesim.ts";
import { BOLUMLER_169, kare } from "./zaman.ts";

// Filmin tek sürekli sahnesi: kare → durum. Kanca kareleri açılışın (acilisDurumu) birebir aynısıdır;
// sonraki bölümler aynı dünyada devam eder (tabla, blok, kâğıtlar, kamera). Plan 3A: v1–32.

export type EtiketDurumu = {
  id: string;
  capa: V3;
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
};
export type CipDurumu = { id: string; x: number; y: number; metin: string; nokta?: string; gorunum: number; cikis: number };
export type FilmDurumu = {
  kamera: Kamera;
  /** Kameranın yavaş itmesi (CSS ölçeği, odak etrafında). */
  itme: number;
  odak: V2;
  sarsinti: number;
  kayma: number;
  isik: number;
  blok: { z: number; aci: V3; yuz: number };
  yuva: number;
  kagitlar: KagitGrubu[];
  etiketler: EtiketDurumu[];
  metinler: MetinDurumu[];
  cipler: CipDurumu[];
  kunye: number;
};

const ara = (f: number, a: number, b: number, easing: (t: number) => number = (t) => t) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
const cikisAri = (f: number, v: number) => ara(f, v, v + 8);

const K9 = kare(YUK.baslik);
const K25 = kare(DONUS.tabla);
const STUDIO_BAS = kare(BOLUMLER_169.find((b) => b.id === "studio")!.ilk);
const ODAK = izd([0, 0, 0.5], GENEL_KAMERA);

const tablaAcisi = izlek([
  { f: K25, d: 0 },
  { f: K25 + 27, d: -Math.PI / 2, e: Easing.inOut(Easing.cubic) },
]);
// Kanca'dan sonra: Yük boyunca itme sürer (kadraj daralır); Dönüş'te %14 geri çekilip nefes alır.
const yukDonusItmesi = izlek([
  { f: K9, d: acilisDurumu(K9).kamera },
  { f: kare(24), d: 1.07 },
  { f: K25, d: 1.07 },
  { f: K25 + 18, d: 0.93, e: Easing.inOut(Easing.cubic) },
  { f: kare(28), d: 1.0, e: Easing.inOut(Easing.cubic) },
]);

export const filmDurumu = (f: number): FilmDurumu => {
  // Kanca'nın son hâli (etiket ve metin çıkışı için); Kanca içinde tam o kare.
  const a = acilisDurumu(Math.min(f, K9 - 1));
  const kancaCikis = cikisAri(f, K9);
  const yukCikis = cikisAri(f, K25);
  const donusCikis = cikisAri(f, STUDIO_BAS);

  const etiketler: EtiketDurumu[] = [];
  if (kancaCikis < 1) {
    HEDEFLER.forEach((h, i) => {
      const y = HEDEF_YERLESIMI[i];
      etiketler.push({ id: `hedef-${i}`, capa: y.capa, x: y.x, y: y.y, hiza: y.hiza, metin: h.metin, gorunum: a.etiketCip[i], ilerleme: a.etiketCizgi[i], cikis: kancaCikis });
    });
  }
  for (const d of YUK.desteler) {
    if (!d.etiket) continue;
    const v = kare(d.vurus);
    if (f < v - 6 || f > v + 24) continue;
    const g = ara(f, v - 6, v, Easing.out(Easing.quad));
    const [cx, cy] = YIGIN_YERI[d.yigin];
    const yer = YUK_CIP_YERI[d.yigin];
    etiketler.push({
      id: `deste-${d.vurus}`,
      capa: [cx, cy, inmisAdet(d.yigin, v) * KAGIT_T],
      x: yer.x,
      y: yer.y,
      hiza: yer.hiza,
      metin: d.etiket,
      gorunum: g,
      ilerleme: g,
      cikis: ara(f, v + 18, v + 24),
    });
  }

  const metinler: MetinDurumu[] = [];
  if (kancaCikis < 1) {
    metinler.push(
      { id: "kanca-ust", satirlar: [METIN.kanca.ekran[0]], top: 400, font: "govde", boyut: 44, agirlik: 500, renk: RENK.ink, opaklik: 0.85, acilis: [a.ust], cikis: kancaCikis },
      { id: "kanca-baslik", satirlar: METIN.kanca.baslik, top: 480, font: "baslik", boyut: 104, agirlik: 800, renk: RENK.teal, opaklik: 1, acilis: a.satirlar, cikis: kancaCikis },
    );
  }
  if (f >= K9 && yukCikis < 1) {
    const K10 = kare(YUK.baslik + 1);
    metinler.push({
      id: "yuk-baslik",
      satirlar: METIN.yuk.baslik,
      top: 470,
      font: "baslik",
      boyut: 88,
      agirlik: 800,
      renk: RENK.teal,
      opaklik: 1,
      acilis: [ara(f, K9 + 6, K9 + 16, Easing.out(Easing.cubic)), ara(f, K10, K10 + 10, Easing.out(Easing.cubic))],
      cikis: yukCikis,
    });
    const alt = METIN.yuk.ekran[0].split("\n");
    const K19 = kare(YUK.altCumle);
    metinler.push({
      id: "yuk-alt",
      satirlar: alt,
      top: 660,
      font: "govde",
      boyut: 42,
      agirlik: 500,
      renk: RENK.ink,
      opaklik: 0.85,
      acilis: alt.map((_, i) => ara(f, K19 + 4 * i, K19 + 4 * i + 14, Easing.out(Easing.cubic))),
      cikis: yukCikis,
    });
  }
  const cipler: CipDurumu[] = [];
  if (f >= K25 && donusCikis < 1) {
    const satirlar = METIN.donus.ekran[0].split("\n");
    const K26 = kare(DONUS.cumle);
    metinler.push({
      id: "donus-cumle",
      satirlar,
      top: 420,
      font: "govde",
      boyut: 60,
      agirlik: 700,
      renk: RENK.teal,
      opaklik: 1,
      acilis: satirlar.map((_, i) => ara(f, K26 + 5 * i, K26 + 5 * i + 12, Easing.out(Easing.cubic))),
      cikis: donusCikis,
    });
    const [c1, c2] = DONUS.cipler.map((v) => kare(v));
    cipler.push(
      { id: "cip-studio", x: 120, y: 720, metin: METIN.donus.ekran[1], nokta: RENK.studio, gorunum: ara(f, c1 - 8, c1, Easing.out(Easing.quad)), cikis: donusCikis },
      { id: "cip-atolye", x: 120, y: 790, metin: METIN.donus.ekran[2], nokta: RENK.atolye, gorunum: ara(f, c2 - 8, c2, Easing.out(Easing.quad)), cikis: donusCikis },
    );
  }

  const kunyeKare = kare(DONUS.kunye);
  return {
    kamera: { ...GENEL_KAMERA, don: tablaAcisi(f) },
    itme: f < K9 ? a.kamera : yukDonusItmesi(f),
    odak: ODAK,
    sarsinti: a.sarsinti,
    kayma: f * 0.4,
    isik: f < K9 ? a.isik : acilisDurumu(K9).isik + 0.1 * Math.sin((2 * Math.PI * (f - K9)) / 750),
    blok: { z: a.blokZ, aci: a.blokAci, yuz: a.yuz },
    yuva: a.yuva,
    kagitlar: kagitSahnesi(f),
    etiketler,
    metinler,
    cipler,
    kunye: ara(f, kunyeKare - 10, kunyeKare),
  };
};
```
- [ ] **Step 4:** `node --test tests/marka-film.test.ts` → `ℹ pass 7`. `npm test && npm run typecheck` → `ℹ fail 0`.
- [ ] **Step 5: Commit** — `feat(promo/marka): film durumu (Kanca, Yük, Dönüş)`

---

### Task 9: Film sahnesi, kompozisyon ve ilk 32 vuruşun render'ı

**Files:** Create `promo/src/marka/FilmSahnesi.tsx`, `promo/src/marka/MarkaFilmi.tsx`; Modify `promo/src/Root.tsx`, `promo/package.json`

- [ ] **Step 1: `FilmSahnesi.tsx`**
```tsx
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { DUSUS_YUKSEKLIGI } from "./acilisDurumu.ts";
import type { FilmDurumu } from "./filmDurumu.ts";
import { izd, type V3 } from "./izometri.ts";
import { BLOK_MERKEZ, Blok, DerinlikSirali, HavaGolgesi, KagitListesi, NoktaliCizgi, Tabla, Tanimlar, Yuva } from "./sahne3b.tsx";
import { Cikis, Cip, Etiket, Kunye, MetinBlogu, Zemin } from "./yazi.tsx";

// Filmin tek sahnesi: durum → kare. Zemin sabit; tabla, kâğıtlar, blok ve etiketler kameranın itmesiyle birlikte
// odak (blok) etrafında ölçeklenir; metin sütunu, çipler ve künye kameradan bağımsız.
export const FilmSahnesi: React.FC<{ durum: FilmDurumu }> = ({ durum }) => {
  const { width, height } = useVideoConfig();
  const k = durum.kamera;
  const havada = durum.blok.z > 0.02;
  const blokM: V3 = [BLOK_MERKEZ[0], BLOK_MERKEZ[1], BLOK_MERKEZ[2] + durum.blok.z];
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Zemin isik={durum.isik} kayma={durum.kayma} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateY(${durum.sarsinti}px) scale(${durum.itme})`,
          transformOrigin: `${durum.odak[0]}px ${durum.odak[1]}px`,
        }}
      >
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <Tanimlar />
          <Tabla k={k} />
          <Yuva k={k} opaklik={durum.yuva} />
          {havada ? (
            <>
              <HavaGolgesi k={k} yakinlik={1 - durum.blok.z / DUSUS_YUKSEKLIGI} />
              <NoktaliCizgi a={izd([0, 0, 0.001], k)} b={izd([0, 0, durum.blok.z], k)} opaklik={0.45} />
            </>
          ) : null}
          <DerinlikSirali
            k={k}
            ogeler={[
              ...durum.kagitlar.map((g) => ({ p: g.p, ciz: <KagitListesi kagitlar={g.kagitlar} k={k} /> })),
              { p: [0, 0, 0] as V3, ciz: <Blok k={k} m={blokM} aci={durum.blok.aci} yuz={durum.blok.yuz} /> },
            ]}
          />
        </svg>
        {durum.etiketler.map((e) => (
          <Cikis key={e.id} c={e.cikis} koken="center">
            <Etiket capa={izd(e.capa, k)} x={e.x} y={e.y} hiza={e.hiza} metin={e.metin} nokta={e.nokta} gorunum={e.gorunum} ilerleme={e.ilerleme} />
          </Cikis>
        ))}
      </div>
      {durum.metinler.map((m) => (
        <Cikis key={m.id} c={m.cikis}>
          <MetinBlogu satirlar={m.satirlar} top={m.top} font={m.font} boyut={m.boyut} agirlik={m.agirlik} renk={m.renk} opaklik={m.opaklik} acilis={m.acilis} />
        </Cikis>
      ))}
      {durum.cipler.map((c) => (
        <Cikis key={c.id} c={c.cikis}>
          <Cip x={c.x} y={c.y} metin={c.metin} nokta={c.nokta} gorunum={c.gorunum} />
        </Cikis>
      ))}
      {durum.kunye > 0 ? <Kunye opaklik={durum.kunye} /> : null}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: `MarkaFilmi.tsx`**
```tsx
import React from "react";
import { AbsoluteFill, Html5Audio, staticFile, useCurrentFrame } from "remotion";
import { FilmSahnesi } from "./FilmSahnesi.tsx";
import { filmDurumu } from "./filmDurumu.ts";

/** 16:9 marka filmi (60 sn). Efekt: public/marka/sfx-169.wav (`npm run marka:sfx`). Müzik ve seslendirme Plan 3D'de. */
export const MarkaFilmi169: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <FilmSahnesi durum={filmDurumu(f)} />
      <Html5Audio src={staticFile("marka/sfx-169.wav")} volume={0.9} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Root ve komut** — `Root.tsx`'te `import { AcilisFoyu, FOY_BOYUT } from "./marka/AcilisFoyu";` satırının altına:
```tsx
import { MarkaFilmi169 } from "./marka/MarkaFilmi";
import { BOLUMLER_169, toplamKare } from "./marka/zaman";
```
(`FPS` zaten `./marka/zaman`'dan içe aktarılıyorsa iki importu tek satırda birleştir: `import { BOLUMLER_169, FPS, toplamKare } from "./marka/zaman";`.) `<Still id="MarkaAcilisFoyu" …/>` satırının altına:
```tsx
    <Composition id="MarkaFilmi169" component={MarkaFilmi169} durationInFrames={toplamKare(BOLUMLER_169)} fps={FPS} width={1920} height={1080} />
```
`package.json` → `scripts` (`"elestiri"` satırından sonra, virgülle):
```json
    "marka:film": "node scripts/marka-sfx.ts && remotion render src/index.ts MarkaFilmi169 out/marka/film-169.mp4"
```

- [ ] **Step 4: Kanca'da film = açılış (piksel)**
```bash
npm run typecheck
for f in 20 50 132; do npx remotion still src/index.ts MarkaFilmi169 out/marka/film-$f.png --frame=$f; npx remotion still src/index.ts MarkaAcilis169 out/marka/acilis-$f.png --frame=$f; done
python3 -c "
from PIL import Image, ImageChops
for f in (20,50,132):
    a=Image.open(f'out/marka/film-{f}.png').convert('RGB'); b=Image.open(f'out/marka/acilis-{f}.png').convert('RGB')
    print(f, ImageChops.difference(a,b).getbbox())"
```
Expected: üç satır da `None`. Değilse DUR ve bildir (fark bbox'ı + iki PNG yolu).

- [ ] **Step 5: İlk 32 vuruşu render et**
```bash
npm run marka:film -- --frames=0-575 && mv out/marka/film-169.mp4 out/marka/film-169-v1-32.mp4
for f in 170 250 330 400 430 446 470 500 540 575; do ffmpeg -v error -y -i out/marka/film-169-v1-32.mp4 -vf "select=eq(n\,$f)" -vframes 1 out/marka/film-k$f.png; done
npm run elestiri -- out/marka/film-169-v1-32.mp4
```
Her kareyi Read ile aç. Doğrulanacaklar:
1. **k170** (v10): "HER MATERYAL" açılmış ya da açılıyor, Kanca metni ve etiketleri yok; S3 yığınında 2 kâğıt, "seans planı" çipi sönmekte.
2. **k250, k330** (Yük ortası): desteler dört yığında büyüyor; o vuruşun etiketi (varsa) yığınına bağlı; başlık tablaya değmiyor; sol çip (S3) başlık sütununa girmiyor.
3. **k400** (v23): ön yığın (S4) bloğun büyük kısmını örtüyor; "Evrak büyüdükçe…" iki satır görünür.
4. **k430–k470** (Dönüş başı): tabla dönüyor, kamera geri çekiliyor; kâğıtlar yay çizerek uçuyor; Yük metni çıkıyor.
5. **k500** (v28 sonrası): iki düzgün yığın (üstlerinde mavi ve sarı sekme), blok görünür ve yüzü seçilir; "Bu yükü tek başına / taşımak zorunda / değilsin." üç satır.
6. **k540, k575** (v31–32): künye sol üstte, `LUDENLAB.COM` sağ üstte; "01 Studio" ve "02 Atölye" çipleri; hiçbir öğe kadraj dışına taşmıyor.
Eleştiri raporu: donuk an yok; kâğıt ve dönüş sesleri vuruşlarda.

Bir madde tutmazsa ilgili değeri (`filmDurumu.ts` yerleşimi, `yerlesim.ts`) düzelt, testleri ve render'ı yeniden koş, değişikliği raporla. Tasarım dışı bir değişiklik gerekiyorsa DUR ve bildir.

- [ ] **Step 6: Commit** — `feat(promo/marka): film sahnesi ve 16:9 kompozisyonu (v1–32)`

## Plan 3B'ye devredilenler
- Studio (v33–52) ve Atölye (v53–72): tabla −180°/−270°, kamera odak yığınına, kart açılımı, deste çevirme, MEB çipleri, TASLAK damgası.
- `filmDurumu` v33 sonrası şu an Dönüş sonunu tutar (metinler v33'te çıkar).
