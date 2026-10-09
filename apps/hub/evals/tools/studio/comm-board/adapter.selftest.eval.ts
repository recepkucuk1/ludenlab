// apps/hub/evals/tools/studio/comm-board/adapter.selftest.eval.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { CaseDef, StudioFixture } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { adapter } from "./adapter";
import type { CommBoardBody } from "./checks";

/* Rota taklidi: adaptörün rotaya NE gönderdiğini görmek için (gerçek rota DB/model ister). */
const rota = vi.hoisted(() => ({ gelen: [] as Array<Record<string, unknown>> }));
vi.mock("@/app/studio/api/tools/comm-board/route", () => ({
  POST: async (req: Request) => {
    rota.gelen.push((await req.json()) as Record<string, unknown>);
    return new Response(JSON.stringify({ success: true, board: { title: "t" } }), { status: 200 });
  },
}));

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<CommBoardBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const gorev = (id: string) => {
  const c = vaka(id);
  return adapter.renderTask(c, c.student ? (resolveFixture("studio", c.student) as StudioFixture) : null);
};

const body: CommBoardBody = { boardType: "basic_needs", symbolCount: 4, layout: "grid", textMode: "word_sentence", colorCoding: true };
const hucre = (position: number, word: string, sentence: string, category: string, fitzgeraldColor: string, visualPrompt: string) => ({
  position, word, sentence, category, fitzgeraldColor, visualDescription: `${word} için sade bir simge`, visualPrompt, usage: `Çocuk ${word.toLowerCase()} demek istediğinde işaret eder`,
});
const ref = {
  title: "Temel ihtiyaçlar panosu", boardType: "basic_needs", layout: "grid", rows: 2, cols: 2, symbolCount: 4, textMode: "word_sentence", colorCoding: true,
  cells: [
    hucre(1, "Su", "Su istiyorum.", "noun", "yellow", "a glass of water"),
    hucre(2, "Yemek", "Yemek istiyorum.", "noun", "yellow", "a plate of food"),
    hucre(3, "İstiyorum", "Dinozor istiyorum.", "verb", "green", "a hand reaching out"),
    hucre(4, "Yardım", "Bana yardım eder misin?", "social", "pink", "two hands helping"),
  ],
  instructions: "Panoyu masaya koyup çocuğun gözüne yakın tutun.", expertNotes: "Modelleme ile genişletin.", homeGuidance: "Yemek saatlerinde kullanın.", adaptations: "Kolay: iki hücre. Zor: iki sözcüklü cümle.",
};
type Ref = typeof ref;

describe("iletişim panosu adaptörü", () => {
  it("4 vaka, fikstürler çözülür (pano-02 öğrencisiz); 4 ortak + 2 araç ölçütü", () => {
    expect(cases.map((c) => c.id)).toEqual(["pano-01", "pano-02", "pano-03", "pano-04"]);
    for (const c of cases) expect(resolveFixture("studio", c.student)?.id ?? null).toBe(c.student);
    expect(vaka("pano-02").student).toBeNull();
    expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(["aac_uygunluk", "sembol_netligi"]);
  });

  it("vaka gövdeleri rotanın şemasına uyar; özel kategori yalnız 'custom'da", () => {
    const TURLER = ["basic_needs", "emotions", "daily_routines", "school", "social", "requests", "custom"];
    for (const c of cases) {
      const b = c.body;
      expect(TURLER, c.id).toContain(b.boardType);
      expect([4, 6, 9, 12], c.id).toContain(b.symbolCount);
      expect(["grid", "strip"], c.id).toContain(b.layout);
      expect(["word_only", "word_sentence"], c.id).toContain(b.textMode);
      expect(typeof b.colorCoding, c.id).toBe("boolean");
      expect((b.customCategory ?? "").length, c.id).toBeLessThanOrEqual(100);
      expect(Boolean(b.customCategory), c.id).toBe(b.boardType === "custom");
    }
    expect(vaka("pano-02").body).toMatchObject({ symbolCount: 12, textMode: "word_only" });
    expect(vaka("pano-03").body).toMatchObject({ layout: "strip", colorCoding: false });
  });

  it("hakem görevi: route'taki pano türü etiketi, ızgara, düzen, metin modu ve renk kodu metinleri", () => {
    const t1 = gorev("pano-01");
    expect(t1).toContain("- Pano türü: Temel İhtiyaçlar");
    expect(t1).toContain("- Sembol sayısı: 6 (2×3 grid)");
    expect(t1).toContain("- Düzen: Grid");
    expect(t1).toContain("- Metin modu: Kelime + kısa cümle");
    expect(t1).toContain("- Fitzgerald renk kodlaması: Evet");
    const t2 = gorev("pano-02");
    expect(t2).toContain("- Pano türü: Özel — Dinozor oyunu");
    expect(t2).toContain("- Sembol sayısı: 12 (3×4 grid)");
    expect(t2).toContain("- Metin modu: Sadece kelime");
    expect(t2).toContain("Öğrenci seçilmedi");
    const t3 = gorev("pano-03");
    expect(t3).toContain("- Pano türü: Duygular");
    expect(t3).toContain("- Sembol sayısı: 9 (3×3 grid)");
    expect(t3).toContain("- Düzen: Satır (iletişim şeridi)");
    expect(t3).toContain("- Fitzgerald renk kodlaması: Hayır");
    expect(gorev("pano-04")).toContain("- Pano türü: İstek ve Seçim");
  });

  it("bağlantı: yanıt anahtarı 'board'; öğrencisiz istek rotaya studentId'siz gider (öğrenci zorunlu değil), öğrencili istek studentId ile", async () => {
    expect(adapter.extractOutput({ board: ref, plan: 1 })).toBe(ref);
    expect(adapter.extractOutput({ plan: 1 })).toBeUndefined();
    rota.gelen.length = 0;
    const a = await adapter.invoke(body, null);
    expect(a).toEqual({ status: 200, body: { success: true, board: { title: "t" } } });
    expect(rota.gelen[0]).toEqual(body);
    await adapter.invoke(body, "stu-ela");
    expect(rota.gelen[1]).toEqual({ ...body, studentId: "stu-ela" });
  });

  it("iyi çıktı: sert hata yok, talimat 1 (rota boardType/layout/… ezer; kontrol bunlara bakmaz)", () => {
    const r = adapter.checks({ body, output: ref, rawText: JSON.stringify(ref), alias: "Selin" });
    expect(r.hard_fail).toEqual([]);
    expect(r.scores).toMatchObject({ talimat: 1, hucre_sayisi: 1, izgara: 1, renk_tutarli: 1, cumle_modu: 1, dil_kurali: 1, rumuz_yok: 1 });
    // Rotanın ezdiği alanlar bozuk olsa da puan değişmez.
    const ezilen = { ...ref, boardType: "yanlış", layout: "strip", symbolCount: 99, textMode: "word_only", colorCoding: false };
    expect(adapter.checks({ body, output: ezilen, rawText: JSON.stringify(ref), alias: "Selin" }).scores.talimat).toBe(1);
  });

  it("rumuz görsel komutunda kalabilir (görsel sağlayıcıya gerçek ad gitmez); başka alanda sızıntıdır", () => {
    const komutta = { ...ref, cells: [{ ...ref.cells[0]!, visualPrompt: "Selin drinking water" }, ...ref.cells.slice(1)] };
    expect(adapter.checks({ body, output: komutta, rawText: JSON.stringify(komutta), alias: "Selin" }).scores.rumuz_yok).toBe(1);
    const sizan = { ...ref, instructions: "Selin için panoyu kullanın." };
    const r = adapter.checks({ body, output: sizan, rawText: JSON.stringify(sizan), alias: "Selin" });
    expect(r.scores.rumuz_yok).toBe(0);
    expect(r.hard_fail).toContain("rumuz_sizintisi");
  });

  describe("hakem çizimi", () => {
    it("başlık ve ızgara, konum/kelime/cümle/kategori-renk, Türkçe görsel tanım + üretim komutu + kullanım, notlar", () => {
      const t = adapter.renderForJudge(ref);
      expect(t).toContain("Başlık: Temel ihtiyaçlar panosu (2×2)");
      expect(t).toContain('1. Su — "Su istiyorum." [noun/yellow]');
      expect(t).toContain("görsel: Su için sade bir simge · üretim komutu: a glass of water · kullanım: Çocuk su demek istediğinde işaret eder");
      expect(t).toContain('4. Yardım — "Bana yardım eder misin?" [social/pink]');
      expect(t).toContain("Yönerge: Panoyu masaya koyup");
      expect(t).toContain("Ev rehberi: Yemek saatlerinde kullanın.");
      expect(t).toContain("Uyarlamalar: Kolay: iki hücre.");
    });
    it("cümle yoksa cümle kısmı yazılmaz; konum yoksa sıradan gelir; satır/sütun yoksa '?'", () => {
      const yalin = { ...ref, rows: undefined, cols: "3", cells: [{ ...ref.cells[0]!, sentence: "", position: undefined }] };
      const t = adapter.renderForJudge(yalin);
      expect(t).toContain("Başlık: Temel ihtiyaçlar panosu (?×?)");
      expect(t).toContain("1. Su [noun/yellow]");
      expect(t).not.toContain("—\"");
    });
  });

  describe("jenerik aday", () => {
    it("≥ 4 yasak kalıp taşır, hakeme referanstan farklı görünür; hücre sayısı, kelime, renk, cümle ve görsel komutu korunur", () => {
      const before = JSON.stringify(ref);
      const g = adapter.genericCandidate(ref) as Ref;
      expect(JSON.stringify(ref)).toBe(before); // referans değişmez (derin kopya)
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(ref));
      expect(g.cells.map((c) => [c.position, c.word, c.sentence, c.category, c.fitzgeraldColor, c.visualPrompt])).toEqual(ref.cells.map((c) => [c.position, c.word, c.sentence, c.category, c.fitzgeraldColor, c.visualPrompt]));
      expect([g.title, g.rows, g.cols]).toEqual([ref.title, ref.rows, ref.cols]);
    });
    it("kullanım, görsel tanım ve tüm yorum alanlarını değiştirir (hakemin gördüğü alanlar)", () => {
      const g = adapter.genericCandidate(ref) as Ref;
      for (const k of ["instructions", "expertNotes", "homeGuidance", "adaptations"] as const) expect(g[k], k).not.toBe(ref[k]);
      expect(g.cells.every((c, i) => c.usage !== ref.cells[i]!.usage && c.visualDescription !== ref.cells[i]!.visualDescription)).toBe(true);
    });
    it("tek hücreli kısa çıktıda da ≥ 4 yasak kalıp (sabit alanlardan)", () => {
      const kisa = { ...ref, cells: ref.cells.slice(0, 1) };
      expect(yasakKalip(metinler(adapter.genericCandidate(kisa)).join("\n")).found.length).toBeGreaterThanOrEqual(4);
    });
    it("jenerik adayın yapısal puanları korunur; yalnız yasak kalıp puanı çöker", () => {
      const g = adapter.genericCandidate(ref);
      const r = adapter.checks({ body, output: g, rawText: JSON.stringify(g), alias: "Selin" });
      expect(r.scores).toMatchObject({ hucre_sayisi: 1, izgara: 1, renk_tutarli: 1, cumle_modu: 1, yasak_kalip: 0 });
    });
  });

  describe("dayanıklılık: null hücre", () => {
    const bozuk = { ...ref, cells: [null, { ...ref.cells[1]! }, "metin", { word: 5, visualPrompt: null }] };
    it("checks çökmez (fabrika ortak kontrolleri dahil)", () => {
      expect(() => adapter.checks({ body, output: bozuk, rawText: JSON.stringify(bozuk), alias: "Selin" })).not.toThrow();
    });
    it("renderForJudge ve genericCandidate çökmez; öğe sayısı korunur", () => {
      let t = "";
      expect(() => (t = adapter.renderForJudge(bozuk))).not.toThrow();
      expect(t).toContain("2. Yemek");
      expect(t.match(/üretim komutu:/g)).toHaveLength(4);
      expect(() => adapter.genericCandidate(bozuk)).not.toThrow();
      expect(() => adapter.renderForJudge({ ...ref, cells: "x" })).not.toThrow();
      expect(() => adapter.genericCandidate({ ...ref, cells: "x" })).not.toThrow();
    });
    it("çıktı yok: hakem hata metnini görür", () => {
      expect(adapter.renderForJudge(null)).toContain("Çıktı üretilemedi");
    });
  });
});
