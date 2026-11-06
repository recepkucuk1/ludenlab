import { describe, expect, it } from "vitest";
import { adParcaCeviricileri, sonucuGeriCevir } from "./geriCevir";
import { denetimSonucuSchema } from "./schema";

const rumuzlu = denetimSonucuSchema.parse({
  bilesenler: {
    davranis: { durum: "var", alinti: "Sinan doğru okur", not: "Sinan için gözlenebilir." },
    olcut: { durum: "var", alinti: "8/10 doğrulukla" },
    kosul: { durum: "eksik" }, zaman: { durum: "eksik" }, taban: { durum: "eksik" },
  },
  mebUyum: null,
  sorular: [{ bilesen: "zaman", soru: "Sinan için ne zamana kadar?", ornek: "8 hafta içinde" }],
  ozet: "Sinan'ın hedefinde zaman eksik.",
});
/** Basit çeviriciler: tam ad ve ad parçası. */
const tamAd = (s: string) => s.replaceAll("Sinan", "Arda Yılmaz");
const ilkAd = (s: string) => s.replaceAll("Sinan", "Arda");

describe("sonucuGeriCevir", () => {
  it("alıntı gerçek hedefin parçası kalır (parça adayı), diğer alanlar tam adla çevrilir", () => {
    const s = sonucuGeriCevir(rumuzlu, "Arda doğru okur; 8/10 doğrulukla.", tamAd, [ilkAd]);
    expect(s.bilesenler.davranis.alinti).toBe("Arda doğru okur");
    expect(s.bilesenler.olcut.alinti).toBe("8/10 doğrulukla");
    expect(s.bilesenler.davranis.not).toBe("Arda Yılmaz için gözlenebilir.");
    expect(s.sorular[0]!.soru).toBe("Arda Yılmaz için ne zamana kadar?");
    expect(s.ozet).toBe("Arda Yılmaz'ın hedefinde zaman eksik.");
  });
  it("tam ad hedefte geçiyorsa tam ad kazanır; hiçbiri geçmiyorsa tam ada düşer; girdi değişmez", () => {
    expect(sonucuGeriCevir(rumuzlu, "Arda Yılmaz doğru okur", tamAd, [ilkAd]).bilesenler.davranis.alinti).toBe("Arda Yılmaz doğru okur");
    expect(sonucuGeriCevir(rumuzlu, "başka metin", tamAd, [ilkAd]).bilesenler.davranis.alinti).toBe("Arda Yılmaz doğru okur");
    expect(rumuzlu.bilesenler.davranis.alinti).toBe("Sinan doğru okur");
  });
  it("adParcaCeviricileri: tek kelimelik adda boş; iki kelimede her parça için ayrı eşleme", () => {
    const geri = (s: string, m: { real: string; alias: string }[]) => s.replaceAll(m[0]!.alias, m[0]!.real);
    expect(adParcaCeviricileri("Ela", "Nisa", geri)).toEqual([]);
    const c = adParcaCeviricileri("Arda Yılmaz", "Sinan", geri);
    expect(c.map((f) => f("Sinan okur"))).toEqual(["Arda okur", "Yılmaz okur"]);
  });
});
