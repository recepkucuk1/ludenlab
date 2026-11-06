# Hedef Denetçisi 1c-B (Studio) — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Studio'da uzman, MEB müfredat hedefinin altına kendi kısa dönem hedefini yazar; "Denetle" ile 1c-A çekirdeği hedefi beş bileşen açısından denetler (yeniden yazmaz, puan vermez); metin + son denetim `StudentProgress`'te saklanır ve AI bağlam bloğuna "Sürmekte olan hedefler" satırında girer.

**Architecture:** SQL `0022_objective.sql` (`StudentProgress`'e 3 sütun) + Prisma; `progress` GET/PUT genişler (objective; metin değişince denetim sıfırlanır); yeni rota `POST /studio/api/students/[id]/progress/[goalId]/audit` (sahiplik + müfredat kontrolü → 6/dk → günlük 10 `ApiUsageLog` sayımı → 24h tavan → `temizle` → `scrub` → `hedefDenetle` → alıntı başına ad geri çevirme → `logUsage` → upsert); çekirdeğe ortak `sonucuGeriCevir` yardımcısı (Atölye rotası da ona geçer); `studentContext` kısa dönem hedefi 120'ye kırpıp satıra ekler; `ProgressTab` alt hedef satırında "Kısa dönem hedef" alanı + "Denetle" + ortak `HedefDenetimSonucu` kartı. Kredi yok; tüm planlar.

**Tech Stack:** Next.js 16 / React 19 / TS strict · Prisma 7 (Studio DB `@/generated/studio/client`, raw SQL migration, `prisma generate` ŞART) · zod v4 · vitest (node, `src/**/*.test.ts`, JSX derlemez) · 1c-A çekirdeği `apps/hub/src/lib/hedefDenetimi/` · Studio poster primitifleri `@studio/components/poster` + ortak kart `@/components/HedefDenetimSonucu` (`@ludenlab/ui` `p-badge` sınıfları `globals.css` ile her sayfada yüklü).

**Spec:** `docs/superpowers/specs/2026-11-05-hedef-denetcisi-design.md` — §5.2 veri, §7 Studio yüzeyi, §8 ortak, §9 güvenlik, §10 testler, §15 1c-A uygulama notları (sapmalar burada bağlayıcı: temizlik ÖNCE rumuzlama, 24h tavan, alıntı başına ad geri çevirme, parse hatasında kullanım logu).

**Çalışma dizini:** `/Users/recepkucuk/ludenlab/.claude/worktrees/ludenlabi-egitim-degerlendirmesi-1c8bb2` (worktree, dal `claude/ludenlabi-egitim-degerlendirmesi-1c8bb2`). Hub komutları `apps/hub` içinden `node_modules/.bin/...`; `git add` repo kökünden mutlak/köke göreli yollarla. Commit trailer: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (model adını DEĞİŞTİRME). `git stash` YASAK; dev sunucusu PROD DB'ye bakar — sunucu başlatma, DB'ye dokunma; `prisma db push`/`migrate` YASAK (yalnız `prisma generate`). **Deploy sırası: ÖNCE 0020+0021+0022 SQL (studio DB), SONRA kod** — 0022 mevcut tabloya sütun ekler; kod önce giderse `progress` GET'i `objective` seçerken 500 verir.

**1c-A dersleri (uygula):** `temizle` → sonra rumuzla; alıntı doğrulaması RUMUZLU hedefe karşı, geri çevirme sonra; `DenetimHatasi.kullanim` varsa 502'de de `logUsage`; `Prisma.DbNull` nullable Json'ı sıfırlamak için (düz `null` tip hatası); rota testlerinde sahiplik `where`'ini, yazma olmayan dalları ve çağrı sırasını kilitle; `vi.fn(async () => {})` yerine tipli parametre.

---

## Dosya haritası

| Dosya | Sorumluluk | İşlem |
|---|---|---|
| `apps/hub/prisma/sql/0022_objective.sql` | `StudentProgress` 3 sütun | Create |
| `apps/hub/prisma/studio/schema.prisma` | `StudentProgress.objective/objectiveAudit/objectiveAuditedAt` | Modify |
| `apps/hub/src/lib/objectiveMigration.test.ts` | SQL kaynak-metin testi | Create |
| `apps/hub/src/lib/hedefDenetimi/geriCevir.ts` (+test), `index.ts` | `sonucuGeriCevir`, `adParcaCeviricileri` | Create/Modify |
| `apps/hub/src/app/atolye/api/hedef-denetcisi/route.ts` | ortak yardımcıya geçer (davranış aynı) | Modify |
| `apps/hub/src/modules/studio/lib/validation.ts` | `objective` alanı | Modify |
| `apps/hub/src/app/studio/api/students/[id]/progress/route.ts` (+`progress.test.ts`) | GET 3 alan, PUT objective + bayat denetim sıfırlama | Modify/Create |
| `apps/hub/src/modules/studio/lib/age.ts` (+test) | `calcAgeYears`, `calcAgeText` (toolHandler'dan) | Create |
| `apps/hub/src/modules/studio/lib/toolHandler.ts` | `age.ts`'i kullanır | Modify |
| `apps/hub/src/modules/studio/lib/goalAudit.ts` (+test) | `GOAL_AUDIT_ENDPOINT`, günlük sayım, usage dönüşümü | Create |
| `apps/hub/src/app/studio/api/students/[id]/progress/[goalId]/audit/route.ts` (+`audit.test.ts`) | denetim rotası | Create |
| `apps/hub/src/modules/studio/lib/studentContext.ts` (+test) | `inProgressGoals` + kısa dönem hedef satırı | Modify |
| `apps/hub/src/modules/studio/lib/generateProfile.ts` | yedek çağrıda `inProgressGoals: []` | Modify |
| `apps/hub/src/modules/studio/components/students/ProgressTab.tsx` | kısa dönem hedef alanı + Denetle + kart | Modify |
| `apps/hub/src/modules/studio/lib/koyuTemaKontrast.test.ts` | `ProgressTab` listeye | Modify |

---

### Task 1: Veri modeli — 0022 SQL + Prisma + kaynak-metin testi + `prisma generate`

**Files:** Create `apps/hub/prisma/sql/0022_objective.sql`, `apps/hub/src/lib/objectiveMigration.test.ts`; Modify `apps/hub/prisma/studio/schema.prisma`.

- [ ] **Step 1: Başarısız test**

```ts
// apps/hub/src/lib/objectiveMigration.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* Hedef denetçisi 1c-B (spec §5.2): StudentProgress'e üç sütun. Mevcut tabloya sütun eklediği için deploy sırası
   ZORUNLU: önce SQL, sonra kod. `--` yorumları atılır: yorumlanmış ifade testi geçirmesin. */
const RAW = readFileSync(path.resolve(import.meta.dirname, "../../prisma/sql/0022_objective.sql"), "utf8");
const SQL = RAW.replace(/^\s*--.*$/gm, "");

describe("0022_objective.sql", () => {
  it("üç sütun idempotent eklenir; tablo oluşturulmaz; indeks yok", () => {
    expect(SQL).toMatch(/ALTER TABLE public\."StudentProgress" ADD COLUMN IF NOT EXISTS "objective" TEXT;/);
    expect(SQL).toMatch(/ALTER TABLE public\."StudentProgress" ADD COLUMN IF NOT EXISTS "objectiveAudit" JSONB;/);
    expect(SQL).toMatch(/ALTER TABLE public\."StudentProgress" ADD COLUMN IF NOT EXISTS "objectiveAuditedAt" TIMESTAMP\(3\);/);
    expect(SQL).not.toMatch(/CREATE TABLE/);
    expect(SQL).not.toMatch(/CREATE (UNIQUE )?INDEX/);
  });
  it("başlık yorumu deploy sırasını ve geri almayı söyler", () => {
    expect(RAW).toContain("DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod");
    expect(RAW).toMatch(/GERİ ALMA: ALTER TABLE public\."StudentProgress" DROP COLUMN "objectiveAuditedAt", DROP COLUMN "objectiveAudit", DROP COLUMN "objective";/);
  });
});
```

- [ ] **Step 2: Kırmızı:** `cd apps/hub && node_modules/.bin/vitest run src/lib/objectiveMigration.test.ts` → ENOENT.

- [ ] **Step 3: SQL + Prisma**

```sql
-- 0022_objective.sql
-- HEDEF DB: studio → public."StudentProgress" (üç sütun)
--
-- HEDEF DENETÇİSİ 1c-B (2026-11-05 tasarımı §5.2). MEB müfredat hedefinin altında uzmanın yazdığı kısa dönem hedef
-- (objective, ≤600 karakter) + son denetim sonucu (objectiveAudit: DenetimSonucu JSON, gerçek adla) + tarihi.
-- PUT'ta metin değişirse denetim sunucuda sıfırlanır (bayat denetim gösterilmez).
--
-- Additive + idempotent; prisma migrate YOK — raw SQL. db push KULLANMA.
-- DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod (kod önce giderse progress GET'i `objective` seçerken 500 verir).
-- RLS: tablo zaten kapsamda (0016); politika değişmez. İndeks gerekmez (öğrenci+hedef tekil anahtarıyla okunur).
-- GERİ ALMA: ALTER TABLE public."StudentProgress" DROP COLUMN "objectiveAuditedAt", DROP COLUMN "objectiveAudit", DROP COLUMN "objective";

ALTER TABLE public."StudentProgress" ADD COLUMN IF NOT EXISTS "objective" TEXT;
ALTER TABLE public."StudentProgress" ADD COLUMN IF NOT EXISTS "objectiveAudit" JSONB;
ALTER TABLE public."StudentProgress" ADD COLUMN IF NOT EXISTS "objectiveAuditedAt" TIMESTAMP(3);
```

`schema.prisma` `model StudentProgress` — `updatedAt DateTime @updatedAt` satırından sonra:

```prisma
  /// Hedef denetçisi 1c-B: uzmanın bu MEB hedefi için yazdığı kısa dönem hedef (≤600) + son denetim
  /// (DenetimSonucu JSON, gerçek adla) + tarihi. Metin değişince denetim sıfırlanır. DDL: sql/0022_objective.sql.
  objective          String?
  objectiveAudit     Json?
  objectiveAuditedAt DateTime?
```

- [ ] **Step 4: Yeşil + istemci üret:** `cd apps/hub && node_modules/.bin/vitest run src/lib/objectiveMigration.test.ts && node_modules/.bin/prisma generate --schema prisma/studio/schema.prisma && node_modules/.bin/tsc --noEmit` → 2 test PASS; `src/generated/studio` (gitignored) yeni alanları bilir; tsc temiz.

- [ ] **Step 5: Commit** — `feat(studio): 0022 — StudentProgress kısa dönem hedef + denetim sütunları (Prisma + kaynak-metin testi)`

---

### Task 2: Çekirdek `sonucuGeriCevir` + Atölye rotası ona geçer

**Files:** Create `apps/hub/src/lib/hedefDenetimi/geriCevir.ts`, `geriCevir.test.ts`; Modify `apps/hub/src/lib/hedefDenetimi/index.ts`, `apps/hub/src/app/atolye/api/hedef-denetcisi/route.ts`.

- [ ] **Step 1: Başarısız test**

```ts
// apps/hub/src/lib/hedefDenetimi/geriCevir.test.ts
import { describe, expect, it } from "vitest";
import { adParcaCeviricileri, sonucuGeriCevir } from "./geriCevir";
import { denetimSonucuSchema } from "./schema";

const rumuzlu = denetimSonucuSchema.parse({
  bilesenler: {
    davranis: { durum: "var", alinti: "Sinan doğru okur", not: "Sinan için gözlenebilir." },
    olcut: { durum: "var", alinti: "8/10 doğrulukla" },
    kosul: { durum: "eksik" }, zaman: { durum: "eksik" }, taban: { durum: "eksik" },
  },
  mebUyum: null,
  sorular: [{ bilesen: "zaman", soru: "Sinan için ne zamana kadar?", ornek: "8 hafta içinde" }],
  ozet: "Sinan'ın hedefinde zaman eksik.",
});
/** Basit çeviriciler: tam ad ve ad parçası. */
const tamAd = (s: string) => s.replaceAll("Sinan", "Arda Yılmaz");
const ilkAd = (s: string) => s.replaceAll("Sinan", "Arda");

describe("sonucuGeriCevir", () => {
  it("alıntı gerçek hedefin parçası kalır (parça adayı), diğer alanlar tam adla çevrilir", () => {
    const s = sonucuGeriCevir(rumuzlu, "Arda doğru okur; 8/10 doğrulukla.", tamAd, [ilkAd]);
    expect(s.bilesenler.davranis.alinti).toBe("Arda doğru okur");
    expect(s.bilesenler.olcut.alinti).toBe("8/10 doğrulukla");
    expect(s.bilesenler.davranis.not).toBe("Arda Yılmaz için gözlenebilir.");
    expect(s.sorular[0]!.soru).toBe("Arda Yılmaz için ne zamana kadar?");
    expect(s.ozet).toBe("Arda Yılmaz'ın hedefinde zaman eksik.");
  });
  it("tam ad hedefte geçiyorsa tam ad kazanır; hiçbiri geçmiyorsa tam ada düşer; girdi değişmez", () => {
    expect(sonucuGeriCevir(rumuzlu, "Arda Yılmaz doğru okur", tamAd, [ilkAd]).bilesenler.davranis.alinti).toBe("Arda Yılmaz doğru okur");
    expect(sonucuGeriCevir(rumuzlu, "başka metin", tamAd, [ilkAd]).bilesenler.davranis.alinti).toBe("Arda Yılmaz doğru okur");
    expect(rumuzlu.bilesenler.davranis.alinti).toBe("Sinan doğru okur");
  });
  it("adParcaCeviricileri: tek kelimelik adda boş; iki kelimede her parça için ayrı eşleme", () => {
    const geri = (s: string, m: { real: string; alias: string }[]) => s.replaceAll(m[0]!.alias, m[0]!.real);
    expect(adParcaCeviricileri("Ela", "Nisa", geri)).toEqual([]);
    const c = adParcaCeviricileri("Arda Yılmaz", "Sinan", geri);
    expect(c.map((f) => f("Sinan okur"))).toEqual(["Arda okur", "Yılmaz okur"]);
  });
});
```

- [ ] **Step 2: Kırmızı:** `cd apps/hub && node_modules/.bin/vitest run src/lib/hedefDenetimi/geriCevir` → modül yok.

- [ ] **Step 3: Uygulama**

```ts
// apps/hub/src/lib/hedefDenetimi/geriCevir.ts
import { alintiGecerli } from "./dogrula";
import { BILESENLER, dizgileriDonustur, type DenetimSonucu } from "./schema";

/* Rumuzlu sonucu gerçek ada çevirme (spec §15 "alıntı başına ad geri çevirme"). Atölye ve Studio rotaları ortak kullanır.
   Alıntı, uzmanın yazdığı hedefin parçası kalmalı: tam ad çevirisi hedefte geçmiyorsa ("Arda Yılmaz doğru okur" ama hedef
   "Arda doğru okur") ad parçası çevirileri denenir; `alintiGecerli(gercekHedef, aday)` olan ilk aday alınır. */

export function sonucuGeriCevir(
  rumuzlu: DenetimSonucu,
  gercekHedef: string,
  cevir: (s: string) => string,
  parcaCeviriciler: ((s: string) => string)[] = [],
): DenetimSonucu {
  const sonuc = dizgileriDonustur(rumuzlu, cevir);
  for (const k of BILESENLER) {
    const a = rumuzlu.bilesenler[k].alinti;
    if (!a) continue;
    const adaylar = [cevir(a), ...parcaCeviriciler.map((f) => f(a))];
    sonuc.bilesenler[k].alinti = adaylar.find((c) => alintiGecerli(gercekHedef, c)) ?? adaylar[0]!;
  }
  return sonuc;
}

/** Ad ≥2 kelimeyse her kelime için ayrı `{real: parça, alias}` eşlemesiyle çevirici; tek kelimede boş. `rehydrate` = `@ludenlab/ai` `rehydrateText`. */
export function adParcaCeviricileri(
  real: string,
  alias: string,
  rehydrate: (s: string, m: { real: string; alias: string }[]) => string,
): ((s: string) => string)[] {
  const parcalar = real.split(/\s+/).filter(Boolean);
  if (parcalar.length < 2) return [];
  return parcalar.map((p) => (s: string) => rehydrate(s, [{ real: p, alias }]));
}
```

`index.ts`'e ekle: `export { adParcaCeviricileri, sonucuGeriCevir } from "./geriCevir";`

Atölye rotası (`route.ts`): `const sonuc = dizgileriDonustur(rumuzlu, …)` satırından `sonuc.bilesenler[k].alinti = …` döngüsünün sonuna kadar olan bloğu şununla değiştir:

```ts
    const sonuc = sonucuGeriCevir(
      rumuzlu,
      gercekHedef,
      (s) => rehydrateText(s, [map]),
      adParcaCeviricileri(input.rumuz, map.alias, rehydrateText),
    );
```

İçe aktarmaları güncelle: `@/lib/hedefDenetimi`'den `adParcaCeviricileri, sonucuGeriCevir` ekle; artık kullanılmayan `dizgileriDonustur`/`alintiGecerli` içe aktarmalarını kaldır (eslint `no-unused-vars`).

- [ ] **Step 4: Yeşil:** `cd apps/hub && node_modules/.bin/vitest run src/lib/hedefDenetimi src/app/atolye/api/hedef-denetcisi && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint src/lib/hedefDenetimi src/app/atolye/api/hedef-denetcisi` → 3 yeni test + Atölye 15 rota testi değişmeden PASS.

- [ ] **Step 5: Commit** — `refactor(hedef-denetimi): alıntı başına ad geri çevirme ortak yardımcıya (sonucuGeriCevir); Atölye rotası ona geçti`

---

### Task 3: `progress` rotası — GET 3 alan, PUT `objective` + bayat denetim sıfırlama

**Files:** Modify `apps/hub/src/modules/studio/lib/validation.ts`, `apps/hub/src/app/studio/api/students/[id]/progress/route.ts`; Create `apps/hub/src/app/studio/api/students/[id]/progress/progress.test.ts`.

- [ ] **Step 1: Başarısız test**

```ts
// apps/hub/src/app/studio/api/students/[id]/progress/progress.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/* Spec §7.1: GET üç yeni alanı döner; PUT `objective` undefined → sütunlara dokunulmaz; verilince metin değiştiyse
   denetim sıfırlanır (Prisma.DbNull), aynıysa korunur; "" → null; >600 → 400. Transaction: ön okuma + upsert aynı tx. */
const tx = { studentProgress: { findUnique: vi.fn(), upsert: vi.fn() } };
const prisma = {
  student: { findFirst: vi.fn() },
  studentProgress: { findMany: vi.fn() },
  $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
};
vi.mock("@studio/lib/db", () => ({ prisma }));
vi.mock("@studio/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "t1" } })) }));
vi.mock("@/generated/studio/client", () => ({ Prisma: { DbNull: "DbNull" } }));

const params = { params: Promise.resolve({ id: "s1" }) };
const put = (updates: unknown[]) =>
  new NextRequest("http://x/p", { method: "PUT", body: JSON.stringify({ updates }), headers: { "content-type": "application/json" } });

beforeEach(() => {
  vi.clearAllMocks();
  prisma.student.findFirst.mockResolvedValue({ id: "s1" });
  tx.studentProgress.findUnique.mockResolvedValue(null);
  tx.studentProgress.upsert.mockResolvedValue({});
});

describe("GET", () => {
  it("objective/objectiveAudit/objectiveAuditedAt seçilir ve döner", async () => {
    const { GET } = await import("./route");
    const tarih = new Date(2026, 10, 5);
    prisma.studentProgress.findMany.mockResolvedValue([{ goalId: "g1", status: "in_progress", notes: null, updatedAt: tarih, objective: "okur", objectiveAudit: { ozet: "x" }, objectiveAuditedAt: tarih }]);
    const res = await GET(new NextRequest("http://x/p"), params);
    expect(prisma.studentProgress.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: "s1", therapistId: "t1" },
      select: { goalId: true, status: true, notes: true, updatedAt: true, objective: true, objectiveAudit: true, objectiveAuditedAt: true },
    }));
    const { progress } = await res.json();
    expect(progress[0]).toMatchObject({ goalId: "g1", objective: "okur", objectiveAudit: { ozet: "x" } });
  });
});

describe("PUT", () => {
  it("objective verilmezse sütunlara dokunulmaz, ön okuma yapılmaz", async () => {
    const { PUT } = await import("./route");
    expect((await PUT(put([{ goalId: "g1", status: "in_progress", notes: "n" }]), params)).status).toBe(200);
    expect(tx.studentProgress.findUnique).not.toHaveBeenCalled();
    const arg = tx.studentProgress.upsert.mock.calls[0]![0] as { create: Record<string, unknown>; update: Record<string, unknown> };
    expect(arg.create).not.toHaveProperty("objective");
    expect(arg.update).not.toHaveProperty("objective");
    expect(arg.update).not.toHaveProperty("objectiveAudit");
  });
  it("metin değişince denetim DbNull ile sıfırlanır; aynıysa korunur; boş metin null olur", async () => {
    const { PUT } = await import("./route");
    tx.studentProgress.findUnique.mockResolvedValueOnce({ objective: "eski" });
    await PUT(put([{ goalId: "g1", status: "in_progress", objective: "yeni" }]), params);
    expect(tx.studentProgress.findUnique).toHaveBeenCalledWith({ where: { studentId_goalId: { studentId: "s1", goalId: "g1" } }, select: { objective: true } });
    expect(tx.studentProgress.upsert.mock.calls[0]![0]).toMatchObject({
      create: { studentId: "s1", goalId: "g1", therapistId: "t1", status: "in_progress", objective: "yeni" },
      update: { status: "in_progress", objective: "yeni", objectiveAudit: "DbNull", objectiveAuditedAt: null },
    });

    tx.studentProgress.findUnique.mockResolvedValueOnce({ objective: "aynı" });
    await PUT(put([{ goalId: "g1", status: "completed", objective: "aynı" }]), params);
    const ayni = tx.studentProgress.upsert.mock.calls[1]![0] as { update: Record<string, unknown> };
    expect(ayni.update).toMatchObject({ objective: "aynı" });
    expect(ayni.update).not.toHaveProperty("objectiveAudit");

    tx.studentProgress.findUnique.mockResolvedValueOnce({ objective: "vardı" });
    await PUT(put([{ goalId: "g1", status: "not_started", objective: "" }]), params);
    expect(tx.studentProgress.upsert.mock.calls[2]![0]).toMatchObject({ update: { objective: null, objectiveAudit: "DbNull", objectiveAuditedAt: null } });
  });
  it("objective 601 karakter → 400; sahiplik 404'te yazma yok", async () => {
    const { PUT } = await import("./route");
    expect((await PUT(put([{ goalId: "g1", status: "in_progress", objective: "a".repeat(601) }]), params)).status).toBe(400);
    prisma.student.findFirst.mockResolvedValueOnce(null);
    expect((await PUT(put([{ goalId: "g1", status: "in_progress" }]), params)).status).toBe(404);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Kırmızı:** `cd apps/hub && node_modules/.bin/vitest run "src/app/studio/api/students/\[id\]/progress"` → GET select eşleşmez, PUT `objective` zod'dan geçmez.

- [ ] **Step 3: Uygulama**

`validation.ts`: dosya başına `import { HEDEF_METNI_MAX } from "@/lib/hedefDenetimi/schema";` ve `progressUpdateItemSchema`:

```ts
export const progressUpdateItemSchema = z.object({
  goalId: z.string().min(1),
  status: progressStatusSchema,
  notes: z.string().max(2000).nullable().optional(),
  /** Kısa dönem hedef (hedef denetçisi 1c-B): undefined = dokunma, null/"" = sil. */
  objective: z.string().trim().max(HEDEF_METNI_MAX).nullable().optional(),
});
```

`progress/route.ts` — GET select:

```ts
      select: { goalId: true, status: true, notes: true, updatedAt: true, objective: true, objectiveAudit: true, objectiveAuditedAt: true },
```

PUT: `import { Prisma } from "@/generated/studio/client";` ekle; `await prisma.$transaction(updates.map(...))` bloğunu şununla değiştir:

```ts
    // Kısa dönem hedef: metin değişirse eski denetim BAYAT → aynı transaction'da sıfırlanır (bayat denetim gösterilmez).
    // `objective` undefined gelirse (eski istemci, asistan goal_status) sütunlara dokunulmaz.
    await prisma.$transaction(async (tx) => {
      for (const u of updates) {
        const where = { studentId_goalId: { studentId, goalId: u.goalId } };
        const objective = u.objective === undefined ? undefined : u.objective || null;
        let denetimSifirla = false;
        if (objective !== undefined) {
          const mevcut = await tx.studentProgress.findUnique({ where, select: { objective: true } });
          denetimSifirla = (mevcut?.objective ?? null) !== objective;
        }
        const hedefAlanlari = objective === undefined ? {} : { objective };
        const sifirlama = denetimSifirla ? { objectiveAudit: Prisma.DbNull, objectiveAuditedAt: null } : {};
        await tx.studentProgress.upsert({
          where,
          create: { studentId, goalId: u.goalId, status: u.status, notes: u.notes ?? null, therapistId, ...hedefAlanlari },
          update: { status: u.status, notes: u.notes ?? null, ...hedefAlanlari, ...sifirlama },
        });
      }
    });
```

- [ ] **Step 4: Yeşil:** `cd apps/hub && node_modules/.bin/vitest run "src/app/studio/api/students/\[id\]/progress" src/modules/studio && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint "src/app/studio/api/students/[id]/progress" src/modules/studio/lib/validation.ts` → 4 test PASS; mevcut Studio testleri (asistan `goal_status` PUT'u `objective`'siz) bozulmaz. `Prisma.DbNull` tipi `update`'te kabul edilmezse `objectiveAudit: Prisma.DbNull as Prisma.NullableJsonNullValueInput` yaz.

- [ ] **Step 5: Commit** — `feat(studio): progress rotası kısa dönem hedef — GET/PUT objective, metin değişince denetim sıfırlanır`

---

### Task 4: `age.ts`, `goalAudit.ts` ve denetim rotası `POST …/progress/[goalId]/audit`

**Files:** Create `apps/hub/src/modules/studio/lib/age.ts`, `age.test.ts`, `apps/hub/src/modules/studio/lib/goalAudit.ts`, `goalAudit.test.ts`, `apps/hub/src/app/studio/api/students/[id]/progress/[goalId]/audit/route.ts`, `audit.test.ts`; Modify `apps/hub/src/modules/studio/lib/toolHandler.ts`.

- [ ] **Step 1: Başarısız testler**

```ts
// apps/hub/src/modules/studio/lib/age.test.ts
import { describe, expect, it } from "vitest";
import { calcAgeText, calcAgeYears } from "./age";

describe("age", () => {
  it("yıl farkı; metin 'N yaşında'; doğum tarihi yoksa boş", () => {
    const simdi = new Date(2026, 10, 6);
    expect(calcAgeYears(new Date(2019, 3, 10), simdi)).toBe(7);
    expect(calcAgeText(new Date(2019, 3, 10), simdi)).toBe("7 yaşında");
    expect(calcAgeText(null, simdi)).toBe("");
  });
});
```

```ts
// apps/hub/src/modules/studio/lib/goalAudit.test.ts
import { describe, expect, it, vi } from "vitest";
import { GOAL_AUDIT_ENDPOINT, goalAuditBugun, usageToLog } from "./goalAudit";

describe("goalAudit", () => {
  it("günlük sayım: etiket + TR günü; sayım patlarsa 0 (açık)", async () => {
    const count = vi.fn(async (_a: unknown) => 4);
    expect(await goalAuditBugun({ apiUsageLog: { count } }, "t1", new Date("2026-11-05T22:30:00Z"))).toBe(4);
    expect(count).toHaveBeenCalledWith({ where: { therapistId: "t1", endpoint: GOAL_AUDIT_ENDPOINT, createdAt: { gte: new Date("2026-11-05T21:00:00.000Z") } } });
    const patlayan = vi.fn(async (_a: unknown): Promise<number> => { throw new Error("db"); });
    expect(await goalAuditBugun({ apiUsageLog: { count: patlayan } }, "t1")).toBe(0);
    expect(GOAL_AUDIT_ENDPOINT).toBe("students/goal-audit");
  });
  it("usageToLog: @ludenlab/ai TokenUsage → Anthropic usage biçimi", () => {
    expect(usageToLog({ inputTokens: 10, outputTokens: 5, cacheReadTokens: 2, cacheCreationTokens: 1 })).toEqual({
      input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 2, cache_creation_input_tokens: 1,
    });
  });
});
```

```ts
// apps/hub/src/app/studio/api/students/[id]/progress/[goalId]/audit/audit.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { DenetimHatasi } from "@/lib/hedefDenetimi/dogrula";

/* Spec §7.2 + §15: sahiplik → müfredat kontrolü → gövde → temizle → 6/dk → günlük 10 (ApiUsageLog) → 24h tavan →
   scrub → model → alıntı başına ad geri çevirme → logUsage → upsert. Kredi yok, plan kapısı yok. */
const prisma = {
  student: { findFirst: vi.fn() },
  curriculumGoal: { findUnique: vi.fn() },
  apiUsageLog: { count: vi.fn(async (_a: unknown) => 0) },
  studentProgress: { upsert: vi.fn(async (_a: unknown) => ({})) },
};
vi.mock("@studio/lib/db", () => ({ prisma }));
vi.mock("@studio/lib/auth-helpers", () => ({ requireAuth: vi.fn(async () => ({ session: { user: { id: "t1" } } })) }));
vi.mock("@studio/lib/pseudonym", async (orig) => ({
  ...(await orig<typeof import("@studio/lib/pseudonym")>()),
  ensureStudentAlias: vi.fn(async () => "Nisa"),
}));
const rl = { allowed: true, retryAfter: 0 };
const gun = { allowed: true, retryAfter: 0 };
const rateLimit = vi.fn((key: string, ..._r: unknown[]) => (key.includes("-gun:") ? gun : rl));
vi.mock("@/lib/rateLimit", () => ({ rateLimit, rateLimitResponse: () => new Response(null, { status: 429 }) }));
const logUsage = vi.fn((_t: string, _e: string, _u: unknown) => {});
vi.mock("@studio/lib/usage", () => ({ logUsage }));
const usage = { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheCreationTokens: 0 };
const sonucRumuzlu = () => ({
  bilesenler: {
    davranis: { durum: "var", alinti: "Nisa doğru okur", not: "" },
    olcut: { durum: "var", alinti: "8/10 doğrulukla", not: "" },
    kosul: { durum: "eksik", alinti: "", not: "" }, zaman: { durum: "eksik", alinti: "", not: "" }, taban: { durum: "eksik", alinti: "", not: "" },
  },
  mebUyum: null,
  sorular: [{ bilesen: "zaman", soru: "Ne zamana kadar?", ornek: "8 hafta içinde" }],
  ozet: "Koşul, zaman ve taban eksik.",
});
const hedefDenetle = vi.fn(async (_g: { hedef: string; baglam?: Record<string, unknown> }) => ({ sonuc: sonucRumuzlu(), model: "claude-sonnet-4-6", usage }));
vi.mock("@/lib/hedefDenetimi/run", () => ({ hedefDenetle }));

const ogrenci = { id: "s1", name: "Ela Şahin", llmAlias: null, therapistId: "t1", birthDate: new Date(2020, 4, 14), curriculumIds: ["c1"] };
const hedef = { code: "2.2", title: "Sıra alma", curriculumId: "c1" };
const req = (body: unknown) => new NextRequest("http://x/a", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const params = { params: Promise.resolve({ id: "s1", goalId: "g1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  rl.allowed = true; gun.allowed = true;
  prisma.student.findFirst.mockResolvedValue(ogrenci);
  prisma.curriculumGoal.findUnique.mockResolvedValue(hedef);
  prisma.apiUsageLog.count.mockResolvedValue(0);
});
afterEach(() => { vi.useRealTimers(); });

describe("POST …/progress/[goalId]/audit", () => {
  it("sahiplik 404; hedef müfredatta değil 404; ikisinde de model çağrılmaz", async () => {
    const { POST } = await import("./route");
    prisma.student.findFirst.mockResolvedValueOnce(null);
    expect((await POST(req({ objective: "okur" }), params)).status).toBe(404);
    prisma.curriculumGoal.findUnique.mockResolvedValueOnce({ ...hedef, curriculumId: "başka" });
    expect((await POST(req({ objective: "okur" }), params)).status).toBe(404);
    expect(prisma.student.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "s1", therapistId: "t1" } }));
    expect(hedefDenetle).not.toHaveBeenCalled();
  });
  it("boş / yalnız görünmez / 601 karakter → 400; hız sınırı sorulmaz", async () => {
    const { POST } = await import("./route");
    expect((await POST(req({ objective: "  " }), params)).status).toBe(400);
    expect((await POST(req({ objective: "​" }), params)).status).toBe(400);
    expect((await POST(req({ objective: "a".repeat(601) }), params)).status).toBe(400);
    expect(rateLimit).not.toHaveBeenCalled();
  });
  it("dakikalık 429; günlük sayım 10 → 429 DAILY_CAP (24h tavan ve model yok); 24h tavan → 429 DAILY_CAP", async () => {
    const { POST } = await import("./route");
    rl.allowed = false;
    expect((await POST(req({ objective: "okur" }), params)).status).toBe(429);
    expect(prisma.apiUsageLog.count).not.toHaveBeenCalled();
    rl.allowed = true;
    prisma.apiUsageLog.count.mockResolvedValueOnce(10);
    const cap = await POST(req({ objective: "okur" }), params);
    expect(cap.status).toBe(429);
    expect(await cap.json()).toMatchObject({ code: "DAILY_CAP" });
    expect(rateLimit).not.toHaveBeenCalledWith(expect.stringContaining("-gun:"), expect.anything(), expect.anything());
    gun.allowed = false;
    const tavan = await POST(req({ objective: "okur" }), params);
    expect(tavan.status).toBe(429);
    expect(await tavan.json()).toMatchObject({ code: "DAILY_CAP" });
    expect(hedefDenetle).not.toHaveBeenCalled();
  });
  it("mutlu yol: temizle → rumuzla; üst hedef ve yaş bağlamda; gerçek ad geri gelir; logUsage etiketi; upsert; kalan 9", async () => {
    const { POST } = await import("./route");
    const res = await POST(req({ objective: "Ela­ doğru okur; 8/10 doğrulukla." }), params);
    expect(res.status).toBe(200);
    const girdi = hedefDenetle.mock.calls[0]![0];
    expect(girdi.hedef).not.toContain("Ela");
    expect(girdi.hedef).toContain("Nisa");
    expect(girdi.baglam).toEqual({ kademeYas: expect.stringMatching(/^\d+ yaşında$/), ustHedef: "2.2 Sıra alma" });
    const body = await res.json();
    expect(body.audit.bilesenler.davranis.alinti).toBe("Ela doğru okur"); // parça adayı (tam ad "Ela Şahin" hedefte yok)
    expect(body).toMatchObject({ kalan: 9 });
    expect(typeof body.auditedAt).toBe("string");
    expect(logUsage).toHaveBeenCalledWith("t1", "students/goal-audit", { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
    expect(prisma.studentProgress.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId_goalId: { studentId: "s1", goalId: "g1" } },
      create: expect.objectContaining({ studentId: "s1", goalId: "g1", therapistId: "t1", status: "not_started", objective: "Ela doğru okur; 8/10 doğrulukla." }),
      update: expect.objectContaining({ objective: "Ela doğru okur; 8/10 doğrulukla." }),
    }));
    const upd = (prisma.studentProgress.upsert.mock.calls[0]![0] as { update: { objectiveAudit: { bilesenler: { davranis: { alinti: string } } }; objectiveAuditedAt: Date } }).update;
    expect(upd.objectiveAudit.bilesenler.davranis.alinti).toBe("Ela doğru okur");
    expect(upd.objectiveAuditedAt).toBeInstanceOf(Date);
    expect(logUsage.mock.invocationCallOrder[0]!).toBeLessThan(prisma.studentProgress.upsert.mock.invocationCallOrder[0]!);
  });
  it("sayım patlarsa açık sayılır (model çağrılır); doğum tarihi yoksa kademeYas yok", async () => {
    const { POST } = await import("./route");
    prisma.apiUsageLog.count.mockRejectedValueOnce(new Error("db"));
    prisma.student.findFirst.mockResolvedValueOnce({ ...ogrenci, birthDate: null });
    expect((await POST(req({ objective: "okur" }), params)).status).toBe(200);
    expect(hedefDenetle.mock.calls[0]![0].baglam).toEqual({ kademeYas: undefined, ustHedef: "2.2 Sıra alma" });
  });
  it("DenetimHatasi → 502, kullanım varsa loglanır, upsert yok; diğer hata → 500", async () => {
    const { POST } = await import("./route");
    const e = new DenetimHatasi("parse");
    e.kullanim = { model: "m", usage };
    hedefDenetle.mockRejectedValueOnce(e);
    expect((await POST(req({ objective: "okur" }), params)).status).toBe(502);
    expect(logUsage).toHaveBeenCalledTimes(1);
    expect(prisma.studentProgress.upsert).not.toHaveBeenCalled();
    hedefDenetle.mockRejectedValueOnce(new Error("ağ"));
    expect((await POST(req({ objective: "okur" }), params)).status).toBe(500);
  });
});
```

- [ ] **Step 2: Kırmızı:** `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/age src/modules/studio/lib/goalAudit "src/app/studio/api/students/\[id\]/progress/\[goalId\]"` → modüller yok.

- [ ] **Step 3: Uygulama**

```ts
// apps/hub/src/modules/studio/lib/age.ts
/* Yaş yardımcıları — toolHandler (araç kapısı), kart rotası ve hedef denetçisi aynı yaklaşımı kullanır: yıl farkı. */
export function calcAgeYears(birthDate: Date, now: Date = new Date()): number {
  return now.getFullYear() - new Date(birthDate).getFullYear();
}

export function calcAgeText(birthDate: Date | null, now: Date = new Date()): string {
  if (!birthDate) return "";
  return `${calcAgeYears(birthDate, now)} yaşında`;
}
```

`toolHandler.ts`: yerel `calcAgeYears`/`calcAgeText` tanımlarını SİL, `import { calcAgeText, calcAgeYears } from "@studio/lib/age";` ekle (çağrı yerleri değişmez; `defaultAgeGroupFromYears` kalır).

```ts
// apps/hub/src/modules/studio/lib/goalAudit.ts
import type { TokenUsage } from "@ludenlab/ai";
import { trGunBaslangici } from "@/lib/trZaman";
import type { AnthropicUsageLike } from "@studio/lib/usage";

/* Hedef denetçisi Studio yüzeyi (spec §7.2). Günlük sınır `ApiUsageLog` sayımıyla (etiket aşağıda; parse hatası da
   loglandığı için sayılır). Sayım patlarsa açık sayılır (asistan ilkesi). */

export const GOAL_AUDIT_ENDPOINT = "students/goal-audit";
export const GOAL_AUDIT_RATE_PER_MIN = 6;

type SayimPrisma = { apiUsageLog: { count(args: unknown): Promise<number> } };

export async function goalAuditBugun(prisma: SayimPrisma, therapistId: string, now: Date = new Date()): Promise<number> {
  try {
    return await prisma.apiUsageLog.count({ where: { therapistId, endpoint: GOAL_AUDIT_ENDPOINT, createdAt: { gte: trGunBaslangici(now) } } });
  } catch (e) {
    console.warn("[goalAudit] günlük sayım yapılamadı, açık sayıldı", e);
    return 0;
  }
}

/** `@ludenlab/ai` TokenUsage → Studio `logUsage` girdisi. */
export function usageToLog(u: TokenUsage): AnthropicUsageLike {
  return { input_tokens: u.inputTokens, output_tokens: u.outputTokens, cache_read_input_tokens: u.cacheReadTokens, cache_creation_input_tokens: u.cacheCreationTokens };
}
```

```ts
// apps/hub/src/app/studio/api/students/[id]/progress/[goalId]/audit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rehydrateText, type NameMapping } from "@ludenlab/ai";
import { readJsonBody } from "@/lib/bodyLimit";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { HEDEF_DENETIM_GUNLUK, HEDEF_DENETIM_SINIR_METNI, adParcaCeviricileri, hedefMetniSchema, sonucuGeriCevir, temizle } from "@/lib/hedefDenetimi";
import { DenetimHatasi } from "@/lib/hedefDenetimi/dogrula";
import { hedefDenetle } from "@/lib/hedefDenetimi/run";
import { requireAuth } from "@studio/lib/auth-helpers";
import { calcAgeText } from "@studio/lib/age";
import { prisma } from "@studio/lib/db";
import { GOAL_AUDIT_ENDPOINT, GOAL_AUDIT_RATE_PER_MIN, goalAuditBugun, usageToLog } from "@studio/lib/goalAudit";
import { ensureStudentAlias, restoreName, scrub } from "@studio/lib/pseudonym";
import { logUsage } from "@studio/lib/usage";
import { logError, zodError } from "@studio/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

/* Kısa dönem hedef denetimi (spec §7.2, §15). KREDİ YOK, plan kapısı YOK; koruma: 6/dk + günlük 10 (ApiUsageLog) + 24h tavan.
   ÇOCUK PII: önce `temizle` (görünmez/etiketle bölünmüş ad birleşmesin), sonra `scrub`; çıktı alıntı başına geri çevrilir.
   Depolama: metin ve denetim GERÇEK adla (Studio kararı, 1b ile aynı). Hedef metni log satırlarına yazılmaz. */

const bodySchema = z.object({ objective: hedefMetniSchema });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; goalId: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const therapistId = gate.session.user.id;
  const { id: studentId, goalId } = await params;
  try {
    const student = await prisma.student.findFirst({
      where: { id: studentId, therapistId },
      select: { id: true, name: true, llmAlias: true, therapistId: true, birthDate: true, curriculumIds: true },
    });
    if (!student) return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 });
    const goal = await prisma.curriculumGoal.findUnique({ where: { id: goalId }, select: { code: true, title: true, curriculumId: true } });
    if (!goal || !student.curriculumIds.includes(goal.curriculumId)) {
      return NextResponse.json({ error: "Hedef bu öğrencinin müfredatında değil" }, { status: 404 });
    }

    const read = await readJsonBody(request);
    if (!read.ok) return NextResponse.json({ error: read.error }, { status: read.status });
    const parsed = bodySchema.safeParse(read.data);
    if (!parsed.success) return NextResponse.json({ error: zodError(parsed.error) }, { status: 400 });
    const gercekHedef = temizle(parsed.data.objective);
    if (!gercekHedef) return NextResponse.json({ error: "Hedef boş olamaz" }, { status: 400 });

    const rl = rateLimit(`goal-audit:${therapistId}`, GOAL_AUDIT_RATE_PER_MIN);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter);
    const sayim = await goalAuditBugun(prisma, therapistId);
    if (sayim >= HEDEF_DENETIM_GUNLUK) return NextResponse.json({ error: HEDEF_DENETIM_SINIR_METNI, code: "DAILY_CAP" }, { status: 429 });
    // 24 saatlik bellek-içi maliyet tavanı (sayım hatası açık sayıldığında bile); reddedilenler harcamasın diye sayımdan SONRA.
    const gun = rateLimit(`goal-audit-gun:${therapistId}`, HEDEF_DENETIM_GUNLUK * 2, 86_400_000);
    if (!gun.allowed) return NextResponse.json({ error: HEDEF_DENETIM_SINIR_METNI, code: "DAILY_CAP" }, { status: 429 });

    const alias = await ensureStudentAlias(student);
    const map: NameMapping = { real: student.name, alias };
    const hedef = scrub(gercekHedef, map) ?? gercekHedef;

    try {
      const { sonuc: rumuzlu, model: _model, usage } = await hedefDenetle({
        hedef,
        baglam: { kademeYas: student.birthDate ? calcAgeText(student.birthDate) : undefined, ustHedef: `${goal.code} ${goal.title}` },
      });
      const sonuc = sonucuGeriCevir(rumuzlu, gercekHedef, (s) => restoreName(s, map), adParcaCeviricileri(student.name, alias, rehydrateText));
      logUsage(therapistId, GOAL_AUDIT_ENDPOINT, usageToLog(usage));
      const now = new Date();
      await prisma.studentProgress.upsert({
        where: { studentId_goalId: { studentId, goalId } },
        create: { studentId, goalId, therapistId, status: "not_started", objective: gercekHedef, objectiveAudit: sonuc, objectiveAuditedAt: now },
        update: { objective: gercekHedef, objectiveAudit: sonuc, objectiveAuditedAt: now },
      });
      return NextResponse.json({ audit: sonuc, auditedAt: now.toISOString(), kalan: Math.max(0, HEDEF_DENETIM_GUNLUK - (sayim + 1)) });
    } catch (err) {
      if (err instanceof DenetimHatasi) {
        if (err.kullanim) logUsage(therapistId, GOAL_AUDIT_ENDPOINT, usageToLog(err.kullanim.usage)); // model çağrısı ücretlendi
        return NextResponse.json({ error: "Denetim üretilemedi. Tekrar deneyin." }, { status: 502 });
      }
      throw err;
    }
  } catch (error) {
    logError("POST /studio/api/students/[id]/progress/[goalId]/audit", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
```

`_model` kullanılmıyorsa `const { sonuc: rumuzlu, usage } = …` yaz. `objectiveAudit: sonuc` tsc'de `InputJsonValue`'ya uymazsa `import { Prisma } from "@/generated/studio/client"` ve `sonuc as unknown as Prisma.InputJsonValue` (bu durumda `audit.test.ts`'e `vi.mock("@/generated/studio/client", () => ({ Prisma: {} }))` ekle).

- [ ] **Step 4: Yeşil:** `cd apps/hub && node_modules/.bin/vitest run src/modules/studio "src/app/studio/api/students/\[id\]/progress" src/lib/toolGate.test.ts && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint src/modules/studio/lib/age.ts src/modules/studio/lib/goalAudit.ts src/modules/studio/lib/toolHandler.ts "src/app/studio/api/students/[id]/progress"` → 2 + 2 + 6 yeni test PASS; `toolHandler.test.ts` ve `toolGate.test.ts` (scrubDeep iddiası) bozulmaz.

- [ ] **Step 5: Commit** — `feat(studio): kısa dönem hedef denetim rotası — sahiplik+müfredat, günlük 10 (ApiUsageLog), temizle→scrub, alıntı geri çevirme, upsert; age.ts`

---

### Task 5: Bağlam bloğu — kısa dönem hedef satırı

**Files:** Modify `apps/hub/src/modules/studio/lib/studentContext.ts`, `studentContext.test.ts`, `apps/hub/src/modules/studio/lib/generateProfile.ts`.

- [ ] **Step 1: Testleri yeni şekle çevir (kırmızı)**

`studentContext.test.ts`:
- `temel`: `inProgressGoalTitles: []` → `inProgressGoals: []`.
- "hedefler: tamamlanan kodlar + süren başlıklar" testi: `inProgressGoalTitles: ["Üç sözcüklü istek", "Sıra alma", "Ortak dikkat", "Taklit"]` → `inProgressGoals: ["Üç sözcüklü istek", "Sıra alma", "Ortak dikkat", "Taklit"].map((title) => ({ title, objective: null }))`.
- "tam sığan durum": `inProgressGoalTitles: ["x".repeat(60)]` → `inProgressGoals: [{ title: "x".repeat(60), objective: null }]`.
- "bütçe sınırı": iki `inProgressGoalTitles: ["x".repeat(N)]` → `inProgressGoals: [{ title: "x".repeat(N), objective: null }]`.
- `loadStudentContext` "sorguları uzmanla kapsamlar" ve "hedef sorgusunun biçimi sabittir": `select` beklentisi `{ status: true, objective: true, goal: { select: { code: true, title: true } } }`.
- Yeni `it` ("hedefler" testinin altına):

```ts
  it("kısa dönem hedef: süren hedefte varsa 'başlık: hedef' (120'ye kırpılır, rumuzlu, tek satır); yoksa yalnız başlık", () => {
    const t = renderStudentBlock(
      { ...temel, inProgressGoals: [{ title: "Sıra alma", objective: "Ela Şahin,\nsözel ipucuyla 10 denemenin 8'inde sıra alır." }, { title: "Ortak dikkat", objective: null }] },
      map,
    );
    expect(t).toContain("Sürmekte olan hedefler: Sıra alma: Nisa, sözel ipucuyla 10 denemenin 8'inde sıra alır., Ortak dikkat");
    const uzun = renderStudentBlock({ ...temel, inProgressGoals: [{ title: "S", objective: "h".repeat(300) }] });
    const satir = uzun.split("\n").find((l) => l.startsWith("Sürmekte"))!;
    expect(satir).toBe(`Sürmekte olan hedefler: S: ${"h".repeat(119)}…`);
  });
```

ve `loadStudentContext` içinde:

```ts
  it("süren hedefin kısa dönem hedefi bloğa girer; tamamlananınki girmez", async () => {
    prisma.studentProgress.findMany.mockResolvedValue([
      { status: "completed", objective: "bitti", goal: { code: "2.1", title: "İstek" } },
      { status: "in_progress", objective: "Ela 10 denemenin 8'inde sıra alır", goal: { code: "2.2", title: "Sıra alma" } },
    ]);
    const blok = await loadStudentContext(prisma as never, istek);
    expect(blok).toContain("Sürmekte olan hedefler: Sıra alma: Nisa 10 denemenin 8'inde sıra alır");
    expect(blok).not.toContain("bitti");
  });
```

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/studentContext.test.ts` → tip/eşleşme hataları.

- [ ] **Step 2: Uygulama**

`studentContext.ts`:
- `BUTCE`'ye `kisaHedef: 120` ekle.
- `StudentContextInput`: `inProgressGoalTitles: string[];` → 
  ```ts
  /** Süren hedefler: başlık + uzmanın kısa dönem hedefi (varsa; 120'ye kırpılır, rumuzlanır). */
  inProgressGoals: { title: string; objective: string | null }[];
  ```
- `renderStudentBlock` hedef bloğu: `if (ctx.completedGoalCodes.length || ctx.inProgressGoals.length) {` ve
  ```ts
    const suren = ctx.inProgressGoals
      .slice(0, Math.max(0, BUTCE.hedefMadde - tamam.length))
      .map((g) => {
        const baslik = tekSatir(s(g.title));
        const kisa = g.objective?.trim() ? kirp(tekSatir(s(g.objective)), BUTCE.kisaHedef) : "";
        return kisa ? `${baslik}: ${kisa}` : baslik;
      });
  ```
- `loadStudentContext` progress sorgusu `select: { status: true, objective: true, goal: { select: { code: true, title: true } } }`; eşleme:
  ```ts
        inProgressGoals: progress.filter((p) => suren.has(p.status)).map((p) => ({ title: p.goal.title, objective: p.objective ?? null })),
  ```
  (`StudentContextPrisma` tipi `studentProgress.findMany` dönüşünü nasıl tanımlıyorsa `objective?: string | null` ekle.)
- `generateProfile.ts:198` `inProgressGoalTitles: [],` → `inProgressGoals: [],`.

- [ ] **Step 3: Yeşil:** `cd apps/hub && node_modules/.bin/vitest run src/modules/studio && node_modules/.bin/vitest run --config vitest.eval.config.ts evals/lib evals/tools evals/runner.selftest.eval.ts && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint src/modules/studio/lib/studentContext.ts src/modules/studio/lib/generateProfile.ts` → Studio testleri + eval kapısı (taklit `pick` `objective`'i düşürür → `null`) PASS.

- [ ] **Step 4: Commit** — `feat(studio): bağlam bloğunda süren hedefin kısa dönem hedefi (120, rumuzlu)`

---

### Task 6: `ProgressTab` — kısa dönem hedef alanı, Denetle, sonuç kartı

**Files:** Modify `apps/hub/src/modules/studio/components/students/ProgressTab.tsx`, `apps/hub/src/modules/studio/lib/koyuTemaKontrast.test.ts`.

- [ ] **Step 1: Bekçi (yeşil kalmalı — mevcut dosya `active ?` satırlarında `#fff` taşımaz)**

`koyuTemaKontrast.test.ts` `it.each` listesine `["HedefDenetcisiTool", …] as const` satırından sonra:

```ts
           ["ProgressTab", path.join(SRC, "modules/studio/components/students/ProgressTab.tsx")] as const,
```

- [ ] **Step 2: Uygulama**

İçe aktarmalar:

```ts
import { ChevronDown, ChevronRight, FileText, Circle, ClipboardList, Target } from "lucide-react";
import { AREA_LABELS } from "@studio/lib/constants";
import { formatDate } from "@studio/lib/utils";
import { PBtn, PSelect, PTextarea, PSpinner, PEmptyState } from "@studio/components/poster";
import { HedefDenetimSonucu } from "@/components/HedefDenetimSonucu";
import { HEDEF_DENETIM_GUNLUK, HEDEF_METNI_MAX, type DenetimSonucu } from "@/lib/hedefDenetimi";
```

Tipler ve yardımcı (dosya üstü, `ProgressMap` yerine):

```ts
type GoalProgress = { status: string; notes: string; objective: string; audit: DenetimSonucu | null; auditedAt: string | null };
type ProgressMap = Record<string, GoalProgress>;
const bosIlerleme = (): GoalProgress => ({ status: "not_started", notes: "", objective: "", audit: null, auditedAt: null });
```

Yükleme (`map[p.goalId] = …`):

```ts
        const progressList: { goalId: string; status: string; notes: string | null; objective?: string | null; objectiveAudit?: DenetimSonucu | null; objectiveAuditedAt?: string | null }[] =
          progressData.progress ?? [];
        const map: ProgressMap = {};
        for (const p of progressList) {
          map[p.goalId] = { status: p.status, notes: p.notes ?? "", objective: p.objective ?? "", audit: p.objectiveAudit ?? null, auditedAt: p.objectiveAuditedAt ?? null };
        }
```

State: `openNotes`'un yanına `const [openObjectives, setOpenObjectives] = useState<Set<string>>(new Set());` ve `const [auditing, setAuditing] = useState<string | null>(null);`.

Güncelleyiciler (`setGoalStatus`/`setGoalNotes` yerine):

```ts
  function guncelle(goalId: string, patch: Partial<GoalProgress>) {
    setLocalProgress((prev) => ({ ...prev, [goalId]: { ...(prev[goalId] ?? bosIlerleme()), ...patch } }));
  }
  const setGoalStatus = (goalId: string, status: string) => guncelle(goalId, { status });
  const setGoalNotes = (goalId: string, notes: string) => guncelle(goalId, { notes });
  const setGoalObjective = (goalId: string, objective: string) => guncelle(goalId, { objective });
  function toggleObjective(goalId: string) {
    setOpenObjectives((prev) => { const next = new Set(prev); if (next.has(goalId)) next.delete(goalId); else next.add(goalId); return next; });
  }
```

`dirtyEntries`: `return !saved || saved.status !== v.status || saved.notes !== v.notes || saved.objective !== v.objective;`

`handleSave` gövdesi: `updates: dirtyEntries.map(([goalId, v]) => ({ goalId, status: v.status, notes: v.notes || null, objective: v.objective || null }))`; başarıda:

```ts
      setSavedProgress((prev) => {
        const next = { ...prev };
        for (const [id, v] of dirtyEntries) {
          const bayat = (prev[id]?.objective ?? "") !== v.objective; // sunucu da sıfırlar (PUT)
          next[id] = bayat ? { ...v, audit: null, auditedAt: null } : { ...v };
        }
        return next;
      });
      setLocalProgress((prev) => {
        const next = { ...prev };
        for (const [id, v] of dirtyEntries) if ((savedProgress[id]?.objective ?? "") !== v.objective) next[id] = { ...v, audit: null, auditedAt: null };
        return next;
      });
```

Denetim:

```ts
  async function handleAudit(goalId: string) {
    const objective = (localProgress[goalId]?.objective ?? "").trim();
    if (!objective || auditing) return;
    setAuditing(goalId);
    try {
      const res = await fetch(`/studio/api/students/${studentId}/progress/${goalId}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective }),
      });
      const data = (await res.json().catch(() => null)) as { audit: DenetimSonucu; auditedAt: string; kalan: number } | { error: string; code?: string } | null;
      if (!data) throw new Error(`Sunucu hatası (${res.status}). Tekrar deneyin.`);
      if (!res.ok || "error" in data) throw new Error(("error" in data && data.error) || "Denetim yapılamadı");
      const guncel = { objective, audit: data.audit, auditedAt: data.auditedAt };
      guncelle(goalId, guncel);
      setSavedProgress((prev) => ({ ...prev, [goalId]: { ...(prev[goalId] ?? localProgress[goalId] ?? bosIlerleme()), ...guncel } }));
      toast.success(data.kalan > 0 ? `Denetlendi · bugün ${data.kalan} denetim hakkı kaldı` : "Denetlendi · bugünlük sınır doldu");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setAuditing(null);
    }
  }
```

Satır: `const noteOpen = openNotes.has(sub.id);` yanına:

```ts
                      const current = localProgress[sub.id] ?? bosIlerleme();
                      const objOpen = openObjectives.has(sub.id);
                      const hasObjective = current.objective.trim().length > 0;
                      const savedObjective = (savedProgress[sub.id]?.objective ?? "").trim();
                      const auditBayat = current.audit !== null && current.objective.trim() !== savedObjective;
```

"Not ekle" düğmesinin HEMEN ARDINA (aynı `div` içinde, `GoalStatusButtons`'tan önce) aynı stil kalıbıyla:

```tsx
                              <button
                                type="button"
                                onClick={() => toggleObjective(sub.id)}
                                title="Kısa dönem hedef"
                                aria-pressed={objOpen || hasObjective}
                                style={{
                                  padding: 4, borderRadius: 6, border: "none", background: "transparent",
                                  color: objOpen || hasObjective ? "var(--poster-accent)" : "var(--poster-ink-3)",
                                  cursor: "pointer", opacity: objOpen || hasObjective ? 1 : 0.55, transition: "color .12s, opacity .12s",
                                }}
                              >
                                <Target style={{ width: 14, height: 14 }} />
                              </button>
```

Not bloğunun (`{(noteOpen || hasNote) && (…)}`) ARDINA:

```tsx
                          {(objOpen || hasObjective) && (
                            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                              <PTextarea
                                value={current.objective}
                                onChange={(e) => setGoalObjective(sub.id, e.target.value)}
                                placeholder="Bu MEB hedefi için kısa dönem hedef: davranış + ölçüt + koşul + zaman + taban…"
                                rows={3}
                                maxLength={HEDEF_METNI_MAX}
                                aria-describedby={`kdh-sayac-${sub.id}`}
                                style={{ fontSize: 16 }}
                              />
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <PBtn type="button" variant="accent" size="sm" onClick={() => handleAudit(sub.id)} disabled={!hasObjective || auditing !== null}>
                                  {auditing === sub.id ? <><PSpinner size={12} /> Denetleniyor…</> : current.audit ? "Yeniden denetle" : "Denetle"}
                                </PBtn>
                                <span id={`kdh-sayac-${sub.id}`} style={{ fontSize: 11, color: "var(--poster-ink-3)" }}>
                                  {current.objective.length}/{HEDEF_METNI_MAX} · günde {HEDEF_DENETIM_GUNLUK} denetim, kredi düşmez
                                </span>
                                {auditBayat && (
                                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--poster-accent)" }}>Metin değişti; yeniden denetleyin</span>
                                )}
                              </div>
                              {current.audit && (
                                <div style={{ opacity: auditBayat ? 0.7 : 1, transition: "opacity .12s" }} role="region" aria-label="Denetim sonucu">
                                  <HedefDenetimSonucu sonuc={current.audit} mebVar={false} />
                                  {current.auditedAt && (
                                    <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--poster-ink-3)" }}>Son denetim {formatDate(current.auditedAt, "short")}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
```

`PSpinner`'ın `size` prop'u yoksa `<PSpinner />` yaz. Alt hedef satırı dar ekranda düğmeleri sığdıramazsa (`390 px`) mevcut `GoalStatusButtons` kalıbı neyse o; yeni düğme 22 px ekler.

- [ ] **Step 3: Yeşil:** `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/koyuTemaKontrast.test.ts && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint src/modules/studio/components/students/ProgressTab.tsx` → PASS, temiz.

- [ ] **Step 4: Commit** — `feat(studio): İlerleme sekmesinde kısa dönem hedef — metin, Denetle, denetim kartı, bayat rozeti`

---

### Task 7: Bütün doğrulama

- [ ] `cd apps/hub && node_modules/.bin/vitest run` (tümü) · `node_modules/.bin/vitest run --config vitest.eval.config.ts evals/lib evals/tools evals/runner.selftest.eval.ts` · `node_modules/.bin/tsc --noEmit` · `npm run -s typecheck:evals` · lint (değişen dosyalar) · `node_modules/.bin/next build` (arka plan; `/studio/api/students/[id]/progress/[goalId]/audit` çıktıda).
- [ ] Headless render (orkestratör): `ProgressTab` alt hedef satırı + kısa dönem hedef alanı + kart (açık/koyu, 480 px) — `renderToStaticMarkup` ile `fetch` çalışmaz; satırı çizmek için `HedefDenetimSonucu`'nu Studio sayfasındaki poster stilleriyle çizdirmek yeterli (1c-A kalıbı: scratchpad `render2.vitest.config.mjs`).
- [ ] Spec §15'e "1c-B" alt başlığı (sapmalar) + hafıza notu ("Faz 1c-B TAMAM; 0020+0021+0022 prod'a uygulanmadı; deploy sırası ZORUNLU").
- [ ] Dal durumu: merge/PR ve üç SQL'in prod'a uygulanması kullanıcı kararı. Canlı doğrulama önerisi: öğrenci → İlerleme → alt hedefte 🎯 → metin → Denetle → kart; Asistan/araç bağlamında "Sürmekte olan hedefler: …: …" satırı; metni değiştirip Kaydet → kart kaybolur.
