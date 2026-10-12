// apps/hub/evals/tools/atolye/veli-mektubu/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { mebHedef } from "@atolye/lib/meb-program";
import { veliMektubuInputSchema } from "@atolye/lib/veli-mektubu";
import { describe, expect, it } from "vitest";
import { profilBody } from "../../../lib/adapterFactory";
import type { AtolyeFixture, CaseDef } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { atolyeAdapterSuite } from "../baglanti";
import { adapter } from "./adapter";
import type { VeliMektubuBody } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<VeliMektubuBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const fikstur = (c: CaseDef<VeliMektubuBody>) => resolveFixture("atolye", c.student) as AtolyeFixture;
const gorev = (id: string) => adapter.renderTask(vaka(id), fikstur(vaka(id)));

/** Tam, kurallara uygun veli mektubu (güçlü yönle açılış, 4 somut etkinlik, gerçekçi beklenti, kapanış, kod/etiket yok); `ad` açılışta geçer. */
const mektup = (ad = "Arda") =>
  [
    "Sayın veli,",
    "",
    `${ad} bu hafta sözel anlatımıyla ve futbol bilgisiyle bizi çok mutlu etti; hikâye anlatırken gözleri parlıyor.`,
    "",
    "## Evde birlikte yapabileceğiniz etkinlikler",
    "- Hece kartlarıyla 5 dakikalık bir kart avı oyunu oynayın.",
    "- Günde 10 dakika sırayla sesli okuyun.",
    "- Okuduğunuz sözcüklerle futbol temalı kısa cümleler kurun.",
    "- Akşam yemeğinde bugün okuduğunuz bir sözcüğü birlikte tahmin edin.",
    "",
    "Gelişme küçük adımlarla olur; sabırla ve oyunla ilerleyeceğiz.",
    "",
    "Her sorunuzda bize ulaşabilirsiniz; birlikte çalışmaktan mutluluk duyarız.",
    "",
    "Sevgiler,",
    "Uzmanınız",
    "",
    `⚠️ ${TASLAK_NOTU}`,
  ].join("\n");

const IYI_PUANLAR = { talimat: 1, etiket_yok: 1, etkinlik_sayisi: 1 };

atolyeAdapterSuite(adapter, {
  idler: ["vm-01", "vm-02", "vm-03", "vm-04"],
  olcutler: ["veli_dili", "somut_oneri"],
  ornek: mektup,
  iyiPuanlar: IYI_PUANLAR,
  istekEtiketleri: /^- (Amaç|Uzman notları|Güçlük profili|Güçlük düzeyi|Güçlü yönler|İlgi alanları): /,
  istemParcalari: ["ÖĞRENCİ PROFİLİ (uzman için bağlam", "İSTENEN YAPI (Markdown)", "MEKTUP"],
  bolumler: [], // başlık zorunlu değil: yapı ölçülmez (`yapi: "—"`), bölüm silme testleri atlanır
  // Araca GİTMEYENLER: önceki belgeler (her belgenin ilk satırı).
  gitmeyen: (f) => f.documents.map((d) => d.content.split("\n").find((l) => l.trim()) ?? "").filter((l) => l.length > 10),
  istekEk(md, c) {
    // Ürün, boş uzman notunu "—" yazar (hakeme satır gitmez); MEB bloğu yalnız kod varsa.
    if (!c.body.notlar) expect(md, c.id).toContain("- Uzman notları: —");
    if (c.body.mebHedefKod) expect(md, c.id).toContain("MEB HEDEF HİZALAMASI (uzman için bağlam — mektupta resmî kod/jargon YAZMA)");
    else expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI");
  },
});

describe("veli mektubu — fabrika üzerinden araca özgü kontroller", () => {
  const calistir = (text: string, alias: string | null = "Doruk", id = "vm-01") => adapter.checks({ body: vaka(id).body, output: text, rawText: text, alias });
  it("başlıksız (düzyazı) mektup yapı cezası almaz: başlık zorunlu değil", () => {
    const duz = mektup().replace("## Evde birlikte yapabileceğiniz etkinlikler\n", "Evde şunları deneyebilirsiniz:\n");
    expect(calistir(duz).scores).toMatchObject(IYI_PUANLAR);
  });
  it("etiket (TANI'nın yakalamadığı) + resmî kod + tek etkinlik: puanlar düşer, sert hata yok", () => {
    const metin = "Çocuğunuzun diskalkulisi var (5.1.14).\n- tek etkinlik\n\n⚠️ " + TASLAK_NOTU;
    const kotu = adapter.checks({ body: { amac: "ev_etkinligi", mebHedefKod: "5.1.14" }, output: metin, rawText: metin, alias: null });
    expect(kotu.scores).toMatchObject({ etiket_yok: 0, meb_kod_yok: 0, etkinlik_sayisi: 0 });
    expect(kotu.details.tani_cumlesi).toBe(0);
    expect(kotu.scores.talimat).toBeLessThan(0.5);
    expect(kotu.hard_fail).toEqual([]);
  });
  it("tanı iddiası TEK ağırlık: 'Çocuğunuz diskalkulidir' (TANI yakalar) yalnız tani_cumlesi'ni, 'Çocuğunuzun diskalkulisi var' yalnız etiket_yok'u düşürür; ikisinde de bir bileşen kaybı", () => {
    const govdeli = (c: string) => mektup().replace("Sayın veli,", `Sayın veli, ${c}`);
    const tanili = calistir(govdeli("Çocuğunuz diskalkulidir."));
    const tanisiz = calistir(govdeli("Çocuğunuzun diskalkulisi var."));
    expect(tanili.details).toMatchObject({ tani_cumlesi: 1 });
    expect(tanili.scores.etiket_yok).toBe(1);
    expect(tanisiz.details).toMatchObject({ tani_cumlesi: 0 });
    expect(tanisiz.scores.etiket_yok).toBe(0);
    // bileşenler: taslak notu sonda, tanı cümlesi yok, etiket_yok, etkinlik_sayisi → biri kayıp: 3/4
    expect(tanili.scores.talimat).toBeCloseTo(0.75);
    expect(tanisiz.scores.talimat).toBeCloseTo(0.75);
  });
  it("vm-02 (MEB kodu verildi): kod puanı vardır, etkinlik puanı yoktur (amaç bilgilendirme)", () => {
    const iyi = "Sayın veli,\n\nÇocuğunuzun resim ve kedilere ilgisi çok güzel; sayılarla çalışırken küçük adımlar atıyoruz.\n\nSevgiler\n\n⚠️ " + TASLAK_NOTU;
    const r = calistir(iyi, null, "vm-02");
    expect(r.scores).toMatchObject({ talimat: 1, etiket_yok: 1, meb_kod_yok: 1 });
    expect("etkinlik_sayisi" in r.scores).toBe(false);
    expect(calistir(iyi.replace("küçük adımlar", "5.1.14 hedefinde küçük adımlar"), null, "vm-02").scores.meb_kod_yok).toBe(0);
  });
});

describe("veli mektubu adaptörü — araca özgü", () => {
  it("vaka gövdeleri + fikstür profili rota şemasından geçer; üç amaç da var; MEB kodu yalnız vm-02'de ve geçerli", () => {
    for (const c of cases) {
      expect(veliMektubuInputSchema.safeParse({ ...profilBody(fikstur(c)), ...c.body }).success, c.id).toBe(true);
      if (c.body.mebHedefKod) expect(mebHedef(c.body.mebHedefKod), c.id).toBeDefined();
    }
    expect(cases.map((c) => c.body.amac)).toEqual(["ev_etkinligi", "bilgilendirme", "gorusme_ozeti", "bilgilendirme"]);
    expect(cases.map((c) => c.body.mebHedefKod)).toEqual([undefined, "5.1.14", undefined, undefined]);
    expect(cases.map((c) => Boolean(c.body.notlar))).toEqual([true, false, true, false]);
  });

  it("bölüm listesi boştur (başlık zorunlu değil): yapı oranı ölçülmez", () => {
    const r = adapter.checks({ body: cases[0]!.body, output: mektup(), rawText: mektup(), alias: null });
    expect(r.details.yapi).toBe("—");
  });

  describe("hakem görevi", () => {
    it("vm-01: ürün etiketleriyle amaç ve uzman notları; öğrenci bloğu; araca gitmeyenler notu; MEB yok", () => {
      const t = gorev("vm-01");
      expect(t).toContain("- Araç: Veli mektubu (Atölye)");
      expect(t).toContain("- Amaç: evde yapılabilecek etkinlik önerileri");
      expect(t).toContain("- Uzman notları: Hece kartları eve verildi; günde 10 dk birlikte okuma.");
      expect(t).toContain("- Öğrenci: Arda Yılmaz, İlkokul (1–4. sınıf), 8 yaş");
      expect(t).toContain("çalışılan MEB bölümleri ve önceki belgeler araca İLETİLMEDİ");
      expect(t).not.toContain("MEB hedef");
      expect(t).not.toContain("YAZILMAMALI");
    });
    it("vm-02: MEB kodu + hedef bloğu hakem görevine girer ve 'kod mektupta yazılmamalı' notu eşlik eder; uzman notu satırı yok", () => {
      const t = gorev("vm-02");
      expect(t).toContain("- Amaç: genel bilgilendirme");
      expect(t).toContain("- MEB hedef kodu: 5.1.14");
      expect(t).toContain("• 5.1.14.1");
      expect(t).toContain("mektupta resmî kod/jargon YAZILMAMALI");
      expect(t).not.toContain("Uzman notları");
      expect(t.indexOf("- MEB hedef kodu:")).toBeLessThan(t.indexOf("YAZILMAMALI"));
    });
    it("vm-03: görüşme özeti etiketi; vm-04: yalnız amaç (boş bağlam, uydurma satır yok)", () => {
      expect(gorev("vm-03")).toContain("- Amaç: veli görüşmesi özeti");
      expect(gorev("vm-03")).toContain("- Uzman notları: Sınav uyarlamaları (ek süre, formül kartı)");
      const t = gorev("vm-04");
      expect(t).toContain("- Amaç: genel bilgilendirme");
      for (const yok of ["Uzman notları", "MEB hedef"]) expect(t, yok).not.toContain(yok);
    });
    it("hedef davranış kodları verilirse yalnız işaretliler hakem görevine girer", () => {
      const c = { ...vaka("vm-02"), body: { ...vaka("vm-02").body, mebDavranisKodlari: ["5.1.14.1"] } };
      const t = adapter.renderTask(c, fikstur(c));
      expect(t).toContain("• 5.1.14.1 ");
      expect(t).not.toContain("• 5.1.14.2 ");
    });
  });

  describe("jenerik aday", () => {
    it("etkinlik listesi yapısı kalır ama içerik jenerik: etkinlik_sayisi korunur, etiket yok", () => {
      const g = adapter.genericCandidate(mektup()) as string;
      const r = adapter.checks({ body: vaka("vm-01").body, output: g, rawText: g, alias: null });
      expect(r.scores).toMatchObject({ etiket_yok: 1, etkinlik_sayisi: 1 });
    });
  });
});
