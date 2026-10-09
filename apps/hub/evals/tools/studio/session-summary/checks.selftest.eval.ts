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
const g = (n: number, accuracy: number, cueLevel: string) => ({ goalId: `g${n}`, goalTitle: `Hedef sözcüğü ${n}`, accuracy, cueLevel });
const r = (n: number, accuracy: string, cueLevel: string) => ({ goal: `Hedef sözcüğü ${n}`, accuracy, cueLevel, analysis: "İyi.", recommendation: "Sür." });
const b4: SessionSummaryBody = { ...body, goals: [g(1, 10, "Bağımsız"), g(2, 20, "Orta İpucu"), g(3, 30, "Tam Destek"), g(4, 40, "Minimum İpucu")] };
const dogru = rows(r(1, "%10", "Bağımsız"), r(2, "%20", "Orta İpucu"), r(3, "%30", "Tam Destek"), r(4, "%40", "Minimum İpucu"));
const yarim = rows(r(1, "%20", "Orta İpucu"), r(2, "%10", "Bağımsız"), r(3, "%30", "Tam Destek"), r(4, "%40", "Minimum İpucu"));

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
  it("veri_sadakati: veri DOĞRU hedefin satırında olmalı — başlıklar yerinde, veri taşınmışsa düşer", () => {
    const takas = rows({ ...P1, accuracy: P2.accuracy, cueLevel: P2.cueLevel }, { ...P2, accuracy: P1.accuracy, cueLevel: P1.cueLevel });
    expect(run(takas).scores.veri_sadakati).toBe(0);
    // Dört hedefte yalnız ilk ikisinin verisi takas (başlıklar yerinde): 2/4.
    expect(run(yarim, b4).scores.veri_sadakati).toBe(0.5);
    expect(run(dogru, b4).scores.veri_sadakati).toBe(1);
  });
  it("veri_sadakati: model hedefleri yeniden sıralasa da veri kendi başlığıyla eşleşirse 1", () => {
    expect(run(rows(P2, P1)).scores.veri_sadakati).toBe(1); // iki hedef yer değiştirmiş, verileriyle birlikte
    expect(run(rows(P2, P1)).scores.hedef_sayisi).toBe(1);
    // Üç hedef en güçlüden başlayarak sıralanmış.
    const b3: SessionSummaryBody = { ...body, goals: [g(1, 30, "Tam Destek"), g(2, 90, "Bağımsız"), g(3, 60, "Orta İpucu")] };
    const guclu = rows(r(2, "%90", "Bağımsız"), r(3, "%60", "Orta İpucu"), r(1, "%30", "Tam Destek"));
    expect(run(guclu, b3).scores.veri_sadakati).toBe(1);
    // Yeniden sıralanmış satırlarda veri yine de yanlışsa (3. hedefin yüzdesi 1. hedefte) düşer.
    const bozuk = rows(r(2, "%90", "Bağımsız"), r(3, "%60", "Orta İpucu"), r(1, "%60", "Orta İpucu"));
    expect(run(bozuk, b3).scores.veri_sadakati).toBeCloseTo(2 / 3);
  });
  it("veri_sadakati: başlık normalizasyonu (büyük/küçük harf, tire-kesme-tırnak türleri, boşluk, sondaki noktalama) ve içerme", () => {
    const b: SessionSummaryBody = { ...body, goals: [{ goalId: "g1", goalTitle: "/s/–/ş/ işitsel “ayrım”", accuracy: 60, cueLevel: "Maksimum İpucu" }, { goalId: "g2", goalTitle: "Sıra alma", accuracy: 80, cueLevel: "Bağımsız" }] };
    const satir = (goal: string, accuracy: string, cueLevel: string) => ({ goal, accuracy, cueLevel, analysis: "İyi.", recommendation: "Sür." });
    // Sıra tersine; birinci başlık farklı tire/tırnak ve sonda nokta taşıyor, ikincisi büyük harfli.
    const out = rows(satir("SIRA  ALMA .", "%80", "Bağımsız"), satir('/s/-/ş/ işitsel "ayrım".', "%60", "Maksimum İpucu"));
    expect(run(out, b).scores.veri_sadakati).toBe(1);
    // İçerme iki yönde: satır başlığı hedefi içerir ya da hedef satırı içerir.
    expect(run(rows(satir("Sıra alma (dinozor oyunu)", "%80", "Bağımsız"), satir("/s/-/ş/ işitsel “ayrım” oyunu", "%60", "Maksimum İpucu")), b).scores.veri_sadakati).toBe(1);
    expect(run(rows(satir("Sıra", "%80", "Bağımsız"), satir("/s/-/ş/ işitsel “ayrım”", "%60", "Maksimum İpucu")), b).scores.veri_sadakati).toBe(1); // "sıra" ⊂ "sıra alma", 4 karakter
    // Tam eşitlik içermeye üstündür: "Sıra alma" ve "Sıra alma (grup)" ayrı hedefler (sondaki nokta eşitliği bozmaz).
    const iki: SessionSummaryBody = { ...body, goals: [{ goalId: "g1", goalTitle: "Sıra alma", accuracy: 80, cueLevel: "Bağımsız" }, { goalId: "g2", goalTitle: "Sıra alma (grup)", accuracy: 50, cueLevel: "Orta İpucu" }] };
    expect(run(rows(satir("Sıra alma (grup)", "%50", "Orta İpucu"), satir("Sıra alma", "%80", "Bağımsız")), iki).scores.veri_sadakati).toBe(1);
    expect(run(rows(satir("Sıra alma (grup).", "%50", "Orta İpucu"), satir("Sıra alma.", "%80", "Bağımsız")), iki).scores.veri_sadakati).toBe(1);
    // Kesme işaretleri (düz ve kıvrık) birleşir.
    const kesme: SessionSummaryBody = { ...body, goals: [{ goalId: "g1", goalTitle: "Ela'nın sırası", accuracy: 80, cueLevel: "Bağımsız" }, { goalId: "g2", goalTitle: "Ela'nın sırası (grup)", accuracy: 50, cueLevel: "Orta İpucu" }] };
    expect(run(rows(satir("Ela’nın sırası (grup)", "%50", "Orta İpucu"), satir("Ela’nın sırası", "%80", "Bağımsız")), kesme).scores.veri_sadakati).toBe(1);
  });
  it("veri_sadakati: başlık eşleşmezse (ya da tek eşleşme yoksa) konuma düşer; fazla satır başlık eşleşen hedefleri bozmaz", () => {
    const fazla = { goal: "Ek hedef", accuracy: "%10", cueLevel: "Orta İpucu", analysis: "İyi.", recommendation: "Sür." };
    const baslikli = run(rows(fazla, P1, P2));
    expect(baslikli.scores.hedef_sayisi).toBe(0);
    expect(baslikli.scores.veri_sadakati).toBe(1);
    // Başlığı hiç eşleşmeyen satırlar konumla okunur: veri yerindeyse 1, değilse düşer.
    const yeniAd = (p: typeof P1, goal: string) => ({ ...p, goal });
    expect(run(rows(yeniAd(P1, "Başka ad"), yeniAd(P2, "Bir başka ad"))).scores.veri_sadakati).toBe(1);
    expect(run(rows(yeniAd(P2, "Başka ad"), yeniAd(P1, "Bir başka ad"))).scores.veri_sadakati).toBe(0);
    expect(run(rows(fazla, yeniAd(P1, "Başka ad"), P2)).scores.veri_sadakati).toBe(0.5); // 1. hedef konumla fazla satıra düşer
    // İçerme tek eşleşme vermiyorsa (iki satır da hedefi içerir) konum belirler.
    const uc: SessionSummaryBody = { ...body, goals: [{ goalId: "g1", goalTitle: "Zil sesi", accuracy: 30, cueLevel: "Tam Destek" }, { goalId: "g2", goalTitle: "Sıra alma", accuracy: 80, cueLevel: "Bağımsız" }] };
    const sat = (goal: string, accuracy: string, cueLevel: string) => ({ goal, accuracy, cueLevel, analysis: "İyi.", recommendation: "Sür." });
    const belirsiz = rows(sat("Sıra alma (grup)", "%10", "Orta İpucu"), sat("Sıra alma sırasında", "%80", "Bağımsız"), sat("Zil sesi", "%30", "Tam Destek"));
    expect(run(belirsiz, uc).scores.veri_sadakati).toBe(1); // 2. hedef konumla 2. satırı okur
    // Boş ya da çok kısa başlıklı satır hiçbir hedefle içerme eşleşmesi kurmaz.
    const bos: SessionSummaryBody = { ...body, goals: [{ goalId: "g1", goalTitle: "Sıra alma", accuracy: 80, cueLevel: "Bağımsız" }, { goalId: "g2", goalTitle: "Zil sesi", accuracy: 30, cueLevel: "Tam Destek" }] };
    expect(run(rows(sat("Başka ad", "%80", "Bağımsız"), sat("", "%30", "Tam Destek")), bos).scores.veri_sadakati).toBe(1);
    // Aynı başlıklı iki hedef (tek eşleşme yok): konum belirler.
    const ayni: SessionSummaryBody = { ...body, goals: [{ goalId: "g1", goalTitle: "Sıra alma", accuracy: 60, cueLevel: "Orta İpucu" }, { goalId: "g2", goalTitle: "Sıra alma", accuracy: 80, cueLevel: "Bağımsız" }] };
    const sira = (accuracy: string, cueLevel: string) => ({ goal: "Sıra alma", accuracy, cueLevel, analysis: "İyi.", recommendation: "Sür." });
    expect(run(rows(sira("%60", "Orta İpucu"), sira("%80", "Bağımsız")), ayni).scores.veri_sadakati).toBe(1);
    expect(run(rows(sira("%80", "Bağımsız"), sira("%60", "Orta İpucu")), ayni).scores.veri_sadakati).toBe(0);
    // Satır eksikse eşleşmeyen hedef 0.
    expect(run(rows(yeniAd(P1, "Başka ad"))).scores.veri_sadakati).toBe(0.5); // 1. hedef konumla P1 (60) → 1; 2. hedef: satır yok → 0
    const uzun: SessionSummaryBody = { ...body, goals: [{ goalId: "g1", goalTitle: "Okuduğunu anlama: neden-sonuç soruları", accuracy: 40, cueLevel: "Orta İpucu" }] };
    const satir = (goal: string) => ({ goal, accuracy: "%40", cueLevel: "Orta ipucu", analysis: "İyi.", recommendation: "Sür." });
    // Model başlığı yeniden yazdı (eşleşme yok) → konum: tek hedef, ilk satır.
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
  it("uydurma_yuzde: sayıya bitişik hedef/ölçüt sözcüğü muaf; genel 'hedef' sözcüğü, uzak ölçüt ve alan dışı metin muaf değil", () => {
    const oa = (overallAssessment: string, b: SessionSummaryBody = body) => run({ ...ok, overallAssessment }, b).scores.uydurma_yuzde;
    const bir: SessionSummaryBody = { ...body, goals: [{ goalId: "g1", goalTitle: "Üç kelimeli istek", accuracy: 40, cueLevel: "sözel model" }] };
    // Geçmesi gerekenler.
    const kirk = { ...ok, goalPerformance: [{ ...P1, accuracy: "%40" }] };
    expect(run({ ...kirk, overallAssessment: "Ölçüt %80 idi." }, bir).scores.uydurma_yuzde).toBe(1); // girilen 40, ölçüt 80
    expect(run({ ...kirk, overallAssessment: "Bu oturumda %80 görüldü." }, bir).scores.uydurma_yuzde).toBe(0); // aynı veri, muafiyet kelimesi yok
    expect(oa("Ölçüt %75 doğruluktu.")).toBe(1);
    expect(oa("Başarı ölçütü olarak %75 belirlendi.")).toBe(1); // ölçütü + 1 kısa sözcük + sayı
    expect(oa("Hedef %70 başarıydı.")).toBe(1);
    expect(oa("Hedefi %75 olarak belirlemiştik.")).toBe(1);
    expect(oa("Hedeflenen %75 düzeyine yaklaştı.")).toBe(1);
    expect(oa("%75 hedeflenmişti.")).toBe(1);
    expect(oa("%80 başarı ölçütü karşılandı.")).toBe(1);
    expect(oa("Kriter: %90 doğru.")).toBe(1);
    expect(oa("%85'e ulaşması bekleniyor.")).toBe(1);
    expect(oa("%90'a ulaşılabilir.")).toBe(1);
    // "ortalama" yalnız girilen yüzdelerin ortalamasıyla (60/80 → 70).
    expect(oa("Ortalama %70 doğruluk görüldü.")).toBe(1);
    expect(oa("İki hedefte ortalama doğruluk %70.")).toBe(1);
    expect(oa("%70 ortalama ile bitti.")).toBe(1);
    // Ortalama tavan/taban/yuvarlama: 60 ve 75 → 67,5.
    const orta: SessionSummaryBody = { ...body, goals: [{ ...body.goals[0]! }, { goalId: "g2", goalTitle: "Sıra alma", accuracy: 75, cueLevel: "bağımsız" }] };
    const ortaOut = (overallAssessment: string) => run({ ...rows(P1, { ...P2, accuracy: "%75" }), overallAssessment }, orta).scores.uydurma_yuzde;
    expect([67, 68].map((n) => ortaOut(`Ortalama %${n}.`))).toEqual([1, 1]);
    expect(ortaOut("Ortalama %70.")).toBe(0);
    // Sınıf/oturum "ortalaması" girilen ortalamaya eşit değilse uydurma.
    expect(oa("Sınıf ortalaması %55 civarında.")).toBe(0);
    // "ortalama" yoksa ortalamaya eşit sayı da muaf değil.
    expect(oa("Oturum sonunda %70 çıktı.")).toBe(0);
    // "ortalama" sayıya bitişik değilse (arada cümle) muaf değil.
    expect(oa("Ortalama bir oturumdu, ancak %70 çıktı.")).toBe(0);
    // Sayıdan SONRA gelen genel "hedef" sözcüğü ve cümle sınırı muaf tutmaz.
    expect(oa("%75 ile hedefe yaklaştı.")).toBe(0);
    expect(oa("Ölçüt belirlendi. %72 görüldü.")).toBe(0);
    // Hedef sözcüğü ile sayı arasında birden çok sözcük varsa bitişik değil.
    expect(oa("Hedeflenen sıra bekleme becerisinde %90 görüldü.")).toBe(0);
    expect(oa("%90 görüldü ve sıra beklemede ölçüt değişmedi.")).toBe(0);
  });
  it("uydurma_yuzde: gevşek muafiyet probları işaretlenir (genel 'hedef' sözcüğü, yanlış ortalama, accuracy alanı)", () => {
    const anl = (analysis: string) => run(rows({ ...P1, analysis }, P2));
    // Bunlar eskiden geçiyordu.
    expect(run({ ...ok, overallAssessment: "Oturum genelinde ortalama %85 doğruluk" }).scores.uydurma_yuzde).toBe(0); // girilen 60/80 → ortalama 70
    expect(anl("Bu hedefte %75 doğruluk görüldü.").scores.uydurma_yuzde).toBe(0);
    expect(run({ ...ok, overallAssessment: "Hedefe yönelik çalışmada %90 doğruluk." }).scores.uydurma_yuzde).toBe(0);
    expect(run({ ...ok, overallAssessment: "Hedeflerin ikisinde de %90 doğruluk." }).scores.uydurma_yuzde).toBe(0);
    expect(run({ ...ok, parentNote: "Bugün hedefimizde %95 vardı. Evde oyun oynayabilirsiniz. Küçük adımlar yeterli." }).scores.uydurma_yuzde).toBe(0);
    const acc = run(rows({ ...P1, accuracy: "%85 (hedef %80)" }, P2)); // accuracy alanında muafiyet yok
    expect(acc.scores.uydurma_yuzde).toBe(0);
    expect(acc.details.uydurma).toContain("85 («");
    // accuracy alanında hiçbir muafiyet yok: ölçüt/ortalama/ulaşma ifadesi de olsa girilmemiş sayı uydurmadır.
    expect(run(rows({ ...P1, accuracy: "%60 (ölçüt %90)" }, P2)).scores.uydurma_yuzde).toBe(0);
    expect(run(rows({ ...P1, accuracy: "%60 (ortalama %70)" }, P2)).scores.uydurma_yuzde).toBe(0);
    expect(run(rows({ ...P1, accuracy: "%60, %95'e ulaştı" }, P2)).scores.uydurma_yuzde).toBe(0);
    // Uzak ölçüt/hedef sözcüğü korumaz (bitişik değil).
    expect(run({ ...ok, overallAssessment: "Hedef belirlenmişti, ancak oturum boyunca bu konuda hiçbir not alınmadı ve %72 çıktı." }).scores.uydurma_yuzde).toBe(0);
    expect(run({ ...ok, overallAssessment: "Ölçüt belirlendi. Oturum sonunda %72 görüldü." }).scores.uydurma_yuzde).toBe(0);
    // Girilen yüzde ve sayı biçimleri hâlâ serbest; accuracy alanındaki girilen sayı da.
    expect(run(rows({ ...P1, accuracy: "%60 (ölçüt: %80)" }, P2)).scores.uydurma_yuzde).toBe(1); // 80 girilen (2. hedef)
  });
  it("uydurma_yuzde: recommendation, expertNotes, davranış/plan alanları taranmaz", () => {
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
