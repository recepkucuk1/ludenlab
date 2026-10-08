// apps/hub/evals/tools/studio/social-story/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { socialStoryChecks } from "./checks";

const good = {
  title: "Tabletten ayrılma zamanı",
  sentences: [
    { type: "descriptive", text: "Akşam yemeğinden önce tablet saati biter.", visualPrompt: "a child putting a tablet on a shelf" },
    { type: "descriptive", text: "Annem 'son beş dakika' der ve tren kartını gösterir.", visualPrompt: "a mother showing a train picture card" },
    { type: "perspective", text: "Annem benim sakin kalmama sevinir.", visualPrompt: "a smiling mother" },
    { type: "directive", text: "Kartı görünce tableti rafa koymayı deneyebilirim.", visualPrompt: "a child placing a tablet on a shelf" },
  ],
  expertNotes: "Son beş dakika uyarısını tren kartıyla eşleyin; kulak kapama görülürse sesi kısın.",
  homeGuidance: "Her akşam aynı sırayla: kart, beş dakika, raf.",
};

describe("sosyal hikâye kontrolleri", () => {
  it("iyi çıktıda talimat ≈ 1, sert hata yok", () => {
    const r = socialStoryChecks({ body: { situation: "x", environment: "Ev", length: "short" }, output: good, rawText: JSON.stringify(good), alias: "Defne" });
    expect(r.hard_fail).toEqual([]);
    expect(r.scores.talimat).toBeGreaterThan(0.95);
    expect(r.scores.dil_kurali).toBe(1);
    expect(r.scores.rumuz_yok).toBe(1);
    expect(r.details.tanimlayici_oran).toBe(0.5);
  });

  it("cümle sayısı bütçe dışı, tip hatalı, görsel boş, terapist dili → sert hatalar", () => {
    const bad = {
      ...good,
      sentences: [{ type: "command", text: "Terapist der ki: Defne tableti bırakmalısın, ödül alırsın.", visualPrompt: "" }],
    };
    const r = socialStoryChecks({ body: { situation: "x", environment: "Ev", length: "medium" }, output: bad, rawText: JSON.stringify(bad), alias: "Defne" });
    expect(r.hard_fail).toContain("cumle_sayisi_1");
    expect(r.hard_fail).toContain("dil_kurali");
    expect(r.hard_fail).toContain("rumuz_sizintisi");
    expect(r.scores.talimat).toBeLessThan(0.5);
  });

  it("JSON çözülemezse json_gecersiz", () => {
    const r = socialStoryChecks({ body: { situation: "x", environment: "Ev", length: "short" }, output: null, rawText: "Üzgünüm.", alias: null });
    expect(r.hard_fail).toContain("json_gecersiz");
    expect(r.scores.talimat).toBe(0);
  });
});
