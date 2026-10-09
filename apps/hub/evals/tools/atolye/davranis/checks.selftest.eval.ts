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
  it("etiketli kaçınma listesi: 'Kaçınılacak stratejiler' altındaki maddeler ihlal sayılmaz; başka başlık altındaki sayılır", () => {
    expect(kontrol("## Plan\n**Kaçınılacak stratejiler:**\n- Time-out\n- Ceza").scores.ceza_yok).toBe(1);
    expect(kontrol("## Kullanılmayacak yöntemler\n| Yöntem | Neden |\n|---|---|\n| Mola odası | ters etki |").scores.ceza_yok).toBe(1);
    expect(kontrol("## Plan\n**Kaçınılacak stratejiler:**\n- Ceza\n\n## Pekiştirme planı\n- Time-out uygulayın").scores.ceza_yok).toBe(0);
  });
  it("aynı cümlede olumsuzlama + öneri: bilinen sınır (olumsuzlama cümleyi korur); ayrı cümlede öneri yakalanır", () => {
    expect(kontrol("Ceza vermeyin, ancak time-out uygulayın.").scores.ceza_yok).toBe(1); // bilinen kaçak
    expect(kontrol("Ceza vermeyin. Time-out uygulayın.").scores.ceza_yok).toBe(0);
  });
  it("gözlem bölümleri (tanım, ABC analizi, işlev hipotezi) taranmaz: mevcut sonuç 'time-out'/'ceza' bir ÖNERİ değildir", () => {
    const abc = "## ABC analizi\n| Öncül | Davranış | Sonuç |\n|---|---|---|\n| geçiş | yere yatma | öğretmen mola odasına gönderiyor, ceza alıyor |";
    expect(kontrol(`## Tanım\n- Daha önce time-out uygulanmış.\n${abc}\n## İşlev hipotezi\n- Ceza almaktan kaçınma yerine dikkat çekme.\n## Pekiştirme planı\n- Övgü`).scores.ceza_yok).toBe(1);
    // alt başlıklar da gözlem bölümünün parçasıdır; sonraki üst düzey bölüm taranır
    expect(kontrol(`## ABC analizi\n### Gözlem\n- ceza\n## Pekiştirme planı\n- Ceza verin`).scores.ceza_yok).toBe(0);
    expect(kontrol(`## ABC analizi\n### Gözlem\n- ceza\n## Pekiştirme planı\n- Övgü`).scores.ceza_yok).toBe(1);
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
