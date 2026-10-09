// apps/hub/evals/lib/sharedChecks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { adGeciyorMu, adIzi, adIziKonum, alanlarDolu, countSentences, katla, dilKurali, kayitlar, markdownHeadings, metinler, nesne, nesneVeyaNull, parseJsonLoose, rumuzYok, sureDk, turkceMi, yasakKalip } from "./sharedChecks";

describe("sharedChecks", () => {
  it("dil kuralı: hasta/terapist/ödül sayar", () => {
    const r = dilKurali("Hasta için terapist ödül versin. Hastane değil.");
    expect(r).toMatchObject({ hasta: 1, terapist: 1, odul: 1, score: 0 });
    expect(dilKurali("Öğrenci ve uzman birlikte çalışır.").score).toBe(1);
  });
  it("rumuz sızıntısı: çıktıda rumuz kalmışsa 0", () => {
    expect(rumuzYok({ title: "Defne için hikâye" }, "Defne")).toBe(0);
    expect(rumuzYok({ title: "Ela için hikâye" }, "Defne")).toBe(1);
    expect(rumuzYok({ title: "x" }, null)).toBe(1);
  });
  it("yasak kalıp: bulunanları listeler, puanı düşürür", () => {
    expect(yasakKalip("Sabırlı olun ve düzenli tekrar önemlidir.")).toEqual({ found: ["sabırlı ol", "düzenli tekrar önemli"], score: 0.5 });
    expect(yasakKalip("Somut adım.")).toEqual({ found: [], score: 1 });
  });
  it("gevşek JSON: kod çitli ve düz metni çözer, bozukta null", () => {
    expect(parseJsonLoose('Önsöz ```json\n{"a":1}\n``` son')).toEqual({ a: 1 });
    expect(parseJsonLoose('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonLoose("{a:1}")).toBeNull();
  });
  it("cümle sayısı ve Markdown başlıkları", () => {
    expect(countSentences("Bu bir cümle. Bu da ikinci! Üçüncü mü?")).toBe(3);
    expect(markdownHeadings("## Okuma\nmetin\n### Kısa dönem hedefler\n- a")).toEqual(["Okuma", "Kısa dönem hedefler"]);
  });
  it("dil kuralı: çekimli biçimler ve Türkçe büyük harf", () => {
    expect(dilKurali("Hastanın ailesi, hastaya, hastalar").hasta).toBe(3);
    expect(dilKurali("Hastanede, hastalığı, hastalık, hastalanmak").hasta).toBe(0);
    expect(dilKurali("TERAPİST, ÇIKARTMA, YILDIZ TABLOSU")).toMatchObject({ terapist: 1, odul: 2, score: 0 });
    expect(dilKurali("Dışsal ödül önerilmez; toplama ve çıkartma çalışılır.")).toMatchObject({ odul: 2, score: 1 });
  });
  it("dil kuralı: 'hasta ol-' (rahatsızlanmak) sayılmaz, 'hasta' (kişi) sayılır", () => {
    expect(dilKurali("Hasta olunca evde kalırım.").hasta).toBe(0);
    expect(dilKurali("Hastanın ailesi").hasta).toBe(1);
  });
  it("dil kuralı: 'konuşma terapisti' muafiyeti opt-in; varsayılanda her 'terapist' sayılır", () => {
    const muaf = { konusmaTerapistiMuaf: true };
    // Varsayılan (Studio): okuyucu konuşma terapistidir, istemler "terapist"i tümden yasaklar.
    expect(dilKurali("Dil ve konuşma terapisti değerlendirir.")).toMatchObject({ terapist: 1, score: 0 });
    expect(dilKurali("Konuşma terapistinizle birlikte okuyun.").terapist).toBe(1);
    // Muafiyet açık (Atölye): meşru meslek unvanı sayılmaz.
    expect(dilKurali("Dil ve konuşma terapisti değerlendirir.", muaf)).toMatchObject({ terapist: 0, score: 1 });
    expect(dilKurali("Konuşma Terapisti ile birlikte çalışın.", muaf).terapist).toBe(0);
    expect(dilKurali("terapist önerir", muaf).terapist).toBe(1);
    expect(dilKurali("Konuşma terapisti ve terapist", muaf).terapist).toBe(1);
    expect(dilKurali("Konuşma terapisti ve terapist").terapist).toBe(2);
    // Kelime içi geçiş iki durumda da sayılmaz.
    expect(dilKurali("Fizyoterapist de katkı verir.").terapist).toBe(0);
    expect(dilKurali("Fizyoterapist de katkı verir.", muaf).terapist).toBe(0);
  });
  it("metinler: tüm string değerleri toplar; görsel prompt anahtarları dahil", () => {
    expect(metinler({ a: "x", b: [{ c: "y", visualPrompt: "z" }] })).toEqual(["x", "y", "z"]);
    expect(metinler("düz")).toEqual(["düz"]);
    expect(metinler({ n: 1, ok: true, bos: null, liste: [2, "a", ["b"]] })).toEqual(["a", "b"]);
    expect(metinler(null)).toEqual([]);
    expect(metinler(undefined)).toEqual([]);
  });
  it("rumuz: ekli/büyük harfli geçiş sızıntı; kelime içi ve görsel alan değil", () => {
    expect(rumuzYok({ t: "Defne'nin çantası" }, "Defne")).toBe(0);
    expect(rumuzYok({ t: "Defneyle oynadı" }, "Defne")).toBe(0);
    expect(rumuzYok({ t: "DEFNE İÇİN" }, "Defne")).toBe(0);
    expect(rumuzYok("## Defne için plan", "Defne")).toBe(0);
    expect(rumuzYok({ t: "Elastik bant kullanın." }, "Ela")).toBe(1);
    expect(rumuzYok({ s: [{ text: "Ayşe okula gider.", visualPrompt: "Defne walks to school" }] }, "Defne")).toBe(1);
  });
  it("adGeciyorMu: kelime sınırı + ek + büyük harf", () => {
    expect(adGeciyorMu("Elanın çantası", "Ela")).toBe(true);
    expect(adGeciyorMu("ELA'YA verin", "Ela")).toBe(true);
    expect(adGeciyorMu("Elastik bant", "Ela")).toBe(false);
    expect(adGeciyorMu("{\"notes\":\"Ela için plan\"}", "Ela")).toBe(true);
    expect(adGeciyorMu("x", "")).toBe(false);
  });
  it("gevşek JSON: çitli iç içe nesne", () => {
    expect(parseJsonLoose('```json\n{"a":{"b":[1,{"c":2}]}}\n```')).toEqual({ a: { b: [1, { c: 2 }] } });
  });
  it("yasak kalıp: 4+ kalıpta puan 0", () => {
    expect(yasakKalip("Sabırlı olun. Düzenli tekrar önemlidir. Uygun ortam sağlayın. Motivasyonu yüksek tutun. Gelişimini takip edin.").score).toBe(0);
  });
  it("başlıklar: yalnız ## ve ###", () => {
    expect(markdownHeadings("# Belge\n## A\n#### D\n### B")).toEqual(["A", "B"]);
  });
});

describe("adIzi (PII tuzak teli)", () => {
  it("küçük harf + aksan katlama + kelime başı önek eşleşir", () => {
    expect(adIzi("Elanın çantası", "Ela")).toBe(true);
    expect(adIzi("ELACIĞIM", "Ela")).toBe(true);
    expect(adIzi("gokce icin", "Gökçe")).toBe(true);
  });
  it("kelime içi geçiş ve boş ad eşleşmez", () => {
    expect(adIzi("Selanik", "Ela")).toBe(false);
    expect(adIzi("x", "")).toBe(false);
  });
});

describe("katla / adIziKonum", () => {
  it("katla: tr-TR küçük harf, ı→i, aksanlar atılır", () => {
    expect(katla("GÖKÇE Işık İLKER ığdır")).toBe("gokce isik ilker igdir");
    expect(katla("âîû")).toBe("aiu");
  });
  it("adIziKonum: eşleşmenin ÖZGÜN metindeki dizini, yoksa −1; adIzi ile tutarlı", () => {
    expect(adIziKonum("Elanın çantası", "Ela")).toBe(0);
    expect(adIziKonum("Öğretmen: gokce yorgun", "Gökçe")).toBe(10);
    expect(adIziKonum("ğğğ ELA", "Ela")).toBe(4);
    expect(adIziKonum("Selanik", "Ela")).toBe(-1);
    expect(adIziKonum("metin", "  ")).toBe(-1);
    // Birleşik işaretli (NFD) metin: katlanmış dizin özgün dizine geri eşlenir.
    const nfd = `e\u0301e\u0301 ${"Gökçe".normalize("NFD")}`;
    expect(nfd).toHaveLength(5 + 7); // "G" "o\u0308" "k" "c\u0327" "e" → 7 kod birimi
    expect(adIziKonum(nfd, "Gökçe")).toBe(5);
    for (const [t, a] of [["Elanın", "Ela"], ["Selanik", "Ela"], ["gokce", "Gökçe"]] as const) {
      expect(adIzi(t, a)).toBe(adIziKonum(t, a) >= 0);
    }
  });
});

describe("kayitlar", () => {
  it("dizi değilse boş; nesne olmayan öğeler boş nesne olur, sayı korunur", () => {
    expect(kayitlar(undefined)).toEqual([]);
    expect(kayitlar("metin")).toEqual([]);
    expect(kayitlar({ a: 1 })).toEqual([]);
    const a = { x: 1 };
    const r = kayitlar([a, null, "metin", 3, [1], undefined]);
    expect(r).toHaveLength(6);
    expect(r[0]).toBe(a);
    expect(r.slice(1)).toEqual([{}, {}, {}, {}, {}]);
  });
  describe("countSentences: bölünme yalnız sonraki cümle büyük harf, rakam ya da açılış tırnağı/parantezle başlıyorsa", () => {
    it("tek cümle: sıra sayısı, üç nokta, kısaltma, soru işaretinden sonra küçük harf", () => {
      const bir = [
        "Günün 2. dersi oyun ağırlıklıdır.",
        "‘Ben … istiyorum’ kalıbıyla çalışılır.",
        "Ben ... istiyorum kalıbı tekrar edilir.",
        "(ör. top, araba) ile oynanır.",
        "Ne istiyorsun? sorusuna yanıt verilir.",
        "Oyuncak arabaları 5 dk. boyunca garajda dizeriz.",
        "Tren, vagon vb. oyuncakları birlikte topluyoruz.",
      ];
      for (const t of bir) expect(countSentences(t), t).toBe(1);
    });
    it("ayrı cümle: büyük harf (Türkçe İ dahil), rakam, açılış tırnağı ve parantez", () => {
      expect(countSentences("Bu bir cümle. Bu da ikinci! Üçüncü mü?")).toBe(3);
      expect(countSentences("İlk cümle. İkinci cümle.")).toBe(2);
      expect(countSentences("Bugün çalıştık. 3 kez tekrar ettik.")).toBe(2);
      expect(countSentences('Uzman sordu. "Ne istiyorsun?" dedi.')).toBe(2);
      expect(countSentences("Uzman sordu. “Ne istiyorsun?” dedi.")).toBe(2);
      expect(countSentences("Önce ısın. (Kısa tut.) Sonra başla.")).toBe(3);
      expect(countSentences("Uzman sordu. ‘Ne istiyorsun?’ dedi.")).toBe(2); // ‘ açılışı
      expect(countSentences("Uzman sordu. 'Ne istiyorsun?' dedi.")).toBe(2); // ASCII ' açılışı
      expect(countSentences("Uzman sordu: “Ne istiyorsun?” Ela cevap verdi.")).toBe(2); // kapanış tırnağından sonra büyük harf
      expect(countSentences('Uzman sordu: "Ne istiyorsun?" Ela cevap verdi.')).toBe(2);
      expect(countSentences("Uzman sordu: “Ne istiyorsun?” diye.")).toBe(1); // kapanış tırnağından sonra küçük harf
      expect(countSentences("Biraz bekledi… Sonra gitti.")).toBe(2);
      expect(countSentences("Çalışma 1 güzel. Çalışma 2 güzel. Çalışma 3 güzel. Çalışma 4 güzel.")).toBe(4);
    });
    it("tek sözcüklü parça sayılmaz; boş metin 0", () => {
      expect(countSentences("Evet.")).toBe(0);
      expect(countSentences("")).toBe(0);
      expect(countSentences("Evet. Tamam. Bugün iyi geçti.")).toBe(1);
    });
  });

  describe("sureDk: süre metni → dakika (birim İLK sayıya bağlı)", () => {
    it.each<[unknown, number | null]>([
      ["5 dk (30 sn)", 5],
      ["1 saat", 60],
      [5, 5],
      ["5-10 dk", 7.5],
      ["5'", 5],
      ["5 dakika", 5],
      ["30 sn", 0.5],
      ["30 saniye", 0.5],
      ["30 saniyelik", 0.5],
      ["1,5 saat", 90],
      ["2.5 dakika", 2.5],
      ["5–10 dakika", 7.5],
      ["6 - 10 dk", 8],
      ["20—30 dk", 25],
      ["5 DK", 5],
      ["1 SAAT", 60],
      ["5 dk - 10 dk", 5],
      ["yaklaşık 10 dakika", 10],
      ["süre: 15", 15],
      ["kısa", null],
      ["yarım saat", null],
      ["", null],
      [null, null],
      [undefined, null],
      [{}, null],
      [Number.NaN, null],
      [Number.POSITIVE_INFINITY, null],
    ])("%j → %j", (girdi, beklenen) => {
      expect(sureDk(girdi)).toBe(beklenen);
    });
  });

  describe("nesne / nesneVeyaNull", () => {
    it("düz nesne aynen; dizi, metin, sayı, null → {} (nesneVeyaNull: null)", () => {
      const o = { a: 1 };
      expect(nesne(o)).toBe(o);
      expect(nesneVeyaNull(o)).toBe(o);
      for (const x of [[1], "x", 3, null, undefined, true]) {
        expect(nesne(x)).toEqual({});
        expect(nesneVeyaNull(x)).toBeNull();
      }
    });
  });
});

describe("turkceMi (İngilizce üretim komutunda Türkçe izi; araçlar arası ortak)", () => {
  it.each(["kırmızı elma", "su bardağı", "çay", "ÇAY", "a cup bir su", "a ball ve a cup", "dolu bir bardak"])("Türkçe: %s", (komut) => expect(turkceMi(komut)).toBe(true));
  it.each(["a red apple", "I am", "I've got a ball", "a döner kebab", "an über-cute puppy", "a bull", "a ball about the hill", ""])("İngilizce ya da belirsiz: '%s'", (komut) => expect(turkceMi(komut)).toBe(false));
});

describe("alanlarDolu", () => {
  it("dolu alanların oranı; boşluk, eksik ve metin olmayan alan boş sayılır", () => {
    expect(alanlarDolu({ a: "x", b: "y" }, ["a", "b"])).toBe(1);
    expect(alanlarDolu({ a: "x", b: " ", c: 5, d: null }, ["a", "b", "c", "d"])).toBe(0.25);
    expect(alanlarDolu({ a: "x" }, ["a", "yok"])).toBe(0.5);
  });
  it("çıktı yok (null/undefined) ya da anahtar listesi boş: 0", () => {
    expect(alanlarDolu(null, ["a"])).toBe(0);
    expect(alanlarDolu(undefined, ["a", "b"])).toBe(0);
    expect(alanlarDolu({ a: "x" }, [])).toBe(0);
  });
});
