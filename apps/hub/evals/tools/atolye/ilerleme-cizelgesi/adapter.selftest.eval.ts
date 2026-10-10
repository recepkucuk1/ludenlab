// apps/hub/evals/tools/atolye/ilerleme-cizelgesi/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { ilerlemeCizelgesiInputSchema } from "@atolye/lib/ilerleme-cizelgesi";
import { mebHedef } from "@atolye/lib/meb-program";
import { describe, expect, it } from "vitest";
import { profilBody } from "../../../lib/adapterFactory";
import type { AtolyeFixture, CaseDef } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { atolyeAdapterSuite } from "../baglanti";
import { adapter } from "./adapter";
import { ILERLEME_BOLUM_LISTESI, type IlerlemeBody } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<IlerlemeBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const fikstur = (c: CaseDef<IlerlemeBody>) => resolveFixture("atolye", c.student) as AtolyeFixture;
const gorev = (id: string) => adapter.renderTask(vaka(id), fikstur(vaka(id)));

/** Tam, kurallara uygun ilerleme çizelgesi (dört bölüm, 4 sütunlu BOŞ tablo, 3 örnek satır başlığı); `ad` bileşenlerde geçer. */
const cizelge = (ad = "Arda", satirlar = ["| | 10 sözcükten doğru okunan | | |", "| | Resim desteği gereken sözcük sayısı | | |", "| | Üst üste başarılı oturum sayısı | | |"]) =>
  [
    "## 1. Hedefin gözlenebilir bileşenleri",
    `- Davranış: ${ad} iki heceli sözcükleri okur; ölçüt: 8/10 doğruluk; koşul: resim desteğiyle.`,
    "- Gösterge: üç ardışık oturum.", "",
    "## 2. Veri toplama çizelgesi",
    "| Tarih | Ölçüt/Gösterge | Sonuç (% veya sıklık) | Not |", "|---|---|---|---|", ...satirlar, "",
    "## 3. Ölçüm sıklığı ve yöntemi",
    "- Haftada iki oturumda, her oturumun sonunda 10 sözcüklük listeyle; doğru sayısı Sonuç sütununa yazılır.", "",
    "## 4. İlerleme yorumlama notu",
    "- Üç ardışık oturumda 8/10 ve üzeri ise hedef kazanılmış sayılır; iki ölçüm üst üste düşerse yöntem gözden geçirilir.", "",
    `⚠️ ${TASLAK_NOTU}`,
  ].join("\n");

atolyeAdapterSuite(adapter, {
  idler: ["ic-01", "ic-02", "ic-03", "ic-04"],
  olcutler: ["veri_sadakati", "olcut_netligi"],
  ornek: (ad) => cizelge(ad),
  iyiPuanlar: { talimat: 1, tablo_var: 1, sutunlar: 1, sonuc_bos: 1 },
  istekEtiketleri: /^- (Güçlük profili|Güçlük düzeyi|Güçlü yönler|İlgi alanları): /,
  istemParcalari: ["ÖĞRENCİ PROFİLİ", "HEDEF", "İSTENEN YAPI (Markdown, sırayla)"],
  bolumler: ["Hedefin gözlenebilir bileşenleri", "Veri toplama çizelgesi", "Ölçüm sıklığı ve yöntemi", "İlerleme yorumlama notu"],
  // Araca GİTMEYENLER: önceki belgeler (her belgenin ilk satırı).
  gitmeyen: (f) => f.documents.map((d) => d.content.split("\n").find((l) => l.trim()) ?? "").filter((l) => l.length > 10),
  istekEk(md, c) {
    // Ürün hedefi etiketsiz, "HEDEF" başlığı altına düz metin basar.
    expect(md, c.id).toContain(`HEDEF\n${c.body.hedefMetni}\n`);
    if (c.body.mebHedefKod) expect(md, c.id).toContain("MEB HEDEF HİZALAMASI");
    else expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI");
  },
});

describe("ilerleme çizelgesi adaptörü — araca özgü", () => {
  it("vaka gövdeleri + fikstür profili rota şemasından geçer (hedef ≤ 600 karakter); MEB kodu yalnız ic-01'de ve geçerli", () => {
    for (const c of cases) {
      expect(ilerlemeCizelgesiInputSchema.safeParse({ ...profilBody(fikstur(c)), ...c.body }).success, c.id).toBe(true);
      if (c.body.mebHedefKod) expect(mebHedef(c.body.mebHedefKod), c.id).toBeDefined();
    }
    expect(cases.map((c) => c.body.mebHedefKod)).toEqual(["3.2.5", undefined, undefined, undefined]);
  });

  it("bölüm regex'leri tek kaynak: 4 bölüm", () => {
    expect(ILERLEME_BOLUM_LISTESI).toHaveLength(4);
  });

  it("ic-03 amacı ürün şablonuyla çelişmez (ürün dört sütun ister: hata türü 'Not' sütununa gider)", () => {
    expect(vaka("ic-03").purpose).toContain("Not sütununun");
    expect(vaka("ic-03").purpose).not.toContain("hata türü notu sütunu");
  });

  describe("hakem görevi", () => {
    it("ic-01: hedef metni, MEB kodu + hedef bloğu; öğrenci bloğu; araca gitmeyenler notu", () => {
      const t = gorev("ic-01");
      expect(t).toContain("- Araç: İlerleme çizelgesi (Atölye)");
      expect(t).toContain("- Hedef: Tanıtılan seslerden oluşan iki heceli 10 sözcüğü resim desteğiyle üç ardışık oturumda 8/10 doğrulukla okur");
      expect(t).toContain("- MEB hedef kodu: 3.2.5");
      expect(t).toContain("• 3.2.5.1");
      expect(t).toContain("- Öğrenci: Arda Yılmaz, İlkokul (1–4. sınıf), 8 yaş");
      expect(t).toContain("çalışılan MEB bölümleri ve önceki belgeler araca İLETİLMEDİ");
    });
    it("ic-02..ic-04: yalnız hedef (MEB yok); ic-02 okul öncesi, ic-04 disgrafi", () => {
      for (const id of ["ic-02", "ic-03", "ic-04"]) expect(gorev(id), id).not.toContain("MEB hedef");
      expect(gorev("ic-02")).toContain("- Hedef: Etkinlik geçişinde görsel uyarıdan sonra 2 dakika içinde yönergeye uyar; 5 günün 4'ünde");
      expect(gorev("ic-02")).toContain("Okul öncesi");
      expect(gorev("ic-04")).toContain("Disgrafi");
    });
    it("hedef davranış kodları verilirse yalnız işaretliler hakem görevine girer", () => {
      const c = { ...vaka("ic-01"), body: { ...vaka("ic-01").body, mebDavranisKodlari: ["3.2.5.1"] } };
      const t = adapter.renderTask(c, fikstur(c));
      expect(t).toContain("• 3.2.5.1");
      expect(t).not.toContain("• 3.2.5.2");
    });
  });

  describe("kontroller fabrika üzerinden", () => {
    const calistir = (text: string, id = "ic-01") => adapter.checks({ body: vaka(id).body, output: text, rawText: text, alias: "Doruk" });
    it("uydurma sonuç (iki satırda %80/%90): sonuc_bos 1/3'e iner, talimat düşer, sert hata yok", () => {
      const r = calistir(cizelge("Arda", ["| 1.10 | 10 sözcükten doğru okunan | %80 | iyi |", "| 3.10 | Resim desteği gereken sözcük sayısı | %90 | |", "| | Üst üste başarılı oturum sayısı | | |"]));
      expect(r.scores).toMatchObject({ tablo_var: 1, sutunlar: 1 });
      expect(r.scores.sonuc_bos).toBeCloseTo(1 / 3);
      expect(r.scores.talimat).toBeLessThan(1);
      expect(r.hard_fail).toEqual([]);
    });
    it("tablosuz çizelge (maddeler): tablo_var/sutunlar/sonuc_bos 0, talimat belirgin düşer", () => {
      const duz = cizelge().replace(/\| Tarih[\s\S]*?\n\n/, "- Tarih\n- Ölçüt\n\n");
      const r = calistir(duz);
      expect(r.scores).toMatchObject({ tablo_var: 0, sutunlar: 0, sonuc_bos: 0 });
      expect(r.scores.talimat).toBeLessThan(0.7);
    });
    it("yer tutuculu sonuç hücreleri ('—', '…', '___/10') boştur: talimat 1", () => {
      expect(calistir(cizelge("Arda", ["| | a | — | |", "| | b | …/10 | |", "| | c | ___ | |"])).scores).toMatchObject({ talimat: 1, sonuc_bos: 1 });
    });
    it("bileşen tablosu veri toplama çizelgesinden önce gelse de çizelge seçilir", () => {
      const iki = cizelge().replace("- Gösterge: üç ardışık oturum.", "- Gösterge: üç ardışık oturum.\n\n| Bileşen | Ölçüt | Koşul |\n|---|---|---|\n| Okuma | 8/10 | resimli |");
      expect(calistir(iki).scores).toMatchObject({ talimat: 1, sutunlar: 1, sonuc_bos: 1 });
    });
  });

  describe("jenerik aday", () => {
    it("tablo yapısı korunur (hakem içeriği ayırt eder), içerik jenerik: tablo_var 1, sutunlar 1, sonuc_bos 0 (hücreler jenerik cümleyle dolar)", () => {
      const g = adapter.genericCandidate(cizelge()) as string;
      expect(g.split("\n")).toContain("| Tarih | Ölçüt/Gösterge | Sonuç (% veya sıklık) | Not |");
      expect(g).not.toContain("10 sözcükten doğru okunan");
      const r = adapter.checks({ body: vaka("ic-01").body, output: g, rawText: g, alias: null });
      expect(r.scores).toMatchObject({ tablo_var: 1, sutunlar: 1, sonuc_bos: 0 });
    });
  });
});
