// apps/hub/src/modules/studio/lib/generateProfile.prompt.test.ts
import { describe, expect, it, vi } from "vitest";
import { ETIK_SINIR } from "@/lib/prompts/ortakBloklar";
import { PROMPT_PENCERESI, promptIddialari, promptPenceresi } from "@studio/lib/prompts/iskelet";
import { PROFIL_BOLUMLERI } from "./studentContext";

/**
 * AI profili A1 prompt sözleşmesi (Faz 2 / Task 13). Çıktı JSON değil MARKDOWN: başlıklar arayüz
 * (`students/[id]/page.tsx` yalnız "## " satırlarında böler) ve bağlam katmanı (`PROFIL_BOLUMLERI`
 * iki bölümü sonraki her araca taşır) ile SÖZLEŞMEDİR — on başlık satırı şablonda aynen durur.
 * Model çıktısı birim testte ölçülemez; kilitlenen şey MODELE GİDEN METİNDİR: sistem prompt'u
 * pencerede ve A1 sırasında, şablon başlıkları birebir, köşeli parantezli bütçeler, yetişkin kuralı
 * KODDA (yaştan), "terapist/hasta" yok; kullanıcı prompt'unda ortak öğrenci bloğu önce, odak satırı
 * yaş + alandan türetilmiş, iki hatırlatma sonda.
 *
 * `generateProfile.ts` kurulumda DB/Anthropic istemcilerini çeker; burada yalnız prompt dışa
 * aktarımları okunur, bu yüzden o modüller taklit edilir (çağrılmaz).
 */
vi.mock("@studio/lib/db", () => ({ prisma: {} }));
vi.mock("@studio/lib/anthropic", () => ({ anthropic: {}, MODEL: "test" }));
vi.mock("@studio/lib/usage", () => ({ logUsage: () => {} }));
vi.mock("@studio/lib/pseudonym", () => ({ ensureStudentAlias: async () => "x", restoreName: (t: string) => t, scrub: (t: string | null) => t }));

const mod = await import("./generateProfile");

/** Şablon başlıkları — arayüz ve bağlam katmanı sözleşmesi (sıra dahil). */
const BASLIKLAR = [
  "## Kavramsal Arka Plan",
  "### Tanının Klinik Açıklaması",
  "### Bu Yaş Grubunda Beklenen Gelişim",
  "### Müfredat Modülleriyle İlişki",
  "---",
  "## Uzmana Öneriler",
  "### Öncelikli Çalışma Alanları",
  "### Etkili Yaklaşım ve Teknikler",
  "### Dikkat Edilmesi Gereken Noktalar",
  "### Aile ile Paylaşılabilecek Öneriler",
];

const blok = [
  "Öğrenci: Nisa, 6 yaş",
  "Çalışma alanı: Dil",
  "Tanı: Otizm spektrum bozukluğu, hafif düzey; ifade edici dil gecikmesi.",
  "Modüller: Pragmatik dil",
  "Uzman notları: Dinozorlara bayılıyor. İki kelimelik istek cümlesi kuruyor ('su ver').",
  "Sürmekte olan hedefler: Üç sözcüklü istek cümlesi",
].join("\n");
const yetiskinBlok = [
  "Öğrenci: Meral, 34 yaş",
  "Çalışma alanı: Konuşma",
  "Tanı: Sol hemisfer inmesi sonrası hafif dizartri.",
  "Uzman notları: Öğretmen; işe dönmek istiyor, eşi destekliyor.",
].join("\n");

/** Koşturucunun rumuz deseni (`evals/lib/runner.ts`): bloğun kimlik satırı `Öğrenci: <rumuz>, N yaş` + ardında `Çalışma alanı:`. */
const RUMUZ = /^Öğrenci: ([^,\n]+)(?:, \d+ yaş)?$(?=\nÇalışma alanı: )/m;

function bolum(p: string, baslik: string, sonraki: string): string {
  const a = p.indexOf(baslik);
  const b = p.indexOf(sonraki, a + 1);
  expect(a, baslik).toBeGreaterThanOrEqual(0);
  expect(b, sonraki).toBeGreaterThan(a);
  return p.slice(a, b);
}
const say = (p: string, parca: string) => p.split(parca).length - 1;
const satirlar = (p: string, re: RegExp) => p.split("\n").filter((l) => re.test(l));

describe("PROFILE_SYSTEM_PROMPT (A1, Markdown)", () => {
  it("pencere 1200–2000 token ve tavana ≥ 60 token pay; yasak sözcük ('hasta/terapist') yok", () => {
    // Alan adı listesi boş: Markdown araçta şema alanı yok, yalnız pencere + yasak sözcük denetimi (aynı regex'ler).
    expect(() => promptIddialari(mod.PROFILE_SYSTEM_PROMPT, [])).not.toThrow();
    const { token, uygun } = promptPenceresi(mod.PROFILE_SYSTEM_PROMPT);
    expect(uygun).toBe(true);
    expect(token).toBeLessThanOrEqual(PROMPT_PENCERESI.max - 60);
    // Tabanın `dil_kurali` sert hatasının kaynağı şablon yönlendirmesiydi ("Terapist için…"): büyük harfli biçim dahil yok.
    expect(mod.PROFILE_SYSTEM_PROMPT).not.toMatch(/Terapist/);
    expect(mod.PROFILE_SYSTEM_PROMPT).not.toMatch(/Ebeveyn/);
  });

  it("bölümler A1 sırasında: rol → klinik çerçeve → özgüllük → karşıt örnek → biçim → öz-denetim → ortak son blok", () => {
    const p = mod.PROFILE_SYSTEM_PROMPT;
    const sira = ["ROL\n", "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK KURALLARI", "ZAYIF ÖRNEK", "İYİ ÖRNEK", "BİÇİM\n", "Alan bütçeleri:", "ÖZ-DENETİM", ETIK_SINIR].map((k) => p.indexOf(k));
    expect(sira.every((i) => i >= 0)).toBe(true);
    expect([...sira].sort((a, b) => a - b)).toEqual(sira);
  });

  it("on başlık satırı şablonda AYNEN ve sırasında, her biri bir kez; başka ##/### satırı yok (eval tripwire: 9 başlık)", () => {
    const p = mod.PROFILE_SYSTEM_PROMPT;
    const konum = BASLIKLAR.map((b) => p.indexOf(`\n${b}\n`));
    expect(konum.every((i) => i >= 0), BASLIKLAR.filter((_, i) => konum[i]! < 0).join(" | ")).toBe(true);
    expect([...konum].sort((a, b) => a - b)).toEqual(konum);
    for (const b of BASLIKLAR) expect(say(p, `\n${b}\n`), b).toBe(1);
    expect(satirlar(p, /^#{2,3}\s/)).toHaveLength(9);
    expect(satirlar(p, /^---\s*$/)).toHaveLength(1);
  });

  it("PROFIL_BOLUMLERI başlıkları (bağlam katmanının ayrıştırdığı iki bölüm) şablonda birebir '### ' başlık olarak var", () => {
    for (const b of PROFIL_BOLUMLERI) expect(mod.PROFILE_SYSTEM_PROMPT, b).toContain(`\n### ${b}\n`);
  });

  it("rol: uzman okur; iki bölüm sonraki araçlara bağlam olur; terim serbest ama 'öğrenci/uzman' geçerli; aile bölümü günlük dil", () => {
    const rol = bolum(mod.PROFILE_SYSTEM_PROMPT, "ROL\n", "KLİNİK ÇERÇEVE");
    expect(rol).toMatch(/uzman/i);
    expect(rol).toMatch(/sonraki .*araç/);
    expect(rol).toMatch(/terim serbest/);
    expect(rol).toContain('"öğrenci/uzman"');
    expect(rol).not.toMatch(/mesleki dil/);
    expect(rol).toMatch(/Aile ile Paylaşılabilecek Öneriler/);
    expect(rol).toMatch(/günlük/);
  });

  it("klinik çerçeve: tanı verilenle sınırlı (koyma/atfetme yok), normatif yaş beklentisi, yetişkinde çocuk gelişimi yazılmaz + eş/yakın, ölçülebilir 3–5 alan, kanıt temelli uyarlı teknik, evde yapılabilir aile önerisi", () => {
    const k = bolum(mod.PROFILE_SYSTEM_PROMPT, "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK KURALLARI");
    expect(k).toMatch(/verilen tanı/);
    expect(k).toMatch(/güncel/);
    expect(k).toMatch(/[Yy]eni (bir )?tanı/);
    expect(k).toMatch(/normatif/);
    expect(k).toMatch(/18 yaş/);
    expect(k).toMatch(/çocuk gelişimi/);
    // Olumsuz emir yerine edilgen kural (ad öbeği gibi okunmaz).
    expect(k).toMatch(/yazılmaz/);
    expect(k).toMatch(/eş/);
    expect(k).toMatch(/yakın/);
    expect(k).toMatch(/3–5 madde/);
    // Ölçülebilirlik tanımı: mevcut düzey → hedef → ölçüt.
    expect(k).toMatch(/ÖLÇÜLEBİLİR|ölçülebilir/);
    expect(k).toMatch(/ölçüt/);
    expect(k).toMatch(/kanıt temelli/);
    expect(k).toMatch(/NASIL/);
    expect(k).toMatch(/evde/);
    // Modül yokken dürüst kısa yanıt; modül adı uydurulmaz.
    expect(k).toMatch(/atanmamış/);
  });

  it("özgüllük: ortak dört kural bir kez ve önde; araca özgü ekler arkada (son çalışmalar/hedefler → modül + öncelikli alan; ilgi alanı 'Uzman notları' içinde; yalnız bloktaki veri)", () => {
    const p = mod.PROFILE_SYSTEM_PROMPT;
    expect(say(p, "profildeki en az bir somut veriye")).toBe(1);
    expect(say(p, "İlgi alanı verilmişse")).toBe(1);
    expect(say(p, "Geçmiş çalışmalar verilmişse")).toBe(1);
    const o = bolum(p, "ÖZGÜLLÜK KURALLARI", "ZAYIF ÖRNEK");
    expect(o.indexOf("profildeki en az bir somut veriye")).toBeLessThan(o.indexOf("Son çalışmalar"));
    expect(o).toMatch(/Son çalışmalar/);
    expect(o).toMatch(/Sürmekte olan hedefler/);
    expect(o).toMatch(/Müfredat Modülleriyle İlişki/);
    expect(o).toMatch(/Öncelikli Çalışma Alanları/);
    expect(o).toMatch(/Uzman notları/);
    expect(o).toMatch(/bayılıyor/);
    expect(o).toMatch(/değerlendirilmeli/);
  });

  it("karşıt örnek: zayıf = jenerik ('dil gelişimini desteklemek'); iyi = iki sözcükten üç sözcüğe genişletme, uzman notuna bağlı, ölçüt taşır", () => {
    const p = mod.PROFILE_SYSTEM_PROMPT;
    const zayif = p.slice(p.indexOf("ZAYIF ÖRNEK"), p.indexOf("İYİ ÖRNEK"));
    const iyi = p.slice(p.indexOf("İYİ ÖRNEK"), p.indexOf("BİÇİM\n"));
    expect(zayif).toContain("dil gelişimini desteklemek");
    expect(iyi).toContain("'su ver'");
    expect(iyi).toContain("'bana su ver'");
    expect(iyi).toMatch(/genişletme/);
    expect(iyi).toMatch(/uzman notundaki/);
    expect(iyi).toMatch(/ölçüt/);
  });

  it("biçim: SADECE şablon, başka başlık/önsöz yok; köşeli parantezli bütçeler ([3–5 cümle], [3–5 madde, her madde ölçülebilir]); bütçe satırları düzyazı/madde biçimini söyler", () => {
    const b = bolum(mod.PROFILE_SYSTEM_PROMPT, "BİÇİM\n", "ÖZ-DENETİM");
    expect(b).toMatch(/SADECE/);
    expect(b).toMatch(/Markdown/);
    expect(b).toMatch(/AYNEN/);
    expect(say(b, "[3–5 cümle")).toBeGreaterThanOrEqual(3);
    expect(b).toContain("[3–5 madde, her madde ölçülebilir");
    expect(say(b, "[3–5 madde")).toBeGreaterThanOrEqual(4);
    // Her başlığın hemen altında köşeli parantezli bütçe (ayraç ve iki ana başlık hariç).
    for (const h of BASLIKLAR.filter((x) => x.startsWith("### "))) {
      const i = b.indexOf(`${h}\n`);
      expect(b.slice(i + h.length + 1).startsWith("["), h).toBe(true);
    }
    const butce = b.slice(b.indexOf("Alan bütçeleri:"));
    // İlk üç bölüm düzyazı (madde yok: eval cümle sayar); uzman bölümleri üst düzey madde, alt madde yok.
    expect(butce).toMatch(/düzyazı/);
    expect(butce).toMatch(/alt madde yok/);
    expect(butce).toMatch(/Öncelikli Çalışma Alanları[^\n]*≤ 2 cümle/);
    expect(butce).toMatch(/Etkili Yaklaşım ve Teknikler[^\n]*≤ 3 cümle/);
  });

  it("öz-denetim 4–6 numaralı madde, tek kutuplu ('… mı?'): on başlık, bloktaki veri, yetişkin, ölçüt, tırnaklı 'hasta/terapist', bütçe", () => {
    const oz = bolum(mod.PROFILE_SYSTEM_PROMPT, "ÖZ-DENETİM", ETIK_SINIR);
    const maddeler = oz.split("\n").filter((l) => /^\d\. /.test(l));
    expect(maddeler.length).toBeGreaterThanOrEqual(4);
    expect(maddeler.length).toBeLessThanOrEqual(6);
    for (const m of maddeler) expect(m, m).toMatch(/m[ıiuü]\?$/);
    expect(oz).toMatch(/[Oo]n başlık/);
    expect(oz).toMatch(/blok/);
    expect(oz).toMatch(/18/);
    expect(oz).toMatch(/ölçüt/);
    expect(oz).toContain('"hasta/terapist"');
    expect(oz).toMatch(/bütçe/i);
    expect(oz).toContain("listeyi çıktıya YAZMA");
  });
});

describe("buildProfileUserPrompt", () => {
  const kur = (age: number | null = 6, workArea = "language", studentBlock = blok) => mod.buildProfileUserPrompt({ age, workArea, studentBlock });

  it("sıra: ÖĞRENCİ bloğu → PARAMETRELER → Odak → Son hatırlatma; eski 'Öğrenci adı:' / 'Yaşı:' satırları yok", () => {
    const p = kur();
    expect(p.startsWith(`ÖĞRENCİ\n${blok}\n\nPARAMETRELER\n`)).toBe(true);
    expect(p.indexOf("PARAMETRELER")).toBeLessThan(p.indexOf("Odak:"));
    expect(p.indexOf("Odak:")).toBeLessThan(p.indexOf("Son hatırlatma:"));
    expect(p).not.toContain("Öğrenci adı:");
    expect(p).not.toMatch(/^Yaşı:/m);
    expect(p).not.toContain("Seçili müfredat modülleri");
    expect(p).not.toContain("Ek notlar");
  });

  it("rumuz koşturucunun deseniyle okunur (bloğun kimlik satırı)", () => {
    expect(RUMUZ.exec(kur())?.[1]).toBe("Nisa");
  });

  it("parametreler: 'Profil üret' her zaman; çocukta yetişkin satırı yok", () => {
    const p = kur();
    expect(p).toContain("PARAMETRELER\n- Profil üret");
    expect(p).not.toMatch(/yetişkin/i);
  });

  it("odak koddan: 'Yaş 6, Dil → …' (etiket WORK_AREA_LABEL'dan); tek satır, hemen hatırlatmadan önce", () => {
    const p = kur();
    const odak = p.split("\n").find((l) => l.startsWith("Odak: "))!;
    expect(odak).toBe(`Odak: ${mod.odakSatiri(6, "language")}`);
    expect(odak).toMatch(/^Odak: Yaş 6, Dil → yaş grubu beklentileri bu yaşa göre\.$/);
    expect(p.indexOf(odak) + odak.length + 2).toBe(p.indexOf("Son hatırlatma:"));
    expect(mod.odakSatiri(8, "speech")).toMatch(/^Yaş 8, Konuşma → /);
    expect(mod.odakSatiri(5, "hearing")).toMatch(/^Yaş 5, İşitme → /);
  });

  it("yaş bilinmiyorsa odak yaş varsaymaz: bloktaki düzeye göre", () => {
    const odak = kur(null).split("\n").find((l) => l.startsWith("Odak: "))!;
    expect(odak).toMatch(/^Odak: Yaş bilinmiyor, Dil → /);
    expect(odak).toMatch(/bloktaki düzey/);
    expect(odak).not.toMatch(/\d/);
  });

  it("iki hatırlatma sonda tek satırda: başlıklar aynen + uydurma yok (anlamsal çapa)", () => {
    const son = kur().slice(kur().indexOf("Son hatırlatma: "));
    expect(son).not.toContain("\n");
    expect(son).toMatch(/[Bb]aşlıklar/);
    expect(son).toMatch(/aynen/);
    expect(son).toMatch(/Uydurma yok/);
    expect(son).toBe(`Son hatırlatma: ${mod.HATIRLATMA.join(" ")}`);
  });

  it("yetişkin (≥ 18) KODDA koşullu: ek parametre satırı — yaş bölümü yetişkine göre, aile bölümünde eş/yakın + iş; 17'de yok", () => {
    expect(mod.YETISKIN_YASI).toBe(18);
    const p = kur(34, "speech", yetiskinBlok);
    const param = bolum(p, "PARAMETRELER\n", "Odak:");
    expect(param).toContain("- Profil üret");
    expect(param).toMatch(/[Yy]etişkin/);
    expect(param).toMatch(/34/);
    expect(param).toMatch(/çocuk gelişimi/);
    expect(param).toMatch(/eş/);
    expect(param).toMatch(/yakın/);
    expect(param).toMatch(/iş/);
    expect(p).toMatch(/^Odak: Yaş 34, Konuşma → /m);
    expect(bolum(kur(18, "speech", yetiskinBlok), "PARAMETRELER\n", "Odak:")).toMatch(/[Yy]etişkin/);
    expect(bolum(kur(17, "speech", yetiskinBlok), "PARAMETRELER\n", "Odak:")).not.toMatch(/[Yy]etişkin/);
    expect(bolum(kur(null, "speech", yetiskinBlok), "PARAMETRELER\n", "Odak:")).not.toMatch(/[Yy]etişkin/);
  });

  it("boş blokta ÖĞRENCİ başlığı yok; parametreler, odak ve hatırlatma yine var", () => {
    const p = kur(6, "language", "");
    expect(p).not.toContain("ÖĞRENCİ");
    expect(p.startsWith("PARAMETRELER\n")).toBe(true);
    expect(p).toContain("Odak: Yaş 6, Dil");
    expect(p).toContain("Son hatırlatma:");
  });
});
