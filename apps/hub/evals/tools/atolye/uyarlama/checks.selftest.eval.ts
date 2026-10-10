// apps/hub/evals/tools/atolye/uyarlama/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { uyarlamaChecks } from "./checks";
describe("uyarlamaChecks", () => {
  it("en az 3 gerekçe → 1", () => {
    expect(uyarlamaChecks({ body: { ortam: "kaynastirma" }, text: "- a (Gerekçe: x)\n- b (gerekçe: y)\n- c — Gerekçe: z" }).scores.gerekce).toBe(1);
    expect(uyarlamaChecks({ body: { ortam: "kaynastirma" }, text: "- a\n- b" }).scores.gerekce).toBe(0);
  });
});

/* ── Ek kapsam: gerekçe biçimleri (prompt: 'Her madde için kısa gerekçe (hangi güçlüğe nasıl yardımcı)'), kapsam ve kapsama oranı ── */

const govde = { ortam: "kaynastirma" as const };
const kontrol = (text: string) => uyarlamaChecks({ body: govde, text });
const gerekce = (text: string) => kontrol(text).scores.gerekce;
/** Tek bir öneri bölümünde tek madde. */
const madde = (m: string) => `## Sunum uyarlamaları\n${m}`;

describe("gerekce: tek maddenin gerekçe biçimleri (kapsama 1)", () => {
  it.each([
    // etiketler
    "- Sesli okuma (Gerekçe: çözümleme yükünü azaltır)", "- Sesli okuma — Gerekçe: çözümleme yükünü azaltır", "- Sesli okuma. *Gerekçe:* çözümleme yükünü azaltır.", "- **Sesli okuma:** metin okunur. **Gerekçe:** yük azalır.",
    "- Sesli okuma. GEREKÇE: yük azalır.", "- Sesli okuma. Gerekçesi: yük azalır.", "- Sesli okuma (gerekçe yok değil, yük azalır)",
    "- Sesli okuma. Neden: okuma yükü azalır.", "- Sesli okuma. Neden - okuma yükü azalır.", "- Sesli okuma. Neden – okuma yükü azalır.", "- Sesli okuma. NEDEN: yük azalır.", "- Sesli okuma. Nedeni: yük azalır.", "- Sesli okuma. Sebep: yük azalır.", "- Sesli okuma. Sebebi: yük azalır.",
    "- Sesli okuma. Amaç: yük azaltmak.", "- Sesli okuma. Etki: okuma akıcılığı.", "- Sesli okuma. Fayda: yük.", "- Sesli okuma. Yarar: yük.",
    // doğal cümle işaretleri
    "- Sesli okuma yapılır, çünkü çözümleme yükü fazladır.", "- Sesli okuma yapılır; böylece çözümleme yükü azalır.", "- Sesli okuma yapılır, bu sayede çözümleme yükü azalır.", "- Sesli okuma yapılır; okuma yükü sayesinde azalır.",
    "- Sesli okuma, çözümleme güçlüğü nedeniyle önerilir.", "- Sesli okuma yapılır; dolayısıyla yük azalır.",
    // parantez ve kuyruk gerekçesi (parantez içi ≥ 12 karakter + açıklama sözcüğü)
    "- Sesli okuma (disleksideki çözümleme yükünü azaltır)", "- Sesli okuma (dikkat dağınıklığına destek olur)", "- Sesli okuma (okuma yükünü hafifletir)",
    "- Sesli okuma — disleksideki çözümleme yükünü azaltır", "- Sesli okuma – dikkat süresine destek olur", "- Sesli okuma → okuma yükünü azaltır", "- Sesli okuma -> okuma yükünü azaltır", "- Sesli okuma ⇒ yükü azaltır ve dikkati korur",
    "- Sesli okuma - okuma yükünü azaltır",
    // modelin doğal yazımları
    "- Görsel rutin kartı (geçişleri öngörülebilir kılar)", "- Kısa, tek adımlı yönerge — dikkat süresi kısa olduğu için", "- Sessiz köşe (uyaran fazlalığında kendini düzenlemesine yardımcı olur)",
    "- Sözlü yanıt → yazma yükü azalır", "- Ek süre tanınır; çözümleme hızı yavaş olduğundan", "- Ek süre tanınır; yazma hızı düşük olduğu için", "- Bölünmüş sınav (uzun oturumda yorgunluk ve dikkat kaybı yaşanır)",
    "- Formül kartı (bellek yükünü hafifletir)", "- Hesap makinesi izni – işlem akıcılığı güçlüğünü telafi eder",
    "- Sesli okuma (yük azalır)", "- Rutin kartı → dikkati korur", "- Rutin kartı (süreci rahat kılar)",
    // doğal cümle biçimleri: "bu da/bu nedenle/bu yüzden", ikinci cümle "Bu, …", iki nokta ve son cümle kuyruğu
    "- Sesli okuma yapılır, bu da dikkat dağılmasını azaltır", "- Sesli okuma yapılır; bu da yükü azaltır.", "- Sesli okuma yapılır, bu nedenle yük azalır", "- Sesli okuma yapılır, bu yüzden yorulma azalır",
    "- Sesli okuma yapılır. Bu, kelime tanımayı hızlandırır.", "- Sesli okuma yapılır — bu, kelime tanımayı hızlandırır.", "- Ek süre (güçlüğüne göre)", "- Kullanılan araç sensör. Yükü azaltır.",
    "- Sesli okuma yapılır. Bu, yükü hafifletir.", "- Sesli okuma yapılır. BU, yükü hafifletir.", "- Sesli okuma yapılır — bu, yükü hafifletir.",
    "- **Renkli kodlama:** b/d karışıklığını önler.", "- Renkli kodlama: b/d karışıklığını önler", "- Sesli okuma yapılır. Yükü azaltır.", "- Sesli okuma yapılır. Dikkat süresine destek olur.",
    "- Sesli okuma. Hangi güçlüğe: dikkat", "- Sesli okuma. Hangi güçlüğe nasıl yardımcı: okuma yükünü azaltır", "- Sesli okuma (hangi güçlüğe: dikkat)",
  ])("%s", (m) => expect(gerekce(madde(m))).toBe(1));

  it.each([
    "- Sesli okuma", "- Sesli okuma yapılır.", "- Sesli okuma (ör. ekran okuyucu)", "- Sesli okuma (örn. ekran okuyucu ile birlikte kullanılabilir)", "- Sesli okuma (vb. destekleyici araçlar yük azaltabilir)",
    "- Sesli okuma (günde 10 dakika, haftada 3 gün)", "- Sesli okuma (5. sınıf için)", "- Sesli okuma (kısa)", "- Sesli okuma — kısa", "- Sesli okuma - ek süre", "- Sesli okuma → ek süre tanınır",
    "- Sesli okuma; amaç belirtilmedi", "- Nedenleri aşağıdadır", "- Neden-sonuç ilişkisi kurma çalışması", "- Etki-tepki oyunu", "- Rutin kartı (renkli ve plastik)", "- Ek süre — yavaş okuma", "- Rutin kartı → dikkat toplanır", "- **Ek süre:** Okuma görevlerinde %50 ek süre verilir.", "- Sesli okuma: ör. ekran okuyucu ile birlikte kullanılabilir", "- Sesli okuma yapılır. Ek süre tanınır.",
    "- Sesli okuma vb. destekleyici araçlar kullanılır.", "- Sesli okuma yapılır, ör. destekleyici araçlar yük azaltabilir.", "- Bu uyarlama sınıfta uygulanır.", "- Okuma bu dakika yapılır", "- Sesli okuma: ör. araçlar yük azaltabilir", "- Ek süre 10 dk. destekleyici araçlar kullanılır", "- Bu, uygulamada uygulanır.", "- Sınav uyarlaması: yazılı sınav yapılır", "- Rutin kartı (dikkat)", "- Rutin kartı — dikkat", "- Okuma (yüksek sesle okunur)", "- Okuma (yükseltilmiş yazı tipi boyutu)", "- Ek süre (her sınavda 15 dakika)", "- Ek süre — her sınavda 15 dakika", "- Sesli okuma neden yapılır?", "- Açıklama yok",
  ])("gerekçe değil → 0: %s", (m) => expect(gerekce(madde(m))).toBe(0));
});

describe("gerekce: kuyruk biçimleri (iki nokta / son cümle / tire) yalnız ETKİ FİİLİYLE gerekçe sayılır; betimleyen pasif cümle ve güçlük adı değil", () => {
  const betimleme = [
    "- **Ek süre:** Okuma görevlerinde ek süre sağlanır.", "- **Görsel destek:** Metinlere görsel destek eklenir ve konu görselle desteklenir.", "- **Yönerge bölme:** Yönergeler adım adım verilir.",
    "- **Dikkat dağıtıcılar:** Dikkat dağıtıcı nesneler masadan kaldırılır.", "- **Yer seçimi:** Öğrenci öğretmene yakın oturtulur.", "- **Sözlü yanıt:** Yazı yerine sözlü anlatım kabul edilir.",
    "- **Hesap makinesi:** İşlem sorularında hesap makinesi kullanılır.", "- **Formül kartı:** Sınavda formül kartı verilir.", "- **Mola:** Her 10 dakikada kısa mola artırılır.",
    "- **Büyük punto:** Metinler büyük puntoyla basılır ve satır aralığı artırılır.", "- **Sessiz köşe:** Gerektiğinde sessiz bir köşe sağlanır.", "- **Sesli okuma:** Sorular sesli okunur. Dikkatli uygulanmalıdır.",
  ];
  const hepsi = `## Sunum uyarlamaları\n${betimleme.join("\n")}`;
  it("12 maddelik gerekçesiz liste (betimleyen cümleler, pasif 'sağlanır/desteklenir/artırılır', 'dikkat' sözcüğü) gerekçe puanı 0", () => {
    expect(betimleme).toHaveLength(12);
    expect(kontrol(hepsi).details).toMatchObject({ gerekce_madde: 12, gerekce_sayisi: 0 });
    expect(gerekce(hepsi)).toBe(0);
  });
  it.each(betimleme)("tek başına gerekçe değil → 0: %s", (m) => expect(gerekce(madde(m))).toBe(0));
  // 'destek olarak' (= bir destek türü olarak) ve 'yönler' (içinde 'önler') etki fiili değildir
  it.each([
    "- **Görsel:** Görsel destek olarak resim eklenir.", "- **Yön kartı:** Yönler oklarla gösterilir.", "- **Yer:** Sıra düzeni sınıfın yönlerine göre kurulur. Yönler tahtada yazılıdır.",
  ])("yakın sözcük tuzağı → 0: %s", (m) => expect(gerekce(madde(m))).toBe(0));
  it.each([
    "- **Ek süre:** Okuma görevlerinde ek süre verilir; yükü azaltır.", "- **Görsel destek:** Metne görsel eklenir. Okuma yükünü hafifletir.", "- Sessiz köşe: kendini düzenlemesine yardımcı olur",
    "- Formül kartı — bellek yükünü azaltır", "- Mola → dikkat süresine destek olur", "- **Sesli okuma:** Sorular sesli okunur. Çözümleme yükünü telafi eder.", "- Büyük punto: satır takibini kolaylaştırır",
    "- Yer seçimi: dikkat dağınıklığını önler", "- Sözlü yanıt: yazma güçlüğünü engeller", "- Sınav bölme: yorgunluğu azaltabilir", "- Hesap makinesi: işlem yükünü hafifletir", "- Rutin kartı: geçişleri öngörülebilir kılar",
    "- Ek süre: okuma hızını destekler", "- Mola: odağı korur", "- Kısa görev: motivasyonu artırır", "- Yönerge bölme: çok adımlı yönergede kaybolmayı önler", "- Sakin köşe: kendini toplamasını sağlar",
  ])("etki fiili taşıyan kuyruk gerekçedir → 1: %s", (m) => expect(gerekce(madde(m))).toBe(1));
});

/* ── Yüklem biçimi kuralı (kuyruk biçimleri: iki nokta / son cümle / tire-ok / noktalı virgül) ──
   Kuyruk, son sözcüğü ETKEN çekimli fiil (geniş zaman "…ır/er/ar/ür", ek-fiil "-dır/-tır") olduğunda gerekçedir; edilgen (-ıl-/-ın-), çoğul ad (-lar/-ler),
   gereklilik/sıfat ("-malıdır", "-lıdır") ve özne olarak uygulayıcı adıyla başlayan ("Öğretmen ek süre sağlar.") kuyruk betimlemedir.
   Aşağıdaki cümleler iki gözden geçiricinin sondalarıdır (aynen). */
describe("gerekce: kuyruk — yüklem biçimi kuralı, gözden geçiricilerin sondaları", () => {
  const kuyruk = (t: string) => gerekce(madde(`- **Uyarlama:** ${t}`));
  /** Kalite gözden geçiricisinin prototip sondası: gerekçe olan kuyruklar (22). */
  const UYUMLU = [
    "motivasyonu yükseltir.", "okuma hatalarını düşürür.", "Okuma hızı artar.", "hata sayısı düşer", "çözümleme yükünü ortadan kaldırır.", "zaman baskısını en aza indirir.", "kaygıyı düşürür.",
    "geçişlerde öngörülebilirlik yaratır.", "bildiğini göstermesine olanak tanır.", "bilgisini göstermesine fırsat verir.", "yorgunluğu giderir.", "katılımı teşvik eder.", "b/d ayrımını netleştirir.",
    "bilgiyi yapılandırır.", "işlem yükünü üstlenir, problem çözmeye zaman kazandırır.", "çalışma belleğinin aşırı yüklenmesine engel olur.", "görsel karmaşayı giderir.",
    "işlemleme hızı yavaş olan öğrenciye yeterli süre tanır.", "okumayı akıcı hale getirir.", "okuma becerisi güçlenir.", "b/d karışıklığını önler.", "bilgiyi düzenlemesine yardımcı olur.",
  ];
  /** Şartname gözden geçiricisinin kaçırılanlar listesi (13). */
  const KACANLAR = [
    "Dikkati canlı tutar", "Dikkat süresini uzatır", "Yorgunluğu giderir", "Kaygıyı düşürür", "Bellek yükünü düşürür", "Formülleri ezberleme yükünden kurtarır", "Bilgisini göstermesine olanak tanır",
    "Yükü paylaştırır", "Geçişleri öngörülebilir hale getirir", "Güven verir", "Öğrenci rahatlar", "Zaman baskısı kalkar", "Zaman baskısını ortadan kaldırır",
  ];
  /** Betimleme (20): gerekçe değil. İki "BİLİNEN SINIR" kuyruğu (etken geniş zamanla biten betimleme) sayılır. */
  const BETIMLEME = [
    "Sınavlarda %50 ek süre sağlanır.", "Yönergeler resimli kartlarla desteklenir.", "Öğrenci tahtaya yakın oturur. Dikkat dağıtıcılardan uzak tutulur.", "Okuma görevlerinde süre artırılır.",
    "Öğretmen ek süre sağlar.", "Öğretmen renkli kart sağlar.", "Görev 3 parçaya bölünür; her parçadan sonra mola artırılır.", "Akran okuma desteği sağlar.", "Yazılı yönergeler öğretmen tarafından sesli okunur.",
    "Çalışma kâğıtları 14 punto ile hazırlanır.", "Yazılı yerine sözlü yanıt kabul edilir.", "Sınavda formül kartı kullanmasına izin verilir.", "İşlem adımlarında hesap makinesi desteği verilir.",
    "Bir akranla eşleştirilir.", "renkli kartlar", "ek süre tanınır", "her sınavda 15 dakika", "yazılı sınav yapılır", "sınav süresi %50 uzar.", "yönerge tek adım içerir.",
  ];
  const BILINEN_SINIR = ["sınav süresi %50 uzar.", "yönerge tek adım içerir."];

  it.each(UYUMLU)("uyumlu kuyruk gerekçedir → 1: %s", (t) => expect(kuyruk(t)).toBe(1));
  it.each(KACANLAR)("kaçırılan uyumlu kuyruk → 1: %s", (t) => expect(kuyruk(t)).toBe(1));
  it.each(BETIMLEME.filter((t) => !BILINEN_SINIR.includes(t)))("betimleme gerekçe değildir → 0: %s", (t) => expect(kuyruk(t)).toBe(0));
  it.each(BILINEN_SINIR)("BİLİNEN SINIR: etken geniş zamanla biten betimleme kuyruğu gerekçe sayılır (yüklem biçimi kuralının yanlış kabulü): %s", (t) => expect(kuyruk(t)).toBe(1));
  it("sayım: uyumlu 22/22 ve 13/13; betimleme en çok 2/20 (yalnız iki bilinen sınır)", () => {
    expect(UYUMLU.filter((t) => kuyruk(t) === 1)).toHaveLength(UYUMLU.length);
    expect(KACANLAR.filter((t) => kuyruk(t) === 1)).toHaveLength(KACANLAR.length);
    expect(BETIMLEME).toHaveLength(20);
    expect(BETIMLEME.filter((t) => kuyruk(t) === 1)).toEqual(BILINEN_SINIR);
  });

  it("kalite gözden geçiricisinin 30 uyumlu kuyruğu (madde biçiminde): hepsi gerekçe", () => {
    const C = [
      "- Metni hecelere bölün, bu da okuma hızını artırır.", "- Metni hecelere bölün; böylece hata sayısı düşer.", "- İlgi alanı temalı görev verin; motivasyonu yükseltir.",
      "- İlgi alanı temalı görev — motivasyonu yükseltir.", "- **İlgi temalı görev:** motivasyonu yükseltir.", "- İlgi temalı görev verilir. Motivasyonu yükseltir.", "- Hece kartları — okuma hatalarını düşürür.",
      "- **Hece kartları:** okuma hatalarını düşürür.", "- Metni hecelere bölün. Okuma hızı artar.", "- Metni hecelere bölün — hata sayısı düşer.", "- **Sesli okuma:** çözümleme yükünü ortadan kaldırır.",
      "- **Ek süre:** zaman baskısını en aza indirir.", "- **Sessiz köşe:** kaygıyı düşürür.", "- **Görsel program:** geçişlerde öngörülebilirlik yaratır.", "- **Sözlü yanıt:** bildiğini göstermesine olanak tanır.",
      "- **Sözlü yanıt:** bilgisini göstermesine fırsat verir.", "- **Formül kartı:** bellek yükünü alır, işleme odaklanır.", "- **Bölünmüş sınav:** yorgunluğu giderir.", "- **Akran desteği:** katılımı teşvik eder.",
      "- **Renkli kodlama:** b/d ayrımını netleştirir.", "- **Grafik düzenleyici:** bilgiyi yapılandırır.", "- **Hesap makinesi:** işlem yükünü üstlenir, problem çözmeye zaman kazandırır.",
      "- **Kısa yönerge:** çalışma belleğinin aşırı yüklenmesine engel olur.", "- **Büyük punto:** görsel karmaşayı giderir.", "- **Ön sıra:** dikkatini toplamasına katkı sağlar.",
      "- **Ek süre:** okuma hızındaki yavaşlığı dengeler.", "- **Sesli okuma:** anlamaya odaklanmasını mümkün kılar.", "- **Sesli okuma:** disleksiye bağlı çözümleme güçlüğünü telafi eder.",
      "- **Ek süre:** işlemleme hızı yavaş olan öğrenciye yeterli süre tanır.", "- **Hece kartları:** okumayı akıcı hale getirir.",
    ];
    expect(C).toHaveLength(30);
    expect(C.filter((m) => gerekce(madde(m)) === 1)).toEqual(C);
  });
  it("kalite gözden geçiricisinin 8 gerekçesiz betimlemesi: hepsi 0 (uygulayıcı adıyla başlayan 'sağlar' cümleleri dahil)", () => {
    const D = [
      "- **Ek süre:** Sınavlarda %50 ek süre sağlanır.", "- **Görsel destek:** Yönergeler resimli kartlarla desteklenir.", "- **Ön sıra:** Öğrenci tahtaya yakın oturur. Dikkat dağıtıcılardan uzak tutulur.",
      "- **Ek süre:** Okuma görevlerinde süre artırılır.", "- **Ek süre:** Öğretmen ek süre sağlar.", "- **Materyal:** Öğretmen renkli kart sağlar.",
      "- **Bölünmüş görev:** Görev 3 parçaya bölünür; her parçadan sonra mola artırılır.", "- **Okuma desteği:** Akran okuma desteği sağlar.",
    ];
    expect(D.filter((m) => gerekce(madde(m)) === 1)).toEqual([]);
  });

  describe("yüklem biçimi: kural kenarları", () => {
    it.each([
      ["edilgen -ıl-/-ın-", "okuma görevinde ek süre tanınır"], ["edilgen -ıl-", "metin sesli okunur"], ["edilgen -n-", "yönergeler adım adım bölünür"],
      ["gereklilik -malıdır", "dikkatli uygulanmalıdır"], ["sıfat/ortaç -lıdır", "yönler tahtada yazılıdır"], ["çoğul ad", "renkli kartlar ve bilgiler"], ["çoğul ad -ler", "yapılandırılmış çizelgeler"],
      ["uygulayıcı adıyla başlar: öğretmen", "öğretmen anlaşıldığını kontrol eder"], ["uygulayıcı adıyla başlar: veli", "veli evde çalışmayı destekler"], ["uygulayıcı adıyla başlar: akran", "akran okuma desteği sağlar"],
      ["uygulayıcı adıyla başlar: aile", "aile günlük rutini takip eder"], ["uygulayıcı adıyla başlar: uzman", "uzman değerlendirme yapar"], ["uygulayıcı adıyla başlar: ebeveyn", "ebeveyn ek süre tanır"],
      ["tek sözcük", "yükseltir"], ["ad cümlesi", "yazılı sınav süresi"], ["'yer' (ad)", "dikkat dağıtıcılardan uzak bir yer"], ["'kadar' (edat)", "her gün 10 dakika kadar"],
      ["geçmiş zaman", "görevi bitirdi"],
    ])("%s → 0: %s", (_ad, t) => expect(kuyruk(t)).toBe(0));
    it.each([
      ["geniş zaman -ır", "okuma yükünü hafifletir"], ["-ar", "okuma hızı artar"], ["-er", "hata sayısı düşer"], ["-ür", "kaygıyı düşürür"], ["-ur", "kendini güvende hisseder ve rahat olur"],
      ["ek-fiil -dır", "okuma hızı yavaştır"], ["ek-fiil -dir", "dikkat süresi kısadır ve görev uzundur"], ["-abilir (etken)", "yükü azaltabilir"], ["-ebilir (etken)", "yorgunluğu önleyebilir"],
      ["istisna etken 'tanır'", "öğrenciye yeterli süre tanır"], ["istisna etken 'kazanır'", "okuma özgüveni kazanır"], ["istisna etken 'güçlenir'", "işitsel dikkati güçlenir"],
      ["bulur", "yeterli zaman bulur"], ["olur", "motivasyonuna katkı olur"],
    ])("%s → 1: %s", (_ad, t) => expect(kuyruk(t)).toBe(1));
    it("etken -abilir/-ebilir (fiil listesinde olmayan fiillerle): giderebilir/düşürebilir/bulabilir gerekçe; edilgen -ılabilir değil", () => {
      expect(kuyruk("yorgunluğu giderebilir")).toBe(1);
      expect(kuyruk("kaygıyı düşürebilir")).toBe(1);
      expect(kuyruk("yeterli zaman bulabilir")).toBe(1); // 'bul' köküne -ul- edilgeni gibi görünür ama etkendir
      expect(kuyruk("yeterli zaman verilebilir")).toBe(0);
      expect(kuyruk("görev parçalara bölünebilir")).toBe(0);
    });
    it("etken fiil istisnaları ve çoğul-görünümlü etken fiiller: 'bilir', 'rahatlar', 'toparlar' evet; çoğul ad 'kartlar' hayır", () => {
      expect(kuyruk("sonucu önceden bilir")).toBe(1);
      expect(kuyruk("çocuk rahatlar")).toBe(1);
      expect(kuyruk("kendini hızla toparlar")).toBe(1);
      expect(kuyruk("renkli kartlar")).toBe(0);
    });
    it("edilgen -abilir ('kullanılabilir') değil, etken -abilir ('azaltabilir') sayılır", () => {
      expect(kuyruk("ekran okuyucu ile kullanılabilir")).toBe(0);
      expect(kuyruk("yükü azaltabilir")).toBe(1);
    });
    it("öğrenci özneli kuyruk yalnız öğrenciye ait SONUÇ fiiliyle gerekçedir ('Öğrenci rahatlar' evet, 'Öğrenci tahtaya yakın oturur' hayır)", () => {
      expect(kuyruk("Öğrenci rahatlar")).toBe(1);
      expect(kuyruk("Öğrenci özgüven kazanır")).toBe(1);
      expect(kuyruk("Öğrenci tahtaya yakın oturur")).toBe(0);
      expect(kuyruk("Öğrenci grupla çalışır")).toBe(0);
    });
    it("uygulayıcı adı NESNE ise özne değildir: 'öğrenciye yeterli süre tanır' (yönelme eki) gerekçedir", () => {
      expect(kuyruk("öğrenciye yeterli süre tanır")).toBe(1);
      expect(kuyruk("öğretmeni rahatlatır ve yükü azaltır")).toBe(1);
    });
    it("uygulayıcı çoğulu da özne: 'Veliler evde çalışmayı destekler', 'Öğretmenler ek süre tanır'", () => {
      expect(kuyruk("Veliler evde çalışmayı destekler")).toBe(0);
      expect(kuyruk("Öğretmenler ek süre tanır")).toBe(0);
    });
    it("noktalı virgül sonrası kuyruk", () => {
      expect(gerekce(madde("- İlgi alanı temalı görev verin; motivasyonu yükseltir."))).toBe(1);
      expect(gerekce(madde("- Görevi bölün; her parça kısa tutulur."))).toBe(0);
    });
    it("ikinci yol (fiil listesi) uygulayıcı kuralına tabidir: 'Öğretmen yükü azaltır' gerekçe değil", () => {
      expect(kuyruk("Öğretmen yükü azaltır")).toBe(0);
      expect(kuyruk("Akran dikkati korur")).toBe(0);
    });
  });
});

describe("gerekce: 'yardım ettiği güçlük' etiketi", () => {
  it.each([
    "- Yönergeyi bölün → Yardım ettiği güçlük: dikkat", "- Yönergeyi bölün. Yardım ettiği güçlük: dikkat.", "- Yönergeyi bölün (yardımcı olduğu güçlük: dikkat)", "- Yönergeyi bölün — Yardımcı olduğu güçlük: dikkat",
  ])("%s", (m) => expect(gerekce(madde(m))).toBe(1));
  it("kardeş madde olarak etiket ayrı öneri sayılmaz", () => {
    expect(kontrol(madde("- Yönergeyi bölün\n- Yardım ettiği güçlük: dikkat")).details).toMatchObject({ gerekce_madde: 1, gerekce_sayisi: 1 });
    expect(kontrol(madde("- Yönergeyi bölün\n- Yardımcı olduğu güçlük - dikkat")).details).toMatchObject({ gerekce_madde: 1, gerekce_sayisi: 1 });
  });
});

describe("gerekce: 'yardım ettiği güçlük' çekimli biçimi", () => {
  it("işaret tek başına yeter: 'güçlüğe' (ünsüz yumuşaması) de sayılır", () => {
    expect(gerekce(madde("- Sesli okuma, yardım ettiği güçlüğe göre seçilir"))).toBe(1);
    expect(gerekce(madde("- Sesli okuma, yardımcı olduğu güçlüğü belirler"))).toBe(1);
    expect(gerekce(madde("- Sesli okuma, yardım ettiği güçlük"))).toBe(1);
  });
});

describe("gerekce: yerleşim", () => {
  it("alt madde gerekçesi üst maddeye katılır (1 madde, 1 gerekçe)", () => {
    expect(gerekce(madde("- Sesli okuma\n  - Gerekçe: yük azalır"))).toBe(1);
  });
  it("'Neden-sonuç', 'Etki-tepki' gibi bitişik tireli sözcükle başlayan madde gerekçe etiketi değil, ayrı bir öneridir", () => {
    expect(kontrol(madde("- Sesli okuma (Gerekçe: yük azalır)\n- Neden-sonuç ilişkisi kartları")).details).toMatchObject({ gerekce_madde: 2, gerekce_sayisi: 1 });
    expect(kontrol(madde("- Sesli okuma (Gerekçe: yük azalır)\n- Etki-tepki oyunu")).details).toMatchObject({ gerekce_madde: 2, gerekce_sayisi: 1 });
  });
  it("kardeş madde olarak gerekçe: ayrı öneri sayılmaz ('Gerekçe:' ile başlayan madde)", () => {
    const r = kontrol(madde("- Sesli okuma\n- *Gerekçe:* yük azalır\n- Ek süre\n- **Neden:** işlem hızı"));
    expect(r.scores.gerekce).toBe(1);
    expect(r.details).toMatchObject({ gerekce_madde: 2, gerekce_sayisi: 2 });
    // etiket çekimli ya da eş anlamlı da olsa kardeş gerekçe maddesi ayrı öneri sayılmaz
    for (const etiket of ["Gerekçesi:", "Nedeni:", "Sebep:", "Sebebi:", "Amaç:", "Etki:", "Neden –", "Neden -"]) {
      expect(kontrol(madde(`- Sesli okuma\n- ${etiket} yük azalır`)).details, etiket).toMatchObject({ gerekce_madde: 1, gerekce_sayisi: 1 });
    }
  });
  it("maddenin ardından gelen girintisiz gerekçe paragrafı sayılır; giriş cümlesindeki 'gerekçe' sözcüğü sayılmaz", () => {
    expect(gerekce(madde("- Sesli okuma\n\n*Gerekçe:* yük azalır."))).toBe(1);
    expect(gerekce(madde("Her madde için gerekçe verilmiştir.\n- Sesli okuma"))).toBe(0);
  });
  it("gerekçe sütunlu tablo: her dolu gerekçe hücreli satır bir gerekçe", () => {
    const t = (g: string) => `## Sunum uyarlamaları\n| Uyarlama | ${g} |\n|---|---|\n| Sesli okuma | Çözümleme yükünü azaltır |\n| Görsel organizatör | Dikkati toplar |`;
    for (const g of ["Gerekçe", "Neden", "Sebep", "Nasıl yardımcı olur", "Etki", "Amaç"]) expect(gerekce(t(g)), g).toBe(1);
    expect(gerekce(t("Süre"))).toBe(0);
    expect(gerekce("## Sunum uyarlamaları\n| Uyarlama | Gerekçe |\n|---|---|\n| Sesli okuma | |\n| Görsel organizatör | - |")).toBe(0);
    expect(gerekce("## Sunum uyarlamaları\n| Uyarlama | Gerekçe |\n|---|---|\n| Sesli okuma | Yük azalır |\n| Görsel organizatör | |")).toBeCloseTo(0.5);
  });
  it("tablo başlığı gerekçe sütununu taşısa da başlık satırı madde/gerekçe sayılmaz", () => {
    const r = kontrol("## Sunum uyarlamaları\n| Uyarlama | Gerekçe |\n|---|---|\n| Sesli okuma | Yük azalır |");
    expect(r.details).toMatchObject({ gerekce_madde: 1, gerekce_sayisi: 1 });
  });
  it("gerekçe sütunu adları: 'Hangi güçlüğe yardımcı', 'Açıklama', 'Güçlük', 'Yardımcı olduğu alan'", () => {
    const t = (g: string) => `## Sunum uyarlamaları\n| Uyarlama | ${g} |\n|---|---|\n| Sesli okuma | Çözümleme yükünü azaltır |\n| Görsel organizatör | Dikkati toplar |`;
    for (const g of ["Hangi güçlüğe yardımcı", "Açıklama", "Güçlük", "Yardımcı olduğu alan", "Hangi güçlüğe"]) expect(gerekce(t(g)), g).toBe(1);
  });
  it("'Hangi güçlüğe:' etiketli kardeş madde ayrı öneri sayılmaz (gerekçesidir)", () => {
    expect(kontrol(madde("- Sesli okuma\n- Hangi güçlüğe: dikkat")).details).toMatchObject({ gerekce_madde: 1, gerekce_sayisi: 1 });
    expect(kontrol(madde("- Sesli okuma\n  - Hangi güçlüğe: dikkat\n- Ek süre\n- Hangi güçlüğe - yavaş okuma")).details).toMatchObject({ gerekce_madde: 2, gerekce_sayisi: 2 });
  });
  it("ayrı 'Gerekçeler' bölümü kalın etiketli paragraflarla yazılmış: her etiketli paragraf bir gerekçe", () => {
    const oneriler = "## Sunum uyarlamaları\n- Sesli okuma\n- Görsel organizatör\n";
    expect(gerekce(`${oneriler}## Gerekçeler\n**Sesli okuma:** çözümleme yükünü azaltır.\n**Görsel organizatör:** dikkati toplar.`)).toBe(1);
    expect(gerekce(`${oneriler}## Gerekçeler\n**Sesli okuma:** çözümleme yükünü azaltır.`)).toBeCloseTo(0.5);
    expect(gerekce(`${oneriler}## Gerekçeler\nSesli okuma: yük azalır.\nGörsel organizatör: dikkati toplar.`)).toBe(1);
    // kalın etiket + açıklama (iki nokta olmadan) da etiketli paragraftır; içeriği olmayan kalın alt başlık gerekçe değildir
    expect(gerekce(`${oneriler}## Gerekçeler\n**Sesli okuma** çözümleme yükünü azaltır.\n**Görsel organizatör** dikkati toplar.`)).toBe(1);
    expect(gerekce(`${oneriler}## Gerekçeler\n**Sesli okuma**\n**Görsel organizatör**\nDikkati toplar.`)).toBeCloseTo(0.5);
    // başlık sayılan kalın etiket + altında açıklama paragrafı: alt bölüm tek gerekçe
    expect(gerekce(`${oneriler}## Gerekçeler\n**Sesli okuma**\nÇözümleme yükünü azaltır.\n**Görsel organizatör**\nDikkati toplar.`)).toBe(1);
    expect(gerekce(`${oneriler}**Gerekçeler**\n**Sesli okuma**\nÇözümleme yükünü azaltır.\n**Görsel organizatör**\nDikkati toplar.`)).toBe(1);
    // giriş cümlesi ve etiketsiz paragraf gerekçe sayılmaz
    expect(gerekce(`${oneriler}## Gerekçeler\nAşağıda her uyarlamanın gerekçesi verilmiştir.`)).toBe(0);
  });
  it("'Gerekçeler' bölümünün altında gerekçe adlı bir alt başlık olsa da sonraki kardeş alt başlıklar bölümün parçası kalır", () => {
    const oneriler = "## Sunum uyarlamaları\n- Sesli okuma\n- Görsel organizatör\n";
    expect(gerekce(`${oneriler}## Gerekçeler\n### Gerekçe notu\n- Sesli okuma: yük\n### Görsel organizatör\n- dikkat`)).toBe(1);
  });
  it("ayrı 'Gerekçeler' bölümü: her maddesi bir gerekçe", () => {
    const t = "## Sunum uyarlamaları\n- Sesli okuma\n- Görsel organizatör\n## Yanıt/çıktı uyarlamaları\n- Sözlü yanıt\n## Gerekçeler\n- Sesli okuma: yük\n- Görsel organizatör: dikkat\n- Sözlü yanıt: yazma yükü";
    expect(gerekce(t)).toBe(1);
    expect(gerekce(t.replace("- Sözlü yanıt: yazma yükü", ""))).toBeCloseTo(2 / 3);
    expect(gerekce(t.replace("## Gerekçeler\n", "## Notlar\n"))).toBe(0); // 'Notlar' gerekçe bölümü değil, öneri değil: maddeleri öneri sayılmaz
  });
  it("gerekçe bölümü alt başlıklarıyla birlikte sayılır", () => {
    expect(gerekce("## Sunum uyarlamaları\n- a\n- b\n## Gerekçeler\n### Sunum\n- a: x\n- b: y")).toBe(1);
  });
});

describe("gerekce: kapsama oranı = gerekçe sayısı / öneri maddesi sayısı (en çok 1)", () => {
  const bes = (g: number) => ["## Sunum uyarlamaları", ...Array.from({ length: 5 }, (_, i) => `- Madde ${i + 1}${i < g ? " (Gerekçe: x)" : ""}`)].join("\n");
  it.each([[0, 0], [1, 0.2], [2, 0.4], [3, 0.6], [4, 0.8], [5, 1]])("5 maddeden %d gerekçeli → %d", (g, beklenen) => expect(gerekce(bes(g))).toBeCloseTo(beklenen));
  it("gerekçe sayısı madde sayısını aşsa da en çok 1", () => {
    expect(gerekce(madde("- a (Gerekçe: x) Neden: y çünkü z"))).toBe(1);
    expect(kontrol(madde("- a (Gerekçe: x)\n- *Gerekçe:* y\n- *Gerekçe:* z")).scores.gerekce).toBe(1);
  });
  it("dört öneri bölümünün maddeleri birlikte sayılır; sonuç ayrıntıda", () => {
    const t = "## Sunum uyarlamaları\n- a (Gerekçe: x)\n## Yanıt/çıktı uyarlamaları\n- b (Gerekçe: y)\n## Ortam/zaman uyarlamaları\n- c\n## Değerlendirme/sınav uyarlamaları\n- d";
    expect(gerekce(t)).toBeCloseTo(0.5);
    expect(kontrol(t).details).toMatchObject({ gerekce_madde: 4, gerekce_sayisi: 2, gerekce: 0.5 });
  });
});

describe("gerekce: kapsam (hangi maddeler öneridir)", () => {
  it("bağlam özeti maddeleri öneri değildir ('ortam' sözcüğü başlıkta geçse bile)", () => {
    const t = "## 1. Bağlam özeti (güçlük profili × ders × ortam)\n- Öğrenci disleksi ve DEHB profilinde.\n- Ders: Türkçe\n## 2. Sunum uyarlamaları\n- a (Gerekçe: x)";
    expect(kontrol(t).details).toMatchObject({ gerekce_madde: 1, gerekce_sayisi: 1 });
    expect(gerekce(t)).toBe(1);
  });
  it("'ortam' ve 'zaman' başlıklı bölümler de öneri bölümüdür (başka öneri bölümü varken; hiç yoksa tüm metin sayılacağı için ayırt edilemez)", () => {
    expect(kontrol("## Sunum uyarlamaları\n- a (Gerekçe: x)\n## Zaman düzenlemeleri\n- b\n- c").details).toMatchObject({ gerekce_madde: 3, gerekce_sayisi: 1 });
    expect(kontrol("## Sunum uyarlamaları\n- a (Gerekçe: x)\n## Ortam düzenlemeleri\n- b\n- c").details).toMatchObject({ gerekce_madde: 3, gerekce_sayisi: 1 });
    expect(kontrol("## Yanıt uyarlamaları\n- a (Gerekçe: x)\n## Sunum düzenlemeleri\n- b").details).toMatchObject({ gerekce_madde: 2, gerekce_sayisi: 1 });
    expect(kontrol("## Sunum uyarlamaları\n- a (Gerekçe: x)\n## Sınav uyarlamaları\n- b").details).toMatchObject({ gerekce_madde: 2, gerekce_sayisi: 1 });
    expect(kontrol("## Sunum uyarlamaları\n- a (Gerekçe: x)\n## Çıktı uyarlamaları\n- b").details).toMatchObject({ gerekce_madde: 2, gerekce_sayisi: 1 });
  });
  it("alt başlıklar üst öneri bölümüne dahildir; sonraki üst düzey bölüm kapsam dışına çıkarsa sayılmaz", () => {
    const t = "## Sunum uyarlamaları\n### Metin\n- a (Gerekçe: x)\n### Görsel\n- b\n## Kaynaklar\n- c\n- d";
    expect(kontrol(t).details).toMatchObject({ gerekce_madde: 2, gerekce_sayisi: 1 });
  });
  it("kalın sözde başlıklar: öneri bölümü kalınsa kalın alt etiketler bölüme dahildir; şablon başlığında biter", () => {
    const t = "**Sunum uyarlamaları**\n**Metin desteği**\n- a (Gerekçe: x)\n**Yanıt/çıktı uyarlamaları**\n- b\n**Bağlam notu**\n- c";
    expect(kontrol(t).details).toMatchObject({ gerekce_madde: 2, gerekce_sayisi: 1 });
  });
  it("önerilerin başlık adı sapmışsa (hiç öneri bölümü yok) metnin tamamındaki maddeler sayılır", () => {
    expect(kontrol("## Öneriler\n- a (Gerekçe: x)\n- b").details).toMatchObject({ gerekce_madde: 2, gerekce_sayisi: 1 });
    expect(kontrol("- a (Gerekçe: x)\n- b").scores.gerekce).toBeCloseTo(0.5);
  });
  it("bölüm başlıkları numaralı/kalın/büyük harfli de olsa tanınır", () => {
    expect(gerekce("## 2. SUNUM UYARLAMALARI\n- a (Gerekçe: x)")).toBe(1);
    expect(gerekce("**3. Yanıt/çıktı uyarlamaları**\n- a (Gerekçe: x)\n- b")).toBeCloseTo(0.5);
    expect(gerekce("### Değerlendirme / Sınav uyarlamaları\n- a (Gerekçe: x)")).toBe(1);
  });
});

describe("gerekce: düzyazı ve boş metin", () => {
  it("madde yok: metindeki gerekçe işareti sayısı en az 3 ise 1", () => {
    expect(gerekce("Metin sesli okunur çünkü çözümleme yükü fazladır. Ek süre verilir çünkü işlem yavaştır. Sözlü yanıt alınır, gerekçe: yazma güçlüğü.")).toBe(1);
    expect(gerekce("Metin sesli okunur çünkü çözümleme yükü fazladır. Ek süre verilir çünkü işlem yavaştır.")).toBe(0);
    expect(gerekce("## Sunum uyarlamaları\nSesli okuma. Gerekçe: a.\nEk süre. Gerekçe: b.\nSözlü yanıt. Gerekçe: c.")).toBe(1); // paragraf etiketleri
  });
  it("madde yok ama ayrı 'Gerekçeler' bölümünde en az 3 madde: gerekçe sayısı eşiği geçer", () => {
    expect(gerekce("## Sunum uyarlamaları\nSesli okuma.\n## Gerekçeler\n- a\n- b\n- c")).toBe(1);
    expect(gerekce("## Sunum uyarlamaları\nSesli okuma.\n## Gerekçeler\n- a\n- b")).toBe(0);
  });
  it("boş / gürültü: 0, çökmez", () => {
    expect(gerekce("")).toBe(0);
    expect(gerekce("   \n\n")).toBe(0);
    expect(gerekce("## Sunum uyarlamaları")).toBe(0);
    expect(gerekce("## Gerekçeler")).toBe(0);
    expect(kontrol("").details).toMatchObject({ gerekce_madde: 0, gerekce_sayisi: 0 });
  });
});

describe("çıktı sözleşmesi", () => {
  it("`talimat` döndürülmez; yalnız gerekce; ayrıntılar puanı yansıtır; sert hata yok", () => {
    const r = kontrol(madde("- a (Gerekçe: x)"));
    expect(Object.keys(r.scores)).toEqual(["gerekce"]);
    expect(r.scores).toEqual({ gerekce: 1 });
    expect(r.details).toMatchObject({ gerekce: 1, gerekce_madde: 1, gerekce_sayisi: 1 });
    expect(r.hard).toEqual([]);
  });
});
