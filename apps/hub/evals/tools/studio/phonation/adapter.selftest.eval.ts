// apps/hub/evals/tools/studio/phonation/adapter.selftest.eval.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { CaseDef, StudioFixture } from "../../../lib/core";
import { resolveFixture } from "../../../lib/fixtures";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { adapter } from "./adapter";
import type { PhonationBody } from "./checks";

/* Rota taklidi: adaptörün rotaya NE gönderdiğini görmek için (gerçek rota DB/model ister). */
const rota = vi.hoisted(() => ({ gelen: [] as Array<Record<string, unknown>> }));
vi.mock("@/app/studio/api/tools/phonation/route", () => ({
  POST: async (req: Request) => {
    rota.gelen.push((await req.json()) as Record<string, unknown>);
    return new Response(JSON.stringify({ success: true, activity: { title: "t" } }), { status: 200 });
  },
}));

type Rec = Record<string, unknown>;
const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<PhonationBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const gorev = (id: string) => {
  const c = vaka(id);
  return adapter.renderTask(c, c.student ? (resolveFixture("studio", c.student) as StudioFixture) : null);
};

const cell = (position: number, word: string, hasTargetSound: boolean, extra: Rec = {}) => ({ position, word, hasTargetSound, isLadder: false, isSnake: false, instruction: null as string | null, visualPrompt: "a plain object", ...extra });
const obj = (name: string, hasTargetSound: boolean, extra: Rec = {}) => ({ name, hasTargetSound, description: "kısa açıklama", visualPrompt: "a plain object", ...extra });
const base = { title: "Etkinlik", instructions: "Oyunu birlikte oynayın.", expertNotes: "Hedef sesi uzatarak modelleyin.", adaptations: "Kolay: iki nesne. Zor: süre ekleyin.", scene: null as string | null, objects: [] as unknown[], grid: null as unknown };

const av = {
  ...base, scene: "Mutfakta sabah kahvaltısı hazırlanıyor.",
  objects: [
    ...["kaşık", "kase", "kupa", "bıçak", "kavanoz", "kepçe"].map((w) => obj(w, true, { visualPrompt: `a ${w} item` })),
    ...["masa", "tencere", "fırın", "çatal"].map((w) => obj(w, false)),
  ],
};
const R = ["araba", "robot", "radyo", "çorap", "armut", "kürek", "köprü", "karpuz", "kurbağa", "marul", "tarak", "portakal", "bardak", "kar", "saray", "torba", "perde", "dere", "yürek", "orman"];
const yilan = { ...base, grid: { rows: 4, cols: 5, cells: R.map((w, i) => cell(i + 1, w, true, { isLadder: [3, 9, 14].includes(i + 1), isSnake: [6, 12, 18].includes(i + 1), instruction: [3, 6].includes(i + 1) ? "Doğru söyle" : null })) } };
const S = ["su", "sepet", "saat", "sandalye", "sabun", "simit", "salata", "sürahi", "masa", "kasa", "pasta", "musluk", "tas", "sakız", "soba", "sebze"];
const tombala = { ...base, grid: { rows: 4, cols: 4, cells: S.map((w, i) => cell(i + 1, w, true)) } };
const SH = ["şapka", "şeker", "şemsiye", "şişe", "şarkı", "kuş", "ışık", "düş", "taş"];
const DS = ["sandalye", "masa", "kapı", "elma", "balık", "kedi", "top", "araba", "kitap", "çiçek", "ayna", "bulut", "deniz", "ev", "göl", "yıldız"];
const YOL = [1, 2, 3, 4, 5, 10, 15, 20, 25];
const labirent = (() => {
  let t = 0, d = 0;
  return { ...base, grid: { rows: 5, cols: 5, cells: Array.from({ length: 25 }, (_, i) => (YOL.includes(i + 1) ? cell(i + 1, SH[t++]!, true) : cell(i + 1, DS[d++]!, false))) } };
})();
const tabanlar: Array<[string, string, Rec]> = [["ses-01", "ses avı", av], ["ses-02", "tombala", tombala], ["ses-03", "yılan–merdiven", yilan], ["ses-04", "labirent", labirent]];

describe("sesletim oyunu adaptörü", () => {
  it("4 vaka (dört etkinlik türü), fikstürler çözülür (ses-02 öğrencisiz); 4 ortak + 2 araç ölçütü", () => {
    expect(cases.map((c) => c.id)).toEqual(["ses-01", "ses-02", "ses-03", "ses-04"]);
    for (const c of cases) expect(resolveFixture("studio", c.student)?.id ?? null).toBe(c.student);
    expect(vaka("ses-02").student).toBeNull();
    expect(cases.map((c) => c.body.activityType)).toEqual(["sound_hunt", "bingo", "snakes_ladders", "sound_maze"]);
    expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(["ses_dogrulugu", "oyun_uygulanabilirligi"]);
  });

  it("vaka gövdeleri rotanın şemasına uyar; öğe sayıları promptun yapı kurallarıyla uyumlu", () => {
    for (const c of cases) {
      const b = c.body;
      expect(b.targetSounds.length, c.id).toBeGreaterThanOrEqual(1);
      expect(b.targetSounds.length, c.id).toBeLessThanOrEqual(20);
      for (const s of b.targetSounds) expect(s.length, `${c.id} ${s}`).toBeLessThanOrEqual(20);
      expect(["sound_hunt", "bingo", "snakes_ladders", "sound_maze"], c.id).toContain(b.activityType);
      expect(["easy", "medium", "hard"], c.id).toContain(b.difficulty);
      expect(Number.isInteger(b.itemCount), c.id).toBe(true);
      expect(b.itemCount, c.id).toBeGreaterThanOrEqual(8);
      expect(b.itemCount, c.id).toBeLessThanOrEqual(25);
      expect((b.theme ?? "").length, c.id).toBeLessThanOrEqual(100);
    }
    expect([9, 16, 25]).toContain(vaka("ses-02").body.itemCount); // tombala: 9→3×3, 16→4×4, 25→5×5
    expect(vaka("ses-03").body.itemCount % 5).toBe(0); // yılan–merdiven: rows = itemCount/5
    expect(vaka("ses-04").body.itemCount).toBe(25);
  });

  it("hakem görevi: route'taki etkinlik etiketi, hedef ses, zorluk, öğe sayısı, tema ('Karışık (tema yok)') ve yapı kuralı", () => {
    const t1 = gorev("ses-01");
    expect(t1).toContain("- Aktivite türü: Ses Avı · Hedef ses(ler): /k/ · Zorluk: Kolay · Öğe sayısı: 10 · Tema: mutfak");
    expect(t1).toContain("sahne + nesneler");
    const t2 = gorev("ses-02");
    expect(t2).toContain("- Aktivite türü: Tombala · Hedef ses(ler): /s/ · Zorluk: Orta · Öğe sayısı: 16 · Tema: Karışık (tema yok)");
    expect(t2).toContain("16→4×4");
    expect(t2).toContain("Öğrenci seçilmedi");
    const t3 = gorev("ses-03");
    expect(t3).toContain("- Aktivite türü: Yılan Merdiven · Hedef ses(ler): /r/ · Zorluk: Orta · Öğe sayısı: 20");
    expect(t3).toContain("satır = öğe/5 × 5 sütun");
    const t4 = gorev("ses-04");
    expect(t4).toContain("- Aktivite türü: Ses Labirenti · Hedef ses(ler): /ş/ · Zorluk: Zor · Öğe sayısı: 25");
    expect(t4).toContain("hasTargetSound true");
  });

  it("hakem görevi: kelime kaynağı notu öğrencisiz/öğrencili/bankasız ayrımıyla puanlayıcıyla aynı karar (kelimeKaynagi)", () => {
    const banka = gorev("ses-02");
    expect(banka).toContain("uzman-onaylı bankadan yazıldı (iki adayda aynı)");
    expect(banka).toContain("kelime seçimini değil yapıyı değerlendir");
    for (const id of ["ses-01", "ses-03", "ses-04"]) {
      const t = gorev(id);
      expect(t, id).toContain("bilinen ürün hatası");
      expect(t, id).toContain("modelin 'geçici' kelimeleri");
      expect(t, id).not.toContain("uzman-onaylı bankadan yazıldı");
    }
    const bankasiz = adapter.renderTask({ ...vaka("ses-02"), body: { ...vaka("ses-02").body, targetSounds: ["/x/"] } }, null);
    expect(bankasiz).toContain("bu ses(ler) bankada yok");
    expect(bankasiz).not.toContain("uzman-onaylı bankadan yazıldı");
  });

  it("hakem ölçütleri vakalarla çelişmez: labirent yolu ve banka notu sorulur", () => {
    const uyg = adapter.criteria.find((c) => c.key === "oyun_uygulanabilirligi")!.question;
    expect(uyg).toContain("girişten (ilk kare) çıkışa (son kare) hedef sesli kelimelerden geçen bir doğru yol");
    const ses = adapter.criteria.find((c) => c.key === "ses_dogrulugu")!.question;
    expect(ses).toContain("sistem bankadan yazdıysa");
    expect(vaka("ses-04").purpose).toContain("çözülebilir doğru yol");
  });

  it("bağlantı: yanıt anahtarı 'activity'; öğrencisiz istek rotaya studentId'siz gider (öğrenci zorunlu değil), öğrencili istek studentId ile", async () => {
    expect(adapter.extractOutput({ activity: av, plan: 1 })).toBe(av);
    expect(adapter.extractOutput({ plan: 1 })).toBeUndefined();
    rota.gelen.length = 0;
    const b = vaka("ses-02").body;
    const a = await adapter.invoke(b, null);
    expect(a).toEqual({ status: 200, body: { success: true, activity: { title: "t" } } });
    expect(rota.gelen[0]).toEqual(b);
    await adapter.invoke(vaka("ses-01").body, "stu-yigit");
    expect(rota.gelen[1]).toEqual({ ...vaka("ses-01").body, studentId: "stu-yigit" });
  });

  it.each(tabanlar)("iyi çıktı (%s, %s, öğrencili): sert hata yok, talimat 1, ortak puanlar 1", (id, _tur, cikti) => {
    const r = adapter.checks({ body: vaka(id).body, output: cikti, rawText: JSON.stringify(cikti), alias: "Selin" });
    expect(r.hard_fail).toEqual([]);
    expect(r.scores).toMatchObject({ talimat: 1, dil_kurali: 1, rumuz_yok: 1, yasak_kalip: 1 });
    expect(r.details.kelimeler).toBe("model");
  });
  it("öğrencisiz tombala (ses-02): banka kelimeleri puanlanmaz → kelime anahtarları yok, yapı 1", () => {
    const r = adapter.checks({ body: vaka("ses-02").body, output: tombala, rawText: JSON.stringify(tombala), alias: null });
    expect(r.hard_fail).toEqual([]);
    expect(r.details.kelimeler).toBe("banka");
    expect(r.scores).toMatchObject({ talimat: 1, yapi: 1, oge_sayisi: 1, pozisyon: 1 });
    expect(r.scores).not.toHaveProperty("hedef_tutarli");
    // Bankanın zaten yazdığı alanlarda kusur uydurma kusuru değildir: kelimeler saçma olsa da puan aynı.
    const saçma = { ...tombala, grid: { rows: 4, cols: 4, cells: S.map((_, i) => cell(i + 1, "zzz", false, { visualPrompt: "" })) } };
    expect(adapter.checks({ body: vaka("ses-02").body, output: saçma, rawText: JSON.stringify(saçma), alias: null }).scores).toEqual(r.scores);
  });

  it("rota activityType/targetSounds/difficulty/theme'i ezer: bozuk olsalar da puan değişmez", () => {
    const ezilen = { ...tombala, activityType: "bingo?", targetSounds: ["/q/"], difficulty: 7, theme: 3 };
    const a = adapter.checks({ body: vaka("ses-02").body, output: ezilen, rawText: JSON.stringify(tombala), alias: null });
    const b = adapter.checks({ body: vaka("ses-02").body, output: tombala, rawText: JSON.stringify(tombala), alias: null });
    expect(a.scores).toEqual(b.scores);
  });

  it("rumuz görsel komutunda kalabilir (görsel sağlayıcıya gerçek ad gitmez); başka alanda sızıntıdır", () => {
    const komutta = { ...tombala, grid: { rows: 4, cols: 4, cells: [cell(1, "su", true, { visualPrompt: "Selin drinking water" }), ...tombala.grid.cells.slice(1)] } };
    expect(adapter.checks({ body: vaka("ses-02").body, output: komutta, rawText: JSON.stringify(komutta), alias: "Selin" }).scores.rumuz_yok).toBe(1);
    const sizan = { ...tombala, instructions: "Selin için oyunu oynayın." };
    const r = adapter.checks({ body: vaka("ses-02").body, output: sizan, rawText: JSON.stringify(sizan), alias: "Selin" });
    expect(r.scores.rumuz_yok).toBe(0);
    expect(r.hard_fail).toContain("rumuz_sizintisi");
  });

  describe("hakem çizimi", () => {
    it("ses avı: başlık, sahne, nesneler (etiket, açıklama, görsel), notlar", () => {
      const t = adapter.renderForJudge(av);
      expect(t).toContain("Başlık: Etkinlik");
      expect(t).toContain("Sahne: Mutfakta sabah kahvaltısı hazırlanıyor.");
      expect(t).toContain("• kaşık [hedef] kısa açıklama · görsel: a kaşık item");
      expect(t).toContain("• masa [çeldirici] kısa açıklama · görsel: a plain object");
      expect(t).not.toContain("Izgara");
      expect(t).toContain("Yönerge: Oyunu birlikte oynayın.");
      expect(t).toContain("Uzman notları: Hedef sesi uzatarak modelleyin.");
      expect(t).toContain("Uyarlamalar: Kolay: iki nesne.");
    });
    it("ızgara türleri: Izgara satır×sütun başlığı, konum, kelime, etiket, merdiven/yılan, hücre yönergesi", () => {
      const t = adapter.renderForJudge(yilan);
      expect(t).toContain("Izgara 4×5:");
      expect(t).toContain("3. radyo [hedef] · merdiven — Doğru söyle · görsel: a plain object");
      expect(t).toContain("6. kürek [hedef] · yılan — Doğru söyle · görsel: a plain object");
      expect(t).toContain("20. orman [hedef] · görsel: a plain object");
      expect(t).not.toContain("Sahne:");
      expect(adapter.renderForJudge(labirent)).toContain("10. kuş [hedef]");
      expect(adapter.renderForJudge(labirent)).toContain("6. sandalye [çeldirici]");
    });
    it("etiket yoksa 'etiket yok' (çeldirici denmez), görsel yoksa '—', konum yoksa sıradan gelir, satır/sütun yoksa '?'", () => {
      const t = adapter.renderForJudge({ ...base, grid: { cols: "3", cells: [{ word: "su" }, { position: 2, word: "", hasTargetSound: false }] } });
      expect(t).toContain("Izgara ?×3:");
      expect(t).toContain("1. su [etiket yok] · görsel: —");
      expect(t).toContain("2. — [çeldirici] · görsel: —");
      const o = adapter.renderForJudge({ ...base, scene: "S", objects: [{ name: "kedi", hasTargetSound: "evet", description: "" }] });
      expect(o).toContain("• kedi [etiket yok] · görsel: —");
    });
  });

  describe("jenerik aday", () => {
    it.each(tabanlar)("%s (%s): ≥ 4 yasak kalıp taşır, hakeme referanstan farklı görünür; yapı (sahne, ızgara, etiketler, konumlar) korunur", (id, _tur, ref) => {
      const before = JSON.stringify(ref);
      const g = adapter.genericCandidate(ref) as Rec;
      expect(JSON.stringify(ref)).toBe(before); // referans değişmez (derin kopya)
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(ref));
      expect(g.grid).toEqual(ref.grid);
      expect(g.scene).toBe(ref.scene);
      expect(g.title).toBe(ref.title);
      // Yapısal puanlar aynı; yalnız yasak kalıp çöker.
      const b = vaka(id).body;
      const a = adapter.checks({ body: b, output: ref, rawText: JSON.stringify(ref), alias: "Selin" });
      const c = adapter.checks({ body: b, output: g, rawText: JSON.stringify(g), alias: "Selin" });
      expect({ ...c.scores, yasak_kalip: 1 }).toEqual(a.scores);
      expect(c.scores.yasak_kalip).toBe(0);
    });
    it("ses avında nesne adı, etiket ve görsel korunur; açıklamalar ve tüm yorum alanları değişir", () => {
      const g = adapter.genericCandidate(av) as typeof av;
      expect(g.objects.map((o) => [o.name, o.hasTargetSound, o.visualPrompt])).toEqual(av.objects.map((o) => [o.name, o.hasTargetSound, o.visualPrompt]));
      expect(g.objects.every((o, i) => o.description !== av.objects[i]!.description)).toBe(true);
      for (const k of ["instructions", "expertNotes", "adaptations"] as const) expect(g[k], k).not.toBe(av[k]);
    });
    it("öğesiz kısa çıktıda da ≥ 4 yasak kalıp (sabit alanlardan)", () => {
      expect(yasakKalip(metinler(adapter.genericCandidate(base)).join("\n")).found.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("dayanıklılık: null hücre/nesne", () => {
    const bozuk = { ...base, scene: "S", objects: [null, { ...obj("kedi", true) }, "metin", { name: 5, hasTargetSound: "x" }], grid: { rows: 2, cols: 2, cells: [null, "m", { word: 3 }] } };
    it("checks çökmez (fabrika ortak kontrolleri dahil), tüm türlerde", () => {
      for (const id of ["ses-01", "ses-02", "ses-03", "ses-04"]) {
        expect(() => adapter.checks({ body: vaka(id).body, output: bozuk, rawText: JSON.stringify(bozuk), alias: "Selin" }), id).not.toThrow();
      }
    });
    it("renderForJudge ve genericCandidate çökmez; öğe sayısı korunur", () => {
      let t = "";
      expect(() => (t = adapter.renderForJudge(bozuk))).not.toThrow();
      expect(t).toContain("• kedi [hedef]");
      expect(t.match(/•/g)).toHaveLength(4);
      expect(t.match(/ görsel: /g)).toHaveLength(7);
      expect(() => adapter.genericCandidate(bozuk)).not.toThrow();
      expect(() => adapter.renderForJudge({ ...base, objects: "x", grid: "y" })).not.toThrow();
      expect(() => adapter.genericCandidate({ ...base, objects: "x", grid: "y" })).not.toThrow();
    });
    it("çıktı yok: hakem hata metnini görür", () => {
      expect(adapter.renderForJudge(null)).toContain("Çıktı üretilemedi");
    });
  });
});
