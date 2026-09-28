# LudenLab Marka Filmi · Plan 1: Altyapı, Stil Karesi, Anlatıcı Denemesi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Marka filminin saf TS altyapısını (zaman ızgarası, izometrik motor, sahne nesneleri, metin) kurmak, storyboard F10 karesini gerçek motorla 1920×1080 PNG olarak çizmek ve anlatıcı seçimi için Chris ile Matilda seslerinden iki satırlık deneme üretmek. Bu, spec'teki **Onay kapısı 1**'dir.

**Architecture:** `promo/src/marka/` altında saf `.ts` modüller (node testleriyle doğrulanır) ve üstlerinde ince `.tsx` bileşenler (Remotion still ile görsel doğrulanır). İzometrik motor LudenMain `video/src/kagit.tsx`'ten ve storyboard sayfasının çizim kodundan uyarlanır. Seslendirme, mevcut `scripts/tts.ts`'teki fal çağrısı ortak `scripts/lib/fal.ts`'e çıkarılarak paylaşılır.

**Tech Stack:** Remotion 4.0.484, React 19, TypeScript (Node 24 tip ayıklamasıyla `node --test`), ElevenLabs v3 (fal).

**Spec:** `docs/superpowers/specs/2026-09-28-ludenlab-marka-filmi-design.md`
**Storyboard:** https://claude.ai/artifact/2PAQNbmWziKEiodmXdRNDw (F10 karesi bu planın hedefi)

**Sonraki planlar** (her onay kapısından sonra yazılır, çünkü kapıdaki geri bildirim içeriği değiştirir): Plan 2 açılış (v1–8), Plan 3 16:9 tam kurgu + müzik/efekt/seslendirme, Plan 4 9:16 kesim.

## Kurallar (tüm görevler)

- Çalışma dizini: `/Users/recepkucuk/ludenlab/.claude/worktrees/ludenlab-marka-filmi/promo` (dal `claude/ludenlab-marka-filmi`). Ana checkout'a (`/Users/recepkucuk/ludenlab`) dokunma.
- `src/marka/` içindeki göreli içe aktarmalar **uzantıyla** yazılır (`./izometri.ts`, `./sahne3b.tsx`): testler Node'un tip ayıklamasıyla koşar, uzantısız yolu çözemez. Yalnız silinebilir TS sözdizimi kullan (`enum`, `namespace`, parametre özelliği yok).
- `.tsx` dosyaları node testlerinden içe aktarılmaz; onları `npm run typecheck` ve `remotion still` doğrular.
- Mevcut `StudioTanitim916`, reels (`src/reels*`), 4:5 gönderiler (`src/posts45`) değişmez; yalnız `Root.tsx`'e bir import ve bir `<Still>` eklenir.
- Commit mesajları Türkçe, `feat(promo/marka): …` biçiminde; sonuna `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` satırı. Push yok.

## Dosya haritası

| Dosya | Durum | Sorumluluk |
|---|---|---|
| `promo/src/marka/zaman.ts` | yeni | BPM/FPS, vuruş→kare, 16:9 ve 9:16 bölüm listeleri |
| `promo/src/marka/izometri.ts` | yeni | izdüşüm, tabla dönüşü, prizma/küp yüzleri, görünürlük, gölgelendirme, kabuk, tabanlar, derinlik, yüz matrisi |
| `promo/src/marka/nesneler.ts` | yeni | tohumlu rastgele, kâğıt yığını verisi, üst yüz çizgileri ve sekme |
| `promo/src/marka/metin.ts` | yeni | bölüm başına ekran yazıları ve seslendirme, hedef etiketleri, MEB program adı |
| `promo/src/marka/tema.ts` | yeni | renkler, boyalar, fontlar, çizgi kalınlıkları, 16:9 tuval |
| `promo/src/marka/sahne3b.tsx` | yeni | SVG: `Tanimlar`, `Cisim`, `Tabla`, `KagitYigini`, `Blok`, `NoktaliCizgi`, `Raptiye`, `DerinlikSirali` |
| `promo/src/marka/yazi.tsx` | yeni | HTML katmanı: `Zemin`, `Kunye`, `Baslik`, `Cip`, `Etiket` |
| `promo/src/marka/StilKaresi.tsx` | yeni | F10 karesi (Still) |
| `promo/src/Root.tsx` | değişir | `MarkaStilKaresi` kaydı |
| `promo/scripts/lib/fal.ts` | yeni | `falKey`, `falTts` (ortak) |
| `promo/scripts/tts.ts` | değişir | ortak `fal.ts`'i kullanır |
| `promo/scripts/marka-tts.ts` | yeni | anlatıcı denemesi |
| `promo/package.json` | değişir | `marka:stil`, `marka:tts` komutları |
| `promo/.gitignore` | değişir | `public/marka/vo-deneme/` |
| `promo/tests/marka-*.test.ts`, `promo/tests/fal.test.ts` | yeni | birim testler |
| `docs/superpowers/specs/2026-09-28-ludenlab-marka-filmi-design.md` | değişir | kelime sayısı ve 9:16 bölüm bölünmesi düzeltmesi |

---

### Task 1: Çalışma alanını hazırla

**Files:** yok (yalnız kurulum)

- [ ] **Step 1: Bağımlılıkları kur**

```bash
cd /Users/recepkucuk/ludenlab/.claude/worktrees/ludenlab-marka-filmi/promo && npm ci
```
Expected: `added … packages`, hata yok. (`npm ci` `package-lock.json`'a sadık kurar; `zod` 4.3.6'da sabit kalmalı.)

- [ ] **Step 2: Taban çizgisi: mevcut testler ve tip denetimi**

```bash
npm test && npm run typecheck
```
Expected: `# fail 0`; `tsc` çıktısız biter. Kırmızı varsa DUR ve bildir; bu planın işi değil.

---

### Task 2: Zaman ızgarası (`zaman.ts`)

**Files:**
- Create: `promo/src/marka/zaman.ts`
- Test: `promo/tests/marka-zaman.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

`promo/tests/marka-zaman.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { BOLUMLER_169, BOLUMLER_916, VURUS_KARE, bolumKare, kare, saniye, toplamKare, type Bolum } from "../src/marka/zaman.ts";

const bitisik = (b: Bolum[]) =>
  b.every((x, i) => (i === 0 ? x.ilk === 1 : x.ilk === b[i - 1].son + 1) && x.son >= x.ilk);

test("100 BPM, 30 fps: bir vuruş 18 kare", () => {
  assert.equal(VURUS_KARE, 18);
  assert.equal(kare(1), 0);
  assert.equal(kare(2), 18);
  assert.equal(kare(101), 1800);
  assert.equal(saniye(77), 45.6);
});

test("16:9 bölümleri boşluksuz, 100 vuruş = 1800 kare", () => {
  assert.ok(bitisik(BOLUMLER_169));
  assert.deepEqual(BOLUMLER_169.map((b) => b.id), ["kanca", "yuk", "donus", "studio", "atolye", "cocuk", "kapanis"]);
  assert.equal(toplamKare(BOLUMLER_169), 1800);
});

test("9:16 kesim boşluksuz, 50 vuruş = 900 kare, aynı bölüm sırası", () => {
  assert.ok(bitisik(BOLUMLER_916));
  assert.deepEqual(BOLUMLER_916.map((b) => b.id), BOLUMLER_169.map((b) => b.id));
  assert.equal(toplamKare(BOLUMLER_916), 900);
});

test("bölüm karesi: başlangıç ve süre", () => {
  const studio = BOLUMLER_169.find((b) => b.id === "studio")!;
  assert.deepEqual(bolumKare(studio), { from: 576, durationInFrames: 360 });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `node --test tests/marka-zaman.test.ts`
Expected: FAIL, `Cannot find module '…/src/marka/zaman.ts'`.

- [ ] **Step 3: Uygula**

`promo/src/marka/zaman.ts`:
```ts
// Marka filmi zaman ızgarası: 100 BPM, 4/4, 30 fps. Görüntü, efekt ve seslendirme bu ızgarayı okur.
export const BPM = 100;
export const FPS = 30;
export const VURUS_KARE = (FPS * 60) / BPM;

export type BolumId = "kanca" | "yuk" | "donus" | "studio" | "atolye" | "cocuk" | "kapanis";
/** Vuruşlar 1'den sayılır; ilk ve son dahil. */
export type Bolum = { id: BolumId; ilk: number; son: number };

/** Vuruş n'nin başladığı kare. */
export const kare = (vurus: number) => Math.round((vurus - 1) * VURUS_KARE);
/** Vuruş n'nin başladığı saniye. */
export const saniye = (vurus: number) => ((vurus - 1) * 60) / BPM;

/** 16:9 ana kurgu, 60 sn (spec: Bölümler). */
export const BOLUMLER_169: Bolum[] = [
  { id: "kanca", ilk: 1, son: 8 },
  { id: "yuk", ilk: 9, son: 24 },
  { id: "donus", ilk: 25, son: 32 },
  { id: "studio", ilk: 33, son: 52 },
  { id: "atolye", ilk: 53, son: 72 },
  { id: "cocuk", ilk: 73, son: 88 },
  { id: "kapanis", ilk: 89, son: 100 },
];

/** 9:16 kesim, 30 sn (spec: 9:16 kesim; "Çocuk + kapanış" 6 + 8 vuruş olarak bölünür). */
export const BOLUMLER_916: Bolum[] = [
  { id: "kanca", ilk: 1, son: 6 },
  { id: "yuk", ilk: 7, son: 14 },
  { id: "donus", ilk: 15, son: 20 },
  { id: "studio", ilk: 21, son: 28 },
  { id: "atolye", ilk: 29, son: 36 },
  { id: "cocuk", ilk: 37, son: 42 },
  { id: "kapanis", ilk: 43, son: 50 },
];

export const toplamKare = (b: Bolum[]) => b[b.length - 1].son * VURUS_KARE;
export const bolumKare = (b: Bolum) => ({ from: kare(b.ilk), durationInFrames: (b.son - b.ilk + 1) * VURUS_KARE });
```

- [ ] **Step 4: Testin geçtiğini gör**

Run: `node --test tests/marka-zaman.test.ts`
Expected: `# pass 4`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/marka/zaman.ts tests/marka-zaman.test.ts
git commit -m "feat(promo/marka): 100 BPM zaman ızgarası ve bölüm listeleri

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: İzometrik motor (`izometri.ts`)

**Files:**
- Create: `promo/src/marka/izometri.ts`
- Test: `promo/tests/marka-izometri.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

`promo/tests/marka-izometri.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { derinlik, gorunur, izd, kabuk, karistir, kup, prizma, yuzMatrisi, yuzRengi, type Kamera, type V3 } from "../src/marka/izometri.ts";

const K: Kamera = { s: 100, ox: 1000, oy: 500, don: 0 };
const C30 = Math.cos(Math.PI / 6);
const yakin = (a: number[], b: number[], eps = 1e-6) => a.every((v, i) => Math.abs(v - b[i]) < eps);
const yon = (n: V3) => n.map((v) => Math.round(v) + 0).join(",");

test("izdüşüm: merkez, yukarı, +x ve +y yönleri", () => {
  assert.deepEqual(izd([0, 0, 0], K), [1000, 500]);
  assert.ok(yakin(izd([0, 0, 1], K), [1000, 400]));
  assert.ok(yakin(izd([1, 0, 0], K), [1000 + C30 * 100, 550]));
  assert.ok(yakin(izd([0, 1, 0], K), [1000 - C30 * 100, 550]));
});

test("küp: düz bakışta üst, +x ve +y yüzleri görünür", () => {
  const gorunen = kup([0, 0, 0.5], 1).filter((y) => gorunur(y, K)).map((y) => yon(y.n));
  assert.deepEqual(gorunen.sort(), ["0,0,1", "0,1,0", "1,0,0"]);
});

test("tabla 90° dönünce -y yüzü görünür olur", () => {
  const k = { ...K, don: Math.PI / 2 };
  const gorunen = kup([0, 0, 0.5], 1).filter((y) => gorunur(y, k)).map((y) => yon(y.n));
  assert.equal(gorunen.length, 3);
  assert.ok(gorunen.includes("0,-1,0"));
});

test("prizma: üst yüz + dört yan yüz, normaller dışa bakar", () => {
  const yuzler = prizma([[0, 0], [2, 0], [2, 1], [0, 1]], 0, 0.5);
  assert.equal(yuzler.length, 5);
  assert.equal(yon(yuzler[0].n), "0,0,1");
  assert.deepEqual(yuzler.slice(1).map((y) => yon(y.n)).sort(), ["-1,0,0", "0,-1,0", "0,1,0", "1,0,0"]);
});

test("yüz rengi: üst açık boya, +x sağ, +y sol", () => {
  const b = { ust: "#ffffff", sol: "#aaaaaa", sag: "#000000" };
  const yuzler = kup([0, 0, 0.5], 1);
  const bul = (n: string) => yuzler.find((y) => yon(y.n) === n)!;
  assert.equal(yuzRengi(bul("0,0,1"), K, b), "#ffffff");
  assert.equal(yuzRengi(bul("1,0,0"), K, b), "rgb(0,0,0)");
  assert.equal(yuzRengi(bul("0,1,0"), K, b), "rgb(170,170,170)");
});

test("karıştır: iki renk arası doğrusal", () => {
  assert.equal(karistir("#000000", "#ffffff", 0.5), "rgb(128,128,128)");
});

test("kabuk: içteki noktalar düşer", () => {
  assert.equal(kabuk([[0, 0], [4, 0], [4, 4], [0, 4], [2, 2], [1, 3]]).length, 4);
});

test("derinlik: izleyiciye yakın ve yüksek olan sonra çizilir", () => {
  assert.ok(derinlik([1, 1, 0], K) > derinlik([-1, -1, 0], K));
  assert.ok(derinlik([0, 0, 1], K) > derinlik([0, 0, 0], K));
});

test("yüz matrisi: 64'lük kutunun köşeleri yüz köşelerine gider", () => {
  const p0: V3 = [0, 0.5, 1], pu: V3 = [1, 0.5, 1], pv: V3 = [0, 0.5, 0];
  const m = yuzMatrisi(p0, pu, pv, K).match(/matrix\(([^)]+)\)/)![1].split(" ").map(Number);
  const uygula = (x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  assert.ok(yakin(uygula(0, 0), izd(p0, K), 0.01));
  assert.ok(yakin(uygula(64, 0), izd(pu, K), 0.01));
  assert.ok(yakin(uygula(0, 64), izd(pv, K), 0.01));
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `node --test tests/marka-izometri.test.ts`
Expected: FAIL, `Cannot find module '…/src/marka/izometri.ts'`.

- [ ] **Step 3: Uygula**

`promo/src/marka/izometri.ts`:
```ts
// İzometrik çizim motoru (LudenMain/video/src/kagit.tsx'ten uyarlandı).
// Dünya birimleri: x sağ-aşağı, y sol-aşağı, z yukarı; izleyici (1,1,1) yönünden bakar.
// Kamera: s = birim başına piksel, (ox, oy) = dünya merkezinin ekrandaki yeri,
// don = tablanın düşey eksen etrafında dönüşü (radyan).

export type V2 = [number, number];
export type V3 = [number, number, number];
export type Kamera = { s: number; ox: number; oy: number; don: number };
export type Yuz = { ps: V3[]; n: V3 };
export type Boya = { ust: string; sol: string; sag: string };

export const GORUS: V3 = [1, 1, 1];
const C30 = Math.cos(Math.PI / 6);

export const nokta = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const kirp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export const donZ = (p: V3, a: number): V3 => {
  if (!a) return p;
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
};

export const izd = (p: V3, k: Kamera): V2 => {
  const q = donZ(p, k.don);
  return [k.ox + (q[0] - q[1]) * C30 * k.s, k.oy + (q[0] + q[1]) * 0.5 * k.s - q[2] * k.s];
};

const f1 = (v: number) => v.toFixed(1);
/** Dünya noktalarından kapalı SVG yolu. */
export const yol = (ps: V3[], k: Kamera) => ps.map((p, i) => (i ? "L" : "M") + izd(p, k).map(f1).join(" ")).join("") + "Z";
/** Ekran noktalarından kapalı SVG yolu. */
export const yol2 = (ps: V2[]) => ps.map((p, i) => (i ? "L" : "M") + p.map(f1).join(" ")).join("") + "Z";

/** Yatay tabandan (z0) h kadar yükselen prizma: üst yüz + yan yüzler (alt yüz hiç görünmez, üretilmez). */
export const prizma = (taban: V2[], z0: number, h: number): Yuz[] => {
  const n = taban.length;
  const cx = taban.reduce((s, p) => s + p[0], 0) / n, cy = taban.reduce((s, p) => s + p[1], 0) / n;
  const alt: V3[] = taban.map(([x, y]) => [x, y, z0]);
  const ust: V3[] = taban.map(([x, y]) => [x, y, z0 + h]);
  const yuzler: Yuz[] = [{ ps: ust, n: [0, 0, 1] }];
  for (let i = 0; i < n; i++) {
    const a = taban[i], b = taban[(i + 1) % n];
    let nx = b[1] - a[1], ny = -(b[0] - a[0]);
    const L = Math.hypot(nx, ny) || 1;
    nx /= L;
    ny /= L;
    if (nx * ((a[0] + b[0]) / 2 - cx) + ny * ((a[1] + b[1]) / 2 - cy) < 0) {
      nx = -nx;
      ny = -ny;
    }
    yuzler.push({ ps: [alt[i], alt[(i + 1) % n], ust[(i + 1) % n], ust[i]], n: [nx, ny, 0] });
  }
  return yuzler;
};

/** Noktayı orijin etrafında sırayla x, y, z eksenlerinde döndürür (radyan). */
export const dondur3 = (p: V3, [ax, ay, az]: V3): V3 => {
  let [x, y, z] = p;
  [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
  [x, z] = [x * Math.cos(ay) + z * Math.sin(ay), -x * Math.sin(ay) + z * Math.cos(ay)];
  [x, y] = [x * Math.cos(az) - y * Math.sin(az), x * Math.sin(az) + y * Math.cos(az)];
  return [x, y, z];
};

const KUP_YUZLERI: [number, number, number, number, V3][] = [
  [0, 1, 2, 3, [0, 0, -1]],
  [4, 5, 6, 7, [0, 0, 1]],
  [0, 1, 5, 4, [0, -1, 0]],
  [1, 2, 6, 5, [1, 0, 0]],
  [2, 3, 7, 6, [0, 1, 0]],
  [3, 0, 4, 7, [-1, 0, 0]],
];

/** m merkezli, a kenarlı küp; istenirse merkezi etrafında döndürülür. */
export const kup = (m: V3, a: number, aci: V3 = [0, 0, 0]): Yuz[] => {
  const h = a / 2;
  const koseler = ([[-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h], [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]] as V3[]).map((p) => {
    const q = dondur3(p, aci);
    return [q[0] + m[0], q[1] + m[1], q[2] + m[2]] as V3;
  });
  return KUP_YUZLERI.map(([i, j, k, l, n]) => ({ ps: [koseler[i], koseler[j], koseler[k], koseler[l]], n: dondur3(n, aci) }));
};

/** Yüz, tabla dönüşüyle birlikte izleyiciye bakıyor mu. */
export const gorunur = (y: Yuz, k: Kamera) => nokta(donZ(y.n, k.don), GORUS) > 1e-6;
export const ustMu = (y: Yuz, k: Kamera) => donZ(y.n, k.don)[2] > 0.8;

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export const karistir = (a: string, b: string, t: number) => {
  const [x, y] = [hex(a), hex(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};

/** Üst yüz en açık; yanlar yöne göre sağ (+x) ile sol (+y) boyası arasında. */
export const yuzRengi = (y: Yuz, k: Kamera, b: Boya) => {
  if (ustMu(y, k)) return b.ust;
  const n = donZ(y.n, k.don);
  return karistir(b.sag, b.sol, kirp((n[1] - n[0] + 1) / 2));
};

/** Dışbükey kabuk (monoton zincir). */
export const kabuk = (ps: V2[]): V2[] => {
  const p = [...ps].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cap = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const alt: V2[] = [], ust: V2[] = [];
  for (const q of p) {
    while (alt.length >= 2 && cap(alt[alt.length - 2], alt[alt.length - 1], q) <= 0) alt.pop();
    alt.push(q);
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (ust.length >= 2 && cap(ust[ust.length - 2], ust[ust.length - 1], q) <= 0) ust.pop();
    ust.push(q);
  }
  ust.pop();
  alt.pop();
  return alt.concat(ust);
};

/** Yuvarlak köşeli dikdörtgen taban (x0..x1, y0..y1, köşe yarıçapı r). */
export const yuvarlakTaban = (x0: number, y0: number, x1: number, y1: number, r: number, adim = 8): V2[] => {
  const koseler: [number, number, number][] = [
    [x1 - r, y0 + r, -90],
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, 90],
    [x0 + r, y0 + r, 180],
  ];
  const ps: V2[] = [];
  for (const [kx, ky, a0] of koseler)
    for (let i = 0; i <= adim; i++) {
      const a = ((a0 + (i * 90) / adim) * Math.PI) / 180;
      ps.push([kx + r * Math.cos(a), ky + r * Math.sin(a)]);
    }
  return ps;
};

/** (cx, cy) merkezli, w × d boyutlu, aci kadar dönmüş dikdörtgen taban. Köşe sırası: sol-üst, sağ-üst, sağ-alt, sol-alt. */
export const dikdortgenTaban = (cx: number, cy: number, w: number, d: number, aci = 0): V2[] => {
  const c = Math.cos(aci), s = Math.sin(aci);
  return ([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]] as V2[]).map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
};

/** Ressam sıralaması için anahtar: büyük olan sonra (önde) çizilir. */
export const derinlik = (p: V3, k: Kamera) => {
  const q = donZ(p, k.don);
  return q[0] + q[1] + 0.3 * q[2];
};

/** 64'lük (kutu) yerel çizimi p0 (sol üst), pu (sağ üst), pv (sol alt) köşeli yüze basan SVG transform'u. */
export const yuzMatrisi = (p0: V3, pu: V3, pv: V3, k: Kamera, kutu = 64) => {
  const [a, b, c] = [izd(p0, k), izd(pu, k), izd(pv, k)];
  const m = [(b[0] - a[0]) / kutu, (b[1] - a[1]) / kutu, (c[0] - a[0]) / kutu, (c[1] - a[1]) / kutu, a[0], a[1]];
  return `matrix(${m.map((v) => v.toFixed(4)).join(" ")})`;
};
```

- [ ] **Step 4: Testin geçtiğini gör**

Run: `node --test tests/marka-izometri.test.ts`
Expected: `# pass 9`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/marka/izometri.ts tests/marka-izometri.test.ts
git commit -m "feat(promo/marka): izometrik çizim motoru (Kâğıt'tan uyarlama)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Sahne nesneleri (`nesneler.ts`)

**Files:**
- Create: `promo/src/marka/nesneler.ts`
- Test: `promo/tests/marka-nesneler.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

`promo/tests/marka-nesneler.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { kagitCizgileri, rng, sekmeDortgeni, yigin } from "../src/marka/nesneler.ts";

test("rng: aynı tohum aynı dizi", () => {
  const a = rng(5), b = rng(5);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test("yığın: kâğıtlar üst üste, çizgi ve sekme yalnız en üstte", () => {
  const y = yigin({ cx: 1, cy: -1, adet: 4, tohum: 3, sekme: "#4a90e2", t: 0.1 });
  assert.equal(y.kagitlar.length, 4);
  assert.deepEqual(y.kagitlar.map((k) => Number(k.z0.toFixed(6))), [0, 0.1, 0.2, 0.3]);
  assert.ok(Math.abs(y.ustZ - 0.4) < 1e-9);
  assert.deepEqual(y.kagitlar.map((k) => k.ust), [false, false, false, true]);
  assert.deepEqual(y.kagitlar.map((k) => k.sekme), [null, null, null, "#4a90e2"]);
});

test("yığın: sapma 0 ise kâğıtlar hizalı", () => {
  const y = yigin({ cx: 0, cy: 0, adet: 3, sapma: 0 });
  for (const k of y.kagitlar) assert.deepEqual(k.taban, y.kagitlar[0].taban);
});

test("kâğıt çizgileri ve sekme üst yüzde", () => {
  const y = yigin({ cx: 0, cy: 0, adet: 2, t: 0.1, sekme: "#ffce52" });
  const ust = y.kagitlar[1];
  const cizgiler = kagitCizgileri(ust);
  assert.equal(cizgiler.length, 3);
  for (const [a, b] of cizgiler) {
    assert.ok(Math.abs(a[2] - 0.2) < 1e-9);
    assert.ok(Math.abs(b[2] - 0.2) < 1e-9);
  }
  assert.equal(sekmeDortgeni(ust).length, 4);
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `node --test tests/marka-nesneler.test.ts`
Expected: FAIL, `Cannot find module '…/src/marka/nesneler.ts'`.

- [ ] **Step 3: Uygula**

`promo/src/marka/nesneler.ts`:
```ts
import { dikdortgenTaban, type V2, type V3 } from "./izometri.ts";

/** Tohumlu rastgele (mulberry32): aynı tohum her render'da aynı yığını verir. */
export const rng = (tohum: number) => {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export type Kagit = { taban: V2[]; z0: number; h: number; ust: boolean; sekme: string | null };
export type Yigin = { cx: number; cy: number; kagitlar: Kagit[]; ustZ: number };
export type YiginAyar = {
  cx: number;
  cy: number;
  adet: number;
  tohum?: number;
  /** Kâğıtların dağınıklığı (radyan ve birim); 0 = hizalı deste. */
  sapma?: number;
  /** En üst kâğıdın köşesindeki modül rengi (Studio mavisi, Atölye sarısı). */
  sekme?: string | null;
  w?: number;
  d?: number;
  t?: number;
  z?: number;
  /** En üst kâğıda yazı çizgileri çizilsin mi. */
  cizgili?: boolean;
};

export const yigin = ({ cx, cy, adet, tohum = 1, sapma = 0.1, sekme = null, w = 1.25, d = 0.9, t = 0.1, z = 0, cizgili = true }: YiginAyar): Yigin => {
  const r = rng(tohum);
  const kagitlar: Kagit[] = [];
  for (let i = 0; i < adet; i++) {
    const aci = (r() - 0.5) * 2 * sapma, ox = (r() - 0.5) * sapma * 0.7, oy = (r() - 0.5) * sapma * 0.7;
    const son = i === adet - 1;
    kagitlar.push({ taban: dikdortgenTaban(cx + ox, cy + oy, w, d, aci), z0: z + i * t, h: t, ust: son && cizgili, sekme: son ? sekme : null });
  }
  return { cx, cy, kagitlar, ustZ: z + adet * t };
};

// Üst yüzde (u, v) noktası: taban köşeleri c0 (sol üst), c1 (sağ üst), c3 (sol alt) üzerinden.
const ustNokta = (k: Kagit, u: number, v: number): V3 => {
  const zt = k.z0 + k.h;
  const [c0, c1, , c3] = k.taban;
  return [c0[0] + u * (c1[0] - c0[0]) + v * (c3[0] - c0[0]), c0[1] + u * (c1[1] - c0[1]) + v * (c3[1] - c0[1]), zt];
};

/** Üst yüzdeki üç yazı çizgisi (başlangıç, bitiş). */
export const kagitCizgileri = (k: Kagit): [V3, V3][] =>
  ([[0.3, 0.84], [0.5, 0.84], [0.7, 0.58]] as const).map(([v, e]) => [ustNokta(k, 0.34, v), ustNokta(k, e, v)]);

/** Üst yüzün sol üst köşesindeki renkli sekme. */
export const sekmeDortgeni = (k: Kagit): V3[] => [ustNokta(k, 0.08, 0.14), ustNokta(k, 0.24, 0.14), ustNokta(k, 0.24, 0.42), ustNokta(k, 0.08, 0.42)];
```

- [ ] **Step 4: Testin geçtiğini gör**

Run: `node --test tests/marka-nesneler.test.ts`
Expected: `# pass 4`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/marka/nesneler.ts tests/marka-nesneler.test.ts
git commit -m "feat(promo/marka): kâğıt yığını ve sahne nesneleri

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Metin (`metin.ts`) ve spec düzeltmesi

**Files:**
- Create: `promo/src/marka/metin.ts`
- Test: `promo/tests/marka-metin.test.ts`
- Modify: `docs/superpowers/specs/2026-09-28-ludenlab-marka-filmi-design.md`

- [ ] **Step 1: Başarısız testi yaz**

`promo/tests/marka-metin.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { HEDEFLER, MEB_PROGRAM, METIN, kelimeSayisi } from "../src/marka/metin.ts";
import { BOLUMLER_169 } from "../src/marka/zaman.ts";

const tumMetin = Object.values(METIN)
  .flatMap((m) => [...m.ekran, m.vo])
  .concat(HEDEFLER.map((h) => h.metin));
// Spec "İçerik kuralları": hız iddiası, ücretsiz plan, yanlış kitle, genel MEB iddiası, eski terimler, yanlış yazım.
const YASAK = [/saniye/iu, /dakika/iu, /ücretsiz/iu, /özel eğitim öğretmen/iu, /MEB uyumlu/iu, /kredi|jeton|token/iu, /Stüdyo/u, /Atolye/u];

test("içerik kuralları: yasak ifade yok", () => {
  for (const t of tumMetin) for (const y of YASAK) assert.ok(!y.test(t), `"${t}" içinde ${y}`);
});

test("MEB programı tam adıyla Atölye ekranında", () => {
  assert.ok(METIN.atolye.ekran.some((s) => s.includes(MEB_PROGRAM)));
});

test("kitle yazımı", () => {
  assert.ok(METIN.studio.ekran.includes("Dil ve konuşma alanında çalışan uzmanlar için."));
  assert.ok(METIN.atolye.ekran.includes("Öğrenme güçlüğü alanında çalışan uzmanlar için."));
});

test("seslendirme TTS yazımıyla", () => {
  for (const m of Object.values(METIN)) {
    assert.ok(!m.vo.includes("LudenLab"), m.vo);
    assert.ok(!m.vo.includes("ludenlab.com"), m.vo);
  }
});

test("her seslendirme satırı bölümüne sığar (2,3 kelime/sn, 1 vuruş gecikme)", () => {
  for (const b of BOLUMLER_169) {
    const sure = kelimeSayisi(METIN[b.id].vo) / 2.3;
    const yer = (b.son - b.ilk + 1) * 0.6 - 0.6;
    assert.ok(sure <= yer, `${b.id}: ${sure.toFixed(1)} sn > ${yer.toFixed(1)} sn`);
  }
});

test("toplam seslendirme 70 kelime", () => {
  assert.equal(Object.values(METIN).reduce((s, m) => s + kelimeSayisi(m.vo), 0), 70);
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `node --test tests/marka-metin.test.ts`
Expected: FAIL, `Cannot find module '…/src/marka/metin.ts'`.

- [ ] **Step 3: Uygula**

`promo/src/marka/metin.ts`:
```ts
import type { BolumId } from "./zaman.ts";

// Spec: "Bölümler" ve "Seslendirme metni". Ekran yazısı tek başına anlatır (film sessiz de izlenir).

export const MEB_PROGRAM = "Öğrenme Güçlüğü Olan Bireyler İçin Destek Eğitim Programı";

export type BolumMetni = {
  /** Ekrana yazılan metinler, göründükleri sırayla. */
  ekran: string[];
  /** Seslendirme satırı; TTS yazımıyla ("Luden Lab", "ludenlab nokta com"). */
  vo: string;
};

export const METIN: Record<BolumId, BolumMetni> = {
  kanca: {
    ekran: ["Özel eğitimde", "HER ÇOCUK AYRI."],
    vo: "Özel eğitimde her çocuk ayrı.",
  },
  yuk: {
    ekran: ["HER MATERYAL AYRI.", "Evrak büyüdükçe masada çocuğa yer kalmıyor."],
    vo: "Her çocuğa ayrı materyal, ayrı plan, ayrı rapor. Evrak büyüdükçe masada çocuğa yer kalmıyor.",
  },
  donus: {
    ekran: ["Bu yükü tek başına taşımak zorunda değilsin.", "01 Studio", "02 Atölye"],
    vo: "Bu yükü tek başına taşımak zorunda değilsin.",
  },
  studio: {
    ekran: [
      "STUDIO",
      "Dil ve konuşma alanında çalışan uzmanlar için.",
      "Hedef sesi seç; kelimeler görselleriyle gelsin.",
      "Öğrenme Kartı · Sosyal Hikaye · Artikülasyon ve 7 araç daha",
    ],
    vo: "Studio, dil ve konuşma alanında çalışan uzmanlar için. Hedef sesi seç, kelimeler görselleriyle gelsin.",
  },
  atolye: {
    ekran: [
      "ATÖLYE",
      "Öğrenme güçlüğü alanında çalışan uzmanlar için.",
      `MEB ${MEB_PROGRAM} · 172 hedef`,
      "Hedefini seç; seans planı taslağın hazırlansın.",
      "Son söz her zaman senin.",
      "Seans Planı · BEP & Rapor · Veli Mektubu ve 8 araç daha",
    ],
    vo: "Atölye, öğrenme güçlüğü alanında çalışan uzmanlar için. Hedefini seç, seans planı taslağın hazırlansın. Son söz her zaman senin.",
  },
  cocuk: {
    ekran: ["VAKTİN ÇOCUĞA KALSIN."],
    vo: "Vaktin çocuğa kalsın.",
  },
  kapanis: {
    ekran: ["HER ŞEY ÇOCUĞUN ETRAFINDA.", "Özel eğitimde yapay zekâ destekli öğrenme yönetimi.", "Studio", "Atölye", "ludenlab.com"],
    vo: "Luden Lab. Her şey çocuğun etrafında. ludenlab nokta com.",
  },
};

/** Açılışta çocuğun hedefleri; Çocuk bölümünde onları karşılayan modülün rengiyle geri gelir. */
export const HEDEFLER = [
  { metin: "/r/ sesi", modul: "studio" },
  { metin: "okuma akıcılığı", modul: "atolye" },
  { metin: "sıra beklemek", modul: "studio" },
] as const;

export const kelimeSayisi = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
```

- [ ] **Step 4: Testin geçtiğini gör**

Run: `node --test tests/marka-metin.test.ts`
Expected: `# pass 6`, `# fail 0`.

- [ ] **Step 5: Spec'i koda uydur**

`docs/superpowers/specs/2026-09-28-ludenlab-marka-filmi-design.md` içinde iki düzeltme (sayım 70 kelime; 9:16'da Çocuk ve Kapanış `zaman.ts`'teki gibi ayrı bölüm):

Değiştir: `### Seslendirme metni (71 kelime)` → `### Seslendirme metni (70 kelime)`

Değiştir:
```
| Çocuk + kapanış | 37–50 | 8,4 sn | Vaktin çocuğa kalsın → yörünge → logo, ludenlab.com |
```
şununla:
```
| Çocuk | 37–42 | 3,6 sn | Vaktin çocuğa kalsın |
| Kapanış | 43–50 | 4,8 sn | Yörünge → logo, ludenlab.com |
```

- [ ] **Step 6: Commit**

```bash
git add src/marka/metin.ts tests/marka-metin.test.ts ../docs/superpowers/specs/2026-09-28-ludenlab-marka-filmi-design.md
git commit -m "feat(promo/marka): ekran yazıları, seslendirme ve içerik kuralı testleri

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Tema ve çizim bileşenleri (`tema.ts`, `sahne3b.tsx`, `yazi.tsx`)

**Files:**
- Create: `promo/src/marka/tema.ts`
- Create: `promo/src/marka/sahne3b.tsx`
- Create: `promo/src/marka/yazi.tsx`

Bu görevin birim testi yok (JSX node testinde koşmaz); doğrulama `typecheck` ve Task 7'deki still render'dır.

- [ ] **Step 1: `tema.ts`**

`promo/src/marka/tema.ts`:
```ts
import type { Boya } from "./izometri.ts";

// LudenLab marka filmi değerleri (docs/brand/ludenlab-gorsel-tasarim-claude-project.md; spec "Görsel dil").
export const RENK = {
  krem: "#fff8ec",
  kagitBeyaz: "#fffdf8",
  ink: "#0e1e26",
  teal: "#023435",
  turuncu: "#fe703a",
  studio: "#4a90e2",
  atolye: "#ffce52",
  tablaYan: "#f2e3cc",
} as const;

export const BOYA: Record<"kagit" | "turuncu", Boya> = {
  kagit: { ust: "#ffffff", sol: "#f5eee3", sag: "#e7ddcc" },
  turuncu: { ust: "#ff9468", sol: "#fe703a", sag: "#dd5a27" },
};

export const FONT = {
  baslik: "'Bricolage Grotesque', sans-serif",
  govde: "'Satoshi', sans-serif",
} as const;

/** Çizgi kalınlıkları (1920 genişlikte px). */
export const CIZGI = { kalin: 3.2, ince: 2.2 } as const;

/** 16:9 tuval ve metin sütununun sol kenarı. */
export const TUVAL_169 = { w: 1920, h: 1080, sol: 120 } as const;
```

- [ ] **Step 2: `sahne3b.tsx`**

`promo/src/marka/sahne3b.tsx`:
```tsx
import React from "react";
import { derinlik, gorunur, izd, kabuk, kup, prizma, ustMu, yol, yol2, yuvarlakTaban, yuzMatrisi, yuzRengi, type Boya, type Kamera, type V2, type V3, type Yuz } from "./izometri.ts";
import { kagitCizgileri, sekmeDortgeni, type Yigin } from "./nesneler.ts";
import { BOYA, CIZGI, RENK } from "./tema.ts";

/** Sahne SVG'sinin başında bir kez: yan yüzlerdeki nokta dokusu. */
export const Tanimlar: React.FC = () => (
  <defs>
    <pattern id="mk-nokta" width={9} height={9} patternUnits="userSpaceOnUse">
      <circle cx={4.5} cy={4.5} r={1.1} fill={RENK.ink} fillOpacity={0.2} />
    </pattern>
  </defs>
);

/** Dışbükey cismin görünen yüzleri: dolgu, yanlarda nokta dokusu, ink kenar. */
export const Cisim: React.FC<{ yuzler: Yuz[]; k: Kamera; boya: Boya; desen?: boolean; kalinlik?: number }> = ({ yuzler, k, boya, desen = true, kalinlik = CIZGI.kalin }) => (
  <g>
    {yuzler
      .filter((y) => gorunur(y, k))
      .map((y, i) => {
        const d = yol(y.ps, k);
        return (
          <g key={i}>
            <path d={d} fill={yuzRengi(y, k, boya)} />
            {desen && !ustMu(y, k) ? <path d={d} fill="url(#mk-nokta)" /> : null}
            <path d={d} fill="none" stroke={RENK.ink} strokeWidth={kalinlik} strokeLinejoin="round" />
          </g>
        );
      })}
  </g>
);

const TABLA = { yari: 2.6, r: 0.55, kalinlik: 0.32 };

/** Yuvarlak köşeli tabla: yan bant (kabuk) + üst yüz. Dönüşü kameranın `don` değeri verir. */
export const Tabla: React.FC<{ k: Kamera }> = ({ k }) => {
  const taban = yuvarlakTaban(-TABLA.yari, -TABLA.yari, TABLA.yari, TABLA.yari, TABLA.r);
  const ust: V3[] = taban.map(([x, y]) => [x, y, 0]);
  const alt: V3[] = taban.map(([x, y]) => [x, y, -TABLA.kalinlik]);
  const kab = yol2(kabuk([...ust, ...alt].map((p) => izd(p, k))));
  return (
    <g>
      <path d={kab} fill={RENK.tablaYan} />
      <path d={kab} fill="url(#mk-nokta)" />
      <path d={kab} fill="none" stroke={RENK.ink} strokeWidth={CIZGI.kalin} strokeLinejoin="round" />
      <path d={yol(ust, k)} fill={RENK.kagitBeyaz} stroke={RENK.ink} strokeWidth={CIZGI.kalin} strokeLinejoin="round" />
    </g>
  );
};

/** Kâğıt yığını: alttan üste; en üst kâğıtta yazı çizgileri ve modül sekmesi. */
export const KagitYigini: React.FC<{ y: Yigin; k: Kamera }> = ({ y, k }) => (
  <g>
    {y.kagitlar.map((kg, i) => (
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

export const BLOK_MERKEZ: V3 = [0, 0, 0.5];

/** Turuncu blok = çocuk. Düz dururken +y yüzünde iki göz ve gülüş. */
export const Blok: React.FC<{ k: Kamera; m?: V3; a?: number; aci?: V3; yuz?: boolean }> = ({ k, m = BLOK_MERKEZ, a = 1, aci = [0, 0, 0], yuz = true }) => {
  const h = a / 2;
  const duz = aci.every((v) => v === 0);
  const yuzGorunur = duz && gorunur({ n: [0, 1, 0] }, k);
  return (
    <g>
      <Cisim yuzler={kup(m, a, aci)} k={k} boya={BOYA.turuncu} />
      {yuz && yuzGorunur ? (
        <g
          transform={yuzMatrisi(
            [m[0] - h * 0.62, m[1] + h, m[2] + h * 0.66],
            [m[0] + h * 0.62, m[1] + h, m[2] + h * 0.66],
            [m[0] - h * 0.62, m[1] + h, m[2] - h * 0.62],
            k,
          )}
        >
          <circle cx={21} cy={24} r={4.2} fill={RENK.krem} />
          <circle cx={43} cy={24} r={4.2} fill={RENK.krem} />
          <path d="M17 38Q32 52 47 38" fill="none" stroke={RENK.krem} strokeWidth={3.6} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </g>
      ) : null}
    </g>
  );
};

/** Etiket çizgisi: yuvarlak uçlu noktalar. */
export const NoktaliCizgi: React.FC<{ a: V2; b: V2; opaklik?: number }> = ({ a, b, opaklik = 0.7 }) => (
  <path d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`} fill="none" stroke={RENK.ink} strokeOpacity={opaklik} strokeWidth={4} strokeLinecap="round" strokeDasharray="0.1 11" />
);

export const Raptiye: React.FC<{ p: V2 }> = ({ p }) => <circle cx={p[0]} cy={p[1]} r={6.5} fill={RENK.ink} />;

export type SahneOgesi = { p: V3; opaklik?: number; ciz: React.ReactNode };

/** Öğeleri izleyiciye uzaklığına göre (uzaktan yakına) çizer. */
export const DerinlikSirali: React.FC<{ k: Kamera; ogeler: SahneOgesi[] }> = ({ k, ogeler }) => (
  <>
    {ogeler
      .map((o, i) => ({ o, i, d: derinlik(o.p, k) }))
      .sort((a, b) => a.d - b.d)
      .map(({ o, i }) => (
        <g key={i} opacity={o.opaklik ?? 1}>
          {o.ciz}
        </g>
      ))}
  </>
);
```

- [ ] **Step 3: `yazi.tsx`**

`promo/src/marka/yazi.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import type { V2 } from "./izometri.ts";
import { NoktaliCizgi, Raptiye } from "./sahne3b.tsx";
import { FONT, RENK, TUVAL_169 } from "./tema.ts";

const IZGARA = "rgba(14,30,38,0.055)";

/** Krem zemin + 60 px ızgara + yumuşak ışık + gren. isik: ışığın yatay konumu (0–1); animasyonda kayar. */
export const Zemin: React.FC<{ isik?: number }> = ({ isik = 0.7 }) => (
  <AbsoluteFill style={{ background: RENK.krem }}>
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${IZGARA} 1.5px, transparent 1.5px), linear-gradient(90deg, ${IZGARA} 1.5px, transparent 1.5px)`,
        backgroundSize: "60px 60px",
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

/** Künye: logo sol üstte, adres sağ üstte (Dönüş bölümünden sonra sabit). */
export const Kunye: React.FC<{ opaklik?: number }> = ({ opaklik = 1 }) => (
  <div
    style={{
      position: "absolute",
      // Logo SVG'sinin sol iç boşluğu ~28 px; yazı metin sütunuyla hizalansın.
      left: TUVAL_169.sol - 28,
      right: TUVAL_169.sol,
      top: 40,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      opacity: opaklik,
    }}
  >
    <Img src={staticFile("brand/ludenlab-logo.svg")} style={{ height: 102 }} />
    <div style={{ fontFamily: FONT.govde, fontWeight: 700, fontSize: 22, letterSpacing: "0.14em", color: RENK.ink, opacity: 0.6 }}>LUDENLAB.COM</div>
  </div>
);

/** Büyük harf başlık (Bricolage 800, teal); her eleman bir satır. */
export const Baslik: React.FC<{ satirlar: string[]; top: number; boyut?: number }> = ({ satirlar, top, boyut = 104 }) => (
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
    {satirlar.map((s) => (
      <div key={s}>{s}</div>
    ))}
  </div>
);

export type Hiza = "sol" | "sag";

/** Hap çip. hiza "sol": sol kenarı x'te; "sag": sağ kenarı x'te. Dikeyde y'ye ortalı. nokta: modül rengi. */
export const Cip: React.FC<{ x: number; y: number; metin: string; hiza?: Hiza; nokta?: string }> = ({ x, y, metin, hiza = "sol", nokta }) => {
  const { width } = useVideoConfig();
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
      }}
    >
      {nokta ? <span style={{ width: 16, height: 16, borderRadius: 8, background: nokta, border: `2px solid ${RENK.ink}`, boxSizing: "border-box" }} /> : null}
      {metin}
    </div>
  );
};

/** Noktalı etiket: çapadaki raptiyeden çipin hizalı kenarına (x, y) çizgi. */
export const Etiket: React.FC<{ capa: V2; x: number; y: number; metin: string; hiza?: Hiza; nokta?: string }> = ({ capa, x, y, metin, hiza, nokta }) => {
  const { width, height } = useVideoConfig();
  return (
    <>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <NoktaliCizgi a={capa} b={[x, y]} />
        <Raptiye p={capa} />
      </svg>
      <Cip x={x} y={y} metin={metin} hiza={hiza} nokta={nokta} />
    </>
  );
};
```

- [ ] **Step 4: Tip denetimi**

Run: `npm run typecheck`
Expected: çıktısız biter (hata yok).

- [ ] **Step 5: Commit**

```bash
git add src/marka/tema.ts src/marka/sahne3b.tsx src/marka/yazi.tsx
git commit -m "feat(promo/marka): tema, izometrik sahne ve yazı bileşenleri

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Stil karesi (F10) ve render

**Files:**
- Create: `promo/src/marka/StilKaresi.tsx`
- Modify: `promo/src/Root.tsx` (satır 28'deki `import { P1Lansman, … } from "./posts45/Posts";` satırının altına bir import; satır 94'teki `<>`'nin hemen altına bir `<Still>`)
- Modify: `promo/package.json` (`scripts`)

- [ ] **Step 1: `StilKaresi.tsx`**

`promo/src/marka/StilKaresi.tsx`:
```tsx
import React from "react";
import { AbsoluteFill } from "remotion";
import { izd, type Kamera, type V3 } from "./izometri.ts";
import { HEDEFLER, METIN } from "./metin.ts";
import { yigin } from "./nesneler.ts";
import { Blok, DerinlikSirali, KagitYigini, Tabla, Tanimlar } from "./sahne3b.tsx";
import { RENK, TUVAL_169 } from "./tema.ts";
import { Baslik, Etiket, Kunye, Zemin } from "./yazi.tsx";

// Storyboard F10 (0:45,6 · vuruş 77): tabla tam turu tamamladı; iki modül kenarda ince dosya, blok ortada tek başına.
const K: Kamera = { s: 100, ox: 1340, oy: 560, don: 0 };
const STUDIO = yigin({ cx: -1.6, cy: 1.5, adet: 3, tohum: 21, sapma: 0.02, sekme: RENK.studio });
const ATOLYE = yigin({ cx: 1.5, cy: -1.6, adet: 3, tohum: 23, sapma: 0.02, sekme: RENK.atolye });
const modulRengi = (m: "studio" | "atolye") => (m === "studio" ? RENK.studio : RENK.atolye);
// HEDEFLER sırasıyla: çapa (blokta dünya noktası), çipin hizalı kenarı (x, y) ve hiza.
const YERLESIM = [
  { capa: [-0.25, 0.5, 0.78], x: 1150, y: 330, hiza: "sag" },
  { capa: [0.5, -0.25, 0.78], x: 1520, y: 330, hiza: "sol" },
  { capa: [0.5, 0.2, 0.25], x: 1540, y: 740, hiza: "sol" },
] as const;

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
      const y = YERLESIM[i];
      return <Etiket key={h.metin} capa={izd([...y.capa] as V3, K)} x={y.x} y={y.y} hiza={y.hiza} metin={h.metin} nokta={modulRengi(h.modul)} />;
    })}
    <Kunye />
    <Baslik satirlar={METIN.cocuk.ekran[0].split(" ")} top={360} />
  </AbsoluteFill>
);
```

- [ ] **Step 2: Root'a kaydet**

`promo/src/Root.tsx`, satır 28'in (`import { P1Lansman, P2OgrenmeKarti, … } from "./posts45/Posts";`) altına ekle:
```tsx
import { StilKaresi } from "./marka/StilKaresi";
```
`export const Root: React.FC = () => (` ve `  <>` satırlarından hemen sonra, ilk `<Still id="Post45-1-Lansman" …/>`'ten önce ekle:
```tsx
    {/* LudenLab marka filmi (docs/superpowers/specs/2026-09-28-ludenlab-marka-filmi-design.md) */}
    <Still id="MarkaStilKaresi" component={StilKaresi} width={1920} height={1080} />
```

- [ ] **Step 3: Komutu ekle**

`promo/package.json` → `scripts` içine (`"stories916:tam"` satırından sonra, önceki satıra virgül ekleyerek):
```json
    "marka:stil": "remotion still src/index.ts MarkaStilKaresi out/marka/stil-karesi.png"
```

- [ ] **Step 4: Tip denetimi**

Run: `npm run typecheck`
Expected: çıktısız biter.

- [ ] **Step 5: Render**

Run: `npm run marka:stil`
Expected: `out/marka/stil-karesi.png` yazılır (1920×1080). İlk koşuda Remotion tarayıcı indirebilir; fontlar CDN'den gelir, ağ gerekir.

- [ ] **Step 6: Görsel doğrulama**

`out/marka/stil-karesi.png`'yi Read aracıyla aç ve storyboard F10 ile karşılaştır. Hepsi doğru olmalı:
1. Krem zemin, ince ızgara görünür; kenarlarda koyu çerçeve yok.
2. Sol üstte LudenLab logosu (yazısı metin sütunuyla hizalı), sağ üstte `LUDENLAB.COM`.
3. Solda üç satır "VAKTİN / ÇOCUĞA / KALSIN." Bricolage 800 teal; tablaya değmiyor.
4. Sağda yuvarlak köşeli tabla, yan bandında nokta dokusu.
5. Solda mavi sekmeli, sağda sarı sekmeli üçer kâğıtlık ince yığın; üst kâğıtta üç yazı çizgisi.
6. Ortada turuncu blok; **sol (+y) yüzünde dik duran iki göz ve gülüş** (yatık değil).
7. Üç çip: `/r/ sesi` (mavi nokta, blokun solunda), `okuma akıcılığı` (sarı nokta, sağ üstte), `sıra beklemek` (mavi nokta, sağ altta); noktalı çizgiler raptiyeden çipin iç kenarına varıyor.

Bir madde tutmazsa ilgili bileşeni düzelt, Step 5'i yeniden koş. `.ts` uzantılı içe aktarma Remotion paketleyicisinde çözülmezse (hata: `Module not found: … izometri.ts`) DUR ve bildir; plan varsayımı yanlıştır.

- [ ] **Step 7: Commit**

```bash
git add src/marka/StilKaresi.tsx src/Root.tsx package.json
git commit -m "feat(promo/marka): stil karesi (F10) Still kompozisyonu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Ortak fal çağrısı ve anlatıcı denemesi betiği

**Files:**
- Create: `promo/scripts/lib/fal.ts`
- Modify: `promo/scripts/tts.ts` (tamamı aşağıdaki hâliyle değişir)
- Create: `promo/scripts/marka-tts.ts`
- Modify: `promo/package.json` (`scripts`)
- Modify: `promo/.gitignore`
- Test: `promo/tests/fal.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

`promo/tests/fal.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { falKey } from "../scripts/lib/fal.ts";

test("FAL_KEY ortam değişkeni her şeyin önündedir", () => {
  const eski = process.env.FAL_KEY;
  process.env.FAL_KEY = "deneme-anahtar";
  try {
    assert.equal(falKey("/yok/boyle/bir/yer"), "deneme-anahtar");
  } finally {
    if (eski === undefined) delete process.env.FAL_KEY;
    else process.env.FAL_KEY = eski;
  }
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `node --test tests/fal.test.ts`
Expected: FAIL, `Cannot find module '…/scripts/lib/fal.ts'`.

- [ ] **Step 3: `scripts/lib/fal.ts`**

`promo/scripts/lib/fal.ts`:
```ts
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Voice } from "../../src/reels-lib/types.ts";

export const FAL_TTS = "https://fal.run/fal-ai/elevenlabs/tts/eleven-v3";

const envDosyasindan = (dosya: string): string | null => {
  if (!existsSync(dosya)) return null;
  const satir = readFileSync(dosya, "utf8").split("\n").find((l) => l.startsWith("FAL_KEY="));
  return satir ? satir.slice("FAL_KEY=".length).replace(/^"|"$/g, "") : null;
};

/**
 * FAL_KEY sırası: ortam değişkeni → <repo>/apps/hub/.env → ana checkout'un apps/hub/.env'i
 * (git worktree'lerinde .env yoktur; ortak .git dizininden ana checkout bulunur).
 */
export function falKey(promoDir: string): string {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  const yerel = envDosyasindan(resolve(promoDir, "../apps/hub/.env"));
  if (yerel) return yerel;
  const ortakGit = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: promoDir, encoding: "utf8" }).trim();
  const ana = envDosyasindan(resolve(dirname(ortakGit), "apps/hub/.env"));
  if (ana) return ana;
  throw new Error("FAL_KEY bulunamadı (ortam değişkeni ya da apps/hub/.env)");
}

/** ElevenLabs v3 (fal) ile Türkçe seslendirme; mp3 baytlarını döndürür. */
export async function falTts(key: string, text: string, voice: Voice): Promise<Buffer> {
  const res = await fetch(FAL_TTS, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice, stability: 0.5, language_code: "tr" }),
  });
  if (!res.ok) throw new Error(`fal ${res.status} ${await res.text()}`);
  const { audio } = (await res.json()) as { audio: { url: string } };
  const mp3 = await fetch(audio.url);
  if (!mp3.ok) throw new Error(`indirme ${mp3.status}`);
  return Buffer.from(await mp3.arrayBuffer());
}
```

- [ ] **Step 4: Testin geçtiğini gör**

Run: `node --test tests/fal.test.ts`
Expected: `# pass 1`, `# fail 0`.

- [ ] **Step 5: `tts.ts`'i ortak modüle taşı (davranış aynı)**

`promo/scripts/tts.ts` dosyasının tamamını şununla değiştir:
```ts
import { existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REELS } from "./reels.ts";
import { voPath } from "../src/reels-lib/timeline.ts";
import { voiceFor } from "../src/reels-lib/voices.ts";
import { falKey, falTts } from "./lib/fal.ts";

/**
 * Seslendirmeleri ElevenLabs v3 ile (fal) üretir → public/vo/<reel>-<sahne>.mp3.
 * Var olan dosyayı yeniden üretmez (ücret); yeniden üretmek için --force.
 * Kullanım: npm run tts -- r1 r2 | npm run tts -- all [--force]
 * Anahtar: FAL_KEY ortam değişkeni ya da apps/hub/.env içindeki FAL_KEY.
 */
const PROMO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const force = args.includes("--force");
const ids = args.filter((a) => a !== "--force");
const selected = ids.includes("all") ? REELS : REELS.filter((r) => ids.includes(r.script.id));
if (selected.length === 0) {
  console.error(`Kullanım: npm run tts -- <${REELS.map((r) => r.script.id).join("|")}|all> [--force]`);
  process.exit(1);
}

const key = falKey(PROMO);
for (const { script } of selected) {
  for (const scene of script.scenes) {
    const out = resolve(PROMO, "public", voPath(script.id, scene.id));
    if (existsSync(out) && !force) {
      console.log(`· ${script.id}-${scene.id} var, atlandı`);
      continue;
    }
    const voice = voiceFor(script, scene);
    try {
      writeFileSync(out, await falTts(key, scene.vo, voice));
    } catch (e) {
      throw new Error(`${script.id}-${scene.id}: ${(e as Error).message}`);
    }
    console.log(`✓ ${script.id}-${scene.id} (${voice}): ${scene.vo}`);
  }
}
```

Doğrula: Run: `npm run typecheck` → çıktısız. **`npm run tts`'i çalıştırma:** eksik bir reels sesi varsa ücretli API'yi çağırır. Davranış değişmedi; yalnız fal çağrısı taşındı.

- [ ] **Step 6: `marka-tts.ts`**

`promo/scripts/marka-tts.ts`:
```ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Voice } from "../src/reels-lib/types.ts";
import { METIN } from "../src/marka/metin.ts";
import type { BolumId } from "../src/marka/zaman.ts";
import { falKey, falTts } from "./lib/fal.ts";

/**
 * Marka filmi seslendirmesi (ElevenLabs v3, fal).
 *   npm run marka:tts -- deneme [--force]
 *     → public/marka/vo-deneme/<ses>-<bölüm>.mp3: Kanca ve Yük satırları, Chris ve Matilda (anlatıcı seçimi, onay kapısı 1).
 * Var olan dosyayı yeniden üretmez (ücret); yeniden üretmek için --force.
 */
const PROMO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DENEME_SESLER: Voice[] = ["Chris", "Matilda"];
const DENEME_BOLUMLER: BolumId[] = ["kanca", "yuk"];

const args = process.argv.slice(2);
if (args[0] !== "deneme") {
  console.error("Kullanım: npm run marka:tts -- deneme [--force]");
  process.exit(1);
}
const force = args.includes("--force");

const key = falKey(PROMO);
for (const ses of DENEME_SESLER) {
  for (const bolum of DENEME_BOLUMLER) {
    const out = resolve(PROMO, "public", `marka/vo-deneme/${ses.toLowerCase()}-${bolum}.mp3`);
    if (existsSync(out) && !force) {
      console.log(`· ${ses}-${bolum} var, atlandı`);
      continue;
    }
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, await falTts(key, METIN[bolum].vo, ses));
    console.log(`✓ ${ses}-${bolum}: ${METIN[bolum].vo}`);
  }
}
```

- [ ] **Step 7: Komut ve gitignore**

`promo/package.json` → `scripts` içine (`"marka:stil"` satırından sonra, önceki satıra virgül ekleyerek):
```json
    "marka:tts": "node scripts/marka-tts.ts"
```

`promo/.gitignore` sonuna ekle (deneme sesleri seçim içindir, repoya girmez):
```
public/marka/vo-deneme/
```

- [ ] **Step 8: Tüm testler ve tip denetimi**

Run: `npm test && npm run typecheck`
Expected: `# fail 0`; `tsc` çıktısız.

- [ ] **Step 9: Commit**

```bash
git add scripts/lib/fal.ts scripts/tts.ts scripts/marka-tts.ts tests/fal.test.ts package.json .gitignore
git commit -m "feat(promo/marka): ortak fal TTS modülü ve anlatıcı denemesi betiği

tts.ts davranışı aynı; FAL_KEY worktree'de ana checkout'un .env'inden okunur.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Onay kapısı 1: stil karesi ve anlatıcı denemesi

**Files:** yok (üretim ve teslim)

- [ ] **Step 1: Deneme seslerini üret (ücretli, 4 kısa klip)**

Run: `npm run marka:tts -- deneme`
Expected: dört `✓` satırı: `Chris-kanca`, `Chris-yuk`, `Matilda-kanca`, `Matilda-yuk`; dosyalar `public/marka/vo-deneme/` altında.
`FAL_KEY bulunamadı` hatası gelirse DUR ve kullanıcıya bildir; anahtarı elle yazma, isteme.

- [ ] **Step 2: Sesleri kontrol et**

Run: `for f in public/marka/vo-deneme/*.mp3; do echo "$f: $(afinfo "$f" | grep 'estimated duration')"; done`
Expected: dört dosya; kanca ≈ 2–3 sn, yük ≈ 5–7 sn. Sığma sınırları: Kanca 4,2 sn, Yük 9,0 sn (bölüm süresi eksi 1 vuruş). Aşan varsa kullanıcıya teslimde belirt.

- [ ] **Step 3: Kullanıcıya teslim**

SendUserFile ile `out/marka/stil-karesi.png` ve dört mp3'ü gönder (status `normal`). Mesajda:
- Stil karesinin storyboard F10 ile aynı olduğu, gerçek motorla çizildiği.
- Onaylanacaklar: krem zemin ve ızgara, Bricolage başlık, çizgi kalınlığı, bloğun yüzü, sekme renkleri, çipler.
- Anlatıcı sorusu: Chris mi Matilda mı (ikisi de aynı iki satırı okuyor).

- [ ] **Step 4: Onayı bekle**

Kullanıcı onay verene kadar Plan 2'ye geçme. Geri bildirim görsel ise ilgili bileşeni (`tema.ts`, `sahne3b.tsx`, `yazi.tsx`, `StilKaresi.tsx`) düzelt, Task 7 Step 5–6'yı yeniden koş, ayrı commit at, yeniden gönder. Seçilen anlatıcıyı spec'in "Ses" bölümüne yaz ve commit et (`docs(promo/marka): anlatıcı <ad> seçildi`).
