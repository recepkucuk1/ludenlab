// apps/hub/evals/tools/atolye/veli-mektubu/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { TANI } from "../../../lib/markdown";
import { lower } from "../../../lib/sharedChecks";
import { ETIKET_OZNE_DISI, veliMektubuChecks, type VeliMektubuBody } from "./checks";
describe("veliMektubuChecks", () => {
  it("MEB kodu mektupta yok, etiket yok, ev etkinliği 3–5 madde → 1/1/1", () => {
    const r = veliMektubuChecks({ body: { amac: "ev_etkinligi", mebHedefKod: "5.1.14" }, text: "Sayın aile,\n- Etkinlik 1\n- Etkinlik 2\n- Etkinlik 3\nSevgiler" });
    expect(r.scores).toMatchObject({ meb_kod_yok: 1, etiket_yok: 1, etkinlik_sayisi: 1 });
  });
  it("kod yazılmış, 'çocuğunuzun disleksisi var', 1 madde → 0/0/0 ('çocuğunuz disleksiktir' tanı cümlesidir: etiket olarak bulunur, puanı fabrikanın tani_cumlesi'nde — tek ağırlık)", () => {
    const r = veliMektubuChecks({ body: { amac: "ev_etkinligi", mebHedefKod: "5.1.14" }, text: "Çocuğunuzun disleksisi var (5.1.14).\n- tek" });
    expect(r.scores).toMatchObject({ meb_kod_yok: 0, etiket_yok: 0, etkinlik_sayisi: 0 });
    const tani = veliMektubuChecks({ body: { amac: "ev_etkinligi", mebHedefKod: "5.1.14" }, text: "Çocuğunuz disleksiktir (5.1.14).\n- tek" });
    expect(tani.scores).toMatchObject({ meb_kod_yok: 0, etiket_yok: 1, etkinlik_sayisi: 0 });
    expect(tani.details.etiket).toContain("disleksiktir");
  });
});

/* ── Ek kapsam ── */

const govde = (b: Partial<VeliMektubuBody> = {}): VeliMektubuBody => ({ amac: "bilgilendirme", ...b });
const kontrol = (text: string, b: Partial<VeliMektubuBody> = {}) => veliMektubuChecks({ body: govde(b), text });
const mektup = (icerik: string) => `Sayın veli,\n\n${icerik}\n\nSevgiler,\nUzman`;

describe("etiket_yok: veliye tanı/etiket dayatma (prompt: 'veliye \"çocuğunuz ...dır\" gibi etiket dayatma'; 'Tıbbi tanı/iddia KURMA')", () => {
  // Etiket BULUNUR (details.etiket) ama puan paylaşımı: TANI'nın (fabrikanın `tani_cumlesi`) da yakaladığı tanı cümleleri `etiket_yok`ta sayılmaz (tek ağırlık);
  // TANI'nın yakalamadıkları (-ı ile "var", değer yargısı, otizm …) `etiket_yok`un puanıdır.
  const tanili = [
    "Çocuğunuz disleksiktir.", "Çocuğunuz disleksilidir.", "Çocuğunuz DEHB'dir.", "ÇOCUĞUNUZ DİSLEKSİKTİR.", "Çocuğunuz diskalkulidir.", "Çocuğunuz çok belirgin disgrafiktir.",
    "Çocuğunuz ÖÖB'dir.", "Çocuğunuz DEHB’dir.", "Efe disleksiktir.", "Tolga disleksiktir.", "Arda diskalkulidir.", "- Çocuğunuz disleksiktir.", "Çocuğunuz, disleksiktir.",
    "Bence çocuğunuz disleksiktir.", "Gözlemlerimize ve deneyimlerimize dayanarak çocuğunuz disleksiktir.", "Çocuğunuz kesinlikle ve açıkça disleksiktir.",
  ];
  const tanisiz = [
    // tanı sözcüğü + var / sonlu fiil
    "Çocuğunuzun disleksisi var.", "Çocuğunuzda disleksi vardır.", "Çocuğunuzda dikkat eksikliği var.", "Çocuğunuzun DEHB'si var.", "Çocuğunuzda disleksi tanısı bulunmaktadır.",
    "Çocuğunuz öğrenme güçlüğü çekmektedir.", "Oğlunuz dikkat eksikliği yaşıyor.", "Çocuğunuz dikkat eksikliği yaşar.", "Kızınız öğrenme bozukluğudur.", "Çocuğunuz otizmlidir.",
    "Çocuğunuzda hiperaktivite var.", "Çocuğunuzda disleksi mevcuttur.", "Çocuğunuz disleksiye sahiptir.", "Çocuğunuz dikkat eksikliğine sahip.",
    // değer yargısı etiketi
    "Çocuğunuz tembeldir.", "Çocuğunuz biraz yaramazdır.", "Kızınız başarısızdır.", "Çocuğunuz hiperaktiftir.", "Evladınız dikkatsizdir.", "Çocuğunuz problemlidir.",
    // çocuğun adı özne (en çok bir sözcük arayla)
    "Mina’nın diskalkulisi var.", "Çocuğunuzun DEHB’si var.", "Mina'nın diskalkulisi var.", "Efe haylazdır.", "Efe çok haylazdır.", "Tolga hiperaktiftir.",
    // küçük harfli özne cümle ortasında (ek almış biçimler dahil)
    "Sanırım oğlunuz hiperaktiftir.", "Belki kızınız tembeldir.", "Bence evladınız yaramazdır.", "Bence çocuğunuzun disleksisi var.", "Bence çocuğunuzda disleksi var.",
    // özneden önce uzun giriş: yalnız özne sözcüğü ('çocuğunuz' ailesi) etiketi bağlar
    "Gözlemlerimize ve deneyimlerimize dayanarak oğlunuz hiperaktiftir.", "Gözlemlerimize ve deneyimlerimize dayanarak kızınız tembeldir.",
    "Gözlemlerimize ve deneyimlerimize dayanarak evladınız yaramazdır.", "Gözlemlerimize ve deneyimlerimize dayanarak çocuğunuzda disleksi var.",
    "Gözlemlerimize ve deneyimlerimize dayanarak çocuğunuzun disleksisi var.",
    // çocuğunuz ailesinde pencere üç sözcük
    "Çocuğunuz çok ama çok hiperaktiftir.", "Çocuğunuzun maalesef kesinlikle disleksisi var.",
  ];
  const temiz = [
    // güçlü yön ve olumlu betimleme (çocuğunuz …dır ama etiket değil)
    "Çocuğunuz çok yaratıcıdır.", "Çocuğunuz hareketli ve enerjik bir çocuktur.", "Efe harika bir hikâye anlatıcısıdır.", "Çocuğunuzun sözel anlatımı güçlüdür.",
    // genel ifadeler: BU çocuk hakkında değil
    "Disleksi tanılı öğrenciler için okuma zordur.", "Disleksi tanılı çocuklar farklı öğrenir.", "Disleksi, okumayı etkileyen bir öğrenme farklılığıdır.", "DEHB'li çocuklar hareketlidir.",
    "Dikkat eksikliği olan çocuklar kısa çalışmalardan fayda görür.", "Öğrenme güçlüğü olan çocuklar çoğu zaman yaratıcıdır.",
    // genel cümleler: cümle başı sözcük bir ad değildir, ortaç yüklem değildir
    "Her sınıfta öğrenme güçlüğü yaşayan çocuklar vardır.", "Pek çok çocukta disleksi vardır.", "Bu dönemde dikkat eksikliği yaşayan çocuklar için kısa çalışmalar önerilir.",
    "Unutmayın, öğrenme güçlüğü yaşayan çocuklar da çok zekidir.", "Sınıfta öğrenme güçlüğü yaşayan pek çok öğrenci var.", "Bu yaş grubunda çocuklar dikkat eksikliği yaşayabilir.",
    "Bazı çocuklar dikkat eksikliği yaşar.", "Birçok çocukta disleksi vardır.", "Tüm çocuklar farklı öğrenir; bazıları disleksi yaşar.", "Çoğu çocuk hareketlidir; hiperaktiftir diyenler yanılır.",
    "Evde dikkat eksikliği yaşayan çocuklara kısa görevler verilir.", "Lütfen çocuğunuza tembel demeyin.", "Genellikle disleksi vardır diye düşünülür.",
    // ortaç yüklem değildir (çocuğunuz ailesinde de)
    "Çocuğunuz öğrenme güçlüğü yaşayan bir çocuk değildir.", "Çocuğunuz dikkat eksikliği yaşadığı için zorlanıyor.", "Çocuğunuz dikkat eksikliği çeken bir çocuk gibi görünmüyor.",
    "Çocuğunuz dikkat eksikliği yaşayabilir mi diye merak ediyorsunuz.",
    // olumsuzlama ve kaçınma
    "Çocuğunuz disleksik değildir.", "Çocuğunuz tembel değildir.", "Çocuğunuz yaramaz değil, enerjiktir.", "Çocuğunuzun tembel olduğunu düşünmeyin.", "Çocuğunuza tembel demeyin.",
    "Çocuğunuz tembel ya da yaramaz değildir.", "Efe'nin disleksisi yoktur.",
    // tanı kararı uzmana aittir
    "Çocuğunuzda disleksi var mı diye merak ediyorsunuz.", "Efe'de dikkat eksikliği var mı, bunu uzman belirler.",
    // sözcük sonu: -mış gibi ek alan biçim aktarmadır (bilinçli sınır)
    "Çocuğunuz yaramazdırmış.",
    "Çocuğunuzda disleksi olup olmadığına karar veremeyiz; bu RAM'ın görevidir.", "Okumada zorlandığını, bunun disleksi ile ilgili olabileceğini RAM'a danışarak öğrenebilirsiniz.",
    "Çocuğunuzun okumada zorlandığını gözlemledik.", "Bu bir tanı değil, eğitsel gözlemdir.",
    "", "Merhaba.",
  ];
  const kayit = (c: string) => kontrol(mektup(c));
  it.each(["Çocuklarda", "Öğrencilerde", "Çocukların", "Öğrencilerin", "Çocuklara", "Öğrencilere", "Çocukları", "Öğrencileri", "Çocuklar’da", "Kızlarda", "Oğlanlara"])(
    "çoğul + hâl ekli büyük harfli sözcük bir ad değildir ('%s disleksi vardır' → genel cümle)",
    (kelime) => {
      expect(kayit(`${kelime} disleksi vardır.`).details.etiket).toBe("");
      expect(kayit(`${kelime} dikkat eksikliği yaşar.`).details.etiket).toBe("");
    },
  );
  it("çoğul eki olmayan büyük harfli ad hâlâ özne sayılır ('Efe', 'Tolga', 'Güler' adı çoğul değildir)", () => {
    for (const ad of ["Efe", "Tolga", "Mina", "Güler"]) expect(kayit(`${ad} haylazdır.`).details.etiket, ad).not.toBe("");
  });
  it("'-lara/-lere/-ları' ile biten ad ('Dilara', 'Dilara'nın', 'Gülara') çoğul sayılmaz: gövde en az 3 harf olmalı", () => {
    for (const c of ["Dilara haylazdır.", "Dilara'nın disleksisi var.", "Dilara’nın DEHB’si var.", "Gülara tembeldir."]) expect(kayit(c).details.etiket, c).not.toBe("");
  });
  it("liste sınıflaması TANI ile tutarlı: 'tanılı' cümleleri TANI yakalar, 'tanısız' olanları yakalamaz", () => {
    for (const c of tanili) expect(TANI.test(lower(c)), c).toBe(true);
    for (const c of tanisiz) expect(TANI.test(lower(c)), c).toBe(false);
  });
  it.each(tanili)("tanı cümlesi (etiket bulunur, puan fabrikada: etiket_yok 1): %s", (c) => {
    const r = kayit(c);
    expect(r.details.etiket, c).not.toBe("");
    expect(r.details.etiket_tani, c).not.toBe("");
    expect(r.scores.etiket_yok, c).toBe(1);
  });
  it.each(tanisiz)("TANI'nın yakalamadığı etiket (etiket_yok 0): %s", (c) => {
    const r = kayit(c);
    expect(r.details.etiket, c).not.toBe("");
    expect(r.details.etiket_tani, c).toBe("");
    expect(r.scores.etiket_yok, c).toBe(0);
  });
  it.each(temiz)("temiz (etiket yok): %s", (c) => {
    expect(kayit(c).scores.etiket_yok).toBe(1);
    expect(kayit(c).details.etiket).toBe("");
  });
  it("ayrıntıda bulunan ifade yazılır (tanı cümlesi de etiket_tani'de); temizde boş", () => {
    expect(kayit("Çocuğunuz disleksiktir.").details.etiket).toContain("disleksiktir");
    expect(kayit("Çocuğunuz disleksiktir.").details.etiket_tani).toContain("disleksiktir");
    expect(kayit("Çocuğunuzun disleksisi var.").details.etiket).toContain("disleksisi var");
    expect(kayit("Çocuğunuz çok yaratıcıdır.").details.etiket).toBe("");
  });
  it("karma: bir tanı cümlesi + bir tanısız etiket → etiket_yok 0 (tanısız olan puanlanır), ikisi de ayrıntıda", () => {
    const r = kayit("Çocuğunuz disleksiktir. Ayrıca çocuğunuz tembeldir.");
    expect(r.scores.etiket_yok).toBe(0);
    expect(r.details.etiket).toContain("disleksiktir");
    expect(r.details.etiket).toContain("tembeldir");
    expect(r.details.etiket_tani).not.toContain("tembeldir");
  });
  it("noktalama cümleyi böler: etiket ve özne ayrı cümlelerdeyse etiket sayılmaz; çocuğunuz ailesinde en çok 3 sözcük arayla", () => {
    expect(kayit("Çocuğunuz çok güçlü. Disleksiktir diyenler yanılır.").details.etiket).toBe("");
    expect(kayit("Çocuğunuz kesinlikle ve açıkça disleksiktir.").details.etiket).not.toBe("");
    // bilinen sınır: araya dört sözcük girerse etiket aranmaz (yanlış pozitif riskine karşı pencere dar tutulur)
    expect(kayit("Çocuğunuz maalesef kesinlikle ve açıkça disleksiktir.").details.etiket).toBe("");
  });
  it("ad özneyle pencere en çok BİR sözcük: 'Efe çok haylazdır' etiket, 'Efe çok ama çok haylazdır' (iki sözcük arayla) değil; aynı cümle çocuğunuz ailesinde etiket", () => {
    expect(kayit("Efe çok haylazdır.").details.etiket).not.toBe("");
    expect(kayit("Efe çok ama haylazdır.").details.etiket).toBe(""); // iki sözcük arayla: ad özneyle aranmaz
    expect(kayit("Efe çok ama çok haylazdır.").details.etiket).toBe("");
    expect(kayit("Çocuğunuz çok ama çok haylazdır.").details.etiket).not.toBe("");
  });
  it("ortaç ve kip yüklem değildir; sonlu fiil yüklemdir ('yaşar', 'yaşıyor', 'çekmektedir', 'gösteriyor', 'sahiptir')", () => {
    for (const c of ["Çocuğunuz öğrenme güçlüğü yaşayan", "Çocuğunuz öğrenme güçlüğü çeken", "Çocuğunuz dikkat eksikliği gösteren", "Çocuğunuz öğrenme güçlüğü yaşadığı", "Çocuğunuz dikkat eksikliği yaşayabilir"]) {
      expect(kayit(`${c} bir çocuk.`).details.etiket, c).toBe("");
    }
    for (const c of ["Çocuğunuz dikkat eksikliği yaşıyor.", "Çocuğunuz dikkat eksikliği yaşar.", "Çocuğunuz dikkat eksikliği yaşamaktadır.", "Çocuğunuz dikkat eksikliği çekiyor.", "Çocuğunuz öğrenme güçlüğü çekmektedir.", "Çocuğunuz dikkat eksikliği çeker.", "Çocuğunuz dikkat eksikliği gösteriyor.",
      "Çocuğunuz dikkat eksikliği gösterir.", "Çocuğunuz dikkat eksikliği göstermektedir.", "Çocuğunuz disleksiye sahiptir.", "Çocuğunuz disleksiye sahip.", "Çocuğunuz disleksiye sahip\n\nSevgiler"]) {
      expect(kayit(c).details.etiket, c).not.toBe("");
    }
    expect(kayit("Çocuğunuz disleksiye sahip çocuklar gibi okuyor.").details.etiket).toBe(""); // 'sahip' cümle sonunda değil: sıfat
    expect(kontrol("Çocuğunuz disleksiye sahip").details.etiket).toContain("sahip"); // metin sonu (noktasız) cümle sonudur
  });
  it("cümle başı ad olmayan sözcük listesi (büyük harfle başlasa da özne değil); liste sabit", () => {
    const beklenen = [
      "her", "pek", "birçok", "bazı", "bazen", "bu", "şu", "o", "bunlar", "tüm", "bütün", "çoğu", "çok", "çoğunlukla", "genellikle", "kimi", "hiçbir", "diğer", "aynı",
      "unutmayın", "lütfen", "özellikle", "ayrıca", "ancak", "fakat", "çünkü", "ama", "yani", "örneğin", "aslında", "elbette", "belki", "bence", "sanırım",
      "sınıfta", "okulda", "evde", "dönemde", "sayın", "sevgili", "merhaba", "ve", "ile",
    ];
    expect([...ETIKET_OZNE_DISI].sort()).toEqual([...beklenen].sort());
    for (const w of beklenen) {
      const buyuk = w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1);
      expect(kayit(`${buyuk} tembeldir.`).details.etiket, w).toBe("");
      expect(kayit(`Efe tembeldir. ${buyuk} hiperaktiftir.`).details.etiket, w).not.toContain(`${w} hiperaktiftir`);
    }
    // gerçek ad ('Efe', 'Tolga') listede değil
    expect(kayit("Efe tembeldir.").details.etiket).not.toBe("");
  });
  it("özne küçük harfli ad ya da genel ad değilse etiket aranmaz (yalnız 'çocuğunuz' ailesi ve büyük harfle başlayan adlar özne sayılır)", () => {
    expect(kayit("bu çocuk disleksiktir").details.etiket).toBe("");
  });
});

describe("meb_kod_yok (prompt: 'mektupta resmî kod/jargon YAZMA'): yalnız kod verilmişse puanlanır", () => {
  const kod = (text: string, k = "5.1.14") => kontrol(text, { amac: "bilgilendirme", mebHedefKod: k }).scores.meb_kod_yok;
  it.each([
    "Hedef (5.1.14) üzerinde çalışıyoruz.", "MEB 5.1.14 hedefi.", "5.1.14", "Kod 5.1.14.", "5.1.14.", "5.1.14.12 davranışı.", "[5.1.14]", "(5.1.14),", "Hedef: 5.1.14\nbaşka satır",
    // yazım biçimleri
    "Hedef 5-1-14 üzerinde çalışıyoruz.", "Hedef 5–1–14.", "Hedef 5/1/14.", "5-1-14-12", "kod: 5.1.14: toplama",
  ])("kod yazılmış → 0: %s", (t) => expect(kod(mektup(t))).toBe(0));
  it.each([
    "Toplama işlemi üzerinde çalışıyoruz.", "5.1.140", "15.1.14", "25.1.14.2", "1.5.1.14", "3.5.1.14.2", "5.1.1", "5.1", "5.1.15", "Tarih 5.1.2026", "1.14", "5.11.14", "5 1 14", "", "saat 5:14",
  ])("kod yok (başka sayı) → 1: %s", (t) => expect(kod(mektup(t))).toBe(1));
  it("başka kod: 3.2.5 verilince 3.2.5 aranır, 5.1.14 aranmaz", () => {
    expect(kod(mektup("Hedef 3.2.5."), "3.2.5")).toBe(0);
    expect(kod(mektup("Hedef (3.2.5)"), "3.2.5")).toBe(0);
    expect(kod(mektup("Hedef 3-2-5 üzerinde"), "3.2.5")).toBe(0);
    expect(kod(mektup("Hedef 3.2.5.1 davranışı"), "3.2.5")).toBe(0);
    expect(kod(mektup("Hedef 5.1.14."), "3.2.5")).toBe(1);
    expect(kod(mektup("13.2.5 ve 3.2.50"), "3.2.5")).toBe(1);
  });
  it("kod başında/sonunda boşluk taşısa da aranır", () => {
    expect(kod(mektup("Hedef 5.1.14."), " 5.1.14 ")).toBe(0);
  });
  it("kod verilmediğinde puan YOK (sabit 1 döndürülmez); boş kod dizesi de verilmemiş sayılır", () => {
    expect("meb_kod_yok" in kontrol(mektup("Hedef 5.1.14.")).scores).toBe(false);
    expect("meb_kod_yok" in kontrol(mektup("x"), { mebHedefKod: "" }).scores).toBe(false);
  });
});

describe("etkinlik_sayisi (prompt: 'ev etkinliği → 3–5 somut, kısa evde uygulanabilir etkinlik/rutin'): yalnız amaç ev_etkinligi", () => {
  const ev = (text: string) => kontrol(text, { amac: "ev_etkinligi" });
  const maddeler = (n: number, isaret = "-") => Array.from({ length: n }, (_, i) => `${isaret.replace("#", String(i + 1))} Etkinlik ${i + 1}: hece kartlarıyla 5 dk oyun`).join("\n");
  it.each([[0, 0], [1, 0], [2, 0], [3, 1], [4, 1], [5, 1], [6, 0], [9, 0]])("%d madde → %d", (n, beklenen) => {
    const r = ev(mektup(maddeler(n)));
    expect(r.scores.etkinlik_sayisi).toBe(beklenen);
    expect(r.details.etkinlik).toBe(n);
  });
  it.each([["-"], ["*"], ["+"], ["•"], ["#."], ["#)"]])("madde işareti %s", (isaret) => {
    expect(ev(mektup(maddeler(4, isaret))).details.etkinlik).toBe(4);
  });
  it("etkinlik bölümü varsa yalnız o bölüm sayılır (güçlü yön listesi ve kapanış maddeleri sayılmaz)", () => {
    const t = `Sayın veli,\n\n## Güçlü yönleri\n- Sözel anlatım\n- Futbol bilgisi\n- Görsel hafıza\n- Hikâye anlatma\n- Mizah\n- Merak\n\n## Evde yapabileceğimiz etkinlikler\n${maddeler(3)}\n\n## Kapanış\n- İletişimde kalalım\n- Sorularınızı yazın`;
    expect(ev(t).details.etkinlik).toBe(3);
    expect(ev(t).scores.etkinlik_sayisi).toBe(1);
  });
  it.each(["## Evde Küçük Adımlar", "## Etkinlik Önerileri", "### Önerilerimiz", "**Evde Neler Yapabilirsiniz**", "## Günlük rutinler", "## Evde destek", "## Oyunlar", "## Yapabilecekleriniz", "## Birlikte yapabileceğimiz oyunlar"])(
    "etkinlik bölümü başlığı varyantı: %s",
    (baslik) => {
      const t = `Sayın veli,\n\n- Not 1\n- Not 2\n- Not 3\n- Not 4\n- Not 5\n- Not 6\n\n${baslik}\n${maddeler(4)}\n\nSevgiler`;
      expect(ev(t).details.etkinlik).toBe(4);
    },
  );
  describe("başlık seçimi: başlığı 'etkinlik' geçen bölüm önceliklidir; eşleşen alt bölümün MADDELERİ sayılır (alt bölüm sayısı değil)", () => {
    const bul = (n: number, onek = "Etkinlik") => Array.from({ length: n }, (_, i) => `- ${onek} ${i + 1}`).join("\n");
    it("'Evde Küçük Adımlar' (6 madde) ile 'Etkinlik Önerileri' (4 madde): etkinlik başlıklı olan → 4", () => {
      expect(ev(`Sayın veli,\n\n## Evde Küçük Adımlar\n${bul(6, "Adım")}\n\n## Etkinlik Önerileri\n${bul(4)}\n\nSevgiler`).details.etkinlik).toBe(4);
    });
    it("üst başlık 'Evde Destek' altında '### Etkinlik Önerileri' (4 madde), '### Güçlü yönler' (3 madde), '### Not' (1 madde): 4 (alt başlık sayısı 3 değil)", () => {
      const t = `## Evde Destek\n### Etkinlik Önerileri\n${bul(4)}\n### Güçlü yönler\n${bul(3, "Yön")}\n### Not\n- tek`;
      expect(ev(t).details.etkinlik).toBe(4);
      expect(ev(t).scores.etkinlik_sayisi).toBe(1);
    });
    it("üst başlık 'Etkinlikler' altında tek eşleşen alt başlık: onun maddeleri; grup başlıkları ('Okuma etkinlikleri' 3 + 'Oyun etkinlikleri' 2) toplanır", () => {
      expect(ev(`## Etkinlikler\n### Etkinlik önerileri\n${bul(4)}\n### Güçlü yönler\n${bul(3, "Yön")}`).details.etkinlik).toBe(4);
      expect(ev(`## Etkinlikler\n### Okuma etkinlikleri\n${bul(3)}\n### Oyun etkinlikleri\n${bul(2)}`).details.etkinlik).toBe(5);
    });
    it("alt başlıklar etkinliğin KENDİ adıysa ('Etkinlik 1/2/3', 'Etkinlik: …') alt başlık sayısı etkinlik sayısıdır; ikisi de etkinlik adıysa iki", () => {
      expect(ev("## Etkinlikler\n### Etkinlik 1\n- Nasıl\n- Süre\n### Etkinlik 2\n- Nasıl\n- Süre\n### Etkinlik: Hece avı\n- Nasıl\n- Süre").details.etkinlik).toBe(3);
      expect(ev("## Etkinlikler\n### Etkinlik 1\n- Nasıl\n- Süre\n### Etkinlik 2\n- Nasıl\n- Süre").details.etkinlik).toBe(2);
    });
    it("çoğul 'Etkinlikler' / başlıkta ortada geçen 'etkinlik' bir etkinliğin adı değildir (gruptur): maddeleri sayılır; iç içe eşleşen alt bölüm iki kez sayılmaz", () => {
      expect(ev(`## Etkinlik önerileri\n### Etkinlikler (okuma)\n${bul(3)}\n### Etkinlikler (oyun)\n${bul(2)}`).details.etkinlik).toBe(5);
      expect(ev("## Etkinlikler\n### Okuma etkinlik\n- a\n- b\n### Oyun etkinlik\n- a\n- b\n### Rutin etkinlik\n- a\n- b").details.etkinlik).toBe(6);
      expect(ev(`## Etkinlikler\n### Okuma etkinlikleri\n#### Hece etkinlikleri\n${bul(4)}`).details.etkinlik).toBe(4);
    });
    it("eşleşen alt bölüm yoksa üç ve fazla alt başlık, maddeleri olsa da, etkinlik adlarıdır", () => {
      expect(ev("## Etkinlikler\n### Hece avı\n- Nasıl\n- Süre\n### Kart oyunu\n- Nasıl\n- Süre\n### Okuma saati\n- Nasıl\n- Süre").details.etkinlik).toBe(3);
    });
    it("dar başlık hiçbir etkinlik saymazsa geniş başlığa düşer; ikisi de yoksa en büyük liste bloğu", () => {
      expect(ev(`## Etkinlik notu\nSadece düzyazı.\n## Evde yapabilecekleriniz\n${bul(3)}`).details.etkinlik).toBe(3);
      expect(ev(`Sayın veli,\n\n${bul(4)}\n\nSevgiler`).details.etkinlik).toBe(4);
    });
  });
  it("başlıksız mektupta en büyük liste bloğu etkinliklerdir; iki ayrı liste varsa büyüğü alınır", () => {
    expect(ev(`Sayın veli,\n\nGüçlü yönleri:\n- a\n- b\n\nEvde şunları deneyin:\n${maddeler(4)}\n\nSevgiler`).details.etkinlik).toBe(4);
    expect(ev(`Sayın veli,\n\nİlk liste:\n${maddeler(2)}\n\nİkinci liste:\n${maddeler(3)}\n\nSevgiler`).details.etkinlik).toBe(3);
  });
  it("girintili alt maddeler üst maddeye katılır; gevşek liste (maddeler arası boş satır) tek bloktur", () => {
    const alt = Array.from({ length: 3 }, (_, i) => `- Etkinlik ${i + 1}\n  - Nasıl: kartla\n  - Süre: 5 dk`).join("\n");
    expect(ev(mektup(alt)).details.etkinlik).toBe(3);
    expect(ev(mektup("- a\n\n- b\n\n- c\n\n- d")).details.etkinlik).toBe(4);
  });
  it("kalın öncüllü paragraflar etkinliktir; tablo satırları etkinliktir; alt başlıklar (≥3) etkinliktir", () => {
    expect(ev(mektup(Array.from({ length: 4 }, (_, i) => `**Etkinlik ${i + 1}:** Hece kartlarıyla oyun.`).join("\n\n"))).details.etkinlik).toBe(4);
    expect(ev(mektup("| Etkinlik | Süre |\n|---|---|\n| Hece avı | 5 dk |\n| Kart oyunu | 5 dk |\n| Okuma | 10 dk |")).details.etkinlik).toBe(3);
    expect(ev("## Etkinlikler\n### Etkinlik 1\nHece avı.\n### Etkinlik 2\nKart oyunu.\n### Etkinlik 3\nOkuma saati.").details.etkinlik).toBe(3);
    // alt başlık altında maddeler: her etkinlik başlığı bir etkinliktir (maddeler ayrıntıdır)
    expect(ev("## Etkinlikler\n### Etkinlik 1\n- Nasıl: kartla\n- Süre: 5 dk\n### Etkinlik 2\n- Nasıl: oyunla\n- Süre: 5 dk\n### Etkinlik 3\n- Nasıl: sesle\n- Süre: 5 dk").details.etkinlik).toBe(3);
  });
  it("alt başlık ikiden azsa maddeler sayılır ('Hafta içi' / 'Hafta sonu'); maddesiz iki alt başlık iki etkinliktir", () => {
    expect(ev("## Evde destek\n### Hafta içi\n- a\n- b\n- c\n### Hafta sonu\n- d").details.etkinlik).toBe(4);
    expect(ev("## Etkinlikler\n### Hece avı\nKartlarla oyun.\n### Okuma\nBirlikte okuyun.").details.etkinlik).toBe(2);
  });
  it("yalnız kalın BAŞLIK satırları (altlarında madde/öncül yok) etkinlik sayılmaz; girintili devam satırları listeyi bölmez", () => {
    expect(ev(mektup("**Güçlü yönler**\n\nSözel anlatım.\n\n**Beklentiler**\n\nSabır.\n\n**Etkinlik önerileri**\n\nKart oyunu.\n\n**Kapanış**\n\nSevgiler")).details.etkinlik).toBe(0);
    expect(ev(mektup("**Güçlü yönler**\n**Beklentiler**\n**Teşekkür**\n**Kapanış**")).details.etkinlik).toBe(0);
    const devam = Array.from({ length: 4 }, (_, i) => `- Etkinlik ${i + 1}\n  (5 dk, hece kartı ile)`).join("\n");
    expect(ev(mektup(devam)).details.etkinlik).toBe(4);
  });
  it("düzyazı (liste yok) 0; boş metin 0 ve çökmez", () => {
    expect(ev(mektup("Evde her gün 10 dakika birlikte okuyabilirsiniz.")).scores.etkinlik_sayisi).toBe(0);
    expect(ev("").scores.etkinlik_sayisi).toBe(0);
  });
  it("amaç bilgilendirme / görüşme özeti: puan YOK (sabit değer döndürülmez), maddeler sayılmaz", () => {
    for (const amac of ["bilgilendirme", "gorusme_ozeti"] as const) {
      const r = kontrol(mektup(maddeler(9)), { amac });
      expect("etkinlik_sayisi" in r.scores).toBe(false);
    }
  });
});

describe("satır sonu koruması", () => {
  it("CRLF satır sonları sonucu değiştirmez", () => {
    const metin = mektup("- Etkinlik 1\n- Etkinlik 2\n- Etkinlik 3").replace("Sayın veli", "Çocuğunuz çok yaratıcıdır. Sayın veli");
    const crlf = metin.replace(/\n/g, "\r\n");
    const b = { amac: "ev_etkinligi" as const, mebHedefKod: "5.1.14" };
    expect(veliMektubuChecks({ body: b, text: crlf }).scores).toEqual(veliMektubuChecks({ body: b, text: metin }).scores);
  });
});

describe("çıktı sözleşmesi", () => {
  it("`talimat` döndürülmez; etiket_yok her zaman, meb_kod_yok yalnız kod varsa, etkinlik_sayisi yalnız ev etkinliğinde; sert hata yok", () => {
    expect(Object.keys(kontrol("x").scores).sort()).toEqual(["etiket_yok"]);
    expect(Object.keys(kontrol("x", { mebHedefKod: "5.1.14" }).scores).sort()).toEqual(["etiket_yok", "meb_kod_yok"]);
    const r = kontrol(mektup("- a\n- b\n- c"), { amac: "ev_etkinligi", mebHedefKod: "5.1.14" });
    expect(Object.keys(r.scores).sort()).toEqual(["etiket_yok", "etkinlik_sayisi", "meb_kod_yok"]);
    expect(r.details).toMatchObject({ etiket_yok: 1, meb_kod_yok: 1, etkinlik_sayisi: 1 });
    expect(r.hard).toEqual([]);
  });
});
