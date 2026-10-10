// apps/hub/src/app/studio/api/tools/homework/prompt.test.ts
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ETIK_SINIR } from "@/lib/prompts/ortakBloklar";
import { promptIddialari, promptPenceresi } from "@studio/lib/prompts/iskelet";

/**
 * Ev ödevi A1 prompt sözleşmesi (Faz 2 / Task 4). Model çıktısı birim testte ölçülemez; burada kilitlenen
 * şey MODELE GİDEN METİNDİR: sistem prompt'u pencerede ve A1 sırasında, şema alan adları aynen (istemci ve
 * PDF değişmez), klinik çerçeve / özgüllük / karşıt örnek / öz-denetim maddeleri yerinde; kullanıcı
 * prompt'unda ortak öğrenci bloğu önce, odak satırı koddan doğru türetilmiş, iki hatırlatma sonda.
 *
 * Rota `createToolHandler`'ı kurulumda çağırır ve kapı DB/oturum modüllerini çeker; taklit yalnız config'i
 * yakalar (weeklyPlanLean.test.ts deseni). Böylece dışa aktarılan prompt'un rotaya BAĞLANDIĞI da doğrulanır:
 * test geçerken rota başka bir metin gönderiyor olamaz.
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
const kur = (d: Partial<Body> = {}, studentBlock = blok) => rota.buildUserPrompt({ ...govde, ...d }, null, "4 yaşında", { ...ctx, studentBlock });

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

  it("rol: üreten uzman, okuyan veli (yetişkinde kendisi/yakını); Temel düzeyde teknik terim yok, Detaylı düzeyde parantezle", () => {
    const rol = bolum(rota.SYSTEM_PROMPT, "ROL\n", "KLİNİK ÇERÇEVE");
    expect(rol).toMatch(/uzman/i);
    expect(rol).toMatch(/veli/i);
    expect(rol).toMatch(/18 yaş/);
    expect(rol).toMatch(/Temel/);
    expect(rol).toMatch(/Detaylı/);
    expect(rol).toMatch(/parantez/i);
    expect(rol).toMatch(/öneri kipi/i);
  });

  it("klinik çerçeve: genelleme, tek gözlenebilir hedef, model→bekle (5 sn)→genişlet, düzeltme yerine doğru model, süre→adım, üç tür tanımı", () => {
    const k = bolum(rota.SYSTEM_PROMPT, "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK KURALLARI");
    expect(k).toMatch(/GENELLEME/);
    // `i` bayrağı Türkçe İ'yi katlamaz ("GÖZLENEBİLİR" ≠ /gözlenebilir/i): büyük harfli biçim aynen aranır.
    expect(k).toContain("GÖZLENEBİLİR");
    expect(k).toMatch(/MODEL OL/);
    expect(k).toMatch(/5 saniye/);
    expect(k).toMatch(/GENİŞLET/);
    expect(k).toMatch(/doğru model/i);
    expect(k).toContain("10 dk → 3–4");
    expect(k).toContain("15 dk → 4–5");
    expect(k).toContain("20 dk → 5–6");
    for (const t of TURLER) {
      expect(k).toContain(`${t}`);
      expect(k).toContain(rota.MATERIAL_TYPE_TANIM[t]);
    }
  });

  it("özgüllük: ortak dört kural bir kez ve önde; araca özgü ekler arkada (hedef alan her adımda, uzman notu, yetişkin muhatap, öneri kipi)", () => {
    const p = rota.SYSTEM_PROMPT;
    // Ortak kurallar yalnız iskeletten gelir; araç bölümü onları yeniden yazmaz.
    expect(say(p, "profildeki en az bir somut veriye")).toBe(1);
    expect(say(p, "İlgi alanı verilmişse")).toBe(1);
    expect(say(p, "Geçmiş çalışmalar verilmişse")).toBe(1);
    const o = bolum(p, "ÖZGÜLLÜK KURALLARI", "ZAYIF ÖRNEK");
    expect(o.indexOf("profildeki en az bir somut veriye")).toBeLessThan(o.indexOf("targetArea"));
    expect(o).toContain("targetArea");
    expect(o).toMatch(/Uzman notları/);
    expect(o).toMatch(/18 yaş/);
    expect(o).toMatch(/"veli"/);
    expect(o).toMatch(/bilirsiniz/);
    expect(o).toMatch(/-malı\/-meli/);
  });

  it("karşıt örnek: zayıf = jenerik kalıp ('sabırlı olun'); iyi = rutin + hedef ses + 5 sn bekleme + doğru modelin tekrarı", () => {
    const p = rota.SYSTEM_PROMPT;
    const zayif = p.slice(p.indexOf("ZAYIF ÖRNEK"), p.indexOf("İYİ ÖRNEK"));
    const iyi = p.slice(p.indexOf("İYİ ÖRNEK"), p.indexOf("BİÇİM\n"));
    expect(zayif).toContain("sabırlı olun");
    expect(zayif).toContain("10 dakika");
    expect(iyi).toContain("Akşam yemeğinde");
    expect(iyi).toContain("kaşık");
    expect(iyi).toContain("5 saniye");
    expect(iyi).toContain("/k/");
    expect(iyi).toMatch(/bir kez daha/);
  });

  it("biçim: tek parça JSON; alan bütçeleri her alan için yazılı; adım bütçesi süreye bağlı", () => {
    const b = bolum(rota.SYSTEM_PROMPT, "BİÇİM\n", "ÖZ-DENETİM");
    expect(b).toMatch(/SADECE/);
    expect(b).toMatch(/JSON/);
    const butce = b.slice(b.indexOf("Alan bütçeleri:"));
    for (const alan of ["title", "introduction", "materials", "steps", "instruction", "tip", "watchFor", "celebration", "frequency", "expertNotes", "adaptations"]) {
      expect(butce, alan).toContain(alan);
    }
    expect(butce).toContain("10 dk → 3–4");
    expect(butce).toMatch(/introduction[^\n]*≤ 3 cümle/);
    expect(butce).toMatch(/instruction[^\n]*≤ 2 cümle/);
    expect(butce).toMatch(/tip[^\n]*≤ 1 cümle/);
    expect(butce).toMatch(/watchFor[^\n]*≤ 3 cümle/);
    expect(butce).toMatch(/celebration[^\n]*≤ 2 cümle/);
    expect(butce).toMatch(/expertNotes[^\n]*≤ 3 cümle/);
    expect(butce).toMatch(/adaptations[^\n]*Kolay[^\n]*Zor/);
  });

  it("öz-denetim 4–6 numaralı madde: süre→adım, hedef alan, öneri kipi, ödül yok, tırnaklı 'hasta/terapist', JSON", () => {
    const oz = bolum(rota.SYSTEM_PROMPT, "ÖZ-DENETİM", ETIK_SINIR);
    const maddeler = oz.split("\n").filter((l) => /^\d\. /.test(l));
    expect(maddeler.length).toBeGreaterThanOrEqual(4);
    expect(maddeler.length).toBeLessThanOrEqual(6);
    expect(oz).toMatch(/süre/i);
    expect(oz).toMatch(/hedef alan/i);
    expect(oz).toMatch(/öneri kipi/i);
    expect(oz).toMatch(/ödül/i);
    expect(oz).toContain('"hasta/terapist"');
    expect(oz).toMatch(/JSON/);
    expect(oz).toContain("listeyi çıktıya YAZMA");
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
  ] as const)("odak: süre %s dk → en çok %i adım (koddan türetilir)", (sure, adim) => {
    expect(rota.ADIM_UST_SINIRI[sure]).toBe(adim);
    const beklenen = `Odak: Süre ${sure} dk → en çok ${adim} adım; tür daily_activity → ${rota.MATERIAL_TYPE_TANIM.daily_activity}.`;
    expect(kur({ duration: sure })).toContain(beklenen);
    expect(rota.odakSatiri(sure, "daily_activity")).toBe(beklenen.slice("Odak: ".length));
  });

  it.each(TURLER)("odak: tür %s → tek satır tanım", (tur) => {
    const tanim = rota.MATERIAL_TYPE_TANIM[tur];
    expect(tanim.length).toBeGreaterThan(20);
    expect(tanim).not.toContain("\n");
    expect(kur({ materialType: tur })).toContain(`; tür ${tur} → ${tanim}.`);
  });

  it("odak satırı tek satırdır ve hemen hatırlatmadan önce gelir", () => {
    const p = kur();
    const odak = p.split("\n").find((l) => l.startsWith("Odak: "))!;
    expect(odak).toMatch(/^Odak: Süre 10 dk → en çok 4 adım; tür daily_activity → .+\.$/);
    expect(p.indexOf(odak) + odak.length + 2).toBe(p.indexOf("Son hatırlatma:"));
  });

  it("iki hatırlatma sonda tek satırda: öneri kipi + hedef alan/profil verisi bağı", () => {
    const p = kur();
    expect(rota.HATIRLATMA).toHaveLength(2);
    expect(rota.HATIRLATMA[0]).toMatch(/öneri kipi/i);
    expect(rota.HATIRLATMA[0]).toContain("yapabilirsiniz");
    expect(rota.HATIRLATMA[1]).toMatch(/hedef alana/);
    expect(rota.HATIRLATMA[1]).toMatch(/profildeki bir veriye/);
    expect(p.endsWith(`Son hatırlatma: ${rota.HATIRLATMA.join(" ")}`)).toBe(true);
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
