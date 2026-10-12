// apps/hub/evals/tools/studio/articulation/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import {
  articulationChecks,
  bankaKelimeleri,
  containsWord,
  heceTuruDogru,
  keepsFinalPosition,
  letterOf,
  stems,
  syllabify,
  type ArticulationBody,
} from "./checks";

type L = ArticulationBody["level"];
const body = (level: L, extra: Partial<ArticulationBody> = {}): ArticulationBody => ({
  targetSounds: ["/r/"], positions: ["final"], level, itemCount: 3, ...extra,
});
const base = { title: "T", expertNotes: "Dil ucu", cueTypes: ["görsel"], homeGuidance: "Evde" };
type Rec = Record<string, unknown>;
const run = (b: ArticulationBody, out: Rec | null, opts: { raw?: Rec | null; ogrencili?: boolean } = {}) =>
  articulationChecks({ body: b, output: out, raw: opts.raw === undefined ? out : opts.raw, text: "", ogrencili: opts.ogrencili });
const ogeler = (words: string[], extra: (w: string, k: number) => Rec = () => ({})) => words.map((w, k) => ({ word: w, ...extra(w, k) }));

describe("artikülasyon yardımcıları (eski düzenekten)", () => {
  it("letterOf, stems, containsWord, keepsFinalPosition, syllabify", () => {
    expect(letterOf("/Ş/")).toBe("ş");
    expect(stems("kitap")).toContain("kitab");
    expect(containsWord("Kitabı aldı", "kitap")).toBe(true);
    expect(keepsFinalPosition("Bu bir kar.", "kar")).toBe(true);
    expect(keepsFinalPosition("Karı gördü.", "kar")).toBe(false);
    expect(syllabify("kapı")).toEqual(["ka", "pı"]);
  });
});

describe("bankaKelimeleri (route pickBankWords aynası)", () => {
  it("banka düzeylerinde tohumlu seçim deterministik; izole/hece ve bankasız seste boş", () => {
    const b = body("sentence", { itemCount: 5 });
    expect(bankaKelimeleri(b)).toHaveLength(5);
    expect(bankaKelimeleri(b)).toEqual(bankaKelimeleri({ ...b, level: "word" })); // tohum düzeyden bağımsız
    expect(bankaKelimeleri(b).every((w) => w.includes("r"))).toBe(true);
    expect(bankaKelimeleri(body("isolated"))).toEqual([]);
    expect(bankaKelimeleri(body("syllable"))).toEqual([]);
    expect(bankaKelimeleri(body("sentence", { targetSounds: ["/r/", "/x/"] }))).toEqual([]); // bir ses bile bankada yoksa
  });
});

describe("articulationChecks", () => {
  it("cümle düzeyi: kelime cümlede (ekli de olur), hedef harf kelimede, sonda ek yok", () => {
    const out = { ...base, items: [
      { word: "kar", sentence: "Dışarıda kar var.", position: "final", targetSound: "/r/" },
      { word: "bir", sentence: "Bir elma aldım.", position: "final", targetSound: "/r/" },
      { word: "sar", sentence: "Sarı çiçek.", position: "final", targetSound: "/r/" },
    ] };
    const r = run(body("sentence"), out);
    // "Sarı" ekli hâliyle kelimeyi içerir (containsWord gövde eşler) ama sonda eksiz DEĞİL: iki kontrol bunu ayırır.
    expect(r.details.cumle_kelime).toBe(1);
    expect(r.details.hedef_harf).toBe(1);
    expect(r.details.sonda_eksiz).toBeCloseTo(2 / 3);
    expect(r.hard).toEqual([]);
  });
  it("cümle düzeyi: kelimeyi içermeyen cümle cumle_kelime'yi düşürür; iki pozisyonda sonda_eksiz ölçülmez", () => {
    const out = { ...base, items: [
      { word: "kar", sentence: "Dışarıda kar var." },
      { word: "duvar", sentence: "Bahçede top oynadık." },
    ] };
    const r = run(body("sentence", { positions: ["medial", "final"], itemCount: 2 }), out);
    expect(r.details.cumle_kelime).toBe(0.5);
    expect(r.scores).not.toHaveProperty("sonda_eksiz");
  });
  it("bağlam düzeyi: paragraf 3–5 cümle (2 ve 6 cümle düşer)", () => {
    const p = (n: number) => Array.from({ length: n }, (_, k) => `Kar yağdı ${k}.`).join(" ");
    const out = { ...base, items: ogeler(["kar", "kar", "kar", "kar"], (_, k) => ({ sentence: p([3, 5, 2, 6][k]!) })) };
    const r = run(body("contextual", { itemCount: 4 }), out);
    expect(r.details.paragraf).toBe(0.5);
    const tek = run(body("contextual", { itemCount: 1 }), { ...base, items: [{ word: "kar", sentence: "Kar yağdı." }] });
    expect(tek.details.paragraf).toBe(0);
  });

  describe("hece düzeyi", () => {
    it("hece türü DOĞRULUĞU: açık = ünlüyle, kapalı = ünsüzle biter; etiket yoksa ya da 'yarım'sa 0", () => {
      expect(heceTuruDogru("ra", "açık", ["r"])).toBe(true);
      expect(heceTuruDogru("ra", "kapalı", ["r"])).toBe(false);
      expect(heceTuruDogru("ar", "Kapalı hece", ["r"])).toBe(true);
      expect(heceTuruDogru("ar", "AÇIK", ["r"])).toBe(false);
      expect(heceTuruDogru("ar", "yarım", ["r"])).toBe(false);
      expect(heceTuruDogru("ka - ka", "tekrar", ["k"])).toBe(false);
      // Tek etiket, çok parça: hedef harfi taşıyan parça yargılanır ("a-şa" → "şa" açık), yoksa ilk parça.
      expect(heceTuruDogru("a-şa", "açık", ["ş"])).toBe(true);
      expect(heceTuruDogru("ra-ra", "açık-tekrar", ["r"])).toBe(true);
      expect(heceTuruDogru("ol-ma", "kapalı", ["z"])).toBe(true);
      expect(heceTuruDogru("a-şık", "kapalı", ["ş"])).toBe(true); // ilk parça ("a") açık; yargılanan hedef harfli "şık"
    });
    it("bileşik etiket: parçalar etiket sırasıyla eşleşmeli; tek parça yazılmışsa hecelenir", () => {
      expect(heceTuruDogru("a-şık", "açık–kapalı", ["ş"])).toBe(true);
      expect(heceTuruDogru("aş-ka", "açık–kapalı", ["ş"])).toBe(false);
      expect(heceTuruDogru("aş-ka", "kapalı–açık", ["ş"])).toBe(true);
      expect(heceTuruDogru("a-şa", "açık–açık", ["ş"])).toBe(true);
      expect(heceTuruDogru("şapka", "kapalı–açık", ["ş"])).toBe(true); // syllabify: şap-ka
      expect(heceTuruDogru("a-ş-ka", "açık–kapalı", ["ş"])).toBe(false); // parça sayısı etiket sayısıyla uyuşmuyor
    });
    it("hece türü ve örnek kelime puanları; tireli/boşluklu/kesmeli hece bulunur; boş hece bulunmaz", () => {
      const out = { ...base, items: [
        { word: "a-şa", syllableType: "açık–açık", exampleWord: "aşağı", targetSound: "/ş/" },
        { word: "kaş", syllableType: "Kapalı hece", exampleWord: "ka–şık", targetSound: "/ş/" },
        { word: "ğı", syllableType: "AÇIK", exampleWord: "dağ’ı", targetSound: "/ğ/" },
        { word: "ar", syllableType: "yarım", exampleWord: "kedi", targetSound: "/r/" },
        { word: "-", syllableType: "açık", exampleWord: "kedi", targetSound: "/r/" },
      ] };
      const r = run(body("syllable", { targetSounds: ["/ş/", "/ğ/", "/r/"], itemCount: 5 }), out);
      expect(r.details.hece_turu).toBe(0.6);
      expect(r.details.ornek_kelime).toBe(0.6); // "-" yalın biçimde boş → bulunmuş sayılmaz
    });
    it("öğe sayısı oran (ham öğeler) ve talimat = puanların ortalaması", () => {
      const out = { ...base, items: [
        { word: "ra", syllableType: "açık", exampleWord: "radyo" },
        { word: "ar", syllableType: "açık", exampleWord: "kedi" },
      ] };
      const r = run(body("syllable", { itemCount: 4 }), out);
      expect(r.details.oge_sayisi).toBe(0.5);
      expect(r.details.hece_turu).toBe(0.5);
      expect(r.details.ornek_kelime).toBe(0.5);
      expect(r.scores.talimat).toBeCloseTo((0.5 + 1 + 1 + 0.5 + 0.5) / 5); // oge_sayisi, hedef_harf, alanlar, hece_turu, ornek_kelime
      expect(run(body("syllable", { itemCount: 2 }), out).details.oge_sayisi).toBe(1);
    });
  });

  describe("ham öğeler (route'un son işlemesinden önce)", () => {
    it("hedef_harf ve öğe sayısı ham öğelerden; ham JSON yoksa 0", () => {
      const out = { ...base, items: [{ word: "rrr" }, { word: "r-r" }] };
      const raw = { ...base, items: [{ word: "rrr" }, { word: "r-r" }, { word: "lll" }, { word: "sss" }] }; // route hedef harfsizleri eledi
      const r = run(body("isolated", { itemCount: 4 }), out, { raw });
      expect(r.details.hedef_harf).toBe(0.5);
      expect(r.details.oge_sayisi).toBe(1);
      const bozuk = run(body("isolated", { itemCount: 2 }), out, { raw: null });
      expect(bozuk.details.hedef_harf).toBe(0);
      expect(bozuk.details.oge_sayisi).toBe(0);
    });
    it("kelime düzeyi (banka): model öğeleri boş bıraktıysa items_bos 1 ve hedef_harf 1; öğe ürettiyse items_bos 0", () => {
      const b = body("word");
      const dolu = { ...base, items: ogeler(bankaKelimeleri(b)) }; // öğrencisiz: sistem bankadan doldurdu
      const r = run(b, dolu, { raw: { ...base, items: [] } });
      expect(r.details.items_bos).toBe(1);
      expect(r.details.hedef_harf).toBe(1);
      expect(r.scores).not.toHaveProperty("oge_sayisi");
      expect(r.hard).toEqual([]);
      const itaatsiz = run(b, dolu, { raw: { ...base, items: [{ word: "kar" }] } });
      expect(itaatsiz.details.items_bos).toBe(0);
      expect(run(b, dolu, { raw: null }).details.items_bos).toBe(0);
    });
    it("banka_uyumu (cümle/bağlam): ham kelimeler bankayla sırasıyla; uzunluk farkı > 1 ise 0", () => {
      const b = body("sentence", { itemCount: 4 });
      const bank = bankaKelimeleri(b);
      const out = { ...base, items: ogeler(bank, (w) => ({ sentence: `Bu ${w}.` })) };
      expect(run(b, out).details.banka_uyumu).toBe(1);
      const kayik = { ...base, items: ogeler([bank[0]!.toLocaleUpperCase("tr-TR"), "xyz", bank[2]!, bank[3]!]) };
      expect(run(b, out, { raw: kayik }).details.banka_uyumu).toBe(0.75);
      const yerDegisti = { ...base, items: ogeler([bank[1]!, bank[0]!, bank[2]!, bank[3]!]) }; // aynı kelimeler, sıra bozuk
      expect(run(b, out, { raw: yerDegisti }).details.banka_uyumu).toBe(0.5);
      expect(run(b, out, { raw: { ...base, items: ogeler(bank.slice(0, 2)) } }).details.banka_uyumu).toBe(0);
      expect(run(b, out, { raw: { ...base, items: [] } }).details.oge_sayisi).toBe(0);
      expect(run(body("isolated"), { ...base, items: [{ word: "rrr" }] }).scores).not.toHaveProperty("banka_uyumu");
    });
  });

  describe("banka kaybı (öğrencili kelime düzeyi)", () => {
    it("öğrencili boş items sert hata DEĞİL ve hedef_harf 1; öğrencisiz boş items sert hata", () => {
      const out = { ...base, items: [] };
      const ogrencili = run(body("word"), out, { ogrencili: true });
      expect(ogrencili.hard).toEqual([]);
      expect(ogrencili.details.hedef_harf).toBe(1);
      expect(ogrencili.details.banka_kaybi).toBe(1);
      const ogrencisiz = run(body("word"), out, { ogrencili: false });
      expect(ogrencisiz.hard).toContain("oge_yok");
    });
    it("bayat bayrak: öğrencili çıktı bankayla doluysa ürün düzeltmesi gelmiştir → banka_kaybi_tutarsiz", () => {
      const b = body("word");
      const doldu = run(b, { ...base, items: ogeler(bankaKelimeleri(b)) }, { raw: { ...base, items: [] }, ogrencili: true });
      expect(doldu.hard).toContain("banka_kaybi_tutarsiz");
      // Modelin kendi öğeleri (talimata uymadı) bayrak değil, items_bos ile cezalanır.
      const kendi = { ...base, items: [{ word: "kar" }] };
      const itaatsiz = run(b, kendi, { ogrencili: true });
      expect(itaatsiz.hard).toEqual([]);
      expect(itaatsiz.details.items_bos).toBe(0);
    });
  });

  it("alanlar: başlık/not/ev rehberi boşsa ya da ipucu listesinde dolu metin yoksa düşer", () => {
    const one = { items: [{ word: "r" }] };
    expect(run(body("isolated", { itemCount: 1 }), { ...one, title: "", expertNotes: "", cueTypes: [], homeGuidance: "" }).details.alanlar).toBe(0);
    expect(run(body("isolated", { itemCount: 1 }), { ...one, ...base, cueTypes: ["", "  "] }).details.alanlar).toBe(0.75);
    expect(run(body("isolated", { itemCount: 1 }), { ...one, ...base }).details.alanlar).toBe(1);
  });
});
