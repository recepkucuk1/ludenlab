// apps/hub/evals/tools/studio/homework/adapter.selftest.eval.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CaseDef, StudioFixture } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { adapter } from "./adapter";
import type { HomeworkBody } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<HomeworkBody>[];
const body: HomeworkBody = { targetArea: "üç kelimeli istek", duration: "15", parentLevel: "basic", materialType: "exercise" };
const ref = {
  title: "Su istiyorum", materialType: "exercise", duration: "15 dakika", targetArea: "üç kelimeli istek",
  introduction: "Bu hafta evde su isteme oyunu oynayacaksınız.", materials: ["su bardağı"],
  steps: [
    { stepNumber: 1, instruction: "Bardağı gösterebilirsiniz.", tip: "Göz hizasında tutun." },
    { stepNumber: 2, instruction: "Birkaç saniye bekleyebilirsiniz.", tip: "5 sn" },
    { stepNumber: 3, instruction: "Cümleyi tekrar edebilirsiniz.", tip: "" },
  ],
  watchFor: "Göz teması kurduğunda fark edin.", celebration: "Birlikte gülümseyebilirsiniz.", frequency: "Günde 1 kez",
  expertNotes: "Bardak seçimi çocuğun ilgisine göre.", adaptations: "Kolay: iki kelime. Zor: dört kelime.",
};

describe("ev ödevi adaptörü", () => {
  it("4 vaka, fikstürler çözülür; 4 ortak + 2 araç ölçütü", () => {
    expect(cases.map((c) => c.id)).toEqual(["hw-01", "hw-02", "hw-03", "hw-04"]);
    for (const c of cases) expect(resolveFixture("studio", c.student)?.id ?? null).toBe(c.student);
    expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(["veli_dili", "sure_uyumu"]);
    expect(adapter.criteria.find((c) => c.key === "sure_uyumu")!.question).toContain("öğrencinin yaşına");
    expect(cases.find((c) => c.id === "hw-03")!.tags).toContain("kısa bağlam");
  });

  it("hakem görevi: route'taki veli düzeyi ve tür tanımları, uzman notu", () => {
    const c = cases.find((x) => x.id === "hw-02")!;
    const t = adapter.renderTask(c, resolveFixture("studio", c.student) as StudioFixture);
    expect(t).toContain("Veli düzeyi: Detaylı (daha fazla açıklama, bazı teknik bilgi)");
    expect(t).toContain("Tür: Gözlem formu (velinin çocuğu gözlemleyip not alacağı form)");
    expect(t).toContain("- Uzman notu: Ecem sözlü yanıt baskısında kapanıyor");
  });

  it("iyi çıktı: sert hata yok, talimat 1 (öneri kipi, teknik terim yok)", () => {
    const r = adapter.checks({ body, output: ref, rawText: JSON.stringify(ref), alias: "Hazal" });
    expect(r.hard_fail).toEqual([]);
    expect(r.scores).toMatchObject({ talimat: 1, dil_kurali: 1, rumuz_yok: 1 });
  });

  describe("jenerik aday", () => {
    it("≥ 4 yasak kalıp taşır, hakeme referanstan farklı görünür; yapı ve girdi korunur", () => {
      const before = JSON.stringify(ref);
      const g = adapter.genericCandidate(ref) as typeof ref;
      expect(JSON.stringify(ref)).toBe(before); // referans değişmez (derin kopya)
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(ref));
      expect(g.steps.map((s) => s.stepNumber)).toEqual([1, 2, 3]);
      expect(g.title).toBe(ref.title);
      expect(g.materials).toEqual(ref.materials);
    });
    it("tüm metin alanlarını ve her adımı değiştirir", () => {
      const g = adapter.genericCandidate(ref) as typeof ref;
      for (const k of ["introduction", "watchFor", "celebration", "expertNotes", "adaptations"] as const) expect(g[k], k).not.toBe(ref[k]);
      expect(g.steps.every((s, i) => s.instruction !== ref.steps[i]!.instruction && s.tip === "")).toBe(true);
    });
    it("tek adımlı kısa çıktıda da yasak kalıplar sabit alanlardan gelir (6 kalıbın hepsi)", () => {
      const kisa = { ...ref, steps: ref.steps.slice(0, 1) };
      expect(yasakKalip(metinler(adapter.genericCandidate(kisa)).join("\n")).found.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe("dayanıklılık: null adım", () => {
    const bozuk = { ...ref, steps: [null, { stepNumber: 2, instruction: "Bekleyebilirsiniz.", tip: "" }, "metin"], materials: [null] };
    it("checks çökmez (fabrika ortak kontrolleri dahil)", () => {
      expect(() => adapter.checks({ body, output: bozuk, rawText: JSON.stringify(bozuk), alias: "Hazal" })).not.toThrow();
    });
    it("renderForJudge çökmez; numarasız adım sırayla numaralanır", () => {
      let t = "";
      expect(() => (t = adapter.renderForJudge(bozuk))).not.toThrow();
      expect(t).toContain("  1. ");
      expect(t).toContain("  2. Bekleyebilirsiniz.");
      expect(() => adapter.genericCandidate(bozuk)).not.toThrow();
    });
    it("çıktı yok: hakem hata metnini görür", () => {
      expect(adapter.renderForJudge(null)).toContain("Çıktı üretilemedi");
    });
  });
});
