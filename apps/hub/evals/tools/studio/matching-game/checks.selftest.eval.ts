// apps/hub/evals/tools/studio/matching-game/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { matchingGameChecks, type MatchingGameBody } from "./checks";

type Rec = Record<string, unknown>;
type Tur = MatchingGameBody["matchType"];

const body: MatchingGameBody = { matchType: "synonym", pairCount: "6", difficulty: "easy" };
const pair = (id: number, a: string, b: string, v = "") => ({ id, cardA: a, cardB: b, hint: "h", visualPrompt: v });
const ok = {
  title: "T", matchType: "synonym", difficulty: "easy",
  pairs: [pair(1, "büyük", "iri"), pair(2, "küçük", "ufak"), pair(3, "hızlı", "çabuk"), pair(4, "güzel", "hoş"), pair(5, "mutlu", "neşeli"), pair(6, "soğuk", "serin")],
  instructions: "i", expertNotes: "e", adaptations: "a",
};

describe("matchingGameChecks", () => {
  it("çift sayısı, dolu kartlar, tekrarsızlık, görsel tutarlılığı (hiçbirinde), id sırası, kart biçimi, tür yankısı", () => {
    const r = matchingGameChecks({ body, output: ok, raw: ok, text: "", alias: null });
    expect(r.scores).toMatchObject({ cift_sayisi: 1, cift_dolu: 1, tekrar_yok: 1, gorsel_tutarli: 1, farkli: 1, id_sirali: 1, kart_bicimi: 1, tur_yankisi: 1, alanlar: 1, talimat: 1 });
    expect(r.hard).toEqual([]);
  });
  it("yarısında görsel → tutarsız; cardA = cardB → farklı 0,5; sayı tutmaz", () => {
    const out = { ...ok, pairs: [pair(1, "a", "a", "x"), pair(2, "b", "c")] };
    const r = matchingGameChecks({ body, output: out, raw: out, text: "", alias: null });
    expect(r.scores.gorsel_tutarli).toBe(0);
    expect(r.scores.farkli).toBe(0.5);
    expect(r.scores.cift_sayisi).toBe(0);
  });
  it("çift yoksa sert hata", () => {
    expect(matchingGameChecks({ body, output: { ...ok, pairs: [] }, raw: ok, text: "", alias: null }).hard).toContain("cift_yok");
  });
  it("çift yokken (boş liste) görsel tutarlılığı kanıtlanamaz: 0 (tüm türlerde)", () => {
    for (const tur of Object.keys(TABAN) as Tur[]) expect(kos({ ...ok, pairs: [] }, B(tur)).scores.gorsel_tutarli, tur).toBe(0);
  });
  it("çıktı yok: sert hata değil (fabrika cikti_yok yazar), talimat 0", () => {
    const r = matchingGameChecks({ body, output: null, raw: null, text: "", alias: null });
    expect(r.hard).toEqual([]);
    expect(r.scores.talimat).toBe(0);
  });
});

/* ── Ayırt ediciliği ölçen gerçekçi taban: her tür için her puan 1, her mutant ilgili puanı düşürür ── */

type P = ReturnType<typeof pair>;
const TABAN: Record<Tur, P[]> = {
  synonym: ok.pairs,
  antonym: [pair(1, "sıcak", "soğuk"), pair(2, "yüksek", "alçak"), pair(3, "uzun", "kısa"), pair(4, "hafif", "ağır"), pair(5, "açık", "kapalı"), pair(6, "ıslak", "kuru")],
  definition: [
    pair(1, "kütüphane", "Kitapların ödünç alındığı ve okunduğu yer."),
    pair(2, "pilot", "Uçağı kullanan kişi."),
    pair(3, "mevsim", "Bir yılın hava durumuna göre ayrılan dört bölümünden her biri."),
    pair(4, "komşu", "Yan yana oturan kişilerden her biri."),
    pair(5, "bulut", "Gökyüzünde toplanan su buharı kümesi."),
    pair(6, "harita", "Yeryüzünün küçültülerek çizilmiş resmi."),
  ],
  image_desc: [
    pair(1, "elma", "Kırmızı ya da yeşil, yuvarlak bir meyve.", "a red apple"),
    pair(2, "kedi", "Dört ayaklı, bıyıklı, miyavlayan hayvan.", "a sitting cat"),
    pair(3, "bardak", "İçine su konulan cam kap.", "a glass of water"),
    pair(4, "şemsiye", "Yağmurdan korunmak için açılan araç.", "an open umbrella"),
    pair(5, "top", "Yuvarlak, zıplayan oyuncak.", "a red ball"),
    pair(6, "kitap", "Sayfalarında yazı ve resim bulunan nesne.", "a closed book"),
  ],
  category: [pair(1, "elma", "meyve"), pair(2, "armut", "meyve"), pair(3, "kedi", "hayvan"), pair(4, "köpek", "hayvan"), pair(5, "araba", "taşıt"), pair(6, "tren", "taşıt")],
  sentence: [
    pair(1, "Hava çok ___ olduğu için kalın giyindik.", "soğuk"),
    pair(2, "Ali topu çok ___ attı.", "uzağa"),
    pair(3, "Ayşe ___ bir elbise giydi.", "mavi"),
    pair(4, "Kedi sütü ___ içti.", "hemen"),
    pair(5, "Yağmur yağdığı için ___ aldık.", "şemsiye"),
    pair(6, "Öğretmen bize güzel bir ___ okudu.", "masal"),
  ],
};
const tabanCikti = (tur: Tur): Rec => ({
  title: "T", matchType: tur, difficulty: "easy", pairs: structuredClone(TABAN[tur]), instructions: "Kartları eşleştirin.", expertNotes: "Önce kolay çiftlerden başlayın.", adaptations: "Kolay: dört çift. Zor: süre ekleyin.",
});
const B = (tur: Tur, extra: Partial<MatchingGameBody> = {}): MatchingGameBody => ({ matchType: tur, pairCount: "6", difficulty: "easy", ...extra });
const kos = (o: unknown, b: MatchingGameBody = body) => matchingGameChecks({ body: b, output: o, raw: o as Rec | null, text: "", alias: null });
const cift = (m: Rec) => m.pairs as Array<Record<string, unknown>>;

describe("matchingGameChecks — taban", () => {
  it.each(Object.keys(TABAN) as Tur[])("gerçekçi %s çıktısı: her puan 1, sert hata yok", (tur) => {
    const r = kos(tabanCikti(tur), B(tur));
    expect(r.hard).toEqual([]);
    for (const [k, v] of Object.entries(r.scores)) expect(v, `${tur}/${k}`).toBe(1);
  });
  it("puan anahtarları türe göre: gorsel_ingilizce yalnız görselin beklendiği türlerde (resim açıklaması, kategori, tanım) VE komut varsa", () => {
    const anahtarlar = (t: Tur, gorselli = false) => {
      const m = tabanCikti(t);
      if (gorselli) cift(m).forEach((p) => { p.visualPrompt = "a plain object"; });
      return Object.keys(kos(m, B(t)).scores).sort();
    };
    const ortak = ["cift_sayisi", "cift_dolu", "tekrar_yok", "gorsel_tutarli", "farkli", "id_sirali", "kart_bicimi", "tur_yankisi", "alanlar", "talimat"];
    for (const t of ["synonym", "antonym", "sentence", "definition", "category"] as Tur[]) expect(anahtarlar(t), t).toEqual([...ortak].sort()); // taban: görselsiz
    expect(anahtarlar("image_desc")).toEqual([...ortak, "gorsel_ingilizce"].sort()); // resim açıklaması tabanı görselli
    for (const t of ["definition", "category"] as Tur[]) expect(anahtarlar(t, true), t).toEqual([...ortak, "gorsel_ingilizce"].sort());
    // Soyut türde görsel verilirse zaten gorsel_tutarli düşer; dil puanı yazılmaz.
    for (const t of ["synonym", "antonym", "sentence"] as Tur[]) expect(anahtarlar(t, true), t).toEqual([...ortak].sort());
  });
  it("ipucu opsiyoneldir (prompt: 'Opsiyonel ipucu'): hiç ipucu yazmamak ya da hepsini yazmak puanı değiştirmez; sayı yalnız ayrıntıda", () => {
    const m = tabanCikti("synonym");
    cift(m).forEach((p) => { p.hint = ""; });
    const bos = kos(m);
    expect(bos.scores.talimat).toBe(1);
    expect(bos.details.ipuclu).toBe(0);
    cift(m).forEach((p) => { p.hint = "Aynı anlama gelir."; });
    const dolu = kos(m);
    expect(dolu.scores.talimat).toBe(1);
    expect(dolu.details.ipuclu).toBe(6);
    delete (cift(m)[0] as Partial<P>).hint;
    expect(kos(m).details.ipuclu).toBe(5);
  });
});

describe("matchingGameChecks — mutantlar", () => {
  const mutantlar: Array<[string, Tur, (m: Rec) => void, string]> = [
    ["bir çift eksik", "synonym", (m) => { cift(m).pop(); }, "cift_sayisi"],
    ["bir çift fazla", "synonym", (m) => { cift(m).push(pair(7, "kolay", "basit")); }, "cift_sayisi"],
    ["cardA boş", "synonym", (m) => { cift(m)[2]!.cardA = " "; }, "cift_dolu"],
    ["cardB yok", "antonym", (m) => { delete cift(m)[1]!.cardB; }, "cift_dolu"],
    ["aynı cardA iki çiftte (büyük/küçük harf, noktalama)", "synonym", (m) => { cift(m)[5]!.cardA = " Büyük."; }, "tekrar_yok"],
    ["cardB bir başka çiftin cardA'sı (zincir)", "synonym", (m) => { cift(m)[1]!.cardB = "büyük"; }, "tekrar_yok"],
    ["aynı cevap iki çiftte (eş anlamlı)", "synonym", (m) => { cift(m)[3]!.cardB = "serin"; }, "tekrar_yok"],
    ["ters çift tekrar (zıt anlamlı)", "antonym", (m) => { cift(m)[5] = pair(6, "soğuk", "sıcak"); }, "tekrar_yok"],
    ["cardA = cardB", "synonym", (m) => { cift(m)[0]!.cardB = "Büyük"; }, "farkli"],
    ["yalnız bir çiftte görsel (eş anlamlı)", "synonym", (m) => { cift(m)[0]!.visualPrompt = "a big stone"; }, "gorsel_tutarli"],
    ["soyut türde (eş anlamlı) TÜM çiftlerde görsel", "synonym", (m) => { cift(m).forEach((p) => { p.visualPrompt = "a thing"; }); }, "gorsel_tutarli"],
    ["resim açıklamasında bir çiftte görsel yok", "image_desc", (m) => { cift(m)[3]!.visualPrompt = ""; }, "gorsel_tutarli"],
    ["resim açıklamasında hiç görsel yok", "image_desc", (m) => { cift(m).forEach((p) => { p.visualPrompt = ""; }); }, "gorsel_tutarli"],
    ["kategoride yarı yarıya görsel", "category", (m) => { cift(m).slice(0, 3).forEach((p) => { p.visualPrompt = "a fruit"; }); }, "gorsel_tutarli"],
    ["görsel komutu Türkçe (resim açıklaması)", "image_desc", (m) => { cift(m)[0]!.visualPrompt = "kırmızı elma"; }, "gorsel_ingilizce"],
    ["görsel komutu Türkçe işlev sözcüklü (kategori)", "category", (m) => { cift(m).forEach((p, i) => { p.visualPrompt = i === 0 ? "bir meyve" : "a fruit"; }); }, "gorsel_ingilizce"],
    ["id'ler sıfırdan", "synonym", (m) => { cift(m).forEach((p, i) => { p.id = i; }); }, "id_sirali"],
    ["id tekrarlı", "synonym", (m) => { cift(m)[4]!.id = 1; }, "id_sirali"],
    ["id yok", "synonym", (m) => { delete cift(m)[0]!.id; }, "id_sirali"],
    ["id metin", "antonym", (m) => { cift(m)[2]!.id = "3"; }, "id_sirali"],
    ["eş anlamlıda cümle kartı", "synonym", (m) => { cift(m)[0]!.cardB = "Çok büyük anlamına gelir."; }, "kart_bicimi"],
    ["eş anlamlıda dört sözcüklü kart", "synonym", (m) => { cift(m)[1]!.cardA = "çok çok küçük şey"; }, "kart_bicimi"],
    ["zıt anlamlıda noktalı kart", "antonym", (m) => { cift(m)[2]!.cardB = "kısa."; }, "kart_bicimi"],
    ["tanım iki cümle", "definition", (m) => { cift(m)[0]!.cardB = "Kitapların bulunduğu yer. Orada sessiz olunur."; }, "kart_bicimi"],
    ["tanım kartının cardA'sı cümle", "definition", (m) => { cift(m)[1]!.cardA = "Uçağı kullanan kişi pilottur."; }, "kart_bicimi"],
    ["resim açıklaması üç cümle", "image_desc", (m) => { cift(m)[0]!.cardB = "Kırmızı bir meyve. Çok tatlıdır. Ağaçta yetişir."; }, "kart_bicimi"],
    ["kategori kartı cümle", "category", (m) => { cift(m)[0]!.cardB = "Bu bir meyvedir."; }, "kart_bicimi"],
    ["cümle tamamlamada boşluk yok", "sentence", (m) => { cift(m)[0]!.cardA = "Hava çok soğuk olduğu için kalın giyindik."; }, "kart_bicimi"],
    ["cümle tamamlamada cevap cümle", "sentence", (m) => { cift(m)[1]!.cardB = "Ali topu çok uzağa attı."; }, "kart_bicimi"],
    ["çıktıdaki matchType başka", "synonym", (m) => { m.matchType = "antonym"; }, "tur_yankisi"],
    ["çıktıdaki matchType yok", "category", (m) => { delete m.matchType; }, "tur_yankisi"],
    ["çıktıdaki difficulty başka", "antonym", (m) => { m.difficulty = "hard"; }, "tur_yankisi"],
    ["çıktıdaki difficulty Türkçe", "definition", (m) => { m.difficulty = "kolay"; }, "tur_yankisi"],
    ["yönerge boş", "synonym", (m) => { m.instructions = ""; }, "alanlar"],
    ["uzman notu yok", "antonym", (m) => { delete m.expertNotes; }, "alanlar"],
    ["uyarlamalar boş", "definition", (m) => { m.adaptations = "  "; }, "alanlar"],
    ["başlık yok", "sentence", (m) => { m.title = ""; }, "alanlar"],
  ];
  it.each(mutantlar)("mutant: %s (%s) → %s düşer", (_ad, tur, mut, anahtar) => {
    const m = tabanCikti(tur);
    mut(m);
    const r = kos(m, B(tur));
    expect(r.scores[anahtar], anahtar).toBeLessThan(1);
    expect(r.scores.talimat).toBeLessThan(1);
    expect(r.hard).toEqual([]);
  });
  it("her mutant yalnız kendi puanını (ve talimatı) düşürür: başka puanlar sızmaz", () => {
    // Tek bir çift kartı bozulunca yalnız ilgili puan değişir (kart biçimi bozulması tekrar/farklı/boş puanlarına karışmaz).
    const m = tabanCikti("synonym");
    cift(m)[0]!.cardB = "Çok büyük anlamına gelir.";
    const r = kos(m);
    for (const k of ["cift_sayisi", "cift_dolu", "tekrar_yok", "gorsel_tutarli", "farkli", "id_sirali", "tur_yankisi", "alanlar"]) expect(r.scores[k], k).toBe(1);
  });
});

describe("matchingGameChecks — gorsel_tutarli türe göre (prompt: eş/zıt anlamlı ve cümlede HİÇBİRİNDE, resim açıklamasında HER çiftte, kategori ve tanımda ya hepsi ya hiçbiri)", () => {
  const puan = (tur: Tur, gorselli: number) => {
    const m = tabanCikti(tur);
    cift(m).forEach((p, i) => { p.visualPrompt = i < gorselli ? "a plain object" : ""; });
    return kos(m, B(tur)).scores.gorsel_tutarli;
  };
  it.each(["synonym", "antonym", "sentence"] as Tur[])("%s: 0 görsel → 1; 1, 3 ya da 6 görsel → 0", (tur) => {
    expect(puan(tur, 0)).toBe(1);
    for (const n of [1, 3, 6]) expect(puan(tur, n), `${tur}/${n}`).toBe(0);
  });
  it("resim açıklaması: yalnız 6/6 görsel → 1", () => {
    expect(puan("image_desc", 6)).toBe(1);
    for (const n of [0, 1, 5]) expect(puan("image_desc", n), `${n}`).toBe(0);
  });
  it.each(["category", "definition"] as Tur[])("%s (somut cardA'da görselli olabilir): 0/6 ya da 6/6 → 1; araları 0", (tur) => {
    expect(puan(tur, 0)).toBe(1);
    expect(puan(tur, 6)).toBe(1);
    for (const n of [1, 3, 5]) expect(puan(tur, n), `${tur}/${n}`).toBe(0);
  });
  it("yalnız boşluktan oluşan visualPrompt boş sayılır", () => {
    const m = tabanCikti("synonym");
    cift(m).forEach((p) => { p.visualPrompt = "   "; });
    expect(kos(m).scores.gorsel_tutarli).toBe(1);
  });
});

describe("matchingGameChecks — gorsel_ingilizce: yalnız dolu komutlar ölçülür; komut yoksa puan YAZILMAZ", () => {
  it("resim açıklamasında komut yoksa anahtar yok (eksiklik gorsel_tutarli'da cezalanır; uydurma 1/0 yok)", () => {
    const m = tabanCikti("image_desc");
    cift(m).forEach((p) => { p.visualPrompt = ""; });
    const r = kos(m, B("image_desc"));
    expect(r.scores).not.toHaveProperty("gorsel_ingilizce");
    expect(r.scores.gorsel_tutarli).toBe(0);
    cift(m).forEach((p) => { p.visualPrompt = "   "; });
    expect(kos(m, B("image_desc")).scores).not.toHaveProperty("gorsel_ingilizce");
  });
  it("kategori ve tanımda görselsiz oyun meşru: dil puanı yok, görsel tutarlı (1)", () => {
    for (const t of ["category", "definition"] as Tur[]) {
      const r = kos(tabanCikti(t), B(t));
      expect(r.scores, t).not.toHaveProperty("gorsel_ingilizce");
      expect(r.scores.gorsel_tutarli, t).toBe(1);
    }
  });
  it("kısmi Türkçe: oran", () => {
    const m = tabanCikti("image_desc");
    cift(m)[0]!.visualPrompt = "su bardağı";
    cift(m)[1]!.visualPrompt = "bir kedi";
    expect(kos(m, B("image_desc")).scores.gorsel_ingilizce).toBeCloseTo(4 / 6);
  });
  it("İngilizce komutta tek tük Türkçe sözcük serbest (comm-board sezgisiyle aynı)", () => {
    const m = tabanCikti("image_desc");
    cift(m)[0]!.visualPrompt = "a döner kebab";
    expect(kos(m, B("image_desc")).scores.gorsel_ingilizce).toBe(1);
  });
});

describe("matchingGameChecks — kart_bicimi (prompt: eş/zıt anlamlı 'kelime çiftleri', tanım 1 cümle, resim açıklaması 'kısa' (≤ 2 cümle), kategori 'kelime + kategori', cümle 'boşluklu cümle + doğru kelime')", () => {
  const puan = (tur: Tur, a: string, b: string, zor = false) => {
    const m = tabanCikti(tur);
    cift(m)[0]!.cardA = a;
    cift(m)[0]!.cardB = b;
    return kos(m, B(tur, { difficulty: zor ? "hard" : "easy" })).scores.kart_bicimi!;
  };
  const gecer = (tur: Tur, a: string, b: string, zor = false) => expect(puan(tur, a, b, zor), `${tur}${zor ? "/zor" : ""}: ${a} | ${b}`).toBe(1);
  const kalir = (tur: Tur, a: string, b: string, zor = false) => expect(puan(tur, a, b, zor), `${tur}${zor ? "/zor" : ""}: ${a} | ${b}`).toBeCloseTo(5 / 6);

  it("eş/zıt anlamlı ve kategori: en çok üç sözcük, noktalama yok", () => {
    gecer("synonym", "büyük", "iri");
    gecer("synonym", "göz boyamak", "aldatmak");
    gecer("synonym", "ağzı kulaklarında", "çok sevinçli");
    gecer("synonym", "göz göre göre", "açıkça"); // tam üç sözcük sınırda geçer
    gecer("antonym", "açık", "kapalı");
    gecer("category", "kırmızı elma", "meyve");
    gecer("category", "kedi", "evcil hayvanlar");
    kalir("synonym", "büyük", "çok büyük bir şey demek");
    kalir("antonym", "sıcak", "soğuk.");
    kalir("category", "elma", "bu bir meyve türüdür");
    kalir("synonym", "", "iri");
    kalir("synonym", "büyük", "iri!");
    kalir("synonym", "nasıl?", "iri");
    kalir("synonym", "büyük…", "iri");
    kalir("synonym", "çok çok küçük şey", "ufak"); // dört sözcük
  });
  it("zor düzeyde kelime kartı beş sözcüğe kadar (deyim): kolay/orta düzeyde üç", () => {
    gecer("synonym", "iki ayağını bir pabuca sokmak", "telaşlanmak", true);
    gecer("synonym", "telaşlanmak", "iki ayağını bir pabuca sokmak", true);
    gecer("antonym", "ağzı kulaklarında olmak", "burnu havada gezmek", true);
    gecer("category", "iki ayağını bir pabuca sokmak", "deyim", true);
    gecer("synonym", "çok çok küçük şey", "ufak", true); // dört sözcük zor düzeyde geçer
    kalir("synonym", "iki ayağını bir pabuca sokmak", "telaşlanmak"); // aynı kart kolay düzeyde beş sözcük: kusur
    kalir("synonym", "iki ayağını bir pabuca sokmak ama", "telaşlanmak", true); // altı sözcük zor düzeyde de kusur
    kalir("synonym", "iki ayağını bir pabuca sokmak.", "telaşlanmak", true); // noktalama zor düzeyde de kusur
    gecer("definition", "iki ayağını bir pabuca sokmak", "Telaşlanıp ne yapacağını şaşırmak.", true); // tanımın A kartı da deyim olabilir
    kalir("definition", "iki ayağını bir pabuca sokmak", "Telaşlanıp ne yapacağını şaşırmak.");
    gecer("sentence", "Sınav haftası ___ gibi koştu.", "iki ayağını bir pabuca sokmuş", true);
    kalir("sentence", "Sınav haftası ___ gibi koştu.", "iki ayağını bir pabuca sokmuş");
  });
  it("zor sınırı yalnız 'hard': orta düzeyde de kolay gibi üç sözcük", () => {
    const m = tabanCikti("synonym");
    cift(m)[0]!.cardA = "iki ayağını bir pabuca sokmak";
    for (const d of ["easy", "medium"] as const) expect(kos(m, B("synonym", { difficulty: d })).scores.kart_bicimi, d).toBeCloseTo(5 / 6);
    expect(kos(m, B("synonym", { difficulty: "hard" })).scores.kart_bicimi).toBe(1);
  });
  it("tanım: kart B en çok BİR cümle; resim açıklaması: en çok İKİ cümle", () => {
    gecer("definition", "kütüphane", "Kitapların okunduğu yer");
    gecer("definition", "kütüphane", "Kitapların okunduğu yer.");
    gecer("definition", "gözlük", "Gözü korumak için takılan, camlı ve çerçeveli araç.");
    gecer("image_desc", "elma", "Kırmızı, yuvarlak bir meyve.");
    gecer("image_desc", "elma", "Yuvarlak bir meyve. Ağaçta yetişir."); // iki cümleli resim açıklaması geçer
    gecer("image_desc", "elma", "Kırmızı bir meyve. Tatlıdır. Ağaçta yetişir."); // 'Tatlıdır.' tek sözcük: cümle sayılmaz (ortak sezgi)
    kalir("definition", "kütüphane", "Kitapların okunduğu yer. Orada sessiz olunur.");
    kalir("definition", "kütüphane", "");
    kalir("definition", "Kütüphane kitap dolu bir yerdir", "Kitapların okunduğu yer.");
    kalir("image_desc", "elma", "Kırmızı bir meyve. Çok tatlıdır. Ağaçta yetişir.");
    kalir("image_desc", "elma", "  ");
    kalir("image_desc", "Kırmızı yuvarlak büyük meyve", "Yuvarlak bir meyve."); // A kartı kelime değil (dört sözcük)
    kalir("image_desc", "Elma yenir.", "Yuvarlak bir meyve.");
  });
  it("cümle tamamlama: A boşluklu cümle, B kısa kelime", () => {
    gecer("sentence", "Hava çok ___ olduğu için kalın giyindik.", "soğuk");
    gecer("sentence", "Hava çok ... olduğu için kalın giyindik.", "soğuk");
    gecer("sentence", "Hava çok … olduğu için kalın giyindik.", "soğuk");
    gecer("sentence", "Hava çok (   ) olduğu için kalın giyindik.", "soğuk");
    gecer("sentence", "Hava çok [ ] olduğu için kalın giyindik.", "soğuk");
    gecer("sentence", "Kış gelince hava ______.", "soğur");
    gecer("sentence", "Hava çok _ _ _ olduğu için kalın giyindik.", "soğuk"); // boşlukla ayrık alt çizgiler
    gecer("sentence", "Hava çok _  _ olduğu için kalın giyindik.", "soğuk");
    gecer("sentence", "Hava çok _\t_ olduğu için kalın giyindik.", "soğuk");
    gecer("sentence", "Hava çok --- olduğu için kalın giyindik.", "soğuk");
    gecer("sentence", "Hava çok ——— olduğu için kalın giyindik.", "soğuk");
    gecer("sentence", "Ali okula ___ gitti.", "yürüyerek");
    gecer("sentence", "Ayşe ___ giydi.", "kırmızı elbise");
    kalir("sentence", "Hava çok soğuk olduğu için kalın giyindik.", "soğuk");
    kalir("sentence", "Hava çok _ olduğu için", "soğuk"); // tek alt çizgi boşluk sayılmaz
    kalir("sentence", "Hava çok _ olduğu için _ kalın", "soğuk"); // iki ayrı tek alt çizgi: aralarında sözcük var, boşluk işareti değil
    kalir("sentence", "___", "soğuk"); // cümle değil
    kalir("sentence", "Ali ___", "okula"); // iki sözcük: cümle sayılmaz
    kalir("sentence", "Hava çok -- olduğu için kalın giyindik.", "soğuk"); // iki çizgi boşluk sayılmaz
    kalir("sentence", "Hava çok ___ olduğu için kalın giyindik.", "Hava çok soğuk olduğu için kalın giyindik.");
    kalir("sentence", "Hava çok ___ olduğu için kalın giyindik.", "");
  });
  it("boşluk işareti yalnız cümle tamamlamada aranır: eş anlamlıda '...' içeren kart kusurdur", () => {
    kalir("synonym", "büyük...", "iri");
  });
});

describe("matchingGameChecks — tekrar_yok: kategoride kart B tekrarı meşru (aynı kategoriye giren birkaç kelime), diğer türlerde belirsizlik", () => {
  it("kategori: aynı kategori adı birçok çiftte → 1; aynı kelime iki çiftte → düşer", () => {
    const m = tabanCikti("category");
    expect(kos(m, B("category")).scores.tekrar_yok).toBe(1);
    cift(m)[5]!.cardA = "Elma";
    expect(kos(m, B("category")).scores.tekrar_yok).toBeCloseTo(5 / 6);
  });
  it("diğer türlerde cevap tekrarı: 12 anahtardan biri tekrar → 11/12", () => {
    const m = tabanCikti("antonym");
    cift(m)[3]!.cardB = "KISA";
    expect(kos(m, B("antonym")).scores.tekrar_yok).toBeCloseTo(11 / 12);
  });
  it("iç boşluk ve büyük/küçük harf farkı tekrarı gizlemez", () => {
    const m = tabanCikti("synonym");
    cift(m)[0]!.cardA = "yeşil elma";
    cift(m)[1]!.cardA = " Yeşil   ELMA ";
    expect(kos(m).scores.tekrar_yok).toBeCloseTo(11 / 12);
  });
  it("boş kartlar tekrar sayılır (iki boş cardA aynı anahtardır)", () => {
    const m = tabanCikti("synonym");
    cift(m)[0]!.cardA = "";
    cift(m)[1]!.cardA = "";
    expect(kos(m).scores.tekrar_yok).toBeCloseTo(11 / 12);
  });
});

describe("matchingGameChecks — pairCount metni ve rotanın ezdiği alanlar", () => {
  it.each([["6", 6], ["8", 8], ["10", 10], ["12", 12]] as const)("pairCount '%s' (metin) %i çiftle eşleşir", (sayi, n) => {
    const m = tabanCikti("synonym");
    cift(m).splice(0, cift(m).length, ...Array.from({ length: n }, (_, i) => pair(i + 1, `a${i}`, `b${i}`)));
    expect(kos(m, B("synonym", { pairCount: sayi })).scores.cift_sayisi).toBe(1);
    expect(kos(m, B("synonym", { pairCount: sayi === "6" ? "8" : "6" })).scores.cift_sayisi).toBe(0);
  });
  it("rota theme ve pairCount'u ezer: bozuk olsalar da puan değişmez", () => {
    const m = tabanCikti("synonym");
    const once = kos(m).scores;
    m.theme = 123;
    m.pairCount = "yanlış";
    expect(kos(m).scores).toEqual(once);
  });
  it("goalTitle ve theme gövdede olması puanları etkilemez", () => {
    const m = tabanCikti("category");
    expect(kos(m, B("category", { theme: "okul", goalTitle: "Gruplar" })).scores).toEqual(kos(m, B("category")).scores);
  });
});

describe("matchingGameChecks — dayanıklılık: nesne olmayan çift/alan", () => {
  it("null/metin/dizi çiftler çökmez; çift sayısı korunur", () => {
    const m = tabanCikti("synonym");
    m.pairs = [null, "metin", [1], 5, { id: 5, cardA: 7, cardB: null, hint: {}, visualPrompt: [] }, cift(m)[0]];
    let r: ReturnType<typeof kos> | undefined;
    expect(() => (r = kos(m))).not.toThrow();
    expect(r!.details.cift).toBe(6);
    expect(r!.scores.cift_sayisi).toBe(1);
    expect(r!.scores.cift_dolu).toBeCloseTo(1 / 6);
  });
  it("pairs dizi değilse çift yok sayılır", () => {
    for (const x of ["x", null, 5, { 0: "a" }]) {
      const r = kos({ ...tabanCikti("synonym"), pairs: x });
      expect(r.hard).toContain("cift_yok");
      expect(r.scores.cift_sayisi).toBe(0);
    }
  });
  it("çıktı nesne değilse (dizi/metin/sayı) çıktı yok gibi: puanlar 0, talimat 0", () => {
    for (const x of [[1, 2], "metin", 7, undefined]) expect(kos(x).scores.talimat, String(x)).toBe(0);
  });
});
