// apps/hub/evals/tools/atolye/davranis/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { davranisInputSchema } from "@atolye/lib/davranis";
import { mebHedef } from "@atolye/lib/meb-program";
import { describe, expect, it } from "vitest";
import { HarnessError, type AtolyeFixture, type CaseDef } from "../../../lib/core";
import { realFirstName, resolveFixture } from "../../../lib/fixtures";
import { profilBody } from "../../../lib/adapterFactory";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { bekleyenler, geciciAkis, istek, kos, rumuzOku, sonuclar } from "../baglanti";
import { adapter } from "./adapter";
import type { DavranisBody } from "./checks";

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

describe("davranış destek planı adaptörü", () => {
  it("4 vaka, hepsi öğrencili ve fikstürleri çözülür; 4 ortak + 2 araç ölçütü", () => {
    expect(cases.map((c) => c.id)).toEqual(["dav-01", "dav-02", "dav-03", "dav-04"]);
    for (const c of cases) expect(resolveFixture("atolye", c.student)?.id, c.id).toBe(c.student);
    expect(adapter.id).toBe("atolye/davranis");
    expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(["islev_analizi", "onleyici_strateji"]);
  });

  it("vaka gövdeleri + fikstür profili rota şemasından geçer; ortam çeşitli; dav-03 'veri yok' (sıklık alanı boş)", () => {
    for (const c of cases) {
      const r = davranisInputSchema.safeParse({ ...profilBody(fikstur(c)), ...c.body });
      expect(r.success, c.id).toBe(true);
      if (c.body.mebHedefKod) expect(mebHedef(c.body.mebHedefKod), c.id).toBeDefined();
    }
    expect(cases.map((c) => c.body.ortam)).toEqual(["sinif", "seans", "ev", "genel"]);
    expect(vaka("dav-03").body.siklikSure).toBeUndefined();
    expect(vaka("dav-02").body.siklikSure).toBeUndefined();
    expect(vaka("dav-01").body.siklikSure).toBeTruthy();
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
      expect(t).toContain("- Neyi sınıyor: Sıklık verisine dayalı ABC");
    });
    it("dav-03: sıklık satırı yok (uydurma yok); ortam ev", () => {
      const t = gorev("dav-03");
      expect(t).toContain("- Ortam: ev");
      expect(t).not.toContain("Sıklık/süre");
    });
    it("MEB kodu verilen gövdede kod + hedef bloğu hakem görevine girer", () => {
      const c = { ...vaka("dav-01"), body: { ...vaka("dav-01").body, mebHedefKod: "3.2.5" } };
      const t = adapter.renderTask(c, fikstur(c));
      expect(t).toContain("- MEB hedef kodu: 3.2.5");
      expect(t).toContain("• 3.2.5.1");
    });
  });

  it("fikstürsüz çağrı harness_error; fikstürsüz hakem görevi hata verir", async () => {
    await expect(adapter.invoke(vaka("dav-01").body, null)).rejects.toMatchObject({ failureClass: "harness_error" });
    expect(() => adapter.renderTask(vaka("dav-01"), null)).toThrow(HarnessError);
  });

  describe("gerçek rota (subagent düzeneği: istek yazılır, yanıt okunur) — bağlantı", () => {
    it("4 vakanın hepsi rota şemasından geçer; istekte rumuzlu öğrenci satırı, gerçek ad yok; istek ve profil satırları ürün isteminde AYNEN geçer", async () => {
      const flow = geciciAkis("dav");
      const s = await kos("atolye/davranis", flow, cases.map((c) => c.id));
      expect(s).toMatchObject({ done: 0, failed: 0, pending: 4 });
      const rows = bekleyenler(s.pendingPath);
      for (const c of cases) {
        const { md } = istek(rows, c.id);
        expect(md, c.id).toContain("ÖĞRENCİ PROFİLİ");
        expect(md, c.id).toContain("İSTENEN YAPI (Markdown, sırayla)");
        expect(rumuzOku(md), c.id).toBeTruthy();
        expect(md, c.id).not.toContain(realFirstName(fikstur(c)));
        const satirlar = adapter.renderTask(c, fikstur(c)).split("\n").filter((l) => /^- (Hedef davranış|Ortam|Sıklık\/süre gözlemi|Güçlük profili|Güçlük düzeyi|Güçlü yönler|İlgi alanları): /.test(l));
        expect(satirlar.length, c.id).toBeGreaterThanOrEqual(4);
        for (const l of satirlar) expect(md, `${c.id}: ${l}`).toContain(l);
        if (!c.body.siklikSure) expect(md, c.id).toContain("- Sıklık/süre gözlemi: —");
        expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI");
      }
    });

    it("dav-01: yanıt → puanlar (ABC tablosu, ceza yok); rumuz sızıntısı yok", async () => {
      const flow = geciciAkis("dav1");
      let s = await kos("atolye/davranis", flow, ["dav-01"]);
      const { md, row } = istek(bekleyenler(s.pendingPath), "dav-01");
      writeFileSync(row.responseTxt, plan(rumuzOku(md)!));
      s = await kos("atolye/davranis", flow, ["dav-01"]);
      expect(s).toMatchObject({ done: 1, failed: 0, pending: 0 });
      const r = sonuclar(s.resultsPath)[0]!;
      expect(r.hard_fail).toEqual([]);
      expect(r.grade).toMatchObject({ talimat: 1, abc_tablo: 1, ceza_yok: 1, rumuz_yok: 1, dil_kurali: 1 });
    });
  });

  describe("kontroller fabrika üzerinden", () => {
    const calistir = (text: string, alias: string | null = "Doruk") => adapter.checks({ body: vaka("dav-01").body, output: text, rawText: text, alias });
    it("iyi çıktı: sert hata yok, talimat 1 ('Cezasız' pekiştirme ceza sayılmaz)", () => {
      const r = calistir(plan());
      expect(r.hard_fail).toEqual([]);
      expect(r.scores).toMatchObject({ talimat: 1, abc_tablo: 1, ceza_yok: 1 });
      expect(r.details).toMatchObject({ yapi: 1, taslak_sonda: 1, tani_cumlesi: 0 });
    });
    it("time-out önerisi + tablosuz ABC: talimat düşer, sert hata yok", () => {
      const kotu = plan().replace("| Öncül | Davranış | Sonuç |\n|---|---|---|\n| Oyundan masaya geçiş | Yere yatma | Geçiş ertelenir |", "- Öncül: geçiş").replace("Cezasız, olumlu ve kademeli pekiştirme.", "Time-out uygulayın.");
      const r = calistir(kotu);
      expect(r.scores).toMatchObject({ abc_tablo: 0, ceza_yok: 0 });
      expect(r.scores.talimat).toBeLessThan(0.8);
      expect(r.hard_fail).toEqual([]);
    });
    it("taslak notu yok / rumuz sızıntısı: sert hata; çıktı yok: talimat 0", () => {
      expect(calistir(plan().replace(`⚠️ ${TASLAK_NOTU}`, "")).hard_fail).toContain("taslak_notu_yok");
      expect(calistir(plan("Doruk")).hard_fail).toContain("rumuz_sizintisi");
      const r = adapter.checks({ body: vaka("dav-01").body, output: null, rawText: "", alias: null });
      expect(r.hard_fail).toContain("cikti_yok");
      expect(r.scores.talimat).toBe(0);
    });
  });

  describe("hakem çizimi", () => {
    it("çıktı olduğu gibi gider; boşsa hata metni", () => {
      expect(adapter.renderForJudge(plan())).toBe(plan());
      expect(adapter.renderForJudge("")).toContain("Çıktı üretilemedi");
    });
  });

  describe("jenerik aday", () => {
    it("≥ 4 yasak kalıp taşır, referanstan farklı; başlıklar ve taslak notu korunur; ABC tablosu jenerik hücrelere döner", () => {
      const g = adapter.genericCandidate(plan()) as string;
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(plan()));
      for (const h of ["## 2. ABC analizi", "| Öncül | Davranış | Sonuç |", `⚠️ ${TASLAK_NOTU}`]) expect(g.split("\n"), h).toContain(h);
      expect(g).not.toContain("Yere yatma");
      const r = adapter.checks({ body: vaka("dav-01").body, output: g, rawText: g, alias: null });
      expect(r.scores.abc_tablo).toBe(1); // yapı korunur: hakem içeriği ayırt eder
      expect(r.hard_fail).toEqual([]);
    });
    it("boş çıktıda çökmez", () => {
      expect(adapter.genericCandidate("")).toBe("");
      expect(() => adapter.genericCandidate(null)).not.toThrow();
    });
  });
});
