// apps/hub/src/app/studio/api/tools/session-summary/prompt.test.ts
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ETIK_SINIR } from "@/lib/prompts/ortakBloklar";
import { promptIddialari, promptPenceresi } from "@studio/lib/prompts/iskelet";

/**
 * Oturum özeti A1 prompt sözleşmesi (Faz 2 / Task 5). Model çıktısı birim testte ölçülemez; burada kilitlenen
 * şey MODELE GİDEN METİNDİR: sistem prompt'u pencerede ve A1 sırasında, şema alan adları aynen (istemci,
 * `SessionSummaryView` ve PDF değişmez), veri sadakati / tür kuralları / karşıt örnek / öz-denetim yerinde;
 * kullanıcı prompt'unda ortak öğrenci bloğu önce, hedef listesi bugünkü etiketlerle, odak satırı koddan
 * doğru türetilmiş, iki hatırlatma sonda.
 *
 * Rota `createToolHandler`'ı kurulumda çağırır ve kapı DB/oturum modüllerini çeker; taklit yalnız config'i
 * yakalar (homework/prompt.test.ts deseni). Böylece dışa aktarılan prompt'un rotaya BAĞLANDIĞI da doğrulanır.
 */
type Goal = { goalId: string; goalTitle: string; accuracy: number; cueLevel: string };
type Body = {
  studentId: string;
  sessionDate: string;
  duration: "20" | "30" | "40" | "45" | "60";
  sessionType: "individual" | "group" | "assessment" | "parent_meeting";
  goals: Goal[];
  overallPerformance: "above_target" | "on_target" | "progressing" | "needs_support" | "not_assessed";
  behaviorNotes?: string;
  nextSessionNotes?: string;
};
type Config = {
  systemPrompt: string;
  toolType: string;
  responseKey: string;
  cost: number;
  buildUserPrompt: unknown;
  fallbackTitle: (data: Body, student: { name: string } | null) => string;
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

/** Bugünkü şema alan adları — istemci (`SessionSummaryView`) ve PDF bunları okur; A4: değişmez. */
const ALANLAR = [
  "title", "sessionInfo", "date", "duration", "type", "student",
  "goalPerformance", "goal", "accuracy", "cueLevel", "analysis", "recommendation",
  "overallAssessment", "behaviorNotes", "nextSessionPlan", "parentNote", "expertNotes",
];
const TURLER = ["individual", "group", "assessment", "parent_meeting"] as const;
const TUR_ETIKETI: Record<(typeof TURLER)[number], string> = {
  individual: "Bireysel Oturum",
  group: "Grup Oturumu",
  assessment: "Değerlendirme Oturumu",
  parent_meeting: "Veli Görüşmesi",
};

const govde: Body = {
  studentId: "s1",
  sessionDate: "2026-10-08",
  duration: "40",
  sessionType: "individual",
  overallPerformance: "progressing",
  goals: [
    { goalId: "g1", goalTitle: "Üç kelimeli istek cümlesi", accuracy: 60, cueLevel: "Minimum İpucu" },
    { goalId: "g2", goalTitle: "Sıra alma (dinozor oyunu)", accuracy: 80, cueLevel: "Bağımsız" },
  ],
  behaviorNotes: "Bekleme salonundan sonra ilk 5 dk kulaklarını kapattı; sakin köşede toparlandı.",
  nextSessionNotes: "Geçiş kartını eve ver.",
};
const blok = [
  "Öğrenci: Hazal, 6 yaş",
  "Çalışma alanı: Dil",
  "Tanı: Otizm spektrum bozukluğu, hafif düzey; ifade edici dil gecikmesi.",
  "Son oturum (01.10.2026): İki kelimeli istek cümlesini %70 doğrulukla kurdu. Sonraki plan: üç kelimeye genişlet.",
].join("\n");
const ctx = { therapistId: "t1", scrubText: (t: string | null | undefined) => t ?? "", studentBlock: blok };
const kur = (d: Partial<Body> = {}, studentBlock = blok) => rota.buildUserPrompt({ ...govde, ...d }, null, "6 yaşında", { ...ctx, studentBlock });

/** Koşturucunun rumuz deseni (`evals/lib/runner.ts` RUMUZ_DESENI, birebir): bloğun tiresiz kimlik satırı okunur. */
const RUMUZ = /(?:- (?:Ad|Öğrenci|İsim)|Öğrenci adı): ([^,\n]+)|^Öğrenci: ([^,\n]+)(?:, \d+ yaş)?$(?=\nÇalışma alanı: )/m;

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
  it("pencere 1200–2000 token, 17 şema alanı aynen, yasak sözcük yok; rota bu metni gönderir", () => {
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

  it("rol: uzman kaydı + veliye kısa not; profesyonel ve nesnel; veri yorumlanır, üretilmez", () => {
    const rol = bolum(rota.SYSTEM_PROMPT, "ROL\n", "KLİNİK ÇERÇEVE");
    expect(rol).toMatch(/uzman/i);
    expect(rol).toMatch(/veli/i);
    expect(rol).toMatch(/parentNote/);
    expect(rol).toMatch(/expertNotes/);
    expect(rol).toMatch(/nesnel/i);
    expect(rol).toMatch(/profesyonel/i);
    expect(rol).toMatch(/YORUMLARSIN/);
  });

  it("klinik çerçeve: veri sadakati (AYNEN, uydurma yok), doğruluk↔ipucu çıkarımı, kıyas yalnız 'Son oturum' varsa ve yön olarak, öneri basamakları, dört tür kuralı", () => {
    const k = bolum(rota.SYSTEM_PROMPT, "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK KURALLARI");
    expect(k).toContain("AYNEN");
    expect(k).toMatch(/uydurma/i);
    expect(k).toMatch(/ipucu düzeyi/i);
    expect(k).toContain('"Son oturum"');
    expect(k).toMatch(/yön olarak/);
    expect(k).toMatch(/geriledi/);
    // Son oturumun sayısı yeniden yazılmaz (eval'in uydurma-yüzde kontrolü girilmemiş her yüzdeyi sayar).
    expect(k).toMatch(/sayı[^\n]*yeniden yazılmaz/);
    // Olumsuz buyruklar ad öbeği gibi okunmasın: "X uydurma" / "X yazma" yerine "uydurmadır" / "yazılmaz".
    expect(k).not.toMatch(/iddiası uydurma[.:]/);
    expect(k).not.toMatch(/ yazma[.;]/);
    expect(k).toMatch(/ipucu azaltma/i);
    expect(k).toMatch(/genelleme/i);
    expect(k).toContain("Grup Oturumu");
    expect(k).toMatch(/bireysel katılım/i);
    expect(k).toContain("Değerlendirme Oturumu");
    expect(k).toMatch(/ölçüm/i);
    expect(k).toContain("Veli Görüşmesi");
    expect(k).toContain('"—"');
    expect(k).toContain("Değerlendirme Yapılamadı");
  });

  it("özgüllük: ortak dört kural bir kez ve önde; araca özgü ekler arkada (analysis kendi verisine, parentNote 3–5 terimsiz, expertNotes klinik, student rumuz + yaş)", () => {
    const p = rota.SYSTEM_PROMPT;
    expect(say(p, "profildeki en az bir somut veriye")).toBe(1);
    expect(say(p, "İlgi alanı verilmişse")).toBe(1);
    expect(say(p, "Geçmiş çalışmalar verilmişse")).toBe(1);
    const o = bolum(p, "ÖZGÜLLÜK KURALLARI", "ZAYIF ÖRNEK");
    expect(o.indexOf("profildeki en az bir somut veriye")).toBeLessThan(o.indexOf("analysis"));
    expect(o).toMatch(/analysis[^\n]*KENDİ/);
    expect(o).toMatch(/parentNote[^\n]*3–5 cümle/);
    expect(o).toMatch(/parentNote[^\n]*teknik terim/i);
    expect(o).toMatch(/parentNote[^\n]*cesaretlendirici/i);
    // Yetişkin öğrencide okur kendisi/yakını (düzyazı); koddan türetilen eşlik satırı aşağıda ayrıca test edilir.
    expect(o).toMatch(/parentNote[^\n]*18 yaş/);
    expect(o).toMatch(/expertNotes[^\n]*klinik/i);
    // Uzman notunda da "öğrenci/uzman" geçerli — "terim serbest" gibi bir muafiyet yazılmaz.
    expect(o).toMatch(/expertNotes[^\n]*"öğrenci\/uzman"/);
    expect(o).not.toMatch(/serbest/);
    // İlgi alanları blokta etiketli değil, "Uzman notları" içinde: model nereye bakacağını bilsin.
    expect(o).toMatch(/uzman notları[^\n]*ilgi alanları/i);
    expect(o).toMatch(/sessionInfo\.student[^\n]*rumuz/i);
    expect(o).toMatch(/sessionInfo\.student[^\n]*yaş/i);
  });

  it("karşıt örnek: zayıf = jenerik 'genel olarak iyi performans'; iyi = ses + girilen yüzde + ipucu + yön kıyası + tek basamak", () => {
    const p = rota.SYSTEM_PROMPT;
    const zayif = p.slice(p.indexOf("ZAYIF ÖRNEK"), p.indexOf("İYİ ÖRNEK"));
    const iyi = p.slice(p.indexOf("İYİ ÖRNEK"), p.indexOf("BİÇİM\n"));
    expect(zayif).toContain("genel olarak iyi performans");
    expect(zayif).toContain("gelişim kaydetti");
    expect(iyi).toContain("/r/");
    expect(iyi).toContain("%60");
    expect(iyi).toMatch(/ipucu/);
    expect(iyi).toMatch(/geriledi/);
    expect(iyi).toContain("5'e insin");
    // Prompt'un kendi kuralı: son oturumun sayısı yeniden yazılmaz → iyi örnekte ikinci bir yüzde yok.
    expect(iyi.match(/%\d+/g)).toEqual(["%60"]);
  });

  it("biçim: tek parça JSON; alan bütçeleri her alan için yazılı ve görevdeki değerlerle", () => {
    const b = bolum(rota.SYSTEM_PROMPT, "BİÇİM\n", "ÖZ-DENETİM");
    expect(b).toMatch(/SADECE/);
    expect(b).toMatch(/JSON/);
    const butce = b.slice(b.indexOf("Alan bütçeleri:"));
    for (const alan of ["title", "goalPerformance", "analysis", "recommendation", "overallAssessment", "behaviorNotes", "nextSessionPlan", "parentNote", "expertNotes"]) {
      expect(butce, alan).toContain(alan);
    }
    expect(butce).toMatch(/analysis[^\n]*≤ 2 cümle/);
    expect(butce).toMatch(/recommendation[^\n]*1 cümle/);
    expect(butce).toMatch(/overallAssessment[^\n]*2–3 cümle/);
    expect(butce).toMatch(/behaviorNotes[^\n]*≤ 2 cümle/);
    expect(butce).toMatch(/nextSessionPlan[^\n]*≤ 3/);
    expect(butce).toMatch(/parentNote[^\n]*3–5 cümle/);
    expect(butce).toMatch(/expertNotes[^\n]*≤ 3 cümle/);
    expect(butce).toMatch(/goalPerformance[^\n]*girilen sırayla/);
  });

  it("öz-denetim 4–6 numaralı madde: yüzde/ipucu aynı, uydurma sayı/olay, 'Son oturum' kıyası, veli notu terimsiz, tırnaklı 'hasta/terapist', JSON", () => {
    const oz = bolum(rota.SYSTEM_PROMPT, "ÖZ-DENETİM", ETIK_SINIR);
    const maddeler = oz.split("\n").filter((l) => /^\d\. /.test(l));
    expect(maddeler.length).toBeGreaterThanOrEqual(4);
    expect(maddeler.length).toBeLessThanOrEqual(6);
    expect(oz).toMatch(/yüzde/i);
    expect(oz).toMatch(/ipucu/i);
    expect(oz).toMatch(/uydur/i);
    expect(oz).toContain('"Son oturum"');
    expect(oz).toMatch(/veli notu/i);
    expect(oz).toMatch(/terimsiz/i);
    expect(oz).toContain('"hasta/terapist"');
    expect(oz).toMatch(/JSON/);
    expect(oz).toContain("listeyi çıktıya YAZMA");
  });
});

describe("buildUserPrompt", () => {
  it("sıra: ÖĞRENCİ bloğu → PARAMETRELER → Odak → Son hatırlatma; eski 'Öğrenci bilgileri' / '- Ad:' / kapanış cümlesi yok", () => {
    const p = kur();
    expect(p.startsWith(`ÖĞRENCİ\n${blok}\n\nPARAMETRELER\n`)).toBe(true);
    expect(p.indexOf("PARAMETRELER")).toBeLessThan(p.indexOf("Odak:"));
    expect(p.indexOf("Odak:")).toBeLessThan(p.indexOf("Son hatırlatma:"));
    expect(p).not.toContain("Öğrenci bilgileri");
    expect(p).not.toContain("- Ad:");
    expect(p).not.toContain("- Çalışma alanı:");
    expect(p).not.toContain("Oturum bilgileri:");
    expect(p).not.toContain("Yukarıdaki verilerle");
  });

  it("rumuz koşturucunun deseniyle okunur (bloğun ilk satırı)", () => {
    const m = RUMUZ.exec(kur());
    expect((m?.[1] ?? m?.[2])?.trim()).toBe("Hazal");
  });

  it("parametreler bugünkü etiketlerle: tarih Türkçe uzun biçimde, süre, tür, genel performans; gözlem ve sonraki not yalnız verilmişse", () => {
    const p = kur();
    expect(p).toContain("- Tarih: 8 Ekim 2026");
    expect(p).toContain("- Süre: 40 dakika");
    expect(p).toContain("- Tür: Bireysel Oturum");
    expect(p).toContain("- Genel performans değerlendirmesi: Gelişim Gösteriyor");
    expect(p).toContain("- Davranış ve katılım gözlemi: Bekleme salonundan sonra ilk 5 dk kulaklarını kapattı; sakin köşede toparlandı.");
    expect(p).toContain("- Sonraki oturum için notlar: Geçiş kartını eve ver.");
    const sade = kur({ behaviorNotes: undefined, nextSessionNotes: undefined });
    expect(sade).not.toContain("Davranış ve katılım gözlemi");
    expect(sade).not.toContain("Sonraki oturum için notlar");
    expect(kur({ sessionType: "group", overallPerformance: "on_target" })).toContain("- Tür: Grup Oturumu");
    expect(kur({ overallPerformance: "not_assessed" })).toContain("- Genel performans değerlendirmesi: Değerlendirme Yapılamadı");
  });

  it("hedef listesi bugünkü biçimde aynen: numara + başlık, alt satırlarda '- Doğruluk: %N' ve '- İpucu düzeyi: …'", () => {
    const p = kur();
    const beklenen = [
      "- Çalışılan hedefler ve performans verileri:",
      "1. Üç kelimeli istek cümlesi",
      "   - Doğruluk: %60",
      "   - İpucu düzeyi: Minimum İpucu",
      "2. Sıra alma (dinozor oyunu)",
      "   - Doğruluk: %80",
      "   - İpucu düzeyi: Bağımsız",
    ].join("\n");
    expect(p).toContain(beklenen);
    // Hedef listesi parametre bloğunun içinde, odaktan önce.
    expect(p.indexOf(beklenen)).toBeGreaterThan(p.indexOf("PARAMETRELER"));
    expect(p.indexOf(beklenen)).toBeLessThan(p.indexOf("Odak:"));
    // %0 da aynen geçer (değerlendirme vakası).
    expect(kur({ goals: [{ goalId: "g1", goalTitle: "/r/ sesi tarama (kelime düzeyi)", accuracy: 0, cueLevel: "Tam Destek" }] })).toContain("1. /r/ sesi tarama (kelime düzeyi)\n   - Doğruluk: %0\n   - İpucu düzeyi: Tam Destek");
  });

  it.each(TURLER)("odak: hedef sayısı, süre ve tür etiketi (%s) koddan türetilir", (tur) => {
    const beklenen = `Odak: 2 hedef, 40 dk, ${TUR_ETIKETI[tur]} → analizler yalnız verilen sayılardan.`;
    expect(kur({ sessionType: tur })).toContain(beklenen);
    expect(rota.odakSatiri(2, "40", tur)).toBe(beklenen.slice("Odak: ".length));
  });

  it("odak: hedef sayısı ve süre gövdeden okunur", () => {
    const tek = kur({ duration: "60", sessionType: "assessment", goals: [govde.goals[0]!] });
    expect(tek).toContain("Odak: 1 hedef, 60 dk, Değerlendirme Oturumu → analizler yalnız verilen sayılardan.");
    const uc = kur({ duration: "30", sessionType: "group", goals: [...govde.goals, { goalId: "g3", goalTitle: "Grupta sıra bekleme", accuracy: 90, cueLevel: "Bağımsız" }] });
    expect(uc).toContain("Odak: 3 hedef, 30 dk, Grup Oturumu → analizler yalnız verilen sayılardan.");
  });

  it("odak satırı tek satırdır ve hemen hatırlatmadan önce gelir", () => {
    const p = kur();
    const odak = p.split("\n").find((l) => l.startsWith("Odak: "))!;
    expect(odak).toMatch(/^Odak: 2 hedef, 40 dk, Bireysel Oturum → analizler yalnız verilen sayılardan\.$/);
    expect(p.indexOf(odak) + odak.length + 2).toBe(p.indexOf("Son hatırlatma:"));
  });

  it("iki hatırlatma sonda tek satırda: sayılar değişmez + veli notu 3–5 cümle terimsiz", () => {
    const p = kur();
    expect(rota.HATIRLATMA).toHaveLength(2);
    expect(rota.HATIRLATMA[0]).toBe("Sayıları değiştirme, yeni sayı üretme.");
    expect(rota.HATIRLATMA[1]).toBe("Veli notu 3–5 cümle, terimsiz.");
    expect(p.endsWith(`Son hatırlatma: ${rota.HATIRLATMA.join(" ")}`)).toBe(true);
  });

  it("yaşa bağlı okur satırı koddan: 18+ öğrencide parametrelere eklenir (odaktan önce), çocukta ve yaş bilinmiyorken yok", () => {
    const yetiskin = rota.buildUserPrompt(govde, null, "19 yaşında", ctx);
    expect(yetiskin).toContain(rota.YETISKIN_OKUR);
    expect(rota.YETISKIN_OKUR).toMatch(/^- Okur: /);
    expect(rota.YETISKIN_OKUR).toMatch(/kendisine ya da yakınına/);
    expect(rota.YETISKIN_OKUR).toContain('"çocuğunuz"');
    expect(yetiskin.indexOf(rota.YETISKIN_OKUR)).toBeGreaterThan(yetiskin.indexOf("- Sonraki oturum için notlar:"));
    expect(yetiskin.indexOf(rota.YETISKIN_OKUR)).toBeLessThan(yetiskin.indexOf("Odak:"));
    expect(rota.buildUserPrompt(govde, null, `${rota.YETISKIN_YAS} yaşında`, ctx)).toContain("- Okur:");
    expect(rota.buildUserPrompt(govde, null, "17 yaşında", ctx)).not.toContain("- Okur:");
    expect(kur()).not.toContain("- Okur:"); // 6 yaşında
    expect(rota.buildUserPrompt(govde, null, "", ctx)).not.toContain("- Okur:");
  });

  it("boş blokta ÖĞRENCİ başlığı yok; parametreler, odak ve hatırlatma yine var", () => {
    const p = kur({}, "");
    expect(p).not.toContain("ÖĞRENCİ");
    expect(p.startsWith("PARAMETRELER\n")).toBe(true);
    expect(p).toContain("Odak: 2 hedef, 40 dk, Bireysel Oturum");
    expect(p).toContain("Son hatırlatma:");
    expect(kur({}, "  \n ")).not.toContain("ÖĞRENCİ");
  });
});

describe("rota sözleşmesi (A4: değişmeyenler)", () => {
  it("rota dışa aktarılan buildUserPrompt'u kullanır; toolType/responseKey/cost aynı; fallbackTitle rumuzla", () => {
    expect(captured.config?.buildUserPrompt).toBe(rota.buildUserPrompt);
    expect(captured.config).toMatchObject({ toolType: "SESSION_SUMMARY", responseKey: "summary", cost: 1 });
    expect(captured.config!.fallbackTitle(govde, { name: "Hazal" })).toBe("Oturum Özeti — Hazal");
    expect(captured.config!.fallbackTitle(govde, null)).toBe("Oturum Özeti — ");
  });

  it("enrichContent sunucu alanlarını (sessionType, overallPerformance, sessionDate) istekten yazar", async () => {
    const content: Record<string, unknown> = { sessionType: "modelin yazdığı" };
    await captured.config!.enrichContent(content, { ...govde, sessionType: "group", overallPerformance: "on_target", sessionDate: "2026-10-07" });
    expect(content).toMatchObject({ sessionType: "group", overallPerformance: "on_target", sessionDate: "2026-10-07" });
  });
});
