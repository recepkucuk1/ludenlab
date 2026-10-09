// apps/hub/evals/tools/studio/cards/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { cardChecks, type CardBody } from "./checks";

const body: CardBody = { category: "language", difficulty: "easy", ageGroup: "3-6", focusArea: "üç kelimeli istek cümlesi" };
const ok = {
  title: "Su istiyorum", objective: "Üç kelimeli istek cümlesi kurma", materials: ["bardak", "kart"],
  instructions: ["Adım 1: Bardağı göster.", "Adım 2: Bekle.", "Adım 3: Modelle."],
  exercises: [{ name: "İstek oyunu", description: "d", repetitions: "5 kez" }],
  therapistNotes: "Hazal'ı her denemede sözel olarak cesaretlendirin.", progressIndicators: ["5 denemeden 4'ünde istek cümlesi kurar", "3 oturum üst üste %80 bağımsız"], homeExercise: "h",
  category: "language", difficulty: "easy", ageGroup: "3-6",
};
type Rec = Record<string, unknown>;
/** Model çıktısı (rumuzlu ham) ve route çıktısı (gerçek ad geri konmuş) ayrı geçer; çoğu test ikisini aynı nesne verir. */
const run = (out: unknown, o: { b?: CardBody; raw?: Rec | null; alias?: string | null } = {}) =>
  cardChecks({ body: o.b ?? body, output: out, raw: o.raw === undefined ? (out as Rec | null) : o.raw, text: "", alias: o.alias === undefined ? null : o.alias });
const ins = (n: number) => Array.from({ length: n }, (_, i) => `Adım ${i + 1}: Etkinlik ${i + 1}.`);
const ex = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `Egzersiz ${i + 1}`, description: "Nasıl yapılır.", repetitions: "5 tekrar" }));
const list = (n: number) => Array.from({ length: n }, (_, i) => `madde ${i + 1}`);

describe("cardChecks", () => {
  it("tam kart: tüm puanlar 1; odak alanı amaçta (ayrıntı)", () => {
    const r = cardChecks({ body, output: ok, raw: ok, text: "", alias: "Hazal" });
    expect(r.scores).toMatchObject({ baslik_80: 1, adim_bicimi: 1, adim_sayisi: 1, materyal: 1, egzersiz: 1, gosterge: 1, gosterge_olculebilir: 1, alanlar: 1, isim_kullanimi: 1, talimat: 1 });
    expect(r.details.odak).toBe(1);
    expect(r.hard).toEqual([]);
  });
  it("adım biçimi bozuk, başlık uzun, egzersiz boş", () => {
    const out = { ...ok, title: "x".repeat(81), instructions: ["Adım 1: a", "b", "Adım 3: c"], exercises: [] };
    const r = cardChecks({ body, output: out, raw: out, text: "", alias: null });
    expect(r.scores.baslik_80).toBe(0);
    expect(r.scores.adim_bicimi).toBeCloseTo(2 / 3);
    expect(r.scores.egzersiz).toBe(0);
  });
  it("yönerge yoksa sert hata", () => {
    expect(cardChecks({ body, output: { ...ok, instructions: [] }, raw: ok, text: "", alias: null }).hard).toContain("yonerge_yok");
  });

  describe("talimat yalnız şema/prompt kurallarını sayar", () => {
    it("puan anahtarları: rumuz yoksa isim_kullanimi yazılmaz; talimat bunların ortalaması, odak/amaç cümlesi hiçbirine girmez", () => {
      const r = run(ok);
      expect(Object.keys(r.scores).sort()).toEqual(["adim_bicimi", "adim_sayisi", "alanlar", "baslik_80", "egzersiz", "gosterge", "gosterge_olculebilir", "materyal", "talimat"]);
      expect(run(ok, { alias: "Hazal" }).scores).toHaveProperty("isim_kullanimi");
      // Odak alanı hiç geçmiyor + amaç üç cümle: yalnız ayrıntıya düşer, talimat 1 kalır.
      const out = { ...ok, title: "Bardak oyunu", objective: "Bardağı kullanır. İsteği sözle bildirir. Sırayı bekler.", exercises: ex(1) };
      const q = run(out);
      expect(q.scores.talimat).toBe(1);
      expect(q.details).toMatchObject({ odak: 0, amac_cumle: 3 });
    });
    it("talimat = tüm puanların ortalaması (çıktı yoksa 0)", () => {
      const out = { ...ok, materials: [] };
      const r = run(out);
      const { talimat, ...parca } = r.scores;
      expect(talimat).toBeCloseTo(Object.values(parca).reduce((a, b) => a + b, 0) / Object.values(parca).length);
      expect(talimat).toBeLessThan(1);
      expect(run(null).scores.talimat).toBe(0);
    });
  });

  describe("baslik_80 (şema: en fazla 80 karakter)", () => {
    it.each([
      ["80 karakter", "x".repeat(80), 1],
      ["81 karakter", "x".repeat(81), 0],
      ["boş", "", 0],
      ["yalnız boşluk", "   ", 0],
      ["emoji kod noktası sayılır (60 emoji = 60 karakter, 120 UTF-16 birimi)", "😀".repeat(60), 1],
      ["81 emoji", "😀".repeat(81), 0],
    ])("%s", (_ad, title, beklenen) => {
      expect(run({ ...ok, title }).scores.baslik_80).toBe(beklenen);
    });
    it("başlık metin değilse 0", () => {
      expect(run({ ...ok, title: 12 }).scores.baslik_80).toBe(0);
      expect(run({ ...ok, title: null }).scores.baslik_80).toBe(0);
    });
  });

  describe("adim_bicimi (arayüz ^Adım \\d+: önekini söker) ve adim_sayisi (şema 3–8)", () => {
    it.each([
      ["Adım 1: a", 1],
      ["Adım 12: a", 1],
      ["Adım 1:a", 1],
      ["adım 1: a", 0],
      ["Adım 1. a", 0],
      ["Adım 1 : a", 0],
      ["Adım: a", 0],
      [" Adım 1: a", 0], // arayüzün regex'i başa yaslıdır: öndeki boşluk sökülmez
      ["1. a", 0],
    ])("%j → %d", (adim, beklenen) => {
      expect(run({ ...ok, instructions: [adim, "Adım 2: b", "Adım 3: c"] }).scores.adim_bicimi).toBeCloseTo((beklenen + 2) / 3);
    });
    it("metin olmayan adım biçimsizdir (arayüz .replace ile çöker)", () => {
      const r = run({ ...ok, instructions: ["Adım 1: a", null, { a: 1 }, "Adım 4: d"] });
      expect(r.scores.adim_bicimi).toBe(0.5);
    });
    it.each([[2, 0], [3, 1], [8, 1], [9, 0]])("%d adım → sayı %d", (n, beklenen) => {
      expect(run({ ...ok, instructions: ins(n) }).scores.adim_sayisi).toBe(beklenen);
    });
    it("adım dizisi değilse ya da boşsa: biçim 0, sayı 0", () => {
      for (const v of [undefined, null, "Adım 1: a", {}, []]) {
        const r = run({ ...ok, instructions: v });
        expect(r.scores).toMatchObject({ adim_bicimi: 0, adim_sayisi: 0 });
      }
    });
  });

  describe("materyal (1–6), egzersiz (1–4, her biri dolu), gosterge (2–5)", () => {
    it.each([[0, 0], [1, 1], [6, 1], [7, 0]])("%d materyal → %d", (n, beklenen) => {
      expect(run({ ...ok, materials: list(n) }).scores.materyal).toBe(beklenen);
    });
    it("boş/metin olmayan materyal sayılmaz", () => {
      expect(run({ ...ok, materials: ["", "  ", null] }).scores.materyal).toBe(0);
      expect(run({ ...ok, materials: ["bardak", ""] }).scores.materyal).toBe(1);
      expect(run({ ...ok, materials: "bardak" }).scores.materyal).toBe(0);
    });
    it.each([[0, 0], [1, 1], [4, 1], [5, 0]])("%d egzersiz → %d", (n, beklenen) => {
      expect(run({ ...ok, exercises: ex(n) }).scores.egzersiz).toBe(beklenen);
    });
    it("egzersizde ad/açıklama/tekrar eksikse payı düşer; null öğe boş sayılır, çökmez", () => {
      const eksik = (k: string) => ex(2).map((e, i) => (i === 0 ? { ...e, [k]: " " } : e));
      for (const k of ["name", "description", "repetitions"]) expect(run({ ...ok, exercises: eksik(k) }).scores.egzersiz, k).toBe(0.5);
      expect(run({ ...ok, exercises: [null, ...ex(1)] }).scores.egzersiz).toBe(0.5);
      expect(run({ ...ok, exercises: ["metin"] }).scores.egzersiz).toBe(0);
      expect(run({ ...ok, exercises: { name: "x" } }).scores.egzersiz).toBe(0);
    });
    it.each([[1, 0], [2, 1], [5, 1], [6, 0]])("%d ilerleme göstergesi → sayı %d", (n, beklenen) => {
      expect(run({ ...ok, progressIndicators: list(n) }).scores.gosterge).toBe(beklenen);
    });
  });

  describe("gosterge_olculebilir (prompt: gözlemlenebilir ve ölçülebilir, soyut değil)", () => {
    const g = (...gosterge: unknown[]) => run({ ...ok, progressIndicators: gosterge }).scores.gosterge_olculebilir;
    it.each([
      "5 denemeden 4'ünde /s/ sesini izole olarak üretir",
      "%80 doğrulukla üç kelimeli cümle kurar",
      "10 cümlenin 8'inde bağlacı doğru kullanır",
      "3 ardışık oturumda yönlendirmesiz üretir",
      "Oturum başına en az 5 kez kendiliğinden ister",
      "Yüzde seksen doğrulukla üretir",
      "Beş denemeden dördünde doğru yanıt verir",
      "3 oturum boyunca ipucu almadan yapar",
      "5 üzerinden 4 denemede doğru üretir",
      "10 üretimden 8 tanesi doğru",
      "5 üzerinden 4 tanesini üretir", // kesmesiz oran, birim ve 'doğru' yok
      // eşik ("en az N"), yazıyla/kesmeli oran, sayı + ad + doğru
      "Her oturumda en az bir kez kendiliğinden ister",
      "En az iki durumda yönlendirmesiz kullanır",
      "Dört olaylı anlatıda en az üç nedensel bağlaç kullanır",
      "Beş istek cümlesinin dördünü bağımsız kurar",
      "Beş istek cümlesinin dördünü",
      "10'unun 8'ini doğru üretir",
      "5'inden 4'ü doğru",
      "4 olayı doğru sırayla anlatır",
      "Dört olayı doğru sıralar",
      "10 kelimenin dokuzunu okur",
    ])("ölçülebilir: %s", (s) => expect(g(s, s)).toBe(1));
    it.each([
      "Gelişim gösterir",
      "Daha iyi yapar",
      "Cümleyi bağımsız kurar",
      "Hedef sesi doğru üretir",
      "Bir ardışık dizi kurar", // belirsiz "bir"
      "Ses üretimi güçlenir",
      "En az hata ile üretir", // "en az" + sayı yok
      "En az çaba harcar",
      "Doğru yanıt verir", // sayı yok
      "Bir olayı doğru sırayla anlatır", // belirsiz "bir"
      "Onu doğru üretir", // "on" + zamir eki
    ])("soyut: %s", (s) => expect(g(s, s)).toBe(0));
    it("oran: biri ölçülebilir biri soyut → 0,5; gösterge yoksa 0; metin olmayan öğe soyut", () => {
      expect(g("%80 doğruluk", "Gelişim gösterir")).toBe(0.5);
      expect(g()).toBe(0);
      expect(g("%80 doğruluk", null)).toBe(0.5);
    });
    it("büyük harf ve Türkçe İ biçimleri küçük harfe iner", () => {
      expect(g("YÜZDE SEKSEN doğrulukla", "ARDIŞIK 3 DENEMEDE doğru")).toBe(1);
    });
  });

  describe("alanlar (şema: amaç, uzman notu, ev egzersizi zorunlu)", () => {
    it.each([["objective"], ["therapistNotes"], ["homeExercise"]])("%s boşsa 2/3", (k) => {
      expect(run({ ...ok, [k]: "  " }).scores.alanlar).toBeCloseTo(2 / 3);
      expect(run({ ...ok, [k]: 7 }).scores.alanlar).toBeCloseTo(2 / 3);
      expect(run({ ...ok, [k]: undefined }).scores.alanlar).toBeCloseTo(2 / 3);
    });
    it("hepsi boşsa 0", () => {
      expect(run({ ...ok, objective: "", therapistNotes: "", homeExercise: "" }).scores.alanlar).toBe(0);
    });
  });

  describe("isim_kullanimi (prompt 2d: uzman notlarında öğrencinin adı en az bir kez)", () => {
    // Model çıktısı rumuzludur (raw); route gerçek adı geri koyar (output). İsim ham çıktıda aranır.
    const raw = (notes: string) => ({ ...ok, therapistNotes: notes }) as Rec;
    const out = { ...ok, therapistNotes: "Ela'yı her denemede cesaretlendirin." };
    it("rumuz uzman notlarında → 1 (kesmeli/kesmesiz ek, büyük harf)", () => {
      for (const n of ["Hazal'ı cesaretlendirin.", "Hazalın dikkati için kısa mola verin.", "HAZAL bugün iyiydi.", "Bu görevde Hazal için ipucunu azaltın.", "Hazal'a sözel övgü verin.", "Hazal’e kısa mola tanıyın.", "Hazal'in tepkisini izleyin."]) {
        expect(run(out, { raw: raw(n), alias: "Hazal" }).scores.isim_kullanimi, n).toBe(1);
      }
    });
    it("rumuz yok → 0 (kelime içi geçiş sayılmaz)", () => {
      expect(run(out, { raw: raw("Çocuğu cesaretlendirin."), alias: "Hazal" }).scores.isim_kullanimi).toBe(0);
      expect(run(out, { raw: raw("Hazalnut kremasıyla çalışın."), alias: "Hazal" }).scores.isim_kullanimi).toBe(0);
    });
    it("rumuz yalnız BAŞKA alanda geçiyorsa (örn. amaç) uzman notunda sayılmaz", () => {
      expect(run(out, { raw: { ...raw("Çocuğu cesaretlendirin."), objective: "Hazal'ın isteği" }, alias: "Hazal" }).scores.isim_kullanimi).toBe(0);
    });
    it("ham çıktı çözülemediyse kanıtlanamaz: 0; uzman notu metin değilse 0", () => {
      expect(run(out, { raw: null, alias: "Hazal" }).scores.isim_kullanimi).toBe(0);
      expect(run(out, { raw: { ...ok, therapistNotes: 5 } as Rec, alias: "Hazal" }).scores.isim_kullanimi).toBe(0);
    });
    it("öğrencisiz vaka (rumuz yok): puan yazılmaz", () => {
      expect(run(out, { raw: raw("Çocuğu cesaretlendirin."), alias: null }).scores).not.toHaveProperty("isim_kullanimi");
    });
    it("isim kullanılmamış kart talimatı düşürür", () => {
      const sade = run(out, { raw: raw("Çocuğu cesaretlendirin."), alias: "Hazal" });
      expect(sade.scores.talimat).toBeCloseTo(8 / 9);
    });
  });

  describe("odak (ayrıntı; talimata girmez)", () => {
    const odak = (focusArea: string | undefined, o: Rec) => run({ ...ok, ...o }, { b: { ...body, focusArea } }).details.odak;
    it("odak kelimelerinden biri başlıkta, amaçta ya da egzersizlerde (ilk 5 harf, küçük harf)", () => {
      expect(odak("Üç kelimeli istek cümlesini oyun içinde bağımsız üretme", { objective: "KELİMELİ ifadeler" })).toBe(1);
      expect(odak("Nefes desteğiyle cümle okuma", { objective: "Nefes kontrolü", title: "x" })).toBe(1);
      expect(odak("/r/ sesi kelime başında üretim", { objective: "Sesi", title: "Kelime başı", exercises: ex(1) })).toBe(1);
      expect(odak("Nedensel bağlaç", { objective: "Olay anlatısı", title: "Çizgi roman", exercises: [{ name: "Neden-sonuç", description: "d", repetitions: "3" }] })).toBe(1);
    });
    it("hiçbiri geçmiyorsa 0; odak yoksa ya da kısa kelimelerden oluşuyorsa 1 (ölçülemez)", () => {
      expect(odak("Üç kelimeli istek cümlesi", { objective: "Hayvanları tanır", title: "Çiftlik", exercises: ex(1) })).toBe(0);
      expect(odak(undefined, { objective: "x" })).toBe(1);
      expect(odak("/r/ ve /l/ ile", { objective: "x" })).toBe(1);
    });
  });

  describe("sert hata ve dayanıklılık", () => {
    it("yonerge_yok yalnız çıktı varken; çıktı yoksa sert hata yok (fabrika cikti_yok der)", () => {
      expect(run({ ...ok, instructions: undefined }).hard).toEqual(["yonerge_yok"]);
      expect(run({ ...ok, instructions: [] }).hard).toEqual(["yonerge_yok"]);
      expect(run(null).hard).toEqual([]);
    });
    it("çıktı nesne değilse çökmeden sıfır", () => {
      for (const v of [null, undefined, [], "metin", 5]) {
        const r = run(v);
        expect(r.scores.talimat, String(v)).toBe(0);
      }
    });
    it("null öğeli diziler çökmez", () => {
      expect(() => run({ ...ok, materials: [null], instructions: [null], exercises: [null], progressIndicators: [null] })).not.toThrow();
    });
  });
});
