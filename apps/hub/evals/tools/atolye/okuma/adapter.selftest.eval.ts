// apps/hub/evals/tools/atolye/okuma/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { mebHedef } from "@atolye/lib/meb-program";
import { okumaInputSchema } from "@atolye/lib/okuma";
import { describe, expect, it } from "vitest";
import { profilBody } from "../../../lib/adapterFactory";
import type { AtolyeFixture, CaseDef } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { atolyeAdapterSuite } from "../baglanti";
import { adapter } from "./adapter";
import { OKUMA_BOLUM_LISTESI, type OkumaBody } from "./checks";

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

atolyeAdapterSuite(adapter, {
  idler: ["oku-01", "oku-02", "oku-03", "oku-04"],
  olcutler: ["fonolojik_temel", "metin_duzeyi"],
  ornek: set,
  iyiPuanlar: { talimat: 1, fonik_yok: 1, rubrik: 1, prozodi: 1 },
  istekEtiketleri: /^- (Çalışma düzeyi|Hedef akıcılık|Takılınan desenler|Güçlük profili|Güçlük düzeyi|Güçlü yönler|İlgi alanları): /,
  istemParcalari: ["ÖĞRENCİ PROFİLİ", "İSTENEN YAPI (Markdown, sırayla)"],
  bolumler: ["Seviyeli okuma parçası", "Hece-ses çalışması", "Akıcılık egzersizleri", "Kelime dağarcığı desteği", "Akıcılık ölçüm rubriği"],
  istekEk(md, c) {
    if (c.body.mebHedefKod) expect(md, c.id).toContain("MEB HEDEF HİZALAMASI");
    else expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI");
  },
});

describe("okuma akıcılık seti adaptörü — araca özgü", () => {
  it("vaka gövdeleri + fikstür profili rota şemasından geçer; dört düzey de var; MEB kodu geçerli", () => {
    for (const c of cases) {
      expect(okumaInputSchema.safeParse({ ...profilBody(fikstur(c)), ...c.body }).success, c.id).toBe(true);
      if (c.body.mebHedefKod) expect(mebHedef(c.body.mebHedefKod), c.id).toBeDefined();
    }
    expect(cases.map((c) => c.body.okumaDuzeyi)).toEqual(["kelime", "paragraf", "hece", "cumle"]);
  });

  it("bölüm regex'leri tek kaynak: 5 bölüm; 'rubriği' ve 'ölçüm/ölçme' rubrik bölümü, 'akıcılık egzersiz/çalışma/etkinlik' egzersiz bölümü", () => {
    expect(OKUMA_BOLUM_LISTESI).toHaveLength(5);
    const [parca, hece, egzersiz, sozcuk, rubrik] = OKUMA_BOLUM_LISTESI as [RegExp, RegExp, RegExp, RegExp, RegExp];
    for (const h of ["akıcılık ölçüm rubriği", "rubrik", "ölçme", "akıcılık değerlendirme rubriği"]) expect(rubrik.test(h), h).toBe(true);
    for (const h of ["akıcılık egzersizleri", "akıcılık çalışmaları", "akıcılık etkinlikleri"]) expect(egzersiz.test(h), h).toBe(true);
    expect(egzersiz.test("akıcılık ölçüm rubriği")).toBe(false);
    expect(hece.test("hece ses çalışması")).toBe(true); // "Hece-ses": tire boşluğa dönüşür
    expect(parca.test("seviyeli okuma parçası")).toBe(true);
    expect(sozcuk.test("kelime dağarcığı desteği")).toBe(true);
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
    it("hedef davranış kodları verilen gövdede yalnız işaretliler hakem görevine girer", () => {
      const c = { ...vaka("oku-01"), body: { ...vaka("oku-01").body, mebDavranisKodlari: ["3.2.5.1"] } };
      const t = adapter.renderTask(c, fikstur(c));
      expect(t).toContain("• 3.2.5.1");
      expect(t).not.toContain("• 3.2.5.2");
    });
  });

  describe("kontroller fabrika üzerinden", () => {
    const calistir = (text: string) => adapter.checks({ body: vaka("oku-01").body, output: text, rawText: text, alias: "Doruk" });
    it("karşıtlık / olumsuzlama ('farklı olarak', 'aktarılmamıştır'): talimat 1", () => {
      const t = set().replace("- ba-be-bi-bo-bu hece zinciri; b ve d kartlarını eşle.", "- İngilizcedeki phonics yaklaşımından farklı olarak hece zinciri kullanılır; sight words aktarılmamıştır.");
      expect(calistir(t).scores).toMatchObject({ talimat: 1, fonik_yok: 1 });
    });
    it("sight words + rubriksiz: talimat düşer, sert hata yok", () => {
      const kotu = set().replace("- Kelime/dk: hedef 40\n- Doğruluk %\n- Prozodi: vurgu ve tonlama", "- Anlama").replace("kale, saha, top", "Sight words listesi hazırlayın");
      const r = calistir(kotu);
      expect(r.scores).toMatchObject({ fonik_yok: 0, rubrik: 0, prozodi: 0 });
      expect(r.scores.talimat).toBeLessThan(0.7);
      expect(r.hard_fail).toEqual([]);
    });
    it("'Doğru okuma %' doğruluk sayılır", () => {
      expect(calistir(set().replace("- Doğruluk %", "- Doğru okuma %")).scores.rubrik).toBe(1);
    });
  });

  describe("jenerik aday", () => {
    it("rubrik ölçütleri kalmaz (içerik jenerik)", () => {
      const g = adapter.genericCandidate(set()) as string;
      expect(adapter.checks({ body: vaka("oku-01").body, output: g, rawText: g, alias: null }).scores).toMatchObject({ rubrik: 0, prozodi: 0 });
    });
  });
});
