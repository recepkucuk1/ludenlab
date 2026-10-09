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
  it("pencere: terimin ≤3 sözcük sonrasındaki olumsuz fiil korur; 4. sözcük pencere dışıdır", () => {
    expect(bul("Ceza şu bu kullanılmaz.")).toEqual([]); // 3. sözcük
    expect(bul("Ceza şu bu o kullanılmaz.")).toEqual(["ceza"]); // 4. sözcük
    expect(bul("Ceza kullanılmaz.")).toEqual([]);
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
    expect(bul("Ceza, tehdit, utandırma kullanılmaz.")).toEqual(["ceza"]); // bilinen sınır: sözcük içeren ara öğe listeyi böler
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
