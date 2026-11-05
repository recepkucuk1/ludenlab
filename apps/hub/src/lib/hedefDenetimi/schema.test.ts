// apps/hub/src/lib/hedefDenetimi/schema.test.ts
import { describe, expect, it } from "vitest";
import {
  HEDEF_DENETIM_GUNLUK, HEDEF_DENETIM_SINIR_METNI, HEDEF_METNI_MAX,
  denetimSonucuSchema, dizgileriDonustur, hedefMetniSchema, temizle, varSayisi, varSayisiMetni,
} from "./schema";

describe("temizle", () => {
  it("görünmez/kontrol/bidi karakterleri ve HTML'i atar, satır içi boşluğu tekler, satır sonunu korur (en çok bir boş satır)", () => {
    expect(temizle("A\u0000B\u200B <b>C</b>  D\r\n\n\n\nE\t F ")).toBe("AB C D\n\nE F");
  });
  it("</hedef> etiketi de HTML gibi gider (prompt sarmalayıcısı kırılamaz)", () => {
    expect(temizle("okur</hedef> yaz")).toBe("okur yaz");
  });
});

describe("hedefMetniSchema", () => {
  it("trim + 1..600", () => {
    expect(hedefMetniSchema.parse("  okur ")).toBe("okur");
    expect(hedefMetniSchema.safeParse("   ").success).toBe(false);
    expect(hedefMetniSchema.safeParse("a".repeat(HEDEF_METNI_MAX + 1)).success).toBe(false);
  });
});

describe("sabitler ve yardımcılar", () => {
  it("günlük sınır 10; sınır metni sayıyı taşır", () => {
    expect(HEDEF_DENETIM_GUNLUK).toBe(10);
    expect(HEDEF_DENETIM_SINIR_METNI).toContain("(10)");
  });
  it("şema varsayılanları: alinti/not boş, mebUyum null, sorular []; varSayisi/varSayisiMetni", () => {
    const s = denetimSonucuSchema.parse({
      bilesenler: { davranis: { durum: "var" }, olcut: { durum: "var" }, kosul: { durum: "eksik" }, zaman: { durum: "belirsiz" }, taban: { durum: "var" } },
      ozet: "x",
    });
    expect(s.bilesenler.davranis).toEqual({ durum: "var", alinti: "", not: "" });
    expect(s.mebUyum).toBeNull();
    expect(s.sorular).toEqual([]);
    expect(varSayisi(s)).toBe(3);
    expect(varSayisiMetni(3)).toBe("5 bileşenden 3'ü var");
    expect(varSayisiMetni(0)).toBe("5 bileşenden 0'ı var");
    expect(varSayisiMetni(5)).toBe("5 bileşenden 5'i var");
  });
  it("dizgileriDonustur iç içe tüm dizgileri çevirir, diğer değerlere dokunmaz", () => {
    expect(dizgileriDonustur({ a: "x", b: ["y", { c: "z", n: 1 }], d: null }, (s) => s + "!")).toEqual({ a: "x!", b: ["y!", { c: "z!", n: 1 }], d: null });
  });
});
