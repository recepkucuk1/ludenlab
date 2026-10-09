// apps/hub/evals/tools/atolye/okuma/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { mebHedef } from "@atolye/lib/meb-program";
import { okumaInputSchema } from "@atolye/lib/okuma";
import { describe, expect, it } from "vitest";
import { profilBody } from "../../../lib/adapterFactory";
import { HarnessError, type AtolyeFixture, type CaseDef } from "../../../lib/core";
import { realFirstName, resolveFixture } from "../../../lib/fixtures";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { tempFlow } from "../../../lib/testFlow";
import { bekleyenler, istek, kos, rumuzOku, sonuclar } from "../baglanti";
import { adapter } from "./adapter";
import type { OkumaBody } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<OkumaBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const fikstur = (c: CaseDef<OkumaBody>) => resolveFixture("atolye", c.student) as AtolyeFixture;
const gorev = (id: string) => adapter.renderTask(vaka(id), fikstur(vaka(id)));

/** Tam, kurallara uygun okuma-akıcılık seti; `ad` okuma parçasında geçer. */
const set = (ad = "Arda") =>
  [
    "## 1. Seviyeli okuma parçası", `${ad} sahada top sürer. Kale uzak.`, "",
    "## 2. Hece-ses çalışması", "- ba-be-bi-bo-bu hece zinciri; b ve d kartlarını eşle.", "",
    "## 3. Akıcılık egzersizleri", "- Eşli okuma; zamanlı tur (1 dk).", "",
    "## 4. Kelime dağarcığı desteği", "- kale, saha, top", "",
    "## 5. Akıcılık ölçüm rubriği", "- Kelime/dk: hedef 40", "- Doğruluk %", "- Prozodi: vurgu ve tonlama", "",
    `⚠️ ${TASLAK_NOTU}`,
  ].join("\n");

describe("okuma akıcılık seti adaptörü", () => {
  it("4 vaka, hepsi öğrencili ve fikstürleri çözülür; 4 ortak + 2 araç ölçütü", () => {
    expect(cases.map((c) => c.id)).toEqual(["oku-01", "oku-02", "oku-03", "oku-04"]);
    for (const c of cases) expect(resolveFixture("atolye", c.student)?.id, c.id).toBe(c.student);
    expect(adapter.id).toBe("atolye/okuma");
    expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(["fonolojik_temel", "metin_duzeyi"]);
  });

  it("vaka gövdeleri + fikstür profili rota şemasından geçer; dört düzey de var; MEB kodu geçerli", () => {
    for (const c of cases) {
      expect(okumaInputSchema.safeParse({ ...profilBody(fikstur(c)), ...c.body }).success, c.id).toBe(true);
      if (c.body.mebHedefKod) expect(mebHedef(c.body.mebHedefKod), c.id).toBeDefined();
    }
    expect(cases.map((c) => c.body.okumaDuzeyi)).toEqual(["kelime", "paragraf", "hece", "cumle"]);
  });

  describe("hakem görevi", () => {
    it("oku-01: ürün etiketleriyle okuma satırları, MEB kodu + hedef bloğu; öğrenci bloğu; araca gitmeyenler notu", () => {
      const t = gorev("oku-01");
      expect(t).toContain("- Araç: Okuma akıcılık seti (Atölye)");
      expect(t).toContain("- Çalışma düzeyi: kelime");
      expect(t).toContain("- Hedef akıcılık: 40 doğru kelime/dk");
      expect(t).toContain("- Takılınan desenler: b/d karıştırma; hece birleştirmede yavaşlık");
      expect(t).toContain("- MEB hedef kodu: 3.2.5");
      expect(t).toContain("• 3.2.5.2");
      expect(t).toContain("- Öğrenci: Arda Yılmaz, İlkokul (1–4. sınıf), 8 yaş");
      expect(t).toContain("çalışılan MEB bölümleri ve önceki belgeler araca İLETİLMEDİ");
    });
    it("oku-02: yalnız düzey satırı (boş bağlam, uydurma yok)", () => {
      const t = gorev("oku-02");
      expect(t).toContain("- Çalışma düzeyi: paragraf");
      for (const yok of ["Hedef akıcılık", "Takılınan desenler", "MEB hedef", "İlgi alanları"]) expect(t, yok).not.toContain(yok);
    });
    it("oku-04: 'cümle' etiketi ürünün Türkçe etiketiyle (ASCII 'cumle' değil)", () => {
      const t = gorev("oku-04");
      expect(t).toContain("- Çalışma düzeyi: cümle");
      expect(t).not.toContain("cumle");
    });
  });

  it("fikstürsüz çağrı harness_error; fikstürsüz hakem görevi hata verir", async () => {
    await expect(adapter.invoke(vaka("oku-01").body, null)).rejects.toMatchObject({ failureClass: "harness_error" });
    expect(() => adapter.renderTask(vaka("oku-01"), null)).toThrow(HarnessError);
  });

  describe("gerçek rota (subagent düzeneği: istek yazılır, yanıt okunur) — bağlantı", () => {
    it("4 vakanın hepsi rota şemasından geçer; istekte rumuzlu öğrenci satırı, gerçek ad yok; istek ve profil satırları ürün isteminde AYNEN geçer", async () => {
      const flow = tempFlow("flow-oku-");
      const s = await kos("atolye/okuma", flow, cases.map((c) => c.id));
      expect(s).toMatchObject({ done: 0, failed: 0, pending: 4 });
      const rows = bekleyenler(s.pendingPath);
      for (const c of cases) {
        const { md } = istek(rows, c.id);
        expect(md, c.id).toContain("ÖĞRENCİ PROFİLİ");
        expect(md, c.id).toContain("İSTENEN YAPI (Markdown, sırayla)");
        expect(rumuzOku(md), c.id).toBeTruthy();
        expect(md, c.id).not.toContain(realFirstName(fikstur(c)));
        const satirlar = adapter.renderTask(c, fikstur(c)).split("\n").filter((l) => /^- (Çalışma düzeyi|Hedef akıcılık|Takılınan desenler|Güçlük profili|Güçlük düzeyi|Güçlü yönler|İlgi alanları): /.test(l));
        expect(satirlar.length, c.id).toBeGreaterThanOrEqual(2);
        for (const l of satirlar) expect(md, `${c.id}: ${l}`).toContain(l);
        if (c.body.mebHedefKod) expect(md, c.id).toContain("MEB HEDEF HİZALAMASI");
        else expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI");
      }
    });

    it("oku-01: yanıt → puanlar (İngilizce aktarma yok, rubrik, prozodi); rumuz sızıntısı yok", async () => {
      const flow = tempFlow("flow-oku1-");
      let s = await kos("atolye/okuma", flow, ["oku-01"]);
      const { md, row } = istek(bekleyenler(s.pendingPath), "oku-01");
      writeFileSync(row.responseTxt, set(rumuzOku(md)!));
      s = await kos("atolye/okuma", flow, ["oku-01"]);
      expect(s).toMatchObject({ done: 1, failed: 0, pending: 0 });
      const r = sonuclar(s.resultsPath)[0]!;
      expect(r.hard_fail).toEqual([]);
      expect(r.grade).toMatchObject({ talimat: 1, fonik_yok: 1, rubrik: 1, prozodi: 1, rumuz_yok: 1, dil_kurali: 1 });
    });
  });

  describe("kontroller fabrika üzerinden", () => {
    const calistir = (text: string, alias: string | null = "Doruk") => adapter.checks({ body: vaka("oku-01").body, output: text, rawText: text, alias });
    it("iyi çıktı: sert hata yok, talimat 1", () => {
      const r = calistir(set());
      expect(r.hard_fail).toEqual([]);
      expect(r.scores).toMatchObject({ talimat: 1, fonik_yok: 1, rubrik: 1, prozodi: 1 });
      expect(r.details).toMatchObject({ yapi: 1, taslak_sonda: 1, tani_cumlesi: 0 });
    });
    it.each(["Seviyeli okuma parçası", "Hece-ses çalışması", "Akıcılık egzersizleri", "Kelime dağarcığı desteği", "Akıcılık ölçüm rubriği"])("istenen bölüm eksik (%s): yapı 4/5, talimat düşer", (bolum) => {
      const metin = set().split("\n").map((l) => (l.startsWith("## ") && l.endsWith(bolum) ? "## Zzz" : l)).join("\n");
      const r = calistir(metin);
      expect(r.details.yapi).toBeCloseTo(4 / 5);
      expect(r.scores.talimat).toBeLessThan(1);
    });
    it("sight words + rubriksiz: talimat düşer, sert hata yok", () => {
      const kotu = set().replace("- Kelime/dk: hedef 40\n- Doğruluk %\n- Prozodi: vurgu ve tonlama", "- Anlama").replace("kale, saha, top", "Sight words listesi");
      const r = calistir(kotu);
      expect(r.scores).toMatchObject({ fonik_yok: 0, rubrik: 0, prozodi: 0 });
      expect(r.scores.talimat).toBeLessThan(0.7);
      expect(r.hard_fail).toEqual([]);
    });
    it("taslak notu yok / rumuz sızıntısı: sert hata; çıktı yok: talimat 0", () => {
      expect(calistir(set().replace(`⚠️ ${TASLAK_NOTU}`, "")).hard_fail).toContain("taslak_notu_yok");
      expect(calistir(set("Doruk")).hard_fail).toContain("rumuz_sizintisi");
      const r = adapter.checks({ body: vaka("oku-01").body, output: null, rawText: "", alias: null });
      expect(r.hard_fail).toContain("cikti_yok");
      expect(r.scores.talimat).toBe(0);
    });
  });

  describe("hakem çizimi", () => {
    it("çıktı olduğu gibi gider; boşsa hata metni", () => {
      expect(adapter.renderForJudge(set())).toBe(set());
      expect(adapter.renderForJudge(" ")).toContain("Çıktı üretilemedi");
    });
  });

  describe("jenerik aday", () => {
    it("≥ 4 yasak kalıp taşır, referanstan farklı; başlıklar ve taslak notu korunur; rubrik ölçütleri kalmaz", () => {
      const g = adapter.genericCandidate(set()) as string;
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(set()));
      for (const h of ["## 2. Hece-ses çalışması", "## 5. Akıcılık ölçüm rubriği", `⚠️ ${TASLAK_NOTU}`]) expect(g.split("\n"), h).toContain(h);
      const r = adapter.checks({ body: vaka("oku-01").body, output: g, rawText: g, alias: null });
      expect(r.scores).toMatchObject({ rubrik: 0, prozodi: 0 });
      expect(r.hard_fail).toEqual([]);
    });
    it("boş çıktıda çökmez", () => {
      expect(adapter.genericCandidate("")).toBe("");
      expect(() => adapter.genericCandidate(null)).not.toThrow();
    });
  });
});
