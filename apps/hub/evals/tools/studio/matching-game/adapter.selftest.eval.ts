// apps/hub/evals/tools/studio/matching-game/adapter.selftest.eval.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { CaseDef, StudioFixture } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { adapter } from "./adapter";
import type { MatchingGameBody } from "./checks";

/* Rota taklidi: adaptörün rotaya NE gönderdiğini görmek için (gerçek rota DB/model ister). */
const rota = vi.hoisted(() => ({ gelen: [] as Array<Record<string, unknown>> }));
vi.mock("@/app/studio/api/tools/matching-game/route", () => ({
  POST: async (req: Request) => {
    rota.gelen.push((await req.json()) as Record<string, unknown>);
    return new Response(JSON.stringify({ success: true, game: { title: "t" } }), { status: 200 });
  },
}));

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<MatchingGameBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const gorev = (id: string) => {
  const c = vaka(id);
  return adapter.renderTask(c, c.student ? (resolveFixture("studio", c.student) as StudioFixture) : null);
};

const body: MatchingGameBody = { matchType: "synonym", pairCount: "6", difficulty: "easy" };
const cift = (id: number, cardA: string, cardB: string, hint = "", visualPrompt = "") => ({ id, cardA, cardB, hint, visualPrompt });
const ref = {
  title: "Eş anlamlı kelimeler", matchType: "synonym", difficulty: "easy", theme: "", pairCount: 6,
  pairs: [cift(1, "büyük", "iri", "Boyutla ilgili"), cift(2, "küçük", "ufak"), cift(3, "hızlı", "çabuk"), cift(4, "güzel", "hoş"), cift(5, "mutlu", "neşeli"), cift(6, "soğuk", "serin", "Sıcağın zıttı gibi")],
  instructions: "Kartları karıştırıp eş anlamlıları bulun.", expertNotes: "Önce üç çiftle başlayın.", adaptations: "Kolay: dört çift. Zor: süre ekleyin.",
};
type Ref = typeof ref;

describe("eşleştirme oyunu adaptörü", () => {
  it("4 vaka, fikstürler çözülür (es-02 öğrencisiz); 4 ortak + 2 araç ölçütü", () => {
    expect(cases.map((c) => c.id)).toEqual(["es-01", "es-02", "es-03", "es-04"]);
    for (const c of cases) expect(resolveFixture("studio", c.student)?.id ?? null).toBe(c.student);
    expect(vaka("es-02").student).toBeNull();
    expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(["cift_kesinligi", "seviye_uyumu"]);
  });

  it("vaka gövdeleri rotanın şemasına uyar (pairCount METİN enum, tema ≤ 100, hedef ≤ 300); her tür ve zorluk kapsanır", () => {
    const TURLER = ["definition", "image_desc", "synonym", "antonym", "category", "sentence"];
    for (const c of cases) {
      const b = c.body;
      expect(TURLER, c.id).toContain(b.matchType);
      expect(typeof b.pairCount, c.id).toBe("string");
      expect(["6", "8", "10", "12"], c.id).toContain(b.pairCount);
      expect(["easy", "medium", "hard"], c.id).toContain(b.difficulty);
      expect((b.theme ?? "").length, c.id).toBeLessThanOrEqual(100);
      expect((b.goalTitle ?? "").length, c.id).toBeLessThanOrEqual(300);
    }
    expect(new Set(cases.map((c) => c.body.matchType))).toEqual(new Set(["synonym", "image_desc", "category", "sentence"]));
    expect(new Set(cases.map((c) => c.body.pairCount))).toEqual(new Set(["6", "8", "10", "12"]));
    expect(new Set(cases.map((c) => c.body.difficulty))).toEqual(new Set(["easy", "medium", "hard"]));
  });

  it("hakem görevi: route'taki tür etiketi, çift sayısı, zorluk, tema ('Karışık (tema yok)') ve müfredat hedefi metinleri", () => {
    const t1 = gorev("es-01");
    expect(t1).toContain("- Eşleştirme türü: Eş Anlamlı · Çift sayısı: 10 çift · Zorluk: Orta · Tema: okul");
    expect(t1).not.toContain("Müfredat hedefi");
    const t2 = gorev("es-02");
    expect(t2).toContain("- Eşleştirme türü: Kelime — Resim Açıklaması · Çift sayısı: 8 çift · Zorluk: Kolay · Tema: mutfak");
    expect(t2).toContain("Öğrenci seçilmedi");
    const t3 = gorev("es-03");
    expect(t3).toContain("- Eşleştirme türü: Kategori Eşleştirme · Çift sayısı: 6 çift · Zorluk: Kolay · Tema: Karışık (tema yok)");
    expect(t3).toContain("- Müfredat hedefi: Nesneleri işlevine göre gruplar (yiyecek, taşıt, hayvan)");
    const t4 = gorev("es-04");
    expect(t4).toContain("- Eşleştirme türü: Cümle Tamamlama · Çift sayısı: 12 çift · Zorluk: Zor");
    // Tür kuralı ve ipucunun opsiyonelliği hakeme söylenir (puanlayıcıyla aynı kural).
    expect(t2).toContain("HER çiftte görsel komutu");
    expect(t4).toContain("kart A boşluklu cümle, kart B doğru kelime");
    expect(t1).toContain("ipucu (hint) prompt'ta opsiyoneldir");
  });

  it("tür kuralı satırı puanlayıcıyla aynı: tanımda görsel hepsi/hiçbiri, resim açıklaması ≤ 2 cümle", () => {
    const gorevT = (matchType: MatchingGameBody["matchType"]) => adapter.renderTask({ ...vaka("es-02"), body: { ...vaka("es-02").body, matchType } }, null);
    expect(gorevT("definition")).toContain("kart A somut nesneyse görsel komutu ya TÜM çiftlerde ya HİÇBİRİNDE");
    expect(gorevT("category")).toContain("ya TÜM çiftlerde ya HİÇBİRİNDE");
    expect(gorevT("image_desc")).toContain("(en çok iki cümle)");
    expect(gorevT("synonym")).toContain("görsel YOK");
    expect(gorevT("sentence")).toContain("görsel YOK");
  });

  it("hakem ölçütleri vakalarla çelişmez: kategori tekrarı meşru, /r/ zorlaması yok", () => {
    const kesinlik = adapter.criteria.find((c) => c.key === "cift_kesinligi")!.question;
    expect(kesinlik).toContain("kategori türünde aynı kategoriye giren birkaç kelime meşrudur");
    expect(vaka("es-03").purpose).toContain("aynı kategoriye giren birkaç kelime beklenir");
    const seviye = adapter.criteria.find((c) => c.key === "seviye_uyumu")!.question;
    expect(seviye).toContain("müfredat hedefiyle tutarlı");
    expect(seviye).toContain("hedef sesi içermeyi şart koşma");
    expect(vaka("es-04").purpose).toContain("şart DEĞİL");
  });

  it("bağlantı: yanıt anahtarı 'game'; öğrencisiz istek rotaya studentId'siz gider (pairCount METİN kalır), öğrencili istek studentId ile", async () => {
    expect(adapter.extractOutput({ game: ref, plan: 1 })).toBe(ref);
    expect(adapter.extractOutput({ plan: 1 })).toBeUndefined();
    rota.gelen.length = 0;
    const a = await adapter.invoke(body, null);
    expect(a).toEqual({ status: 200, body: { success: true, game: { title: "t" } } });
    expect(rota.gelen[0]).toEqual(body);
    expect(typeof rota.gelen[0]!.pairCount).toBe("string");
    await adapter.invoke(body, "stu-ecem");
    expect(rota.gelen[1]).toEqual({ ...body, studentId: "stu-ecem" });
  });

  it("iyi çıktı: sert hata yok, talimat 1 (rota theme/pairCount'u ezer; kontrol bunlara bakmaz)", () => {
    const r = adapter.checks({ body, output: ref, rawText: JSON.stringify(ref), alias: "Selin" });
    expect(r.hard_fail).toEqual([]);
    expect(r.scores).toMatchObject({ talimat: 1, cift_sayisi: 1, tur_yankisi: 1, kart_bicimi: 1, dil_kurali: 1, rumuz_yok: 1 });
    const ezilen = { ...ref, theme: 42, pairCount: 99 };
    expect(adapter.checks({ body, output: ezilen, rawText: JSON.stringify(ref), alias: "Selin" }).scores.talimat).toBe(1);
  });

  it("rumuz görsel komutunda kalabilir (görsel sağlayıcıya gerçek ad gitmez); başka alanda sızıntıdır", () => {
    const img: MatchingGameBody = { matchType: "image_desc", pairCount: "6", difficulty: "easy" };
    const resim = { ...ref, matchType: "image_desc", pairs: ref.pairs.map((p) => ({ ...p, visualPrompt: "a plain object" })) };
    const komutta = { ...resim, pairs: [{ ...resim.pairs[0]!, visualPrompt: "Selin holding a red ball" }, ...resim.pairs.slice(1)] };
    expect(adapter.checks({ body: img, output: komutta, rawText: JSON.stringify(komutta), alias: "Selin" }).scores.rumuz_yok).toBe(1);
    const sizan = { ...ref, instructions: "Selin için kartları eşleştirin." };
    const r = adapter.checks({ body, output: sizan, rawText: JSON.stringify(sizan), alias: "Selin" });
    expect(r.scores.rumuz_yok).toBe(0);
    expect(r.hard_fail).toContain("rumuz_sizintisi");
  });

  describe("hakem çizimi", () => {
    it("başlık, numaralı çiftler (ipucu ve görsel komutu varsa), yönerge, uzman notu, uyarlamalar", () => {
      const t = adapter.renderForJudge(ref);
      expect(t).toContain("Başlık: Eş anlamlı kelimeler");
      expect(t).toContain("1. büyük ↔ iri (ipucu: Boyutla ilgili)");
      expect(t).toContain("2. küçük ↔ ufak\n");
      expect(t).toContain("Yönerge: Kartları karıştırıp");
      expect(t).toContain("Uzman notları: Önce üç çiftle başlayın.");
      expect(t).toContain("Uyarlamalar: Kolay: dört çift.");
      const g = adapter.renderForJudge({ ...ref, pairs: [cift(1, "elma", "Kırmızı bir meyve.", "", "a red apple")] });
      expect(g).toContain("1. elma ↔ Kırmızı bir meyve. · görsel komutu: a red apple");
    });
    it("id yoksa sıradan gelir; boş kart '—' görünür", () => {
      const t = adapter.renderForJudge({ ...ref, pairs: [{ cardA: "a" }, { id: 7, cardA: "", cardB: "b" }] });
      expect(t).toContain("1. a ↔ —");
      expect(t).toContain("7. — ↔ b");
    });
  });

  describe("jenerik aday", () => {
    it("≥ 4 yasak kalıp taşır, hakeme referanstan farklı görünür; çiftler (kart, id, görsel komutu) ve başlık korunur", () => {
      const before = JSON.stringify(ref);
      const g = adapter.genericCandidate(ref) as Ref;
      expect(JSON.stringify(ref)).toBe(before); // referans değişmez (derin kopya)
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(ref));
      expect(g.pairs.map((p) => [p.id, p.cardA, p.cardB, p.visualPrompt])).toEqual(ref.pairs.map((p) => [p.id, p.cardA, p.cardB, p.visualPrompt]));
      expect(g.title).toBe(ref.title);
    });
    it("ipuçlarını ve tüm yorum alanlarını değiştirir (hakemin gördüğü alanlar)", () => {
      const g = adapter.genericCandidate(ref) as Ref;
      for (const k of ["instructions", "expertNotes", "adaptations"] as const) expect(g[k], k).not.toBe(ref[k]);
      expect(g.pairs.every((p) => p.hint === "Dikkatli bak.")).toBe(true);
    });
    it("çiftsiz kısa çıktıda da ≥ 4 yasak kalıp (sabit alanlardan)", () => {
      const kisa = { ...ref, pairs: [] };
      expect(yasakKalip(metinler(adapter.genericCandidate(kisa)).join("\n")).found.length).toBeGreaterThanOrEqual(4);
    });
    it("jenerik adayın yapısal puanları korunur; yalnız yasak kalıp puanı çöker", () => {
      const g = adapter.genericCandidate(ref);
      const r = adapter.checks({ body, output: g, rawText: JSON.stringify(g), alias: "Selin" });
      expect(r.scores).toMatchObject({ cift_sayisi: 1, tekrar_yok: 1, kart_bicimi: 1, tur_yankisi: 1, yasak_kalip: 0 });
      expect(r.hard_fail).toEqual([]);
    });
  });

  describe("dayanıklılık: null çift", () => {
    const bozuk = { ...ref, pairs: [null, { ...ref.pairs[1] }, "metin", { id: 5, cardA: 7 }] };
    it("checks çökmez (fabrika ortak kontrolleri dahil)", () => {
      expect(() => adapter.checks({ body, output: bozuk, rawText: JSON.stringify(bozuk), alias: "Selin" })).not.toThrow();
    });
    it("renderForJudge ve genericCandidate çökmez; çift sayısı korunur", () => {
      let t = "";
      expect(() => (t = adapter.renderForJudge(bozuk))).not.toThrow();
      expect(t).toContain("2. küçük ↔ ufak");
      expect(t.match(/↔/g)).toHaveLength(4);
      expect(() => adapter.genericCandidate(bozuk)).not.toThrow();
      expect(() => adapter.renderForJudge({ ...ref, pairs: "x" })).not.toThrow();
      expect(() => adapter.genericCandidate({ ...ref, pairs: "x" })).not.toThrow();
    });
    it("çıktı yok: hakem hata metnini görür", () => {
      expect(adapter.renderForJudge(null)).toContain("Çıktı üretilemedi");
    });
  });
});
