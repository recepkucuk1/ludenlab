// apps/hub/evals/tools/atolye/ev-odevi/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { evOdeviChecks, EV_ODEVI_BOLUM_LISTESI } from "./checks";
describe("evOdeviChecks", () => {
  it("3 gün başlığı ve ≤20 dk dilimler → 1/1", () => {
    const md = "## Günlük plan\n### 1. Gün\n- Isınma (3 dk)\n- Ana (15 dk)\n### 2. Gün\n- (15 dk)\n### 3. Gün\n- (20 dk)";
    expect(evOdeviChecks({ body: { hedefKonu: "k", gunSayisi: 3 }, text: md }).scores).toMatchObject({ gun_sayisi: 1, sure_dilimi: 1 });
  });
  it("2 gün başlığı (3 istendi) → 0; 45 dk dilim → oran düşer", () => {
    const md = "### Gün 1\n- (45 dk)\n### Gün 2\n- (15 dk)";
    const r = evOdeviChecks({ body: { hedefKonu: "k", gunSayisi: 3 }, text: md });
    expect(r.scores.gun_sayisi).toBe(0);
    expect(r.scores.sure_dilimi).toBe(0.5);
  });
});

/* ── Ek kapsam ── */

const kontrol = (text: string, gunSayisi = 3) => evOdeviChecks({ body: { hedefKonu: "Hece okuma", gunSayisi }, text });
const gun = (text: string, n = 3) => kontrol(text, n).scores.gun_sayisi;
const sure = (text: string) => kontrol(text).scores.sure_dilimi;
const f2 = (...d: string[]) => sure(PLAN("### Gün 1", ...d));
const PLAN = (...gunler: string[]) => `## 2. Günlük Çalışma Planı\n${gunler.join("\n")}`;

describe("bölüm listesi: tek kaynak (adapter `sections`)", () => {
  it("dört bölüm: genel çerçeve, günlük plan, alternatif yollar, gözlem/uzmana notlar; gün başlıkları plan bölümü değildir", () => {
    expect(EV_ODEVI_BOLUM_LISTESI).toHaveLength(4);
    const [genel, plan, alternatif, gozlem] = EV_ODEVI_BOLUM_LISTESI as [RegExp, RegExp, RegExp, RegExp];
    for (const h of ["genel çerçeve ve ebeveyn bilgilendirmesi", "ebeveyn bilgilendirmesi"]) expect(genel.test(h), h).toBe(true);
    for (const h of ["günlük çalışma planı", "günlük plan", "günlük program", "çalışma planı"]) expect(plan.test(h), h).toBe(true);
    for (const h of ["gün 1", "gün", "birinci gün", "gün 3 — hece avı", "genel çerçeve", "alternatif yollar", "gözlem ve uzmana notlar (aile için)", "ölçüm"]) expect(plan.test(h), h).toBe(false);
    expect(alternatif.test("alternatif yollar")).toBe(true);
    expect(alternatif.test("b planı")).toBe(true);
    for (const h of ["gözlem ve uzmana notlar (aile için)", "gözlem", "uzmana notlar"]) expect(gozlem.test(h), h).toBe(true);
  });
});

describe("gun_sayisi (prompt: 'Günlük Çalışma Planı — Belirtilen gün sayısı kadar')", () => {
  it.each([
    "### {n}. Gün", "### Gün {n}", "### {n}. gün:", "#### **Gün {n}**", "**Gün {n}:** Hece avı", "- **Gün {n}** — Isınma", "| Gün {n} | Hece avı |", "Gün {n} (15 dk)", "**{n}. Gün**",
    "{n}. Gün: Hece avı", "{n}.Gün", "### {n}) Gün", "### GÜN {n}", "### {n}. GÜN", "> Gün {n}", "### Gün {n} – Hece Avı", "### Gün  {n}", "### Gün {n}: Hece avı (3 dk + 12 dk)",
  ])("gün etiketi biçimi %s: 3 günün üçü de bu biçimde → 1; ikisi → 0", (sablon) => {
    const g = (n: number) => sablon.replace("{n}", String(n));
    expect(gun(PLAN(g(1), g(2), g(3)))).toBe(1);
    expect(gun(PLAN(g(1), g(2)))).toBe(0);
  });
  describe("tabloyla verilen plan (sistem istemi karşılaştırmalı bilgiyi GFM tablosuyla ister)", () => {
    const tbl = (...satirlar: string[]) => PLAN(...satirlar);
    it("'Gün' sütunu + çıplak sayı satırları: 3 gün", () => {
      expect(gun(tbl("| Gün | Isınma (3 dk) | Ana etkinlik (10 dk) |", "|---|---|---|", "| 1 | a | b |", "| 2 | c | d |", "| 3 | e | f |"))).toBe(1);
      expect(gun(tbl("| **Gün** | Isınma | Ana |", "|---|---|---|", "| 1. | a | b |", "| 2. | c | d |", "| 3. | e | f |"))).toBe(1);
      expect(gun(tbl("| Gün | Isınma | Ana |", "|---|---|---|", "| 1 | a | b |", "| 2 | c | d |"))).toBe(0);
      expect(gun(tbl("| Gün | Isınma | Ana |", "|---|---|---|", "| 1-2 | a | b |", "| 3 | c | d |"))).toBe(1);
    });
    it("etiketli satır hücreleri ('Gün 1', '1. Gün', gün adı) ve ters çevrilmiş tablo (gün başlıkları sütunda)", () => {
      expect(gun(tbl("| Gün | Ana |", "|---|---|", "| Gün 1 | a |", "| Gün 2 | b |", "| Gün 3 | c |"))).toBe(1);
      expect(gun(tbl("| | Gün 1 | Gün 2 | Gün 3 |", "|---|---|---|---|", "| Isınma | a | b | c |"))).toBe(1);
      expect(gun(tbl("| Gün | Ana |", "|---|---|", "| Pazartesi | a |", "| Salı | b |", "| Çarşamba | c |"))).toBe(1);
    });
    it("başlık 'Gün No' / 'Gün sırası' olabilir; çıplak aralık satırı ('1-3') üç gün sayılır", () => {
      expect(gun(tbl("| Gün No | Ana |", "|---|---|", "| 1 | a |", "| 2 | b |", "| 3 | c |"))).toBe(1);
      expect(gun(tbl("| Gün sırası | Ana |", "|---|---|", "| 1 | a |", "| 2 | b |", "| 3 | c |"))).toBe(1);
      expect(gun(tbl("| Gün | Ana |", "|---|---|", "| 1-3 | a |"))).toBe(1);
      expect(gun(tbl("| Gün | Ana |", "|---|---|", "| 1–7 | a |"), 7)).toBe(1);
    });
    it("'Gün' başlığı olmayan tablonun çıplak sayıları gün değildir; tablo bitince 'Gün' bağlamı sona erer", () => {
      expect(gun(tbl("| Aşama | Süre |", "|---|---|", "| 1 | 3 dk |", "| 2 | 10 dk |", "| 3 | 2 dk |"))).toBe(0);
      expect(gun(tbl("| Gün | Ana |", "|---|---|", "| 1 | a |", "", "| Aşama | Süre |", "|---|---|", "| 2 | 3 dk |", "| 3 | 10 dk |"))).toBe(0);
    });
    it("hücre içi anma ('Gün 3'te') ve apostroflu ek gün etiketi değildir", () => {
      expect(gun(tbl("| Gün | Not |", "|---|---|", "| 1 | Gün 3'te tekrar |", "| 2 | a |"), 3)).toBe(0);
    });
    it("tablo süreleri de sayılır (hücrede birimli süre)", () => {
      expect(sure(tbl("| Gün | Ana |", "|---|---|", "| 1 | 10 dk |", "| 2 | 45 dk |"))).toBe(0.5);
    });
  });
  it("sözcükle sıra sayısı: birinci … yedinci", () => {
    const t = PLAN(...["Birinci", "İkinci", "Üçüncü", "Dördüncü", "Beşinci", "Altıncı", "Yedinci"].map((s) => `### ${s} gün`));
    expect(gun(t, 7)).toBe(1);
  });
  it("gün adlarıyla: Pazartesi/Salı/Çarşamba", () => {
    expect(gun(PLAN("### Pazartesi", "### Salı — hece avı", "**Çarşamba:** kart oyunu"))).toBe(1);
    expect(gun(PLAN("### Pazartesi", "### Salı"))).toBe(0);
  });
  it("gün adı SÖZCÜK olmalı: 'Salıncak', 'Pazarlık', 'Perşembeden' gün adı sayılmaz; tek günlükte iki gün adı fazladır, üç gün adı iki günlük için fazladır", () => {
    expect(gun(PLAN("Salıncakta oyun oynayın.", "Pazarlık yapmayın.", "Perşembeden sonra dinlenin."))).toBe(0);
    expect(gun(PLAN("### Pazartesi", "### Salı"), 1)).toBe(0);
    expect(gun(PLAN("### Pazartesi", "### Salı", "### Çarşamba"), 2)).toBe(0);
    expect(gun(PLAN("### Gün 2"), 1)).toBe(0); // tek gün istenirken yalnız 'Gün 2' etiketi: numara 1 değil
  });
  it("sayı aralığı: 'Gün 1-3' üç gün, 'Gün 1–7' yedi gün sayılır", () => {
    expect(gun(PLAN("### Gün 1-3: hece avı"))).toBe(1);
    expect(gun(PLAN("### Gün 1–7: hece avı"), 7)).toBe(1);
  });
  it("sayı aralığı ('Gün 1-2') iki gün sayılır", () => {
    expect(gun(PLAN("### Gün 1-2: hece avı", "### Gün 3: okuma"))).toBe(1);
    expect(gun(PLAN("### Gün 1–2", "### Gün 3", "### Gün 4"))).toBe(0);
  });
  it.each([
    [2, 3, 0], [3, 3, 1], [4, 3, 0], [1, 1, 1], [5, 5, 1], [7, 7, 1], [6, 7, 0], [8, 7, 0],
  ])("%d gün başlığı, %d istendi → %d", (varOlan, istenen, beklenen) => {
    const t = PLAN(...Array.from({ length: varOlan }, (_, i) => `### ${i + 1}. Gün`));
    expect(gun(t, istenen)).toBe(beklenen);
  });
  it("tek günlük program başlıksız olabilir (1 istendi: etiket yok ya da tek etiket yeter; iki etiket fazladır)", () => {
    expect(gun("## Günlük Çalışma Planı\n- Isınma (3 dk)\n- Ana (12 dk)", 1)).toBe(1);
    expect(gun(PLAN("### Gün 1\n- a"), 1)).toBe(1);
    expect(gun(PLAN("### Gün 1", "### Gün 2"), 1)).toBe(0);
    expect(gun("## Günlük Çalışma Planı\n- Isınma", 2)).toBe(0);
  });
  it("numaralar tam 1..N olmalı: eksik/atlamalı numaralandırma (1, 2, 4) üç gün sayılmaz", () => {
    expect(gun(PLAN("### Gün 1", "### Gün 2", "### Gün 4"))).toBe(0);
    expect(gun(PLAN("### Gün 2", "### Gün 3", "### Gün 4"))).toBe(0);
  });
  it("aynı gün birden çok yerde (başlık + tablo) tek gün; sıra bağımsız", () => {
    expect(gun(PLAN("### Gün 1", "| Gün 1 | x |", "### Gün 2", "### Gün 3", "| Gün 3 | y |"))).toBe(1);
    expect(gun(PLAN("### Gün 3", "### Gün 1", "### Gün 2"))).toBe(1);
  });
  it("etiket SATIR BAŞINDA aranır: cümle içi anma, günlük/gün sonu ifadeleri ve ek almış sayılar gün başlığı değildir", () => {
    const t = PLAN("### Gün 1", "### Gün 2", "Gün 3'te çocuk direnirse etkinliği kısaltın.", "Gün sonunda küçük bir oyun oynayın.", "Her gün 15 dakika çalışın.", "1. Günlük çalışma kısa olsun.");
    expect(gun(t)).toBe(0); // yalnız 2 gün başlığı var
    expect(gun(PLAN("### Gün 1", "### Gün 2", "### Gün 3", "Gün 4'te tekrar edin.", "Hafta sonu: 1 gün dinlenin."))).toBe(1);
  });
  it.each(["Genel Çerçeve", "Ebeveyn Bilgilendirmesi", "Alternatif Yollar", "B Planı", "Gözlem ve Uzmana Notlar (Aile için)", "Uzmana Notlar", "Gözlem ve Uzman Notları", "Aile Geri Bildirimi"])(
    "plan dışı bölüm '## %s': içindeki gün etiketi ve uzun süre plana karışmaz",
    (baslik) => {
      const t = `${PLAN("### Gün 1\n- Ana (15 dk)")}\n## ${baslik}\n- Gün 4: serbest oyun\n- Haftalık 45 dakikalık görüşme`;
      expect(gun(t, 1)).toBe(1);
      expect(sure(t)).toBe(1);
    },
  );
  it("alternatif / gözlem / genel çerçeve bölümlerindeki gün anmaları sayılmaz", () => {
    const t = `## Genel Çerçeve ve Ebeveyn Bilgilendirmesi\nGün 1 ve Gün 2 ısınma günleridir.\n${PLAN("### Gün 1", "### Gün 2", "### Gün 3")}\n## Alternatif Yollar\n- Gün 4: serbest oyun\n## Gözlem ve Uzmana Notlar\n- Gün 5: not alın`;
    expect(gun(t)).toBe(1);
  });
  it("günler bir üst başlığın altında değil kardeş ## başlıklar olabilir", () => {
    expect(gun("## Gün 1\n- a\n## Gün 2\n- b\n## Gün 3\n- c")).toBe(1);
  });
  it("planda etiket yoksa tüm metne bakılır (gün etiketleri başka bölümde yazılmışsa)", () => {
    expect(gun("## Alternatif Yollar\n### Gün 1\n### Gün 2\n### Gün 3")).toBe(1);
  });
  it("boş metin: 0 (tek gün istenirse de etiket sayısı ≤ 1 olduğundan 1: ölçülecek ihlal yok)", () => {
    expect(gun("")).toBe(0);
    expect(gun("", 1)).toBe(1);
  });
  it("ayrıntıda bulunan gün sayısı", () => {
    expect(kontrol(PLAN("### Gün 1", "### Gün 2")).details.gun).toBe(2);
    expect(kontrol(PLAN("### Pazartesi", "### Salı", "### Çarşamba")).details.gun).toBe(3);
  });
});

describe("sure_dilimi (prompt: '15-20 dakikalık … çalışma dilimleri')", () => {
  const f = (...d: string[]) => sure(PLAN("### Gün 1", ...d));
  it.each([
    ["Ana etkinlik (15 dk)", 1], ["Ana etkinlik (20 dk)", 1], ["Ana etkinlik (21 dk)", 0], ["Ana etkinlik (45 dk)", 0], ["15 dakika çalışın", 1], ["25 dakika çalışın", 0],
    ["Isınma (2-3 dk)", 1], ["Isınma (2–3 dk)", 1], ["15-20 dakikalık dilim", 1], ["15–20 dakikalık bir çalışma", 1], ["15-20 dk", 1], ["10 - 15 dakika", 1],
    ["20-25 dk", 0], ["15-25 dakikalık", 0], ["30-45 dk", 0],
    ["10'ar dakikalık iki blok", 1], ["25'er dakikalık iki blok", 0], ["5 dk'lık mola", 1], ["30 dk'lık çalışma", 0],
    ["1 saat çalışın", 0], ["yarım saat çalışın", 0], ["1,5 saat", 0],
    ["bir saat çalışın", 0], ["iki saat çalışın", 0], ["on beş dakika çalışın", 1], ["yirmi dakika çalışın", 1], ["beş dakika ısınma", 1], ["otuz dakika çalışın", 0], ["yirmi beş dakika", 0], ["bir dakika bekleyin", 1], ["iki üç dakika ısınma", 1],
  ])("%s → oran %d", (cumle, beklenen) => expect(f(`- ${cumle}`)).toBe(beklenen));
  it("'saatlerce' sayı değildir: süre yok → 0", () => expect(f("- Günde saatlerce çalışmayın")).toBe(0));
  it("sayısız 'dakika' ya da saat/saniye dışı sayılar süre değildir: kod, adet, tarih, gün sayısı, saniye", () => {
    expect(f("- MEB 3.2.5 dk hedefi", "- 7 günlük program", "- 30 saniye bekleyin", "- 3 kart seçin")).toBe(0);
    expect(f("- MEB 3.2.5 hedefi (15 dk)")).toBe(1);
    expect(f("- 3.2.5 dk", "- 15 dk")).toBe(1);
  });
  it("üst sınır ya da zaman farkı bir ÇALIŞMA SÜRESİ değildir: 'geçmesin/aşmasın/fazla', 'en fazla', 'sonra/önce/içinde'", () => {
    expect(f("- Ana etkinlik (15 dk)", "- Çalışma 45 dakikayı geçmesin.")).toBe(1);
    expect(f("- Ana etkinlik (15 dk)", "- 30 dakikadan fazla sürmesin.")).toBe(1);
    expect(f("- Ana etkinlik (15 dk)", "- Çalışma 45 dakikayı aşmasın.")).toBe(1);
    expect(f("- Ana etkinlik (15 dk)", "- Çalışma 45 dakikanın üzerine çıkmasın.")).toBe(1);
    expect(f("- Ana etkinlik (15 dk)", "- Çalışma 45 dakikanın üstüne çıkmayın.")).toBe(1);
    // üst sınır sözcüğü anmadan sonraki ilk üç sözcükte aranır (ek almış 'dakikayı' tek sözcüktür)
    expect(f("- Ana etkinlik (15 dk)", "- Çalışma 40 dakikayı hiçbir zaman geçmesin.")).toBe(1);
    expect(f("- Ana etkinlik (15 dk)", "- Çalışma 40 dakikayı bile geçmesin.")).toBe(1);
    expect(f("- Ana etkinlik (15 dk)", "- Çalışma 40 dakikayı hiçbir zaman bile geçmesin.")).toBe(0.5); // dördüncü sözcük: aranmaz (bilinen sınır)
    expect(f("- Ana etkinlik (15 dk)", "- Çalışma süresi en fazla 30 dakika olsun.")).toBe(1);
    expect(f("- Ana etkinlik (15 dk)", "- Akşam yemeğinden yarım saat sonra çalışın.")).toBe(1);
    expect(f("- Ana etkinlik (15 dk)", "- Çalışmadan 40 dakika önce ekranı kapatın.")).toBe(1);
    expect(f("- Ana etkinlik (15 dk)", "- 30 dakika içinde bitirin.")).toBe(1);
    // ama planlanan süre 'kadar' ya da 'boyunca' ile verilirse süredir
    expect(f("- Ana etkinlik (15 dk)", "- 45 dakika kadar çalışın.")).toBe(0.5);
    expect(f("- Ana etkinlik (15 dk)", "- 40 dakika boyunca çalışın.")).toBe(0.5);
  });
  it("oran: dilimlerin kaçı ≤ 20 dk", () => {
    expect(f("- Isınma (3 dk)", "- Ana (15 dk)", "- Pekiştirme (5 dk)")).toBe(1);
    expect(f("- Isınma (3 dk)", "- Ana (45 dk)", "- Pekiştirme (5 dk)", "- Ek (60 dk)")).toBe(0.5);
    expect(f("- Ana (30 dk)")).toBe(0);
  });
  it("yalnız günlük plan bölümü sayılır: genel çerçeve, alternatif ve gözlem bölümlerindeki süreler dışlanır (plan süre taşıyorsa)", () => {
    const t = `## Genel Çerçeve ve Ebeveyn Bilgilendirmesi\nHer hafta 45 dakikalık bir görüşme yapacağız.\n${PLAN("### Gün 1\n- Ana (15 dk)")}\n## Alternatif Yollar\n- 30 dakika serbest oyun\n## Gözlem ve Uzmana Notlar\n- Haftalık 60 dakikalık geri bildirim`;
    expect(sure(t)).toBe(1);
  });
  it("planda hiç süre yoksa tüm metne bakılır; hiçbir yerde süre yoksa 0", () => {
    expect(sure("## Genel Çerçeve\nGünde 15 dakika yeterli.\n## Günlük Çalışma Planı\n### Gün 1\n- Isınma")).toBe(1);
    expect(sure("## Günlük Çalışma Planı\n### Gün 1\n- Isınma")).toBe(0);
    expect(sure("")).toBe(0);
  });
  it("tablo hücresinde süre ('| Isınma | 3 dk |') sayılır", () => {
    expect(f("| Aşama | Süre |", "|---|---|", "| Isınma | 3 dk |", "| Ana | 25 dk |")).toBe(0.5);
  });
  it("ayrıntıda bulunan dilim sayısı", () => {
    expect(kontrol(PLAN("### Gün 1", "- Isınma (3 dk)", "- Ana (15 dk)")).details.dilim).toBe(2);
  });
});

describe("tipografi ve dayanıklılık korumaları", () => {
  it("kıvrık kesme: 'Gün 3’te' gün başlığı değildir, '10’ar dakika' 10 dk sayılır; büyük harfli 'DAKİKA', 'GÜN 1'; CRLF", () => {
    expect(gun(PLAN("### Gün 1", "### Gün 2", "Gün 3’te tekrar edin."))).toBe(0);
    expect(f2("- 10’ar dakikalık iki blok")).toBe(1);
    expect(f2("- 25’er dakikalık iki blok")).toBe(0);
    expect(f2("- 45 DAKİKA çalışın")).toBe(0);
    expect(gun(PLAN("### GÜN 1", "### GÜN 2", "### GÜN 3"))).toBe(1);
    const metin = PLAN("### Gün 1\n- Ana (15 dk)", "### Gün 2\n- Ana (15 dk)", "### Gün 3\n- Ana (45 dk)");
    expect(kontrol(metin.replace(/\n/g, "\r\n")).scores).toEqual(kontrol(metin).scores);
  });
  it("gün sayısı geçersiz/eksik gelirse çökmez (0, NaN, undefined)", () => {
    for (const n of [0, Number.NaN, undefined as unknown as number]) expect(() => kontrol(PLAN("### Gün 1"), n)).not.toThrow();
  });
});

describe("çıktı sözleşmesi", () => {
  it("`talimat` döndürülmez; gun_sayisi ve sure_dilimi; sert hata yok; ayrıntılar puanları yansıtır", () => {
    const r = kontrol(PLAN("### Gün 1\n- Ana (15 dk)", "### Gün 2\n- Ana (15 dk)", "### Gün 3\n- Ana (15 dk)"));
    expect(Object.keys(r.scores).sort()).toEqual(["gun_sayisi", "sure_dilimi"]);
    expect(r.details).toMatchObject({ gun_sayisi: 1, sure_dilimi: 1, dilim: 3 });
    expect(r.hard).toEqual([]);
  });
});
