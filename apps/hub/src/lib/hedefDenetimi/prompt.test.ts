import { describe, expect, it } from "vitest";
import { yasakSozcukDenetimi } from "@/lib/prompts/yasakSozcuk";
import { HEDEF_DENETIM_SYSTEM, VERI_NOTU, kullaniciPromptu } from "./prompt";

/** Eval düzeneğiyle aynı tahmin: 3,2 karakter ≈ 1 token. */
const yaklasikToken = (s: string) => Math.ceil(s.length / 3.2);

describe("HEDEF_DENETIM_SYSTEM", () => {
  it("yasak sözcük yok; ≤2000 token; şema alan adları tırnaklı geçer", () => {
    expect(() => yasakSozcukDenetimi(HEDEF_DENETIM_SYSTEM)).not.toThrow();
    expect(yaklasikToken(HEDEF_DENETIM_SYSTEM)).toBeLessThanOrEqual(2000);
    for (const a of ["bilesenler", "davranis", "olcut", "kosul", "zaman", "taban", "durum", "alinti", "not", "mebUyum", "sorular", "bilesen", "soru", "ornek", "ozet"]) {
      expect(HEDEF_DENETIM_SYSTEM, a).toContain(`"${a}"`);
    }
  });
  it("yeniden yazma ve puan yasağı, birebir alıntı kuralı, ortak kapanış bloğu sırada sonda", () => {
    expect(HEDEF_DENETIM_SYSTEM).toContain("yeniden YAZMAZSIN");
    expect(HEDEF_DENETIM_SYSTEM).toContain("puan ya da derece VERMEZSİN");
    expect(HEDEF_DENETIM_SYSTEM).toContain("BİREBİR");
    expect(HEDEF_DENETIM_SYSTEM).toContain("ETİK SINIR");
    expect(HEDEF_DENETIM_SYSTEM).toContain("DİL KURALI");
    expect(HEDEF_DENETIM_SYSTEM).toContain('"kismen" ("kısmen" değil)');
    expect(HEDEF_DENETIM_SYSTEM).toContain("3+ ardışık");
    expect(HEDEF_DENETIM_SYSTEM.lastIndexOf("BU ARAÇTA")).toBeGreaterThan(HEDEF_DENETIM_SYSTEM.indexOf("ETİK SINIR"));
    expect(HEDEF_DENETIM_SYSTEM.trimEnd().split("\n\n").pop()!.startsWith("BU ARAÇTA")).toBe(true);
    expect(HEDEF_DENETIM_SYSTEM.indexOf("ÖZ-DENETİM")).toBeLessThan(HEDEF_DENETIM_SYSTEM.indexOf("ETİK SINIR"));
  });
});

describe("kullaniciPromptu", () => {
  it("hedef <hedef> içinde + veri notu; bağlam satırları yalnız verilince; sonda 'yalnız JSON'", () => {
    const p = kullaniciPromptu({ hedef: "10 kelimeyi okur.", baglam: { kademeYas: "İlkokul (1–4. sınıf), 8 yaş", ustHedef: "1.1 Nefes kontrolü" } });
    expect(p).toContain(`<hedef>\n10 kelimeyi okur.\n</hedef>\n${VERI_NOTU}`);
    expect(p).toContain("BAĞLAM\n- Kademe/yaş: İlkokul (1–4. sınıf), 8 yaş\n- Üst hedef: 1.1 Nefes kontrolü");
    expect(p.trimEnd().endsWith("Yanıt: yalnız JSON.")).toBe(true);
    expect(p).not.toContain("MEB HEDEF HİZALAMASI");
    const sade = kullaniciPromptu({ hedef: "okur" });
    expect(sade).not.toContain("BAĞLAM");
    expect(sade.startsWith("<hedef>")).toBe(true);
  });
  it("MEB bloğu verilince başlıkla basılır", () => {
    expect(kullaniciPromptu({ hedef: "okur", baglam: { meb: "- MEB hedef alanı: X (3.2.5)" } })).toContain("MEB HEDEF HİZALAMASI\n- MEB hedef alanı: X (3.2.5)");
  });
});
