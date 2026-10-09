// apps/hub/evals/tools/studio/phonation/adapter.selftest.eval.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { articulation } from "@ludenlab/ai";
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
  ...base, activityType: "sound_hunt", targetSounds: ["/k/"], scene: "Mutfakta sabah kahvaltısı hazırlanıyor.",
  objects: [
    ...["kaşık", "kase", "kupa", "bıçak", "kavanoz", "kepçe"].map((w) => obj(w, true, { visualPrompt: `a ${w} item` })),
    ...["masa", "tencere", "fırın", "çatal"].map((w) => obj(w, false)),
  ],
};
const R = ["araba", "robot", "radyo", "çorap", "armut", "kürek", "köprü", "karpuz", "kurbağa", "marul", "tarak", "portakal", "bardak", "kar", "saray", "torba", "perde", "dere", "yürek", "orman"];
const yilan = { ...base, activityType: "snakes_ladders", targetSounds: ["/r/"], grid: { rows: 4, cols: 5, cells: R.map((w, i) => cell(i + 1, w, true, { isLadder: [3, 9, 14].includes(i + 1), isSnake: [6, 12, 18].includes(i + 1), instruction: [3, 6].includes(i + 1) ? "Doğru söyle" : null })) } };
const S = ["su", "sepet", "saat", "sandalye", "sabun", "simit", "salata", "sürahi", "masa", "kasa", "pasta", "musluk", "tas", "sakız", "soba", "sebze"];
const tombala = { ...base, activityType: "bingo", targetSounds: ["/s/"], grid: { rows: 4, cols: 4, cells: S.map((w, i) => cell(i + 1, w, true)) } };
const SH = ["şapka", "şeker", "şemsiye", "şişe", "şarkı", "kuş", "ışık", "düş", "taş"];
const DS = ["sandalye", "masa", "kapı", "elma", "balık", "kedi", "top", "araba", "kitap", "çiçek", "ayna", "bulut", "deniz", "ev", "göl", "yıldız"];
const YOL = [1, 2, 3, 4, 5, 10, 15, 20, 25];
const labirent = (() => {
  let t = 0, d = 0;
  return { ...base, activityType: "sound_maze", targetSounds: ["/ş/"], grid: { rows: 5, cols: 5, cells: Array.from({ length: 25 }, (_, i) => (YOL.includes(i + 1) ? cell(i + 1, SH[t++]!, true) : cell(i + 1, DS[d++]!, false))) } };
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

  it("vaka amaçları adaptörün notlarını tekrarlamaz: kelime kaynağı notu bayrağı izler, görsel tanımı vaadi bankalı vakada yok", () => {
    for (const id of ["ses-01", "ses-03", "ses-04"]) expect(vaka(id).purpose, id).not.toContain("modelin kelimeleri kalır");
    expect(vaka("ses-02").purpose).not.toContain("görsel tanımları tek nesne");
    expect(vaka("ses-02").purpose).toContain("bankadan");
  });

  it("hakem ölçütleri vakalarla çelişmez: labirent yolu, tema uyumu, serbest kare ve banka notu sorulur", () => {
    const uyg = adapter.criteria.find((c) => c.key === "oyun_uygulanabilirligi")!.question;
    expect(uyg).toContain("sahne/kelimeler temayla uyumlu mu");
    expect(uyg).toContain("serbest karenin kelimesi değerlendirilmez");
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

  describe("hakem çizimi: kelimeleri kim yazdı", () => {
    const bank = (harf: string, n: number) => [...articulation.WORD_BANK[harf]!.initial, ...articulation.WORD_BANK[harf]!.medial].slice(0, n);
    const bankaHucre = (w: { word: string; visualPrompt: string }, i: number, extra: Rec = {}, hedef = true) => cell(i + 1, w.word, hedef, { visualPrompt: w.visualPrompt, ...extra });
    const bankaBingo = () => ({ ...base, activityType: "bingo", targetSounds: ["/s/"], grid: { rows: 4, cols: 4, cells: bank("s", 16).map((w, i) => bankaHucre(w, i)) } });

    it("serbest kare (tombala, kare ızgara): model kelimeli çizimde satır '⭐ serbest kare' olur, kelimesi gösterilmez; diğer hücreler tam satır", () => {
      const t = adapter.renderForJudge(tombala);
      expect(t).toContain("8. ⭐ serbest kare (arayüz kelimeyi göstermez)");
      expect(t).not.toContain("sürahi"); // 8. konumdaki kelime
      expect(t).toContain("1. su [hedef] · görsel: a plain object");
      expect(t).toContain("9. masa [hedef] · görsel: a plain object");
    });
    it("serbest kare yalnız bingo ve kare ızgarada: yılan–merdiven 5×5 ve kare olmayan tombala tam satır", () => {
      const yilan55 = { ...yilan, grid: { rows: 5, cols: 5, cells: [...(yilan.grid.cells as Rec[]), ...[21, 22, 23, 24, 25].map((p) => cell(p, "kar", true))] } };
      expect(adapter.renderForJudge(yilan55)).not.toContain("serbest");
      const iki = { ...tombala, grid: { rows: 2, cols: 8, cells: tombala.grid.cells } };
      expect(adapter.renderForJudge(iki)).not.toContain("serbest");
      expect(adapter.renderForJudge({ ...tombala, activityType: undefined })).not.toContain("serbest");
    });
    it("bankalı tombala: kelimeler TEK satırda (serbest kare işaretli), görsel satırı ve hücre satırları yok", () => {
      const t = adapter.renderForJudge(bankaBingo());
      expect(t).toContain("Izgara 4×4:");
      const kelimeler = bank("s", 16).map((w, i) => (i === 7 ? "⭐ serbest kare" : w.word)).join(", ");
      expect(t).toContain(`Kelimeler (sistem bankadan yazdı; konum sırasıyla): ${kelimeler}`);
      expect(t).not.toContain("görsel:");
      expect(t).not.toMatch(/^\d+\. /m);
      expect(t).not.toContain("Hedef konumlar"); // hepsi hedef: etiket listesi gereksiz
      expect(t.split("\n").length).toBeLessThan(adapter.renderForJudge(tombala).split("\n").length / 2);
    });
    it("bankalı yılan–merdiven: kelimeler tek satır; yalnız model katkısı olan hücreler (merdiven/yılan/yönerge) satır olur", () => {
      const cells = bank("r", 20).map((w, i) => bankaHucre(w, i, { isLadder: [3, 9].includes(i + 1), isSnake: i + 1 === 6, instruction: [3, 6].includes(i + 1) ? "Doğru söyle" : null }));
      const t = adapter.renderForJudge({ ...base, activityType: "snakes_ladders", targetSounds: ["/r/"], grid: { rows: 4, cols: 5, cells } });
      expect(t).toContain(`Kelimeler (sistem bankadan yazdı; konum sırasıyla): ${bank("r", 20).map((w) => w.word).join(", ")}`);
      expect(t).toContain("\n3. merdiven — Doğru söyle\n");
      expect(t).toContain("\n6. yılan — Doğru söyle\n");
      expect(t).toContain("\n9. merdiven\n");
      expect(t).not.toContain("görsel:");
      expect(t.match(/^\d+\. /gm)).toHaveLength(3);
    });
    it("bankalı labirent: etiketler konum listesi olarak (hakem doğru yolu konumlardan okur)", () => {
      const cells = [...bank("ş", 9), ...bank("m", 16)].map((w, i) => bankaHucre(w, i, {}, i < 9));
      const t = adapter.renderForJudge({ ...base, activityType: "sound_maze", targetSounds: ["/ş/"], grid: { rows: 5, cols: 5, cells } });
      expect(t).toContain("Hedef konumlar: 1, 2, 3, 4, 5, 6, 7, 8, 9\n");
      expect(t).toContain(`Çeldirici konumlar: ${Array.from({ length: 16 }, (_, k) => k + 10).join(", ")}\n`);
      expect(t).not.toContain("Etiketsiz");
      expect(t).not.toContain("görsel:");
      cells[3]!.hasTargetSound = undefined as unknown as boolean;
      expect(adapter.renderForJudge({ ...base, activityType: "sound_maze", targetSounds: ["/ş/"], grid: { rows: 5, cols: 5, cells } })).toContain("Etiketsiz konumlar: 4");
    });
    it("bankalı ses avı: nesneler tek satırda etiketleriyle; bayat açıklama (rota yalnız ad/görsel/etiketi ezer) ve görsel komutu gösterilmez", () => {
      const objeler = [...bank("k", 6).map((w) => obj(w.word, true, { visualPrompt: w.visualPrompt, description: "eski nesnenin açıklaması" })), ...bank("m", 4).map((w) => obj(w.word, false, { visualPrompt: w.visualPrompt, description: "eski nesnenin açıklaması" }))];
      const t = adapter.renderForJudge({ ...base, activityType: "sound_hunt", targetSounds: ["/k/"], scene: "Mutfak", objects: objeler });
      expect(t).toContain("Sahne: Mutfak");
      expect(t).toContain(`Nesneler (sistem bankadan yazdı): ${objeler.map((o) => `${o.name as string} [${o.hasTargetSound ? "hedef" : "çeldirici"}]`).join(", ")}`);
      expect(t).not.toContain("eski nesnenin açıklaması");
      expect(t).not.toContain("görsel:");
      expect(t).not.toContain("•");
    });
    it("karar çıktıdan verilir: aynı kelimeler modelin görsel komutlarıyla (öğrencili) tam satır, bankanınkilerle sıkıştırılmış; hedef sesler bankasızsa tam", () => {
      const m = bankaBingo() as { grid: { cells: Rec[] } };
      m.grid.cells.forEach((c) => { c.visualPrompt = "a plain object"; });
      expect(adapter.renderForJudge(m)).toContain("1. " + bank("s", 1)[0]!.word + " [hedef] · görsel: a plain object");
      expect(adapter.renderForJudge({ ...bankaBingo(), targetSounds: ["/x/"] })).toContain("görsel:");
      expect(adapter.renderForJudge({ ...bankaBingo(), targetSounds: undefined })).toContain("görsel:");
    });
    it("jenerik aday bankalı çıktıda da sıkışık çizilir ve referanstan farklıdır", () => {
      const ref = bankaBingo();
      const g = adapter.genericCandidate(ref);
      expect(adapter.renderForJudge(g)).toContain("Kelimeler (sistem bankadan yazdı");
      expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(ref));
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
