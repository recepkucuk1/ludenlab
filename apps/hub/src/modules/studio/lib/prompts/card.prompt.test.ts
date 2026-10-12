// apps/hub/src/modules/studio/lib/prompts/card.prompt.test.ts
import { describe, expect, it } from "vitest";
import { ETIK_SINIR } from "@/lib/prompts/ortakBloklar";
import { promptIddialari, promptPenceresi } from "./iskelet";
import { AGE_RULE, CARD_SYSTEM_PROMPT, CARD_TOOL, DIFFICULTY_RULE, buildCardPrompt, odakSatiri } from "./index";

/**
 * Öğrenme kartı A1 prompt sözleşmesi (Faz 2 / Task 12). Model çıktısı birim testte ölçülemez; burada
 * kilitlenen şey MODELE GİDEN METİNDİR: sistem prompt'u pencerede (tavana ≥ 60 token pay) ve A1 sırasında,
 * `emit_card` alan adları aynen (CARD_TOOL değişmez — A4), klinik çerçeve / özgüllük / karşıt örnek /
 * öz-denetim maddeleri yerinde; kullanıcı prompt'unda ortak öğrenci bloğu önce, odak satırı zorluk + yaş
 * grubundan koddan türetilmiş, iki hatırlatma sonda; yetişkinde muhatap öğrencinin kendisi.
 * Çapalar anlamsaldır (yankılanan literal değil); Türkçe İ `/i` ile katlanmaz, büyük harfli biçim aynen aranır.
 */
const ALANLAR = ["title", "objective", "materials", "instructions", "exercises", "name", "description", "repetitions", "therapistNotes", "progressIndicators", "homeExercise"];
const TAVAN_PAYLI = 1940;

const blok = [
  "Öğrenci: Hazal, 5 yaş",
  "Çalışma alanı: Dil",
  "Uzman notları: Trenlere bayılıyor; yeni ortamda önce izliyor.",
  "Tamamlanan hedefler: 2.1",
].join("\n");
const temel = { category: "language", difficulty: "easy", ageGroup: "3-6", focusArea: "Üç kelimeli istek cümlesi" } as const;

function bolum(p: string, baslik: string, sonraki: string): string {
  const a = p.indexOf(baslik);
  const b = p.indexOf(sonraki, a + 1);
  expect(a, baslik).toBeGreaterThanOrEqual(0);
  expect(b, sonraki).toBeGreaterThan(a);
  return p.slice(a, b);
}
const say = (p: string, parca: string) => p.split(parca).length - 1;

describe("CARD_SYSTEM_PROMPT (A1)", () => {
  it("pencere 1200–2000 token, tavana ≥ 60 pay; 11 şema alanı aynen; yasak sözcük yok", () => {
    expect(() => promptIddialari(CARD_SYSTEM_PROMPT, ALANLAR)).not.toThrow();
    expect(promptPenceresi(CARD_SYSTEM_PROMPT).token).toBeLessThanOrEqual(TAVAN_PAYLI);
  });

  it("CARD_TOOL değişmedi: emit_card, 8 zorunlu alan, egzersiz alt alanları", () => {
    expect(CARD_TOOL.name).toBe("emit_card");
    const schema = CARD_TOOL.input_schema as { required: string[]; properties: Record<string, { items?: { required?: string[] } }> };
    expect(schema.required).toEqual(["title", "objective", "materials", "instructions", "exercises", "therapistNotes", "progressIndicators", "homeExercise"]);
    expect(schema.properties.exercises.items?.required).toEqual(["name", "description", "repetitions"]);
  });

  it("bölümler A1 sırasında: rol → klinik çerçeve → özgüllük → karşıt örnek → biçim → öz-denetim → ortak son blok", () => {
    const p = CARD_SYSTEM_PROMPT;
    const sira = ["ROL\n", "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK KURALLARI", "ZAYIF ÖRNEK", "İYİ ÖRNEK", "BİÇİM\n", "Alan bütçeleri:", "ÖZ-DENETİM", ETIK_SINIR].map((k) => p.indexOf(k));
    expect(sira.every((i) => i >= 0)).toBe(true);
    expect([...sira].sort((a, b) => a - b)).toEqual(sira);
  });

  it("rol: uzman okur; homeExercise veliye (yetişkinde kendisine), terimsiz; therapistNotes terim serbest ama 'öğrenci/uzman' geçerli", () => {
    const rol = bolum(CARD_SYSTEM_PROMPT, "ROL\n", "KLİNİK ÇERÇEVE");
    expect(rol).toMatch(/uzman/);
    expect(rol).toContain("homeExercise");
    expect(rol).toMatch(/veli/);
    expect(rol).toMatch(/kendisi/);
    expect(rol).toContain("therapistNotes");
    expect(rol).toMatch(/terim serbest/);
    expect(rol).toContain('"öğrenci/uzman"');
    expect(rol).not.toMatch(/mesleki dil/);
  });

  it("klinik çerçeve: üç kategori tanımı, aşama kuralları ve yaş kuralları aynen (adaptör aynı metni hakeme gösterir), hiyerarşi, ölçülebilir gösterge, sayılı tekrar, tamamlanan hedef/son kart", () => {
    const k = bolum(CARD_SYSTEM_PROMPT, "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK KURALLARI");
    for (const c of ["speech", "language", "hearing"]) expect(k, c).toContain(`${c} (`);
    for (const r of Object.values(DIFFICULTY_RULE)) expect(k).toContain(r);
    for (const r of Object.values(AGE_RULE)) expect(k).toContain(r);
    expect(k).toMatch(/Başlangıç/);
    expect(k).toMatch(/Gelişim/);
    expect(k).toMatch(/Pekiştirme/);
    expect(k).toMatch(/izole ses → hece → kelime → cümle/);
    expect(k).toMatch(/genişletme/);
    expect(k).toMatch(/gürültü/);
    expect(k).toContain("progressIndicators");
    expect(k).toMatch(/sayı/);
    expect(k).toMatch(/ölçüt/);
    expect(k).toMatch(/koşul/);
    expect(k).toContain("repetitions");
    expect(k).toMatch(/Tamamlanan hedefler/);
    expect(k).toMatch(/Son çalışmalar/);
    expect(k).toMatch(/bir sonraki aşama/);
    // İçsel motivasyon somut: tırnak içinde söz + öz-farkındalık + oyun/keşif; tanı → tasarım kuralı.
    expect(k).toMatch(/öz-farkındalık/);
    expect(k).toMatch(/OSB/);
    expect(k).toMatch(/Yetişkin/);
    expect(k).toMatch(/yazılmaz/);
  });

  it("özgüllük: ortak dört kural bir kez ve önde; ekler: focusArea her egzersizde, objective müfredata, therapistNotes'ta bloktaki ad, ilgi alanı 'Uzman notları'nda, yetişkinde 'X yazılmaz'", () => {
    const p = CARD_SYSTEM_PROMPT;
    expect(say(p, "profildeki en az bir somut veriye")).toBe(1);
    expect(say(p, "İlgi alanı verilmişse")).toBe(1);
    const o = bolum(p, "ÖZGÜLLÜK KURALLARI", "ZAYIF ÖRNEK");
    expect(o.indexOf("profildeki en az bir somut veriye")).toBeLessThan(o.indexOf("focusArea"));
    expect(o).toContain("focusArea");
    expect(o).toMatch(/her egzersiz/i);
    expect(o).toContain("objective");
    expect(o).toMatch(/DOĞRUDAN/);
    expect(o).toContain("therapistNotes");
    expect(o).toMatch(/bloktaki ad/);
    expect(o).toMatch(/Uzman notları/);
    expect(o).toMatch(/bayılıyor/);
    expect(o).toMatch(/Dikkat edilmesi gerekenler/);
    expect(o).toMatch(/adult/);
    expect(o).toMatch(/yazılmaz/);
    expect(o).not.toMatch(/\b(yazma|öğretme|önerme);/);
  });

  it("karşıt örnek: zayıf soyut gösterge; iyi sayı + ölçüt + koşul taşır ve prompt'un kendi kurallarına uyar", () => {
    const p = CARD_SYSTEM_PROMPT;
    const zayif = p.slice(p.indexOf("ZAYIF ÖRNEK"), p.indexOf("İYİ ÖRNEK"));
    const iyi = p.slice(p.indexOf("İYİ ÖRNEK"), p.indexOf("BİÇİM\n"));
    expect(zayif).toMatch(/daha iyi/);
    expect(iyi).toMatch(/\d+\/\d+/);
    expect(iyi).toMatch(/en az/);
    expect(iyi).toMatch(/ipucusuz/);
    expect(iyi).toMatch(/ardışık/);
    expect(iyi).not.toMatch(/terapist|hasta/);
  });

  it("biçim: emit_card, araç dışında metin yok; alan bütçeleri her alan için, Adım N biçimi, sayılı tekrar, derinlik yuvaları", () => {
    const b = bolum(CARD_SYSTEM_PROMPT, "BİÇİM\n", "ÖZ-DENETİM");
    expect(b).toContain("`emit_card`");
    expect(b).toMatch(/araç dışında metin yazma/);
    const butce = b.slice(b.indexOf("Alan bütçeleri:"));
    for (const alan of ["title", "objective", "materials", "instructions", "exercises", "therapistNotes", "progressIndicators", "homeExercise"]) {
      expect(butce, alan).toMatch(new RegExp(`^- ${alan}:`, "m"));
    }
    expect(butce).toMatch(/objective:[^\n]*1–2 cümle/);
    expect(butce).toMatch(/materials:[^\n]*≤ 6/);
    expect(butce).toMatch(/instructions:[^\n]*4–8/);
    expect(butce).toMatch(/instructions:[^\n]*"Adım N: "/);
    expect(butce).toMatch(/instructions:[^\n]*≤ 2 cümle/);
    expect(butce).toMatch(/exercises:[^\n]*2–4/);
    expect(butce).toMatch(/exercises:[^\n]*description[^\n]*cümle/);
    expect(butce).toMatch(/exercises:[^\n]*repetitions[^\n]*sayı/);
    // Derinlik (g): uzman notu yuvalı; alt sınır 60%'ın altına inmez (taban ~14 cümle → en az 5).
    expect(butce).toMatch(/therapistNotes:[^\n]*[5-8]–8 cümle/);
    expect(butce).toMatch(/therapistNotes:[^\n]*tırnak/);
    expect(butce).toMatch(/progressIndicators:[^\n]*3–5/);
    expect(butce).toMatch(/homeExercise:[^\n]*[3-4]–4 cümle/);
  });

  it("öz-denetim 4–6 numaralı madde, hepsi olumlu soru kipi; hizalama, ölçülebilirlik, yaş kuralı, tırnaklı 'hasta/terapist', şema", () => {
    const oz = bolum(CARD_SYSTEM_PROMPT, "ÖZ-DENETİM", ETIK_SINIR);
    const maddeler = oz.split("\n").filter((l) => /^\d\. /.test(l));
    expect(maddeler.length).toBeGreaterThanOrEqual(4);
    expect(maddeler.length).toBeLessThanOrEqual(6);
    for (const m of maddeler) expect(m).toMatch(/m[ıiuü]\?$/);
    expect(oz).toMatch(/odak alan/i);
    expect(oz).toMatch(/ölçüt/);
    expect(oz).toMatch(/yaş/);
    expect(oz).toContain('"hasta/terapist"');
    expect(oz).toMatch(/şema/);
  });
});

describe("odakSatiri — zorluk + yaş grubundan koddan türetilir", () => {
  it("başlangıç + okul öncesi: aşama adı, yaş etiketi, iki kural, homeExercise veliye", () => {
    const o = odakSatiri("easy", "3-6");
    expect(o).toMatch(/^Başlangıç aşaması \+ 3-6 yaş \(okul öncesi\) → /);
    expect(o).toContain(DIFFICULTY_RULE.easy);
    expect(o).toMatch(/oyun temelli/i);
    expect(o).toMatch(/veliye/);
    expect(o).not.toMatch(/kendisine/);
  });
  it("pekiştirme + yetişkin: öz-izleme, profesyonel ton, homeExercise öğrencinin kendisine; veli/oyun yazılmaz", () => {
    const o = odakSatiri("hard", "adult");
    expect(o).toMatch(/^Pekiştirme aşaması \+ yetişkin/);
    expect(o).toContain(DIFFICULTY_RULE.hard);
    expect(o).toMatch(/profesyonel ton/);
    expect(o).toMatch(/kendisine/);
    expect(o).toMatch(/yazılmaz/);
    expect(o).not.toMatch(/veliye/);
  });
  it("gelişim + ergen: Gelişim aşaması, kimliğe saygılı", () => {
    const o = odakSatiri("medium", "13-18");
    expect(o).toMatch(/^Gelişim aşaması/);
    expect(o).toMatch(/kimliğe saygılı/);
  });
});

describe("buildCardPrompt (A1 kullanıcı prompt'u)", () => {
  it("blok önce (ÖĞRENCİ başlığı altında aynen), sonra PARAMETRELER, sonra Odak, en sonda iki hatırlatma", () => {
    const p = buildCardPrompt({ ...temel, studentBlock: blok });
    expect(p.startsWith(`ÖĞRENCİ\n${blok}\n\nPARAMETRELER\n`)).toBe(true);
    const i = (s: string) => p.indexOf(s);
    expect(i("PARAMETRELER")).toBeLessThan(i("Odak: "));
    expect(i("Odak: ")).toBeLessThan(i("Son hatırlatma: "));
    const son = p.slice(i("Son hatırlatma: "));
    expect(son).toMatch(/sayı\/ölçüt\/koşul/);
    expect(son).toMatch(/Tamamlanan hedefler/);
    expect(son).toMatch(/yeniden hedeflenmez/);
    expect(son).not.toMatch(/hedefleme\./); // (e) ad öbeği gibi okunan olumsuz emir yok
    expect(p).not.toContain("**ÖĞRENCİ BAĞLAMI:**");
  });

  it("parametreler: kategori, zorluk, yaş grubu etiketleri; odak alanı; müfredat hedefi verilmişse objective'e bağlı satır", () => {
    const p = buildCardPrompt({ ...temel, curriculumGoalText: "- 2.2: Üç sözcüklü istek cümlesi (Pragmatik dil)" });
    const param = bolum(p, "PARAMETRELER", "Odak: ");
    expect(param).toContain("- Kategori: dil");
    expect(param).toContain("- Zorluk: kolay (başlangıç seviyesi)");
    expect(param).toContain("- Yaş grubu: 3-6 yaş (okul öncesi)");
    expect(param).toContain("- Hedef beceri / odak alan: Üç kelimeli istek cümlesi");
    expect(param).toMatch(/Müfredat hedefleri[^\n]*DOĞRUDAN/);
    expect(param).toContain("- 2.2: Üç sözcüklü istek cümlesi (Pragmatik dil)");
    expect(buildCardPrompt(temel)).not.toMatch(/Müfredat/);
    expect(buildCardPrompt({ ...temel, focusArea: "  " })).not.toMatch(/odak alan/);
  });

  it("odak satırı zorluk ve yaş grubuna göre hesaplanır (yetişkin vakada çocuk kuralı yok)", () => {
    const p = buildCardPrompt({ category: "speech", difficulty: "medium", ageGroup: "adult", studentBlock: "Öğrenci: Nesrin, 34 yaş\nÇalışma alanı: Konuşma" });
    expect(p).toContain(`Odak: ${odakSatiri("medium", "adult")}`);
    expect(p).not.toMatch(/okul öncesi/);
  });

  it("blok yok ya da boşsa ÖĞRENCİ başlığı yazılmaz; prompt 'terapist/hasta' içermez", () => {
    for (const p of [buildCardPrompt(temel), buildCardPrompt({ ...temel, studentBlock: "" }), buildCardPrompt({ ...temel, studentBlock: "  \n" })]) {
      expect(p).not.toMatch(/^ÖĞRENCİ$/m);
      expect(p.startsWith("PARAMETRELER\n")).toBe(true);
    }
    expect(buildCardPrompt({ ...temel, studentBlock: blok }).toLocaleLowerCase("tr-TR")).not.toMatch(/terapist|hasta(?!ne)/);
  });
});
