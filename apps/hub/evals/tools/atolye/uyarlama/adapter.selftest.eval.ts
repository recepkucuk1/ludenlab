// apps/hub/evals/tools/atolye/uyarlama/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { mebHedef } from "@atolye/lib/meb-program";
import { uyarlamaInputSchema } from "@atolye/lib/uyarlama";
import { describe, expect, it } from "vitest";
import { profilBody } from "../../../lib/adapterFactory";
import type { AtolyeFixture, CaseDef } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { atolyeAdapterSuite } from "../baglanti";
import { adapter } from "./adapter";
import { UYARLAMA_BOLUM_LISTESI, type UyarlamaBody } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<UyarlamaBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const fikstur = (c: CaseDef<UyarlamaBody>) => resolveFixture("atolye", c.student) as AtolyeFixture;
const gorev = (id: string) => adapter.renderTask(vaka(id), fikstur(vaka(id)));

/** Tam, kurallara uygun uyarlama önerisi; her maddede gerekçe (farklı biçimlerde); `ad` bağlam özetinde geçer. */
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

atolyeAdapterSuite(adapter, {
  idler: ["uy-01", "uy-02", "uy-03", "uy-04"],
  olcutler: ["sinif_uygulanabilirlik", "olcme_uyarlamasi"],
  ornek: oneri,
  iyiPuanlar: { talimat: 1, gerekce: 1 },
  istekEtiketleri: /^- (Ders|Ortam|Güçlük profili|Güçlük düzeyi|Güçlü yönler|İlgi alanları): /,
  istemParcalari: ["ÖĞRENCİ PROFİLİ", "İSTENEN YAPI (Markdown, sırayla)", "Her madde için **kısa gerekçe**"],
  bolumler: ["Bağlam özeti (güçlük profili × ders × ortam)", "Sunum uyarlamaları", "Yanıt/çıktı uyarlamaları", "Ortam/zaman uyarlamaları", "Değerlendirme/sınav uyarlamaları"],
  gitmeyen: (f) => [
    ...(f.mebBolumler.length ? ["Çalışılan MEB bölümleri"] : []),
    ...f.documents.flatMap((d) => d.content.split("\n").find((l) => l.trim().length > 30)?.trim() ?? []),
  ],
  istekEk(md, c) {
    expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI"); // hiçbir uyarlama vakası MEB kodu vermez
  },
});

describe("uyarlama önerisi adaptörü — araca özgü", () => {
  it("vaka gövdeleri + fikstür profili rota şemasından geçer; dört ortamın üçü + 'ders yok'; MEB kodu verilirse geçerli", () => {
    for (const c of cases) {
      expect(uyarlamaInputSchema.safeParse({ ...profilBody(fikstur(c)), ...c.body }).success, c.id).toBe(true);
      if (c.body.mebHedefKod) expect(mebHedef(c.body.mebHedefKod), c.id).toBeDefined();
    }
    expect(cases.map((c) => c.body.ortam)).toEqual(["kaynastirma", "kaynastirma", "ev", "destek_egitim_odasi"]);
    expect(vaka("uy-03").body.ders).toBeUndefined();
  });

  it("bölüm regex'leri tek kaynak: 5 bölüm; 'ortam' kalıbı bağlam başlığıyla karışmaz (adapter yapısı ve gerekçe kapsamı aynı kalıp)", () => {
    expect(UYARLAMA_BOLUM_LISTESI).toHaveLength(5);
    const [baglam, sunum, yanit, ortam, degerlendirme] = UYARLAMA_BOLUM_LISTESI as [RegExp, RegExp, RegExp, RegExp, RegExp];
    expect(baglam.test("bağlam özeti (güçlük profili × ders × ortam)")).toBe(true);
    expect(ortam.test("bağlam özeti (güçlük profili × ders × ortam)")).toBe(false);
    for (const h of ["ortam/zaman uyarlamaları", "zaman düzenlemeleri", "ortam düzenlemeleri", "sınıf ortamı ve zaman uyarlamaları"]) expect(ortam.test(h), h).toBe(true);
    for (const h of ["sunum uyarlamaları"]) expect(sunum.test(h), h).toBe(true);
    for (const h of ["yanıt/çıktı uyarlamaları", "çıktı uyarlamaları", "yanıt uyarlamaları"]) expect(yanit.test(h), h).toBe(true);
    for (const h of ["değerlendirme/sınav uyarlamaları", "sınav uyarlamaları", "değerlendirme uyarlamaları"]) expect(degerlendirme.test(h), h).toBe(true);
  });

  describe("hakem görevi", () => {
    it("uy-01: ürün etiketleriyle iki bağlam satırı; öğrenci bloğu", () => {
      const t = gorev("uy-01");
      expect(t).toContain("- Araç: Uyarlama önerisi (Atölye)");
      expect(t).toContain("- Ders: Türkçe");
      expect(t).toContain("- Ortam: kaynaştırma sınıfı");
      expect(t).toContain("- Öğrenci: Arda Yılmaz, İlkokul (1–4. sınıf), 8 yaş");
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

  describe("ölçüt metinleri vakalarla çelişmez", () => {
    const soru = (k: string) => adapter.criteria.find((c) => c.key === k)!.question;
    it("uygulanabilirlik ölçütü ders yoksa ortamın rutinine (uy-03), güçlük düzeyine orantıyı (uy-04) söyler; ölçme ölçütü okul öncesinde gözlemi bekler; gerekçe sayımı deterministik kontrolde (ölçütte yok)", () => {
      expect(soru("sinif_uygulanabilirlik")).toContain("ders verildiyse dersin içeriğine, verilmediyse ortamın günlük rutinine özgü mü");
      expect(soru("sinif_uygulanabilirlik")).toContain("hafif düzeyde aşırı uyarlama yok");
      expect(soru("olcme_uyarlamasi")).toContain("Okul öncesinde sınav yerine gözlem/oyun temelli değerlendirme beklenir");
      for (const k of ["sinif_uygulanabilirlik", "olcme_uyarlamasi"]) expect(soru(k), k).not.toContain("Her madde için kısa gerekçe");
    });
  });

  describe("kontroller fabrika üzerinden — araca özgü", () => {
    const calistir = (text: string, alias: string | null = "Doruk") => adapter.checks({ body: vaka("uy-01").body, output: text, rawText: text, alias });
    it("iyi örnek: dokuz öneri maddesi, dokuz farklı gerekçe biçimi (Gerekçe:/Neden:/çünkü/parantez/tire/böylece)", () => {
      expect(calistir(oneri()).details).toMatchObject({ gerekce_madde: 9, gerekce_sayisi: 9 });
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
    it("ortam/zaman bölümü yoksa bağlam başlığındaki 'ortam' o bölümü karşılamaz; gerekçe kapsamı da o bölümün maddelerini saymaz", () => {
      const metin = oneri().split("\n").filter((l) => !l.startsWith("## 4. ")).join("\n");
      expect(calistir(metin).details.yapi).toBeCloseTo(4 / 5);
      // bölüm başlığı silinince maddeleri "Yanıt/çıktı" bölümüne katılır (aynı düzey başlık yok): hâlâ öneri maddesi sayılır
      expect(calistir(metin).details).toMatchObject({ gerekce_madde: 9 });
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
  });

  describe("jenerik aday — araca özgü", () => {
    it("gerekçeler kalmaz (gerekce 0); yapı başlıkları korunur (hakem içeriği ayırt eder)", () => {
      const g = adapter.genericCandidate(oneri()) as string;
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      const r = adapter.checks({ body: vaka("uy-01").body, output: g, rawText: g, alias: null });
      expect(r.scores.gerekce).toBe(0);
      expect(r.details.yapi).toBe(1);
    });
  });
});
