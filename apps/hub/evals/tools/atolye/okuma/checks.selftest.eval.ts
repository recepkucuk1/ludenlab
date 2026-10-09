// apps/hub/evals/tools/atolye/okuma/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { okumaChecks } from "./checks";
describe("okumaChecks", () => {
  it("İngilizce fonik aktarması yok → 1; rubrikte kelime/dk ve doğruluk geçer → 1", () => {
    const r = okumaChecks({ body: { okumaDuzeyi: "kelime" }, text: "## Rubrik\n- Dakikada doğru kelime sayısı\n- Doğruluk %" });
    expect(r.scores).toMatchObject({ fonik_yok: 1, rubrik: 1 });
  });
  it("'sight words' geçince 0; rubrik ölçütleri yoksa 0", () => {
    const r = okumaChecks({ body: { okumaDuzeyi: "kelime" }, text: "## Rubrik\n- sight words listesi" });
    expect(r.scores).toMatchObject({ fonik_yok: 0, rubrik: 0 });
  });
});

/* ── Ek kapsam: İngilizce aktarma kalıpları + olumsuzlama, rubrik ölçütleri ve kapsamı ── */

const body = { okumaDuzeyi: "kelime" as const };
const kontrol = (text: string) => okumaChecks({ body, text });
const fonik = (cumle: string) => kontrol(`## Hece-ses çalışması\n${cumle}`).scores.fonik_yok;

describe("fonik_yok (prompt: 'İngilizce fonik mantığını OLDUĞU GİBİ aktarma')", () => {
  const ihlal = [
    "Phonics yöntemiyle sesleri öğretin.", "Sight words listesi hazırlayın.", "Sight word kartları kullanın.", "Sightwords", "Sight-words kartı",
    "Dolch listesinden kelimeler seçin.", "Silent e kuralını çalışın.", "Magic e ile uzun ünlü öğretin.", "Digraph (sh, ch) çalışması yapın.",
    "Vowel team kartları.", "Word family (-at, -an) çalışması.", "Word families ile çalışın.",
    // tr-TR küçük harf tuzağı: büyük 'I' → 'ı'
    "PHONICS çalışması", "SIGHT WORDS listesi", "Silent E", "DIGRAPH kartı", "MAGIC E kuralı",
    "- Phonics", "| Yöntem | Phonics |",
  ];
  const temiz = [
    // olumsuzlama/kaçınma: ihlal değil
    "İngilizce phonics yöntemleri aktarılmamıştır.", "Phonics yerine hece temelli çalışma yapın.", "Sight words Türkçe için uygun değildir.",
    "İngilizceye özgü phonics stratejilerinden kaçının.", "Dolch listesi kullanılmaz.", "Silent e kuralı Türkçede yok.",
    // Türkçe fonolojik terimler ve alakasız kelimeler
    "Fonolojik farkındalık çalışması yapın.", "Hece işleme ve ses birleştirme.", "CVC yapısı (ünsüz-ünlü-ünsüz) Türkçede de görülür.",
    "Kelimeyi görme hızı için kartlar.", "Magical thinking yok", "Sightseeing", "Ses-harf eşleştirme.", "Türkçe şeffaf ortografi.",
  ];
  it.each(ihlal)("ihlal: %s", (c) => expect(fonik(c)).toBe(0));
  it.each(temiz)("temiz: %s", (c) => expect(fonik(c)).toBe(1));
  describe("karşıtlık işaretleri ve bitişik olumsuzlama (terim kıyaslanıyor, öneri değil)", () => {
    const kontrolsuz = (cumle: string) => fonik(cumle);
    const temizler = [
      "İngilizcedeki phonics yaklaşımından farklı olarak hece temelli çalışın.", "Phonics'in aksine Türkçede hece birimi esastır.",
      "Sight words gereksizdir.", "Dolch listesine kıyasla Türkçe için hece listeleri yeterlidir.", "Phonics aktarılmaması gereken bir yaklaşımdır.",
      "Phonics aktarmadan Türkçe hece çalışması yapın.", "Silent e kuralı gereksiz.", "Phonics yaklaşımından farklı olarak hece okunur.",
      "Sight words ve phonics kullanılmaz.", "Phonics, sight words veya Dolch listesi kullanılmaz.", "Phonics kullanmıyoruz.",
    ];
    const ihlaller = [
      "Farklı sight words listeleri hazırlayın.", "Aksine, phonics çalışması yapın.", "Phonics kullanın, ardından hece okuyun.",
      "Hece çalışmasından önce phonics kuralları öğretin.", "Phonics kartlarını Türkçe sözcüklerle eşleştirin.", "Gereksiz tekrar yapmadan sight words öğretin.",
    ];
    it.each(temizler)("temiz: %s", (c) => expect(kontrolsuz(c)).toBe(1));
    it.each(ihlaller)("ihlal: %s", (c) => expect(kontrolsuz(c)).toBe(0));
    it("'… yerine hece temelli': terim fiilimsi/tek sözcükle reddedilir; uzak 'yerine' olumlu öneridir", () => {
      expect(fonik("İngilizcedeki phonics yaklaşımı yerine hece temelli çalışın.")).toBe(1);
      expect(fonik("Phonics kurallarını aktarmak yerine hece temelli çalışın.")).toBe(1);
      expect(fonik("Sight words listesi yerine hece kartları kullanın.")).toBe(1);
      expect(fonik("Phonics yerine hece temelli çalışın.")).toBe(1);
      expect(fonik("Hece kartlarının yanı sıra phonics oyunu kullanın, hece zinciri yerine.")).toBe(0);
      expect(fonik("Phonics kartlarını hece kartları sakin köşe yerine uygulayın.")).toBe(0);
    });
    it("yan cümle sonu olumsuz yüklem: 'phonics … bu dilde işe yaramaz'", () => {
      expect(fonik("Sight words listeleri Türkçe gibi şeffaf bir dilde işe yaramaz.")).toBe(1);
      expect(fonik("Phonics, İngilizceye özgü olduğu için bu sette yer almaz.")).toBe(1);
      expect(fonik("Phonics, İngilizceye özgü olduğu için bu sette yer alır.")).toBe(0);
    });
    it("her karşıtlık işareti tek başına yeter: 'farklı olarak' (virgüllü), '-dan farklı bir'", () => {
      expect(fonik("Phonics, farklı olarak, Türkçede hece temellidir.")).toBe(1);
      expect(fonik("Phonics yaklaşımından farklı bir hece çalışması yapın.")).toBe(1);
      expect(fonik("Sight words'ten farklı bir liste kullanın.")).toBe(1);
    });
    it("karşıtlık işareti terimden SONRAKİ ≤5 sözcükte aranır, önündeki ya da uzaktaki işaret iptal etmez", () => {
      expect(fonik("Aksine bir yaklaşım olarak phonics uygulayın.")).toBe(0);
      expect(fonik("Phonics uygulayın ve sonra hece, kelime, cümle, paragraf, hikâye gereksiz görülür.")).toBe(0);
    });
  });
  it("etiketli kaçınma listesi altındaki maddeler sayılmaz; sonraki bölümdeki öneri sayılır", () => {
    expect(kontrol("**Aktarılmayan İngilizce stratejiler: kaçınılır**\n- Phonics\n- Sight words").scores.fonik_yok).toBe(1);
    expect(kontrol("**Kaçınılacak yaklaşımlar:**\n- Phonics\n\n## Hece-ses çalışması\n- Sight words kullanın").scores.fonik_yok).toBe(0);
  });
  it("kelime içi geçiş ('microphonics' değil ayrı kelime olarak) ve boş metin", () => {
    expect(fonik("Telephonics bir marka adı.")).toBe(1);
    expect(kontrol("").scores.fonik_yok).toBe(1);
  });
  it("ayrıntıda bulunan ifade yazılır", () => {
    expect(kontrol("Phonics ve sight words.").details.ingilizce).toBe("phonics|sight words");
    expect(kontrol("Hece çalışması.").details.ingilizce).toBe("");
  });
});

describe("rubrik (prompt: 'Akıcılık ölçüm rubriği — kelime/dk, doğruluk %, prozodi')", () => {
  const rubrik = (satirlar: string, bas = "## Akıcılık ölçüm rubriği") => kontrol(`${bas}\n${satirlar}`).scores.rubrik;
  const hizlar = [
    "- Kelime/dk", "- Doğru okunan kelime/dakika", "- Kelime / dk", "- kelime sayısı/dk", "- Dakikada doğru okunan kelime sayısı", "- Dakikadaki kelime sayısı",
    "- Dakika başına kelime", "- Doğru okunan sözcük sayısı (dakikada)", "- Dakikada okunan sözcük", "- sözcük/dakika", "- KELİME/DK", "- Kelime dk",
    "| Ölçüt | Açıklama |\n|---|---|\n| Hız | Dakikada okunan kelime sayısı |",
  ];
  it.each(hizlar)("hız ölçütü: %j", (h) => expect(rubrik(`${h}\n- Doğruluk %`)).toBe(1));
  const dogruluklar = ["- Doğruluk %", "- Okuma doğruluğu (%)", "- Doğruluğa göre", "- Doğruluk oranı", "- DOĞRULUK"];
  it.each(dogruluklar)("doğruluk ölçütü: %j", (d) => expect(rubrik(`- Kelime/dk\n${d}`)).toBe(1));
  it("hız YA DA doğruluk eksikse 0; ikisi de yoksa 0", () => {
    expect(rubrik("- Kelime/dk")).toBe(0);
    expect(rubrik("- Doğruluk %")).toBe(0);
    expect(rubrik("- Prozodi\n- Anlama")).toBe(0);
    expect(rubrik("- Kelime sayısı\n- Doğruluk")).toBe(0); // dakika yok
    expect(rubrik("- 1 dakika\n- Doğruluk")).toBe(0); // kelime yok
  });
  it("ölçütler rubrik bölümünde aranır: egzersiz bölümündeki 'dakikada kaç kelime' rubrik sayılmaz", () => {
    const t = "## Akıcılık egzersizleri\n- 1 dakikada kaç kelime okuduğunuzu sayın; doğruluğa dikkat edin.\n## Akıcılık ölçüm rubriği\n- Anlama\n- Prozodi";
    expect(kontrol(t).scores.rubrik).toBe(0);
  });
  it("alt başlıklı rubrik: ölçütler alt başlık altında; rubrik başlığı 'ölçüm' ya da 'ölçme' de olabilir", () => {
    expect(rubrik("### Hız\n- Kelime/dk\n### Doğruluk\n- Doğruluk %")).toBe(1);
    expect(rubrik("- Kelime/dk\n- Doğruluk", "## 5. Akıcılık Ölçme Rubriği")).toBe(1);
    expect(rubrik("- Kelime/dk\n- Doğruluk", "## Ölçüm")).toBe(1);
    expect(rubrik("- Kelime/dk\n- Doğruluk", "**Rubrik**")).toBe(1);
  });
  it("rubrik başlığı 'rubrik' içermiyorsa 'ölçüm'/'ölçme' başlığı bölüm sayılır ve ölçütler yalnız orada aranır; 'rubrik' başlığı önceliklidir", () => {
    const egzersiz = "## Akıcılık egzersizleri\n- Dakikada kaç kelime okuduğunuzu sayın; doğruluğa dikkat edin.";
    expect(kontrol(`${egzersiz}\n## Ölçüm\n- Anlama`).scores.rubrik).toBe(0);
    expect(kontrol(`${egzersiz}\n## Ölçme\n- Anlama`).scores.rubrik).toBe(0);
    expect(kontrol(`${egzersiz}\n## Ölçme\n- Kelime/dk\n- Doğruluk`).scores.rubrik).toBe(1);
    // 'ölçüm' başlıklı egzersiz bölümü var, ama 'Rubriği' başlıklı bölüm önce aranır
    expect(kontrol("## Zamanlı ölçüm turu\n- Dakikada kaç kelime; doğruluk\n## Akıcılık Rubriği\n- Anlama").scores.rubrik).toBe(0);
    expect(kontrol("## Zamanlı ölçüm turu\n- Anlama\n## Akıcılık Rubriği\n- Kelime/dk\n- Doğruluk").scores.rubrik).toBe(1);
  });
  it("rubrik bölümü hiç yoksa ölçütler metnin tamamında aranır (başlık adı sapması çift cezalanmaz; yapı puanı ayrıca düşer)", () => {
    expect(kontrol("## Değerlendirme\n- Kelime/dk\n- Doğruluk").scores.rubrik).toBe(1);
    expect(kontrol("## Metin\nDüz metin.").scores.rubrik).toBe(0);
    expect(kontrol("").scores.rubrik).toBe(0);
  });
  it("tr-TR: 'DAKİKADA' ve 'DOĞRULUK' büyük harfle", () => {
    expect(rubrik("- DAKİKADA DOĞRU KELİME SAYISI\n- DOĞRULUK")).toBe(1);
  });
});

describe("prozodi (prompt rubriği: 'prozodi (gözlem ölçütleriyle)')", () => {
  const prozodi = (satirlar: string) => kontrol(`## Akıcılık ölçüm rubriği\n- Kelime/dk\n- Doğruluk\n${satirlar}`).scores.prozodi;
  it.each(["- Prozodi (vurgu, tonlama)", "- Prosody", "- Tonlama ve vurgu", "- Noktalamaya uygun vurgu", "- PROZODİ", "- İfadeli okuma"])("%j → 1", (s) => expect(prozodi(s)).toBe(1));
  it.each(["- Anlama", "", "- Akıcı okuma"])("%j → 0", (s) => expect(prozodi(s)).toBe(0));
  it("prozodi rubrik bölümünde aranır: egzersizdeki vurgu rubrik sayılmaz", () => {
    expect(kontrol("## Akıcılık egzersizleri\n- Vurgulu okuyun.\n## Rubrik\n- Kelime/dk\n- Doğruluk").scores.prozodi).toBe(0);
  });
  it("rubrik bölümü yoksa metnin tamamında aranır; boş metin 0", () => {
    expect(kontrol("## Egzersiz\n- Tonlama çalışması").scores.prozodi).toBe(1);
    expect(kontrol("").scores.prozodi).toBe(0);
  });
});

describe("çıktı sözleşmesi", () => {
  it("`talimat` döndürülmez; fonik_yok, rubrik, prozodi; ayrıntılar puanları yansıtır", () => {
    const r = kontrol("## Rubrik\n- Kelime/dk\n- Doğruluk %\n- Prozodi");
    expect(Object.keys(r.scores).sort()).toEqual(["fonik_yok", "prozodi", "rubrik"]);
    expect(r.scores).toEqual({ fonik_yok: 1, rubrik: 1, prozodi: 1 });
    expect(r.details).toMatchObject({ fonik_yok: 1, rubrik: 1, prozodi: 1 });
    expect(r.hard).toEqual([]);
  });
});
