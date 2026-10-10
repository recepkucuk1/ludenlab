// apps/hub/evals/tools/atolye/matematik/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { matematikInputSchema } from "@atolye/lib/matematik";
import { mebHedef, mebToPrompt } from "@atolye/lib/meb-program";
import { describe, expect, it } from "vitest";
import { profilBody } from "../../../lib/adapterFactory";
import type { AtolyeFixture, CaseDef } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { atolyeAdapterSuite } from "../baglanti";
import { adapter } from "./adapter";
import { MATEMATIK_BOLUM_LISTESI, type MatematikBody } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<MatematikBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const fikstur = (c: CaseDef<MatematikBody>) => resolveFixture("atolye", c.student) as AtolyeFixture;
const gorev = (id: string) => adapter.renderTask(vaka(id), fikstur(vaka(id)));

/** Tam, kurallara uygun matematik destek seti (somut başlangıç, eldeli toplama); CRA aşamaları madde etiketi; `ad` hata desenleri bölümünde geçer. */
const set = (ad = "Mina") =>
  [
    "## 1. Kazanım ve ön-koşul beceri kontrolü", "- Kazanım: toplamları 100'ü geçmeyen iki sayıyla eldeli toplama (5.1.14.12).", "- Ön-koşul: 7 + 3 = 10 ve 34 = 30 + 4 gibi basamak değeri.", "",
    "## 2. CRA dizisi",
    "- **Somut:** Onluk taban blokları: 27 + 15 için 7 + 5 = 12 birlik; 10 birlik bir onluk çubuğa dönüşür.",
    "- **Yarı-somut:** Çubuk ve nokta çizimi: 27 + 15 = 42.",
    "- **Soyut:** Dikey toplama: 38 + 46 = 84 (1 elde); birler 8 + 6 = 14.", "",
    "## 3. Manipülatif ve materyal yönergesi", "- Onluk çubuk ve birlik küpleri; basamak değeri tablosu (yalnız metinle tarif).", "",
    "## 4. Yaygın hata desenleri ve müdahale ipucu", `- Basamak kaydırma: ${ad} 27 + 15 işleminde 7 + 5 = 12'yi yan yana yazarak 312 bulur.`, "  - Müdahale: eldeyi onluk çubukla göster; 27 + 15 = 42.", "",
    "## 5. Kademeli alıştırma seti", "1. 14 + 23 = 37", "2. 26 + 18 = 44", "3. 38 + 47 = 85", "",
    `⚠️ ${TASLAK_NOTU}`,
  ].join("\n");

atolyeAdapterSuite(adapter, {
  idler: ["mat-01", "mat-02", "mat-03", "mat-04"],
  olcutler: ["somut_soyut", "hata_analizi"],
  ornek: set,
  iyiPuanlar: { talimat: 1, aritmetik_dogru: 1, cra: 1 },
  istekEtiketleri: /^- (Alan profili|Kazanım\/konu|Başlangıç somutluk düzeyi|Güçlük profili|Güçlük düzeyi|Güçlü yönler|İlgi alanları): /,
  istemParcalari: ["ÖĞRENCİ PROFİLİ", "İSTENEN YAPI (Markdown, sırayla)"],
  bolumler: ["Kazanım ve ön-koşul beceri kontrolü", "CRA dizisi", "Manipülatif ve materyal yönergesi", "Yaygın hata desenleri ve müdahale ipucu", "Kademeli alıştırma seti"],
  // Araca GİTMEYENLER: çalışılan MEB bölümleri ve önceki belgeler (ilk uzun satırları kullanıcı isteminde geçmemeli).
  gitmeyen: (f) => [
    ...(f.mebBolumler.length ? ["Çalışılan MEB bölümleri"] : []),
    ...f.documents.flatMap((d) => d.content.split("\n").find((l) => l.trim().length > 30)?.trim() ?? []),
  ],
  istekEk(md, c) {
    if (c.body.mebHedefKod) {
      expect(md, c.id).toContain("MEB HEDEF HİZALAMASI");
      expect(md, c.id).toContain(mebToPrompt({ hedefKod: c.body.mebHedefKod, davranisKodlari: [] })!);
    } else expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI");
  },
});

describe("matematik destek seti adaptörü — araca özgü", () => {
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

  it("bölüm regex'leri tek kaynak: 5 bölüm; 'ön-koşul' (tire boşluğa dönüşür), 'materyal yönergesi', 'Ücra' başlığı CRA değil", () => {
    expect(MATEMATIK_BOLUM_LISTESI).toHaveLength(5);
    const [kazanim, cra, manip, hata, alistirma] = MATEMATIK_BOLUM_LISTESI as [RegExp, RegExp, RegExp, RegExp, RegExp];
    for (const h of ["kazanım ve ön koşul beceri kontrolü", "ön koşul becerileri", "kazanım"]) expect(kazanim.test(h), h).toBe(true);
    for (const h of ["cra dizisi", "somut etkinlik"]) expect(cra.test(h), h).toBe(true);
    expect(cra.test("ücra köşe")).toBe(false);
    for (const h of ["manipülatif ve materyal yönergesi", "materyal yönergesi", "manipülatif yönergesi"]) expect(manip.test(h), h).toBe(true);
    expect(hata.test("yaygın hata desenleri")).toBe(true);
    expect(hata.test("yaygın yanılgılar")).toBe(true);
    expect(hata.test("hatasız toplama")).toBe(false);
    expect(alistirma.test("kademeli alıştırma seti")).toBe(true);
  });

  describe("hakem görevi", () => {
    it("mat-01: ürün etiketleriyle üç matematik satırı, MEB kodu + hedef bloğu; öğrenci bloğu", () => {
      const t = gorev("mat-01");
      expect(t).toContain("- Araç: Matematik destek seti (Atölye)");
      expect(t).toContain("- Alan profili: işlem akıcılığı");
      expect(t).toContain("- Kazanım/konu: Eldeli toplama (iki basamaklı)");
      expect(t).toContain("- Başlangıç somutluk düzeyi: somut");
      expect(t).toContain("- MEB hedef kodu: 5.1.14");
      expect(t).toContain(mebToPrompt({ hedefKod: "5.1.14", davranisKodlari: [] })!);
      expect(t).toContain("- Öğrenci: Mina Güneş, Ortaokul (5–8. sınıf), 12 yaş");
      expect(t).toContain("İlgi alanları: Resim çizmek, kedi beslemek");
      expect(t).toContain("- Neyi sınıyor: Eldeli toplamada");
    });
    it("MEB davranış kodları verilirse hakem görevine yalnız onlar girer", () => {
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

  describe("ölçüt metinleri vakalarla çelişmez", () => {
    const soru = (k: string) => adapter.criteria.find((c) => c.key === k)!.question;
    it("CRA ölçütü başlangıç düzeyini ve yaşa uygunluğu (lise/okul öncesi), hata ölçütü öğrenci hatası örneğinin her bölümde meşruluğunu söyler", () => {
      expect(soru("somut_soyut")).toContain("istenen başlangıç somutluk düzeyinden başlayarak");
      expect(soru("somut_soyut")).toContain("yaşına uygun");
      expect(soru("somut_soyut")).toContain("lisede çocuksu manipülatif yok");
      expect(soru("hata_analizi")).toContain("öğrenci hatası olarak açıkça sunulan örnekler dışındaki tüm sayılar");
      expect(soru("hata_analizi")).toContain("hangi bölümde olursa olsun, hata sayılmaz");
    });
  });

  describe("kontroller fabrika üzerinden — araca özgü", () => {
    const calistir = (text: string, alias: string | null = "Doruk", id = "mat-01") => adapter.checks({ body: vaka(id).body, output: text, rawText: text, alias });
    it("hata desenindeki yanlış '312' ürün hatası sayılmaz; ifade sayısı dokuz ('84 (1 elde)' dahil)", () => {
      const r = calistir(set());
      expect(r.details).toMatchObject({ ifade: 9, dogru: 9 });
      expect(r.scores.aritmetik_dogru).toBe(1);
    });
    it("bölüm başlığı alternatifleri: 'Ön-koşul…' (Kazanım olmadan), 'Materyal yönergesi', 'Manipülatif yönergesi' bölümü karşılar; 'Ücra' başlığı CRA bölümü değildir", () => {
      const degis = (eski: string, yeni: string) => set().replace(eski, yeni);
      expect(calistir(degis("Kazanım ve ön-koşul beceri kontrolü", "Ön-koşul beceri kontrolü")).details.yapi).toBe(1);
      expect(calistir(degis("Kazanım ve ön-koşul beceri kontrolü", "Ön koşul becerileri")).details.yapi).toBe(1);
      expect(calistir(degis("Manipülatif ve materyal yönergesi", "Materyal yönergesi")).details.yapi).toBe(1);
      expect(calistir(degis("Manipülatif ve materyal yönergesi", "Manipülatif yönergesi")).details.yapi).toBe(1);
      const ucra = set().replace("## 2. CRA dizisi", "## 2. Ücra köşe");
      expect(calistir(ucra).details.yapi).toBeCloseTo(4 / 5);
    });
    it("yanlış aritmetik + CRA'sız: talimat düşer, sert hata yok", () => {
      const kotu = set().replace("38 + 47 = 85", "38 + 47 = 86").replace("26 + 18 = 44", "26 + 18 = 43").replace("- **Yarı-somut:**", "- **Çizim:**").replace("- **Soyut:**", "- **Sayılar:**");
      const r = calistir(kotu);
      expect(r.scores.aritmetik_dogru).toBeCloseTo(7 / 9);
      expect(r.scores.cra).toBe(0);
      expect(r.scores.talimat).toBeLessThan(0.9);
      expect(r.hard_fail).toEqual([]);
    });
    it("soyut başlangıçlı vaka (mat-02): yalnız soyut aşaması da CRA'yı sağlar; somut başlangıçta aynı çıktı sağlamaz", () => {
      const yalnizSoyut = set().replace("- **Somut:**", "- **Çizim 0:**").replace("- **Yarı-somut:**", "- **Çizim:**");
      expect(calistir(yalnizSoyut, null, "mat-02").scores.cra).toBe(1);
      expect(calistir(yalnizSoyut, null, "mat-01").scores.cra).toBe(0);
    });
  });

  describe("jenerik aday — araca özgü", () => {
    it("ifadeler kalmaz; CRA madde etiketleri jenerik cümlelere döner (yapı başlıkları korunur, içerik gider)", () => {
      const g = adapter.genericCandidate(set()) as string;
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      const r = adapter.checks({ body: vaka("mat-01").body, output: g, rawText: g, alias: null });
      expect(r.details).toMatchObject({ ifade: 0 });
      expect(r.scores.cra).toBe(0);
      expect(r.details.yapi).toBe(1);
    });
  });
});
