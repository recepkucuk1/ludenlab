# Araç Prompt Yükseltme — Faz 2: Studio bağlam katmanı + 10 prompt — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Studio'nun 10 aracına (8 araç + öğrenme kartı + AI profili) tek bir öğrenci bağlam katmanı bağlamak ve her aracın sistem/kullanıcı prompt'unu spec A1 standardına göre yeniden yazmak; her yeni prompt'u `eval-taban-2026-10` tabanına karşı çevrimdışı ölçmek ve B6 kuralıyla kabul etmek (Haiku adaylarını listelemek).

**Architecture:** Bağlam katmanı `apps/hub/src/modules/studio/lib/studentContext.ts` iki parçadır: saf biçimlendirici `renderStudentBlock(ctx, butce)` (test edilir, DB yok) ve yükleyici `loadStudentContext(prisma, {studentId, therapistId})`. `createToolHandler` bloğu bir kez kurar ve `ToolPromptContext.studentBlock` olarak her aracın `buildUserPrompt`'una verir; `cards/generate` ve haftalık planın kendi sorguları bu katmana taşınır (tek kaynak). Sistem prompt'ları `apps/hub/src/modules/studio/lib/prompts/iskelet.ts`'teki `studioSistemPromptu()` ile A1 sırasıyla kurulur (rol → klinik çerçeve → özgüllük → karşıt örnek → biçim → öz-denetim → ortak etik/dil bloğu); ortak bloklar `apps/hub/src/lib/prompts/ortakBloklar.ts`'ten gelir. JSON alan adları, istemci, PDF, `CARD_TOOL` şeması, rumuz kapısı, kredi ve SSE DEĞİŞMEZ (spec A4). Ölçüm: araç başına `EVAL_VARIANT=v1` koşusu (yeni prompt, çevrimdışı Sonnet 5.5) tabana karşı; kabulde `EVAL_VARIANT=v2 EVAL_REF=v1` (Haiku 5.5) koşusu; karar B6; araç başına ≤3 tur, her tur `_state.json`'a.

**Tech Stack:** Next.js 16 route handlers, TypeScript, vitest (`apps/hub/vitest.config.ts` → `src/**/*.test.ts`; eval kapısı `vitest.eval.config.ts`), Prisma (Studio şeması `apps/hub/prisma/studio/schema.prisma`), `@ludenlab/ai` (`pseudonymizeText`, `NameMapping`), eval düzeneği `apps/hub/evals/` (Faz 1B, etiket `eval-taban-2026-10`), `eval-model` alt-ajanı.

---

## Bağlam (alt-ajan için zorunlu okuma)

- Spec: `docs/superpowers/specs/2026-10-08-arac-prompt-yukseltme-design.md` — A1 (prompt standardı), A2 (bağlam katmanı), A3 (çıktı bütçesi), A4 (değişmeyenler), B3/B6 (kollar, karar). Faz 1A/1B planları ve README (`apps/hub/evals/README.md`) düzeneğin nasıl koştuğunu anlatır.
- Dal `prompt/arac-prompt-yukseltme` (PUSH YOK). Her görev tek commit (Türkçe mesaj, sonda `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`). TDD: önce kırmızı test.
- Kapılar: `cd apps/hub && node_modules/.bin/vitest run src/modules/studio src/lib/prompts src/lib/toolGate.test.ts` (ürün birim testleri) + eval kapısı `node_modules/.bin/vitest run --config vitest.eval.config.ts evals/lib evals/tools evals/runner.selftest.eval.ts` (3147+) + `node_modules/.bin/eslint <değişen dizinler>` + `npm run typecheck` (ürün; Prisma istemcileri üretilmiş olmalı) + `npm run typecheck:evals`. **vitest'i HİÇ filtresiz koşma** (canlı eval giriş noktalarını tetikler). Dev sunucusu PROD DB'ye bakar; rota çağırma.
- `.claude/hillclimb/prompt-yukseltme/` gerçek akış dizinidir; yalnız orkestratörün eval koşuları yazar. Alt-ajan buraya yazmaz (okuyabilir: `baseline/out/*.json` referans çıktıları, `ozet.md`).
- Ana checkout'u `git checkout` ile başka dala ALMA; ayrı kopya gerekiyorsa `git worktree add --detach <scratchpad>/<ad> HEAD`.
- Puanlayıcı ilkesi değişmez: eval kontrolleri bu fazda DEĞİŞTİRİLMEZ (yalnız prompt ve ürün kodu). Bir kontrolün yeni prompt'ta yanlış düştüğü görülürse ayrı `fix(evals)` commit'i ve orkestratör kararı.
- Token tahmini: `Math.ceil(chars / 3.2)` (düzenekle aynı). Hedef sistem prompt'u 1.200–2.000 token (3.840–6.400 karakter).
- Çıktı bütçesi: aracın taban ortalama çıktı token'ı (`ozet.md`, `çıktı token` sütunu, `~` tahmini): ai-profile 2292, cards 2104, comm-board 2209, homework 2481, matching-game 1103, phonation 1677, session-summary 1297, social-story 1322, weekly-plan 2399; articulation için `baseline/ref/art-*` çıktı uzunluğundan hesaplanır. Yeni prompt alan bazında bütçeyi açıkça yazar; `v1` çıktısı taban +%20'yi aşarsa kabul edilmez.
- Studio hakem ölçütleri (adaptörlerdeki `criteria`) "iyi çıktı"nın tanımıdır; yeni prompt bunlara doğrudan hizmet eder (ör. homework `veli_dili`/`sure_uyumu`; weekly-plan `progresyon`/`gecmis_baglanti`; comm-board `aac_uygunluk`/`sembol_netligi`; cards `hedef_hizasi`/`progresyon`/`yas_uyumu`; ai-profile `klinik_dogruluk`/`eyleme_donukluk`; session-summary `veri_sadakati`/`veli_ozeti`; social-story `gray_oranlari`/`gorsel_uyum`; matching-game `cift_kesinligi`/`seviye_uyumu`; phonation `ses_dogrulugu`/`oyun_uygulanabilirligi`; articulation `hedef_ses`/`dil_yas`/`uzman_notlari`/`ev_rehberi`).

## Dosya yapısı

- Create: `apps/hub/src/modules/studio/lib/studentContext.ts`, `studentContext.test.ts` — bağlam katmanı (yükleyici + biçimlendirici + profil bölüm ayrıştırıcı).
- Create: `apps/hub/src/modules/studio/lib/prompts/iskelet.ts`, `iskelet.test.ts` — sistem/kullanıcı prompt iskeleti, token ölçümü, prompt birim-test yardımcısı.
- Modify: `apps/hub/src/lib/prompts/ortakBloklar.ts` (+ `RUMUZ_NOTU`, `yasakKalipMetni()`, `ORTAK_SON_BLOK`), `ortakBloklar.test.ts`.
- Modify: `apps/hub/src/modules/studio/lib/toolHandler.ts` (`ToolPromptContext.studentBlock`), `toolHandler.test.ts`.
- Modify: `apps/hub/src/app/studio/api/cards/generate/route.ts`, `apps/hub/src/modules/studio/lib/prompts/index.ts` (`StudentContext` → `studentBlock`), `apps/hub/src/modules/studio/lib/generateProfile.ts`.
- Modify: 8 rota: `apps/hub/src/app/studio/api/tools/{homework,session-summary,social-story,weekly-plan,comm-board,matching-game,phonation,articulation}/route.ts` (SYSTEM_PROMPT + buildUserPrompt).
- Create: araç başına `apps/hub/src/app/studio/api/tools/<araç>/prompt.test.ts` (uzunluk penceresi, alan adları, yasak sözcük); kart ve profil için `prompts/card.prompt.test.ts`, `generateProfile.prompt.test.ts`.
- Modify (eval, yalnız taklit/fikstür): `apps/hub/evals/lib/mocks/studio.ts` (`studentProgress.findMany` durum filtresi, `card.findFirst` toolType filtresi), `apps/hub/evals/lib/core.ts` (`StudioFixture.inProgressGoals?`), `apps/hub/evals/fixtures/studio.json` (isteğe bağlı `inProgressGoals`), `apps/hub/evals/lib/piiMask.ts` (artikülasyon örneği adsız olunca maske girdisi kalkar), `apps/hub/evals/README.md` (Faz 2 notu).
- Akış (orkestratör): `.claude/hillclimb/prompt-yukseltme/studio/<araç>/{v1,v2}/…`, `.claude/hillclimb/prompt-yukseltme/studio/<araç>/_state.json`.

---

### Task 1: Bağlam katmanı — `studentContext.ts` (TDD)

**Files:**
- Create: `apps/hub/src/modules/studio/lib/studentContext.ts`
- Create: `apps/hub/src/modules/studio/lib/studentContext.test.ts`

Spec A2 tablosu birebir uygulanır. İki katman: `renderStudentBlock` (saf) ve `loadStudentContext` (Prisma). Blok metni rumuzludur; her serbest alan `scrub` ile süzülür (kart başlıkları, profil, notlar gerçek adla kaydedilmiş olabilir). Bütçe toplam **2.400 karakter**; alanlar sırayla doldurulur, bütçe dolunca kalanlar atlanır (1. alan kesilmez).

- [ ] **Step 1: Kırmızı testleri yaz**

```ts
// apps/hub/src/modules/studio/lib/studentContext.test.ts
import { describe, expect, it, vi } from "vitest";
import type { NameMapping } from "@ludenlab/ai";
import {
  PROFIL_BOLUMLERI,
  loadStudentContext,
  profilBolumleriniAyikla,
  renderStudentBlock,
  type StudentContextInput,
} from "./studentContext";

const map: NameMapping = { real: "Ela Şahin", alias: "Nisa" };

const temel: StudentContextInput = {
  alias: "Nisa",
  ageYears: 6,
  workArea: "language",
  diagnosis: "OSB, hafif; ifade edici dil gecikmesi",
  notes: null,
  aiProfile: null,
  curriculumTitles: [],
  recentCards: [],
  lastSummary: null,
  completedGoalCodes: [],
  inProgressGoalTitles: [],
};

describe("renderStudentBlock", () => {
  it("kimlik satırı her zaman yazılır ve kesilmez", () => {
    const t = renderStudentBlock(temel);
    expect(t).toContain("Öğrenci: Nisa, 6 yaş");
    expect(t).toContain("Çalışma alanı: Dil");
    expect(t).toContain("Tanı: OSB, hafif; ifade edici dil gecikmesi");
  });

  it("yaş yoksa yaş yazılmaz, tanı yoksa tanı satırı yok", () => {
    const t = renderStudentBlock({ ...temel, ageYears: null, diagnosis: null });
    expect(t).toContain("Öğrenci: Nisa\n");
    expect(t).not.toContain("Tanı:");
  });

  it("uzman notu 400 karakterde kırpılır ve '…' ile biter", () => {
    const t = renderStudentBlock({ ...temel, notes: "a".repeat(600) });
    const satir = t.split("\n").find((l) => l.startsWith("Uzman notları: "))!;
    expect(satir.length).toBeLessThanOrEqual("Uzman notları: ".length + 400);
    expect(satir.endsWith("…")).toBe(true);
  });

  it("profilden yalnız iki bölüm alınır (≤800 karakter), diğer başlıklar gelmez", () => {
    const profil = `## Kavramsal Arka Plan\n\n### Tanının Klinik Açıklaması\nUzun açıklama.\n\n---\n\n## Uzmana Öneriler\n\n### Öncelikli Çalışma Alanları\n- İki kelimeli istek cümlelerini üçe genişletme\n- Geçiş anlarında görsel uyarı\n\n### Etkili Yaklaşım ve Teknikler\nModel olma.\n\n### Dikkat Edilmesi Gereken Noktalar\nAni ses değişimleri kaygı yaratır.\n\n### Aile ile Paylaşılabilecek Öneriler\nEvde resimli program.`;
    const t = renderStudentBlock({ ...temel, aiProfile: profil });
    expect(t).toContain("Öncelikli çalışma alanları: İki kelimeli istek cümlelerini üçe genişletme; Geçiş anlarında görsel uyarı");
    expect(t).toContain("Dikkat edilmesi gerekenler: Ani ses değişimleri kaygı yaratır.");
    expect(t).not.toContain("Model olma");
    expect(t).not.toContain("Klinik Açıklaması");
  });

  it("son 5 kart: başlık ≤80 karakter, araç türü ve tarih", () => {
    const cards = Array.from({ length: 7 }, (_, i) => ({
      title: `Kart ${i} ${"x".repeat(100)}`,
      toolType: "SOCIAL_STORY",
      createdAt: new Date(2026, 8, 1 + i),
    }));
    const t = renderStudentBlock({ ...temel, recentCards: cards });
    const satirlar = t.split("\n").filter((l) => l.startsWith("- Kart "));
    expect(satirlar).toHaveLength(5);
    expect(satirlar[0]!.length).toBeLessThanOrEqual(80 + " (SOCIAL_STORY, 07.09.2026)".length + 2);
  });

  it("son oturum özeti: genel değerlendirme + sonraki plan, ≤400 karakter", () => {
    const t = renderStudentBlock({
      ...temel,
      lastSummary: { createdAt: new Date(2026, 9, 1), overallAssessment: "İyi gitti. ".repeat(40), nextSessionPlan: "Üç sözcüklü isteğe geç." },
    });
    const satir = t.split("\n").find((l) => l.startsWith("Son oturum (01.10.2026): "))!;
    expect(satir.length).toBeLessThanOrEqual("Son oturum (01.10.2026): ".length + 400);
    expect(satir).toContain("Sonraki plan:");
  });

  it("hedefler: tamamlanan kodlar + süren başlıklar, toplam ≤10 madde", () => {
    const t = renderStudentBlock({
      ...temel,
      completedGoalCodes: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7"],
      inProgressGoalTitles: ["Üç sözcüklü istek", "Sıra alma", "Ortak dikkat", "Taklit"],
    });
    expect(t).toContain("Tamamlanan hedefler: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7");
    expect(t).toContain("Sürmekte olan hedefler: Üç sözcüklü istek, Sıra alma, Ortak dikkat");
    expect(t).not.toContain("Taklit"); // 7 + 3 = 10
  });

  it("toplam bütçe 2400 karakteri aşmaz; sıradaki alanlar atlanır, kimlik korunur", () => {
    const t = renderStudentBlock({
      ...temel,
      notes: "n".repeat(400),
      aiProfile: `### Öncelikli Çalışma Alanları\n${"- madde ".repeat(120)}\n### Dikkat Edilmesi Gereken Noktalar\n${"d".repeat(500)}`,
      recentCards: Array.from({ length: 5 }, (_, i) => ({ title: "k".repeat(80), toolType: "WEEKLY_PLAN", createdAt: new Date(2026, 8, i + 1) })),
      lastSummary: { createdAt: new Date(2026, 9, 1), overallAssessment: "o".repeat(300), nextSessionPlan: "p".repeat(300) },
      completedGoalCodes: ["1.1"],
      inProgressGoalTitles: ["x".repeat(60)],
    });
    expect(t.length).toBeLessThanOrEqual(2400);
    expect(t.startsWith("Öğrenci: Nisa")).toBe(true);
  });

  it("alias satırı dışında gerçek ad hiçbir alanda kalmaz (scrub)", () => {
    const t = renderStudentBlock(
      {
        ...temel,
        notes: "Ela Şahin dinozorları sever.",
        aiProfile: "### Öncelikli Çalışma Alanları\nEla'nın istek cümleleri.\n### Dikkat Edilmesi Gereken Noktalar\nEla Şahin kaygılı.",
        recentCards: [{ title: "Ela için sosyal hikâye", toolType: "SOCIAL_STORY", createdAt: new Date(2026, 8, 1) }],
        lastSummary: { createdAt: new Date(2026, 9, 1), overallAssessment: "Ela iyi.", nextSessionPlan: null },
      },
      map,
    );
    expect(t).not.toMatch(/Ela/);
    expect(t).toContain("Nisa");
  });
});

describe("profilBolumleriniAyikla", () => {
  it("başlıklar sabit sözleşmedir", () => {
    expect(PROFIL_BOLUMLERI).toEqual(["Öncelikli Çalışma Alanları", "Dikkat Edilmesi Gereken Noktalar"]);
  });
  it("başlık yoksa boş döner; madde işaretleri '; ' ile birleşir", () => {
    expect(profilBolumleriniAyikla("serbest metin")).toEqual({ oncelik: "", dikkat: "" });
    expect(profilBolumleriniAyikla("### Öncelikli Çalışma Alanları\n- a\n- b\n### Dikkat Edilmesi Gereken Noktalar\nc")).toEqual({ oncelik: "a; b", dikkat: "c" });
  });
});

describe("loadStudentContext", () => {
  const prisma = {
    student: { findFirst: vi.fn() },
    card: { findMany: vi.fn(), findFirst: vi.fn() },
    curriculum: { findMany: vi.fn() },
    studentProgress: { findMany: vi.fn() },
  };
  it("sorguları uzmanla kapsamlar, bloğu rumuzlu döndürür", async () => {
    prisma.student.findFirst.mockResolvedValue({ id: "s1", name: "Ela Şahin", birthDate: new Date(2020, 4, 14), workArea: "language", diagnosis: "OSB", notes: "Ela trenleri sever", aiProfile: null, curriculumIds: ["c1"] });
    prisma.card.findMany.mockResolvedValue([{ title: "Ela treni", toolType: "SOCIAL_STORY", createdAt: new Date(2026, 8, 1) }]);
    prisma.card.findFirst.mockResolvedValue(null);
    prisma.curriculum.findMany.mockResolvedValue([{ title: "Pragmatik Dil" }]);
    prisma.studentProgress.findMany.mockResolvedValue([{ status: "completed", goal: { code: "2.1", title: "İstek" } }, { status: "in_progress", goal: { code: "2.2", title: "Sıra alma" } }]);
    const blok = await loadStudentContext(prisma as never, { studentId: "s1", therapistId: "t1", nameMap: map, now: new Date(2026, 9, 12) });
    expect(prisma.card.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: "s1", therapistId: "t1" }, take: 5 }));
    expect(blok).toContain("Öğrenci: Nisa, 6 yaş");
    expect(blok).toContain("Modüller: Pragmatik Dil");
    expect(blok).toContain("Nisa treni");
    expect(blok).toContain("Tamamlanan hedefler: 2.1");
    expect(blok).toContain("Sürmekte olan hedefler: Sıra alma");
    expect(blok).not.toMatch(/Ela/);
  });
  it("sorgu patlarsa boş string döner ve console.warn çağrılır (üretim sürer)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    prisma.student.findFirst.mockRejectedValue(new Error("db"));
    const blok = await loadStudentContext(prisma as never, { studentId: "s1", therapistId: "t1", nameMap: map });
    expect(blok).toBe("");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[studentContext]"), expect.anything());
    warn.mockRestore();
  });
  it("öğrenci bulunamazsa boş string", async () => {
    prisma.student.findFirst.mockResolvedValue(null);
    expect(await loadStudentContext(prisma as never, { studentId: "yok", therapistId: "t1", nameMap: map })).toBe("");
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/studentContext.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: Uygulama**

```ts
// apps/hub/src/modules/studio/lib/studentContext.ts
import type { NameMapping } from "@ludenlab/ai";
import { scrub } from "@studio/lib/pseudonym";
import { WORK_AREA_LABEL } from "@studio/lib/constants";
import { formatDate } from "@studio/lib/utils";

/**
 * Ortak öğrenci bağlam katmanı (spec A2). Tek kaynak: haftalık planın ve kart üreticisinin kendi
 * sorguları buraya taşındı. Blok RUMUZLUDUR; her serbest alan `scrub`'dan geçer (kart başlığı,
 * profil, not gerçek adla kaydedilmiş olabilir). Bağlam hiçbir zaman üretimi engellemez:
 * sorgu patlarsa boş blok + uyarı.
 */
export const BUTCE_TOPLAM = 2400;
const BUTCE = { not: 400, profil: 800, kartBaslik: 80, ozet: 400, hedefMadde: 10, kartSayisi: 5 } as const;

/** AI profilinden bloğa alınan İKİ bölüm — başlıklar `generateProfile.ts` şablonuyla SÖZLEŞMEDİR. */
export const PROFIL_BOLUMLERI = ["Öncelikli Çalışma Alanları", "Dikkat Edilmesi Gereken Noktalar"] as const;

export interface StudentContextInput {
  alias: string;
  ageYears: number | null;
  workArea: string;
  diagnosis: string | null;
  notes: string | null;
  aiProfile: string | null;
  curriculumTitles: string[];
  recentCards: { title: string; toolType: string | null; createdAt: Date }[];
  lastSummary: { createdAt: Date; overallAssessment: string | null; nextSessionPlan: string | null } | null;
  completedGoalCodes: string[];
  inProgressGoalTitles: string[];
}

const kirp = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");
const tekSatir = (s: string) => s.replace(/\s+/g, " ").trim();

/** `### Başlık` altındaki metni (bir sonraki `#` başlığa ya da `---`e kadar) alır; madde işaretlerini '; ' ile birleştirir. */
function bolum(profil: string, baslik: string): string {
  const re = new RegExp(`^#{1,6}\\s*${baslik.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "miu");
  const m = re.exec(profil);
  if (!m) return "";
  const kalan = profil.slice(m.index + m[0].length);
  const son = kalan.search(/^(?:#{1,6}\s|---\s*$)/mu);
  const govde = (son < 0 ? kalan : kalan.slice(0, son)).trim();
  return govde
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/u, "").trim())
    .filter(Boolean)
    .join("; ");
}

export function profilBolumleriniAyikla(profil: string): { oncelik: string; dikkat: string } {
  return { oncelik: bolum(profil, PROFIL_BOLUMLERI[0]), dikkat: bolum(profil, PROFIL_BOLUMLERI[1]) };
}

/** Saf biçimlendirici: alanlar A2 sırasıyla, bütçe dolunca sonrakiler atlanır; kimlik satırı kesilmez. */
export function renderStudentBlock(ctx: StudentContextInput, map?: NameMapping | null): string {
  const s = (t: string | null | undefined) => (map ? scrub(t, map) : t) ?? "";
  const alan = WORK_AREA_LABEL[ctx.workArea] ?? ctx.workArea;
  const kimlik = [
    `Öğrenci: ${ctx.alias}${ctx.ageYears !== null ? `, ${ctx.ageYears} yaş` : ""}`,
    `Çalışma alanı: ${alan}`,
    ctx.diagnosis ? `Tanı: ${tekSatir(s(ctx.diagnosis))}` : null,
    ctx.curriculumTitles.length ? `Modüller: ${ctx.curriculumTitles.slice(0, 3).join(", ")}` : null,
  ].filter(Boolean) as string[];

  const adaylar: string[][] = [];
  if (ctx.notes?.trim()) adaylar.push([`Uzman notları: ${kirp(tekSatir(s(ctx.notes)), BUTCE.not)}`]);
  if (ctx.aiProfile?.trim()) {
    const { oncelik, dikkat } = profilBolumleriniAyikla(s(ctx.aiProfile));
    const satirlar: string[] = [];
    let kalan = BUTCE.profil;
    if (oncelik) { const t = kirp(`Öncelikli çalışma alanları: ${oncelik}`, kalan); satirlar.push(t); kalan -= t.length; }
    if (dikkat && kalan > 40) satirlar.push(kirp(`Dikkat edilmesi gerekenler: ${dikkat}`, kalan));
    if (satirlar.length) adaylar.push(satirlar);
  }
  if (ctx.recentCards.length) {
    const kartlar = [...ctx.recentCards]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, BUTCE.kartSayisi)
      .map((c) => `- ${kirp(tekSatir(s(c.title)), BUTCE.kartBaslik)} (${c.toolType ?? "kart"}, ${formatDate(c.createdAt, "short")})`);
    adaylar.push(["Son çalışmalar:", ...kartlar]);
  }
  if (ctx.lastSummary && (ctx.lastSummary.overallAssessment || ctx.lastSummary.nextSessionPlan)) {
    const parca = [
      ctx.lastSummary.overallAssessment ? tekSatir(s(ctx.lastSummary.overallAssessment)) : "",
      ctx.lastSummary.nextSessionPlan ? `Sonraki plan: ${tekSatir(s(ctx.lastSummary.nextSessionPlan))}` : "",
    ].filter(Boolean).join(" ");
    adaylar.push([`Son oturum (${formatDate(ctx.lastSummary.createdAt, "short")}): ${kirp(parca, BUTCE.ozet)}`]);
  }
  if (ctx.completedGoalCodes.length || ctx.inProgressGoalTitles.length) {
    const tamam = ctx.completedGoalCodes.slice(0, BUTCE.hedefMadde);
    const suren = ctx.inProgressGoalTitles.slice(0, Math.max(0, BUTCE.hedefMadde - tamam.length)).map((t) => tekSatir(s(t)));
    const satirlar: string[] = [];
    if (tamam.length) satirlar.push(`Tamamlanan hedefler: ${tamam.join(", ")}`);
    if (suren.length) satirlar.push(`Sürmekte olan hedefler: ${suren.join(", ")}`);
    adaylar.push(satirlar);
  }

  let metin = kimlik.join("\n");
  for (const grup of adaylar) {
    const ek = "\n" + grup.join("\n");
    if (metin.length + ek.length > BUTCE_TOPLAM) continue; // bütçe dolu: bu alan atlanır, sıradakine bakılır
    metin += ek;
  }
  return metin;
}

type StudentContextPrisma = {
  student: { findFirst: (args: unknown) => Promise<unknown> };
  card: { findMany: (args: unknown) => Promise<unknown>; findFirst: (args: unknown) => Promise<unknown> };
  curriculum: { findMany: (args: unknown) => Promise<unknown> };
  studentProgress: { findMany: (args: unknown) => Promise<unknown> };
};

export interface LoadStudentContextArgs {
  studentId: string;
  therapistId: string;
  nameMap: NameMapping;
  /** Bloğa ALINMAYACAK alanlar (ör. AI profili üretilirken `aiProfile` döngüye girmesin). */
  exclude?: ("aiProfile")[];
  now?: Date;
}

const yas = (birth: Date | null, now: Date) => (birth ? now.getFullYear() - new Date(birth).getFullYear() : null);

/** Yükleyici: sorgular uzmanla kapsamlı; her hata yutulur (boş blok + uyarı). */
export async function loadStudentContext(prisma: StudentContextPrisma, args: LoadStudentContextArgs): Promise<string> {
  const now = args.now ?? new Date();
  try {
    const [student, recentCards, lastSummary, progress] = (await Promise.all([
      prisma.student.findFirst({
        where: { id: args.studentId, therapistId: args.therapistId },
        select: { id: true, name: true, birthDate: true, workArea: true, diagnosis: true, notes: true, aiProfile: true, curriculumIds: true },
      }),
      prisma.card.findMany({
        where: { studentId: args.studentId, therapistId: args.therapistId },
        orderBy: { createdAt: "desc" },
        take: BUTCE.kartSayisi,
        select: { title: true, toolType: true, createdAt: true },
      }),
      prisma.card.findFirst({
        where: { studentId: args.studentId, therapistId: args.therapistId, toolType: "SESSION_SUMMARY" },
        orderBy: { createdAt: "desc" },
        select: { content: true, createdAt: true },
      }),
      prisma.studentProgress.findMany({
        where: { studentId: args.studentId, therapistId: args.therapistId, status: { in: ["completed", "in_progress"] } },
        select: { status: true, goal: { select: { code: true, title: true } } },
      }),
    ])) as [
      { birthDate: Date | null; workArea: string; diagnosis: string | null; notes: string | null; aiProfile: string | null; curriculumIds: string[] } | null,
      { title: string; toolType: string | null; createdAt: Date }[],
      { content: unknown; createdAt: Date } | null,
      { status: string; goal: { code: string; title: string } }[],
    ];
    if (!student) return "";
    const curricula = student.curriculumIds.length
      ? ((await prisma.curriculum.findMany({ where: { id: { in: student.curriculumIds } }, select: { title: true } })) as { title: string }[])
      : [];
    const c = (lastSummary?.content ?? null) as Record<string, unknown> | null;
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
    return renderStudentBlock(
      {
        alias: args.nameMap.alias,
        ageYears: yas(student.birthDate, now),
        workArea: student.workArea,
        diagnosis: student.diagnosis,
        notes: student.notes,
        aiProfile: args.exclude?.includes("aiProfile") ? null : student.aiProfile,
        curriculumTitles: curricula.map((x) => x.title),
        recentCards,
        lastSummary: lastSummary && c ? { createdAt: lastSummary.createdAt, overallAssessment: str(c.overallAssessment), nextSessionPlan: str(c.nextSessionPlan) } : null,
        completedGoalCodes: progress.filter((p) => p.status === "completed").map((p) => p.goal.code),
        inProgressGoalTitles: progress.filter((p) => p.status === "in_progress").map((p) => p.goal.title),
      },
      args.nameMap,
    );
  } catch (err) {
    console.warn("[studentContext] bağlam yüklenemedi, blok atlandı", err);
    return "";
  }
}
```

Notlar: `formatDate(d, "short")` biçimi `dd.MM.yyyy` değilse testteki tarih dizgisini `formatDate`'in gerçek çıktısına göre düzelt (biçimi değiştirme). `WORK_AREA_LABEL.language` "Dil" değilse testi gerçek etikete göre düzelt. Son oturum özeti anahtarları ÜRETİMDE kaydedilenlerdir (`overallAssessment`, `nextSessionPlan` — bkz. session-summary şeması); haftalık planın eski okuduğu `overallPerformance/sessionNotes/nextSessionGoals` anahtarları yanlıştı (bilinen ürün hatası, burada kapanır).

- [ ] **Step 4: Yeşil** — aynı komut, hepsi geçer. `node_modules/.bin/eslint src/modules/studio/lib/studentContext.ts src/modules/studio/lib/studentContext.test.ts`, `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add apps/hub/src/modules/studio/lib/studentContext.ts apps/hub/src/modules/studio/lib/studentContext.test.ts
git commit -m "feat(studio): ortak öğrenci bağlam katmanı — bütçeli, rumuzlu blok (A2)"
```

**İnceleme sonrası kurallar (uygulanan; 4863bac + 2cf12c7):** hedef durumları UI'nin yazdığı gibi — `completed|mastered` → tamamlanan kodlar, `in_progress|consolidating` → süren başlıklar (sorgu `status: { in: [...] }`, `select: { status, goal: { select: { code, title } } }` TESTTE BİREBİR pinli; Task 2 taklidi bu şekli servis etmeli). Son oturum özeti anahtarları ÜRETİMDEKİ `overallAssessment` + `nextSessionPlan` (haftalık planın eski `overallPerformance/sessionNotes/nextSessionGoals` okuması yanlıştı — burada kapandı); "Sonraki plan:" için 400'ün yarısı ayrılır. `kirp` yedek çifti kesmez. `Modüller:` TÜM müfredat başlıkları (kap yok; katalog kısa). Profil başlık ayrıştırıcı `#{0,6}`, numaralı, kalın (`**Başlık:**`), `:` toleranslı; bölüm sonu `#`, `---`, `***` ya da tamamen kalın satır. İkincil sorgular (kartlar, özet, hedefler, müfredat) `Promise.allSettled`: biri patlarsa o alan atlanır + `console.warn`, blok sürer; öğrenci sorgusu patlarsa "". `LoadStudentContextArgs.student?` ile kapıdan gelen satır verilirse öğrenci sorgusu atlanır (Task 2 kapının `select`'ini `notes, aiProfile, curriculumIds` ile genişletir). `student.findFirst` select'i `name` almaz. Yaş = yıl farkı (kapıyla aynı; `generateProfile.ts` gün/365,25 kullanıyor — profil katmana geçince birleştirilecek). Bilinen küçük sınırlar: düz-metin (işaretsiz) ikinci başlık öncekini kesmez; `**1. Başlık**` ve TAMAMI BÜYÜK başlık eşleşmez.

---

### Task 2: Katmanı kapıya ve iki özel rotaya bağlama

**Files:**
- Modify: `apps/hub/src/modules/studio/lib/toolHandler.ts`, `toolHandler.test.ts`
- Modify: `apps/hub/src/app/studio/api/cards/generate/route.ts`, `apps/hub/src/modules/studio/lib/prompts/index.ts`
- Modify: `apps/hub/src/app/studio/api/tools/weekly-plan/route.ts` (yalnız sorguların kaldırılması; prompt metni Task 7'de)
- Modify: `apps/hub/src/modules/studio/lib/generateProfile.ts` (blok `exclude: ["aiProfile"]`)
- Modify (eval taklidi): `apps/hub/evals/lib/mocks/studio.ts`, `apps/hub/evals/lib/core.ts`, `apps/hub/evals/fixtures/studio.json`

- [ ] **Step 1: Kırmızı — toolHandler testi**

`toolHandler.test.ts`'e `@studio/lib/studentContext` taklidi ve iki `it` ekle (mevcut `vi.mock` bloklarının yanına):

```ts
const loadStudentContext = vi.fn(async () => "Öğrenci: Nisa, 6 yaş\nUzman notları: trenleri sever");
vi.mock("@studio/lib/studentContext", () => ({ loadStudentContext }));
// prisma taklidine öğrenci sorgusu ekle:
//   student: { findFirst: async () => ({ id: "s1", name: "Ela Şahin", birthDate: new Date(2020, 4, 14), workArea: "language", diagnosis: null, llmAlias: "Nisa" }) }
// ve pseudonym: vi.mock("@studio/lib/pseudonym", () => ({ ensureStudentAlias: async () => "Nisa", restoreNameDeep: (v: unknown) => v, scrub: (t: string | null) => t, scrubDeep: (v: unknown) => v }))

it("öğrenci seçiliyse buildUserPrompt'a studentBlock verilir ve bloğun adı rumuzdur", async () => {
  const seen: string[] = [];
  const POST2 = createToolHandler({ ...TEMEL_CONFIG, bodySchema: z.object({ studentId: z.string() }), studentRequired: true,
    buildUserPrompt: (_d, _s, _a, ctx) => { seen.push(ctx.studentBlock); return "istek"; } });
  await cagir(POST2, { studentId: "s1" }, "end_turn", '{"title":"x"}');
  expect(seen[0]).toContain("Öğrenci: Nisa");
  expect(loadStudentContext).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ studentId: "s1", therapistId: "uzman-1", nameMap: { real: "Ela Şahin", alias: "Nisa" } }));
});

it("öğrenci yoksa studentBlock boş string; bağlam yükleyici çağrılmaz", async () => {
  loadStudentContext.mockClear();
  const seen: string[] = [];
  const POST3 = createToolHandler({ ...TEMEL_CONFIG, studentRequired: false, buildUserPrompt: (_d, _s, _a, ctx) => { seen.push(ctx.studentBlock); return "istek"; } });
  await cagir(POST3, {}, "end_turn", '{"title":"x"}');
  expect(seen[0]).toBe("");
  expect(loadStudentContext).not.toHaveBeenCalled();
});
```

(`TEMEL_CONFIG` ve `cagir` = dosyadaki mevcut `POST` konfigürasyonu ve `generate` yardımcısının gövdeli genellemesi; mevcut testler aynen kalır.)

- [ ] **Step 2: Uygulama — `toolHandler.ts`**

```ts
// ToolPromptContext'e:
  /** Ortak öğrenci bağlam bloğu (spec A2): rumuzlu, ≤2400 karakter; öğrenci yoksa "". Araç olduğu gibi gömer. */
  studentBlock: string;
// createToolHandler içinde, nameMap kurulduktan sonra, promptCtx'ten önce:
      const studentBlock = student && nameMap
        ? await loadStudentContext(prisma, { studentId: student.id, therapistId: session.user.id, nameMap })
        : "";
// promptCtx: { therapistId, scrubText, studentBlock }
```

`import { loadStudentContext } from "@studio/lib/studentContext";` eklenir. Blok KREDİ REZERVASYONUNDAN ÖNCE yüklenir (bağlam hatası krediyi tüketmez).

- [ ] **Step 3: `cards/generate` ve `prompts/index.ts`**

`StudentContext` arayüzü ve `formatStudentContext` KALDIRILIR; `CardGenerationParams.studentContext?: StudentContext` → `studentBlock?: string`; `buildCardPrompt` bloğu `**ÖĞRENCİ BAĞLAMI:**` başlığı altında olduğu gibi gömer (boşsa başlık yazılmaz). `cards/generate/route.ts`'te `Promise.all` sorguları silinir; `nameMap` kurulduktan sonra `studentBlock = await loadStudentContext(prisma, { studentId, therapistId: session.user.id, nameMap })`. `RECENT_CARDS_LIMIT` sabiti kaldırılır (kullanım kalmadı). Rotanın kendi testleri varsa güncelle (`grep -rn "studentContext\|StudentContext" apps/hub/src` → sıfır kullanım kalmalı, eval adaptörü `cards/adapter.ts` HARİÇ: o `requestLines` için fikstürü okur, rotaya dokunmaz).

- [ ] **Step 4: Haftalık plan sorguları**

`weekly-plan/route.ts` `buildUserPrompt`'tan `prisma.card.findMany`, `prisma.card.findFirst`, `prisma.student.findUnique`, `prisma.curriculum.findMany` ve `recentCardsBlock/lastSummaryBlock/curriculumTitles` KALDIRILIR; yerine `ctx.studentBlock` gömülür (prompt metninin tamamı Task 7'de yeniden yazılır; bu adımda yalnız bloğu `Öğrenci bilgileri:` yerine koy ve `import { prisma }` satırını sil). `src/lib/toolGate.test.ts` yeşil kalmalı.

- [ ] **Step 5: AI profili**

`generateProfile.ts`: `student` sorgusundan sonra `const blok = await loadStudentContext(prisma, { studentId, therapistId, nameMap, exclude: ["aiProfile"] });` ve `buildUserPrompt`'a `studentBlock: blok` geçir; eski `notes`/`moduleNames` satırları bloğun içinde geldiği için kaldırılır (prompt metni Task 13'te yeniden yazılır; bu adımda yalnız alan taşınır).

- [ ] **Step 6: Eval taklidi ve fikstür**

`evals/lib/mocks/studio.ts`:
- `card.findFirst`: `where.toolType === "SESSION_SUMMARY"` ise mevcut davranış; başka toolType'ta `null`.
- `studentProgress.findMany({ where })`: `where.status === "completed"` ya da `where.status?.in` içinde `completed` → `completedGoalCodes` satırları `{ status: "completed", goal: { code, title: code } }`; `in_progress` istenmişse `fx().inProgressGoals ?? []` → `{ status: "in_progress", goal: { code: "", title } }`. Eski çağrı biçimi (`status: "completed"`, `select: { goal: { select: { code } } }`) de aynı sonucu verir.
- `evals/lib/core.ts` `StudioFixture`'a `inProgressGoals?: string[]`; `fixtures/studio.json`'da stu-ela'ya `["Üç sözcüklü istek cümlesi", "Sıra alma oyunları"]`, stu-kerem'e bir madde ekle (zengin bağlam vakaları); diğerleri boş. Fikstür yükleyici testleri (`evals/lib/fixtures*.selftest`) alanı kabul etmeli.
- Eval kapısı yeşil: `node_modules/.bin/vitest run --config vitest.eval.config.ts evals/lib evals/tools evals/runner.selftest.eval.ts`. Studio adaptör öz-testleri (`adapter.selftest`) rotayı gerçek `createToolHandler` ile koşturur: blok artık istekte görünür; `rumuz_yok`/PII kapısı testleri geçmeli (blok rumuzlu).

- [ ] **Step 7: Kapılar + commit**

```bash
cd apps/hub && node_modules/.bin/vitest run src/modules/studio src/lib/toolGate.test.ts && node_modules/.bin/vitest run --config vitest.eval.config.ts evals/lib evals/tools evals/runner.selftest.eval.ts && node_modules/.bin/eslint src/modules/studio src/app/studio/api evals/lib && npm run typecheck && npm run typecheck:evals
git add -A apps/hub/src/modules/studio apps/hub/src/app/studio/api/cards/generate/route.ts apps/hub/src/app/studio/api/tools/weekly-plan/route.ts apps/hub/evals/lib/mocks/studio.ts apps/hub/evals/lib/core.ts apps/hub/evals/fixtures/studio.json
git commit -m "feat(studio): bağlam bloğu araç kapısında tek kaynak — kart üreticisi ve haftalık plan kendi sorgularını bıraktı; eval taklidinde hedef durumu ve özet filtresi"
```

**İnceleme sonrası kurallar (uygulanan; 50acc1f + de3d834 + b153686):** kapı öğrenci `select`'ini `notes, aiProfile, curriculumIds` ile genişletir ve satırı `student:` ile yükleyiciye verir (öğrenci sorgusu bir kez); `buildUserPrompt`'a giden `student` ESKİ DAR biçimde (notes/aiProfile araçlara doğrudan gitmez); blok `nameMap`'ten sonra, `reserveCredits`'ten ÖNCE (`invocationCallOrder` testli), yükleyici hatası "" + warn ve üretim sürer. Kart rotası ve profil üretici de `student:` geçirir. `generateProfile.calcAge` takvim-yılı farkı (kapı ve katmanla aynı; 2020-12-01 doğum testi). Düzenek: koşturucu rumuz deseni blok kimlik satırına sabit `^Öğrenci: ([^,\n]+)(?:, \d+ yaş)?$(?=\nÇalışma alanı: )` (virgülsüz not satırı yakalanmaz; eski `- Ad:`/`Öğrenci adı:` biçimleri sürer); taklit `studentProgress.findMany` `where.status` string ya da `{in}` + `{status, goal:{code,title}}`, `card.findFirst` `toolType` filtresi; fikstür `inProgressGoals?: {code,title}[]` (stu-ela 2, stu-kerem 1); hakem fikstür görünümü (`renderStudent.ts`) sürmekte olan hedefleri de gösterir (hakem ≥ model); kart/profil adaptör `requestLines` notları bloğa göre ve öğrencisiz vakada koşullu. Düzenek değişiklikleri (koşturucu deseni, adaptör notları) planın "ayrı commit" kuralına rağmen feat commit'inde kaldı — içerik doğru, bölme yapılmadı (karar). Bilinen geçiş durumu: 7 araç blok gömmeden yükleyiciyi çalıştırıyor (Task 4–11'e kadar); profil prompt'unda kimlik iki kez (Task 13'e kadar); `CARD_SYSTEM_PROMPT` etiketleri blok etiketleriyle Task 12'de uyumlanır; haftalık planın gerçek rotasını koşturan kalıcı düzenek testi yok (ilk v1 koşusu canlı denetimdir).

---

### Task 3: Ortak bloklar + Studio prompt iskeleti

**Files:**
- Modify: `apps/hub/src/lib/prompts/ortakBloklar.ts`, `ortakBloklar.test.ts`
- Create: `apps/hub/src/modules/studio/lib/prompts/iskelet.ts`, `iskelet.test.ts`

- [ ] **Step 1: Kırmızı**

```ts
// apps/hub/src/modules/studio/lib/prompts/iskelet.test.ts
import { describe, expect, it } from "vitest";
import { ETIK_SINIR, DIL_KURALI, RUMUZ_NOTU, yasakKalipMetni } from "@/lib/prompts/ortakBloklar";
import { studioSistemPromptu, studioKullaniciPromptu, yaklasikToken, promptPenceresi } from "./iskelet";

const ornek = {
  rol: "Sen LudenLab'in ev ödevi materyali üreticisisin. Okuyucu: veli.",
  klinikCerceve: ["Ev çalışması seanstaki hedefin GENELLEMESİDİR: aynı beceri, farklı ortam."],
  ozgulluk: ["İlgi alanı verilmişse en az iki adımda malzeme olarak kullan."],
  karsitOrnek: { zayif: "Her gün 10 dakika konuşma pratiği yapın.", iyi: "Akşam yemeğinde Nisa'nın tabağındaki 3 yiyeceği 'ver' sözcüğüyle istemesini bekleyin." },
  bicim: { giris: "Yanıtını SADECE JSON formatında ver:", sema: '{ "title": "…" }', butce: ["title ≤ 8 kelime"] },
  ozDenetim: ["Her adım profildeki bir veriye bağlı mı?", "Ödül/puan/çıkartma yok mu?"],
};

describe("studioSistemPromptu", () => {
  it("bölümler A1 sırasıyla gelir ve ortak son blok eklenir", () => {
    const p = studioSistemPromptu(ornek);
    const sira = ["ROL", "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK", "ZAYIF ÖRNEK", "İYİ ÖRNEK", "BİÇİM", "ÖZ-DENETİM", ETIK_SINIR, DIL_KURALI, RUMUZ_NOTU].map((k) => p.indexOf(k));
    expect(sira.every((i) => i >= 0)).toBe(true);
    expect([...sira].sort((a, b) => a - b)).toEqual(sira);
    expect(p).toContain(yasakKalipMetni());
  });
  it("karşıt örnek çifti 120 kelimeyi aşarsa kurulum anında fırlatır", () => {
    expect(() => studioSistemPromptu({ ...ornek, karsitOrnek: { zayif: "k ".repeat(70), iyi: "k ".repeat(60) } })).toThrow(/karşıt örnek/);
  });
  it("öz-denetim 4–6 madde olmalı", () => {
    expect(() => studioSistemPromptu({ ...ornek, ozDenetim: ["tek"] })).toThrow(/öz-denetim/);
  });
});

describe("studioKullaniciPromptu", () => {
  it("sıra: öğrenci bloğu, parametreler, odak, hatırlatma; boş blok başlıksız", () => {
    const p = studioKullaniciPromptu({ studentBlock: "Öğrenci: Nisa", parametreler: ["- Süre: 10 dakika"], odak: "Süre 10 dk → en çok 4 adım.", hatirlatma: ["Veliye öneri kipi.", "Ödül önerme."] });
    expect(p.indexOf("Öğrenci: Nisa")).toBeLessThan(p.indexOf("- Süre: 10 dakika"));
    expect(p.indexOf("Odak:")).toBeLessThan(p.indexOf("Son hatırlatma"));
    expect(studioKullaniciPromptu({ studentBlock: "", parametreler: ["- a"], odak: "o", hatirlatma: ["h", "h2"] })).not.toContain("ÖĞRENCİ");
  });
});

describe("yaklasikToken / promptPenceresi", () => {
  it("3,2 karakter = 1 token; pencere 1200–2000", () => {
    expect(yaklasikToken("a".repeat(320))).toBe(100);
    expect(promptPenceresi("a".repeat(3200))).toEqual({ token: 1000, uygun: false });
    expect(promptPenceresi("a".repeat(5000)).uygun).toBe(true);
  });
});
```

`ortakBloklar.test.ts`'e: `RUMUZ_NOTU` boş değil ve "verilen ad" içerir; `yasakKalipMetni()` listedeki her kalıbı tırnak içinde içerir ve "somut bir eylemle birlikte" der.

- [ ] **Step 2: Uygulama**

`ortakBloklar.ts`'e ekle:

```ts
export const RUMUZ_NOTU = `RUMUZ NOTU
- Öğrenciden yalnız sana verilen adla bahset; adı değiştirme, kısaltma ya da başka ad üretme.`;

/** Yasak kalıpları prompt metnine döker: kalıplar yalnız somut bir eylemle birlikte yazılabilir. */
export function yasakKalipMetni(): string {
  return `JENERİK KALIPLAR (yalnız somut bir eylemle birlikte yazılabilir; tek başına YAZMA): ${YASAK_KALIPLAR.map((k) => `"${k}…"`).join(", ")}. Örnek: "sabırlı olun" yerine "çocuk 5 saniye içinde yanıt vermezse aynı soruyu aynı sözcüklerle bir kez daha sorun".`;
}

/** İki modülün paylaştığı kapanış bloğu (A1 madde 7). */
export const ORTAK_SON_BLOK = [ETIK_SINIR, DIL_KURALI, RUMUZ_NOTU, yasakKalipMetni()].join("\n\n");
```

`iskelet.ts`:

```ts
// apps/hub/src/modules/studio/lib/prompts/iskelet.ts
import { ORTAK_SON_BLOK } from "@/lib/prompts/ortakBloklar";

/** Spec A1 sistem prompt iskeleti. Bölümler sabit sırada; kurulum anında bütçe denetimi. */
export interface SistemPromptParcalari {
  rol: string;                       // 1 — rol, kitle, kayıt
  klinikCerceve: string[];           // 2 — araca özgü klinik çerçeve maddeleri
  ozgulluk?: string[];               // 3 — araca özgü ek özgüllük kuralları (ortak kurallar iskelette)
  karsitOrnek: { zayif: string; iyi: string }; // 4 — ≤120 kelime toplam
  bicim: { giris: string; sema: string; butce: string[] }; // 5 — JSON şeması (alan adları değişmez) + alan bütçeleri
  ozDenetim: string[];               // 6 — 4–6 evet/hayır maddesi
}

const kelime = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

const ORTAK_OZGULLUK = [
  "Her öneri, profildeki en az bir somut veriye (yaş, tanı, güçlü yön, ilgi alanı, geçmiş çalışma, uzman notu, son oturum) açıkça bağlanır; bağlanamayan öneri yazılmaz.",
  "İlgi alanı verilmişse en az iki yerde malzeme olarak kullan.",
  "Geçmiş çalışmalar verilmişse tekrar etme; bir sonraki adımı kur.",
  "Yapılacak şeyi söyle (\"yap\"), yapılmayacak şeyi uzun uzun anlatma.",
];

export function studioSistemPromptu(p: SistemPromptParcalari): string {
  const n = kelime(p.karsitOrnek.zayif) + kelime(p.karsitOrnek.iyi);
  if (n > 120) throw new Error(`karşıt örnek çifti ${n} kelime (≤120 olmalı)`);
  if (p.ozDenetim.length < 4 || p.ozDenetim.length > 6) throw new Error(`öz-denetim ${p.ozDenetim.length} madde (4–6 olmalı)`);
  const madde = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");
  return [
    `ROL\n${p.rol}`,
    `KLİNİK ÇERÇEVE\n${madde(p.klinikCerceve)}`,
    `ÖZGÜLLÜK KURALLARI\n${madde([...ORTAK_OZGULLUK, ...(p.ozgulluk ?? [])])}`,
    `ZAYIF ÖRNEK (böyle yazma): ${p.karsitOrnek.zayif}\nİYİ ÖRNEK (böyle yaz): ${p.karsitOrnek.iyi}`,
    `BİÇİM\n${p.bicim.giris}\n${p.bicim.sema}\nAlan bütçeleri:\n${madde(p.bicim.butce)}`,
    `ÖZ-DENETİM (yanıtı yazmadan önce kendine sor; listeyi çıktıya YAZMA)\n${p.ozDenetim.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
    ORTAK_SON_BLOK,
  ].join("\n\n");
}

/** Spec A1 kullanıcı prompt sırası: (a) öğrenci bloğu, (b) parametreler, (c) koddan türetilen tek satır odak, (d) iki kritik kural. */
export function studioKullaniciPromptu(p: { studentBlock: string; parametreler: string[]; odak: string; hatirlatma: string[] }): string {
  const bolumler: string[] = [];
  if (p.studentBlock.trim()) bolumler.push(`ÖĞRENCİ\n${p.studentBlock.trim()}`);
  bolumler.push(`PARAMETRELER\n${p.parametreler.join("\n")}`);
  bolumler.push(`Odak: ${p.odak}`);
  bolumler.push(`Son hatırlatma: ${p.hatirlatma.join(" ")}`);
  return bolumler.join("\n\n");
}

export const yaklasikToken = (s: string) => Math.ceil(s.length / 3.2);
export const PENCERE = { min: 1200, max: 2000 } as const;
export function promptPenceresi(s: string): { token: number; uygun: boolean } {
  const token = yaklasikToken(s);
  return { token, uygun: token >= PENCERE.min && token <= PENCERE.max };
}

/** Araç prompt testlerinin ortak iddiası: pencere + alan adları + yasak sözcükler. */
export function promptIddialari(system: string, beklenenAlanlar: string[]) {
  const { token, uygun } = promptPenceresi(system);
  if (!uygun) throw new Error(`sistem prompt'u ${token} token; pencere ${PENCERE.min}–${PENCERE.max}`);
  for (const a of beklenenAlanlar) if (!system.includes(`"${a}"`)) throw new Error(`şemada alan yok: ${a}`);
  for (const y of ["hasta", "terapist"]) {
    const re = new RegExp(`(?<![\\p{L}'"])${y}(?![\\p{L}'"])`, "iu"); // dil kuralı içindeki tırnaklı anış hariç
    if (re.test(system.replace(/DİL KURALI[\s\S]*?\n\n/u, ""))) throw new Error(`prompt '${y}' sözcüğünü kullanıyor`);
  }
}
```

- [ ] **Step 3: Yeşil + kapılar + commit**

```bash
cd apps/hub && node_modules/.bin/vitest run src/modules/studio/lib/prompts src/lib/prompts && node_modules/.bin/eslint src/modules/studio/lib/prompts src/lib/prompts && npm run typecheck
git add apps/hub/src/lib/prompts apps/hub/src/modules/studio/lib/prompts/iskelet.ts apps/hub/src/modules/studio/lib/prompts/iskelet.test.ts
git commit -m "feat(studio): A1 sistem/kullanıcı prompt iskeleti + ortak kapanış bloğu (etik, dil, rumuz, yasak kalıplar)"
```

**İnceleme sonrası kurallar (uygulanan; 8fe64f8 + 54a3000):** `promptIddialari` yasak sözcüğü tr-TR küçük harfle ve düzeneğin kalıbıyla arar (`hasta(?!ne|lık|lan|\s+ol)`, `terapist(?!lik)`; çekimler ve `TERAPİST`/`konuşma terapisti` yakalanır; `hastane/hastalık/fizyoterapist` ve tırnaklı anışlar geçer; DİL KURALI kesmesi YOK). `RUMUZ_NOTU` yalnız yeni içerik ("verilen ad bir rumuz olabilir; değiştirme/kısaltma/üretme"; ETİK SINIR'ın 3. maddesini tekrarlamaz). `yasakKalipMetni()` gösterim biçimiyle ("gelişimini takip et") + "(çekimli biçimleri dahil)"; `yasakKalipBul` gidiş-dönüşü korunur. Boş/boş-maddeli listeler (`klinikCerceve`, `bicim.butce`, `parametreler`, `hatirlatma`; `ozgulluk`/`ozDenetim` boş madde) kurulumda fırlatır. Dışa aktarım `PROMPT_PENCERESI` (eski `PENCERE`). `ozgulluk` ortak dört kuralı yeniden yazmaz. Ölçülen iskelet yükü ≈552 token → araç 648–1448 token kendi içeriğini getirir; artikülasyon mevcut 1270 token'dan ~150 kırpmalı. Düzenekteki ayrı `RUMUZ_NOTU` (evals/lib/renderStudent.ts, hakem notu) ad çakışması: ileride `HAKEM_RUMUZ_NOTU` (ayrı eval commit'i).

---

## Araç görevleri (4–13) — ortak reçete

Her araç görevi aynı adımları izler; aşağıdaki araç bölümleri yalnız ARACA ÖZGÜ içeriği verir.

1. **Oku:** aracın rota dosyası (mevcut prompt + `buildUserPrompt` + `enrichContent`), eval adaptörü (`apps/hub/evals/tools/studio/<araç>/adapter.ts`: `criteria`, `requestLines`), kontroller (`checks.ts`: hangi alanlar nasıl ölçülüyor), `cases.json` (4 vaka amacı), taban çıktıları `.claude/hillclimb/prompt-yukseltme/studio/<araç>/baseline/out/*.json` (alan uzunlukları → bütçe).
2. **Bütçe:** taban çıktılarının alan başına ortalama uzunluğunu hesapla (cümle/kelime/öğe); `bicim.butce` satırlarını bu ortalamalara göre yaz (toplam ≈ taban, +%20'yi aşmasın). Dizi alanlarında öğe sayısı istekten gelir (örn. `itemCount`), bütçe öğe BAŞINA yazılır.
3. **Sistem prompt'u:** `studioSistemPromptu({...})` ile; JSON şeması bugünkü alan adlarıyla AYNEN (yorumlar Türkçe, alan açıklamaları kısa). `visualPrompt` kuralları (İngilizce, tek nesne/sahne, stil yok) korunur. Pencere 1.200–2.000 token.
4. **Kullanıcı prompt'u:** `studioKullaniciPromptu({ studentBlock: ctx.studentBlock, parametreler, odak, hatirlatma })`; öğrenci yoksa blok boş. Eski `Öğrenci bilgileri:` satırları KALKAR (blok kimliği zaten içerir). `odak` koddan türetilir (aşağıda araç başına formül). Eval adaptörünün `requestLines`'ı istekle çelişmemeli (gerekirse adaptörde yalnız `requestLines` düzeltmesi, ayrı commit).
5. **Test:** `apps/hub/src/app/studio/api/tools/<araç>/prompt.test.ts` — `SYSTEM_PROMPT` ve `buildUserPrompt` dışa aktarılır (rota dosyasından `export const SYSTEM_PROMPT`); `promptIddialari(SYSTEM_PROMPT, [alan adları])`; `buildUserPrompt` örnek gövde + blok ile çağrılır: blok önce, odak satırı doğru hesaplanmış, iki hatırlatma var; öğrencisiz araçta blok yokken "ÖĞRENCİ" başlığı yok.
6. **Kapılar:** `vitest run src/app/studio/api/tools/<araç> src/modules/studio`, eval kapısı (adaptör öz-testi rotayı gerçekten çağırır: alan adları/`enrichContent` bozulmadı), eslint, typecheck. Commit: `feat(studio/<araç>): A1 prompt — <kısa>`.
7. **Ölçüm (orkestratör):** `EVAL_TOOL=studio/<araç> EVAL_VARIANT=v1 ev evals/run.eval.ts` → `pending.json`'daki üretim satırları `eval-model` (`model: sonnet`) ile dağıtılır → yeniden koş → hakem satırları (`opus`) dağıtılır → yeniden koş → `ev evals/summary.eval.ts`. Karar (B6): win ≥ 0,65, sert hata nedene göre gerilemez, çıktı token ≤ taban +%20 → **KABUL ADAYI**. Aksi hâlde uygulayıcıya hakem gerekçeleri (`results.jsonl` `explanation`) + özet satırı verilir, prompt revize edilir (en çok 3 tur; tur dizinleri `EVAL_TAG=r2`, `EVAL_REF=baseline`). Her tur `.claude/hillclimb/prompt-yukseltme/studio/<araç>/_state.json`'a yazılır:

```json
{ "tool": "studio/homework", "turlar": [ { "tur": 1, "commit": "<sha>", "kol": "v1", "degisenBloklar": ["rol", "klinikCerceve", "bicim.butce"], "win": 0.81, "sertHata": "0/4 (taban 0/4)", "tokenOrani": 1.07, "karar": "KABUL ADAYI" } ], "haiku": { "kol": "v2", "win": 0.5, "sertHata": "0/4", "karar": "HAIKU ADAYI" } }
```

8. **Haiku (orkestratör, yalnız kabulde):** `EVAL_TOOL=studio/<araç> EVAL_VARIANT=v2 EVAL_REF=v1 ev evals/run.eval.ts` (üretim `haiku`, hakem `opus`) → özet → `v2` ≥ 0,40 ve sıfır sert hata → **HAIKU ADAYI** (`_state.json.haiku`).
9. Kabul edilmeyen araçta (3 tur sonra) eski prompt geri alınır (`git revert` değil: son tur commit'i üzerinde rota dosyası tabana döndürülür, test kaldırılır) ve `_state.json` nedenini yazar; kullanıcıya raporlanır.

### Task 4: `studio/homework` (ev ödevi)

- **Rol/kitle:** veli okur; uzman verir. Kayıt: sıcak, somut, günlük dil; teknik terim parantezle.
- **Klinik çerçeve:** ev çalışması seans hedefinin GENELLEMESİDİR (aynı beceri, ev rutini içinde); hedef davranış tek ve gözlenebilir; veli "model ol → bekle (5 sn) → genişlet" döngüsünü uygular; hata anında düzeltme değil doğru modeli tekrar; süre bütçesi (10/15/20 dk) adım sayısını belirler; `materialType` türleri: exercise = adımlı etkinlik, observation = ne/ne zaman/nasıl not edilecek gözlem formu (adımlar gözlem maddesidir), daily_activity = var olan rutine (yemek, banyo, yol) iliştirilen fırsatlar.
- **Özgüllük (ek):** `targetArea` her adımda görünür; ilgi alanı/uzman notu malzemeye dönüşür; yetişkin öğrencide muhatap veli değil öğrencinin kendisi/yakını ("veli" deme).
- **Karşıt örnek:** zayıf "Her gün 10 dakika hedef sesi çalışın, sabırlı olun." / iyi "Akşam yemeğinde tabağa 3 kaşık koyun; her kaşıkta 'kaşık' deyin ve 5 saniye bekleyin; çocuk /k/ sesini söylerse aynı sözcüğü bir kez daha söyleyip kaşığı verin."
- **Biçim/bütçe:** alanlar aynen (`title, materialType, duration, targetArea, introduction, materials, steps[{stepNumber,instruction,tip}], watchFor, celebration, frequency, expertNotes, adaptations`). Bütçe tabandan (ör. introduction ≤3 cümle; steps: 10 dk → 3–4, 15 dk → 4–5, 20 dk → 5–6 adım, instruction ≤2 cümle, tip ≤1 cümle; watchFor ≤3 cümle; celebration ≤2; expertNotes ≤3; adaptations 2 madde ≤2 cümle). Taban ort. 2481 token → yeni toplam ≤ 2.980.
- **Öz-denetim:** adımlar süreye sığıyor mu; her adımda hedef alan var mı; veliye öneri kipi mi; ödül/puan/çıkartma yok mu; 'hasta/terapist' yok mu; JSON tek parça mı.
- **Odak satırı:** `Süre ${duration} dk → en çok ${adım} adım; tür ${materialType} → ${türün tek satır tanımı}.`
- **Hatırlatma:** "Veliye öneri kipi ('yapabilirsiniz')." + "Her adım hedef alana ve profildeki bir veriye bağlı."
- **Vakalar:** hw-01 zengin bağlam, hw-02 detaylı veli, hw-03 4 yaş kısa, hw-04 yetişkin (veli yok!).

### Task 5: `studio/session-summary` (oturum özeti)

- **Rol/kitle:** uzman kaydı + veliye kısa not; profesyonel, nesnel.
- **Klinik çerçeve:** veri sadakati — yüzde ve ipucu düzeyi AYNEN kopyalanır, hiçbir sayı/gözlem/ilerleme uydurulmaz; analiz = veriden çıkarım (doğruluk ↔ ipucu düzeyi ilişkisi; önceki oturumla kıyas yalnız bağlamda özet varsa); öneri = ipucu azaltma/zorluk artırma/genelleme basamağı; grup oturumunda bireysel katılım; değerlendirme oturumunda ölçüm odaklı; veli görüşmesinde hedef performansı yoksa alanlar "—".
- **Özgüllük (ek):** `goals[].analysis` ilgili hedefin kendi verisine atıf yapar; `parentNote` teknik terim yok, 3–5 cümle, cesaretlendirici ve somut; `expertNotes` klinik ayrıntı burada.
- **Karşıt örnek:** zayıf "Öğrenci bu oturumda genel olarak iyi performans gösterdi ve gelişim kaydetti." / iyi "/r/ kelime başı %60 doğruluk, sözel ipucuyla; önceki hedefteki %75'in altında — ipucu düzeyi aynı kalsın, kelime listesi 5'e insin."
- **Biçim/bütçe:** alanlar aynen (`title, sessionInfo{date,duration,type,student}, goalPerformance[{goal,accuracy,cueLevel,analysis,recommendation}], overallAssessment, behaviorNotes, nextSessionPlan, parentNote, expertNotes`). Bütçe: analysis ≤2 cümle, recommendation 1 cümle, overallAssessment 2–3, behaviorNotes ≤2, nextSessionPlan ≤3 madde/cümle, parentNote 3–5, expertNotes ≤3. Taban 1297 → ≤ 1.556.
- **Öz-denetim:** her yüzde/ipucu girdiyle aynı mı; uydurma sayı/olay var mı; veli notu terimsiz mi; 'hasta/terapist' yok mu; JSON tek parça mı.
- **Odak:** `${goals.length} hedef, ${duration} dk, ${tür} → analizler yalnız verilen sayılardan.`
- **Hatırlatma:** "Sayıları değiştirme, yeni sayı üretme." + "Veli notu 3–5 cümle, terimsiz."
- Vakalar: ozet-01 zengin, ozet-02 grup, ozet-03 boş bağlam, ozet-04 değerlendirme/ek destek. `sessionInfo.student` RUMUZ + yaş (rumuz bloğundan).

### Task 6: `studio/social-story` (sosyal hikâye)

- **Rol/kitle:** çocuk okur/dinler (uzman ve veli okutur); birinci tekil, sıcak, somut.
- **Klinik çerçeve:** Carol Gray: betimleyici (tanımlayıcı + perspektif + olumlu) : yönlendirici ≥ 2:1; yönlendirici "deneyebilirim/yapabilirim"; her cümle tek fikir; durum → başkalarının duygusu → benim yapabileceğim → olumlu sonuç sırası; yaşa göre cümle uzunluğu (4 yaş ≤7 kelime); kaygı durumlarında duyguyu adlandır ve normalleştir ("bazen… normaldir"); ödül/ceza yok.
- **Özgüllük (ek):** ilgi alanı hikâyeye girer (karakter/nesne); ortam (`environment`) her görsel tanımında; `visualPrompt` sahneyi anlatır (çeviri değil), çocuk-dostu storybook; uzunluk `length` ile.
- **Karşıt örnek:** zayıf "Markette sakin olmalıyım. Sakin olmak iyidir." / iyi "Markette bazen çok ses olur. Kulaklarımı kapatmak isteyebilirim; bu normaldir. Annemin elini tutup 'Çok ses var' diyebilirim."
- **Biçim/bütçe:** alanlar aynen (`title, sentences[{type,text,visualPrompt}], expertNotes, homeGuidance`); `type` ∈ descriptive|perspective|directive|affirmative; cümle sayısı `length`'ten (short 3–5, medium 6–10, long 11–15) AYNEN; visualPrompt ≤20 kelime; expertNotes ≤4 cümle; homeGuidance ≤3. Taban 1322 → ≤ 1.586.
- **Öz-denetim:** betimleyici ≥ 2× yönlendirici mi; birinci tekil mi; cümle sayısı aralıkta mı; her visualPrompt dolu ve sahne mi; ödül/ceza yok mu; JSON tek parça mı.
- **Odak:** `${LENGTH} → ${aralık} cümle; ortam ${environment} → her görselde bu ortam.`
- **Hatırlatma:** "Yönlendiriciler 'deneyebilirim/yapabilirim'." + "visualPrompt çeviri değil sahne."
- Not: ss-04 (hastane) taban sert hatası "hasta tarafı": yeni prompt rol oyununda "hasta" sözcüğünden kaçınmayı söylemez (dil kuralı zaten var); hakem kıyasında gerilemez.

### Task 7: `studio/weekly-plan` (haftalık plan)

- **Rol/kitle:** uzman ders sırasında göz atar; yalın, tek cümlelik alanlar (2026-09 yalın şema KORUNUR).
- **Klinik çerçeve:** progresyon: ders N+1, ders N'in üzerine kurulur (ipucu azaltma → bağımsız → genelleme); aynı etkinlik iki kez yok; `focusAreas` dönüşümlü; son oturum özetindeki "sonraki plan" ilk derse; tamamlanan hedefler atlanır, süren hedefler `targetGoals`'a; modüller `targetGoals` dilinde; ısınma/ana/kapanış süreleri ders süresini tam doldurur (ör. 40 dk → 5/30/5).
- **Özgüllük (ek):** `studentSummary` bloğun özeti (uydurma yok); `materialsNeeded` ≤6 ve derslerdekilerin birleşimi; `parentCommunication` velinin bu hafta evde yapacağı tek şey.
- **Karşıt örnek:** zayıf "Ana çalışma: hedef sesle kelime çalışması, çeşitli materyallerle." / iyi "Ana çalışma: /s/ kelime başı 10 kart; ilk 5'te uzman modeli, son 5'te bağımsız; ‘sandal’ gibi dinozor temalı kartlarla (ilgi alanı)."
- **Biçim/bütçe:** alanlar aynen (`title, studentSummary, days[{focusArea,objective,warmup{activity,duration,materials},mainWork{activity,duration,steps,materials,targetGoals},closing{activity,duration},notes}], weeklyGoal, materialsNeeded, parentCommunication, expertNotes, nextWeekSuggestion`); yalın şema kuralları aynen (tek cümle, ≤3 adım, ≤3 materyal, ≤2 hedef, notes null); "gün adı/tarih/süre YAZMA, sunucu ekler"; days tam `${dersSayısı}` öğe. Taban 2399 (3–12 ders karışık) → ders başına bütçe: taban `out/` dosyalarından ders başına ortalama ölçülür ve "ders başına ≤ N kelime" yazılır.
- **Öz-denetim:** days öğe sayısı doğru mu; süreler toplamı ders süresi mi; aynı etkinlik tekrar mı; son özet/son kartlar ilk derste kullanıldı mı; ödül yok mu; JSON tek parça mı.
- **Odak:** `${n} ders × ${süre} dk → days tam ${n} öğe; her derste 2 hedef, ≤3 adım.`
- **Hatırlatma:** "Gün/tarih/süre yazma." + "Her ders öncekinin üzerine kurulur; tekrar yok."
- Task 2'de kaldırılan sorgular yerine blok: `Son çalışmalar`, `Son oturum`, `Modüller`, `Tamamlanan/Sürmekte olan hedefler` blokta gelir — prompt bunlara adıyla atıf yapar.

### Task 8: `studio/comm-board` (iletişim panosu)

- **Rol/kitle:** AAC panosu; uzman/veli basar, öğrenci işaret eder.
- **Klinik çerçeve:** çekirdek sözcük dengesi (istiyorum/daha/bitti/yardım/hayır/evet gibi yüksek sıklıklı sözcükler + pano türüne özgü kenar sözcükler); iletişim işlevleri: istek, ret, yorum, selam, soru; Fitzgerald rengi `category`'den: noun=yellow, verb=green, adjective=blue, social=pink, question=orange, other=white (tutarlı); `textMode` cümle ise model cümle öğrencinin düzeyinde (2–3 sözcük); `usage` nasıl modellenecek (uzman önce işaret eder, bekler); tam `symbolCount` hücre; yaş: yetişkinde çocuksu simge yok.
- **Özgüllük (ek):** öğrencinin ilgi alanı/rutini hücre seçimine yansır (ör. tren → "tren" hücresi daily_routines'ta değil requests'te); `custom` türünde `customCategory` hücrelerin tamamını belirler.
- **Karşıt örnek:** zayıf "Hücre: 'Mutlu' — visualPrompt: 'a happy child playing'." / iyi "Hücre: 'Daha' (verb, green) — visualPrompt: 'a hand gesturing more, open palm'; cümle: 'Daha istiyorum'; kullanım: uzman kurabiye kutusunu kapatır, 'daha' hücresine bakar ve 5 saniye bekler."
- **Biçim/bütçe:** alanlar aynen (`title, boardType, layout, rows, cols, cells[{position,word,sentence,category,fitzgeraldColor,visualDescription,visualPrompt,usage}], instructions, expertNotes, homeGuidance, adaptations`); cells tam N; word 1–2 sözcük; sentence ≤4 sözcük; visualDescription 1 cümle; visualPrompt ≤10 kelime tek simge; usage 1 cümle; instructions ≤4 cümle; expertNotes ≤3; homeGuidance ≤3; adaptations 2 madde. Taban 2209 → ≤ 2.650.
- **Öz-denetim:** hücre sayısı tam mı; her hücrede renk ↔ kategori eşleşiyor mu; en az 2 çekirdek sözcük var mı; her visualPrompt tek nesne/simge mi; yaşa uygun mu; JSON tek parça mı.
- **Odak:** `${symbolCount} hücre (${rows}×${cols}), ${textMode}, renk ${colorCoding ? "açık" : "kapalı"} → ${tür}: ${türün işlev odağı}.`
- **Hatırlatma:** "Tam N hücre." + "Renk kategoriyi izler."

### Task 9: `studio/matching-game` (eşleştirme)

- **Rol/kitle:** uzman basar; dil aracı (artikülasyon değil).
- **Klinik çerçeve:** her çift TEK ve kesin eşleşme (başka kartla eşleşebilen çift yok; kategori türünde aynı kategoriye 2+ kelime meşru ama cardB'ler farklı kategori); zorluk tanımı (kolay: sık/somut; orta: daha az sık/bazı soyut; zor: soyut/çok anlamlı/deyim); tema tüm çiftlerde; yaş: sözcük sıklığı; tür kuralları (definition 1 cümle tanım; image_desc görsel tarif; synonym/antonym gerçek çift; category kelime→kategori; sentence boşluklu cümle→kelime); görsel: ya TÜM çiftlerde ya HİÇBİRİNDE (image_desc ve somut category'de var; synonym/antonym/definition/sentence'ta yok).
- **Özgüllük (ek):** `goalTitle` verildiyse kelimeler o hedefe hizalı; öğrenci varsa ilgi alanı temaya girer (tema yoksa).
- **Karşıt örnek:** zayıf "cardA: 'Büyük' — cardB: 'Küçük değil'." / iyi "cardA: 'Büyük' — cardB: 'Küçük' (antonym); ipucu yok (kolay)."
- **Biçim/bütçe:** alanlar aynen (`title, matchType, difficulty, pairs[{id,cardA,cardB,hint,visualPrompt}], instructions, expertNotes, adaptations`); pairs tam `pairCount`; cardB ≤12 kelime; hint ≤8 kelime yalnız zor; instructions ≤3 cümle; expertNotes ≤3; adaptations 2 madde. Taban 1103 → ≤ 1.324.
- **Öz-denetim:** çift sayısı tam mı; her çift tek eşleşme mi; görsel ya hepsinde ya hiçbirinde mi; zorluk sözcük sıklığıyla uyumlu mu; JSON tek parça mı.
- **Odak:** `${pairCount} çift, ${tür}, ${zorluk} → görsel: ${türe göre "her çiftte" | "hiçbir çiftte"}.`
- **Hatırlatma:** "Tek ve kesin eşleşme." + "Görsel tutarlılığı."

### Task 10: `studio/phonation` (sesletim)

- **Rol/kitle:** uzman basar, çocuk oynar.
- **Klinik çerçeve:** 4 oyun türünün yapı kuralları AYNEN (sound_hunt: scene+objects, grid boş; bingo: itemCount→3×3/4×4/5×5, hepsi hedefli; snakes_ladders: itemCount kare, rows=itemCount/5, cols=5, bazı isLadder/isSnake; sound_maze: doğru yol hedefli, yanlış yollar hedefsiz, girişten çıkışa yol var); `hasTargetSound` etiketi kelimeyle tutarlı; BANKA notu: kelimeler istekte "bankadan" verildiyse yalnız onlar kullanılır, sıralama/yerleşim modelin işi; yaş: kelime sıklığı; ödül yok (oyunun kendisi motivasyon).
- **Özgüllük (ek):** tema verildiyse sahne/kelimeler temadan; öğrenci varsa ilgi alanı tema olmadan da sahneye girer.
- **Karşıt örnek:** zayıf "Oyun eğlenceli olsun, çocuk motive olsun; kelimeler: su, süt, sarı, güneş." / iyi "Tombala 3×3: sandal, sepet, salıncak, simit, sabun, saat, süt, soba, sincap — hepsi /s/ başta; çocuk okunan kelimeyi bulup üstüne mavi pul koyar."
- **Biçim/bütçe:** alanlar aynen (`title, activityType, targetSounds, difficulty, theme, grid{rows,cols,cells[{position,word,hasTargetSound,isLadder,isSnake,instruction,visualPrompt}]}, scene, objects[{name,hasTargetSound,description,visualPrompt}], instructions, expertNotes, adaptations`); hücre/nesne sayıları `itemCount`'tan; instruction ≤1 cümle; description ≤8 kelime; instructions ≤4 cümle; expertNotes ≤3; adaptations 2 madde. Taban 1677 → ≤ 2.012.
- **Öz-denetim:** tür kuralı (hangi alan dolu/boş) mı; öğe sayısı tam mı; etiketler kelimeyle tutarlı mı; banka verildiyse sadece banka kelimeleri mi; JSON tek parça mı.
- **Odak:** `${tür}: ${itemCount} öğe → ${türe göre doldurulacak alan/ızgara ölçüsü}; hedef ${targetSounds}.`
- **Hatırlatma:** "Banka kelimeleri verildiyse başka kelime yok." + "Tür kuralına göre scene/grid/objects."
- Banka istek bloğu (`__bank`) rotadaki mevcut mekanizmayla aynen kullanıcı prompt'una girer (`parametreler`'den sonra ayrı bölüm).

### Task 11: `studio/articulation` (artikülasyon)

- **Rol/kitle:** uzman basar/uygular; veli rehberi.
- **Klinik çerçeve:** hiyerarşi izole → hece → kelime → cümle → bağlam; hedef ses pozisyonda (başta/ortada/sonda) ve HARF kelimede var; hece türü (açık ünlüyle, kapalı ünsüzle biter); seviye başına `items[]` biçimi AYNEN (isolated: tekrar deseni; syllable: hece + syllableType + exampleWord; word/sentence/contextual: kelime + syllableBreak + sentence); BANKA: kelimeler istekte verildiyse YALNIZ onlar (sıra korunur, cümleler modelin); `cueTypes` sese özgü (ör. /s/ dil ucu alt dişlerin arkasında, hava akışı; /r/ dil ucu titreşimi; /k/ dil arkası yükselmesi — 3 ipucu türü: görsel/dokunsal/işitsel); `expertNotes` ses + seviye + tanıya özgü, "her vakaya yapıştırılabilir" cümle yok; `homeGuidance` veliye somut rutin, ödül yok; yaş: kelime sıklığı.
- **Özgüllük (ek):** öğrenci varsa ilgi alanı cümlelere/bağlam paragrafına girer; öğrenci yoksa genel çocuk materyali.
- **Karşıt örnek:** zayıf "Uzman notu: Düzenli tekrar önemlidir; sabırlı olun, motivasyonu yüksek tutun." / iyi "Uzman notu: /ş/ kelime başında dudaklar hafif yuvarlak, dil ucu geride; ayna karşısında 'şapka'yı önce uzatarak 'şşşapka' söyletin, 5 doğru üretimden sonra uzatmayı kaldırın."
- **Biçim/bütçe:** alanlar aynen (`title, targetSounds, positions, level, items[...], expertNotes, cueTypes, homeGuidance`); items tam `itemCount`; sentence ≤10 kelime (contextual paragraf 3–4 cümle); expertNotes ≤4 cümle; cueTypes 3 madde; homeGuidance ≤3 cümle. Taban: `baseline/ref/art-*` çıktı uzunluğundan hesaplanır (chars/3,2 ort.) → +%20.
- **Öz-denetim:** her item hedef harfi/pozisyonu taşıyor mu; banka verildiyse yalnız banka mı; `word` alanı her seviyede dolu mu; visualPrompt somut nesnede dolu, soyutta boş mu; uzman notu sese özgü mü; JSON tek parça mı.
- **Odak:** `${seviye}, ${itemCount} öğe, pozisyon ${positions} → ${seviyeye göre items biçimi tek satır}; banka: ${varsa "verildi, yalnız bu kelimeler" | "yok"}.`
- **Hatırlatma:** "Hedef harf her kelimede." + "Uzman notu bu sese ve seviyeye özgü."
- **Önemli:** bağlam (contextual) örneğinde KİŞİ ADI KULLANMA (eski prompt "Selin…" içeriyordu; `evals/lib/piiMask.ts` o parçayı maskeliyordu). Yeni prompt adsız örnek verir; `piiMask.ts`'teki artikülasyon sabit parçası ve ilgili test KALDIRILIR (aynı commit, `fix(evals)` yerine bu görevin commit'inde — gerekçe commit mesajında). `articulationContextual.test.ts` ve `weeklyPlanLean.test.ts` yeşil kalmalı.

### Task 12: `studio/cards` (öğrenme kartı, tool_use)

- **Rol/kitle:** uzman; `emit_card` aracı (`CARD_TOOL` şeması DEĞİŞMEZ).
- **Klinik çerçeve:** kategori tanımları (speech/language/hearing) aynen; zorluk = aşama (başlangıç: izole hedef + modelleme; gelişim: yarı yapılandırılmış; pekiştirme: doğal ortam/öz-izleme); yaş grubu kuralları (okul öncesi oyun/kısa/somut; ilkokul kural tabanlı oyun/keşif; ergen kimliğe saygılı, ilgi alanına bağlı; yetişkin gerçek yaşam, profesyonel ton); `progressIndicators` ölçülebilir ve karta özgü (sayı/ölçüt/koşul); `exercises[].repetitions` sayıyla; `homeExercise` veliye/yetişkinde kendine; tamamlanan hedefler yeniden hedeflenmez, son kartların bir sonraki aşaması.
- **Özgüllük (ek):** `focusArea` her egzersizde görünür; müfredat hedefi verildiyse `objective` ona DOĞRUDAN hizmet eder.
- **Karşıt örnek:** zayıf "İlerleme göstergesi: Öğrenci hedef sesi daha iyi üretir." / iyi "İlerleme göstergesi: 10 kelimelik listede /r/ kelime başı en az 8/10 doğru, sözel ipucusuz, iki ardışık seansta."
- **Biçim/bütçe:** `CARD_SYSTEM_PROMPT` yeni iskelette (biçim bölümü: "`emit_card` aracını kullan; araç dışında metin yazma" + alan bütçeleri: objective 1–2 cümle; materials ≤6; instructions 4–8 adım, adım ≤2 cümle; exercises 2–4, description ≤3 cümle; therapistNotes ≤4 cümle; progressIndicators 3–5; homeExercise ≤3 cümle). Taban 2104 → ≤ 2.525. `buildCardPrompt` → `studioKullaniciPromptu` (parametreler: kategori/zorluk/yaş/odak/müfredat; odak satırı: `${zorluk} aşaması + ${yaş grubu} → ${aşama kuralı tek satır}`; hatırlatma: "Göstergeler sayı/ölçüt/koşul içerir." + "Tamamlanan hedefleri yeniden hedefleme.").
- **Öz-denetim:** egzersizler odak alanına hizalı mı; göstergeler ölçülebilir mi; yaş kuralı tutuyor mu; 'hasta/terapist' yok mu (taban sert hatası buradaydı: 'uzman' de); alanlar şemaya uygun mu.
- Test dosyası: `apps/hub/src/modules/studio/lib/prompts/card.prompt.test.ts` (`CARD_SYSTEM_PROMPT` pencere; `buildCardPrompt` blok sırası; "terapist" yok).

### Task 13: `studio/ai-profile` (AI profili, Markdown)

- **Rol/kitle:** uzman; Markdown şablonu — BAŞLIKLAR SÖZLEŞMEDİR: `## Kavramsal Arka Plan` / `### Tanının Klinik Açıklaması` / `### Bu Yaş Grubunda Beklenen Gelişim` / `### Müfredat Modülleriyle İlişki` / `---` / `## Uzmana Öneriler` / `### Öncelikli Çalışma Alanları` / `### Etkili Yaklaşım ve Teknikler` / `### Dikkat Edilmesi Gereken Noktalar` / `### Aile ile Paylaşılabilecek Öneriler` (bağlam katmanı `PROFIL_BOLUMLERI` ile ayrıştırır; UI aynı başlıkları gösterir). Şablon yönlendirme metinleri "Terapist için…" → "Uzman için…" (taban `dil_kurali` sert hatasının kaynağı; prompt bulgusu).
- **Klinik çerçeve:** tanı açıklaması güncel ve verilen tanıyla sınırlı (verilmeyen tanı/modül/öykü uydurma yok); yaş grubu beklentileri normatif; yetişkinde çocuk gelişimi varsayımı yok, "aile" yerine eş/yakın; öncelikli alanlar 3–5 madde ve ölçülebilir; teknikler kanıt temelli ve bu profile uyarlı (uzman notundaki somut veri öneriye dönüşür); aile önerileri evde yapılabilir.
- **Özgüllük (ek):** bloktaki son çalışmalar/hedefler "Müfredat Modülleriyle İlişki" ve "Öncelikli Çalışma Alanları"na girer; `aiProfile` blokta yoktur (döngü).
- **Karşıt örnek:** zayıf "Öncelikli alan: dil gelişimini desteklemek." / iyi "Öncelikli alan: iki sözcüklü istekleri ('su ver') üç sözcüğe ('bana su ver') genişletme — uzman notundaki mevcut iki sözcüklü cümle temel alınır."
- **Biçim/bütçe:** Markdown; bölüm başına 3–5 cümle ya da 3–5 madde (taban 2292 → ≤ 2.750; bölüm bütçeleri şablonda köşeli parantezle yazılır: `[3–5 cümle]`, `[3–5 madde, her madde ölçülebilir]`).
- **Öz-denetim:** 10 başlık aynen var mı; verilmeyen tanı/modül eklenmedi mi; yetişkinde aile→yakın mı; 'terapist/hasta' yok mu; madde/cümle bütçesi tutuyor mu.
- **Kullanıcı prompt'u:** `studioKullaniciPromptu({ studentBlock, parametreler: [modüller zaten blokta; "Profil üret"], odak: "Yaş ${yaş}, ${alan} → yaş grubu beklentileri bu yaşa göre.", hatirlatma: ["Başlıkları değiştirme.", "Uydurma yok."] })`.
- Test: `apps/hub/src/modules/studio/lib/generateProfile.prompt.test.ts` (`PROFILE_SYSTEM_PROMPT` dışa aktarılır; pencere; 10 başlık var; "Terapist" yok; `PROFIL_BOLUMLERI` başlıkları şablonda birebir).

---

### Task 14: Faz 2 kapanışı — özet, durum, README, bellek

**Files:**
- Modify: `apps/hub/evals/README.md` (Faz 2 sonuç notu)
- Orkestratör: `.claude/hillclimb/prompt-yukseltme/studio/*/_state.json`, `ozet.md`

- [ ] **Step 1:** `ev evals/summary.eval.ts` → 10 Studio aracı için `v1` (ve varsa `v2`) satırları; her aracın `_state.json`'u tam.
- [ ] **Step 2:** README'ye "Faz 2 (2026-10)" bölümü: araç başına tur sayısı, win, sert hata, token oranı, karar (KABUL ADAYI / reddedildi+neden), Haiku adayları; kabul edilmeyen araçlarda eski prompt'un kaldığı; v1 koşusunun ölçtüğü şey (Sonnet 5.5 proxy; mutlak iddia yok); eval-model yükü.
- [ ] **Step 3:** Plan "İnceleme sonrası kurallar" paragrafları güncel; commit `docs(evals,plan): Faz 2 sonuçları — Studio prompt'ları`; etiket `eval-faz2-studio-2026-10` (push YOK).
- [ ] **Step 4:** Bellek: Faz 2 BİTTİ, aday listesi, Faz 3 (Atölye) sırada; canlıya alma konuşması bekliyor.

---

## Öz-denetim (plan)

- Spec kapsamı: A1 (iskelet Task 3; her araç 4–13), A2 (Task 1–2; alanlar/sınırlar birebir; haftalık plan + kart tek kaynak; profil `exclude`), A3 (bütçe araç başına yazıldı; +%20 kuralı orkestratör adımı 7), A4 (alan adları/CARD_TOOL/istemci değişmez — her araç bölümü), B3/B6 (adım 7–8), B7 Faz 2 teslimatı (kabul edilen prompt'lar + aday listesi, Task 14).
- Yer tutucu yok: kod adımları tam (Task 1–3); araç görevleri içeriği yapısal olarak tam verir (rol, çerçeve, özgüllük, karşıt örnek, alanlar+bütçe, öz-denetim, odak, hatırlatma); nesir uygulayıcı tarafından iskeletle kurulur, ölçümü eval yapar.
- Tip tutarlılığı: `ToolPromptContext.studentBlock: string` (Task 2) ↔ `studioKullaniciPromptu({ studentBlock })` (Task 3) ↔ araç görevleri; `PROFIL_BOLUMLERI` (Task 1) ↔ Task 13 şablon başlıkları; `loadStudentContext(prisma, {studentId, therapistId, nameMap, exclude?})` (Task 1) ↔ Task 2 çağrıları.
