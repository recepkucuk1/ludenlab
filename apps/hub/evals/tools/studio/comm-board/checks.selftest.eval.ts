// apps/hub/evals/tools/studio/comm-board/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { commBoardChecks, type CommBoardBody } from "./checks";

const body: CommBoardBody = { boardType: "basic_needs", symbolCount: 4, layout: "grid", textMode: "word_sentence", colorCoding: true };
const cell = (position: number, word: string, category: string, fitzgeraldColor: string) => ({ position, word, sentence: `${word} istiyorum`, category, fitzgeraldColor, visualDescription: "d", visualPrompt: "a cup", usage: "u" });
const ok = { title: "Pano", rows: 2, cols: 2, cells: [cell(1, "su", "noun", "yellow"), cell(2, "yemek", "noun", "yellow"), cell(3, "istiyorum", "verb", "green"), cell(4, "yardım", "social", "pink")], instructions: "i", expertNotes: "e", homeGuidance: "h", adaptations: "a" };

describe("commBoardChecks", () => {
  it("hücre sayısı, görsel, Fitzgerald rengi, cümle modu, tekrarsızlık", () => {
    const r = commBoardChecks({ body, output: ok, raw: ok, text: "", alias: null });
    expect(r.scores).toMatchObject({ hucre_sayisi: 1, izgara: 1, gorsel_dolu: 1, renk_tutarli: 1, cumle_modu: 1, tekrar_yok: 1 });
    expect(r.hard).toEqual([]);
  });
  it("hücre sayısı tutmuyor + yanlış renk + boş görsel", () => {
    const out = { ...ok, cells: [...ok.cells.slice(0, 3), { ...ok.cells[3], fitzgeraldColor: "blue", visualPrompt: "" }, cell(5, "su", "noun", "yellow")] };
    const r = commBoardChecks({ body, output: out, raw: out, text: "", alias: null });
    expect(r.scores.hucre_sayisi).toBe(0);
    expect(r.scores.renk_tutarli).toBe(0.8);
    expect(r.scores.gorsel_dolu).toBe(0.8);
    expect(r.scores.tekrar_yok).toBe(0.8);
  });
  it("hücre yoksa sert hata; renk kodlaması kapalıysa renk kontrolü 1", () => {
    expect(commBoardChecks({ body, output: { ...ok, cells: [] }, raw: ok, text: "", alias: null }).hard).toContain("hucre_yok");
    const out = { ...ok, cells: ok.cells.map((c) => ({ ...c, fitzgeraldColor: "red" })) };
    expect(commBoardChecks({ body: { ...body, colorCoding: false }, output: out, raw: out, text: "", alias: null }).scores.renk_tutarli).toBe(1);
  });
});

/* ── Ayırt ediciliği ölçen gerçekçi taban: her puan 1, her mutant ilgili puanı düşürür ── */

type Rec = Record<string, unknown>;
const c6 = (position: number, word: string, sentence: string, category: string, fitzgeraldColor: string, visualPrompt: string) => ({
  position, word, sentence, category, fitzgeraldColor, visualDescription: `${word} için sade bir simge`, visualPrompt, usage: `Çocuk ${word.toLowerCase()} demek istediğinde işaret eder`,
});
const B6: CommBoardBody = { boardType: "basic_needs", symbolCount: 6, layout: "grid", textMode: "word_sentence", colorCoding: true };
const taban = {
  title: "Temel ihtiyaçlar panosu", rows: 2, cols: 3,
  cells: [
    c6(1, "Su", "Su istiyorum.", "noun", "yellow", "a glass of water"),
    c6(2, "Yemek", "Yemek istiyorum.", "noun", "yellow", "a plate of food"),
    c6(3, "İstiyorum", "Dinozor istiyorum.", "verb", "green", "a hand reaching out"),
    c6(4, "Yardım", "Bana yardım eder misin?", "social", "pink", "two hands helping"),
    c6(5, "Hayır", "Hayır, istemiyorum.", "social", "pink", "a hand showing stop"),
    c6(6, "Tuvalet", "Tuvalete gitmek istiyorum.", "noun", "yellow", "a toilet"),
  ],
  instructions: "Panoyu masaya koyup çocuğun gözüne yakın tutun.", expertNotes: "Modelleme ile genişletin.", homeGuidance: "Yemek saatlerinde kullanın.", adaptations: "Kolay: dört hücre. Zor: iki sözcüklü cümle.",
};
type Taban = typeof taban;
const kopya = (): Taban => structuredClone(taban);
const kos = (o: unknown, b: CommBoardBody = B6) => commBoardChecks({ body: b, output: o, raw: o as Rec | null, text: "", alias: null });
const hucre = (m: Taban, i: number) => m.cells[i]!;

describe("commBoardChecks — taban ve mutantlar", () => {
  it("gerçekçi çıktı: her puan 1, sert hata yok", () => {
    const r = kos(taban);
    expect(r.hard).toEqual([]);
    for (const [k, v] of Object.entries(r.scores)) expect(v, k).toBe(1);
    expect(Object.keys(r.scores)).toEqual(expect.arrayContaining(["hucre_sayisi", "izgara", "pozisyon", "gorsel_dolu", "gorsel_ingilizce", "renk_tutarli", "cumle_modu", "tekrar_yok", "alanlar", "talimat"]));
  });

  const mutantlar: Array<[string, (m: Taban) => void, string]> = [
    ["bir hücre eksik", (m) => { m.cells.pop(); }, "hucre_sayisi"],
    ["bir hücre fazla", (m) => { m.cells.push(c6(7, "Ağrı", "Canım acıyor.", "noun", "yellow", "a sad face")); }, "hucre_sayisi"],
    ["satır × sütun sembol sayısını tutmuyor", (m) => { m.rows = 3; m.cols = 3; }, "izgara"],
    ["satır/sütun yok", (m) => { delete (m as Partial<Taban>).rows; }, "izgara"],
    ["konum numaraları sıfırdan", (m) => { m.cells.forEach((c, i) => { c.position = i; }); }, "pozisyon"],
    ["konum numarası tekrarlı", (m) => { hucre(m, 3).position = 3; }, "pozisyon"],
    ["görsel komutu boş", (m) => { hucre(m, 2).visualPrompt = " "; }, "gorsel_dolu"],
    ["Türkçe görsel tanımı boş", (m) => { hucre(m, 4).visualDescription = ""; }, "gorsel_dolu"],
    ["görsel komutu Türkçe", (m) => { hucre(m, 0).visualPrompt = "su dolu bir bardak"; }, "gorsel_ingilizce"],
    ["görsel komutu Türkçe harfli", (m) => { hucre(m, 1).visualPrompt = "bir tabak yemeği"; }, "gorsel_ingilizce"],
    ["görsel komutu yalnız Türkçe harfle ayrışıyor", (m) => { hucre(m, 3).visualPrompt = "kırmızı elma"; }, "gorsel_ingilizce"],
    ["renk kategoriyle uyuşmuyor", (m) => { hucre(m, 3).fitzgeraldColor = "blue"; }, "renk_tutarli"],
    ["renk büyük harfle (arayüz tam anahtar arar, beyaz görünür)", (m) => { hucre(m, 0).fitzgeraldColor = "Yellow"; }, "renk_tutarli"],
    ["kategori büyük harfle (arayüz etiketi bulamaz)", (m) => { hucre(m, 1).category = "Noun"; }, "renk_tutarli"],
    ["renk sonunda boşluk", (m) => { hucre(m, 2).fitzgeraldColor = "green "; }, "renk_tutarli"],
    ["renk Türkçe yazılmış", (m) => { hucre(m, 0).fitzgeraldColor = "sarı"; }, "renk_tutarli"],
    ["kategori geçersiz", (m) => { hucre(m, 1).category = "isim"; }, "renk_tutarli"],
    ["kategori yok", (m) => { delete (hucre(m, 2) as Partial<ReturnType<typeof c6>>).category; }, "renk_tutarli"],
    ["cümle boş", (m) => { hucre(m, 4).sentence = ""; }, "cumle_modu"],
    ["cümle kelimenin kendisi", (m) => { hucre(m, 1).sentence = "Yemek."; }, "cumle_modu"],
    ["aynı kelime iki hücrede (büyük/küçük harf, noktalama)", (m) => { hucre(m, 5).word = "su!"; }, "tekrar_yok"],
    ["kelime boş", (m) => { hucre(m, 5).word = ""; }, "tekrar_yok"],
    ["ev rehberi boş", (m) => { m.homeGuidance = ""; }, "alanlar"],
    ["başlık yok", (m) => { m.title = " "; }, "alanlar"],
  ];
  it.each(mutantlar)("mutant: %s → %s düşer, taban 1", (_ad, mut, anahtar) => {
    const m = kopya();
    mut(m);
    const r = kos(m);
    expect(r.scores[anahtar], anahtar).toBeLessThan(1);
    expect(r.scores.talimat).toBeLessThan(1);
    expect(r.hard).toEqual([]);
  });

  describe("gorsel_ingilizce: dil yalnız dolu komutlarda ölçülür (boşluk gorsel_dolu'da cezalanır)", () => {
    it("bir komut boş: dil puanı 1 (kalan komutlar İngilizce), dolu puanı düşer", () => {
      const m = kopya();
      hucre(m, 2).visualPrompt = "";
      const r = kos(m);
      expect(r.scores.gorsel_ingilizce).toBe(1);
      expect(r.scores.gorsel_dolu).toBeCloseTo(5 / 6);
    });
    it("boş komut yanında Türkçe komut: yalnız dolu olanlar sayılır", () => {
      const m = kopya();
      hucre(m, 2).visualPrompt = "";
      hucre(m, 3).visualPrompt = "kırmızı elma";
      expect(kos(m).scores.gorsel_ingilizce).toBeCloseTo(4 / 5);
    });
    it("hiç komut yoksa kanıtlanamaz: 0", () => {
      const m = kopya();
      m.cells.forEach((c) => { c.visualPrompt = ""; });
      expect(kos(m).scores.gorsel_ingilizce).toBe(0);
    });
  });

  describe("gorsel_ingilizce: sezgi (İngilizce içinde tek tük Türkçe sözcük/harf serbest)", () => {
    const puan = (komut: string) => {
      const m = kopya();
      hucre(m, 0).visualPrompt = komut;
      return kos(m).scores.gorsel_ingilizce!;
    };
    it.each(["a döner kebab", "a five", "a wave", "123 456", "a bu's cup"])("İngilizce (sınır): %s", (komut) => expect(puan(komut)).toBe(1));
    it.each(["çay", "kuş", "süt", "göz", "ağ", "kız", "ÇAY", "YAĞ", "ÜZÜM", "ŞEKER", "İNEK", "ÖRDEK", "ÇAY ÇORBASI"])("Türkçe: tek Türkçe harf yeter (tek/çift sözcük, büyük harf dahil): %s", (komut) => {
      expect(puan(komut)).toBeCloseTo(5 / 6);
    });
    it("'I am': büyük I Türkçeye özgü sayılmaz", () => {
      expect(puan("I am")).toBe(1);
    });
    it.each(["I am a ball", "I see a red ball", "a red ball", "a döner kebab wrap", "a cup of Turkish çay", "an über-cute puppy", "I've got a ball", "we've got a ball", "a glass of water on a plain white background"])(
      "İngilizce: %s",
      (komut) => expect(puan(komut)).toBe(1),
    );
    it.each(["kırmızı elma", "su bardağı", "döner kebab", "çay"])("Türkçe (sözcüklerin en az yarısında Türkçeye özgü harf): %s", (komut) => {
      expect(puan(komut)).toBeCloseTo(5 / 6);
    });
    it("işlev sözcüğü yalnız tam sözcük olarak aranır: 'a bull' ve 'about' (bu) kusur değil, kesmeli 've' de değil", () => {
      expect(puan("a bull")).toBe(1);
      expect(puan("a ball about the hill")).toBe(1);
      expect(puan("i've seen the ball")).toBe(1);
      expect(puan("a ball ve a cup")).toBeCloseTo(5 / 6);
    });
    it("BİLİNEN SINIR: dört sözcüğün yalnız birinde Türkçe harf olan Türkçe komut yakalanmaz", () => {
      expect(puan("iki el yardım ediyor")).toBe(1);
    });
  });

  it.each(["bir", "ve", "ile", "için", "gibi", "olan", "dolu", "ama", "veya", "bu"])("Türkçe işlev sözcüğü '%s' İngilizce komutta kusurdur (tek başına yakalanır)", (w) => {
    const m = kopya();
    hucre(m, 0).visualPrompt = `a cup ${w} water`;
    expect(kos(m).scores.gorsel_ingilizce).toBeCloseTo(5 / 6);
    hucre(m, 0).visualPrompt = `a cup of water`;
    expect(kos(m).scores.gorsel_ingilizce).toBe(1);
  });

  it("Fitzgerald anahtarı: altı kategorinin her biri kendi rengiyle geçer, başkasıyla geçmez", () => {
    const harita: Array<[string, string]> = [["noun", "yellow"], ["verb", "green"], ["adjective", "blue"], ["social", "pink"], ["question", "orange"], ["other", "white"]];
    for (const [kategori, renk] of harita) {
      const m = kopya();
      hucre(m, 0).category = kategori;
      hucre(m, 0).fitzgeraldColor = renk;
      expect(kos(m).scores.renk_tutarli, `${kategori}/${renk}`).toBe(1); // diğer 5 hücre tabandaki doğru eşleşmede
      for (const [, baska] of harita.filter(([, r]) => r !== renk)) {
        hucre(m, 0).fitzgeraldColor = baska;
        expect(kos(m).scores.renk_tutarli, `${kategori}/${baska}`).toBeCloseTo(5 / 6);
      }
    }
  });

  it("kelime tekrarı büyük/küçük harf, noktalama ve boşluktan bağımsız", () => {
    const m = kopya();
    hucre(m, 1).word = "  SU ";
    expect(kos(m).scores.tekrar_yok).toBeCloseTo(5 / 6);
    hucre(m, 5).word = "Su.";
    expect(kos(m).scores.tekrar_yok).toBeCloseTo(4 / 6);
  });
  it("BİLİNEN SINIR: aksansız ve işlev sözcüğü taşımayan Türkçe komut yakalanmaz (sezgisel)", () => {
    const m = kopya();
    hucre(m, 0).visualPrompt = "su bardagi";
    expect(kos(m).scores.gorsel_ingilizce).toBe(1);
  });
  it("görsel komutu İngilizce ama Türkçe karakter içermeyen: geçer; tek tırnaklı İngilizce de", () => {
    const m = kopya();
    hucre(m, 0).visualPrompt = "a single clear icon of a glass of water on a plain white background";
    expect(kos(m).scores.gorsel_ingilizce).toBe(1);
  });

  describe("cumle_modu: yalnız kelime modunda cümle alanı boş kalır (üründe cümle varsa panoda basılır)", () => {
    const WO: CommBoardBody = { ...B6, textMode: "word_only" };
    const bos = (): Taban => { const m = kopya(); m.cells.forEach((c) => { c.sentence = ""; }); return m; };
    it("tüm cümleler boş: 1", () => expect(kos(bos(), WO).scores.cumle_modu).toBe(1));
    it("cümle alanı olmayan hücre de boş sayılır", () => {
      const m = bos();
      m.cells.forEach((c) => { delete (c as Partial<ReturnType<typeof c6>>).sentence; });
      expect(kos(m, WO).scores.cumle_modu).toBe(1);
    });
    it("bazı hücrelerde cümle varsa oran düşer", () => {
      const m = bos();
      hucre(m, 0).sentence = "Su istiyorum.";
      hucre(m, 1).sentence = "Yemek istiyorum.";
      expect(kos(m, WO).scores.cumle_modu).toBeCloseTo(4 / 6);
    });
    it("kelime + cümle modunda boş cümle düşürür (karşıt yön)", () => expect(kos(bos(), B6).scores.cumle_modu).toBe(0));
  });

  describe("renk kodu kapalıyken", () => {
    it("renk puanı 1 (arayüz renkleri yok sayar); diğer puanlar etkilenmez", () => {
      const m = kopya();
      m.cells.forEach((c) => { c.fitzgeraldColor = "red"; });
      const r = kos(m, { ...B6, colorCoding: false });
      expect(r.scores.renk_tutarli).toBe(1);
      expect(r.scores.gorsel_dolu).toBe(1);
    });
  });

  describe("dayanıklılık", () => {
    it("null / metin / sayı hücreler çökmez", () => {
      const bozuk = { ...kopya(), cells: [null, "x", 3, { word: null, sentence: 5, category: [], fitzgeraldColor: {}, visualPrompt: null }, ...kopya().cells.slice(0, 2)] };
      expect(() => kos(bozuk)).not.toThrow();
      const r = kos(bozuk);
      expect(r.hard).toEqual([]);
      expect(r.scores.hucre_sayisi).toBe(1); // 6 öğe (öğe sayısı korunur)
      expect(r.scores.talimat).toBeLessThan(0.7);
    });
    it("cells dizi değil ya da boş: sert hata; çıktı yok: talimat 0, çökmez", () => {
      expect(kos({ ...kopya(), cells: "x" }).hard).toContain("hucre_yok");
      expect(kos({ ...kopya(), cells: [] }).hard).toContain("hucre_yok");
      const yok = commBoardChecks({ body: B6, output: null, raw: null, text: "", alias: null });
      expect(yok.hard).toEqual([]);
      expect(yok.scores.talimat).toBe(0);
    });
    it("dizi / metin çıktı nesne sayılmaz", () => {
      expect(commBoardChecks({ body: B6, output: [1], raw: null, text: "", alias: null }).scores.talimat).toBe(0);
      expect(commBoardChecks({ body: B6, output: "x", raw: null, text: "", alias: null }).scores.talimat).toBe(0);
    });
    it("Object.prototype anahtarları kategori olarak geçerli sayılmaz", () => {
      const m = kopya();
      hucre(m, 0).category = "constructor";
      hucre(m, 0).fitzgeraldColor = "yellow";
      hucre(m, 1).category = "__proto__";
      expect(kos(m).scores.renk_tutarli).toBeCloseTo(4 / 6);
    });
  });
});
