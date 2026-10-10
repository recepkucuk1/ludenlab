// apps/hub/evals/tools/atolye/ev-odevi/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { evOdeviInputSchema } from "@atolye/lib/ev-odevi";
import { mebHedef } from "@atolye/lib/meb-program";
import { describe, expect, it } from "vitest";
import { profilBody } from "../../../lib/adapterFactory";
import type { AtolyeFixture, CaseDef } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { atolyeAdapterSuite } from "../baglanti";
import { adapter } from "./adapter";
import { EV_ODEVI_BOLUM_LISTESI, type EvOdeviBody } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<EvOdeviBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const fikstur = (c: CaseDef<EvOdeviBody>) => resolveFixture("atolye", c.student) as AtolyeFixture;
const gorev = (id: string) => adapter.renderTask(vaka(id), fikstur(vaka(id)));

/** Tam, kurallara uygun ev çalışma programı (3 gün, her gün 15 dk; ısınma 3 dk); `ad` genel çerçevede geçer. */
const gunBlogu = (n: number, ana: string) => [
  `### Gün ${n}: ${ana}`,
  "- **Isınma (3 dk):** ba-be-bi hecelerini ritimle söyleyin.",
  `- **Ana etkinlik (10 dk):** ${ana} kartlarını birlikte okuyun.`,
  "- **Oyunlaştırma (2 dk):** Okunan kartı kaleye atın.",
  "",
];
const program = (ad = "Arda") =>
  [
    "## 1. Genel Çerçeve ve Ebeveyn Bilgilendirmesi",
    `${ad} için kısa, oyunlu ve baskısız üç günlük bir plan hazırladık; amaç keyif ve küçük başarılar.`,
    "- Çalışmayı her gün aynı saatte, akşam yemeğinden sonra yapın.",
    "- Hata yaptığında düzeltmek yerine doğru sözcüğü birlikte yeniden okuyun.", "",
    "## 2. Günlük Çalışma Planı", ...gunBlogu(1, "Hece avı"), ...gunBlogu(2, "Sözcük kartları"), ...gunBlogu(3, "Resimli okuma"),
    "## 3. Alternatif Yollar", "- Direnç olursa etkinliği 5 dakikaya indirin; ertesi gün kaldığınız yerden devam edin.", "",
    "## 4. Gözlem ve Uzmana Notlar (Aile için)", "- Takıldığı sözcükleri not edin ve seansa getirin.", "",
    `⚠️ ${TASLAK_NOTU}`,
  ].join("\n");

atolyeAdapterSuite(adapter, {
  idler: ["eo-01", "eo-02", "eo-03", "eo-04"],
  olcutler: ["rutine_yerlesme", "sure_uyumu"],
  ornek: program,
  iyiPuanlar: { talimat: 1, gun_sayisi: 1, sure_dilimi: 1 },
  istekEtiketleri: /^- (Hedeflenen Konu\/Beceri|Program Süresi|Uzman Yönergeleri \/ Ek Not|Güçlük profili|Güçlük düzeyi|Güçlü yönler|İlgi alanları): /,
  istemParcalari: ["ÖĞRENCİ PROFİLİ", "HEDEF & SÜRE", "İSTENEN YAPI (Markdown, sırayla)"],
  bolumler: ["Genel Çerçeve ve Ebeveyn Bilgilendirmesi", "Günlük Çalışma Planı", "Alternatif Yollar", "Gözlem ve Uzmana Notlar (Aile için)"],
  // Araca GİTMEYENLER: önceki belgeler (her belgenin ilk satırı).
  gitmeyen: (f) => f.documents.map((d) => d.content.split("\n").find((l) => l.trim()) ?? "").filter((l) => l.length > 10),
  istekEk(md, c) {
    if (!c.body.ekstraNot) expect(md, c.id).toContain("- Uzman Yönergeleri / Ek Not: Belirtilmedi");
    if (c.body.mebHedefKod) expect(md, c.id).toContain("MEB HEDEF HİZALAMASI");
    else expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI");
  },
});

describe("ev ödevi adaptörü — araca özgü", () => {
  it("vaka gövdeleri + fikstür profili rota şemasından geçer; gün sayıları 3/5/2/7 (alt ve üst uç dahil, sayı tipinde); MEB kodu geçerli", () => {
    for (const c of cases) {
      expect(evOdeviInputSchema.safeParse({ ...profilBody(fikstur(c)), ...c.body }).success, c.id).toBe(true);
      expect(typeof c.body.gunSayisi, c.id).toBe("number");
      expect(c.body.hedefKonu.length, c.id).toBeGreaterThanOrEqual(3);
      if (c.body.mebHedefKod) expect(mebHedef(c.body.mebHedefKod), c.id).toBeDefined();
    }
    expect(cases.map((c) => c.body.gunSayisi)).toEqual([3, 5, 2, 7]);
    expect(cases.map((c) => Boolean(c.body.ekstraNot))).toEqual([true, false, false, false]);
    expect(cases.map((c) => c.body.mebHedefKod)).toEqual([undefined, "5.1.14", undefined, undefined]);
  });

  it("bölüm regex'leri tek kaynak: 4 bölüm", () => {
    expect(EV_ODEVI_BOLUM_LISTESI).toHaveLength(4);
  });

  it("ürün istemi ödül/oyun tabanlı bitişi SERBEST bırakır ve ölçütler bunu yasaklamaz; süre ölçütü ürünün '15-20 dakikalık … dilimleri' ifadesini çoğul aktarır, okul öncesi beklentisi vaka amacındadır", () => {
    const urun = readFileSync(path.join(import.meta.dirname, "../../../../src/modules/atolye/lib/ev-odevi-prompts.ts"), "utf8");
    expect(urun).toContain("Oyunlaştırma/Pekiştirme (Ödül veya oyun tabanlı bitiriş)");
    expect(urun).toContain("15-20 dakikalık etkili, oyun temelli çalışma dilimleri");
    const rutin = adapter.criteria.find((c) => c.key === "rutine_yerlesme")!.question;
    const sureUyumu = adapter.criteria.find((c) => c.key === "sure_uyumu")!.question;
    expect(rutin).not.toMatch(/ödül yerine|ödülsüz|içsel motivasyon/);
    expect(sureUyumu).toContain("15–20 dk'lık dilimlerden");
    expect(sureUyumu).not.toContain("tek bir");
    expect(sureUyumu).not.toContain("alt uç");
    expect(vaka("eo-03").purpose).toContain("dilimin alt ucunda (15 dk, kısa bloklar)");
    expect(vaka("eo-03").purpose).not.toContain("10–15");
    expect(vaka("eo-01").purpose).not.toContain("ödülsüz");
  });

  describe("hakem görevi", () => {
    it("eo-01: ürün etiketleriyle hedef, süre (N günlük) ve ek not satırları; öğrenci bloğu; araca gitmeyenler notu", () => {
      const t = gorev("eo-01");
      expect(t).toContain("- Araç: Ev ödevi programı (Atölye)");
      expect(t).toContain("- Hedeflenen Konu/Beceri: İki heceli sözcükleri okuma");
      expect(t).toContain("- Program Süresi: 3 günlük");
      expect(t).toContain("- Uzman Yönergeleri / Ek Not: Akşam yemeğinden sonra 15 dk; kardeşi de evde.");
      expect(t).toContain("- Öğrenci: Arda Yılmaz, İlkokul (1–4. sınıf), 8 yaş");
      expect(t).toContain("çalışılan MEB bölümleri ve önceki belgeler araca İLETİLMEDİ");
      expect(t).not.toContain("MEB hedef");
    });
    it("eo-02: MEB kodu + hedef bloğu; ek not satırı yok (ürün 'Belirtilmedi' yazar, hakeme satır gitmez)", () => {
      const t = gorev("eo-02");
      expect(t).toContain("- Program Süresi: 5 günlük");
      expect(t).toContain("- MEB hedef kodu: 5.1.14");
      expect(t).toContain("• 5.1.14.1");
      expect(t).not.toContain("Uzman Yönergeleri");
      expect(t).not.toContain("Belirtilmedi");
    });
    it("eo-03/eo-04: yalnız hedef ve süre (boş bağlam, uydurma satır yok); süre etiketleri 2 ve 7 günlük", () => {
      expect(gorev("eo-03")).toContain("- Program Süresi: 2 günlük");
      const t = gorev("eo-04");
      expect(t).toContain("- Program Süresi: 7 günlük");
      for (const yok of ["Uzman Yönergeleri", "MEB hedef"]) expect(t, yok).not.toContain(yok);
    });
    it("hedef davranış kodları verilirse yalnız işaretliler hakem görevine girer", () => {
      const c = { ...vaka("eo-02"), body: { ...vaka("eo-02").body, mebDavranisKodlari: ["5.1.14.1"] } };
      const t = adapter.renderTask(c, fikstur(c));
      expect(t).toContain("• 5.1.14.1 ");
      expect(t).not.toContain("• 5.1.14.2 ");
    });
  });

  describe("kontroller fabrika üzerinden", () => {
    const calistir = (text: string, id = "eo-01") => adapter.checks({ body: vaka(id).body, output: text, rawText: text, alias: "Doruk" });
    it("gün sayısı tutmuyor (3 program, 5 istendi): gun_sayisi 0, talimat düşer, sert hata yok", () => {
      const r = calistir(program(), "eo-02");
      expect(r.scores).toMatchObject({ gun_sayisi: 0, sure_dilimi: 1 });
      expect(r.scores.talimat).toBeLessThan(1);
      expect(r.hard_fail).toEqual([]);
    });
    it("uzun dilim (45 dk): sure_dilimi düşer; 'geçmesin' üst sınırı ve alternatif bölümündeki süre cezalandırılmaz", () => {
      const r = calistir(program().replace("Ana etkinlik (10 dk)", "Ana etkinlik (45 dk)"));
      expect(r.scores.sure_dilimi).toBeCloseTo(8 / 9);
      expect(r.scores.talimat).toBeLessThan(1);
      const iyi = program().replace("5 dakikaya indirin", "5 dakikaya indirin; çalışma 30 dakikayı geçmesin ve alternatif etkinlik 40 dakika sürmesin");
      expect(calistir(iyi).scores).toMatchObject({ talimat: 1, sure_dilimi: 1 });
    });
    it("7 günlük program (eo-04): tam 7 gün başlığı → gun_sayisi 1; 6 gün → 0", () => {
      const yedi = ["## 1. Genel Çerçeve ve Ebeveyn Bilgilendirmesi", "Kısa not.", "## 2. Günlük Çalışma Planı", ...Array.from({ length: 7 }, (_, i) => gunBlogu(i + 1, `Konu ${i + 1}`)).flat(), "## 3. Alternatif Yollar", "- Esnek olun.", "## 4. Gözlem ve Uzmana Notlar (Aile için)", "- Not alın.", "", `⚠️ ${TASLAK_NOTU}`].join("\n");
      expect(calistir(yedi, "eo-04").scores).toMatchObject({ talimat: 1, gun_sayisi: 1, sure_dilimi: 1 });
      expect(calistir(yedi.replace("### Gün 7: Konu 7", "### Notlar"), "eo-04").scores.gun_sayisi).toBe(0);
    });
  });

  describe("jenerik aday", () => {
    it("gün başlıkları ve süreler jenerik içerikle gider: gun_sayisi korunur (başlıklar kalır), sure_dilimi 0 (süreli satırlar jenerikleşir)", () => {
      const g = adapter.genericCandidate(program()) as string;
      const r = adapter.checks({ body: vaka("eo-01").body, output: g, rawText: g, alias: null });
      expect(r.scores).toMatchObject({ gun_sayisi: 1, sure_dilimi: 0 });
    });
  });
});
