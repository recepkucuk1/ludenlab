# Studio Öğrenci Asistanı — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Studio öğrenci sayfasına "Asistan" sekmesi: uzman gözlem yazar, girdi günlüğe kaydolur, AI onaylanabilir öneriler (hedef durumu / profil maddesi / araç formu ön-doldurma) çıkarır.

**Architecture:** Yeni `StudentObservation` tablosu + bağlam katmanına "Son gözlemler" satırı; tek Sonnet çağrısı yapan `POST …/assistant` rotası, çıktı zod ile sunucuda doğrulanır; arayüz mevcut uçları (progress PUT, yeni ai-profile PATCH) çağırır ve `generate_tool` önerilerinde dört araç sayfasına base64url `prefill` parametresiyle gider. Ücretsiz planda 403 + kilit kartı; ücretli planlarda kredi düşmez.

**Tech Stack:** Next.js 16 App Router (`apps/hub`), Prisma 7 (raw SQL migration, `prisma generate`), zod, Anthropic SDK (`claude-sonnet-4-6`), vitest, poster bileşenleri (`@studio/components/poster`).

**Spec:** `docs/superpowers/specs/2026-10-18-studio-ogrenci-asistani-design.md`

**Spec'ten sapmalar (kod okuması sonrası, tasarımı değiştirmez):**
- `goal_status.status` yalnız `"in_progress" | "completed"`: mevcut `progressUpdatesSchema` bunları kabul ediyor (`consolidating`/`mastered` hedef-takibi sayfasının kendi yazımı, progress PUT'u almıyor).
- `profile_note` uygulaması için `PATCH /studio/api/students/[id]/ai-profile` eklenir (mevcut öğrenci PUT'u tam gövde ister, `aiProfile` almaz).
- Kilit bilgisi istemciye `GET …/observations` yanıtındaki `locked` alanıyla gelir (ayrı profil çağrısı gerekmez).
- Spec §10'daki rota düzeyi testler (FREE 403, 11. istek 429, retry insert yapmaz): depoda rota testi altyapısı yok (yalnız prompt sözleşme testleri); bu üç davranış Task 13 Step 3'te tarayıcıda elle doğrulanır, iş mantığı `run.test.ts` ile birim düzeyinde kilitlenir.
- Hesap silme cascade'i DB FK (`ON DELETE CASCADE`) ile sağlanır; `accountDeletion.ts` `therapist.deleteMany` kullandığı için kod değişikliği ve ayrı test gerekmez.

**Çalışma kuralları:**
- Tüm komutlar `apps/hub` içinden: `cd apps/hub`.
- Test: `pnpm vitest run <dosya>`; tam koşu `pnpm vitest run`.
- Tip: `pnpm typecheck`. Son adım `pnpm build` (deploy `next build`'tir, `tsc` yetmez).
- Türkçe yorum/isimlendirme mevcut dosyalarla aynı üslupta.
- Commit mesajı sonu: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`

---

## Dosya haritası

| Dosya | İş |
|---|---|
| `apps/hub/prisma/sql/0019_student_observation.sql` | Yeni tablo DDL (create) |
| `apps/hub/prisma/studio/schema.prisma` | `StudentObservation` modeli + `Student`/`Therapist` ilişkileri (modify) |
| `apps/hub/src/modules/studio/lib/plans.ts` | `isAssistantPlan()` (modify) + `plans.test.ts` |
| `apps/hub/src/modules/studio/lib/toolSchemas.ts` | Dört aracın zod gövde şemaları tek yerde (create); 4 rota buradan import eder |
| `apps/hub/src/modules/studio/lib/prefill.ts` | `encodePrefill`/`decodePrefill` (create) + test |
| `apps/hub/src/modules/studio/lib/studentContext.ts` | `recentObservations` alanı + sorgu (modify) + test |
| `apps/hub/src/modules/studio/lib/assistant/schema.ts` | `Suggestion` zod + `validateSuggestions()` (create) + test |
| `apps/hub/src/modules/studio/lib/assistant/prompt.ts` | Sistem/kullanıcı prompt'u (create) + test |
| `apps/hub/src/app/studio/api/students/[id]/observations/route.ts` | GET (create) |
| `apps/hub/src/app/studio/api/observations/[obsId]/route.ts` | PATCH + DELETE (create) |
| `apps/hub/src/app/studio/api/students/[id]/assistant/route.ts` | POST (create) |
| `apps/hub/src/app/studio/api/students/[id]/ai-profile/route.ts` | PATCH ekle (modify) |
| `apps/hub/src/modules/studio/components/students/AssistantTab.tsx` | Sekme bileşeni (create) |
| `apps/hub/src/app/studio/(main)/students/[id]/page.tsx` | Sekme kaydı (modify) |
| `apps/hub/src/app/studio/(main)/tools/{articulation,phonation,matching-game,homework}/page.tsx` | `prefill` okuma (modify) |

---

### Task 1: Veri — migration + Prisma modeli

**Files:**
- Create: `apps/hub/prisma/sql/0019_student_observation.sql`
- Modify: `apps/hub/prisma/studio/schema.prisma` (Student 166-189, Therapist 57-103 arası ilişki listeleri)

- [ ] **Step 1: SQL dosyasını yaz**

```sql
-- 0019_student_observation.sql
-- HEDEF DB: studio → public."StudentObservation" (Supabase kgbhvruzoaqwwwkhzdex)
--
-- ÖĞRENCİ ASİSTANI GÖZLEM GÜNLÜĞÜ (2026-10-18 tasarımı). Uzmanın seans sonrası yazdığı
-- serbest gözlem; öğrencinin kalıcı hafızası. Bağlam katmanı son 5 kaydı her araca taşır.
-- Sağlık verisi: Student.notes ile aynı sınıf; öğrenci/uzman silinince CASCADE.
--
-- Additive + idempotent; prisma migrate YOK — raw SQL (canlı proje).
-- DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod.
--
-- RLS: uygulama `postgres` rolüyle (rolbypassrls) bağlanır; politika yok = anon için deny-all
-- (0016 ile aynı gerekçe). GERİ ALMA: DROP TABLE public."StudentObservation";

CREATE TABLE IF NOT EXISTS public."StudentObservation" (
  "id"          TEXT PRIMARY KEY,
  "studentId"   TEXT NOT NULL,
  "therapistId" TEXT NOT NULL,
  "text"        TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentObservation_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StudentObservation_therapistId_fkey"
    FOREIGN KEY ("therapistId") REFERENCES public."Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudentObservation_studentId_createdAt_idx"
  ON public."StudentObservation" ("studentId", "createdAt");
CREATE INDEX IF NOT EXISTS "StudentObservation_therapistId_idx"
  ON public."StudentObservation" ("therapistId");

ALTER TABLE public."StudentObservation" ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Prisma şemasına modeli ekle**

`apps/hub/prisma/studio/schema.prisma` içinde `model Card {` satırının hemen üstüne:

```prisma
/// Öğrenci asistanı gözlem günlüğü (2026-10). Uzmanın serbest seans gözlemi; bağlam katmanı
/// son 5 kaydı her araca taşır. Sağlık verisi, `notes` ile aynı sınıf. DDL: sql/0019_*.sql.
model StudentObservation {
  id          String   @id @default(cuid())
  studentId   String
  therapistId String
  text        String   @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  student   Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  therapist Therapist @relation(fields: [therapistId], references: [id], onDelete: Cascade)

  @@index([studentId, createdAt])
  @@index([therapistId])
}
```

`model Student` ilişki listesine (`lessons       Lesson[]` satırından sonra):

```prisma
  observations  StudentObservation[]
```

`model Therapist` ilişki listesine (`apiUsageLogs        ApiUsageLog[]` satırından sonra):

```prisma
  observations        StudentObservation[]
```

- [ ] **Step 3: İstemciyi üret ve tip denetimi**

Run: `cd apps/hub && pnpm prisma generate --schema prisma/studio/schema.prisma && pnpm typecheck`
Expected: üretim çıktısı "Generated Prisma Client" + typecheck hatasız.

- [ ] **Step 4: Commit**

```bash
git add apps/hub/prisma/sql/0019_student_observation.sql apps/hub/prisma/studio/schema.prisma
git commit -m "feat(studio): StudentObservation tablosu + Prisma modeli (0019)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Plan kapısı yardımcısı

**Files:**
- Modify: `apps/hub/src/modules/studio/lib/plans.ts`
- Test: `apps/hub/src/modules/studio/lib/plans.test.ts` (mevcut dosyaya ekle)

- [ ] **Step 1: Başarısız testi yaz**

`plans.test.ts` sonuna:

```ts
describe("isAssistantPlan", () => {
  it("ücretsiz plan asistanı kullanamaz; ücretli planlar kullanır", async () => {
    const { isAssistantPlan } = await import("./plans");
    expect(isAssistantPlan("FREE")).toBe(false);
    expect(isAssistantPlan("PRO")).toBe(true);
    expect(isAssistantPlan("ADVANCED")).toBe(true);
    expect(isAssistantPlan("ENTERPRISE")).toBe(true);
  });
});
```

(Dosyanın başında `describe/expect/it` zaten vitest'ten import ediliyor; değilse ekle.)

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `cd apps/hub && pnpm vitest run src/modules/studio/lib/plans.test.ts`
Expected: FAIL — `isAssistantPlan is not a function`.

- [ ] **Step 3: Yardımcıyı yaz**

`plans.ts` sonuna:

```ts
/**
 * Öğrenci asistanı (gözlem → öneri) plan kapısı: ücretsiz planda KAPALI, ücretli planlarda
 * KREDİSİZ (2026-10 ürün kararı). `CREDIT_COSTS`'a bilerek girmez — bu ekran hak harcamaz.
 */
export function isAssistantPlan(planType: PlanType): boolean {
  return planType !== "FREE";
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `cd apps/hub && pnpm vitest run src/modules/studio/lib/plans.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/hub/src/modules/studio/lib/plans.ts apps/hub/src/modules/studio/lib/plans.test.ts
git commit -m "feat(studio): isAssistantPlan plan kapısı

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Araç şemalarını ortak modüle taşı

Dört rota kendi `bodySchema`'sını tanımlıyor. Asistan `generate_tool.params`'ı aynı şemayla doğrulayacak ve sayfalar `prefill`'i aynı şemayla süzecek; tek kaynak gerekir.

**Files:**
- Create: `apps/hub/src/modules/studio/lib/toolSchemas.ts`
- Modify: `apps/hub/src/app/studio/api/tools/articulation/route.ts:22-28`
- Modify: `apps/hub/src/app/studio/api/tools/phonation/route.ts:21-28`
- Modify: `apps/hub/src/app/studio/api/tools/matching-game/route.ts:17-23`
- Modify: `apps/hub/src/app/studio/api/tools/homework/route.ts:14-20`

- [ ] **Step 1: Ortak modülü yaz**

```ts
// apps/hub/src/modules/studio/lib/toolSchemas.ts
import { z } from "zod";

/**
 * Asistanın ön-doldurduğu dört aracın gövde şemaları — TEK KAYNAK. Rotalar buradan import eder;
 * asistan `generate_tool.params`'ı ve araç sayfaları `prefill`'i aynı şemayla doğrular.
 * Prompt'a giren her alan sınırlı (denetim #29): girdi boyutu = doğrudan LLM maliyeti.
 */
export const articulationBodySchema = z.object({
  studentId:    z.string().optional(),
  targetSounds: z.array(z.string().max(20)).min(1, "En az bir hedef ses seçin").max(20),
  positions:    z.array(z.enum(["initial", "medial", "final"])).min(1),
  level:        z.enum(["isolated", "syllable", "word", "sentence", "contextual"]),
  itemCount:    z.number().int().min(5).max(30),
});

export const phonationBodySchema = z.object({
  studentId:    z.string().optional(),
  targetSounds: z.array(z.string().max(20)).min(1, "En az bir hedef ses seçin").max(20),
  activityType: z.enum(["sound_hunt", "bingo", "snakes_ladders", "sound_maze"]),
  difficulty:   z.enum(["easy", "medium", "hard"]),
  itemCount:    z.number().int().min(8).max(25),
  theme:        z.string().max(100).optional(),
});

export const matchingGameBodySchema = z.object({
  studentId:  z.string().optional(),
  matchType:  z.enum(["definition", "image_desc", "synonym", "antonym", "category", "sentence"]),
  pairCount:  z.enum(["6", "8", "10", "12"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  theme:      z.string().max(100).optional(),
  goalTitle:  z.string().max(300).optional(),
});

export const homeworkBodySchema = z.object({
  studentId:    z.string().min(1),
  targetArea:   z.string().min(1).max(300),
  duration:     z.enum(["10", "15", "20"]),
  parentLevel:  z.enum(["basic", "detailed"]),
  materialType: z.enum(["exercise", "observation", "daily_activity"]),
  extraNote:    z.string().max(500).optional(),
});

/** Asistanın önerebildiği araçlar; anahtar = sayfa yolu parçası (`/studio/tools/<key>`). */
export const ASSISTANT_TOOLS = ["articulation", "phonation", "matching-game", "homework"] as const;
export type AssistantTool = (typeof ASSISTANT_TOOLS)[number];

/** `studentId` düşülmüş (asistan onu URL'de ayrıca taşır) parametre şemaları. */
export const ASSISTANT_TOOL_PARAM_SCHEMAS: Record<AssistantTool, z.ZodTypeAny> = {
  "articulation":  articulationBodySchema.omit({ studentId: true }),
  "phonation":     phonationBodySchema.omit({ studentId: true }),
  "matching-game": matchingGameBodySchema.omit({ studentId: true }),
  "homework":      homeworkBodySchema.omit({ studentId: true }),
};

export const ASSISTANT_TOOL_LABEL: Record<AssistantTool, string> = {
  "articulation":  "Artikülasyon Alıştırması",
  "phonation":     "Sesletim",
  "matching-game": "Kelime Eşleştirme",
  "homework":      "Ev Ödevi Materyali",
};
```

- [ ] **Step 2: Dört rotayı ortak şemaya bağla**

Her rotada yerel `const bodySchema = z.object({...});` bloğunu sil ve yerine import koy. Yerel `bodySchema` adı korunur ki rota gövdesi değişmesin:

articulation `route.ts`:
```ts
import { articulationBodySchema as bodySchema } from "@studio/lib/toolSchemas";
```
phonation `route.ts`:
```ts
import { phonationBodySchema as bodySchema } from "@studio/lib/toolSchemas";
```
matching-game `route.ts`:
```ts
import { matchingGameBodySchema as bodySchema } from "@studio/lib/toolSchemas";
```
homework `route.ts`:
```ts
import { homeworkBodySchema as bodySchema } from "@studio/lib/toolSchemas";
```

Eğer bir rotada `z` artık başka yerde kullanılmıyorsa `import { z } from "zod";` satırını kaldır (eslint `no-unused-vars`). Rota içindeki `type ArticulationBody = z.infer<typeof bodySchema>;` gibi tip türetmeleri `z.infer` kullandığı için `z` importu orada kalır.

- [ ] **Step 3: Tip + mevcut prompt testleri**

Run: `cd apps/hub && pnpm typecheck && pnpm vitest run src/app/studio/api/tools`
Expected: typecheck temiz; 8 prompt testi PASS (davranış değişmedi).

- [ ] **Step 4: Commit**

```bash
git add apps/hub/src/modules/studio/lib/toolSchemas.ts apps/hub/src/app/studio/api/tools/articulation/route.ts apps/hub/src/app/studio/api/tools/phonation/route.ts apps/hub/src/app/studio/api/tools/matching-game/route.ts apps/hub/src/app/studio/api/tools/homework/route.ts
git commit -m "refactor(studio): dört aracın gövde şeması toolSchemas.ts'te tek kaynak

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: `prefill` kodlayıcı/çözücü

**Files:**
- Create: `apps/hub/src/modules/studio/lib/prefill.ts`
- Test: `apps/hub/src/modules/studio/lib/prefill.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

```ts
// apps/hub/src/modules/studio/lib/prefill.test.ts
import { describe, expect, it } from "vitest";
import { PREFILL_MAX_BYTES, decodePrefill, encodePrefill } from "./prefill";

describe("prefill", () => {
  it("gidiş-dönüş: nesne base64url'e kodlanır ve aynen çözülür", () => {
    const girdi = { targetSounds: ["/r/", "/ş/"], level: "word", itemCount: 12, theme: "çiçekler ğüşıöç" };
    const kod = encodePrefill(girdi);
    expect(kod).toMatch(/^[A-Za-z0-9_-]+$/); // URL güvenli, '=' yok
    expect(decodePrefill(kod)).toEqual(girdi);
  });

  it("bozuk base64 / bozuk JSON / dizi / null → null", () => {
    expect(decodePrefill("%%%")).toBeNull();
    expect(decodePrefill(Buffer.from("{bozuk").toString("base64url"))).toBeNull();
    expect(decodePrefill(Buffer.from("[1,2]").toString("base64url"))).toBeNull();
    expect(decodePrefill(Buffer.from("null").toString("base64url"))).toBeNull();
    expect(decodePrefill(null)).toBeNull();
    expect(decodePrefill("")).toBeNull();
  });

  it("2 KB üstü reddedilir", () => {
    const buyuk = encodePrefill({ theme: "a".repeat(PREFILL_MAX_BYTES) });
    expect(decodePrefill(buyuk)).toBeNull();
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `cd apps/hub && pnpm vitest run src/modules/studio/lib/prefill.test.ts`
Expected: FAIL — modül bulunamadı.

- [ ] **Step 3: Modülü yaz**

```ts
// apps/hub/src/modules/studio/lib/prefill.ts
/**
 * Asistan → araç formu ön-doldurma taşıyıcısı. Araç sayfası `?prefill=<base64url(JSON)>` okur,
 * çözer, kendi zod şemasıyla süzer (bkz. toolSchemas.ts). Çözücü HİÇ fırlatmaz: bozuk/aşırı
 * girdi `null` döner ve sayfa boş formla açılır. Hem tarayıcıda hem Node'da çalışır
 * (TextEncoder/atob/btoa — Buffer yok).
 */
export const PREFILL_MAX_BYTES = 2048;

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) return null;
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  try {
    const bin = atob(b64);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export function encodePrefill(obj: Record<string, unknown>): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
}

export function decodePrefill(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  const bytes = fromBase64Url(raw);
  if (!bytes || bytes.byteLength === 0 || bytes.byteLength > PREFILL_MAX_BYTES) return null;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `cd apps/hub && pnpm vitest run src/modules/studio/lib/prefill.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add apps/hub/src/modules/studio/lib/prefill.ts apps/hub/src/modules/studio/lib/prefill.test.ts
git commit -m "feat(studio): prefill base64url kodlayıcı/çözücü

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Bağlam katmanına "Son gözlemler"

**Files:**
- Modify: `apps/hub/src/modules/studio/lib/studentContext.ts`
- Test: `apps/hub/src/modules/studio/lib/studentContext.test.ts`

- [ ] **Step 1: Başarısız testleri yaz**

`studentContext.test.ts`'te `temel` nesnesine alan ekle:

```ts
  recentObservations: [],
```

`describe("renderStudentBlock"` bloğunun sonuna yeni testler:

```ts
  it("son gözlemler: uzman notlarından sonra, profilden önce; tarihli satırlar; yeni → eski", () => {
    const t = renderStudentBlock({
      ...temel,
      notes: "Trenleri sever",
      aiProfile: "## Uzmana Öneriler\n\n### Öncelikli Çalışma Alanları\n- İki kelime",
      recentObservations: [
        { text: "/r/ kelime başında %60", createdAt: new Date(2026, 9, 14) },
        { text: "Oyunla daha iyi", createdAt: new Date(2026, 9, 16) },
      ],
    });
    expect(t).toContain("Son gözlemler:\n- 16.10: Oyunla daha iyi\n- 14.10: /r/ kelime başında %60");
    expect(t.indexOf("Uzman notları:")).toBeLessThan(t.indexOf("Son gözlemler:"));
    expect(t.indexOf("Son gözlemler:")).toBeLessThan(t.indexOf("Öncelikli çalışma alanları:"));
  });

  it("son gözlemler 400 karakterde kalır: sığmayan EN ESKİ satırlar düşer", () => {
    const gozlemler = Array.from({ length: 5 }, (_, i) => ({ text: `${i}`.repeat(150), createdAt: new Date(2026, 9, 10 + i) }));
    const t = renderStudentBlock({ ...temel, recentObservations: gozlemler });
    const blok = t.slice(t.indexOf("Son gözlemler:"));
    expect(blok.length).toBeLessThanOrEqual("Son gözlemler:".length + 400 + 1);
    expect(blok).toContain("- 14.10: 4444");
    expect(blok).not.toContain("- 10.10:");
  });

  it("gözlem metni rumuzlanır", () => {
    const t = renderStudentBlock({ ...temel, recentObservations: [{ text: "Ela Şahin bugün çok iyiydi", createdAt: new Date(2026, 9, 14) }] }, map);
    expect(t).toContain("- 14.10: Nisa bugün çok iyiydi");
    expect(t).not.toMatch(/Ela/);
  });

  it("gözlem yoksa başlık da yok", () => {
    expect(renderStudentBlock(temel)).not.toContain("Son gözlemler");
  });
```

`describe("loadStudentContext"` içindeki `prisma` taklidine ekle:

```ts
    studentObservation: { findMany: vi.fn() },
```

ve `beforeEach`'e:

```ts
    prisma.studentObservation.findMany.mockResolvedValue([
      { text: "Ela /r/ sesinde ilerledi", createdAt: new Date(2026, 9, 11) },
    ]);
```

Aynı describe'a yeni test:

```ts
  it("gözlemler uzmanla kapsamlı, son 5, yeni → eski çekilir ve bloğa rumuzlu girer", async () => {
    const blok = await loadStudentContext(prisma as never, istek);
    expect(prisma.studentObservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId: "s1", therapistId: "t1" }, orderBy: { createdAt: "desc" }, take: 5 }),
    );
    expect(blok).toContain("Son gözlemler:\n- 11.10: Nisa /r/ sesinde ilerledi");
  });

  it("gözlem sorgusu patlarsa yalnız o alan düşer", async () => {
    prisma.studentObservation.findMany.mockRejectedValue(new Error("db"));
    const blok = await loadStudentContext(prisma as never, istek);
    expect(blok).toContain("Öğrenci: Nisa");
    expect(blok).not.toContain("Son gözlemler");
  });
```

Mevcut "sorguları uzmanla kapsamlar" testi `Ela` içermediğini kontrol ediyor; gözlem satırı rumuzlu olduğu için geçmeye devam eder.

- [ ] **Step 2: Testleri çalıştır, başarısız olduğunu gör**

Run: `cd apps/hub && pnpm vitest run src/modules/studio/lib/studentContext.test.ts`
Expected: FAIL — tip hatası / "Son gözlemler" yok.

- [ ] **Step 3: Uygula**

`studentContext.ts` değişiklikleri:

`BUTCE` sabitine `gozlem: 400, gozlemSayisi: 5` ekle:

```ts
const BUTCE = { not: 400, gozlem: 400, gozlemSayisi: 5, profil: 1100, profilTeknik: 300, kartBaslik: 80, ozet: 400, hedefMadde: 10, kartSayisi: 5 } as const;
```

`StudentContextInput`'a (`notes` satırının altına):

```ts
  /** Asistan gözlem günlüğünün son kayıtları (yeni → eski); boşsa satır yazılmaz. */
  recentObservations: { text: string; createdAt: Date }[];
```

`renderStudentBlock` içinde, `if (ctx.notes?.trim()) adaylar.push(...)` satırının HEMEN ALTINA:

```ts
  if (ctx.recentObservations.length) {
    // Yeni → eski; bütçe dolunca EN ESKİ satırlar düşer (en taze klinik sinyal korunur).
    const sirali = [...ctx.recentObservations].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, BUTCE.gozlemSayisi);
    const satirlar: string[] = [];
    let kalan = BUTCE.gozlem;
    for (const g of sirali) {
      const satir = `- ${formatDate(g.createdAt, "short")}: ${tekSatir(s(g.text))}`;
      if (satir.length + 1 > kalan) break;
      satirlar.push(satir);
      kalan -= satir.length + 1;
    }
    if (satirlar.length) adaylar.push(["Son gözlemler:", ...satirlar]);
  }
```

`formatDate(d, "short")` çıktısının `GG.AA` olduğunu `@studio/lib/utils` içinde doğrula; değilse testteki beklentiyi o biçime uyarla (kart satırları aynı biçimi kullanıyor).

`StudentContextPrisma` tipine:

```ts
  studentObservation: { findMany(args: unknown): Promise<unknown> };
```

`type ObservationRow = { text: string; createdAt: Date };` ekle.

`loadStudentContext` içindeki `Promise.allSettled([...])` dizisine beşinci sorgu:

```ts
      prisma.studentObservation.findMany({
        where: { studentId: args.studentId, therapistId: args.therapistId },
        orderBy: { createdAt: "desc" },
        take: BUTCE.gozlemSayisi,
        select: { text: true, createdAt: true },
      }),
```

Destructuring'i `const [ogrenciS, kartS, ozetS, ilerlemeS, gozlemS] = ...` yap ve:

```ts
    const recentObservations = yedek<ObservationRow[]>(gozlemS, "gözlemler", []);
```

`renderStudentBlock(...)` çağrısına `recentObservations,` ekle.

- [ ] **Step 4: Testleri çalıştır**

Run: `cd apps/hub && pnpm vitest run src/modules/studio/lib/studentContext.test.ts src/modules/studio/lib/generateProfile.prompt.test.ts src/modules/studio/lib/toolHandler.test.ts`
Expected: PASS. `toolHandler.test.ts` veya başka bir test `StudentContextInput` nesnesi kuruyorsa `recentObservations: []` ekle.

- [ ] **Step 5: Tip denetimi ve commit**

Run: `cd apps/hub && pnpm typecheck`

```bash
git add apps/hub/src/modules/studio/lib/studentContext.ts apps/hub/src/modules/studio/lib/studentContext.test.ts
git commit -m "feat(studio): bağlam bloğuna 'Son gözlemler' alanı (son 5, 400 karakter)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Öneri şeması ve doğrulayıcı

**Files:**
- Create: `apps/hub/src/modules/studio/lib/assistant/schema.ts`
- Test: `apps/hub/src/modules/studio/lib/assistant/schema.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

```ts
// apps/hub/src/modules/studio/lib/assistant/schema.test.ts
import { describe, expect, it } from "vitest";
import { MAX_SUGGESTIONS, validateSuggestions, type GoalRow } from "./schema";

const hedefler: GoalRow[] = [
  { id: "g1", code: "3.1", title: "Kelime başı /r/", status: "in_progress" },
  { id: "g2", code: "3.2", title: "Kelime sonu /r/", status: "not_started" },
];

describe("validateSuggestions", () => {
  it("üç geçerli tür geçer, alanlar korunur", () => {
    const out = validateSuggestions(
      {
        suggestions: [
          { kind: "goal_status", goalId: "g1", status: "completed", reason: "Beş seansta %90" },
          { kind: "profile_note", section: "Dikkat Edilmesi Gereken Noktalar", text: "Yorulunca sesi düşüyor", reason: "Gözlem" },
          { kind: "generate_tool", tool: "articulation", params: { targetSounds: ["/r/"], positions: ["initial"], level: "word", itemCount: 12 }, reason: "Kelime başı pekiştirme" },
        ],
      },
      { goals: hedefler, hasProfile: true },
    );
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ kind: "goal_status", goalId: "g1", status: "completed" });
    expect(out[2]).toMatchObject({ kind: "generate_tool", tool: "articulation" });
  });

  it("bilinmeyen goalId, aynı durum, bilinmeyen tür ve geçersiz status elenir", () => {
    const out = validateSuggestions(
      {
        suggestions: [
          { kind: "goal_status", goalId: "yok", status: "completed", reason: "x" },
          { kind: "goal_status", goalId: "g1", status: "in_progress", reason: "aynı" },
          { kind: "goal_status", goalId: "g2", status: "mastered", reason: "şema dışı" },
          { kind: "unknown", reason: "x" },
        ],
      },
      { goals: hedefler, hasProfile: true },
    );
    expect(out).toEqual([]);
  });

  it("eksik zorunlu araç parametresi elenir (partial DEĞİL)", () => {
    const out = validateSuggestions(
      { suggestions: [{ kind: "generate_tool", tool: "articulation", params: { targetSounds: ["/r/"] }, reason: "x" }] },
      { goals: hedefler, hasProfile: true },
    );
    expect(out).toEqual([]);
  });

  it("profil yoksa profile_note elenir", () => {
    const out = validateSuggestions(
      { suggestions: [{ kind: "profile_note", section: "Öncelikli Çalışma Alanları", text: "x", reason: "y" }] },
      { goals: hedefler, hasProfile: false },
    );
    expect(out).toEqual([]);
  });

  it("en fazla 4 öneri; aynı hedef / aynı araç tekrarları elenir", () => {
    const cok = Array.from({ length: 6 }, (_, i) => ({ kind: "profile_note", section: "Öncelikli Çalışma Alanları", text: `madde ${i}`, reason: "r" }));
    expect(validateSuggestions({ suggestions: cok }, { goals: hedefler, hasProfile: true })).toHaveLength(MAX_SUGGESTIONS);
    const tekrar = validateSuggestions(
      {
        suggestions: [
          { kind: "goal_status", goalId: "g2", status: "in_progress", reason: "a" },
          { kind: "goal_status", goalId: "g2", status: "completed", reason: "b" },
          { kind: "generate_tool", tool: "homework", params: { targetArea: "Artikülasyon", duration: "15", parentLevel: "basic", materialType: "exercise" }, reason: "c" },
          { kind: "generate_tool", tool: "homework", params: { targetArea: "Dil", duration: "10", parentLevel: "basic", materialType: "exercise" }, reason: "d" },
        ],
      },
      { goals: hedefler, hasProfile: true },
    );
    expect(tekrar).toHaveLength(2);
  });

  it("metin tavanları: text ≤ 300, reason ≤ 200 aşan öneri elenir; suggestions yoksa boş", () => {
    expect(
      validateSuggestions({ suggestions: [{ kind: "profile_note", section: "Öncelikli Çalışma Alanları", text: "a".repeat(301), reason: "r" }] }, { goals: hedefler, hasProfile: true }),
    ).toEqual([]);
    expect(validateSuggestions({}, { goals: hedefler, hasProfile: true })).toEqual([]);
    expect(validateSuggestions(null, { goals: hedefler, hasProfile: true })).toEqual([]);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `cd apps/hub && pnpm vitest run src/modules/studio/lib/assistant/schema.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: Şemayı yaz**

```ts
// apps/hub/src/modules/studio/lib/assistant/schema.ts
import { z } from "zod";
import { PROFIL_BOLUMLERI } from "@studio/lib/studentContext";
import { ASSISTANT_TOOLS, ASSISTANT_TOOL_PARAM_SCHEMAS, type AssistantTool } from "@studio/lib/toolSchemas";

/**
 * Asistan öneri sözleşmesi. Model JSON döner; burada zod + iş kuralıyla süzülür. Geçersiz öneri
 * SESSİZCE elenir (uzmana yarım kart gösterilmez). Durumlar progress PUT'unun kabul ettiği
 * `progressStatusSchema` alt kümesidir: `not_started`'a geri alma önerilmez.
 */
export const MAX_SUGGESTIONS = 4;
const REASON_MAX = 200;
const NOTE_MAX = 300;

export const goalStatusSuggestion = z.object({
  kind: z.literal("goal_status"),
  goalId: z.string().min(1),
  status: z.enum(["in_progress", "completed"]),
  reason: z.string().min(1).max(REASON_MAX),
});

export const profileNoteSuggestion = z.object({
  kind: z.literal("profile_note"),
  section: z.enum(PROFIL_BOLUMLERI),
  text: z.string().min(1).max(NOTE_MAX),
  reason: z.string().min(1).max(REASON_MAX),
});

export const generateToolSuggestion = z.object({
  kind: z.literal("generate_tool"),
  tool: z.enum(ASSISTANT_TOOLS),
  params: z.record(z.string(), z.unknown()),
  reason: z.string().min(1).max(REASON_MAX),
});

export const suggestionSchema = z.discriminatedUnion("kind", [goalStatusSuggestion, profileNoteSuggestion, generateToolSuggestion]);
export type Suggestion = z.infer<typeof suggestionSchema>;

export interface GoalRow {
  id: string;
  code: string;
  title: string;
  /** progress satırı yoksa "not_started". */
  status: string;
}

export interface ValidationContext {
  goals: GoalRow[];
  hasProfile: boolean;
}

/** Ham model çıktısından ({ suggestions: [...] }) geçerli, tekrarsız, en çok 4 öneri. */
export function validateSuggestions(raw: unknown, ctx: ValidationContext): Suggestion[] {
  const liste = raw && typeof raw === "object" && Array.isArray((raw as { suggestions?: unknown }).suggestions)
    ? ((raw as { suggestions: unknown[] }).suggestions)
    : [];
  const hedef = new Map(ctx.goals.map((g) => [g.id, g]));
  const gorulen = new Set<string>();
  const out: Suggestion[] = [];

  for (const aday of liste) {
    if (out.length >= MAX_SUGGESTIONS) break;
    const p = suggestionSchema.safeParse(aday);
    if (!p.success) continue;
    const s = p.data;

    let anahtar: string;
    if (s.kind === "goal_status") {
      const g = hedef.get(s.goalId);
      if (!g || g.status === s.status) continue;
      anahtar = `goal:${s.goalId}`;
    } else if (s.kind === "profile_note") {
      if (!ctx.hasProfile) continue;
      anahtar = `profile:${s.section}:${s.text}`;
    } else {
      const sema = ASSISTANT_TOOL_PARAM_SCHEMAS[s.tool as AssistantTool];
      const q = sema.safeParse(s.params);
      if (!q.success) continue;
      s.params = q.data as Record<string, unknown>;
      anahtar = `tool:${s.tool}`;
    }
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    out.push(s);
  }
  return out;
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `cd apps/hub && pnpm vitest run src/modules/studio/lib/assistant/schema.test.ts`
Expected: PASS (6 test). `studentContext` importu `@studio/lib/db`'yi çekerse testte `vi.mock("@studio/lib/db", () => ({ prisma: {} }))` ekle (studentContext.test.ts deseni).

- [ ] **Step 5: Commit**

```bash
git add apps/hub/src/modules/studio/lib/assistant/
git commit -m "feat(studio): asistan öneri şeması + sunucu doğrulayıcı

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Asistan prompt'u

**Files:**
- Create: `apps/hub/src/modules/studio/lib/assistant/prompt.ts`
- Test: `apps/hub/src/modules/studio/lib/assistant/prompt.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

```ts
// apps/hub/src/modules/studio/lib/assistant/prompt.test.ts
import { describe, expect, it, vi } from "vitest";
import { promptPenceresi, PROMPT_PENCERESI_GENIS } from "@studio/lib/prompts/iskelet";

vi.mock("@studio/lib/db", () => ({ prisma: {} }));

const { ASSISTANT_SYSTEM_PROMPT, buildAssistantUserPrompt } = await import("./prompt");

describe("asistan sistem prompt'u", () => {
  it("geniş pencerede, A1 sırasında, üç öneri türünü ve JSON şemasını içerir", () => {
    expect(promptPenceresi(ASSISTANT_SYSTEM_PROMPT, PROMPT_PENCERESI_GENIS).uygun).toBe(true);
    for (const b of ["ROL", "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK KURALLARI", "BİÇİM", "ÖZ-DENETİM"]) expect(ASSISTANT_SYSTEM_PROMPT).toContain(b);
    expect(ASSISTANT_SYSTEM_PROMPT).toContain('"goal_status"');
    expect(ASSISTANT_SYSTEM_PROMPT).toContain('"profile_note"');
    expect(ASSISTANT_SYSTEM_PROMPT).toContain('"generate_tool"');
    expect(ASSISTANT_SYSTEM_PROMPT).toContain("en fazla 4");
  });
});

describe("buildAssistantUserPrompt", () => {
  const temel = {
    studentBlock: "Öğrenci: Nisa, 6 yaş\nÇalışma alanı: Konuşma",
    observation: "Kelime başı /r/ %60, oyunla daha iyi",
    goals: [{ id: "g1", code: "3.1", title: "Kelime başı /r/", status: "in_progress" }],
    hasProfile: true,
  };

  it("sıra: öğrenci bloğu → yeni gözlem → hedef listesi (id|kod|başlık|durum) → araç kataloğu", () => {
    const p = buildAssistantUserPrompt(temel);
    expect(p.indexOf("ÖĞRENCİ")).toBeLessThan(p.indexOf("YENİ GÖZLEM"));
    expect(p.indexOf("YENİ GÖZLEM")).toBeLessThan(p.indexOf("HEDEFLER"));
    expect(p.indexOf("HEDEFLER")).toBeLessThan(p.indexOf("ARAÇLAR"));
    expect(p).toContain("g1 | 3.1 | Kelime başı /r/ | in_progress");
    expect(p).toContain("Kelime başı /r/ %60, oyunla daha iyi");
    expect(p).toContain("articulation:");
    expect(p).toContain("homework:");
  });

  it("hedef listesi boşsa 'hedef listesi boş' yazılır; profil yoksa profile_note yasaklanır", () => {
    const p = buildAssistantUserPrompt({ ...temel, goals: [], hasProfile: false });
    expect(p).toContain("hedef listesi boş");
    expect(p).toContain("profile_note ÖNERME");
  });

  it("hedef listesi 60 satırla sınırlı", () => {
    const goals = Array.from({ length: 80 }, (_, i) => ({ id: `g${i}`, code: `${i}`, title: `H${i}`, status: "not_started" }));
    const p = buildAssistantUserPrompt({ ...temel, goals });
    expect(p).toContain("g59 |");
    expect(p).not.toContain("g60 |");
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `cd apps/hub && pnpm vitest run src/modules/studio/lib/assistant/prompt.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: Prompt'u yaz**

```ts
// apps/hub/src/modules/studio/lib/assistant/prompt.ts
import { studioSistemPromptu } from "@studio/lib/prompts/iskelet";
import { PROFIL_BOLUMLERI } from "@studio/lib/studentContext";
import type { GoalRow } from "./schema";

/* Öğrenci asistanı — gözlemden öneri (2026-10 tasarımı §6).
   Sistem prompt'u sabittir (önbellek), A1 iskeletiyle kurulur. Kullanıcı prompt'u: öğrenci bloğu
   (rumuzlu, "Son gözlemler" dahil) → yeni gözlem → hedef listesi → araç kataloğu. Çıktı katı JSON;
   sunucu `validateSuggestions` ile süzer (bilinmeyen goalId, eksik araç parametresi, 4'ten fazla).
   Araç kataloğu ELLE yazılır (4 araç, stabil); şema değişirse burası da güncellenir. */

export const MAX_GOAL_LINES = 60;

export const ASSISTANT_SYSTEM_PROMPT = studioSistemPromptu({
  rol: `Sen LudenLab Studio'nun öğrenci asistanısın. Uzmanın seans sonrası yazdığı bir gözlemi okur, bu öğrenci için en fazla 4 somut öneri çıkarırsın. Önerileri uzman onaylar; sen hiçbir kaydı değiştirmezsin. Emin değilsen öneri yazma: boş liste geçerli bir yanıttır. Kayıt: klinik, yalın Türkçe; "öğrenci/uzman" sözcükleri.`,
  klinikCerceve: [
    `Üç öneri türü vardır. "goal_status": HEDEFLER listesindeki bir hedefin durumunu "in_progress" ya da "completed" yapmak; yalnız gözlem o hedefe açıkça değiniyorsa ve yeni durum mevcut durumdan farklıysa. "profile_note": profilin üç bölümünden birine (${PROFIL_BOLUMLERI.join(" / ")}) tek cümlelik madde eklemek; yalnız gözlem profilde olmayan kalıcı bir bilgi taşıyorsa (tek seferlik durum profil maddesi değildir). "generate_tool": ARAÇLAR kataloğundaki bir araçla materyal üretmeyi önermek; parametreler gözlemden ve öğrenci bloğundan türetilir, kataloğun şemasına BİREBİR uyar.`,
    `"completed" yalnız gözlemde ölçüt düzeyinde kanıt varsa (oran, sayı, "artık bağımsız"). Tek bir iyi seans tamamlama değildir; "in_progress" öner.`,
    `Araç parametresi uydurma: hedef ses gözlemde geçmiyorsa artikülasyon/sesletim önerme. Düzey (level) gözlemdeki mevcut başarıya göre: %80 üstü → bir üst düzey, altı → aynı düzey.`,
  ],
  ozgulluk: [
    `Her önerinin "reason" alanı gözlemdeki ifadeye ya da bloktaki satıra atıf yapar; atıfsız öneri yazılmaz.`,
    `Aynı hedef için tek öneri, aynı araç için tek öneri.`,
    `Öğrenci bloğundaki "Son gözlemler" eski kayıtlardır; yeni öneri YENİ GÖZLEM'den türer, eski kayıtlar yalnız örüntü için kullanılır.`,
  ],
  karsitOrnek: {
    zayif: `{"kind":"profile_note","section":"Öncelikli Çalışma Alanları","text":"Artikülasyon çalışılmalı","reason":"gözlem"}`,
    iyi: `{"kind":"generate_tool","tool":"articulation","params":{"targetSounds":["/r/"],"positions":["initial"],"level":"word","itemCount":12},"reason":"Gözlem: kelime başı /r/ %60; kelime düzeyinde pekiştirme"}`,
  },
  bicim: {
    giris: `SADECE aşağıdaki JSON'u yaz; önsöz, kod çiti, açıklama yok. "suggestions" en fazla 4 öğe; uygun öneri yoksa boş dizi.`,
    sema: `{"suggestions":[
  {"kind":"goal_status","goalId":"<HEDEFLER'deki id>","status":"in_progress|completed","reason":"<≤200 karakter>"},
  {"kind":"profile_note","section":"<üç bölümden biri, aynen>","text":"<≤300 karakter, tek cümle>","reason":"<≤200 karakter>"},
  {"kind":"generate_tool","tool":"articulation|phonation|matching-game|homework","params":{<kataloğun şeması>},"reason":"<≤200 karakter>"}
]}`,
    butce: [
      `reason: en fazla 200 karakter, gözleme atıflı tek cümle.`,
      `profile_note.text: en fazla 300 karakter, tek cümle, uzman kaydı dilinde.`,
      `Toplam en fazla 4 öneri.`,
    ],
  },
  ozDenetim: [
    `Her goalId HEDEFLER listesinde var mı ve durum mevcut durumdan farklı mı?`,
    `Her araç parametresi katalog şemasına birebir uyuyor mu (enum değerleri, sayı aralıkları)?`,
    `Her reason gözleme ya da bloğa atıf yapıyor mu?`,
    `Tek seferlik bir durumu profil maddesi yaptın mı? Yaptıysan çıkar.`,
    `Çıktı yalnız JSON mu?`,
  ],
});

const ARAC_KATALOGU = `articulation: {"targetSounds":["/r/",…] (1–20, "/x/" biçimi), "positions":["initial"|"medial"|"final"] (≥1), "level":"isolated"|"syllable"|"word"|"sentence"|"contextual", "itemCount":5–30}
phonation: {"targetSounds":["/s/",…] (1–20), "activityType":"sound_hunt"|"bingo"|"snakes_ladders"|"sound_maze", "difficulty":"easy"|"medium"|"hard", "itemCount":8–25, "theme"?:"≤100 karakter"}
matching-game: {"matchType":"definition"|"image_desc"|"synonym"|"antonym"|"category"|"sentence", "pairCount":"6"|"8"|"10"|"12", "difficulty":"easy"|"medium"|"hard", "theme"?:"≤100", "goalTitle"?:"≤300"}
homework: {"targetArea":"≤300 karakter (ör. Artikülasyon / Ses çalışması)", "duration":"10"|"15"|"20", "parentLevel":"basic"|"detailed", "materialType":"exercise"|"observation"|"daily_activity", "extraNote"?:"≤500"}`;

export interface AssistantPromptInput {
  /** Rumuzlu öğrenci bloğu (studentContext). */
  studentBlock: string;
  /** Rumuzlanmış yeni gözlem metni. */
  observation: string;
  goals: GoalRow[];
  hasProfile: boolean;
}

export function buildAssistantUserPrompt(p: AssistantPromptInput): string {
  const bolumler: string[] = [];
  if (p.studentBlock.trim()) bolumler.push(`ÖĞRENCİ\n${p.studentBlock.trim()}`);
  bolumler.push(`YENİ GÖZLEM\n${p.observation.trim()}`);
  const hedefler = p.goals.slice(0, MAX_GOAL_LINES).map((g) => `${g.id} | ${g.code} | ${g.title} | ${g.status}`);
  bolumler.push(`HEDEFLER (id | kod | başlık | durum)\n${hedefler.length ? hedefler.join("\n") : "hedef listesi boş — goal_status ÖNERME"}`);
  bolumler.push(`ARAÇLAR (tool: params şeması)\n${ARAC_KATALOGU}`);
  bolumler.push(p.hasProfile ? `Profil mevcut; profile_note üç bölümden birine eklenir.` : `Profil yok; profile_note ÖNERME.`);
  return bolumler.join("\n\n");
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `cd apps/hub && pnpm vitest run src/modules/studio/lib/assistant/prompt.test.ts`
Expected: PASS. Karşıt örnek 120 kelimeyi aşarsa `studioSistemPromptu` kurulumda fırlatır; o durumda `iyi` örneğini kısalt. Pencere üstünden taşarsa (`uygun: false`) klinik çerçeve maddelerini kısalt.

- [ ] **Step 5: Commit**

```bash
git add apps/hub/src/modules/studio/lib/assistant/prompt.ts apps/hub/src/modules/studio/lib/assistant/prompt.test.ts
git commit -m "feat(studio): asistan sistem/kullanıcı prompt'u

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Gözlem CRUD rotaları

**Files:**
- Create: `apps/hub/src/app/studio/api/students/[id]/observations/route.ts`
- Create: `apps/hub/src/app/studio/api/observations/[obsId]/route.ts`
- Modify: `apps/hub/src/modules/studio/lib/validation.ts` (şema ekle)

- [ ] **Step 1: Gövde şemasını ekle**

`validation.ts`, `progressUpdatesSchema` satırının altına:

```ts
/** Asistan gözlem metni (StudentObservation.text) — 1–1000 karakter, HTML'siz. */
export const observationBodySchema = z.object({
  text: z.string().trim().min(1, "Gözlem boş olamaz").max(1000, "En fazla 1000 karakter"),
});
```

- [ ] **Step 2: GET rotası**

```ts
// apps/hub/src/app/studio/api/students/[id]/observations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@studio/lib/db";
import { requireAuth, requireStudentOwnership } from "@studio/lib/auth-helpers";
import { isAssistantPlan } from "@studio/lib/plans";
import { logError } from "@studio/lib/utils";

/** Gözlem günlüğü (son 50, yeni → eski) + plan kilidi. Okuma plan kapısına TABİ DEĞİL (uzman verisi). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  try {
    const { id } = await params;
    const ownership = await requireStudentOwnership(id, session.user.id);
    if (ownership instanceof NextResponse) return ownership;

    const [observations, therapist] = await Promise.all([
      prisma.studentObservation.findMany({
        where: { studentId: id, therapistId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, text: true, createdAt: true, updatedAt: true },
      }),
      prisma.therapist.findUnique({ where: { id: session.user.id }, select: { planType: true } }),
    ]);
    const locked = !therapist || !isAssistantPlan(therapist.planType);
    return NextResponse.json({ observations, locked });
  } catch (error) {
    logError("GET /studio/api/students/[id]/observations", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
```

- [ ] **Step 3: PATCH/DELETE rotası**

```ts
// apps/hub/src/app/studio/api/observations/[obsId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@studio/lib/db";
import { requireAuth } from "@studio/lib/auth-helpers";
import { readJsonBody } from "@/lib/bodyLimit";
import { observationBodySchema, stripHtmlTags, zodError } from "@studio/lib/validation";
import { logError } from "@studio/lib/utils";

/** Gözlem düzenleme/silme — sahiplik `therapistId` ile; plan kapısına tabi DEĞİL (KVKK: uzman verisine erişir). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ obsId: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  try {
    const { obsId } = await params;
    const body = await readJsonBody(request);
    if (body instanceof NextResponse) return body;
    const parsed = observationBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: zodError(parsed.error) }, { status: 400 });

    const r = await prisma.studentObservation.updateMany({
      where: { id: obsId, therapistId: session.user.id },
      data: { text: stripHtmlTags(parsed.data.text) },
    });
    if (r.count === 0) return NextResponse.json({ error: "Gözlem bulunamadı" }, { status: 404 });
    const observation = await prisma.studentObservation.findUnique({ where: { id: obsId }, select: { id: true, text: true, createdAt: true, updatedAt: true } });
    return NextResponse.json({ observation });
  } catch (error) {
    logError("PATCH /studio/api/observations/[obsId]", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ obsId: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  try {
    const { obsId } = await params;
    const r = await prisma.studentObservation.deleteMany({ where: { id: obsId, therapistId: session.user.id } });
    if (r.count === 0) return NextResponse.json({ error: "Gözlem bulunamadı" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("DELETE /studio/api/observations/[obsId]", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
```

`readJsonBody`'nin imzasını `apps/hub/src/lib/bodyLimit.ts`'te doğrula (toolHandler.ts kullanıyor); `NextResponse` döndürmüyorsa (örn. `null` dönüyorsa) kontrolü ona göre uyarla.

- [ ] **Step 4: Tip denetimi ve commit**

Run: `cd apps/hub && pnpm typecheck`
Expected: temiz.

```bash
git add apps/hub/src/app/studio/api/students/[id]/observations/route.ts apps/hub/src/app/studio/api/observations/[obsId]/route.ts apps/hub/src/modules/studio/lib/validation.ts
git commit -m "feat(studio): gözlem günlüğü GET/PATCH/DELETE rotaları

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: `ai-profile` PATCH (profil maddesi ekleme)

**Files:**
- Modify: `apps/hub/src/app/studio/api/students/[id]/ai-profile/route.ts`
- Modify: `apps/hub/src/modules/studio/lib/validation.ts`

- [ ] **Step 1: Şema**

`validation.ts`'e:

```ts
/** Profil metninin tamamı (asistan 'profile_note' uygulaması istemcide birleştirir, sunucu yalnız tavan koyar). */
export const aiProfileBodySchema = z.object({
  aiProfile: z.string().min(1).max(20_000),
});
```

- [ ] **Step 2: PATCH ekle**

`ai-profile/route.ts` import satırlarına `readJsonBody`, `aiProfileBodySchema`, `stripHtmlTags`, `zodError` ekle ve dosya sonuna:

```ts
/** Asistan 'profile_note' uygulaması: istemci bölüme maddeyi ekler, tamamını gönderir. Kredi YOK, plan kapısı YOK (mevcut profilin düzenlenmesi). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  try {
    const { id } = await params;
    const ownership = await requireStudentOwnership(id, session.user.id, { select: { id: true, aiProfile: true } });
    if (ownership instanceof NextResponse) return ownership;
    if (!ownership.student.aiProfile) return NextResponse.json({ error: "Önce eğitim profili üretin" }, { status: 409 });

    const body = await readJsonBody(request);
    if (body instanceof NextResponse) return body;
    const parsed = aiProfileBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: zodError(parsed.error) }, { status: 400 });

    const aiProfile = stripHtmlTags(parsed.data.aiProfile);
    await prisma.student.update({ where: { id }, data: { aiProfile } });
    return NextResponse.json({ success: true, aiProfile });
  } catch (error) {
    logError("PATCH /studio/api/students/[id]/ai-profile", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Tip denetimi ve commit**

Run: `cd apps/hub && pnpm typecheck`

```bash
git add apps/hub/src/app/studio/api/students/[id]/ai-profile/route.ts apps/hub/src/modules/studio/lib/validation.ts
git commit -m "feat(studio): ai-profile PATCH (profil maddesi ekleme)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Asistan POST rotası

**Files:**
- Create: `apps/hub/src/modules/studio/lib/assistant/run.ts` (saf iş mantığı, test edilebilir)
- Create: `apps/hub/src/app/studio/api/students/[id]/assistant/route.ts`
- Test: `apps/hub/src/modules/studio/lib/assistant/run.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

```ts
// apps/hub/src/modules/studio/lib/assistant/run.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("@studio/lib/db", () => ({ prisma: {} }));
vi.mock("@studio/lib/anthropic", () => ({ anthropic: { messages: { create } }, MODEL: "test-model" }));
vi.mock("@studio/lib/usage", () => ({ logUsage: vi.fn() }));
vi.mock("@studio/lib/studentContext", async (orig) => ({ ...(await orig<object>()), loadStudentContext: vi.fn().mockResolvedValue("Öğrenci: Nisa, 6 yaş") }));

const { runAssistant } = await import("./run");

const prismaTaklit = () => ({
  curriculum: { findMany: vi.fn().mockResolvedValue([{ goals: [{ id: "g1", code: "3.1", title: "Kelime başı /r/" }] }]) },
  studentProgress: { findMany: vi.fn().mockResolvedValue([{ goalId: "g1", status: "in_progress" }]) },
});

const ogrenci = { id: "s1", name: "Ela Şahin", llmAlias: "Nisa", therapistId: "t1", curriculumIds: ["c1"], aiProfile: "## x" };

beforeEach(() => create.mockReset());

describe("runAssistant", () => {
  it("prompt'a rumuzlu gözlem gider, öneriler doğrulanıp gerçek adla döner", async () => {
    create.mockResolvedValue({
      content: [{ type: "text", text: '{"suggestions":[{"kind":"goal_status","goalId":"g1","status":"completed","reason":"Nisa %90 başardı"}]}' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    });
    const out = await runAssistant(prismaTaklit() as never, { student: ogrenci, therapistId: "t1", observation: "Ela Şahin bugün %90 başardı" });
    const istek = create.mock.calls[0][0] as { messages: { content: string }[] };
    expect(istek.messages[0].content).toContain("Nisa bugün %90 başardı");
    expect(istek.messages[0].content).not.toMatch(/Ela/);
    expect(out.suggestions).toEqual([{ kind: "goal_status", goalId: "g1", status: "completed", reason: "Ela Şahin %90 başardı" }]);
    expect(out.warning).toBeUndefined();
  });

  it("model patlarsa boş öneri + uyarı; fırlatmaz", async () => {
    create.mockRejectedValue(new Error("api"));
    const out = await runAssistant(prismaTaklit() as never, { student: ogrenci, therapistId: "t1", observation: "x" });
    expect(out.suggestions).toEqual([]);
    expect(out.warning).toBe("Öneri üretilemedi");
  });

  it("bozuk JSON → boş öneri + uyarı", async () => {
    create.mockResolvedValue({ content: [{ type: "text", text: "elimde yok" }], usage: { input_tokens: 1, output_tokens: 1 } });
    const out = await runAssistant(prismaTaklit() as never, { student: ogrenci, therapistId: "t1", observation: "x" });
    expect(out.suggestions).toEqual([]);
    expect(out.warning).toBe("Öneri üretilemedi");
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `cd apps/hub && pnpm vitest run src/modules/studio/lib/assistant/run.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: `run.ts` yaz**

```ts
// apps/hub/src/modules/studio/lib/assistant/run.ts
import type { NameMapping } from "@ludenlab/ai";
import { anthropic, MODEL } from "@studio/lib/anthropic";
import { logUsage } from "@studio/lib/usage";
import { extractJson } from "@studio/lib/utils";
import { scrub, restoreNameDeep } from "@studio/lib/pseudonym";
import { loadStudentContext } from "@studio/lib/studentContext";
import { ASSISTANT_SYSTEM_PROMPT, buildAssistantUserPrompt } from "./prompt";
import { validateSuggestions, type GoalRow, type Suggestion } from "./schema";

/**
 * Tek asistan çağrısı. HİÇ fırlatmaz: model/JSON hatası boş öneri + uyarı döner (gözlem rotada
 * zaten kaydedildi). Rumuz kapısı: gözlem metni `scrub` ile, blok `loadStudentContext` ile
 * rumuzlu gider; `reason` metinleri `restoreNameDeep` ile gerçek ada döner.
 */
type AssistantPrisma = Parameters<typeof loadStudentContext>[0] & {
  curriculum: { findMany(args: unknown): Promise<unknown> };
  studentProgress: { findMany(args: unknown): Promise<unknown> };
};

export interface RunAssistantInput {
  student: { id: string; name: string; llmAlias: string; therapistId: string; curriculumIds: string[]; aiProfile: string | null };
  therapistId: string;
  observation: string;
}

export interface RunAssistantOutput {
  suggestions: Suggestion[];
  warning?: string;
}

export const ASSISTANT_MAX_TOKENS = 1200;

async function loadGoals(prisma: AssistantPrisma, s: RunAssistantInput["student"]): Promise<GoalRow[]> {
  if (!s.curriculumIds.length) return [];
  const [mufredatlar, ilerleme] = await Promise.all([
    prisma.curriculum.findMany({ where: { id: { in: s.curriculumIds } }, select: { goals: { select: { id: true, code: true, title: true }, orderBy: { code: "asc" } } } }) as Promise<{ goals: { id: string; code: string; title: string }[] }[]>,
    prisma.studentProgress.findMany({ where: { studentId: s.id, therapistId: s.therapistId }, select: { goalId: true, status: true } }) as Promise<{ goalId: string; status: string }[]>,
  ]);
  const durum = new Map(ilerleme.map((p) => [p.goalId, p.status]));
  return mufredatlar.flatMap((m) => m.goals).map((g) => ({ ...g, status: durum.get(g.id) ?? "not_started" }));
}

export async function runAssistant(prisma: AssistantPrisma, input: RunAssistantInput): Promise<RunAssistantOutput> {
  const map: NameMapping = { real: input.student.name, alias: input.student.llmAlias };
  const goals = await loadGoals(prisma, input.student).catch((e) => {
    console.warn("[assistant] hedefler yüklenemedi, goal_status üretilmez", e);
    return [] as GoalRow[];
  });
  const studentBlock = await loadStudentContext(prisma, { studentId: input.student.id, therapistId: input.therapistId, nameMap: map });
  const hasProfile = Boolean(input.student.aiProfile?.trim());
  const userPrompt = buildAssistantUserPrompt({
    studentBlock,
    observation: scrub(input.observation, map) ?? input.observation,
    goals,
    hasProfile,
  });

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: ASSISTANT_MAX_TOKENS,
      temperature: 0.3,
      system: [{ type: "text", text: ASSISTANT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt }],
    });
    logUsage(input.therapistId, "students/assistant", message.usage);
    const text = message.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");
    const raw = extractJson(text);
    const suggestions = validateSuggestions(raw, { goals, hasProfile });
    return { suggestions: restoreNameDeep(suggestions, map) };
  } catch (e) {
    console.error("[assistant] öneri üretilemedi:", e);
    return { suggestions: [], warning: "Öneri üretilemedi" };
  }
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `cd apps/hub && pnpm vitest run src/modules/studio/lib/assistant/run.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Rotayı yaz**

```ts
// apps/hub/src/app/studio/api/students/[id]/assistant/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@studio/lib/db";
import { requireAuth, requireStudentOwnership } from "@studio/lib/auth-helpers";
import { isAssistantPlan } from "@studio/lib/plans";
import { ensureStudentAlias } from "@studio/lib/pseudonym";
import { observationBodySchema, stripHtmlTags, zodError } from "@studio/lib/validation";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/bodyLimit";
import { streamingJson } from "@/lib/streamingJson";
import { runAssistant } from "@studio/lib/assistant/run";
import { logError } from "@studio/lib/utils";

/**
 * Öğrenci asistanı: gözlem → günlük kaydı → AI önerileri (2026-10 tasarımı §5.1).
 * Plan kapısı: FREE 403. Günlük tavan: öğrenci başına 10 gözlem / TR takvim günü (429).
 * Kredi YOK. `observationId` verilirse yeniden deneme: insert ve tavan sayımı atlanır.
 */
export const OBSERVATIONS_PER_DAY = 10;

/** Ya yeni gözlem metni ya da yeniden deneme için mevcut gözlem id'si. */
const bodySchema = z.union([
  observationBodySchema,
  z.object({ observationId: z.string().min(1) }),
]);

/** TR saatiyle bugünün başlangıcı (UTC+3, DST yok). */
function trGunBaslangici(now = new Date()): Date {
  const tr = new Date(now.getTime() + 3 * 3600_000);
  return new Date(Date.UTC(tr.getUTCFullYear(), tr.getUTCMonth(), tr.getUTCDate()) - 3 * 3600_000);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  const therapistId = session.user.id;

  const { allowed, retryAfter } = rateLimit(`assistant:${therapistId}`, 5);
  if (!allowed) return rateLimitResponse(retryAfter);

  try {
    const { id } = await params;
    const ownership = await requireStudentOwnership(id, therapistId, {
      select: { id: true, name: true, llmAlias: true, therapistId: true, curriculumIds: true, aiProfile: true },
    });
    if (ownership instanceof NextResponse) return ownership;
    const student = ownership.student as { id: string; name: string; llmAlias: string | null; therapistId: string; curriculumIds: string[]; aiProfile: string | null };

    const therapist = await prisma.therapist.findUnique({ where: { id: therapistId }, select: { planType: true } });
    if (!therapist || !isAssistantPlan(therapist.planType)) {
      return NextResponse.json({ error: "Öğrenci asistanı ücretli planlarda kullanılabilir.", code: "PLAN_REQUIRED" }, { status: 403 });
    }

    const body = await readJsonBody(request);
    if (body instanceof NextResponse) return body;
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: zodError(parsed.error) }, { status: 400 });

    // Gözlem kaydı — AI çağrısından ÖNCE (çağrı patlasa da girdi kalır). Yeniden denemede atlanır.
    let observation: { id: string; text: string; createdAt: Date };
    if ("observationId" in parsed.data) {
      const mevcut = await prisma.studentObservation.findFirst({
        where: { id: parsed.data.observationId, studentId: id, therapistId },
        select: { id: true, text: true, createdAt: true },
      });
      if (!mevcut) return NextResponse.json({ error: "Gözlem bulunamadı" }, { status: 404 });
      observation = mevcut;
    } else {
      const bugun = await prisma.studentObservation.count({ where: { studentId: id, therapistId, createdAt: { gte: trGunBaslangici() } } });
      if (bugun >= OBSERVATIONS_PER_DAY) {
        return NextResponse.json({ error: `Bugünlük gözlem tavanı doldu (${OBSERVATIONS_PER_DAY}). Yarın devam edin.`, code: "DAILY_CAP" }, { status: 429 });
      }
      observation = await prisma.studentObservation.create({
        data: { studentId: id, therapistId, text: stripHtmlTags(parsed.data.text) },
        select: { id: true, text: true, createdAt: true },
      });
    }

    const llmAlias = await ensureStudentAlias({ id: student.id, name: student.name, llmAlias: student.llmAlias, therapistId });

    // Yavaş kısım SSE-heartbeat içinde (Safari 60 sn). runAssistant fırlatmaz.
    return streamingJson(async () => {
      const out = await runAssistant(prisma, {
        student: { ...student, llmAlias },
        therapistId,
        observation: observation.text,
      });
      return { status: 200, body: { observation, ...out } };
    });
  } catch (error) {
    logError("POST /studio/api/students/[id]/assistant", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Tip denetimi**

Run: `cd apps/hub && pnpm typecheck`
Expected: temiz. `runAssistant(prisma, …)` tip uyuşmazlığı verirse `AssistantPrisma` tipini `StudentContextPrisma` gibi metot sözdizimiyle (`findMany(args: unknown): Promise<unknown>`) tanımladığından emin ol; gerçek `PrismaClient` o gevşek imzaya uyar (studentContext.test.ts "gerçek PrismaClient … uyar" testi deseni).

- [ ] **Step 7: Commit**

```bash
git add apps/hub/src/modules/studio/lib/assistant/run.ts apps/hub/src/modules/studio/lib/assistant/run.test.ts apps/hub/src/app/studio/api/students/[id]/assistant/route.ts
git commit -m "feat(studio): POST students/[id]/assistant — gözlem kaydı + AI öneri

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Dört araç sayfasında `prefill`

**Files:**
- Modify: `apps/hub/src/app/studio/(main)/tools/articulation/page.tsx`
- Modify: `apps/hub/src/app/studio/(main)/tools/phonation/page.tsx`
- Modify: `apps/hub/src/app/studio/(main)/tools/matching-game/page.tsx`
- Modify: `apps/hub/src/app/studio/(main)/tools/homework/page.tsx`
- Create: `apps/hub/src/modules/studio/components/tools/PrefillBanner.tsx`

Next'te `useSearchParams` kullanan istemci bileşeni `<Suspense>` içinde olmalı (`generate/page.tsx:317` deseni). Her sayfada mevcut `export default function XPage()` fonksiyonu `function XPageInner()` olarak yeniden adlandırılır ve yeni default export onu `<Suspense>` ile sarar.

- [ ] **Step 1: Banner bileşeni**

```tsx
// apps/hub/src/modules/studio/components/tools/PrefillBanner.tsx
"use client";
import { PAlert } from "@studio/components/poster";

/** Asistan ön-doldurma uyarısı: formu uzman kontrol eder, Üret'e kendisi basar (kredi orada düşer). */
export function PrefillBanner() {
  return (
    <div style={{ marginBottom: 14 }}>
      <PAlert tone="info">Alanlar Asistan önerisiyle dolduruldu; kontrol edip <b>Üret</b>'e basın.</PAlert>
    </div>
  );
}
```

`PAlert`'in `tone="info"` desteklediğini `apps/hub/src/modules/studio/components/poster/index.tsx:186` civarında doğrula; yoksa `tone="warning"` kullan.

- [ ] **Step 2: Artikülasyon sayfası**

İmportlara ekle:

```ts
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { decodePrefill } from "@studio/lib/prefill";
import { articulationBodySchema } from "@studio/lib/toolSchemas";
import { PrefillBanner } from "@studio/components/tools/PrefillBanner";
```

`export default function ArticulationPage()` → `function ArticulationPageInner()`. Fonksiyonun içinde, `selectedStudent` tanımından önce:

```ts
  const searchParams = useSearchParams();
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    const raw = decodePrefill(searchParams.get("prefill"));
    const sid = searchParams.get("studentId");
    if (!raw && !sid) return;
    const p = articulationBodySchema.omit({ studentId: true }).partial().safeParse(raw ?? {});
    if (sid) setStudentId(sid);
    if (p.success) {
      if (p.data.targetSounds) setSelectedSounds(p.data.targetSounds);
      if (p.data.positions) setPositions(p.data.positions);
      if (p.data.level) setLevel(p.data.level);
      if (p.data.itemCount !== undefined) setItemCount(p.data.itemCount);
      setPrefilled(Boolean(raw));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

Not: Sayfa `.partial()` kullanır (eksik alan boş kalır, uzman doldurur); sunucu tarafı `validateSuggestions` tam şemayla süzdüğü için asistan kaynaklı prefill zaten tamdır. Sayfadaki `partial` yalnız elle yazılmış/bozuk URL'leri yumuşak karşılamak içindir.

Formun üstüne (ilk `PCard` ya da `ToolShell` içeriğinin başına): `{prefilled && <PrefillBanner />}`.

Dosya sonuna:

```tsx
export default function ArticulationPage() {
  return (
    <Suspense>
      <ArticulationPageInner />
    </Suspense>
  );
}
```

- [ ] **Step 3: Sesletim sayfası**

Aynı desen; şema `phonationBodySchema`, state eşlemesi:

```ts
      if (p.data.targetSounds) setTargetSounds(p.data.targetSounds);
      if (p.data.activityType) setActivityType(p.data.activityType);
      if (p.data.difficulty) setDifficulty(p.data.difficulty);
      if (p.data.itemCount !== undefined) setItemCount(p.data.itemCount);
      if (p.data.theme) setTheme(p.data.theme);
```

`export default function PhonationPage()` → `PhonationPageInner` + Suspense sarmalayıcı.

- [ ] **Step 4: Eşleştirme sayfası**

Şema `matchingGameBodySchema`:

```ts
      if (p.data.matchType) setMatchType(p.data.matchType);
      if (p.data.pairCount) setPairCount(p.data.pairCount);
      if (p.data.difficulty) setDifficulty(p.data.difficulty);
      if (p.data.theme) setTheme(p.data.theme);
```

`goalTitle` sayfada `goalId`'den türetildiği için prefill'de yok sayılır (uzman menüden seçer). `MatchingGamePage` → `MatchingGamePageInner` + Suspense.

- [ ] **Step 5: Ev ödevi sayfası**

Şema `homeworkBodySchema`. `targetArea` listede (`GENERAL_AREAS`) yoksa "Diğer" + `customArea`:

```ts
      if (p.data.targetArea) {
        if (GENERAL_AREAS.includes(p.data.targetArea)) setTargetArea(p.data.targetArea);
        else { setTargetArea("Diğer"); setCustomArea(p.data.targetArea); }
      }
      if (p.data.duration) setDuration(p.data.duration);
      if (p.data.parentLevel) setParentLevel(p.data.parentLevel);
      if (p.data.materialType) setMaterialType(p.data.materialType);
      if (p.data.extraNote) setExtraNote(p.data.extraNote);
```

`HomeworkPage` → `HomeworkPageInner` + Suspense. Sayfada `GENERAL_AREAS` dışında alan listeleri (müfredat hedef başlıkları) de seçilebiliyorsa, `targetArea` o listelerde de aranır; bulunamazsa "Diğer".

- [ ] **Step 6: Tip + lint + elle doğrulama**

Run: `cd apps/hub && pnpm typecheck && pnpm lint`
Expected: temiz.

Tarayıcı doğrulaması (dev sunucu `.claude/launch.json` ile): `/studio/tools/articulation?studentId=<id>&prefill=<kod>` adresinde form dolu açılır, banner görünür. Kodu Node'da üret:

```bash
cd apps/hub && node -e 'const o={targetSounds:["/r/"],positions:["initial"],level:"word",itemCount:12};console.log(Buffer.from(JSON.stringify(o)).toString("base64url"))'
```

- [ ] **Step 7: Commit**

```bash
git add apps/hub/src/app/studio/\(main\)/tools apps/hub/src/modules/studio/components/tools/PrefillBanner.tsx
git commit -m "feat(studio): dört araç sayfasında ?prefill= ön-doldurma + banner

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: `AssistantTab` bileşeni

**Files:**
- Create: `apps/hub/src/modules/studio/components/students/AssistantTab.tsx`
- Create: `apps/hub/src/modules/studio/lib/assistant/applyProfileNote.ts` + test

- [ ] **Step 1: Profil maddesi ekleme yardımcısı — başarısız test**

```ts
// apps/hub/src/modules/studio/lib/assistant/applyProfileNote.test.ts
import { describe, expect, it, vi } from "vitest";
vi.mock("@studio/lib/db", () => ({ prisma: {} }));
const { applyProfileNote } = await import("./applyProfileNote");

const profil = `## Kavramsal Arka Plan\n\n### Tanının Klinik Açıklaması\nAçıklama.\n\n---\n\n## Uzmana Öneriler\n\n### Öncelikli Çalışma Alanları\n- İki kelime\n\n### Etkili Yaklaşım ve Teknikler\n- Model olma\n\n### Dikkat Edilmesi Gereken Noktalar\nAni ses.\n\n### Aile ile Paylaşılabilecek Öneriler\nEvde.`;

describe("applyProfileNote", () => {
  it("bölümün sonuna '- madde' satırı ekler, diğer bölümler aynen kalır", () => {
    const out = applyProfileNote(profil, "Öncelikli Çalışma Alanları", "Kelime başı /r/ pekiştirme");
    expect(out).toContain("### Öncelikli Çalışma Alanları\n- İki kelime\n- Kelime başı /r/ pekiştirme\n\n### Etkili Yaklaşım ve Teknikler");
    expect(out).toContain("### Dikkat Edilmesi Gereken Noktalar\nAni ses.\n\n### Aile");
  });

  it("madde işaretsiz gövdeye de ekler; sonraki başlık önünde tam bir boş satır kalır", () => {
    const out = applyProfileNote(profil, "Dikkat Edilmesi Gereken Noktalar", "Yorulunca ses düşer");
    expect(out).toContain("Ani ses.\n- Yorulunca ses düşer\n\n### Aile ile Paylaşılabilecek Öneriler");
  });

  it("bölüm başlığı yoksa profil DEĞİŞMEZ (null)", () => {
    expect(applyProfileNote("## Başka", "Öncelikli Çalışma Alanları", "x")).toBeNull();
  });

  it("aynı madde zaten varsa yeniden eklemez", () => {
    const bir = applyProfileNote(profil, "Öncelikli Çalışma Alanları", "İki kelime");
    expect(bir).toBe(profil);
  });
});
```

- [ ] **Step 2: Yardımcıyı yaz**

```ts
// apps/hub/src/modules/studio/lib/assistant/applyProfileNote.ts
import { PROFIL_BOLUMLERI } from "@studio/lib/studentContext";

/**
 * Profil Markdown'ında verilen bölümün gövdesinin sonuna `- <madde>` ekler. Başlık sözleşmesi
 * `generateProfile.ts` şablonu (### Başlık). Bölüm yoksa `null` (uzmana "bulunamadı" denir),
 * aynı madde varsa metin aynen döner. Saf; istemci ve sunucu ortak.
 */
const BOLUM_SONU = /^(?:#{1,6}\s|---\s*$)/m;

export function applyProfileNote(profile: string, section: (typeof PROFIL_BOLUMLERI)[number], text: string): string | null {
  const madde = `- ${text.trim()}`;
  const re = new RegExp(`^#{1,6}[ \\t]*${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[ \\t]*$`, "m");
  const m = re.exec(profile);
  if (!m) return null;
  const basi = m.index + m[0].length;
  const kalan = profile.slice(basi);
  const sonRel = kalan.slice(1).search(BOLUM_SONU); // başlığın hemen ardındaki \n atlanır
  const son = sonRel < 0 ? profile.length : basi + 1 + sonRel;
  const govde = profile.slice(basi, son);
  if (govde.split("\n").some((l) => l.trim() === madde)) return profile;
  const govdeTrim = govde.replace(/\s+$/, "");
  return profile.slice(0, basi) + govdeTrim + "\n" + madde + "\n\n" + profile.slice(son).replace(/^\n+/, "");
}
```

- [ ] **Step 3: Testi çalıştır**

Run: `cd apps/hub && pnpm vitest run src/modules/studio/lib/assistant/applyProfileNote.test.ts`
Expected: PASS. Boşluk/satır sonu farkı çıkarsa beklentileri gerçek çıktıya göre değil, sözleşmeye göre düzelt: madde son gövde satırından sonra, sonraki başlıktan önce tam bir boş satır.

- [ ] **Step 4: Bileşeni yaz**

```tsx
// apps/hub/src/modules/studio/components/students/AssistantTab.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { PBtn, PCard, PBadge, PModal, PTextarea, PSpinner, PAlert } from "@studio/components/poster";
import type { BadgeColor } from "@studio/components/poster";
import { fetchGeneration } from "@/lib/fetchGeneration";
import { encodePrefill } from "@studio/lib/prefill";
import { applyProfileNote } from "@studio/lib/assistant/applyProfileNote";
import { ASSISTANT_TOOL_LABEL, type AssistantTool } from "@studio/lib/toolSchemas";
import type { Suggestion } from "@studio/lib/assistant/schema";
import { formatDate } from "@studio/lib/utils";

interface Observation { id: string; text: string; createdAt: string; updatedAt: string }
interface GoalLite { id: string; code: string; title: string }

interface Props {
  studentId: string;
  aiProfile: string | null;
  /** Müfredat hedefleri (kod/başlık için); sayfa zaten yüklüyor. */
  goals: GoalLite[];
  /** Profil maddesi uygulanınca sayfadaki öğrenci nesnesi güncellenir. */
  onProfileChange: (aiProfile: string) => void;
}

const TUR: Record<Suggestion["kind"], { label: string; color: BadgeColor }> = {
  goal_status:   { label: "Hedef",    color: "green" },
  profile_note:  { label: "Profil",   color: "blue" },
  generate_tool: { label: "Materyal", color: "accent" },
};

const DURUM_ETIKET: Record<string, string> = { in_progress: "Devam ediyor", completed: "Tamamlandı" };

export function AssistantTab({ studentId, aiProfile, goals, onProfileChange }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [locked, setLocked] = useState(false);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [lastObservationId, setLastObservationId] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [deleting, setDeleting] = useState<Observation | null>(null);

  useEffect(() => {
    fetch(`/studio/api/students/${studentId}/observations`)
      .then((r) => r.json())
      .then((d) => { setObservations(d.observations ?? []); setLocked(Boolean(d.locked)); })
      .catch(() => toast.error("Gözlemler yüklenemedi"))
      .finally(() => setLoading(false));
  }, [studentId]);

  async function send(observationId?: string) {
    if (!observationId && !text.trim()) return;
    setSending(true);
    setWarning(null);
    if (!observationId) { setSuggestions([]); setApplied(new Set()); }
    try {
      const res = await fetchGeneration(`/studio/api/students/${studentId}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(observationId ? { observationId } : { text }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Bir hata oluştu"); return; }
      if (!observationId) {
        setObservations((prev) => [data.observation, ...prev]);
        setText("");
      }
      setLastObservationId(data.observation.id);
      setSuggestions(data.suggestions ?? []);
      setApplied(new Set());
      setWarning(data.warning ?? null);
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setSending(false);
    }
  }

  async function apply(i: number, s: Suggestion) {
    try {
      if (s.kind === "goal_status") {
        const res = await fetch(`/studio/api/students/${studentId}/progress`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates: [{ goalId: s.goalId, status: s.status }] }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Hedef durumu güncellendi");
      } else if (s.kind === "profile_note") {
        if (!aiProfile) { toast.error("Önce eğitim profili üretin"); return; }
        const yeni = applyProfileNote(aiProfile, s.section, s.text);
        if (!yeni) { toast.error(`Profilde "${s.section}" bölümü bulunamadı`); return; }
        const res = await fetch(`/studio/api/students/${studentId}/ai-profile`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aiProfile: yeni }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        onProfileChange(yeni);
        toast.success("Profile eklendi");
      } else {
        const q = new URLSearchParams({ studentId, prefill: encodePrefill(s.params) });
        router.push(`/studio/tools/${s.tool}?${q.toString()}`);
        return;
      }
      setApplied((prev) => new Set(prev).add(i));
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Uygulanamadı");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const res = await fetch(`/studio/api/observations/${editing.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editing.text }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Kaydedilemedi"); return; }
    setObservations((prev) => prev.map((o) => (o.id === editing.id ? data.observation : o)));
    setEditing(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    const res = await fetch(`/studio/api/observations/${deleting.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Silinemedi"); return; }
    setObservations((prev) => prev.filter((o) => o.id !== deleting.id));
    setDeleting(null);
  }

  const goalLabel = (id: string) => { const g = goals.find((x) => x.id === id); return g ? `${g.code} ${g.title}` : id; };

  function title(s: Suggestion): string {
    if (s.kind === "goal_status") return `${goalLabel(s.goalId)} → ${DURUM_ETIKET[s.status] ?? s.status}`;
    if (s.kind === "profile_note") return `${s.section}: ${s.text}`;
    return `${ASSISTANT_TOOL_LABEL[s.tool as AssistantTool]} üret`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {locked ? (
        <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Lock style={{ width: 18, height: 18, flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 800, margin: "0 0 4px" }}>Öğrenci asistanı ücretli planlarda</p>
              <p style={{ fontSize: 13, margin: "0 0 10px", color: "var(--poster-ink-2)" }}>
                Seans sonrası gözleminizi yazın; asistan hedef, profil ve materyal önerileri çıkarsın. Kredi düşmez.
              </p>
              <PBtn as={Link} href="/studio/subscription" variant="accent" size="sm">Planları gör</PBtn>
            </div>
          </div>
        </PCard>
      ) : (
        <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>Bugün ne gözlemlediniz?</h2>
          <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: "0 0 10px" }}>
            Gözlem günlüğe kaydedilir; asistan hedef, profil ve materyal önerir. Başka çocukların ya da velilerin adını yazmayın.
          </p>
          <PTextarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={1000} placeholder="Örn. Kelime başı /r/ sesinde 10 denemede 6 doğru; oyun içinde daha istekli." disabled={sending} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "var(--poster-ink-3)" }}>{text.length}/1000</span>
            <PBtn as="button" variant="accent" size="sm" onClick={() => send()} disabled={sending || !text.trim()}>Gönder</PBtn>
          </div>
          {sending && <div style={{ marginTop: 12 }}><PSpinner size={22} label="Gözlem kaydedildi, öneriler hazırlanıyor…" style={{ display: "flex" }} /></div>}
          {warning && !sending && (
            <div style={{ marginTop: 12 }}>
              <PAlert tone="warning">
                {warning}. {lastObservationId && <button type="button" onClick={() => send(lastObservationId)} style={{ background: "none", border: "none", textDecoration: "underline", cursor: "pointer", fontWeight: 800 }}>Tekrar dene</button>}
              </PAlert>
            </div>
          )}
          {!sending && suggestions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              {suggestions.map((s, i) => {
                const done = applied.has(i);
                return (
                  <PCard key={i} rounded={14} style={{ padding: 14, opacity: done ? 0.7 : 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <PBadge color={TUR[s.kind].color}>{TUR[s.kind].label}</PBadge>
                      <span style={{ fontWeight: 800, fontSize: 13 }}>{title(s)}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--poster-ink-2)", margin: "0 0 10px" }}>{s.reason}</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      {done ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 800, color: "var(--poster-green)" }}><Check style={{ width: 14, height: 14 }} /> Uygulandı</span>
                      ) : (
                        <>
                          <PBtn as="button" variant="accent" size="sm" onClick={() => apply(i, s)}>{s.kind === "generate_tool" ? "Formu aç" : "Uygula"}</PBtn>
                          <PBtn as="button" variant="white" size="sm" onClick={() => setSuggestions((prev) => prev.filter((_, j) => j !== i))}>Geç</PBtn>
                        </>
                      )}
                    </div>
                  </PCard>
                );
              })}
            </div>
          )}
          {!sending && !aiProfile && suggestions.length === 0 && lastObservationId && (
            <div style={{ marginTop: 12 }}><PAlert tone="info">Profil önerileri için önce <b>Eğitim Profili</b> sekmesinden profil üretin.</PAlert></div>
          )}
        </PCard>
      )}

      <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 12px" }}>Gözlem günlüğü</h2>
        {loading ? <PSpinner size={22} /> : observations.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--poster-ink-3)", margin: 0 }}>Henüz gözlem yok.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {observations.map((o) => (
              <div key={o.id} style={{ padding: 12, border: "2px solid var(--poster-ink-faint)", borderRadius: 12, background: "var(--poster-bg-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-ink-3)" }}>{formatDate(new Date(o.createdAt))}</span>
                  <span style={{ display: "flex", gap: 6 }}>
                    <button type="button" aria-label="Düzenle" onClick={() => setEditing({ id: o.id, text: o.text })} style={{ background: "none", border: "none", cursor: "pointer" }}><Pencil style={{ width: 14, height: 14 }} /></button>
                    <button type="button" aria-label="Sil" onClick={() => setDeleting(o)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 style={{ width: 14, height: 14 }} /></button>
                  </span>
                </div>
                {editing?.id === o.id ? (
                  <div>
                    <PTextarea value={editing.text} onChange={(e) => setEditing({ id: o.id, text: e.target.value })} rows={3} maxLength={1000} />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <PBtn as="button" variant="accent" size="sm" onClick={saveEdit}>Kaydet</PBtn>
                      <PBtn as="button" variant="white" size="sm" onClick={() => setEditing(null)}>İptal</PBtn>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, margin: 0, whiteSpace: "pre-wrap" }}>{o.text}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </PCard>

      {deleting && (
        <PModal open onClose={() => setDeleting(null)} title="Gözlemi sil">
          <p style={{ fontSize: 13 }}>Bu gözlem silinecek. Devam edilsin mi?</p>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <PBtn as="button" variant="accent" size="sm" onClick={confirmDelete}>Sil</PBtn>
            <PBtn as="button" variant="white" size="sm" onClick={() => setDeleting(null)}>Vazgeç</PBtn>
          </div>
        </PModal>
      )}
    </div>
  );
}
```

`PModal` prop adlarını (`open`/`onClose`/`title`) `apps/hub/src/modules/studio/components/poster/PModal.tsx`'te doğrula; `PBadge` `color` değerlerini (`green`/`blue`/`accent`) `BadgeColor` tipinde doğrula, yoksa mevcut değerlerden seç. `PBtn as={Link}` deseni öğrenci sayfasında varsa aynen; yoksa `<Link href>` içinde `PBtn as="span"`.

- [ ] **Step 5: Tip denetimi ve commit**

Run: `cd apps/hub && pnpm typecheck && pnpm lint`

```bash
git add apps/hub/src/modules/studio/components/students/AssistantTab.tsx apps/hub/src/modules/studio/lib/assistant/applyProfileNote.ts apps/hub/src/modules/studio/lib/assistant/applyProfileNote.test.ts
git commit -m "feat(studio): AssistantTab bileşeni + profil maddesi ekleme yardımcısı

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Öğrenci sayfasına sekme

**Files:**
- Modify: `apps/hub/src/app/studio/(main)/students/[id]/page.tsx:126,537-620`

- [ ] **Step 1: Sekme tipini ve listesini genişlet**

Satır 126:
```ts
  const [activeTab, setActiveTab] = useState<"cards" | "progress" | "aiProfile" | "assistant">("cards");
```

Sekme listesine (`{ key: "aiProfile", label: "Eğitim Profili", count: null },` satırından sonra):
```ts
            { key: "assistant", label: "Asistan", count: null },
```

- [ ] **Step 2: Sekme içeriği**

İmport: `import { AssistantTab } from "@studio/components/students/AssistantTab";`

`{/* AI profile tab */}` bloğundan hemen önce:

```tsx
        {/* Assistant tab */}
        {activeTab === "assistant" && (
          <AssistantTab
            studentId={student.id}
            aiProfile={student.aiProfile}
            goals={curricula.filter((c) => (student.curriculumIds ?? []).includes(c.id)).flatMap((c) => c.goals.map((g) => ({ id: g.id, code: g.code, title: g.title })))}
            onProfileChange={(aiProfile) => setStudent((prev) => (prev ? { ...prev, aiProfile } : prev))}
          />
        )}
```

`curricula` state'inin tipinde `goals: { id; code; title }[]` olduğunu doğrula (sayfa `/studio/api/curriculum`'dan `include: goals` ile yüklüyor); tip eksikse genişlet.

- [ ] **Step 3: Tip + tarayıcı doğrulaması**

Run: `cd apps/hub && pnpm typecheck`

Dev sunucuda (⚠️ dev sunucu PROD DB'ye bakar; yalnız test hesabıyla ve gerçek olmayan metinle dene; yazdığın gözlemi sonra sil):
1. Ücretli test hesabıyla öğrenci sayfası → Asistan sekmesi → kutu görünür.
2. Kısa gözlem gönder → günlükte belirir, spinner, kartlar gelir (ya da uyarı + tekrar dene).
3. "Formu aç" → araç sayfası dolu açılır.
4. Günlükte düzenle/sil çalışır.
5. Ücretsiz hesapta kilit kartı görünür, günlük boş.
6. 390 px'te taşma yok (resize_window mobile).

- [ ] **Step 4: Commit**

```bash
git add "apps/hub/src/app/studio/(main)/students/[id]/page.tsx"
git commit -m "feat(studio): öğrenci sayfasına Asistan sekmesi

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Gizlilik metni + son doğrulama

**Files:**
- Modify: gizlilik/KVKK sayfası (`apps/hub/src/app/(legal)/` altında "Notlar"/"öğrenci bilgileri" geçen dosya; `grep -rn "öğrenci" "apps/hub/src/app/(legal)"` ile bul)

- [ ] **Step 1: Gizlilik metnine "seans gözlem notları" ibaresi**

İşlenen veri listesinde öğrenci notlarının anıldığı maddeye ekle: "…ve uzmanın girdiği seans gözlem notları". Tek cümle, mevcut madde yapısında.

- [ ] **Step 2: Tam test koşusu**

Run: `cd apps/hub && pnpm vitest run`
Expected: tüm testler PASS (önceki toplam + yeni ~20).

- [ ] **Step 3: Build**

Run: `cd apps/hub && pnpm build`
Expected: `next build` hatasız (tip hatası burada patlar; `tsc` yetmez).

- [ ] **Step 4: Commit**

```bash
git add -A "apps/hub/src/app/(legal)"
git commit -m "docs(studio): gizlilik metnine seans gözlem notları

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Deploy (plan dışı, kullanıcı kararıyla)

1. `0019_student_observation.sql` → studio DB (Supabase `kgbhvruzoaqwwwkhzdex`), SQL editöründen.
2. Dalı main'e merge + push → Hostinger otomatik deploy.
3. `/api/version` ile sürüm damgası; canlıda ücretli test hesabıyla bir gözlem gönder, sonra sil.
