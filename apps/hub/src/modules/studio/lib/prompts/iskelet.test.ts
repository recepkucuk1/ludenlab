// apps/hub/src/modules/studio/lib/prompts/iskelet.test.ts
import { describe, expect, it } from "vitest";
import { ETIK_SINIR, DIL_KURALI, RUMUZ_NOTU, yasakKalipMetni } from "@/lib/prompts/ortakBloklar";
import {
  PENCERE,
  promptIddialari,
  promptPenceresi,
  studioKullaniciPromptu,
  studioSistemPromptu,
  yaklasikToken,
  type SistemPromptParcalari,
} from "./iskelet";

const ornek: SistemPromptParcalari = {
  rol: "Sen LudenLab'in ev ödevi materyali üreticisisin. Okuyucu: veli.",
  klinikCerceve: ["Ev çalışması seanstaki hedefin GENELLEMESİDİR: aynı beceri, farklı ortam."],
  ozgulluk: ["İlgi alanı verilmişse en az iki adımda malzeme olarak kullan."],
  karsitOrnek: {
    zayif: "Her gün 10 dakika konuşma pratiği yapın.",
    iyi: "Akşam yemeğinde Nisa'nın tabağındaki 3 yiyeceği 'ver' sözcüğüyle istemesini bekleyin.",
  },
  bicim: { giris: "Yanıtını SADECE JSON formatında ver:", sema: '{ "title": "…" }', butce: ["title ≤ 8 kelime"] },
  // Görev metnindeki örnekte 2 madde vardı; iskeletin kendi 4–6 kuralı gereği 4 madde.
  ozDenetim: ["Her adım profildeki bir veriye bağlı mı?", "Ödül/puan/çıkartma yok mu?", "JSON tek parça ve geçerli mi?", "Uzunluk bütçesi içinde mi?"],
};

/** Pencereye (1200–2000 token ≈ 3840–6400 karakter) sığan, araç-prompt'u benzeri uzun örnek. */
const uzunOrnek = (ek: Partial<SistemPromptParcalari> = {}): SistemPromptParcalari => ({
  ...ornek,
  klinikCerceve: Array.from({ length: 14 }, (_, i) => `Çerçeve maddesi ${i + 1}: ${"açıklama ".repeat(18).trim()}.`),
  ...ek,
});

describe("studioSistemPromptu", () => {
  it("bölümler A1 sırasıyla gelir ve ortak son blok eklenir", () => {
    const p = studioSistemPromptu(ornek);
    const sira = ["ROL", "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK", "ZAYIF ÖRNEK", "İYİ ÖRNEK", "BİÇİM", "ÖZ-DENETİM", ETIK_SINIR, DIL_KURALI, RUMUZ_NOTU].map((k) => p.indexOf(k));
    expect(sira.every((i) => i >= 0)).toBe(true);
    expect([...sira].sort((a, b) => a - b)).toEqual(sira);
    expect(p).toContain(yasakKalipMetni());
  });
  it("araca özgü özgüllük kuralları ortak kuralların ARKASINA eklenir; ozgulluk verilmezse yalnız ortak kurallar", () => {
    const p = studioSistemPromptu(ornek);
    expect(p.indexOf("profildeki en az bir somut veriye")).toBeLessThan(p.indexOf("en az iki adımda malzeme"));
    const { ozgulluk: _ozgulluk, ...ozgulluksuz } = ornek;
    expect(studioSistemPromptu(ozgulluksuz)).toContain("ÖZGÜLLÜK KURALLARI\n- Her öneri");
  });
  it("öz-denetim maddeleri numaralı ve 'listeyi çıktıya YAZMA' uyarısı var; şema ve alan bütçeleri BİÇİM altında", () => {
    const p = studioSistemPromptu(ornek);
    expect(p).toContain("1. Her adım profildeki bir veriye bağlı mı?");
    expect(p).toContain("2. Ödül/puan/çıkartma yok mu?");
    expect(p).toContain("listeyi çıktıya YAZMA");
    expect(p.indexOf('{ "title": "…" }')).toBeGreaterThan(p.indexOf("BİÇİM"));
    expect(p).toContain("Alan bütçeleri:\n- title ≤ 8 kelime");
  });
  it("karşıt örnek çifti 120 kelimeyi aşarsa kurulum anında fırlatır", () => {
    expect(() => studioSistemPromptu({ ...ornek, karsitOrnek: { zayif: "k ".repeat(70), iyi: "k ".repeat(60) } })).toThrow(/karşıt örnek/);
    expect(() => studioSistemPromptu({ ...ornek, karsitOrnek: { zayif: "k ".repeat(70), iyi: "k ".repeat(60) } })).toThrow(/130/);
    expect(() => studioSistemPromptu({ ...ornek, karsitOrnek: { zayif: "k ".repeat(60), iyi: "k ".repeat(60) } })).not.toThrow();
  });
  it("öz-denetim 4–6 madde olmalı", () => {
    expect(() => studioSistemPromptu({ ...ornek, ozDenetim: ["tek"] })).toThrow(/öz-denetim/);
    expect(() => studioSistemPromptu({ ...ornek, ozDenetim: ["1", "2", "3", "4", "5", "6", "7"] })).toThrow(/öz-denetim 7 madde/);
    expect(() => studioSistemPromptu({ ...ornek, ozDenetim: ["1", "2", "3", "4"] })).not.toThrow();
    expect(() => studioSistemPromptu({ ...ornek, ozDenetim: ["1", "2", "3", "4", "5", "6"] })).not.toThrow();
  });
});

describe("studioKullaniciPromptu", () => {
  it("sıra: öğrenci bloğu, parametreler, odak, hatırlatma; boş blok başlıksız", () => {
    const p = studioKullaniciPromptu({ studentBlock: "Öğrenci: Nisa", parametreler: ["- Süre: 10 dakika"], odak: "Süre 10 dk → en çok 4 adım.", hatirlatma: ["Veliye öneri kipi.", "Ödül önerme."] });
    expect(p.indexOf("Öğrenci: Nisa")).toBeLessThan(p.indexOf("- Süre: 10 dakika"));
    expect(p.indexOf("Odak:")).toBeLessThan(p.indexOf("Son hatırlatma"));
    expect(studioKullaniciPromptu({ studentBlock: "", parametreler: ["- a"], odak: "o", hatirlatma: ["h", "h2"] })).not.toContain("ÖĞRENCİ");
  });
  it("öğrenci bloğu başlıkla açılır, kırpılır; parametreler satır satır; hatırlatmalar tek satırda birleşir", () => {
    const p = studioKullaniciPromptu({ studentBlock: "  Öğrenci: Nisa\nYaş: 5  ", parametreler: ["- Süre: 10 dakika", "- Ortam: ev"], odak: "o", hatirlatma: ["Veliye öneri kipi.", "Ödül önerme."] });
    expect(p.startsWith("ÖĞRENCİ\nÖğrenci: Nisa\nYaş: 5\n\nPARAMETRELER\n- Süre: 10 dakika\n- Ortam: ev")).toBe(true);
    expect(p.endsWith("Son hatırlatma: Veliye öneri kipi. Ödül önerme.")).toBe(true);
    expect(studioKullaniciPromptu({ studentBlock: "   \n ", parametreler: ["- a"], odak: "o", hatirlatma: ["h"] })).not.toContain("ÖĞRENCİ");
  });
});

describe("yaklasikToken / promptPenceresi", () => {
  it("3,2 karakter = 1 token; pencere 1200–2000", () => {
    expect(yaklasikToken("a".repeat(320))).toBe(100);
    expect(promptPenceresi("a".repeat(3200))).toEqual({ token: 1000, uygun: false });
    expect(promptPenceresi("a".repeat(5000)).uygun).toBe(true);
  });
  it("yukarı yuvarlar; pencere sınırları dahil", () => {
    expect(yaklasikToken("")).toBe(0);
    expect(yaklasikToken("a")).toBe(1);
    expect(PENCERE).toEqual({ min: 1200, max: 2000 });
    expect(promptPenceresi("a".repeat(1200 * 3.2))).toEqual({ token: 1200, uygun: true });
    expect(promptPenceresi("a".repeat(2000 * 3.2))).toEqual({ token: 2000, uygun: true });
    expect(promptPenceresi("a".repeat(2000 * 3.2 + 1)).uygun).toBe(false);
  });
});

describe("promptIddialari", () => {
  it("pencereye sığan, alanları taşıyan, yasak sözcüğü olmayan prompt geçer", () => {
    const p = studioSistemPromptu(uzunOrnek());
    expect(promptPenceresi(p).uygun).toBe(true);
    expect(() => promptIddialari(p, ["title"])).not.toThrow();
  });
  it("pencere dışıysa token sayısını ve pencereyi söyler", () => {
    const kisa = studioSistemPromptu(ornek);
    const token = yaklasikToken(kisa);
    expect(() => promptIddialari(kisa, ["title"])).toThrow(new RegExp(`${token} token.*1200–2000`));
  });
  it("şemada olmayan alanı adıyla söyler", () => {
    const p = studioSistemPromptu(uzunOrnek());
    expect(() => promptIddialari(p, ["title", "yokAlan"])).toThrow(/şemada alan yok: yokAlan/);
  });
  it("'hasta' / 'terapist' tam sözcük olarak geçerse sözcüğü ve bağlamını söyler (büyük harf dahil)", () => {
    const hasta = studioSistemPromptu(uzunOrnek({ rol: "Sen bir yardımcısın; hasta ile konuşursun." }));
    expect(() => promptIddialari(hasta, ["title"])).toThrow(/'hasta' sözcüğünü kullanıyor.*hasta ile konuşursun/);
    const terapist = studioSistemPromptu(uzunOrnek({ rol: "Terapist için not üretirsin." }));
    expect(() => promptIddialari(terapist, ["title"])).toThrow(/'terapist' sözcüğünü kullanıyor/);
  });
  it("DİL KURALI içindeki tırnaklı anış, tırnaklı öz-denetim anışı ve 'hastane'/'terapistlik' gibi başka sözcükler fırlatmaz", () => {
    expect(DIL_KURALI).toMatch(/"hasta"/);
    const p = studioSistemPromptu(
      uzunOrnek({
        rol: "Hastane dışı, ev ortamı için üretirsin; terapistlik eğitimi almış uzmanlar okur.",
        ozDenetim: ['"hasta/terapist" sözcükleri yok mu?', "Ödül yok mu?", "JSON geçerli mi?", "Bütçe içinde mi?"],
      }),
    );
    expect(() => promptIddialari(p, ["title"])).not.toThrow();
  });
});
