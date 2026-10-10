// apps/hub/evals/tools/atolye/matematik/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { matematikInputSchema } from "@atolye/lib/matematik";
import { mebHedef, mebToPrompt } from "@atolye/lib/meb-program";
import { describe, expect, it } from "vitest";
import { profilBody } from "../../../lib/adapterFactory";
import { HarnessError, type AtolyeFixture, type CaseDef } from "../../../lib/core";
import { realFirstName, resolveFixture } from "../../../lib/fixtures";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { tempFlow } from "../../../lib/testFlow";
import { bekleyenler, istek, kos, rumuzOku, sonuclar } from "../baglanti";
import { adapter } from "./adapter";
import type { MatematikBody } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<MatematikBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const fikstur = (c: CaseDef<MatematikBody>) => resolveFixture("atolye", c.student) as AtolyeFixture;
const gorev = (id: string) => adapter.renderTask(vaka(id), fikstur(vaka(id)));

/** Tam, kurallara uygun matematik destek seti (somut başlangıç, eldeli toplama); `ad` hata desenleri bölümünde geçer. */
const set = (ad = "Mina") =>
  [
    "## 1. Kazanım ve ön-koşul beceri kontrolü", "- Kazanım: toplamları 100'ü geçmeyen iki sayıyla eldeli toplama (5.1.14.12).", "- Ön-koşul: 7 + 3 = 10 ve 34 = 30 + 4 gibi basamak değeri.", "",
    "## 2. CRA dizisi",
    "### Somut", "- Onluk taban blokları: 27 + 15 için 7 + 5 = 12 birlik; 10 birlik bir onluk çubuğa dönüşür.",
    "### Yarı-somut", "- Çubuk ve nokta çizimi: 27 + 15 = 42.",
    "### Soyut", "- Dikey toplama: 38 + 46 = 84; birler 8 + 6 = 14, 1 elde.", "",
    "## 3. Manipülatif ve materyal yönergesi", "- Onluk çubuk ve birlik küpleri; basamak değeri tablosu (yalnız metinle tarif).", "",
    "## 4. Yaygın hata desenleri ve müdahale ipucu", `- Basamak kaydırma: ${ad} 27 + 15 işleminde 7 + 5 = 12'yi yan yana yazarak 312 bulur.`, "  - Müdahale: eldeyi onluk çubukla göster; 27 + 15 = 42.", "",
    "## 5. Kademeli alıştırma seti", "1. 14 + 23 = 37", "2. 26 + 18 = 44", "3. 38 + 47 = 85", "",
    `⚠️ ${TASLAK_NOTU}`,
  ].join("\n");

describe("matematik destek seti adaptörü", () => {
  it("4 vaka, hepsi öğrencili ve fikstürleri çözülür; 4 ortak + 2 araç ölçütü", () => {
    expect(cases.map((c) => c.id)).toEqual(["mat-01", "mat-02", "mat-03", "mat-04"]);
    for (const c of cases) expect(resolveFixture("atolye", c.student)?.id, c.id).toBe(c.student);
    expect(adapter.id).toBe("atolye/matematik");
    expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(["somut_soyut", "hata_analizi"]);
  });

  it("vaka gövdeleri + fikstür profili rota şemasından geçer; dört alan ve üç somutluk düzeyi var; MEB kodu geçerli ve konuyla uyumlu", () => {
    for (const c of cases) {
      expect(matematikInputSchema.safeParse({ ...profilBody(fikstur(c)), ...c.body }).success, c.id).toBe(true);
      if (c.body.mebHedefKod) expect(mebHedef(c.body.mebHedefKod), c.id).toBeDefined();
    }
    expect(cases.map((c) => c.body.alanProfili)).toEqual(["islem_akiciligi", "problem_cozme", "sayi_hissi", "sayi_buyukluk"]);
    expect(cases.map((c) => c.body.somutlukDuzeyi)).toEqual(["somut", "soyut", "somut", "yari_somut"]);
    // mat-01 eldeli TOPLAMA → 5.1.14 (Doğal sayılarla toplama işlemi yapar)
    expect(mebHedef("5.1.14")!.metin).toContain("toplama");
  });

  describe("hakem görevi", () => {
    it("mat-01: ürün etiketleriyle üç matematik satırı, MEB kodu + hedef bloğu; öğrenci bloğu; araca gitmeyenler notu", () => {
      const t = gorev("mat-01");
      expect(t).toContain("- Araç: Matematik destek seti (Atölye)");
      expect(t).toContain("- Alan profili: işlem akıcılığı");
      expect(t).toContain("- Kazanım/konu: Eldeli toplama (iki basamaklı)");
      expect(t).toContain("- Başlangıç somutluk düzeyi: somut");
      expect(t).toContain("- MEB hedef kodu: 5.1.14");
      expect(t).toContain(mebToPrompt({ hedefKod: "5.1.14", davranisKodlari: [] })!);
      expect(t).toContain("- Öğrenci: Mina Güneş, Ortaokul (5–8. sınıf), 12 yaş");
      expect(t).toContain("İlgi alanları: Resim çizmek, kedi beslemek");
      expect(t).toContain("çalışılan MEB bölümleri ve önceki belgeler araca İLETİLMEDİ");
      expect(t).toContain("- Neyi sınıyor: Eldeli toplamada");
    });
    it("MEB davranış kodları verilirse hakem görevine yalnız onlar girer (ürün isteminde de aynı kodlar)", () => {
      const c = { ...vaka("mat-01"), body: { ...vaka("mat-01").body, mebDavranisKodlari: ["5.1.14.12"] } };
      const t = adapter.renderTask(c, fikstur(c));
      expect(t).toContain("• 5.1.14.12 ");
      expect(t).not.toContain("• 5.1.14.1 ");
      expect(t).toContain(mebToPrompt({ hedefKod: "5.1.14", davranisKodlari: ["5.1.14.12"] })!);
    });
    it("etiketler ürün metniyle: 'sayı-büyüklük ilişkisi' (tire), 'yarı-somut'", () => {
      const t = gorev("mat-04");
      expect(t).toContain("- Alan profili: sayı-büyüklük ilişkisi");
      expect(t).toContain("- Başlangıç somutluk düzeyi: yarı-somut");
      expect(t).not.toContain("MEB hedef");
    });
    it("mat-02: lise, soyut başlangıç; hakem amacı 15 yaşı ve 'yaşa uygun' kurulumu söyler", () => {
      const t = gorev("mat-02");
      expect(t).toContain("- Alan profili: problem çözme");
      expect(t).toContain("- Başlangıç somutluk düzeyi: soyut");
      expect(t).toContain("15 yaş");
      expect(t).toContain("Lise (9. sınıf ve üzeri), 15 yaş");
    });
    it("mat-03: okul öncesi, 5 yaş; hakem amacı 5 yaşı söyler", () => {
      const t = gorev("mat-03");
      expect(t).toContain("5 yaş");
      expect(t).toContain("Okul öncesi (4–6 yaş), 5 yaş");
    });
  });

  it("fikstürsüz çağrı harness_error; fikstürsüz hakem görevi hata verir", async () => {
    await expect(adapter.invoke(vaka("mat-01").body, null)).rejects.toMatchObject({ failureClass: "harness_error" });
    expect(() => adapter.renderTask(vaka("mat-01"), null)).toThrow(HarnessError);
  });

  describe("gerçek rota (subagent düzeneği: istek yazılır, yanıt okunur) — bağlantı", () => {
    it("4 vakanın hepsi rota şemasından geçer; istekte rumuzlu öğrenci satırı, gerçek ad yok; istek ve profil satırları ürün isteminde AYNEN geçer", async () => {
      const flow = tempFlow("flow-mat-");
      const s = await kos("atolye/matematik", flow, cases.map((c) => c.id));
      expect(s).toMatchObject({ done: 0, failed: 0, pending: 4 });
      const rows = bekleyenler(s.pendingPath);
      for (const c of cases) {
        const { md } = istek(rows, c.id);
        expect(md, c.id).toContain("ÖĞRENCİ PROFİLİ");
        expect(md, c.id).toContain("İSTENEN YAPI (Markdown, sırayla)");
        expect(rumuzOku(md), c.id).toBeTruthy();
        expect(md, c.id).not.toContain(realFirstName(fikstur(c)));
        const satirlar = adapter.renderTask(c, fikstur(c)).split("\n").filter((l) => /^- (Alan profili|Kazanım\/konu|Başlangıç somutluk düzeyi|Güçlük profili|Güçlük düzeyi|Güçlü yönler|İlgi alanları): /.test(l));
        expect(satirlar.length, c.id).toBeGreaterThanOrEqual(5);
        for (const l of satirlar) expect(md, `${c.id}: ${l}`).toContain(l);
        if (c.body.mebHedefKod) {
          expect(md, c.id).toContain("MEB HEDEF HİZALAMASI");
          expect(md, c.id).toContain(mebToPrompt({ hedefKod: c.body.mebHedefKod, davranisKodlari: [] })!);
        } else expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI");
      }
    });

    it("mat-01: yanıt → puanlar (aritmetik, CRA); rumuz sızıntısı yok", async () => {
      const flow = tempFlow("flow-mat1-");
      let s = await kos("atolye/matematik", flow, ["mat-01"]);
      const { md, row } = istek(bekleyenler(s.pendingPath), "mat-01");
      writeFileSync(row.responseTxt, set(rumuzOku(md)!));
      s = await kos("atolye/matematik", flow, ["mat-01"]);
      expect(s).toMatchObject({ done: 1, failed: 0, pending: 0 });
      const r = sonuclar(s.resultsPath)[0]!;
      expect(r.hard_fail).toEqual([]);
      expect(r.grade).toMatchObject({ talimat: 1, aritmetik_dogru: 1, cra: 1, rumuz_yok: 1, dil_kurali: 1 });
    });
  });

  describe("ölçüt metinleri vakalarla çelişmez", () => {
    const soru = (k: string) => adapter.criteria.find((c) => c.key === k)!.question;
    it("CRA ölçütü başlangıç düzeyini ve yaşa uygunluğu (lise/okul öncesi), hata ölçütü hata örneğinin meşruluğunu söyler", () => {
      expect(soru("somut_soyut")).toContain("istenen başlangıç somutluk düzeyinden başlayarak");
      expect(soru("somut_soyut")).toContain("yaşına uygun");
      expect(soru("somut_soyut")).toContain("lisede çocuksu manipülatif yok");
      expect(soru("hata_analizi")).toContain("öğrencinin yanlış yanıtını örnek göstermek meşrudur");
      expect(soru("hata_analizi")).toContain("hata desenleri bölümü dışındaki tüm sayılar");
    });
  });

  describe("kontroller fabrika üzerinden", () => {
    const calistir = (text: string, alias: string | null = "Doruk", id = "mat-01") => adapter.checks({ body: vaka(id).body, output: text, rawText: text, alias });
    it("iyi çıktı: sert hata yok, talimat 1 (hata desenindeki yanlış '312' ürün hatası sayılmaz)", () => {
      const r = calistir(set());
      expect(r.hard_fail).toEqual([]);
      expect(r.scores).toMatchObject({ talimat: 1, aritmetik_dogru: 1, cra: 1 });
      expect(r.details).toMatchObject({ yapi: 1, taslak_sonda: 1, tani_cumlesi: 0, ifade: 9 });
    });
    it.each(["Kazanım ve ön-koşul beceri kontrolü", "CRA dizisi", "Manipülatif ve materyal yönergesi", "Yaygın hata desenleri ve müdahale ipucu", "Kademeli alıştırma seti"])("istenen bölüm eksik (%s): yapı 4/5, talimat düşer", (bolum) => {
      // CRA bölümü aşama alt başlıklarıyla birlikte (Somut/Yarı-somut/Soyut başlıkları da CRA bölümünü karşılar) kaldırılır.
      const metin = set().split("\n").map((l) => ((l.startsWith("## ") && l.endsWith(bolum)) || (bolum === "CRA dizisi" && l.startsWith("### ")) ? "## Zzz" : l)).join("\n");
      const r = calistir(metin);
      expect(r.details.yapi).toBeCloseTo(4 / 5);
      expect(r.scores.talimat).toBeLessThan(1);
    });
    it("bölüm başlığı alternatifleri: 'Ön-koşul…' (Kazanım olmadan), 'Materyal yönergesi', 'Manipülatif yönergesi' bölümü karşılar; 'Ücra' başlığı CRA bölümü değildir", () => {
      const degis = (eski: string, yeni: string) => set().replace(eski, yeni);
      expect(calistir(degis("Kazanım ve ön-koşul beceri kontrolü", "Ön-koşul beceri kontrolü")).details.yapi).toBe(1);
      expect(calistir(degis("Kazanım ve ön-koşul beceri kontrolü", "Ön koşul becerileri")).details.yapi).toBe(1);
      expect(calistir(degis("Manipülatif ve materyal yönergesi", "Materyal yönergesi")).details.yapi).toBe(1);
      expect(calistir(degis("Manipülatif ve materyal yönergesi", "Manipülatif yönergesi")).details.yapi).toBe(1);
      const ucra = set().split("\n").map((l) => (l === "## 2. CRA dizisi" ? "## 2. Ücra köşe" : l.startsWith("### ") ? "## Zzz" : l)).join("\n");
      expect(calistir(ucra).details.yapi).toBeCloseTo(4 / 5);
    });
    it("yanlış aritmetik + CRA'sız: talimat düşer, sert hata yok", () => {
      const kotu = set().replace("38 + 47 = 85", "38 + 47 = 86").replace("26 + 18 = 44", "26 + 18 = 43").replace("### Yarı-somut", "### Çizim").replace("### Soyut", "### Sayılar");
      const r = calistir(kotu);
      expect(r.scores.aritmetik_dogru).toBeCloseTo(7 / 9);
      expect(r.scores.cra).toBe(0);
      expect(r.scores.talimat).toBeLessThan(0.9);
      expect(r.hard_fail).toEqual([]);
    });
    it("soyut başlangıçlı vaka (mat-02): yalnız soyut aşaması da CRA'yı sağlar; somut başlangıçta aynı çıktı sağlamaz", () => {
      const yalnizSoyut = set().replace("### Somut", "### Çizim 0").replace("### Yarı-somut", "### Çizim");
      expect(calistir(yalnizSoyut, null, "mat-02").scores.cra).toBe(1);
      expect(calistir(yalnizSoyut, null, "mat-01").scores.cra).toBe(0);
    });
    it("taslak notu yok / rumuz sızıntısı: sert hata; çıktı yok: talimat 0", () => {
      expect(calistir(set().replace(`⚠️ ${TASLAK_NOTU}`, "")).hard_fail).toContain("taslak_notu_yok");
      expect(calistir(set("Doruk")).hard_fail).toContain("rumuz_sizintisi");
      const r = adapter.checks({ body: vaka("mat-01").body, output: null, rawText: "", alias: null });
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
    it("≥ 4 yasak kalıp taşır, referanstan farklı; başlıklar ve taslak notu korunur; ifadeler kalmaz", () => {
      const g = adapter.genericCandidate(set()) as string;
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(set()));
      for (const h of ["## 2. CRA dizisi", "### Somut", "### Soyut", `⚠️ ${TASLAK_NOTU}`]) expect(g.split("\n"), h).toContain(h);
      const r = adapter.checks({ body: vaka("mat-01").body, output: g, rawText: g, alias: null });
      expect(r.details).toMatchObject({ ifade: 0 });
      expect(r.scores.cra).toBe(1); // yapı korunur: hakem içeriği ayırt eder
      expect(r.hard_fail).toEqual([]);
    });
    it("boş çıktıda çökmez", () => {
      expect(adapter.genericCandidate("")).toBe("");
      expect(() => adapter.genericCandidate(null)).not.toThrow();
    });
  });
});
