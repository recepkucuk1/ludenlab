// apps/hub/evals/tools/atolye/veli-mektubu/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { mebHedef } from "@atolye/lib/meb-program";
import { veliMektubuInputSchema } from "@atolye/lib/veli-mektubu";
import { describe, expect, it } from "vitest";
import { profilBody } from "../../../lib/adapterFactory";
import { HarnessError, type AtolyeFixture, type CaseDef } from "../../../lib/core";
import { realFirstName, resolveFixture } from "../../../lib/fixtures";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { tempFlow } from "../../../lib/testFlow";
import { bekleyenler, istek, kos, rumuzOku, sonuclar } from "../baglanti";
import { adapter } from "./adapter";
import type { VeliMektubuBody } from "./checks";

/* Veli mektubunun bölüm listesi BOŞTUR (ürün istemi içerik kalemleri ister, başlık zorunlu kılmaz): ortak paket (`atolyeAdapterSuite`) `yapi: 1` ve
   bölüm silme testleri bu yüzden uygulanamaz. Burada paketin diğer tüm testleri aynen (bölüm kısımları dışında) yazılmıştır; yapı beklentisi `yapi: "—"`. */

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

describe("veli mektubu adaptörü — ortak paket (bölümsüz)", () => {
  it("vakalar: beklenen kimlikler, hepsi öğrencili ve fikstürleri çözülür; kimlik/modül/ölçütler", () => {
    expect(cases.map((c) => c.id)).toEqual(["vm-01", "vm-02", "vm-03", "vm-04"]);
    for (const c of cases) {
      expect(c.student, c.id).not.toBeNull();
      expect(resolveFixture("atolye", c.student)?.id, c.id).toBe(c.student);
      expect(c.purpose.trim().length, c.id).toBeGreaterThan(20);
      expect(c.tags.length, c.id).toBeGreaterThan(0);
    }
    expect(adapter.id).toBe("atolye/veli-mektubu");
    expect(adapter.module).toBe("atolye");
    expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(["veli_dili", "somut_oneri"]);
  });

  it("fikstürsüz çağrı harness_error; fikstürsüz hakem görevi hata verir; araca gitmeyenler notu hakem görevinde var", async () => {
    await expect(adapter.invoke(cases[0]!.body, null)).rejects.toMatchObject({ failureClass: "harness_error" });
    expect(() => adapter.renderTask(cases[0]!, null)).toThrow(HarnessError);
    for (const c of cases) {
      const t = adapter.renderTask(c, fikstur(c));
      expect(t, c.id).toContain("Hakem notu");
      expect(t, c.id).toContain("İLETİLMEDİ");
      expect(t, c.id).toContain(`- Neyi sınıyor: ${c.purpose}`);
    }
  });

  it("gerçek rota: tüm vakalar şemadan geçer; ürün isteminde rumuzlu öğrenci satırı, gerçek ad yok, istek satırları AYNEN; araca gitmeyenler yok", async () => {
    const flow = tempFlow("flow-veli-");
    const s = await kos(adapter.id, flow, cases.map((c) => c.id));
    expect(s).toMatchObject({ done: 0, failed: 0, pending: cases.length });
    const rows = bekleyenler(s.pendingPath);
    for (const c of cases) {
      const f = fikstur(c);
      const { md } = istek(rows, c.id);
      for (const p of ["ÖĞRENCİ PROFİLİ (uzman için bağlam", "İSTENEN YAPI (Markdown)", "MEKTUP"]) expect(md, `${c.id}: ${p}`).toContain(p);
      expect(rumuzOku(md), c.id).toBeTruthy();
      expect(md, c.id).not.toContain(realFirstName(f));
      // Etiket kayması koruması: hakemin okuduğu istek/profil satırları ürün isteminde birebir geçer.
      const satirlar = adapter.renderTask(c, f).split("\n").filter((l) => /^- (Amaç|Uzman notları|Güçlük profili|Güçlük düzeyi|Güçlü yönler|İlgi alanları): /.test(l));
      expect(satirlar.length, c.id).toBeGreaterThanOrEqual(3);
      for (const l of satirlar) expect(md, `${c.id}: ${l}`).toContain(l);
      // Araca GİTMEYENLER: önceki belgeler.
      const kullanici = md.slice(md.indexOf("<user>"));
      for (const d of f.documents) {
        const ilk = d.content.split("\n").find((l) => l.trim()) ?? "";
        if (ilk.length > 10) expect(kullanici, `${c.id}: ${ilk}`).not.toContain(ilk);
      }
      // Ürün, boş uzman notunu "—" yazar (hakeme satır gitmez); MEB bloğu yalnız kod varsa.
      if (!c.body.notlar) expect(md, c.id).toContain("- Uzman notları: —");
      if (c.body.mebHedefKod) expect(md, c.id).toContain("MEB HEDEF HİZALAMASI (uzman için bağlam — mektupta resmî kod/jargon YAZMA)");
      else expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI");
    }
  });

  it("gerçek rota: yanıt → fabrika puanları; sert hata yok; rumuz çıktıda gerçek ada geri konur", async () => {
    const flow = tempFlow("flow-veli1-");
    const id = cases[0]!.id;
    let s = await kos(adapter.id, flow, [id]);
    const { md, row } = istek(bekleyenler(s.pendingPath), id);
    writeFileSync(row.responseTxt, mektup(rumuzOku(md)!));
    s = await kos(adapter.id, flow, [id]);
    expect(s).toMatchObject({ done: 1, failed: 0, pending: 0 });
    const r = sonuclar(s.resultsPath)[0]!;
    expect(r.hard_fail).toEqual([]);
    expect(r.grade).toMatchObject({ ...IYI_PUANLAR, rumuz_yok: 1, dil_kurali: 1, yasak_kalip: 1 });
    expect(r.meta).toMatchObject({ alias_found: true });
  });

  describe("kontroller fabrika üzerinden", () => {
    const calistir = (text: string, alias: string | null = "Doruk", id = "vm-01") => adapter.checks({ body: vaka(id).body, output: text, rawText: text, alias });
    it("iyi örnek: sert hata yok; araca özgü puanlar ve talimat 1; yapı ölçülmez ('—'), taslak notu sonda, tanı cümlesi yok", () => {
      const r = calistir(mektup());
      expect(r.hard_fail).toEqual([]);
      expect(r.scores).toMatchObject(IYI_PUANLAR);
      expect(r.details).toMatchObject({ yapi: "—", taslak_sonda: 1, tani_cumlesi: 0 });
    });
    it("taslak notu yok / rumuz sızıntısı: sert hata; çıktı yok: talimat 0", () => {
      expect(calistir(mektup().replace(`⚠️ ${TASLAK_NOTU}`, "")).hard_fail).toContain("taslak_notu_yok");
      expect(calistir(mektup("Doruk")).hard_fail).toContain("rumuz_sizintisi");
      const r = adapter.checks({ body: cases[0]!.body, output: null, rawText: "", alias: null });
      expect(r.hard_fail).toContain("cikti_yok");
      expect(r.scores.talimat).toBe(0);
    });
    it("başlıksız (düzyazı) mektup yapı cezası almaz: başlık zorunlu değil", () => {
      const duz = mektup().replace("## Evde birlikte yapabileceğiniz etkinlikler\n", "Evde şunları deneyebilirsiniz:\n");
      expect(calistir(duz).scores).toMatchObject(IYI_PUANLAR);
    });
    it("etiket + resmî kod + tek etkinlik: puanlar düşer, sert hata yok; tanı cümlesi (fabrika) da yakalanır", () => {
      const kotu = adapter.checks({
        body: { amac: "ev_etkinligi", mebHedefKod: "5.1.14" },
        output: "Çocuğunuz diskalkulidir (5.1.14).\n- tek etkinlik\n\n⚠️ " + TASLAK_NOTU,
        rawText: "Çocuğunuz diskalkulidir (5.1.14).\n- tek etkinlik\n\n⚠️ " + TASLAK_NOTU,
        alias: null,
      });
      expect(kotu.scores).toMatchObject({ etiket_yok: 0, meb_kod_yok: 0, etkinlik_sayisi: 0 });
      expect(kotu.details.tani_cumlesi).toBe(1);
      expect(kotu.scores.talimat).toBeLessThan(0.5);
      expect(kotu.hard_fail).toEqual([]);
    });
    it("vm-02 (MEB kodu verildi): kod puanı vardır, etkinlik puanı yoktur (amaç bilgilendirme)", () => {
      const iyi = "Sayın veli,\n\nÇocuğunuzun resim ve kedilere ilgisi çok güzel; sayılarla çalışırken küçük adımlar atıyoruz.\n\nSevgiler\n\n⚠️ " + TASLAK_NOTU;
      const r = calistir(iyi, null, "vm-02");
      expect(r.scores).toMatchObject({ talimat: 1, etiket_yok: 1, meb_kod_yok: 1 });
      expect("etkinlik_sayisi" in r.scores).toBe(false);
      expect(calistir(iyi.replace("küçük adımlar", "5.1.14 hedefinde küçük adımlar"), null, "vm-02").scores.meb_kod_yok).toBe(0);
    });
  });

  it("hakem çizimi: çıktı olduğu gibi gider; boş/yok → hata metni", () => {
    expect(adapter.renderForJudge(mektup())).toBe(mektup());
    expect(adapter.renderForJudge("  ")).toContain("Çıktı üretilemedi");
    expect(adapter.renderForJudge(null)).toContain("Çıktı üretilemedi");
  });

  it("jenerik aday: ≥ 4 yasak kalıp, referanstan farklı; başlıklar ve taslak notu korunur; boş/yok girdide çökmez", () => {
    const g = adapter.genericCandidate(mektup()) as string;
    expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
    expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(mektup()));
    const satirlar = g.split("\n");
    expect(satirlar).toContain("## Evde birlikte yapabileceğiniz etkinlikler");
    expect(satirlar).toContain(`⚠️ ${TASLAK_NOTU}`);
    const r = adapter.checks({ body: cases[0]!.body, output: g, rawText: g, alias: null });
    expect(r.hard_fail).toEqual([]);
    expect(adapter.genericCandidate("")).toBe("");
    expect(() => adapter.genericCandidate(null)).not.toThrow();
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
