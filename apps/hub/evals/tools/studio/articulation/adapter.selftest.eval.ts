// apps/hub/evals/tools/studio/articulation/adapter.selftest.eval.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CaseDef, StudioFixture } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { adapter, articulationCfg } from "./adapter";
import { bankaKelimeleri, type ArticulationBody } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<ArticulationBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const base = { title: "T", expertNotes: "Not", cueTypes: ["görsel"], homeGuidance: "Evde" };

describe("artikülasyon adaptörü", () => {
  it("16 vaka, fikstürler çözülür; 4 ortak + 5 araç ölçütü", () => {
    expect(cases.map((c) => c.id)).toEqual(Array.from({ length: 16 }, (_, k) => `art-${String(k + 1).padStart(2, "0")}`));
    for (const c of cases) expect(resolveFixture("studio", c.student)?.id ?? null).toBe(c.student);
    expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(["hedef_ses", "dil_yas", "uzman_notlari", "ev_rehberi", "hata_yok"]);
  });

  it("seedKey ve banka: art-13 eski düzenekle (ve gerçek Sonnet 4.6 referansıyla) aynı kelimeler", () => {
    const b = vaka("art-13").body;
    expect(articulationCfg.seedKey!(b)).toBe('[["/l/"],["initial"],15]');
    // Dönüştürülen referansın output.items[].word dizisi (2026-10-09'da bir kez karşılaştırıldı, burada sabit).
    expect(bankaKelimeleri(b)).toEqual(["lapa", "lale", "lokma", "lor", "leke", "lahana", "leylek", "lastik", "lavabo", "lamba", "limon", "liste"]);
    expect(bankaKelimeleri(vaka("art-08").body)).toHaveLength(19); // /j/ bankası istenen 25'ten kısa
  });

  it("boş kelime düzeyi çıktı: öğrencisiz (alias null) oge_yok, öğrencili (banka kaybı) sert hata yok", () => {
    const out = { ...base, items: [] };
    const raw = JSON.stringify(out);
    const b = vaka("art-07").body;
    expect(adapter.checks({ body: b, output: out, rawText: raw, alias: null }).hard_fail).toContain("oge_yok");
    expect(adapter.checks({ body: b, output: out, rawText: raw, alias: "Hazal" }).hard_fail).toEqual([]);
  });

  describe("hakem görevi", () => {
    it("banka düzeyinde banka listesi; ürün hatası cümlesi yalnız öğrencili vakada", () => {
      const c = vaka("art-13");
      const t = adapter.renderTask(c, null);
      expect(t).toContain("- Banka kelimeleri (12): lapa, lale, lokma");
      expect(t).toContain("listeden sapmıştır");
      expect(t).not.toContain("ürün hatası");
      const z = vaka("art-07");
      const tz = adapter.renderTask(z, resolveFixture("studio", z.student) as StudioFixture);
      expect(tz).toContain("bilinen ürün hatası");
      expect(tz).toContain("boş öğe listesi beklenen davranıştır");
      expect(tz).toMatch(/- Banka kelimeleri \(15\): /);
    });
    it("izole/hece düzeyinde banka satırı yok; bankada olmayan seste 'banka yok' satırı", () => {
      expect(adapter.renderTask(vaka("art-01"), resolveFixture("studio", "art-kerem"))).not.toContain("Banka");
      const yok: CaseDef<ArticulationBody> = { ...vaka("art-13"), body: { ...vaka("art-13").body, targetSounds: ["/x/"] } };
      expect(adapter.renderTask(yok, null)).toContain("- Banka: bu ses(ler) için banka yok, model kendi kelimelerini üretir");
    });
  });

  describe("hakem çıktısı", () => {
    it("alanlar etiketli, konum Türkçe; cümle/bağlam öğeleri tek tek", () => {
      const t = adapter.renderForJudge({
        ...base, level: "sentence",
        items: [{ word: "kar", syllableBreak: "kar", position: "final", targetSound: "/r/", sentence: "Kar yağdı." }],
      });
      expect(t).toContain("1. kelime: kar · heceleme: kar · konum: sonda · ses: /r/");
      expect(t).toContain("   → metin: Kar yağdı.");
      const h = adapter.renderForJudge({ ...base, level: "syllable", items: [{ word: "ra", syllableType: "açık", exampleWord: "radyo", position: "initial" }] });
      expect(h).toContain("1. kelime: ra · hece türü: açık · örnek: radyo · konum: başta");
    });
    it("kelime düzeyinde dolu liste tek satır (iki adayda aynı); boş liste '(boş)'", () => {
      const its = ["garaj", "jaguar", "pijama"].map((w) => ({ word: w, syllableBreak: w, position: "medial" }));
      const t = adapter.renderForJudge({ ...base, level: "word", items: its });
      expect(t).toContain("Öğeler: bankadan, iki adayda aynı (3 kelime: garaj, jaguar, pijama)");
      expect(t).not.toContain("1. kelime");
      expect(adapter.renderForJudge({ ...base, level: "word", items: [] })).toContain("Öğeler: (boş)");
    });
  });
});
