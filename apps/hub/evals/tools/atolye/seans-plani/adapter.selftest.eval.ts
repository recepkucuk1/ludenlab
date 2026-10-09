// apps/hub/evals/tools/atolye/seans-plani/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { mebHedef, mebToPrompt } from "@atolye/lib/meb-program";
import { describe, expect, it } from "vitest";
import type { AtolyeFixture, CaseDef } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { atolyeAdapterSuite } from "../baglanti";
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

atolyeAdapterSuite(adapter, {
  idler: ["seans-01", "seans-02", "seans-03", "seans-04"],
  olcutler: ["akis_sure", "hedef_hizasi"],
  ornek: plan,
  iyiPuanlar: { talimat: 1, sure_toplami: 1, akis_asamalari: 1, meb_kod: 1 },
  istekEtiketleri: /^- (Alan|Bu seansın hedefi|Süre|Son seans notu|Materyal kısıtı): /,
  istemParcalari: ["SEANS BİLGİSİ", "İSTENEN YAPI (MEB seans şablonu)"],
  bolumler: ["Seans Künyesi", "Etkinlik Akışı", "Materyaller", "Ölçme", "Ev Görevi", "Sonraki Adım"],
  // Araca GİTMEYENLER: tanı, yaş, güçlü yönler, MEB bölümleri, önceki belgeler (sistem istemi "DEHB" sözcüğünü taşır: yalnız kullanıcı bölümü taranır).
  gitmeyen: (f) => ["Disleksi", "DEHB", "Diskalkuli", "Güçlük profili", "Güçlük düzeyi", "Güçlü yönler", `, ${f.yas} yaş`],
  istekEk(md, c, f) {
    // İlgi alanı araca gider; hakem bloğundaki değerle aynı. Boşsa ürün "—" yazar.
    expect(md, c.id).toContain(`- İlgi alanları (etkinliklere taşı): ${f.ilgiAlanlari ?? "—"}`);
    if (c.body.mebHedefKod) {
      expect(md, c.id).toContain("MEB HEDEF HİZALAMASI");
      expect(md, c.id).toContain(mebToPrompt({ hedefKod: c.body.mebHedefKod, davranisKodlari: [] })!);
    } else expect(md, c.id).not.toContain("MEB HEDEF HİZALAMASI");
  },
});

describe("seans planı adaptörü — araca özgü", () => {
  it("vaka gövdeleri: süre 15–120; verilen MEB kodları geçerli; alan/süre dağılımı", () => {
    for (const c of cases) {
      expect(c.body.sureDk, c.id).toBeGreaterThanOrEqual(15);
      expect(c.body.sureDk, c.id).toBeLessThanOrEqual(120);
      if (c.body.mebHedefKod) expect(mebHedef(c.body.mebHedefKod), c.id).toBeDefined();
    }
    expect(cases.map((c) => c.body.sureDk)).toEqual([40, 30, 60, 15]);
    expect(cases.map((c) => c.body.alan)).toEqual(["okuma", "dikkat", "matematik", "ogrenmeye_hazirlik"]);
  });

  it("vaka amaçları araca giden bilgiyle yazılmıştır: kademe/alan; yaş ya da tanı (araca gitmeyenler) amaçta yok", () => {
    for (const c of cases) expect(c.purpose, c.id).not.toMatch(/\b\d{1,2} yaş\b|hiperaktif|DEHB|diskalkuli\+/i);
    expect(vaka("seans-02").purpose).toContain("Okul öncesi + Dikkat alanı");
    expect(vaka("seans-03").purpose).toContain("Lise + Matematik alanı");
    expect(vaka("seans-01").purpose).toContain("üç heceliye GEÇİLMEZ");
  });

  it("ölçütler vakalarla çelişmez: akış ölçütü 'kademeye uygun' der, yaşa değil", () => {
    const q = adapter.criteria.find((c) => c.key === "akis_sure")!.question;
    expect(q).toContain("kademeye uygun");
    expect(q).not.toContain("yaşa uygun");
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
  });

  describe("kontroller fabrika üzerinden", () => {
    const calistir = (text: string, b: SeansBody = vaka("seans-01").body) => adapter.checks({ body: b, output: text, rawText: text, alias: "Doruk" });
    it("süre tutmuyor + MEB kodu yok + akış aşaması eksik: talimat düşer, sert hata yok (süre bir kalite sinyalidir)", () => {
      const kotu = plan().replace("(25 dk)", "(5 dk)").replace("MEB 3.2.5 — ", "").replace("- **Kapanış (5 dk):** Günün özeti.\n", "");
      const r = calistir(kotu);
      expect(r.scores).toMatchObject({ sure_toplami: 0, meb_kod: 0, akis_asamalari: 0.75 });
      expect(r.scores.talimat).toBeLessThan(0.9);
      expect(r.hard_fail).toEqual([]);
    });
    it("tablo süreli akış (birim sütun başlığında) tam puan alır", () => {
      const tablo = plan().replace(/- \*\*Isınma[\s\S]*?Günün özeti\.\n/, "| Aşama | Süre (dk) | Etkinlik |\n|---|---|---|\n| Isınma | 5 | hece |\n| Ana etkinlik | 25 | MEB 3.2.5 okuma |\n| Tekrar/Oyun | 5 | kart avı |\n| Kapanış | 5 | özet |\n");
      expect(tablo).toContain("| Süre (dk) |");
      expect(calistir(tablo).scores).toMatchObject({ talimat: 1, sure_toplami: 1, akis_asamalari: 1, meb_kod: 1 });
    });
  });

  describe("jenerik aday", () => {
    it("süre ve MEB kodu kalmaz (içerik jenerik): sure_toplami 0, meb_kod 0", () => {
      const g = adapter.genericCandidate(plan()) as string;
      const r = adapter.checks({ body: vaka("seans-01").body, output: g, rawText: g, alias: null });
      expect(r.scores).toMatchObject({ sure_toplami: 0, meb_kod: 0 });
    });
  });
});
