// apps/hub/evals/tools/studio/homework/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { homeworkChecks, type HomeworkBody } from "./checks";

const body: HomeworkBody = { targetArea: "üç kelimeli istek", duration: "15", parentLevel: "basic", materialType: "exercise" };
const ok = {
  title: "Su istiyorum", introduction: "Bu hafta evde...", materials: ["su bardağı"],
  steps: [
    { stepNumber: 1, instruction: "Bardağı gösterebilirsiniz.", tip: "" },
    { stepNumber: 2, instruction: "Birkaç saniye bekleyebilirsiniz.", tip: "5 sn" },
    { stepNumber: 3, instruction: "Cümleyi tekrar edebilirsiniz.", tip: "" },
  ],
  watchFor: "Göz teması", celebration: "Alkışlayın", frequency: "Günde 1", expertNotes: "—", adaptations: "—",
};
const step = (n: number, instruction: string, tip = "") => ({ stepNumber: n, instruction, tip });
const run = (out: unknown, b: HomeworkBody = body) => homeworkChecks({ body: b, output: out, raw: null, text: "", alias: "Hazal" });

describe("homeworkChecks", () => {
  it("tam materyal: tüm puanlar 1", () => {
    const r = homeworkChecks({ body, output: ok, raw: ok, text: "", alias: "Hazal" });
    expect(r.scores).toMatchObject({ adim_sayisi: 1, adim_sira: 1, materyal: 1, alanlar: 1, oneri_kipi: 1, teknik_terim: 1, talimat: 1 });
    expect(r.hard).toEqual([]);
    expect(r.details.adim).toBe(3);
  });
  it("temel düzeyde teknik terim ve zorunluluk kipi düşürür; adım sırası bozuksa 0", () => {
    const out = { ...ok, introduction: "Fonolojik farkındalık için artikülasyon çalışması.", steps: [step(2, "Yapmalısınız."), step(1, "Bardağı gösterebilirsiniz."), step(3, "Cümleyi tekrar edebilirsiniz.")] };
    const r = homeworkChecks({ body, output: out, raw: out, text: "", alias: "Hazal" });
    expect(r.scores.teknik_terim).toBe(0);
    expect(r.scores.adim_sira).toBe(0);
    expect(r.scores.oneri_kipi).toBeCloseTo(2 / 3);
  });
  it("adım yoksa sert hata", () => {
    const out = { ...ok, steps: [] };
    expect(homeworkChecks({ body, output: out, raw: out, text: "", alias: null }).hard).toContain("adim_yok");
  });

  it("oneri_kipi: emir kipi öneri sayılmaz; öneri biçimiyle birlikte zorunluluk kipi de 0; 'isterseniz' öneridir", () => {
    const emir = run({ ...ok, steps: [step(1, "Gösterin."), step(2, "Bekleyin."), step(3, "Tekrar edin.")] });
    expect(emir.scores.oneri_kipi).toBe(0);
    const karma = run({ ...ok, steps: [step(1, "Gösterebilirsiniz ama beklemelisiniz."), step(2, "İsterseniz tekrar edebilirsiniz."), step(3, "Gösterin.")] });
    expect(karma.scores.oneri_kipi).toBeCloseTo(1 / 3);
    // "isterseniz" tek başına öneri biçimidir (emir fiili olsa da zorunluluk kipi değil).
    expect(run({ ...ok, steps: [step(1, "Bardağı isterseniz masaya koyun."), step(2, "Gösterin."), step(3, "Bekleyin.")] }).scores.oneri_kipi).toBeCloseTo(1 / 3);
    // Öneri biçimi kelime sonunda olmalı: "yapabilirsin" (tekil) ya da "bilirim" öneri sayılmaz.
    expect(run({ ...ok, steps: [step(1, "Sen yapabilirsin."), step(2, "Kitabı bilirim."), step(3, "Gösterebilirsiniz.")] }).scores.oneri_kipi).toBeCloseTo(1 / 3);
  });
  it("adim_sayisi: 3 ve üstü 1, 2 adım 0", () => {
    expect(run({ ...ok, steps: ok.steps.slice(0, 2) }).scores.adim_sayisi).toBe(0);
    expect(run({ ...ok, steps: ok.steps.slice(0, 2) }).hard).toEqual([]);
    expect(run(ok).scores.adim_sayisi).toBe(1);
    expect(run({ ...ok, steps: [...ok.steps, step(4, "Kutlayabilirsiniz.")] }).scores.adim_sayisi).toBe(1);
  });
  it("materyal: dizi (boş bile) 1; dizi değilse ya da yoksa 0 ('varsa' kuralı)", () => {
    expect(run({ ...ok, materials: [] }).scores.materyal).toBe(1);
    expect(run({ ...ok, materials: "su bardağı" }).scores.materyal).toBe(0);
    expect(run({ ...ok, materials: undefined }).scores.materyal).toBe(0);
    expect(run({ ...ok, materials: null }).scores.materyal).toBe(0);
  });
  it("teknik_terim: yalnız temel düzeyde sayılır; adaptations ve frequency de taranır, expertNotes taranmaz", () => {
    const teknik = { ...ok, introduction: "Fonolojik farkındalık çalışması." };
    expect(run(teknik).scores.teknik_terim).toBe(0);
    expect(run(teknik, { ...body, parentLevel: "detailed" }).scores.teknik_terim).toBe(1);
    expect(run({ ...ok, adaptations: "Velar sesleri önce kolay kelimelerle deneyin." }).scores.teknik_terim).toBe(0);
    expect(run({ ...ok, frequency: "Haftada 3 kez, minimal çift çalışması." }).scores.teknik_terim).toBe(0);
    expect(run({ ...ok, steps: [...ok.steps, step(4, "Öne alma sürecini gözleyebilirsiniz.")] }).scores.teknik_terim).toBe(0);
    expect(run({ ...ok, introduction: "Çocuğunuz ifade edici dil çalışıyor." }).scores.teknik_terim).toBe(0);
    expect(run({ ...ok, expertNotes: "Fonolojik süreç: öne alma; velar ses." }).scores.teknik_terim).toBe(1);
  });
  it("çıktı yok: varsayılan-1 alt puanlar dahil hepsi 0, talimat 0", () => {
    const r = run(null);
    expect(r.scores).toMatchObject({ adim_sayisi: 0, adim_sira: 0, materyal: 0, alanlar: 0, oneri_kipi: 0, teknik_terim: 0, talimat: 0 });
    expect(r.hard).toEqual([]); // çıktı yokluğunu fabrika `cikti_yok` ile işaretler
  });
  it("null ya da nesne olmayan adım çökmez; öğe sayılır, sıra bozuk sayılır", () => {
    const r = run({ ...ok, steps: [null, "metin", step(3, "Gösterebilirsiniz.")] });
    expect(r.details.adim).toBe(3);
    expect(r.scores.adim_sayisi).toBe(1);
    expect(r.scores.adim_sira).toBe(0);
    expect(r.scores.oneri_kipi).toBeCloseTo(1 / 3);
  });
});
