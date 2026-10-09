// apps/hub/evals/tools/studio/session-summary/adapter.selftest.eval.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CaseDef, StudioFixture } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { adapter } from "./adapter";
import type { SessionSummaryBody } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<SessionSummaryBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const body: SessionSummaryBody = {
  sessionDate: "2026-10-05", duration: "40", sessionType: "individual", overallPerformance: "progressing",
  goals: [{ goalId: "g1", goalTitle: "Üç kelimeli istek", accuracy: 60, cueLevel: "Minimum İpucu" }, { goalId: "g2", goalTitle: "Sıra alma", accuracy: 80, cueLevel: "Bağımsız" }],
};
const ref = {
  title: "Oturum Özeti — Hazal — 5 Ekim 2026", sessionInfo: { date: "5 Ekim 2026", duration: "40 dakika", type: "Bireysel Oturum", student: "Hazal, 6 yaşında" },
  goalPerformance: [
    { goal: "Üç kelimeli istek", accuracy: "%60", cueLevel: "Minimum İpucu", analysis: "Model olmadan iki cümle kurdu.", recommendation: "Oyun içinde sürdür." },
    { goal: "Sıra alma", accuracy: "%80", cueLevel: "Bağımsız", analysis: "Sırasını bekledi.", recommendation: "Yeni oyunla dene." },
  ],
  overallAssessment: "Oturum verimli geçti.", behaviorNotes: "İlk dakikalarda sessizdi.", nextSessionPlan: "Geçiş kartını kullan.",
  parentNote: "Bugün iyi geçti. Evde oyun oynayabilirsiniz. Küçük adımlar yeterli.", expertNotes: "Kulak kapatma gözlendi.",
};
type Ref = typeof ref;

describe("oturum özeti adaptörü", () => {
  it("4 vaka, fikstürler çözülür; ipucu düzeyleri arayüzün seçeneklerinden; 4 ortak + 2 araç ölçütü", () => {
    expect(cases.map((c) => c.id)).toEqual(["ozet-01", "ozet-02", "ozet-03", "ozet-04"]);
    for (const c of cases) expect(resolveFixture("studio", c.student)?.id ?? null).toBe(c.student);
    const UI = new Set(["Bağımsız", "Minimum İpucu", "Orta İpucu", "Maksimum İpucu", "Tam Destek"]);
    for (const c of cases) for (const g of c.body.goals) expect(UI.has(g.cueLevel), `${c.id} ${g.cueLevel}`).toBe(true);
    expect(vaka("ozet-03").body.goals[0]).toMatchObject({ accuracy: 0, cueLevel: "Tam Destek" });
    expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(["veri_sadakati", "veli_ozeti"]);
    expect(adapter.criteria.find((c) => c.key === "veli_ozeti")!.question).toContain("klinik ayrıntı veli notuna değil uzman notlarına mı yazılmış");
  });

  it("hakem görevi: route'taki tür/performans etiketleri ve girilen veri satırları", () => {
    const c = vaka("ozet-01");
    const t = adapter.renderTask(c, resolveFixture("studio", c.student) as StudioFixture);
    expect(t).toContain("Tür: Bireysel Oturum · Genel performans: Gelişim Gösteriyor");
    expect(t).toContain("1. Üç kelimeli istek cümlesi — %60, ipucu: Minimum İpucu");
    expect(t).toContain("2. Sıra alma (dinozor oyunu) — %80, ipucu: Bağımsız");
    expect(t).toContain("- Davranış gözlemi: Bekleme salonundan sonra");
  });

  it("iyi çıktı: sert hata yok, talimat 1, rumuz sızıntısı yok", () => {
    const r = adapter.checks({ body, output: ref, rawText: JSON.stringify(ref), alias: "Selin" });
    expect(r.hard_fail).toEqual([]);
    expect(r.scores).toMatchObject({ talimat: 1, veri_sadakati: 1, uydurma_yuzde: 1, oturum_bilgisi: 1, dil_kurali: 1, rumuz_yok: 1 });
  });

  describe("jenerik aday", () => {
    it("≥ 4 yasak kalıp taşır, hakeme referanstan farklı görünür; girilen veri korunur", () => {
      const before = JSON.stringify(ref);
      const g = adapter.genericCandidate(ref) as Ref;
      expect(JSON.stringify(ref)).toBe(before); // referans değişmez (derin kopya)
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(ref));
      expect(g.goalPerformance.map((p) => [p.goal, p.accuracy, p.cueLevel])).toEqual(ref.goalPerformance.map((p) => [p.goal, p.accuracy, p.cueLevel]));
      expect(g.sessionInfo).toEqual(ref.sessionInfo);
      expect(g.title).toBe(ref.title);
    });
    it("nextSessionPlan, behaviorNotes ve tüm yorum alanlarını değiştirir", () => {
      const g = adapter.genericCandidate(ref) as Ref;
      for (const k of ["nextSessionPlan", "behaviorNotes", "overallAssessment", "parentNote", "expertNotes"] as const) expect(g[k], k).not.toBe(ref[k]);
      expect(g.goalPerformance.every((p, i) => p.analysis !== ref.goalPerformance[i]!.analysis && p.recommendation !== ref.goalPerformance[i]!.recommendation)).toBe(true);
    });
    it("tek hedefli kısa çıktıda da ≥ 4 yasak kalıp", () => {
      const kisa = { ...ref, goalPerformance: ref.goalPerformance.slice(0, 1) };
      expect(yasakKalip(metinler(adapter.genericCandidate(kisa)).join("\n")).found.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("dayanıklılık: null satır", () => {
    const bozuk = { ...ref, goalPerformance: [null, { ...ref.goalPerformance[1] }, "metin"] };
    it("checks çökmez (fabrika ortak kontrolleri dahil)", () => {
      expect(() => adapter.checks({ body, output: bozuk, rawText: JSON.stringify(bozuk), alias: "Selin" })).not.toThrow();
    });
    it("renderForJudge ve genericCandidate çökmez", () => {
      let t = "";
      expect(() => (t = adapter.renderForJudge(bozuk))).not.toThrow();
      expect(t).toContain("Sıra alma — %80 — Bağımsız");
      expect(() => adapter.genericCandidate(bozuk)).not.toThrow();
      expect(() => adapter.renderForJudge({ ...ref, sessionInfo: null })).not.toThrow();
    });
    it("çıktı yok: hakem hata metnini görür", () => {
      expect(adapter.renderForJudge(null)).toContain("Çıktı üretilemedi");
    });
  });
});
