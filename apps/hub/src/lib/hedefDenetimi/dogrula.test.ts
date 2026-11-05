// apps/hub/src/lib/hedefDenetimi/dogrula.test.ts
import { describe, expect, it } from "vitest";
import { DenetimHatasi, OZET_YEDEK, alintiGecerli, bekciPenceresi, dogrula, hedefParcasiIceriyor, onKirp } from "./dogrula";

const HEDEF = "Resim desteğiyle iki heceli 10 sözcüğün 8'ini üç ardışık oturumda doğru okur.";
const b = (durum: string, alinti = "", not = "") => ({ durum, alinti, not });
const ham = (over: Record<string, unknown> = {}) => ({
  bilesenler: {
    davranis: b("var", "doğru okur"), olcut: b("var", "10 sözcüğün 8'ini"), kosul: b("var", "Resim desteğiyle"),
    zaman: b("eksik"), taban: b("eksik"),
  },
  mebUyum: null,
  sorular: [{ bilesen: "zaman", soru: "Hangi tarihe kadar?", ornek: "dönem sonuna kadar" }],
  ozet: "Zaman ve taban yazılmamış.",
  ...over,
});
const girdi = { hedef: HEDEF };

describe("alintiGecerli / bekçi", () => {
  it("alt dizi: büyük-küçük ve boşluk farkı sayılmaz; uydurma ya da boş alıntı geçmez", () => {
    expect(alintiGecerli(HEDEF, "DOĞRU   okur")).toBe(true);
    expect(alintiGecerli(HEDEF, "doğru okur ve yazar")).toBe(false);
    expect(alintiGecerli(HEDEF, "")).toBe(false);
  });
  it("pencere: ≥4 kelime → 4, 2–3 kelime → 2, 1 kelime → 0", () => {
    expect(bekciPenceresi(HEDEF)).toBe(4);
    expect(bekciPenceresi("doğru okur")).toBe(2);
    expect(bekciPenceresi("okur")).toBe(0);
  });
  it("hedefin 4 ardışık kelimesi yeniden yazım izidir; 3 kelime değildir; noktalama/ek fark etmez; 1 kelimelik hedefte bekçi kapalı", () => {
    expect(hedefParcasiIceriyor(HEDEF, "Şöyle yazın: iki heceli 10 sözcüğün 8'ini okusun")).toBe(true);
    expect(hedefParcasiIceriyor(HEDEF, "iki heceli 10 sözcük")).toBe(false);
    expect(hedefParcasiIceriyor("doğru okur", "çocuk doğru okur mu")).toBe(true);
    expect(hedefParcasiIceriyor("okur", "okur okur okur")).toBe(false);
  });
});

describe("normalizasyon", () => {
  it("NFD hedef ↔ NFC alıntı ve kıvrık kesme ↔ düz kesme geçerli", () => {
    expect(alintiGecerli("Sözel ipucuyla okur".normalize("NFD"), "Sözel ipucuyla".normalize("NFC"))).toBe(true);
    expect(alintiGecerli("10 denemenin 8'inde okur", "8’inde")).toBe(true);
  });
  it("kesme sözcük kırmaz: '10 denemenin 8'inde' 3 jeton, 4'lük pencereyi doldurmaz", () => {
    const h = "Sözel ipucuyla 10 denemenin 8'inde nesneleri doğru eşler.";
    expect(hedefParcasiIceriyor(h, "10 denemenin 8'inde")).toBe(false);
    expect(hedefParcasiIceriyor(h, "10 denemenin 8’inde nesneleri")).toBe(true);
  });
});

describe("dogrula", () => {
  it("soru metni hedefi yeniden yazıyorsa soru DÜŞER", () => {
    const h = { hedef: "Sözel ipucuyla 10 denemenin 8'inde nesneleri doğru eşler." };
    const s = dogrula(ham({ sorular: [{ bilesen: "zaman", soru: "Sözel ipucuyla 10 denemenin 8'inde nesneleri doğru eşler mi?" }, { bilesen: "taban", soru: "Başlangıç düzeyi nedir?" }] }), h);
    expect(s.sorular.map((q) => q.bilesen)).toEqual(["taban"]);
  });
  it("kısa 'ornek' (kesmeli 3 jeton) korunur", () => {
    const h = { hedef: "Sözel ipucuyla 10 denemenin 8'inde nesneleri doğru eşler." };
    const s = dogrula(ham({ sorular: [{ bilesen: "zaman", soru: "Ne zaman?", ornek: "10 denemenin 8'inde" }] }), h);
    expect(s.sorular[0]!.ornek).toBe("10 denemenin 8'inde");
  });
  it("hoşgörülü ön-kırpma: bozuk mebUyum → null, bozuk sorular atılır, boş özet → yedek", () => {
    const mb = { baglam: { meb: "x" } };
    expect(dogrula(ham({ mebUyum: { durum: "belki" } }), { ...girdi, ...mb }).mebUyum).toBeNull();
    expect(dogrula(ham({ mebUyum: "uyumlu" }), { ...girdi, ...mb }).mebUyum).toBeNull();
    const s = dogrula(ham({ sorular: [{ bilesen: "zaman" }, { bilesen: "x", soru: "a" }, { bilesen: "taban", soru: "  " }, { bilesen: "zaman", soru: "ok" }], ozet: "" }), girdi);
    expect(s.sorular.map((q) => q.soru)).toEqual(["ok"]);
    expect(s.ozet).toBe(OZET_YEDEK);
    expect(dogrula(ham({ ozet: undefined }), girdi).ozet).toBe(OZET_YEDEK);
  });
  it("3'e kırpmadan ÖNCE süzülür: 'var' bileşen soruları düşer, ardından gelen geçerli soru kalır", () => {
    const s = dogrula(ham({ sorular: [{ bilesen: "davranis", soru: "a" }, { bilesen: "olcut", soru: "b" }, { bilesen: "kosul", soru: "c" }, { bilesen: "zaman", soru: "d" }] }), girdi);
    expect(s.sorular.map((q) => q.bilesen)).toEqual(["zaman"]);
  });
  it("uydurma alıntılı 'var' + aynı bileşene soru: bileşen belirsiz olur, soru kalır", () => {
    const s = dogrula(ham({ bilesenler: { ...ham().bilesenler, davranis: b("var", "akıcı okur") }, sorular: [{ bilesen: "davranis", soru: "Hangi davranış?" }] }), girdi);
    expect(s.bilesenler.davranis.durum).toBe("belirsiz");
    expect(s.sorular.map((q) => q.bilesen)).toEqual(["davranis"]);
  });
  it("200 karakterlik alıntı 160'a kesilir (…'sız), 'var' kalır", () => {
    const uzun = Array.from({ length: 300 }, (_, i) => String.fromCharCode(97 + (i % 26))).join("");
    const alinti = uzun.slice(20, 220);
    const s = dogrula(ham({ bilesenler: { ...ham().bilesenler, davranis: b("var", alinti) } }), { hedef: uzun });
    expect(s.bilesenler.davranis.durum).toBe("var");
    expect(s.bilesenler.davranis.alinti).toBe(alinti.slice(0, 160));
  });
  it("geçerli çıktı olduğu gibi geçer", () => {
    const s = dogrula(ham(), girdi);
    expect(s.bilesenler.davranis).toEqual({ durum: "var", alinti: "doğru okur", not: "" });
    expect(s.sorular).toEqual([{ bilesen: "zaman", soru: "Hangi tarihe kadar?", ornek: "dönem sonuna kadar" }]);
    expect(s.ozet).toBe("Zaman ve taban yazılmamış.");
    expect(s.mebUyum).toBeNull();
  });
  it("uydurma alıntı silinir; alıntısız 'var' belirsize iner (not korunur)", () => {
    const s = dogrula(ham({ bilesenler: { ...ham().bilesenler, davranis: b("var", "akıcı okur", "fiil gözlenebilir") } }), girdi);
    expect(s.bilesenler.davranis).toEqual({ durum: "belirsiz", alinti: "", not: "fiil gözlenebilir" });
  });
  it("yeniden yazım bekçisi: örnek düşer; özet ilk cümleye kırpılır, o da taşıyorsa yedek metin; not boşalır", () => {
    const s = dogrula(
      ham({
        sorular: [{ bilesen: "zaman", soru: "Ne zaman?", ornek: "iki heceli 10 sözcüğün 8'ini dönem sonuna kadar" }],
        ozet: "Zaman eksik. Şöyle olabilir: resim desteğiyle iki heceli 10 sözcüğün 8'ini okur.",
        bilesenler: { ...ham().bilesenler, taban: b("eksik", "", "Taban olarak resim desteğiyle iki heceli 10 sözcüğün 3'ünü yazın") },
      }),
      girdi,
    );
    expect(s.sorular[0]!.ornek).toBe("");
    expect(s.ozet).toBe("Zaman eksik.");
    expect(s.bilesenler.taban.not).toBe("");
    expect(dogrula(ham({ ozet: "Hedef: resim desteğiyle iki heceli 10 sözcüğün 8'ini üç ardışık oturumda okur" }), girdi).ozet).toBe(OZET_YEDEK);
  });
  it("soru filtresi: 'var' bileşene soru düşer, aynı bileşene ikinci soru düşer, en çok 3 (fazlası şemadan önce kırpılır)", () => {
    const s = dogrula(
      ham({ sorular: [{ bilesen: "davranis", soru: "a" }, { bilesen: "zaman", soru: "b" }, { bilesen: "taban", soru: "d" }, { bilesen: "zaman", soru: "c" }] }),
      girdi,
    );
    expect(s.sorular.map((q) => `${q.bilesen}:${q.soru}`)).toEqual(["zaman:b", "taban:d"]);
  });
  it("MEB girdisi yokken mebUyum null; varken korunur", () => {
    const meb = { durum: "kismen", not: "aynı bölüm" };
    expect(dogrula(ham({ mebUyum: meb }), girdi).mebUyum).toBeNull();
    expect(dogrula(ham({ mebUyum: meb }), { ...girdi, baglam: { meb: "- MEB hedef alanı: …" } }).mebUyum).toEqual(meb);
  });
  it("önce kırpar sonra parse eder: 500 karakterlik özet ≤300'e iner, 5 soru ≤3", () => {
    const s = dogrula(ham({ ozet: "a".repeat(500), sorular: Array.from({ length: 5 }, (_, i) => ({ bilesen: "zaman", soru: `s${i}` })) }), girdi);
    expect(s.ozet.length).toBeLessThanOrEqual(300);
    expect(s.sorular.length).toBeLessThanOrEqual(3);
  });
  it("büyük harfli / Türkçe durum değerleri katlanır (EKSİK, Var, Uyumlu, Belirsiz)", () => {
    const o = onKirp({ bilesenler: { davranis: { durum: "Var", alinti: "x" }, olcut: { durum: "EKSİK" }, kosul: { durum: "Belirsiz" } }, mebUyum: { durum: "Uyumlu" } }) as { bilesenler: Record<string, { durum: string }>; mebUyum: { durum: string } };
    expect(o.bilesenler.davranis.durum).toBe("var");
    expect(o.bilesenler.olcut.durum).toBe("eksik");
    expect(o.bilesenler.kosul.durum).toBe("belirsiz");
    expect(o.mebUyum.durum).toBe("uyumlu");
  });
  it("mebUyum 'kısmen' (her harf boyu) → 'kismen'", () => {
    expect(onKirp({ mebUyum: { durum: "Kısmen", not: "x" } })).toMatchObject({ mebUyum: { durum: "kismen" } });
    expect(onKirp({ mebUyum: { durum: "KISMEN" } })).toMatchObject({ mebUyum: { durum: "kismen" } });
    expect(onKirp({ mebUyum: { durum: "Kismen" } })).toMatchObject({ mebUyum: { durum: "kismen" } });
    expect(onKirp({ mebUyum: { durum: "kısmen" } })).toMatchObject({ mebUyum: { durum: "kismen" } });
  });
  it("şema dışı → DenetimHatasi('parse'); onKirp null girdiyi boş iskelete çevirir", () => {
    expect(() => dogrula({ bilesenler: {} }, girdi)).toThrow(DenetimHatasi);
    expect(() => dogrula("metin", girdi)).toThrow(/davranis/);
    expect(onKirp(null)).toMatchObject({ mebUyum: null, sorular: [] });
  });
});
