# Veli Geri Bildirim Bağlantısı — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uzman öğrenci sayfasından çocuğa özel sürekli bir bağlantı/QR üretir; veli hesapsız, telefonda üç soruyu yanıtlar; yanıt `source=parent` gözlem olarak Asistan sekmesine ve öğrenci bağlam bloğuna ("Veli geri bildirimi") girer.

**Architecture:** Migration `0021` (`ParentLink` tablosu + `StudentObservation.source/meta`), saf kütüphane `src/modules/studio/lib/parentLink/` (token, zod şema + çip katalogu, metin derleyici, bağlam satırı), açık sayfa `/veli/[token]` + açık API `/api/veli/[token]`, uzman rotaları `students/[id]/parent-link`, `ParentLinkModal` (QR `qrcode` ile), Asistan sekmesinde rozet, bağlam/kota filtreleri, gizlilik paragrafı. AI yok, kredi yok, plan kapısı yok.

**Tech Stack:** Next.js 16 / React 19 / TS strict · Prisma (Studio DB, raw SQL) · zod v4 · vitest (node, `src/**/*.test.ts`) · `qrcode` 1.5.x.

**Spec:** `docs/superpowers/specs/2026-11-05-veli-geri-bildirim-baglantisi-design.md`

**Çalışma dizini:** `/Users/recepkucuk/ludenlab/.claude/worktrees/ludenlabi-egitim-degerlendirmesi-1c8bb2` (worktree, dal `claude/ludenlabi-egitim-degerlendirmesi-1c8bb2`). Hub komutları `apps/hub` içinden `node_modules/.bin/...`; `git add` repo kökünden. Commit trailer: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. `git stash` YASAK; dev sunucusu PROD DB'ye bakar, DB'ye dokunma.

**Faz 1a dersleri (uygula):** CASCADE testleri kısıt bazlı regex; `.catch` yerine `try/await`; çift gönderime karşı kısmi tekil indeks + P2002→409; `useCallback` kararlı callback'ler; rota testlerinde sahiplik `where`'ini, `$transaction` çağrısını ve owner-404'te yazma olmamasını kilitle; `loadStudentContext` testlerinde aynı modele iki sorgu varsa mock'u `where` ile ayır.

---

## Dosya haritası

| Dosya | Sorumluluk | İşlem |
|---|---|---|
| `apps/hub/prisma/sql/0021_parent_link.sql` | ParentLink + gözlem sütunları | Create |
| `apps/hub/prisma/studio/schema.prisma` | `ParentLink` modeli, `StudentObservation.source/meta`, ilişkiler | Modify |
| `apps/hub/src/lib/parentLinkMigration.test.ts` | SQL kaynak-metin testi | Create |
| `apps/hub/src/modules/studio/lib/parentLink/token.ts` (+test) | `generateToken`, `isTokenShape` | Create |
| `apps/hub/src/modules/studio/lib/parentLink/schema.ts` (+test) | çip katalogu, `parentFeedbackSchema`, DTO tipleri | Create |
| `apps/hub/src/modules/studio/lib/parentLink/composeText.ts` (+test) | yanıt → gözlem metni | Create |
| `apps/hub/src/modules/studio/lib/parentLink/contextLine.ts` (+test) | bağlam satırları | Create |
| `apps/hub/src/app/api/veli/[token]/route.ts` (+`veli.test.ts`) | açık GET/POST | Create |
| `apps/hub/src/app/studio/api/students/[id]/parent-link/route.ts` (+`parentLink.test.ts`) | uzman GET/POST/DELETE | Create |
| `apps/hub/src/modules/studio/lib/audit-labels.ts` | 3 yeni etiket | Modify |
| `apps/hub/src/app/studio/api/students/[id]/observations/route.ts` | select `source`, `meta` | Modify |
| `apps/hub/src/app/studio/api/observations/[obsId]/route.ts` | PATCH `source=parent` → 400 | Modify |
| `apps/hub/src/app/studio/api/students/[id]/assistant/route.ts` | günlük kota `source: "therapist"` | Modify |
| `apps/hub/src/modules/studio/lib/studentContext.ts` (+test) | gözlem sorgusu `source` filtresi, `recentParentFeedback` alanı | Modify |
| `apps/hub/src/modules/studio/lib/generateProfile.ts` | yedek çağrıya `recentParentFeedback: []` | Modify |
| `apps/hub/src/components/UmamiScript.tsx` | `/veli/` altında Umami yüklenmez | Create |
| `apps/hub/src/app/layout.tsx` | `UmamiScript` kullanır | Modify |
| `apps/hub/src/app/veli/[token]/layout.tsx`, `page.tsx` | açık sayfa kabuğu + SSR token denetimi | Create |
| `apps/hub/src/modules/studio/components/parent/ParentFeedbackForm.tsx` | veli formu (client) | Create |
| `apps/hub/src/modules/studio/components/students/ParentLinkModal.tsx` | QR/URL/iptal/yenile | Create |
| `apps/hub/src/app/studio/(main)/students/[id]/page.tsx` | başlıkta düğme + modal | Modify |
| `apps/hub/src/modules/studio/components/students/AssistantTab.tsx` | "Veli" rozeti, düzenleme gizli | Modify |
| `apps/hub/src/modules/studio/lib/koyuTemaKontrast.test.ts` | iki bileşen listeye | Modify |
| `apps/hub/src/app/(legal)/gizlilik/page.tsx` | veli paragrafı | Modify |
| `apps/hub/package.json`, `pnpm-lock.yaml` | `qrcode`, `@types/qrcode` | Modify |

---

### Task 1: Veri modeli — 0021 SQL + Prisma + kaynak-metin testi

**Files:** Create `apps/hub/prisma/sql/0021_parent_link.sql`, `apps/hub/src/lib/parentLinkMigration.test.ts`; Modify `apps/hub/prisma/studio/schema.prisma`.

- [ ] **Step 1: Başarısız testi yaz**

```ts
// apps/hub/src/lib/parentLinkMigration.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* Veli bağlantısı migration'ı (spec 2026-11-05 §4). Hesap/öğrenci silme CASCADE'e dayanır (0020 dersi: kısıt bazlı
   regex, pencere değil). Mevcut tabloya sütun eklediği için deploy sırası ZORUNLU: önce SQL, sonra kod. */
const SQL = readFileSync(path.resolve(import.meta.dirname, "../../prisma/sql/0021_parent_link.sql"), "utf8");

describe("0021_parent_link.sql", () => {
  it("ParentLink idempotent; iki FK CASCADE; token unique; öğrenci başına tek aktif; RLS", () => {
    expect(SQL).toContain('CREATE TABLE IF NOT EXISTS public."ParentLink"');
    for (const [ad, tablo] of [["ParentLink_studentId_fkey", "Student"], ["ParentLink_therapistId_fkey", "Therapist"]] as const) {
      const re = new RegExp(`CONSTRAINT "${ad}"\\s+FOREIGN KEY \\("\\w+"\\) REFERENCES public\\."${tablo}"\\("id"\\) ON DELETE CASCADE`);
      expect(SQL, ad).toMatch(re);
    }
    expect(SQL).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS "ParentLink_token_key"\s+ON public\."ParentLink" \("token"\)/);
    expect(SQL).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS "ParentLink_student_active_uidx"[\s\S]*WHERE "active"/);
    expect(SQL).toContain('ALTER TABLE public."ParentLink" ENABLE ROW LEVEL SECURITY');
  });
  it("StudentObservation'a source (DEFAULT 'therapist') ve meta sütunları idempotent eklenir", () => {
    expect(SQL).toMatch(/ALTER TABLE public\."StudentObservation" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'therapist'/);
    expect(SQL).toMatch(/ALTER TABLE public\."StudentObservation" ADD COLUMN IF NOT EXISTS "meta" JSONB/);
    expect(SQL).toContain('"StudentObservation_studentId_source_createdAt_idx"');
  });
});
```

- [ ] **Step 2: Kırmızı:** `cd apps/hub && node_modules/.bin/vitest run src/lib/parentLinkMigration.test.ts` → ENOENT.

- [ ] **Step 3: SQL**

```sql
-- 0021_parent_link.sql
-- HEDEF DB: studio → public."ParentLink" (yeni) + public."StudentObservation" (iki sütun)
--
-- VELİ GERİ BİLDİRİM BAĞLANTISI (2026-11-05 tasarımı). Uzman çocuk başına sürekli bir bağlantı üretir;
-- veli hesapsız yanıtlar; yanıt StudentObservation'a source='parent' + meta ile yazılır.
-- Token DÜZ saklanır (bağlantı süresiz, modal QR'ı yeniden gösterir; token yalnız rumuzlu bir forma yanıt
-- yazma hakkı verir, okuma hakkı vermez).
--
-- Additive + idempotent; prisma migrate YOK — raw SQL. db push KULLANMA (kısmi tekil indeks Prisma'da yok).
-- DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod (kod önce giderse gözlem GET'i `source` seçerken 500 verir).
-- RLS: uygulama `postgres` rolüyle bağlanır (rolbypassrls); politika yok = anon deny-all (0016 gerekçesi).
-- GERİ ALMA: DROP TABLE public."ParentLink"; ALTER TABLE public."StudentObservation" DROP COLUMN "meta", DROP COLUMN "source";

CREATE TABLE IF NOT EXISTS public."ParentLink" (
  "id"             TEXT PRIMARY KEY,
  "studentId"      TEXT NOT NULL,
  "therapistId"    TEXT NOT NULL,
  "token"          TEXT NOT NULL,
  "active"         BOOLEAN NOT NULL DEFAULT TRUE,
  "answerCount"    INTEGER NOT NULL DEFAULT 0,
  "lastAnsweredAt" TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt"      TIMESTAMP(3),
  CONSTRAINT "ParentLink_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ParentLink_therapistId_fkey"
    FOREIGN KEY ("therapistId") REFERENCES public."Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ParentLink_token_key"
  ON public."ParentLink" ("token");
CREATE INDEX IF NOT EXISTS "ParentLink_studentId_active_idx"
  ON public."ParentLink" ("studentId", "active");
CREATE INDEX IF NOT EXISTS "ParentLink_therapistId_idx"
  ON public."ParentLink" ("therapistId");
-- Öğrenci başına tek AKTİF bağlantı: yenileme = pasifleştir + oluştur (tek transaction); eşzamanlı çift gönderim → P2002 → 409.
CREATE UNIQUE INDEX IF NOT EXISTS "ParentLink_student_active_uidx"
  ON public."ParentLink" ("studentId")
  WHERE "active";

ALTER TABLE public."ParentLink" ENABLE ROW LEVEL SECURITY;

-- Gözlem kaynağı: 'therapist' (varsayılan, mevcut satırlar) | 'parent'. meta: { days, easy[], hard[] } yalnız parent'ta.
ALTER TABLE public."StudentObservation" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'therapist';
ALTER TABLE public."StudentObservation" ADD COLUMN IF NOT EXISTS "meta" JSONB;
CREATE INDEX IF NOT EXISTS "StudentObservation_studentId_source_createdAt_idx"
  ON public."StudentObservation" ("studentId", "source", "createdAt");
```

- [ ] **Step 4: Prisma**

`StudentObservation` modeline (`text` satırından sonra):
```prisma
  source      String   @default("therapist") // "therapist" | "parent" — DDL: sql/0021_parent_link.sql
  meta        Json?    // parent: { days: 0..7, easy: string[], hard: string[] }
```
ve `@@index([studentId, source, createdAt])`. `StudentObservation` modelinden sonra:
```prisma
/// Veli geri bildirim bağlantısı (2026-11-05). Token DÜZ saklanır (gerekçe: sql/0021). Öğrenci başına tek aktif
/// bağlantı: kısmi tekil indeks ParentLink_student_active_uidx (WHERE active) Prisma'da ifade edilemez; raw SQL
/// otoriterdir (db push KULLANMA).
model ParentLink {
  id             String    @id @default(cuid())
  studentId      String
  therapistId    String
  token          String    @unique
  active         Boolean   @default(true)
  answerCount    Int       @default(0)
  lastAnsweredAt DateTime?
  createdAt      DateTime  @default(now())
  revokedAt      DateTime?

  student   Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  therapist Therapist @relation(fields: [therapistId], references: [id], onDelete: Cascade)

  @@index([studentId, active])
  @@index([therapistId])
}
```
`Therapist` ilişkilerine (`probeRuns` ardına) `parentLinks         ParentLink[]`; `Student` ilişkilerine (`probeSeries` ardına) `parentLinks  ParentLink[]`.

- [ ] **Step 5: Yeşil + üret:** `cd apps/hub && node_modules/.bin/prisma generate --schema prisma/studio/schema.prisma && node_modules/.bin/prisma validate --schema prisma/studio/schema.prisma && node_modules/.bin/vitest run src/lib/parentLinkMigration.test.ts && node_modules/.bin/tsc --noEmit` → 2 test PASS, tsc temiz.

- [ ] **Step 6: Commit** — `feat(studio): veli bağlantısı veri modeli — ParentLink + gözlemde source/meta (0021)`

---

### Task 2: Saf kütüphane — token, şema/çipler, metin derleyici, bağlam satırı

**Files:** Create `apps/hub/src/modules/studio/lib/parentLink/{token,schema,composeText,contextLine}.ts` ve `.test.ts`'leri.

- [ ] **Step 1: Başarısız testler**

```ts
// apps/hub/src/modules/studio/lib/parentLink/token.test.ts
import { describe, expect, it } from "vitest";
import { TOKEN_LENGTH, generateToken, isTokenShape } from "./token";

describe("generateToken / isTokenShape", () => {
  it("32 karakter base64url üretir; enjekte rastgelelikle deterministik", () => {
    const sabit = () => Buffer.alloc(24, 7);
    expect(generateToken(sabit)).toBe(generateToken(sabit));
    expect(generateToken(sabit)).toHaveLength(TOKEN_LENGTH);
    expect(isTokenShape(generateToken())).toBe(true);
    expect(generateToken()).not.toBe(generateToken());
  });
  it("biçim: tam 32 karakter [A-Za-z0-9_-]; + / = boş reddedilir", () => {
    expect(isTokenShape("a".repeat(32))).toBe(true);
    expect(isTokenShape("a".repeat(31))).toBe(false);
    expect(isTokenShape("a".repeat(33))).toBe(false);
    expect(isTokenShape("a".repeat(31) + "+")).toBe(false);
    expect(isTokenShape("a".repeat(31) + "/")).toBe(false);
    expect(isTokenShape("")).toBe(false);
  });
});
```

```ts
// apps/hub/src/modules/studio/lib/parentLink/schema.test.ts
import { describe, expect, it } from "vitest";
import { EASY_CHIPS, HARD_CHIPS, parentFeedbackSchema } from "./schema";

describe("parentFeedbackSchema", () => {
  it("geçerli gövde; easy/hard varsayılan boş; not trim", () => {
    const r = parentFeedbackSchema.parse({ days: 4, note: " iyi " });
    expect(r).toEqual({ days: 4, easy: [], hard: [], note: "iyi" });
  });
  it("days 0–7 tam sayı; dışı/ondalık/string red", () => {
    for (const d of [-1, 8, 3.5, "4"]) expect(parentFeedbackSchema.safeParse({ days: d }).success, String(d)).toBe(false);
    expect(parentFeedbackSchema.safeParse({ days: 0 }).success).toBe(true);
  });
  it("çipler katalogdan; tekrar ve bilinmeyen red; en çok katalog kadar", () => {
    expect(parentFeedbackSchema.safeParse({ days: 1, easy: ["istekle_oturdu", "oyunu_sevdi"] }).success).toBe(true);
    expect(parentFeedbackSchema.safeParse({ days: 1, easy: ["istekle_oturdu", "istekle_oturdu"] }).success).toBe(false);
    expect(parentFeedbackSchema.safeParse({ days: 1, hard: ["yok_boyle"] }).success).toBe(false);
    expect(EASY_CHIPS.map((c) => c.key)).toEqual(["istekle_oturdu", "soyledi", "oyunu_sevdi", "kendi_basladi"]);
    expect(HARD_CHIPS.map((c) => c.key)).toEqual(["oturmak_istemedi", "zorlandi", "zaman_bulamadik", "anlamadik"]);
  });
  it("not ≤300; 301 red; bilinmeyen anahtar atılır", () => {
    expect(parentFeedbackSchema.safeParse({ days: 1, note: "a".repeat(301) }).success).toBe(false);
    expect(parentFeedbackSchema.parse({ days: 1, pct: 9 })).not.toHaveProperty("pct");
  });
});
```

```ts
// apps/hub/src/modules/studio/lib/parentLink/composeText.test.ts
import { describe, expect, it } from "vitest";
import { composeObservationText } from "./composeText";

describe("composeObservationText", () => {
  it("tüm alanlar: gün, kolay, zor, not", () => {
    expect(composeObservationText({ days: 4, easy: ["istekle_oturdu", "oyunu_sevdi"], hard: ["zaman_bulamadik"], note: "Akşamları daha iyi." }))
      .toBe("Veli: 4 gün çalışıldı. Kolay: istekle oturdu, oyunu sevdi. Zor: zaman bulamadık. Not: Akşamları daha iyi.");
  });
  it("0 gün → 'bu hafta çalışılamadı'; boş gruplar atlanır; 1 gün tekil", () => {
    expect(composeObservationText({ days: 0, easy: [], hard: [], note: undefined })).toBe("Veli: bu hafta çalışılamadı.");
    expect(composeObservationText({ days: 1, easy: [], hard: ["zorlandi"], note: "" })).toBe("Veli: 1 gün çalışıldı. Zor: zorlandı.");
  });
  it("not tek satıra iner, HTML temizlenir, 1000 karakteri aşmaz", () => {
    const t = composeObservationText({ days: 7, easy: [], hard: [], note: "a<b>b</b>\n\nc  d" });
    expect(t).toBe("Veli: 7 gün çalışıldı. Not: ab c d");
    expect(composeObservationText({ days: 7, easy: [], hard: [], note: "x".repeat(300) }).length).toBeLessThanOrEqual(1000);
  });
});
```

```ts
// apps/hub/src/modules/studio/lib/parentLink/contextLine.test.ts
import { describe, expect, it } from "vitest";
import { VELI_SATIR_TAVANI, parentContextLines } from "./contextLine";

const gun = (d: number) => new Date(2026, 9, d);
describe("parentContextLines", () => {
  it("tarih ARTAN; 'Veli: ' öneki kırpılır; en çok 2 satır (en yeniler)", () => {
    const satirlar = parentContextLines([
      { text: "Veli: 5 gün çalışıldı. Not: c", createdAt: gun(21) },
      { text: "Veli: 2 gün çalışıldı.", createdAt: gun(7) },
      { text: "Veli: 4 gün çalışıldı. Zor: zorlandı.", createdAt: gun(14) },
    ]);
    expect(satirlar).toEqual(["- 14.10: 4 gün çalışıldı. Zor: zorlandı.", "- 21.10: 5 gün çalışıldı. Not: c"]);
    expect(VELI_SATIR_TAVANI).toBe(2);
  });
  it("boş → []; önek yoksa metin olduğu gibi", () => {
    expect(parentContextLines([])).toEqual([]);
    expect(parentContextLines([{ text: "serbest", createdAt: gun(1) }])).toEqual(["- 01.10: serbest"]);
  });
});
```

- [ ] **Step 2: Kırmızı:** `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/parentLink` → modüller yok.

- [ ] **Step 3: Uygulama**

```ts
// apps/hub/src/modules/studio/lib/parentLink/token.ts
import { randomBytes } from "node:crypto";

/* Bağlantı token'ı (spec §5): 24 bayt rastgele → base64url 32 karakter (192 bit). Sunucu tarafı (node:crypto). */
export const TOKEN_LENGTH = 32;
const SHAPE = /^[A-Za-z0-9_-]{32}$/;

export function generateToken(random: (n: number) => Buffer = randomBytes): string {
  return random(24).toString("base64url");
}

/** Biçimsiz token DB'ye sorulmadan 404 alır. */
export function isTokenShape(s: string): boolean {
  return SHAPE.test(s);
}
```

```ts
// apps/hub/src/modules/studio/lib/parentLink/schema.ts
import { z } from "zod";

/* Veli formu (spec §6). İstemci + sunucu paylaşır; server-only import YOK. */
export interface Chip { key: string; label: string }
export const EASY_CHIPS = [
  { key: "istekle_oturdu", label: "İstekle oturdu" },
  { key: "soyledi", label: "Hedef sesi/kelimeleri söyledi" },
  { key: "oyunu_sevdi", label: "Oyunu sevdi" },
  { key: "kendi_basladi", label: "Kendi başladı" },
] as const satisfies readonly Chip[];
export const HARD_CHIPS = [
  { key: "oturmak_istemedi", label: "Oturmak istemedi" },
  { key: "zorlandi", label: "Zorlandı" },
  { key: "zaman_bulamadik", label: "Zaman bulamadık" },
  { key: "anlamadik", label: "Yönergeyi anlamadık" },
] as const satisfies readonly Chip[];

const easyKeys = EASY_CHIPS.map((c) => c.key) as [string, ...string[]];
const hardKeys = HARD_CHIPS.map((c) => c.key) as [string, ...string[]];
const tekrarsiz = <T>(arr: T[]) => new Set(arr).size === arr.length;

export const PARENT_NOTE_MAX = 300;

export const parentFeedbackSchema = z.object({
  days: z.number().int().min(0).max(7),
  easy: z.array(z.enum(easyKeys)).max(EASY_CHIPS.length).refine(tekrarsiz, "Tekrar eden seçim").default([]),
  hard: z.array(z.enum(hardKeys)).max(HARD_CHIPS.length).refine(tekrarsiz, "Tekrar eden seçim").default([]),
  note: z.string().trim().max(PARENT_NOTE_MAX).optional(),
});
export type ParentFeedbackBody = z.infer<typeof parentFeedbackSchema>;

/** Gözlem.meta (Json) — yalnız source=parent. */
export interface ParentFeedbackMeta { days: number; easy: string[]; hard: string[] }

/** Uzman tarafı DTO. */
export interface ParentLinkDto {
  id: string;
  url: string;
  answerCount: number;
  lastAnsweredAt: string | null;
  createdAt: string;
}

/** Küçük harf çip etiketi (metin derleme için). */
export function chipLabelLower(key: string): string {
  const c = [...EASY_CHIPS, ...HARD_CHIPS].find((x) => x.key === key);
  return (c?.label ?? key).toLocaleLowerCase("tr-TR");
}
```

```ts
// apps/hub/src/modules/studio/lib/parentLink/composeText.ts
import { chipLabelLower, type ParentFeedbackBody } from "./schema";

/* Yanıt → gözlem metni (spec §6). Tek satır, HTML'siz, ≤1000 (not 300 olduğundan doğal olarak sığar; yine de kırp). */
const MAX = 1000;
const tekSatir = (s: string) => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

export function composeObservationText(b: ParentFeedbackBody): string {
  const parcalar: string[] = [];
  parcalar.push(b.days === 0 ? "Veli: bu hafta çalışılamadı." : `Veli: ${b.days} gün çalışıldı.`);
  if (b.easy.length) parcalar.push(`Kolay: ${b.easy.map(chipLabelLower).join(", ")}.`);
  if (b.hard.length) parcalar.push(`Zor: ${b.hard.map(chipLabelLower).join(", ")}.`);
  const not = b.note ? tekSatir(b.note) : "";
  if (not) parcalar.push(`Not: ${not}`);
  const t = parcalar.join(" ");
  return t.length > MAX ? t.slice(0, MAX - 1) + "…" : t;
}
```

```ts
// apps/hub/src/modules/studio/lib/parentLink/contextLine.ts
import { gunAy } from "@studio/lib/probe/contextLine";

/* Bağlam bloğu "Veli geri bildirimi" satırları (spec §7): en yeni 2, tarih ARTAN, 'Veli: ' öneki düşer. */
export const VELI_SATIR_TAVANI = 2;

export function parentContextLines(rows: { text: string; createdAt: Date }[]): string[] {
  return [...rows]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, VELI_SATIR_TAVANI)
    .reverse()
    .map((r) => `- ${gunAy(r.createdAt)}: ${r.text.replace(/^Veli:\s*/u, "")}`);
}
```

- [ ] **Step 4: Yeşil:** `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/parentLink && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint src/modules/studio/lib/parentLink` → 11 test PASS. `satisfies readonly Chip[]` ile `as const` birlikte tsc'de sorun çıkarırsa `as const` bırak ve `Chip` tipini `{ readonly key: string; readonly label: string }` yap.

- [ ] **Step 5: Commit** — `feat(studio): veli bağlantısı saf kütüphane — token, form şeması/çipler, metin derleyici, bağlam satırı`

---

### Task 3: Açık API `/api/veli/[token]` (GET/POST) + testler

**Files:** Create `apps/hub/src/app/api/veli/[token]/route.ts`, `apps/hub/src/app/api/veli/[token]/veli.test.ts`; Modify `apps/hub/src/modules/studio/lib/audit-labels.ts`.

- [ ] **Step 1: Başarısız testler**

```ts
// apps/hub/src/app/api/veli/[token]/veli.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/* Açık uç (spec §6): biçimsiz token DB'ye sorulmaz; pasif/yok 404; zod 400; 201'de gözlem source=parent + meta + text,
   bağlantı sayacı aynı transaction'da; rate limit 429. */
const prisma = {
  parentLink: { findUnique: vi.fn(), update: vi.fn() },
  studentObservation: { create: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
};
vi.mock("@studio/lib/db", () => ({ prisma }));
const rl = { allowed: true, retryAfter: 0 };
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn(() => rl),
  rateLimitResponse: () => new Response(null, { status: 429 }),
  getClientIp: () => "1.2.3.4",
}));
const recordAudit = vi.fn(async () => {});
vi.mock("@studio/lib/audit", () => ({ recordAudit }));

const TOK = "a".repeat(32);
const req = (url: string, body?: unknown, method = "POST") =>
  new NextRequest(`http://x${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "content-type": "application/json" } });
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const aktif = { id: "pl1", studentId: "s1", therapistId: "t1", active: true, therapist: { name: "Ayşe Yılmaz" } };

beforeEach(() => { vi.clearAllMocks(); rl.allowed = true; });

describe("GET /api/veli/[token]", () => {
  it("biçimsiz token → 404, DB'ye sorulmaz; pasif → 404; aktif → uzman adı", async () => {
    const { GET } = await import("./route");
    expect((await GET(req("/v", undefined, "GET"), params({ token: "kisa" }))).status).toBe(404);
    expect(prisma.parentLink.findUnique).not.toHaveBeenCalled();
    prisma.parentLink.findUnique.mockResolvedValue({ ...aktif, active: false });
    expect((await GET(req("/v", undefined, "GET"), params({ token: TOK }))).status).toBe(404);
    prisma.parentLink.findUnique.mockResolvedValue(aktif);
    const res = await GET(req("/v", undefined, "GET"), params({ token: TOK }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ therapistName: "Ayşe Yılmaz" });
    expect(prisma.parentLink.findUnique).toHaveBeenLastCalledWith(expect.objectContaining({ where: { token: TOK } }));
  });
});

describe("POST /api/veli/[token]", () => {
  it("rate limit 429; zod 400; pasif 404 ve yazma yok", async () => {
    const { POST } = await import("./route");
    rl.allowed = false;
    expect((await POST(req("/v", { days: 3 }), params({ token: TOK }))).status).toBe(429);
    rl.allowed = true;
    prisma.parentLink.findUnique.mockResolvedValue(aktif);
    expect((await POST(req("/v", { days: 9 }), params({ token: TOK }))).status).toBe(400);
    prisma.parentLink.findUnique.mockResolvedValue(null);
    expect((await POST(req("/v", { days: 3 }), params({ token: TOK }))).status).toBe(404);
    expect(prisma.studentObservation.create).not.toHaveBeenCalled();
  });
  it("201: gözlem source=parent + meta + derlenmiş metin; sayaç artar; audit token/metin taşımaz", async () => {
    const { POST } = await import("./route");
    prisma.parentLink.findUnique.mockResolvedValue(aktif);
    prisma.studentObservation.create.mockResolvedValue({ id: "o1" });
    prisma.parentLink.update.mockResolvedValue({});
    const res = await POST(req("/v", { days: 4, easy: ["istekle_oturdu"], hard: [], note: " <b>İyi</b> " }), params({ token: TOK }));
    expect(res.status).toBe(201);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.studentObservation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ studentId: "s1", therapistId: "t1", source: "parent", meta: { days: 4, easy: ["istekle_oturdu"], hard: [] }, text: "Veli: 4 gün çalışıldı. Kolay: istekle oturdu. Not: İyi" }),
    }));
    expect(prisma.parentLink.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "pl1" }, data: expect.objectContaining({ answerCount: { increment: 1 } }) }));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ actorId: null, action: "parentFeedback.receive", targetType: "student", targetId: "s1", ip: "1.2.3.4", diff: { days: 4 } }));
    const auditArg = JSON.stringify(recordAudit.mock.calls[0]?.[0]);
    expect(auditArg).not.toContain(TOK);
    expect(auditArg).not.toContain("İyi");
  });
});
```

- [ ] **Step 2: Kırmızı:** `cd apps/hub && node_modules/.bin/vitest run "src/app/api/veli/[token]"`.

- [ ] **Step 3: Rota**

```ts
// apps/hub/src/app/api/veli/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/studio/client";
import { prisma } from "@studio/lib/db";
import { readJsonBody } from "@/lib/bodyLimit";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { zodError } from "@studio/lib/validation";
import { logError } from "@studio/lib/utils";
import { recordAudit } from "@studio/lib/audit";
import { isTokenShape } from "@studio/lib/parentLink/token";
import { parentFeedbackSchema, type ParentFeedbackMeta } from "@studio/lib/parentLink/schema";
import { composeObservationText } from "@studio/lib/parentLink/composeText";

/* Veli sayfasının açık API'si (spec §6). Oturum YOK; yetki = aktif token. Çocuk verisi hiçbir yanıtta yok.
   Loglarda token yer almaz. */
const GECERSIZ = { error: "Bağlantı geçersiz" };

async function aktifBaglanti(token: string) {
  if (!isTokenShape(token)) return null;
  const link = await prisma.parentLink.findUnique({
    where: { token },
    select: { id: true, studentId: true, therapistId: true, active: true, therapist: { select: { name: true } } },
  });
  return link && link.active ? link : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const limit = rateLimit(`veli-get:${getClientIp(request.headers)}`, 60);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  try {
    const { token } = await params;
    const link = await aktifBaglanti(token);
    if (!link) return NextResponse.json(GECERSIZ, { status: 404 });
    return NextResponse.json({ therapistName: link.therapist.name });
  } catch (error) {
    logError("GET /api/veli/[token]", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(request.headers);
  const { token } = await params;
  if (!isTokenShape(token)) return NextResponse.json(GECERSIZ, { status: 404 });
  const l1 = rateLimit(`veli-post:${token}`, 3, 3600_000);
  if (!l1.allowed) return rateLimitResponse(l1.retryAfter);
  const l2 = rateLimit(`veli-post:${ip}`, 10, 3600_000);
  if (!l2.allowed) return rateLimitResponse(l2.retryAfter);
  try {
    const body = await readJsonBody(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const parsed = parentFeedbackSchema.safeParse(body.data);
    if (!parsed.success) return NextResponse.json({ error: zodError(parsed.error) }, { status: 400 });

    const link = await aktifBaglanti(token);
    if (!link) return NextResponse.json(GECERSIZ, { status: 404 });

    const meta: ParentFeedbackMeta = { days: parsed.data.days, easy: parsed.data.easy, hard: parsed.data.hard };
    const text = composeObservationText(parsed.data);
    await prisma.$transaction([
      prisma.studentObservation.create({
        data: { studentId: link.studentId, therapistId: link.therapistId, source: "parent", meta: meta as unknown as Prisma.InputJsonValue, text },
      }),
      prisma.parentLink.update({ where: { id: link.id }, data: { answerCount: { increment: 1 }, lastAnsweredAt: new Date() } }),
    ]);
    await recordAudit({ actorId: null, action: "parentFeedback.receive", targetType: "student", targetId: link.studentId, diff: { days: parsed.data.days }, ip });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    logError("POST /api/veli/[token]", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
```

`audit-labels.ts` sözlüğüne:
```ts
  "parentLink.create":         "Veli bağlantısı oluşturuldu",
  "parentLink.revoke":         "Veli bağlantısı iptal edildi",
  "parentFeedback.receive":    "Veli geri bildirimi alındı",
```

- [ ] **Step 4: Yeşil:** `cd apps/hub && node_modules/.bin/vitest run "src/app/api/veli/[token]" && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint "src/app/api/veli/[token]"` → 3 test PASS.

- [ ] **Step 5: Commit** — `feat(studio): açık veli geri bildirim API'si — /api/veli/[token] GET/POST (rate limit, source=parent gözlem)`

---

### Task 4: Uzman rotaları `students/[id]/parent-link` + testler

**Files:** Create `apps/hub/src/app/studio/api/students/[id]/parent-link/route.ts`, `.../parent-link/parentLink.test.ts`.

- [ ] **Step 1: Başarısız testler**

```ts
// apps/hub/src/app/studio/api/students/[id]/parent-link/parentLink.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/* Uzman tarafı (spec §7): sahiplik, aktif bağlantı GET, yenileme tek transaction (pasifleştir + oluştur), P2002→409,
   DELETE 404/200, owner-404'te yazma yok, URL getBaseUrl ile. */
const prisma = {
  parentLink: { findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
};
vi.mock("@studio/lib/db", () => ({ prisma }));
vi.mock("@studio/lib/auth-helpers", () => ({
  requireAuth: vi.fn(async () => ({ session: { user: { id: "t1" } } })),
  requireStudentOwnership: vi.fn(async (id: string) => (id === "s1" ? { student: { id } } : NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 }))),
}));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: () => ({ allowed: true, retryAfter: 0 }), rateLimitResponse: () => new Response(null, { status: 429 }), getClientIp: () => "1.2.3.4" }));
vi.mock("@studio/lib/audit", () => ({ recordAudit: vi.fn(async () => {}) }));
vi.mock("@studio/lib/baseUrl", () => ({ getBaseUrl: () => "https://ludenlab.com" }));
vi.mock("@studio/lib/parentLink/token", async (orig) => ({ ...(await orig<typeof import("@studio/lib/parentLink/token")>()), generateToken: () => "T".repeat(32) }));

const req = (method = "GET") => new NextRequest("http://x/pl", { method });
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const satir = { id: "pl1", answerCount: 2, lastAnsweredAt: new Date(2026, 9, 14), createdAt: new Date(2026, 9, 1), token: "T".repeat(32) };
beforeEach(() => vi.clearAllMocks());

describe("GET", () => {
  it("sahiplik 404; yoksa null; varsa URL'li DTO", async () => {
    const { GET } = await import("./route");
    expect((await GET(req(), params({ id: "yok" }))).status).toBe(404);
    prisma.parentLink.findFirst.mockResolvedValue(null);
    expect(await (await GET(req(), params({ id: "s1" }))).json()).toEqual({ link: null });
    prisma.parentLink.findFirst.mockResolvedValue(satir);
    const { link } = await (await GET(req(), params({ id: "s1" }))).json();
    expect(link).toMatchObject({ id: "pl1", url: `https://ludenlab.com/veli/${"T".repeat(32)}`, answerCount: 2 });
    expect(prisma.parentLink.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: "s1", therapistId: "t1", active: true } }));
  });
});

describe("POST (oluştur/yenile)", () => {
  it("owner-404'te yazma yok; başarıda tek transaction: pasifleştir + oluştur, 201", async () => {
    const { POST } = await import("./route");
    expect((await POST(req("POST"), params({ id: "yok" }))).status).toBe(404);
    expect(prisma.parentLink.create).not.toHaveBeenCalled();
    prisma.parentLink.updateMany.mockResolvedValue({ count: 1 });
    prisma.parentLink.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...satir, ...data, answerCount: 0, lastAnsweredAt: null }));
    const res = await POST(req("POST"), params({ id: "s1" }));
    expect(res.status).toBe(201);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.parentLink.updateMany).toHaveBeenCalledWith({ where: { studentId: "s1", therapistId: "t1", active: true }, data: { active: false, revokedAt: expect.any(Date) } });
    expect(prisma.parentLink.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ studentId: "s1", therapistId: "t1", token: "T".repeat(32), active: true }) }));
    expect((await res.json()).link.url).toBe(`https://ludenlab.com/veli/${"T".repeat(32)}`);
  });
  it("P2002 → 409; başka hata → 500", async () => {
    const { POST } = await import("./route");
    prisma.$transaction.mockRejectedValueOnce({ code: "P2002" });
    expect((await POST(req("POST"), params({ id: "s1" }))).status).toBe(409);
    prisma.$transaction.mockRejectedValueOnce(new Error("db"));
    expect((await POST(req("POST"), params({ id: "s1" }))).status).toBe(500);
  });
});

describe("DELETE", () => {
  it("aktif yoksa 404; varsa pasifleşir 200", async () => {
    const { DELETE } = await import("./route");
    prisma.parentLink.updateMany.mockResolvedValue({ count: 0 });
    expect((await DELETE(req("DELETE"), params({ id: "s1" }))).status).toBe(404);
    prisma.parentLink.updateMany.mockResolvedValue({ count: 1 });
    expect((await DELETE(req("DELETE"), params({ id: "s1" }))).status).toBe(200);
    expect(prisma.parentLink.updateMany).toHaveBeenLastCalledWith({ where: { studentId: "s1", therapistId: "t1", active: true }, data: { active: false, revokedAt: expect.any(Date) } });
  });
});
```

- [ ] **Step 2: Kırmızı.**

- [ ] **Step 3: Rota**

```ts
// apps/hub/src/app/studio/api/students/[id]/parent-link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@studio/lib/db";
import { requireAuth, requireStudentOwnership } from "@studio/lib/auth-helpers";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { logError } from "@studio/lib/utils";
import { recordAudit } from "@studio/lib/audit";
import { getBaseUrl } from "@studio/lib/baseUrl";
import { generateToken } from "@studio/lib/parentLink/token";
import type { ParentLinkDto } from "@studio/lib/parentLink/schema";

/* Veli bağlantısı yönetimi (spec §7). Sahiplik uzman + öğrenci; plan kapısı yok. Audit diff'inde token YOK. */
type Row = { id: string; token: string; answerCount: number; lastAnsweredAt: Date | null; createdAt: Date };
const SELECT = { id: true, token: true, answerCount: true, lastAnsweredAt: true, createdAt: true };
const toDto = (r: Row): ParentLinkDto => ({
  id: r.id, url: `${getBaseUrl()}/veli/${r.token}`, answerCount: r.answerCount,
  lastAnsweredAt: r.lastAnsweredAt ? r.lastAnsweredAt.toISOString() : null, createdAt: r.createdAt.toISOString(),
});

async function kapi(request: NextRequest, params: Promise<{ id: string }>) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  const limit = rateLimit(`parent-link:${session.user.id}`, 30);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  const { id } = await params;
  const ownership = await requireStudentOwnership(id, session.user.id);
  if (ownership instanceof NextResponse) return ownership;
  return { id, therapistId: session.user.id, ip: getClientIp(request.headers) };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const k = await kapi(request, params);
  if (k instanceof Response) return k;
  try {
    const row = (await prisma.parentLink.findFirst({ where: { studentId: k.id, therapistId: k.therapistId, active: true }, select: SELECT })) as Row | null;
    return NextResponse.json({ link: row ? toDto(row) : null });
  } catch (error) {
    logError("GET /studio/api/students/[id]/parent-link", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const k = await kapi(request, params);
  if (k instanceof Response) return k;
  try {
    const now = new Date();
    let created: Row;
    try {
      // Pasifleştir + oluştur tek transaction; öğrenci başına tek aktif bağlantı kısmi tekil indeksle garanti (P2002 → 409).
      const [eski, yeni] = (await prisma.$transaction([
        prisma.parentLink.updateMany({ where: { studentId: k.id, therapistId: k.therapistId, active: true }, data: { active: false, revokedAt: now } }),
        prisma.parentLink.create({ data: { studentId: k.id, therapistId: k.therapistId, token: generateToken(), active: true }, select: SELECT }),
      ])) as [{ count: number }, Row];
      created = yeni;
      await recordAudit({ actorId: k.therapistId, action: "parentLink.create", targetType: "student", targetId: k.id, diff: { renewed: eski.count > 0 }, ip: k.ip });
    } catch (err) {
      if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
        return NextResponse.json({ error: "Bağlantı az önce oluşturuldu; sayfayı yenileyin" }, { status: 409 });
      }
      throw err;
    }
    return NextResponse.json({ link: toDto(created) }, { status: 201 });
  } catch (error) {
    logError("POST /studio/api/students/[id]/parent-link", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const k = await kapi(request, params);
  if (k instanceof Response) return k;
  try {
    const { count } = await prisma.parentLink.updateMany({ where: { studentId: k.id, therapistId: k.therapistId, active: true }, data: { active: false, revokedAt: new Date() } });
    if (count === 0) return NextResponse.json({ error: "Aktif bağlantı yok" }, { status: 404 });
    await recordAudit({ actorId: k.therapistId, action: "parentLink.revoke", targetType: "student", targetId: k.id, ip: k.ip });
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("DELETE /studio/api/students/[id]/parent-link", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
```
(`kapi` `Response` döndürürse `NextResponse` de `Response`'tır; `instanceof Response` kontrolü ikisini kapsar.)

- [ ] **Step 4: Yeşil:** `cd apps/hub && node_modules/.bin/vitest run "src/app/studio/api/students/[id]/parent-link" && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint "src/app/studio/api/students/[id]/parent-link"` → 5 test PASS.

- [ ] **Step 5: Commit** — `feat(studio): veli bağlantısı uzman rotaları — GET/POST(yenile)/DELETE, tek aktif, audit`

---

### Task 5: Gözlem rotaları, günlük kota ve bağlam entegrasyonu

**Files:** Modify `observations/route.ts` (select), `observations/[obsId]/route.ts` (PATCH), `assistant/route.ts` (kota sayımı), `studentContext.ts` + `.test.ts`, `generateProfile.ts`.

- [ ] **Step 1: Başarısız testler**

`studentContext.test.ts`:
- `temel` fikstürüne `recentParentFeedback: [],`.
- `describe("renderStudentBlock"` sonuna:
```ts
  it("Veli geri bildirimi alanı 'Son ölçümler'den SONRA profilden ÖNCE; satırlar tarih artan; bütçe 300", () => {
    const t = renderStudentBlock({
      ...temel,
      recentProbes: [{ sound: "/r/", position: "initial", level: "word", runs: [{ date: new Date(2026, 9, 14), pct: 60 }] }],
      aiProfile: "## Uzmana Öneriler\n\n### Öncelikli Çalışma Alanları\n- /r/ kelime başı",
      recentParentFeedback: [{ text: "Veli: 5 gün çalışıldı.", createdAt: new Date(2026, 9, 21) }, { text: "Veli: 2 gün çalışıldı. Zor: zorlandı.", createdAt: new Date(2026, 9, 14) }],
    });
    const olcum = t.indexOf("Son ölçümler");
    const veli = t.indexOf("Veli geri bildirimi (eskiden yeniye):");
    const profil = t.indexOf("Öncelikli çalışma alanları:");
    expect(veli).toBeGreaterThan(olcum);
    expect(profil).toBeGreaterThan(veli);
    expect(t).toContain("Veli geri bildirimi (eskiden yeniye):\n- 14.10: 2 gün çalışıldı. Zor: zorlandı.\n- 21.10: 5 gün çalışıldı.");
    expect(renderStudentBlock({ ...temel, recentParentFeedback: [] })).not.toContain("Veli geri bildirimi");
  });
  it("veli satırı 300'ü aşarsa kırpılır; profil tam not + 5 gözlem + 3 ölçüm + 2 veli ile düşmez", () => {
    const uzun = renderStudentBlock({ ...temel, recentParentFeedback: [{ text: "Veli: " + "x".repeat(400), createdAt: new Date(2026, 9, 1) }] });
    const alan = uzun.slice(uzun.indexOf("Veli geri bildirimi"));
    expect(alan.split("\n")[1]!.length).toBeLessThanOrEqual(300);
    // Mevcut "profil … düşmez" regresyon testini kopyalayıp recentParentFeedback: 2 × ~80 karakter ekle; profil hâlâ blokta.
  });
```
- `describe("loadStudentContext"`: `prisma.studentObservation.findMany` artık İKİ kez çağrılır (uzman + veli). `beforeEach`'te `mockImplementation(async (args) => (args.where.source === "parent" ? [] : []))`; yeni testler:
```ts
  it("gözlem sorgusu yalnız uzman gözlemlerini, veli sorgusu yalnız veli yanıtlarını çeker", async () => {
    prisma.studentObservation.findMany.mockImplementation(async (args: { where: { source?: string } }) =>
      args.where.source === "parent"
        ? [{ text: "Veli: 3 gün çalışıldı.", createdAt: new Date(2026, 9, 10) }]
        : [{ text: "Seansta /r/ iyi", createdAt: new Date(2026, 9, 11) }]);
    const blok = await loadStudentContext(prisma as never, istek);
    expect(prisma.studentObservation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ source: "therapist" }), take: 5 }));
    expect(prisma.studentObservation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ source: "parent" }), take: 2 }));
    expect(blok).toContain("Son gözlemler:\n- 11.10.2026: Seansta /r/ iyi");
    expect(blok).toContain("Veli geri bildirimi (eskiden yeniye):\n- 10.10: 3 gün çalışıldı.");
  });
  it("veli sorgusu patlarsa yalnız o alan düşer", async () => {
    prisma.studentObservation.findMany.mockImplementation(async (args: { where: { source?: string } }) => {
      if (args.where.source === "parent") throw new Error("db");
      return [];
    });
    const blok = await loadStudentContext(prisma as never, istek);
    expect(blok).toContain("Öğrenci: Nisa");
    expect(blok).not.toContain("Veli geri bildirimi");
  });
```
`dailyCap.test.ts`'e dokunma (saf tarih fonksiyonları); kota filtresi `assistant/route.ts` içinde, rota testi yoksa Task 9'da incelemeyle doğrulanır.

Yeni dosya `apps/hub/src/app/studio/api/observations/[obsId]/obs.test.ts` (taklit Prisma + auth):
```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const prisma = { studentObservation: { updateMany: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() } };
vi.mock("@studio/lib/db", () => ({ prisma }));
vi.mock("@studio/lib/auth-helpers", () => ({ requireAuth: vi.fn(async () => ({ session: { user: { id: "t1" } } })) }));
const req = (body: unknown) => new NextRequest("http://x/o", { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const params = (obsId: string) => ({ params: Promise.resolve({ obsId }) });
beforeEach(() => vi.clearAllMocks());
describe("PATCH /studio/api/observations/[obsId]", () => {
  it("veli yanıtı düzenlenemez → 400; sahip olmayan → 404; uzman gözlemi → 200", async () => {
    const { PATCH } = await import("./route");
    prisma.studentObservation.updateMany.mockResolvedValue({ count: 0 });
    prisma.studentObservation.findUnique.mockResolvedValue({ therapistId: "t1", source: "parent" });
    const r1 = await PATCH(req({ text: "x" }), params("o1"));
    expect(r1.status).toBe(400);
    expect((await r1.json()).error).toMatch(/Veli yanıtı düzenlenemez/);
    prisma.studentObservation.findUnique.mockResolvedValue({ therapistId: "baska", source: "therapist" });
    expect((await PATCH(req({ text: "x" }), params("o2"))).status).toBe(404);
    prisma.studentObservation.updateMany.mockResolvedValue({ count: 1 });
    prisma.studentObservation.findUnique.mockResolvedValue({ id: "o3", text: "x", createdAt: new Date(), updatedAt: new Date() });
    expect((await PATCH(req({ text: "x" }), params("o3"))).status).toBe(200);
    expect(prisma.studentObservation.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { id: "o3", therapistId: "t1", source: "therapist" } }));
  });
});
```

- [ ] **Step 2: Kırmızı:** `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/studentContext.test.ts`.

- [ ] **Step 3: `studentContext.ts`**
1. Import: `import { VELI_SATIR_TAVANI, parentContextLines } from "@studio/lib/parentLink/contextLine";`
2. `BUTCE`'ye `veli: 300` ekle; üst yoruma: `"Veli geri bildirimi" (en yeni 2 yanıt) ölçümlerden sonra, 300 karakterle sınırlıdır.`
3. `StudentContextInput`'a (`recentProbes` ardına): `/** Veli yanıtları (source=parent), en yeni 2; boşsa satır yazılmaz. */ recentParentFeedback: { text: string; createdAt: Date }[];`
4. `renderStudentBlock`: "Son ölçümler" bloğunun HEMEN ARDINA:
```ts
  if (ctx.recentParentFeedback.length) {
    // Satırlar hazır (tarih gün.ay, 'Veli: ' öneki kırpılmış); rumuzlama s() ile; tek satır bile sığmazsa kırpılır.
    const satirlar = parentContextLines(ctx.recentParentFeedback.map((r) => ({ text: tekSatir(s(r.text)), createdAt: r.createdAt })));
    const al: string[] = [];
    let kalan = BUTCE.veli;
    for (const satir of satirlar) {
      if (satir.length + 1 > kalan) break;
      al.push(satir);
      kalan -= satir.length + 1;
    }
    if (!al.length && satirlar.length) al.push(kirp(satirlar[satirlar.length - 1]!, BUTCE.veli));
    if (al.length) adaylar.push(["Veli geri bildirimi (eskiden yeniye):", ...al]);
  }
```
5. `loadStudentContext`: gözlem sorgusunun `where`'ine `source: "therapist",` ekle; `allSettled` dizisine YEDİNCİ sorgu (`veliS`):
```ts
      prisma.studentObservation.findMany({
        where: { studentId: args.studentId, therapistId: args.therapistId, source: "parent" },
        orderBy: { createdAt: "desc" },
        take: VELI_SATIR_TAVANI,
        select: { text: true, createdAt: true },
      }),
```
ve `const recentParentFeedback = yedek<ObservationRow[]>(veliS, "veli geri bildirimi", []);` → `renderStudentBlock`'a geçir.
6. `generateProfile.ts` yedek çağrısına `recentParentFeedback: [],`.

- [ ] **Step 4: Gözlem rotaları + kota**
- `observations/route.ts` select: `{ id: true, text: true, source: true, meta: true, createdAt: true, updatedAt: true }`.
- `observations/[obsId]/route.ts` PATCH: `updateMany` `where`'ine `source: "therapist"` ekle; `count === 0` dalı önce `findUnique({ where: { id: obsId }, select: { therapistId: true, source: true } })` ile ayrım yapsın: sahip + `source === "parent"` → `400 { error: "Veli yanıtı düzenlenemez; silebilirsiniz" }`, aksi 404. (DELETE değişmez.)
- `assistant/route.ts` günlük sayım: `where: { studentId: id, therapistId, source: "therapist", createdAt: { gte: trGunBaslangici() } }`; `create` çağrısı `source` vermez (varsayılan therapist).

- [ ] **Step 5: Yeşil:** `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib && node_modules/.bin/vitest run --config vitest.eval.config.ts evals/lib && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint src/modules/studio/lib/studentContext.ts "src/app/studio/api/students/[id]/observations" "src/app/studio/api/observations/[obsId]" "src/app/studio/api/students/[id]/assistant"`.

- [ ] **Step 6: Commit** — `feat(studio): bağlam bloğuna 'Veli geri bildirimi'; gözlem sorgusu/kota yalnız uzman; veli yanıtı düzenlenemez`

---

### Task 6: Veli sayfası `/veli/[token]` + form + Umami muafiyeti

**Files:** Create `apps/hub/src/components/UmamiScript.tsx`, `apps/hub/src/app/veli/[token]/layout.tsx`, `apps/hub/src/app/veli/[token]/page.tsx`, `apps/hub/src/modules/studio/components/parent/ParentFeedbackForm.tsx`; Modify `apps/hub/src/app/layout.tsx`, `koyuTemaKontrast.test.ts` (iki giriş: `ParentFeedbackForm`, `ParentLinkModal` — ikincisi Task 7'de gelir, o zamana dek kırmızı).

- [ ] **Step 1: `UmamiScript.tsx`**
```tsx
// apps/hub/src/components/UmamiScript.tsx
"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";

/* Umami (çerezsiz) — /veli/<token> yolunda YÜKLENMEZ: token'lı yol üçüncü tarafa gitmesin (spec 2026-11-05 §8). */
export function UmamiScript({ websiteId, scriptUrl }: { websiteId: string; scriptUrl: string }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/veli/")) return null;
  return <Script src={scriptUrl} data-website-id={websiteId} data-exclude-search="true" strategy="afterInteractive" />;
}
```
`layout.tsx`: `import { UmamiScript } from "@/components/UmamiScript";`, `Script` import'u kaldır, gövdede `{UMAMI_WEBSITE_ID && <UmamiScript websiteId={UMAMI_WEBSITE_ID} scriptUrl={UMAMI_SCRIPT_URL} />}`.

- [ ] **Step 2: Layout + sayfa**
```tsx
// apps/hub/src/app/veli/[token]/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Logo } from "@ludenlab/ui";

export const metadata: Metadata = { title: "Haftalık geri bildirim — LudenLab", robots: { index: false, follow: false } };

/* Açık kabuk (spec §6): studio layout YOK (oturum/tema/çerez bandı yok); poster token'ları kökten gelir; hep açık tema. */
export default function VeliLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "var(--poster-bg)", minHeight: "100vh", color: "var(--poster-ink)" }}>
      <header style={{ borderBottom: "var(--poster-border)", padding: "14px 16px", display: "flex", alignItems: "center", maxWidth: 560, margin: "0 auto" }}>
        <Logo height={26} />
      </header>
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px 40px" }}>{children}</main>
    </div>
  );
}
```
```tsx
// apps/hub/src/app/veli/[token]/page.tsx
import { prisma } from "@studio/lib/db";
import { isTokenShape } from "@studio/lib/parentLink/token";
import { ParentFeedbackForm } from "@studio/components/parent/ParentFeedbackForm";

export const dynamic = "force-dynamic";

/* SSR: aktif bağlantı → uzman adı + form; yoksa geçersiz ekranı (çocuk verisi hiç yüklenmez). */
export default async function VeliPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = isTokenShape(token)
    ? await prisma.parentLink.findUnique({ where: { token }, select: { active: true, therapist: { select: { name: true } } } })
    : null;
  if (!link || !link.active) {
    return (
      <section aria-labelledby="gecersiz">
        <h1 id="gecersiz" style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>Bu bağlantı artık geçerli değil</h1>
        <p style={{ color: "var(--poster-ink-2)" }}>Lütfen uzmanınızdan yeni bir bağlantı isteyin.</p>
      </section>
    );
  }
  return <ParentFeedbackForm token={token} therapistName={link.therapist.name} />;
}
```
(`notFound()` yerine kendi ekranı: 404 sayfası uygulama genelinde Türkçe ama veli için yönlendirmesiz mesaj daha iyi; HTTP 200 döner — kabul.)

- [ ] **Step 3: Form**
```tsx
// apps/hub/src/modules/studio/components/parent/ParentFeedbackForm.tsx
"use client";
import { useState } from "react";
import { EASY_CHIPS, HARD_CHIPS, PARENT_NOTE_MAX } from "@studio/lib/parentLink/schema";

/* Veli formu (spec §6): 3 soru, mobil öncelikli, hesapsız. Tasarım token'ları poster; studio.css yüklü DEĞİL,
   bu yüzden düğmeler satır içi stil (PBtn kullanılmaz). Çocuk verisi yok. */
type Durum = "form" | "gonderiliyor" | "tesekkur";
const DUGME: React.CSSProperties = { minHeight: 44, padding: "10px 14px", borderRadius: 12, border: "2px solid var(--poster-ink)", background: "var(--poster-panel)", color: "var(--poster-ink)", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" };
const SECILI: React.CSSProperties = { background: "var(--poster-ink)", color: "var(--poster-panel)" };

export function ParentFeedbackForm({ token, therapistName }: { token: string; therapistName: string }) {
  const [days, setDays] = useState<number | null>(null);
  const [easy, setEasy] = useState<string[]>([]);
  const [hard, setHard] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [durum, setDurum] = useState<Durum>("form");
  const [hata, setHata] = useState<string | null>(null);
  const toggle = (set: (f: (p: string[]) => string[]) => void, key: string) => set((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  async function gonder() {
    if (days === null) { setHata("Lütfen kaç gün çalışıldığını seçin."); return; }
    setDurum("gonderiliyor"); setHata(null);
    try {
      const r = await fetch(`/api/veli/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ days, easy, hard, note: note.trim() || undefined }) });
      if (r.status === 404) { setHata("Bu bağlantı artık geçerli değil. Lütfen uzmanınızdan yeni bağlantı isteyin."); setDurum("form"); return; }
      if (r.status === 429) { setHata("Çok sık yanıt gönderildi, biraz sonra tekrar deneyin."); setDurum("form"); return; }
      if (!r.ok) { setHata("Bir hata oluştu, lütfen tekrar deneyin."); setDurum("form"); return; }
      setDurum("tesekkur");
    } catch { setHata("Bağlantı kurulamadı, lütfen tekrar deneyin."); setDurum("form"); }
  }

  if (durum === "tesekkur") {
    return (
      <section aria-live="polite">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>Teşekkürler, yanıtınız iletildi.</h1>
        <p style={{ color: "var(--poster-ink-2)" }}>{therapistName} yanıtınızı öğrencinin kaydında görecek.</p>
        <button type="button" style={DUGME} onClick={() => { setDays(null); setEasy([]); setHard([]); setNote(""); setDurum("form"); }}>Yeni yanıt</button>
      </section>
    );
  }

  const Chips = ({ list, value, onToggle, legend }: { list: readonly { key: string; label: string }[]; value: string[]; onToggle: (k: string) => void; legend: string }) => (
    <fieldset style={{ border: "none", padding: 0, margin: "0 0 14px" }}>
      <legend style={{ fontWeight: 700, marginBottom: 8 }}>{legend}</legend>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {list.map((c) => { const on = value.includes(c.key); return (
          <button key={c.key} type="button" aria-pressed={on} onClick={() => onToggle(c.key)} style={{ ...DUGME, ...(on ? SECILI : null) }}>{c.label}</button>
        ); })}
      </div>
    </fieldset>
  );

  return (
    <form onSubmit={(e) => { e.preventDefault(); void gonder(); }} aria-busy={durum === "gonderiliyor"}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: "0 0 4px" }}>Haftalık geri bildirim</h1>
      <p style={{ color: "var(--poster-ink-2)", margin: "0 0 20px" }}>{therapistName}</p>

      <fieldset style={{ border: "none", padding: 0, margin: "0 0 18px" }}>
        <legend style={{ fontWeight: 700, marginBottom: 8 }}>Bu hafta evde kaç gün çalıştınız?</legend>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {Array.from({ length: 8 }, (_, i) => i).map((n) => (
            <button key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)} style={{ ...DUGME, ...(days === n ? SECILI : null), fontSize: 18 }}>{n}</button>
          ))}
        </div>
      </fieldset>

      <Chips list={EASY_CHIPS} value={easy} onToggle={(k) => toggle(setEasy, k)} legend="Neler kolay geldi?" />
      <Chips list={HARD_CHIPS} value={hard} onToggle={(k) => toggle(setHard, k)} legend="Neler zor geldi?" />

      <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }} htmlFor="veli-not">Eklemek istediğiniz bir şey?</label>
      <textarea id="veli-not" value={note} maxLength={PARENT_NOTE_MAX} rows={3} onChange={(e) => setNote(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 12, border: "2px solid var(--poster-ink)", fontFamily: "inherit", fontSize: 15 }} />
      <div style={{ fontSize: 12, color: "var(--poster-ink-3)", textAlign: "right" }}>{note.length}/{PARENT_NOTE_MAX}</div>

      <p style={{ fontSize: 12, color: "var(--poster-ink-2)", margin: "14px 0" }}>
        Yanıtınız çocuğunuzun uzmanına iletilir ve eğitim planlamasında kullanılır. Yapay zekâ desteğine çocuğun adı gitmez, takma ad kullanılır. Uzman yanıtı silebilir. Ayrıntı: <a href="/gizlilik" style={{ color: "inherit" }}>Gizlilik Politikası</a>.
      </p>
      {hata && <p role="alert" style={{ color: "var(--poster-danger)", fontWeight: 700 }}>{hata}</p>}
      <button type="submit" disabled={durum === "gonderiliyor"} style={{ ...DUGME, ...SECILI, width: "100%", fontSize: 17 }}>{durum === "gonderiliyor" ? "Gönderiliyor…" : "Gönder"}</button>
    </form>
  );
}
```
`Chips` iç bileşeni her render'da yeniden tanımlanır (odak kaybı riski): eslint/kalite incelemesi isterse modül düzeyine taşı (`function Chips(props)`), deps yok.

- [ ] **Step 4: koyu tema listesine** `["ParentFeedbackForm", path.join(SRC, "modules/studio/components/parent/ParentFeedbackForm.tsx")] as const` ve `["ParentLinkModal", path.join(SRC, "modules/studio/components/students/ParentLinkModal.tsx")] as const`.

- [ ] **Step 5: Doğrula:** `cd apps/hub && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint src/components/UmamiScript.tsx src/app/layout.tsx "src/app/veli/[token]" src/modules/studio/components/parent && node_modules/.bin/vitest run src/modules/studio/lib/koyuTemaKontrast.test.ts` (yalnız `ParentLinkModal` ENOENT kırmızı).

- [ ] **Step 6: Commit** — `feat(studio): açık veli sayfası /veli/[token] — form (3 soru), aydınlatma, Umami muafiyeti`

---

### Task 7: `ParentLinkModal` + başlık düğmesi + `qrcode`

**Files:** `pnpm --filter @ludenlab/hub add qrcode@1.5.4` ve `pnpm --filter @ludenlab/hub add -D @types/qrcode@1.5.5` (lockfile commit'e dahil); Create `apps/hub/src/modules/studio/components/students/ParentLinkModal.tsx`; Modify `apps/hub/src/app/studio/(main)/students/[id]/page.tsx`.

- [ ] **Step 1: Bağımlılık** — komutları repo kökünden çalıştır; `git status` `package.json` + `pnpm-lock.yaml` değişmeli. Kurulum `--ignore-scripts` ile yapılmışsa `pnpm run postinstall` (prisma generate) gerekebilir.

- [ ] **Step 2: Modal**
```tsx
// apps/hub/src/modules/studio/components/students/ParentLinkModal.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { PBtn, PModal, PSpinner, PInput } from "@studio/components/poster";
import { formatDate } from "@studio/lib/utils";
import type { ParentLinkDto } from "@studio/lib/parentLink/schema";

/* Veli bağlantısı modalı (spec §7): oluştur / QR + URL + kopyala / yenile / iptal. QR sabit beyaz zemin + siyah modül
   (taranabilirlik; koyu temada da). */
interface Props { studentId: string; open: boolean; onClose: () => void }

export function ParentLinkModal({ studentId, open, onClose }: Props) {
  const [link, setLink] = useState<ParentLinkDto | null | undefined>(undefined);
  const [svg, setSvg] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"renew" | "revoke" | null>(null);
  const base = `/studio/api/students/${studentId}/parent-link`;

  const load = useCallback(async () => {
    try {
      const r = await fetch(base);
      if (!r.ok) throw new Error();
      setLink(((await r.json()).link ?? null) as ParentLinkDto | null);
    } catch { toast.error("Bağlantı bilgisi yüklenemedi"); setLink(null); }
  }, [base]);

  useEffect(() => { if (open) void load(); }, [open, load]);
  useEffect(() => {
    if (!link) { setSvg(""); return; }
    QRCode.toString(link.url, { type: "svg", margin: 1, width: 200, color: { dark: "#000000", light: "#ffffff" } }).then(setSvg).catch(() => setSvg(""));
  }, [link]);

  async function olustur() {
    setBusy(true);
    try {
      const r = await fetch(base, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error ?? "Bağlantı oluşturulamadı"); if (r.status === 409) await load(); return; }
      setLink(d.link as ParentLinkDto);
      toast.success(confirm === "renew" ? "Bağlantı yenilendi" : "Bağlantı oluşturuldu");
    } catch { toast.error("Bağlantı oluşturulamadı"); } finally { setBusy(false); setConfirm(null); }
  }
  async function iptal() {
    setBusy(true);
    try {
      const r = await fetch(base, { method: "DELETE" });
      if (!r.ok && r.status !== 404) { toast.error("İptal edilemedi"); return; }
      setLink(null); toast.success("Bağlantı iptal edildi");
    } catch { toast.error("İptal edilemedi"); } finally { setBusy(false); setConfirm(null); }
  }
  async function kopyala() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link.url); toast.success("Kopyalandı"); } catch { toast.error("Kopyalanamadı; bağlantıyı elle seçin"); }
  }

  return (
    <PModal open={open} onClose={() => { if (!busy) onClose(); }} title="Veli bağlantısı">
      {link === undefined ? <PSpinner label="Yükleniyor…" /> : link === null ? (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ fontSize: 13, margin: 0 }}>Veli, bu bağlantıdan hesap açmadan haftalık geri bildirim gönderir. Sayfada çocuğun adı görünmez; yanıtlar gözlem günlüğüne &quot;Veli&quot; etiketiyle düşer.</p>
          <PBtn as="button" variant="accent" size="sm" onClick={olustur} disabled={busy}>Bağlantı oluştur</PBtn>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {svg && (
            <div role="img" aria-label="Veli bağlantısı QR kodu" style={{ width: 200, height: 200, margin: "0 auto", background: "#ffffff", padding: 6, borderRadius: 12, border: "2px solid var(--poster-ink)" }} dangerouslySetInnerHTML={{ __html: svg }} />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <PInput readOnly value={link.url} aria-label="Veli bağlantısı" onFocus={(e) => e.currentTarget.select()} />
            <PBtn as="button" variant="white" size="sm" onClick={kopyala}>Kopyala</PBtn>
          </div>
          <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: 0 }}>
            Yanıt: {link.answerCount}{link.lastAnsweredAt ? ` · son: ${formatDate(link.lastAnsweredAt, "short")}` : ""} · oluşturma: {formatDate(link.createdAt, "short")}
          </p>
          <p style={{ fontSize: 12, color: "var(--poster-ink-2)", margin: 0 }}>Bağlantıyı velinin telefonuna gönderin ya da ekrandan taratın. Sızdığını düşünürseniz yenileyin.</p>
          {confirm ? (
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ fontSize: 13, margin: 0 }}>{confirm === "renew" ? "Eski bağlantı geçersiz olur; veliye yenisini göndermeniz gerekir. Devam edilsin mi?" : "Bağlantı iptal edilecek; veli artık yanıt gönderemez. Devam edilsin mi?"}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <PBtn as="button" variant="accent" size="sm" onClick={confirm === "renew" ? olustur : iptal} disabled={busy}>{confirm === "renew" ? "Yenile" : "İptal et"}</PBtn>
                <PBtn as="button" variant="white" size="sm" onClick={() => setConfirm(null)} disabled={busy}>Vazgeç</PBtn>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <PBtn as="button" variant="white" size="sm" onClick={() => setConfirm("renew")} disabled={busy}>Yenile</PBtn>
              <PBtn as="button" variant="white" size="sm" onClick={() => setConfirm("revoke")} disabled={busy}>İptal et</PBtn>
            </div>
          )}
        </div>
      )}
    </PModal>
  );
}
```
`#ffffff`/`#000000` satırlarında `active ?` yok → koyu tema bekçisi geçer (QR'ın sabit beyazı bilinçli). `qrcode` tip tanımı `toString(text, opts)` Promise döndürür; `type: "svg"` için `QRCodeToStringOptions`. Tarayıcı derlemesinde `qrcode` paketinin `browser` alanı kullanılır; `next build` sorun çıkarırsa `import QRCode from "qrcode/lib/browser"` dene ve raporla.

- [ ] **Step 3: Öğrenci sayfası** — import `ParentLinkModal` + `QrCode` (lucide); state `const [showParentLink, setShowParentLink] = useState(false);`; "Düzenle" düğmesinin ardına:
```tsx
            <PBtn as="button" variant="white" size="sm" onClick={() => setShowParentLink(true)}>
              <QrCode size={14} aria-hidden /> Veli bağlantısı
            </PBtn>
```
ve sayfa sonundaki modallerin yanına `<ParentLinkModal studentId={student.id} open={showParentLink} onClose={() => setShowParentLink(false)} />`.

- [ ] **Step 4: Doğrula:** `cd apps/hub && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint src/modules/studio/components/students/ParentLinkModal.tsx "src/app/studio/(main)/students/[id]/page.tsx" && node_modules/.bin/vitest run src/modules/studio/lib/koyuTemaKontrast.test.ts` (artık tümü yeşil).

- [ ] **Step 5: Commit** — `feat(studio): öğrenci başlığında 'Veli bağlantısı' — QR/URL modalı (oluştur, kopyala, yenile, iptal)` (package.json + lockfile dahil).

---

### Task 8: Asistan sekmesinde "Veli" rozeti + gizlilik paragrafı

**Files:** Modify `AssistantTab.tsx`, `apps/hub/src/app/(legal)/gizlilik/page.tsx`.

- [ ] **Step 1: AssistantTab** — `interface Observation`'a `source?: "therapist" | "parent"; meta?: { days: number; easy: string[]; hard: string[] } | null`. Liste öğesinde tarih span'ının yanına `{o.source === "parent" && <PBadge color="blue">Veli</PBadge>}` (tarih + rozet bir `span` içinde `display:flex; gap:6; alignItems:center`); "Düzenle" düğmesi yalnız `o.source !== "parent"` iken; "Sil" her zaman. Metin görünümü aynı (`o.text`).

- [ ] **Step 2: Gizlilik** — §2.2 listesine madde: `"Velinin, uzmanın verdiği bağlantıdan gönderdiği haftalık geri bildirim (evde çalışılan gün sayısı, seçimli kolay/zor maddeleri, kısa not — Studio)"`. §4'ten sonra yeni `<SubSection title="4.1. Veli Geri Bildirimi">` (ya da §3'e paragraf): `<P>{`Uzman, bir öğrenci için süresiz bir geri bildirim bağlantısı (QR) üretebilir. Veli bu bağlantıdan hesap açmadan yanıt gönderir; yanıt yalnızca o uzmanın öğrenci kaydında saklanır, yapay zekâ desteğine çocuğun adı gitmeden takma adla iletilir, uzman tarafından silinebilir ve öğrenci ya da hesap silindiğinde silinir. Veli sayfasında çocuğun adı veya kimlik bilgisi gösterilmez; uzman bağlantıyı dilediği zaman iptal edebilir.`}</P>`. Konum: `_legal-ui` bileşenleriyle, §4 bloğunun içine son `SubSection` olarak.

- [ ] **Step 3: Doğrula:** `cd apps/hub && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint src/modules/studio/components/students/AssistantTab.tsx "src/app/(legal)/gizlilik/page.tsx"`.

- [ ] **Step 4: Commit** — `feat(studio): Asistan günlüğünde 'Veli' rozeti (düzenleme kapalı) + gizlilik politikasına veli geri bildirimi`

---

### Task 9: Bütün doğrulama

- [ ] `cd apps/hub && node_modules/.bin/vitest run` (tümü), `node_modules/.bin/vitest run --config vitest.eval.config.ts evals/lib evals/tools evals/runner.selftest.eval.ts`, `node_modules/.bin/tsc --noEmit`, lint (yeni/değişen dosyalar), `node_modules/.bin/next build` (arka plan) → `/veli/[token]`, `/api/veli/[token]`, `/studio/api/students/[id]/parent-link` rotaları çıktıda.
- [ ] Headless render: `ParentFeedbackForm` (390 px, form + teşekkür) ve `ParentLinkModal` içeriği (QR SVG `qrcode` ile üretilip statik HTML'e gömülür) — kullanıcıya görsel.
- [ ] Spec'e uygulama notları (sapma varsa) + hafıza notu ("Faz 1b TAMAM; 0021 prod'a uygulanmadı; deploy sırası ZORUNLU").
- [ ] Dal durumu: merge/PR ve `0021_parent_link.sql`'in prod'a uygulanması kullanıcı kararı.
