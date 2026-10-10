// apps/hub/evals/tools/atolye/materyal/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { materyalInputSchema } from "@atolye/lib/materyal";
import { mebHedef, mebToPrompt } from "@atolye/lib/meb-program";
import { describe, expect, it } from "vitest";
import { profilBody } from "../../../lib/adapterFactory";
import type { AtolyeFixture, CaseDef } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { atolyeAdapterSuite } from "../baglanti";
import { adapter } from "./adapter";
import { MATERYAL_BOLUM_LISTESI, type MateryalBody } from "./checks";

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

atolyeAdapterSuite(adapter, {
  idler: ["mtr-01", "mtr-02", "mtr-03", "mtr-04"],
  olcutler: ["cok_duyulu_somutluk", "uretilebilirlik"],
  ornek: (ad) => materyal({ ad }),
  iyiPuanlar: { talimat: 1, cevap_anahtari: 1, varyant: 1 },
  istekEtiketleri: /^- (Tür|Konu\/beceri|Zorluk varyantı|Cevap anahtarı|Güçlük profili|Güçlük düzeyi|Güçlü yönler|İlgi alanları): /,
  istemParcalari: ["ÖĞRENCİ PROFİLİ", "İSTENEN YAPI (Markdown, sırayla)"],
  bolumler: ["Başlık ve hedeflenen kazanım", "Öğretmen için uygulama yönergesi", "Materyal gövdesi", "Zorluk varyantları", "Sınıf-içi farklılaştırma / uyarlama notları"],
  gitmeyen: (f) => [
    ...(f.mebBolumler.length ? ["Çalışılan MEB bölümleri"] : []),
    ...f.documents.flatMap((d) => d.content.split("\n").find((l) => l.trim().length > 30)?.trim() ?? []),
  ],
  istekEk(md, c) {
    // Ürün şablonu: istendiyse "6. **Cevap anahtarı**", istenmediyse "ekleme" notu — `sections`te altıncı bölüm bu yüzden yok.
    if (c.body.cevapAnahtari) expect(md, c.id).toContain("6. **Cevap anahtarı**");
    else expect(md, c.id).toContain("(Cevap anahtarı istenmedi — ekleme.)");
    if (c.body.mebHedefKod) {
      expect(md, c.id).toContain("MEB HEDEF HİZALAMASI");
      expect(md, c.id).toContain(mebToPrompt({ hedefKod: c.body.mebHedefKod, davranisKodlari: [] })!);
    } else expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI");
  },
});

describe("çok duyulu materyal adaptörü — araca özgü", () => {
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

  it("bölüm regex'leri tek kaynak: 5 bölüm (altıncı 'Cevap anahtarı' yok); alternatif başlıklar", () => {
    expect(MATERYAL_BOLUM_LISTESI).toHaveLength(5);
    const [baslik, yonerge, govde, varyant, farklilastirma] = MATERYAL_BOLUM_LISTESI as [RegExp, RegExp, RegExp, RegExp, RegExp];
    for (const h of ["başlık ve hedeflenen kazanım", "hedeflenen kazanım", "başlık"]) expect(baslik.test(h), h).toBe(true);
    for (const h of ["öğretmen için uygulama yönergesi", "öğretmen notu", "uygulama yönergesi"]) expect(yonerge.test(h), h).toBe(true);
    for (const h of ["materyal gövdesi", "gövde"]) expect(govde.test(h), h).toBe(true);
    expect(varyant.test("zorluk varyantları")).toBe(true);
    for (const h of ["sınıf içi farklılaştırma / uyarlama notları", "farklılaştırma notları", "uyarlama notları"]) expect(farklilastirma.test(h), h).toBe(true);
    expect(MATERYAL_BOLUM_LISTESI.some((r) => r.test("cevap anahtarı"))).toBe(false);
  });

  describe("hakem görevi", () => {
    it("mtr-01: ürün etiketleriyle dört materyal satırı; öğrenci bloğu", () => {
      const t = gorev("mtr-01");
      expect(t).toContain("- Araç: Çok duyulu materyal (Atölye)");
      expect(t).toContain("- Tür: çalışma yaprağı");
      expect(t).toContain("- Konu/beceri: b–d harf biçimleri ve yönü");
      expect(t).toContain("- Zorluk varyantı: kolay + orta");
      expect(t).toContain("- Cevap anahtarı: evet");
      expect(t).toContain("- Öğrenci: Zeynep Kocaman, İlkokul (1–4. sınıf), 9 yaş");
      expect(t).toContain("- Güçlük profili: Disgrafi (yazma güçlüğü)");
      expect(t).toContain("İlgi alanları: Resim çizmek, hayvanlar (özellikle atlar)");
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

  describe("ölçüt metinleri vakalarla çelişmez", () => {
    const soru = (k: string) => adapter.criteria.find((c) => c.key === k)!.question;
    it("çok duyulu ölçüt profile özgü uyarlamayı bekler (disgrafi/DEHB vakaları); üretilebilirlik ölçütü tek bir soru: yalnız metinle çoğaltılabilirlik", () => {
      expect(soru("cok_duyulu_somutluk")).toContain("profilindeki güçlüğe karşılık gelen uyarlamalar");
      expect(soru("cok_duyulu_somutluk")).toContain("Profilde olmayan güçlüğün uyarlamasını bekleme");
      expect(soru("cok_duyulu_somutluk")).toContain("DEHB");
      expect(soru("uretilebilirlik")).toContain("yalnız metinle sınıfta çoğaltılıp hemen kullanılabilir mi");
      // varyant/anahtar sorusu burada değil: `varyant` ve `cevap_anahtari` deterministik kontrolleri ölçer
      expect(soru("uretilebilirlik")).not.toContain("varyant");
      expect(soru("uretilebilirlik")).not.toContain("anahtar");
      expect(soru("uretilebilirlik").match(/\?/g)).toHaveLength(1);
    });
  });

  describe("kontroller fabrika üzerinden — araca özgü", () => {
    const calistir = (text: string, alias: string | null = "Doruk", id = "mtr-01") => adapter.checks({ body: vaka(id).body, output: text, rawText: text, alias });
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
      expect(calistir(materyal({ varyantlar: ["Kolay", "Orta", "Zor"] }), "Doruk", "mtr-03").scores.varyant).toBe(1); // 'Zor' = ileri
    });
    it("tek düzey isteyen vakada üç varyant sunmak varyant 0", () => {
      expect(calistir(materyal({ varyantlar: ["Kolay", "Orta", "İleri"], anahtar: false }), "Doruk", "mtr-02").scores.varyant).toBe(0);
    });
  });

  describe("jenerik aday — araca özgü", () => {
    it("varyant başlıkları ve anahtar bölümü yapı olarak korunur (hakem içeriği ayırt eder); gövde içeriği jenerik cümlelere döner", () => {
      const g = adapter.genericCandidate(materyal()) as string;
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      for (const h of ["### Kolay", "### Orta", "## 6. Cevap anahtarı"]) expect(g.split("\n"), h).toContain(h);
      expect(g).not.toContain("kum tepsisine");
      const r = adapter.checks({ body: vaka("mtr-01").body, output: g, rawText: g, alias: null });
      expect(r.scores).toMatchObject({ varyant: 1, cevap_anahtari: 1 });
    });
  });
});
