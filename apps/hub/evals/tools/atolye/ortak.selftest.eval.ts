// apps/hub/evals/tools/atolye/ortak.selftest.eval.ts
import { describe, expect, it } from "vitest";
import * as markdown from "../../lib/markdown";
import { bolumAgaci, bolumSatirlari, derinlik, maddeler, mebSatirlari, olumluGecisler, olumsuzMu } from "./ortak";

const CEZA = /(?<!\p{L})ceza(?!sız)\p{L}*|t[iı]me-?out/u;

describe("olumsuzMu", () => {
  const evet = [
    "Cezalandırıcı yöntemler kullanılmaz.", "Ceza vermeyin.", "Time-out yerine sakin köşe.", "Ceza yok.", "Hiçbir ceza önerilmez.",
    "Utandırıcı strateji önerilmemelidir.", "Cezadan kaçının.", "Cezalandırmak yasaktır.", "Uygulamayınız.", "Kullanılmayacak yaklaşımlar:",
    "Time-out asla uygulanmaz", "Bu yöntem uygun değil.", "Cezalandırma olmadan öğretin.", "Kullanmadı.", "Önerilmemiş.", "Uzak durulur.",
  ];
  const hayir = [
    "Time-out uygulayın.", "Çocuğu cezalandırın.", "Ceza verilir.", "Mola odasına gönderin.", "Yoksun bırakın.",
    "Mezun olunca okuyun.", "Hece kartlarını kullanın.", "Tekrar edin.",
    "Yerine koyma davranışı (aynı işlevi gören)", "Yerine koyma davranışını öğretin.",
  ];
  it.each(evet)("olumsuz: %s", (s) => expect(olumsuzMu(s)).toBe(true));
  it.each(hayir)("olumlu: %s", (s) => expect(olumsuzMu(s)).toBe(false));
  it("büyük harf (tr-TR) ve noktalama: 'KULLANILMAZ', 'Kaçının!'", () => {
    expect(olumsuzMu("TIME-OUT KULLANILMAZ")).toBe(true);
    expect(olumsuzMu("Kaçının!")).toBe(true);
  });
});

describe("olumluGecisler", () => {
  const bul = (t: string) => olumluGecisler(t, CEZA);
  it("olumlu öneri bulunur (tr-TR büyük harf ve tire biçimleri dahil)", () => {
    expect(bul("Time-out uygulayın.")).toEqual(["time-out"]);
    expect(bul("TIME-OUT uygulayın.")).toEqual(["tıme-out"]);
    expect(bul("Davranışı cezalandırın.")).toEqual(["cezalandırın"]);
    expect(bul("Önce uyarı, sonra time-out ve ceza.")).toEqual(["time-out", "ceza"]);
  });
  it("olumsuzlama korumalı: aynı cümlede kaçınma izi varsa geçiş sayılmaz", () => {
    expect(bul("Cezalandırıcı yöntemler kullanılmaz.")).toEqual([]);
    expect(bul("Time-out yerine sakin köşe kullanın.")).toEqual([]);
    expect(bul("Ceza vermeyin.")).toEqual([]);
  });
  it("'cezasız' ceza sayılmaz; ama aynı satırdaki başka bir cümle olumluysa o sayılır", () => {
    expect(bul("Cezasız, olumlu pekiştirme.")).toEqual([]);
    expect(bul("Ceza yok. Time-out uygulayın.")).toEqual(["time-out"]);
  });
  it("etiket satırı: kaçınılacak listesi altındaki maddeler sayılmaz; yeni başlık bağlamı sıfırlar", () => {
    const t = "**Kaçınılacak stratejiler:**\n- Time-out\n- Ceza\n\n## Pekiştirme\n- Time-out uygulayın";
    expect(bul(t)).toEqual(["time-out"]);
    expect(bul("## Kullanılmayacak yöntemler\n| Yöntem | Neden |\n|---|---|\n| Ceza | ters etki |")).toEqual([]);
  });
  it("paragraf cümlesinin olumsuzlaması sonraki paragrafa sızmaz (yalnız madde satırları etiketi devralır)", () => {
    expect(bul("Ceza kullanmayın.\nTime-out uygulayın.")).toEqual(["time-out"]);
  });
  it("boş metin güvenli; g bayraksız kalıp tekrar çağrıda durum taşımaz", () => {
    expect(bul("")).toEqual([]);
    expect(bul("ceza")).toEqual(["ceza"]);
    expect(bul("ceza")).toEqual(["ceza"]);
  });
});

describe("olumluGecisler: bitişik olumsuzlama tasarımı", () => {
  const bul = (t: string) => olumluGecisler(t, CEZA);
  it("yan cümlenin SON sözcüğü olumsuz yüklemse uzaklığa bakılmaz; yüklem sonda değilse yalnız ilk 3 sözcük korur", () => {
    expect(bul("Ceza kullanılmaz.")).toEqual([]);
    expect(bul("Ceza şu bu kullanılmaz.")).toEqual([]);
    expect(bul("Ceza şu bu o kullanılmaz.")).toEqual([]); // yüklem sondadır
    expect(bul("Time-out bu yaş grubunda önerilmez.")).toEqual([]);
    expect(bul("Time-out ve ceza bu planda yer almaz.")).toEqual([]);
    expect(bul("Time-out uygun bir strateji olarak görülmez.")).toEqual([]);
    // yalnız anlamca olumlu cümleler yakalanır: yüklem olumsuz değil ya da olumsuz fiil sonda değil ve ilk 3 sözcükten sonra
    expect(bul("Ceza şu bu o ters etki yapar.")).toEqual(["ceza"]);
    expect(bul("Ceza şu bu o kullanılmaz bence.")).toEqual(["ceza"]);
    expect(bul("Ceza şu bu kullanılmaz bence.")).toEqual([]); // 3. sözcük
  });
  it("'yerine' yalnız terimin HEMEN ardından olumsuzlar: 'Mola odası yerine…' temiz, 'Ödül yerine ceza…' ihlal", () => {
    expect(olumluGecisler("Mola odası yerine sakin köşe.", /mola odası/u)).toEqual([]);
    expect(olumluGecisler("Ödül yerine mola odası verin.", /mola odası/u)).toEqual(["mola odası"]);
    expect(olumluGecisler("Mola odası sakin köşe yerine uygulanır.", /mola odası/u)).toEqual(["mola odası"]);
    expect(olumluGecisler("Time-out yerine koyma davranışı.", CEZA)).toEqual(["time-out"]); // "yerine koy…" bir terimdir
  });
  it("yan cümle (virgül) olumsuzlamayı keser; terim kendi yan cümlesini bitiriyorsa liste sayılır ve pencere sürer", () => {
    expect(bul("Ceza verin, cezasız olmaz.")).toEqual(["ceza"]);
    expect(bul("Time-out uygulayın, gelmezse uyarın.")).toEqual(["time-out"]);
    expect(bul("Ceza, time-out ve mola odası kullanılmaz.")).toEqual([]);
    expect(bul("Ceza, tehdit, utandırma kullanılmaz.")).toEqual([]); // virgüllü liste: yüklem son yan cümlede
    expect(bul("Ceza, bağırma, utandırma gibi yöntemler kullanılmaz.")).toEqual([]);
    expect(bul("Time-out, ters etki yaptığı için önerilmez.")).toEqual([]); // terim yan cümlesini bitirir → son yan cümlenin yüklemi
    expect(bul("Time-out, sakin köşe ve ödül verin.")).toEqual(["time-out"]); // liste, olumlu yüklem
    expect(bul("Ceza, tehdit, utandırma ters etki yapar.")).toEqual(["ceza"]); // anlamca olumlu: bilinen sınır değil, doğru yakalama
    expect(bul("Time-out uygulayın ama bunu sık yapmayın.")).toEqual(["time-out"]); // karşıt bağlaç yan cümleyi ayırır
    expect(bul("| Yöntem | Not |\n|---|---|\n| Time-out | uygulayın | ters etki yapmaz |")).toEqual(["time-out"]); // hücreler tek yan cümle değil
  });
  it("'yerine' + fiilimsi / tek sözcük: 'X-mek yerine' X'i reddeder; uzak 'yerine' olumlu öneridir", () => {
    const ceza = /(?<!\p{L})ceza|t[iı]me-?out|mola odası|phonics/u;
    const temiz = [
      "Ceza vermek yerine pekiştirme kullanın.", "Time-out uygulamak yerine sakin köşe sunun.", "Mola odasına göndermek yerine yönlendirin.",
      "Phonics yaklaşımı yerine hece temelli çalışın.", "Phonics kurallarını aktarmak yerine hece çalışın.", "Ceza yerine pekiştirme.",
      "Ceza uygulaması yerine pekiştirme.", "Time-out göndermeyi yerine yönlendirme.", // fiilimsi -meyi
    ];
    const ihlal = ["Mola odası sakin köşe yerine uygulanır.", "Ödül yerine ceza verin.", "Ceza şu bu yerine verilir.", "Time-out yerine koyma davranışı."];
    for (const c of temiz) expect(olumluGecisler(c, ceza), c).toEqual([]);
    for (const c of ihlal) expect(olumluGecisler(c, ceza), c).not.toEqual([]);
  });
  it("'yerine'den önceki sözcük fiilimsi (-mak, -ma, -me, -ması, -meyi...): uzak olsa da X reddedilir", () => {
    const t = (c: string) => olumluGecisler(c, /phonics/u);
    expect(t("Phonics kurallarını aktarma yerine hece temelli çalışın.")).toEqual([]); // -ma
    expect(t("Phonics kurallarını aktarılması yerine hece temelli çalışın.")).toEqual([]); // -ması
    expect(t("Phonics kurallarını aktarmayı yerine hece temelli çalışın.")).toEqual([]); // -mayı
    expect(t("Phonics kurallarını almak yerine hece temelli çalışın.")).toEqual([]); // -mak
    expect(t("Phonics kurallarını sakin köşe yerine hece temelli çalışın.")).toEqual(["phonics"]); // fiilimsi değil: olumlu öneri
  });
  it("yan cümlenin SON sözcüğü değil/kaçınma yüklemiyse (5. sözcükten sonra bile) olumsuzlama", () => {
    expect(bul("Time-out bu yaş grubunda çocuklar için her zaman uygun değildir.")).toEqual([]);
    expect(bul("Time-out bu yaş grubunda çocuklar için her zaman yoktur.")).toEqual([]);
    expect(bul("Time-out bu yaş grubunda çocuklar için her zaman kaçınılır.")).toEqual([]);
    expect(bul("Time-out bu yaş grubunda çocuklar için her zaman uygundur.")).toEqual(["time-out"]);
  });
  it("virgüllü liste yalnız VİRGÜLLE bağlı yan cümlelere taşınır: ';' ya da '|' sonrası parça listeyi bitirir", () => {
    expect(bul("Time-out, sakin köşe; ceza kullanılmaz.")).toEqual(["time-out"]);
    expect(bul("Time-out, sakin köşe | ceza kullanılmaz.")).toEqual(["time-out"]);
    expect(bul("Time-out, sakin köşe, ceza kullanılmaz.")).toEqual([]);
  });
  it("karşıt bağlaç ('ama', 'fakat', 'ancak') yan cümleyi ayırır: sondaki olumsuz yüklem öncekini korumaz", () => {
    expect(bul("Time-out uygulayın ama sık yapmayın.")).toEqual(["time-out"]);
    expect(bul("Time-out uygulayın fakat uzun sürmesin.")).toEqual(["time-out"]);
    expect(bul("Ceza uygulanmaz ama time-out uygulayın.")).toEqual(["time-out"]);
  });
  it("yeni ekler: -mayız, -mam, -maksızın; 'tamam' olumsuz fiil değil", () => {
    expect(bul("Ceza kullanmayız.")).toEqual([]);
    expect(bul("Time-out uygulamam.")).toEqual([]);
    expect(bul("Time-out uygulamaksızın yönlendirin.")).toEqual([]);
    expect(bul("Tamam, time-out uygulayın.")).toEqual(["time-out"]);
    expect(bul("Time-out tamam.")).toEqual(["time-out"]);
    expect(olumsuzMu("Kullanmam.")).toBe(true);
    expect(olumsuzMu("Tamam.")).toBe(false);
  });
  it("satır içi olumsuz etiket: iki nokta ÖNCESİ olumsuz etiketse sonrası taranmaz; 'Unutmayın:' ve 'İstenmeyen davranış olduğunda:' etiket değil", () => {
    expect(bul("**Kaçınılacak yöntemler:** time-out, ceza")).toEqual([]);
    expect(bul("Kullanılmayacak yöntemler: time-out")).toEqual([]);
    expect(bul("- **Kullanmayın:** time-out")).toEqual([]);
    expect(bul("Unutmayın: time-out uygulayın.")).toEqual(["time-out"]);
    expect(bul("**İstenmeyen davranış olduğunda:** 2 dk time-out")).toEqual(["time-out"]);
    expect(bul("**İstenmeyen davranış olduğunda:**\n- 2 dk time-out")).toEqual(["time-out"]);
    expect(bul("**İstenmeyen yöntemler:**\n- 2 dk time-out")).toEqual([]);
    expect(bul("Hedef davranış görülmediğinde: time-out yok.")).toEqual([]); // iki nokta sonrası kendi olumsuzluğuyla
    expect(bul("Hedef davranış görülmediğinde: time-out uygulayın.")).toEqual(["time-out"]);
  });
  it("'-madan/-meden' olumsuzdur; 'önce' izliyorsa 'önce'nin öncesi anlamındadır (olumsuz değil)", () => {
    expect(bul("Uyarıyı utandırmadan verin.")).toEqual([]);
    expect(bul("Time-out uygulamadan önce uyarın.")).toEqual(["time-out"]);
    expect(bul("Time-out uygulamadan uyarın.")).toEqual([]);
    expect(bul("Çocuğu teneffüsten mahrum etmeden yönlendirin.")).toEqual([]);
  });
  it("terimin kendi eki: -sız, -madan, -mamalı, -mayan; asla/hiçbir hemen önünde", () => {
    expect(olumluGecisler("Cezasız plan.", /ceza\p{L}*/u)).toEqual([]);
    expect(bul("Cezalandırılmamalıdır.")).toEqual([]);
    expect(bul("Cezalandırmayan bir plan.")).toEqual([]);
    expect(bul("Asla time-out uygulayın.")).toEqual([]);
    expect(bul("Asla ödül vermeyin, time-out uygulayın.")).toEqual(["time-out"]); // "asla" terimin hemen önünde değil
  });
  it("'asla'/'hiçbir' hemen önünde (fiilsiz de); 'uzak dur/kal' ≤3 sözcük sonrasında", () => {
    expect(bul("Hiçbir time-out.")).toEqual([]);
    expect(bul("Hiçbirinde time-out.")).toEqual([]); // "hiçbir" + ek de olumsuzdur
    expect(bul("Asla time-out.")).toEqual([]);
    expect(bul("Cezadan uzak durun.")).toEqual([]);
    expect(bul("Time-out'tan uzak kalın.")).toEqual([]);
    expect(bul("Time-out uzak köşede uygulanır.")).toEqual(["time-out"]);
    expect(bul("Hiçbir öğrenci için olmasa da time-out.")).toEqual(["time-out"]); // "hiçbir" terimin hemen önünde değil
  });
  it("tablo satırı: hücreler aynı cümlede ('| Time-out | uygulanmaz |' temiz; '| Time-out | uygulayın |' ihlal)", () => {
    expect(bul("| Yöntem | Durum |\n|---|---|\n| Time-out | uygulanmaz |")).toEqual([]);
    expect(bul("| Yöntem | Durum |\n|---|---|\n| Time-out | uygulayın |")).toEqual(["time-out"]);
  });
  it("cümlenin başka yerindeki olumsuz fiil terimi korumaz ('unutmayın', 'gerekmez', 'gelmezse')", () => {
    expect(bul("Unutmayın: time-out uygulayın.")).toEqual(["time-out"]);
    expect(bul("Gerekmezse bile time-out uygulayın.")).toEqual(["time-out"]);
    expect(bul("Time-out uygulayın. Gelmezse yeniden deneyin.")).toEqual(["time-out"]);
    expect(bul("Kurala uymazsa time-out verin.")).toEqual(["time-out"]);
  });
  it("etiket mirası: yalnız başlık ve ':' ile biten satır; paragraf mirası YOK; liste öğesi olumsuz etiket altında temiz", () => {
    expect(bul("Kullanılmayacak yöntemler:\n- Time-out")).toEqual([]);
    expect(bul("**Kaçınılacaklar**\n- Time-out")).toEqual([]);
    expect(bul("## Kaçınılacak yöntemler\n- Time-out")).toEqual([]);
    expect(bul("Time-out kullanılmaz.\n- Time-out")).toEqual(["time-out"]); // paragraf cümlesi temiz; madde paragraftan miras almaz
  });
  it("etiket 'olumsuz' sayılmaz: etkin 'utandırmayan' başlığı ya da olumlu başlık madde listesini korumaz", () => {
    expect(bul("## Pekiştirme (cezalandırmayan, olumlu)\n- Time-out")).toEqual(["time-out"]);
    expect(bul("## Pekiştirme\n- Time-out")).toEqual(["time-out"]);
  });
  it("karşıt kalıp (3. parametre): terimden sonraki ≤5 sözcükte geçerse iptal; terim önündeki işaret iptal etmez", () => {
    const karsit = /aksine/u;
    expect(olumluGecisler("Time-out'un aksine sakin köşe.", /time-out/u, karsit)).toEqual([]);
    expect(olumluGecisler("Aksine time-out uygulayın.", /time-out/u, karsit)).toEqual(["time-out"]);
    expect(olumluGecisler("Time-out uygulayın.", /time-out/u)).toEqual(["time-out"]);
    // terimin kendi eki karşıtlığa dahil: "sight words'ten farklı"
    expect(olumluGecisler("Time-out'tan farklı bir yöntem.", /time-out/u, /(?:ten|tan) farklı/u)).toEqual([]);
  });
  it("eşleşme kelime sonuna uzatılır: 'mola odasına' ekini penceresine katmaz", () => {
    expect(olumluGecisler("Mola odasına gönderin.", /mola odası/u)).toEqual(["mola odası"]);
    expect(olumluGecisler("Mola odasına gönderilmez.", /mola odası/u)).toEqual([]);
    expect(olumluGecisler("Mola odasına şu bu kullanılmaz.", /mola odası/u)).toEqual([]); // ek pencereden sayılmaz: 3. sözcük "kullanılmaz"
    expect(olumluGecisler("Time-out'tan sonra şu kullanılmaz.", /time-out/u)).toEqual([]);
  });
});

describe("yeniden dışa aktarımlar (lib/markdown'dan): Task 13 içe aktarımları kararlı", () => {
  it("bolumAgaci, bolumSatirlari, derinlik, maddeler, olumsuzMu hâlâ ortak.ts'ten çıkar", () => {
    // Aynı işlevler (kopya değil): Task 13 içe aktarımları `ortak.ts` üzerinden çalışmaya devam eder
    expect(bolumAgaci).toBe(markdown.bolumAgaci);
    expect(bolumSatirlari).toBe(markdown.bolumSatirlari);
    expect(maddeler).toBe(markdown.maddeler);
    expect(derinlik).toBe(markdown.derinlik);
    expect(derinlik({ level: 2 })).toBeLessThan(derinlik({ level: 3 }));
    expect(derinlik({ level: "bold" })).toBeGreaterThan(derinlik({ level: 4 }));
    expect(olumsuzMu("Unutmayın.")).toBe(true); // kaba yoklama (terimsiz); olumluGecisler bunu kullanmaz
    expect(olumsuzMu("Time-out uygulayın.")).toBe(false);
  });
});

describe("mebSatirlari", () => {
  it("kod verilmediyse boş; verildiyse kod satırı + modele giden hedef bloğu", () => {
    expect(mebSatirlari(undefined)).toEqual([]);
    const s = mebSatirlari("3.2.5");
    expect(s[0]).toBe("- MEB hedef kodu: 3.2.5");
    expect(s.join("\n")).toContain("- MEB hedef alanı:");
    expect(s.join("\n")).toContain("(3.2.5)");
    expect(s.join("\n")).toContain("• 3.2.5.1");
  });
  it("hedef davranış kodları verilirse yalnız onlar; bilinmeyen kodda yalnız kod satırı", () => {
    const hepsi = mebSatirlari("3.2.5").filter((l) => l.includes("•")).length;
    const bir = mebSatirlari("3.2.5", ["3.2.5.1"]).filter((l) => l.includes("•")).length;
    expect(hepsi).toBeGreaterThan(bir);
    expect(bir).toBe(1);
    expect(mebSatirlari("9.9.9")).toEqual(["- MEB hedef kodu: 9.9.9"]);
  });
});
