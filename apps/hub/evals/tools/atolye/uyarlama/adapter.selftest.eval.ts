// apps/hub/evals/tools/atolye/uyarlama/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { mebHedef } from "@atolye/lib/meb-program";
import { uyarlamaInputSchema } from "@atolye/lib/uyarlama";
import { describe, expect, it } from "vitest";
import { profilBody } from "../../../lib/adapterFactory";
import { HarnessError, type AtolyeFixture, type CaseDef } from "../../../lib/core";
import { realFirstName, resolveFixture } from "../../../lib/fixtures";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { tempFlow } from "../../../lib/testFlow";
import { bekleyenler, istek, kos, rumuzOku, sonuclar } from "../baglanti";
import { adapter } from "./adapter";
import type { UyarlamaBody } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<UyarlamaBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const fikstur = (c: CaseDef<UyarlamaBody>) => resolveFixture("atolye", c.student) as AtolyeFixture;
const gorev = (id: string) => adapter.renderTask(vaka(id), fikstur(vaka(id)));

/** Tam, kurallara uygun uyarlama önerisi; her maddede gerekçe (üç farklı biçim); `ad` bağlam özetinde geçer. */
const oneri = (ad = "Arda") =>
  [
    "## 1. Bağlam özeti (güçlük profili × ders × ortam)", `- ${ad} okuma ve dikkat güçlüğüyle Türkçe dersinde kaynaştırma sınıfında.`, "",
    "## 2. Sunum uyarlamaları",
    "- **Metin-okuma desteği:** Ders metni sesli okunur. *Gerekçe:* çözümleme yükünü azaltır.",
    "- **Görsel organizatör:** Paragraf başına kısa özet kutusu (dikkati metne bağlar).",
    "- **Yönergeyi bölme:** Her adım ayrı satırda — çok adımlı yönergede yerini kaybetmeyi önler.", "",
    "## 3. Yanıt/çıktı uyarlamaları",
    "- **Sözlü yanıt:** Yazma yerine kısa sözlü anlatım. Neden: sözel ifadesi güçlü, yazı yükü fazla.",
    "- **Anahtar sözcük kartı:** Yanıtta kart kullanılır, çünkü sözcük bulma yavaşlığı var.", "",
    "## 4. Ortam/zaman uyarlamaları",
    "- **Ek süre:** Okuma görevlerinde %50 ek süre (Gerekçe: okuma hızı yavaş).",
    "- **Bölünmüş görev:** 10 dakikalık bloklar arasında kısa mola (dikkat süresine destek olur).", "",
    "## 5. Değerlendirme/sınav uyarlamaları",
    "- **Sesli okunan sorular:** Gerekçe: soruyu çözümlerken yorulmasını önler.",
    "- **Sınavı iki oturuma bölme:** dikkat dağınıklığını azaltır, böylece bilgisini gösterir.", "",
    `⚠️ ${TASLAK_NOTU}`,
  ].join("\n");

describe("uyarlama önerisi adaptörü", () => {
  it("4 vaka, hepsi öğrencili ve fikstürleri çözülür; 4 ortak + 2 araç ölçütü", () => {
    expect(cases.map((c) => c.id)).toEqual(["uy-01", "uy-02", "uy-03", "uy-04"]);
    for (const c of cases) expect(resolveFixture("atolye", c.student)?.id, c.id).toBe(c.student);
    expect(adapter.id).toBe("atolye/uyarlama");
    expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(["sinif_uygulanabilirlik", "olcme_uyarlamasi"]);
  });

  it("vaka gövdeleri + fikstür profili rota şemasından geçer; dört ortamın üçü + 'ders yok'; MEB kodu verilirse geçerli", () => {
    for (const c of cases) {
      expect(uyarlamaInputSchema.safeParse({ ...profilBody(fikstur(c)), ...c.body }).success, c.id).toBe(true);
      if (c.body.mebHedefKod) expect(mebHedef(c.body.mebHedefKod), c.id).toBeDefined();
    }
    expect(cases.map((c) => c.body.ortam)).toEqual(["kaynastirma", "kaynastirma", "ev", "destek_egitim_odasi"]);
    expect(vaka("uy-03").body.ders).toBeUndefined();
  });

  describe("hakem görevi", () => {
    it("uy-01: ürün etiketleriyle iki bağlam satırı; öğrenci bloğu; araca gitmeyenler notu", () => {
      const t = gorev("uy-01");
      expect(t).toContain("- Araç: Uyarlama önerisi (Atölye)");
      expect(t).toContain("- Ders: Türkçe");
      expect(t).toContain("- Ortam: kaynaştırma sınıfı");
      expect(t).toContain("- Öğrenci: Arda Yılmaz, İlkokul (1–4. sınıf), 8 yaş");
      expect(t).toContain("çalışılan MEB bölümleri ve önceki belgeler araca İLETİLMEDİ");
      expect(t).not.toContain("MEB hedef");
    });
    it("uy-03: ders verilmediğinde ürün 'genel' yazar; ev ortamı", () => {
      const t = gorev("uy-03");
      expect(t).toContain("- Ders: genel");
      expect(t).toContain("- Ortam: ev");
    });
    it("boş ders dizesi de 'genel' (ürün: `i.ders || \"genel\"`); MEB kodu verilen gövdede kod + hedef bloğu girer", () => {
      const bos = { ...vaka("uy-03"), body: { ortam: "ev" as const, ders: "" } };
      expect(adapter.renderTask(bos, fikstur(bos))).toContain("- Ders: genel");
      const c = { ...vaka("uy-02"), body: { ...vaka("uy-02").body, mebHedefKod: "5.1.14" } };
      const t = adapter.renderTask(c, fikstur(c));
      expect(t).toContain("- MEB hedef kodu: 5.1.14");
      expect(t).toContain("• 5.1.14.12");
    });
    it("MEB davranış kodları verilirse hakem görevine yalnız onlar girer", () => {
      const c = { ...vaka("uy-02"), body: { ...vaka("uy-02").body, mebHedefKod: "5.1.14", mebDavranisKodlari: ["5.1.14.12"] } };
      const t = adapter.renderTask(c, fikstur(c));
      expect(t).toContain("• 5.1.14.12 ");
      expect(t).not.toContain("• 5.1.14.1 ");
    });
    it("uy-04: destek eğitim odası etiketi; boş bağlam (ilgi/güçlü yön yok) uydurulmaz", () => {
      const t = gorev("uy-04");
      expect(t).toContain("- Ders: Fen Bilimleri");
      expect(t).toContain("- Ortam: destek eğitim odası");
      for (const yok of ["İlgi alanları", "Güçlü yönler"]) expect(t, yok).not.toContain(yok);
    });
  });

  it("fikstürsüz çağrı harness_error; fikstürsüz hakem görevi hata verir", async () => {
    await expect(adapter.invoke(vaka("uy-01").body, null)).rejects.toMatchObject({ failureClass: "harness_error" });
    expect(() => adapter.renderTask(vaka("uy-01"), null)).toThrow(HarnessError);
  });

  describe("gerçek rota (subagent düzeneği: istek yazılır, yanıt okunur) — bağlantı", () => {
    it("4 vakanın hepsi rota şemasından geçer; istekte rumuzlu öğrenci satırı, gerçek ad yok; istek ve profil satırları ürün isteminde AYNEN geçer", async () => {
      const flow = tempFlow("flow-uy-");
      const s = await kos("atolye/uyarlama", flow, cases.map((c) => c.id));
      expect(s).toMatchObject({ done: 0, failed: 0, pending: 4 });
      const rows = bekleyenler(s.pendingPath);
      for (const c of cases) {
        const { md } = istek(rows, c.id);
        expect(md, c.id).toContain("ÖĞRENCİ PROFİLİ");
        expect(md, c.id).toContain("İSTENEN YAPI (Markdown, sırayla)");
        expect(md, c.id).toContain("Her madde için **kısa gerekçe**");
        expect(rumuzOku(md), c.id).toBeTruthy();
        expect(md, c.id).not.toContain(realFirstName(fikstur(c)));
        const satirlar = adapter.renderTask(c, fikstur(c)).split("\n").filter((l) => /^- (Ders|Ortam|Güçlük profili|Güçlük düzeyi|Güçlü yönler|İlgi alanları): /.test(l));
        expect(satirlar.length, c.id).toBeGreaterThanOrEqual(4);
        for (const l of satirlar) expect(md, `${c.id}: ${l}`).toContain(l);
        expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI");
      }
    });

    it("uy-01: yanıt → puanlar (gerekçe kapsaması); rumuz sızıntısı yok", async () => {
      const flow = tempFlow("flow-uy1-");
      let s = await kos("atolye/uyarlama", flow, ["uy-01"]);
      const { md, row } = istek(bekleyenler(s.pendingPath), "uy-01");
      writeFileSync(row.responseTxt, oneri(rumuzOku(md)!));
      s = await kos("atolye/uyarlama", flow, ["uy-01"]);
      expect(s).toMatchObject({ done: 1, failed: 0, pending: 0 });
      const r = sonuclar(s.resultsPath)[0]!;
      expect(r.hard_fail).toEqual([]);
      expect(r.grade).toMatchObject({ talimat: 1, gerekce: 1, rumuz_yok: 1, dil_kurali: 1 });
    });
  });

  describe("ölçüt metinleri vakalarla çelişmez", () => {
    const soru = (k: string) => adapter.criteria.find((c) => c.key === k)!.question;
    it("uygulanabilirlik ölçütü ders yoksa ortamın rutinine (uy-03), güçlük düzeyine orantıyı (uy-04) söyler; ölçme ölçütü okul öncesinde gözlemi bekler", () => {
      expect(soru("sinif_uygulanabilirlik")).toContain("ders verildiyse dersin içeriğine, verilmediyse ortamın günlük rutinine özgü mü");
      expect(soru("sinif_uygulanabilirlik")).toContain("hafif düzeyde aşırı uyarlama yok");
      expect(soru("olcme_uyarlamasi")).toContain("Okul öncesinde sınav yerine gözlem/oyun temelli değerlendirme beklenir");
      expect(soru("olcme_uyarlamasi")).toContain("Her madde için kısa gerekçe");
    });
  });

  describe("kontroller fabrika üzerinden", () => {
    const calistir = (text: string, alias: string | null = "Doruk") => adapter.checks({ body: vaka("uy-01").body, output: text, rawText: text, alias });
    it("iyi çıktı: sert hata yok, talimat 1; dokuz farklı gerekçe biçimi (Gerekçe:/Neden:/çünkü/parantez/tire/böylece) 1", () => {
      const r = calistir(oneri());
      expect(r.hard_fail).toEqual([]);
      expect(r.scores).toMatchObject({ talimat: 1, gerekce: 1 });
      expect(r.details).toMatchObject({ yapi: 1, taslak_sonda: 1, tani_cumlesi: 0, gerekce_madde: 9, gerekce_sayisi: 9 });
    });
    it.each(["Bağlam özeti (güçlük profili × ders × ortam)", "Sunum uyarlamaları", "Yanıt/çıktı uyarlamaları", "Ortam/zaman uyarlamaları", "Değerlendirme/sınav uyarlamaları"])("istenen bölüm eksik (%s): yapı 4/5, talimat düşer", (bolum) => {
      const metin = oneri().split("\n").map((l) => (l.startsWith("## ") && l.endsWith(bolum) ? "## Zzz" : l)).join("\n");
      const r = calistir(metin);
      expect(r.details.yapi).toBeCloseTo(4 / 5);
      expect(r.scores.talimat).toBeLessThan(1);
    });
    it("bölüm başlığı alternatifleri: 'Sınav uyarlamaları', 'Çıktı uyarlamaları', 'Zaman düzenlemeleri', 'Ortam düzenlemeleri' bölümü karşılar", () => {
      const degis = (eski: string, yeni: string) => oneri().replace(eski, yeni);
      expect(calistir(degis("Değerlendirme/sınav uyarlamaları", "Sınav uyarlamaları")).details.yapi).toBe(1);
      expect(calistir(degis("Değerlendirme/sınav uyarlamaları", "Değerlendirme uyarlamaları")).details.yapi).toBe(1);
      expect(calistir(degis("Yanıt/çıktı uyarlamaları", "Çıktı uyarlamaları")).details.yapi).toBe(1);
      expect(calistir(degis("Yanıt/çıktı uyarlamaları", "Yanıt uyarlamaları")).details.yapi).toBe(1);
      expect(calistir(degis("Ortam/zaman uyarlamaları", "Zaman düzenlemeleri")).details.yapi).toBe(1);
      expect(calistir(degis("Ortam/zaman uyarlamaları", "Ortam düzenlemeleri")).details.yapi).toBe(1);
    });
    it("ortam/zaman bölümü yoksa bağlam başlığındaki 'ortam' o bölümü karşılamaz", () => {
      const metin = oneri().split("\n").filter((l) => !l.startsWith("## 4. ")).join("\n");
      expect(calistir(metin).details.yapi).toBeCloseTo(4 / 5);
    });
    it("gerekçesiz öneriler: gerekce 0, talimat düşer, sert hata yok", () => {
      const gerekcesiz = oneri().split("\n").filter((l) => !/^## /.test(l) && !/^⚠/.test(l) && l.trim()).map((l) => `- ${l.replace(/^- /, "").replace(/\*Gerekçe:\*.*|Neden:.*|\(.*\)|— .*|, çünkü.*|, böylece.*|dikkat dağınıklığını.*|Gerekçe:.*/g, "").trim()}`);
      const metin = ["## 2. Sunum uyarlamaları", ...gerekcesiz.slice(1), "", `⚠️ ${TASLAK_NOTU}`].join("\n");
      const r = calistir(metin);
      expect(r.details.gerekce_madde).toBeGreaterThan(0); // ölçülecek madde var: 0 "madde yok" değil "gerekçe yok"
      expect(r.scores.gerekce).toBe(0);
      expect(r.scores.talimat).toBeLessThan(1);
      expect(r.hard_fail).toEqual([]);
    });
    it("yarı gerekçeli: gerekçe kapsaması kesirli, talimat bununla düşer", () => {
      const yarim = oneri().replace(/ \*Gerekçe:\*.*/, "").replace(/ Neden:.*/, "").replace(/, çünkü.*/, "").replace(/ \(Gerekçe:.*\)/, "");
      expect(calistir(yarim).scores.gerekce).toBeCloseTo(5 / 9);
    });
    it("taslak notu yok / rumuz sızıntısı: sert hata; çıktı yok: talimat 0", () => {
      expect(calistir(oneri().replace(`⚠️ ${TASLAK_NOTU}`, "")).hard_fail).toContain("taslak_notu_yok");
      expect(calistir(oneri("Doruk")).hard_fail).toContain("rumuz_sizintisi");
      const r = adapter.checks({ body: vaka("uy-01").body, output: null, rawText: "", alias: null });
      expect(r.hard_fail).toContain("cikti_yok");
      expect(r.scores.talimat).toBe(0);
    });
  });

  describe("hakem çizimi", () => {
    it("çıktı olduğu gibi gider; boşsa hata metni", () => {
      expect(adapter.renderForJudge(oneri())).toBe(oneri());
      expect(adapter.renderForJudge("")).toContain("Çıktı üretilemedi");
    });
  });

  describe("jenerik aday", () => {
    it("≥ 4 yasak kalıp taşır, referanstan farklı; başlıklar ve taslak notu korunur; gerekçeler kalmaz", () => {
      const g = adapter.genericCandidate(oneri()) as string;
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(oneri()));
      for (const h of ["## 2. Sunum uyarlamaları", "## 5. Değerlendirme/sınav uyarlamaları", `⚠️ ${TASLAK_NOTU}`]) expect(g.split("\n"), h).toContain(h);
      const r = adapter.checks({ body: vaka("uy-01").body, output: g, rawText: g, alias: null });
      expect(r.scores.gerekce).toBe(0);
      expect(r.details.yapi).toBe(1); // yapı korunur: hakem içeriği ayırt eder
      expect(r.hard_fail).toEqual([]);
    });
    it("boş çıktıda çökmez", () => {
      expect(adapter.genericCandidate("")).toBe("");
      expect(() => adapter.genericCandidate(null)).not.toThrow();
    });
  });
});
