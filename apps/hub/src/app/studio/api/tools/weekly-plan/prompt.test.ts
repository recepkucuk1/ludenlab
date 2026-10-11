// apps/hub/src/app/studio/api/tools/weekly-plan/prompt.test.ts
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ETIK_SINIR } from "@/lib/prompts/ortakBloklar";
import { promptIddialari, promptPenceresi, PROMPT_PENCERESI } from "@studio/lib/prompts/iskelet";

/**
 * Haftalık plan A1 prompt sözleşmesi (Faz 2 / Task 7). Model çıktısı birim testte ölçülemez; burada kilitlenen
 * şey MODELE GİDEN METİNDİR: sistem prompt'u pencerede ve A1 sırasında, şema alan adları aynen (istemci ve PDF
 * değişmez), 2026-09 yalın şema kuralları (tek cümle, ≤ 3 adım, ≤ 3 materyal, ≤ 2 hedef, notes null, gün/tarih/
 * süre yazılmaz) bütçe olarak yerinde; klinik çerçeve progresyon + geçmişe bağlantı + dakika dökümü; kullanıcı
 * prompt'unda ortak öğrenci bloğu önce, odak satırı (ders sayısı × süre → dakika bölünmesi) koddan türetilmiş,
 * iki hatırlatma sonda; yetişkin öğrencide muhatap satırı KODDAN gelir.
 *
 * Rota `createToolHandler`'ı kurulumda çağırır ve kapı DB/oturum modüllerini çeker; taklit yalnız config'i
 * yakalar (weeklyPlanLean.test.ts deseni). Böylece dışa aktarılan prompt'un rotaya BAĞLANDIĞI da doğrulanır.
 * Sunucu dolgusu (`enrichContent`) ve tavan sözleşmesi `weeklyPlanLean.test.ts`'tedir; burada yinelenmez.
 */
type Duration = "20" | "30" | "40" | "45" | "60";
type Body = {
  studentId: string;
  weekStart: string;
  sessionsPerWeek: number;
  sessionDuration: Duration;
  focusAreas: string[];
  planApproach: "ai" | "guided";
  daySchedule: { dayName: string; lessonCount: number }[];
  extraNote?: string;
};
type Config = {
  systemPrompt: string;
  toolType: string;
  responseKey: string;
  cost: number;
  maxTokens?: number;
  fallbackTitle?: unknown;
  buildUserPrompt: unknown;
};
const captured = vi.hoisted(() => ({ config: null as Config | null }));

vi.mock("@studio/lib/toolHandler", () => ({
  createToolHandler: (config: Config) => {
    captured.config = config;
    return async () => new Response(null);
  },
}));

type Rota = typeof import("./route");
let rota: Rota;
beforeAll(async () => {
  rota = await import("./route");
});

/** Bugünkü şema alan adları — istemci (`WeeklyPlanTool`) ve PDF bunları okur; A4: değişmez. */
const ALANLAR = [
  "title", "studentSummary", "days", "focusArea", "objective", "warmup", "activity", "duration", "materials",
  "mainWork", "steps", "targetGoals", "closing", "notes", "weeklyGoal", "materialsNeeded", "parentCommunication",
  "expertNotes", "nextWeekSuggestion",
];
const SURELER: Duration[] = ["20", "30", "40", "45", "60"];

const govde: Body = {
  studentId: "s1",
  weekStart: "2026-10-12",
  sessionsPerWeek: 3,
  sessionDuration: "40",
  focusAreas: ["Üç kelimeli istek cümlesi", "Sıra alma"],
  planApproach: "ai",
  daySchedule: [
    { dayName: "Pazartesi", lessonCount: 2 },
    { dayName: "Çarşamba", lessonCount: 1 },
  ],
};
const blok = [
  "Öğrenci: Hazal, 6 yaş",
  "Çalışma alanı: Dil",
  "Uzman notları: Dinozorlara ve trenlere bayılıyor. Görsel sıralama kartlarıyla geçişleri iyi kaldırıyor.",
  "Son oturum (01.10.2026): Üç kelimeli istek cümlesini modelle %60 üretti. Sonraki plan: Üç kelimeli cümleyi oyun içinde bağımsız üretime taşı.",
  "Sürmekte olan hedefler: Üç sözcüklü istek cümlesi, Sıra alma oyunları",
].join("\n");
const scrubText = (t: string | null | undefined) => (t ?? "").replace(/Hazal Yılmaz/g, "Hazal");
const ctx = { therapistId: "t1", scrubText, studentBlock: blok };
/** Doğum yılı → kapıdaki `calcAgeYears` ile aynı yaklaşım (yıl farkı). */
const dogum = (yas: number) => new Date(`${new Date().getFullYear() - yas}-06-15`);
const cocuk = { birthDate: dogum(6) };
const yetiskin = { birthDate: dogum(34) };
const kur = (d: Partial<Body> = {}, studentBlock = blok, student: { birthDate: Date | null } | null = cocuk, ageText = "6 yaşında") =>
  rota.buildUserPrompt({ ...govde, ...d }, student, ageText, { ...ctx, studentBlock });

/** Koşturucunun rumuz deseni (`evals/lib/runner.ts`) AYNEN: bloğun tiresiz `Öğrenci: <rumuz>, N yaş` satırı. */
const RUMUZ_DESENI = /(?:- (?:Ad|Öğrenci|İsim)|Öğrenci adı): ([^,\n]+)|^Öğrenci: ([^,\n]+)(?:, \d+ yaş)?$(?=\nÇalışma alanı: )/m;

/** `baslik` ile `sonraki` başlık arasındaki bölüm metni (iskeletin A1 başlıkları). */
function bolum(p: string, baslik: string, sonraki: string): string {
  const a = p.indexOf(baslik);
  const b = p.indexOf(sonraki, a + 1);
  expect(a, baslik).toBeGreaterThanOrEqual(0);
  expect(b, sonraki).toBeGreaterThan(a);
  return p.slice(a, b);
}
const say = (p: string, parca: string) => p.split(parca).length - 1;
/** Eval `countSentences` ile aynı ayraç: noktalama + boşluk + büyük harf/rakam/tırnak. */
const cumleSayisi = (s: string) => s.trim().split(/(?<=[.!?…][)"”’]*)\s+(?=[\p{Lu}\p{N}"“‘'(%])/u).filter((x) => x.split(/\s+/).length >= 2).length;

describe("SYSTEM_PROMPT (A1)", () => {
  it("pencere 1200–2000 token ve tavana ≥ 60 token pay; 19 şema alanı aynen; yasak sözcük yok; rota bu metni gönderir", () => {
    expect(() => promptIddialari(rota.SYSTEM_PROMPT, ALANLAR)).not.toThrow();
    const { token, uygun } = promptPenceresi(rota.SYSTEM_PROMPT);
    expect(uygun).toBe(true);
    expect(token).toBeLessThanOrEqual(PROMPT_PENCERESI.max - 60);
    expect(captured.config?.systemPrompt).toBe(rota.SYSTEM_PROMPT);
  });

  it("bölümler A1 sırasında: rol → klinik çerçeve → özgüllük → karşıt örnek → biçim → öz-denetim → ortak son blok", () => {
    const p = rota.SYSTEM_PROMPT;
    const sira = ["ROL\n", "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK KURALLARI", "ZAYIF ÖRNEK", "İYİ ÖRNEK", "BİÇİM\n", "Alan bütçeleri:", "ÖZ-DENETİM", ETIK_SINIR].map((k) => p.indexOf(k));
    expect(sira.every((i) => i >= 0)).toBe(true);
    expect([...sira].sort((a, b) => a - b)).toEqual(sira);
  });

  it("rol: üreten ve okuyan uzman, ders sırasında göz atar → yalın tek cümle; parentCommunication veliye (18+ öğrencide kendisi/yakını); terim serbest ama 'öğrenci/uzman' geçerli", () => {
    const rol = bolum(rota.SYSTEM_PROMPT, "ROL\n", "KLİNİK ÇERÇEVE");
    expect(rol).toMatch(/uzman/i);
    expect(rol).toMatch(/ders sırasında/);
    expect(rol).toMatch(/göz at/);
    expect(rol).toMatch(/tek cümle/);
    expect(rol).toContain("parentCommunication");
    expect(rol).toMatch(/veli/i);
    expect(rol).toMatch(/18 yaş/);
    expect(rol).toMatch(/[Tt]erim serbest/);
    expect(rol).toContain('"öğrenci/uzman"');
    expect(rol).not.toMatch(/mesleki dil/);
  });

  it("klinik çerçeve: progresyon zinciri, tekrar yok + dönüşümlü odak, ilk ders = Sonraki plan, hedef/modül eşlemesi, dakika toplamı = ders süresi, yaş/not → biçim", () => {
    const k = bolum(rota.SYSTEM_PROMPT, "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK KURALLARI");
    // Progresyon: ders N+1 ders N'in üzerine; ipucu azaltma → bağımsız → genelleme.
    expect(k).toMatch(/N\+1/);
    expect(k).toMatch(/ipucu azalt/i);
    expect(k).toMatch(/bağımsız/);
    expect(k).toMatch(/genelleme/i);
    // Aynı etkinlik iki kez yok; focusAreas dönüşümlü; her odak alanı bir dersin focusArea'sında aynen.
    expect(k).toMatch(/Aynı etkinlik/);
    expect(k).toMatch(/DÖNÜŞÜMLÜ/);
    expect(k).toContain("focusArea");
    // Bloktaki etiketlere adıyla atıf (Task 2: bu alanlar artık bloktan gelir).
    expect(k).toContain('"Sonraki plan');
    expect(k).toMatch(/İLK ders/);
    expect(k).toContain('"Son çalışmalar"');
    expect(k).toContain('"Tamamlanan hedefler"');
    expect(k).toContain('"Sürmekte olan hedefler"');
    expect(k).toContain("targetGoals");
    expect(k).toContain('"Modüller"');
    // Dakika dökümü: üç blok toplamı ders süresi; örnek 40 → 5/30/5; her blokta yazılır.
    expect(k).toMatch(/EŞİT/);
    expect(k).toContain("40 dk → 5/30/5");
    expect(k).toMatch(/her blokta yazılır/);
    // Yaş/uzman notu etkinlik biçimini belirler; yetişkinde oyun yazılmaz.
    expect(k).toMatch(/kısa.*blok/i);
    expect(k).toMatch(/yetişkin/i);
  });

  it("özgüllük: ortak dört kural bir kez ve önde; araca özgü ekler arkada (ilgi alanı 'Uzman notları'nda, studentSummary bloğun özeti, materialsNeeded birleşim ≤ 6, parentCommunication tek şey, 18+ muhatap, ek not)", () => {
    const p = rota.SYSTEM_PROMPT;
    expect(say(p, "profildeki en az bir somut veriye")).toBe(1);
    expect(say(p, "İlgi alanı verilmişse")).toBe(1);
    expect(say(p, "Geçmiş çalışmalar verilmişse")).toBe(1);
    const o = bolum(p, "ÖZGÜLLÜK KURALLARI", "ZAYIF ÖRNEK");
    expect(o.indexOf("profildeki en az bir somut veriye")).toBeLessThan(o.indexOf("studentSummary"));
    expect(o).toMatch(/"Uzman notları"/);
    expect(o).toMatch(/bayılıyor/);
    expect(o).toMatch(/uydurulmaz|uydurma/);
    expect(o).toMatch(/studentSummary[^\n]*blo[ğk]/);
    expect(o).toMatch(/materialsNeeded[^\n]*≤ 6/);
    expect(o).toMatch(/materialsNeeded[^\n]*BİRLEŞİM/);
    expect(o).toMatch(/parentCommunication[^\n]*TEK/);
    expect(o).toMatch(/18 yaş/);
    expect(o).toContain('"veli');
    expect(o).toMatch(/yakını/);
    expect(o).toMatch(/Ek not/);
    // Olumsuz emirler ad öbeği gibi okunmasın: "yazılmaz" biçimi.
    expect(o).toMatch(/yazılmaz/);
  });

  it("karşıt örnek: zayıf = jenerik ('çeşitli materyallerle'); iyi = hedef ses + kart sayısı + ipucu azaltma (model → bağımsız) + ilgi alanı, TEK cümle, yasak sözcük yok", () => {
    const p = rota.SYSTEM_PROMPT;
    const zayif = p.slice(p.indexOf("ZAYIF ÖRNEK"), p.indexOf("İYİ ÖRNEK"));
    const iyi = p.slice(p.indexOf("İYİ ÖRNEK"), p.indexOf("BİÇİM\n"));
    expect(zayif).toContain("çeşitli materyallerle");
    expect(iyi).toContain("/s/");
    expect(iyi).toMatch(/10 kart/);
    expect(iyi).toMatch(/uzman modeli/);
    expect(iyi).toMatch(/bağımsız/);
    expect(iyi).toMatch(/ilgi alanı/);
    // İyi örnek prompt'un kendi kuralına uyar: ana çalışma TEK cümle (eval `countSentences` ayracıyla).
    const metin = iyi.slice(iyi.indexOf("Ana çalışma:")).trim();
    expect(cumleSayisi(metin)).toBe(1);
    // Ödül / süre yazma / gün yok: örnek yalın şema kurallarını da örnekler.
    expect(iyi).not.toMatch(/ödül|puan|çıkartma/i);
  });

  it("biçim: tek parça JSON; şema örneği yalın kurallara uyar (≤ 3 adım, ≤ 3 materyal, ≤ 2 ısınma materyali, ≤ 2 hedef, notes null, gün/tarih/süre yok); alan bütçeleri her alan için, ders başına kelime bütçesi yazılı", () => {
    const b = bolum(rota.SYSTEM_PROMPT, "BİÇİM\n", "ÖZ-DENETİM");
    expect(b).toMatch(/SADECE/);
    expect(b).toMatch(/JSON/);
    const semaMetni = b.slice(b.indexOf("{"), b.lastIndexOf("}", b.indexOf("Alan bütçeleri:")) + 1);
    const sema = JSON.parse(semaMetni) as {
      days: Array<{ warmup: { materials: string[] }; mainWork: { steps: string[]; materials: string[]; targetGoals: string[] }; notes: unknown }>;
    };
    expect(Object.keys(sema)).toEqual(["title", "studentSummary", "days", "weeklyGoal", "materialsNeeded", "parentCommunication", "expertNotes", "nextWeekSuggestion"]);
    const [gun] = sema.days;
    expect(Object.keys(gun!)).toEqual(["focusArea", "objective", "warmup", "mainWork", "closing", "notes"]);
    expect(gun!.mainWork.steps.length).toBeLessThanOrEqual(3);
    expect(gun!.mainWork.materials.length).toBeLessThanOrEqual(3);
    expect(gun!.warmup.materials.length).toBeLessThanOrEqual(2);
    expect(gun!.mainWork.targetGoals.length).toBeLessThanOrEqual(2);
    expect(gun!.notes).toBeNull();

    const butce = b.slice(b.indexOf("Alan bütçeleri:"));
    for (const alan of ["title", "studentSummary", "focusArea", "objective", "warmup", "mainWork", "steps", "materials", "targetGoals", "closing", "notes", "weeklyGoal", "materialsNeeded", "parentCommunication", "expertNotes", "nextWeekSuggestion"]) {
      expect(butce, alan).toContain(alan);
    }
    // Ders başına kelime bütçesi tabandan (ortalama ≈ 96 kelime/ders) türetilmiş sabit; prompt'ta aynen.
    expect(rota.DERS_KELIME_BUTCESI).toBeGreaterThanOrEqual(100);
    expect(rota.DERS_KELIME_BUTCESI).toBeLessThanOrEqual(115);
    expect(butce).toContain(`ders başına ≤ ${rota.DERS_KELIME_BUTCESI} kelime`);
    // Yalın şema kuralları (weeklyPlanLean.test.ts çıpaları + bütçe biçimi).
    expect(butce).toMatch(/en fazla 3 adım/);
    expect(butce).toMatch(/en fazla 3 materyal/);
    expect(butce).toMatch(/warmup[^\n]*en fazla 2 materyal/);
    expect(butce).toMatch(/targetGoals[^\n]*1–2/);
    expect(butce).toMatch(/notes[^\n]*null/);
    expect(butce).toMatch(/studentSummary[^\n]*1–2 cümle/);
    expect(butce).toMatch(/weeklyGoal[^\n]*tek cümle/);
    expect(butce).toMatch(/parentCommunication[^\n]*2–3 cümle/);
    expect(butce).toMatch(/expertNotes[^\n]*2–3 cümle/);
    expect(butce).toMatch(/nextWeekSuggestion[^\n]*tek cümle/);
    expect(butce).toMatch(/materialsNeeded[^\n]*6/);
    expect(butce).toMatch(/duration[^\n]*dakika/);
    expect(b).toMatch(/sunucu ekler/);
  });

  it("öz-denetim 4–6 numaralı madde: ders sayısı, dakika toplamı, tekrar/progresyon, Sonraki plan + Tamamlanan hedefler, ödül yok + tırnaklı 'hasta/terapist', JSON", () => {
    const oz = bolum(rota.SYSTEM_PROMPT, "ÖZ-DENETİM", ETIK_SINIR);
    const maddeler = oz.split("\n").filter((l) => /^\d\. /.test(l));
    expect(maddeler.length).toBeGreaterThanOrEqual(4);
    expect(maddeler.length).toBeLessThanOrEqual(6);
    expect(oz).toContain("days");
    expect(oz).toMatch(/ders sayısı/i);
    expect(oz).toMatch(/toplamı/);
    expect(oz).toMatch(/ders süresi/);
    expect(oz).toMatch(/tekrar/i);
    expect(oz).toMatch(/Sonraki plan/);
    expect(oz).toMatch(/Tamamlanan hedefler/);
    expect(oz).toMatch(/[Öö]dül/);
    expect(oz).toContain('"hasta/terapist"');
    expect(oz).toMatch(/JSON/);
    expect(oz).toContain("listeyi çıktıya YAZMA");
  });
});

describe("SURE_BOLUNMESI / odakSatiri (koddan türetilir)", () => {
  it.each(SURELER)("%s dk: ısınma/ana/kapanış toplamı ders süresine eşit, ana çalışma en büyük blok", (sure) => {
    const [isinma, ana, kapanis] = rota.SURE_BOLUNMESI[sure];
    expect(isinma + ana + kapanis).toBe(Number(sure));
    expect(ana).toBeGreaterThan(isinma);
    expect(ana).toBeGreaterThan(kapanis);
    expect(isinma).toBeGreaterThanOrEqual(3);
    expect(kapanis).toBeGreaterThanOrEqual(3);
  });

  it("şemanın tüm süre seçenekleri tabloda; klinik çerçevedeki örnek tabloyla aynı", () => {
    expect(Object.keys(rota.SURE_BOLUNMESI).sort()).toEqual([...SURELER].sort());
    expect(rota.SURE_BOLUNMESI["40"]).toEqual([5, 30, 5]);
  });

  it("odak satırı: ders sayısı × süre → days öğe sayısı, 1–2 hedef, ≤3 adım, dakikalar tablodan", () => {
    expect(rota.odakSatiri(3, "40")).toBe("3 ders × 40 dk → days tam 3 öğe; her derste 1–2 hedef, ≤3 adım; dakikalar 5/30/5.");
    const [i, a, k] = rota.SURE_BOLUNMESI["20"];
    expect(rota.odakSatiri(12, "20")).toBe(`12 ders × 20 dk → days tam 12 öğe; her derste 1–2 hedef, ≤3 adım; dakikalar ${i}/${a}/${k}.`);
  });
});

describe("yetiskinMi", () => {
  it("doğum tarihi varsa o belirler (18 sınır dahil); yoksa kapının yaş metni; ikisi de yoksa çocuk/veli", () => {
    expect(rota.yetiskinMi({ birthDate: dogum(17) }, "17 yaşında")).toBe(false);
    expect(rota.yetiskinMi({ birthDate: dogum(18) }, "18 yaşında")).toBe(true);
    expect(rota.yetiskinMi({ birthDate: dogum(34) }, "")).toBe(true);
    expect(rota.yetiskinMi({ birthDate: null }, "34 yaşında")).toBe(true);
    expect(rota.yetiskinMi({ birthDate: null }, "6 yaşında")).toBe(false);
    expect(rota.yetiskinMi(null, "")).toBe(false);
    expect(rota.yetiskinMi(null, "34 yaşında")).toBe(true);
    expect(rota.yetiskinMi({ birthDate: dogum(5) }, "34 yaşında")).toBe(false);
  });
});

describe("buildUserPrompt", () => {
  it("sıra: ÖĞRENCİ bloğu → PARAMETRELER → Odak → Son hatırlatma; eski 'Öğrenci bilgileri' / 'Haftalık plan parametreleri' yok", () => {
    const p = kur();
    expect(p.startsWith(`ÖĞRENCİ\n${blok}\n\nPARAMETRELER\n`)).toBe(true);
    expect(p.indexOf("PARAMETRELER")).toBeLessThan(p.indexOf("Odak:"));
    expect(p.indexOf("Odak:")).toBeLessThan(p.indexOf("Son hatırlatma:"));
    expect(p).not.toContain("Öğrenci bilgileri");
    expect(p).not.toContain("Haftalık plan parametreleri");
    expect(p).not.toContain("- Ad:");
  });

  it("rumuz koşturucunun deseniyle okunur (bloğun ilk satırı)", () => {
    const m = RUMUZ_DESENI.exec(kur());
    expect((m?.[1] ?? m?.[2])?.trim()).toBe("Hazal");
  });

  it("parametreler bugünkü etiketlerle: hafta aralığı, numaralı ders listesi (günde birden çok derste n. ders), süre, odak alanları, yaklaşım; ders sayısı cümlesi", () => {
    const p = kur();
    expect(p).toContain("- Hafta: 12 Ekim 2026 - 18 Ekim 2026");
    expect(p).toContain("- Dersler (days dizisi bu sırayı izlesin):\n  1. Pazartesi 12 Ekim 2026 (1. ders / günde 2 ders)\n  2. Pazartesi 12 Ekim 2026 (2. ders / günde 2 ders)\n  3. Çarşamba 14 Ekim 2026\n");
    expect(p).toContain("- Ders süresi: 40 dakika");
    expect(p).toContain("- Odak alanları: Üç kelimeli istek cümlesi, Sıra alma");
    expect(p).toContain("- Planlama yaklaşımı: Öğrenci profiline ve geçmişe göre AI otomatik önersin");
    expect(kur({ planApproach: "guided" })).toContain("- Planlama yaklaşımı: Seçilen odak alanlarına göre yönlendirilmiş plan");
    // Sayı cümlesi kalır (kontroller ders sayısına dayanır); PARAMETRELER içinde, odaktan önce.
    expect(p).toMatch(/days dizisi tam olarak 3 ders içersin/);
    expect(p.indexOf("tam olarak 3 ders")).toBeLessThan(p.indexOf("Odak:"));
  });

  it("ek not yalnız verilmişse ve ctx.scrubText'ten geçer (gerçek ad rumuza döner)", () => {
    expect(kur()).not.toContain("Ek not");
    const p = kur({ extraNote: "Hazal Yılmaz ikinci derste yoruluyor; oyun ağırlıklı tut." });
    expect(p).toContain("- Ek notlar: Hazal ikinci derste yoruluyor; oyun ağırlıklı tut.");
    expect(p).not.toContain("Hazal Yılmaz");
  });

  it.each(SURELER)("odak: süre %s dk → dakika bölünmesi tablodan, ders sayısı takvimden", (sure) => {
    const [i, a, k] = rota.SURE_BOLUNMESI[sure];
    const p = kur({ sessionDuration: sure });
    const odak = p.split("\n").find((l) => l.startsWith("Odak: "))!;
    expect(odak).toBe(`Odak: 3 ders × ${sure} dk → days tam 3 öğe; her derste 1–2 hedef, ≤3 adım; dakikalar ${i}/${a}/${k}.`);
    expect(odak).toBe(`Odak: ${rota.odakSatiri(3, sure)}`);
  });

  it("12 derslik takvimde odak ve ders listesi 12 öğe", () => {
    const takvim = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"].map((dayName) => ({ dayName, lessonCount: 2 }));
    const p = kur({ daySchedule: takvim, sessionsPerWeek: 12, sessionDuration: "30" });
    expect(p.match(/^ {2}\d+\. /gm)).toHaveLength(12);
    expect(p).toContain("Odak: 12 ders × 30 dk → days tam 12 öğe;");
    expect(p).toContain("  12. Cumartesi 17 Ekim 2026 (2. ders / günde 2 ders)");
    expect(p).toMatch(/tam olarak 12 ders içersin/);
  });

  it("odak satırı tek satırdır ve hemen hatırlatmadan önce gelir", () => {
    const p = kur();
    const odak = p.split("\n").find((l) => l.startsWith("Odak: "))!;
    expect(p.indexOf(odak) + odak.length + 2).toBe(p.indexOf("Son hatırlatma:"));
  });

  it("iki hatırlatma sonda tek satırda: gün/tarih/süre yazma + her ders öncekinin üzerine, tekrar yok", () => {
    const p = kur();
    expect(rota.HATIRLATMA).toHaveLength(2);
    expect(rota.HATIRLATMA[0]).toMatch(/Gün\/tarih\/süre/);
    expect(rota.HATIRLATMA[0]).toMatch(/yazma/);
    expect(rota.HATIRLATMA[1]).toMatch(/öncekinin üzerine/);
    expect(rota.HATIRLATMA[1]).toMatch(/tekrar yok/);
    expect(p.endsWith(`Son hatırlatma: ${rota.HATIRLATMA.join(" ")}`)).toBe(true);
  });

  it("yetişkin öğrencide (doğum tarihinden ya da yaş metninden) muhatap satırı KODDAN eklenir; çocukta yok", () => {
    expect(kur()).not.toContain("Muhatap");
    const p = kur({}, blok, yetiskin, "34 yaşında");
    const satir = p.split("\n").find((l) => l.startsWith("- Muhatap:"))!;
    expect(satir).toBeDefined();
    expect(satir).toMatch(/yetişkin/);
    expect(satir).toContain("parentCommunication");
    expect(satir).toMatch(/kendisi/);
    expect(satir).toMatch(/yakını/);
    expect(satir).toContain('"veli');
    expect(p.indexOf("- Muhatap:")).toBeLessThan(p.indexOf("Odak:"));
    // Öğrenci nesnesi yoksa yaş metni belirler.
    expect(kur({}, blok, null, "34 yaşında")).toContain("- Muhatap:");
    expect(kur({}, blok, null, "6 yaşında")).not.toContain("Muhatap");
  });

  it("boş blokta ÖĞRENCİ başlığı yok; parametreler, odak ve hatırlatma yine var", () => {
    const p = kur({}, "");
    expect(p).not.toContain("ÖĞRENCİ");
    expect(p.startsWith("PARAMETRELER\n")).toBe(true);
    expect(p).toContain("Odak: 3 ders × 40 dk");
    expect(p).toContain("Son hatırlatma:");
    expect(kur({}, "  \n ")).not.toContain("ÖĞRENCİ");
  });
});

describe("rota sözleşmesi (A4: değişmeyenler)", () => {
  it("rota dışa aktarılan buildUserPrompt'u kullanır; toolType/responseKey/cost/maxTokens/fallbackTitle aynı", () => {
    expect(captured.config?.buildUserPrompt).toBe(rota.buildUserPrompt);
    expect(captured.config).toMatchObject({ toolType: "WEEKLY_PLAN", responseKey: "plan", cost: 1, maxTokens: 10000, fallbackTitle: "Haftalık Çalışma Planı" });
  });
});
