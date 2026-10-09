// apps/hub/evals/tools/atolye/seans-plani/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { mebHedef, mebToPrompt } from "@atolye/lib/meb-program";
import { describe, expect, it } from "vitest";
import { HarnessError, type AtolyeFixture, type CaseDef } from "../../../lib/core";
import { realFirstName, resolveFixture } from "../../../lib/fixtures";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { bekleyenler, geciciAkis, istek, kos, rumuzOku, sonuclar } from "../baglanti";
import { adapter } from "./adapter";
import type { SeansBody } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<SeansBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const fikstur = (c: CaseDef<SeansBody>) => resolveFixture("atolye", c.student) as AtolyeFixture;
const gorev = (id: string) => adapter.renderTask(vaka(id), fikstur(vaka(id)));

/** Tam, kurallara uygun seans planı (40 dk; MEB 3.2.5); `ad` Künye'de geçer. */
const plan = (ad = "Arda") =>
  [
    "## Seans Künyesi", `| Alan | Değer |\n|---|---|\n| Öğrenci | ${ad} |\n| Süre | 40 dk |`, "",
    "## Etkinlik Akışı",
    "- **Isınma (5 dk):** Hece kartlarıyla futbol topu oyunu.",
    "- **Ana etkinlik (25 dk):** MEB 3.2.5 — iki heceli sözcükleri saha oyunuyla okuma.",
    "- **Tekrar/Oyun (5 dk):** Kart avı.",
    "- **Kapanış (5 dk):** Günün özeti.", "",
    "## Materyaller", "- Hece kartları", "",
    "## Ölçme", "- Doğruluk %", "",
    "## Ev Görevi", "- 5 dk hece okuma", "",
    "## Sonraki Adım", "- Üç heceli sözcüklere geç.", "",
    `⚠️ ${TASLAK_NOTU}`,
  ].join("\n");

describe("seans planı adaptörü", () => {
  it("4 vaka, hepsi öğrencili ve fikstürleri çözülür; 4 ortak + 2 araç ölçütü", () => {
    expect(cases.map((c) => c.id)).toEqual(["seans-01", "seans-02", "seans-03", "seans-04"]);
    for (const c of cases) expect(resolveFixture("atolye", c.student)?.id, c.id).toBe(c.student);
    expect(adapter.id).toBe("atolye/seans-plani");
    expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(["akis_sure", "hedef_hizasi"]);
  });

  it("vaka gövdeleri: süre 15–120; verilen MEB kodları geçerli; alan anahtarları rota şemasındakilerle aynı", () => {
    for (const c of cases) {
      expect(c.body.sureDk, c.id).toBeGreaterThanOrEqual(15);
      expect(c.body.sureDk, c.id).toBeLessThanOrEqual(120);
      if (c.body.mebHedefKod) expect(mebHedef(c.body.mebHedefKod), c.id).toBeDefined();
    }
    expect(cases.map((c) => c.body.sureDk)).toEqual([40, 30, 60, 15]);
    expect(cases.map((c) => c.body.alan)).toEqual(["okuma", "dikkat", "matematik", "ogrenmeye_hazirlik"]);
  });

  describe("hakem görevi", () => {
    it("seans-01: ürün etiketleriyle istek satırları, son seans notu, MEB kodu + hedef bloğu; öğrenci bloğu; araca gitmeyenler notu", () => {
      const t = gorev("seans-01");
      expect(t).toContain("- Araç: Seans planı (Atölye)");
      expect(t).toContain("- Alan: Okuma (disleksi odağı)");
      expect(t).toContain("- Bu seansın hedefi: Tanıtılan seslerden oluşan iki heceli sözcükleri %80 doğrulukla okuma");
      expect(t).toContain("- Süre: 40 dakika");
      expect(t).toContain("- Son seans notu: 10 sözcükten 7'si doğru;");
      expect(t).toContain("- MEB hedef kodu: 3.2.5");
      expect(t).toContain(mebToPrompt({ hedefKod: "3.2.5", davranisKodlari: [] })!); // hakem hedef davranışları görür
      expect(t).not.toContain("Materyal kısıtı");
      expect(t).toContain("- Öğrenci: Arda Yılmaz");
      expect(t).toContain("İlgi alanları: Futbol (Galatasaray), lego");
      expect(t).toContain("yaş, güçlük profili, güçlük düzeyi, güçlü yönler, çalışılan MEB bölümleri ve önceki belgeler araca İLETİLMEDİ");
      expect(t).toContain("- Neyi sınıyor: Önceki seans notunun devamı");
      expect(t.indexOf("- Alan:")).toBeLessThan(t.indexOf("- Neyi sınıyor:"));
    });
    it("seans-02: materyal kısıtı satırı; MEB ve son seans notu yok", () => {
      const t = gorev("seans-02");
      expect(t).toContain("- Alan: Dikkat ve odaklanma");
      expect(t).toContain("- Süre: 30 dakika");
      expect(t).toContain("- Materyal kısıtı: Yalnız kâğıt ve kalem; oyuncak yok.");
      expect(t).not.toContain("MEB hedef");
      expect(t).not.toContain("Son seans notu");
    });
    it("seans-04: yalnız alan, hedef, süre (boş bağlam); uydurma satır yok", () => {
      const t = gorev("seans-04");
      expect(t).toContain("- Alan: Öğrenmeye hazırlık");
      expect(t).toContain("- Süre: 15 dakika");
      for (const yok of ["Son seans notu", "Materyal kısıtı", "MEB hedef", "İlgi alanları"]) expect(t, yok).not.toContain(yok);
    });
    it("fikstürsüz hakem görevi hata verir", () => {
      expect(() => adapter.renderTask(vaka("seans-01"), null)).toThrow(HarnessError);
    });
  });

  it("fikstürsüz çağrı harness_error (rumuz zorunlu)", async () => {
    await expect(adapter.invoke(vaka("seans-01").body, null)).rejects.toMatchObject({ failureClass: "harness_error" });
  });

  describe("gerçek rota (subagent düzeneği: istek yazılır, yanıt okunur) — bağlantı", () => {
    it("4 vakanın hepsi rota şemasından geçer; istekte SEANS BİLGİSİ, rumuzlu öğrenci satırı, gerçek ad yok; istek satırları ürün isteminde AYNEN geçer", async () => {
      const flow = geciciAkis("seans");
      const s = await kos("atolye/seans-plani", flow, cases.map((c) => c.id));
      expect(s).toMatchObject({ done: 0, failed: 0, pending: 4 });
      const rows = bekleyenler(s.pendingPath);
      for (const c of cases) {
        const { md } = istek(rows, c.id);
        expect(md, c.id).toContain("SEANS BİLGİSİ");
        expect(md, c.id).toContain("İSTENEN YAPI (MEB seans şablonu)");
        const alias = rumuzOku(md);
        expect(alias, c.id).toBeTruthy();
        expect(md, c.id).not.toContain(realFirstName(fikstur(c)));
        // Etiket kayması koruması: hakemin okuduğu istek satırları (MEB kod satırı hakem tarafı) ürün isteminde birebir.
        const satirlar = adapter.renderTask(c, fikstur(c)).split("\n").filter((l) => /^- (Alan|Bu seansın hedefi|Süre|Son seans notu|Materyal kısıtı): /.test(l));
        expect(satirlar.length, c.id).toBeGreaterThanOrEqual(3);
        for (const l of satirlar) expect(md, `${c.id}: ${l}`).toContain(l);
        // İlgi alanı araca gider; hakem bloğundaki değerle aynı.
        const ilgi = fikstur(c).ilgiAlanlari;
        if (ilgi) expect(md, c.id).toContain(`- İlgi alanları (etkinliklere taşı): ${ilgi}`);
        else expect(md, c.id).toContain("- İlgi alanları (etkinliklere taşı): —");
        // Araca GİTMEYENLER: tanı, yaş, güçlü yönler, MEB bölümleri, önceki belgeler (sistem istemi "DEHB" sözcüğünü taşır: yalnız kullanıcı istemine bakılır).
        const kullanici = md.slice(md.indexOf("<user>"));
        for (const gitmeyen of ["Disleksi", "DEHB", "Diskalkuli", "Güçlük profili", "Güçlük düzeyi", "Güçlü yönler", `, ${fikstur(c).yas} yaş`]) expect(kullanici, `${c.id}: ${gitmeyen}`).not.toContain(gitmeyen);
        if (c.body.mebHedefKod) {
          expect(md, c.id).toContain("MEB HEDEF HİZALAMASI");
          expect(md, c.id).toContain(mebToPrompt({ hedefKod: c.body.mebHedefKod, davranisKodlari: [] })!);
        } else expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI");
      }
    });

    it("seans-01: yanıt → puanlar (süre toplamı, aşamalar, MEB kodu); rumuz çıktıda gerçek ada geri konur", async () => {
      const flow = geciciAkis("seans1");
      let s = await kos("atolye/seans-plani", flow, ["seans-01"]);
      const { md, row } = istek(bekleyenler(s.pendingPath), "seans-01");
      const alias = rumuzOku(md)!;
      writeFileSync(row.responseTxt, plan(alias));
      s = await kos("atolye/seans-plani", flow, ["seans-01"]);
      expect(s).toMatchObject({ done: 1, failed: 0, pending: 0 });
      const r = sonuclar(s.resultsPath)[0]!;
      expect(r.hard_fail).toEqual([]);
      expect(r.grade).toMatchObject({ talimat: 1, sure_toplami: 1, akis_asamalari: 1, meb_kod: 1, rumuz_yok: 1, dil_kurali: 1, yasak_kalip: 1 });
      expect(r.meta).toMatchObject({ alias_found: true });
    });
  });

  describe("kontroller fabrika üzerinden", () => {
    const calistir = (text: string, b: SeansBody = vaka("seans-01").body, alias: string | null = "Doruk") => adapter.checks({ body: b, output: text, rawText: text, alias });
    it("iyi çıktı: sert hata yok, talimat 1", () => {
      const r = calistir(plan());
      expect(r.hard_fail).toEqual([]);
      expect(r.scores).toMatchObject({ talimat: 1, sure_toplami: 1, akis_asamalari: 1, meb_kod: 1 });
      expect(r.details).toMatchObject({ yapi: 1, taslak_sonda: 1, tani_cumlesi: 0 });
    });
    it("süre tutmuyor + MEB kodu yok + akış bölümleri eksik: talimat düşer, sert hata yok (süre bir kalite sinyalidir)", () => {
      const kotu = plan().replace("(25 dk)", "(5 dk)").replace("MEB 3.2.5 — ", "").replace("- **Kapanış (5 dk):** Günün özeti.\n", "");
      const r = calistir(kotu);
      expect(r.scores).toMatchObject({ sure_toplami: 0, meb_kod: 0, akis_asamalari: 0.75 });
      expect(r.scores.talimat).toBeLessThan(0.9);
      expect(r.hard_fail).toEqual([]);
    });
    it("taslak notu yok: sert hata; rumuz sızıntısı: sert hata; çıktı yok: talimat 0", () => {
      expect(calistir(plan().replace(`⚠️ ${TASLAK_NOTU}`, "")).hard_fail).toContain("taslak_notu_yok");
      expect(calistir(plan("Doruk")).hard_fail).toContain("rumuz_sizintisi");
      const r = adapter.checks({ body: vaka("seans-01").body, output: null, rawText: "", alias: null });
      expect(r.hard_fail).toContain("cikti_yok");
      expect(r.scores.talimat).toBe(0);
    });
  });

  describe("hakem çizimi", () => {
    it("çıktı olduğu gibi gider; boşsa hata metni", () => {
      expect(adapter.renderForJudge(plan())).toBe(plan());
      expect(adapter.renderForJudge("  ")).toContain("Çıktı üretilemedi");
      expect(adapter.renderForJudge(null)).toContain("Çıktı üretilemedi");
    });
  });

  describe("jenerik aday", () => {
    it("≥ 4 yasak kalıp taşır, hakeme referanstan farklı görünür; başlıklar ve taslak notu korunur; süre ve MEB kodu kalmaz", () => {
      const g = adapter.genericCandidate(plan()) as string;
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(plan()));
      for (const h of ["## Seans Künyesi", "## Etkinlik Akışı", "## Materyaller", "## Sonraki Adım", `⚠️ ${TASLAK_NOTU}`]) expect(g.split("\n"), h).toContain(h);
      const r = adapter.checks({ body: vaka("seans-01").body, output: g, rawText: g, alias: null });
      expect(r.scores).toMatchObject({ sure_toplami: 0, meb_kod: 0 });
      expect(r.hard_fail).toEqual([]);
    });
    it("boş çıktıda çökmez", () => {
      expect(() => adapter.genericCandidate(null)).not.toThrow();
      expect(adapter.genericCandidate("")).toBe("");
    });
  });
});
