# Araç prompt yükseltme — Faz 1B (yaygınlaştırma) uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1A'da kurulan değerlendirme çekirdeğini 21 araca yaymak: adaptör fabrikaları, tohumlu rastgelelik, kart üreticisi için `tool_use` taklidi, 6+6 fikstür, 80 yeni vaka (+ artikülasyonun 16 vakası ve gerçek Sonnet 4.6 referansları taşınır), tüm araçlarda taban koşusu + hakem kontrolleri, `eval-taban-2026-10` git etiketi, özet betiği.

**Architecture:** Araç başına kod yazmak yerine iki fabrika (`studioAdapter(cfg)` JSON araçları, `atolyeAdapter(cfg)` Markdown araçları) ortak davranışı (route çağrısı, SSE çözme, öğrenci/vaka çizimi, ortak kontroller, jenerik aday, ölçüt birleştirme) üstlenir; her araç yalnız bir `cfg` nesnesi, araca özgü kontroller, ölçütler ve 4 vaka verir. Rastgelelik `AsyncLocalStorage`-bilinçli bir `Math.random` yerleştirmesiyle vaka başına tohumlanır (tekrar tohuma girmez; artikülasyon eski düzenekle aynı kelimeleri alsın diye `CaseStore.seedKey` ile seçim argümanlarını tohum yapar; içerik hash'i sabitlenir). Kart üreticisinin `tools`/`tool_choice` çağrısı shim'de "tek araç + zorunlu seçim → JSON şemalı istek → `tool_use` bloğu" olarak taklit edilir. Mevcut 1A modülleri (runner, shim, exchange, judge, sharedChecks, renderStudent, fixtures) DEĞİŞMEZ; yalnız belirtilen küçük eklemeler yapılır.

**Tech Stack:** TypeScript, vitest (`vitest.eval.config.ts`), `@anthropic-ai/sdk` tipleri, `AsyncLocalStorage`, Claude Code `Agent` aracı (orkestratör), mevcut `evals/lib/*`.

**Spec:** `docs/superpowers/specs/2026-10-08-arac-prompt-yukseltme-design.md` (B1, B3–B7). **1A planı:** `docs/superpowers/plans/2026-10-08-arac-prompt-yukseltme-faz1a.md`. **Araç kataloğu (1B için çıkarıldı, bu planın kaynağı):** şema/çıktı ayrıntıları aşağıdaki görevlerde aynen verilmiştir.

**Dal:** `prompt/arac-prompt-yukseltme` (devam; push YOK). Komutlar `apps/hub` içinden; `ev() { node_modules/.bin/vitest run --config vitest.eval.config.ts "$@"; }`. Akış dizini `.claude/hillclimb/prompt-yukseltme/` (repo kökü; gitignore'da). **Gerçek akış dizinine yalnız Task 7 (artikülasyon referans dönüşümü) ve Task 17 (taban koşusu) yazar; geliştirme testleri ve bağlantı denemeleri `EVAL_FLOW=/tmp/…` ya da `mkdtemp` kullanır.**

---

## Bilinmesi gereken 1A sözleşmeleri (değişmez)

- `ToolAdapter<Body>` (`evals/lib/core.ts`): `id, label, module, dir, invoke(body, fixtureId) → {status, body}, extractOutput(resBody), renderTask(c, fixture), renderForJudge(output), checks({body, output, rawText, alias}) → CheckResult, criteria, genericCandidate(output)`. `CheckResult = { scores: {talimat, dil_kurali, rumuz_yok, yasak_kalip, …}, details, hard_fail[] }`.
- `evals/lib/sharedChecks.ts`: `dilKurali(text, {konusmaTerapistiMuaf?})`, `rumuzYok(output, alias)`, `yasakKalip(text)`, `parseJsonLoose`, `metinler(v)`, `adIzi`, `adGeciyorMu`, `countSentences`, `markdownHeadings`, `lower/str/mean/frac`.
- `evals/lib/renderStudent.ts`: `renderStudioStudent(f)`, `renderAtolyeCase(f)`, `RUMUZ_NOTU`.
- `evals/lib/fixtures.ts`: `resolveFixture(module, id)`, `realFirstName`, `studioFixtures()`, `atolyeFixtures()`; fikstürler `evals/fixtures/{studio,atolye}.json`.
- `evals/lib/shim.ts`: alt-ajan modunda `p.tools` varsa `harness_error` (Task 4 bunu `tool_use` taklidiyle gevşetir).
- Koşturucu: `EVAL_TOOL/EVAL_VARIANT/EVAL_BACKEND/EVAL_REF/EVAL_REPS/EVAL_CASES/EVAL_TAG/EVAL_FLOW`; referans `<tool>/<arm>/ref/<case>` = `{ok, truncated, output}`.
- `evals/tools/registry.ts`: `LOADERS["<modül>/<araç>"] = () => import("./<modül>/<araç>/adapter")`.
- Mock'lar `evals/run.eval.ts` ve `evals/runner.selftest.eval.ts` içinde `vi.mock(...)` bloğu (Task 5 ortaklaştırır).

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `evals/lib/markdown.ts` (+ selftest) | BEP kontrolünden çıkarılan Markdown yardımcıları: `sections`, `bulletsUnder`, `OLCUT`, `TANI`, `notNormalize`, `genericMarkdown` |
| `evals/lib/adapterFactory.ts` (+ selftest) | `studioAdapter(cfg)`, `atolyeAdapter(cfg)`, `profilBody(f)` |
| `evals/lib/seed.ts` (+ selftest) | `fnv1a`, `mulberry32`, `seededRandom`, `installSeededRandom()`; `CaseStore.rng` (tembel) |
| `evals/lib/shim.ts` (ekleme) | `tool_use` taklidi (alt-ajan modu: tek araç + zorunlu seçim → `<output_schema>` → `tool_use` bloğu) |
| `evals/lib/runner.ts` (iki küçük ekleme) | rumuz deseni (`İsim:` / `Öğrenci adı:`), `rawText` için `tool_use` girdisi |
| `evals/mocks.setup.ts` | Ortak `vi.mock` bloğu (run.eval + selftest'ler ilk satırda import eder) |
| `evals/fixtures/{studio,atolye}.json` | 6 + 6 fikstür |
| `evals/tools/studio/{articulation,homework,session-summary,weekly-plan,comm-board,matching-game,phonation,cards,ai-profile}/` | `adapter.ts`, `checks.ts`, `checks.selftest.eval.ts`, `cases.json` |
| `evals/tools/atolye/{seans-plani,davranis,okuma,matematik,materyal,uyarlama,sosyal-oyku,veli-mektubu,ev-odevi,ilerleme-cizelgesi}/` | aynı |
| `evals/tools/registry.ts` | 21 satır |
| `evals/summary.eval.ts` + `evals/lib/summary.ts` | araç×kol özet tablosu (Markdown) |
| `evals/vakaListesi.eval.ts` | `cases.json`'lardan onay dokümanını üretir |
| `evals/tools/registry.selftest.eval.ts` | 21 kimlik yükleniyor, vaka sayıları ve fikstür çözümü |
| `evals/README.md` | yeni araçlar, tohumlama, kart taklidi, özet komutu |
| `docs/superpowers/evals/2026-10-vakalar.md` | kullanıcı onayı için 80 yeni vakanın listesi (araç × vaka × amaç) |

---

### Task 1: Markdown yardımcılarını BEP'ten ortak modüle taşı

**Files:**
- Create: `apps/hub/evals/lib/markdown.ts`
- Test: `apps/hub/evals/lib/markdown.selftest.eval.ts`
- Modify: `apps/hub/evals/tools/atolye/bep/checks.ts`, `apps/hub/evals/tools/atolye/bep/adapter.ts` (import'lar)

BEP `checks.ts` içindeki `sections()`, `bulletsUnder()`, `OLCUT`, `TANI`, taslak-notu normalizasyonu ve `adapter.ts`'teki `genericCandidate` gövdesi 10 Atölye adaptöründe aynen gerekir; davranış değişmeden taşınır.

- [ ] **Step 1: Başarısız testi yaz**

```ts
// apps/hub/evals/lib/markdown.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { OLCUT, TANI, bulletsUnder, genericMarkdown, notNormalize, sections } from "./markdown";
import { lower } from "./sharedChecks";

const md = `## Okuma
### Kısa dönem hedefler
- Verilen 10 heceyi 8/10 doğrulukla okur.
1. **İkinci hedef** yüzde 80
| Hedef | Ölçüt |
|---|---|
| Üçüncü | 10 denemenin 8'inde |
### Yöntem
- Sabırlı olun.
⚠️ Bu metin yapay zekâ ile üretilmiş bir TASLAKTIR; uygulanmadan önce ilgili uzman tarafından gözden geçirilip onaylanmalıdır.`;

describe("markdown yardımcıları", () => {
  it("sections başlıkları seviyeleriyle verir", () => {
    const s = sections(md);
    expect(s.map((x) => x.heading)).toEqual(["okuma", "kısa dönem hedefler", "yöntem"]);
    expect(s[1]!.level).toBe(3);
  });
  it("bulletsUnder madde, numaralı ve tablo satırlarını toplar", () => {
    const items = bulletsUnder(md, /kısa dönem/);
    expect(items).toHaveLength(3);
    expect(items.every((i) => OLCUT.test(i.toLocaleLowerCase("tr-TR")))).toBe(true);
  });
  it("TANI tanı cümlesini yakalar, 'tanılı' ifadesini yakalamaz", () => {
    expect(TANI.test(lower("öğrenci disleksiktir"))).toBe(true);
    expect(TANI.test(lower("DEHB’dir"))).toBe(true);
    expect(TANI.test(lower("disleksi tanılı öğrenci"))).toBe(false);
  });
  it("notNormalize biçimden bağımsız karşılaştırır", () => {
    expect(notNormalize("**⚠️ Bu metin yapay zekâ ile üretilmiş bir TASLAKTIR**")).toBe(notNormalize("⚠️ Bu metin yapay zeka ile üretilmiş bir TASLAKTIR"));
  });
  it("genericMarkdown başlık ve notu korur, içeriği jenerikleştirir", () => {
    const g = genericMarkdown(md);
    expect(g).toContain("### Kısa dönem hedefler");
    expect(g).toContain("TASLAKTIR");
    expect(g).not.toContain("8/10");
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `cd apps/hub && ev evals/lib/markdown.selftest.eval.ts` → FAIL `Cannot find module './markdown'`

- [ ] **Step 3: `markdown.ts`'i BEP'ten TAŞIYARAK yaz**

`apps/hub/evals/tools/atolye/bep/checks.ts` içindeki `sections`, `bulletsUnder` (ve yardımcıları), `baslikMi`, `MADDE`, `TABLO`, `AYRAC`, `OLCUT`, `TANI`, taslak-notu normalizasyon fonksiyonu (`notNormu` → `notNormalize`, `TASLAK_NORM` ile) AYNEN `markdown.ts`'e alınır ve `export` edilir; `genericCandidate` gövdesi `genericMarkdown(text: string): string` olarak taşınır (`GENERIC_BULLETS` ile). `bep/checks.ts` ve `bep/adapter.ts` bunları import eder; davranış değişmez. İmzalar:

```ts
export interface Section { heading: string; level: 2 | 3 | 4 | "bold"; lines: string[] }
export function sections(text: string): Section[];
export function bulletsUnder(text: string, heading: RegExp, kardes?: readonly RegExp[]): string[]; // kardes: toplamayı durduran kardeş başlık kalıpları (BEP kendi listesini geçirir; varsayılan boş)
export const OLCUT: RegExp;   // ölçülebilir hedef imzası (lowercase metinde test edilir)
export const TANI: RegExp;    // tanı cümlesi — SÖZLEŞME: çağıran tr-TR küçük harfe indirilmiş metin verir (OLCUT ve bulletsUnder gibi)
export function notNormalize(s: string): string;
export function genericMarkdown(text: string): string;
export const MADDE: RegExp;   // madde satırı (`- `, `* `, `1.`), grupları: girinti, işaret, metin
export const TABLO: RegExp;   // GFM tablo satırı
export const AYRAC: RegExp;   // GFM tablo ayraç satırı
export function baslikMi(line: string): { heading: string; level: 2 | 3 | 4 | "bold" } | null;
```

- [ ] **Step 4: Testleri çalıştır, geçtiğini gör**

Run: `cd apps/hub && ev evals/lib/markdown.selftest.eval.ts evals/tools/atolye/bep` → PASS (5 + 12)

- [ ] **Step 5: Lint, tip, commit**

```bash
cd apps/hub && node_modules/.bin/eslint evals && npm run typecheck:evals
git add apps/hub/evals/lib/markdown.ts apps/hub/evals/lib/markdown.selftest.eval.ts apps/hub/evals/tools/atolye/bep
git commit -m "refactor(evals): Markdown kontrol yardımcıları ortak modüle taşındı"
```

---

### Task 2: Adaptör fabrikaları ve iki referans adaptörün fabrikaya geçişi

**Files:**
- Create: `apps/hub/evals/lib/adapterFactory.ts`
- Test: `apps/hub/evals/lib/adapterFactory.selftest.eval.ts`
- Modify: `apps/hub/evals/tools/studio/social-story/adapter.ts`, `apps/hub/evals/tools/atolye/bep/adapter.ts` (fabrikaya geçiş; `checks.ts` ve `cases.json` değişmez; mevcut testler yeşil kalır)

- [ ] **Step 1: Fabrika testini yaz**

```ts
// apps/hub/evals/lib/adapterFactory.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { atolyeAdapter, profilBody, studioAdapter } from "./adapterFactory";
import { resolveFixture } from "./fixtures";
import type { AtolyeFixture, StudioFixture } from "./core";

const s = studioAdapter<{ n: number }>({
  id: "studio/x", label: "X (Studio)", dir: "/tmp", route: async () => ({ POST: async () => new Response("{}") }),
  responseKey: "x", studentRequired: false,
  requestLines: (b) => [`- n: ${b.n}`],
  renderOutput: (o) => `Başlık: ${String(o.title ?? "—")}`,
  checks: ({ output }) => ({ scores: { talimat: output ? 1 : 0 }, details: {}, hard: [] }),
  criteria: [{ key: "ozel", question: "?" }],
  generic: (o) => ({ ...o, title: "Jenerik" }),
});

describe("studioAdapter", () => {
  it("ortak ölçütleri ve kontrolleri birleştirir", () => {
    expect(s.criteria.map((c) => c.key)).toEqual(["ozgulluk", "klinik_derinlik", "bicim_butce", "dil_etik", "ozel"]);
    const r = s.checks({ body: { n: 1 }, output: { title: "A" }, rawText: '{"title":"A"}', alias: "Defne" });
    expect(r.scores).toMatchObject({ talimat: 1, dil_kurali: 1, rumuz_yok: 1, yasak_kalip: 1 });
    expect(r.hard_fail).toEqual([]);
    const bad = s.checks({ body: { n: 1 }, output: null, rawText: "Üzgünüm", alias: null });
    expect(bad.hard_fail).toEqual(expect.arrayContaining(["json_gecersiz", "cikti_yok"]));
  });
  it("markdown modu: bölüm oranı, tanı cümlesi, taslak notu zorunlu DEĞİL", () => {
    const m = studioAdapter<Record<string, never>>({
      id: "studio/m", label: "M (Studio)", dir: "/tmp", send: async () => new Response("{}"), responseKey: "aiProfile",
      studentRequired: true, output: "markdown", sections: [/kavramsal arka plan/, /uzmana öneriler/],
      requestLines: () => [], criteria: [],
    });
    const text = "## Kavramsal Arka Plan\nmetin\n## Uzmana Öneriler\n- öneri";
    const r = m.checks({ body: {}, output: text, rawText: text, alias: "Hazal" });
    expect(r.hard_fail).toEqual([]);
    expect(r.details.yapi).toBe(1);
    expect(m.renderForJudge(text)).toBe(text);
    expect(m.genericCandidate(text)).toContain("## Uzmana Öneriler");
  });
  it("renderTask öğrenci bağlamını ve rumuz notunu ekler", () => {
    const f = resolveFixture("studio", "stu-ela") as StudioFixture;
    const t = s.renderTask({ id: "x-01", tags: [], purpose: "p", body: { n: 1 }, student: "stu-ela" }, f);
    expect(t).toContain("- Araç: X (Studio)");
    expect(t).toContain("- n: 1");
    expect(t).toContain(f.name);
    expect(t).toContain("rumuz");
    expect(t).toContain("Neyi sınıyor: p");
  });
});

describe("atolyeAdapter", () => {
  const a = atolyeAdapter<{ k: string }>({
    id: "atolye/y", label: "Y (Atölye)", dir: "/tmp", route: async () => ({ POST: async () => new Response("{}") }),
    body: (b, f) => ({ ...profilBody(f), ...b }),
    requestLines: (b) => [`- k: ${b.k}`],
    sections: [/okuma/, /yöntem/],
    criteria: [{ key: "ozel", question: "?" }],
  });
  it("profilBody fikstürü şema alanlarına çevirir", () => {
    const f = resolveFixture("atolye", "case-mina") as AtolyeFixture;
    const b = profilBody(f);
    expect(b).toMatchObject({ rumuz: f.code, kademe: f.kademe, taniProfili: f.taniProfili });
    expect(b).not.toHaveProperty("gucluYonler"); // null → gönderilmez
  });
  it("Markdown kontrolleri: yapı, taslak notu, tanı cümlesi", () => {
    const good = "## Okuma\n- a\n## Yöntem\n- b\n\n⚠️ Bu metin yapay zekâ ile üretilmiş bir TASLAKTIR; uygulanmadan önce ilgili uzman tarafından gözden geçirilip onaylanmalıdır.";
    const r = a.checks({ body: { k: "v" }, output: good, rawText: good, alias: "Hazal" });
    expect(r.hard_fail).toEqual([]);
    expect(r.details.yapi).toBe(1);
    const bad = "## Okuma\n- Hazal disleksiktir.";
    const rb = a.checks({ body: { k: "v" }, output: bad, rawText: bad, alias: "Hazal" });
    expect(rb.hard_fail).toEqual(expect.arrayContaining(["taslak_notu_yok", "rumuz_sizintisi"]));
    expect(rb.details.tani_cumlesi).toBe(1);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `cd apps/hub && ev evals/lib/adapterFactory.selftest.eval.ts` → FAIL (modül yok)

- [ ] **Step 3: `adapterFactory.ts`'i yaz**

```ts
// apps/hub/evals/lib/adapterFactory.ts
import { ORTAK_OLCUTLER, HarnessError, parseSse, type AtolyeFixture, type CaseDef, type CheckResult, type CriterionDef, type Fixture, type StudioFixture, type ToolAdapter } from "./core";
import { resolveFixture } from "./fixtures";
import { OLCUT, TANI, genericMarkdown, notNormalize, sections } from "./markdown";
import { RUMUZ_NOTU, renderAtolyeCase, renderStudioStudent } from "./renderStudent";
import { dilKurali, frac, lower, mean, metinler, parseJsonLoose, rumuzYok, yasakKalip } from "./sharedChecks";

/* Araç adaptörlerinin ortak gövdesi. Araç yalnız cfg verir; route çağrısı, SSE çözme, hakem görevi,
   ortak kontroller (JSON/Markdown geçerliliği, dil kuralı, rumuz, yasak kalıp), ölçüt birleştirme ve
   jenerik aday burada. 1A'daki social-story ve bep adaptörleri bu fabrikaya geçirilmiştir. */

type Route = () => Promise<{ POST: (req: Request) => Promise<Response> }>;
type Rec = Record<string, unknown>;

export interface ToolCheckOut {
  scores: Record<string, number>;
  details: CheckResult["details"];
  hard: string[];
}

export interface StudioToolCfg<Body> {
  id: string;
  label: string;
  dir: string;
  /** Standart araç rotası (`{ POST }`); `send` verilirse kullanılmaz. */
  route?: Route;
  /** Rota imzası standart değilse (ör. `students/[id]/ai-profile`): isteği kendisi gönderir. */
  send?(body: Body, fixtureId: string | null): Promise<Response>;
  responseKey: string;
  studentRequired: boolean;
  /** Çıktı biçimi: `json` (varsayılan; route `extractJson` ile çözer) ya da `markdown` (AI profili). */
  output?: "json" | "markdown";
  /** Markdown çıktıda istenen bölüm başlıkları (küçük harf regex); `yapi` = bulunan oran. */
  sections?: RegExp[];
  /** Hakem görevi: istek satırları (etiketli, Türkçe). */
  requestLines(body: Body): string[];
  /** JSON çıktıyı hakeme okunur metne çevirir; markdown çıktıda verilmezse metin olduğu gibi gider. */
  renderOutput?(output: Rec): string;
  /** Araca özgü kontroller. `text` = JSON çözüldüyse metin yaprakları satır sonuyla, markdown'da çıktı metni. */
  checks?(args: { body: Body; output: unknown; raw: Rec | null; text: string; alias: string | null }): ToolCheckOut;
  criteria: CriterionDef[];
  /** Jenerik aday; markdown çıktıda verilmezse `genericMarkdown`. */
  generic?(output: unknown): unknown;
  /** Route gövdesini isteğe göre dönüştürme gerekirse (varsayılan: `{ ...body, studentId }`). */
  mapBody?(body: Body, fixtureId: string | null): Rec;
}

function parseResponse(res: Response) {
  return res.text().then((t) => parseSse(t, res.status));
}

/** JSON çıktılı araçların ortak kontrolleri (geçerlilik, dil kuralı, rumuz, yasak kalıp). */
function sharedJson(output: unknown, rawText: string, alias: string | null) {
  const raw = parseJsonLoose(rawText);
  const text = raw ? metinler(raw).join("\n") : rawText;
  const dk = dilKurali(text);
  const yk = yasakKalip(text);
  const rz = rumuzYok(output, alias);
  const hard: string[] = [];
  if (!raw) hard.push("json_gecersiz");
  if (output === null || output === undefined || output === "") hard.push("cikti_yok");
  if (dk.score === 0) hard.push("dil_kurali");
  if (rz === 0) hard.push("rumuz_sizintisi");
  return { raw, text, dk, yk, rz, hard };
}

const TASLAK = "⚠️ Bu metin yapay zekâ ile üretilmiş bir TASLAKTIR; uygulanmadan önce ilgili uzman tarafından gözden geçirilip onaylanmalıdır.";

/** Markdown çıktılı araçların ortak kontrolleri. `taslakZorunlu`: Atölye'de evet (sondaki not), Studio profilinde hayır.
    `konusmaTerapistiMuaf`: Atölye'de "(dil ve) konuşma terapisti" meşru unvandır. */
export function markdownShared(
  text: string,
  rawText: string,
  alias: string | null,
  sectionsWanted: RegExp[],
  opts: { taslakZorunlu: boolean; konusmaTerapistiMuaf: boolean },
) {
  const hard: string[] = [];
  if (!text.trim()) hard.push("cikti_yok");
  const heads = sections(text).map((s) => s.heading);
  const yapi = sectionsWanted.length ? frac(sectionsWanted, (re) => heads.some((h) => re.test(h))) : 1;
  const norm = notNormalize(text);
  const notVar = norm.includes(notNormalize(TASLAK)) ? 1 : 0;
  const sonSatir = text.trim().split("\n").filter((l) => l.trim()).at(-1) ?? "";
  const taslakSonda = notNormalize(sonSatir).includes(notNormalize(TASLAK)) ? 1 : 0;
  if (opts.taslakZorunlu && text.trim() && !notVar) hard.push("taslak_notu_yok");
  const taniCumlesi = TANI.test(lower(text)) ? 1 : 0;
  const dk = dilKurali(rawText, { konusmaTerapistiMuaf: opts.konusmaTerapistiMuaf });
  const yk = yasakKalip(rawText);
  const rz = rumuzYok(text, alias);
  if (dk.score === 0) hard.push("dil_kurali");
  if (rz === 0) hard.push("rumuz_sizintisi");
  return { yapi, taslakSonda, taniCumlesi, dk, yk, rz, hard };
}

const HATA_METNI = "(Çıktı üretilemedi — uzman bir hata mesajı gördü.)";
const kes = (t: string) => (t.length > 60_000 ? t.slice(0, 60_000) + "\n…(kesildi)" : t);

export function studioAdapter<Body>(cfg: StudioToolCfg<Body>): ToolAdapter<Body> {
  const md = cfg.output === "markdown";
  return {
    id: cfg.id,
    label: cfg.label,
    module: "studio",
    dir: cfg.dir,
    async invoke(body, fixtureId) {
      if (cfg.studentRequired && !fixtureId) throw new HarnessError(`${cfg.id} vakası öğrencisiz olamaz`, "harness_error");
      if (cfg.send) return parseResponse(await cfg.send(body, fixtureId));
      if (!cfg.route) throw new HarnessError(`${cfg.id}: route ya da send verilmeli`, "config");
      const { POST } = await cfg.route();
      const payload = cfg.mapBody ? cfg.mapBody(body, fixtureId) : { ...(body as Rec), ...(fixtureId ? { studentId: fixtureId } : {}) };
      const req = new Request(`http://eval.local/${cfg.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      return parseResponse(await POST(req));
    },
    extractOutput: (b) => b[cfg.responseKey],
    renderTask(c: CaseDef<Body>, fixture: Fixture | null) {
      const f = fixture as StudioFixture | null;
      return ["İSTEK", `- Araç: ${cfg.label}`, ...cfg.requestLines(c.body), f ? renderStudioStudent(f) : "- Öğrenci seçilmedi (genel materyal).", f ? RUMUZ_NOTU : "", `- Neyi sınıyor: ${c.purpose}`].filter(Boolean).join("\n");
    },
    renderForJudge(output) {
      if (md) {
        const t = typeof output === "string" ? output : "";
        return t.trim() ? kes(cfg.renderOutput ? cfg.renderOutput({ text: t }) : t) : HATA_METNI;
      }
      const o = (output ?? null) as Rec | null;
      return o ? kes(cfg.renderOutput ? cfg.renderOutput(o) : JSON.stringify(o, null, 2)) : HATA_METNI;
    },
    checks({ body, output, rawText, alias }) {
      if (md) {
        const text = typeof output === "string" ? output : "";
        const sh = markdownShared(text, rawText, alias, cfg.sections ?? [], { taslakZorunlu: false, konusmaTerapistiMuaf: false });
        const tool = cfg.checks?.({ body, output, raw: null, text, alias }) ?? { scores: {}, details: {}, hard: [] };
        const talimat = text.trim() ? mean([sh.yapi, sh.taniCumlesi ? 0 : 1, ...Object.values(tool.scores)]) : 0;
        return {
          scores: { ...tool.scores, talimat, dil_kurali: sh.dk.score, rumuz_yok: sh.rz, yasak_kalip: sh.yk.score },
          details: { ...tool.details, yapi: sh.yapi, tani_cumlesi: sh.taniCumlesi, hasta: sh.dk.hasta, terapist: sh.dk.terapist, odul: sh.dk.odul, yasak_kalip: sh.yk.found.join("|") },
          hard_fail: [...sh.hard, ...tool.hard],
        };
      }
      const o = (output ?? null) as Rec | null;
      const sh = sharedJson(o, rawText, alias);
      const tool = cfg.checks?.({ body, output: o, raw: sh.raw, text: sh.text, alias }) ?? { scores: {}, details: {}, hard: [] };
      const talimat = tool.scores.talimat ?? (sh.raw && o ? 1 : 0);
      return {
        scores: { ...tool.scores, talimat, dil_kurali: sh.dk.score, rumuz_yok: sh.rz, yasak_kalip: sh.yk.score },
        details: { ...tool.details, hasta: sh.dk.hasta, terapist: sh.dk.terapist, odul: sh.dk.odul, yasak_kalip: sh.yk.found.join("|") },
        hard_fail: [...sh.hard, ...tool.hard],
      };
    },
    criteria: [...ORTAK_OLCUTLER, ...cfg.criteria],
    genericCandidate(output) {
      if (cfg.generic) return cfg.generic(structuredClone(output ?? (md ? "" : {})));
      if (md) return genericMarkdown(typeof output === "string" ? output : "");
      throw new HarnessError(`${cfg.id}: JSON araçta generic zorunlu`, "config");
    },
  };
}

export interface AtolyeToolCfg<Body> {
  id: string;
  label: string;
  dir: string;
  route: Route;
  /** Route gövdesi: fikstür kimliği + vaka gövdesi (çoğu araç: `{ ...profilBody(f), ...body }`). */
  body(body: Body, f: AtolyeFixture): Rec;
  requestLines(body: Body): string[];
  /** İstenen bölüm başlıkları (küçük harf regex). `yapi` = bulunan oran. */
  sections: RegExp[];
  checks?(args: { body: Body; text: string }): ToolCheckOut;
  criteria: CriterionDef[];
  generic?(text: string): string;
  /** Araca iletilmeyen fikstür alanları için hakem notu (seans-plani gibi profil omurgasız araçlar). */
  notSent?: string;
}

/** `ogrenciProfiliSchema` alanlarını fikstürden kurar; null alanlar gönderilmez (zod `.optional()`). */
export function profilBody(f: AtolyeFixture): Rec {
  return {
    rumuz: f.code,
    kademe: f.kademe,
    ...(f.yas ? { yas: f.yas } : {}),
    taniProfili: f.taniProfili,
    ...(f.guclukDuzeyi ? { guclukDuzeyi: f.guclukDuzeyi } : {}),
    ...(f.gucluYonler ? { gucluYonler: f.gucluYonler } : {}),
    ...(f.ilgiAlanlari ? { ilgiAlanlari: f.ilgiAlanlari } : {}),
  };
}

const TASLAK = "⚠️ Bu metin yapay zekâ ile üretilmiş bir TASLAKTIR; uygulanmadan önce ilgili uzman tarafından gözden geçirilip onaylanmalıdır.";

/** Hiçbir Atölye aracı fikstürün MEB bölümlerini ve önceki belgelerini almaz; hakem bunlarla özgüllük ölçmesin. */
export const ATOLYE_GITMEYEN =
  "- (Hakem notu: çalışılan MEB bölümleri ve önceki belgeler araca İLETİLMEDİ; özgüllüğü yalnız araca giden alanlara göre değerlendir.)";

export function atolyeAdapter<Body>(cfg: AtolyeToolCfg<Body>): ToolAdapter<Body> {
  return {
    id: cfg.id,
    label: cfg.label,
    module: "atolye",
    dir: cfg.dir,
    async invoke(body, fixtureId) {
      const f = resolveFixture("atolye", fixtureId) as AtolyeFixture | null;
      if (!f) throw new HarnessError(`${cfg.id} vakası fikstürsüz olamaz (rumuz zorunlu)`, "harness_error");
      const { POST } = await cfg.route();
      const req = new Request(`http://eval.local/${cfg.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cfg.body(body, f)) });
      return parseResponse(await POST(req));
    },
    extractOutput: (b) => b.text,
    renderTask(c: CaseDef<Body>, fixture: Fixture | null) {
      const f = fixture as AtolyeFixture;
      return ["İSTEK", `- Araç: ${cfg.label}`, renderAtolyeCase(f), cfg.notSent ?? ATOLYE_GITMEYEN, ...cfg.requestLines(c.body), `- Neyi sınıyor: ${c.purpose}`].filter(Boolean).join("\n");
    },
    renderForJudge(output) {
      const t = typeof output === "string" ? output : "";
      return t.trim() ? kes(t) : HATA_METNI;
    },
    checks({ body, output, rawText, alias }) {
      const text = typeof output === "string" ? output : "";
      const sh = markdownShared(text, rawText, alias, cfg.sections, { taslakZorunlu: true, konusmaTerapistiMuaf: true });
      const tool = cfg.checks?.({ body, text }) ?? { scores: {}, details: {}, hard: [] };
      const talimat = text.trim() ? mean([sh.yapi, sh.taslakSonda, sh.taniCumlesi ? 0 : 1, ...Object.values(tool.scores)]) : 0;
      return {
        scores: { ...tool.scores, talimat, dil_kurali: sh.dk.score, rumuz_yok: sh.rz, yasak_kalip: sh.yk.score },
        details: { ...tool.details, yapi: sh.yapi, taslak_sonda: sh.taslakSonda, tani_cumlesi: sh.taniCumlesi, hasta: sh.dk.hasta, terapist: sh.dk.terapist, odul: sh.dk.odul, yasak_kalip: sh.yk.found.join("|") },
        hard_fail: [...sh.hard, ...tool.hard],
      };
    },
    criteria: [...ORTAK_OLCUTLER, ...cfg.criteria],
    genericCandidate(output) {
      const t = typeof output === "string" ? output : "";
      return (cfg.generic ?? genericMarkdown)(t);
    },
  };
}

export { OLCUT, lower };
```

- [ ] **Step 4: Fabrika testini çalıştır** → PASS (4)

- [ ] **Step 5: social-story ve bep adaptörlerini fabrikaya geçir**

`social-story/adapter.ts`: `export const adapter = studioAdapter<SocialStoryBody>({ id: "studio/social-story", label: "Sosyal hikâye (Studio)", dir: import.meta.dirname, route: () => import("@/app/studio/api/tools/social-story/route"), responseKey: "story", studentRequired: true, requestLines: (b) => [`- Durum: ${b.situation} · Ortam: ${b.environment} · Uzunluk: ${LENGTH_TR[b.length]}`], renderOutput: <mevcut renderForJudge gövdesi>, checks: ({ body, output, raw, text }) => <mevcut socialStoryChecks'in araca özgü kısmı: cümle sayısı, tipler, Gray oranı, zorunluluk, alanlar; ortak dil/rumuz/yasak fabrikada>, criteria: [gray_oranlari, gorsel_uyum], generic: <mevcut genericCandidate gövdesi> })`. `checks.ts`'teki `socialStoryChecks` fabrikanın `checks` imzasına uyarlanır (`ToolCheckOut` döner); `checks.selftest` beklentileri aynen geçmeli (gerekirse `scores`/`details` anahtarları korunur).
`bep/adapter.ts`: `atolyeAdapter<BepBody>({ id: "atolye/bep", label: "BEP hedef taslağı (Atölye)", dir, route: () => import("@/app/atolye/api/bep/route"), body: (b, f) => ({ outputType: "bep_hedef", rumuz: f.code, kademe: f.kademe, ...(f.yas ? { yas: f.yas } : {}), gucluYonler: b.gucluYonler ?? f.gucluYonler ?? "", ekNotlar: b.ekNotlar ?? "", mebDavranisKodlari: b.mebDavranisKodlari ?? [], ...b }), requestLines: <mevcut istek satırları>, sections: [/uzun (dönem|vadeli)/, /kısa (dönem|vadeli)/, /yöntem|teknik|strateji/, /ölçme|değerlendirme/, /iş\s?birliği/], checks: ({ body, text }) => <bepChecks'in araca özgü kısmı: alan başlıkları, ölçütlü hedef, meb_kod, hedef sayısı>, criteria: [hedef_olculebilirlik, meb_hizasi], notSent: "<mevcut HAKEM_NOTU metni>" })`. (`ATOLYE_GITMEYEN` varsayılanı yalnız `notSent` verilmeyen araçlarda kullanılır.)

Run: `cd apps/hub && ev evals/lib evals/tools evals/runner.selftest.eval.ts` → tümü PASS (sayı 1A ile aynı ya da fazla).

- [ ] **Step 6: Lint, tip, commit**

```bash
cd apps/hub && node_modules/.bin/eslint evals && npm run typecheck:evals
git add apps/hub/evals/lib/adapterFactory.ts apps/hub/evals/lib/adapterFactory.selftest.eval.ts apps/hub/evals/tools/studio/social-story apps/hub/evals/tools/atolye/bep
git commit -m "feat(evals): studioAdapter/atolyeAdapter fabrikaları; referans adaptörler fabrikaya geçti"
```

---

### Task 3: Tohumlu rastgelelik (ALS-bilinçli `Math.random`)

**Files:**
- Create: `apps/hub/evals/lib/seed.ts`
- Test: `apps/hub/evals/lib/seed.selftest.eval.ts`
- Modify: `apps/hub/evals/lib/evalContext.ts` (`CaseStore.rng?` alanı)

Üretim kodu üç yerde rastgele seçim yapar: `articulation.selectWordsMulti` (artikülasyon + sesletim rotası, `rng` varsayılanı `Math.random`), `articulation.selectWords` (sesletim çeldiricileri) ve sesletim rotasındaki ham `Math.random` (Fisher–Yates). Üçü de `Math.random`'a iner. Çözüm: eval sürecinde `Math.random`, vaka bağlamı (`als`) varsa vakanın kimliğinden tohumlanmış bir üreteci kullanır; bağlam yoksa özgün `Math.random`'a düşer. Aynı vaka → her kolda ve her tekrarda AYNI kelimeler (tohum tekrar numarasını İÇERMEZ: tekrarlar modelin değişkenliğini ölçer, kelimelerin değil). 1A'daki `evals/articulation/seededBank.ts` yalnız `selectWordsMulti`'yi sarıyordu; bu yaklaşım onu gereksiz kılar (Task 7'de silinir).

- [ ] **Step 1: Başarısız testi yaz**

```ts
// apps/hub/evals/lib/seed.selftest.eval.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { als, type CaseStore } from "./evalContext";
import { fnv1a, installSeededRandom, mulberry32, seededRandom } from "./seed";

const store = (caseId: string): CaseStore => ({
  caseId, rep: 0, fixture: null, exchangeDir: "/tmp", calls: [], pending: [], apiError: null, saved: null,
  refunded: false, deadline: Infinity, retries: { count: 0 },
});
const draw = (caseId: string, rep = 0, n = 5) => als.run({ ...store(caseId), rep }, () => Array.from({ length: n }, () => Math.random()));

describe("tohumlu rastgelelik", () => {
  let restore: () => void;
  beforeAll(() => { restore = installSeededRandom(); });
  afterAll(() => restore());

  it("fnv1a/mulberry32 deterministik, [0,1) aralığında", () => {
    expect(fnv1a("abc")).toBe(fnv1a("abc"));
    expect(fnv1a("abc")).not.toBe(fnv1a("abd"));
    const r = mulberry32(42);
    const xs = Array.from({ length: 1000 }, r);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(new Set(xs).size).toBeGreaterThan(990);
  });
  it("aynı vaka → aynı dizi (tekrardan bağımsız); farklı vaka → farklı dizi", () => {
    expect(draw("art-01", 0)).toEqual(draw("art-01", 1));
    expect(draw("art-01")).not.toEqual(draw("art-02"));
  });
  it("vaka bağlamı yokken özgün Math.random çalışır", () => {
    const a = Math.random();
    const b = Math.random();
    expect(a).not.toBe(b);
  });
  it("seededRandom bağlam dışında null döner; restore özgün fonksiyonu geri koyar", () => {
    expect(seededRandom()).toBeNull();
    restore();
    expect(Math.random.name).not.toBe("evalSeededRandom");
    restore = installSeededRandom();
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `cd apps/hub && ev evals/lib/seed.selftest.eval.ts` → FAIL (modül yok)

- [ ] **Step 3: `evalContext.ts`'e alan ekle, `seed.ts`'i yaz**

`evalContext.ts` `CaseStore` içine (genHash'ten sonra):
```ts
  /** Vaka kimliğinden tohumlanmış rastgele üreteç (seed.ts tembel kurar); Math.random yerleştirmesi bunu kullanır. */
  rng?: () => number;
```

```ts
// apps/hub/evals/lib/seed.ts
import { als } from "./evalContext";

/* Eval sürecinde rastgelelik vakaya göre tohumlanır: kelime bankası seçimi (articulation.selectWords*) ve
   sesletim rotasının ham Math.random'ı aynı vakada her kolda/tekrarda aynı sonucu verir. Tohum = fnv1a(vaka kimliği);
   tekrar numarası tohuma GİRMEZ. Bağlam dışında (vitest, backoff jitter'ı dışarıda) özgün Math.random çalışır. */

export function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Vaka bağlamındaysa vakanın üretecini (gerekirse kurarak) döner; değilse null. */
export function seededRandom(): (() => number) | null {
  const store = als.getStore();
  if (!store) return null;
  store.rng ??= mulberry32(fnv1a(store.caseId));
  return store.rng;
}

const original = Math.random;

/** `Math.random`'ı ALS-bilinçli sürümle değiştirir; geri alma fonksiyonu döner. İki kez kurulursa ikincisi no-op. */
export function installSeededRandom(): () => void {
  if (Math.random.name === "evalSeededRandom") return () => {};
  const evalSeededRandom = () => (seededRandom() ?? original)();
  Object.defineProperty(evalSeededRandom, "name", { value: "evalSeededRandom" });
  Math.random = evalSeededRandom;
  return () => {
    Math.random = original;
  };
}
```

- [ ] **Step 4: Testleri çalıştır** → `ev evals/lib/seed.selftest.eval.ts` PASS (4)

- [ ] **Step 5: Lint, tip, commit**

```bash
cd apps/hub && node_modules/.bin/eslint evals && npm run typecheck:evals
git add apps/hub/evals/lib/seed.ts apps/hub/evals/lib/seed.selftest.eval.ts apps/hub/evals/lib/evalContext.ts
git commit -m "feat(evals): vakaya tohumlanmış Math.random (banka seçimi ve çeldiriciler kollar arasında aynı)"
```

---

### Task 4: Shim'de `tool_use` taklidi; koşturucuda rumuz deseni ve `rawText`

**Files:**
- Modify: `apps/hub/evals/lib/shim.ts` (`toExchangeRequest`, `viaExchange`)
- Modify: `apps/hub/evals/lib/core.ts` (`responseText`)
- Modify: `apps/hub/evals/lib/runner.ts` (iki satır: rumuz regex'i, `rawText`)
- Test: `apps/hub/evals/lib/shim.selftest.eval.ts` (ekleme), `apps/hub/evals/runner.selftest.eval.ts` (ekleme)

Kart üreticisi `tools: [CARD_TOOL], tool_choice: { type: "tool", name: "emit_card" }` ile çağırır; yanıt bir `tool_use` bloğudur. Alt-ajan modunda bunu taklit etmek için: tek araç + zorunlu seçim → istek `<output_schema>` bloğuyla (aracın `input_schema`'sı) yazılır, yanıt JSON çözülür ve `tool_use` bloğu kurulur. Çözülemezse yanıt kenara alınır ve istek aynı koşuda yeniden listelenir (hakemdeki `judge_parse` deseni). Koşturucu `rawText`'i metin bloklarından alır; `tool_use` yanıtında metin bloğu yoktur → `responseText(res)` metin yoksa ilk `tool_use` girdisinin JSON'unu döner (iki arka uçta da aynı). Rumuz deseni: kart prompt'u `- İsim: <rumuz>`, profil prompt'u `Öğrenci adı: <rumuz>` yazar; koşturucunun `/- (?:Ad|Öğrenci): …/` deseni bunları bulamaz ve `rumuz bulunamadı` ile düşer.

- [ ] **Step 1: Shim testini yaz** (`lib/shim.selftest.eval.ts` içine yeni `describe`)

```ts
describe("tool_use taklidi (alt-ajan)", () => {
  const TOOL = { name: "emit_card", description: "kart", input_schema: { type: "object", properties: { title: { type: "string" } }, required: ["title"] } };
  const params = (dir: string) => ({
    model: "claude-sonnet-4-6", max_tokens: 4096, system: "S", tools: [TOOL], tool_choice: { type: "tool", name: "emit_card" },
    messages: [{ role: "user", content: "U" }],
  });
  it("istek şemayla yazılır; JSON yanıt tool_use bloğu olur", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "shim-tool-"));
    const store = makeStore(dir); // dosyadaki mevcut yardımcı
    await expect(als.run(store, () => createMessage(params(dir)))).rejects.toMatchObject({ failureClass: "pending" });
    const md = readFileSync(path.join(dir, "c1_rep0.gen.request.md"), "utf8");
    expect(md).toContain("<output_schema>");
    expect(md).toContain('"title"'); // şema metni
    writeFileSync(path.join(dir, "c1_rep0.gen.response.txt"), '```json\n{"title":"Kart"}\n```');
    const res = await als.run(makeStore(dir), () => createMessage(params(dir)));
    expect(res.stop_reason).toBe("tool_use");
    expect(res.content[0]).toMatchObject({ type: "tool_use", name: "emit_card", input: { title: "Kart" } });
  });
  it("bozuk JSON: yanıt kenara alınır, istek yeniden listelenir, tool_parse fırlar", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "shim-tool-"));
    await expect(als.run(makeStore(dir), () => createMessage(params(dir)))).rejects.toMatchObject({ failureClass: "pending" });
    writeFileSync(path.join(dir, "c1_rep0.gen.response.txt"), "bu json değil");
    const store = makeStore(dir);
    await expect(als.run(store, () => createMessage(params(dir)))).rejects.toMatchObject({ failureClass: "tool_parse" });
    expect(existsSync(path.join(dir, "c1_rep0.gen.response.rejected.txt"))).toBe(true);
    expect(store.pending).toEqual(["c1_rep0.gen"]);
  });
  it("birden çok araç ya da serbest seçim desteklenmez", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "shim-tool-"));
    const p = { ...params(dir), tools: [TOOL, { ...TOOL, name: "x" }] };
    await expect(als.run(makeStore(dir), () => createMessage(p))).rejects.toMatchObject({ failureClass: "harness_error" });
    const q = { ...params(dir), tool_choice: { type: "auto" } };
    await expect(als.run(makeStore(dir), () => createMessage(q))).rejects.toMatchObject({ failureClass: "harness_error" });
  });
});
```

(`makeStore(dir)` dosyada yoksa ekle: `caseId: "c1", rep: 0, exchangeDir: dir`, diğer alanlar boş; `runtime.backend = "subagent"`.)

- [ ] **Step 2: Koşturucu testini yaz** (`runner.selftest.eval.ts` içine)

Mevcut "rumuz okunamazsa … harness_error" testinin yanına: sahte route'un kullanıcı prompt'u `- İsim: Hazal` ve ayrı bir vakada `Öğrenci adı: Hazal\nYaşı: 7` yazdığında koşunun `rumuz bulunamadı` vermediğini ve `meta.alias_found === true` olduğunu sına (dosyadaki sahte adaptör/route kalıbıyla; iki `it`).

Ayrıca `core.selftest.eval.ts`'e (yoksa oluştur):
```ts
import { responseText } from "./core";
it("responseText: metin blokları; yoksa tool_use girdisi", () => {
  expect(responseText({ content: [{ type: "text", text: "a" }, { type: "text", text: "b" }] } as never)).toBe("ab");
  expect(responseText({ content: [{ type: "tool_use", id: "t", name: "emit_card", input: { title: "K" } }] } as never)).toBe('{"title":"K"}');
  expect(responseText({ content: [] } as never)).toBe("");
});
```

- [ ] **Step 3: Testleri çalıştır, başarısız olduklarını gör** → `ev evals/lib/shim.selftest.eval.ts evals/lib/core.selftest.eval.ts evals/runner.selftest.eval.ts` FAIL

- [ ] **Step 4: Uygula**

`core.ts` (parseSse'nin altına):
```ts
/** Modelin ham metni: metin blokları; metin yoksa ilk `tool_use` girdisinin JSON'u (kart üreticisi); yoksa "". */
export function responseText(res: { content: Array<{ type: string; text?: string; input?: unknown }> }): string {
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  if (text) return text;
  const tool = res.content.find((b) => b.type === "tool_use");
  return tool ? JSON.stringify(tool.input) : "";
}
```

`shim.ts`:
```ts
/** Tek araç + zorunlu seçim: alt-ajan modunda `<output_schema>` olarak yazılır, yanıt `tool_use` bloğuna çevrilir. */
function forcedTool(p: Record<string, unknown>): { name: string; schema: unknown } | null {
  if (!p.tools) return null;
  const tools = p.tools as Array<{ name: string; input_schema: unknown }>;
  const choice = p.tool_choice as { type?: string; name?: string } | undefined;
  const forced = choice?.type === "any" || (choice?.type === "tool" && choice.name === tools[0]?.name);
  if (tools.length !== 1 || !forced) {
    throw new HarnessError("alt-ajan modu yalnız tek araç + zorunlu seçimi (tool_choice tool/any) destekler", "harness_error");
  }
  return { name: tools[0]!.name, schema: tools[0]!.input_schema };
}
```
`toExchangeRequest`: `const tool = runtime.backend === "subagent" ? forcedTool(p) : null;` ve `schema: tool?.schema ?? format?.schema` (format şeması yoksa aracınki).
`viaExchange`: koruma `|| p.tools` kısmını kaldır (araç artık `forcedTool` ile denetlenir); yanıt okunduktan sonra:
```ts
  const tool = forcedTool(p);
  if (tool) {
    const m = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) ?? text.match(/(\{[\s\S]*\})/);
    let input: unknown;
    try {
      input = JSON.parse(m?.[1] ?? text);
    } catch {
      rejectResponse(store.exchangeDir, req.key, req.role);
      const entry = `${req.key}.${req.role}`;
      if (!store.pending.includes(entry)) store.pending.push(entry);
      throw new HarnessError("araç girdisi (tool_use) JSON olarak çözülemedi", "tool_parse");
    }
    const base = messageFromText(text, `${req.agentModel}@subagent`, estimateTokens(req.system + req.user));
    const res = { ...base, stop_reason: "tool_use", content: [{ type: "tool_use", id: "toolu_subagent", name: tool.name, input }] } as unknown as Anthropic.Message;
    store.calls.push({ request: p, response: res, latency_s: 0, backend: "subagent" });
    return res;
  }
```
(`rejectResponse` exchange'ten içe aktarılır.) API yolunda değişiklik yok: gerçek yanıt zaten `tool_use` taşır, düşünme filtresi onu korur.

`runner.ts`:
- `const rawText = responseText(res);` (eski üç satırlık filtre yerine; `responseText` core'dan).
- Rumuz: `const alias = fixture ? (/(?:- (?:Ad|Öğrenci|İsim)|Öğrenci adı): ([^,\n]+)/.exec(userPrompt)?.[1]?.trim() ?? null) : null;`

- [ ] **Step 5: Tüm öz-testleri çalıştır** → `ev evals/lib evals/tools evals/runner.selftest.eval.ts` PASS

- [ ] **Step 6: Lint, tip, commit**

```bash
cd apps/hub && node_modules/.bin/eslint evals && npm run typecheck:evals
git add apps/hub/evals/lib apps/hub/evals/runner.selftest.eval.ts
git commit -m "feat(evals): alt-ajanda tool_use taklidi; rumuz deseni kart/profil prompt'larını kapsar; rawText tool_use girdisini alır"
```

---

### Task 5: Ortak taklit modülü (`mocks.setup.ts`) + tohum kurulumu

**Files:**
- Create: `apps/hub/evals/mocks.setup.ts`
- Modify: `apps/hub/evals/run.eval.ts`, `apps/hub/evals/runner.selftest.eval.ts` (vi.mock bloğu silinir, `import "./mocks.setup";` ilk satır olur)

Doğrulandı (bu oturumda deneme testiyle): içe aktarılan bir yardımcı modüldeki `vi.mock(...)` çağrıları da hoist edilir ve dinamik `import()` ile yüklenen rotaları yakalar. `installSeededRandom()` burada bir kez kurulur.

- [ ] **Step 1: `mocks.setup.ts`'i yaz**

```ts
// apps/hub/evals/mocks.setup.ts
import { vi } from "vitest";
import { installSeededRandom } from "./lib/seed";

/* Koşturucunun ve koşturucu öz-testinin ortak taklitleri. vi.mock hoist edilir; bu modül rotalardan
   ÖNCE içe aktarılmalıdır (`import "./mocks.setup";` dosyanın ilk satırı). Gerçek DB'ye hiç dokunulmaz. */

vi.mock("@studio/auth", async () => (await import("./lib/mocks/studio")).studioAuthMock);
vi.mock("@/generated/studio/client", () => ({ ToolType: {} }));
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: () => ({ allowed: true, retryAfter: 0 }),
  rateLimitResponse: () => new Response("rate", { status: 429 }),
}));
vi.mock("@studio/lib/usage", () => ({ logUsage: () => {} }));
vi.mock("@studio/lib/generateWordImage", () => ({ lookupCachedWordImage: async () => null }));
vi.mock("@studio/lib/credits", async () => (await import("./lib/mocks/studio")).studioCreditsMock);
vi.mock("@studio/lib/db", async () => ({ prisma: (await import("./lib/mocks/studio")).studioPrismaMock() }));
vi.mock("@studio/lib/anthropic", async () => {
  const { createMessage } = await import("./lib/shim");
  return { anthropic: { messages: { create: createMessage } }, MODEL: "claude-sonnet-4-6" };
});
vi.mock("@atolye/auth", async () => (await import("./lib/mocks/atolye")).atolyeAuthMock);
vi.mock("@atolye/lib/credits", async () => (await import("./lib/mocks/atolye")).atolyeCreditsMock);
vi.mock("@atolye/lib/cases", async () => (await import("./lib/mocks/atolye")).atolyeCasesMock);
vi.mock("@ludenlab/ai", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@ludenlab/ai")>();
  const { definePromptViaShim } = await import("./lib/mocks/ludenlabAi");
  return { ...orig, definePrompt: definePromptViaShim };
});

installSeededRandom();
```

- [ ] **Step 2: `run.eval.ts` ve `runner.selftest.eval.ts`'teki vi.mock bloklarını sil; her ikisinin ilk satırı `import "./mocks.setup";` olsun** (run.eval.ts'teki açıklama bloğundaki "Taklitler burada kaydedilir" cümlesini "Taklitler `mocks.setup.ts`'te" diye güncelle.)

- [ ] **Step 3: Öz-testleri çalıştır** → `ev evals/runner.selftest.eval.ts evals/lib/mocks` PASS (koşturucu öz-testi gerçek rotaları taklitlerle çalıştırır; taklit tutmazsa Prisma gerçek DB'ye gitmeye çalışır ve test düşer — o zaman `mocks.setup.ts`'in ilk import olduğunu doğrula)

- [ ] **Step 4: Prisma taklidine kart üreticisi ve profil için eksikleri ekle** (`lib/mocks/studio.ts`): `curriculumGoal.findMany` zaten `[]`; `student.findUnique` tüm satırı döner (profil `findUnique({where:{id}})` select'siz çağırır → `pick(row, undefined)` tüm satır: doğru). `card.findMany` select'inde `difficulty` var: doğru. Değişiklik gerekmiyorsa bu adımı "kontrol edildi" diye geç.

- [ ] **Step 5: Lint, tip, commit**

```bash
cd apps/hub && node_modules/.bin/eslint evals && npm run typecheck:evals
git add apps/hub/evals/mocks.setup.ts apps/hub/evals/run.eval.ts apps/hub/evals/runner.selftest.eval.ts
git commit -m "refactor(evals): ortak taklit modülü mocks.setup.ts; tohumlu Math.random koşturucuda kurulu"
```

---

### Task 6: Fikstürler — 6 Studio + 6 Atölye + artikülasyon öğrencileri; rumuz çakışma testi

**Files:**
- Modify: `apps/hub/evals/fixtures/studio.json` (+4), `apps/hub/evals/fixtures/atolye.json` (+4)
- Create: `apps/hub/evals/lib/piiMask.ts` (+ selftest); Modify: `apps/hub/evals/lib/shim.ts`, `apps/hub/evals/lib/runner.ts` (maske uygulanır)
- Create: `apps/hub/evals/fixtures/studio-articulation.json` (eski artikülasyon vakalarının 12 öğrencisi; yalın)
- Modify: `apps/hub/evals/lib/fixtures.ts` (`studioFixtures()` iki dosyayı birleştirir)
- Test: `apps/hub/evals/lib/fixtures.selftest.eval.ts` (ekleme)

Fikstürler sentetiktir. Rumuz kuralı FİKSTÜR İÇİDİR (uygulama sırasında karar: fikstürler arası çakışma işlevsel değildir — her vaka tek öğrenci çizer, PII kapısı ve `rumuzYok` yalnız o vakanın adına/rumuzuna bakar; soyadı değiştirmek 1A referanslarını ve gerçek Sonnet 4.6 artikülasyon referanslarını geçersiz kılardı): bir fikstürün rumuzu (a) kendi gerçek ilk adına eşit olamaz, (b) kendi serbest metinlerinde (ad, tanı, notlar, profil, güçlü yönler, ilgi alanları, belgeler) tam sözcük olarak geçemez, (c) çocuk materyalinde doğal geçebilecek gündelik bir sözcük olamaz (`GUNLUK_SOZCUK_RUMUZ` yasak listesi). Rumuz üretimde `pickAlias(ad, { scope: therapistId, taken })` ile seçilir; taklitte `therapistId = "eval-uzman"`, `taken = []` (Atölye: `pickAlias(rumuz, { scope: accountId })`, accountId aynı). Mevcut fikstürlerin adları DEĞİŞMEZ.

- [ ] **Step 1: Çakışma testini yaz** (`fixtures.selftest.eval.ts` içine; 1A'daki fikstürler-arası "rumuzlar hiçbir fikstürün gerçek adıyla çakışmaz" testi KALDIRILIR)

```ts
import { pickAlias } from "@ludenlab/ai";
import { atolyeFixtures, studioFixtures } from "./fixtures";
import { adGeciyorMu } from "./sharedChecks";

const kucuk = (s: string) => s.toLocaleLowerCase("tr-TR");
const ilk = (s: string) => kucuk(s.trim().split(/\s+/)[0]!);
/** Çocuk materyalinde doğal geçebilecek gündelik sözcükler: rumuz olamaz (restoreName cümle başındaki gündelik sözcüğü gerçek ada çevirirdi). */
const GUNLUK_SOZCUK_RUMUZ = ["Tuna", "Pınar", "Yağmur", "Ela"].map(kucuk); // ALIAS_POOL'da gerçekten bulunan gündelik sözcükler
// (b) için `adGeciyorMu` (sharedChecks): kesmeli/kesmesiz Türkçe ekleri de yakalar ("Tuna'nın", "Tunaya").
/** (c) kuralından muaf: gerçek Sonnet 4.6 referansı tam adı içerir, soyadı değiştirilemez; rumuz çıktıda restoreName ile zaten gerçek ada çevrilir. */
const GUNLUK_SOZCUK_ISTISNA = new Set(["art-zeynep"]);

it("rumuz kendi vakasının gerçek metniyle çakışmaz ve gündelik sözcük değildir", () => {
  const sorunlar: string[] = [];
  for (const f of Object.values(studioFixtures())) {
    const rumuz = kucuk(pickAlias(f.name, { scope: "eval-uzman", taken: [] }));
    const metin = [f.name, f.diagnosis ?? "", f.notes ?? "", f.aiProfile ?? "", ...f.recentCards.map((k) => k.title)].join("\n");
    if (rumuz === ilk(f.name)) sorunlar.push(`${f.id}: rumuz gerçek ad (${rumuz})`);
    if (adGeciyorMu(metin, rumuz)) sorunlar.push(`${f.id}: rumuz kendi metninde geçiyor (${rumuz})`);
    if (!GUNLUK_SOZCUK_ISTISNA.has(f.id) && GUNLUK_SOZCUK_RUMUZ.includes(rumuz)) sorunlar.push(`${f.id}: rumuz gündelik sözcük (${rumuz}) — soyadını değiştir`);
  }
  for (const f of Object.values(atolyeFixtures())) {
    const rumuz = kucuk(pickAlias(f.code, { scope: "eval-uzman" }));
    const metin = [f.code, f.gucluYonler ?? "", f.ilgiAlanlari ?? "", ...f.documents.map((d) => d.content)].join("\n");
    if (rumuz === ilk(f.code)) sorunlar.push(`${f.id}: rumuz gerçek ad (${rumuz})`);
    if (adGeciyorMu(metin, rumuz)) sorunlar.push(`${f.id}: rumuz kendi metninde geçiyor (${rumuz})`);
    if (GUNLUK_SOZCUK_RUMUZ.includes(rumuz)) sorunlar.push(`${f.id}: rumuz gündelik sözcük (${rumuz}) — soyadını değiştir`);
  }
  expect(sorunlar).toEqual([]);
});

it("studio fikstürleri iki dosyadan birleşir; artikülasyon öğrencileri yalın (kart/özet yok)", () => {
  const all = studioFixtures();
  expect(Object.keys(all)).toEqual(expect.arrayContaining(["stu-ela", "stu-kerem", "stu-defne", "stu-yigit", "stu-ecem", "stu-sibel", "art-kerem", "art-duru"]));
  expect(Object.keys(all).filter((k) => k.startsWith("art-"))).toHaveLength(12);
  for (const f of Object.values(all).filter((x) => x.id.startsWith("art-"))) {
    expect(f.recentCards).toEqual([]);
    expect(f.lastSummary).toBeNull();
    expect(f.notes).toBeNull();
    expect(f.aiProfile).toBeNull();
    expect(f.curriculumTitles).toEqual([]);
    expect(f.completedGoalCodes).toEqual([]);
  }
});

it("iki Studio dosyasında aynı kimlik varsa yükleyici config hatası verir", () => {
  // Birleştirme sessizce ezmesin: `studioFixtures()` iki dosyada ortak anahtar bulursa HarnessError("config") fırlatır.
  expect(() => studioFixtures()).not.toThrow(); // mevcut dosyalar çakışmasız
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör** → FAIL (fikstürler yok)

- [ ] **Step 3: `fixtures.ts`: iki dosyayı birleştir**

```ts
export function studioFixtures(): Record<string, StudioFixture> {
  // Artikülasyon düzeneğinden taşınan 12 öğrenci ayrı dosyada: zengin 6 fikstür okunur kalsın.
  const a = load<StudioFixture>("studio.json");
  const b = load<StudioFixture>("studio-articulation.json");
  const ortak = Object.keys(a).filter((k) => k in b);
  if (ortak.length) throw new HarnessError(`Studio fikstür kimliği iki dosyada da var: ${ortak.join(", ")}`, "config");
  return { ...a, ...b };
}
```

- [ ] **Step 4: `studio.json`'a 4 öğrenci ekle** (mevcut iki kayıt değişmez; tarihler `YYYY-MM-DDT12:00:00`)

```json
"stu-defne": {
  "id": "stu-defne", "name": "Defne Korkmaz", "birthDate": "2019-01-22", "workArea": "hearing",
  "diagnosis": "İki taraflı ileri derecede sensörinöral işitme kaybı; 2 yaşında koklear implant (sağ), solda işitme cihazı. /s/–/ş/ ve /t/–/k/ ayrımında zorlanıyor.",
  "notes": "Dudak okumaya eğilimli; gürültülü ortamda yorulunca cihazı çıkarmak istiyor. Kelebek ve boyama sever. Ailesi akşamları birlikte resimli kitap okuyor.",
  "aiProfile": null,
  "recentCards": [
    { "title": "Oturum Özeti — Defne — 3 Ekim 2026", "toolType": "SESSION_SUMMARY", "difficulty": "medium", "createdAt": "2026-10-03T12:00:00" },
    { "title": "/s/ sesi kelime başında — 10 kelime", "toolType": "ARTICULATION_DRILL", "difficulty": "easy", "createdAt": "2026-10-03T12:00:00" },
    { "title": "Duygular panosu (6 hücre)", "toolType": "COMMUNICATION_BOARD", "difficulty": "easy", "createdAt": "2026-09-25T12:00:00" }
  ],
  "lastSummary": {
    "overallAssessment": "Sessiz ortamda /s/ sesini kelime başında %70 doğrulukla üretti; gürültü eklenince %40'a düştü. İşitsel ayrım oyununda /s/–/ş/ çiftlerini 6/10 ayırt etti.",
    "nextSessionPlan": "Arka plan gürültüsünü kademeli ekle; /s/–/ş/ minimal çiftlerini resimli kartla sürdür.",
    "overallPerformance": "progressing",
    "behaviorNotes": null,
    "createdAt": "2026-10-03T12:00:00"
  },
  "curriculumTitles": ["İşitsel algı ve ayırt etme"],
  "completedGoalCodes": []
},
"stu-yigit": {
  "id": "stu-yigit", "name": "Yiğit Aras", "birthDate": "2022-02-05", "workArea": "speech",
  "diagnosis": "Fonolojik süreç: öne alma (/k/→/t/, /g/→/d/). Anlaşılırlık yabancılarca yaklaşık %60.",
  "notes": "Çok hareketli; masada 5 dakikadan uzun kalmıyor. Araba ve itfaiye oyuncaklarıyla oynarken konuşkan.",
  "aiProfile": null,
  "recentCards": [
    { "title": "Ses avı: /k/ sesi mutfakta", "toolType": "PHONATION_ACTIVITY", "difficulty": "easy", "createdAt": "2026-09-30T12:00:00" }
  ],
  "lastSummary": null,
  "curriculumTitles": [],
  "completedGoalCodes": []
},
"stu-ecem": {
  "id": "stu-ecem", "name": "Ecem Tuncer", "birthDate": "2014-03-18", "workArea": "language",
  "diagnosis": "Gelişimsel dil bozukluğu; anlatı becerilerinde ve karmaşık cümle kurmada zorluk. Okuduğunu anlama sınıf düzeyinin iki yıl gerisinde.",
  "notes": "Ecem utangaç, hata yapmaktan çekiniyor; yazarak yanıt vermeyi konuşmaya tercih ediyor. Kedilere ve çizgi romana meraklı. Türkçe öğretmeni ödevlerde ek süre veriyor.",
  "aiProfile": "## Kavramsal Arka Plan\n\n### Tanının Klinik Açıklaması\nGelişimsel dil bozukluğu; dilin anlaşılması ve kullanılmasında, başka bir gelişimsel durumla açıklanamayan kalıcı güçlüktür. Bu öğrencide anlatı örgütleme ve bağlaçlı karmaşık cümleler öne çıkan alanlardır.\n\n## Uzmana Öneriler\n\n### Öncelikli Çalışma Alanları\n- Olay sıralama ve nedensel bağlaç kullanımı (çünkü, bu yüzden)\n- Okuduğunu anlamada görsel düzenleyiciler\n\n### Dikkat Edilmesi Gereken Noktalar\n- Sözlü yanıt baskısı kaygıyı artırıyor; önce yazılı/çizili taslak\n",
  "recentCards": [
    { "title": "Oturum Özeti — Ecem — 2 Ekim 2026", "toolType": "SESSION_SUMMARY", "difficulty": "medium", "createdAt": "2026-10-02T12:00:00" },
    { "title": "Çizgi roman karelerini sıralama", "toolType": "MATCHING_GAME", "difficulty": "medium", "createdAt": "2026-10-02T12:00:00" },
    { "title": "Haftalık plan 28 Eylül – 4 Ekim", "toolType": "WEEKLY_PLAN", "difficulty": "medium", "createdAt": "2026-09-27T12:00:00" },
    { "title": "Ev ödevi: günün üç olayını anlatma", "toolType": "HOMEWORK_MATERIAL", "difficulty": "medium", "createdAt": "2026-09-20T12:00:00" }
  ],
  "lastSummary": {
    "overallAssessment": "Dört kareli olay dizisini 'önce/sonra' ile %80 doğru sıraladı; 'çünkü' bağlacını yönlendirmeyle 3/5 cümlede kullandı.",
    "nextSessionPlan": "Bağlaç kullanımını yönlendirmesiz üretime taşı; okuma parçasında neden-sonuç soruları.",
    "overallPerformance": "on_target",
    "behaviorNotes": null,
    "createdAt": "2026-10-02T12:00:00"
  },
  "curriculumTitles": ["Anlatı becerileri", "Okuduğunu anlama"],
  "completedGoalCodes": ["4.2", "4.3"]
},
"stu-sibel": {
  "id": "stu-sibel", "name": "Sibel Ünal", "birthDate": "1992-07-30", "workArea": "speech",
  "diagnosis": "Sol hemisfer inmesi sonrası hafif dizartri (8 ay önce). Konuşma hızı yavaş, /r/ ve /l/ zayıf, uzun cümlelerde nefes yetersiz.",
  "notes": "Öğretmen; işe dönmek istiyor, sınıfta yüksek sesle okuma hedefi var. Egzersizleri evde düzenli yapıyor; eşi destekliyor.",
  "aiProfile": null,
  "recentCards": [],
  "lastSummary": null,
  "curriculumTitles": [],
  "completedGoalCodes": []
}
```

- [ ] **Step 5: `studio-articulation.json`'ı yaz** (eski `evals/articulation/cases.json`'daki 12 satır içi öğrenci; doğum yılı = 2026 − yaş, gün `06-15`; `name`, `workArea`, `diagnosis` AYNEN eski vakadan kopyalanır; `notes/aiProfile: null`, `recentCards: []`, `lastSummary: null`, `curriculumTitles: []`, `completedGoalCodes: []`)

| id | name | yaş → birthDate | workArea | eski vaka |
|---|---|---|---|---|
| art-kerem | Kerem Ateş | 5 → 2021-06-15 | speech | art-01 |
| art-duru | Duru Şahin | 7 → 2019-06-15 | hearing | art-02 |
| art-emir | Emir Ali | 4 → 2022-06-15 | speech | art-03 |
| art-ada | Ada Nur Çelik | 8 → 2018-06-15 | language | art-05 |
| art-yusuf | Yusuf Demir | 6 → 2020-06-15 | speech | art-06 |
| art-zeynep | Zeynep Kaya | 6 → 2020-06-15 | speech | art-07 |
| art-mert | Mert Özdemir | 5 → 2021-06-15 | speech | art-09 |
| art-elif | Elif Yıldız | 9 → 2017-06-15 | speech | art-10 |
| art-can | Can Arslan | 4 → 2022-06-15 | speech | art-11 |
| art-nehir | Nehir Koç | 11 → 2015-06-15 | speech | art-12 |
| art-berk | Berk Aydın | 12 → 2014-06-15 | speech | art-14 |
| art-selin | Selin Güneş | 34 → 1992-06-15 | speech | art-15 |

Diagnosis metinleri `evals/articulation/cases.json`'dan (Task 7 silmeden önce) birebir alınır. Adlar ve soyadlar DEĞİŞMEZ (gerçek referanslar tam adı içerir; art-zeynep (c) kuralından açıkça muaftır); yeni fikstürlerde test (c) kuralında düşerse soyadı değiştirilir (case-zeynep "Zeynep Korkmaz" → rumuz Pınar → "Zeynep Kocaman").

- [ ] **Step 6: `atolye.json`'a 4 vaka ekle**

```json
"case-efe": {
  "id": "case-efe", "code": "Efe Kaplan", "kademe": "okul_oncesi", "yas": 5,
  "taniProfili": ["dehb_hiperaktif"], "guclukDuzeyi": "hafif",
  "gucluYonler": "Hareketli oyunlarda doğal lider; şarkı sözlerini iki dinlemede öğreniyor; yetişkinle göz teması ve sohbeti güçlü.",
  "ilgiAlanlari": "Dinozorlar, koşmaca, davul",
  "mebBolumler": ["1.5"],
  "documents": [
    { "type": "davranis_destek_plani", "createdAt": "2026-09-20T12:00:00",
      "content": "## Hedef davranış\nEtkinlik geçişlerinde (özellikle oyun → masa) yere yatma ve bağırma; günde 3–4 kez, 2–5 dk.\n\n### ABC özeti\n| Öncül | Davranış | Sonuç |\n|---|---|---|\n| Oyunun bitirilmesi istenir | Yere yatar, bağırır | Geçiş ertelenir, ilgi alır |\n\n### İşlev hipotezi\nKaçınma (tercih edilen etkinliği bırakmama) + dikkat.\n\n### Önleyici düzenlemeler\n- 2 dakika önceden görsel kum saati; 'son tur' uyarısı\n- Geçişte taşıma görevi (dinozoru masaya o götürür)\n\n⚠️ Bu metin yapay zekâ ile üretilmiş bir TASLAKTIR; uygulanmadan önce ilgili uzman tarafından gözden geçirilip onaylanmalıdır." }
  ]
},
"case-zeynep": {
  "id": "case-zeynep", "code": "Zeynep Kocaman", "kademe": "ilkokul_1_4", "yas": 9,
  "taniProfili": ["disgrafi"], "guclukDuzeyi": "orta",
  "gucluYonler": "Okuma akıcı ve anlama güçlü; sözlü anlatımı zengin; sabırlı ve düzenli.",
  "ilgiAlanlari": "Resim çizmek, hayvanlar (özellikle atlar)",
  "mebBolumler": ["3.5"],
  "documents": [
    { "type": "ilerleme_cizelgesi", "createdAt": "2026-09-29T12:00:00",
      "content": "## Hedef\n10 dakikalık yazma görevinde satır içinde kalarak, harf biçimleri okunaklı 3 cümle yazar.\n\n### Veri toplama çizelgesi\n| Tarih | Ölçüt/Gösterge | Sonuç (% veya sıklık) | Not |\n|---|---|---|---|\n| | Satır içinde kalan kelime oranı | | |\n| | Okunaklı harf oranı | | |\n\n⚠️ Bu metin yapay zekâ ile üretilmiş bir TASLAKTIR; uygulanmadan önce ilgili uzman tarafından gözden geçirilip onaylanmalıdır." }
  ]
},
"case-tolga": {
  "id": "case-tolga", "code": "Tolga Aksoy", "kademe": "lise_9_uzeri", "yas": 15,
  "taniProfili": ["dehb_kombine", "diskalkuli"], "guclukDuzeyi": "belirgin",
  "gucluYonler": "Strateji oyunlarında planlama yapabiliyor; basketbolda takım kaptanı; teknolojiyi hızlı öğreniyor.",
  "ilgiAlanlari": "Basketbol, oyun tasarımı, rap müzik",
  "mebBolumler": [],
  "documents": [
    { "type": "uyarlama_onerisi", "createdAt": "2026-09-10T12:00:00",
      "content": "## Bağlam özeti\n9. sınıf, kaynaştırma; matematik ve fizikte sınav süresi yetmiyor, çok adımlı işlemlerde satır atlıyor.\n\n## Sunum uyarlamaları\n- Problem metni adım kutularına bölünür\n- Formül kartı masada\n\n## Değerlendirme/sınav uyarlamaları\n- %50 ek süre; hesap için boş ara kâğıtlar; hesap makinesi izni\n\n⚠️ Bu metin yapay zekâ ile üretilmiş bir TASLAKTIR; uygulanmadan önce ilgili uzman tarafından gözden geçirilip onaylanmalıdır." },
    { "type": "veli_mektubu", "createdAt": "2026-09-24T12:00:00",
      "content": "Sayın Aksoy Ailesi,\n\nTolga'nın bu dönem matematikte adım kutularıyla çalışmaya başladığını ve ilk iki haftada problemleri bırakmadan tamamladığını paylaşmak istedik. Basketbol antrenmanı öncesi 20 dakikalık kısa çalışma düzeni iyi gidiyor.\n\nSaygılarımızla\n\n⚠️ Bu metin yapay zekâ ile üretilmiş bir TASLAKTIR; uygulanmadan önce ilgili uzman tarafından gözden geçirilip onaylanmalıdır." }
  ]
},
"case-melis": {
  "id": "case-melis", "code": "Melis Acar", "kademe": "ortaokul_5_8", "yas": 11,
  "taniProfili": ["disleksi"], "guclukDuzeyi": "hafif",
  "gucluYonler": null, "ilgiAlanlari": null, "mebBolumler": [], "documents": []
}
```

- [ ] **Step 6b: Sabit prompt metnindeki ad-benzeri sözcükler için PII maskesi** (`evals/lib/piiMask.ts` + selftest; `shim.ts` ve `runner.ts`'te üçer satırlık ekleme)

Ürün prompt'larında sabit örnek adlar var: artikülasyon rotasının `SYSTEM_PROMPT`'u "Selin sabah erkenden sahile gitti…" / "Selin sevinçle sandala bindi" örneğini taşır. PII kapısı (`piiKesit`, önek + aksan katlama) bunu art-selin/stu-sibel (ad "Selin") vakalarında gerçek ad sanıp koşuyu durdurur; sızıntı değildir. Çözüm: bilinen sabit parçalar taranmadan önce maskelenir.

```ts
// apps/hub/evals/lib/piiMask.ts
/** Ürün prompt'larının SABİT metnindeki ad-benzeri parçalar: kaynak dosyada birebir geçmeli (selftest doğrular). */
export const PII_MASK_SNIPPETS: Array<{ snippet: string; source: string }> = [
  { snippet: "Selin sabah erkenden sahile gitti", source: "src/app/studio/api/tools/articulation/route.ts" },
  { snippet: "Selin sevinçle sandala bindi", source: "src/app/studio/api/tools/articulation/route.ts" },
];
/** Maskeli metin: parçalar aynı uzunlukta `_` ile değiştirilir (konumlar kayar, kesit mantığı bozulmaz). */
export function maskStatic(text: string): string {
  let out = text;
  for (const { snippet } of PII_MASK_SNIPPETS) out = out.split(snippet).join("_".repeat(snippet.length));
  return out;
}
```
Selftest (`piiMask.selftest.eval.ts`): her `snippet` ilgili `source` dosyasında (apps/hub köküne göre) birebir geçer; `maskStatic` yalnız parçayı maskeler; `piiKesit(maskStatic(SYSTEM_ÖRNEĞİ), "Selin") === null` ama metinde başka bir "Selin" varsa yakalanır. Uygulama: `shim.ts` `piiGate` → `piiKesit(`${maskStatic(systemText(p))}\n${messagesText(p)}`, …)` (yalnız SİSTEM metni maskelenir; kullanıcı metni asla); `runner.ts` ikinci ağ (`.request.md`) ve üçüncü ağ (`metinler(call.request)`) → `maskStatic(...)` uygulanır. Koşturucu öz-testine bir `it`: sistem metninde maske parçası + fikstür adı "Selin" olan sahte rota koşuyu DURDURMAZ; kullanıcı metninde "Selin" olan rota durdurur.

- [ ] **Step 7: Testleri çalıştır** → `ev evals/lib/fixtures.selftest.eval.ts evals/lib/renderStudent.selftest.eval.ts evals/lib/piiMask.selftest.eval.ts evals/runner.selftest.eval.ts` PASS

- [ ] **Step 8: Lint, tip, commit**

```bash
cd apps/hub && node_modules/.bin/eslint evals && npm run typecheck:evals
git add apps/hub/evals/fixtures apps/hub/evals/lib/fixtures.ts apps/hub/evals/lib/fixtures.selftest.eval.ts
git commit -m "feat(evals): 6+6 fikstür, artikülasyon öğrencileri ayrı dosyada, rumuz-gerçek ad çakışma testi"
```

---

### Task 7: Artikülasyon adaptörü — eski düzeneğin taşınması, 16 vaka, gerçek Sonnet 4.6 referanslarının dönüştürülmesi

**Files:**
- Create: `apps/hub/evals/tools/studio/articulation/{adapter.ts,checks.ts,checks.selftest.eval.ts,cases.json}`
- Modify: `apps/hub/evals/tools/registry.ts` (+1 satır), `apps/hub/evals/lib/sharedChecks.ts` (`zorunluKip` taşınır), `apps/hub/evals/tools/studio/social-story/checks.ts` (ZORUNLU'yu paylaşılan modülden alır)
- Delete: `apps/hub/evals/articulation/` (13 izlenen dosya + `bankWords.preview.json`), `apps/hub/vitest.eval.config.ts` açıklamasındaki eski yol
- Dış dizin (gitignore): `.claude/hillclimb/prompt-yukseltme/studio/articulation/baseline/ref/art-01..16` + `source.json`

Ürün hatası (ayrı dalda düzeltildi, bu dalda YOK): öğrenci seçiliyken banka kelimeleri sonradan yazılmaz → `word` düzeyinde `items: []`, `sentence/contextual`'da modelin kendi öğeleri kalır. Referanslar bu davranışla üretildi; kontroller `BANKA_STASH_KAYBI` sabitiyle bunu bilir (düzeltme dala gelince sabit `false` yapılır, art-07/09 yeniden üretilir; bayat bayrak `banka_kaybi_tutarsiz` sert hatasıyla kendini belli eder).

**İnceleme sonrası puanlayıcı kuralları (uygulanan):** rota son çıktıyı işler (hedef harfsiz öğeleri eler, banka kelimelerini yazar), bu yüzden `hedef_harf`, `oge_sayisi` (izole/hece: `min(1, n_raw/itemCount)` oranı) ve kelime düzeyinde `items_bos` MODELİN HAM öğeleri (`raw.items`) üzerinden; `cumle_kelime`, `sonda_eksiz`, `paragraf` (3–5 cümle) son çıktı üzerinden. Banka listesi gövdenin saf fonksiyonudur (`bankaKelimeleri(body)` = `selectWordsMulti(..., mulberry32(fnv1a(JSON.stringify([targetSounds, positions, itemCount]))))`): hakeme `- Banka kelimeleri (n): …` satırı olarak gider ve cümle/bağlam düzeyinde `banka_uyumu` (ham `items[i].word` = `bank[i]` oranı) puanlanır — listeden sapma MODELİN hatasıdır, ürün hatası yalnız "sistem sonradan yazmaz" demektir. `hece_turu` etiketin DOĞRULUĞUNU ölçer (ünlüyle biten = açık, ünsüzle biten = kapalı; birleşik "açık–kapalı" iki parçayla tutarlıysa). `renderOutput` alanları etiketler, konumları Türkçe verir, kelime düzeyinde özdeş banka listesini tek satıra indirir; `requestLines(body, fixture)` ikinci argümanla öğrencili/öğrencisiz nota karar verir. `source.json` üretim tarihi, banka-kaybı bayrağı, bilinen kusur (art-08 /j/) ve `out_tokens` kaynağını taşır.

- [ ] **Step 1: `zorunluKip`'i paylaşılan modüle taşı** — `social-story/checks.ts`'teki `ZORUNLU` regex'i ve `zorunlu()` yardımcısı `lib/sharedChecks.ts`'e `export const ZORUNLU` + `export const zorunluKip = (s: string) => ZORUNLU.test(lower(s))` olarak taşınır; social-story bunları içe aktarır. `ev evals/tools/studio/social-story` yeşil kalmalı.

- [ ] **Step 2: Kontrol testini yaz**

```ts
// apps/hub/evals/tools/studio/articulation/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { articulationChecks, containsWord, keepsFinalPosition, letterOf, stems, syllabify } from "./checks";

const body = (level: "isolated" | "syllable" | "word" | "sentence" | "contextual", extra = {}) => ({
  targetSounds: ["/r/"], positions: ["final" as const], level, itemCount: 3, ...extra,
});
const base = { title: "T", expertNotes: "Dil ucu", cueTypes: ["görsel"], homeGuidance: "Evde" };

describe("artikülasyon yardımcıları (eski düzenekten)", () => {
  it("letterOf, stems, containsWord, keepsFinalPosition, syllabify", () => {
    expect(letterOf("/Ş/")).toBe("ş");
    expect(stems("kitap")).toContain("kitab");
    expect(containsWord("Kitabı aldı", "kitap")).toBe(true);
    expect(keepsFinalPosition("Bu bir kar.", "kar")).toBe(true);
    expect(keepsFinalPosition("Karı gördü.", "kar")).toBe(false);
    expect(syllabify("kapı")).toEqual(["ka", "pı"]);
  });
});

describe("articulationChecks", () => {
  it("cümle düzeyi: kelime cümlede, hedef harf kelimede, sonda ek yok", () => {
    const out = { ...base, items: [
      { word: "kar", sentence: "Dışarıda kar var.", position: "final", targetSound: "/r/" },
      { word: "bir", sentence: "Bir elma aldım.", position: "final", targetSound: "/r/" },
      { word: "sar", sentence: "Sarı çiçek.", position: "final", targetSound: "/r/" },
    ] };
    const r = articulationChecks({ body: body("sentence"), output: out, raw: out, text: "" });
    expect(r.details.cumle_kelime).toBe(1); // "Sarı" gövde olarak "sar"ı içerir (stems); sonda eksiz değil → sonda_eksiz düşer
    expect(r.details.hedef_harf).toBe(1);
    expect(r.details.sonda_eksiz).toBeCloseTo(2 / 3);
    expect(r.hard).toEqual([]);
  });
  it("bağlam düzeyi: paragraf en az 3 cümle", () => {
    const out = { ...base, items: [{ word: "kar", sentence: "Kar yağdı. Çocuklar sevindi. Kardan adam yaptılar.", position: "final", targetSound: "/r/" }] };
    const r = articulationChecks({ body: body("contextual", { itemCount: 1 }), output: out, raw: out, text: "" });
    expect(r.details.paragraf).toBe(1);
  });
  it("hece düzeyi: hece türü etiketi ve örnek kelime heceyi içerir", () => {
    const out = { ...base, items: [{ word: "ra", syllableType: "açık", exampleWord: "radyo", targetSound: "/r/", position: "initial" }, { word: "ar", syllableType: "yarım", exampleWord: "kedi", targetSound: "/r/", position: "final" }] };
    const r = articulationChecks({ body: body("syllable", { itemCount: 2 }), output: out, raw: out, text: "" });
    expect(r.details.hece_turu).toBe(0.5);
    expect(r.details.ornek_kelime).toBe(0.5);
  });
  it("kelime düzeyi + öğrencili banka kaybı: boş items sert hata DEĞİL; öğrencisiz boş items sert hata", () => {
    const out = { ...base, items: [] };
    const ogrencili = articulationChecks({ body: body("word"), output: out, raw: out, text: "", ogrencili: true });
    expect(ogrencili.hard).toEqual([]);
    const ogrencisiz = articulationChecks({ body: body("word"), output: out, raw: out, text: "", ogrencili: false });
    expect(ogrencisiz.hard).toContain("oge_yok");
  });
  it("alanlar: başlık/not/ipucu/ev rehberi eksikse düşer", () => {
    const out = { title: "", expertNotes: "", cueTypes: [], homeGuidance: "", items: [{ word: "r", targetSound: "/r/" }] };
    const r = articulationChecks({ body: body("isolated", { itemCount: 1 }), output: out, raw: out, text: "" });
    expect(r.details.alanlar).toBe(0);
  });
});
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu gör** → FAIL

- [ ] **Step 4: `checks.ts`'i yaz** (yardımcılar eski `evals/articulation/checks.ts`'tekilerle birebir aynıdır; `countSentences` paylaşılan modülde zaten var)

```ts
// apps/hub/evals/tools/studio/articulation/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { countSentences, frac, lower, mean, str } from "../../../lib/sharedChecks";

export type Level = "isolated" | "syllable" | "word" | "sentence" | "contextual";
export interface ArticulationBody {
  targetSounds: string[];
  positions: Array<"initial" | "medial" | "final">;
  level: Level;
  itemCount: number;
}

/** toolHandler scrubDeep hatası: öğrenci seçiliyken banka kelimeleri enrichContent'e ulaşmaz (word → items: [],
    sentence/contextual → modelin kelimeleri). Düzeltme gelince false yap; referanslar yeniden değerlendirilir. */
export const BANKA_STASH_KAYBI = true;
const BANKA_DUZEYLERI = new Set<Level>(["word", "sentence", "contextual"]);

const VOWELS = new Set("aeıioöuüâîû"); // eski düzenekle aynı (şapkalı ünlüler dahil)

export function letterOf(sound: string): string {
  return lower(sound.replace(/\//g, "").trim());
}

/** Türkçe ek almış hâlleri de yakalayan gövde adayları (kitap→kitab-ı, ağaç→ağac-ı, burun→burn-u). */
export function stems(word: string): string[] {
  const w = lower(word).trim();
  const out = new Set([w]);
  if (w.length >= 3) {
    const last = w.at(-1)!;
    const base = w.slice(0, -1);
    const soft: Record<string, string> = { p: "b", ç: "c", t: "d", k: "ğ" };
    if (soft[last]) out.add(base + soft[last]);
    if (last === "k" && base.endsWith("n")) out.add(base + "g");
    if (VOWELS.has(last) && base.length >= 3) out.add(base);
    if (!VOWELS.has(last) && VOWELS.has(w.at(-2)!) && w.length >= 5) out.add(w.slice(0, -2) + last);
  }
  return [...out].filter((s) => s.length >= 3 || s === w);
}

export function containsWord(text: string, word: string): boolean {
  const t = lower(text);
  return stems(word).some((s) => t.includes(s));
}

/** Türkçe heceleme (kural tabanlı): iki ünlü arasındaki son ünsüz sonraki heceye geçer (ka-pı, türk-çe, sa-at). */
export function syllabify(word: string): string[] {
  const chars = [...lower(word).replace(/[^\p{L}]/gu, "")];
  const vowels = chars.flatMap((ch, i) => (VOWELS.has(ch) ? [i] : []));
  if (vowels.length <= 1) return [chars.join("")];
  const cuts = vowels.slice(0, -1).map((v, k) => {
    const next = vowels[k + 1]!;
    return next - v - 1 === 0 ? next : next - 1;
  });
  const out: string[] = [];
  let start = 0;
  for (const cut of cuts) {
    out.push(chars.slice(start, cut).join(""));
    start = cut;
  }
  out.push(chars.slice(start).join(""));
  return out;
}

/** Sonda hedeflenen kelime cümlede EKSİZ (ya da ünsüzle başlayan ekle bile değil) tam kelime olarak mı geçiyor? */
export function keepsFinalPosition(text: string, word: string): boolean {
  const w = lower(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<!\\p{L})${w}(?!\\p{L})`, "u").test(lower(text));
}

type Rec = Record<string, unknown>;
const items = (o: Rec | null) => (Array.isArray(o?.items) ? (o!.items as Rec[]) : []);

export function articulationChecks(args: { body: ArticulationBody; output: Rec | null; raw: Rec | null; text: string; ogrencili?: boolean }): ToolCheckOut {
  const { body, output } = args;
  const its = items(output);
  const n = its.length;
  const letters = body.targetSounds.map(letterOf);
  const hard: string[] = [];
  const bankaKaybi = BANKA_STASH_KAYBI && args.ogrencili === true && BANKA_DUZEYLERI.has(body.level);
  const bosBeklenir = bankaKaybi && body.level === "word";
  if (output && n === 0 && !bosBeklenir) hard.push("oge_yok");

  const hedefHarf = n ? frac(its, (i) => letters.some((l) => lower(str(i.word)).includes(l))) : bosBeklenir ? 1 : 0;
  const ogeSayisi = bosBeklenir ? 1 : BANKA_DUZEYLERI.has(body.level) ? (n >= 1 ? 1 : 0) : n >= body.itemCount - 1 && n <= body.itemCount + 1 ? 1 : 0;
  const alanlar = mean([str(output?.title).trim() ? 1 : 0, str(output?.expertNotes).trim() ? 1 : 0, Array.isArray(output?.cueTypes) && (output!.cueTypes as unknown[]).length ? 1 : 0, str(output?.homeGuidance).trim() ? 1 : 0]);
  const scores: Record<string, number> = { oge_sayisi: ogeSayisi, hedef_harf: hedefHarf, alanlar };
  const details: ToolCheckOut["details"] = { oge: n, banka_kaybi: bankaKaybi ? 1 : 0 };

  if (body.level === "syllable") {
    // Etiket "açık–kapalı" gibi bileşik olabilir; hece "a-şa" gibi tireli yazılabilir → normalize edip içerme.
    const duz = (v: unknown) => lower(str(v)).replace(/[-–—\s'’]/g, "");
    scores.hece_turu = n ? frac(its, (i) => /açık|kapalı/.test(lower(str(i.syllableType)))) : 0;
    scores.ornek_kelime = n ? frac(its, (i) => duz(i.exampleWord).includes(duz(i.word))) : 0;
  }
  if (body.level === "sentence" || body.level === "contextual") {
    scores.cumle_kelime = n ? frac(its, (i) => containsWord(str(i.sentence), str(i.word))) : 0;
    if (body.positions.includes("final") && body.positions.length === 1) {
      scores.sonda_eksiz = n ? frac(its, (i) => keepsFinalPosition(str(i.sentence), str(i.word))) : 0;
    }
  }
  if (body.level === "contextual") scores.paragraf = n ? frac(its, (i) => countSentences(str(i.sentence)) >= 3) : 0;

  const talimat = output ? mean(Object.values(scores)) : 0;
  return { scores: { ...scores, talimat }, details: { ...details, ...scores }, hard };
}
```

(`ogrencili` bilgisini adaptör verir: fabrikanın `checks` çağrısındaki `alias` öğrencisiz istekte null'dır → `ogrencili = alias !== null`.)

- [ ] **Step 5: fabrikaya `seedKey` kancası ekle, sonra `adapter.ts`'i yaz**

`adapterFactory.ts` `StudioToolCfg`'ye isteğe bağlı `seedKey?(body: Body): string` eklenir; `invoke` içinde (ALS bağlamında, route çağrılmadan ÖNCE) `const st = als.getStore(); if (st && cfg.seedKey) { if (st.rng) throw new HarnessError("seedKey ilk çekilişten sonra verilemez", "harness_error"); st.seedKey = cfg.seedKey(body); }` — `seededRandom` bu anahtarı vaka kimliğine tercih eder (Task 3 düzeltmesi); `rng` zaten kurulduysa anahtar sessizce yok sayılacağına gürültülü hata. Fabrika öz-testine iki `it`: `seedKey` verilen adaptörün `invoke`'u store'a anahtarı yazar; `rng` önceden kurulmuşsa `harness_error` fırlar.

```ts
// apps/hub/evals/tools/studio/articulation/adapter.ts
import { studioAdapter } from "../../../lib/adapterFactory";
import { str } from "../../../lib/sharedChecks";
import { articulationChecks, type ArticulationBody, type Level } from "./checks";

const LEVEL_TR: Record<Level, string> = { isolated: "İzole ses", syllable: "Hece", word: "Kelime", sentence: "Cümle", contextual: "Bağlam (paragraf)" };
const POS_TR: Record<string, string> = { initial: "başta", medial: "ortada", final: "sonda" };
/** Modelin bu düzeyde ne ürettiği (hakem öğeleri doğru yerden değerlendirsin). */
const MODEL_DOES: Record<Level, string> = {
  isolated: "Model izole ses örüntülerini ve notları üretir.",
  syllable: "Model heceleri (açık/kapalı), örnek kelimeleri ve notları üretir.",
  word: "Kelimeler uzman-onaylı bankadan gelir (iki adayda aynı); model yalnız başlık, uzman notları, ipucu türleri ve ev rehberini yazar. Öğrencili istekte bilinen ürün hatası yüzünden öğe listesi boş görünebilir; bunu iki adaya da yükleme.",
  sentence: "Banka kelimeleriyle her kelime için bir cümle; öğrencili istekte model kendi kelimelerini kullanmış olabilir (bilinen ürün hatası).",
  contextual: "Banka kelimeleriyle her kelime için 3–4 cümlelik paragraf; öğrencili istekte model kendi kelimelerini kullanmış olabilir (bilinen ürün hatası).",
};
const GENERIC = ["Dil ucunu doğru yere koyun.", "Düzenli tekrar önemlidir.", "Sabırlı olun ve çocuğu cesaretlendirin."];

export const adapter = studioAdapter<ArticulationBody>({
  id: "studio/articulation",
  label: "Artikülasyon alıştırması (Studio)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/tools/articulation/route"),
  responseKey: "drill",
  studentRequired: false,
  // 1A düzeneğiyle (ve gerçek Sonnet 4.6 referanslarıyla) AYNI banka kelimeleri: tohum = seçim argümanları.
  seedKey: (b) => JSON.stringify([b.targetSounds, b.positions, b.itemCount]),
  requestLines: (b) => [
    `- Düzey: ${LEVEL_TR[b.level]}. ${MODEL_DOES[b.level]}`,
    `- Hedef ses(ler): ${b.targetSounds.join(", ")} · Pozisyon: ${b.positions.map((p) => POS_TR[p]).join(", ")} · İstenen öğe sayısı: ${b.itemCount}`,
  ],
  renderOutput: (d) => {
    const its = (Array.isArray(d.items) ? d.items : []) as Record<string, unknown>[];
    return [
      `Başlık: ${str(d.title) || "—"}`,
      its.length ? `Öğeler (${its.length}):` : "Öğeler: (boş)",
      ...its.map((i, k) => `${k + 1}. ${[str(i.word), str(i.syllableType), str(i.exampleWord), str(i.syllableBreak), str(i.position), str(i.targetSound)].filter(Boolean).join(" · ")}${str(i.sentence) ? `\n   → ${str(i.sentence)}` : ""}`),
      `Uzman notları: ${str(d.expertNotes) || "—"}`,
      `İpucu türleri: ${(Array.isArray(d.cueTypes) ? d.cueTypes : []).map(String).join(" | ") || "—"}`,
      `Ev rehberi: ${str(d.homeGuidance) || "—"}`,
    ].join("\n");
  },
  // Öğrencisiz istekte rumuz yoktur (alias null) → banka-kaybı bilinci yalnız öğrencili vakada.
  checks: (a) => articulationChecks({ ...a, ogrencili: a.alias !== null }),
  criteria: [
    { key: "hedef_ses", question: "Öğeler hedef sesi istenen pozisyonda gerçekten içeriyor mu? Hece türü (açık = ünlüyle biter, kapalı = ünsüzle biter) doğru mu? Örnek kelimeler heceyi içeriyor mu? İzole düzeyde örüntüler hedef sesten mi oluşuyor? İmkânsız bir pozisyon istenmişse (ör. Türkçede başta /ğ/) aday bunu doğru ele alıyor mu? Kelime düzeyinde öğeler bankadan geldiği için bu ölçütü notlardaki ses bilgisinin doğruluğuna göre değerlendir." },
    { key: "dil_yas", question: "Cümle ve paragraflar doğal ve dilbilgisi açısından doğru Türkçe mi? Uzunluk ve kelime dağarcığı öğrencinin yaşına uygun mu (öğrenci yoksa genel çocuk materyali varsay)? Bağlam düzeyinde hedef ses paragrafta sık geçiyor mu? Banka kelimesi anlamlı bir bağlamda kullanılmış mı?" },
    { key: "uzman_notlari", question: "Uzman notları ve ipucu türleri bu sese (ör. /r/ için dil ucu titreşimi, /s/ için dil ucu konumu ve hava akışı), bu seviyeye ve varsa öğrencinin tanısına ÖZGÜ, somut ve uygulanabilir mi? Klinik olarak doğru mu? Her vakaya yapıştırılabilecek genel kalıp cümleler zayıftır." },
    { key: "ev_rehberi", question: "Veliye anlaşılır, somut ve günlük rutine yerleştirilebilir mi? Ödül, puan ya da çıkartma sistemi ÖNERMEMELİ (içsel motivasyon ilkesi)." },
    { key: "hata_yok", question: "Uydurma ya da çocuğun bilmeyeceği kadar nadir kelime, yanlış fonetik veya klinik bilgi, tanı koyma yok mu? \"hasta\" yerine \"öğrenci\", \"terapist\" yerine \"uzman\" kullanılmış mı?" },
  ],
  generic: (o) => {
    const d = o as Record<string, unknown>;
    const its = (Array.isArray(d.items) ? d.items : []) as Record<string, unknown>[];
    return {
      ...d,
      items: its.map((i, k) => (str(i.sentence) ? { ...i, sentence: `${str(i.word)} ${GENERIC[k % GENERIC.length]}` } : i)),
      expertNotes: "Çok duyulu yaklaşım kullanın. Düzenli tekrar önemlidir. Bireysel farklılıklara dikkat edin.",
      cueTypes: ["genel"],
      homeGuidance: "Uygun ortam sağlayın ve gelişimini takip edin.",
    };
  },
});
```


- [ ] **Step 6: `cases.json`'ı taşı** — eski `evals/articulation/cases.json`'daki 16 vaka, `student` alanı fikstür kimliğine çevrilerek (tablo Task 6 Step 5; öğrencisiz vakalar `null`): art-01→art-kerem, art-02→art-duru, art-03→art-emir, art-04→null, art-05→art-ada, art-06→art-yusuf, art-07→art-zeynep, art-08→null, art-09→art-mert, art-10→art-elif, art-11→art-can, art-12→art-nehir, art-13→null, art-14→art-berk, art-15→art-selin, art-16→null. `id`, `tags`, `purpose`, `body` AYNEN.

- [ ] **Step 7: Referansları dönüştür** (depo kökünden; eski dosyalar uzantısız JSON)

```bash
python3 - <<'PY'
import json, os, datetime
src = ".claude/hillclimb/articulation-haiku55/baseline/ref"
dst = ".claude/hillclimb/prompt-yukseltme/studio/articulation/baseline/ref"
os.makedirs(dst, exist_ok=True)
for i in range(1, 17):
    name = f"art-{i:02d}"
    d = json.load(open(os.path.join(src, name)))
    assert set(d) == {"ok", "truncated", "drill"}, name
    json.dump({"ok": d["ok"], "truncated": d["truncated"], "output": d["drill"]}, open(os.path.join(dst, name), "w"), ensure_ascii=False)
json.dump({"source": src, "model": "claude-sonnet-4-6 (gerçek API, 2026-10 pilotu)", "converted": datetime.date.today().isoformat(),
           "note": "Bu kol çevrimdışı koşulmadı; referanslar gerçek Sonnet 4.6 çıktılarıdır. results.jsonl yok."},
          open(os.path.join(dst, "..", "source.json"), "w"), ensure_ascii=False, indent=2)
print("16 referans dönüştürüldü")
PY
```

- [ ] **Step 8: Registry + eski dizini sil**

`registry.ts`: `"studio/articulation": () => import("./studio/articulation/adapter"),`
```bash
git rm -r -q apps/hub/evals/articulation && rm -f apps/hub/evals/articulation/bankWords.preview.json
```
`vitest.eval.config.ts` açıklamasındaki `evals/articulation/run.eval.ts` örneğini `evals/run.eval.ts` yap.

- [ ] **Step 9: Doğrula**

```bash
cd apps/hub && ev evals/lib evals/tools evals/runner.selftest.eval.ts   # hepsi yeşil
EVAL_FLOW=/tmp/ev-art EVAL_TOOL=studio/articulation EVAL_VARIANT=v1 EVAL_CASES=art-01 ev evals/run.eval.ts
```
İkinci komut "Önce referans kolu koşmalı" demeli (EVAL_FLOW boş dizin) — adaptör yüklenip vaka/fikstür çözülüyor demektir. Ardından kelime eşitliği: art-08, art-13 ve art-16 için üretilen isteğin (`exchange/*.gen.request.md`) banka kelime listesi, dönüştürülen referansın `output.items[].word` dizisiyle AYNI SIRADA aynı olmalı (seedKey eski tohumu yeniden üretir); değilse referans geçersizdir, durup bildir. Sonra gerçek akış diziniyle (EVAL_FLOW vermeden) `EVAL_VARIANT=v1 EVAL_CASES=art-08` koş: üretim isteği `pending.json`'a düşmeli, `exchange/art-08_rep0.gen.request.md` içinde `/j/` ve banka kelimeleri (19) görünmeli. **Yanıtı dağıtma**; `v1@deneme` gibi bir etiket kullanarak (`EVAL_TAG=deneme`) gerçek v1 dizinini kirletme, sonra `rm -rf .claude/hillclimb/prompt-yukseltme/studio/articulation/v1@deneme`.

- [ ] **Step 10: Lint, tip, commit**

```bash
cd apps/hub && node_modules/.bin/eslint evals && npm run typecheck:evals
git add -A apps/hub/evals apps/hub/vitest.eval.config.ts
git commit -m "feat(evals): artikülasyon adaptörü genel düzeneğe taşındı (16 vaka, 5 ölçüt, banka-kaybı bilinci); eski evals/articulation silindi; gerçek Sonnet 4.6 referansları dönüştürüldü"
```

---

### Task 8: Studio — ev ödevi (`homework`) ve oturum özeti (`session-summary`) adaptörleri

**Files:**
- Create: `apps/hub/evals/tools/studio/homework/{adapter.ts,checks.ts,checks.selftest.eval.ts,cases.json}`
- Create: `apps/hub/evals/tools/studio/session-summary/{adapter.ts,checks.ts,checks.selftest.eval.ts,cases.json}`
- Modify: `apps/hub/evals/tools/registry.ts` (+2 satır)

Her iki araç öğrenci ZORUNLU (`studentRequired: true`). Route gövdeleri ve JSON sözleşmeleri (katalogdan):

**İnceleme sonrası puanlayıcı kuralları (uygulanan):** `oneri_kipi` = öneri kipi ("-abilirsiniz/-ebilirsiniz", "isterseniz") içeren ve `zorunluKip` tetiklemeyen adımların oranı (emir kipi puan almaz); `materyal` = dizi varsa 1 (prompt "varsa" der); `teknik_terim` `adaptations`/`frequency` dahil ve genişletilmiş terim listesiyle; `veri_sadakati` hedefe ÖNCE TAM BAŞLIKLA (normalize: küçük harf, tire/kesme/tırnak birleştirme) eşleşir, tek eşleşme yoksa konuma (`perf[i]`) düşer — model hedefleri yeniden sıralayabilir, veriyi başka hedefe taşıyamaz; sayısal `accuracy` kabul, `accuracy 0` için "değerlendir…" metni kabul; `uydurma_yuzde` yalnız `goalPerformance[].accuracy/analysis`, `overallAssessment`, `parentNote` içinde; muafiyet DAR: sayıya bitişik `hedeflen…/ölçüt/kriter/"%N'e ulaş"/"hedef %N"`, "ortalama" yalnız girilen yüzdelerin gerçek ortalamasıyla; `accuracy` alanında muafiyet YOK; `oturum_bilgisi` = `sessionInfo.duration` dakikayı, `sessionInfo.date` gün+yılı içeriyor mu; ipucu düzeyleri üründeki `<select>` etiketleridir (Bağımsız / Minimum İpucu / Orta İpucu / Maksimum İpucu / Tam Destek); `kayitlar()` (sharedChecks) null satırları `{}` yapar, `renderOutput` da bunu kullanır.
- homework: `{ targetArea, duration: "10"|"15"|"20", parentLevel: "basic"|"detailed", materialType: "exercise"|"observation"|"daily_activity", extraNote? }` → `homework = { title, materialType, duration, targetArea, introduction, materials[], steps[{stepNumber, instruction, tip}], watchFor, celebration, frequency, expertNotes, adaptations }`.
- session-summary: `{ sessionDate, duration: "20"|"30"|"40"|"45"|"60", sessionType: "individual"|"group"|"assessment"|"parent_meeting", goals[{goalId, goalTitle, accuracy 0–100, cueLevel}], overallPerformance, behaviorNotes?, nextSessionNotes? }` → `summary = { title, sessionInfo{date,duration,type,student}, goalPerformance[{goal, accuracy:"%75", cueLevel, analysis, recommendation}], overallAssessment, behaviorNotes, nextSessionPlan, parentNote, expertNotes }`.

- [ ] **Step 1: Kontrol testlerini yaz**

```ts
// apps/hub/evals/tools/studio/homework/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { homeworkChecks, type HomeworkBody } from "./checks";

const body: HomeworkBody = { targetArea: "üç kelimeli istek", duration: "15", parentLevel: "basic", materialType: "exercise" };
const ok = {
  title: "Su istiyorum", introduction: "Bu hafta evde...", materials: ["su bardağı"],
  steps: [{ stepNumber: 1, instruction: "Bardağı gösterin.", tip: "" }, { stepNumber: 2, instruction: "Bekleyin.", tip: "5 sn" }, { stepNumber: 3, instruction: "Cümleyi tekrar edin.", tip: "" }],
  watchFor: "Göz teması", celebration: "Alkışlayın", frequency: "Günde 1", expertNotes: "—", adaptations: "—",
};

describe("homeworkChecks", () => {
  it("tam materyal: tüm puanlar 1", () => {
    const r = homeworkChecks({ body, output: ok, raw: ok, text: "", alias: "Hazal" });
    expect(r.scores).toMatchObject({ adim_sayisi: 1, adim_sira: 1, alanlar: 1, oneri_kipi: 1, teknik_terim: 1 });
    expect(r.hard).toEqual([]);
  });
  it("temel düzeyde teknik terim ve zorunluluk kipi düşürür; adım sırası bozuksa 0", () => {
    const out = { ...ok, introduction: "Fonolojik farkındalık için artikülasyon çalışması.", steps: [{ stepNumber: 2, instruction: "Yapmalısınız.", tip: "" }, { stepNumber: 1, instruction: "a b", tip: "" }, { stepNumber: 3, instruction: "c d", tip: "" }] };
    const r = homeworkChecks({ body, output: out, raw: out, text: "", alias: "Hazal" });
    expect(r.scores.teknik_terim).toBe(0);
    expect(r.scores.adim_sira).toBe(0);
    expect(r.scores.oneri_kipi).toBeCloseTo(2 / 3);
  });
  it("adım yoksa sert hata", () => {
    const out = { ...ok, steps: [] };
    expect(homeworkChecks({ body, output: out, raw: out, text: "", alias: null }).hard).toContain("adim_yok");
  });
});
```

```ts
// apps/hub/evals/tools/studio/session-summary/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { sessionSummaryChecks, type SessionSummaryBody } from "./checks";

const body: SessionSummaryBody = {
  sessionDate: "2026-10-05", duration: "40", sessionType: "individual", overallPerformance: "progressing",
  goals: [{ goalId: "g1", goalTitle: "Üç kelimeli istek", accuracy: 60, cueLevel: "sözel model" }, { goalId: "g2", goalTitle: "Sıra alma", accuracy: 80, cueLevel: "bağımsız" }],
};
const ok = {
  title: "Oturum Özeti", sessionInfo: { date: "5 Ekim 2026", duration: "40 dakika", type: "Bireysel", student: "Hazal" },
  goalPerformance: [
    { goal: "Üç kelimeli istek", accuracy: "%60", cueLevel: "Sözel model", analysis: "İyi.", recommendation: "Sür." },
    { goal: "Sıra alma", accuracy: "%80", cueLevel: "Bağımsız", analysis: "İyi.", recommendation: "Sür." },
  ],
  overallAssessment: "Gelişiyor.", behaviorNotes: "", nextSessionPlan: "Devam.", parentNote: "Bugün iyi geçti. Evde oyun oynayın. Sabırlı olun.", expertNotes: "—",
};

describe("sessionSummaryChecks", () => {
  it("girilen yüzde ve ipucu düzeyleri korunur; uydurma yüzde yok", () => {
    const r = sessionSummaryChecks({ body, output: ok, raw: ok, text: "", alias: "Hazal" });
    expect(r.scores).toMatchObject({ hedef_sayisi: 1, veri_sadakati: 1, uydurma_yuzde: 1 });
    expect(r.details.veli_notu_cumle).toBe(3);
  });
  it("yüzde değişmiş ya da girilmemiş yüzde eklenmişse düşer", () => {
    const out = { ...ok, goalPerformance: [{ ...ok.goalPerformance[0], accuracy: "%65" }, ok.goalPerformance[1]], overallAssessment: "Genel başarı %90." };
    const r = sessionSummaryChecks({ body, output: out, raw: out, text: "", alias: "Hazal" });
    expect(r.scores.veri_sadakati).toBe(0.5);
    expect(r.scores.uydurma_yuzde).toBe(0);
    expect(r.details.uydurma).toContain("90");
  });
  it("hedef sayısı eşleşmiyorsa 0; hedef listesi boşsa sert hata", () => {
    const out = { ...ok, goalPerformance: [] };
    const r = sessionSummaryChecks({ body, output: out, raw: out, text: "", alias: null });
    expect(r.scores.hedef_sayisi).toBe(0);
    expect(r.hard).toContain("hedef_yok");
  });
});
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduklarını gör**

- [ ] **Step 3: Kontrolleri yaz**

```ts
// apps/hub/evals/tools/studio/homework/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { frac, lower, mean, str, zorunluKip } from "../../../lib/sharedChecks";

export interface HomeworkBody {
  targetArea: string;
  duration: "10" | "15" | "20";
  parentLevel: "basic" | "detailed";
  materialType: "exercise" | "observation" | "daily_activity";
  extraNote?: string;
}
type Rec = Record<string, unknown>;
/** Temel veli düzeyinde geçmemesi gereken terimler. */
const TEKNIK = /fonem|fonolojik|artikülasyon|morfem|morfolojik|pragmatik|sentaks|semantik|reseptif|ekspresif|prozodi/u;

export function homeworkChecks(args: { body: HomeworkBody; output: Rec | null; raw: Rec | null; text: string; alias: string | null }): ToolCheckOut {
  const { body, output } = args;
  const steps = (Array.isArray(output?.steps) ? output!.steps : []) as Rec[];
  const hard: string[] = [];
  if (output && steps.length === 0) hard.push("adim_yok");
  const adimSayisi = steps.length >= 3 ? 1 : 0;
  const adimSira = steps.length && steps.every((s, i) => Number(s.stepNumber) === i + 1) ? 1 : 0;
  const materyal = Array.isArray(output?.materials) && (output!.materials as unknown[]).length ? 1 : 0;
  const alanlar = mean(["title", "introduction", "watchFor", "celebration", "frequency", "expertNotes", "adaptations"].map((k) => (str(output?.[k]).trim() ? 1 : 0)));
  const oneriKipi = steps.length ? frac(steps, (s) => !zorunluKip(str(s.instruction))) : 0;
  const veliMetni = [str(output?.introduction), ...steps.map((s) => `${str(s.instruction)} ${str(s.tip)}`), str(output?.watchFor), str(output?.celebration)].join(" ");
  const teknikTerim = body.parentLevel === "basic" ? (TEKNIK.test(lower(veliMetni)) ? 0 : 1) : 1;
  const scores = { adim_sayisi: adimSayisi, adim_sira: adimSira, materyal, alanlar, oneri_kipi: oneriKipi, teknik_terim: teknikTerim };
  return { scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 }, details: { adim: steps.length, ...scores }, hard };
}
```

```ts
// apps/hub/evals/tools/studio/session-summary/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { countSentences, frac, lower, mean, metinler, str } from "../../../lib/sharedChecks";

export interface SessionSummaryBody {
  sessionDate: string;
  duration: "20" | "30" | "40" | "45" | "60";
  sessionType: "individual" | "group" | "assessment" | "parent_meeting";
  goals: Array<{ goalId: string; goalTitle: string; accuracy: number; cueLevel: string }>;
  overallPerformance: "above_target" | "on_target" | "progressing" | "needs_support" | "not_assessed";
  behaviorNotes?: string;
  nextSessionNotes?: string;
}
type Rec = Record<string, unknown>;
const yuzdeler = (s: string) => [...s.matchAll(/%\s?(\d{1,3})|(\d{1,3})\s?%/g)].map((m) => Number(m[1] ?? m[2]));

export function sessionSummaryChecks(args: { body: SessionSummaryBody; output: Rec | null; raw: Rec | null; text: string; alias: string | null }): ToolCheckOut {
  const { body, output } = args;
  const perf = (Array.isArray(output?.goalPerformance) ? output!.goalPerformance : []) as Rec[];
  const hard: string[] = [];
  if (output && perf.length === 0) hard.push("hedef_yok");
  const hedefSayisi = perf.length === body.goals.length ? 1 : 0;
  // Her girilen hedef için: aynı yüzde ve aynı ipucu düzeyi (küçük harf, içerme) taşıyan bir satır var mı?
  const veriSadakati = frac(body.goals, (g) =>
    perf.some((p) => yuzdeler(str(p.accuracy)).includes(g.accuracy) && lower(str(p.cueLevel)).includes(lower(g.cueLevel))),
  );
  const girilen = new Set(body.goals.map((g) => g.accuracy));
  const ciktidaki = output ? yuzdeler(metinler(output).join(" ")) : [];
  const uydurma = ciktidaki.filter((y) => !girilen.has(y));
  const uydurmaYuzde = uydurma.length ? 0 : 1;
  const alanlar = mean(["title", "overallAssessment", "nextSessionPlan", "parentNote", "expertNotes"].map((k) => (str(output?.[k]).trim() ? 1 : 0)));
  const veliNotuCumle = countSentences(str(output?.parentNote));
  const veliNotu = veliNotuCumle >= 3 && veliNotuCumle <= 5 ? 1 : 0;
  const scores = { hedef_sayisi: hedefSayisi, veri_sadakati: veriSadakati, uydurma_yuzde: uydurmaYuzde, alanlar, veli_notu: veliNotu };
  return {
    scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 },
    details: { ...scores, veli_notu_cumle: veliNotuCumle, uydurma: uydurma.join("|") },
    hard,
  };
}
```

- [ ] **Step 4: Adaptörleri yaz**

```ts
// apps/hub/evals/tools/studio/homework/adapter.ts
import { studioAdapter } from "../../../lib/adapterFactory";
import { str } from "../../../lib/sharedChecks";
import { homeworkChecks, type HomeworkBody } from "./checks";

const LEVEL_TR = { basic: "Temel (teknik terim yok)", detailed: "Detaylı" };
const TYPE_TR = { exercise: "Ev egzersizi", observation: "Gözlem formu", daily_activity: "Günlük konuşma aktivitesi" };
const GENERIC = ["Çocuğunuzla düzenli çalışın.", "Sabırlı olun.", "Olumlu pekiştirme yapın.", "Gelişimini takip edin."];

export const adapter = studioAdapter<HomeworkBody>({
  id: "studio/homework",
  label: "Ev ödevi materyali (Studio)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/tools/homework/route"),
  responseKey: "homework",
  studentRequired: true,
  requestLines: (b) => [
    `- Hedef alan: ${b.targetArea} · Süre: ${b.duration} dk · Veli düzeyi: ${LEVEL_TR[b.parentLevel]} · Tür: ${TYPE_TR[b.materialType]}`,
    b.extraNote ? `- Uzman notu: ${b.extraNote}` : "",
  ].filter(Boolean),
  renderOutput: (h) => {
    const steps = (Array.isArray(h.steps) ? h.steps : []) as Record<string, unknown>[];
    return [
      `Başlık: ${str(h.title) || "—"}`,
      `Giriş: ${str(h.introduction) || "—"}`,
      `Materyaller: ${(Array.isArray(h.materials) ? h.materials : []).map(String).join(", ") || "—"}`,
      "Adımlar:",
      ...steps.map((s) => `  ${String(s.stepNumber)}. ${str(s.instruction)}${str(s.tip) ? ` (ipucu: ${str(s.tip)})` : ""}`),
      `Dikkat: ${str(h.watchFor) || "—"}`, `Kutlama: ${str(h.celebration) || "—"}`, `Sıklık: ${str(h.frequency) || "—"}`,
      `Uzman notları: ${str(h.expertNotes) || "—"}`, `Uyarlamalar: ${str(h.adaptations) || "—"}`,
    ].join("\n");
  },
  checks: homeworkChecks,
  criteria: [
    { key: "veli_dili", question: "Metin veliye hitap ediyor mu: öneri kipi, günlük dil, istenen düzeyde (temel/detaylı) terim yoğunluğu; yetişkin öğrencide 'veli' yerine uygun muhatap?" },
    { key: "sure_uyumu", question: "Adımlar ve sıklık istenen süreye (10/15/20 dk) gerçekçi biçimde sığıyor mu; öğrencinin yaşına ve dikkat süresine uygun mu?" },
  ],
  generic: (o) => {
    const h = o as Record<string, unknown>;
    const steps = (Array.isArray(h.steps) ? h.steps : []) as Record<string, unknown>[];
    return { ...h, introduction: GENERIC[0], steps: steps.map((s, i) => ({ ...s, instruction: GENERIC[i % GENERIC.length], tip: "" })), watchFor: GENERIC[3], expertNotes: "Düzenli tekrar önemlidir.", adaptations: "Bireysel farklılıklara dikkat edin." };
  },
});
```

```ts
// apps/hub/evals/tools/studio/session-summary/adapter.ts
import { studioAdapter } from "../../../lib/adapterFactory";
import { str } from "../../../lib/sharedChecks";
import { sessionSummaryChecks, type SessionSummaryBody } from "./checks";

const TYPE_TR = { individual: "Bireysel", group: "Grup", assessment: "Değerlendirme", parent_meeting: "Veli görüşmesi" };
const PERF_TR = { above_target: "Beklenenin üstünde", on_target: "Hedefle uyumlu", progressing: "Gelişim gösteriyor", needs_support: "Ek destek gerekiyor", not_assessed: "Değerlendirme yapılamadı" };

export const adapter = studioAdapter<SessionSummaryBody>({
  id: "studio/session-summary",
  label: "Oturum özeti (Studio)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/tools/session-summary/route"),
  responseKey: "summary",
  studentRequired: true,
  requestLines: (b) => [
    `- Tarih: ${b.sessionDate} · Süre: ${b.duration} dk · Tür: ${TYPE_TR[b.sessionType]} · Genel performans: ${PERF_TR[b.overallPerformance]}`,
    "- Girilen hedefler (yüzde ve ipucu düzeyi UZMANIN verisidir, değişmemeli):",
    ...b.goals.map((g, i) => `  ${i + 1}. ${g.goalTitle} — %${g.accuracy}, ipucu: ${g.cueLevel}`),
    b.behaviorNotes ? `- Davranış gözlemi: ${b.behaviorNotes}` : "",
    b.nextSessionNotes ? `- Sonraki oturum notu: ${b.nextSessionNotes}` : "",
  ].filter(Boolean),
  renderOutput: (s) => {
    const perf = (Array.isArray(s.goalPerformance) ? s.goalPerformance : []) as Record<string, unknown>[];
    const info = (s.sessionInfo ?? {}) as Record<string, unknown>;
    return [
      `Başlık: ${str(s.title) || "—"}`,
      `Oturum: ${[str(info.date), str(info.duration), str(info.type)].filter(Boolean).join(" · ") || "—"}`,
      "Hedef performansı:",
      ...perf.map((p, i) => `  ${i + 1}. ${str(p.goal)} — ${str(p.accuracy)} — ${str(p.cueLevel)}\n     Analiz: ${str(p.analysis)}\n     Öneri: ${str(p.recommendation)}`),
      `Genel değerlendirme: ${str(s.overallAssessment) || "—"}`, `Davranış notları: ${str(s.behaviorNotes) || "—"}`,
      `Sonraki oturum planı: ${str(s.nextSessionPlan) || "—"}`, `Veli notu: ${str(s.parentNote) || "—"}`, `Uzman notları: ${str(s.expertNotes) || "—"}`,
    ].join("\n");
  },
  checks: sessionSummaryChecks,
  criteria: [
    { key: "veri_sadakati", question: "Girilen yüzdeler ve ipucu düzeyleri aynen korunmuş, analizler bu verilerden türetilmiş mi; uydurulmuş sayı, gözlem ya da ilerleme iddiası yok mu?" },
    { key: "veli_ozeti", question: "Veli notu 3–5 cümle, teknik terimsiz, somut ve cesaretlendirici mi; klinik ayrıntı veli notuna değil uzman notlarına mı yazılmış; uzman notlarıyla çelişmiyor mu?" },
  ],
  generic: (o) => {
    const s = o as Record<string, unknown>;
    const perf = (Array.isArray(s.goalPerformance) ? s.goalPerformance : []) as Record<string, unknown>[];
    return { ...s, goalPerformance: perf.map((p) => ({ ...p, analysis: "Gelişim gösteriyor.", recommendation: "Düzenli tekrar önemlidir." })), overallAssessment: "Genel olarak iyi bir oturumdu.", parentNote: "Bugün çalıştık. Evde tekrar edin. Gelişimini takip edin.", expertNotes: "Çok duyulu yaklaşım kullanın." };
  },
});
```

- [ ] **Step 5: Vakaları yaz**

```json
// apps/hub/evals/tools/studio/homework/cases.json
[
  { "id": "hw-01", "tags": ["öğrencili", "zengin bağlam", "egzersiz", "temel veli"], "student": "stu-ela",
    "purpose": "OSB + ifade edici dil: son oturum planındaki 'üç kelimeli cümleyi eve taşı' hedefinin ödeve girmesi; ilgi alanı (dinozor/tren) ile 15 dk'ya sığan adımlar; temel düzeyde teknik terim yok.",
    "body": { "targetArea": "Üç kelimeli istek cümlesi (ben + nesne + istiyorum)", "duration": "15", "parentLevel": "basic", "materialType": "exercise" } },
  { "id": "hw-02", "tags": ["öğrencili", "gözlem formu", "detaylı veli", "12 yaş"], "student": "stu-ecem",
    "purpose": "Gözlem formu türü: veliye yapılacak iş değil GÖZLEMLENECEK davranış listesi; 12 yaşa uygun anlatı hedefi; detaylı düzeyde terim izinli ama açıklamalı.",
    "body": { "targetArea": "Günlük olayları sırayla ve nedensel bağlaçla anlatma", "duration": "20", "parentLevel": "detailed", "materialType": "observation", "extraNote": "Ecem sözlü yanıt baskısında kapanıyor; gözlem onu sıkıştırmasın." } },
  { "id": "hw-03", "tags": ["öğrencili", "günlük aktivite", "4 yaş", "kısa bağlam"], "student": "stu-yigit",
    "purpose": "4 yaş + 5 dk masa toleransı: rutine gömülü (banyo/yemek) kısa etkinlik; /k/ sesi için 'öne alma' bilgisini veliye terimsiz aktarma.",
    "body": { "targetArea": "/k/ sesini kelime başında üretme", "duration": "10", "parentLevel": "basic", "materialType": "daily_activity" } },
  { "id": "hw-04", "tags": ["öğrencili", "yetişkin", "egzersiz", "detaylı"], "student": "stu-sibel",
    "purpose": "Yetişkin dizartri: 'veli' yerine uygun muhatap (kendisi/eşi), çocuk dili yok; nefes-ses koordinasyonu için 20 dk'lık uygulanabilir plan.",
    "body": { "targetArea": "Nefes desteğiyle uzun cümle okuma ve konuşma hızı", "duration": "20", "parentLevel": "detailed", "materialType": "exercise", "extraNote": "İşe dönüş hedefi: sınıfta sesli okuma." } }
]
```

```json
// apps/hub/evals/tools/studio/session-summary/cases.json
[
  { "id": "ozet-01", "tags": ["bireysel", "iki hedef", "zengin bağlam"], "student": "stu-ela",
    "purpose": "Girilen yüzde/ipucu düzeyine sadakat; davranış gözleminin (kulak kapatma) analize ve veli notuna damgalamadan girmesi.",
    "body": { "sessionDate": "2026-10-08", "duration": "40", "sessionType": "individual", "overallPerformance": "progressing",
      "goals": [{ "goalId": "g1", "goalTitle": "Üç kelimeli istek cümlesi", "accuracy": 60, "cueLevel": "Minimum İpucu" }, { "goalId": "g2", "goalTitle": "Sıra alma (dinozor oyunu)", "accuracy": 80, "cueLevel": "Bağımsız" }],
      "behaviorNotes": "Bekleme salonundan sonra ilk 5 dk kulaklarını kapattı; sakin köşede toparlandı.", "nextSessionNotes": "Geçiş kartını eve ver." } },
  { "id": "ozet-02", "tags": ["grup", "üç hedef", "işitme"], "student": "stu-defne",
    "purpose": "Grup oturumu ucu: bireysel özetin grup bağlamına uyarlanması; işitme kaybında gürültü değişkeninin analize girmesi; üç hedefin ayrı ayrı yorumlanması.",
    "body": { "sessionDate": "2026-10-07", "duration": "30", "sessionType": "group", "overallPerformance": "on_target",
      "goals": [{ "goalId": "g1", "goalTitle": "/s/ kelime başı (sessiz ortam)", "accuracy": 70, "cueLevel": "Orta İpucu" }, { "goalId": "g2", "goalTitle": "/s/–/ş/ işitsel ayrım", "accuracy": 60, "cueLevel": "Maksimum İpucu" }, { "goalId": "g3", "goalTitle": "Grupta sıra bekleme", "accuracy": 90, "cueLevel": "Bağımsız" }] } },
  { "id": "ozet-03", "tags": ["değerlendirme", "not_assessed", "boş bağlam"], "student": "stu-kerem",
    "purpose": "Değerlendirme oturumu + 'değerlendirme yapılamadı': %0 + Tam Destek girildi; veri uydurmama, ilerleme iddiası yok, sonraki plan değerlendirmenin tamamlanması.",
    "body": { "sessionDate": "2026-10-06", "duration": "60", "sessionType": "assessment", "overallPerformance": "not_assessed",
      "goals": [{ "goalId": "g1", "goalTitle": "/r/ sesi tarama (kelime düzeyi)", "accuracy": 0, "cueLevel": "Tam Destek" }], "behaviorNotes": "İlk 20 dk iş birliği yapmadı; sonra oyunla katıldı." } },
  { "id": "ozet-04", "tags": ["veli görüşmesi", "needs_support", "12 yaş"], "student": "stu-ecem",
    "purpose": "Veli görüşmesi türü: özet velinin duyduğu bilgiyi yansıtır; 'ek destek gerekiyor' için somut, damgalamayan öneri; veli notunun 3–5 cümle bütçesi.",
    "body": { "sessionDate": "2026-10-09", "duration": "20", "sessionType": "parent_meeting", "overallPerformance": "needs_support",
      "goals": [{ "goalId": "g1", "goalTitle": "Okuduğunu anlama: neden-sonuç soruları", "accuracy": 40, "cueLevel": "Orta İpucu" }], "nextSessionNotes": "Sınıf öğretmeniyle görsel düzenleyici paylaş." } }
]
```

- [ ] **Step 6: Registry + testler**

`registry.ts`: `"studio/homework": () => import("./studio/homework/adapter"),` ve `"studio/session-summary": () => import("./studio/session-summary/adapter"),`
Run: `cd apps/hub && ev evals/tools/studio/homework evals/tools/studio/session-summary` → PASS. Sonra bağlantı denemesi: `EVAL_FLOW=/tmp/ev-hw EVAL_TOOL=studio/homework EVAL_VARIANT=baseline EVAL_CASES=hw-01 ev evals/run.eval.ts` → `pending.json` 1 üretim isteği; `exchange/hw-01_rep0.gen.request.md` içinde `- Ad:` rumuz, `- Süre: 15 dakika`, gerçek ad yok (PII kapısı geçti). `/tmp/ev-hw` silinir.

- [ ] **Step 7: Lint, tip, commit**

```bash
cd apps/hub && node_modules/.bin/eslint evals && npm run typecheck:evals
git add apps/hub/evals/tools && git commit -m "feat(evals): ev ödevi ve oturum özeti adaptörleri (4+4 vaka)"
```

---

### Task 9: Studio — haftalık plan (`weekly-plan`) ve iletişim panosu (`comm-board`) adaptörleri

**Files:**
- Create: `apps/hub/evals/tools/studio/weekly-plan/{adapter.ts,checks.ts,checks.selftest.eval.ts,cases.json}`
- Create: `apps/hub/evals/tools/studio/comm-board/{adapter.ts,checks.ts,checks.selftest.eval.ts,cases.json}`
- Modify: `apps/hub/evals/tools/registry.ts` (+2)

**İnceleme sonrası puanlayıcı kuralları (uygulanan):** weekly-plan `ders_sayisi` modelin HAM gün sayısını da sınar (rota fazlasını sessizce keser); `odak_kapsama` odak alanının anlamlı parçalarını (durak sözcükler hariç, ≥4 harfli gövde) gün metninde arar, iki parçalı alanda İKİ parça da gerekir; `adim_butce` 1–3, `materyal_butce` 1–6; ek puanlar prompt satırlarından: `gun_butcesi` (ısınma ≤2 / ana ≤3 / kapanış ≤2 materyal), `cumle_butcesi` (alan başına cümle aralıkları; cümle sayımı büyük harf/rakam/tırnakla başlayan cümleye bölen ortak `countSentences`), `sure_dagilimi` (ısınma+ana+kapanış ≈ ders süresi; ortak `sureDk()` ayrıştırıcı), `etkinlik_cesidi` (günler aynı etkinliği tekrarlamaz), `sistem_alani` (gün adı/tarih/süre modelden gelmez); comm-board `cumle_modu` word_only'de cümle BOŞ olmalı (UI varsa basar), kategori/renk tam (küçük harf İngilizce) eşleşir (UI `FITZGERALD_BG[color] ?? white`), `pozisyon` 1..N, `gorsel_ingilizce` (İngilizce işlev sözcükleri; Türkçe harf oranı), `gorsel_dolu` visualDescription'ı da ister; şerit (strip) satır sayısı puanlanmaz (prompt çelişkili). Kriter `sembol_netligi` "öğrencinin yaşına uygun" der (yetişkin vakası pano-04).

Sözleşmeler: weekly-plan gövdesi `{ weekStart "YYYY-MM-DD", sessionsPerWeek 1–12, sessionDuration "20"|"30"|"40"|"45"|"60", focusAreas[1–12], planApproach "ai"|"guided", daySchedule[{dayName, lessonCount 1–4}], extraNote? }` (öğrenci zorunlu; `Pazar` DAY_OFFSETS'ta yok → vakalarda kullanılmaz); çıktı `plan = { title, studentSummary, days[{focusArea, objective, warmup{activity,duration,materials[]}, mainWork{activity,duration,steps[],materials[],targetGoals[]}, closing{activity,duration}, notes}], weeklyGoal, materialsNeeded[], parentCommunication, expertNotes, nextWeekSuggestion }` + route `days[i]`'ye `dayNumber, dayName, date, duration` ekler. comm-board gövdesi `{ boardType, customCategory?, symbolCount 4|6|9|12, layout "grid"|"strip", textMode "word_only"|"word_sentence", colorCoding }` (öğrenci isteğe bağlı); çıktı `board = { title, rows, cols, cells[{position, word, sentence, category, fitzgeraldColor, visualDescription, visualPrompt, usage}], instructions, expertNotes, homeGuidance, adaptations }`.

- [ ] **Step 1: Kontrol testlerini yaz**

```ts
// apps/hub/evals/tools/studio/weekly-plan/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { weeklyPlanChecks, type WeeklyPlanBody } from "./checks";

const body: WeeklyPlanBody = { weekStart: "2026-10-12", sessionsPerWeek: 3, sessionDuration: "40", focusAreas: ["İstek cümlesi", "Sıra alma"], planApproach: "ai", daySchedule: [{ dayName: "Pazartesi", lessonCount: 2 }, { dayName: "Çarşamba", lessonCount: 1 }] };
const day = (focusArea: string) => ({ focusArea, objective: "o", warmup: { activity: "a", duration: "5 dk", materials: ["x"] }, mainWork: { activity: "b", duration: "25 dk", steps: ["1", "2"], materials: ["y"], targetGoals: ["g"] }, closing: { activity: "c", duration: "5 dk" }, notes: null });
const ok = { title: "Plan", studentSummary: "s", days: [day("İstek cümlesi"), day("Sıra alma"), day("İstek cümlesi")], weeklyGoal: "w", materialsNeeded: ["a", "b"], parentCommunication: "p", expertNotes: "e", nextWeekSuggestion: "n" };

describe("weeklyPlanChecks", () => {
  it("ders sayısı = günlük ders toplamı; odak alanları kapsanır; adım/materyal bütçesi", () => {
    const r = weeklyPlanChecks({ body, output: ok, raw: ok, text: "", alias: "Hazal" });
    expect(r.scores).toMatchObject({ ders_sayisi: 1, gun_alanlari: 1, odak_kapsama: 1, adim_butce: 1, materyal_butce: 1 });
    expect(r.hard).toEqual([]);
  });
  it("days dizi değilse sert hata; ders sayısı tutmazsa 0; adım > 3 düşürür", () => {
    expect(weeklyPlanChecks({ body, output: { ...ok, days: "x" }, raw: ok, text: "", alias: null }).hard).toContain("gun_dizisi_yok");
    const out = { ...ok, days: [day("İstek cümlesi"), { ...day("Sıra alma"), mainWork: { ...day("x").mainWork, steps: ["1", "2", "3", "4"] } }] };
    const r = weeklyPlanChecks({ body, output: out, raw: out, text: "", alias: null });
    expect(r.scores.ders_sayisi).toBe(0);
    expect(r.scores.adim_butce).toBe(0.5);
  });
});
```

```ts
// apps/hub/evals/tools/studio/comm-board/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { commBoardChecks, type CommBoardBody } from "./checks";

const body: CommBoardBody = { boardType: "basic_needs", symbolCount: 4, layout: "grid", textMode: "word_sentence", colorCoding: true };
const cell = (position: number, word: string, category: string, fitzgeraldColor: string) => ({ position, word, sentence: `${word} istiyorum`, category, fitzgeraldColor, visualDescription: "d", visualPrompt: "a cup", usage: "u" });
const ok = { title: "Pano", rows: 2, cols: 2, cells: [cell(1, "su", "noun", "yellow"), cell(2, "yemek", "noun", "yellow"), cell(3, "istiyorum", "verb", "green"), cell(4, "yardım", "social", "pink")], instructions: "i", expertNotes: "e", homeGuidance: "h", adaptations: "a" };

describe("commBoardChecks", () => {
  it("hücre sayısı, görsel, Fitzgerald rengi, cümle modu, tekrarsızlık", () => {
    const r = commBoardChecks({ body, output: ok, raw: ok, text: "", alias: null });
    expect(r.scores).toMatchObject({ hucre_sayisi: 1, izgara: 1, gorsel_dolu: 1, renk_tutarli: 1, cumle_modu: 1, tekrar_yok: 1 });
    expect(r.hard).toEqual([]);
  });
  it("hücre sayısı tutmuyor + yanlış renk + boş görsel", () => {
    const out = { ...ok, cells: [...ok.cells.slice(0, 3), { ...ok.cells[3], fitzgeraldColor: "blue", visualPrompt: "" }, cell(5, "su", "noun", "yellow")] };
    const r = commBoardChecks({ body, output: out, raw: out, text: "", alias: null });
    expect(r.scores.hucre_sayisi).toBe(0);
    expect(r.scores.renk_tutarli).toBe(0.8);
    expect(r.scores.gorsel_dolu).toBe(0.8);
    expect(r.scores.tekrar_yok).toBe(0.8);
  });
  it("hücre yoksa sert hata; renk kodlaması kapalıysa renk kontrolü 1", () => {
    expect(commBoardChecks({ body, output: { ...ok, cells: [] }, raw: ok, text: "", alias: null }).hard).toContain("hucre_yok");
    const out = { ...ok, cells: ok.cells.map((c) => ({ ...c, fitzgeraldColor: "red" })) };
    expect(commBoardChecks({ body: { ...body, colorCoding: false }, output: out, raw: out, text: "", alias: null }).scores.renk_tutarli).toBe(1);
  });
});
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduklarını gör**

- [ ] **Step 3: Kontrolleri yaz**

```ts
// apps/hub/evals/tools/studio/weekly-plan/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { frac, lower, mean, str } from "../../../lib/sharedChecks";

export interface WeeklyPlanBody {
  weekStart: string;
  sessionsPerWeek: number;
  sessionDuration: "20" | "30" | "40" | "45" | "60";
  focusAreas: string[];
  planApproach: "ai" | "guided";
  daySchedule: Array<{ dayName: string; lessonCount: number }>;
  extraNote?: string;
}
type Rec = Record<string, unknown>;
const arr = (v: unknown) => (Array.isArray(v) ? (v as unknown[]) : []);
const anahtar = (s: string) => lower(s).replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ")[0]?.slice(0, 5) ?? "";

export function weeklyPlanChecks(args: { body: WeeklyPlanBody; output: Rec | null; raw: Rec | null; text: string; alias: string | null }): ToolCheckOut {
  const { body, output } = args;
  const hard: string[] = [];
  if (output && !Array.isArray(output.days)) hard.push("gun_dizisi_yok");
  const days = arr(output?.days) as Rec[];
  const beklenen = body.daySchedule.reduce((a, d) => a + d.lessonCount, 0);
  const dersSayisi = days.length === beklenen ? 1 : 0;
  const alan = (d: Rec) => [str(d.focusArea), str(d.objective), str((d.warmup as Rec)?.activity), str((d.mainWork as Rec)?.activity), str((d.closing as Rec)?.activity)];
  const gunAlanlari = days.length ? frac(days, (d) => alan(d).every((x) => x.trim())) : 0;
  const odakKapsama = frac(body.focusAreas, (f) => days.some((d) => lower(str(d.focusArea)).includes(anahtar(f))));
  const adimButce = days.length ? frac(days, (d) => arr((d.mainWork as Rec)?.steps).length <= 3) : 0;
  const materyalButce = arr(output?.materialsNeeded).length <= 6 ? 1 : 0;
  const alanlar = mean(["title", "studentSummary", "weeklyGoal", "parentCommunication", "expertNotes", "nextWeekSuggestion"].map((k) => (str(output?.[k]).trim() ? 1 : 0)));
  const scores = { ders_sayisi: dersSayisi, gun_alanlari: gunAlanlari, odak_kapsama: odakKapsama, adim_butce: adimButce, materyal_butce: materyalButce, alanlar };
  return { scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 }, details: { ders: days.length, beklenen, ...scores }, hard };
}
```

```ts
// apps/hub/evals/tools/studio/comm-board/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { frac, lower, mean, str } from "../../../lib/sharedChecks";

export interface CommBoardBody {
  boardType: "basic_needs" | "emotions" | "daily_routines" | "school" | "social" | "requests" | "custom";
  customCategory?: string;
  symbolCount: 4 | 6 | 9 | 12;
  layout: "grid" | "strip";
  textMode: "word_only" | "word_sentence";
  colorCoding: boolean;
}
type Rec = Record<string, unknown>;
/** Fitzgerald anahtarı (prompt sözleşmesi): kategori → İngilizce renk. */
const FITZGERALD: Record<string, string> = { noun: "yellow", verb: "green", adjective: "blue", social: "pink", question: "orange", other: "white" };

export function commBoardChecks(args: { body: CommBoardBody; output: Rec | null; raw: Rec | null; text: string; alias: string | null }): ToolCheckOut {
  const { body, output } = args;
  const cells = (Array.isArray(output?.cells) ? output!.cells : []) as Rec[];
  const hard: string[] = [];
  if (output && cells.length === 0) hard.push("hucre_yok");
  const hucreSayisi = cells.length === body.symbolCount ? 1 : 0;
  const izgara = Number(output?.rows) * Number(output?.cols) === body.symbolCount ? 1 : 0;
  const gorselDolu = cells.length ? frac(cells, (c) => str(c.visualPrompt).trim().length > 0) : 0;
  const renkTutarli = !body.colorCoding ? 1 : cells.length ? frac(cells, (c) => FITZGERALD[lower(str(c.category))] === lower(str(c.fitzgeraldColor))) : 0;
  const cumleModu = body.textMode === "word_only" ? 1 : cells.length ? frac(cells, (c) => str(c.sentence).trim().length > 0) : 0;
  const tekrarYok = cells.length ? new Set(cells.map((c) => lower(str(c.word)).trim())).size / cells.length : 0;
  const alanlar = mean(["title", "instructions", "expertNotes", "homeGuidance", "adaptations"].map((k) => (str(output?.[k]).trim() ? 1 : 0)));
  const scores = { hucre_sayisi: hucreSayisi, izgara, gorsel_dolu: gorselDolu, renk_tutarli: renkTutarli, cumle_modu: cumleModu, tekrar_yok: tekrarYok, alanlar };
  return { scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 }, details: { hucre: cells.length, ...scores }, hard };
}
```

- [ ] **Step 4: Adaptörleri yaz**

```ts
// apps/hub/evals/tools/studio/weekly-plan/adapter.ts
import { studioAdapter } from "../../../lib/adapterFactory";
import { str } from "../../../lib/sharedChecks";
import { weeklyPlanChecks, type WeeklyPlanBody } from "./checks";

const APPROACH_TR = { ai: "AI profile ve geçmişe göre önersin", guided: "Seçilen odak alanlarına göre yönlendirilmiş" };
type Rec = Record<string, unknown>;
const blok = (b: unknown, ad: string) => {
  const x = (b ?? {}) as Rec;
  const steps = Array.isArray(x.steps) ? ` Adımlar: ${(x.steps as unknown[]).map(String).join(" / ")}` : "";
  return `${ad}: ${str(x.activity) || "—"} (${str(x.duration) || "?"})${steps}`;
};

export const adapter = studioAdapter<WeeklyPlanBody>({
  id: "studio/weekly-plan",
  label: "Haftalık çalışma planı (Studio)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/tools/weekly-plan/route"),
  responseKey: "plan",
  studentRequired: true,
  requestLines: (b) => [
    `- Hafta: ${b.weekStart} · ${b.sessionsPerWeek} ders × ${b.sessionDuration} dk · Günler: ${b.daySchedule.map((d) => `${d.dayName}×${d.lessonCount}`).join(", ")}`,
    `- Odak alanları: ${b.focusAreas.join(", ")} · Yaklaşım: ${APPROACH_TR[b.planApproach]}`,
    b.extraNote ? `- Ek not: ${b.extraNote}` : "",
    "- Not: gün adı, tarih ve ders süresi sistem tarafından eklenir; model yalnız içerik üretir.",
  ].filter(Boolean),
  renderOutput: (p) => {
    const days = (Array.isArray(p.days) ? p.days : []) as Rec[];
    return [
      `Başlık: ${str(p.title) || "—"}`, `Öğrenci özeti: ${str(p.studentSummary) || "—"}`, `Haftalık hedef: ${str(p.weeklyGoal) || "—"}`,
      `Dersler (${days.length}):`,
      ...days.map((d) => `  ${String(d.dayNumber ?? "")}. ${str(d.dayName)} ${str(d.date)} — ${str(d.focusArea)}: ${str(d.objective)}\n     ${blok(d.warmup, "Isınma")}\n     ${blok(d.mainWork, "Ana çalışma")}\n     ${blok(d.closing, "Kapanış")}${str(d.notes) ? `\n     Not: ${str(d.notes)}` : ""}`),
      `Materyaller: ${(Array.isArray(p.materialsNeeded) ? p.materialsNeeded : []).map(String).join(", ") || "—"}`,
      `Veli iletişimi: ${str(p.parentCommunication) || "—"}`, `Uzman notları: ${str(p.expertNotes) || "—"}`, `Gelecek hafta: ${str(p.nextWeekSuggestion) || "—"}`,
    ].join("\n");
  },
  checks: weeklyPlanChecks,
  criteria: [
    { key: "progresyon", question: "Dersler hafta içinde birbirinin üzerine kuruluyor mu (kolaydan zora, ipucu azaltma, genelleme); aynı etkinlik tekrarlanmıyor mu?" },
    { key: "gecmis_baglanti", question: "Plan son kartlara, son oturum özetine ve müfredat modüllerine açıkça bağlanıyor mu (ör. son özetteki sonraki hedefi ilk derse alma)?" },
  ],
  generic: (o) => {
    const p = o as Rec;
    const days = (Array.isArray(p.days) ? p.days : []) as Rec[];
    return { ...p, studentSummary: "Öğrenci gelişim gösteriyor.", days: days.map((d) => ({ ...d, objective: "Becerileri geliştirmek.", mainWork: { ...(d.mainWork as Rec), activity: "Çok duyulu yaklaşımla çalışma.", steps: ["Başla", "Devam et", "Bitir"] } })), weeklyGoal: "Gelişimini takip edin.", expertNotes: "Düzenli tekrar önemlidir.", nextWeekSuggestion: "Aynı şekilde devam edin." };
  },
});
```

```ts
// apps/hub/evals/tools/studio/comm-board/adapter.ts
import { studioAdapter } from "../../../lib/adapterFactory";
import { str } from "../../../lib/sharedChecks";
import { commBoardChecks, type CommBoardBody } from "./checks";

const BOARD_TR: Record<CommBoardBody["boardType"], string> = { basic_needs: "Temel ihtiyaçlar", emotions: "Duygular", daily_routines: "Günlük rutinler", school: "Okul", social: "Sosyal ifadeler", requests: "İstek ve seçim", custom: "Özel" };
type Rec = Record<string, unknown>;

export const adapter = studioAdapter<CommBoardBody>({
  id: "studio/comm-board",
  label: "İletişim panosu (Studio, AAC)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/tools/comm-board/route"),
  responseKey: "board",
  studentRequired: false,
  requestLines: (b) => [
    `- Pano: ${BOARD_TR[b.boardType]}${b.boardType === "custom" && b.customCategory ? ` — ${b.customCategory}` : ""} · ${b.symbolCount} sembol · Düzen: ${b.layout === "grid" ? "ızgara" : "şerit"} · Metin: ${b.textMode === "word_only" ? "yalnız kelime" : "kelime + kısa cümle"} · Fitzgerald renk kodu: ${b.colorCoding ? "evet" : "hayır"}`,
  ],
  renderOutput: (o) => {
    const cells = (Array.isArray(o.cells) ? o.cells : []) as Rec[];
    return [
      `Başlık: ${str(o.title) || "—"} (${String(o.rows)}×${String(o.cols)})`,
      ...cells.map((c) => `${String(c.position)}. ${str(c.word)}${str(c.sentence) ? ` — "${str(c.sentence)}"` : ""} [${str(c.category)}/${str(c.fitzgeraldColor)}] görsel: ${str(c.visualPrompt) || "—"} · kullanım: ${str(c.usage)}`),
      `Yönerge: ${str(o.instructions) || "—"}`, `Uzman notları: ${str(o.expertNotes) || "—"}`, `Ev rehberi: ${str(o.homeGuidance) || "—"}`, `Uyarlamalar: ${str(o.adaptations) || "—"}`,
    ].join("\n");
  },
  checks: commBoardChecks,
  criteria: [
    { key: "aac_uygunluk", question: "Sembol seçimi AAC ilkelerine uygun mu: çekirdek sözcükler + istek/ret/yorum gibi iletişim işlevleri, öğrencinin düzeyine ve pano türüne göre; kullanım notları gerçekçi mi?" },
    { key: "sembol_netligi", question: "Her hücrenin görsel tanımı tek, somut, öğrencinin yaşına uygun (yetişkinde çocuksu/çizgi film tarzı değil) bir simge mi (metin yok); kelime–görsel–cümle birbirini tutuyor mu?" },
  ],
  generic: (o) => {
    const b = o as Rec;
    const cells = (Array.isArray(b.cells) ? b.cells : []) as Rec[];
    return { ...b, cells: cells.map((c) => ({ ...c, usage: "İhtiyaç duyduğunda gösterir.", visualDescription: "Bir nesne." })), instructions: "Panoyu düzenli kullanın.", expertNotes: "Bireysel farklılıklara dikkat edin.", homeGuidance: "Uygun ortam sağlayın ve gelişimini takip edin.", adaptations: "Gerekirse uyarlayın." };
  },
});
```

- [ ] **Step 5: Vakaları yaz**

```json
// apps/hub/evals/tools/studio/weekly-plan/cases.json
[
  { "id": "hp-01", "tags": ["3 ders", "ai", "zengin bağlam"], "student": "stu-ela",
    "purpose": "Son oturum özetindeki 'sonraki hedef'in ilk derse alınması; dinozor/tren ilgi alanı; geçiş kartı rutininin derslere gömülmesi; 40 dk'lık gerçekçi süre dağılımı.",
    "body": { "weekStart": "2026-10-12", "sessionsPerWeek": 3, "sessionDuration": "40", "focusAreas": ["Üç kelimeli istek cümlesi", "Sıra alma"], "planApproach": "ai", "daySchedule": [{ "dayName": "Pazartesi", "lessonCount": 1 }, { "dayName": "Çarşamba", "lessonCount": 1 }, { "dayName": "Cuma", "lessonCount": 1 }] } },
  { "id": "hp-02", "tags": ["12 ders", "bütçe", "guided", "12 yaş"], "student": "stu-ecem",
    "purpose": "12 derslik üst sınır (6 gün × 2): şişmeden tam yapı, tekrar etmeyen progresyon, tamamlanmış hedef kodlarının (4.2, 4.3) yeniden planlanmaması.",
    "body": { "weekStart": "2026-10-12", "sessionsPerWeek": 12, "sessionDuration": "30", "focusAreas": ["Nedensel bağlaçlar", "Okuduğunu anlama", "Anlatı sıralama"], "planApproach": "guided", "daySchedule": [{ "dayName": "Pazartesi", "lessonCount": 2 }, { "dayName": "Salı", "lessonCount": 2 }, { "dayName": "Çarşamba", "lessonCount": 2 }, { "dayName": "Perşembe", "lessonCount": 2 }, { "dayName": "Cuma", "lessonCount": 2 }, { "dayName": "Cumartesi", "lessonCount": 2 }] } },
  { "id": "hp-03", "tags": ["4 ders", "guided", "işitme", "ek not"], "student": "stu-defne",
    "purpose": "İşitme kaybı + gürültü değişkeni: son özetteki 'arka plan gürültüsünü kademeli ekle' planının derslere yayılması; ek notun (cihaz yorgunluğu) dikkate alınması.",
    "body": { "weekStart": "2026-10-19", "sessionsPerWeek": 4, "sessionDuration": "45", "focusAreas": ["/s/–/ş/ ayrımı", "Gürültüde dinleme"], "planApproach": "guided", "daySchedule": [{ "dayName": "Salı", "lessonCount": 2 }, { "dayName": "Perşembe", "lessonCount": 2 }], "extraNote": "Uzun oturumlarda cihazı çıkarmak istiyor; ikinci dersi oyun ağırlıklı tut." } },
  { "id": "hp-04", "tags": ["2 ders", "ai", "4 yaş", "boş özet"], "student": "stu-yigit",
    "purpose": "4 yaş + 5 dk masa toleransı + 20 dk ders: hareketli, kısa bloklu etkinlikler; son özet olmadan plan kurma (uydurma geçmiş yok).",
    "body": { "weekStart": "2026-10-12", "sessionsPerWeek": 2, "sessionDuration": "20", "focusAreas": ["/k/ sesi kelime başı"], "planApproach": "ai", "daySchedule": [{ "dayName": "Pazartesi", "lessonCount": 1 }, { "dayName": "Perşembe", "lessonCount": 1 }] } }
]
```

```json
// apps/hub/evals/tools/studio/comm-board/cases.json
[
  { "id": "pano-01", "tags": ["öğrencili", "temel ihtiyaçlar", "6", "ızgara"], "student": "stu-ela",
    "purpose": "OSB + iki kelimelik istek: hücrelerin 'ben … istiyorum' cümlesine genişletilebilir olması; dinozor/tren ilgi alanının bir hücreye girmesi; Fitzgerald renkleri doğru.",
    "body": { "boardType": "basic_needs", "symbolCount": 6, "layout": "grid", "textMode": "word_sentence", "colorCoding": true } },
  { "id": "pano-02", "tags": ["öğrencisiz", "özel kategori", "12", "yalnız kelime"], "student": null,
    "purpose": "'Özel' kategori + 12 hücre ucu: tema dışına çıkmadan 12 farklı sembol; metin modu yalnız kelime (cümle alanı boş kalmalı); öğrencisiz genel materyal.",
    "body": { "boardType": "custom", "customCategory": "Dinozor oyunu", "symbolCount": 12, "layout": "grid", "textMode": "word_only", "colorCoding": true } },
  { "id": "pano-03", "tags": ["öğrencili", "duygular", "9", "şerit", "renk yok"], "student": "stu-defne",
    "purpose": "Duygular panosu şerit düzende, renk kodu kapalı: yoğunluk basamaklı duygular (biraz/çok), işitme kaybına uygun yüz ifadesi görselleri.",
    "body": { "boardType": "emotions", "symbolCount": 9, "layout": "strip", "textMode": "word_sentence", "colorCoding": false } },
  { "id": "pano-04", "tags": ["öğrencili", "yetişkin", "istek", "4"], "student": "stu-sibel",
    "purpose": "Yetişkin dizartri: çocuk dili ve çizgi film görseli yok; sınıf/işe dönüş bağlamında 4 işlevsel istek.",
    "body": { "boardType": "requests", "symbolCount": 4, "layout": "grid", "textMode": "word_sentence", "colorCoding": true } }
]
```

- [ ] **Step 6: Registry + testler** — iki satır ekle; `ev evals/tools/studio/weekly-plan evals/tools/studio/comm-board` PASS; bağlantı denemesi `EVAL_FLOW=/tmp/ev-wp EVAL_TOOL=studio/weekly-plan EVAL_VARIANT=baseline EVAL_CASES=hp-01` → istek md'sinde `Son oturum özeti` bloğu ve `days dizisi tam olarak 3 ders içersin.` satırı; `/tmp/ev-wp` silinir.

- [ ] **Step 7: Lint, tip, commit**

```bash
cd apps/hub && node_modules/.bin/eslint evals && npm run typecheck:evals
git add apps/hub/evals/tools && git commit -m "feat(evals): haftalık plan ve iletişim panosu adaptörleri (4+4 vaka)"
```

---

### Task 10: Studio — eşleştirme oyunu (`matching-game`) ve sesletim (`phonation`) adaptörleri

**Files:**
- Create: `apps/hub/evals/tools/studio/matching-game/{adapter.ts,checks.ts,checks.selftest.eval.ts,cases.json}`
- Create: `apps/hub/evals/tools/studio/phonation/{adapter.ts,checks.ts,checks.selftest.eval.ts,cases.json}`
- Modify: `apps/hub/evals/tools/registry.ts` (+2)

**İnceleme sonrası puanlayıcı kuralları (uygulanan):** Genel kural: `talimat` bileşeni yalnız prompt'un söylediği ya da UI'nin okuduğu bir şey bozulunca düşer; çıkarımsal ölçüler `details`'a ya da hakeme gider. matching-game: `ipucu` puanlanmaz (prompt "opsiyonel"; details `ipuclu`); `gorsel_tutarli` türe göre (soyut türler: görsel yok; image_desc: hepsinde; category ve definition: ya hepsinde ya hiçbirinde); `kart_bicimi` (definition 1 cümle; image_desc ≤2 cümle; kelime kartı ≤3 sözcük, zor düzeyde ≤5 — deyimler); `id_sirali`, `tur_yankisi` (UI/PDF modelin yankıladığı matchType/difficulty'yi okur, rota ezmez), `gorsel_ingilizce` (image_desc/category/definition); `tekrar_yok` iki kartı da sayar (category'de yalnız A). phonation: kelime düzeyi puanları (`hedef_tutarli`, `tekrar_yok`, `gorsel_dolu`, `gorsel_ingilizce`) yalnız model kelimeleri yazdıysa hesaplanır ve banka varken `talimat`'a GİRMEZ (prompt "geçici kelime yaz, takılma" demiştir); `gorsel_dolu` ve `sahne_tema` yalnız `details`; yapı kuralları prompt/UI'den: bingo tüm hücreler hedef sesli, 9/16/25 kare, serbest kare (ceil(n/2), satır=sütun) muaf; yılan–merdiven 5 sütun, bitiş karesinde yılan/merdiven yok (UI 🏆), başlangıç karesinde yılan yok (merdiven serbest), özel kare ≤ n/2; labirent giriş→çıkış 4-komşu yolu (`yol_var`, UI GİRİŞ/ÇIKIŞ) — prompt söylemez, taban düşük puan alabilir (bilerek); `pozisyon` 1..N; `celdirici` hem hedef hem çeldirici ister; bayat-bayrak tuzağı `banka_kaybi_tutarsiz` (öğrencili vakada öğelerin ≥%80'i banka görsel tanımı taşırsa). Hakem metni banka modunda özdeş kelime listesini tek satıra indirir. Ortak: `turkceMi`, `alanlarDolu` sharedChecks'te; `gorsel_ingilizce` hiç görsel yoksa puanlanmaz (anahtar yok) — comm-board da aynı.

Sözleşmeler: matching-game gövdesi `{ matchType, pairCount: "6"|"8"|"10"|"12" (STRING), difficulty, theme?, goalTitle? }`; çıktı `game = { title, pairs[{id, cardA, cardB, hint, visualPrompt}], instructions, expertNotes, adaptations }` (görsel ya hepsinde ya hiçbirinde). phonation gövdesi `{ targetSounds[], activityType: "sound_hunt"|"bingo"|"snakes_ladders"|"sound_maze", difficulty, itemCount 8–25, theme? }`; çıktı `activity = { title, grid{rows, cols, cells[{position, word, hasTargetSound, isLadder, isSnake, instruction, visualPrompt}]}, scene, objects[{name, hasTargetSound, description, visualPrompt}], instructions, expertNotes, adaptations }`; `sound_hunt` → scene+objects (grid boş); diğerleri grid (bingo 3×3/4×4/5×5; snakes rows=itemCount/5, cols=5; maze hasTargetSound true/false). Öğrencili istekte banka kelimeleri ezilmez (bilinen ürün hatası; Task 7'deki `BANKA_STASH_KAYBI`'yi içe aktar) → modelin "geçici" kelimeleri kalır; kontroller kelime–hedef harf tutarlılığını yine ölçer.

- [ ] **Step 1: Kontrol testlerini yaz**

```ts
// apps/hub/evals/tools/studio/matching-game/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { matchingGameChecks, type MatchingGameBody } from "./checks";

const body: MatchingGameBody = { matchType: "synonym", pairCount: "6", difficulty: "easy" };
const pair = (id: number, a: string, b: string, v = "") => ({ id, cardA: a, cardB: b, hint: "h", visualPrompt: v });
const ok = { title: "T", pairs: [pair(1, "büyük", "iri"), pair(2, "küçük", "ufak"), pair(3, "hızlı", "çabuk"), pair(4, "güzel", "hoş"), pair(5, "mutlu", "neşeli"), pair(6, "soğuk", "serin")], instructions: "i", expertNotes: "e", adaptations: "a" };

describe("matchingGameChecks", () => {
  it("çift sayısı, dolu kartlar, tekrarsızlık, görsel tutarlılığı (hiçbirinde)", () => {
    const r = matchingGameChecks({ body, output: ok, raw: ok, text: "", alias: null });
    expect(r.scores).toMatchObject({ cift_sayisi: 1, cift_dolu: 1, tekrar_yok: 1, gorsel_tutarli: 1, ipucu: 1, farkli: 1 });
  });
  it("yarısında görsel → tutarsız; cardA = cardB → farklı 0; sayı tutmaz", () => {
    const out = { ...ok, pairs: [pair(1, "a", "a", "x"), pair(2, "b", "c")] };
    const r = matchingGameChecks({ body, output: out, raw: out, text: "", alias: null });
    expect(r.scores.gorsel_tutarli).toBe(0);
    expect(r.scores.farkli).toBe(0.5);
    expect(r.scores.cift_sayisi).toBe(0);
  });
  it("çift yoksa sert hata", () => {
    expect(matchingGameChecks({ body, output: { ...ok, pairs: [] }, raw: ok, text: "", alias: null }).hard).toContain("cift_yok");
  });
});
```

```ts
// apps/hub/evals/tools/studio/phonation/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { phonationChecks, type PhonationBody } from "./checks";

const cell = (position: number, word: string, hasTargetSound: boolean, extra = {}) => ({ position, word, hasTargetSound, isLadder: false, isSnake: false, instruction: null, visualPrompt: "x", ...extra });
const base = { title: "T", instructions: "i", expertNotes: "e", adaptations: "a", scene: null, objects: [], grid: null };

describe("phonationChecks", () => {
  it("bingo 3×3: hücre sayısı, kare ızgara, hedef harf tutarlılığı", () => {
    const body: PhonationBody = { targetSounds: ["/s/"], activityType: "bingo", difficulty: "easy", itemCount: 9 };
    const out = { ...base, grid: { rows: 3, cols: 3, cells: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => cell(i, i === 9 ? "kedi" : "su", i !== 9)) } };
    const r = phonationChecks({ body, output: out, raw: out, text: "", alias: null });
    expect(r.scores).toMatchObject({ yapi: 1, oge_sayisi: 1, hedef_tutarli: 1 });
  });
  it("ses avı: sahne + nesneler; grid boş; hedef sesi içermeyen nesne hasTargetSound=true ise tutarsız", () => {
    const body: PhonationBody = { targetSounds: ["/k/"], activityType: "sound_hunt", difficulty: "easy", itemCount: 8 };
    const obj = (name: string, h: boolean) => ({ name, hasTargetSound: h, description: "d", visualPrompt: "v" });
    const out = { ...base, scene: "mutfak", objects: [obj("kaşık", true), obj("kedi", true), obj("masa", false), obj("tabak", true), obj("su", true), obj("kapı", true), obj("bardak", true), obj("ekmek", true)] };
    const r = phonationChecks({ body, output: out, raw: out, text: "", alias: null });
    expect(r.scores.yapi).toBe(1);
    expect(r.scores.hedef_tutarli).toBe(7 / 8);
  });
  it("labirent: çeldirici (false) hücre olmalı; yılan-merdiven: merdiven ve yılan işaretli hücre olmalı", () => {
    const maze: PhonationBody = { targetSounds: ["/ş/"], activityType: "sound_maze", difficulty: "hard", itemCount: 8 };
    const out = { ...base, grid: { rows: 2, cols: 4, cells: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => cell(i, "şapka", true)) } };
    expect(phonationChecks({ body: maze, output: out, raw: out, text: "", alias: null }).scores.celdirici).toBe(0);
    const sl: PhonationBody = { targetSounds: ["/r/"], activityType: "snakes_ladders", difficulty: "medium", itemCount: 10 };
    const out2 = { ...base, grid: { rows: 2, cols: 5, cells: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => cell(i, "araba", true, { isLadder: i === 3, isSnake: i === 8 })) } };
    expect(phonationChecks({ body: sl, output: out2, raw: out2, text: "", alias: null }).scores.yilan_merdiven).toBe(1);
  });
  it("yapı boşsa sert hata", () => {
    const body: PhonationBody = { targetSounds: ["/s/"], activityType: "bingo", difficulty: "easy", itemCount: 9 };
    expect(phonationChecks({ body, output: base, raw: base, text: "", alias: null }).hard).toContain("yapi_yok");
  });
});
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduklarını gör**

- [ ] **Step 3: Kontrolleri yaz**

```ts
// apps/hub/evals/tools/studio/matching-game/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { frac, lower, mean, str } from "../../../lib/sharedChecks";

export interface MatchingGameBody {
  matchType: "definition" | "image_desc" | "synonym" | "antonym" | "category" | "sentence";
  pairCount: "6" | "8" | "10" | "12";
  difficulty: "easy" | "medium" | "hard";
  theme?: string;
  goalTitle?: string;
}
type Rec = Record<string, unknown>;

export function matchingGameChecks(args: { body: MatchingGameBody; output: Rec | null; raw: Rec | null; text: string; alias: string | null }): ToolCheckOut {
  const { body, output } = args;
  const pairs = (Array.isArray(output?.pairs) ? output!.pairs : []) as Rec[];
  const hard: string[] = [];
  if (output && pairs.length === 0) hard.push("cift_yok");
  const n = pairs.length;
  const ciftSayisi = n === Number(body.pairCount) ? 1 : 0;
  const ciftDolu = n ? frac(pairs, (p) => str(p.cardA).trim().length > 0 && str(p.cardB).trim().length > 0) : 0;
  const tekrarYok = n ? new Set(pairs.map((p) => lower(str(p.cardA)).trim())).size / n : 0;
  const gorselli = pairs.filter((p) => str(p.visualPrompt).trim()).length;
  const gorselTutarli = n ? (gorselli === 0 || gorselli === n ? 1 : 0) : 0;
  const ipucu = n ? frac(pairs, (p) => str(p.hint).trim().length > 0) : 0;
  const farkli = n ? frac(pairs, (p) => lower(str(p.cardA)).trim() !== lower(str(p.cardB)).trim()) : 0;
  const alanlar = mean(["title", "instructions", "expertNotes", "adaptations"].map((k) => (str(output?.[k]).trim() ? 1 : 0)));
  const scores = { cift_sayisi: ciftSayisi, cift_dolu: ciftDolu, tekrar_yok: tekrarYok, gorsel_tutarli: gorselTutarli, ipucu, farkli, alanlar };
  return { scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 }, details: { cift: n, gorselli, ...scores }, hard };
}
```

```ts
// apps/hub/evals/tools/studio/phonation/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { frac, lower, mean, str } from "../../../lib/sharedChecks";
import { letterOf } from "../articulation/checks";

export interface PhonationBody {
  targetSounds: string[];
  activityType: "sound_hunt" | "bingo" | "snakes_ladders" | "sound_maze";
  difficulty: "easy" | "medium" | "hard";
  itemCount: number;
  theme?: string;
}
type Rec = Record<string, unknown>;
const arr = (v: unknown) => (Array.isArray(v) ? (v as Rec[]) : []);

export function phonationChecks(args: { body: PhonationBody; output: Rec | null; raw: Rec | null; text: string; alias: string | null }): ToolCheckOut {
  const { body, output } = args;
  const letters = body.targetSounds.map(letterOf);
  const grid = (output?.grid ?? null) as Rec | null;
  const cells = arr(grid?.cells);
  const objects = arr(output?.objects);
  const hunt = body.activityType === "sound_hunt";
  const items = hunt ? objects : cells;
  const kelime = (i: Rec) => lower(str(hunt ? i.name : i.word));
  const hard: string[] = [];
  if (output && items.length === 0) hard.push("yapi_yok");

  const yapi = hunt ? (str(output?.scene).trim() && objects.length && cells.length === 0 ? 1 : 0) : cells.length && objects.length === 0 ? 1 : 0;
  const rows = Number(grid?.rows), cols = Number(grid?.cols);
  let ogeSayisi: number;
  if (hunt) ogeSayisi = objects.length >= body.itemCount - 1 ? 1 : 0;
  else if (body.activityType === "bingo") ogeSayisi = rows === cols && [9, 16, 25].includes(rows * cols) && cells.length === rows * cols ? 1 : 0;
  else ogeSayisi = cells.length >= body.itemCount - 1 && cells.length === rows * cols ? 1 : 0;
  const hedefTutarli = items.length ? frac(items, (i) => letters.some((l) => kelime(i).includes(l)) === (i.hasTargetSound !== false)) : 0;
  const gorselDolu = items.length ? frac(items, (i) => str(i.visualPrompt).trim().length > 0) : 0;
  const alanlar = mean(["title", "instructions", "expertNotes", "adaptations"].map((k) => (str(output?.[k]).trim() ? 1 : 0)));
  const scores: Record<string, number> = { yapi, oge_sayisi: ogeSayisi, hedef_tutarli: hedefTutarli, gorsel_dolu: gorselDolu, alanlar };
  if (body.activityType === "sound_maze" || hunt) scores.celdirici = items.some((i) => i.hasTargetSound === false) ? 1 : 0;
  if (body.activityType === "snakes_ladders") scores.yilan_merdiven = cells.some((c) => c.isLadder === true) && cells.some((c) => c.isSnake === true) ? 1 : 0;
  return { scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 }, details: { oge: items.length, ...scores }, hard };
}
```

- [ ] **Step 4: Adaptörleri yaz**

```ts
// apps/hub/evals/tools/studio/matching-game/adapter.ts
import { studioAdapter } from "../../../lib/adapterFactory";
import { str } from "../../../lib/sharedChecks";
import { matchingGameChecks, type MatchingGameBody } from "./checks";

const MATCH_TR: Record<MatchingGameBody["matchType"], string> = { definition: "kelime — tanım", image_desc: "kelime — resim açıklaması", synonym: "eş anlamlı", antonym: "zıt anlamlı", category: "kategori", sentence: "cümle tamamlama" };
const DIFF_TR = { easy: "kolay", medium: "orta", hard: "zor" };
type Rec = Record<string, unknown>;

export const adapter = studioAdapter<MatchingGameBody>({
  id: "studio/matching-game",
  label: "Kelime eşleştirme oyunu (Studio)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/tools/matching-game/route"),
  responseKey: "game",
  studentRequired: false,
  requestLines: (b) => [
    `- Tür: ${MATCH_TR[b.matchType]} · ${b.pairCount} çift · Zorluk: ${DIFF_TR[b.difficulty]} · Tema: ${b.theme ?? "karışık"}${b.goalTitle ? ` · Müfredat hedefi: ${b.goalTitle}` : ""}`,
  ],
  renderOutput: (g) => {
    const pairs = (Array.isArray(g.pairs) ? g.pairs : []) as Rec[];
    return [
      `Başlık: ${str(g.title) || "—"}`,
      ...pairs.map((p) => `${String(p.id)}. ${str(p.cardA)} ↔ ${str(p.cardB)}${str(p.hint) ? ` (ipucu: ${str(p.hint)})` : ""}${str(p.visualPrompt) ? ` görsel: ${str(p.visualPrompt)}` : ""}`),
      `Yönerge: ${str(g.instructions) || "—"}`, `Uzman notları: ${str(g.expertNotes) || "—"}`, `Uyarlamalar: ${str(g.adaptations) || "—"}`,
    ].join("\n");
  },
  checks: matchingGameChecks,
  criteria: [
    { key: "cift_kesinligi", question: "Her çift tek ve doğru biçimde eşleşiyor mu (eş/zıt anlam, tanım, kategori gerçekten doğru; başka bir kartla da eşleşebilen belirsiz çift yok)?" },
    { key: "seviye_uyumu", question: "Kelime dağarcığı ve ipuçları istenen zorluğa ve (varsa) öğrencinin yaşına/tanısına uygun mu; tema tutarlı mı?" },
  ],
  generic: (o) => {
    const g = o as Rec;
    const pairs = (Array.isArray(g.pairs) ? g.pairs : []) as Rec[];
    return { ...g, pairs: pairs.map((p) => ({ ...p, hint: "Dikkatli bak." })), instructions: "Kartları eşleştirin.", expertNotes: "Çok duyulu yaklaşım kullanın. Düzenli tekrar önemlidir.", adaptations: "Bireysel farklılıklara dikkat edin." };
  },
});
```

```ts
// apps/hub/evals/tools/studio/phonation/adapter.ts
import { studioAdapter } from "../../../lib/adapterFactory";
import { str } from "../../../lib/sharedChecks";
import { phonationChecks, type PhonationBody } from "./checks";

const ACT_TR: Record<PhonationBody["activityType"], string> = { sound_hunt: "Ses avı (sahne + nesneler)", bingo: "Tombala (kare ızgara)", snakes_ladders: "Yılan–merdiven (5 sütun)", sound_maze: "Ses labirenti (hedef + çeldirici)" };
const DIFF_TR = { easy: "kolay", medium: "orta", hard: "zor" };
type Rec = Record<string, unknown>;

export const adapter = studioAdapter<PhonationBody>({
  id: "studio/phonation",
  label: "Sesletim oyunu (Studio)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/tools/phonation/route"),
  responseKey: "activity",
  studentRequired: false,
  requestLines: (b) => [
    `- Aktivite: ${ACT_TR[b.activityType]} · Hedef ses(ler): ${b.targetSounds.join(", ")} · Zorluk: ${DIFF_TR[b.difficulty]} · Öğe: ${b.itemCount} · Tema: ${b.theme ?? "karışık"}`,
    "- Not: öğrencisiz istekte kelimeler uzman-onaylı bankadan yazılır (iki adayda aynı); öğrencili istekte bilinen ürün hatası yüzünden modelin kelimeleri kalır — kelime seçimini iki adaya da eşit yükle.",
  ],
  renderOutput: (a) => {
    const grid = (a.grid ?? null) as Rec | null;
    const cells = (Array.isArray(grid?.cells) ? grid!.cells : []) as Rec[];
    const objects = (Array.isArray(a.objects) ? a.objects : []) as Rec[];
    return [
      `Başlık: ${str(a.title) || "—"}`,
      str(a.scene) ? `Sahne: ${str(a.scene)}` : "",
      ...objects.map((o) => `• ${str(o.name)} [${o.hasTargetSound ? "hedef" : "çeldirici"}] ${str(o.description)} · görsel: ${str(o.visualPrompt) || "—"}`),
      grid ? `Izgara ${String(grid.rows)}×${String(grid.cols)}:` : "",
      ...cells.map((c) => `${String(c.position)}. ${str(c.word)} [${c.hasTargetSound === false ? "çeldirici" : "hedef"}]${c.isLadder ? " merdiven" : ""}${c.isSnake ? " yılan" : ""}${str(c.instruction) ? ` — ${str(c.instruction)}` : ""} · görsel: ${str(c.visualPrompt) || "—"}`),
      `Yönerge: ${str(a.instructions) || "—"}`, `Uzman notları: ${str(a.expertNotes) || "—"}`, `Uyarlamalar: ${str(a.adaptations) || "—"}`,
    ].filter(Boolean).join("\n");
  },
  checks: phonationChecks,
  criteria: [
    { key: "ses_dogrulugu", question: "Hedef/çeldirici etiketleri kelimelerle tutarlı mı; kelimeler gerçek, yaşa uygun ve hedef sesi belirgin biçimde taşıyor mu; çeldiriciler gerçekten hedef sesi içermiyor mu?" },
    { key: "oyun_uygulanabilirligi", question: "Yönerge ve yapı (sahne, ızgara, yılan/merdiven, labirent) seansta çıktı alınıp hemen oynanabilir mi; kurallar net ve zorluğa uygun mu?" },
  ],
  generic: (o) => {
    const a = o as Rec;
    return { ...a, instructions: "Oyunu kurallarına göre oynayın.", expertNotes: "Çok duyulu yaklaşım kullanın. Düzenli tekrar önemlidir.", adaptations: "Bireysel farklılıklara dikkat edin." };
  },
});
```

- [ ] **Step 5: Vakaları yaz**

```json
// apps/hub/evals/tools/studio/matching-game/cases.json
[
  { "id": "es-01", "tags": ["öğrencili", "eş anlamlı", "10", "orta", "tema"], "student": "stu-ecem",
    "purpose": "12 yaş DLD + okul teması: eş anlam çiftlerinin tek-eşlemeli olması; ipuçlarının yazılı düşünmeyi destekleyen biçimde verilmesi.",
    "body": { "matchType": "synonym", "pairCount": "10", "difficulty": "medium", "theme": "okul" } },
  { "id": "es-02", "tags": ["öğrencisiz", "resim açıklaması", "8", "kolay", "görsel"], "student": null,
    "purpose": "Görselli tür: TÜM çiftlerde somut nesne + İngilizce görsel tanımı; mutfak teması; öğrencisiz genel materyal.",
    "body": { "matchType": "image_desc", "pairCount": "8", "difficulty": "easy", "theme": "mutfak" } },
  { "id": "es-03", "tags": ["öğrencili", "kategori", "6", "kolay", "müfredat hedefi"], "student": "stu-ela",
    "purpose": "6 yaş OSB + müfredat hedefi: kategori çiftlerinin hedefe hizalanması; dinozor/tren ilgisinin kullanımı; soyut kategoriden kaçınma.",
    "body": { "matchType": "category", "pairCount": "6", "difficulty": "easy", "goalTitle": "Nesneleri işlevine göre gruplar (yiyecek, taşıt, hayvan)" } },
  { "id": "es-04", "tags": ["öğrencili", "cümle tamamlama", "12", "zor", "bütçe"], "student": "stu-kerem",
    "purpose": "12 çift + zor + cümle tamamlama: çıktı bütçesi; /r/ hedefli artikülasyon öğrencisinde cümlelerin /r/ içermesi beklenir mi (araç dil aracı; hakem aşırı zorlama cezalandırmasın).",
    "body": { "matchType": "sentence", "pairCount": "12", "difficulty": "hard" } }
]
```

```json
// apps/hub/evals/tools/studio/phonation/cases.json
[
  { "id": "ses-01", "tags": ["öğrencili", "ses avı", "/k/", "4 yaş", "tema"], "student": "stu-yigit",
    "purpose": "4 yaş öne alma (/k/→/t/): mutfak sahnesinde /k/'li nesneler + /t/'li çeldiriciler (minimal çift mantığı); kısa yönerge.",
    "body": { "targetSounds": ["/k/"], "activityType": "sound_hunt", "difficulty": "easy", "itemCount": 10, "theme": "mutfak" } },
  { "id": "ses-02", "tags": ["öğrencisiz", "tombala", "4×4", "/s/"], "student": null,
    "purpose": "Tombala 16 hücre (4×4): tüm hücreler hedef sesli ve bankadan; öğrencisiz genel materyal; görsel tanımları tek nesne.",
    "body": { "targetSounds": ["/s/"], "activityType": "bingo", "difficulty": "medium", "itemCount": 16 } },
  { "id": "ses-03", "tags": ["öğrencili", "yılan–merdiven", "/r/", "20"], "student": "stu-kerem",
    "purpose": "Yılan–merdiven 20 hücre (4×5): merdiven/yılan dağılımı, /r/→/l/ değişimine özgü uzman notu; 9 yaşa uygun oyun kuralı.",
    "body": { "targetSounds": ["/r/"], "activityType": "snakes_ladders", "difficulty": "medium", "itemCount": 20 } },
  { "id": "ses-04", "tags": ["öğrencili", "labirent", "/ş/", "25", "bütçe", "işitme"], "student": "stu-defne",
    "purpose": "Labirent 25 öğe üst sınır (max_tokens 4096 kesilme riski): hedef/çeldirici dengesi, işitme kaybında /s/–/ş/ çeldiricisi; kesilirse sert hata görünür.",
    "body": { "targetSounds": ["/ş/"], "activityType": "sound_maze", "difficulty": "hard", "itemCount": 25 } }
]
```

- [ ] **Step 6: Registry + testler** — iki satır; `ev evals/tools/studio/matching-game evals/tools/studio/phonation` PASS; bağlantı denemesi `EVAL_FLOW=/tmp/ev-ph EVAL_TOOL=studio/phonation EVAL_VARIANT=baseline EVAL_CASES=ses-02` → istek md'sinde `NOT: Kelimeler sistem tarafından` satırı; aynı komut ikinci kez koşunca `exchange/*.request.json` içindeki `hash` DEĞİŞMEMELİ (tohumlu banka: `grep hash` ile karşılaştır). `/tmp/ev-ph` silinir.

- [ ] **Step 7: Lint, tip, commit**

```bash
cd apps/hub && node_modules/.bin/eslint evals && npm run typecheck:evals
git add apps/hub/evals/tools && git commit -m "feat(evals): eşleştirme ve sesletim adaptörleri (4+4 vaka); banka tohumu doğrulandı"
```

---

### Task 11: Studio — öğrenme kartı üreticisi (`cards/generate`) ve AI profili (`ai-profile`) adaptörleri

**Files:**
- Create: `apps/hub/evals/tools/studio/cards/{adapter.ts,checks.ts,checks.selftest.eval.ts,cases.json}`
- Create: `apps/hub/evals/tools/studio/ai-profile/{adapter.ts,checks.ts,checks.selftest.eval.ts,cases.json}`
- Modify: `apps/hub/evals/tools/registry.ts` (+2)

**İnceleme sonrası puanlayıcı kuralları (uygulanan):** Studio markdown dalında `tani_cumlesi` `talimat`'a GİRMEZ (yalnız details; Atölye'de girer — `taniPuanla` seçeneği): profilin işi tanıyı açıklamaktır. Profil: `bolum_cumle` yalnız prompt'un sayı verdiği 4 bölümde (Tanı/Beklenen Gelişim/Müfredat 3–5 cümle; Öncelikli 3–5 madde — madde/numara/`####`/kalın etiket sayılır), diğer 3 bölüm details; `modulSayisi` vaka gövdesinde (0 → Müfredat alt sınırı 1); `ana_baslik` (UI yalnız `## ` ile böler), `fazlalik` (önsöz/kod çiti/fazla başlık yok), `ayrac` iki ana başlık arasında (tek hata tek puan). Kart: `odak` yalnız details; `gosterge_olculebilir` (kural 8; OLCUT + "en az N" + yazılı oranlar), `isim_kullanimi` (kural 2d; ham therapistNotes'ta rumuz en az bir kez, yalnız öğrencili); üçüncü kriter `yas_uyumu` (yetişkin vakası); hakem notu: son özet ve müfredat başlıkları araca gitmez. Shim: araç `title`/`description` şema yayılımından SONRA (kök şema başlığı kimliği ezemez).

Kart üreticisi `createToolHandler` KULLANMAZ: `POST(request)` → `tools: [CARD_TOOL], tool_choice: { type: "tool", name: "emit_card" }`; yanıt `{ success, card: { ...tool_use.input, category, difficulty, ageGroup }, cardId }`. Gövde `{ category: "speech"|"language"|"hearing", difficulty, ageGroup: "3-6"|"7-12"|"13-18"|"adult", focusArea?, studentId?, curriculumGoalIds? }` (taklitte `curriculumGoal.findMany → []`, bu yüzden vakalar `focusArea` kullanır). `emit_card` şeması: `title ≤80`, `objective`, `materials[1–6]`, `instructions[3–8]` ("Adım N: …"), `exercises[1–4]{name, description, repetitions}`, `therapistNotes`, `progressIndicators[2–5]`, `homeExercise`. Prompt'ta rumuz `- İsim: <rumuz>` (Task 4 deseni). Alt-ajan modunda Task 4'ün `tool_use` taklidi devrededir.

AI profili: `POST(_req, { params: Promise<{ id }> })`, gövde yok; `generateStudentProfile(studentId, therapistId)` → `{ success, aiProfile }` (Markdown; `## Kavramsal Arka Plan` → 3 `###`, `---`, `## Uzmana Öneriler` → 4 `###`). Prompt'ta `Öğrenci adı: <rumuz>`. Fikstürün mevcut `aiProfile` alanı prompt'a GİRMEZ (yeniden üretim).

- [ ] **Step 1: Kontrol testlerini yaz**

```ts
// apps/hub/evals/tools/studio/cards/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { cardChecks, type CardBody } from "./checks";

const body: CardBody = { category: "language", difficulty: "easy", ageGroup: "3-6", focusArea: "üç kelimeli istek cümlesi" };
const ok = {
  title: "Su istiyorum", objective: "Üç kelimeli istek cümlesi kurma", materials: ["bardak", "kart"],
  instructions: ["Adım 1: Bardağı göster.", "Adım 2: Bekle.", "Adım 3: Modelle."],
  exercises: [{ name: "İstek oyunu", description: "d", repetitions: "5 kez" }],
  therapistNotes: "n", progressIndicators: ["%80 bağımsız", "3 oturum"], homeExercise: "h",
  category: "language", difficulty: "easy", ageGroup: "3-6",
};

describe("cardChecks", () => {
  it("tam kart: tüm puanlar 1; odak alanı amaçta", () => {
    const r = cardChecks({ body, output: ok, raw: ok, text: "", alias: "Hazal" });
    expect(r.scores).toMatchObject({ baslik_80: 1, adim_bicimi: 1, adim_sayisi: 1, materyal: 1, egzersiz: 1, gosterge: 1, alanlar: 1, odak: 1 });
    expect(r.hard).toEqual([]);
  });
  it("adım biçimi bozuk, başlık uzun, egzersiz boş", () => {
    const out = { ...ok, title: "x".repeat(81), instructions: ["Adım 1: a", "b", "Adım 3: c"], exercises: [] };
    const r = cardChecks({ body, output: out, raw: out, text: "", alias: null });
    expect(r.scores.baslik_80).toBe(0);
    expect(r.scores.adim_bicimi).toBeCloseTo(2 / 3);
    expect(r.scores.egzersiz).toBe(0);
  });
  it("yönerge yoksa sert hata", () => {
    expect(cardChecks({ body, output: { ...ok, instructions: [] }, raw: ok, text: "", alias: null }).hard).toContain("yonerge_yok");
  });
});
```

```ts
// apps/hub/evals/tools/studio/ai-profile/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { PROFIL_BOLUMLERI, profileChecks } from "./checks";

const bolum = (h: string, n: number) => `### ${h}\n${Array.from({ length: n }, (_, i) => `Cümle ${i + 1} burada.`).join(" ")}\n`;
const ok = `## Kavramsal Arka Plan\n\n${bolum("Tanının Klinik Açıklaması", 4)}\n${bolum("Bu Yaş Grubunda Beklenen Gelişim", 3)}\n${bolum("Müfredat Modülleriyle İlişki", 5)}\n---\n\n## Uzmana Öneriler\n\n${bolum("Öncelikli Çalışma Alanları", 3)}\n${bolum("Etkili Yaklaşım ve Teknikler", 4)}\n${bolum("Dikkat Edilmesi Gereken Noktalar", 3)}\n${bolum("Aile ile Paylaşılabilecek Öneriler", 4)}`;

describe("profileChecks", () => {
  it("7 alt bölüm, 3–5 cümle, ayraç", () => {
    const r = profileChecks({ body: {}, output: ok, raw: null, text: ok, alias: "Hazal" });
    expect(PROFIL_BOLUMLERI).toHaveLength(9);
    expect(r.scores).toMatchObject({ bolum_cumle: 1, ayrac: 1 });
  });
  it("bir bölüm 8 cümle ve ayraç yoksa düşer", () => {
    const out = ok.replace("---\n", "").replace(bolum("Dikkat Edilmesi Gereken Noktalar", 3), bolum("Dikkat Edilmesi Gereken Noktalar", 8));
    const r = profileChecks({ body: {}, output: out, raw: null, text: out, alias: null });
    expect(r.scores.ayrac).toBe(0);
    expect(r.scores.bolum_cumle).toBeCloseTo(6 / 7);
  });
});
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduklarını gör**

- [ ] **Step 3: Kontrolleri yaz**

```ts
// apps/hub/evals/tools/studio/cards/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { frac, lower, mean, str } from "../../../lib/sharedChecks";

export interface CardBody {
  category: "speech" | "language" | "hearing";
  difficulty: "easy" | "medium" | "hard";
  ageGroup: "3-6" | "7-12" | "13-18" | "adult";
  focusArea?: string;
  curriculumGoalIds?: string[];
}
type Rec = Record<string, unknown>;
const arr = (v: unknown) => (Array.isArray(v) ? (v as unknown[]) : []);
const between = (n: number, lo: number, hi: number) => (n >= lo && n <= hi ? 1 : 0);

export function cardChecks(args: { body: CardBody; output: Rec | null; raw: Rec | null; text: string; alias: string | null }): ToolCheckOut {
  const { body, output } = args;
  const ins = arr(output?.instructions).map(String);
  const ex = arr(output?.exercises) as Rec[];
  const hard: string[] = [];
  if (output && ins.length === 0) hard.push("yonerge_yok");
  const odakAnahtar = lower(body.focusArea ?? "").split(/\s+/).filter((w) => w.length >= 4)[0] ?? "";
  const scores = {
    baslik_80: str(output?.title).length > 0 && str(output?.title).length <= 80 ? 1 : 0,
    adim_bicimi: ins.length ? frac(ins, (s) => /^Adım \d+:/.test(s)) : 0,
    adim_sayisi: between(ins.length, 3, 8),
    materyal: between(arr(output?.materials).length, 1, 6),
    egzersiz: ex.length ? between(ex.length, 1, 4) * frac(ex, (e) => Boolean(str(e.name).trim() && str(e.description).trim() && str(e.repetitions).trim())) : 0,
    gosterge: between(arr(output?.progressIndicators).length, 2, 5),
    alanlar: mean(["objective", "therapistNotes", "homeExercise"].map((k) => (str(output?.[k]).trim() ? 1 : 0))),
    odak: odakAnahtar ? (lower(`${str(output?.objective)} ${str(output?.title)}`).includes(odakAnahtar.slice(0, 5)) ? 1 : 0) : 1,
  };
  return { scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 }, details: { adim: ins.length, egzersiz: ex.length, ...scores }, hard };
}
```

```ts
// apps/hub/evals/tools/studio/ai-profile/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { sections } from "../../../lib/markdown";
import { countSentences, frac, mean } from "../../../lib/sharedChecks";

/** Sistem prompt'unun istediği 2 ana + 7 alt başlık (normalleştirilmiş başlıkta aranır). */
export const PROFIL_BOLUMLERI: RegExp[] = [
  /kavramsal arka plan/, /tanının klinik açıklaması/, /beklenen gelişim/, /müfredat modülleriyle ilişki/,
  /uzmana öneriler/, /öncelikli çalışma alanları/, /etkili yaklaşım/, /dikkat edilmesi gereken/, /aile ile paylaşılabilecek/,
];
const ALT = PROFIL_BOLUMLERI.filter((re) => !/kavramsal|uzmana öneriler/.test(re.source));

export function profileChecks(args: { body: Record<string, never>; output: unknown; raw: unknown; text: string; alias: string | null }): ToolCheckOut {
  const text = typeof args.output === "string" ? args.output : "";
  const secs = sections(text);
  // Her alt bölüm 3–5 cümle (sistem prompt'u); madde listeli bölümlerde madde sayısı cümle sayılır.
  const bolumCumle = frac(ALT, (re) => {
    const s = secs.find((x) => x.level === 3 && re.test(x.heading));
    if (!s) return false;
    const govde = s.lines.join("\n");
    const maddeler = s.lines.filter((l) => /^\s*[-*•]\s+/.test(l)).length;
    const n = maddeler || countSentences(govde);
    return n >= 3 && n <= 5;
  });
  const ayrac = /^\s*---\s*$/m.test(text) ? 1 : 0;
  const scores = { bolum_cumle: bolumCumle, ayrac };
  return { scores: { ...scores, talimat: text.trim() ? mean(Object.values(scores)) : 0 }, details: scores, hard: [] };
}
```

- [ ] **Step 4: Adaptörleri yaz**

```ts
// apps/hub/evals/tools/studio/cards/adapter.ts
import { studioAdapter } from "../../../lib/adapterFactory";
import { str } from "../../../lib/sharedChecks";
import { cardChecks, type CardBody } from "./checks";

const CAT_TR = { speech: "konuşma", language: "dil", hearing: "işitme" };
const DIFF_TR = { easy: "kolay (başlangıç)", medium: "orta (gelişim)", hard: "ileri (pekiştirme)" };
type Rec = Record<string, unknown>;

export const adapter = studioAdapter<CardBody>({
  id: "studio/cards",
  label: "Öğrenme kartı üreticisi (Studio)",
  dir: import.meta.dirname,
  send: async (body, fixtureId) => {
    const { POST } = await import("@/app/studio/api/cards/generate/route");
    const req = new Request("http://eval.local/studio/api/cards/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, ...(fixtureId ? { studentId: fixtureId } : {}) }) });
    return POST(req as never);
  },
  responseKey: "card",
  studentRequired: false,
  requestLines: (b) => [
    `- Kategori: ${CAT_TR[b.category]} · Zorluk: ${DIFF_TR[b.difficulty]} · Yaş grubu: ${b.ageGroup}${b.focusArea ? ` · Odak: ${b.focusArea}` : ""}`,
    "- Not: müfredat hedefi kimlikleri bu düzenekte çözülmez (boş); hizayı odak alanına göre değerlendir.",
  ],
  renderOutput: (c) => [
    `Başlık: ${str(c.title) || "—"}`, `Amaç: ${str(c.objective) || "—"}`,
    `Materyaller: ${(Array.isArray(c.materials) ? c.materials : []).map(String).join(", ") || "—"}`,
    "Yönerge:", ...(Array.isArray(c.instructions) ? c.instructions : []).map((s) => `  ${String(s)}`),
    "Egzersizler:", ...((Array.isArray(c.exercises) ? c.exercises : []) as Rec[]).map((e) => `  • ${str(e.name)}: ${str(e.description)} (${str(e.repetitions)})`),
    `Uzman notları: ${str(c.therapistNotes) || "—"}`,
    `İlerleme göstergeleri: ${(Array.isArray(c.progressIndicators) ? c.progressIndicators : []).map(String).join(" | ") || "—"}`,
    `Ev egzersizi: ${str(c.homeExercise) || "—"}`,
  ].join("\n"),
  checks: cardChecks,
  criteria: [
    { key: "hedef_hizasi", question: "Amaç ve egzersizler odak alanına/müfredat hedefine ve kategoriye hizalı mı; tamamlanmış hedefler yeniden hedeflenmemiş mi; son kartlarla tekrar yok mu?" },
    { key: "progresyon", question: "Zorluk düzeyi (başlangıç/gelişim/pekiştirme) içerikte görünüyor mu; ilerleme göstergeleri ölçülebilir ve karta özgü mü?" },
  ],
  generic: (o) => {
    const c = o as Rec;
    const ins = Array.isArray(c.instructions) ? c.instructions : [];
    return { ...c, objective: "Becerileri geliştirmek.", instructions: ins.map((_, i) => `Adım ${i + 1}: Çok duyulu yaklaşımla çalışın.`), therapistNotes: "Bireysel farklılıklara dikkat edin. Düzenli tekrar önemlidir.", homeExercise: "Uygun ortam sağlayın ve gelişimini takip edin.", progressIndicators: ["Gelişim gösterir", "Daha iyi yapar"] };
  },
});
```

```ts
// apps/hub/evals/tools/studio/ai-profile/adapter.ts
import { studioAdapter } from "../../../lib/adapterFactory";
import { PROFIL_BOLUMLERI, profileChecks } from "./checks";

export const adapter = studioAdapter<Record<string, never>>({
  id: "studio/ai-profile",
  label: "AI öğrenci profili (Studio)",
  dir: import.meta.dirname,
  send: async (_body, fixtureId) => {
    const { POST } = await import("@/app/studio/api/students/[id]/ai-profile/route");
    const req = new Request(`http://eval.local/studio/api/students/${fixtureId}/ai-profile`, { method: "POST" });
    return POST(req as never, { params: Promise.resolve({ id: fixtureId! }) });
  },
  responseKey: "aiProfile",
  studentRequired: true,
  output: "markdown",
  sections: PROFIL_BOLUMLERI,
  requestLines: () => ["- Araca giden alanlar: ad (rumuz), yaş, çalışma alanı, tanı, atanmış müfredat, uzman notları. Mevcut AI profili, son kartlar ve son özet araca GİTMEZ (yeniden üretim)."],
  checks: profileChecks,
  criteria: [
    { key: "klinik_dogruluk", question: "Tanı açıklaması ve yaş grubu beklentileri klinik olarak doğru ve güncel mi; genelleme ya da uydurma iddia yok mu; yetişkin öğrencide çocuk varsayımı yok mu?" },
    { key: "eyleme_donukluk", question: "Uzmana öneriler bu öğrenci için hemen uygulanabilir, somut teknik ve örnek içeriyor mu; aile önerileri sade ve yapılabilir mi?" },
  ],
});
```

- [ ] **Step 5: Vakaları yaz**

```json
// apps/hub/evals/tools/studio/cards/cases.json
[
  { "id": "kart-01", "tags": ["öğrencili", "dil", "kolay", "3-6", "zengin bağlam"], "student": "stu-ela",
    "purpose": "Son kartlarla (dinozor sıra alma, üç kelimeli istek) tekrar etmeyen, tamamlanmış 2.1 hedefini atlayan, AI profilindeki 'model olma ve genişletme' tekniğini kullanan kart.",
    "body": { "category": "language", "difficulty": "easy", "ageGroup": "3-6", "focusArea": "Üç kelimeli istek cümlesini oyun içinde bağımsız üretme" } },
  { "id": "kart-02", "tags": ["öğrencisiz", "konuşma", "orta", "7-12"], "student": null,
    "purpose": "Öğrencisiz genel kart: /r/ kelime başı için 'Adım N' biçimi, 1–4 egzersiz, ölçülebilir ilerleme göstergeleri; uydurma öğrenci bağlamı yok.",
    "body": { "category": "speech", "difficulty": "medium", "ageGroup": "7-12", "focusArea": "/r/ sesi kelime başında üretim" } },
  { "id": "kart-03", "tags": ["öğrencili", "dil", "zor", "7-12", "tamamlanmış hedef"], "student": "stu-ecem",
    "purpose": "12 yaş DLD + tamamlanmış 4.2/4.3: pekiştirme düzeyi; yazılı taslak tercihini (uzman notu) kullanan egzersiz; çizgi roman ilgisi.",
    "body": { "category": "language", "difficulty": "hard", "ageGroup": "7-12", "focusArea": "Nedensel bağlaçla dört olaylı anlatı" } },
  { "id": "kart-04", "tags": ["öğrencili", "konuşma", "orta", "yetişkin"], "student": "stu-sibel",
    "purpose": "Yetişkin dizartri: 'adult' yaş grubu; çocuk oyunu/çıkartma yok; nefes–ses koordinasyonu, işe dönüş hedefi (sınıfta sesli okuma).",
    "body": { "category": "speech", "difficulty": "medium", "ageGroup": "adult", "focusArea": "Nefes desteğiyle 10 kelimelik cümle okuma" } }
]
```

```json
// apps/hub/evals/tools/studio/ai-profile/cases.json
[
  { "id": "profil-01", "tags": ["zengin bağlam", "OSB", "müfredat"], "student": "stu-ela", "purpose": "OSB + ifade edici dil gecikmesi + Pragmatik dil modülü: klinik açıklama doğru, 6 yaş beklentisi, uzman notlarındaki (kulak kapatma, görsel sıra) somut öneriye dönüşmesi.", "body": { "modulSayisi": 1 } },
  { "id": "profil-02", "tags": ["boş bağlam", "artikülasyon"], "student": "stu-kerem", "purpose": "Not/müfredat olmadan: yalnız tanıdan (/r/→/l/) uydurmadan profil; 'bilinmiyor' alanlarını dürüstçe boş bırakma.", "body": { "modulSayisi": 0 } },
  { "id": "profil-03", "tags": ["işitme", "müfredat"], "student": "stu-defne", "purpose": "Koklear implant + işitsel algı modülü: işitme kaybına özgü (cihaz, gürültü, dudak okuma) öneriler; uzmanın işitme alanındaki rolü.", "body": { "modulSayisi": 1 } },
  { "id": "profil-04", "tags": ["yetişkin", "dizartri"], "student": "stu-sibel", "purpose": "34 yaş inme sonrası dizartri: 'bu yaş grubunda beklenen gelişim' bölümünün yetişkine uyarlanması (çocuk gelişimi yazmaması); aile yerine eş/iş bağlamı.", "body": { "modulSayisi": 0 } }
]
```

- [ ] **Step 6: Registry + testler** — `"studio/cards"` ve `"studio/ai-profile"` satırları; `ev evals/tools/studio/cards evals/tools/studio/ai-profile` PASS. Bağlantı denemeleri:
  - `EVAL_FLOW=/tmp/ev-card EVAL_TOOL=studio/cards EVAL_VARIANT=baseline EVAL_CASES=kart-02` → istek md'sinde `<output_schema>` bloğu ve `emit_card` şemasının `instructions` alanı; `pending.json` 1 satır.
  - `EVAL_FLOW=/tmp/ev-prof EVAL_TOOL=studio/ai-profile EVAL_VARIANT=baseline EVAL_CASES=profil-02` → istek md'sinde `Öğrenci adı:` satırı ve gerçek ad YOK; `errors.jsonl` boş (rumuz bulundu).
  - İkisi de silinir.

- [ ] **Step 7: Lint, tip, commit**

```bash
cd apps/hub && node_modules/.bin/eslint evals && npm run typecheck:evals
git add apps/hub/evals/tools && git commit -m "feat(evals): öğrenme kartı (tool_use) ve AI profili (markdown) adaptörleri (4+4 vaka)"
```

---

### Task 12: Atölye — seans planı, davranış destek planı, okuma akıcılık seti

**Files:**
- Create: `apps/hub/evals/tools/atolye/{seans-plani,davranis,okuma}/{adapter.ts,checks.ts,checks.selftest.eval.ts,cases.json}`
- Modify: `apps/hub/evals/tools/registry.ts` (+3)

**İnceleme sonrası kurallar (uygulanan):** üç araç ortak `tools/atolye/ortak.ts` (bölüm ağacı, olumsuzlama korumalı yasak-terim taraması — "cezasız", "ceza kullanılmaz", "phonics aktarılmadı" yakalanmaz —, MEB satırları) ve `atolye/baglanti.ts` (gerçek rotayla adaptör öz-testi) kullanır. `birimliSureDk`: birimsiz sayı sayılmaz, "3.2.5 dk" kod ortasından başlamaz, "10 dakikalık" sayılır. Seans süre toplamı blok başına BELİRLEYİCİ okunur (ilk süre ≈ kalanların toplamı ise ilk; başlıkta süre varsa o; yoksa toplam), üç okuma `details`'ta, tolerans `min(5, max(2, 0.15·sureDk))`; birim başlıkta olan GFM tablolar (`| Süre (dk) |`) ve `5'`/`dak.` okunur; olumsuzlama koruması BİTİŞİK (terimin ≤3 sözcük sonrasındaki olumsuz fiil, 'yerine', 'asla/hiçbir', -sız; '-madan/-meden' 'önce' izlemiyorsa; isim olan 'kaçınma' sayılmaz; miras yalnız başlık/':' satırından) — koşullu ceza ("uymazsa … mola odası") yakalanır, kuralın kendi ifadesi ("utandırmadan") cezalanmaz; bölüm regex'leri checks'ten tek kaynak; kriter `akis_sure` kademeye göre; ortak `atolyeAdapterSuite` (baglanti.ts); `akis_asamalari` (prompt'un 4 aşaması); `notSent` yaşı da sayar (ürün yaş almaz); hakem satırlarında MEB hedef bloğu (`mebToPrompt`). Davranış: ABC tablosu ayraç + gövde satırı; ceza taraması ABC/tanım/işlev bölümlerini atlar (mevcut durumu betimler). Okuma: `prozodi`, "doğruluğu" kabul, rubrik kendi bölümünde aranır. İstek satırları ürünün etiketleriyle ("Bu seansın hedefi", "Süre: N dakika", "Sıklık/süre gözlemi").

Ortak Atölye bilgisi: rota `@/app/atolye/api/<x>/route`, gövde `ogrenciProfiliSchema.extend(...)` (`rumuz, kademe, yas?, taniProfili[], guclukDuzeyi, gucluYonler?, ilgiAlanlari?, calisilanKazanim?` + araç alanları + `mebHedefKod?, mebDavranisKodlari[]` varsayılan `[]`); çıktı Markdown + sondaki `⚠️ TASLAK_NOTU`; `maxTokens 8000`. Geçerli MEB kodları: `3.2.5` (tanıtılan sesi hece/sözcükte okur), `5.1.14` (doğal sayılarla toplama); başka kod kullanılacaksa `mebHedef(kod)` ile doğrulanır. **seans-plani** profil omurgasını KULLANMAZ: `{ rumuz, kademe, alan, seansHedefi, sureDk (15–120, varsayılan 40), ilgiAlanlari, sonSeansNotu, materyalKisiti, mebHedefKod?, mebDavranisKodlari }`.

- [ ] **Step 1: Kontrol testlerini yaz**

```ts
// apps/hub/evals/tools/atolye/seans-plani/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { birimliSureDk, seansChecks } from "./checks";
const md = "## Seans Künyesi\n| Alan | Süre |\n|---|---|\n| Okuma | 40 dk |\n## Etkinlik Akışı\n- Isınma (5 dk): hece blokları\n- Ana etkinlik (25 dk): MEB 3.2.5 — 10 kelimelik kart okuma\n- Tekrar/oyun (5 dk)\n- Kapanış (5 dk)\n## Materyaller\n- kart\n## Ölçme\n- %\n## Ev Görevi\n- okuma\n## Sonraki Adım\n- devam";
describe("seansChecks", () => {
  it("birimliSureDk: birimsiz sayılar (MEB kodu, adet) sayılmaz; aralık ortalaması; sn/saat", () => {
    expect(birimliSureDk("- MEB 3.2.5 ana etkinlik (25 dk)")).toBe(25);
    expect(birimliSureDk("- 2. tur oyun (10 dakika)")).toBe(10);
    expect(birimliSureDk("5-10 dk")).toBe(7.5);
    expect(birimliSureDk("30 sn ısınma + 1 saat")).toBeCloseTo(60.5);
    expect(birimliSureDk("10 kelimelik kart")).toBe(0);
  });
  it("süre toplamı sureDk'ya eşit → 1; MEB kodu geçiyor → 1", () => {
    const r = seansChecks({ body: { alan: "okuma", seansHedefi: "h", sureDk: 40, mebHedefKod: "3.2.5" }, text: md });
    expect(r.scores).toMatchObject({ sure_toplami: 1, meb_kod: 1 });
    expect(r.details.sure).toBe(40);
  });
  it("toplam 10 dk sapınca 0; kod verilmemişse meb_kod yok", () => {
    const r = seansChecks({ body: { alan: "okuma", seansHedefi: "h", sureDk: 30 }, text: md });
    expect(r.scores.sure_toplami).toBe(0);
    expect(r.scores).not.toHaveProperty("meb_kod");
  });
});
```

```ts
// apps/hub/evals/tools/atolye/davranis/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { davranisChecks } from "./checks";
const md = "## ABC analizi\n| Öncül | Davranış | Sonuç |\n|---|---|---|\n| a | b | c |\n## Pekiştirme planı\n- Övgü";
describe("davranisChecks", () => {
  it("ABC altında tablo var, cezalandırıcı strateji yok → 1/1", () => {
    const r = davranisChecks({ body: { hedefDavranis: "x", ortam: "sinif" }, text: md });
    expect(r.scores).toMatchObject({ abc_tablo: 1, ceza_yok: 1 });
  });
  it("'mola odası' / 'time-out' → ceza_yok 0; tablo yoksa 0", () => {
    const r = davranisChecks({ body: { hedefDavranis: "x", ortam: "sinif" }, text: "## ABC analizi\n- Öncül: a\n## Plan\n- Time-out uygulayın" });
    expect(r.scores).toMatchObject({ abc_tablo: 0, ceza_yok: 0 });
  });
});
```

```ts
// apps/hub/evals/tools/atolye/okuma/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { okumaChecks } from "./checks";
describe("okumaChecks", () => {
  it("İngilizce fonik aktarması yok → 1; rubrikte kelime/dk ve doğruluk geçer → 1", () => {
    const r = okumaChecks({ body: { okumaDuzeyi: "kelime" }, text: "## Rubrik\n- Dakikada doğru kelime sayısı\n- Doğruluk %" });
    expect(r.scores).toMatchObject({ fonik_yok: 1, rubrik: 1 });
  });
  it("'sight words' geçince 0; rubrik ölçütleri yoksa 0", () => {
    const r = okumaChecks({ body: { okumaDuzeyi: "kelime" }, text: "## Rubrik\n- sight words listesi" });
    expect(r.scores).toMatchObject({ fonik_yok: 0, rubrik: 0 });
  });
});
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduklarını gör**

- [ ] **Step 3: Kontrolleri yaz**

```ts
// apps/hub/evals/tools/atolye/seans-plani/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { bulletsUnder } from "../../../lib/markdown";

export interface SeansBody {
  alan: "ogrenmeye_hazirlik" | "okuma" | "yazma" | "matematik" | "dikkat" | "yurutucu_islev" | "oz_duzenleme";
  seansHedefi: string;
  sureDk: number;
  sonSeansNotu?: string;
  materyalKisiti?: string;
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Bir maddedeki birimli sürelerin toplamı (dakika). Aralıkta ortalama; sn → /60, saat → ×60. Birimsiz sayılar (MEB kodu, adet) sayılmaz. */
export function birimliSureDk(text: string): number {
  const re = /(\d+(?:[.,]\d+)?)(?:\s*(?:dk|dakika)?\s*[-–—]\s*(\d+(?:[.,]\d+)?))?\s*(dk|dakika|sn|saniye|saat)(?!\p{L})/giu;
  let toplam = 0;
  for (const m of text.matchAll(re)) {
    const a = Number(m[1]!.replace(",", "."));
    const b = m[2] ? Number(m[2].replace(",", ".")) : a;
    const dk = (a + b) / 2;
    // DİKKAT: "saat" da s ile başlar — önce saat, sonra sn/saniye sınanır.
    toplam += /^saat/i.test(m[3]!) ? dk * 60 : /^s/i.test(m[3]!) ? dk / 60 : dk;
  }
  return toplam;
}

export function seansChecks(args: { body: SeansBody; text: string }): ToolCheckOut {
  const { body, text } = args;
  // Etkinlik akışı maddelerindeki BİRİMLİ sürelerin toplamı ≈ istenen süre (±5 dk). Serbest metinde `sureDk` KULLANILMAZ
  // (ilk sayıyı alır: "MEB 3.2.5 … (25 dk)" → 3.2); birim zorunlu: "25 dk", "5-10 dakika", "30 sn", "1 saat".
  const akis = bulletsUnder(text, /etkinlik akışı|akış/);
  const sure = akis.map(birimliSureDk).reduce((a, b) => a + b, 0);
  const sureToplami = Math.abs(sure - body.sureDk) <= 5 ? 1 : 0;
  const scores: Record<string, number> = { sure_toplami: sureToplami };
  if (body.mebHedefKod) scores.meb_kod = new RegExp(`(?<![\\d.])${esc(body.mebHedefKod)}(?!\\d)`).test(text) ? 1 : 0;
  return { scores, details: { sure, ...scores }, hard: [] };
}
```

```ts
// apps/hub/evals/tools/atolye/davranis/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { TABLO, sections } from "../../../lib/markdown";
import { lower } from "../../../lib/sharedChecks";

export interface DavranisBody { hedefDavranis: string; ortam: "sinif" | "ev" | "seans" | "genel"; siklikSure?: string; mebHedefKod?: string }
/** Cezalandırıcı stratejiler (prompt kuralı: yok). */
const CEZA = /\b(ceza|mola odası|time-?out|teneffüsten mahrum|yoksun bırak)/u;

export function davranisChecks(args: { body: DavranisBody; text: string }): ToolCheckOut {
  const abc = sections(args.text).find((s) => /abc/.test(s.heading));
  const abcTablo = abc && abc.lines.some((l) => TABLO.test(l)) ? 1 : 0;
  const cezaYok = CEZA.test(lower(args.text)) ? 0 : 1;
  const scores = { abc_tablo: abcTablo, ceza_yok: cezaYok };
  return { scores, details: scores, hard: [] };
}
```

```ts
// apps/hub/evals/tools/atolye/okuma/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { lower } from "../../../lib/sharedChecks";

export interface OkumaBody { okumaDuzeyi: "hece" | "kelime" | "cumle" | "paragraf"; hedefAkicilik?: string; takilanDesenler?: string; mebHedefKod?: string }

export function okumaChecks(args: { body: OkumaBody; text: string }): ToolCheckOut {
  const t = lower(args.text);
  const fonikYok = /phonics|sight ?words?|dolch/.test(t) ? 0 : 1;
  const rubrik = /(kelime|sözcük)\s*\/?\s*(dk|dakika)|dakikada .*(kelime|sözcük)/.test(t) && /doğruluk/.test(t) ? 1 : 0;
  const scores = { fonik_yok: fonikYok, rubrik };
  return { scores, details: scores, hard: [] };
}
```

- [ ] **Step 4: Adaptörleri yaz**

```ts
// apps/hub/evals/tools/atolye/seans-plani/adapter.ts
import { atolyeAdapter } from "../../../lib/adapterFactory";
import { seansChecks, type SeansBody } from "./checks";

/** `seans.ts` yalnız şemayı dışa açar; etiketler ürün formundakilerle aynı. */
const ALAN: Record<SeansBody["alan"], string> = {
  ogrenmeye_hazirlik: "Öğrenmeye hazırlık", okuma: "Okuma (disleksi odağı)", yazma: "Yazma (disgrafi odağı)", matematik: "Matematik (diskalkuli odağı)",
  dikkat: "Dikkat ve odaklanma", yurutucu_islev: "Yürütücü işlevler", oz_duzenleme: "Öz-düzenleme ve davranış",
};

export const adapter = atolyeAdapter<SeansBody>({
  id: "atolye/seans-plani",
  label: "Seans planı (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/seans-plani/route"),
  body: (b, f) => ({ rumuz: f.code, kademe: f.kademe, ilgiAlanlari: f.ilgiAlanlari ?? "", sonSeansNotu: "", materyalKisiti: "", ...b }),
  notSent: "- (Hakem notu: güçlük profili, güçlük düzeyi, güçlü yönler, MEB bölümleri ve önceki belgeler araca İLETİLMEDİ; yalnız ad, kademe, ilgi alanları ve istek alanları gider.)",
  requestLines: (b) => [
    `- Alan: ${ALAN[b.alan]} · Süre: ${b.sureDk} dk · Seans hedefi: ${b.seansHedefi}`,
    b.sonSeansNotu ? `- Son seans notu: ${b.sonSeansNotu}` : "",
    b.materyalKisiti ? `- Materyal kısıtı: ${b.materyalKisiti}` : "",
    b.mebHedefKod ? `- MEB hedef kodu: ${b.mebHedefKod}` : "",
  ].filter(Boolean),
  sections: [/künye/, /etkinlik akışı|akış/, /materyal/, /ölçme/, /ev görevi/, /sonraki adım/],
  checks: seansChecks,
  criteria: [
    { key: "akis_sure", question: "Isınma → ana etkinlik → tekrar/oyun → kapanış akışı istenen toplam süreye dakika dakika oturuyor mu; her blok uygulanabilir ve kademeye uygun mu?" },
    { key: "hedef_hizasi", question: "Ana etkinlik seans hedefine (ve verildiyse MEB hedef davranışlarına) doğrudan hizmet ediyor mu; ilgi alanı etkinliğe gerçekten taşınmış mı, yoksa süs mü?" },
  ],
});
```

```ts
// apps/hub/evals/tools/atolye/davranis/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { davranisChecks, type DavranisBody } from "./checks";

const ORTAM_TR = { sinif: "sınıf", ev: "ev", seans: "seans", genel: "genel" };

export const adapter = atolyeAdapter<DavranisBody>({
  id: "atolye/davranis",
  label: "Davranış destek planı (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/davranis/route"),
  body: (b, f) => ({ ...profilBody(f), ...b }),
  requestLines: (b) => [`- Hedef davranış: ${b.hedefDavranis} · Ortam: ${ORTAM_TR[b.ortam]}${b.siklikSure ? ` · Sıklık/süre: ${b.siklikSure}` : ""}`, b.mebHedefKod ? `- MEB hedef kodu: ${b.mebHedefKod}` : ""].filter(Boolean),
  sections: [/tanım/, /abc/, /işlev/, /önleyici|antecedent|çevresel/, /yerine koyma/, /pekiştirme/, /veri toplama|öz-?izleme/, /tutarlılık/],
  checks: davranisChecks,
  criteria: [
    { key: "islev_analizi", question: "ABC analizi ve işlev hipotezi verilen gözleme (sıklık, ortam) dayanıyor mu; hipotez tek ve savunulabilir mi; veri yetersizse varsayım üretmek yerine veri toplama öneriliyor mu?" },
    { key: "onleyici_strateji", question: "Önleyici düzenlemeler ve yerine koyma davranışı bu öğrencinin güçlü yönlerine/ilgi alanlarına bağlı, ortama uygun ve öğretilebilir mi; pekiştirme planı cezasız ve somut mu?" },
  ],
});
```

```ts
// apps/hub/evals/tools/atolye/okuma/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { okumaChecks, type OkumaBody } from "./checks";

const DUZEY_TR = { hece: "hece", kelime: "kelime", cumle: "cümle", paragraf: "paragraf" };

export const adapter = atolyeAdapter<OkumaBody>({
  id: "atolye/okuma",
  label: "Okuma akıcılık seti (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/okuma/route"),
  body: (b, f) => ({ ...profilBody(f), ...b }),
  requestLines: (b) => [`- Çalışma düzeyi: ${DUZEY_TR[b.okumaDuzeyi]}${b.hedefAkicilik ? ` · Hedef akıcılık: ${b.hedefAkicilik}` : ""}${b.takilanDesenler ? ` · Takılınan desenler: ${b.takilanDesenler}` : ""}`, b.mebHedefKod ? `- MEB hedef kodu: ${b.mebHedefKod}` : ""].filter(Boolean),
  sections: [/okuma parçası|metin/, /hece|ses çalışması/, /akıcılık egzersiz/, /kelime dağarcığı|sözcük/, /rubrik|ölçüm/],
  checks: okumaChecks,
  criteria: [
    { key: "fonolojik_temel", question: "Hece-ses çalışması Türkçenin şeffaf yazımına uygun mu (İngilizce fonik aktarması yok); takılınan desenler (ör. b/d) doğrudan hedefleniyor mu?" },
    { key: "metin_duzeyi", question: "Okuma parçası istenen düzeyde (hece/kelime/cümle/paragraf), özgün, ilgi alanına uygun ve kademeye göre uzunlukta mı; rubrik kelime/dk + doğruluk + prozodi içeriyor mu?" },
  ],
});
```

- [ ] **Step 5: Vakaları yaz**

```json
// apps/hub/evals/tools/atolye/seans-plani/cases.json
[
  { "id": "seans-01", "tags": ["okuma", "40 dk", "MEB kodu", "son seans notu"], "student": "case-arda",
    "purpose": "Önceki seans notunun devamı: 7/10 → ölçüt (%80) karşılanmadı, aynı ses grubu yeni sözcüklerle sürer, üç heceliye GEÇİLMEZ; MEB 3.2.5'e hizalı ana etkinlik; futbol ilgisinin etkinliğe taşınması; süre dağılımı 40 dk.",
    "body": { "alan": "okuma", "seansHedefi": "Tanıtılan seslerden oluşan iki heceli sözcükleri %80 doğrulukla okuma", "sureDk": 40, "sonSeansNotu": "10 sözcükten 7'si doğru; 'ba-' hecesinde takıldı, saha oyununu sevdi.", "mebHedefKod": "3.2.5" } },
  { "id": "seans-02", "tags": ["dikkat", "30 dk", "okul öncesi", "materyal kısıtı"], "student": "case-efe",
    "purpose": "Okul öncesi + Dikkat alanı + yalnız kâğıt-kalem kısıtı: materyalsiz, hareketli, kısa bloklu 30 dk; süre toplamı 30.",
    "body": { "alan": "dikkat", "seansHedefi": "Yönergeyle başlayıp 5 dakika masada kalma", "sureDk": 30, "materyalKisiti": "Yalnız kâğıt ve kalem; oyuncak yok." } },
  { "id": "seans-03", "tags": ["matematik", "60 dk", "lise", "eştanı"], "student": "case-tolga",
    "purpose": "Lise + Matematik alanı, 60 dk: kademeye uygun (çocuksu olmayan) etkinlik; uzun seansı kısa bloklara bölme; basketbol/oyun tasarımı ilgisinin taşınması.",
    "body": { "alan": "matematik", "seansHedefi": "Yüzde problemlerini adım kutularıyla çözme", "sureDk": 60 } },
  { "id": "seans-04", "tags": ["öğrenmeye hazırlık", "15 dk", "boş bağlam"], "student": "case-melis",
    "purpose": "İlgi alanı ve geçmiş olmadan 15 dk'lık en kısa seans: uydurma bağlam yok; süre toplamı 15.",
    "body": { "alan": "ogrenmeye_hazirlik", "seansHedefi": "Çalışma masasını hazırlama ve görev listesini takip etme", "sureDk": 15 } }
]
```

```json
// apps/hub/evals/tools/atolye/davranis/cases.json
[
  { "id": "dav-01", "tags": ["okul öncesi", "hiperaktif", "sınıf", "sıklık verisi"], "student": "case-efe",
    "purpose": "Sıklık verisine dayalı ABC ve tek, savunulabilir işlev hipotezi (kaçınma + dikkat); dinozor/şarkı ilgisinin yerine koyma davranışına taşınması; ceza yok.",
    "body": { "hedefDavranis": "Etkinlik geçişinde yere yatma ve bağırma", "ortam": "sinif", "siklikSure": "Günde 3–4 kez, 2–5 dk; en çok oyun→masa geçişinde" } },
  { "id": "dav-02", "tags": ["disleksi+dehb", "seans", "kaçınma"], "student": "case-arda",
    "purpose": "Okuma görevinde kaçınma davranışı: işlev hipotezinin okuma güçlüğüne bağlanması (davranışı 'yaramazlık' saymama); 10 dk'lık bloklarla önleyici düzenleme.",
    "body": { "hedefDavranis": "Okuma kartı gelince masadan kalkıp dolaşma", "ortam": "seans" } },
  { "id": "dav-03", "tags": ["lise", "ev", "veri yok"], "student": "case-tolga",
    "purpose": "15 yaş + ev ortamı + sıklık verisi yok: varsayım üretmek yerine veri toplama önerisi; öz-izleme aracının yaşa uygunluğu; aile–okul tutarlılığı.",
    "body": { "hedefDavranis": "Ödev saatinde telefona yönelme ve ödevi yarım bırakma", "ortam": "ev" } },
  { "id": "dav-04", "tags": ["disgrafi", "genel", "duygusal"], "student": "case-zeynep",
    "purpose": "Yazma kaygısına bağlı davranış: işlev = kaçınma/hayal kırıklığı; yerine koyma davranışında güçlü yön (sözel anlatım) kullanımı; cezasız pekiştirme.",
    "body": { "hedefDavranis": "Yazı yazarken kâğıdı buruşturma ve ağlama", "ortam": "genel", "siklikSure": "Haftada 2–3 kez, yazma ödevlerinde" } }
]
```

```json
// apps/hub/evals/tools/atolye/okuma/cases.json
[
  { "id": "oku-01", "tags": ["kelime", "disleksi+dehb", "MEB kodu", "takılınan desen"], "student": "case-arda",
    "purpose": "b/d karışıklığı ve hece birleştirmeyi hedefleyen hece-ses çalışması; futbol temalı özgün kısa parça; 40 kelime/dk hedefine rubrik; MEB 3.2.5 hizası.",
    "body": { "okumaDuzeyi": "kelime", "hedefAkicilik": "40 doğru kelime/dk", "takilanDesenler": "b/d karıştırma; hece birleştirmede yavaşlık", "mebHedefKod": "3.2.5" } },
  { "id": "oku-02", "tags": ["paragraf", "hafif", "boş bağlam", "ortaokul"], "student": "case-melis",
    "purpose": "11 yaş hafif disleksi, ilgi alanı yok: yaşa uygun paragraf, çocuksu olmayan metin; ilgi alanı uydurmama.",
    "body": { "okumaDuzeyi": "paragraf" } },
  { "id": "oku-03", "tags": ["hece", "okul öncesi", "hiperaktif"], "student": "case-efe",
    "purpose": "5 yaş erken okuryazarlık: hece düzeyinde kısa, hareketli, şarkılı çalışma; 'okuma parçası' bölümünün hece/ses oyununa uyarlanması; prozodi ölçütünün yaşa uyarlanması.",
    "body": { "okumaDuzeyi": "hece" } },
  { "id": "oku-04", "tags": ["cümle", "disgrafi", "satır atlama"], "student": "case-zeynep",
    "purpose": "Okuması akıcı disgrafili öğrencide 'satır atlama' deseni: görsel takip desteği; okuma değil yazma güçlüğü olduğunun farkında kalma; at/resim ilgisi.",
    "body": { "okumaDuzeyi": "cumle", "takilanDesenler": "Satır atlama, uzun cümlede yerini kaybetme" } }
]
```

- [ ] **Step 6: Registry + testler** — üç satır; `ev evals/tools/atolye` PASS; bağlantı denemesi `EVAL_FLOW=/tmp/ev-seans EVAL_TOOL=atolye/seans-plani EVAL_VARIANT=baseline EVAL_CASES=seans-01` → istek md'sinde `SEANS BİLGİSİ`, `- Öğrenci: <rumuz>` ve `MEB HEDEF HİZALAMASI`; `/tmp/ev-seans` silinir.

- [ ] **Step 7: Lint, tip, commit**

```bash
cd apps/hub && node_modules/.bin/eslint evals && npm run typecheck:evals
git add apps/hub/evals/tools && git commit -m "feat(evals): seans planı, davranış ve okuma adaptörleri (4+4+4 vaka)"
```

---

### Task 13: Atölye — matematik, çok duyulu materyal, uyarlama önerisi

**Files:**
- Create: `apps/hub/evals/tools/atolye/{matematik,materyal,uyarlama}/{adapter.ts,checks.ts,checks.selftest.eval.ts,cases.json}`
- Modify: `apps/hub/evals/tools/registry.ts` (+3)

- [ ] **Step 1: Kontrol testlerini yaz**

```ts
// apps/hub/evals/tools/atolye/matematik/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { aritmetik, matematikChecks } from "./checks";
describe("matematikChecks", () => {
  it("aritmetik ifadeler doğrulanır: 2 doğru 1 yanlış → 2/3", () => {
    expect(aritmetik("12 + 7 = 19, 20 − 5 = 15 ve 3 × 4 = 13")).toEqual({ toplam: 3, dogru: 2 });
    const r = matematikChecks({ body: { alanProfili: "islem_akiciligi", kazanimKonu: "k", somutlukDuzeyi: "somut" }, text: "12 + 7 = 19; 3 x 4 = 13" });
    expect(r.scores.aritmetik_dogru).toBe(0.5);
  });
  it("ifade yoksa 1; CRA sırası (somut→yarı-somut→soyut) başlıkta geçerse cra 1", () => {
    const r = matematikChecks({ body: { alanProfili: "sayi_hissi", kazanimKonu: "k", somutlukDuzeyi: "somut" }, text: "## CRA dizisi\n### Somut\n- a\n### Yarı-somut\n- b\n### Soyut\n- c" });
    expect(r.scores).toMatchObject({ aritmetik_dogru: 1, cra: 1 });
  });
});
```

```ts
// apps/hub/evals/tools/atolye/materyal/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { materyalChecks } from "./checks";
const body = { materyalTuru: "calisma_yapragi" as const, konu: "k", zorlukVaryanti: "kolay_orta" as const, cevapAnahtari: true };
describe("materyalChecks", () => {
  it("cevap anahtarı istendi ve dolu → 1; iki varyant başlığı → 1", () => {
    const r = materyalChecks({ body, text: "## Zorluk varyantları\n### Kolay\n- a\n### Orta\n- b\n## Cevap anahtarı\n1. 5\n2. 7" });
    expect(r.scores).toMatchObject({ cevap_anahtari: 1, varyant: 1 });
  });
  it("istenmediği hâlde anahtar eklenmiş → 0; tek varyant istenince varyant 1", () => {
    const r = materyalChecks({ body: { ...body, cevapAnahtari: false, zorlukVaryanti: "tek" }, text: "## Cevap anahtarı\n1. 5" });
    expect(r.scores).toMatchObject({ cevap_anahtari: 0, varyant: 1 });
    const r2 = materyalChecks({ body: { ...body, cevapAnahtari: false, zorlukVaryanti: "tek" }, text: "## Cevap anahtarı\n(Cevap anahtarı istenmedi — ekleme.)" });
    expect(r2.scores.cevap_anahtari).toBe(1);
  });
});
```

```ts
// apps/hub/evals/tools/atolye/uyarlama/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { uyarlamaChecks } from "./checks";
describe("uyarlamaChecks", () => {
  it("en az 3 gerekçe → 1", () => {
    expect(uyarlamaChecks({ body: { ortam: "kaynastirma" }, text: "- a (Gerekçe: x)\n- b (gerekçe: y)\n- c — Gerekçe: z" }).scores.gerekce).toBe(1);
    expect(uyarlamaChecks({ body: { ortam: "kaynastirma" }, text: "- a\n- b" }).scores.gerekce).toBe(0);
  });
});
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduklarını gör**

- [ ] **Step 3: Kontrolleri yaz**

```ts
// apps/hub/evals/tools/atolye/matematik/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { sections } from "../../../lib/markdown";

export interface MatematikBody { alanProfili: "sayi_hissi" | "sayi_buyukluk" | "islem_akiciligi" | "problem_cozme"; kazanimKonu: string; somutlukDuzeyi: "somut" | "yari_somut" | "soyut"; mebHedefKod?: string }

/** Metindeki "a op b = c" ifadelerini (op: + − - × x · ÷ : /) doğrular. */
export function aritmetik(text: string): { toplam: number; dogru: number } {
  const re = /(\d+)\s*([+−\-×x·÷:/])\s*(\d+)\s*=\s*(\d+)/g;
  let toplam = 0, dogru = 0;
  for (const m of text.matchAll(re)) {
    const a = Number(m[1]), b = Number(m[3]), c = Number(m[4]);
    const op = m[2]!;
    const beklenen = "+".includes(op) ? a + b : "−-".includes(op) ? a - b : "×x·".includes(op) ? a * b : b === 0 ? NaN : a / b;
    toplam++;
    if (beklenen === c) dogru++;
  }
  return { toplam, dogru };
}

export function matematikChecks(args: { body: MatematikBody; text: string }): ToolCheckOut {
  const { toplam, dogru } = aritmetik(args.text);
  const heads = sections(args.text).map((s) => s.heading);
  const i = (re: RegExp) => heads.findIndex((h) => re.test(h));
  const s = i(/^somut|somut aşama|somut düzey/), y = i(/yarı/), o = i(/soyut/);
  const cra = s >= 0 && y > s && o > y ? 1 : 0;
  const scores = { aritmetik_dogru: toplam ? dogru / toplam : 1, cra };
  return { scores, details: { ifade: toplam, dogru, ...scores }, hard: [] };
}
```

```ts
// apps/hub/evals/tools/atolye/materyal/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { sections } from "../../../lib/markdown";

export interface MateryalBody { materyalTuru: "calisma_yapragi" | "etkinlik" | "okuma_metni" | "alistirma"; konu: string; zorlukVaryanti: "tek" | "kolay_orta" | "kolay_orta_ileri"; cevapAnahtari: boolean; mebHedefKod?: string }
const VARYANT_SAYISI = { tek: 1, kolay_orta: 2, kolay_orta_ileri: 3 };

export function materyalChecks(args: { body: MateryalBody; text: string }): ToolCheckOut {
  const secs = sections(args.text);
  const cevap = secs.find((s) => /cevap anahtarı/.test(s.heading));
  const cevapDolu = Boolean(cevap && cevap.lines.some((l) => l.trim() && !/istenmedi/.test(l)));
  const cevapAnahtari = args.body.cevapAnahtari ? (cevapDolu ? 1 : 0) : cevapDolu ? 0 : 1;
  const bulunan = ["kolay", "orta", "ileri"].filter((k) => secs.some((s) => s.heading.includes(k))).length;
  const varyant = bulunan >= VARYANT_SAYISI[args.body.zorlukVaryanti] ? 1 : 0;
  const scores = { cevap_anahtari: cevapAnahtari, varyant };
  return { scores, details: { varyant_bulunan: bulunan, ...scores }, hard: [] };
}
```

```ts
// apps/hub/evals/tools/atolye/uyarlama/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { lower } from "../../../lib/sharedChecks";

export interface UyarlamaBody { ders?: string; ortam: "kaynastirma" | "ozel_egitim_sinifi" | "destek_egitim_odasi" | "ev"; mebHedefKod?: string }

export function uyarlamaChecks(args: { body: UyarlamaBody; text: string }): ToolCheckOut {
  const n = (lower(args.text).match(/gerekçe/g) ?? []).length;
  const scores = { gerekce: n >= 3 ? 1 : 0 };
  return { scores, details: { gerekce_sayisi: n, ...scores }, hard: [] };
}
```

- [ ] **Step 4: Adaptörleri yaz**

```ts
// apps/hub/evals/tools/atolye/matematik/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { matematikChecks, type MatematikBody } from "./checks";

const ALAN_TR = { sayi_hissi: "sayı hissi", sayi_buyukluk: "sayı–büyüklük ilişkisi", islem_akiciligi: "işlem akıcılığı", problem_cozme: "problem çözme" };
const SOMUT_TR = { somut: "somut", yari_somut: "yarı-somut", soyut: "soyut" };

export const adapter = atolyeAdapter<MatematikBody>({
  id: "atolye/matematik",
  label: "Matematik destek seti (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/matematik/route"),
  body: (b, f) => ({ ...profilBody(f), ...b }),
  requestLines: (b) => [`- Alan profili: ${ALAN_TR[b.alanProfili]} · Kazanım/konu: ${b.kazanimKonu} · Başlangıç somutluk: ${SOMUT_TR[b.somutlukDuzeyi]}`, b.mebHedefKod ? `- MEB hedef kodu: ${b.mebHedefKod}` : ""].filter(Boolean),
  sections: [/kazanım|ön-?koşul/, /cra|somut/, /manipülatif|materyal/, /hata/, /alıştırma/],
  checks: matematikChecks,
  criteria: [
    { key: "somut_soyut", question: "CRA dizisi (somut → yarı-somut → soyut) istenen başlangıç düzeyinden başlayarak gerçekten basamaklanıyor mu; manipülatif yönergesi metinle uygulanabilir mi?" },
    { key: "hata_analizi", question: "Yaygın hata desenleri bu kazanıma ve öğrencinin profiline özgü mü (ör. basamak kaydırma, parmakla sayma); müdahale ipuçları somut mu; tüm sayılar/işlemler doğru mu?" },
  ],
});
```

```ts
// apps/hub/evals/tools/atolye/materyal/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { materyalChecks, type MateryalBody } from "./checks";

const TUR_TR = { calisma_yapragi: "çalışma yaprağı", etkinlik: "etkinlik", okuma_metni: "okuma metni", alistirma: "alıştırma" };
const VAR_TR = { tek: "tek düzey", kolay_orta: "kolay + orta", kolay_orta_ileri: "kolay + orta + ileri" };

export const adapter = atolyeAdapter<MateryalBody>({
  id: "atolye/materyal",
  label: "Çok duyulu materyal (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/materyal/route"),
  body: (b, f) => ({ ...profilBody(f), ...b }),
  requestLines: (b) => [`- Tür: ${TUR_TR[b.materyalTuru]} · Konu: ${b.konu} · Varyant: ${VAR_TR[b.zorlukVaryanti]} · Cevap anahtarı: ${b.cevapAnahtari ? "evet" : "hayır"}`, b.mebHedefKod ? `- MEB hedef kodu: ${b.mebHedefKod}` : ""].filter(Boolean),
  sections: [/başlık|kazanım/, /uygulama yönergesi|öğretmen/, /materyal gövdesi|gövde/, /zorluk varyant/, /farklılaştırma|uyarlama/, /cevap anahtarı/],
  checks: materyalChecks,
  criteria: [
    { key: "cok_duyulu_somutluk", question: "Materyal gerçekten birden çok duyusal kanalı (görsel, işitsel, dokunsal-kinestetik) somut adımlarla kullanıyor mu; disleksi/disgrafi/diskalkuli uyarlaması (yazı tipi, satır aralığı, hece bölme, sayı doğrusu) içerikte görünüyor mu?" },
    { key: "uretilebilirlik", question: "Materyal gövdesi yalnız metinle sınıfta çoğaltılıp hemen kullanılabilir mi (görsel üretmeden tarif edilmiş); varyantlar gerçekten zorluk farkı taşıyor mu?" },
  ],
});
```

```ts
// apps/hub/evals/tools/atolye/uyarlama/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { uyarlamaChecks, type UyarlamaBody } from "./checks";

const ORTAM_TR = { kaynastirma: "kaynaştırma sınıfı", ozel_egitim_sinifi: "özel eğitim sınıfı", destek_egitim_odasi: "destek eğitim odası", ev: "ev" };

export const adapter = atolyeAdapter<UyarlamaBody>({
  id: "atolye/uyarlama",
  label: "Uyarlama önerisi (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/uyarlama/route"),
  body: (b, f) => ({ ...profilBody(f), ...b }),
  requestLines: (b) => [`- Ders: ${b.ders ?? "genel"} · Ortam: ${ORTAM_TR[b.ortam]}`, b.mebHedefKod ? `- MEB hedef kodu: ${b.mebHedefKod}` : ""].filter(Boolean),
  sections: [/bağlam/, /sunum/, /yanıt|çıktı/, /ortam|zaman/, /değerlendirme|sınav/],
  checks: uyarlamaChecks,
  criteria: [
    { key: "sinif_uygulanabilirlik", question: "Uyarlamalar bu ortamda (kaynaştırma/özel sınıf/destek odası/ev) öğretmenin ek kaynak olmadan uygulayabileceği türden mi; dersin içeriğine özgü mü?" },
    { key: "olcme_uyarlamasi", question: "Değerlendirme/sınav uyarlamaları öğrencinin güçlük profiline (ör. diskalkulide hesap makinesi, DEHB'de ek süre ve bölünmüş sınav) somut ve gerekçeli biçimde bağlı mı?" },
  ],
});
```

- [ ] **Step 5: Vakaları yaz**

```json
// apps/hub/evals/tools/atolye/matematik/cases.json
[
  { "id": "mat-01", "tags": ["diskalkuli", "işlem akıcılığı", "somut", "MEB kodu"], "student": "case-mina",
    "purpose": "Eldeli toplamada basamak kaydırma hatasına özgü hata analizi; somuttan başlayan CRA; MEB 5.1.14 hizası; resim ilgisinin materyalde kullanımı; aritmetik doğruluğu.",
    "body": { "alanProfili": "islem_akiciligi", "kazanimKonu": "Eldeli toplama (iki basamaklı)", "somutlukDuzeyi": "somut", "mebHedefKod": "5.1.14" } },
  { "id": "mat-02", "tags": ["lise", "problem çözme", "soyut", "eştanı"], "student": "case-tolga",
    "purpose": "15 yaş + soyut başlangıç: CRA'nın yaşa uygun kurulması (çocuksu manipülatif yok, adım kutuları); DEHB için çok adımlı problemde satır atlamaya müdahale; basketbol bağlamlı problemler.",
    "body": { "alanProfili": "problem_cozme", "kazanimKonu": "Yüzde problemleri (indirim, artış)", "somutlukDuzeyi": "soyut" } },
  { "id": "mat-03", "tags": ["okul öncesi", "sayı hissi", "somut"], "student": "case-efe",
    "purpose": "5 yaş sayı hissi: hareketli, dinozorlu somut sayma; 1–10 aralığında aritmetik doğruluğu; dikkat süresine uygun kısa alıştırma.",
    "body": { "alanProfili": "sayi_hissi", "kazanimKonu": "1–10 arası sayma ve birebir eşleme", "somutlukDuzeyi": "somut" } },
  { "id": "mat-04", "tags": ["diskalkuli", "sayı–büyüklük", "yarı-somut", "belirgin"], "student": "case-mina",
    "purpose": "Sayı doğrusunda konumlandıramama (BEP geçmişi) için yarı-somut başlangıç; 12 yaşa uygun; parmakla sayma alışkanlığına müdahale.",
    "body": { "alanProfili": "sayi_buyukluk", "kazanimKonu": "0–100 sayı doğrusunda konumlandırma ve karşılaştırma", "somutlukDuzeyi": "yari_somut" } }
]
```

```json
// apps/hub/evals/tools/atolye/materyal/cases.json
[
  { "id": "mtr-01", "tags": ["disgrafi", "çalışma yaprağı", "kolay+orta", "cevap anahtarı"], "student": "case-zeynep",
    "purpose": "b–d harf biçimleri için çok duyulu (kum tepsisi, kabartma) çalışma yaprağı; iki varyant; cevap anahtarı; at/resim ilgisi.",
    "body": { "materyalTuru": "calisma_yapragi", "konu": "b–d harf biçimleri ve yönü", "zorlukVaryanti": "kolay_orta", "cevapAnahtari": true } },
  { "id": "mtr-02", "tags": ["disleksi+dehb", "okuma metni", "tek", "anahtar yok"], "student": "case-arda",
    "purpose": "Tek düzey futbol temalı iki heceli sözcük metni; cevap anahtarı İSTENMEDİ (eklenmemeli); disleksi dostu biçim notları.",
    "body": { "materyalTuru": "okuma_metni", "konu": "Tanıtılan seslerle iki heceli sözcüklerden kısa metin", "zorlukVaryanti": "tek", "cevapAnahtari": false } },
  { "id": "mtr-03", "tags": ["diskalkuli", "alıştırma", "üç varyant", "MEB kodu", "bütçe"], "student": "case-mina",
    "purpose": "Üç varyantlı alıştırma seti (bütçe): her varyant gerçekten farklı zorlukta; cevap anahtarı doğru; MEB 5.1.14.",
    "body": { "materyalTuru": "alistirma", "konu": "Onluk bozarak çıkarma", "zorlukVaryanti": "kolay_orta_ileri", "cevapAnahtari": true, "mebHedefKod": "5.1.14" } },
  { "id": "mtr-04", "tags": ["okul öncesi", "etkinlik", "dikkat"], "student": "case-efe",
    "purpose": "5 yaş etkinlik: aynı–farklı bulma; hareket + ses + dokunma kanalları; cevap anahtarı 'doğru yanıt' biçiminde kısa.",
    "body": { "materyalTuru": "etkinlik", "konu": "Aynı–farklı bulma ile dikkat", "zorlukVaryanti": "tek", "cevapAnahtari": true } }
]
```

```json
// apps/hub/evals/tools/atolye/uyarlama/cases.json
[
  { "id": "uy-01", "tags": ["disleksi+dehb", "kaynaştırma", "Türkçe"], "student": "case-arda", "purpose": "Türkçe dersinde okuma + dikkat için sunum/yanıt/zaman/sınav uyarlamaları; her maddede gerekçe; güçlü sözel ifadenin yanıt uyarlamasında kullanılması.", "body": { "ders": "Türkçe", "ortam": "kaynastirma" } },
  { "id": "uy-02", "tags": ["lise", "kaynaştırma", "matematik", "sınav"], "student": "case-tolga", "purpose": "Lise matematik sınav uyarlaması: DEHB+diskalkuli gerekçeleri (ek süre, formül kartı, bölünmüş sınav); yaşa uygun özerklik.", "body": { "ders": "Matematik", "ortam": "kaynastirma" } },
  { "id": "uy-03", "tags": ["okul öncesi", "ev", "ders yok"], "student": "case-efe", "purpose": "Ders verilmeden ev ortamı: günlük rutin uyarlamaları (geçiş, oyun, uyku); 'sınav uyarlaması' bölümünün okul öncesine uyarlanması (değerlendirme = gözlem).", "body": { "ortam": "ev" } },
  { "id": "uy-04", "tags": ["hafif disleksi", "destek eğitim odası", "fen", "boş bağlam"], "student": "case-melis", "purpose": "Destek eğitim odasında fen dersi: ilgi alanı olmadan içerik; hafif düzeyde aşırı uyarlamadan kaçınma (gerekçeli, ölçülü).", "body": { "ders": "Fen Bilimleri", "ortam": "destek_egitim_odasi" } }
]
```

- [ ] **Step 6: Registry + testler** — üç satır; `ev evals/tools/atolye` PASS.

- [ ] **Step 7: Lint, tip, commit**

```bash
cd apps/hub && node_modules/.bin/eslint evals && npm run typecheck:evals
git add apps/hub/evals/tools && git commit -m "feat(evals): matematik, materyal ve uyarlama adaptörleri (4+4+4 vaka)"
```

---

### Task 14: Atölye — sosyal öykü, veli mektubu, ev ödevi programı, ilerleme çizelgesi

**Files:**
- Create: `apps/hub/evals/tools/atolye/{sosyal-oyku,veli-mektubu,ev-odevi,ilerleme-cizelgesi}/{adapter.ts,checks.ts,checks.selftest.eval.ts,cases.json}`
- Modify: `apps/hub/evals/tools/registry.ts` (+4)

Sözleşmeler: sosyal-oyku `{ durum, bakisAcisi: "birinci_kisi"|"ucuncu_kisi", hedefBeceri?, mebHedefKod? }` (öykü 5–8 cümle; duyguyu "kötü/yanlış" çerçevelememe). veli-mektubu `{ amac: "bilgilendirme"|"ev_etkinligi"|"gorusme_ozeti", notlar?, mebHedefKod? }` (bölüm başlığı zorunlu değil; MEB kodu mektuba YAZILMAZ; "çocuğunuz …dır" etiketi yok). ev-odevi `{ hedefKonu (≥3), gunSayisi 1–7 (sayı), ekstraNot?, mebHedefKod? }` (rota `type: "ev-odevi"`; 15–20 dk dilimler). ilerleme-cizelgesi `{ hedefMetni, mebHedefKod? }` (boş tablo `Tarih · Ölçüt/Gösterge · Sonuç · Not`, SONUÇ hücreleri BOŞ).

- [ ] **Step 1: Kontrol testlerini yaz**

```ts
// apps/hub/evals/tools/atolye/sosyal-oyku/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { sosyalOykuChecks } from "./checks";
const oyku = (n: number, ben = true) => `## Sosyal öykü\n${Array.from({ length: n }, (_, i) => `${ben ? "Ben" : "Efe"} sırada bekliyorum ${i}.`).join(" ")}\n## Görsel öneri\n- a\n## Kullanım\n- b`;
describe("sosyalOykuChecks", () => {
  it("6 cümle, birinci kişi, 'kötü his' yok → 1/1/1", () => {
    const r = sosyalOykuChecks({ body: { durum: "d", bakisAcisi: "birinci_kisi" }, text: oyku(6) });
    expect(r.scores).toMatchObject({ kisalik: 1, bakis_acisi: 1, duygu_cercevesi: 1 });
    expect(r.details.oyku_cumle).toBe(6);
  });
  it("12 cümle → kısalık 0; üçüncü kişi istenince 'ben' → 0; 'kötü bir duygu' → 0", () => {
    const r = sosyalOykuChecks({ body: { durum: "d", bakisAcisi: "ucuncu_kisi" }, text: oyku(12).replace("## Görsel", "Bu kötü bir duygudur.\n## Görsel") });
    expect(r.scores).toMatchObject({ kisalik: 0, bakis_acisi: 0, duygu_cercevesi: 0 });
  });
});
```

```ts
// apps/hub/evals/tools/atolye/veli-mektubu/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { veliMektubuChecks } from "./checks";
describe("veliMektubuChecks", () => {
  it("MEB kodu mektupta yok, etiket yok, ev etkinliği 3–5 madde → 1/1/1", () => {
    const r = veliMektubuChecks({ body: { amac: "ev_etkinligi", mebHedefKod: "5.1.14" }, text: "Sayın aile,\n- Etkinlik 1\n- Etkinlik 2\n- Etkinlik 3\nSevgiler" });
    expect(r.scores).toMatchObject({ meb_kod_yok: 1, etiket_yok: 1, etkinlik_sayisi: 1 });
  });
  it("kod yazılmış, 'çocuğunuz disleksiktir', 1 madde → 0/0/0", () => {
    const r = veliMektubuChecks({ body: { amac: "ev_etkinligi", mebHedefKod: "5.1.14" }, text: "Çocuğunuz disleksiktir (5.1.14).\n- tek" });
    expect(r.scores).toMatchObject({ meb_kod_yok: 0, etiket_yok: 0, etkinlik_sayisi: 0 });
  });
});
```

```ts
// apps/hub/evals/tools/atolye/ev-odevi/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { evOdeviChecks } from "./checks";
describe("evOdeviChecks", () => {
  it("3 gün başlığı ve ≤20 dk dilimler → 1/1", () => {
    const md = "## Günlük plan\n### 1. Gün\n- Isınma (3 dk)\n- Ana (15 dk)\n### 2. Gün\n- (15 dk)\n### 3. Gün\n- (20 dk)";
    expect(evOdeviChecks({ body: { hedefKonu: "k", gunSayisi: 3 }, text: md }).scores).toMatchObject({ gun_sayisi: 1, sure_dilimi: 1 });
  });
  it("2 gün başlığı (3 istendi) → 0; 45 dk dilim → oran düşer", () => {
    const md = "### Gün 1\n- (45 dk)\n### Gün 2\n- (15 dk)";
    const r = evOdeviChecks({ body: { hedefKonu: "k", gunSayisi: 3 }, text: md });
    expect(r.scores.gun_sayisi).toBe(0);
    expect(r.scores.sure_dilimi).toBe(0.5);
  });
});
```

```ts
// apps/hub/evals/tools/atolye/ilerleme-cizelgesi/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { ilerlemeChecks } from "./checks";
describe("ilerlemeChecks", () => {
  it("doğru sütunlar, boş sonuç hücreleri → 1/1/1", () => {
    const md = "## Çizelge\n| Tarih | Ölçüt/Gösterge | Sonuç (% veya sıklık) | Not |\n|---|---|---|---|\n| | Hece okuma | | |\n| | Sözcük okuma | | |";
    expect(ilerlemeChecks({ body: { hedefMetni: "h" }, text: md }).scores).toMatchObject({ tablo_var: 1, sutunlar: 1, sonuc_bos: 1 });
  });
  it("sonuç hücresi dolu → sonuc_bos düşer; tablo yoksa hepsi 0", () => {
    const md = "| Tarih | Ölçüt | Sonuç | Not |\n|---|---|---|---|\n| 1.10 | a | %80 | |\n| | b | | |";
    expect(ilerlemeChecks({ body: { hedefMetni: "h" }, text: md }).scores.sonuc_bos).toBe(0.5);
    expect(ilerlemeChecks({ body: { hedefMetni: "h" }, text: "- madde" }).scores).toMatchObject({ tablo_var: 0, sutunlar: 0, sonuc_bos: 0 });
  });
});
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduklarını gör**

- [ ] **Step 3: Kontrolleri yaz**

```ts
// apps/hub/evals/tools/atolye/sosyal-oyku/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { sections } from "../../../lib/markdown";
import { countSentences, lower } from "../../../lib/sharedChecks";

export interface SosyalOykuBody { durum: string; bakisAcisi: "birinci_kisi" | "ucuncu_kisi"; hedefBeceri?: string; mebHedefKod?: string }
const BEN = /(?<!\p{L})(ben|benim|bana|beni)(?!\p{L})/u;
const KOTU = /kötü (bir )?(his|duygu)|yanlış (bir )?(his|duygu)|utanç verici/u;

export function sosyalOykuChecks(args: { body: SosyalOykuBody; text: string }): ToolCheckOut {
  const oyku = sections(args.text).find((s) => /öykü/.test(s.heading));
  const govde = oyku ? oyku.lines.join("\n") : args.text;
  const n = countSentences(govde);
  const kisalik = n >= 3 && n <= 10 ? 1 : 0;
  const benVar = BEN.test(lower(govde));
  const bakisAcisi = args.body.bakisAcisi === "birinci_kisi" ? (benVar ? 1 : 0) : benVar ? 0 : 1;
  const duyguCercevesi = KOTU.test(lower(args.text)) ? 0 : 1;
  const scores = { kisalik, bakis_acisi: bakisAcisi, duygu_cercevesi: duyguCercevesi };
  return { scores, details: { oyku_cumle: n, ...scores }, hard: [] };
}
```

```ts
// apps/hub/evals/tools/atolye/veli-mektubu/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { MADDE } from "../../../lib/markdown";
import { lower } from "../../../lib/sharedChecks";

export interface VeliMektubuBody { amac: "bilgilendirme" | "ev_etkinligi" | "gorusme_ozeti"; notlar?: string; mebHedefKod?: string }
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** "çocuğunuz disleksiktir / DEHB'dir" etiketi (prompt kuralı: yok). */
const ETIKET = /çocuğunuz(?:un)?\s+(?:\p{L}+\s+){0,3}(disleksi|dehb|diskalkuli|disgrafi|ööb)\p{L}*['’]?(?:d[iıuü]r|t[iıuü]r|l[iı]d[iı]r|var)/u;

export function veliMektubuChecks(args: { body: VeliMektubuBody; text: string }): ToolCheckOut {
  const t = lower(args.text);
  const scores: Record<string, number> = {
    etiket_yok: ETIKET.test(t) ? 0 : 1,
    meb_kod_yok: args.body.mebHedefKod ? (new RegExp(`(?<![\\d.])${esc(args.body.mebHedefKod)}(?!\\d)`).test(args.text) ? 0 : 1) : 1,
  };
  if (args.body.amac === "ev_etkinligi") {
    const madde = args.text.split("\n").filter((l) => MADDE.test(l)).length;
    scores.etkinlik_sayisi = madde >= 3 && madde <= 8 ? 1 : 0;
  }
  return { scores, details: scores, hard: [] };
}
```

```ts
// apps/hub/evals/tools/atolye/ev-odevi/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { sections } from "../../../lib/markdown";

export interface EvOdeviBody { hedefKonu: string; gunSayisi: number; ekstraNot?: string; mebHedefKod?: string }

export function evOdeviChecks(args: { body: EvOdeviBody; text: string }): ToolCheckOut {
  const gunler = sections(args.text).filter((s) => /(^|\s)(\d+)\.\s*gün|gün\s*\d+/.test(s.heading)).length;
  const gunSayisi = gunler >= args.body.gunSayisi ? 1 : 0;
  const dilimler = [...args.text.matchAll(/(\d+)\s*(?:dk|dakika)/g)].map((m) => Number(m[1]));
  const sureDilimi = dilimler.length ? dilimler.filter((d) => d <= 20).length / dilimler.length : 0;
  const scores = { gun_sayisi: gunSayisi, sure_dilimi: sureDilimi };
  return { scores, details: { gun: gunler, dilim: dilimler.length, ...scores }, hard: [] };
}
```

```ts
// apps/hub/evals/tools/atolye/ilerleme-cizelgesi/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { AYRAC, TABLO } from "../../../lib/markdown";
import { lower } from "../../../lib/sharedChecks";

export interface IlerlemeBody { hedefMetni: string; mebHedefKod?: string }
const hucreler = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function ilerlemeChecks(args: { body: IlerlemeBody; text: string }): ToolCheckOut {
  const lines = args.text.split("\n");
  const i = lines.findIndex((l, k) => TABLO.test(l) && AYRAC.test(lines[k + 1] ?? ""));
  if (i < 0) return { scores: { tablo_var: 0, sutunlar: 0, sonuc_bos: 0 }, details: { tablo_var: 0 }, hard: [] };
  const baslik = hucreler(lines[i]!).map(lower);
  const sonucIdx = baslik.findIndex((h) => h.includes("sonuç"));
  const istenen = [/tarih/, /ölçüt|gösterge/, /sonuç/, /not/];
  const sutunlar = istenen.filter((re) => baslik.some((h) => re.test(h))).length / istenen.length;
  const govde: string[][] = [];
  for (let k = i + 2; k < lines.length && TABLO.test(lines[k]!); k++) govde.push(hucreler(lines[k]!));
  const sonucBos = sonucIdx < 0 || !govde.length ? 0 : govde.filter((r) => !(r[sonucIdx] ?? "").trim()).length / govde.length;
  const scores = { tablo_var: 1, sutunlar, sonuc_bos: sonucBos };
  return { scores, details: { satir: govde.length, ...scores }, hard: [] };
}
```

- [ ] **Step 4: Adaptörleri yaz**

```ts
// apps/hub/evals/tools/atolye/sosyal-oyku/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { sosyalOykuChecks, type SosyalOykuBody } from "./checks";

export const adapter = atolyeAdapter<SosyalOykuBody>({
  id: "atolye/sosyal-oyku",
  label: "Sosyal öykü (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/sosyal-oyku/route"),
  body: (b, f) => ({ ...profilBody(f), ...b }),
  requestLines: (b) => [`- Durum: ${b.durum} · Bakış açısı: ${b.bakisAcisi === "birinci_kisi" ? "birinci kişi (ben dili)" : "üçüncü kişi"}${b.hedefBeceri ? ` · Hedef beceri: ${b.hedefBeceri}` : ""}`, b.mebHedefKod ? `- MEB hedef kodu: ${b.mebHedefKod}` : ""].filter(Boolean),
  sections: [/öykü/, /görsel|sahneleme/, /kullanım/],
  checks: sosyalOykuChecks,
  criteria: [
    { key: "duygu_cercevesi", question: "Öykü önce duyguyu adlandırıp 'bu his normaldir' çerçevesini kuruyor, sonra uygun davranışı/baş etme yolunu veriyor mu; duygu 'kötü/yanlış' diye çerçevelenmemiş mi?" },
    { key: "kisalik", question: "Öykü kademeye ve dikkat profiline göre KISA mı (DEHB'de 5–8 cümle), tek durum, somut cümleler; görsel/sahneleme önerisi metinle uygulanabilir mi?" },
  ],
});
```

```ts
// apps/hub/evals/tools/atolye/veli-mektubu/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { veliMektubuChecks, type VeliMektubuBody } from "./checks";

const AMAC_TR = { bilgilendirme: "genel bilgilendirme", ev_etkinligi: "evde yapılabilecek etkinlik önerileri", gorusme_ozeti: "veli görüşmesi özeti" };

export const adapter = atolyeAdapter<VeliMektubuBody>({
  id: "atolye/veli-mektubu",
  label: "Veli mektubu (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/veli-mektubu/route"),
  body: (b, f) => ({ ...profilBody(f), ...b }),
  requestLines: (b) => [`- Amaç: ${AMAC_TR[b.amac]}${b.notlar ? ` · Uzman notları: ${b.notlar}` : ""}`, b.mebHedefKod ? `- MEB hedef kodu: ${b.mebHedefKod} (mektupta resmî kod YAZILMAMALI)` : ""].filter(Boolean),
  sections: [],
  checks: veliMektubuChecks,
  criteria: [
    { key: "veli_dili", question: "Mektup sıcak, etiketlemeyen, teknik terimsiz bir veli diliyle güçlü yönlerden başlıyor mu; 'çocuğunuz …dır' tanı cümlesi ve resmî kod yok mu?" },
    { key: "somut_oneri", question: "Amaca göre içerik (bilgilendirme / 3–5 somut kısa ev etkinliği / görüşme özeti + adımlar) gerçekçi beklentiyle ve iş birliğine davetle veriliyor mu?" },
  ],
});
```

```ts
// apps/hub/evals/tools/atolye/ev-odevi/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { evOdeviChecks, type EvOdeviBody } from "./checks";

export const adapter = atolyeAdapter<EvOdeviBody>({
  id: "atolye/ev-odevi",
  label: "Ev ödevi programı (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/ev-odevi/route"),
  body: (b, f) => ({ ...profilBody(f), ...b }),
  requestLines: (b) => [`- Hedef konu: ${b.hedefKonu} · Süre: ${b.gunSayisi} gün${b.ekstraNot ? ` · Ek not: ${b.ekstraNot}` : ""}`, b.mebHedefKod ? `- MEB hedef kodu: ${b.mebHedefKod}` : ""].filter(Boolean),
  sections: [/genel çerçeve|ebeveyn/, /günlük çalışma planı|gün/, /alternatif/, /gözlem|notlar/],
  checks: evOdeviChecks,
  criteria: [
    { key: "rutine_yerlesme", question: "Günlük plan ailenin gerçek rutinine (akşam, hafta sonu, kardeş) yerleşebilir mi; oyunlaştırma ödül/puan yerine içsel motivasyona dayanıyor mu; B planı gerçekçi mi?" },
    { key: "sure_uyumu", question: "Her gün 15–20 dk'lık dilimlerde mi; istenen gün sayısı kadar gün var ve günler birbirini tekrarlamıyor mu?" },
  ],
});
```

```ts
// apps/hub/evals/tools/atolye/ilerleme-cizelgesi/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { ilerlemeChecks, type IlerlemeBody } from "./checks";

export const adapter = atolyeAdapter<IlerlemeBody>({
  id: "atolye/ilerleme-cizelgesi",
  label: "İlerleme çizelgesi (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/ilerleme-cizelgesi/route"),
  body: (b, f) => ({ ...profilBody(f), ...b }),
  requestLines: (b) => [`- Hedef: ${b.hedefMetni}`, b.mebHedefKod ? `- MEB hedef kodu: ${b.mebHedefKod}` : ""].filter(Boolean),
  sections: [/bileşen/, /veri toplama|çizelge/, /ölçüm sıklığı|yöntem/, /yorumlama/],
  checks: ilerlemeChecks,
  criteria: [
    { key: "veri_sadakati", question: "Çizelge boş mu (hiçbir sonuç/veri uydurulmamış); hedefin gözlenebilir bileşenleri verilen hedef metninden türetilmiş mi?" },
    { key: "olcut_netligi", question: "Göstergeler sayılabilir/ölçülebilir mi (yüzde, sıklık, süre); ölçüm sıklığı ve yöntemi uygulanabilir; yorumlama notu ilerleme/plato/gerileme için karar kuralı veriyor mu?" },
  ],
});
```

- [ ] **Step 5: Vakaları yaz**

```json
// apps/hub/evals/tools/atolye/sosyal-oyku/cases.json
[
  { "id": "so-01", "tags": ["okul öncesi", "hiperaktif", "birinci kişi"], "student": "case-efe", "purpose": "5 yaş sıra bekleme: 5–8 cümle, 'beklemek zor gelir ve bu normaldir' çerçevesi, dinozor ilgisiyle somut sahne.", "body": { "durum": "Oyun sırasında sıramı beklemek", "bakisAcisi": "birinci_kisi" } },
  { "id": "so-02", "tags": ["disleksi+dehb", "birinci kişi", "hedef beceri"], "student": "case-arda", "purpose": "Okurken hata yapınca bırakma: hatayı normalleştirip devam etme becerisi; futbol benzetmesi; 'kötü' çerçevesi yok.", "body": { "durum": "Sesli okurken hata yapınca okumayı bırakmak istiyorum", "bakisAcisi": "birinci_kisi", "hedefBeceri": "Hatayı fark edip düzelterek okumaya devam etme" } },
  { "id": "so-03", "tags": ["lise", "üçüncü kişi", "sınav kaygısı"], "student": "case-tolga", "purpose": "15 yaş üçüncü kişi anlatımı: çocuksu olmayan dil; sınav paniğinde baş etme adımları; 'ben' dili olmamalı.", "body": { "durum": "Sınavda ilk soruyu yapamayınca panikleme", "bakisAcisi": "ucuncu_kisi", "hedefBeceri": "Nefes alıp kolay soruya geçme" } },
  { "id": "so-04", "tags": ["hafif disleksi", "boş bağlam", "birinci kişi"], "student": "case-melis", "purpose": "İlgi alanı olmadan sınıfta sesli okuma kaygısı: uydurma hobi yok; 11 yaşa uygun kısa öykü.", "body": { "durum": "Sınıfta sesli okuma sırası bana gelince kaygılanmak", "bakisAcisi": "birinci_kisi" } }
]
```

```json
// apps/hub/evals/tools/atolye/veli-mektubu/cases.json
[
  { "id": "vm-01", "tags": ["disleksi+dehb", "ev etkinliği", "uzman notu"], "student": "case-arda", "purpose": "3–5 somut ev etkinliği (hece kartları, 10 dk okuma); güçlü yönlerle (sözel anlatım, futbol) açılış; teknik terimsiz.", "body": { "amac": "ev_etkinligi", "notlar": "Hece kartları eve verildi; günde 10 dk birlikte okuma." } },
  { "id": "vm-02", "tags": ["diskalkuli", "bilgilendirme", "MEB kodu yazılmamalı"], "student": "case-mina", "purpose": "MEB kodu verildiği hâlde mektupta resmî kod YOK; 'çocuğunuz diskalkulidir' etiketi yok; güçlü yön bilinmediğinde uydurmadan sıcak açılış.", "body": { "amac": "bilgilendirme", "mebHedefKod": "5.1.14" } },
  { "id": "vm-03", "tags": ["lise", "görüşme özeti"], "student": "case-tolga", "purpose": "Görüşme özeti: uzman notundaki konuların (sınav uyarlamaları, çalışma düzeni) veli diliyle özetlenmesi; 15 yaşın özerkliğine saygılı dil; somut sonraki adımlar.", "body": { "amac": "gorusme_ozeti", "notlar": "Sınav uyarlamaları (ek süre, formül kartı) ve basketbol öncesi 20 dk çalışma düzeni konuşuldu." } },
  { "id": "vm-04", "tags": ["okul öncesi", "hiperaktif", "bilgilendirme"], "student": "case-efe", "purpose": "Okul öncesi hiperaktif profil: 'yaramaz/haylaz' etiketinden kaçınma; şarkı/hareket güçlü yönleriyle başlama; gerçekçi beklenti.", "body": { "amac": "bilgilendirme" } }
]
```

```json
// apps/hub/evals/tools/atolye/ev-odevi/cases.json
[
  { "id": "eo-01", "tags": ["disleksi+dehb", "3 gün", "ek not"], "student": "case-arda", "purpose": "3 günlük program: her gün 15 dk, akşam yemeği sonrası rutini; futbol temalı oyunlaştırma ödülsüz; B planı.", "body": { "hedefKonu": "İki heceli sözcükleri okuma", "gunSayisi": 3, "ekstraNot": "Akşam yemeğinden sonra 15 dk; kardeşi de evde." } },
  { "id": "eo-02", "tags": ["diskalkuli", "5 gün", "MEB kodu"], "student": "case-mina", "purpose": "5 gün eldeli toplama: günler birbirini tekrarlamadan basamaklanıyor mu; MEB 5.1.14 hizası; resim ilgisi.", "body": { "hedefKonu": "Eldeli toplama", "gunSayisi": 5, "mebHedefKod": "5.1.14" } },
  { "id": "eo-03", "tags": ["okul öncesi", "2 gün"], "student": "case-efe", "purpose": "2 günlük okul öncesi program: oyun temelli, 10–15 dk, hareketli; ebeveyn bilgilendirmesi sade.", "body": { "hedefKonu": "Sıra bekleme ve iki adımlı yönerge takibi", "gunSayisi": 2 } },
  { "id": "eo-04", "tags": ["lise", "7 gün", "bütçe"], "student": "case-tolga", "purpose": "7 günlük üst sınır (bütçe): şişmeden her gün ayrı; 15 yaşın öz-düzenlemesine uygun (ebeveyn denetimi yerine öz-izleme); 15–20 dk dilim.", "body": { "hedefKonu": "Haftalık ders çalışma planı ve zaman yönetimi", "gunSayisi": 7 } }
]
```

```json
// apps/hub/evals/tools/atolye/ilerleme-cizelgesi/cases.json
[
  { "id": "ic-01", "tags": ["disleksi+dehb", "MEB kodu", "BEP hedefi"], "student": "case-arda", "purpose": "BEP'teki ölçülebilir hedefin bileşenlere ayrılması; boş tablo; MEB 3.2.5; iki haftalık okuma ölçümü sıklığı.", "body": { "hedefMetni": "Tanıtılan seslerden oluşan iki heceli 10 sözcüğü resim desteğiyle üç ardışık oturumda 8/10 doğrulukla okur", "mebHedefKod": "3.2.5" } },
  { "id": "ic-02", "tags": ["okul öncesi", "davranış hedefi"], "student": "case-efe", "purpose": "Davranış hedefi için sıklık ölçümü (yüzde değil); sonuç hücreleri boş.", "body": { "hedefMetni": "Etkinlik geçişinde görsel uyarıdan sonra 2 dakika içinde yönergeye uyar; 5 günün 4'ünde" } },
  { "id": "ic-03", "tags": ["diskalkuli", "işlem"], "student": "case-mina", "purpose": "İşlem doğruluğu hedefi: 10 soruluk setle yüzde ölçümü; hata türü notu sütunu; uydurma veri yok.", "body": { "hedefMetni": "Eldeli toplama içeren 10 soruluk sette %80 doğruluk, iki ardışık ölçümde" } },
  { "id": "ic-04", "tags": ["disgrafi", "yazma"], "student": "case-zeynep", "purpose": "Yazma hedefi için gözlenebilir bileşenler (satır içinde kalma, okunaklılık); ölçüm yöntemi (örnek yazı kıyası).", "body": { "hedefMetni": "15 dakikalık yazma görevinde satır içinde kalarak okunaklı 3 cümle yazar; 3 oturumda %90" } }
]
```

- [ ] **Step 6: Registry + testler** — dört satır; `ev evals/tools/atolye` PASS; `TOOL_IDS` artık 21 öğe: selftest ekle (`registry.selftest.eval.ts`: `expect(TOOL_IDS).toHaveLength(21)` ve her kimliğin `loadAdapter` ile yüklenip `adapter.id === kimlik` olduğu, her `cases.json`'ın 4 (artikülasyon 16) vaka taşıdığı, her vakanın `student` değerinin `resolveFixture` ile çözüldüğü).

- [ ] **Step 7: Lint, tip, commit**

```bash
cd apps/hub && node_modules/.bin/eslint evals && npm run typecheck:evals
git add apps/hub/evals/tools && git commit -m "feat(evals): sosyal öykü, veli mektubu, ev ödevi ve ilerleme çizelgesi adaptörleri; registry 21 araç + öz-test"
```

---

### Task 15: Vaka listesi dokümanı (kullanıcı onayı için)

**Files:**
- Create: `apps/hub/evals/vakaListesi.eval.ts`
- Create (üretilen): `docs/superpowers/evals/2026-10-vakalar.md`

Spec B4: vaka listesini Claude taslaklar, kullanıcı tek turda onaylar/düzeltir. Doküman `cases.json` dosyalarından ÜRETİLİR (elle yazılmaz; düzeltme `cases.json`'da yapılır, doküman yeniden üretilir). Taban koşusundan (Task 17) sonra bir vakanın gövdesi değişirse eski referans geçersiz kalır: değişen vakaya YENİ kimlik verilir (ör. `hw-02` → `hw-02b`), eski kimlik silinir; böylece `ref/<eski>` çakışmaz.

- [ ] **Step 1: Üreticiyi yaz**

```ts
// apps/hub/evals/vakaListesi.eval.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { REPO_ROOT, type CaseDef } from "./lib/core";
import { resolveFixture } from "./lib/fixtures";
import { TOOL_IDS, loadAdapter } from "./tools/registry";

/* docs/superpowers/evals/2026-10-vakalar.md — araç × vaka × amaç tablosu (kullanıcı onayı).
   node_modules/.bin/vitest run --config vitest.eval.config.ts evals/vakaListesi.eval.ts */

const HEDEF = path.join(REPO_ROOT, "docs/superpowers/evals/2026-10-vakalar.md");

it("vaka listesi dokümanını üretir", async () => {
  const out: string[] = ["# Değerlendirme vakaları (2026-10)", "", "Üretilen dosya — düzeltme `apps/hub/evals/tools/<modül>/<araç>/cases.json`'da yapılır, sonra `ev evals/vakaListesi.eval.ts` ile yeniden üretilir.", ""];
  let toplam = 0;
  for (const id of TOOL_IDS) {
    const a = await loadAdapter(id);
    const cases = JSON.parse(readFileSync(path.join(a.dir, "cases.json"), "utf8")) as CaseDef[];
    toplam += cases.length;
    out.push(`## ${a.label} — \`${id}\` (${cases.length} vaka)`, "", "| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |", "|---|---|---|---|---|");
    for (const c of cases) {
      const f = resolveFixture(a.module, c.student);
      const kim = f ? ("name" in f ? `${f.name} (${c.student})` : `${f.code} (${c.student})`) : "—";
      const govde = JSON.stringify(c.body).replace(/\|/g, "\\|");
      out.push(`| ${c.id} | ${kim} | ${c.tags.join(", ")} | ${c.purpose.replace(/\|/g, "\\|")} | \`${govde}\` |`);
    }
    out.push("");
  }
  out.push(`Toplam: ${TOOL_IDS.length} araç, ${toplam} vaka.`, "");
  mkdirSync(path.dirname(HEDEF), { recursive: true });
  writeFileSync(HEDEF, out.join("\n"));
  process.stderr.write(`${HEDEF} yazıldı (${toplam} vaka)\n`);
});
```

- [ ] **Step 2: Üret ve gözden geçir**

Run: `cd apps/hub && ev evals/vakaListesi.eval.ts` → doküman 21 araç, 96 vaka (16 + 20 × 4). Dokümanı aç; her aracın 4 vakasında öğrencili/öğrencisiz, yaş uçları, eştanı, zengin/boş bağlam ve araca özgü uç (spec B4) kapsanıyor mu — eksikse ilgili `cases.json`'ı düzelt, yeniden üret.

- [ ] **Step 3: Commit**

```bash
git add apps/hub/evals/vakaListesi.eval.ts docs/superpowers/evals/2026-10-vakalar.md
git commit -m "docs(evals): 96 vakanın onay dokümanı (cases.json'dan üretilir)"
```

Kullanıcı onayı bu dokümanla alınır (çevrimdışı çalışmada: doküman commit'lenir, kullanıcı sonradan düzeltir; düzeltilen vakalar Task 17'den sonra yeni kimlikle yeniden koşulur).

---

### Task 16: Özet betiği + README

**Files:**
- Create: `apps/hub/evals/lib/summary.ts`, `apps/hub/evals/lib/summary.selftest.eval.ts`, `apps/hub/evals/summary.eval.ts`
- Modify: `apps/hub/evals/README.md`

Her kolun `results.jsonl` satırları: `prompt_id, rep, grade{win, format_ok, talimat, dil_kurali, rumuz_yok, yasak_kalip, …}, hard_fail[], out_tokens, status?: "truncated", usage_estimated`. Özet: araç × kol tablosu (n, ortalama win, sert hata sayısı, ortalama talimat, ortalama çıktı token'ı, tabana göre token farkı %). Karar kuralları (spec B6) tabloya işlenir: `v1` win ≥ 0,65 ve sert hata gerilemiyor ve token ≤ +%20 → "KABUL ADAYI"; `v2` (EVAL_REF=v1) win ≥ 0,40 ve sert hata 0 → "HAIKU ADAYI".

- [ ] **Step 1: Testi yaz**

```ts
// apps/hub/evals/lib/summary.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { armSummary, renderSummary, type ResultRow } from "./summary";

const row = (id: string, win: number, hard: string[] = [], out = 1000, talimat = 1): ResultRow => ({ prompt_id: id, rep: 0, grade: { win, format_ok: 1, talimat, dil_kurali: 1, rumuz_yok: 1, yasak_kalip: 1 }, hard_fail: hard, out_tokens: out, usage_estimated: true });

describe("özet", () => {
  it("armSummary ortalamaları ve sert hata sayısını verir", () => {
    const s = armSummary([row("a", 1), row("b", 0, ["dil_kurali"], 2000, 0.5)]);
    expect(s).toMatchObject({ n: 2, win: 0.5, hard: 1, talimat: 0.75, out_tokens: 1500, truncated: 0 });
  });
  it("renderSummary tabana göre token farkı ve karar etiketi yazar", () => {
    const md = renderSummary([
      { tool: "studio/x", arm: "baseline", s: armSummary([row("a", 0.5, [], 1000)]) },
      { tool: "studio/x", arm: "v1", s: armSummary([row("a", 0.7, [], 1100)]) },
      { tool: "studio/x", arm: "v2", s: armSummary([row("a", 0.45, [], 900)]), ref: "v1" },
    ]);
    expect(md).toContain("| studio/x | v1 |");
    expect(md).toContain("+10%");
    expect(md).toContain("KABUL ADAYI");
    expect(md).toContain("HAIKU ADAYI");
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

- [ ] **Step 3: Uygula**

```ts
// apps/hub/evals/lib/summary.ts
import { mean } from "./sharedChecks";

export interface ResultRow {
  prompt_id: string;
  rep: number;
  grade: Record<string, number>;
  hard_fail: string[];
  out_tokens: number | null | undefined;
  status?: string;
  usage_estimated?: boolean;
}
export interface ArmSummary { n: number; win: number; hard: number; talimat: number; out_tokens: number; truncated: number; estimated: boolean }
export interface ArmRow { tool: string; arm: string; s: ArmSummary; ref?: string }

export function armSummary(rows: ResultRow[]): ArmSummary {
  return {
    n: rows.length,
    win: mean(rows.map((r) => r.grade.win ?? 0)),
    hard: rows.filter((r) => r.hard_fail?.length).length,
    talimat: mean(rows.map((r) => r.grade.talimat ?? 0)),
    out_tokens: mean(rows.map((r) => r.out_tokens ?? 0)),
    truncated: rows.filter((r) => r.status === "truncated").length,
    estimated: rows.some((r) => r.usage_estimated === true),
  };
}

const pct = (a: number, b: number) => (b ? `${a - b >= 0 ? "+" : ""}${Math.round(((a - b) / b) * 100)}%` : "—");
const f2 = (x: number) => x.toFixed(2);

/** Spec B6 karar etiketi. `ref`: karşılaştırılan kol (varsayılan baseline). */
function karar(r: ArmRow, base: ArmSummary | undefined, ref: ArmSummary | undefined): string {
  const v = r.arm.split("@")[0];
  if (v === "v1" && base) {
    const tokenOk = r.s.out_tokens <= base.out_tokens * 1.2;
    return r.s.win >= 0.65 && r.s.hard <= base.hard && tokenOk ? "KABUL ADAYI" : r.s.win >= 0.65 ? "win tamam, bütçe/sert hata gerilemesi" : "—";
  }
  if (v === "v2" && ref) return r.s.win >= 0.4 && r.s.hard === 0 ? "HAIKU ADAYI" : "—";
  return "";
}

export function renderSummary(rows: ArmRow[]): string {
  const byTool = new Map<string, ArmRow[]>();
  for (const r of rows) byTool.set(r.tool, [...(byTool.get(r.tool) ?? []), r]);
  const out = ["| Araç | Kol | n | win | sert hata | talimat | çıktı token | tabana göre | kesilen | karar |", "|---|---|---|---|---|---|---|---|---|---|"];
  for (const [tool, arms] of byTool) {
    const base = arms.find((a) => a.arm === "baseline")?.s;
    for (const r of arms) {
      const ref = r.ref ? arms.find((a) => a.arm === r.ref)?.s : base;
      out.push(`| ${tool} | ${r.arm} | ${r.s.n} | ${f2(r.s.win)} | ${r.s.hard} | ${f2(r.s.talimat)} | ${Math.round(r.s.out_tokens)}${r.s.estimated ? "~" : ""} | ${base && r.arm !== "baseline" ? pct(r.s.out_tokens, base.out_tokens) : "—"} | ${r.s.truncated} | ${karar(r, base, ref)} |`);
    }
  }
  out.push("", "`~` = alt-ajan tahmini token (chars/3,2); mutlak maliyet iddiası YOK, yalnız kollar arası göreli karşılaştırma.");
  return out.join("\n");
}
```

```ts
// apps/hub/evals/summary.eval.ts
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { FLOW_DIR, readJsonl } from "./lib/core";
import { armSummary, renderSummary, type ArmRow, type ResultRow } from "./lib/summary";

/* <flow>/<modül>/<araç>/<kol>/results.jsonl → <flow>/ozet.md (ve stderr).
   [EVAL_FLOW=…] node_modules/.bin/vitest run --config vitest.eval.config.ts evals/summary.eval.ts
   v2 kolları için referans `v1` varsayılır (EVAL_REF=v1 ile koşulmuş olmalı). */

it("tüm kolların özetini yazar", () => {
  const rows: ArmRow[] = [];
  for (const mod of ["studio", "atolye"]) {
    const mdir = path.join(FLOW_DIR, mod);
    if (!existsSync(mdir)) continue;
    for (const tool of readdirSync(mdir)) {
      const tdir = path.join(mdir, tool);
      for (const arm of readdirSync(tdir)) {
        if (arm.startsWith("controls")) continue;
        const file = path.join(tdir, arm, "results.jsonl");
        if (!existsSync(file)) continue;
        const r = readJsonl<ResultRow>(file);
        if (r.length) rows.push({ tool: `${mod}/${tool}`, arm, s: armSummary(r), ...(arm.startsWith("v2") ? { ref: arm.replace(/^v2/, "v1") } : {}) });
      }
    }
  }
  const md = renderSummary(rows);
  writeFileSync(path.join(FLOW_DIR, "ozet.md"), md + "\n");
  process.stderr.write(md + "\n");
});
```

- [ ] **Step 4: Testi çalıştır** → PASS; `ev evals/summary.eval.ts` (gerçek akış diziniyle) 1A pilot kollarını (social-story, bep baseline) ve dönüştürülen artikülasyonu (results yok → listelenmez) gösterir.

- [ ] **Step 4b: Küçük paylaşılan düzeltmeler (inceleme notları)** — `countSentences` bölme ön-bakışına `%` eklenir (veli notunda "%70 …" ile başlayan cümle sayılsın; `/` eklenmez); `sureDk("5 dk - 10 dk")` 7.5 döner (tireden önce birim izinli) ve öz-testler güncellenir; eşleştirmede kategori kartı B (kategori adı) sözcük sınırından muaf ve kelime kartında sondaki nokta kabul; sesletimde bankasız seste `tekrar_yok` yalnız details (UI'nin sunduğu 20 sesin hepsi bankalı — ulaşılamayan yol); `evals/tools/studio/*` kapıları yeşil kalır.

- [ ] **Step 5: README güncelle** — "Araçlar" tablosu (21 kimlik, vaka sayısı, öğrenci zorunluluğu, çıktı biçimi), yeni bölümler: "Tohumlu rastgelelik" (Task 3), "Kart üreticisi: tool_use taklidi" (Task 4; alt-ajan yanıtı yalnız JSON), "Fikstürler" (6+6 + artikülasyon 12; çakışma testi), "Artikülasyon referansları gerçek Sonnet 4.6" (`source.json`), "Özet" (`ev evals/summary.eval.ts`), "Vaka listesi" (`ev evals/vakaListesi.eval.ts`), "Bilinen ürün hatası: banka kaybı" (`BANKA_STASH_KAYBI`), "Bilgi asimetrisi" (Studio rotaları modele yalnız ad/yaş/alan/tanı — haftalık planda ek olarak kart başlıkları ve son özetin yalnız genel performansı — gönderir; hakem fikstürün tamamını görür; taban `ozgulluk`/`gecmis_baglanti` düşüklüğü prompt kalitesi değil, Faz 2 bağlam katmanının ölçeceği boşluktur; Atölye'de `ATOLYE_GITMEYEN` notu vardır, Studio'da bilerek yok), "UI'den türeyen kurallar" (sesletim `yol_var`, yılan–merdiven bitiş karesi, `pozisyon`; eşleştirme `tur_yankisi`: prompt söylemez, UI okur — tabanda düşük puan beklenir, puanlayıcı hatası değildir), "Beklenen taban sert hataları" (AI profili: ürün şablonu "[Terapist için önemli uyarılar…]" der; kart üreticisi: sistem prompt'u 'terapist' demeyi yasaklamaz → taban çıktılarında 'terapist' → `dil_kurali` sert hatası; gerçek prompt bulgusu, v1 'uzman' demeli; kontrol gevşetilmez; özet tablosu sert hataları nedene göre ayırmalı). Komut örnekleri `studio/homework` gibi yeni kimliklerle.

- [ ] **Step 6: Lint, tip, commit**

```bash
cd apps/hub && node_modules/.bin/eslint evals && npm run typecheck:evals
git add apps/hub/evals && git commit -m "feat(evals): araç×kol özet tablosu (B6 karar etiketleri) + README 1B"
```

---

### Task 17: Taban koşusu (19 araç) + hakem kontrolleri (21 araç) + `eval-taban-2026-10` etiketi

**Files:**
- Dış dizin: `.claude/hillclimb/prompt-yukseltme/<modül>/<araç>/{baseline,controls}/`
- Modify: `apps/hub/evals/README.md` (sonuç notu), bellek dosyası (oturum sonunda)
- Git: açıklamalı etiket `eval-taban-2026-10`

Bu görev kod yazmaz; orkestratör döngüsüdür (README "Çevrimdışı döngü"). Spec: prompt'lara dokunmadan ÖNCE tüm araçlarda taban dondurulur ve commit etiketlenir. Sosyal hikâye ve BEP tabanı 1A'da donduruldu; artikülasyonun referansları dönüştürüldü (üretim gerekmez). Kalan 18 araç × 4 = 72 üretim isteği (sonnet) + 21 araç × 2 kontrol adayı × 2 sıra = 84 hakem isteği (opus). Alt-ajan başına ~90K bağlam; `.claude/agents/eval-model.md` yüklüyse (yeni oturumda) `subagent_type: "eval-model"`, değilse `general-purpose` + protokol metni.

- [ ] **Step 1: Ön koşullar**

```bash
cd apps/hub && ev evals/lib evals/tools evals/runner.selftest.eval.ts   # hepsi yeşil
mkdir -p ../../.claude/agents && cp evals/agents/eval-model.md ../../.claude/agents/
git status --short   # temiz olmalı (bu görev sırasında kod değişmez)
```

- [ ] **Step 2: Üretim turu (araç başına)** — 18 araç için (studio: homework, session-summary, weekly-plan, comm-board, matching-game, phonation, cards, ai-profile; atolye: seans-plani, davranis, okuma, matematik, materyal, uyarlama, sosyal-oyku, veli-mektubu, ev-odevi, ilerleme-cizelgesi):

```bash
EVAL_TOOL=<kimlik> EVAL_VARIANT=baseline ev evals/run.eval.ts        # pending.json: 4 üretim satırı
```
Her satır için `Agent` (model = satırın `agentModel`'i: `sonnet`; prompt `İstek: <requestMd>\nYanıt: <responseTxt>`); 8'li dalgalar; `dispatch.jsonl`'e not. Tüm araçların istekleri birlikte dağıtılabilir (72 ajan, 9 dalga). Yanıtlar gelince her araç için aynı komutu yeniden koş → `results.jsonl` 4 satır, `ref/` 4 dosya. `errors.jsonl` boş değilse (ör. `json_gecersiz`, `truncated`, `pii_leak`) nedenini oku: PII sızıntısı koşuyu durdurur ve DÜZELTİLMEDEN devam edilmez (fikstür/rota sorunu); kesilme (`truncated`) ürünün bilinen tavanıdır, `ok:false` referans donar ve sonuç notuna yazılır.

- [ ] **Step 3: Hakem kontrolleri (21 araç)**

```bash
EVAL_TOOL=<kimlik> ev evals/judgeControls.eval.ts      # ilk geçiş: 4 hakem isteği (jenerik ab/ba, özdeş ab/ba)
```
`agentModel: opus` ile dağıt (84 ajan, 11 dalga), yeniden koş → `controls/judge_controls.json` `complete: true`, iki kontrol de GEÇTİ. Artikülasyonda kontrol vakası `EVAL_CASES=art-01` olsun (art-08 referansının uzman notları klinik olarak hatalı; jenerik aday orada berabere kalabilir). Kalan kontrol varsa (jenerik kazanıyor ya da özdeş berabere değil): önce `genericCandidate`'ın hakem metnini gerçekten bozduğuna bak (`renderForJudge(generic)` ≠ ref metni), sonra ölçüt sorularını netleştir; düzeltme kod değişikliğiyse ayrı commit (`fix(evals): …`) ve o aracın kontrolü yeniden.

- [ ] **Step 4: Özet + doğrulama**

```bash
ev evals/summary.eval.ts            # 21 araç × baseline satırı (artikülasyon results'sız → not düş)
ls .claude/hillclimb/prompt-yukseltme/*/*/baseline/ref | wc -l     # 96 referans dosyası (+ source.json hariç)
```
README'ye "Taban (2026-10)" notu: araç başına tamam/sert hata/kesilen sayıları, kontrol sonuçları, ölçülen alt-ajan yükü (dispatch.jsonl'den ortalama token), toplam ajan sayısı.

- [ ] **Step 5: Etiket + commit**

```bash
git add apps/hub/evals/README.md && git commit -m "docs(evals): taban koşusu 2026-10 — 21 araç, 96 referans, hakem kontrolleri"
git tag -a eval-taban-2026-10 -m "Araç prompt yükseltme: prompt'lara dokunulmadan önceki taban (21 araç, 96 vaka, çevrimdışı Sonnet 5.5 + artikülasyonda gerçek Sonnet 4.6)"
git tag -n1 eval-taban-2026-10
```
PUSH YOK (etiket dahil). Bellek dosyası güncellenir: Faz 1B BİTTİ, taban etiketli, sıradaki Faz 2 (Studio prompt'ları + bağlam katmanı).

---

## Faz 2'ye devir notları

- **Ürün hataları (Faz 2'de prompt'la birlikte ele alınır):** (1) banka kaybı — `toolHandler.ts` `scrubDeep` kopyası (spawn edilmiş görev); düzelince `BANKA_STASH_KAYBI=false` + artikülasyon/sesletim referansları yeniden değerlendirilir (gerçek Sonnet 4.6 referansları bu hatayla üretildi — v1 karşılaştırması için öğrencili kelime-düzeyi vakalarında hakem notu kalır). (2) haftalık plan son-özet anahtarları (`sessionNotes`/`nextSessionGoals` hiç yazılmıyor). (3) `DAY_OFFSETS`'ta Pazar yok. (4) sesletim `maxTokens 4096` (25 öğede kesilme). (5) rumuz ek uyumu ve görsel prompt'ta rumuz cinsiyeti.
- **Çevrimdışı sonuçlar görelidir:** `sonnet` alt-ajanı Sonnet 5.5'tir (canlı 4.6 değil); mutlak kalite/maliyet iddiası yok. Haiku kararı (v2) canlıya alma konuşmasında API doğrulamasıyla.
- **Vaka değişikliği = yeni kimlik** (Task 15 notu); referanslar vaka kimliğine bağlıdır.
- **Yıla duyarlılık:** Studio yaş metni takvim yılıyla değişir; 2027'de fikstür yaşları kayar (doğum tarihleri güncellenir, referanslar yeniden üretilir).
