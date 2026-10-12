// apps/hub/evals/tools/studio/social-story/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { yasakKalip } from "../../../lib/sharedChecks";
import { adapter } from "./adapter";
import type { SocialStoryBody } from "./checks";

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

type Sent = { type: string; text: string; visualPrompt: string };
const D: Sent = { type: "descriptive", text: "Akşam yemeğinden önce tablet saati biter.", visualPrompt: "a clock near a dinner table" };
const P: Sent = { type: "perspective", text: "Annem benim sakin kalmama sevinir.", visualPrompt: "a smiling mother" };
const DIR: Sent = { type: "directive", text: "Kartı görünce tableti rafa koymayı deneyebilirim.", visualPrompt: "a child placing a tablet on a shelf" };

function run(sentences: Sent[], length: SocialStoryBody["length"]) {
  const story = { ...good, sentences };
  return adapter.checks({ body: { situation: "x", environment: "Ev", length }, output: story, rawText: JSON.stringify(story), alias: "Defne" });
}

describe("sosyal hikâye kontrolleri", () => {
  it("iyi çıktıda talimat ≈ 1, sert hata yok", () => {
    const r = adapter.checks({ body: { situation: "x", environment: "Ev", length: "short" }, output: good, rawText: JSON.stringify(good), alias: "Defne" });
    expect(r.hard_fail).toEqual([]);
    expect(r.scores.talimat).toBeGreaterThan(0.95);
    expect(r.scores.dil_kurali).toBe(1);
    expect(r.scores.rumuz_yok).toBe(1);
    expect(r.details.tanimlayici_oran).toBe(0.5);
    expect(r.details.gray_orani_ok).toBe(1);
    expect(r.details.zorunlu_toplam).toBe(0);
  });

  it("cümle sayısı bütçe dışı, tip hatalı, görsel boş, terapist dili → sert hatalar", () => {
    const bad = {
      ...good,
      sentences: [{ type: "command", text: "Terapist der ki: Defne tableti bırakmalısın, ödül alırsın.", visualPrompt: "" }],
    };
    const r = adapter.checks({ body: { situation: "x", environment: "Ev", length: "medium" }, output: bad, rawText: JSON.stringify(bad), alias: "Defne" });
    expect(r.hard_fail).toContain("cumle_sayisi");
    expect(r.details.cumle).toBe(1);
    expect(r.hard_fail).toContain("dil_kurali");
    expect(r.hard_fail).toContain("rumuz_sizintisi");
    // 4/7: yönlendirici yok → Gray oranı ve yönlendirici dili boşta 1; sayı, tip, görsel 0.
    expect(r.scores.talimat).toBeCloseTo(4 / 7);
  });

  it("cümle sayısı: bütçe içi geçer, ±1 yalnız puanı düşürür, fazlası sert hata", () => {
    const orta = run([D, D, P, D, DIR, D, P, D], "medium");
    expect(orta.hard_fail).toEqual([]);
    expect(orta.details.cumle).toBe(8);

    const alti = run([D, D, P, DIR, D, P], "short");
    expect(alti.hard_fail).toEqual([]);
    expect(alti.scores.talimat).toBeLessThan(1);

    const yedi = run([D, D, P, DIR, D, P, D], "short");
    expect(yedi.hard_fail).toContain("cumle_sayisi");
  });

  it("zorunluluk kipi: yönlendiricide yönlendirici_dil 0, tüm cümlelerde zorunlu_toplam sayılır", () => {
    const r = run([D, D, P, { ...DIR, text: "Tableti rafa koymalısın." }], "short");
    expect(r.details.yonlendirici_dil).toBe(0);
    expect(r.details.zorunlu_toplam).toBe(1);

    const betimde = run([D, { ...D, text: "Akşamları tableti kapatmak gerekir." }, P, DIR], "short");
    expect(betimde.details.yonlendirici_dil).toBe(1);
    expect(betimde.details.zorunlu_toplam).toBe(1);
  });

  it("Gray oranı: betimleyici ≥ 2 × yönlendirici", () => {
    expect(run([D, D, DIR, DIR], "short").details.gray_orani_ok).toBe(0);
    expect(run([D, P, DIR], "short").details.gray_orani_ok).toBe(1);
  });

  it("JSON dışındaki düzyazı dil/kalıp kontrolüne girmez", () => {
    const rawText = `Terapist olarak hasta için hazırladım; sabırlı olun.\n${JSON.stringify(good)}`;
    const r = adapter.checks({ body: { situation: "x", environment: "Ev", length: "short" }, output: good, rawText, alias: "Defne" });
    expect(r.scores.dil_kurali).toBe(1);
    expect(r.details.yasak_kalip).toBe("");
  });

  it("satır başındaki sözcük de yakalanır: 'Okuma sırası:\\nTerapist ...'", () => {
    const story = { ...good, expertNotes: "Okuma sırası:\nTerapist hikâyeyi okur." };
    const r = adapter.checks({ body: { situation: "x", environment: "Ev", length: "short" }, output: story, rawText: JSON.stringify(story), alias: "Defne" });
    expect(r.hard_fail).toContain("dil_kurali");
    expect(r.details.terapist).toBe(1);
  });

  it("'konuşma terapistinizle' Studio'da muaf DEĞİL: okuyucu terapisttir, istemler 'terapist'i yasaklar", () => {
    const story = { ...good, homeGuidance: "Konuşma terapistinizle birlikte okuyun." };
    const r = adapter.checks({ body: { situation: "x", environment: "Ev", length: "short" }, output: story, rawText: JSON.stringify(story), alias: "Defne" });
    expect(r.details.terapist).toBe(1);
    expect(r.hard_fail).toContain("dil_kurali");
  });

  it("JSON çözülemezse json_gecersiz", () => {
    const r = adapter.checks({ body: { situation: "x", environment: "Ev", length: "short" }, output: null, rawText: "Üzgünüm.", alias: null });
    expect(r.hard_fail).toContain("json_gecersiz");
    expect(r.scores.talimat).toBe(0);
  });

  it("jenerik aday: cümle sayısı korunur, en az 4 yasak kalıp içerir", () => {
    const cand = adapter.genericCandidate(good) as { sentences: unknown[] };
    expect(cand.sentences).toHaveLength(good.sentences.length);
    expect(yasakKalip(JSON.stringify(cand)).found.length).toBeGreaterThanOrEqual(4);
  });
});
