// apps/hub/evals/tools/atolye/materyal/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { mebHedef, mebToPrompt } from "@atolye/lib/meb-program";
import { materyalInputSchema } from "@atolye/lib/materyal";
import { describe, expect, it } from "vitest";
import { profilBody } from "../../../lib/adapterFactory";
import { HarnessError, type AtolyeFixture, type CaseDef } from "../../../lib/core";
import { realFirstName, resolveFixture } from "../../../lib/fixtures";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { tempFlow } from "../../../lib/testFlow";
import { bekleyenler, istek, kos, rumuzOku, sonuclar } from "../baglanti";
import { adapter } from "./adapter";
import type { MateryalBody } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<MateryalBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const fikstur = (c: CaseDef<MateryalBody>) => resolveFixture("atolye", c.student) as AtolyeFixture;
const gorev = (id: string) => adapter.renderTask(vaka(id), fikstur(vaka(id)));

/** Tam, kurallara uygun çok duyulu materyal. `varyantlar`: sunulan zorluk düzeyleri; `anahtar`: cevap anahtarı bölümü; `ad` uygulama yönergesinde geçer. */
const materyal = (opts: { ad?: string; varyantlar?: string[]; anahtar?: boolean } = {}) => {
  const { ad = "Zeynep", varyantlar = ["Kolay", "Orta"], anahtar = true } = opts;
  return [
    "## 1. Başlık ve hedeflenen kazanım", "- **b–d harf biçimleri**: harfin yönünü ayırt eder.", "",
    "## 2. Öğretmen için uygulama yönergesi", `- Görsel: renkli b/d kartı; işitsel: sesi söyletin; dokunsal: ${ad} kum tepsisine parmakla yazar.`, "",
    "## 3. Materyal gövdesi", "- Kabartma harf şablonu (yalnız metinle tarif): b için karın sağda.", "- Az yazma: yalnız halkayı işaretleme.", "",
    "## 4. Zorluk varyantları", ...varyantlar.flatMap((v) => [`### ${v}`, `- ${v} düzey görevleri`]), "",
    "## 5. Sınıf-içi farklılaştırma / uyarlama notları", "- Geniş satır aralığı; gerekirse yazı yerine eşleştirme.", "",
    ...(anahtar ? ["## 6. Cevap anahtarı", "1. b", "2. d", "3. b", ""] : []),
    `⚠️ ${TASLAK_NOTU}`,
  ].join("\n");
};

describe("çok duyulu materyal adaptörü", () => {
  it("4 vaka, hepsi öğrencili ve fikstürleri çözülür; 4 ortak + 2 araç ölçütü", () => {
    expect(cases.map((c) => c.id)).toEqual(["mtr-01", "mtr-02", "mtr-03", "mtr-04"]);
    for (const c of cases) expect(resolveFixture("atolye", c.student)?.id, c.id).toBe(c.student);
    expect(adapter.id).toBe("atolye/materyal");
    expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(["cok_duyulu_somutluk", "uretilebilirlik"]);
  });

  it("vaka gövdeleri + fikstür profili rota şemasından geçer; dört tür, üç varyant seçeneği, iki yönlü cevap anahtarı; MEB kodu geçerli ve konuyla uyumlu", () => {
    for (const c of cases) {
      expect(materyalInputSchema.safeParse({ ...profilBody(fikstur(c)), ...c.body }).success, c.id).toBe(true);
      if (c.body.mebHedefKod) expect(mebHedef(c.body.mebHedefKod), c.id).toBeDefined();
    }
    expect(cases.map((c) => c.body.materyalTuru)).toEqual(["calisma_yapragi", "okuma_metni", "alistirma", "etkinlik"]);
    expect(cases.map((c) => c.body.zorlukVaryanti)).toEqual(["kolay_orta", "tek", "kolay_orta_ileri", "tek"]);
    expect(cases.map((c) => c.body.cevapAnahtari)).toEqual([true, false, true, true]);
    // mtr-03 "Onluk bozarak çıkarma" → 5.1.16 (Doğal sayılarla ÇIKARMA işlemi yapar; 5.1.14 toplamadır)
    expect(vaka("mtr-03").body.mebHedefKod).toBe("5.1.16");
    expect(mebHedef("5.1.16")!.metin).toContain("çıkarma");
    expect(mebHedef("5.1.16")!.hedefDavranislar.some((d) => d.metin.includes("onluk bozarak"))).toBe(true);
  });

  describe("hakem görevi", () => {
    it("mtr-01: ürün etiketleriyle dört materyal satırı; öğrenci bloğu; araca gitmeyenler notu", () => {
      const t = gorev("mtr-01");
      expect(t).toContain("- Araç: Çok duyulu materyal (Atölye)");
      expect(t).toContain("- Tür: çalışma yaprağı");
      expect(t).toContain("- Konu/beceri: b–d harf biçimleri ve yönü");
      expect(t).toContain("- Zorluk varyantı: kolay + orta");
      expect(t).toContain("- Cevap anahtarı: evet");
      expect(t).toContain("- Öğrenci: Zeynep Kocaman, İlkokul (1–4. sınıf), 9 yaş");
      expect(t).toContain("- Güçlük profili: Disgrafi (yazma güçlüğü)");
      expect(t).toContain("İlgi alanları: Resim çizmek, hayvanlar (özellikle atlar)");
      expect(t).toContain("çalışılan MEB bölümleri ve önceki belgeler araca İLETİLMEDİ");
      expect(t).not.toContain("MEB hedef");
    });
    it("MEB davranış kodları verilirse hakem görevine yalnız onlar girer", () => {
      const c = { ...vaka("mtr-03"), body: { ...vaka("mtr-03").body, mebDavranisKodlari: ["5.1.16.8"] } };
      const t = adapter.renderTask(c, fikstur(c));
      expect(t).toContain("• 5.1.16.8 ");
      expect(t).not.toContain("• 5.1.16.15 ");
      expect(t).toContain(mebToPrompt({ hedefKod: "5.1.16", davranisKodlari: ["5.1.16.8"] })!);
    });
    it("mtr-02: tek düzey, cevap anahtarı hayır", () => {
      const t = gorev("mtr-02");
      expect(t).toContain("- Tür: okuma metni");
      expect(t).toContain("- Zorluk varyantı: tek düzey");
      expect(t).toContain("- Cevap anahtarı: hayır");
    });
    it("mtr-03: üç varyant + MEB kodu ve hedef bloğu (çıkarma); mtr-04: etkinlik, okul öncesi", () => {
      const t = gorev("mtr-03");
      expect(t).toContain("- Zorluk varyantı: kolay + orta + ileri");
      expect(t).toContain("- MEB hedef kodu: 5.1.16");
      expect(t).toContain(mebToPrompt({ hedefKod: "5.1.16", davranisKodlari: [] })!);
      expect(gorev("mtr-04")).toContain("- Tür: etkinlik");
      expect(gorev("mtr-04")).toContain("Okul öncesi (4–6 yaş), 5 yaş");
    });
  });

  it("fikstürsüz çağrı harness_error; fikstürsüz hakem görevi hata verir", async () => {
    await expect(adapter.invoke(vaka("mtr-01").body, null)).rejects.toMatchObject({ failureClass: "harness_error" });
    expect(() => adapter.renderTask(vaka("mtr-01"), null)).toThrow(HarnessError);
  });

  describe("gerçek rota (subagent düzeneği: istek yazılır, yanıt okunur) — bağlantı", () => {
    it("4 vakanın hepsi rota şemasından geçer; istekte rumuzlu öğrenci satırı, gerçek ad yok; istek ve profil satırları ürün isteminde AYNEN geçer; anahtar kuralı", async () => {
      const flow = tempFlow("flow-mtr-");
      const s = await kos("atolye/materyal", flow, cases.map((c) => c.id));
      expect(s).toMatchObject({ done: 0, failed: 0, pending: 4 });
      const rows = bekleyenler(s.pendingPath);
      for (const c of cases) {
        const { md } = istek(rows, c.id);
        expect(md, c.id).toContain("ÖĞRENCİ PROFİLİ");
        expect(md, c.id).toContain("İSTENEN YAPI (Markdown, sırayla)");
        expect(rumuzOku(md), c.id).toBeTruthy();
        expect(md, c.id).not.toContain(realFirstName(fikstur(c)));
        const satirlar = adapter.renderTask(c, fikstur(c)).split("\n").filter((l) => /^- (Tür|Konu\/beceri|Zorluk varyantı|Cevap anahtarı|Güçlük profili|Güçlük düzeyi|Güçlü yönler|İlgi alanları): /.test(l));
        expect(satirlar.length, c.id).toBeGreaterThanOrEqual(6);
        for (const l of satirlar) expect(md, `${c.id}: ${l}`).toContain(l);
        // Ürün şablonu: istendiyse "6. **Cevap anahtarı**", istenmediyse "ekleme" notu — `sections`te altıncı bölüm bu yüzden yok.
        if (c.body.cevapAnahtari) expect(md, c.id).toContain("6. **Cevap anahtarı**");
        else expect(md, c.id).toContain("(Cevap anahtarı istenmedi — ekleme.)");
        if (c.body.mebHedefKod) {
          expect(md, c.id).toContain("MEB HEDEF HİZALAMASI");
          expect(md, c.id).toContain(mebToPrompt({ hedefKod: c.body.mebHedefKod, davranisKodlari: [] })!);
        } else expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI");
      }
    });

    it("mtr-01: yanıt → puanlar (anahtar, varyant); rumuz sızıntısı yok", async () => {
      const flow = tempFlow("flow-mtr1-");
      let s = await kos("atolye/materyal", flow, ["mtr-01"]);
      const { md, row } = istek(bekleyenler(s.pendingPath), "mtr-01");
      writeFileSync(row.responseTxt, materyal({ ad: rumuzOku(md)! }));
      s = await kos("atolye/materyal", flow, ["mtr-01"]);
      expect(s).toMatchObject({ done: 1, failed: 0, pending: 0 });
      const r = sonuclar(s.resultsPath)[0]!;
      expect(r.hard_fail).toEqual([]);
      expect(r.grade).toMatchObject({ talimat: 1, cevap_anahtari: 1, varyant: 1, rumuz_yok: 1, dil_kurali: 1 });
    });
  });

  describe("ölçüt metinleri vakalarla çelişmez", () => {
    const soru = (k: string) => adapter.criteria.find((c) => c.key === k)!.question;
    it("çok duyulu ölçüt profile özgü uyarlamayı bekler (disgrafi/DEHB vakaları), üretilebilirlik ölçütü tek varyant ve iki yönlü anahtarı söyler", () => {
      expect(soru("cok_duyulu_somutluk")).toContain("profilindeki güçlüğe karşılık gelen uyarlamalar");
      expect(soru("cok_duyulu_somutluk")).toContain("Profilde olmayan güçlüğün uyarlamasını bekleme");
      expect(soru("cok_duyulu_somutluk")).toContain("DEHB");
      expect(soru("uretilebilirlik")).toContain("birden çok varyant istendiyse");
      expect(soru("uretilebilirlik")).toContain("istenmediyse hiç yok mu");
    });
  });

  describe("kontroller fabrika üzerinden", () => {
    const calistir = (text: string, alias: string | null = "Doruk", id = "mtr-01") => adapter.checks({ body: vaka(id).body, output: text, rawText: text, alias });
    it("iyi çıktı: sert hata yok, talimat 1", () => {
      const r = calistir(materyal());
      expect(r.hard_fail).toEqual([]);
      expect(r.scores).toMatchObject({ talimat: 1, cevap_anahtari: 1, varyant: 1 });
      expect(r.details).toMatchObject({ yapi: 1, taslak_sonda: 1, tani_cumlesi: 0 });
    });
    it("cevap anahtarı İSTENMEDİ ve çıktıda YOK (doğru davranış): yapı 1, talimat 1 — altıncı bölümün yokluğu yapı hatası değil", () => {
      const r = calistir(materyal({ varyantlar: ["Orta"], anahtar: false }), "Doruk", "mtr-02");
      expect(r.details).toMatchObject({ yapi: 1 });
      expect(r.scores).toMatchObject({ talimat: 1, cevap_anahtari: 1, varyant: 1 });
      expect(r.hard_fail).toEqual([]);
    });
    it("cevap anahtarı İSTENMEDİ ama eklenmiş: cevap_anahtari 0, talimat düşer; 'istenmedi' notu eklenmesi sorun değil", () => {
      const r = calistir(materyal({ varyantlar: ["Orta"], anahtar: true }), "Doruk", "mtr-02");
      expect(r.scores.cevap_anahtari).toBe(0);
      expect(r.scores.talimat).toBeLessThan(1);
      const nota = materyal({ varyantlar: ["Orta"], anahtar: false }).replace("## 5.", "## 6. Cevap anahtarı\n(Cevap anahtarı istenmedi — ekleme.)\n\n## 5.");
      expect(calistir(nota, "Doruk", "mtr-02").scores).toMatchObject({ talimat: 1, cevap_anahtari: 1 });
    });
    it("cevap anahtarı İSTENDİ ama yok / boş: cevap_anahtari 0, talimat düşer", () => {
      expect(calistir(materyal({ anahtar: false })).scores).toMatchObject({ cevap_anahtari: 0 });
      expect(calistir(materyal({ anahtar: false })).scores.talimat).toBeLessThan(1);
      expect(calistir(materyal().replace("1. b\n2. d\n3. b\n", "")).scores.cevap_anahtari).toBe(0);
    });
    it.each(["Başlık ve hedeflenen kazanım", "Öğretmen için uygulama yönergesi", "Materyal gövdesi", "Zorluk varyantları", "Sınıf-içi farklılaştırma / uyarlama notları"])("istenen bölüm eksik (%s): yapı 4/5, talimat düşer", (bolum) => {
      const metin = materyal().split("\n").map((l) => (l.startsWith("## ") && l.endsWith(bolum) ? "## Zzz" : l)).join("\n");
      const r = calistir(metin);
      expect(r.details.yapi).toBeCloseTo(4 / 5);
      expect(r.scores.talimat).toBeLessThan(1);
    });
    it("bölüm başlığı alternatifleri: 'Hedeflenen kazanım', 'Öğretmen notu', 'Gövde', 'Farklılaştırma notları' bölümü karşılar", () => {
      const degis = (eski: string, yeni: string) => materyal().replace(eski, yeni);
      expect(calistir(degis("Başlık ve hedeflenen kazanım", "Hedeflenen kazanım")).details.yapi).toBe(1);
      expect(calistir(degis("Başlık ve hedeflenen kazanım", "Başlık")).details.yapi).toBe(1);
      expect(calistir(degis("Öğretmen için uygulama yönergesi", "Öğretmen notu")).details.yapi).toBe(1);
      expect(calistir(degis("Öğretmen için uygulama yönergesi", "Uygulama yönergesi")).details.yapi).toBe(1);
      expect(calistir(degis("Materyal gövdesi", "Gövde")).details.yapi).toBe(1);
      expect(calistir(degis("Sınıf-içi farklılaştırma / uyarlama notları", "Farklılaştırma notları")).details.yapi).toBe(1);
      expect(calistir(degis("Sınıf-içi farklılaştırma / uyarlama notları", "Uyarlama notları")).details.yapi).toBe(1);
    });
    it("istenen varyantlar eksik (yalnız Kolay): varyant 0, talimat düşer; üç varyant isteyen vakada iki varyant yetmez", () => {
      const r = calistir(materyal({ varyantlar: ["Kolay"] }));
      expect(r.scores.varyant).toBe(0);
      expect(r.scores.talimat).toBeLessThan(1);
      expect(calistir(materyal({ varyantlar: ["Kolay", "Orta"] }), "Doruk", "mtr-03").scores.varyant).toBe(0);
      expect(calistir(materyal({ varyantlar: ["Kolay", "Orta", "İleri"] }), "Doruk", "mtr-03").scores.varyant).toBe(1);
    });
    it("tek düzey isteyen vakada üç varyant sunmak varyant 0", () => {
      expect(calistir(materyal({ varyantlar: ["Kolay", "Orta", "İleri"], anahtar: false }), "Doruk", "mtr-02").scores.varyant).toBe(0);
    });
    it("taslak notu yok / rumuz sızıntısı: sert hata; çıktı yok: talimat 0", () => {
      expect(calistir(materyal().replace(`⚠️ ${TASLAK_NOTU}`, "")).hard_fail).toContain("taslak_notu_yok");
      expect(calistir(materyal({ ad: "Doruk" })).hard_fail).toContain("rumuz_sizintisi");
      const r = adapter.checks({ body: vaka("mtr-01").body, output: null, rawText: "", alias: null });
      expect(r.hard_fail).toContain("cikti_yok");
      expect(r.scores.talimat).toBe(0);
    });
  });

  describe("hakem çizimi", () => {
    it("çıktı olduğu gibi gider; boşsa hata metni", () => {
      expect(adapter.renderForJudge(materyal())).toBe(materyal());
      expect(adapter.renderForJudge("")).toContain("Çıktı üretilemedi");
    });
  });

  describe("jenerik aday", () => {
    it("≥ 4 yasak kalıp taşır, referanstan farklı; başlıklar ve taslak notu korunur; içerik jenerik cümlelere döner", () => {
      const g = adapter.genericCandidate(materyal()) as string;
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(materyal()));
      for (const h of ["## 4. Zorluk varyantları", "### Kolay", "### Orta", "## 6. Cevap anahtarı", `⚠️ ${TASLAK_NOTU}`]) expect(g.split("\n"), h).toContain(h);
      expect(g).not.toContain("kum tepsisine");
      const r = adapter.checks({ body: vaka("mtr-01").body, output: g, rawText: g, alias: null });
      expect(r.scores).toMatchObject({ varyant: 1, cevap_anahtari: 1 }); // yapı korunur: hakem içeriği ayırt eder
      expect(r.hard_fail).toEqual([]);
    });
    it("boş çıktıda çökmez", () => {
      expect(adapter.genericCandidate("")).toBe("");
      expect(() => adapter.genericCandidate(null)).not.toThrow();
    });
  });
});
