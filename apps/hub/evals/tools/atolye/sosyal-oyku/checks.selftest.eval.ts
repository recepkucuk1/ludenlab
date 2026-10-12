// apps/hub/evals/tools/atolye/sosyal-oyku/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { sosyalOykuChecks, SOSYAL_OYKU_BOLUM_LISTESI } from "./checks";
const oyku = (n: number, ben = true) => `## Sosyal öykü\n${Array.from({ length: n }, (_, i) => `${ben ? "Ben" : "Efe"} sırada bekliyorum ${i}.`).join(" ")}\n## Görsel öneri\n- a\n## Kullanım\n- b`;
describe("sosyalOykuChecks", () => {
  it("6 cümle, birinci kişi, 'kötü his' yok → 1/1/1", () => {
    const r = sosyalOykuChecks({ body: { durum: "d", bakisAcisi: "birinci_kisi" }, text: oyku(6) });
    expect(r.scores).toMatchObject({ kisalik: 1, bakis_acisi: 1, duygu_cercevesi: 1 });
    expect(r.details.oyku_cumle).toBe(6);
  });
  it("12 cümle → kısalık 0; üçüncü kişi istenince 'ben' → 0; 'kötü bir duygu' → 0", () => {
    const r = sosyalOykuChecks({ body: { durum: "d", bakisAcisi: "ucuncu_kisi" }, text: oyku(12).replace("## Görsel", "Bu kötü bir duygudur.\n## Görsel") });
    expect(r.scores).toMatchObject({ kisalik: 0, bakis_acisi: 0, duygu_cercevesi: 0 });
  });
});

/* ── Ek kapsam ── */

const BIRINCI = { durum: "d", bakisAcisi: "birinci_kisi" as const };
const UCUNCU = { durum: "d", bakisAcisi: "ucuncu_kisi" as const };
const kontrol = (text: string, body: { durum: string; bakisAcisi: "birinci_kisi" | "ucuncu_kisi" } = BIRINCI) => sosyalOykuChecks({ body, text });
const cumleler = (n: number) => Array.from({ length: n }, (_, i) => `Sıramı beklemek zor gelir ${i}.`).join(" ");
const satirlar = (n: number) => Array.from({ length: n }, (_, i) => `Sıramı beklerim ${i}`);
const sade = (oykuMetni: string, ek = "") => `## 1. Sosyal öykü metni\n${oykuMetni}\n\n## 2. Görsel / sahneleme önerisi\n- Sahne.\n\n## 3. Kullanım yönergesi\n- Sakin bir anda okuyun.${ek}`;

describe("bölüm listesi: tek kaynak (adapter `sections`)", () => {
  it("üç bölüm: öykü, görsel/sahneleme, kullanım; hikâye/yönerge de kabul", () => {
    expect(SOSYAL_OYKU_BOLUM_LISTESI).toHaveLength(3);
    const [o, g, k] = SOSYAL_OYKU_BOLUM_LISTESI as [RegExp, RegExp, RegExp];
    for (const h of ["sosyal öykü metni", "öykü", "sosyal hikâye", "sosyal hikaye"]) expect(o.test(h), h).toBe(true);
    for (const h of ["görsel / sahneleme önerisi", "sahneleme", "görsel öneri"]) expect(g.test(h), h).toBe(true);
    for (const h of ["kullanım yönergesi", "kullanım", "yönerge"]) expect(k.test(h), h).toBe(true);
  });
});

describe("kisalik: öykü bölümünün cümle sayısı (prompt: 'KISA (DEHB için 5–8 cümle)'; 3–10 aralığı = 5–8 ±2)", () => {
  it.each([[2, 0], [3, 1], [5, 1], [8, 1], [10, 1], [11, 0], [15, 0]])("%d cümle → %d", (n, beklenen) => {
    const r = kontrol(sade(cumleler(n)));
    expect(r.details.oyku_cumle).toBe(n);
    expect(r.scores.kisalik).toBe(beklenen);
  });
  it("yalnız ÖYKÜ bölümü sayılır: görsel ve kullanım bölümleri uzun olsa da kısalık 1", () => {
    const uzun = Array.from({ length: 14 }, (_, i) => `Sahnede bir ayrıntı var ${i}.`).join(" ");
    const r = kontrol(`## Sosyal öykü metni\n${cumleler(6)}\n## Görsel / sahneleme önerisi\n${uzun}\n## Kullanım yönergesi\n${uzun}`);
    expect(r.details.oyku_cumle).toBe(6);
    expect(r.scores.kisalik).toBe(1);
  });
  it("her cümle ayrı satır/madde/alıntı olabilir; noktalamasız satır da bir cümledir", () => {
    expect(kontrol(sade(satirlar(6).join("\n"))).details.oyku_cumle).toBe(6);
    expect(kontrol(sade(satirlar(6).map((s) => `- ${s}.`).join("\n"))).details.oyku_cumle).toBe(6);
    expect(kontrol(sade(satirlar(6).map((s, i) => `${i + 1}. ${s}.`).join("\n"))).details.oyku_cumle).toBe(6);
    expect(kontrol(sade(satirlar(6).map((s) => `> *${s}.*`).join("\n"))).details.oyku_cumle).toBe(6);
  });
  it("öykü içi kalın başlık, etiket satırı, sahne notu, yatay çizgi ve taslak notu cümle sayılmaz", () => {
    const govde = ["**Sıramı Beklemek**", "Öykü metni:", "(Sahne: kum saati)", "---", cumleler(5)].join("\n");
    expect(kontrol(sade(govde)).details.oyku_cumle).toBe(5);
    // öykü son bölümse taslak notu sayılmaz
    const sonda = `## Sosyal öykü metni\n${cumleler(5)}\n\n⚠️ Bu metin yapay zekâ ile üretilmiş bir TASLAKTIR; uygulanmadan önce ilgili uzman tarafından gözden geçirilip onaylanmalıdır.`;
    expect(kontrol(sonda).details.oyku_cumle).toBe(5);
  });
  it.each([
    ["düz başlık", "## Sosyal Öykü Metni"],
    ["numaralı", "## 1. Sosyal öykü metni"],
    ["alt düzey", "### Sosyal öykü"],
    ["hikâye adı", "## Sosyal Hikâye"],
    ["kalın sözde başlık", "**Sosyal öykü metni**"],
    ["kalın numaralı", "1. **Sosyal öykü metni**"],
    ["büyük harf (tr-TR)", "## SOSYAL ÖYKÜ"],
  ])("öykü başlığı varyantı: %s", (_ad, baslik) => {
    expect(kontrol(`${baslik}\n${cumleler(6)}\n\n## Görsel / sahneleme önerisi\n${cumleler(12)}`).details.oyku_cumle).toBe(6);
  });
  it("öykü başlığı 'görsel/kullanım' ile başlamaz; alt başlıklar öykünün parçasıdır; kalın kök kardeş şablon başlığında biter", () => {
    expect(kontrol(`## Sosyal öykü metni\n### Giriş\n${cumleler(2)}\n### Çözüm\n${cumleler(3)}\n## Görsel / sahneleme önerisi\n${cumleler(9)}`).details.oyku_cumle).toBe(5);
    expect(kontrol(`**Sosyal öykü metni**\n${cumleler(4)}\n**Görsel / sahneleme önerisi**\n${cumleler(9)}`).details.oyku_cumle).toBe(4);
    // "Görsel öneri (öykü için)" öykü bölümü değildir (görselle başlar); gerçek öykü ondan önce gelir
    expect(kontrol(`## Sosyal öykü metni\n${cumleler(5)}\n## Görsel öneri (öykü için)\n${cumleler(9)}`).details.oyku_cumle).toBe(5);
  });
  it("üst başlık altında üç alt başlık (### 1. Öykü, ### 2. Görsel, ### 3. Kullanım): öykü yalnız ilk alt bölümdür; üst başlığın kendi giriş satırı öykü DEĞİLDİR", () => {
    // Önceden üst başlığın kendi satırları da sayılıyordu (6 çıkardı). Öykü alt bölümü varken kökün giriş cümlesi öykü metni değildir: 5.
    const t = `## Sosyal Öykü Taslağı\nBu taslak sıra bekleme durumu için hazırlandı.\n### 1. Sosyal öykü metni\n${cumleler(5)}\n### 2. Görsel / sahneleme önerisi\n${cumleler(9)}\n### 3. Kullanım yönergesi\n${cumleler(9)}`;
    expect(kontrol(t).details.oyku_cumle).toBe(5);
    expect(kontrol(`**Sosyal öykü taslağı**\n**1. Sosyal öykü metni**\n${cumleler(4)}\n**2. Görsel / sahneleme önerisi**\n${cumleler(9)}`).details.oyku_cumle).toBe(4);
  });
  it("öykü başlığında 'görsel' geçse de ('Sosyal öykü (görsel destekli)') başlık görselle BAŞLAMADIĞI için öykü bölümüdür ve kendi satırları sayılır", () => {
    expect(kontrol(`## Sosyal öykü (görsel destekli)\n${cumleler(5)}\n## Görsel / sahneleme önerisi\n${cumleler(9)}`).details.oyku_cumle).toBe(5);
  });
  it("başlığında 'öykü' geçmeyen ilk bölüm öykü sayılır (başlık adı sapması); bölüm yoksa metnin tamamı", () => {
    expect(kontrol(`## Sıramı Beklemek\n${cumleler(6)}\n## Görsel / sahneleme önerisi\n${cumleler(12)}`).details.oyku_cumle).toBe(6);
    expect(kontrol(cumleler(6)).details.oyku_cumle).toBe(6);
  });
  it("görsel ya da kullanım bölümü ilk gelse de (sıra değişmiş) başlığında 'öykü' geçmeyen gerçek öykü seçilir; 'öykü' geçen görsel başlığı öykü sayılmaz", () => {
    expect(kontrol(`## Görsel / sahneleme önerisi\n${cumleler(9)}\n## Sıramı Beklemek\n${cumleler(5)}`).details.oyku_cumle).toBe(5);
    expect(kontrol(`## Sıramı Beklemek\n${cumleler(5)}\n## Görsel / sahneleme önerisi (öykü için)\n${cumleler(9)}`).details.oyku_cumle).toBe(5);
    expect(kontrol(`## Kullanım yönergesi (öykü için)\n${cumleler(9)}\n## Sosyal öykü metni\n${cumleler(4)}`).details.oyku_cumle).toBe(4);
  });
  it("yatay çizgi satırları ('---', '* * *', '- - -', '___') cümle sayılmaz; tek sözcüklük madde cümle sayılmaz, iki sözcüklük sayılır", () => {
    for (const cizgi of ["---", "***", "* * *", "- - -", "___", "— — —"]) expect(kontrol(sade(`${cumleler(4)}\n${cizgi}`)).details.oyku_cumle, cizgi).toBe(4);
    expect(kontrol(sade("- Dur.\n- Bekle.\n- Nefes al.")).details.oyku_cumle).toBe(1);
    expect(kontrol(sade("1. Dur.\n2. Nefes al.\n3. Sayı say.")).details.oyku_cumle).toBe(2);
  });
  it("boş / yalnız boşluk metin çökmez: öykü yok → 0 cümle", () => {
    for (const t of ["", "  \n ", "## Sosyal öykü metni"]) {
      const r = kontrol(t);
      expect(r.details.oyku_cumle, t).toBe(0);
      expect(r.scores.kisalik, t).toBe(0);
    }
  });
});

/* Gerçek taban koşusu çıktılarının YAPISI (so-01…so-04, 2026-10-10), sentetik metinle. Öykü kökü altında künye tablosu, "### Başlık: …", "### … Notlar" alt bölümleri
   öykü metni değildir; üst başlık ("## Sosyal Öykü ve Duygu Düzenleme Taslağı: …") yalnız künye taşıyabilir, öykü kardeş "## 1. Sosyal Öykü Metni" kökündedir. */
describe("kisalik: öykü kökü altındaki meta alt bölümler (künye/başlık/notlar) sayılmaz; kardeş kök seçimi", () => {
  const kunye = (bakis: string) =>
    ["| Alan | Açıklama |", "| --- | --- |", "| Öğrenci | Rumuz (5 yaş, okul öncesi) |", "| Durum | Oyun sırasında sıramı beklemek |", `| Bakış açısı | ${bakis} |`, "| Hedef beceri | Sırasını bekleyip baş etme stratejisini kullanmak |"].join("\n");
  const sablon = `## 2. Görsel / Sahneleme Önerisi\n${cumleler(9)}\n\n## 3. Kullanım Yönergesi\n${cumleler(9)}`;
  const benli = (n: number) => Array.from({ length: n }, (_, i) => `${i + 1}. Ben sırada bekliyorum ve nefes alıyorum ${i}.`).join("\n");
  const notlar = (baslik: string) =>
    `### ${baslik}\n\n- Cümleler kısa ve somuttur (7 cümle); yaşa uygundur.\n- Duygu önce adlandırılır, "bu his normaldir" çerçevesi kurulur.\n- Duygu geçerli kabul edilir; seçilebilecek olan davranıştır.\n- Neden-sonuç açıktır.\n- Ben dili tutarlıdır; emir kipi kullanılmamıştır.`;

  it("so-01 biçimi: kök altında '### Başlık: …' + künye tablosu, '### Öykü' (7 cümle), '### Metin Notları' (5 madde) → yalnız öykü: 7, kısalık 1 (önceden 18 → 0)", () => {
    const t = `## 1. Sosyal Öykü Metni\n\n### Başlık: "Sıram Gelince Oynarım"\n\n${kunye("Birinci kişi (ben dili)")}\n\n### Öykü\n\n${benli(7)}\n\n${notlar("Metin Notları")}\n\n${sablon}`;
    const r = kontrol(t, BIRINCI);
    expect(r.details.oyku_cumle).toBe(7);
    expect(r.scores).toMatchObject({ kisalik: 1, bakis_acisi: 1, duygu_cercevesi: 1 });
  });
  it("so-02 biçimi: öykü satırları doğrudan kökte (alıntı), ardından '### Metne İlişkin Notlar' tablosu → notlar sayılmaz, aralıkta (önceden 17 → 0)", () => {
    const alinti = [
      "Bazen sesli okurken bir kelimeyi yanlış okurum.", "O an yüzüm ısınabilir; bu his normaldir.", "Futbolcular da bazen pası kaçırır, ama oyunu bırakmaz.",
      "Ben de hatamı fark ettiysem dikkatle okuyorum demektir.", "Derin bir nefes alırım ve doğrusunu söylerim.", "Sonra kaldığım yerden okumaya devam ederim.",
      "Öğretmenim gülümseyebilir.", "Hata yapsam bile okumaya devam etmeyi seçebilirim.",
    ].map((s) => `> ${s}`).join("\n");
    const tablo = ["| Öğe | Açıklama |", "| --- | --- |", "| Cümle sayısı | 8 (kısa cümleler) |", "| Duygu adlandırma | 2. cümle |", "| Neden-sonuç | 4. cümle |", "| İlgi alanı köprüsü | 3. cümle |", "| Seçim vurgusu | Son cümle |", "| Çerçeve | Bu his normaldir |"].join("\n");
    const t = `## 1. Sosyal Öykü Metni\n\n**Başlık:** Hatamı Fark Ettim, Okumaya Devam Ediyorum\n\n${alinti}\n\n### Metne İlişkin Notlar\n\n${tablo}\n\n${sablon}`;
    const r = kontrol(t, BIRINCI);
    // 8 öykü cümlesi + "**Başlık:** …" etiket satırı (iki noktayla bitmediği için cümle sayılır; bilinen fazlalık, aralık içinde) = 9.
    expect(r.details.oyku_cumle).toBe(9);
    expect(r.scores).toMatchObject({ kisalik: 1, bakis_acisi: 1 });
  });
  it("so-03 biçimi: '## … Taslağı: …' üst başlığı yalnız '### Künye' tablosu taşır; öykü kardeş '## 1. Sosyal Öykü Metni' kökünde kalın başlıklı paragraf → öykü kökü (künye değil)", () => {
    const paragraf = [
      "Orkun sınav kâğıdını açar ve ilk soruya bakar.", "Çözümü hemen göremeyince kalbi hızlı atabilir.", "Bu his çok normaldir; birçok öğrenci aynı şeyi yaşar.",
      "His geçerlidir, ama sonraki adımı Orkun seçebilir.", "Panikle ilk soruda takılı kalırsa zaman geçer.", "Basketbolda mola isteyebileceğini bilir; sınavda da kendine kısa bir mola verebilir.",
      "Bir yavaş nefes alır, bir yavaş nefes verir.", "Sonra kolay bir soru bulur ve oradan devam eder.", "Kolay soruları çözmek ona güven kazandırır.",
    ].join(" ");
    const t = `## Sosyal Öykü ve Duygu Düzenleme Taslağı: "Sınavda Mola Zamanı"\n\n### Künye\n\n${kunye("Üçüncü kişi (ben dili kullanılmaz)")}\n\n## 1. Sosyal Öykü Metni\n\n**Sınavda Mola Zamanı**\n\n${paragraf}\n\n${sablon}`;
    const r = kontrol(t, UCUNCU);
    // Önceden üst başlık kök seçiliyor, künye tablosunun 6 satırı "cümle" sayılıyordu (rastlantıyla aralıkta) ve künyedeki "ben dili" bakış açısını 0 yapıyordu.
    expect(r.details.oyku_cumle).toBe(9);
    expect(r.scores).toMatchObject({ kisalik: 1, bakis_acisi: 1 });
  });
  it("so-04 biçimi: üst başlık altında künye tablosu doğrudan; öykü '## 1.' kökünün '### Öykü (8 cümle)' alt bölümünde, ardından '### Uzman Notları (metni uyarlarken)' → 8", () => {
    const t = `## Sosyal Öykü ve Duygu-Düzenleme Taslağı: Sesli Okuma Sırası Bana Gelince\n\n${kunye("Birinci kişi (ben dili)")}\n\n## 1. Sosyal Öykü Metni\n\n### Öykü (8 cümle)\n\n${benli(8)}\n\n### Uzman Notları (metni uyarlarken)\n\n- Cümle 2'deki beden belirtilerini öğrenciye sorarak değiştirin.\n- İşaretin öğretmenle önceden belirlenmiş olması gerekir.\n- Metinde garanti cümleleri bilerek yoktur.\n\n${sablon}`;
    const r = kontrol(t, BIRINCI);
    expect(r.details.oyku_cumle).toBe(8);
    expect(r.scores).toMatchObject({ kisalik: 1, bakis_acisi: 1 });
  });
  it("kökün kendi satırlarındaki künye tablosu ve ayrıştırılmamış başlık satırı (#, #####) sayılmaz", () => {
    expect(kontrol(`## Sosyal öykü metni\n${kunye("Birinci kişi")}\n\n${cumleler(5)}\n\n${sablon}`).details.oyku_cumle).toBe(5);
    expect(kontrol(`## Sosyal öykü metni\n# Sıramı Beklerim\n##### Öykü başlıyor\n${cumleler(5)}\n\n${sablon}`).details.oyku_cumle).toBe(5);
  });
  it.each(["Metin Notları", "Metne İlişkin Notlar", "Uzman Notları (metni uyarlarken)", "Uzman Notu", "Not", "Künye", "Başlık: Sıramı Beklerim", "Öğrenci Bilgileri", "Açıklama", "Uygulama İpuçları", "İpucu", "Uyarılar"])(
    "meta alt bölüm sayılmaz: ### %s",
    (b) => expect(kontrol(`## Sosyal öykü metni\n${cumleler(5)}\n\n### ${b}\n${cumleler(9)}\n\n${sablon}`).details.oyku_cumle).toBe(5),
  );
  it("'not' yalnız sözcük olarak meta: 'Noter ziyareti', 'Notasyon' alt bölümleri öykü sayılır (meta değil)", () => {
    expect(kontrol(`## Sosyal öykü metni\n### Giriş\n${cumleler(2)}\n### Noter ziyareti\n${cumleler(3)}\n\n${sablon}`).details.oyku_cumle).toBe(5);
  });
  it.each(["Öykü", "Öykü (8 cümle)", "Öykü metni", "Hikâye", "Metin"])("kökte öykü alt bölümü ('### %s') varsa yalnız o sayılır: kökün giriş satırı ve diğer alt bölümler değil", (b) => {
    const t = `## 1. Sosyal öykü metni\nBu öykü sıra bekleme durumu için hazırlandı.\n\n### ${b}\n${cumleler(6)}\n\n### Anahtar sözcükler\n${cumleler(4)}\n\n${sablon}`;
    expect(kontrol(t).details.oyku_cumle).toBe(6);
  });
  it("öykü alt bölümünün kendi alt başlıkları (#### Giriş / #### Çözüm, kalın ara başlık) öyküye dahildir; kardeş '### Notlar' ve içteki '#### Not' değil", () => {
    expect(kontrol(`## Sosyal öykü metni\n### Öykü\n#### Giriş\n${cumleler(2)}\n#### Çözüm\n${cumleler(3)}\n#### Not\n${cumleler(4)}\n### Notlar\n${cumleler(9)}\n${sablon}`).details.oyku_cumle).toBe(5);
    expect(kontrol(`## Sosyal öykü metni\n### Öykü\n**Giriş**\n${cumleler(2)}\n**Çözüm**\n${cumleler(3)}\n### Notlar\n${cumleler(9)}\n${sablon}`).details.oyku_cumle).toBe(5);
  });
  it("iki öykü alt bölümü ('### Öykü – 1. bölüm', '### Öykü – 2. bölüm') birlikte sayılır", () => {
    expect(kontrol(`## Sosyal öykü metni\n### Öykü – 1. bölüm\n${cumleler(3)}\n### Öykü – 2. bölüm\n${cumleler(3)}\n### Notlar\n${cumleler(9)}\n${sablon}`).details.oyku_cumle).toBe(6);
  });
  it("kalın 'Başlık: …' satırı öykünün kendi başlığıdır (meta alt bölüm değil): altındaki öykü sayılır; kalın '**Uzman notu:**' maddeleri sayılmaz", () => {
    expect(kontrol(sade(`**Başlık: Sıramı Beklerim**\n${cumleler(6)}`)).details.oyku_cumle).toBe(6);
    expect(kontrol(sade(`**Başlık: Sıramı Beklerim**\n${cumleler(6)}\n\n**Uzman notu:**\n- ${cumleler(3)}\n- ${cumleler(2)}`)).details.oyku_cumle).toBe(6);
    expect(kontrol(sade(`**Sıramı Beklerim**\n${cumleler(6)}\n\n**Metin notları**\n- ${cumleler(3)}`)).details.oyku_cumle).toBe(6);
  });
  it("daraltma öyküyü tümüyle yutarsa (öykü '### Başlık: …' alt bölümünün altında kalmış) kökün tüm satırlarına dönülür; tablo satırları yine atılır", () => {
    expect(kontrol(`## 1. Sosyal öykü metni\n### Başlık: Sıramı Beklerim\n${kunye("Birinci kişi")}\n\n${cumleler(6)}\n\n${sablon}`).details.oyku_cumle).toBe(6);
  });
  it("üst başlık ('… Taslağı') giriş cümlesi taşısa da öykü kökü kardeş '## 1. Sosyal Öykü Metni'dir (taslak başlıklı aday en sona)", () => {
    const t = `## Sosyal Öykü Taslağı: Sıramı Beklerim\nAşağıdaki öykü sıra bekleme durumu için hazırlandı.\n\n${kunye("Birinci kişi")}\n\n## 1. Sosyal Öykü Metni\n${cumleler(6)}\n\n${sablon}`;
    expect(kontrol(t).details.oyku_cumle).toBe(6);
  });
  it("bakis_acisi yalnız öykü satırlarına bakar: künyedeki 'ben dili' hücresi ve notlardaki 'Ben dili' üçüncü kişi öyküsünü bozmaz; birinci kişi isteğinde de işaret sayılmaz", () => {
    const t = `## 1. Sosyal Öykü Metni\n\n### Künye\n${kunye("Üçüncü kişi (ben dili değil)")}\n\n### Öykü\nEfe sırada bekliyor. Efe derin bir nefes alır. O sırasını bekler.\n\n${notlar("Metin Notları")}\n\n${sablon}`;
    expect(kontrol(t, UCUNCU).scores.bakis_acisi).toBe(1);
    expect(kontrol(t, BIRINCI).scores.bakis_acisi).toBe(0);
  });
  it("duygu_cercevesi: notlardaki 'Duygu geçerli kabul edilir' etkilemez (1); tüm metin taraması sürer — notlardaki 'kızmak kötüdür' yine 0", () => {
    const t = (not: string) => `## 1. Sosyal Öykü Metni\n### Öykü\n${benli(6)}\n### Metin Notları\n- ${not}\n${sablon}`;
    expect(kontrol(t("Duygu geçerli kabul edilir; seçilebilecek olan davranıştır.")).scores.duygu_cercevesi).toBe(1);
    expect(kontrol(t("Çocuğa kızmak kötüdür mesajı verilir.")).scores.duygu_cercevesi).toBe(0);
  });
});

describe("bakis_acisi (prompt: 'Bakış açısı: birinci kişi (ben dili) / üçüncü kişi')", () => {
  const birinci = (s: string) => kontrol(sade(s), BIRINCI).scores.bakis_acisi;
  const ucuncu = (s: string) => kontrol(sade(s), UCUNCU).scores.bakis_acisi;
  // KESİN birinci kişi: ben zamirleri ve -yorum / -acağım / -malıyım ekleri. Birinci kişi isteğinde 1, üçüncü kişi isteğinde 0.
  const kesin = [
    "Ben sırada bekliyorum.", "Bazen ben de heyecanlanırım.", "Bana sıra gelince kalbim hızlanır.", "Beni bekleyenler olabilir.", "Benim sıram gelecek.",
    "BEN SIRADA BEKLİYORUM.", "BENİM SIRAM GELECEK.", "Bence beklemek zor.", "Bende heyecan olur.", "Kendime nefes almayı hatırlatırım.",
    "Sıramı bekliyorum.", "Yapacağım.", "Sıra gelince söyleyeceğim.", "Beklemeliyim.", "Sakin kalmalıyım.", "Derin nefes alıyorum.",
  ];
  // GENİŞ birinci kişi (zamirsiz aorist/geçmiş/istek ekleri): birinci kişi isteğinde EN AZ İKİ işaretle 1 (tek işaret ad/fiil karışıklığına açık: "durum", "yarım");
  // üçüncü kişi isteğinde BİLEREK ihlal sayılmaz, yani 1.
  const genis = [
    "Derin bir nefes alırım. Sıramı beklerim.", "Sıramı bekledim. Sonra söyledim.", "Sakin kalmayı seçerim. Arkadaşımı beklerim.", "Heyecanlandım ama geçti. Başardım.",
    "Başarmışım. Bir dakika bakayım.",
  ];
  const ucuncuKisi = [
    "Efe sırada bekliyor.", "Efe derin bir nefes alır.", "O sırasını bekler.", "Efe'nin sırası gelecek.", "Efe, öğretmenine sıranın kendisine gelmesini söyler.",
    "Bu durum zor olabilir.", "Yardım istemek serbest.", "Yarım saat sürer.", "Benzer bir durum olur.", "Bencil olmak gerekmez.", "Efe sakin kalmayı seçer.",
    "Tarım dersinde sıra gelir.", "Bu durum zor. Yardım istemek serbest. Yarım saat sürer.", "Kurum içinde yorum yapılır.",
  ];
  it.each(kesin)("kesin birinci kişi: birinci → 1, üçüncü → 0: %s", (s) => {
    expect(birinci(s)).toBe(1);
    expect(ucuncu(s)).toBe(0);
  });
  it.each(genis)("zamirsiz birinci kişi: birinci → 1; üçüncü kişi isteği bunu ihlal saymaz: %s", (s) => {
    expect(birinci(s)).toBe(1);
    expect(ucuncu(s)).toBe(1);
  });
  it("tek zamirsiz geniş işaret birinci kişi için yetmez (ad/fiil karışıklığı); kesin işaret tek başına yeter", () => {
    expect(birinci("Derin bir nefes alırım.")).toBe(0);
    expect(birinci("Derin nefes alıyorum.")).toBe(1);
    expect(birinci("Sıramı beklerim. Bu durum zor.")).toBe(0);
  });
  it.each(ucuncuKisi)("üçüncü kişi anlatımı: birinci → 0, üçüncü → 1: %s", (s) => {
    expect(birinci(s)).toBe(0);
    expect(ucuncu(s)).toBe(1);
  });
  it.each([
    'Efe "Ben de oynamak istiyorum" der.', "Efe “Bana sıra ne zaman gelecek?” diye sorar.", "Efe «Ben beklerim» der.", "Efe \"Sıramı bekliyorum\" der ve bekler.",
    "Efe kendine 'Ben bekleyebilirim' der.", "Efe 'Sıramı bekliyorum' diye düşünür.", "Efe‘ben beklerim’ der.",
  ])("diyalog içindeki ben: üçüncü kişi anlatımını bozmaz (ucuncu → 1); birinci kişi isteğinde varlık yeter (birinci → 1): %s", (s) => {
    expect(ucuncu(s)).toBe(1);
    expect(birinci(s)).toBe(1);
  });
  it("tek tırnak alıntısı iki yandan sözcük dışı olmalı: açılışı harfe bitişik ya da kapanışı harfe bitişik kesme alıntı sayılmaz ('ben'i gizlemez)", () => {
    expect(ucuncu("Efe'nin sırası geldi. Ben bekliyorum. Tolga' dedi.")).toBe(0); // açılış kesmesi harfe bitişik
    expect(ucuncu("Sıra 'Ben bekliyorum'dan sonra gelir.")).toBe(0); // kapanış kesmesine ek bitişik
    expect(ucuncu("Sıra 'Ben bekliyorum' dedikten sonra gelir.")).toBe(1); // gerçek alıntı
  });
  it("diyalog dışındaki ben diyalog varken de yakalanır; Türkçe ek kesmesi ('Efe'nin ... Tolga'dan') alıntı sayılıp 'ben'i gizlemez", () => {
    expect(ucuncu('Ben bekliyorum. Efe "tamam" der.')).toBe(0);
    expect(ucuncu("Efe'nin sırası geldi. Ben bekliyorum. Tolga'dan sonra oynar.")).toBe(0);
    expect(ucuncu("Efe'nin sırası Tolga'dan sonra gelir.")).toBe(1);
  });
  it("yalnız ÖYKÜ bölümüne bakılır: kullanım yönergesindeki 'ben' dili öyküyü etkilemez", () => {
    const t = `## Sosyal öykü metni\nEfe sırada bekliyor.\n## Kullanım yönergesi\nÇocuğa 'ben' cümleleri kurdurun: ben bekliyorum.`;
    expect(kontrol(t, UCUNCU).scores.bakis_acisi).toBe(1);
    expect(kontrol(t, BIRINCI).scores.bakis_acisi).toBe(0);
  });
  it.each(["durum", "kurum", "yorum", "yarım", "yardım", "tarım", "karım", "kerim", "devrim", "dürüm", "derim"])(
    "ad/fiil karışıklığı: '%s' sözcüğü iki kez geçse de birinci kişi işareti sayılmaz (üçüncü kişi anlatımı birinci kişi sayılmaz)",
    (w) => expect(birinci(`Efe için ${w} önemli. Bu ${w} geçer.`)).toBe(0),
  );
  it("ayrıntıda KESİN 'ben' işareti sayısı; üçüncü kişide 0", () => {
    expect(kontrol(sade("Ben bekliyorum. Bana sıra gelir."), BIRINCI).details.ben_isaret).toBeGreaterThanOrEqual(3);
    expect(kontrol(sade("Efe bekliyor."), UCUNCU).details.ben_isaret).toBe(0);
  });
  it("boş öykü: birinci kişi isteğinde 0 (işaret yok), üçüncü kişi isteğinde 1 (ihlal yok); çökmez", () => {
    expect(kontrol("", BIRINCI).scores.bakis_acisi).toBe(0);
    expect(kontrol("", UCUNCU).scores.bakis_acisi).toBe(1);
  });
});

describe("duygu_cercevesi (prompt: 'Duyguyu \"kötü/yanlış\" diye çerçeveleme — duygu geçerli, davranış seçilebilir')", () => {
  const duygu = (s: string) => kontrol(sade(`Sıramı beklerim. ${s}`)).scores.duygu_cercevesi;
  const ihlal = [
    "Bu kötü bir duygudur.", "Kızgınlık kötü bir duygudur.", "Bu yanlış bir his.", "Öfke yanlış bir duygudur.", "Utanç verici bir his.",
    "Kızmak kötü bir şeydir.", "Kızmak yanlıştır.", "Korkmak ayıptır.", "Ağlamak yanlış.", "Üzülmek her zaman kötüdür.", "Hissetmek yanlış.", "Bu his çok yanlış.",
    "Öfkelenmek kötü.", "Duygular kötüdür.", "KÖTÜ BİR DUYGUDUR.",
    "Kızgın olmak kötü bir şeydir.", "Kıskançlık ayıp bir duygu.", "- Bu duygu kötü", "Bu, utanılacak bir duygudur.", "Bu çirkin bir his.",
  ];
  const temiz = [
    // doğru çerçeve (olumsuzlama): promptun istediği mesaj
    "Kızmak kötü bir şey değildir.", "Bu duygu kötü değil.", "Hiçbir duygu kötü ya da yanlış değildir.", "Doğru ya da yanlış duygu yoktur.", "Öfke yanlış bir duygu değildir.",
    "Kızgın olmak yanlış değil.", "Duygular kötü ya da iyi olmaz.", "Duygunun kötü olduğunu düşünme.", "Bu hisse kötü deme.", "Kızmak ayıp sayılmaz.", "Bu duygu kötü değildir, normaldir.",
    "Hiçbir his kötü olarak görülmemeli.", "Kızmak kötü olmak demek değildir.",
    // retorik soru, aktarma ve görünüm: çerçeveyi onaylamaz
    "Kızmak kötü bir şey mi? Hayır.", "Kızgın olmak kötü mü? Hayır, normaldir.", "Bu kötü bir duygu mu? Hayır.", "Bazı insanlar kızmanın kötü olduğunu söyler ama bu doğru değildir.",
    "Kızgın hissetmek kötü bir şey gibi gelir ama değildir.", "Öfke kötü bir duygu gibi görünür; oysa her duygu geçerlidir.", "Korkmak ayıp sanılır ama ayıp değildir.",
    // kötü hissetmek / hissettirmek: duyguyu değerlendirmez, durumu anlatır
    "Kendimi kötü hissederim ama bu normaldir.", "Kötü hissetmek normaldir.", "Kızgınken kendini kötü hissedebilirsin.", "Kızmak insanı kötü hissettirebilir ama yanlış değildir.",
    "Korkmak kötü hissettirir.", "Yanlış hissetmem gerekmez.", "Bazen kötü hissediyorum.",
    // davranış ve başka konular
    "Kızdığımda kötü sözler söylememeliyim.", "Kızgın olduğumda bağırmak yanlış olabilir.", "Kötü bir gün geçirdim.", "Yanlış cevap vermek normaldir.",
    "Olumsuz duygular da normaldir.", "Kızgınlık, üzüntü ve korku hepsi doğal duygulardır.", "Her duygu geçerlidir.", "Hissetmek normaldir.", "Duygu ve davranış farklıdır.",
  ];
  it.each(ihlal)("ihlal: %s", (s) => expect(duygu(s)).toBe(0));
  it.each(temiz)("temiz: %s", (s) => expect(duygu(s)).toBe(1));
  it("tüm metin taranır: görsel/sahneleme ve kullanım bölümleri de", () => {
    expect(kontrol(sade(cumleler(5), "\n- Çocuğa kızmanın kötü bir şey olduğunu anlatın.")).scores.duygu_cercevesi).toBe(0);
    expect(kontrol(sade(cumleler(5), "\n- Çocuğa kızmanın kötü bir şey olmadığını anlatın.")).scores.duygu_cercevesi).toBe(1);
    expect(kontrol(sade(cumleler(5)).replace("- Sahne.", "- Yüzünde utanç verici bir ifade yok.")).scores.duygu_cercevesi).toBe(1);
  });
  it("soru eki ayrı sözcük olmalı: 'kötü mü/mi/mu' soru, 'kötü mizah', 'kötü mimik' değil; 'kötü müdür' (ek bitişik) yargı sayılır", () => {
    expect(duygu("Korkmak kötü mü? Hayır.")).toBe(1);
    expect(duygu("Korkmak kötü mimik gibidir.")).toBe(0);
    expect(duygu("Korkmak kötü müdür?")).toBe(0);
  });
  it("ayrıntıda bulunan ifade yazılır; temizde boş", () => {
    expect(kontrol(sade("Bu kötü bir duygudur.")).details.kotu_cerceve).toContain("kötü bir duygudur");
    expect(kontrol(sade(cumleler(5))).details.kotu_cerceve).toBe("");
  });
});

describe("tipografi ve satır sonu korumaları", () => {
  it("kıvrık kesme (U+2019) ve düz kesme aynı davranır; CRLF satır sonları sonucu değiştirmez", () => {
    expect(kontrol(sade("Efe’nin sırası geldi. Ben bekliyorum."), UCUNCU).scores.bakis_acisi).toBe(0);
    expect(kontrol(sade("Efe’nin sırası Tolga’dan sonra gelir."), UCUNCU).scores.bakis_acisi).toBe(1);
    expect(kontrol(sade("Kızmak kötü bir şey değil. Time’out yok.")).scores.duygu_cercevesi).toBe(1);
    const metin = oyku(6);
    expect(kontrol(metin.replace(/\n/g, "\r\n")).scores).toEqual(kontrol(metin).scores);
    expect(kontrol(metin.replace(/\n/g, "\r\n")).details.oyku_cumle).toBe(6);
  });
});

describe("çıktı sözleşmesi", () => {
  it("`talimat` döndürülmez; kisalik, bakis_acisi, duygu_cercevesi; sert hata yok; ayrıntılar puanları yansıtır", () => {
    const r = kontrol(oyku(6));
    expect(Object.keys(r.scores).sort()).toEqual(["bakis_acisi", "duygu_cercevesi", "kisalik"]);
    expect(r.details).toMatchObject({ kisalik: 1, bakis_acisi: 1, duygu_cercevesi: 1 });
    expect(r.hard).toEqual([]);
  });
});
