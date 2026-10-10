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
    "- Sesli okuma (yük azalır)", "- Ek süre — yavaş okuma", "- Rutin kartı → dikkat toplar", "- Rutin kartı (süreci rahat kılar)",
  ])("%s", (m) => expect(gerekce(madde(m))).toBe(1));

  it.each([
    "- Sesli okuma", "- Sesli okuma yapılır.", "- Sesli okuma (ör. ekran okuyucu)", "- Sesli okuma (örn. ekran okuyucu ile birlikte kullanılabilir)", "- Sesli okuma (vb. destekleyici araçlar yük azaltabilir)",
    "- Sesli okuma (günde 10 dakika, haftada 3 gün)", "- Sesli okuma (5. sınıf için)", "- Sesli okuma (kısa)", "- Sesli okuma — kısa", "- Sesli okuma - ek süre", "- Sesli okuma → ek süre tanınır",
    "- Sesli okuma; amaç belirtilmedi", "- Nedenleri aşağıdadır", "- Neden-sonuç ilişkisi kurma çalışması", "- Etki-tepki oyunu", "- Rutin kartı (renkli ve plastik)", "- Rutin kartı (dikkat)", "- Rutin kartı — dikkat", "- Okuma (yüksek sesle okunur)", "- Okuma (yükseltilmiş yazı tipi boyutu)", "- Ek süre (her sınavda 15 dakika)", "- Ek süre — her sınavda 15 dakika", "- Sesli okuma neden yapılır?", "- Gerekçelendirme yapılmadı".replace("yapılmadı", "yok").replace("Gerekçelendirme", "Açıklama"),
  ])("gerekçe değil → 0: %s", (m) => expect(gerekce(madde(m))).toBe(0));
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
