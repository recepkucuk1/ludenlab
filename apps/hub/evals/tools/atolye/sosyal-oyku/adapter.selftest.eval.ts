// apps/hub/evals/tools/atolye/sosyal-oyku/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { mebHedef } from "@atolye/lib/meb-program";
import { sosyalOykuInputSchema } from "@atolye/lib/sosyal-oyku";
import { describe, expect, it } from "vitest";
import { profilBody } from "../../../lib/adapterFactory";
import type { AtolyeFixture, CaseDef } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { atolyeAdapterSuite } from "../baglanti";
import { adapter } from "./adapter";
import { SOSYAL_OYKU_BOLUM_LISTESI, type SosyalOykuBody } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<SosyalOykuBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const fikstur = (c: CaseDef<SosyalOykuBody>) => resolveFixture("atolye", c.student) as AtolyeFixture;
const gorev = (id: string) => adapter.renderTask(vaka(id), fikstur(vaka(id)));

/** Tam, kurallara uygun sosyal öykü (birinci kişi, 6 cümle, duygu adlandırılıp normalleştirilmiş, davranış seçilebilir); `ad` görsel önerisinde geçer. */
const oyku = (ad = "Efe") =>
  [
    "## 1. Sosyal öykü metni",
    "Oyunda sıramı beklemek bazen zor gelir. Ben o sırada heyecanlanırım ve bu çok normaldir. Her çocuk bazen heyecanlanır.",
    "Heyecan geçerli bir duygudur; ne yapacağımı ise ben seçebilirim. Derin bir nefes alırım ve dinozor kartımı sayarım. Sıram gelince oynarım ve arkadaşıma teşekkür ederim.",
    "",
    "## 2. Görsel / sahneleme önerisi", `- Üç sahne: ${ad} dinozor kartını tutarak sırada bekliyor; nefes alıyor; oyuna giriyor.`, "",
    "## 3. Kullanım yönergesi", "- Sakin bir anda ve olaydan hemen önce okuyun; günde bir kez tekrarlayın.", "",
    `⚠️ ${TASLAK_NOTU}`,
  ].join("\n");

atolyeAdapterSuite(adapter, {
  idler: ["so-01", "so-02", "so-03", "so-04"],
  olcutler: ["duygu_cercevesi", "kisalik"],
  ornek: oyku,
  iyiPuanlar: { talimat: 1, kisalik: 1, bakis_acisi: 1, duygu_cercevesi: 1 },
  istekEtiketleri: /^- (Durum|Bakış açısı|Hedef beceri|Güçlük profili|Güçlük düzeyi|Güçlü yönler|İlgi alanları): /,
  istemParcalari: ["ÖĞRENCİ PROFİLİ", "SENARYO", "İSTENEN YAPI (Markdown, sırayla)"],
  bolumler: ["Sosyal öykü metni", "Görsel / sahneleme önerisi", "Kullanım yönergesi"],
  // Araca GİTMEYENLER: önceki belgeler (her belgenin ilk satırı).
  gitmeyen: (f) => f.documents.map((d) => d.content.split("\n").find((l) => l.trim()) ?? "").filter((l) => l.length > 10),
  istekEk(md, c) {
    if (!c.body.hedefBeceri) expect(md, c.id).toContain("- Hedef beceri: —");
    expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI");
  },
});

describe("sosyal öykü adaptörü — araca özgü", () => {
  it("vaka gövdeleri + fikstür profili rota şemasından geçer; iki bakış açısı da var; hedef beceri bazı vakalarda yok", () => {
    for (const c of cases) {
      expect(sosyalOykuInputSchema.safeParse({ ...profilBody(fikstur(c)), ...c.body }).success, c.id).toBe(true);
      if (c.body.mebHedefKod) expect(mebHedef(c.body.mebHedefKod), c.id).toBeDefined();
    }
    expect(cases.map((c) => c.body.bakisAcisi)).toEqual(["birinci_kisi", "birinci_kisi", "ucuncu_kisi", "birinci_kisi"]);
    expect(cases.map((c) => Boolean(c.body.hedefBeceri))).toEqual([false, true, true, false]);
  });

  it("bölüm regex'leri tek kaynak: 3 bölüm (öykü, görsel/sahneleme, kullanım)", () => {
    expect(SOSYAL_OYKU_BOLUM_LISTESI).toHaveLength(3);
  });

  describe("hakem görevi", () => {
    it("so-01: ürün etiketleriyle durum ve bakış açısı satırları (hedef beceri yok); öğrenci bloğu; araca gitmeyenler notu", () => {
      const t = gorev("so-01");
      expect(t).toContain("- Araç: Sosyal öykü (Atölye)");
      expect(t).toContain("- Durum: Oyun sırasında sıramı beklemek");
      expect(t).toContain("- Bakış açısı: birinci kişi (ben dili)");
      expect(t).not.toContain("Hedef beceri");
      expect(t).toContain("- Öğrenci: Efe Kaplan, Okul öncesi (4–6 yaş), 5 yaş");
      expect(t).toContain("- Güçlük profili: DEHB — hiperaktif/dürtüsel baskın");
      expect(t).toContain("çalışılan MEB bölümleri ve önceki belgeler araca İLETİLMEDİ");
    });
    it("so-02/so-03: hedef beceri satırı; so-03 üçüncü kişi etiketi", () => {
      expect(gorev("so-02")).toContain("- Hedef beceri: Hatayı fark edip düzelterek okumaya devam etme");
      const t = gorev("so-03");
      expect(t).toContain("- Bakış açısı: üçüncü kişi");
      expect(t).toContain("- Hedef beceri: Nefes alıp kolay soruya geçme");
      expect(t).toContain("- Öğrenci: Tolga Aksoy, Lise (9. sınıf ve üzeri), 15 yaş");
    });
    it("so-04: boş bağlam (ilgi alanı/güçlü yön yok) uydurulmaz", () => {
      const t = gorev("so-04");
      for (const yok of ["İlgi alanları", "Güçlü yönler", "Hedef beceri", "MEB hedef"]) expect(t, yok).not.toContain(yok);
    });
    it("MEB kodu verilen gövdede kod + hedef bloğu hakem görevine girer; davranış kodları verilirse yalnız işaretliler", () => {
      const c = { ...vaka("so-01"), body: { ...vaka("so-01").body, mebHedefKod: "3.2.5", mebDavranisKodlari: ["3.2.5.1"] } };
      const t = adapter.renderTask(c, fikstur(c));
      expect(t).toContain("- MEB hedef kodu: 3.2.5");
      expect(t).toContain("• 3.2.5.1");
      expect(t).not.toContain("• 3.2.5.2");
    });
  });

  describe("kontroller fabrika üzerinden", () => {
    const calistir = (text: string, id = "so-01") => adapter.checks({ body: vaka(id).body, output: text, rawText: text, alias: "Doruk" });
    const hikaye3 = oyku()
      .replace(/Oyunda sıramı[^\n]*/, "Efe oyunda sırasını beklemek zorunda. Bu bazen zor gelir ve normaldir.")
      .replace(/Heyecan geçerli[^\n]*/, "Efe heyecanlanır. Derin nefes alır. Sıra gelince oynar.");
    it("üçüncü kişi istenen vakada (so-03) üçüncü kişi anlatım 1, ben dili 0; birinci kişi vakasında tersi", () => {
      expect(calistir(hikaye3, "so-03").scores).toMatchObject({ talimat: 1, bakis_acisi: 1, kisalik: 1 });
      expect(calistir(oyku(), "so-03").scores.bakis_acisi).toBe(0);
      expect(calistir(hikaye3, "so-01").scores.bakis_acisi).toBe(0);
    });
    it("'kötü bir duygu': talimat düşer, sert hata yok; olumsuzlanmış çerçeve ('kötü değil') cezalanmaz; 14 cümle kısalığı düşürür", () => {
      const kotu = oyku().replace("ve bu çok normaldir", "ve bu kötü bir duygudur");
      const r = calistir(kotu);
      expect(r.scores).toMatchObject({ duygu_cercevesi: 0, kisalik: 1, bakis_acisi: 1 });
      expect(r.scores.talimat).toBeLessThan(1);
      expect(r.hard_fail).toEqual([]);
      expect(calistir(oyku().replace("ve bu çok normaldir", "ve bu kötü bir duygu değildir")).scores).toMatchObject({ talimat: 1, duygu_cercevesi: 1 });
      const uzun = oyku().replace("Sıram gelince oynarım", Array.from({ length: 8 }, (_, i) => `Bekleyen arkadaşlarıma bakarım ${i}.`).join(" ") + " Sıram gelince oynarım");
      expect(calistir(uzun).scores.kisalik).toBe(0);
    });
  });

  describe("jenerik aday", () => {
    it("öykü ölçülerinden geçmez: jenerik cümleler ben dili/duygu çerçevesi taşımaz (bakis_acisi 0) ve öykü tek paragraf satırı kısalığı 0", () => {
      const g = adapter.genericCandidate(oyku()) as string;
      const r = adapter.checks({ body: vaka("so-01").body, output: g, rawText: g, alias: null });
      expect(r.scores).toMatchObject({ bakis_acisi: 0, kisalik: 0 });
    });
  });
});
