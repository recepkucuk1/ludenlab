// apps/hub/src/modules/studio/lib/prompts/iskelet.test.ts
import { describe, expect, it } from "vitest";
import { ETIK_SINIR, DIL_KURALI, ORTAK_SON_BLOK, RUMUZ_NOTU, yasakKalipMetni } from "@/lib/prompts/ortakBloklar";
import {
  PROMPT_PENCERESI,
  PROMPT_PENCERESI_GENIS,
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
  // Araca özgü ek: ortak dört kuralı (veri bağı, ilgi alanı, geçmiş, "yap") yeniden yazmaz.
  ozgulluk: ["Her adım, velinin o akşam gözleyebileceği tek bir ölçütle biter (ör. 'üç yiyecekten ikisini istedi')."],
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
    expect(p.indexOf("profildeki en az bir somut veriye")).toBeLessThan(p.indexOf("tek bir ölçütle biter"));
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
  it("boş liste ya da boş madde kurulum anında fırlatır (klinik çerçeve, alan bütçeleri, öz-denetim, özgüllük)", () => {
    expect(() => studioSistemPromptu({ ...ornek, klinikCerceve: [] })).toThrow(/klinik çerçeve boş/);
    expect(() => studioSistemPromptu({ ...ornek, klinikCerceve: ["a", "  "] })).toThrow(/klinik çerçeve 2\. madde boş/);
    expect(() => studioSistemPromptu({ ...ornek, bicim: { ...ornek.bicim, butce: [] } })).toThrow(/alan bütçeleri boş/);
    expect(() => studioSistemPromptu({ ...ornek, bicim: { ...ornek.bicim, butce: [""] } })).toThrow(/alan bütçeleri 1\. madde boş/);
    expect(() => studioSistemPromptu({ ...ornek, ozDenetim: ["a", "b", "", "d"] })).toThrow(/öz-denetim 3\. madde boş/);
    expect(() => studioSistemPromptu({ ...ornek, ozgulluk: [" "] })).toThrow(/özgüllük 1\. madde boş/);
    expect(() => studioSistemPromptu({ ...ornek, ozgulluk: [] })).not.toThrow();
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
  it("parametreler / son hatırlatma boşsa ya da boş madde içeriyorsa fırlatır", () => {
    const taban = { studentBlock: "", parametreler: ["- a"], odak: "o", hatirlatma: ["h"] };
    expect(() => studioKullaniciPromptu({ ...taban, parametreler: [] })).toThrow(/parametreler boş/);
    expect(() => studioKullaniciPromptu({ ...taban, parametreler: ["- a", " "] })).toThrow(/parametreler 2\. madde boş/);
    expect(() => studioKullaniciPromptu({ ...taban, hatirlatma: [] })).toThrow(/son hatırlatma boş/);
    expect(() => studioKullaniciPromptu({ ...taban, hatirlatma: [""] })).toThrow(/son hatırlatma 1\. madde boş/);
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
    expect(PROMPT_PENCERESI).toEqual({ min: 1200, max: 2000 });
    expect(promptPenceresi("a".repeat(1200 * 3.2))).toEqual({ token: 1200, uygun: true });
    expect(promptPenceresi("a".repeat(2000 * 3.2))).toEqual({ token: 2000, uygun: true });
    expect(promptPenceresi("a".repeat(2000 * 3.2 + 1)).uygun).toBe(false);
  });
  it("araç başına pencere: PROMPT_PENCERESI_GENIS 1200–2600; varsayılan pencere değişmez", () => {
    expect(PROMPT_PENCERESI_GENIS).toEqual({ min: 1200, max: 2600 });
    const genis = "a".repeat(2500 * 3.2);
    expect(promptPenceresi(genis)).toEqual({ token: 2500, uygun: false });
    expect(promptPenceresi(genis, PROMPT_PENCERESI_GENIS)).toEqual({ token: 2500, uygun: true });
    expect(promptPenceresi("a".repeat(2600 * 3.2), PROMPT_PENCERESI_GENIS).uygun).toBe(true);
    expect(promptPenceresi("a".repeat(2600 * 3.2 + 1), PROMPT_PENCERESI_GENIS).uygun).toBe(false);
    // Alt sınır geniş pencerede de aynı: kısa prompt yine düşer.
    expect(promptPenceresi("a".repeat(1000 * 3.2), PROMPT_PENCERESI_GENIS).uygun).toBe(false);
    // Serbest pencere de verilebilir.
    expect(promptPenceresi("a".repeat(100 * 3.2), { min: 50, max: 100 }).uygun).toBe(true);
  });
});

describe("promptIddialari", () => {
  /** Verilen cümleyi ROL bölümüne koyar; prompt'un geri kalanı temiz ve pencereye sığar. */
  const rolIle = (cumle: string) => () => promptIddialari(studioSistemPromptu(uzunOrnek({ rol: cumle })), ["title"]);

  it("pencereye sığan, alanları taşıyan, yasak sözcüğü olmayan prompt geçer; tam ORTAK_SON_BLOK (DİL KURALI'nın tırnaklı anışıyla) içindedir", () => {
    const p = studioSistemPromptu(uzunOrnek());
    expect(promptPenceresi(p).uygun).toBe(true);
    expect(p).toContain(ORTAK_SON_BLOK);
    expect(DIL_KURALI).toMatch(/"hasta" yerine/);
    expect(() => promptIddialari(p, ["title"])).not.toThrow();
  });
  it("pencere dışıysa token sayısını ve pencereyi söyler", () => {
    const kisa = studioSistemPromptu(ornek);
    const token = yaklasikToken(kisa);
    expect(() => promptIddialari(kisa, ["title"])).toThrow(new RegExp(`${token} token.*1200–2000`));
  });
  it("pencere seçeneği: varsayılanda düşen 2000–2600 token'lık prompt geniş pencerede geçer; hata iletisi verilen pencereyi söyler", () => {
    // 14 → 28 çerçeve maddesi: ≈2.300 token, varsayılan pencerenin üstünde, geniş pencerenin içinde.
    const genis = studioSistemPromptu(uzunOrnek({ klinikCerceve: Array.from({ length: 28 }, (_, i) => `Çerçeve maddesi ${i + 1}: ${"açıklama ".repeat(18).trim()}.`) }));
    const token = yaklasikToken(genis);
    expect(token).toBeGreaterThan(PROMPT_PENCERESI.max);
    expect(token).toBeLessThanOrEqual(PROMPT_PENCERESI_GENIS.max);
    expect(() => promptIddialari(genis, ["title"])).toThrow(new RegExp(`${token} token.*1200–2000`));
    expect(() => promptIddialari(genis, ["title"], PROMPT_PENCERESI_GENIS)).not.toThrow();
    // Geniş pencere alan/sözcük denetimlerini gevşetmez.
    expect(() => promptIddialari(genis, ["title", "yokAlan"], PROMPT_PENCERESI_GENIS)).toThrow(/şemada alan yok: yokAlan/);
    expect(() => promptIddialari(genis, ["title"], { min: 1200, max: 2200 })).toThrow(new RegExp(`${token} token.*1200–2200`));
  });
  it("şemada olmayan alanı adıyla söyler", () => {
    const p = studioSistemPromptu(uzunOrnek());
    expect(() => promptIddialari(p, ["title", "yokAlan"])).toThrow(/şemada alan yok: yokAlan/);
  });
  it.each([
    ["hasta ile konuşursun.", "hasta"],
    ["Hasta ile görüş.", "hasta"],
    ["hastanın adını yazma.", "hasta"],
    ["hastaya ödev ver.", "hasta"],
    ["hastalar için üret.", "hasta"],
    ["terapisti bilgilendir.", "terapist"],
    ["terapistin notu.", "terapist"],
    ["terapiste yaz.", "terapist"],
    ["terapistler okur.", "terapist"],
    ["terapistiyle paylaş.", "terapist"],
    ["konuşma terapisti okur.", "terapist"],
    ["TERAPİST için not üretirsin.", "terapist"],
  ])("çekimli / büyük harfli biçimi yakalar: %s", (cumle, sozcuk) => {
    expect(rolIle(cumle)).toThrow(new RegExp(`prompt '${sozcuk}' sözcüğünü kullanıyor`));
  });
  it.each([
    "hastane dışı ortam için üret.",
    "hastanede değil evde.",
    "hastalık adı yazma.",
    "hastalanmak durumunda ertele.",
    "hasta olursa ertele.",
    "terapistlik eğitimi almış uzman okur.",
    "fizyoterapist görüşü eklenir.",
    "ergoterapisti bilgilendir.",
    '"hasta" yerine öğrenci de.',
    '"hasta/terapist" yok mu?',
  ])("başka sözcük ya da tırnaklı anış geçer: %s", (cumle) => {
    expect(rolIle(cumle)).not.toThrow();
  });
  it("tırnaklı öz-denetim anışı geçer", () => {
    const p = studioSistemPromptu(uzunOrnek({ ozDenetim: ['"hasta/terapist" sözcükleri yok mu?', "Ödül yok mu?", "JSON geçerli mi?", "Bütçe içinde mi?"] }));
    expect(() => promptIddialari(p, ["title"])).not.toThrow();
  });
  it("hata iletisi sözcüğü ve bağlamını söyler", () => {
    expect(rolIle("Sen bir yardımcısın; hasta ile konuşursun.")).toThrow(/'hasta' sözcüğünü kullanıyor.*hasta ile konuşursun/);
  });
  it("araç bölümündeki 'DİL KURALI' anışı sonrasındaki yasak sözcüğü maskelemez", () => {
    expect(rolIle("DİL KURALI bölümüne uy.\nUzmanla değil, hasta ile görüş.")).toThrow(/'hasta' sözcüğünü kullanıyor/);
  });
});
