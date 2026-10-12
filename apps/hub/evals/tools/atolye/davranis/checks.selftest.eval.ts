// apps/hub/evals/tools/atolye/davranis/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { davranisChecks } from "./checks";
const md = "## ABC analizi\n| Öncül | Davranış | Sonuç |\n|---|---|---|\n| a | b | c |\n## Pekiştirme planı\n- Övgü";
describe("davranisChecks", () => {
  it("ABC altında tablo var, cezalandırıcı strateji yok → 1/1", () => {
    const r = davranisChecks({ body: { hedefDavranis: "x", ortam: "sinif" }, text: md });
    expect(r.scores).toMatchObject({ abc_tablo: 1, ceza_yok: 1 });
  });
  it("'mola odası' / 'time-out' → ceza_yok 0; tablo yoksa 0", () => {
    const r = davranisChecks({ body: { hedefDavranis: "x", ortam: "sinif" }, text: "## ABC analizi\n- Öncül: a\n## Plan\n- Time-out uygulayın" });
    expect(r.scores).toMatchObject({ abc_tablo: 0, ceza_yok: 0 });
  });
});

/* ── Ek kapsam: tablo biçimleri, ceza kalıpları ve olumsuzlama koruması ── */

const body = { hedefDavranis: "x", ortam: "sinif" as const };
const kontrol = (text: string) => davranisChecks({ body, text });
const tablo = "| Öncül | Davranış | Sonuç |\n|---|---|---|\n| a | b | c |";

describe("ABC tablosu", () => {
  it.each([
    ["düz bölüm", `## ABC analizi\n${tablo}`, 1],
    ["numaralı + açıklamalı başlık", `## 2. ABC analizi (Öncül → Davranış → Sonuç)\n${tablo}`, 1],
    ["büyük harfli başlık (tr-TR)", `## ABC ANALİZİ\n${tablo}`, 1],
    ["kalın sözde başlık", `**ABC analizi**\n${tablo}`, 1],
    ["başlıkta 'abc' yok, 'öncül' var", `## Öncül–Davranış–Sonuç\n${tablo}`, 1],
    ["tablo alt başlığın altında", `## ABC analizi\nAşağıdaki tabloya bakın.\n### Gözlem tablosu\n${tablo}`, 1],
    ["tablo kalın alt etiketin altında", `### ABC analizi\n**Tablo**\n${tablo}`, 1],
    ["ayraç satırı iki nokta ile hizalı", "## ABC analizi\n| A | B | C |\n|:--|:-:|--:|\n| a | b | c |", 1],
    ["boşluklu ayraç", "## ABC analizi\n| A | B | C |\n| --- | --- | --- |\n| a | b | c |", 1],
    ["tablo ABC bölümünün DIŞINDA", `## ABC analizi\n- Öncül: a\n## İşlev hipotezi\n${tablo}`, 0],
    ["tablo yok (maddeler)", "## ABC analizi\n- Öncül: a\n- Davranış: b\n- Sonuç: c", 0],
    ["yalnız başlık satırı, ayraç ve gövde yok", "## ABC analizi\n| Öncül | Davranış | Sonuç |", 0],
    ["ayraç satırı yok (tablo değil)", "## ABC analizi\n| Öncül | Davranış | Sonuç |\n| a | b | c |", 0],
    ["ayraç var ama gövde satırı yok", "## ABC analizi\n| Öncül | Davranış | Sonuç |\n|---|---|---|", 0],
    ["yatay çizgi tablo değil", "## ABC analizi\n---\n- madde", 0],
    ["ABC bölümü yok", `## Plan\n${tablo}`, 0],
    ["boş metin", "", 0],
  ])("%s → %d", (_ad, text, beklenen) => expect(kontrol(text).scores.abc_tablo).toBe(beklenen));
});

describe("ceza_yok: cezalandırıcı/utandırıcı strateji (prompt: 'Cezalandırıcı/utandırıcı strateji önerme')", () => {
  const ihlal = [
    "Time-out uygulayın.", "TIME-OUT uygulayın.", "time out kullanın.", "Time–out (en tire) uygulayın.", "Timeout yapın.",
    "Çocuğu mola odasına gönderin.", "Davranış tekrarlanırsa ceza verilir.", "Cezalandırın.", "Teneffüsten mahrum bırakılır.",
    "Çocuğu oyundan yoksun bırakın.", "Ödülünden mahrum edin.", "Çocuğu arkadaşlarının önünde utandırın.", "Sınıftan çıkarın.",
    "- Time-out", "| Strateji | Ceza |", "Önce uyarı, sonra ceza.",
  ];
  const temiz = [
    // olumsuzlama / kaçınma: ihlal değil
    "Cezalandırıcı yöntemler kullanılmaz.", "Ceza vermeyin.", "Time-out yerine sakin köşe kullanın.", "Mola odası önerilmez.",
    "Hiçbir ceza uygulanmaz.", "Utandırıcı stratejilerden kaçının.", "Ceza yok.", "Cezalandırma yasaktır.",
    // 'cezasız' ve alakasız sözcükler
    "Cezasız, olumlu pekiştirme.", "Cezasız bir plan.", "Cezayir'de.", "Mola verin (sakinleşme molası).", "Zaman çizelgesi hazırlayın.",
    "Tekrarlayan görevlerde küçük adımlar kullanın.", "Teneffüste özgür oyun hakkı tanıyın.", "Oyun temelli pekiştirme.",
    "Olumlu, somut, kademeli pekiştirme.",
  ];
  it.each(ihlal)("ihlal: %s", (cumle) => expect(kontrol(`## ABC analizi\n${tablo}\n## Plan\n${cumle}`).scores.ceza_yok).toBe(0));
  it.each(temiz)("temiz: %s", (cumle) => expect(kontrol(`## ABC analizi\n${tablo}\n## Plan\n${cumle}`).scores.ceza_yok).toBe(1));
  describe("bitişik olumsuzlama: koordinatörün regresyon tabloları", () => {
    const plan = (cumle: string) => kontrol(`## Pekiştirme planı\n${cumle}`).scores.ceza_yok;
    // KURALI İHLAL EDEN öneriler: olumsuzlama terimin yanında değil (önünde, yan cümlede, başka kelimede ya da "önce" ile)
    const ihlal = [
      "Ceza verin, cezasız olmaz.", "Kaçınma amaçlı bağırırsa mola odasına gönderin.", "Kurala uymazsa teneffüsten mahrum bırakılır.",
      "Kurallara uymayan öğrenciye time-out verin.", "Yönergeye uymadığında ceza verin.", "Ödül yerine ceza verin.",
      "Hedef davranış yeterli değilse tepki bedeli uygulayın.", "Time-out uygulamadan önce uyarı verin.",
      "Unutmayın: time-out uygulayın.", "Time-out uygulayın, gelmezse uyarı verin.", "Kaçınma işlevli davranışta time-out uygulayın.",
      "Gerekmezse bile ceza verin.", "Ceza şu bu o ters etki yapar.", // yüklem olumsuz değil
    ];
    // KURALIN KENDİSİNİ ANLATAN / olumsuzlanmış ifadeler
    const temiz = [
      "Evde ceza veya tehdit kullanılmaması konusunda anlaşın.", "Okul ve ev cezalandırıcı bir dil kullanmasın.", "Cezaya başvurmamak esastır.",
      "Cezalandırıcı yöntemlere başvurmadan hedef davranışı öğretin.", "Uyarıyı utandırmadan verin.", "Davranışı cezalandırmadan yeniden yönlendirin.",
      "Mola odası yerine sakin köşe kullanın.", "Çocuğu teneffüsten mahrum etmeden yönlendirin.", "Çocuğu oyundan mahrum etmeden yönlendirin.",
      "Time-out'tan kaçının.", "Cezadan kaçınılır.", "Ceza gerekmez.", "Cezalandırıcı, utandırıcı yöntemler kullanılmaz.",
      "Ceza, tehdit veya utandırma kullanılmaz.", "Ceza ve time-out ve mola odası kullanılmaz.", "Hiçbir ceza kullanılmaz.", "Asla time-out uygulamayın.",
      "Time-out uygulamadan davranışı yeniden yönlendirin.", "Ceza şu bu o kullanılmaz.", "Time-out uygulanmıyor.", "Cezalandırmak uygun değildir.",
    ];
    it.each(ihlal)("ihlal: %s", (c) => expect(plan(c)).toBe(0));
    it.each(temiz)("temiz: %s", (c) => expect(plan(c)).toBe(1));
    describe("kuralın kendisini söyleyen uyumlu planlar ('yerine' fiilimsi, yan cümle sonu yüklem, satır içi etiket, ekler)", () => {
      const temiz2 = [
        // 1. "X-mek yerine": X reddedilir
        "Ceza vermek yerine olumlu pekiştirme kullanın.", "Time-out uygulamak yerine sakin köşe sunun.", "Mola odasına göndermek yerine yönlendirin.",
        "Ceza yerine pekiştirme kullanın.", "Mola odası yerine sakin köşe kullanın.",
        // 2. Yüklem sonda: uzaklığa bakılmaz
        "Time-out bu yaş grubunda önerilmez.", "Time-out ve ceza bu planda yer almaz.", "Mola odası, uygun bir strateji olarak görülmez.",
        "Time-out, ters etki yaptığı için önerilmez.", "Ceza, tehdit, utandırma kullanılmaz.", "Ceza, bağırma, utandırma gibi yöntemler kullanılmaz.",
        "Time-out uygulanması bu planda uygun görülmemektedir.", "Cezalandırıcı bir dil bu yaşta ve bu ortamda hiçbir koşulda kullanılmaz.",
        // 4. Yeni ekler: -mayız, -mam, -maksızın
        "Ceza kullanmayız.", "Time-out uygulamam.", "Cezalandırıcı bir dil kullanmaksızın yönlendirin.", "Time-out uygulamayız.",
        // 5. etiketler yöntem adlıysa liste açar; "ne … ne de"
        "Ne ceza ne de time-out kullanılır.", "Kullanmayın: ceza, time-out", "Kullanılmayacak yöntemler: time-out, mola odası.", "**Kaçınılacak durum:** gecikme.",
      ];
      const ihlal2 = [
        "Mola odası sakin köşe yerine uygulanır.", // olumlu öneri: sakin köşenin YERİNE mola odası
        "Ödül yerine ceza verin.", "Time-out uygulayın ama bunu sık yapmayın.", "Time-out uygulayın, çocuk ağlamazsa övgü verin.",
        "Time-out bu yaş grubunda uygulanır.", "Time-out ve ceza bu planda yer alır.", "Ceza, bağırma, utandırma gibi yöntemler uygulanır.",
        "Tamam, time-out uygulayın.", // "tamam" -mam gibi görünür, olumsuz fiil değil
        // etiket yöntem adlı değil: iki noktadan sonrası ÖNERİLEN şey
        "Taviz vermeyin: time-out uygulayın.", "Bağırma kabul edilmez: mola odasına gönderin.", "Pazarlık etmeyin: ceza verin.",
        "Kural ihlali tolere edilmez: teneffüsten mahrum bırakılır.", "Kaçınılacak durum: gecikme. Gecikirse time-out uygulayın.",
        // çekimli fiil + "ve" yan cümleyi böler; tarif sözcüğü; "yerine" + ödül
        "Time-out uygulanır ve o gün yıldız verilmez.", "Time-out süresince çocuk oyuncaklarla oynayamaz.", "Mola odasını ödül yerine kullanın.",
      ];
      it.each(temiz2)("temiz: %s", (c) => expect(kontrol(`## Pekiştirme planı\n${c}`).scores.ceza_yok).toBe(1));
      it.each(ihlal2)("ihlal: %s", (c) => expect(kontrol(`## Pekiştirme planı\n${c}`).scores.ceza_yok).toBe(0));
      it("satır içi olumsuz etiket: iki noktadan SONRASI kaçınılanların listesidir", () => {
        for (const c of ["**Kaçınılacak yöntemler:** time-out, ceza ve mola odası", "Kullanılmayacak yöntemler: time-out", "- **Kullanmayın:** ceza, time-out", "Kaçınılması gerekenler: ceza"]) {
          expect(kontrol(`## Pekiştirme planı\n${c}`).scores.ceza_yok, c).toBe(1);
        }
        // olumsuz etiket değil: iki nokta sonrası taranır
        for (const c of ["Unutmayın: time-out uygulayın.", "Not: time-out uygulayın.", "**İstenmeyen davranış olduğunda:** 2 dk time-out uygulayın.", "Kurala uymazsa: mola odası."]) {
          expect(kontrol(`## Pekiştirme planı\n${c}`).scores.ceza_yok, c).toBe(0);
        }
      });
      it("'İstenmeyen davranış olduğunda:' etiketi (ayrı satır) liste açmaz: altındaki '2 dk time-out' İHLAL; 'istenmeyen yöntemler:' açar", () => {
        expect(kontrol("## Pekiştirme planı\n**İstenmeyen davranış olduğunda:**\n- 2 dk time-out").scores.ceza_yok).toBe(0);
        expect(kontrol("## Pekiştirme planı\n**İstenmeyen yöntemler:**\n- 2 dk time-out").scores.ceza_yok).toBe(1);
      });
    });
    it("madde, önceki PARAGRAFTAN olumsuzlama miras almaz ('Hedef davranış görülmediğinde övgü verilir.' + '- Mola odası uygulayın.')", () => {
      expect(kontrol("## Pekiştirme planı\nHedef davranış görülmediğinde övgü verilir.\n- Mola odası uygulayın.").scores.ceza_yok).toBe(0);
      expect(kontrol("## Pekiştirme planı\nCeza kullanılmaz.\n- Mola odası uygulayın.").scores.ceza_yok).toBe(0); // paragraf olumsuzlaması maddeye geçmez
    });
    it("başlık satırının KENDİSİ: '## Pekiştirme Planı (utandırmayan, olumlu)' ihlal değil; altındaki 'Time-out uygulayın' ihlal (etkin 'utandırmayan' liste açmaz)", () => {
      expect(kontrol("## Pekiştirme Planı (utandırmayan, olumlu)").scores.ceza_yok).toBe(1);
      expect(kontrol("## Pekiştirme Planı (utandırmayan, olumlu)\n- Time-out uygulayın.").scores.ceza_yok).toBe(0);
    });
    it("':' ile biten satır ve olumsuzlanmış başlık madde listesine miras kalır; olumlu başlık altı taranır", () => {
      expect(kontrol("## Plan\nŞunları kullanmayın:\n- Ceza\n- Time-out").scores.ceza_yok).toBe(1);
      expect(kontrol("## Kullanılmayacak yöntemler\n- Ceza\n- Mola odası").scores.ceza_yok).toBe(1);
      expect(kontrol("## Kullanılmaması gereken yöntemler\n- Ceza").scores.ceza_yok).toBe(1);
      expect(kontrol("## Plan\nBu yöntemler uygulanır:\n- Time-out").scores.ceza_yok).toBe(0);
      expect(kontrol("## Pekiştirme\n- Time-out").scores.ceza_yok).toBe(0);
    });
    it("'kaçınma' (isim; promptun işlev adı) olumsuzlama değildir; 'kaçının/kaçınılır/kaçınmak/kaçınarak' fiilleri öyledir", () => {
      expect(plan("Kaçınma işlevinde time-out uygulayın.")).toBe(0);
      expect(plan("Time-out kaçınmayı pekiştirir.")).toBe(0);
      expect(plan("Time-out'tan kaçınmak gerekir.")).toBe(1);
      expect(plan("Cezadan kaçınarak yönlendirin.")).toBe(1);
    });
  });
  it("etiketli kaçınma listesi: 'Kaçınılacak stratejiler' altındaki maddeler ihlal sayılmaz; başka başlık altındaki sayılır", () => {
    expect(kontrol("## Plan\n**Kaçınılacak stratejiler:**\n- Time-out\n- Ceza").scores.ceza_yok).toBe(1);
    expect(kontrol("## Kullanılmayacak yöntemler\n| Yöntem | Neden |\n|---|---|\n| Mola odası | ters etki |").scores.ceza_yok).toBe(1);
    expect(kontrol("## Plan\n**Kaçınılacak stratejiler:**\n- Ceza\n\n## Pekiştirme planı\n- Time-out uygulayın").scores.ceza_yok).toBe(0);
  });
  it("aynı cümlede olumsuzlama + öneri: olumsuzlama terimin YANINDA aranır; öneri ayrı terimse yakalanır", () => {
    expect(kontrol("Ceza vermeyin, ancak time-out uygulayın.").scores.ceza_yok).toBe(0);
    expect(kontrol("Ceza vermeyin. Time-out uygulayın.").scores.ceza_yok).toBe(0);
    expect(kontrol("Ceza vermeyin ve time-out kullanmayın.").scores.ceza_yok).toBe(1);
  });
  it("gözlem bölümleri (tanım, ABC analizi, işlev hipotezi) taranmaz: mevcut sonuç 'time-out'/'ceza' bir ÖNERİ değildir", () => {
    const abc = "## ABC analizi\n| Öncül | Davranış | Sonuç |\n|---|---|---|\n| geçiş | yere yatma | öğretmen mola odasına gönderiyor, ceza alıyor |";
    expect(kontrol(`## Tanım\n- Daha önce time-out uygulanmış.\n${abc}\n## İşlev hipotezi\n- Ceza almaktan kaçınma yerine dikkat çekme.\n## Pekiştirme planı\n- Övgü`).scores.ceza_yok).toBe(1);
    // alt başlıklar da gözlem bölümünün parçasıdır; sonraki üst düzey bölüm taranır
    expect(kontrol(`## ABC analizi\n### Gözlem\n- ceza\n## Pekiştirme planı\n- Ceza verin`).scores.ceza_yok).toBe(0);
    expect(kontrol(`## ABC analizi\n### Gözlem\n- ceza\n## Pekiştirme planı\n- Övgü`).scores.ceza_yok).toBe(1);
  });
  describe("gözlem bölümü ayrımı dar: yalnız tanım / ABC / öncül…sonuç / işlev hipotezi; strateji sözcüğü taşıyan başlık HİÇ atlanmaz", () => {
    it.each(["önleyici düzenlemeler", "yerine koyma davranışı", "pekiştirme planı", "veri toplama", "tutarlılık notu", "çevresel düzenleme"])(
      "'## ABC … %s' başlığı strateji bölümüdür: altındaki 'Time-out uygulayın' taranır",
      (strateji) => expect(kontrol(`## ABC kayıtlarıyla ${strateji}\n- Time-out uygulayın.`).scores.ceza_yok).toBe(0),
    );
    it("saf gözlem başlıkları atlanır: tanım, ABC analizi, öncül→davranış→sonuç, işlev hipotezi", () => {
      for (const h of ["## Hedef davranışın gözlenebilir tanımı", "## ABC analizi", "## Öncül–Davranış–Sonuç", "## İşlev hipotezi"]) {
        expect(kontrol(`${h}\n- Mola odasına gönderiliyor.`).scores.ceza_yok, h).toBe(1);
      }
    });
    it("başlık varyantları: 'İşlevsel Değerlendirme' gözlem (atlanır), 'Aile–Okul İş Birliği' strateji (taranır)", () => {
      expect(kontrol("## İşlevsel Değerlendirme\n- Mola odasına gönderiliyor.").scores.ceza_yok).toBe(1);
      expect(kontrol("## Aile–Okul İş Birliği\n- Evde ceza verin.").scores.ceza_yok).toBe(0);
      expect(kontrol("## ABC kayıtlarıyla iş birliği\n- Evde ceza verin.").scores.ceza_yok).toBe(0); // abc + iş birliği: strateji kazanır
    });
    it("yalnız 'öncül' ya da kelime içi 'tanım' bir gözlem başlığı DEĞİLDİR (daraltma): altı taranır", () => {
      expect(kontrol("## Öncül olaylar\n- Time-out uygulayın.").scores.ceza_yok).toBe(0);
      expect(kontrol("## Otanım listesi\n- Time-out uygulayın.").scores.ceza_yok).toBe(0); // kelime başı: `(?<!\p{L})tanım`
    });
  });
  it("'işlevi gören' başlıklı yerine koyma bölümü gözlem sayılmaz (yalın 'işlev' eşleşmesi tuzağı): öneri taranır", () => {
    expect(kontrol("## Yerine koyma davranışı (aynı işlevi gören uygun davranış)\n- Time-out uygulayın.").scores.ceza_yok).toBe(0);
    expect(kontrol("## 3. İşlev hipotezi\n- Time-out sonrası sakinleşiyor.").scores.ceza_yok).toBe(1);
  });
  it("ayrıntıda bulunan ifade yazılır; temizde boş", () => {
    expect(kontrol("## Plan\nTime-out uygulayın.").details.ceza).toBe("time-out");
    expect(kontrol("## Plan\nÖnce ceza, sonra time-out.").details.ceza).toBe("ceza|time-out");
    expect(kontrol("## Plan\nOlumlu pekiştirme.").details.ceza).toBe("");
  });
  it("boş metin: ihlal yok (yapı kontrolleri boşluğu yakalar)", () => {
    expect(kontrol("").scores.ceza_yok).toBe(1);
  });
});

describe("çıktı sözleşmesi", () => {
  it("`talimat` döndürülmez; yalnız abc_tablo ve ceza_yok; ayrıntılar puanları yansıtır", () => {
    const r = kontrol(md);
    expect(Object.keys(r.scores).sort()).toEqual(["abc_tablo", "ceza_yok"]);
    expect(r.details).toMatchObject({ abc_tablo: 1, ceza_yok: 1 });
    expect(r.hard).toEqual([]);
  });
});
