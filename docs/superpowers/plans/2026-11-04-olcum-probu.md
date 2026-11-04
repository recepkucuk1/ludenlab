# Ölçüm Probu (Studio artikülasyon) — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uzman, öğrenci sayfasındaki "Ölçüm" sekmesinden bankadan seçilmiş sabit kelime setiyle seans içi prob koşturur; her kelime doğru/yanlış (+ipucu) işaretlenir, sonuç tarihli yüzde olarak kaydedilir, seri hâlinde grafiğe dönüşür ve öğrenci bağlam bloğuna "Son ölçümler" satırı olarak girer.

**Architecture:** İki yeni Studio tablosu (`ProbeSeries` sabit set, `ProbeRun` ölçüm; raw SQL `0020`), saf mantık `src/modules/studio/lib/probe/` (zod şema, puanlama, bankadan set, bağlam satırı, grafik geometrisi), üç rota `students/[id]/probes/...` (AI yok, kredi yok, plan kapısı yok), üç bileşen (`ProbeTab`, `ProbeRunner`, `ProbeChart`) ve `studentContext` entegrasyonu. Hesap silme Cascade FK ile kapsanır.

**Tech Stack:** Next.js 16 / React 19 / TS strict · Prisma (Studio DB, raw SQL migration) · zod · vitest (`apps/hub`, yalnız `.test.ts`, node ortamı; bileşen render testi YOK, geometri saf TS'te test edilir) · `@ludenlab/ai` artikülasyon bankası.

**Spec:** `docs/superpowers/specs/2026-11-04-olcum-probu-design.md`

**Çalışma dizini:** `/Users/recepkucuk/ludenlab/.claude/worktrees/ludenlabi-egitim-degerlendirmesi-1c8bb2` (worktree, dal `claude/ludenlabi-egitim-degerlendirmesi-1c8bb2`; Faz 0 commit'leri bu dalda). Test komutları `apps/hub` içinden `node_modules/.bin/vitest run <yol>`; tip `node_modules/.bin/tsc --noEmit`. Commit trailer'ı her commit'te: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

**Spec düzeltmeleri:** (1) spec §3/§9 `toolGate.test.ts` muafiyeti istiyor; o test yalnız `src/app/studio/api/tools/` altını tarar, prob rotaları `students/[id]/probes/` altındadır → muafiyet GEREKMEZ, dokunulmaz. (2) spec §8 örneği "(14.10, 21.10, 28.10)" yazar; bağlam bloğundaki gözlem satırları `formatDate(d, "short")` = "14.10.2026" kullanır, ölçüm satırı da aynı biçimi kullanır (tutarlılık); yalnız grafik x-ekseni "14.10" (`gunAy`).

---

## Dosya haritası

| Dosya | Sorumluluk | İşlem |
|---|---|---|
| `apps/hub/prisma/studio/schema.prisma` | `ProbeSeries`, `ProbeRun` + ters ilişkiler | Modify |
| `apps/hub/prisma/sql/0020_probe.sql` | Raw SQL migration (idempotent, RLS, Cascade) | Create |
| `apps/hub/src/lib/probeMigration.test.ts` | SQL kaynak-metin testi (vitest yalnız `src/**` tarar) | Create |
| `apps/hub/src/modules/studio/lib/probe/schema.ts` | zod şemaları, sabitler, tipler | Create |
| `apps/hub/src/modules/studio/lib/probe/schema.test.ts` | şema sınırları + ses listesi bankayla eşleşir | Create |
| `apps/hub/src/modules/studio/lib/probe/score.ts` | `scoreItems` | Create |
| `apps/hub/src/modules/studio/lib/probe/score.test.ts` | | Create |
| `apps/hub/src/modules/studio/lib/probe/buildSeries.ts` | bankadan set + önbellek görsel | Create |
| `apps/hub/src/modules/studio/lib/probe/buildSeries.test.ts` | | Create |
| `apps/hub/src/modules/studio/lib/probe/contextLine.ts` | bağlam satırı biçimlendirici | Create |
| `apps/hub/src/modules/studio/lib/probe/contextLine.test.ts` | | Create |
| `apps/hub/src/modules/studio/lib/probe/chartGeometry.ts` | SVG nokta/yol hesabı | Create |
| `apps/hub/src/modules/studio/lib/probe/chartGeometry.test.ts` | | Create |
| `apps/hub/src/modules/studio/lib/studentContext.ts` | "Son ölçümler" alanı + sorgu | Modify |
| `apps/hub/src/modules/studio/lib/studentContext.test.ts` | yeni alan testleri, taklit | Modify |
| `apps/hub/src/app/studio/api/students/[id]/probes/route.ts` | GET seriler, POST seri | Create |
| `apps/hub/src/app/studio/api/students/[id]/probes/[seriesId]/runs/route.ts` | POST koşu | Create |
| `apps/hub/src/app/studio/api/students/[id]/probes/runs/[runId]/route.ts` | DELETE koşu | Create |
| `apps/hub/src/app/studio/api/students/[id]/probes/probes.test.ts` | rota testleri (taklit Prisma) | Create |
| `apps/hub/src/modules/studio/components/students/ProbeChart.tsx` | SVG grafik | Create |
| `apps/hub/src/modules/studio/components/students/ProbeRunner.tsx` | tam ekran sayaç | Create |
| `apps/hub/src/modules/studio/components/students/ProbeTab.tsx` | sekme | Create |
| `apps/hub/src/app/studio/(main)/students/[id]/page.tsx` | beşinci sekme | Modify |
| `apps/hub/src/modules/studio/lib/koyuTemaKontrast.test.ts` | iki yeni bileşen listeye | Modify |

---

### Task 1: Veri modeli — Prisma + SQL migration + kaynak-metin testi

**Files:**
- Modify: `apps/hub/prisma/studio/schema.prisma` (`StudentObservation` modelinin ardına iki model; `Therapist` ve `Student` ilişki listeleri)
- Create: `apps/hub/prisma/sql/0020_probe.sql`
- Create: `apps/hub/src/lib/probeMigration.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

`apps/hub/src/lib/probeMigration.test.ts`:

```ts
// apps/hub/src/lib/probeMigration.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* Ölçüm probu migration'ı (spec 2026-11-04 §4): hesap silme `therapist.deleteMany` ile siler ve tabloları
   saymaz → yeni tablolar Therapist/Student FK'lerinde ON DELETE CASCADE taşımak ZORUNDA. RLS deny-all,
   idempotent (IF NOT EXISTS) — 0019 ile aynı kalıp. */
const SQL = readFileSync(path.resolve(import.meta.dirname, "../../prisma/sql/0020_probe.sql"), "utf8");

describe("0020_probe.sql", () => {
  it("iki tabloyu idempotent oluşturur", () => {
    expect(SQL).toContain('CREATE TABLE IF NOT EXISTS public."ProbeSeries"');
    expect(SQL).toContain('CREATE TABLE IF NOT EXISTS public."ProbeRun"');
  });
  it("hesap/öğrenci silmede CASCADE: ProbeSeries→Student, ProbeSeries→Therapist, ProbeRun→ProbeSeries, ProbeRun→Therapist", () => {
    for (const ad of ["ProbeSeries_studentId_fkey", "ProbeSeries_therapistId_fkey", "ProbeRun_seriesId_fkey", "ProbeRun_therapistId_fkey"]) {
      const i = SQL.indexOf(ad);
      expect(i, ad).toBeGreaterThan(-1);
      expect(SQL.slice(i, i + 260), ad).toMatch(/ON DELETE CASCADE/);
    }
  });
  it("RLS iki tabloda açık; indeksler var", () => {
    expect(SQL).toContain('ALTER TABLE public."ProbeSeries" ENABLE ROW LEVEL SECURITY');
    expect(SQL).toContain('ALTER TABLE public."ProbeRun" ENABLE ROW LEVEL SECURITY');
    expect(SQL).toContain('"ProbeSeries_studentId_active_idx"');
    expect(SQL).toContain('"ProbeRun_seriesId_date_idx"');
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `cd apps/hub && node_modules/.bin/vitest run src/lib/probeMigration.test.ts`
Expected: FAIL — `ENOENT ... 0020_probe.sql`.

- [ ] **Step 3: Migration'ı yaz**

`apps/hub/prisma/sql/0020_probe.sql`:

```sql
-- 0020_probe.sql
-- HEDEF DB: studio → public."ProbeSeries", public."ProbeRun" (Supabase kgbhvruzoaqwwwkhzdex)
--
-- ÖLÇÜM PROBU (2026-11-04 tasarımı). Seri = öğrenci başına sabit kelime seti (ses × pozisyon × düzey);
-- koşu = tarihli ölçüm (doğru/yanlış/ipucu öğeleri + yüzde). Sağlık verisi değil (kelime listesi ve
-- sayılar); öğrenci/uzman silinince CASCADE.
--
-- Additive + idempotent; prisma migrate YOK — raw SQL (canlı proje).
-- DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod.
--
-- RLS: uygulama `postgres` rolüyle (rolbypassrls) bağlanır; politika yok = anon için deny-all
-- (0016 ile aynı gerekçe). GERİ ALMA: DROP TABLE public."ProbeRun"; DROP TABLE public."ProbeSeries";

CREATE TABLE IF NOT EXISTS public."ProbeSeries" (
  "id"          TEXT PRIMARY KEY,
  "studentId"   TEXT NOT NULL,
  "therapistId" TEXT NOT NULL,
  "kind"        TEXT NOT NULL DEFAULT 'articulation',
  "sound"       TEXT NOT NULL,
  "position"    TEXT NOT NULL,
  "level"       TEXT NOT NULL DEFAULT 'word',
  "words"       JSONB NOT NULL,
  "active"      BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProbeSeries_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProbeSeries_therapistId_fkey"
    FOREIGN KEY ("therapistId") REFERENCES public."Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProbeSeries_studentId_active_idx"
  ON public."ProbeSeries" ("studentId", "active");
CREATE INDEX IF NOT EXISTS "ProbeSeries_therapistId_idx"
  ON public."ProbeSeries" ("therapistId");

CREATE TABLE IF NOT EXISTS public."ProbeRun" (
  "id"          TEXT PRIMARY KEY,
  "seriesId"    TEXT NOT NULL,
  "therapistId" TEXT NOT NULL,
  "date"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "items"       JSONB NOT NULL,
  "correct"     INTEGER NOT NULL,
  "total"       INTEGER NOT NULL,
  "pct"         INTEGER NOT NULL,
  "cuedCount"   INTEGER NOT NULL DEFAULT 0,
  "note"        VARCHAR(300),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProbeRun_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES public."ProbeSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProbeRun_therapistId_fkey"
    FOREIGN KEY ("therapistId") REFERENCES public."Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProbeRun_seriesId_date_idx"
  ON public."ProbeRun" ("seriesId", "date");
CREATE INDEX IF NOT EXISTS "ProbeRun_therapistId_idx"
  ON public."ProbeRun" ("therapistId");

ALTER TABLE public."ProbeSeries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProbeRun" ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 4: Prisma şeması**

`apps/hub/prisma/studio/schema.prisma`: `model StudentObservation { ... }` bloğunun hemen ARDINA ekle:

```prisma
/// Ölçüm probu serisi: öğrenci başına sabit kelime seti (ses × pozisyon × düzey). 2026-11-04 tasarımı.
model ProbeSeries {
  id          String   @id @default(cuid())
  studentId   String
  therapistId String
  kind        String   @default("articulation") // ileride "reading" | "fluency"
  sound       String   // "/r/" biçimi (araçlarla aynı)
  position    String   // "initial" | "medial" | "final"
  level       String   @default("word")
  words       Json     // [{ word, syllableBreak, imageUrl: string | null }]
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())

  student   Student    @relation(fields: [studentId], references: [id], onDelete: Cascade)
  therapist Therapist  @relation(fields: [therapistId], references: [id], onDelete: Cascade)
  runs      ProbeRun[]

  @@index([studentId, active])
  @@index([therapistId])
}

/// Tek ölçüm: öğe listesi + sunucu hesaplı yüzde (cued=true DOĞRU sayılmaz).
model ProbeRun {
  id          String   @id @default(cuid())
  seriesId    String
  therapistId String
  date        DateTime @default(now())
  items       Json     // [{ word, correct: boolean, cued: boolean }]
  correct     Int
  total       Int
  pct         Int
  cuedCount   Int      @default(0)
  note        String?  @db.VarChar(300)
  createdAt   DateTime @default(now())

  series    ProbeSeries @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  therapist Therapist   @relation(fields: [therapistId], references: [id], onDelete: Cascade)

  @@index([seriesId, date])
  @@index([therapistId])
}
```

`model Therapist` ilişki listesine (`observations        StudentObservation[]` satırının ardına):

```prisma
  probeSeries         ProbeSeries[]
  probeRuns           ProbeRun[]
```

`model Student` ilişki listesine (`observations StudentObservation[]` satırının ardına):

```prisma
  probeSeries  ProbeSeries[]
```

- [ ] **Step 5: Prisma istemcisini üret, test geçsin, tip denetimi**

Run: `cd apps/hub && node_modules/.bin/prisma generate --schema prisma/studio/schema.prisma`
Expected: "Generated Prisma Client ... to ./src/generated/studio".

Run: `cd apps/hub && node_modules/.bin/vitest run src/lib/probeMigration.test.ts && node_modules/.bin/tsc --noEmit`
Expected: 3 test PASS; tsc temiz.

- [ ] **Step 6: Commit**

```bash
git add apps/hub/prisma/studio/schema.prisma apps/hub/prisma/sql/0020_probe.sql apps/hub/src/lib/probeMigration.test.ts
git commit -m "feat(studio): ölçüm probu veri modeli — ProbeSeries/ProbeRun (0020, RLS, cascade)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Şema, sabitler ve puanlama (`probe/schema.ts`, `probe/score.ts`)

**Files:**
- Create: `apps/hub/src/modules/studio/lib/probe/schema.ts`
- Create: `apps/hub/src/modules/studio/lib/probe/schema.test.ts`
- Create: `apps/hub/src/modules/studio/lib/probe/score.ts`
- Create: `apps/hub/src/modules/studio/lib/probe/score.test.ts`

- [ ] **Step 1: Başarısız testleri yaz**

`apps/hub/src/modules/studio/lib/probe/schema.test.ts`:

```ts
// apps/hub/src/modules/studio/lib/probe/schema.test.ts
import { describe, expect, it } from "vitest";
import { articulation } from "@ludenlab/ai";
import { PROBE_COUNT, PROBE_POSITIONS, PROBE_SOUNDS, createRunSchema, createSeriesSchema } from "./schema";

describe("createSeriesSchema", () => {
  it("geçerli gövde: ses '/r/' biçimi, pozisyon enum, adet varsayılan 10", () => {
    const r = createSeriesSchema.parse({ sound: " /r/ ", position: "initial" });
    expect(r).toEqual({ sound: "/r/", position: "initial", count: 10 });
  });
  it("ses biçimi: slash'sız, çok harfli, büyük harf reddedilir; Türkçe tek harf kabul", () => {
    expect(createSeriesSchema.safeParse({ sound: "r", position: "initial" }).success).toBe(false);
    expect(createSeriesSchema.safeParse({ sound: "/rr/", position: "initial" }).success).toBe(false);
    expect(createSeriesSchema.safeParse({ sound: "/R/", position: "initial" }).success).toBe(false);
    expect(createSeriesSchema.safeParse({ sound: "/ş/", position: "final" }).success).toBe(true);
  });
  it("adet 5–20 dışı reddedilir", () => {
    expect(createSeriesSchema.safeParse({ sound: "/r/", position: "initial", count: 4 }).success).toBe(false);
    expect(createSeriesSchema.safeParse({ sound: "/r/", position: "initial", count: 21 }).success).toBe(false);
    expect(PROBE_COUNT).toEqual({ min: 5, max: 20, default: 10 });
  });
  it("PROBE_SOUNDS bankadaki her sesi ve yalnız onları listeler", () => {
    const bankada = Object.keys(articulation.WORD_BANK).map((l) => `/${l}/`).sort();
    expect([...PROBE_SOUNDS].sort()).toEqual(bankada);
    expect(PROBE_POSITIONS).toEqual(["initial", "medial", "final"]);
  });
});

describe("createRunSchema", () => {
  it("öğeler 1–20, cued varsayılan false, not ≤300", () => {
    const r = createRunSchema.parse({ items: [{ word: "resim", correct: true }], note: " iyi " });
    expect(r.items[0]).toEqual({ word: "resim", correct: true, cued: false });
    expect(r.note).toBe("iyi");
    expect(createRunSchema.safeParse({ items: [] }).success).toBe(false);
    expect(createRunSchema.safeParse({ items: [{ word: "x", correct: true }], note: "a".repeat(301) }).success).toBe(false);
  });
});
```

`apps/hub/src/modules/studio/lib/probe/score.test.ts`:

```ts
// apps/hub/src/modules/studio/lib/probe/score.test.ts
import { describe, expect, it } from "vitest";
import { scoreItems } from "./score";

describe("scoreItems", () => {
  it("bağımsız doğru sayılır; ipuçlu doğru yüzdeye girmez ama cuedCount'a girer", () => {
    expect(
      scoreItems([
        { correct: true, cued: false },
        { correct: true, cued: true },
        { correct: false, cued: false },
        { correct: false, cued: true },
      ]),
    ).toEqual({ correct: 1, total: 4, pct: 25, cuedCount: 2 });
  });
  it("yüzde yuvarlanır (7/9 → 78)", () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ correct: i < 7, cued: false }));
    expect(scoreItems(items).pct).toBe(78);
  });
  it("boş liste → 0/0/0", () => {
    expect(scoreItems([])).toEqual({ correct: 0, total: 0, pct: 0, cuedCount: 0 });
  });
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/probe`
Expected: FAIL — modüller yok.

- [ ] **Step 3: Şema ve puanlama**

`apps/hub/src/modules/studio/lib/probe/schema.ts`:

```ts
// apps/hub/src/modules/studio/lib/probe/schema.ts
import { z } from "zod";

/* Ölçüm probu — zod şemaları ve sabitler (spec 2026-11-04 §4–§6). Client + server paylaşır (server-only
   import YOK; banka buraya girmez — PROBE_SOUNDS elle listelenir, schema.test.ts bankayla eşleşmesini kilitler). */

export const PROBE_POSITIONS = ["initial", "medial", "final"] as const;
export type ProbePosition = (typeof PROBE_POSITIONS)[number];
export const POSITION_LABEL: Record<ProbePosition, string> = { initial: "kelime başı", medial: "kelime ortası", final: "kelime sonu" };
/** Bağlam satırı ve kart başlığı için kısa ad. */
export const POSITION_KISA: Record<ProbePosition, string> = { initial: "başta", medial: "ortada", final: "sonda" };

export const PROBE_LEVELS = ["word"] as const; // ileride: isolated | syllable | sentence
export const LEVEL_KISA: Record<(typeof PROBE_LEVELS)[number], string> = { word: "kelime" };

export const PROBE_COUNT = { min: 5, max: 20, default: 10 } as const;
/** Bankada bu kadardan az kelime varsa seri açılmaz (spec §5). */
export const PROBE_MIN_BANK_WORDS = 3;

/** Bankadaki 29 ses — `articulation.WORD_BANK` anahtarlarıyla birebir (testle kilitli). */
export const PROBE_SOUNDS = [
  "/k/", "/g/", "/r/", "/l/", "/y/", "/s/", "/ş/", "/z/", "/d/", "/f/", "/v/", "/h/", "/c/", "/ç/", "/t/", "/b/",
  "/p/", "/m/", "/n/", "/j/", "/ğ/", "/u/", "/ü/", "/a/", "/e/", "/ı/", "/i/", "/o/", "/ö/",
] as const;

/** "/r/" biçimi: tek Türkçe küçük harf, iki slash arasında. */
export const soundSchema = z.string().trim().regex(/^\/[a-zçğıöşü]\/$/u, "Ses '/r/' biçiminde olmalı");

export const createSeriesSchema = z.object({
  sound: soundSchema,
  position: z.enum(PROBE_POSITIONS),
  count: z.number().int().min(PROBE_COUNT.min).max(PROBE_COUNT.max).default(PROBE_COUNT.default),
});
export type CreateSeriesBody = z.infer<typeof createSeriesSchema>;

export const runItemSchema = z.object({
  word: z.string().min(1).max(40),
  correct: z.boolean(),
  cued: z.boolean().default(false),
});
export type RunItem = z.infer<typeof runItemSchema>;

export const createRunSchema = z.object({
  items: z.array(runItemSchema).min(1).max(PROBE_COUNT.max),
  note: z.string().trim().max(300).optional(),
});
export type CreateRunBody = z.infer<typeof createRunSchema>;

/** Seriye yazılan kelime kaydı (Json). */
export interface ProbeWord {
  word: string;
  syllableBreak: string;
  imageUrl: string | null;
}

/** API'nin döndürdüğü seri (koşular tarih ARTAN, grafik sırası). */
export interface ProbeSeriesDto {
  id: string;
  sound: string;
  position: ProbePosition;
  level: string;
  active: boolean;
  words: ProbeWord[];
  createdAt: string;
  runs: ProbeRunDto[];
}
export interface ProbeRunDto {
  id: string;
  date: string;
  pct: number;
  correct: number;
  total: number;
  cuedCount: number;
  note: string | null;
}
```

`apps/hub/src/modules/studio/lib/probe/score.ts`:

```ts
// apps/hub/src/modules/studio/lib/probe/score.ts
/* Puanlama (spec §6): bağımsız doğru = correct && !cued; cued olanlar cuedCount'a girer, yüzdeye GİRMEZ. */
export interface ScoredRun {
  correct: number;
  total: number;
  pct: number;
  cuedCount: number;
}

export function scoreItems(items: ReadonlyArray<{ correct: boolean; cued: boolean }>): ScoredRun {
  const total = items.length;
  const correct = items.filter((i) => i.correct && !i.cued).length;
  const cuedCount = items.filter((i) => i.cued).length;
  const pct = total === 0 ? 0 : Math.round((100 * correct) / total);
  return { correct, total, pct, cuedCount };
}
```

- [ ] **Step 4: Testler geçsin**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/probe`
Expected: PASS (8 test). `PROBE_SOUNDS` testi başarısızsa bankanın anahtar listesini (`packages/ai/src/articulation/wordBank.ts` `WORD_BANK`) esas alıp sabiti düzelt.

- [ ] **Step 5: Commit**

```bash
git add apps/hub/src/modules/studio/lib/probe/schema.ts apps/hub/src/modules/studio/lib/probe/schema.test.ts apps/hub/src/modules/studio/lib/probe/score.ts apps/hub/src/modules/studio/lib/probe/score.test.ts
git commit -m "feat(studio): prob şemaları, ses listesi ve puanlama (cued yüzdeye girmez)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Bankadan sabit set (`probe/buildSeries.ts`)

**Files:**
- Create: `apps/hub/src/modules/studio/lib/probe/buildSeries.ts`
- Create: `apps/hub/src/modules/studio/lib/probe/buildSeries.test.ts`

Önkoşul: `packages/ai/src/articulation/index.ts` `selectWords`, `WORD_BANK`, `soundToLetter` dışa aktarıyor olmalı (`cat packages/ai/src/articulation/index.ts` ile bak; `selectWords` yoksa `export { selectWords, selectWordsMulti } from "./selectWords";` ekle ve bunu commit'e dahil et).

- [ ] **Step 1: Başarısız testi yaz**

`apps/hub/src/modules/studio/lib/probe/buildSeries.test.ts`:

```ts
// apps/hub/src/modules/studio/lib/probe/buildSeries.test.ts
import { describe, expect, it, vi } from "vitest";
import { articulation } from "@ludenlab/ai";
import { BankaYetersizError, buildSeriesWords } from "./buildSeries";

/* Bankadan deterministik seçim (enjekte rng) + önbellek görsel (taklit). Banka gerçek. */
const sabitRng = () => 0; // Fisher–Yates'te j=0 → sıra deterministik
const lookup = vi.fn(async (w: string) => (w.length % 2 === 0 ? `https://img/${w}.jpg` : null));

describe("buildSeriesWords", () => {
  it("istenen adette kelime, her birinde word/syllableBreak/imageUrl; görsel null olabilir", async () => {
    const words = await buildSeriesWords("/r/", "initial", 10, { lookupImage: lookup, rng: sabitRng });
    expect(words).toHaveLength(10);
    for (const w of words) {
      expect(w.word).toBeTruthy();
      expect(w.syllableBreak).toContain(w.word.slice(0, 1));
      expect(w.imageUrl === null || w.imageUrl.startsWith("https://")).toBe(true);
    }
    expect(new Set(words.map((w) => w.word)).size).toBe(10);
    expect(lookup).toHaveBeenCalledTimes(10);
  });
  it("aynı rng ile aynı set (sabit set sözleşmesi)", async () => {
    const a = await buildSeriesWords("/s/", "final", 8, { lookupImage: lookup, rng: sabitRng });
    const b = await buildSeriesWords("/s/", "final", 8, { lookupImage: lookup, rng: sabitRng });
    expect(a.map((w) => w.word)).toEqual(b.map((w) => w.word));
  });
  it("bankada count'tan az ama ≥3 kelime varsa olan kadar döner", async () => {
    const letter = Object.keys(articulation.WORD_BANK).find((l) => {
      const n = articulation.WORD_BANK[l]!.initial.length;
      return n >= 3 && n < 20;
    })!;
    const n = articulation.WORD_BANK[letter]!.initial.length;
    const words = await buildSeriesWords(`/${letter}/`, "initial", 20, { lookupImage: lookup, rng: sabitRng });
    expect(words).toHaveLength(n);
  });
  it("bankada 3'ten az kelime → BankaYetersizError (başta /ğ/ hiç yok)", async () => {
    await expect(buildSeriesWords("/ğ/", "initial", 10, { lookupImage: lookup, rng: sabitRng })).rejects.toBeInstanceOf(BankaYetersizError);
  });
  it("görsel araması patlarsa o kelime null kalır, set yine döner", async () => {
    const kirik = vi.fn(async () => { throw new Error("storage"); });
    const words = await buildSeriesWords("/k/", "initial", 5, { lookupImage: kirik, rng: sabitRng });
    expect(words).toHaveLength(5);
    expect(words.every((w) => w.imageUrl === null)).toBe(true);
  });
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/probe/buildSeries.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: Uygulama**

`apps/hub/src/modules/studio/lib/probe/buildSeries.ts`:

```ts
// apps/hub/src/modules/studio/lib/probe/buildSeries.ts
import { articulation } from "@ludenlab/ai";
import { PROBE_MIN_BANK_WORDS, type ProbePosition, type ProbeWord } from "./schema";

/* Sabit set (spec §5): bankadan `count` kelime (rng enjekte edilebilir), her kelime için YALNIZ önbellekteki görsel
   (üretim yok, kredi yok). Bankada 3'ten az kelime → BankaYetersizError (rota 400'e çevirir). */

export class BankaYetersizError extends Error {
  constructor(sound: string, position: ProbePosition, found: number) {
    super(`Bu ses ve pozisyon için bankada yeterli kelime yok (${sound} ${position}: ${found})`);
    this.name = "BankaYetersizError";
  }
}

export interface BuildSeriesDeps {
  lookupImage: (word: string) => Promise<string | null>;
  rng?: () => number;
}

export async function buildSeriesWords(
  sound: string,
  position: ProbePosition,
  count: number,
  deps: BuildSeriesDeps,
): Promise<ProbeWord[]> {
  const letter = articulation.soundToLetter(sound);
  const picked = articulation.selectWords(articulation.WORD_BANK, letter, [position], count, deps.rng ?? Math.random);
  if (picked.length < PROBE_MIN_BANK_WORDS) throw new BankaYetersizError(sound, position, picked.length);
  const urls = await Promise.all(picked.map((w) => deps.lookupImage(w.word).catch(() => null)));
  return picked.map((w, i) => ({ word: w.word, syllableBreak: w.syllableBreak, imageUrl: urls[i] ?? null }));
}
```

- [ ] **Step 4: Test geçsin**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/probe/buildSeries.test.ts`
Expected: PASS (5 test). "count'tan az" testi `letter` bulamazsa (`undefined`) bankada 3–19 arası başta-kelimeli ses yok demektir; testi `medial` ile tekrar dene ve o pozisyonu kullan.

- [ ] **Step 5: Commit**

```bash
git add apps/hub/src/modules/studio/lib/probe/buildSeries.ts apps/hub/src/modules/studio/lib/probe/buildSeries.test.ts packages/ai/src/articulation/index.ts
git commit -m "feat(studio): prob için bankadan sabit kelime seti + önbellek görsel

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
(`index.ts` değişmediyse `git add` onu sessizce atlar.)

---

### Task 4: Bağlam satırı ve `studentContext` entegrasyonu

**Files:**
- Create: `apps/hub/src/modules/studio/lib/probe/contextLine.ts`
- Create: `apps/hub/src/modules/studio/lib/probe/contextLine.test.ts`
- Modify: `apps/hub/src/modules/studio/lib/studentContext.ts` (`BUTCE`, `StudentContextInput`, `renderStudentBlock`, `StudentContextPrisma`, `loadStudentContext`)
- Modify: `apps/hub/src/modules/studio/lib/studentContext.test.ts` (`temel` fikstürü, prisma taklidi, yeni testler)
- Modify: `apps/hub/src/modules/studio/lib/generateProfile.ts` (yedek `renderStudentBlock` çağrısına `recentProbes: []`)

- [ ] **Step 1: Başarısız testleri yaz**

`apps/hub/src/modules/studio/lib/probe/contextLine.test.ts`:

```ts
// apps/hub/src/modules/studio/lib/probe/contextLine.test.ts
import { describe, expect, it } from "vitest";
import { OLCUM_KOSU_TAVANI, OLCUM_SERI_TAVANI, gunAy, probeContextLines } from "./contextLine";

const gun = (d: number) => new Date(2026, 9, d); // Ekim 2026
const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

describe("probeContextLines", () => {
  it("seri başına tek satır: ses, kısa pozisyon, düzey, yüzdeler → ve tarihler (tarih ARTAN)", () => {
    const satirlar = probeContextLines(
      [{ sound: "/r/", position: "initial", level: "word", runs: [{ date: gun(14), pct: 60 }, { date: gun(21), pct: 70 }, { date: gun(28), pct: 80 }] }],
      fmt,
    );
    expect(satirlar).toEqual(["- /r/ başta kelime: %60 → %70 → %80 (14.10.2026, 21.10.2026, 28.10.2026)"]);
  });
  it("koşusuz seri atlanır; en çok 3 seri; seri başına son 3 koşu", () => {
    const seri = (s: string, n: number) => ({ sound: s, position: "final" as const, level: "word", runs: Array.from({ length: n }, (_, i) => ({ date: gun(i + 1), pct: 10 * (i + 1) })) });
    const satirlar = probeContextLines([seri("/s/", 0), seri("/k/", 5), seri("/l/", 1), seri("/m/", 2), seri("/n/", 2)], fmt);
    expect(satirlar).toHaveLength(OLCUM_SERI_TAVANI);
    expect(satirlar[0]).toBe("- /k/ sonda kelime: %30 → %40 → %50 (03.10.2026, 04.10.2026, 05.10.2026)");
    expect(OLCUM_KOSU_TAVANI).toBe(3);
  });
  it("girdi sırası ne olursa olsun koşular tarihe göre sıralanır", () => {
    const [s] = probeContextLines([{ sound: "/z/", position: "medial", level: "word", runs: [{ date: gun(9), pct: 90 }, { date: gun(2), pct: 20 }] }], fmt);
    expect(s).toBe("- /z/ ortada kelime: %20 → %90 (02.10.2026, 09.10.2026)");
  });
  it("gunAy: grafik etiketi gün.ay, sıfır dolgulu; ISO string de kabul", () => {
    expect(gunAy(gun(3))).toBe("03.10");
    expect(gunAy("2026-12-25T10:00:00.000Z")).toBe("25.12");
  });
});
```

`apps/hub/src/modules/studio/lib/studentContext.test.ts` içine ekle — `temel` fikstürüne `recentProbes: [],` satırı (`recentObservations: [],` ardına) ve `describe("renderStudentBlock"` bloğunun SONUNA yeni testler:

```ts
  it("Son ölçümler alanı gözlemlerden SONRA, profilden ÖNCE; 300 karakter bütçe", () => {
    const t = renderStudentBlock({
      ...temel,
      recentObservations: [{ text: "Bugün /r/ başta iyi gitti", createdAt: new Date(2026, 9, 11) }],
      aiProfile: "## Uzmana Öneriler\n\n### Öncelikli Çalışma Alanları\n- /r/ kelime başı",
      recentProbes: [{ sound: "/r/", position: "initial", level: "word", runs: [{ date: new Date(2026, 9, 14), pct: 60 }, { date: new Date(2026, 9, 21), pct: 80 }] }],
    });
    const gozlem = t.indexOf("Son gözlemler:");
    const olcum = t.indexOf("Son ölçümler:");
    const profil = t.indexOf("Öncelikli çalışma alanları:");
    expect(olcum).toBeGreaterThan(gozlem);
    expect(profil).toBeGreaterThan(olcum);
    expect(t).toContain("- /r/ başta kelime: %60 → %80 (14.10.2026, 21.10.2026)");
  });

  it("ölçüm satırları 300 karakteri aşınca fazlası düşer; koşusuz seride alan yazılmaz", () => {
    const cok = Array.from({ length: 3 }, (_, i) => ({
      sound: `/${"rlsz"[i]}/`,
      position: "initial" as const,
      level: "word",
      runs: [{ date: new Date(2026, 9, 1), pct: 10 }, { date: new Date(2026, 9, 2), pct: 20 }, { date: new Date(2026, 9, 3), pct: 30 }],
    }));
    const t = renderStudentBlock({ ...temel, recentProbes: cok });
    const alan = t.slice(t.indexOf("Son ölçümler:"));
    expect(alan.split("\n").slice(1).join("\n").length).toBeLessThanOrEqual(300);
    expect(renderStudentBlock({ ...temel, recentProbes: [{ sound: "/r/", position: "initial", level: "word", runs: [] }] })).not.toContain("Son ölçümler:");
  });
```

`describe("loadStudentContext"` bloğunda: `prisma` taklidine `probeSeries: { findMany: vi.fn() },` ekle; `beforeEach` içine `prisma.probeSeries.findMany.mockResolvedValue([]);` ekle; bloğun sonuna:

```ts
  it("aktif serileri uzmanla kapsamlı çeker (en çok 3, koşular son 3) ve satırı tarih artan yazar", async () => {
    prisma.probeSeries.findMany.mockResolvedValue([
      { sound: "/r/", position: "initial", level: "word", runs: [{ date: new Date(2026, 9, 21), pct: 80 }, { date: new Date(2026, 9, 14), pct: 60 }] },
    ]);
    const blok = await loadStudentContext(prisma as never, istek);
    expect(prisma.probeSeries.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId: "s1", therapistId: "t1", active: true }, take: 3 }),
    );
    expect(blok).toContain("Son ölçümler:\n- /r/ başta kelime: %60 → %80 (14.10.2026, 21.10.2026)");
  });

  it("ölçüm sorgusu patlarsa yalnız o alan düşer", async () => {
    prisma.probeSeries.findMany.mockRejectedValue(new Error("db"));
    const blok = await loadStudentContext(prisma as never, istek);
    expect(blok).toContain("Öğrenci: Nisa");
    expect(blok).not.toContain("Son ölçümler:");
  });
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/probe/contextLine.test.ts src/modules/studio/lib/studentContext.test.ts`
Expected: FAIL — `contextLine` modülü yok; `recentProbes` tipi yok (tsc) ve yeni iddialar düşer.

- [ ] **Step 3: `contextLine.ts`**

```ts
// apps/hub/src/modules/studio/lib/probe/contextLine.ts
import { LEVEL_KISA, POSITION_KISA, type ProbePosition } from "./schema";

/* Bağlam bloğu "Son ölçümler" satırları (spec §8): seri başına tek satır, son N koşu tarih ARTAN.
   Saf; tarih biçimi enjekte edilir (bağlam bloğu gözlemlerle aynı `formatDate(d, "short")` = "14.10.2026" kullanır). */
export const OLCUM_SERI_TAVANI = 3;
export const OLCUM_KOSU_TAVANI = 3;

/** Grafik x-ekseni etiketi: "14.10" (yıl yok, dar alan). İstemci ve sunucuda aynı sonuç (yerel saat). */
export function gunAy(d: Date | string): string {
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, "0")}.${String(x.getMonth() + 1).padStart(2, "0")}`;
}

export interface ProbeSeriesSummary {
  sound: string;
  position: ProbePosition;
  level: string;
  runs: { date: Date; pct: number }[];
}

export function probeContextLines(series: ProbeSeriesSummary[], fmt: (d: Date) => string): string[] {
  const out: string[] = [];
  for (const s of series) {
    if (out.length >= OLCUM_SERI_TAVANI) break;
    if (!s.runs.length) continue;
    const son = [...s.runs].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-OLCUM_KOSU_TAVANI);
    const pos = POSITION_KISA[s.position] ?? s.position;
    const lvl = (LEVEL_KISA as Record<string, string>)[s.level] ?? s.level;
    out.push(`- ${s.sound} ${pos} ${lvl}: ${son.map((r) => `%${r.pct}`).join(" → ")} (${son.map((r) => fmt(r.date)).join(", ")})`);
  }
  return out;
}
```

- [ ] **Step 4: `studentContext.ts` değişiklikleri**

1. Import: `import { probeContextLines, type ProbeSeriesSummary } from "@studio/lib/probe/contextLine";`
2. `BUTCE` sabitine `olcum: 300` ekle (ör. `gozlem: 400, gozlemSayisi: 5, olcum: 300, profil: 1100, ...`). Üst yorumuna bir cümle: `"Son ölçümler" (en çok 3 seri × son 3 koşu) gözlemlerden sonra, 300 karakterle sınırlıdır.`
3. `StudentContextInput`'a, `recentObservations` alanının ardına:
   ```ts
     /** Aktif prob serileri (en çok 3), her birinde son koşular; boşsa satır yazılmaz. */
     recentProbes: ProbeSeriesSummary[];
   ```
4. `renderStudentBlock` içinde, `recentObservations` bloğunun HEMEN ARDINA (profil bloğundan önce):
   ```ts
     if (ctx.recentProbes.length) {
       // Satırlar hazır biçimde gelir; bütçe dolunca sondakiler düşer, başlık bütçeye sayılmaz (gözlemlerle aynı).
       const satirlar = probeContextLines(ctx.recentProbes, (d) => formatDate(d, "short"));
       const al: string[] = [];
       let kalan = BUTCE.olcum;
       for (const s of satirlar) {
         if (s.length + 1 > kalan) break;
         al.push(s);
         kalan -= s.length + 1;
       }
       if (al.length) adaylar.push(["Son ölçümler:", ...al]);
     }
   ```
5. `StudentContextPrisma` tipine `probeSeries: { findMany(args: unknown): Promise<unknown> };` ekle. Yeni satır tipi: `type ProbeSeriesRow = { sound: string; position: string; level: string; runs: { date: Date; pct: number }[] };`
6. `loadStudentContext` `Promise.allSettled` dizisine altıncı sorgu (gözlem sorgusunun ardına) ve sonuç adı `olcumS`:
   ```ts
         prisma.probeSeries.findMany({
           where: { studentId: args.studentId, therapistId: args.therapistId, active: true },
           orderBy: { createdAt: "desc" },
           take: OLCUM_SERI_TAVANI,
           select: {
             sound: true, position: true, level: true,
             runs: { orderBy: { date: "desc" }, take: OLCUM_KOSU_TAVANI, select: { date: true, pct: true } },
           },
         }),
   ```
   (`OLCUM_SERI_TAVANI`, `OLCUM_KOSU_TAVANI` import'a eklenir.) Ardından:
   ```ts
       const recentProbes = yedek<ProbeSeriesRow[]>(olcumS, "ölçümler", []).map((s) => ({
         sound: s.sound,
         position: s.position as ProbeSeriesSummary["position"],
         level: s.level,
         runs: [...s.runs].reverse(),
       }));
   ```
   ve `renderStudentBlock` çağrısına `recentProbes,` geçirilir (`recentObservations,` ardına).
7. `generateProfile.ts` içindeki yedek `renderStudentBlock({ ... recentObservations: [], ... })` çağrısına `recentProbes: [],` ekle. Repoda `recentObservations: []` yazan BAŞKA fikstür varsa (`grep -rn "recentObservations: \[\]" apps/hub/src`) hepsine `recentProbes: []` ekle (tsc söyler).

- [ ] **Step 5: Testler ve tip geçsin**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib && node_modules/.bin/tsc --noEmit`
Expected: PASS; tsc temiz.

- [ ] **Step 6: Commit**

```bash
git add apps/hub/src/modules/studio/lib/probe/contextLine.ts apps/hub/src/modules/studio/lib/probe/contextLine.test.ts apps/hub/src/modules/studio/lib/studentContext.ts apps/hub/src/modules/studio/lib/studentContext.test.ts apps/hub/src/modules/studio/lib/generateProfile.ts
git commit -m "feat(studio): öğrenci bağlam bloğuna 'Son ölçümler' satırı (aktif prob serileri, son 3 koşu)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
(Başka fikstür dosyası değiştiyse onları da ekle.)

---

### Task 5: Rotalar — seriler, koşu kaydı, koşu silme (+ rota testleri)

**Files:**
- Create: `apps/hub/src/app/studio/api/students/[id]/probes/route.ts`
- Create: `apps/hub/src/app/studio/api/students/[id]/probes/[seriesId]/runs/route.ts`
- Create: `apps/hub/src/app/studio/api/students/[id]/probes/runs/[runId]/route.ts`
- Create: `apps/hub/src/app/studio/api/students/[id]/probes/probes.test.ts`

Not: Next.js'te `probes/runs/[runId]` (statik `runs`) ile `probes/[seriesId]/runs` çakışmaz; statik bölüm önceliklidir.

- [ ] **Step 1: Başarısız rota testlerini yaz**

`apps/hub/src/app/studio/api/students/[id]/probes/probes.test.ts`:

```ts
// apps/hub/src/app/studio/api/students/[id]/probes/probes.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/* Rota sözleşmesi (spec §6): sahiplik kapısı, bankadan set, aynı anahtarda eski serinin pasifleşmesi,
   sunucu taraflı puanlama, kelime listesi uyuşmazlığı 400, silmede sahiplik. Prisma/auth/banka taklit. */
const prisma = {
  probeSeries: { findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  probeRun: { create: vi.fn(), deleteMany: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
};
vi.mock("@studio/lib/db", () => ({ prisma }));
vi.mock("@studio/lib/auth-helpers", () => ({
  requireAuth: vi.fn(async () => ({ session: { user: { id: "t1" } } })),
  requireStudentOwnership: vi.fn(async (id: string) => (id === "s1" ? { student: { id } } : NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 }))),
}));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: () => ({ allowed: true, retryAfter: 0 }), rateLimitResponse: () => new Response(null, { status: 429 }) }));
vi.mock("@studio/lib/generateWordImage", () => ({ lookupCachedWordImage: vi.fn(async () => null) }));

const req = (url: string, body?: unknown, method = "POST") =>
  new NextRequest(`http://x${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "content-type": "application/json" } });
const params = (p: Record<string, string>) => ({ params: Promise.resolve(p) });

beforeEach(() => vi.clearAllMocks());

describe("GET /students/[id]/probes", () => {
  it("sahiplik yoksa 404; varsa serileri aktif önce, koşuları tarih artan döner", async () => {
    const { GET } = await import("./route");
    expect((await GET(req("/p", undefined, "GET"), params({ id: "yok" }))).status).toBe(404);
    prisma.probeSeries.findMany.mockResolvedValue([
      { id: "ser1", sound: "/r/", position: "initial", level: "word", active: true, words: [{ word: "resim", syllableBreak: "re-sim", imageUrl: null }], createdAt: new Date(2026, 9, 1), runs: [{ id: "run1", date: new Date(2026, 9, 14), pct: 60, correct: 6, total: 10, cuedCount: 1, note: null }] },
    ]);
    const res = await GET(req("/p", undefined, "GET"), params({ id: "s1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(prisma.probeSeries.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: "s1", therapistId: "t1" }, orderBy: [{ active: "desc" }, { createdAt: "desc" }] }));
    expect(data.series[0].runs[0]).toMatchObject({ id: "run1", pct: 60 });
    expect(data.series[0].words[0].word).toBe("resim");
  });
});

describe("POST /students/[id]/probes", () => {
  it("geçersiz gövde 400; bankada kelime yoksa 400 (başta /ğ/)", async () => {
    const { POST } = await import("./route");
    expect((await POST(req("/p", { sound: "r", position: "initial" }), params({ id: "s1" }))).status).toBe(400);
    const res = await POST(req("/p", { sound: "/ğ/", position: "initial" }), params({ id: "s1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/yeterli kelime yok/);
    expect(prisma.probeSeries.create).not.toHaveBeenCalled();
  });
  it("aynı ses+pozisyon+düzeydeki aktif seri pasifleşir, yeni seri 201 ile döner", async () => {
    const { POST } = await import("./route");
    prisma.probeSeries.updateMany.mockResolvedValue({ count: 1 });
    prisma.probeSeries.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "ser2", ...data, createdAt: new Date(2026, 9, 2), runs: [] }));
    const res = await POST(req("/p", { sound: "/r/", position: "initial", count: 6 }), params({ id: "s1" }));
    expect(res.status).toBe(201);
    expect(prisma.probeSeries.updateMany).toHaveBeenCalledWith({ where: { studentId: "s1", therapistId: "t1", sound: "/r/", position: "initial", level: "word", active: true }, data: { active: false } });
    const { series } = await res.json();
    expect(series.words).toHaveLength(6);
    expect(series.active).toBe(true);
  });
});

describe("POST /students/[id]/probes/[seriesId]/runs", () => {
  const seri = { id: "ser1", studentId: "s1", therapistId: "t1", words: [{ word: "resim", syllableBreak: "re-sim", imageUrl: null }, { word: "radyo", syllableBreak: "rad-yo", imageUrl: null }] };
  it("seri bulunamazsa 404; kelime listesi serininkiyle aynı sıra değilse 400", async () => {
    const { POST } = await import("./[seriesId]/runs/route");
    prisma.probeSeries.findFirst.mockResolvedValue(null);
    expect((await POST(req("/r", { items: [{ word: "resim", correct: true }] }), params({ id: "s1", seriesId: "yok" }))).status).toBe(404);
    prisma.probeSeries.findFirst.mockResolvedValue(seri);
    const res = await POST(req("/r", { items: [{ word: "radyo", correct: true }, { word: "resim", correct: true }] }), params({ id: "s1", seriesId: "ser1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/kelime listesi/);
  });
  it("puan sunucuda hesaplanır (cued doğru sayılmaz), istemci sayıları yok sayılır, 201", async () => {
    const { POST } = await import("./[seriesId]/runs/route");
    prisma.probeSeries.findFirst.mockResolvedValue(seri);
    prisma.probeRun.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "run9", ...data, date: new Date(2026, 9, 14) }));
    const res = await POST(req("/r", { items: [{ word: "resim", correct: true, cued: true }, { word: "radyo", correct: true }], note: " ilk ", pct: 100 }), params({ id: "s1", seriesId: "ser1" }));
    expect(res.status).toBe(201);
    expect(prisma.probeRun.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ seriesId: "ser1", therapistId: "t1", correct: 1, total: 2, pct: 50, cuedCount: 1, note: "ilk" }) }));
    expect((await res.json()).run.pct).toBe(50);
  });
});

describe("DELETE /students/[id]/probes/runs/[runId]", () => {
  it("sahiplik therapistId ile; yoksa 404, varsa 200", async () => {
    const { DELETE } = await import("./runs/[runId]/route");
    prisma.probeRun.deleteMany.mockResolvedValue({ count: 0 });
    expect((await DELETE(req("/d", undefined, "DELETE"), params({ id: "s1", runId: "x" }))).status).toBe(404);
    prisma.probeRun.deleteMany.mockResolvedValue({ count: 1 });
    const res = await DELETE(req("/d", undefined, "DELETE"), params({ id: "s1", runId: "run1" }));
    expect(res.status).toBe(200);
    expect(prisma.probeRun.deleteMany).toHaveBeenCalledWith({ where: { id: "run1", therapistId: "t1", series: { studentId: "s1" } } });
  });
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `cd apps/hub && node_modules/.bin/vitest run "src/app/studio/api/students/[id]/probes"`
Expected: FAIL — rota modülleri yok.

- [ ] **Step 3: `probes/route.ts` (GET + POST)**

```ts
// apps/hub/src/app/studio/api/students/[id]/probes/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/studio/client";
import { prisma } from "@studio/lib/db";
import { requireAuth, requireStudentOwnership } from "@studio/lib/auth-helpers";
import { readJsonBody } from "@/lib/bodyLimit";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { zodError } from "@studio/lib/validation";
import { logError } from "@studio/lib/utils";
import { lookupCachedWordImage } from "@studio/lib/generateWordImage";
import { createSeriesSchema, type ProbeSeriesDto, type ProbeWord } from "@studio/lib/probe/schema";
import { BankaYetersizError, buildSeriesWords } from "@studio/lib/probe/buildSeries";

/* Ölçüm probu serileri (spec §6). AI yok, kredi yok, plan kapısı yok; sahiplik `requireStudentOwnership`. */

const LEVEL = "word";

type SeriesRow = {
  id: string; sound: string; position: string; level: string; active: boolean; words: unknown; createdAt: Date;
  runs: { id: string; date: Date; pct: number; correct: number; total: number; cuedCount: number; note: string | null }[];
};

function toDto(s: SeriesRow): ProbeSeriesDto {
  return {
    id: s.id,
    sound: s.sound,
    position: s.position as ProbeSeriesDto["position"],
    level: s.level,
    active: s.active,
    words: (s.words as ProbeWord[]) ?? [],
    createdAt: s.createdAt.toISOString(),
    runs: s.runs.map((r) => ({ id: r.id, date: r.date.toISOString(), pct: r.pct, correct: r.correct, total: r.total, cuedCount: r.cuedCount, note: r.note })),
  };
}

const SERIES_SELECT = {
  id: true, sound: true, position: true, level: true, active: true, words: true, createdAt: true,
  runs: { orderBy: { date: "asc" as const }, select: { id: true, date: true, pct: true, correct: true, total: true, cuedCount: true, note: true } },
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  try {
    const { id } = await params;
    const ownership = await requireStudentOwnership(id, session.user.id);
    if (ownership instanceof NextResponse) return ownership;

    const rows = (await prisma.probeSeries.findMany({
      where: { studentId: id, therapistId: session.user.id },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      select: SERIES_SELECT,
    })) as SeriesRow[];
    return NextResponse.json({ series: rows.map(toDto) });
  } catch (error) {
    logError("GET /studio/api/students/[id]/probes", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  const limit = rateLimit(`probe:${session.user.id}`, 30);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  try {
    const { id } = await params;
    const ownership = await requireStudentOwnership(id, session.user.id);
    if (ownership instanceof NextResponse) return ownership;

    const body = await readJsonBody(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const parsed = createSeriesSchema.safeParse(body.data);
    if (!parsed.success) return NextResponse.json({ error: zodError(parsed.error) }, { status: 400 });
    const { sound, position, count } = parsed.data;

    let words: ProbeWord[];
    try {
      words = await buildSeriesWords(sound, position, count, { lookupImage: lookupCachedWordImage });
    } catch (err) {
      if (err instanceof BankaYetersizError) return NextResponse.json({ error: err.message }, { status: 400 });
      throw err;
    }

    // Aynı anahtardaki aktif seri pasifleşir (koşuları kalır); yeni seri aktif açılır.
    await prisma.probeSeries.updateMany({
      where: { studentId: id, therapistId: session.user.id, sound, position, level: LEVEL, active: true },
      data: { active: false },
    });
    const created = (await prisma.probeSeries.create({
      data: { studentId: id, therapistId: session.user.id, sound, position, level: LEVEL, words: words as unknown as Prisma.InputJsonValue, active: true },
      select: SERIES_SELECT,
    })) as SeriesRow;
    return NextResponse.json({ series: toDto(created) }, { status: 201 });
  } catch (error) {
    logError("POST /studio/api/students/[id]/probes", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
```

- [ ] **Step 4: `probes/[seriesId]/runs/route.ts` (POST)**

```ts
// apps/hub/src/app/studio/api/students/[id]/probes/[seriesId]/runs/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/studio/client";
import { prisma } from "@studio/lib/db";
import { requireAuth, requireStudentOwnership } from "@studio/lib/auth-helpers";
import { readJsonBody } from "@/lib/bodyLimit";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { stripHtmlTags, zodError } from "@studio/lib/validation";
import { logError } from "@studio/lib/utils";
import { createRunSchema, type ProbeRunDto, type ProbeWord } from "@studio/lib/probe/schema";
import { scoreItems } from "@studio/lib/probe/score";

/* Koşu kaydı (spec §6): öğeler serinin kelime listesiyle birebir ve aynı sırada; puan sunucuda. Pasif seride de
   ölçüm alınabilir. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; seriesId: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  const limit = rateLimit(`probe:${session.user.id}`, 30);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  try {
    const { id, seriesId } = await params;
    const ownership = await requireStudentOwnership(id, session.user.id);
    if (ownership instanceof NextResponse) return ownership;

    const series = (await prisma.probeSeries.findFirst({
      where: { id: seriesId, studentId: id, therapistId: session.user.id },
      select: { id: true, words: true },
    })) as { id: string; words: unknown } | null;
    if (!series) return NextResponse.json({ error: "Seri bulunamadı" }, { status: 404 });

    const body = await readJsonBody(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const parsed = createRunSchema.safeParse(body.data);
    if (!parsed.success) return NextResponse.json({ error: zodError(parsed.error) }, { status: 400 });

    const words = (series.words as ProbeWord[]).map((w) => w.word);
    const gelen = parsed.data.items.map((i) => i.word);
    if (words.length !== gelen.length || words.some((w, i) => w !== gelen[i])) {
      return NextResponse.json({ error: "Öğeler serinin kelime listesiyle aynı sırada olmalı" }, { status: 400 });
    }
    const skor = scoreItems(parsed.data.items);
    if (skor.total === 0) return NextResponse.json({ error: "Boş prob kaydedilemez" }, { status: 400 });
    const note = parsed.data.note ? stripHtmlTags(parsed.data.note) || null : null;

    const run = (await prisma.probeRun.create({
      data: {
        seriesId: series.id,
        therapistId: session.user.id,
        items: parsed.data.items as unknown as Prisma.InputJsonValue,
        correct: skor.correct,
        total: skor.total,
        pct: skor.pct,
        cuedCount: skor.cuedCount,
        note,
      },
      select: { id: true, date: true, pct: true, correct: true, total: true, cuedCount: true, note: true },
    })) as { id: string; date: Date; pct: number; correct: number; total: number; cuedCount: number; note: string | null };
    const dto: ProbeRunDto = { ...run, date: run.date.toISOString() };
    return NextResponse.json({ run: dto }, { status: 201 });
  } catch (error) {
    logError("POST /studio/api/students/[id]/probes/[seriesId]/runs", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
```

- [ ] **Step 5: `probes/runs/[runId]/route.ts` (DELETE)**

```ts
// apps/hub/src/app/studio/api/students/[id]/probes/runs/[runId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@studio/lib/db";
import { requireAuth, requireStudentOwnership } from "@studio/lib/auth-helpers";
import { logError } from "@studio/lib/utils";

/* Tek koşuyu sil — sahiplik therapistId + öğrenci üzerinden (spec §6). */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  try {
    const { id, runId } = await params;
    const ownership = await requireStudentOwnership(id, session.user.id);
    if (ownership instanceof NextResponse) return ownership;
    const { count } = await prisma.probeRun.deleteMany({ where: { id: runId, therapistId: session.user.id, series: { studentId: id } } });
    if (count === 0) return NextResponse.json({ error: "Ölçüm bulunamadı" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("DELETE /studio/api/students/[id]/probes/runs/[runId]", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Testler, tip, lint**

Run: `cd apps/hub && node_modules/.bin/vitest run "src/app/studio/api/students/[id]/probes" && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint "src/app/studio/api/students/[id]/probes"`
Expected: 7 test PASS; tsc ve eslint temiz. `Prisma.InputJsonValue` tipi `@/generated/studio/client`'ta yoksa `import type { Prisma } from "@/generated/studio/client"` yerine Prisma'nın ürettiği dizinde `index.d.ts`'e bak (`ls src/generated/studio`) ve oradaki ad alanını kullan.

- [ ] **Step 7: Commit**

```bash
git add "apps/hub/src/app/studio/api/students/[id]/probes"
git commit -m "feat(studio): prob rotaları — seri aç (bankadan set), koşu kaydet (sunucu puanı), koşu sil

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Grafik geometrisi ve `ProbeChart`

**Files:**
- Create: `apps/hub/src/modules/studio/lib/probe/chartGeometry.ts`
- Create: `apps/hub/src/modules/studio/lib/probe/chartGeometry.test.ts`
- Create: `apps/hub/src/modules/studio/components/students/ProbeChart.tsx`

- [ ] **Step 1: Başarısız testi yaz**

```ts
// apps/hub/src/modules/studio/lib/probe/chartGeometry.test.ts
import { describe, expect, it } from "vitest";
import { CHART, chartGeometry } from "./chartGeometry";

describe("chartGeometry", () => {
  it("tek koşu: nokta yatayda ortada, yol yok", () => {
    const g = chartGeometry([{ pct: 50, label: "14.10" }]);
    expect(g.points).toHaveLength(1);
    expect(g.points[0]!.x).toBeCloseTo(CHART.pad.l + (CHART.w - CHART.pad.l - CHART.pad.r) / 2, 5);
    expect(g.path).toBe("");
  });
  it("y ekseni: %100 üstte (pad.t), %0 altta (h - pad.b); 80 çizgisi aradadır", () => {
    const g = chartGeometry([{ pct: 100, label: "a" }, { pct: 0, label: "b" }]);
    expect(g.points[0]!.y).toBeCloseTo(CHART.pad.t, 5);
    expect(g.points[1]!.y).toBeCloseTo(CHART.h - CHART.pad.b, 5);
    expect(g.line80Y).toBeGreaterThan(g.points[0]!.y);
    expect(g.line80Y).toBeLessThan(g.points[1]!.y);
  });
  it("çok koşu: x eşit aralıklı, yol M…L… biçiminde", () => {
    const g = chartGeometry([{ pct: 10, label: "a" }, { pct: 20, label: "b" }, { pct: 30, label: "c" }]);
    const dx = g.points[1]!.x - g.points[0]!.x;
    expect(g.points[2]!.x - g.points[1]!.x).toBeCloseTo(dx, 5);
    expect(g.path).toMatch(/^M [\d.]+ [\d.]+ L [\d.]+ [\d.]+ L [\d.]+ [\d.]+$/);
  });
  it("boş liste: nokta yok, yol boş", () => {
    expect(chartGeometry([])).toEqual({ points: [], path: "", line80Y: expect.any(Number) });
  });
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/probe/chartGeometry.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: Geometri**

```ts
// apps/hub/src/modules/studio/lib/probe/chartGeometry.ts
/* SVG çizgi grafiği geometrisi (spec §7): saf, testlenebilir; bileşen yalnız çizer. */
export const CHART = { w: 320, h: 140, pad: { l: 30, r: 12, t: 10, b: 24 } } as const;
export const GECIS_OLCUTU = 80;

export interface ChartPoint { x: number; y: number; pct: number; label: string }
export interface ChartGeometry { points: ChartPoint[]; path: string; line80Y: number }

const r2 = (n: number) => Math.round(n * 100) / 100;

export function chartGeometry(runs: ReadonlyArray<{ pct: number; label: string }>): ChartGeometry {
  const innerW = CHART.w - CHART.pad.l - CHART.pad.r;
  const innerH = CHART.h - CHART.pad.t - CHART.pad.b;
  const yOf = (pct: number) => r2(CHART.pad.t + ((100 - Math.max(0, Math.min(100, pct))) / 100) * innerH);
  const points = runs.map((r, i) => ({
    x: r2(runs.length === 1 ? CHART.pad.l + innerW / 2 : CHART.pad.l + (i / (runs.length - 1)) * innerW),
    y: yOf(r.pct),
    pct: r.pct,
    label: r.label,
  }));
  const path = points.length >= 2 ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") : "";
  return { points, path, line80Y: yOf(GECIS_OLCUTU) };
}
```

- [ ] **Step 4: `ProbeChart.tsx`**

```tsx
// apps/hub/src/modules/studio/components/students/ProbeChart.tsx
"use client";

import { CHART, GECIS_OLCUTU, chartGeometry } from "@studio/lib/probe/chartGeometry";

/* Satır içi SVG; kütüphane yok. Renkler poster token'ları (koyu temada da okunur). */
interface Props {
  runs: { pct: number; label: string }[];
  ariaLabel: string;
}

export function ProbeChart({ runs, ariaLabel }: Props) {
  const g = chartGeometry(runs);
  const yTicks = [0, 50, 100];
  const innerH = CHART.h - CHART.pad.t - CHART.pad.b;
  return (
    <svg viewBox={`0 0 ${CHART.w} ${CHART.h}`} role="img" aria-label={ariaLabel} style={{ width: "100%", height: "auto", display: "block" }}>
      {yTicks.map((t) => {
        const y = CHART.pad.t + ((100 - t) / 100) * innerH;
        return (
          <g key={t}>
            <line x1={CHART.pad.l} x2={CHART.w - CHART.pad.r} y1={y} y2={y} stroke="var(--poster-ink-faint)" strokeWidth={1} />
            <text x={CHART.pad.l - 6} y={y + 4} fontSize={9} textAnchor="end" fill="var(--poster-ink-3)">%{t}</text>
          </g>
        );
      })}
      <line x1={CHART.pad.l} x2={CHART.w - CHART.pad.r} y1={g.line80Y} y2={g.line80Y} stroke="var(--poster-green)" strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={CHART.w - CHART.pad.r} y={g.line80Y - 3} fontSize={9} textAnchor="end" fill="var(--poster-green)">%{GECIS_OLCUTU} geçiş ölçütü</text>
      {g.path && <path d={g.path} fill="none" stroke="var(--poster-accent)" strokeWidth={2.5} strokeLinejoin="round" />}
      {g.points.map((p) => (
        <g key={`${p.label}-${p.x}`}>
          <circle cx={p.x} cy={p.y} r={4.5} fill="var(--poster-accent)" stroke="var(--poster-ink)" strokeWidth={1.5}>
            <title>{p.label}: %{p.pct}</title>
          </circle>
          <text x={p.x} y={CHART.h - 8} fontSize={9} textAnchor="middle" fill="var(--poster-ink-3)">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}
```

- [ ] **Step 5: Test, tip, lint**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/probe/chartGeometry.test.ts && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint src/modules/studio/components/students/ProbeChart.tsx src/modules/studio/lib/probe`
Expected: 4 test PASS; temiz.

- [ ] **Step 6: Commit**

```bash
git add apps/hub/src/modules/studio/lib/probe/chartGeometry.ts apps/hub/src/modules/studio/lib/probe/chartGeometry.test.ts apps/hub/src/modules/studio/components/students/ProbeChart.tsx
git commit -m "feat(studio): prob grafiği — saf geometri + SVG bileşeni (%80 geçiş çizgisi)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Tam ekran sayaç (`ProbeRunner`)

**Files:**
- Create: `apps/hub/src/modules/studio/components/students/ProbeRunner.tsx`
- Modify: `apps/hub/src/modules/studio/lib/koyuTemaKontrast.test.ts` (`it.each` listesine iki bileşen)

- [ ] **Step 1: Koyu tema bekçisini genişlet (kırmızı: dosya yok)**

`koyuTemaKontrast.test.ts` içindeki `it.each([...SAYFALAR.map(...), ["CardGeneratorForm", ...] as const])` dizisine iki öğe ekle:

```ts
           ["ProbeRunner", path.join(SRC, "modules/studio/components/students/ProbeRunner.tsx")] as const,
           ["ProbeTab", path.join(SRC, "modules/studio/components/students/ProbeTab.tsx")] as const,
```

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/koyuTemaKontrast.test.ts`
Expected: FAIL — ENOENT (iki dosya henüz yok). (ProbeTab Task 8'de gelir; bu görevde test kırmızı kalır, Task 8 sonunda yeşil.)

- [ ] **Step 2: `ProbeRunner.tsx`**

```tsx
// apps/hub/src/modules/studio/components/students/ProbeRunner.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X, RotateCcw, Eye, EyeOff } from "lucide-react";
import { PBtn, PTextarea } from "@studio/components/poster";
import { POSITION_LABEL, type ProbePosition, type ProbeWord, type RunItem } from "@studio/lib/probe/schema";
import { scoreItems } from "@studio/lib/probe/score";

/* Tam ekran sayaç (spec §7). Tek dokunuş doğru/yanlış, öğe başına "ipucuyla", geri al, kelimeyi gizle.
   Klavye: D doğru · Y yanlış · İ/I ipucu · Backspace geri al · Esc vazgeç. Yarım prob kaydedilmez. */
interface Props {
  sound: string;
  position: ProbePosition;
  words: ProbeWord[];
  onCancel: () => void;
  onSave: (items: RunItem[], note: string) => Promise<void>;
}

export function ProbeRunner({ sound, position, words, onCancel, onSave }: Props) {
  const [items, setItems] = useState<RunItem[]>([]);
  const [cued, setCued] = useState(false);
  const [showWord, setShowWord] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const index = items.length;
  const current = words[index];
  const done = index >= words.length;

  const mark = useCallback((correct: boolean) => {
    if (!current) return;
    setItems((prev) => [...prev, { word: current.word, correct, cued }]);
    setCued(false);
  }, [current, cued]);

  const undo = useCallback(() => {
    setItems((prev) => prev.slice(0, -1));
    setCued(false);
  }, []);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onCancel(); return; }
      if (done || saving) return;
      const k = e.key.toLocaleLowerCase("tr-TR");
      if (k === "d") mark(true);
      else if (k === "y") mark(false);
      else if (k === "i" || k === "ı") setCued((c) => !c);
      else if (e.key === "Backspace") undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, saving, mark, undo, onCancel]);

  async function save() {
    setSaving(true);
    try { await onSave(items, note.trim()); } finally { setSaving(false); }
  }

  const skor = scoreItems(items);

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Prob: ${sound} ${POSITION_LABEL[position]}`}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--poster-bg)", color: "var(--poster-ink)", display: "flex", flexDirection: "column", padding: 16, outline: "none" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <strong style={{ fontFamily: "var(--font-display)" }}>{sound} · {POSITION_LABEL[position]}</strong>
        <span aria-live="polite" style={{ fontWeight: 800 }}>{Math.min(index + 1, words.length)} / {words.length}</span>
        <PBtn as="button" variant="white" size="sm" onClick={onCancel} aria-label="Probu iptal et">Vazgeç</PBtn>
      </div>

      {!done && current && (
        <>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 0 }}>
            {current.imageUrl ? (
              // Kelime gizliyken alt boş: resim adlandırmada ipucu sızmasın.
              <img src={current.imageUrl} alt={showWord ? current.word : ""} style={{ maxHeight: "48vh", maxWidth: "90vw", borderRadius: 18, border: "2px solid var(--poster-ink)", boxShadow: "0 6px 0 var(--poster-ink)", objectFit: "contain" }} />
            ) : null}
            <div style={{ fontSize: current.imageUrl ? 28 : 48, fontWeight: 800, fontFamily: "var(--font-display)", minHeight: 40, visibility: showWord ? "visible" : "hidden" }} aria-hidden={!showWord}>
              {current.word}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button type="button" onClick={() => mark(true)} aria-label="Doğru (D)" style={{ padding: "22px 10px", fontSize: 20, fontWeight: 800, borderRadius: 14, border: "2px solid var(--poster-ink)", boxShadow: "0 4px 0 var(--poster-ink)", background: "var(--poster-green)", color: "var(--poster-on-color)", cursor: "pointer" }}>
              <Check size={22} aria-hidden /> Doğru
            </button>
            <button type="button" onClick={() => mark(false)} aria-label="Yanlış (Y)" style={{ padding: "22px 10px", fontSize: 20, fontWeight: 800, borderRadius: 14, border: "2px solid var(--poster-ink)", boxShadow: "0 4px 0 var(--poster-ink)", background: "var(--poster-accent)", color: "var(--poster-on-color)", cursor: "pointer" }}>
              <X size={22} aria-hidden /> Yanlış
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <PBtn as="button" variant={cued ? "accent" : "white"} size="sm" onClick={() => setCued((c) => !c)} aria-pressed={cued} aria-label="İpucuyla (İ)">
              {cued ? "İpucuyla ✓" : "İpucuyla"}
            </PBtn>
            <PBtn as="button" variant="white" size="sm" onClick={undo} disabled={index === 0} aria-label="Geri al (Backspace)"><RotateCcw size={14} aria-hidden /> Geri al</PBtn>
            <PBtn as="button" variant="white" size="sm" onClick={() => setShowWord((s) => !s)} aria-label={showWord ? "Kelimeyi gizle" : "Kelimeyi göster"}>
              {showWord ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />} {showWord ? "Kelimeyi gizle" : "Kelimeyi göster"}
            </PBtn>
          </div>
        </>
      )}

      {done && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12, maxWidth: 520, margin: "0 auto", width: "100%" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: 0 }}>%{skor.pct} bağımsız ({skor.correct}/{skor.total})</h2>
          <p style={{ margin: 0, color: "var(--poster-ink-3)" }}>{skor.cuedCount} ipuçlu · {skor.total - skor.correct - skor.cuedCount} yanlış</p>
          <PTextarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} placeholder="Tek satır not (isteğe bağlı)" rows={2} />
          <div style={{ display: "flex", gap: 8 }}>
            <PBtn as="button" variant="accent" onClick={save} disabled={saving}>Kaydet</PBtn>
            <PBtn as="button" variant="white" onClick={undo} disabled={saving}>Son öğeyi düzelt</PBtn>
            <PBtn as="button" variant="white" onClick={onCancel} disabled={saving}>Vazgeç</PBtn>
          </div>
        </div>
      )}
    </div>
  );
}
```

Poster `PBtn` `variant` değerleri repoda `accent` ve `white` olarak kullanılıyor (AssistantTab, öğrenci sayfası); `PTextarea` `rows`/`placeholder` alır. Farklı bir imza görürsen (`grep -n "variant" src/modules/studio/components/landing/poster-ui.tsx`) o imzaya uy.

- [ ] **Step 3: Tip ve lint**

Run: `cd apps/hub && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint src/modules/studio/components/students/ProbeRunner.tsx`
Expected: temiz. `#fff` kullanılmadı; `active ?` kalıbı yok.

- [ ] **Step 4: Commit**

```bash
git add apps/hub/src/modules/studio/components/students/ProbeRunner.tsx apps/hub/src/modules/studio/lib/koyuTemaKontrast.test.ts
git commit -m "feat(studio): tam ekran prob sayacı (doğru/yanlış/ipucu, geri al, klavye, özet+not)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Ölçüm sekmesi (`ProbeTab`) ve öğrenci sayfasına bağlama

**Files:**
- Create: `apps/hub/src/modules/studio/components/students/ProbeTab.tsx`
- Modify: `apps/hub/src/app/studio/(main)/students/[id]/page.tsx` (import, `activeTab` tipi, sekme listesi, render)

- [ ] **Step 1: `ProbeTab.tsx`**

```tsx
// apps/hub/src/modules/studio/components/students/ProbeTab.tsx
"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PBtn, PCard, PBadge, PModal, PSpinner, PEmptyState, PSelect, PLabel } from "@studio/components/poster";
import { formatDate } from "@studio/lib/utils";
import { gunAy } from "@studio/lib/probe/contextLine";
import { POSITION_LABEL, PROBE_COUNT, PROBE_POSITIONS, PROBE_SOUNDS, type ProbePosition, type ProbeSeriesDto, type RunItem } from "@studio/lib/probe/schema";
import { ProbeChart } from "./ProbeChart";
import { ProbeRunner } from "./ProbeRunner";

/* Ölçüm sekmesi (spec §7): seriler (aktif önce), grafik, son koşular, "Prob başlat", "Seti yenile", koşu sil. */
interface Props { studentId: string }

export function ProbeTab({ studentId }: Props) {
  const [series, setSeries] = useState<ProbeSeriesDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ sound: string; position: ProbePosition; count: number }>({ sound: "/r/", position: "initial", count: PROBE_COUNT.default });
  const [running, setRunning] = useState<ProbeSeriesDto | null>(null);
  const [renewing, setRenewing] = useState<ProbeSeriesDto | null>(null);
  const [deleting, setDeleting] = useState<{ seriesId: string; runId: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const base = `/studio/api/students/${studentId}/probes`;

  async function load() {
    try {
      const r = await fetch(base);
      if (!r.ok) throw new Error();
      setSeries(((await r.json()).series ?? []) as ProbeSeriesDto[]);
    } catch { toast.error("Ölçümler yüklenemedi"); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function createSeries(sound: string, position: ProbePosition, count: number) {
    setCreating(true);
    try {
      const r = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sound, position, count }) });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error ?? "Seri açılamadı"); return null; }
      await load();
      setShowForm(false);
      setRenewing(null);
      return d.series as ProbeSeriesDto;
    } finally { setCreating(false); }
  }

  async function saveRun(s: ProbeSeriesDto, items: RunItem[], note: string) {
    const r = await fetch(`${base}/${s.id}/runs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, note: note || undefined }) });
    const d = await r.json();
    if (!r.ok) { toast.error(d.error ?? "Kaydedilemedi"); return; }
    toast.success(`Kaydedildi: %${d.run.pct}`);
    setRunning(null);
    await load();
  }

  async function deleteRun() {
    if (!deleting) return;
    const r = await fetch(`${base}/runs/${deleting.runId}`, { method: "DELETE" });
    if (!r.ok) toast.error("Silinemedi"); else await load();
    setDeleting(null);
  }

  if (loading) return <PSpinner fullPanel label="Yükleniyor…" style={{ minHeight: 240 }} />;

  const aktif = series.filter((s) => s.active);
  const eski = series.filter((s) => !s.active);

  const Form = (
    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr", alignItems: "end" }}>
      <div>
        <PLabel htmlFor="probe-sound">Ses</PLabel>
        <PSelect id="probe-sound" value={form.sound} onChange={(e) => setForm({ ...form, sound: e.target.value })}>
          {PROBE_SOUNDS.map((s) => <option key={s} value={s}>{s}</option>)}
        </PSelect>
      </div>
      <div>
        <PLabel htmlFor="probe-position">Pozisyon</PLabel>
        <PSelect id="probe-position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value as ProbePosition })}>
          {PROBE_POSITIONS.map((p) => <option key={p} value={p}>{POSITION_LABEL[p]}</option>)}
        </PSelect>
      </div>
      <div>
        <PLabel htmlFor="probe-count">Kelime sayısı</PLabel>
        <PSelect id="probe-count" value={String(form.count)} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}>
          {Array.from({ length: PROBE_COUNT.max - PROBE_COUNT.min + 1 }, (_, i) => PROBE_COUNT.min + i).map((n) => <option key={n} value={n}>{n}</option>)}
        </PSelect>
      </div>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
        <PBtn as="button" variant="accent" size="sm" onClick={() => void createSeries(form.sound, form.position, form.count)} disabled={creating}>Seriyi aç</PBtn>
        <PBtn as="button" variant="white" size="sm" onClick={() => setShowForm(false)} disabled={creating}>Vazgeç</PBtn>
      </div>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Ölçüm</h2>
            <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: "2px 0 0" }}>Bankadan sabit kelime setiyle seans içi prob · hak düşmez</p>
          </div>
          {!showForm && <PBtn as="button" variant="accent" size="sm" onClick={() => setShowForm(true)}><Plus size={14} aria-hidden /> Yeni seri</PBtn>}
        </div>
        {showForm && <div style={{ marginTop: 14 }}>{Form}</div>}
      </PCard>

      {aktif.length === 0 && !showForm && (
        <PEmptyState title="Henüz ölçüm yok" subtitle="İlk seriyi açıp probu başlatın; sonuçlar burada seri hâlinde grafiğe dönüşür." size="compact" />
      )}

      {[...aktif, ...eski].map((s) => (
        <PCard key={s.id} rounded={18} style={{ padding: 18, background: "var(--poster-panel)", opacity: s.active ? 1 : 0.75 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ fontFamily: "var(--font-display)" }}>{s.sound} · {POSITION_LABEL[s.position]} · {s.words.length} kelime</strong>
              {!s.active && <PBadge color="soft">önceki set</PBadge>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <PBtn as="button" variant="accent" size="sm" onClick={() => setRunning(s)}><Play size={14} aria-hidden /> Prob başlat</PBtn>
              {s.active && <PBtn as="button" variant="white" size="sm" onClick={() => setRenewing(s)}><RefreshCw size={14} aria-hidden /> Seti yenile</PBtn>}
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: "6px 0 10px" }}>{s.words.map((w) => w.word).join(" · ")}</p>
          {s.runs.length > 0 ? (
            <>
              <ProbeChart runs={s.runs.map((r) => ({ pct: r.pct, label: gunAy(r.date) }))} ariaLabel={`${s.sound} ${POSITION_LABEL[s.position]} ölçüm grafiği`} />
              <table style={{ width: "100%", fontSize: 12, marginTop: 8, borderCollapse: "collapse" }}>
                <thead><tr style={{ textAlign: "left", color: "var(--poster-ink-3)" }}><th>Tarih</th><th>Bağımsız</th><th>İpuçlu</th><th>Not</th><th aria-label="İşlem" /></tr></thead>
                <tbody>
                  {[...s.runs].reverse().map((r) => (
                    <tr key={r.id} style={{ borderTop: "1px solid var(--poster-ink-faint)" }}>
                      <td style={{ padding: "6px 4px" }}>{formatDate(r.date, "short")}</td>
                      <td style={{ padding: "6px 4px", fontWeight: 800 }}>%{r.pct} ({r.correct}/{r.total})</td>
                      <td style={{ padding: "6px 4px" }}>{r.cuedCount}</td>
                      <td style={{ padding: "6px 4px" }}>{r.note ?? ""}</td>
                      <td style={{ padding: "6px 4px", textAlign: "right" }}>
                        <button type="button" onClick={() => setDeleting({ seriesId: s.id, runId: r.id })} aria-label="Ölçümü sil" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--poster-ink-3)" }}><Trash2 size={15} aria-hidden /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: 0 }}>Bu seride henüz ölçüm yok.</p>
          )}
        </PCard>
      ))}

      {running && (
        <ProbeRunner sound={running.sound} position={running.position} words={running.words} onCancel={() => setRunning(null)} onSave={(items, note) => saveRun(running, items, note)} />
      )}

      {renewing && (
        <PModal open onClose={() => setRenewing(null)} title="Seti yenile">
          <p style={{ fontSize: 13, margin: "0 0 12px" }}>Yeni set yeni bir seri açar; eski grafik "önceki setler" altında kalır. Devam edilsin mi?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <PBtn as="button" variant="accent" size="sm" onClick={() => void createSeries(renewing.sound, renewing.position, renewing.words.length)} disabled={creating}>Yenile</PBtn>
            <PBtn as="button" variant="white" size="sm" onClick={() => setRenewing(null)} disabled={creating}>Vazgeç</PBtn>
          </div>
        </PModal>
      )}

      {deleting && (
        <PModal open onClose={() => setDeleting(null)} title="Ölçümü sil">
          <p style={{ fontSize: 13, margin: "0 0 12px" }}>Bu ölçüm silinecek. Devam edilsin mi?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <PBtn as="button" variant="accent" size="sm" onClick={() => void deleteRun()}>Sil</PBtn>
            <PBtn as="button" variant="white" size="sm" onClick={() => setDeleting(null)}>Vazgeç</PBtn>
          </div>
        </PModal>
      )}
    </div>
  );
}
```

`PSelect`/`PLabel`/`PEmptyState` imzaları `src/modules/studio/components/poster/index.tsx` ve `PEmptyState.tsx`'tedir; prop adları farklıysa (ör. `PEmptyState` `subtitle` yerine `description`) dosyadaki imzaya uy.

- [ ] **Step 2: Öğrenci sayfası**

`apps/hub/src/app/studio/(main)/students/[id]/page.tsx`:
- Import satırlarına (AssistantTab import'unun ardına): `import { ProbeTab } from "@studio/components/students/ProbeTab";`
- `useState<"cards" | "progress" | "aiProfile" | "assistant">("cards")` → `useState<"cards" | "progress" | "aiProfile" | "assistant" | "probe">("cards")`
- Sekme listesine `{ key: "assistant", label: "Asistan", count: null },` satırının ardına: `{ key: "probe", label: "Ölçüm", count: null },`
- `{/* Assistant tab */}` bloğunun ardına:
  ```tsx
        {/* Probe tab */}
        {activeTab === "probe" && <ProbeTab studentId={student.id} />}
  ```

- [ ] **Step 3: Testler, tip, lint**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/koyuTemaKontrast.test.ts && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint src/modules/studio/components/students "src/app/studio/(main)/students/[id]/page.tsx"`
Expected: koyu tema testi PASS (iki yeni dosyada `active ?` + `#fff` yok); tsc ve eslint temiz.

- [ ] **Step 4: Commit**

```bash
git add apps/hub/src/modules/studio/components/students/ProbeTab.tsx "apps/hub/src/app/studio/(main)/students/[id]/page.tsx"
git commit -m "feat(studio): öğrenci sayfasına Ölçüm sekmesi — seriler, grafik, prob başlat, seti yenile, koşu sil

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Bütün doğrulama (test, tip, lint, build, tarayıcı)

- [ ] **Step 1: Birim testleri ve eval kapısı**

Run: `cd apps/hub && node_modules/.bin/vitest run`
Expected: tümü PASS (yeni 9 dosya dahil).

Run: `cd apps/hub && node_modules/.bin/vitest run --config vitest.eval.config.ts evals/lib evals/tools evals/runner.selftest.eval.ts`
Expected: PASS (bağlam bloğu alanı eval'in `renderStudent` kopyasını etkilemez; etkilerse `evals/lib/renderStudent.ts`'e `recentProbes: []` fikstürü eklenir).

- [ ] **Step 2: Tip, lint, build**

Run: `pnpm typecheck` → 4/4 geçer.
Run: `cd apps/hub && node_modules/.bin/eslint src/modules/studio/lib/probe src/modules/studio/components/students "src/app/studio/api/students/[id]/probes" src/modules/studio/lib/studentContext.ts` → temiz.
Run: `cd apps/hub && node_modules/.bin/next build` (arka planda, 2–5 dk) → başarılı; `git status --short` temiz.

- [ ] **Step 3: Tarayıcı (yalnız okuma; dev sunucusu PROD DB'ye bakar)**

`.claude/launch.json` worktree'de var (`hub`, port 3001). `preview_start {name:"hub"}` → giriş gerekir. Giriş verilmezse: bu adım "build ile doğrulandı, görsel kontrol kullanıcıda" diye raporlanır. Verilirse: öğrenci sayfası → "Ölçüm" sekmesi boş durum → "Yeni seri" formu → "Seriyi aç" (bu YAZAR: yalnız kullanıcının test hesabında) → "Prob başlat" → 10 kelimeyi işaretle → "Vazgeç" (kayıt yok) → ikinci kez "Kaydet" → grafikte nokta → "Ölçümü sil". Konsolda hata yok. Ekran görüntüsü paylaşılır.

- [ ] **Step 4: Spec'e uygulama notu + hafıza**

`docs/superpowers/specs/2026-11-04-olcum-probu-design.md` §3/§9'daki `toolGate` muafiyeti satırlarını "gerekmedi (test yalnız api/tools altını tarar)" diye, §8 örneğini de "(14.10.2026, 21.10.2026, 28.10.2026)" diye düzelt. Hafıza notu `egitim-felsefesi-degerlendirmesi-2026-11.md`'ye "Faz 1a ölçüm probu TAMAM (dal, commit sayısı, migration 0020 prod'a UYGULANMADI)" satırı. Commit:

```bash
git add docs/superpowers/specs/2026-11-04-olcum-probu-design.md
git commit -m "docs(spec): ölçüm probu — toolGate muafiyeti gerekmedi notu

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 5: Dal durumu**

`git log --oneline main..HEAD` ile Faz 0 + Faz 1a commit listesi. Merge/PR ve `0020_probe.sql`'in prod'a uygulanması kullanıcı kararıdır (deploy sırası: önce SQL, sonra kod).
