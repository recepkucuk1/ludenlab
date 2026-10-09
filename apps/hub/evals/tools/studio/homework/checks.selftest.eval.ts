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
