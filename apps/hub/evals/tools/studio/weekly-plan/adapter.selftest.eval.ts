// apps/hub/evals/tools/studio/weekly-plan/adapter.selftest.eval.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { CaseDef, StudioFixture } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { adapter } from "./adapter";
import type { WeeklyPlanBody } from "./checks";

/* Rota taklidi: adaptörün rotaya NE gönderdiğini görmek için (gerçek rota DB/model ister). */
const rota = vi.hoisted(() => ({ gelen: [] as Array<Record<string, unknown>> }));
vi.mock("@/app/studio/api/tools/weekly-plan/route", () => ({
  POST: async (req: Request) => {
    rota.gelen.push((await req.json()) as Record<string, unknown>);
    return new Response(JSON.stringify({ success: true, plan: { title: "t" } }), { status: 200 });
  },
}));

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<WeeklyPlanBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const gorev = (id: string) => {
  const c = vaka(id);
  return adapter.renderTask(c, resolveFixture("studio", c.student) as StudioFixture);
};

/** hp-04'ün gövdesi: 2 ders × 20 dk, odak "/k/ sesi kelime başı". */
const body = vaka("hp-04").body;
/** Modelin ham çıktısı (gün adı/tarih/süre YOK). */
const ham = {
  title: "Haftalık Plan — Mert — 12–18 Ekim",
  studentSummary: "Mert çok hareketli ve masada kısa kalıyor. Araba ve itfaiye oyuncaklarıyla konuşkan.",
  days: [
    { focusArea: "/k/ sesi kelime başı", objective: "Mert araba oyununda /k/ ile başlayan iki sözcüğü modelden sonra söyler.",
      warmup: { activity: "Odada araba izi takip ederek zıplama oyunu oynarız.", duration: "3 dakika", materials: ["Oyuncak araba"] },
      mainWork: { activity: "Arabayı kutuya sokup 'kapı' ve 'kedi' sözcükleriyle garaj oyunu kurarız.", duration: "12 dakika", steps: ["Arabayı sürerek garaja götür", "Kapı resmini göster", "Sözcüğü birlikte söyle"], materials: ["Oyuncak araba", "Kapı resmi"], targetGoals: ["Fonolojik farkındalık"] },
      closing: { activity: "Arabayı garaja park edip el sallayarak bitiririz.", duration: "5 dakika" }, notes: null as string | null },
    { focusArea: "/k/ sesi kelime başı", objective: "Mert itfaiye oyununda /k/ sesini bağımsız üretmeye çalışır.",
      warmup: { activity: "İtfaiye sireni sesiyle koşup durma oyunu yaparız.", duration: "3 dakika", materials: [] },
      mainWork: { activity: "Hortumla söndürülecek kartlardaki 'kaz' ve 'kuş' sözcüklerini isteriz.", duration: "12 dakika", steps: ["Kartı sakla", "Mert'in isteğini bekle"], materials: ["İtfaiye aracı", "Kartlar"], targetGoals: ["Fonolojik farkındalık"] },
      closing: { activity: "İtfaiye aracını garaja koyup birlikte alkışlarız.", duration: "5 dakika" }, notes: null as string | null },
  ],
  weeklyGoal: "Mert /k/ ile başlayan sözcükleri oyun içinde söyler.",
  materialsNeeded: ["Oyuncak araba", "Kapı resmi", "İtfaiye aracı", "Kartlar"],
  parentCommunication: "Bu hafta /k/ sesiyle başlayan sözcüklerle oyun oynayacağız. Evde araba oyununda sözcükleri yavaşça söyleyebilirsiniz.",
  expertNotes: "Öne alma süreci /k/ → /t/ olarak sürüyor. Kısa bloklarla masa toleransı korunur.",
  nextWeekSuggestion: "Gelecek hafta /g/ sesine geç.",
};
type Ham = typeof ham;
/** Rota `enrichContent`ının yaptığı. */
const zenginles = (m: Ham) => ({ ...m, days: m.days.map((d, i) => ({ ...d, dayNumber: i + 1, dayName: ["Pazartesi", "Perşembe"][i]!, date: `${12 + i * 3} Eki 2026`, duration: "20 dakika" })) });
const ref = zenginles(ham);
type Ref = typeof ref;

describe("haftalık plan adaptörü", () => {
  it("4 vaka, fikstürler çözülür; 4 ortak + 2 araç ölçütü", () => {
    expect(cases.map((c) => c.id)).toEqual(["hp-01", "hp-02", "hp-03", "hp-04"]);
    for (const c of cases) expect(resolveFixture("studio", c.student)?.id ?? null).toBe(c.student);
    expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(["progresyon", "gecmis_baglanti"]);
  });

  it("vaka gövdeleri rotanın şemasına uyar; ders toplamı haftalık ders sayısı; Pazar yok (rota DAY_OFFSETS'ta yok)", () => {
    const GUNLER = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    for (const c of cases) {
      const b = c.body;
      expect(b.weekStart, c.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["20", "30", "40", "45", "60"], c.id).toContain(b.sessionDuration);
      expect(b.focusAreas.length, c.id).toBeGreaterThanOrEqual(1);
      expect(b.focusAreas.length, c.id).toBeLessThanOrEqual(12);
      for (const f of b.focusAreas) expect(f.length, `${c.id} ${f}`).toBeLessThanOrEqual(60);
      expect((b.extraNote ?? "").length, c.id).toBeLessThanOrEqual(500);
      expect(b.daySchedule.length, c.id).toBeLessThanOrEqual(7);
      for (const d of b.daySchedule) {
        expect(GUNLER, `${c.id} ${d.dayName}`).toContain(d.dayName);
        expect(d.lessonCount).toBeGreaterThanOrEqual(1);
        expect(d.lessonCount).toBeLessThanOrEqual(4);
      }
      expect(b.daySchedule.reduce((a, d) => a + d.lessonCount, 0), c.id).toBe(b.sessionsPerWeek);
      expect(c.student, c.id).not.toBeNull(); // öğrenci zorunlu
    }
    expect(vaka("hp-02").body.sessionsPerWeek).toBe(12);
  });

  it("hakem görevi: route'taki plan yaklaşımı metinleri, ders listesi, süre ve odak alanları", () => {
    const t1 = gorev("hp-01");
    expect(t1).toContain("Ders süresi: 40 dakika");
    expect(t1).toContain("Planlama yaklaşımı: Öğrenci profiline ve geçmişe göre AI otomatik önersin");
    expect(t1).toContain("- Odak alanları: Üç kelimeli istek cümlesi, Sıra alma");
    expect(t1).toContain("- Dersler (days dizisi bu sırayı izlesin):\n  1. Pazartesi\n  2. Çarşamba\n  3. Cuma");
    const t3 = gorev("hp-03");
    expect(t3).toContain("Planlama yaklaşımı: Seçilen odak alanlarına göre yönlendirilmiş plan");
    expect(t3).toContain("  1. Salı (1. ders / günde 2 ders)\n  2. Salı (2. ders / günde 2 ders)\n  3. Perşembe (1. ders / günde 2 ders)");
    expect(t3).toContain("- Ek notlar: Uzun oturumlarda cihazı çıkarmak istiyor");
    expect(gorev("hp-01")).not.toContain("Ek notlar");
    expect(gorev("hp-02").match(/^ {2}\d+\. /gm)).toHaveLength(12);
  });

  it("bağlantı: yanıt anahtarı 'plan'; öğrencisiz istek rota çağrılmadan reddedilir (öğrenci zorunlu)", async () => {
    expect(adapter.extractOutput({ plan: ref, board: 1 })).toBe(ref);
    expect(adapter.extractOutput({ board: 1 })).toBeUndefined();
    rota.gelen.length = 0;
    await expect(adapter.invoke(body, null)).rejects.toThrow("öğrencisiz olamaz");
    expect(rota.gelen).toEqual([]); // rota çağrılmadı
    expect(await adapter.invoke(body, "stu-yigit")).toEqual({ status: 200, body: { success: true, plan: { title: "t" } } });
    expect(rota.gelen[0]).toEqual({ ...body, studentId: "stu-yigit" });
  });

  it("iyi çıktı: sert hata yok, talimat 1 (ham çıktı + üründeki zenginleştirilmiş çıktı)", () => {
    const r = adapter.checks({ body, output: ref, rawText: JSON.stringify(ham), alias: "Selin" });
    expect(r.hard_fail).toEqual([]);
    expect(r.scores).toMatchObject({ talimat: 1, ders_sayisi: 1, sure_dagilimi: 1, sistem_alani: 1, dil_kurali: 1, rumuz_yok: 1 });
    expect(adapter.checks({ body, output: ref, rawText: JSON.stringify(ham), alias: "Selin" }).details).toMatchObject({ ders: 2, ders_ham: 2, beklenen: 2 });
  });

  it("ham çıktıda gün adı/tarih/süre yazılmış ya da ders fazla üretilmişse fabrika da görür (ham metin ayrıştırılır)", () => {
    const yazan = { ...ham, days: ham.days.map((d) => ({ ...d, dayName: "Pazartesi" })) };
    expect(adapter.checks({ body, output: ref, rawText: JSON.stringify(yazan), alias: "Selin" }).scores.sistem_alani).toBe(0);
    const fazla = { ...ham, days: [...ham.days, ham.days[0]] };
    expect(adapter.checks({ body, output: ref, rawText: JSON.stringify(fazla), alias: "Selin" }).scores.ders_sayisi).toBe(0);
  });

  it("rumuz çıktıda kaldıysa sert hata", () => {
    const sizan = { ...ref, weeklyGoal: "Selin /k/ ile başlayan sözcükleri söyler." };
    const r = adapter.checks({ body, output: sizan, rawText: JSON.stringify(sizan), alias: "Selin" });
    expect(r.scores.rumuz_yok).toBe(0);
    expect(r.hard_fail).toContain("rumuz_sizintisi");
  });

  describe("hakem çizimi", () => {
    it("gün numarası/adı/tarih, hedef, ısınma-ana çalışma-kapanış, adımlar, materyaller ve hedefler görünür", () => {
      const t = adapter.renderForJudge(ref);
      expect(t).toContain("Dersler (2):");
      expect(t).toContain("  1. Pazartesi 12 Eki 2026 — /k/ sesi kelime başı: Mert araba oyununda");
      expect(t).toContain("  2. Perşembe 15 Eki 2026");
      expect(t).toContain("Isınma: Odada araba izi takip ederek zıplama oyunu oynarız. (3 dakika) · Materyal: Oyuncak araba");
      expect(t).toContain("Adımlar: Arabayı sürerek garaja götür / Kapı resmini göster / Sözcüğü birlikte söyle");
      expect(t).toContain("Hedefler: Fonolojik farkındalık");
      expect(t).toContain("Kapanış: Arabayı garaja park edip el sallayarak bitiririz. (5 dakika)");
      expect(t).toContain("Materyaller: Oyuncak araba, Kapı resmi, İtfaiye aracı, Kartlar");
      expect(t).toContain("Veli iletişimi:");
      expect(t).toContain("Gelecek hafta: Gelecek hafta /g/ sesine geç.");
    });
    it("not varsa görünür; yoksa satır yok", () => {
      const nli = zenginles({ ...ham, days: [{ ...ham.days[0]!, notes: "Kalabalıkta başlama." }, ham.days[1]!] });
      expect(adapter.renderForJudge(nli)).toContain("     Not: Kalabalıkta başlama.");
      expect(adapter.renderForJudge(ref)).not.toContain("Not:");
    });
    it("zenginleştirilmemiş (ham) çıktıda ders numarası sıradan gelir", () => {
      expect(adapter.renderForJudge(ham)).toContain("  1. /k/ sesi kelime başı: Mert araba");
      expect(adapter.renderForJudge(ham)).toContain("  2. /k/ sesi kelime başı: Mert itfaiye");
    });
  });

  describe("jenerik aday", () => {
    it("≥ 4 yasak kalıp taşır, hakeme referanstan farklı görünür; yapı, gün/tarih/süre ve odak alanı korunur", () => {
      const before = JSON.stringify(ref);
      const g = adapter.genericCandidate(ref) as Ref;
      expect(JSON.stringify(ref)).toBe(before); // referans değişmez (derin kopya)
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(ref));
      expect(g.days.map((d) => [d.focusArea, d.dayNumber, d.dayName, d.date, d.duration])).toEqual(ref.days.map((d) => [d.focusArea, d.dayNumber, d.dayName, d.date, d.duration]));
      expect(g.days.map((d) => d.mainWork.steps.length)).toEqual(ref.days.map((d) => d.mainWork.steps.length));
      expect(g.days.map((d) => d.warmup)).toEqual(ref.days.map((d) => d.warmup));
      expect(g.title).toBe(ref.title);
      expect(g.materialsNeeded).toEqual(ref.materialsNeeded);
    });
    it("hedefleri, ana çalışma etkinliklerini/adımlarını ve tüm haftalık metinleri değiştirir", () => {
      const g = adapter.genericCandidate(ref) as Ref;
      for (const k of ["studentSummary", "weeklyGoal", "parentCommunication", "expertNotes", "nextWeekSuggestion"] as const) expect(g[k], k).not.toBe(ref[k]);
      expect(g.days.every((d, i) => d.objective !== ref.days[i]!.objective && d.mainWork.activity !== ref.days[i]!.mainWork.activity)).toBe(true);
      expect(g.days.every((d, i) => d.mainWork.steps.every((s, k) => s !== ref.days[i]!.mainWork.steps[k]))).toBe(true);
    });
    it("tek derslik kısa çıktıda da 8 yasak kalıbın hepsi (sabit alanlardan)", () => {
      const kisa = { ...ref, days: ref.days.slice(0, 1) };
      expect(yasakKalip(metinler(adapter.genericCandidate(kisa)).join("\n")).found.length).toBe(8);
    });
    it("jenerik adayın yapısal puanları korunur (ders sayısı); yalnız yasak kalıp puanı çöker — hakem metni kıyaslasın", () => {
      const g = adapter.genericCandidate(ref);
      const r = adapter.checks({ body, output: g, rawText: JSON.stringify(g), alias: "Selin" });
      expect(r.scores).toMatchObject({ ders_sayisi: 1, yasak_kalip: 0 });
    });
  });

  describe("dayanıklılık: null / bozuk satır", () => {
    const bozuk = { ...ref, days: [null, { ...ref.days[1]!, warmup: "x", mainWork: { activity: "A", steps: [null, 3], materials: null, targetGoals: [null] }, closing: null }, "metin"], materialsNeeded: [null, 4] };
    it("checks çökmez (fabrika ortak kontrolleri dahil)", () => {
      expect(() => adapter.checks({ body, output: bozuk, rawText: JSON.stringify(bozuk), alias: "Selin" })).not.toThrow();
    });
    it("renderForJudge ve genericCandidate çökmez; metin olmayan öğe '—' görünür", () => {
      let t = "";
      expect(() => (t = adapter.renderForJudge(bozuk))).not.toThrow();
      expect(t).toContain("Dersler (3):");
      expect(t).toContain("Adımlar: — / —");
      expect(t).toContain("Materyaller: —, —");
      expect(() => adapter.genericCandidate(bozuk)).not.toThrow();
      expect(() => adapter.renderForJudge({ ...ref, days: "x" })).not.toThrow();
      expect(() => adapter.genericCandidate({ ...ref, days: "x" })).not.toThrow();
    });
    it("çıktı yok: hakem hata metnini görür", () => {
      expect(adapter.renderForJudge(null)).toContain("Çıktı üretilemedi");
    });
  });
});
