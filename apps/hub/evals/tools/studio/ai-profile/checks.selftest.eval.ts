// apps/hub/evals/tools/studio/ai-profile/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { PROFIL_BOLUMLERI, profileChecks, type ProfileBody } from "./checks";

const cumleler = (n: number) => Array.from({ length: n }, (_, i) => `Cümle ${i + 1} burada.`).join(" ");
const bolum = (h: string, n: number) => `### ${h}\n${cumleler(n)}\n`;
const maddeli = (h: string, n: number, isaret = "-") => `### ${h}\n${Array.from({ length: n }, (_, i) => `${isaret.replace("N", String(i + 1))} Hedef ${i + 1}`).join("\n")}\n`;
const TANI = "Tanının Klinik Açıklaması";
const GELISIM = "Bu Yaş Grubunda Beklenen Gelişim";
const MUFREDAT = "Müfredat Modülleriyle İlişki";
const ONCELIK = "Öncelikli Çalışma Alanları";
const YAKLASIM = "Etkili Yaklaşım ve Teknikler";
const DIKKAT = "Dikkat Edilmesi Gereken Noktalar";
const AILE = "Aile ile Paylaşılabilecek Öneriler";
/** Profil kurucu: her alt bölümün gövdesi verilebilir (başlık dahil bölüm metni); ayraç ve ana başlıklar yerinde. */
function profil(o: Partial<Record<"tani" | "gelisim" | "mufredat" | "oncelik" | "yaklasim" | "dikkat" | "aile", string>> & { ayrac?: string; ust?: string } = {}) {
  return [
    o.ust ?? "",
    "## Kavramsal Arka Plan\n",
    o.tani ?? bolum(TANI, 4), o.gelisim ?? bolum(GELISIM, 3), o.mufredat ?? bolum(MUFREDAT, 5),
    o.ayrac ?? "---\n",
    "## Uzmana Öneriler\n",
    o.oncelik ?? bolum(ONCELIK, 3), o.yaklasim ?? bolum(YAKLASIM, 4), o.dikkat ?? bolum(DIKKAT, 3), o.aile ?? bolum(AILE, 4),
  ].join("\n");
}
const ok = profil();
const run = (text: unknown, body: ProfileBody = {}) => profileChecks({ body, output: text, raw: null, text: typeof text === "string" ? text : "", alias: null });

describe("profileChecks", () => {
  it("4 puanlanan bölüm (3–5 cümle/hedef), ayraç, ana başlıklar, fazlalık yok", () => {
    const r = profileChecks({ body: {}, output: ok, raw: null, text: ok, alias: "Hazal" });
    expect(PROFIL_BOLUMLERI).toHaveLength(9);
    expect(r.scores).toEqual({ ana_baslik: 1, bolum_cumle: 1, ayrac: 1, fazlalik: 1 });
    expect(r.hard).toEqual([]);
  });
  it("kavramsal bir bölüm 8 cümle ve ayraç yoksa düşer; talimatı fabrika hesaplar (aracın puanında talimat yok)", () => {
    const out = profil({ tani: bolum(TANI, 8), ayrac: "" });
    const r = run(out);
    expect(r.scores.ayrac).toBe(0);
    expect(r.scores.bolum_cumle).toBeCloseTo(3 / 4);
    expect(r.scores).not.toHaveProperty("talimat");
  });
  it("prompt'ta cümle sayısı OLMAYAN uzman bölümleri (yaklaşım, dikkat, aile) puanı düşürmez; sayılar ayrıntıdadır", () => {
    const r = run(profil({ yaklasim: bolum(YAKLASIM, 9), dikkat: bolum(DIKKAT, 8), aile: bolum(AILE, 1) }));
    expect(r.scores.bolum_cumle).toBe(1);
    expect(r.details).toMatchObject({ cumle_yaklasim: 9, cumle_dikkat: 8, cumle_aile: 1 });
  });

  describe("bolum_cumle: tanı, beklenen gelişim, müfredat (prompt: 3–5 cümle) ve öncelikli çalışma alanları (3–5 hedef)", () => {
    it.each([[2, 0], [3, 1], [5, 1], [6, 0]])("tanı açıklaması %d cümle → %d/4'ten biri", (n, beklenen) => {
      expect(run(profil({ tani: bolum(TANI, n) })).scores.bolum_cumle).toBeCloseTo((3 + beklenen) / 4);
    });
    it.each([[2, 0], [3, 1], [5, 1], [6, 0]])("beklenen gelişim %d cümle", (n, beklenen) => {
      expect(run(profil({ gelisim: bolum(GELISIM, n) })).scores.bolum_cumle).toBeCloseTo((3 + beklenen) / 4);
    });
    it.each([[2, 0], [3, 1], [5, 1], [6, 0]])("müfredat bölümü %d cümle (modül atanmış)", (n, beklenen) => {
      expect(run(profil({ mufredat: bolum(MUFREDAT, n) }), { modulSayisi: 2 }).scores.bolum_cumle).toBeCloseTo((3 + beklenen) / 4);
    });
    it("modül atanmamışsa müfredat bölümü kısa olabilir (dürüst 'modül yok' yanıtı cezalanmaz); boş ya da 6+ cümle yine düşer", () => {
      const sifir: ProfileBody = { modulSayisi: 0 };
      expect(run(profil({ mufredat: bolum(MUFREDAT, 1) }), sifir).scores.bolum_cumle).toBe(1);
      expect(run(profil({ mufredat: bolum(MUFREDAT, 2) }), sifir).scores.bolum_cumle).toBe(1);
      expect(run(profil({ mufredat: `### ${MUFREDAT}\n` }), sifir).scores.bolum_cumle).toBeCloseTo(3 / 4);
      expect(run(profil({ mufredat: bolum(MUFREDAT, 6) }), sifir).scores.bolum_cumle).toBeCloseTo(3 / 4);
      // Atanmış modül varken 1 cümle düşer; gövdede modulSayisi yoksa varsayılan da katı kural.
      expect(run(profil({ mufredat: bolum(MUFREDAT, 1) }), { modulSayisi: 1 }).scores.bolum_cumle).toBeCloseTo(3 / 4);
      expect(run(profil({ mufredat: bolum(MUFREDAT, 1) })).scores.bolum_cumle).toBeCloseTo(3 / 4);
    });
    it.each([[2, 0], [3, 1], [5, 1], [6, 0]])("öncelikli alanlar %d madde", (n, beklenen) => {
      expect(run(profil({ oncelik: maddeli(ONCELIK, n) })).scores.bolum_cumle).toBeCloseTo((3 + beklenen) / 4);
    });
    it("öncelikli alanlar: numaralı liste (1. / 1)), + ve • maddeleri; alt maddeler sayılmaz; madde sayısı cümle sayısına baskındır", () => {
      for (const isaret of ["N.", "N)", "+", "•", "*"]) expect(run(profil({ oncelik: maddeli(ONCELIK, 4, isaret) })).scores.bolum_cumle, isaret).toBe(1);
      const alt = `### ${ONCELIK}\n- Hedef 1\n  - Örnek a\n  - Örnek b\n- Hedef 2\n  - Örnek c\n- Hedef 3\n`;
      expect(run(profil({ oncelik: alt })).details.oge_oncelik).toBe(3);
      expect(run(profil({ oncelik: alt })).scores.bolum_cumle).toBe(1);
      const ikiCumleli = `### ${ONCELIK}\n- Hedef birdir. İkinci cümle burada.\n- Hedef ikidir. Bir cümle daha.\n- Hedef üçtür. Yine bir cümle.\n`;
      expect(run(profil({ oncelik: ikiCumleli })).details.oge_oncelik).toBe(3);
    });
    it("öncelikli alanlar: her hedef `####` başlığı ya da tek satırlık kalın etiket ise başlık sayısı hedef sayısıdır (altındaki paragraf/madde açıklamadır)", () => {
      const ust = (...govde: string[]) => `### ${ONCELIK}\n${govde.join("")}`;
      const baslikli = ust(...[1, 2, 3].map((i) => `#### ${i}. Hedef ${i}\nCümle bir burada. Cümle iki burada.\n`));
      expect(run(profil({ oncelik: baslikli })).details.oge_oncelik).toBe(3);
      expect(run(profil({ oncelik: baslikli })).scores.bolum_cumle).toBe(1);
      const kalin = ust(...[1, 2, 3].map((i) => `**${i}. Hedef ${i}**\nCümle bir burada. Cümle iki burada.\n`));
      expect(run(profil({ oncelik: kalin })).details.oge_oncelik).toBe(3);
      expect(run(profil({ oncelik: kalin })).scores.bolum_cumle).toBe(1);
      const ikiNokta = ust(...[1, 2, 3, 4].map((i) => `**Hedef ${i}:**\nCümle bir burada. Cümle iki burada.\n`));
      expect(run(profil({ oncelik: ikiNokta })).details.oge_oncelik).toBe(4);
      // Başlık altındaki alt maddeler ve iç içe kalın etiketler hedef sayılmaz (yalnız en sığ başlık düzeyi sayılır).
      const altli = ust(...[1, 2, 3].map((i) => `#### Hedef ${i}\n**Örnek:**\n- a\n- b\n`));
      expect(run(profil({ oncelik: altli })).details.oge_oncelik).toBe(3);
      // 2 ve 6 hedef sınırın dışında.
      expect(run(profil({ oncelik: ust(...[1, 2].map((i) => `#### Hedef ${i}\nMetin burada.\n`)) })).scores.bolum_cumle).toBeCloseTo(3 / 4);
      expect(run(profil({ oncelik: ust(...[1, 2, 3, 4, 5, 6].map((i) => `**Hedef ${i}**\nMetin burada.\n`)) })).scores.bolum_cumle).toBeCloseTo(3 / 4);
    });
    it("öncelikli alanlar: kendi maddeleri + derin başlıklar toplanır; bölüm sonunda yeni ### ya da ## durur", () => {
      const karma = `### ${ONCELIK}\n- Hedef 1\n- Hedef 2\n#### Hedef 3\nAçıklama burada.\n### ${YAKLASIM}\n#### Alt başlık\nMetin burada.\n`;
      expect(run(profil({ oncelik: karma })).details.oge_oncelik).toBe(3);
    });
    it("gövde aynı düzeydeki sonraki (beklenmeyen adlı) başlıkta da biter", () => {
      const out = profil({ tani: `${bolum(TANI, 3)}\n### Ek Notlar\n${cumleler(4)}\n` });
      expect(run(out).details.cumle_tani).toBe(3);
    });
    it("kavramsal bölümde `####` alt başlık/kalın etiket gövdeyi kesmez, başlık metni cümle sayılmaz", () => {
      const derin = `### ${TANI}\nCümle 1 burada. Cümle 2 burada.\n#### Ayrıntı başlığı burada\nCümle 3 burada.\n**Önemli not burada**\nCümle 4 burada.\n`;
      expect(run(profil({ tani: derin })).details.cumle_tani).toBe(4);
    });
    it("öncelikli alanlar madde işaretsiz yazıldıysa cümleler hedef sayılır", () => {
      expect(run(profil({ oncelik: bolum(ONCELIK, 4) })).details.oge_oncelik).toBe(4);
    });
    it("kavramsal bölümde madde listesi: her madde en az bir cümle (noktasız maddeler de sayılır)", () => {
      const out = profil({ tani: `### ${TANI}\n- Birinci özellik\n- İkinci özellik\n- Üçüncü özellik\n` });
      expect(run(out).details.cumle_tani).toBe(3);
      expect(run(out).scores.bolum_cumle).toBe(1);
      expect(run(profil({ tani: `### ${TANI}\n- Tek madde\n- İki madde\n` })).scores.bolum_cumle).toBeCloseTo(3 / 4);
      // Tek sözcüklü madde de bir cümledir (paragraflardaki "tek sözcük cümle değil" kuralı maddeye uygulanmaz).
      expect(run(profil({ tani: `### ${TANI}\n- Dikkat\n- Hafıza\n- Algı\n` })).details.cumle_tani).toBe(3);
    });
    it("bölüm bulunamazsa o bölüm sayılmaz (puan düşer, çökmez); başlık düzeyi önemsiz (####, ##, kalın satır)", () => {
      expect(run(ok.replace(`### ${TANI}`, "### Başka başlık")).scores.bolum_cumle).toBeCloseTo(3 / 4);
      expect(run(ok.replace(`### ${GELISIM}`, `#### ${GELISIM}`)).scores.bolum_cumle).toBe(1);
      expect(run(ok.replace(`### ${GELISIM}`, `**${GELISIM}**`)).scores.bolum_cumle).toBe(1);
      expect(run(ok.replace("## Uzmana Öneriler", "## Uzmana Öneriler\n").replace(`### ${ONCELIK}`, "")).scores.bolum_cumle).toBeLessThan(1);
    });
    it("gövdedeki kalın satır ('**Not**') bölümü kesmez; kalın/italik işaretleri cümle bölmeyi bozmaz; ayraç cümle sayılmaz", () => {
      const kalin = `### ${TANI}\n**Önemli:**\nCümle 1 burada. Cümle 2 burada.\nCümle 3 burada.\n`;
      expect(run(profil({ tani: kalin })).details.cumle_tani).toBe(3);
      const vurgulu = `### ${TANI}\n**Cümle 1 burada.** Cümle 2 burada. *Cümle 3 burada.* Cümle 4 burada.\n`;
      expect(run(profil({ tani: vurgulu })).details.cumle_tani).toBe(4);
      expect(run(profil({ mufredat: bolum(MUFREDAT, 5) })).details.cumle_mufredat).toBe(5); // ayraç müfredat gövdesinin sonunda
    });
    it("satıra bölünmüş (kaydırılmış) paragraf tek paragraftır; boş satırla ayrılan paragraflar toplanır", () => {
      const kayik = `### ${TANI}\nCümle 1 burada. Cümle 2\nburada. Cümle 3 burada.\n\nCümle 4 burada.\n`;
      expect(run(profil({ tani: kayik })).details.cumle_tani).toBe(4);
    });
    it("boş satırla ayrılan noktasız paragraflar ayrı sayılır; noktasız ardışık satırlar tek paragraftır", () => {
      expect(run(profil({ tani: `### ${TANI}\nBirinci paragraf noktasız\n\nİkinci paragraf noktasız\n\nÜçüncü paragraf noktasız\n` })).details.cumle_tani).toBe(3);
      expect(run(profil({ tani: `### ${TANI}\nBirinci satır noktasız\nİkinci satır noktasız\n` })).details.cumle_tani).toBe(1);
    });
    it("madde listesinin sonundaki yatay çizgi ('---', '- - -', '***') madde ya da cümle sayılmaz", () => {
      for (const hr of ["---", "- - -", "***"]) {
        const out = profil({ oncelik: `### ${ONCELIK}\n- Hedef 1\n- Hedef 2\n- Hedef 3\n${hr}\n` });
        expect(run(out).details.oge_oncelik, hr).toBe(3);
      }
    });
  });

  describe("ana_baslik (arayüz yalnız '## ' satırlarında böler)", () => {
    it("iki ana başlık '## ' ile → 1; biri başka düzeyde ya da kalın → 0,5; ikisi de değilse 0", () => {
      expect(run(ok).scores.ana_baslik).toBe(1);
      expect(run(ok.replace("## Kavramsal Arka Plan", "### Kavramsal Arka Plan")).scores.ana_baslik).toBe(0.5);
      expect(run(ok.replace("## Uzmana Öneriler", "# Uzmana Öneriler")).scores.ana_baslik).toBe(0.5);
      expect(run(ok.replace("## Uzmana Öneriler", "**Uzmana Öneriler**")).scores.ana_baslik).toBe(0.5);
      expect(run(ok.replace("## Kavramsal Arka Plan", "Kavramsal Arka Plan").replace("## Uzmana Öneriler", "Uzmana Öneriler")).scores.ana_baslik).toBe(0);
    });
    it("kalın ya da numaralı başlık metni normalleştirilir; sondaki # işaretleri atılır", () => {
      expect(run(ok.replace("## Kavramsal Arka Plan", "## **Kavramsal Arka Plan**")).scores.ana_baslik).toBe(1);
      expect(run(ok.replace("## Uzmana Öneriler", "## Uzmana Öneriler ##")).scores.ana_baslik).toBe(1);
      expect(run(ok.replace("## Uzmana Öneriler", "##  UZMANA ÖNERİLER")).scores.ana_baslik).toBe(1);
    });
    it("'##' ile '###' karışmaz: '### ...' satırı '## ' sayılmaz", () => {
      expect(run("### Kavramsal Arka Plan\n### Uzmana Öneriler\n").scores.ana_baslik).toBe(0);
    });
  });

  describe("ayrac (prompt: iki ana bölüm arasında ---)", () => {
    it("ayraç iki ana başlığın ARASINDA değilse 0 (öncesinde, sonrasında ya da yoksa)", () => {
      expect(run(ok).scores.ayrac).toBe(1);
      expect(run(profil({ ayrac: "", ust: "---" })).scores.ayrac).toBe(0);
      expect(run(profil({ ayrac: "" }) + "\n---\n").scores.ayrac).toBe(0);
      expect(run(profil({ ayrac: "" })).scores.ayrac).toBe(0);
    });
    it.each([["---"], ["***"], ["___"], ["- - -"], ["-- -"], ["----------"], ["  ---  "]])("yatay çizgi biçimi %j kabul", (hr) => {
      expect(run(profil({ ayrac: `${hr}\n` })).scores.ayrac).toBe(1);
    });
    it.each([["--"], ["—"], ["---x"], ["Cümle --- cümle"], ["_-_"], ["-*-"]])("yatay çizgi değil: %j", (hr) => {
      expect(run(profil({ ayrac: `${hr}\n` })).scores.ayrac).toBe(0);
    });
    it("ana başlık yanlış düzeyde ya da kalınsa ayraç yine konumlanır: tek hata tek puan (ana_baslik), ayraç ikinci kez cezalanmaz", () => {
      const r = run(ok.replace("## Uzmana Öneriler", "### Uzmana Öneriler"));
      expect(r.scores).toMatchObject({ ana_baslik: 0.5, ayrac: 1 });
      expect(run(ok.replace("## Kavramsal Arka Plan", "### Kavramsal Arka Plan")).scores).toMatchObject({ ana_baslik: 0.5, ayrac: 1 });
      expect(run(ok.replace("## Kavramsal Arka Plan", "### Kavramsal Arka Plan").replace("## Uzmana Öneriler", "#### Uzmana Öneriler")).scores).toMatchObject({ ana_baslik: 0, ayrac: 1 });
      expect(run(ok.replace("## Uzmana Öneriler", "**Uzmana Öneriler**")).scores).toMatchObject({ ana_baslik: 0.5, ayrac: 1 });
      // Konum yine şart: ayraç ana başlıkların arasında değilse (yanlış düzeyde de olsa) 0.
      expect(run(profil({ ayrac: "" }).replace("## Uzmana Öneriler", "### Uzmana Öneriler")).scores.ayrac).toBe(0);
      expect(run(profil({ ayrac: "", ust: "---" }).replace("## Uzmana Öneriler", "### Uzmana Öneriler")).scores.ayrac).toBe(0);
    });
    it("ana başlıklardan biri yoksa ayraç konumlanamaz: 0", () => {
      expect(run(ok.replace("## Uzmana Öneriler", "")).scores.ayrac).toBe(0);
    });
  });

  describe("fazlalik (prompt: 'başka hiçbir şey eklemeden'; arayüz ilk '## 'dan önceki metni atar)", () => {
    it("önsöz satırı ya da kod çiti 0; baştaki boş satırlar sorun değil", () => {
      expect(run(profil({ ust: "İşte profil:" })).scores.fazlalik).toBe(0);
      expect(run("```markdown\n" + ok + "\n```").scores.fazlalik).toBe(0);
      expect(run(profil({ ust: "# Öğrenci Profili" })).scores.fazlalik).toBe(0);
      expect(run("\n\n  \n" + ok).scores.fazlalik).toBe(1);
    });
    it("istenmeyen ##/### başlık (ör. 'Sonuç') 0; alt başlık (####) ve kalın etiketler serbest", () => {
      expect(run(ok + "\n## Sonuç\nKapanış.\n").scores.fazlalik).toBe(0);
      expect(run(ok + "\n### Ek Notlar\nNot.\n").scores.fazlalik).toBe(0);
      expect(run(ok + "\n# Sonuç\nKapanış.\n").scores.fazlalik).toBe(0);
      expect(run(ok + "\n#### Örnek\nNot.\n").scores.fazlalik).toBe(1);
      expect(run(ok.replace("Cümle 1 burada.", "**Örnek:** Cümle 1 burada.")).scores.fazlalik).toBe(1);
    });
    it("başlık sırası ya da yinelenen beklenen başlık sorun değil; hiç başlık yoksa önsöz sayılır (0)", () => {
      expect(run(ok.replace("## Uzmana Öneriler", "## Uzmana Öneriler\n\n## Uzmana Öneriler")).scores.fazlalik).toBe(1);
      expect(run("Yalnız düz bir paragraf. Başlık yok burada.").scores.fazlalik).toBe(0);
    });
  });

  describe("dayanıklılık", () => {
    it("çıktı metin değilse ya da boşsa tüm puanlar 0 (kanıtlanamaz), çökmez", () => {
      for (const v of [null, undefined, "", "  \n ", {}, 5, ["a"]]) {
        const r = run(v);
        expect(Object.values(r.scores), String(v)).toEqual([0, 0, 0, 0]);
        expect(r.hard).toEqual([]);
      }
    });
    it("sınırda bozuk Markdown (başlıksız kalın satır, tek satır, tablo) çökmez", () => {
      for (const t of ["###\n##\n#", "**Kalın**\n**Kalın**", "| a | b |\n|---|---|\n| 1 | 2 |", "- \n-\n  -", "---\n---\n---"]) expect(() => run(t)).not.toThrow();
    });
  });
});
