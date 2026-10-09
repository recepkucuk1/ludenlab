// apps/hub/evals/tools/atolye/davranis/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { davranisInputSchema } from "@atolye/lib/davranis";
import { mebHedef } from "@atolye/lib/meb-program";
import { describe, expect, it } from "vitest";
import { profilBody } from "../../../lib/adapterFactory";
import type { AtolyeFixture, CaseDef } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { atolyeAdapterSuite } from "../baglanti";
import { adapter } from "./adapter";
import { DAVRANIS_BOLUM_LISTESI, type DavranisBody } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<DavranisBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const fikstur = (c: CaseDef<DavranisBody>) => resolveFixture("atolye", c.student) as AtolyeFixture;
const gorev = (id: string) => adapter.renderTask(vaka(id), fikstur(vaka(id)));

/** Tam, kurallara uygun davranış destek planı; `ad` tanım bölümünde geçer. */
const plan = (ad = "Efe") =>
  [
    "## 1. Hedef davranışın gözlenebilir tanımı", `- ${ad} etkinlik geçişinde yere yatar ve 2 dk bağırır.`, "",
    "## 2. ABC analizi", "| Öncül | Davranış | Sonuç |\n|---|---|---|\n| Oyundan masaya geçiş | Yere yatma | Geçiş ertelenir |", "",
    "## 3. İşlev hipotezi", "- Kaçınma (oyunu bırakmama).", "",
    "## 4. Önleyici (antecedent) ve çevresel düzenlemeler", "- Geçiş öncesi 2 dk şarkıyla uyarı.", "",
    "## 5. Yerine koyma davranışı", "- Kart göstererek 'bir daha' deme; dinozor kartı.", "",
    "## 6. Pekiştirme planı", "- Cezasız, olumlu ve kademeli pekiştirme.", "",
    "## 7. Öz-izleme / veri toplama önerisi", "- Günlük geçiş çizelgesi.", "",
    "## 8. Aile–okul–seans tutarlılık notu", "- Aynı geçiş şarkısı evde de kullanılır.", "",
    `⚠️ ${TASLAK_NOTU}`,
  ].join("\n");

atolyeAdapterSuite(adapter, {
  idler: ["dav-01", "dav-02", "dav-03", "dav-04"],
  olcutler: ["islev_analizi", "onleyici_strateji"],
  ornek: plan,
  iyiPuanlar: { talimat: 1, abc_tablo: 1, ceza_yok: 1 },
  istekEtiketleri: /^- (Hedef davranış|Ortam|Sıklık\/süre gözlemi|Güçlük profili|Güçlük düzeyi|Güçlü yönler|İlgi alanları): /,
  istemParcalari: ["ÖĞRENCİ PROFİLİ", "İSTENEN YAPI (Markdown, sırayla)"],
  bolumler: ["Hedef davranışın gözlenebilir tanımı", "ABC analizi", "İşlev hipotezi", "Önleyici (antecedent) ve çevresel düzenlemeler", "Yerine koyma davranışı", "Pekiştirme planı", "Öz-izleme / veri toplama önerisi", "Aile–okul–seans tutarlılık notu"],
  istekEk(md, c) {
    if (!c.body.siklikSure) expect(md, c.id).toContain("- Sıklık/süre gözlemi: —");
    expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI");
  },
});

describe("davranış destek planı adaptörü — araca özgü", () => {
  it("vaka gövdeleri + fikstür profili rota şemasından geçer; ortam çeşitli; dav-02/03 'sıklık yok'", () => {
    for (const c of cases) {
      expect(davranisInputSchema.safeParse({ ...profilBody(fikstur(c)), ...c.body }).success, c.id).toBe(true);
      if (c.body.mebHedefKod) expect(mebHedef(c.body.mebHedefKod), c.id).toBeDefined();
    }
    expect(cases.map((c) => c.body.ortam)).toEqual(["sinif", "seans", "ev", "genel"]);
    expect(vaka("dav-03").body.siklikSure).toBeUndefined();
    expect(vaka("dav-02").body.siklikSure).toBeUndefined();
    expect(vaka("dav-01").body.siklikSure).toBeTruthy();
  });

  it("bölüm regex'leri tek kaynak: 8 bölüm; 'Öz-izleme' (tire boşluğa dönüşür) ve 'işlev hipotezi' bulunur, 'yerine koyma (…işlevi gören…)' işlev sayılmaz", () => {
    expect(DAVRANIS_BOLUM_LISTESI).toHaveLength(8);
    const [tanim, abc, islev, onleyici, yerine, pekistirme, veri, tutarlilik] = DAVRANIS_BOLUM_LISTESI as [RegExp, RegExp, RegExp, RegExp, RegExp, RegExp, RegExp, RegExp];
    expect(veri.test("öz izleme")).toBe(true); // "Öz-izleme" başlığı normalleştirilmiş
    expect(veri.test("öz izleme / veri toplama önerisi")).toBe(true);
    expect(islev.test("işlev hipotezi")).toBe(true);
    expect(islev.test("yerine koyma davranışı (aynı işlevi gören uygun davranış)")).toBe(false);
    expect(abc.test("abc analizi")).toBe(true);
    expect(tanim.test("hedef davranışın gözlenebilir/ölçülebilir tanımı")).toBe(true);
    expect([onleyici, yerine, pekistirme].every((r) => r instanceof RegExp)).toBe(true);
    // başlık varyantları: "İş Birliği" tutarlılık, "İşlevsel Değerlendirme" işlev bölümü sayılır
    expect(tutarlilik.test("aile okul iş birliği")).toBe(true);
    expect(tutarlilik.test("aile–okul–seans tutarlılık notu")).toBe(true);
    expect(islev.test("işlevsel değerlendirme")).toBe(true);
  });

  describe("hakem görevi", () => {
    it("dav-01: ürün etiketleriyle davranış satırları; öğrenci bloğu; araca gitmeyenler (MEB bölümleri, belgeler) notu", () => {
      const t = gorev("dav-01");
      expect(t).toContain("- Araç: Davranış destek planı (Atölye)");
      expect(t).toContain("- Hedef davranış: Etkinlik geçişinde yere yatma ve bağırma");
      expect(t).toContain("- Ortam: sınıf");
      expect(t).toContain("- Sıklık/süre gözlemi: Günde 3–4 kez, 2–5 dk; en çok oyun→masa geçişinde");
      expect(t).toContain("- Öğrenci: Efe Kaplan, Okul öncesi (4–6 yaş), 5 yaş");
      expect(t).toContain("- Güçlük profili: DEHB — hiperaktif/dürtüsel baskın");
      expect(t).toContain("çalışılan MEB bölümleri ve önceki belgeler araca İLETİLMEDİ");
      expect(t).not.toContain("MEB hedef");
    });
    it("dav-03: sıklık satırı yok (uydurma yok); ortam ev", () => {
      const t = gorev("dav-03");
      expect(t).toContain("- Ortam: ev");
      expect(t).not.toContain("Sıklık/süre");
    });
    it("MEB kodu ve hedef davranış kodları verilen gövdede hakem görevine girer (yalnız işaretli davranışlar)", () => {
      const c = { ...vaka("dav-01"), body: { ...vaka("dav-01").body, mebHedefKod: "3.2.5", mebDavranisKodlari: ["3.2.5.1"] } };
      const t = adapter.renderTask(c, fikstur(c));
      expect(t).toContain("- MEB hedef kodu: 3.2.5");
      expect(t).toContain("• 3.2.5.1");
      expect(t).not.toContain("• 3.2.5.2");
    });
  });

  describe("kontroller fabrika üzerinden", () => {
    const calistir = (text: string) => adapter.checks({ body: vaka("dav-01").body, output: text, rawText: text, alias: "Doruk" });
    it("'Cezasız' pekiştirme ve olumsuzlanmış ifadeler ceza sayılmaz (talimat 1)", () => {
      expect(calistir(plan().replace("Cezasız, olumlu ve kademeli pekiştirme.", "Uyarıyı utandırmadan verin; mola odası yerine sakin köşe kullanın.")).scores).toMatchObject({ talimat: 1, ceza_yok: 1 });
    });
    it("koşullu ceza ('uymazsa … mola odasına gönderin') yakalanır; time-out önerisi + tablosuz ABC: talimat düşer, sert hata yok", () => {
      expect(calistir(plan().replace("Cezasız, olumlu ve kademeli pekiştirme.", "Kurala uymazsa mola odasına gönderin.")).scores.ceza_yok).toBe(0);
      const kotu = plan().replace("| Öncül | Davranış | Sonuç |\n|---|---|---|\n| Oyundan masaya geçiş | Yere yatma | Geçiş ertelenir |", "- Öncül: geçiş").replace("Cezasız, olumlu ve kademeli pekiştirme.", "Time-out uygulayın.");
      const r = calistir(kotu);
      expect(r.scores).toMatchObject({ abc_tablo: 0, ceza_yok: 0 });
      expect(r.scores.talimat).toBeLessThan(0.8);
      expect(r.hard_fail).toEqual([]);
    });
    it("ABC bölümündeki mevcut sonuç ('Sonuç: mola odasına gönderiliyor') öneri sayılmaz", () => {
      expect(calistir(plan().replace("Geçiş ertelenir", "Mola odasına gönderiliyor, ceza alıyor")).scores.ceza_yok).toBe(1);
    });
  });

  describe("jenerik aday", () => {
    it("ABC tablosu yapısı korunur (hakem içeriği ayırt eder); içerik jenerik", () => {
      const g = adapter.genericCandidate(plan()) as string;
      expect(g.split("\n")).toContain("| Öncül | Davranış | Sonuç |");
      expect(g).not.toContain("Yere yatma");
      expect(adapter.checks({ body: vaka("dav-01").body, output: g, rawText: g, alias: null }).scores.abc_tablo).toBe(1);
    });
  });
});
