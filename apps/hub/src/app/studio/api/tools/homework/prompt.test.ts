// apps/hub/src/app/studio/api/tools/homework/prompt.test.ts
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ETIK_SINIR } from "@/lib/prompts/ortakBloklar";
import { promptIddialari, promptPenceresi } from "@studio/lib/prompts/iskelet";

/**
 * Ev ödevi A1 prompt sözleşmesi (Faz 2 / Task 4, tur 2). Model çıktısı birim testte ölçülemez; burada
 * kilitlenen şey MODELE GİDEN METİNDİR: sistem prompt'u pencerede ve A1 sırasında, şema alan adları aynen
 * (istemci ve PDF değişmez), klinik çerçeve / özgüllük / karşıt örnek / öz-denetim maddeleri yerinde;
 * kullanıcı prompt'unda ortak öğrenci bloğu önce, odak satırı koddan doğru türetilmiş, iki hatırlatma sonda,
 * yetişkin öğrencide muhatap öğrencinin kendisi.
 *
 * Tur 1 hakem kaybı (hw-02 gözlem formu sığ, hw-04 yetişkine çocuk döngüsü + belirsiz süre) → tur 2:
 * döngü koşullu (çocuk/exercise+daily_activity; observation'da yok; yetişkinde kendi uygulaması), adım
 * dakikaları süreye eşit, gözlem maddesi NE / NE ZAMAN / NASIL NOT EDİLİR, yetişkin hatırlatması ve etiketi.
 *
 * Rota `createToolHandler`'ı kurulumda çağırır ve kapı DB/oturum modüllerini çeker; taklit yalnız config'i
 * yakalar (weeklyPlanLean.test.ts deseni). Böylece dışa aktarılan prompt'un rotaya BAĞLANDIĞI da doğrulanır.
 */
type Body = {
  studentId: string;
  targetArea: string;
  duration: "10" | "15" | "20";
  parentLevel: "basic" | "detailed";
  materialType: "exercise" | "observation" | "daily_activity";
  extraNote?: string;
};
type Config = {
  systemPrompt: string;
  toolType: string;
  responseKey: string;
  cost: number;
  buildUserPrompt: unknown;
  enrichContent: (content: Record<string, unknown>, body: Body) => void | Promise<void>;
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

/** Bugünkü şema alan adları — istemci (`HomeworkTool`) ve PDF bunları okur; A4: değişmez. */
const ALANLAR = [
  "title", "materialType", "duration", "targetArea", "introduction", "materials", "steps",
  "stepNumber", "instruction", "tip", "watchFor", "celebration", "frequency", "expertNotes", "adaptations",
];
const TURLER = ["exercise", "observation", "daily_activity"] as const;

const govde: Body = { studentId: "s1", targetArea: "/k/ sesini kelime başında üretme", duration: "10", parentLevel: "basic", materialType: "daily_activity" };
const blok = [
  "Öğrenci: Hazal, 4 yaş",
  "Çalışma alanı: Konuşma",
  "Uzman notları: Çok hareketli; masada 5 dakikadan uzun kalmıyor. Araba oyuncaklarıyla oynarken konuşkan.",
].join("\n");
const ctx = { therapistId: "t1", scrubText: (t: string | null | undefined) => t ?? "", studentBlock: blok };
/** Doğum yılı → kapıdaki `calcAgeYears` ile aynı yaklaşım (yıl farkı). */
const dogum = (yas: number) => new Date(`${new Date().getFullYear() - yas}-06-15`);
const cocuk = { birthDate: dogum(4) };
const yetiskin = { birthDate: dogum(34) };
const kur = (d: Partial<Body> = {}, studentBlock = blok, student: { birthDate: Date | null } | null = cocuk, ageText = "4 yaşında") =>
  rota.buildUserPrompt({ ...govde, ...d }, student, ageText, { ...ctx, studentBlock });

/** Koşturucunun rumuz deseni (`evals/lib/runner.ts`): bloğun tiresiz `Öğrenci: <rumuz>, N yaş` satırı da okunur. */
const RUMUZ = /(?:- (?:Ad|Öğrenci|İsim)|Öğrenci adı|^Öğrenci): ([^,\n]+)/m;

/** `baslik` ile `sonraki` başlık arasındaki bölüm metni (iskeletin A1 başlıkları). */
function bolum(p: string, baslik: string, sonraki: string): string {
  const a = p.indexOf(baslik);
  const b = p.indexOf(sonraki, a + 1);
  expect(a, baslik).toBeGreaterThanOrEqual(0);
  expect(b, sonraki).toBeGreaterThan(a);
  return p.slice(a, b);
}
const say = (p: string, parca: string) => p.split(parca).length - 1;

describe("SYSTEM_PROMPT (A1)", () => {
  it("pencere 1200–2000 token, 15 şema alanı aynen, yasak sözcük yok; rota bu metni gönderir", () => {
    expect(() => promptIddialari(rota.SYSTEM_PROMPT, ALANLAR)).not.toThrow();
    expect(promptPenceresi(rota.SYSTEM_PROMPT).uygun).toBe(true);
    expect(captured.config?.systemPrompt).toBe(rota.SYSTEM_PROMPT);
  });

  it("bölümler A1 sırasında: rol → klinik çerçeve → özgüllük → karşıt örnek → biçim → öz-denetim → ortak son blok", () => {
    const p = rota.SYSTEM_PROMPT;
    const sira = ["ROL\n", "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK KURALLARI", "ZAYIF ÖRNEK", "İYİ ÖRNEK", "BİÇİM\n", "Alan bütçeleri:", "ÖZ-DENETİM", ETIK_SINIR].map((k) => p.indexOf(k));
    expect(sira.every((i) => i >= 0)).toBe(true);
    expect([...sira].sort((a, b) => a - b)).toEqual(sira);
  });

  it("rol: üreten uzman, okuyan veli (18+ öğrencide kendisi); Temel düzeyde terim yok, Detaylı düzeyde parantezle açıklama; expertNotes uzmana, terim serbest ama 'öğrenci/uzman' geçerli", () => {
    const rol = bolum(rota.SYSTEM_PROMPT, "ROL\n", "KLİNİK ÇERÇEVE");
    expect(rol).toMatch(/uzman/i);
    expect(rol).toMatch(/veli/i);
    expect(rol).toMatch(/18 yaş/);
    expect(rol).toMatch(/Temel/);
    expect(rol).toMatch(/Detaylı/);
    expect(rol).toMatch(/parantez/i);
    expect(rol).toMatch(/öneri kipi/i);
    expect(rol).toContain("expertNotes");
    expect(rol).toMatch(/terim serbest/);
    expect(rol).toContain('"öğrenci/uzman"');
    expect(rol).not.toMatch(/mesleki dil/);
  });

  it("klinik çerçeve: genelleme (yeni beceri ÖĞRETMEYE kalkma), tek gözlenebilir hedef, KOŞULLU döngü, adım dakikaları, süre → adım, üç tür", () => {
    const k = bolum(rota.SYSTEM_PROMPT, "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK KURALLARI");
    expect(k).toMatch(/GENELLEME/);
    expect(k).toMatch(/ÖĞRETMEYE kalkma/);
    // `i` bayrağı Türkçe İ'yi katlamaz ("GÖZLENEBİLİR" ≠ /gözlenebilir/i): büyük harfli biçim aynen aranır.
    expect(k).toContain("GÖZLENEBİLİR");
    // Döngü yalnız çocukta exercise/daily_activity için; observation'da yok; yetişkinde kendi uygulaması.
    expect(k).toMatch(/Çocukta/);
    expect(k).toMatch(/MODEL OL/);
    expect(k).toMatch(/5 saniye/);
    expect(k).toMatch(/GENİŞLET/);
    expect(k).toMatch(/doğru model/i);
    expect(k).toMatch(/observation'da döngü yazılmaz/);
    expect(k).toMatch(/Yetişkinde/);
    expect(k).toMatch(/kaydı dinle/);
    expect(k).toMatch(/tek ölçüt/);
    // Süre tablosu bir kez (klinik çerçevede); adım dakikaları süreye eşit; observation'da süre gözlem penceresi.
    expect(k).toContain("10 dk → 3–4");
    expect(k).toContain("15 dk → 4–5");
    expect(k).toContain("20 dk → 5–6");
    expect(say(rota.SYSTEM_PROMPT, "10 dk → 3–4")).toBe(1);
    expect(k).toMatch(/\(N dk\)/);
    expect(k).toMatch(/toplamı = süre|toplamı süreye eşit/);
    expect(k).toMatch(/gözlem penceresi/);
    for (const t of TURLER) expect(k, t).toContain(`\n- ${t}: `);
    // Tür tanımlarının anlamsal çıpaları (metin aynen yankılanmaz).
    expect(k).toMatch(/NE \(davranış\)/);
    expect(k).toMatch(/NASIL NOT EDİLİR/);
    expect(k).toMatch(/izler ve yazar/);
    expect(k).toMatch(/rutin/);
  });

  it("özgüllük: ortak dört kural bir kez ve önde; araca özgü ekler arkada (hedef alan her adımda, uzman notu + ilgi alanı, yetişkin = öğrencinin KENDİSİ, öneri kipi + yasak liste)", () => {
    const p = rota.SYSTEM_PROMPT;
    // Ortak kurallar yalnız iskeletten gelir; araç bölümü onları yeniden yazmaz.
    expect(say(p, "profildeki en az bir somut veriye")).toBe(1);
    expect(say(p, "İlgi alanı verilmişse")).toBe(1);
    expect(say(p, "Geçmiş çalışmalar verilmişse")).toBe(1);
    const o = bolum(p, "ÖZGÜLLÜK KURALLARI", "ZAYIF ÖRNEK");
    expect(o.indexOf("profildeki en az bir somut veriye")).toBeLessThan(o.indexOf("targetArea"));
    expect(o).toContain("targetArea");
    expect(o).toMatch(/Uzman notları/);
    expect(o).toMatch(/bayılıyor/);
    expect(o).toMatch(/en az iki adıma/);
    expect(o).toMatch(/18 yaş/);
    expect(o).toMatch(/KENDİSİ/);
    expect(o).toContain('"siz" = öğrenci');
    expect(o).toMatch(/yakını/);
    expect(o).toMatch(/"veli"/);
    expect(o).toMatch(/bilirsiniz/);
    for (const yasak of ['"-malı/-meli"', '"gerekir"', '"gerekiyor"', '"lazım"', '"şart"', '"zorunda"']) expect(o, yasak).toContain(yasak);
  });

  it("karşıt örnek: zayıf = jenerik kalıp ('sabırlı olun'); iyi = rutin + hedef ses + 5 sn bekleme + GENİŞLETME yolu + doğru modelin tekrarı", () => {
    const p = rota.SYSTEM_PROMPT;
    const zayif = p.slice(p.indexOf("ZAYIF ÖRNEK"), p.indexOf("İYİ ÖRNEK"));
    const iyi = p.slice(p.indexOf("İYİ ÖRNEK"), p.indexOf("BİÇİM\n"));
    expect(zayif).toContain("sabırlı olun");
    expect(zayif).toContain("10 dakika");
    expect(iyi).toContain("Akşam yemeğinde");
    expect(iyi).toContain("kaşık");
    expect(iyi).toContain("5 saniye");
    expect(iyi).toContain("/k/");
    expect(iyi).toContain("'kaşık ver'");
    expect(iyi).toMatch(/genişletip/);
    expect(iyi).toMatch(/demezse/);
    expect(iyi).toMatch(/bir kez daha/);
    // Örnek öneri kipinde (eval `oneri_kipi`): emir kipli fiil yok.
    expect(iyi).not.toMatch(/\b(koyun|deyin|bekleyin|verin)\b/);
  });

  it("biçim: tek parça JSON; alan bütçeleri her alan için; steps: dakika öneki, toplam = süre, gözlem maddesi ≤ 3 cümle", () => {
    const b = bolum(rota.SYSTEM_PROMPT, "BİÇİM\n", "ÖZ-DENETİM");
    expect(b).toMatch(/SADECE/);
    expect(b).toMatch(/JSON/);
    const butce = b.slice(b.indexOf("Alan bütçeleri:"));
    for (const alan of ["title", "introduction", "materials", "steps", "instruction", "tip", "watchFor", "celebration", "frequency", "expertNotes", "adaptations"]) {
      expect(butce, alan).toContain(alan);
    }
    expect(butce).toMatch(/title[^\n]*bağlam \+ hedef davranış/);
    expect(butce).toMatch(/introduction[^\n]*≤ 3 cümle/);
    expect(butce).toMatch(/materials[^\n]*ilgi alanı[^\n]*\[\]/);
    const steps = butce.split("\n").find((l) => l.startsWith("- steps:"))!;
    expect(steps).toMatch(/\(N dk\)/);
    expect(steps).toMatch(/toplam/);
    expect(steps).toMatch(/instruction[^\n]*≤ 2 cümle/);
    expect(steps).toMatch(/observation'da[^\n]*≤ 3 cümle/);
    expect(steps).toMatch(/tip[^\n]*≤ 1 cümle/);
    expect(butce).toMatch(/watchFor[^\n]*≤ [34] cümle/);
    expect(butce).toMatch(/celebration[^\n]*≤ 2 cümle/);
    expect(butce).toMatch(/expertNotes[^\n]*≤ [34] cümle/);
    expect(butce).toMatch(/adaptations[^\n]*Kolay[^\n]*Zor/);
  });

  it("öz-denetim 4–6 numaralı madde: süre/dakika, hedef alan, öneri kipi + yetişkin, ödül yok, tırnaklı 'hasta/terapist', JSON", () => {
    const oz = bolum(rota.SYSTEM_PROMPT, "ÖZ-DENETİM", ETIK_SINIR);
    const maddeler = oz.split("\n").filter((l) => /^\d\. /.test(l));
    expect(maddeler.length).toBeGreaterThanOrEqual(4);
    expect(maddeler.length).toBeLessThanOrEqual(6);
    expect(oz).toMatch(/süre/i);
    expect(oz).toMatch(/dakika/);
    expect(oz).toMatch(/hedef alan/i);
    expect(oz).toMatch(/öneri kipi/i);
    expect(oz).toContain('"veli/çocuğunuz"');
    expect(oz).toMatch(/Ödül/);
    expect(oz).toContain('"hasta/terapist"');
    expect(oz).toMatch(/JSON/);
    expect(oz).toContain("listeyi çıktıya YAZMA");
  });
});

describe("yetiskinMi", () => {
  it("doğum tarihi varsa o belirler (18 sınır dahil); yoksa kapının yaş metni; ikisi de yoksa veli", () => {
    expect(rota.yetiskinMi({ birthDate: dogum(17) }, "17 yaşında")).toBe(false);
    expect(rota.yetiskinMi({ birthDate: dogum(18) }, "18 yaşında")).toBe(true);
    expect(rota.yetiskinMi({ birthDate: dogum(34) }, "")).toBe(true);
    expect(rota.yetiskinMi({ birthDate: null }, "34 yaşında")).toBe(true);
    expect(rota.yetiskinMi({ birthDate: null }, "6 yaşında")).toBe(false);
    expect(rota.yetiskinMi(null, "")).toBe(false);
    expect(rota.yetiskinMi(null, "34 yaşında")).toBe(true);
    // Doğum tarihi yaş metnine üstün: çelişkide tarih kazanır.
    expect(rota.yetiskinMi({ birthDate: dogum(5) }, "34 yaşında")).toBe(false);
  });
});

describe("buildUserPrompt", () => {
  it("sıra: ÖĞRENCİ bloğu → PARAMETRELER → Odak → Son hatırlatma; eski 'Öğrenci bilgileri' / '- Ad:' satırları yok", () => {
    const p = kur();
    expect(p.startsWith(`ÖĞRENCİ\n${blok}\n\nPARAMETRELER\n`)).toBe(true);
    expect(p.indexOf("PARAMETRELER")).toBeLessThan(p.indexOf("Odak:"));
    expect(p.indexOf("Odak:")).toBeLessThan(p.indexOf("Son hatırlatma:"));
    expect(p).not.toContain("Öğrenci bilgileri");
    expect(p).not.toContain("- Ad:");
    expect(p).not.toContain("- Çalışma alanı:");
  });

  it("rumuz koşturucunun deseniyle okunur (bloğun ilk satırı)", () => {
    expect(RUMUZ.exec(kur())?.[1]).toBe("Hazal");
  });

  it("parametreler etiketli ve bugünkü etiketlerle; uzman ek notu yalnız verilmişse", () => {
    const p = kur();
    expect(p).toContain("- Hedef çalışma alanı: /k/ sesini kelime başında üretme");
    expect(p).toContain("- Süre: 10 dakika");
    expect(p).toContain("- Veli bilgi düzeyi: Temel (basit anlatım, teknik terim yok)");
    expect(p).toContain("- Materyal türü: Günlük konuşma aktivitesi (günlük rutinlere entegre edilecek aktivite)");
    expect(p).not.toContain("Uzman ek notu");
    expect(kur({ extraNote: "Eşi destekliyor." })).toContain("- Uzman ek notu: Eşi destekliyor.");
    expect(kur({ parentLevel: "detailed", materialType: "observation" })).toContain("- Veli bilgi düzeyi: Detaylı (daha fazla açıklama, bazı teknik bilgi)");
    expect(kur({ parentLevel: "detailed", materialType: "observation" })).toContain("- Materyal türü: Gözlem formu (velinin çocuğu gözlemleyip not alacağı form)");
  });

  it.each([
    ["10", 4],
    ["15", 5],
    ["20", 6],
  ] as const)("odak: süre %s dk → en çok %i adım (koddan türetilir, rota aynı yardımcıyı kullanır)", (sure, adim) => {
    expect(rota.ADIM_UST_SINIRI[sure]).toBe(adim);
    const p = kur({ duration: sure });
    const odak = p.split("\n").find((l) => l.startsWith("Odak: "))!;
    expect(odak).toMatch(new RegExp(`^Odak: Süre ${sure} dk → en çok ${adim} adım; tür daily_activity → .+\\.$`));
    expect(odak).toBe(`Odak: ${rota.odakSatiri(sure, "daily_activity")}`);
  });

  it.each([
    ["exercise", /\(N dk\)/],
    ["observation", /gözlem penceresi.*NASIL NOT EDİLİR/],
    ["daily_activity", /rutin.*\(N dk\)/],
  ] as const)("odak: tür %s → tek satır tanım, türe özgü çıpa taşır", (tur, cipa) => {
    const odak = kur({ materialType: tur }).split("\n").find((l) => l.startsWith("Odak: "))!;
    expect(odak).toContain(`; tür ${tur} → `);
    expect(odak).toMatch(cipa);
    expect(odak.endsWith(".")).toBe(true);
  });

  it("odak satırı tek satırdır ve hemen hatırlatmadan önce gelir", () => {
    const p = kur();
    const odak = p.split("\n").find((l) => l.startsWith("Odak: "))!;
    expect(p.indexOf(odak) + odak.length + 2).toBe(p.indexOf("Son hatırlatma:"));
  });

  it("çocukta iki hatırlatma sonda tek satırda: veliye öneri kipi + hedef alan/profil verisi bağı", () => {
    const p = kur();
    const son = p.slice(p.indexOf("Son hatırlatma: "));
    expect(son).not.toContain("\n");
    expect(son).toMatch(/Veliye öneri kipi \('yapabilirsiniz'\)\./);
    expect(son).toMatch(/Her adım hedef alana ve profildeki bir veriye bağlı\./);
    expect(son).not.toMatch(/'siz' = öğrenci/);
  });

  it("yetişkin öğrencide (18+): etiket 'Okuyan bilgi düzeyi', ilk hatırlatma muhatap öğrencinin kendisi, ikinci hatırlatma aynı", () => {
    const yetiskinBlok = "Öğrenci: Meral, 34 yaş\nÇalışma alanı: Konuşma\nUzman notları: Öğretmen; işe dönmek istiyor, eşi destekliyor.";
    const p = kur({ duration: "20", materialType: "exercise", parentLevel: "detailed" }, yetiskinBlok, yetiskin, "34 yaşında");
    expect(p).toContain("- Okuyan bilgi düzeyi: Detaylı (daha fazla açıklama, bazı teknik bilgi)");
    expect(p).not.toContain("Veli bilgi düzeyi");
    const son = p.slice(p.indexOf("Son hatırlatma: "));
    expect(son).toMatch(/^Son hatırlatma: Okuyan öğrencinin kendisi \('siz' = öğrenci\); 'veli\/çocuğunuz' yazma\. Her adım hedef alana ve profildeki bir veriye bağlı\.$/);
    expect(son).not.toMatch(/Veliye öneri kipi/);
    // Yaş kapıdan yalnız metin olarak gelirse de yetişkin sayılır.
    expect(kur({}, yetiskinBlok, null, "34 yaşında")).toContain("- Okuyan bilgi düzeyi:");
    // 17 yaş veli.
    expect(kur({}, blok, { birthDate: dogum(17) }, "17 yaşında")).toContain("- Veli bilgi düzeyi:");
  });

  it("boş blokta ÖĞRENCİ başlığı yok; parametreler, odak ve hatırlatma yine var", () => {
    const p = kur({}, "");
    expect(p).not.toContain("ÖĞRENCİ");
    expect(p.startsWith("PARAMETRELER\n")).toBe(true);
    expect(p).toContain("Odak: Süre 10 dk → en çok 4 adım");
    expect(p).toContain("Son hatırlatma:");
    expect(kur({}, "  \n ")).not.toContain("ÖĞRENCİ");
  });
});

describe("rota sözleşmesi (A4: değişmeyenler)", () => {
  it("rota dışa aktarılan buildUserPrompt'u kullanır; toolType/responseKey/cost aynı", () => {
    expect(captured.config?.buildUserPrompt).toBe(rota.buildUserPrompt);
    expect(captured.config).toMatchObject({ toolType: "HOMEWORK_MATERIAL", responseKey: "homework", cost: 1 });
  });

  it("enrichContent sunucu alanlarını (targetArea, materialType, duration) istekten yazar", async () => {
    const content: Record<string, unknown> = { targetArea: "modelin yazdığı", duration: "yanlış" };
    await captured.config!.enrichContent(content, { ...govde, duration: "15", materialType: "exercise" });
    expect(content).toMatchObject({ targetArea: govde.targetArea, materialType: "exercise", duration: "15 dakika" });
  });
});
