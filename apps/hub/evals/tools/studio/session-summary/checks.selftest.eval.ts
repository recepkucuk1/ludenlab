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
