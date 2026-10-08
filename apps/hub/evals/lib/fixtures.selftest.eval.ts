// apps/hub/evals/lib/fixtures.selftest.eval.ts
import { pickAlias } from "@ludenlab/ai";
import { KADEME_KEYS } from "@atolye/lib/bep";
import { mebBolum } from "@atolye/lib/meb-program";
import { GUCLUK_DUZEYI_KEYS, TANI_KEYS } from "@atolye/lib/ogrenci-profili";
import { describe, expect, it } from "vitest";
import { HarnessError, type AtolyeFixture, type Fixture, type StudioFixture } from "./core";
import { als, type CaseStore } from "./evalContext";
import { atolyeFixtures, realFirstName, resolveFixture, studioFixtures } from "./fixtures";
import { studioPrismaMock } from "./mocks/studio";
import { adIzi } from "./sharedChecks";

/* Fikstürler sentetik ama üretim verisinin biçimini taşımalı: yanlış enum, bozuk tarih ya da yer tutucu
   ("...") prompt'a sessizce girer ve vaka sonucu fikstür hatasını ölçer. */

const studio = studioFixtures();
const atolye = atolyeFixtures();
const hepsi: Fixture[] = [...Object.values(studio), ...Object.values(atolye)];

/** prisma/studio/schema.prisma `enum ToolType` ile aynı. */
const TOOL_TYPES = [
  "LEARNING_CARD",
  "SOCIAL_STORY",
  "ARTICULATION_DRILL",
  "HOMEWORK_MATERIAL",
  "WEEKLY_PLAN",
  "SESSION_SUMMARY",
  "MATCHING_GAME",
  "PHONATION_ACTIVITY",
  "COMMUNICATION_BOARD",
];
const WORK_AREAS = ["speech", "language", "hearing"];
const PERFORMANS = ["above_target", "on_target", "progressing", "needs_support", "not_assessed"];

/** Taklitlerin ve üretimin rumuz kapsamı: oturumdaki uzman kimliği (studioAuthMock / atolyeAuthMock). */
const RUMUZ_KAPSAMI = "eval-uzman";

/** Gerçek adın serbest metinde geçmesi gereken (zengin) ve hiç geçmemesi gereken (boş bağlam) fikstürler. */
const ZENGIN = ["stu-ela", "case-arda"];
const BOS = ["stu-kerem", "case-mina"];

const TARIH = /^\d{4}-\d{2}-\d{2}$/;
const ZAMAN = /^\d{4}-\d{2}-\d{2}T12:00:00$/;

function fixtureById(id: string): Fixture {
  const f = studio[id] ?? atolye[id];
  if (!f) throw new Error(`fikstür yok: ${id}`);
  return f;
}

/** Ad/kimlik DIŞINDAKİ tüm serbest metinler — üretimde gerçek adın gerçekten geçtiği yerler. */
function serbestMetinler(f: Fixture): string[] {
  const out: string[] = [];
  const topla = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(topla);
    else if (v && typeof v === "object") Object.values(v).forEach(topla);
  };
  for (const [k, v] of Object.entries(f)) if (!["id", "name", "code"].includes(k)) topla(v);
  return out;
}

function tarihler(f: Fixture): string[] {
  if ("workArea" in f) return [...f.recentCards.map((c) => c.createdAt), ...(f.lastSummary ? [f.lastSummary.createdAt] : [])];
  return f.documents.map((d) => d.createdAt);
}

const trLower = (s: string) => s.toLocaleLowerCase("tr-TR");

describe("fikstürler", () => {
  it("anahtar = id; bilinmeyen kimlik yapılandırma hatası", () => {
    for (const [k, v] of Object.entries({ ...studio, ...atolye })) expect(k).toBe(v.id);
    let hata: unknown;
    try {
      resolveFixture("studio", "yok");
    } catch (e) {
      hata = e;
    }
    expect(hata).toBeInstanceOf(HarnessError);
    expect(hata).toMatchObject({ failureClass: "config", message: "Bilinmeyen fikstür: studio/yok" });
    expect(resolveFixture("studio", null)).toBeNull();
  });

  it("tarihler çözülür; createdAt saat dilimi güvenli (öğlen), doğum tarihi düz", () => {
    for (const f of hepsi) {
      for (const t of tarihler(f)) {
        expect(t).toMatch(ZAMAN);
        expect(Number.isNaN(new Date(t).getTime())).toBe(false);
      }
      if ("birthDate" in f) {
        expect(f.birthDate).toMatch(TARIH);
        expect(Number.isNaN(new Date(f.birthDate).getTime())).toBe(false);
      }
    }
  });

  it("enum alanları gerçek değer kümelerinde", () => {
    for (const f of Object.values(studio) as StudioFixture[]) {
      expect(WORK_AREAS).toContain(f.workArea);
      for (const c of f.recentCards) expect(TOOL_TYPES).toContain(c.toolType);
      if (f.lastSummary) expect(PERFORMANS).toContain(f.lastSummary.overallPerformance);
    }
    for (const f of Object.values(atolye) as AtolyeFixture[]) {
      expect(KADEME_KEYS).toContain(f.kademe);
      for (const t of f.taniProfili) expect(TANI_KEYS).toContain(t);
      if (f.guclukDuzeyi) expect(GUCLUK_DUZEYI_KEYS).toContain(f.guclukDuzeyi);
      for (const kod of f.mebBolumler) expect(mebBolum(kod), `MEB bölümü ${kod}`).toBeDefined();
    }
  });

  it("yer tutucu yok", () => {
    for (const f of hepsi) for (const s of serbestMetinler(f)) expect(s).not.toMatch(/\.\.\.|…/);
  });

  it("zengin fikstürde gerçek ad serbest metinde (tuzak teli sınanır); boş bağlamlıda hiç yok", () => {
    for (const id of ZENGIN) {
      const f = fixtureById(id);
      expect(serbestMetinler(f).some((s) => adIzi(s, realFirstName(f))), id).toBe(true);
    }
    for (const id of BOS) {
      const f = fixtureById(id);
      expect(serbestMetinler(f).filter((s) => adIzi(s, realFirstName(f))), id).toEqual([]);
    }

    // Üretimde ad bu alanların her birinde ve her biçimde (kesmeli, kesmesiz, büyük harf) geçebilir.
    const ela = studio["stu-ela"]!;
    expect(ela.notes).toMatch(/\bEla\b/);
    expect(ela.aiProfile).toContain("Ela'nın");
    expect(ela.aiProfile).toContain("Elanın");
    expect(ela.recentCards.some((c) => c.title.startsWith("Ela için"))).toBe(true);
    expect(ela.lastSummary?.overallAssessment).toContain("ELA");
    const arda = atolye["case-arda"]!;
    expect(arda.documents[0]?.content).toContain("Arda'nın");
  });

  it("son kartlar yeniden eskiye", () => {
    for (const f of Object.values(studio)) {
      const t = f.recentCards.map((c) => new Date(c.createdAt).getTime());
      for (let i = 1; i < t.length; i++) expect(t[i - 1]!).toBeGreaterThanOrEqual(t[i]!);
    }
  });

  it("rumuzlar hiçbir fikstürün gerçek adıyla çakışmaz", () => {
    const adlar = new Set(hepsi.map((f) => trLower(realFirstName(f))));
    for (const f of hepsi) {
      const alias = pickAlias("name" in f ? f.name : f.code, { scope: RUMUZ_KAPSAMI });
      expect(adlar.has(trLower(alias)), `${f.id} → ${alias}`).toBe(false);
    }
  });

  it("realFirstName fazla boşluğa dayanıklı", () => {
    expect(realFirstName({ ...studio["stu-ela"]!, name: "  Ela   Şahin " })).toBe("Ela");
    expect(realFirstName(null)).toBe("");
  });
});

describe("Studio taklidi fikstürü üretim sorgularıyla okur", () => {
  function store(fixture: Fixture): CaseStore {
    return { caseId: "fx", rep: 0, fixture, exchangeDir: "", calls: [], pending: [], apiError: null, saved: null, refunded: false, deadline: Date.now() + 60_000, retries: { count: 0 } };
  }
  const ela = studio["stu-ela"]!;

  it("weekly-plan: müfredat kimliği → başlık, kartlar yeniden eskiye + take + select, son özet kayıt anahtarlarıyla", async () => {
    const db = studioPrismaMock();
    await als.run(store(ela), async () => {
      const row = await db.student.findUnique({ where: { id: ela.id }, select: { curriculumIds: true } });
      expect(row).toEqual({ curriculumIds: ["eval-cur-0"] });
      expect(await db.curriculum.findMany({ where: { id: { in: row!.curriculumIds! } } })).toEqual([{ title: "Pragmatik dil" }]);
      expect(await db.curriculum.findMany({ where: { id: { in: [] } } })).toEqual([]);

      const kartlar = await db.card.findMany({ take: 3, select: { title: true, toolType: true, createdAt: true } });
      expect(kartlar).toHaveLength(3);
      expect(kartlar.map((k) => k.title)).toEqual(ela.recentCards.slice(0, 3).map((c) => c.title));
      expect(Object.keys(kartlar[0]!).sort()).toEqual(["createdAt", "title", "toolType"]);

      const ozet = await db.card.findFirst();
      expect(ozet?.content).toEqual({
        overallAssessment: ela.lastSummary!.overallAssessment,
        nextSessionPlan: ela.lastSummary!.nextSessionPlan,
        overallPerformance: "progressing",
        behaviorNotes: ela.lastSummary!.behaviorNotes,
      });
    });
  });

  it("select yoksa tam satır; başka öğrenci kimliği null", async () => {
    const db = studioPrismaMock();
    await als.run(store(ela), async () => {
      const row = await db.student.findFirst({ where: { id: ela.id } });
      expect(row).toMatchObject({ name: ela.name, notes: ela.notes, curriculumIds: ["eval-cur-0"], llmAlias: null });
      expect(await db.student.findFirst({ where: { id: "baska" } })).toBeNull();
    });
  });
});
