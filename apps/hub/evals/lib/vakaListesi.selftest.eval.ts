// apps/hub/evals/lib/vakaListesi.selftest.eval.ts
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { AtolyeFixture, StudioFixture } from "./core";
import { ageOn, esc, formatBody, formatStudent, renderVakaListesi, toplaVakalar, toplamlar, writeVakaListesi, type AracVakalari } from "./vakaListesi";

/* Vaka listesi üreticisi: biçimleme birimleri + gerçek kayıt defterinden geçici bir yola üretim (21 araç, 96 vaka, kimlikler benzersiz,
   her öğrenci çözülür, her tablo satırı tam 5 hücre, çıktı deterministik). Gerçek docs/ dosyasına YAZMAZ. */

const tmp = mkdtempSync(path.join(tmpdir(), "vaka-listesi-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
const META = { uretildi: "2026-10-10T00:00:00.000Z", sha: "abc1234" };

/** Kaçışlanmamış `|` ile böler (tablo satırı → hücreler). */
const hucreler = (satir: string) => satir.replace(/^\| /, "").replace(/ \|$/, "").split(/(?<!\\) \| /);

describe("biçimleme", () => {
  it("esc: boru, vurgu karakterleri, ham HTML ve satır sonu etkisizleşir", () => {
    expect(esc("a|b")).toBe("a\\|b");
    expect(esc("a_b*c`d")).toBe("a_b\\*c\\`d"); // sözcük içi _ vurgu başlatmaz, okunur kalır
    expect(esc("_vurgu_ x_")).toBe("\\_vurgu\\_ x\\_"); // sözcük sınırındaki _ kaçışlanır
    expect(esc("<b>x</b>")).toBe("&lt;b&gt;x&lt;/b&gt;");
    expect(esc("bir\niki")).toBe("bir ↵ iki");
    expect(esc("a\\b")).toBe("a\\\\b");
  });

  it("formatBody: anahtar: değer · … ; dizi virgülle, nesne dizisi noktalı virgülle, boş/null okunur", () => {
    expect(formatBody({ targetSounds: ["/r/"], positions: ["initial", "final"], level: "isolated", itemCount: 10 })).toBe(
      "targetSounds: /r/ · positions: initial, final · level: isolated · itemCount: 10",
    );
    expect(formatBody({ colorCoding: true, x: null, y: "", z: [] })).toBe("colorCoding: true · x: — · y: \"\" · z: []");
    expect(formatBody({ goals: [{ goalId: "g1", accuracy: 60 }, { goalId: "g2", accuracy: 80 }] })).toBe("goals: (goalId: g1, accuracy: 60); (goalId: g2, accuracy: 80)");
    expect(formatBody({})).toBe("—");
  });

  it("formatBody: ham JSON değil; metindeki | tabloyu bozmaz", () => {
    const s = formatBody({ not: "a | b", baska: "x" });
    expect(s).not.toMatch(/[{}"]/);
    expect(s).toContain("a \\| b");
    expect(hucreler(`| x | ${s} |`)).toHaveLength(2);
  });

  it("ageOn: doğum günü geçmediyse bir eksik, geçtiyse tam", () => {
    expect(ageOn("2019-04-10", "2026-10-12")).toBe(7);
    expect(ageOn("2019-12-10", "2026-10-12")).toBe(6);
    expect(ageOn("2019-10-12", "2026-10-12")).toBe(7);
    expect(ageOn("2019-10-13", "2026-10-12")).toBe(6);
  });

  it("formatStudent: Studio (ad, kimlik, yaş, alan, tanı) ve Atölye (ad, kimlik, yaş, kademe, tanı profili) ve öğrencisiz", () => {
    const st = { id: "s1", name: "Ela Y", birthDate: "2020-05-14", workArea: "language", diagnosis: "Dil gecikmesi" } as StudioFixture;
    expect(formatStudent(st, "s1")).toBe("Ela Y (s1)<br>6 yaş · language<br>Dil gecikmesi");
    const at = { id: "c1", code: "Arda K", kademe: "ilkokul_1_4", yas: 8, taniProfili: ["disleksi", "dehb_dikkat"], guclukDuzeyi: "orta" } as AtolyeFixture;
    expect(formatStudent(at, "c1")).toBe("Arda K (c1)<br>8 yaş · ilkokul_1_4<br>disleksi, dehb_dikkat · orta");
    expect(formatStudent({ ...at, yas: null, taniProfili: [], guclukDuzeyi: null }, "c1")).toBe("Arda K (c1)<br>yaş yok · ilkokul_1_4<br>tanı profili yok");
    expect(formatStudent(null, null)).toBe("—");
  });
});

describe("gerçek kayıt defterinden üretim", () => {
  it("21 araç, 96 vaka; kimlikler benzersiz; her öğrenci çözülür", async () => {
    const araclar = await toplaVakalar(); // bilinmeyen fikstür config hatası fırlatır
    const t = toplamlar(araclar);
    expect(t.arac).toBe(21);
    expect(t.vaka).toBe(96);
    for (const a of araclar) expect(new Set(a.cases.map((c) => c.id)).size, a.id).toBe(a.cases.length);
    expect(new Set(araclar.flatMap((a) => a.cases.map((c) => c.id))).size, "vaka kimlikleri araçlar arasında da benzersiz").toBe(96);
    for (const a of araclar) for (const c of a.cases) {
      if (c.student) expect(c.fixture?.id, `${a.id}/${c.id}`).toBe(c.student);
      else expect(c.fixture, `${a.id}/${c.id}`).toBeNull();
    }
    expect(t.ogrencili).toBeGreaterThan(0);
    expect(t.ogrencili).toBeLessThan(96); // öğrencisiz vakalar da var (spec B4)
  });

  it("geçici yola yazar: özet + 21 araç bölümü + 96 vaka satırı, her satır 5 hücre, ham JSON yok; onay talimatı ve künye başta", async () => {
    const hedef = path.join(tmp, "alt", "vakalar.md");
    const { md, toplam } = await writeVakaListesi(hedef, META);
    expect(readFileSync(hedef, "utf8")).toBe(md);
    expect(toplam).toMatchObject({ arac: 21, vaka: 96 });

    expect(md).toContain("Üretildi: 2026-10-10T00:00:00.000Z · kaynak dal ucu: `abc1234`");
    expect(md).toContain("Düzeltme `apps/hub/evals/tools/<modül>/<araç>/cases.json`'da yapılır, doküman yeniden üretilir");
    expect(md).toContain("değişen vaka YENİ kimlik alır");
    expect(md.indexOf("Düzeltme")).toBeLessThan(md.indexOf("## Özet"));

    const satirlar = md.split("\n");
    const arac = satirlar.filter((l) => l.startsWith("### "));
    expect(arac).toHaveLength(21);
    const vakaSatiri = satirlar.filter((l) => /^\| [a-z]+-\d+[a-z]? \|/.test(l));
    expect(vakaSatiri).toHaveLength(96);
    for (const l of vakaSatiri) {
      expect(hucreler(l), l.slice(0, 60)).toHaveLength(5);
      expect(l).not.toMatch(/\{"|":/); // ham JSON değil
    }
    // Özet tablosu: 21 araç satırı + toplam satırı.
    const ozet = satirlar.slice(satirlar.indexOf("## Özet"), satirlar.findIndex((l, i) => i > satirlar.indexOf("## Özet") && l.startsWith("## ") && l !== "## Özet"));
    expect(ozet.filter((l) => l.startsWith("| ") && /\| (Studio|Atölye) \|/.test(l))).toHaveLength(21);
    expect(satirlar.filter((l) => l.startsWith("### ")).every((l) => / — `(studio|atolye)\/[a-z-]+` \(\d+ vaka\)$/.test(l))).toBe(true);
    expect(ozet.find((l) => l.startsWith("| **Toplam**"))).toContain("**96**");
    expect(md).toMatch(/Toplam: 21 araç, 96 vaka \(\d+ öğrencili, \d+ öğrencisiz\)\./);
  });

  it("deterministik: aynı künyeyle iki üretim birebir aynı; künye dışında hiçbir şey zamana/rastgeleliğe bağlı değil", async () => {
    const araclar: AracVakalari[] = await toplaVakalar();
    expect(renderVakaListesi(araclar, META)).toBe(renderVakaListesi(araclar, META));
    const a = renderVakaListesi(araclar, META).split("\n").slice(3).join("\n");
    const b = renderVakaListesi(araclar, { uretildi: "x", sha: "y" }).split("\n").slice(3).join("\n");
    expect(a).toBe(b);
  });
});
