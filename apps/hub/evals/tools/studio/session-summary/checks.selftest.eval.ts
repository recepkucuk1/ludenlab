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
const [P1, P2] = ok.goalPerformance as [(typeof ok.goalPerformance)[number], (typeof ok.goalPerformance)[number]];
const run = (out: unknown, b: SessionSummaryBody = body) => sessionSummaryChecks({ body: b, output: out, raw: null, text: "", alias: "Hazal" });
const rows = (...r: unknown[]) => ({ ...ok, goalPerformance: r });
const sentences = (n: number) => Array.from({ length: n }, (_, k) => `Bugün çalışma ${k + 1} güzel geçti.`).join(" ");

describe("sessionSummaryChecks", () => {
  it("girilen yüzde ve ipucu düzeyleri korunur; uydurma yüzde yok", () => {
    const r = sessionSummaryChecks({ body, output: ok, raw: ok, text: "", alias: "Hazal" });
    expect(r.scores).toMatchObject({ hedef_sayisi: 1, veri_sadakati: 1, uydurma_yuzde: 1, oturum_bilgisi: 1, talimat: 1 });
    expect(r.details.veli_notu_cumle).toBe(3);
  });
  it("yüzde değişmiş ya da girilmemiş yüzde eklenmişse düşer", () => {
    const out = { ...ok, goalPerformance: [{ ...P1, accuracy: "%65" }, P2], overallAssessment: "Genel başarı %90." };
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

  it("hedef_sayisi: iki hedefe üç satır 0", () => {
    const r = run(rows(P1, P2, { ...P2, goal: "Ek", accuracy: "%80" }));
    expect(r.scores.hedef_sayisi).toBe(0);
    expect(r.hard).toEqual([]);
  });
  it("veri_sadakati: aynı konumda ipucu düzeyi uyuşmazsa düşer", () => {
    expect(run(rows({ ...P1, cueLevel: "Bağımsız" }, P2)).scores.veri_sadakati).toBe(0.5);
    expect(run(rows({ ...P1, cueLevel: "Sözel model ile" }, P2)).scores.veri_sadakati).toBe(1); // içerme, küçük harf
  });
  it("veri_sadakati: veri DOĞRU hedefin satırında olmalı (yer değiştirmiş veri sayılmaz)", () => {
    const takas = rows({ ...P1, accuracy: P2.accuracy, cueLevel: P2.cueLevel }, { ...P2, accuracy: P1.accuracy, cueLevel: P1.cueLevel });
    expect(run(takas).scores.veri_sadakati).toBe(0);
    // Dört hedefte yalnız ilk ikisi takas: 2/4.
    const g = (n: number, accuracy: number, cueLevel: string) => ({ goalId: `g${n}`, goalTitle: `Hedef sözcüğü ${n}`, accuracy, cueLevel });
    const b4: SessionSummaryBody = { ...body, goals: [g(1, 10, "Bağımsız"), g(2, 20, "Orta İpucu"), g(3, 30, "Tam Destek"), g(4, 40, "Minimum İpucu")] };
    const r = (n: number, accuracy: string, cueLevel: string) => ({ goal: `Hedef sözcüğü ${n}`, accuracy, cueLevel, analysis: "İyi.", recommendation: "Sür." });
    const dogru = rows(r(1, "%10", "Bağımsız"), r(2, "%20", "Orta İpucu"), r(3, "%30", "Tam Destek"), r(4, "%40", "Minimum İpucu"));
    expect(run(dogru, b4).scores.veri_sadakati).toBe(1);
    const yarim = rows(r(1, "%20", "Orta İpucu"), r(2, "%10", "Bağımsız"), r(3, "%30", "Tam Destek"), r(4, "%40", "Minimum İpucu"));
    expect(run(yarim, b4).scores.veri_sadakati).toBe(0.5);
  });
  it("veri_sadakati: satır sayısı farklıysa hedef adının ilk 12 karakteriyle eşleşir; adı eşleşmeyen satır sayılmaz", () => {
    const fazla = { goal: "Ek hedef", accuracy: "%10", cueLevel: "Orta İpucu", analysis: "İyi.", recommendation: "Sür." };
    const baslikli = run(rows(fazla, P1, P2));
    expect(baslikli.scores.hedef_sayisi).toBe(0);
    expect(baslikli.scores.veri_sadakati).toBe(1);
    const basliksiz = run(rows(fazla, { ...P1, goal: "Başka ad" }, P2));
    expect(basliksiz.scores.veri_sadakati).toBe(0.5);
    // Uzun hedef adında yalnız ilk 12 karakter aranır (model adı kısaltsa da eşleşir), büyük/küçük harf fark etmez.
    const uzun: SessionSummaryBody = { ...body, goals: [{ goalId: "g1", goalTitle: "Okuduğunu anlama: neden-sonuç soruları", accuracy: 40, cueLevel: "Orta İpucu" }] };
    const satir = (goal: string) => ({ goal, accuracy: "%40", cueLevel: "Orta ipucu", analysis: "İyi.", recommendation: "Sür." });
    expect(run(rows(satir("OKUDUĞUNU ANLAMA ve neden"), satir("Ek")), uzun).scores.veri_sadakati).toBe(1);
  });
  it("veri_sadakati: accuracy sayı ya da '60 %' olarak da kabul; sıfır için 'değerlendir…' ve %0 kabul", () => {
    expect(run(rows({ ...P1, accuracy: 60 }, P2)).scores.veri_sadakati).toBe(1);
    expect(run(rows({ ...P1, accuracy: "60 %" }, P2)).scores.veri_sadakati).toBe(1);
    expect(run(rows({ ...P1, accuracy: 65 }, P2)).scores.veri_sadakati).toBe(0.5);
    const sifir: SessionSummaryBody = { ...body, goals: [{ goalId: "g1", goalTitle: "/r/ sesi tarama", accuracy: 0, cueLevel: "Tam Destek" }] };
    const satir = (accuracy: unknown, cueLevel = "Tam Destek") => rows({ goal: "/r/ sesi tarama", accuracy, cueLevel, analysis: "Değerlendirilemedi.", recommendation: "Sür." });
    expect(run(satir("Değerlendirilemedi"), sifir).scores.veri_sadakati).toBe(1);
    expect(run(satir("%0"), sifir).scores.veri_sadakati).toBe(1);
    expect(run(satir("%30"), sifir).scores.veri_sadakati).toBe(0);
    expect(run(satir("Değerlendirilemedi", "Bağımsız"), sifir).scores.veri_sadakati).toBe(0); // ipucu yine eşleşmeli
    expect(run(satir("Değerlendirilemedi"), sifir).scores.uydurma_yuzde).toBe(1);
  });
  it("uydurma_yuzde: '%N' ve 'N %' biçimleri tanınır; ayrıntıda değer ve kesit listelenir", () => {
    const a = run({ ...ok, overallAssessment: "Genel doğruluk 90 %." });
    expect(a.scores.uydurma_yuzde).toBe(0);
    expect(a.details.uydurma).toContain("90 («");
    expect(a.details.uydurma).toContain("90 %");
    const b = run(rows({ ...P1, analysis: "Geçen oturuma göre %75 ilerledi." }, P2));
    expect(b.scores.uydurma_yuzde).toBe(0);
    expect(run({ ...ok, parentNote: "Bugün %95 başardı. Evde oynayın. Sabırlı olun." }).scores.uydurma_yuzde).toBe(0);
    // Girilen yüzdenin yinelenmesi serbest, iki biçimde de.
    expect(run({ ...ok, overallAssessment: "İlk hedefte 60 %, ikincide %80 doğruluk." }).scores.uydurma_yuzde).toBe(1);
  });
  it("uydurma_yuzde: ölçüt/hedef bağlamındaki yüzde sayılmaz; yalnız ilgili alanlar taranır", () => {
    expect(run({ ...ok, overallAssessment: "Ölçüt %75 doğruluktu." }).scores.uydurma_yuzde).toBe(1);
    expect(run({ ...ok, overallAssessment: "Hedef %70 başarıydı." }).scores.uydurma_yuzde).toBe(1);
    expect(run({ ...ok, overallAssessment: "Sınıf ortalaması %55 civarında." }).scores.uydurma_yuzde).toBe(1);
    // 30 karakterlik pencerenin dışındaki ölçüt sözcüğü korumaz.
    expect(run({ ...ok, overallAssessment: "Hedef belirlenmişti, ancak oturum boyunca bu konuda hiçbir not alınmadı ve %72 çıktı." }).scores.uydurma_yuzde).toBe(0);
    // recommendation, expertNotes, davranış/plan alanları taranmaz.
    const out = rows({ ...P1, recommendation: "Çıtayı %95'e çıkar." }, P2);
    expect(run({ ...out, expertNotes: "Geçen ay %50 idi.", nextSessionPlan: "%99 hedeflenir.", behaviorNotes: "%30 katıldı." }).scores.uydurma_yuzde).toBe(1);
  });
  it("veli_notu: 3–5 cümle 1; 2 ve 6 cümle 0", () => {
    const v = (n: number) => run({ ...ok, parentNote: sentences(n) });
    expect([2, 3, 5, 6].map((n) => v(n).scores.veli_notu)).toEqual([0, 1, 1, 0]);
    expect(v(6).details.veli_notu_cumle).toBe(6);
  });
  it("oturum_bilgisi: süre ya da tarih yanlışsa 0.5, ikisi de yanlışsa 0", () => {
    const info = (o: Record<string, string>) => run({ ...ok, sessionInfo: { ...ok.sessionInfo, ...o } }).scores.oturum_bilgisi;
    expect(info({ duration: "45 dakika" })).toBe(0.5);
    expect(info({ duration: "140 dakika" })).toBe(0.5); // sayı sınırı: 140 ⊅ 40
    expect(info({ date: "25 Ekim 2026" })).toBe(0.5); // gün sınırı: 25 ⊅ 5
    expect(info({ date: "5 Ekim 2025" })).toBe(0.5); // yıl
    expect(info({ date: "05.10.2026" })).toBe(1);
    expect(info({ duration: "45 dakika", date: "6 Ekim 2025" })).toBe(0);
    expect(run({ ...ok, sessionInfo: undefined }).scores.oturum_bilgisi).toBe(0);
  });
  it("çıktı yok: varsayılan-1 alt puanlar dahil hepsi 0", () => {
    const r = run(null);
    expect(r.scores).toMatchObject({ hedef_sayisi: 0, veri_sadakati: 0, uydurma_yuzde: 0, oturum_bilgisi: 0, alanlar: 0, veli_notu: 0, talimat: 0 });
    expect(r.hard).toEqual([]);
  });
  it("null ya da nesne olmayan satır çökmez; satır sayılır", () => {
    const r = run(rows(null, "metin"));
    expect(r.scores.hedef_sayisi).toBe(1); // 2 satır, 2 hedef
    expect(r.scores.veri_sadakati).toBe(0);
    expect(run(rows(P1, null)).scores.veri_sadakati).toBe(0.5);
  });
});
