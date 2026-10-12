// apps/hub/src/app/studio/api/tools/articulation/prompt.test.ts
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ETIK_SINIR } from "@/lib/prompts/ortakBloklar";
import { PROMPT_PENCERESI, promptIddialari, promptPenceresi } from "@studio/lib/prompts/iskelet";

/** Eval tuzak telinin katlaması (`evals/lib/sharedChecks.ts` `katla`): tr-TR küçük harf, ı→i, aksanlar atılır. */
const katla = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Artikülasyon A1 prompt sözleşmesi (Faz 2 / Task 11). Model çıktısı birim testte ölçülemez; burada
 * kilitlenen şey MODELE GİDEN METİNDİR: sistem prompt'u pencerede (tavana ≥ 60 token pay) ve A1 sırasında,
 * şema alan adları aynen (sayfa, PDF ve görsel rotası bunları okur), hiyerarşi / hedef harf / hece türü /
 * banka / yaş kuralları, sese özgü ipucu türleri, karşıt örnek ve öz-denetim yerinde; kullanıcı prompt'unda
 * ortak öğrenci bloğu önce, odak satırı seviyeden ve bankadan koddan türetilmiş, yetişkin satırı KODDA
 * koşullu, iki hatırlatma sonda. Bağlam örneği ADSIZ (eski prompt "Selin…" içeriyordu; eval PII maskesi
 * o parçayı maskeliyordu — artık maske girdisi yok).
 *
 * Rota `createToolHandler`'ı kurulumda çağırır ve kapı DB/oturum modüllerini çeker; taklit yalnız config'i
 * yakalar (homework/prompt.test.ts deseni). Böylece dışa aktarılan prompt'un rotaya BAĞLANDIĞI da doğrulanır.
 */
type Level = "isolated" | "syllable" | "word" | "sentence" | "contextual";
type Body = {
  studentId?: string;
  targetSounds: string[];
  positions: Array<"initial" | "medial" | "final">;
  level: Level;
  itemCount: number;
};
type Config = {
  systemPrompt: string;
  toolType: string;
  responseKey: string;
  cost: number;
  maxTokens?: number;
  studentRequired?: boolean;
  buildUserPrompt: unknown;
  enrichContent: (content: Record<string, unknown>, body: Body, ctx: { stash: Record<string, unknown> }) => void | Promise<void>;
};
const captured = vi.hoisted(() => ({ config: null as Config | null }));

vi.mock("@studio/lib/toolHandler", () => ({
  createToolHandler: (config: Config) => {
    captured.config = config;
    return async () => new Response(null);
  },
}));
vi.mock("@studio/lib/generateWordImage", () => ({ lookupCachedWordImage: async () => null }));

type Rota = typeof import("./route");
let rota: Rota;
beforeAll(async () => {
  rota = await import("./route");
});

/** Bugünkü şema alan adları — sayfa (`tools/articulation/page.tsx`), PDF ve görsel rotası bunları okur; A4: değişmez. */
const ALANLAR = [
  "title", "targetSounds", "positions", "level", "items",
  "word", "syllableCount", "syllableBreak", "position", "targetSound", "sentence", "visualPrompt",
  "syllableType", "exampleWord",
  "expertNotes", "cueTypes", "homeGuidance",
];

const govde: Body = { studentId: "s1", targetSounds: ["/ş/"], positions: ["initial", "medial"], level: "sentence", itemCount: 10 };
const blok = [
  "Öğrenci: Hazal, 6 yaş",
  "Çalışma alanı: Konuşma",
  "Tanı: Dişler arası sigmatizm; /s/ üretiminde dil ucu dişlerin arasından çıkıyor.",
  "Uzman notları: Dinozorlara bayılıyor; ayna karşısında çalışmayı seviyor.",
].join("\n");
const ctx = { therapistId: "t1", scrubText: (t: string | null | undefined) => t ?? "", studentBlock: blok, stash: {} as Record<string, unknown> };
type Ogrenci = { id: string; name: string; birthDate: Date | null; workArea: string; diagnosis: string | null };
const cocuk: Ogrenci = { id: "s1", name: "Hazal", birthDate: new Date("2020-05-14"), workArea: "speech", diagnosis: null };
const yetiskin: Ogrenci = { id: "s2", name: "Meral", birthDate: new Date("1992-07-30"), workArea: "speech", diagnosis: null };
const kur = (d: Partial<Body> = {}, studentBlock = blok, student: typeof cocuk | null = cocuk, ageText = "6 yaşında") =>
  rota.buildUserPrompt({ ...govde, ...d }, student, ageText, { ...ctx, studentBlock, stash: {} });
/** Banka stash'i: rota seçimi `ctx.stash.bankWords`'e koyar (enrichContent oradan okur). */
const bankaIle = (d: Partial<Body> = {}, student: typeof cocuk | null = cocuk) => {
  const data = { ...govde, ...d } as Body;
  const c = { ...ctx, stash: {} as { bankWords?: Array<{ word: string }> } };
  const p = rota.buildUserPrompt(data, student, "6 yaşında", c);
  return { p, bank: (c.stash.bankWords ?? []).map((w) => w.word) };
};

/** Koşturucunun rumuz deseni (`evals/lib/runner.ts`): bloğun tiresiz `Öğrenci: <rumuz>, N yaş` satırı okunur. */
const RUMUZ = /(?:- (?:Ad|Öğrenci|İsim)|Öğrenci adı): ([^,\n]+)|^Öğrenci: ([^,\n]+)(?:, \d+ yaş)?$(?=\nÇalışma alanı: )/m;
const odakSatir = (p: string) => p.split("\n").find((l) => l.startsWith("Odak: "))!;

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
  it("pencere 1200–2000 token (tavana ≥ 60 pay), 17 şema alanı aynen, yasak sözcük yok; rota bu metni gönderir", () => {
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

  it("rol: uzman üretir/uygular, veli rehberi (18+ öğrencide kendisi); expertNotes uzmana, terim serbest ama 'öğrenci/uzman' geçerli", () => {
    const rol = bolum(rota.SYSTEM_PROMPT, "ROL\n", "KLİNİK ÇERÇEVE");
    expect(rol).toMatch(/uzman/i);
    expect(rol).toMatch(/veli/i);
    expect(rol).toMatch(/18 yaş/);
    expect(rol).toContain("expertNotes");
    expect(rol).toMatch(/terim serbest/);
    expect(rol).toContain('"öğrenci/uzman"');
    expect(rol).not.toMatch(/mesleki dil/);
  });

  it("klinik çerçeve: hiyerarşi, hedef HARF her kelimede (güneş/ağaç), imkânsız pozisyon, hece türü, seviye biçimleri, BANKA, sonda eksiz, yaş → uzunluk, ipucu türleri sese özgü", () => {
    const k = bolum(rota.SYSTEM_PROMPT, "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK KURALLARI");
    expect(k).toMatch(/izole → hece → kelime → cümle → bağlam/);
    expect(k).toContain("HARF");
    expect(k).toMatch(/güneş/);
    expect(k).toMatch(/ağaç/);
    // Türkçede başta /ğ/ olmaz: uydurma yerine olan pozisyonlar + not.
    expect(k).toMatch(/başta \/ğ\//);
    expect(k).toMatch(/uydurulmaz/);
    // Hece türü tanımı eval kontrolüyle (açık = ünlüyle, kapalı = ünsüzle biter) aynı.
    expect(k).toMatch(/açık[^\n]*ünlüyle biter/);
    expect(k).toMatch(/kapalı[^\n]*ünsüzle biter/);
    // Seviye biçimleri odak satırında (`SEVIYE_BICIMI`); çerçeve yalnız "word her seviyede dolu" + hece türünü söyler.
    expect(k).toMatch(/Odak satırındadır/);
    expect(k).toMatch(/word her seviyede dolu/);
    for (const l of ["isolated", "syllable", "word", "sentence", "contextual"] as const) {
      expect(rota.SEVIYE_BICIMI[l], l).toMatch(/^items: word/);
    }
    expect(rota.SEVIYE_BICIMI.syllable).toMatch(/syllableType[^\n]*exampleWord/);
    expect(rota.SEVIYE_BICIMI.sentence).toMatch(/syllableBreak/);
    expect(rota.SEVIYE_BICIMI.contextual).toMatch(/"sentence"[^\n]*3-4 cümlelik paragraf/);
    expect(k).toContain("BANKA");
    expect(k).toMatch(/YALNIZ/);
    expect(k).toMatch(/sıra/);
    expect(k).toMatch(/\[\]/);
    // Sonda pozisyon: kelime cümlede eksiz (eval `sonda_eksiz`). Tur 2: yalnız NE değil NASIL da —
    // kelime özne ya da yalın nesne olur; eki atılmış bozuk cümle (tur 1 art-10: "Resmi duvar süslüyor") yazılmaz.
    // `i` bayrağı Türkçe İ'yi katlamaz: büyük harfli biçim aynen aranır.
    expect(k).toContain("EKSİZ");
    expect(k).toMatch(/EKSİZ[^\n]*özne ya da yalın nesne/);
    expect(k).toMatch(/EKSİZ[^\n]*Mantar ormanda büyür\./);
    expect(k).toMatch(/EKSİZ[^\n]*eki atılmış bozuk cümle[^\n]*yazılmaz/);
    // Yaş → cümle uzunluğu ve sözcük sıklığı; yetişkin; her cümle dilbilgisi kusursuz (hakem `dil_yas`), ses sıklığı için zorlama yok.
    expect(k).toMatch(/yaş/);
    expect(k).toMatch(/kelime/);
    expect(k).toMatch(/yetişkin/);
    expect(k).toMatch(/Yaş[^\n]*dilbilgisi kusursuz Türkçe/);
    expect(k).toMatch(/Yaş[^\n]*zorlama cümle kurulmaz/);
    // İpucu türleri: görsel/dokunsal/işitsel, sese özgü örnekler ("tam 3" yalnız bütçe satırında).
    expect(k).toMatch(/Görsel/);
    expect(k).toMatch(/Dokunsal/);
    expect(k).toMatch(/İşitsel/);
    expect(k).toMatch(/\/s\/[^\n]*dil ucu/);
    expect(k).toMatch(/\/r\/[^\n]*titreşim/);
    expect(k).toMatch(/\/k\/[^\n]*dil arkası/);
    // /ğ/: temas yok, önceki ünlüyü uzatır (tur 1 art-05 tanıyı tersine çevirdi; tabanda da temas iddiası vardı).
    expect(k).toMatch(/\/ğ\/[^\n]*temas yok[^\n]*ünlüyü uzatır/);
    expect(k).not.toMatch(/tam 3 madde/);
    // Uzman notu kuralı yalnız bütçe satırında (tur 2: çerçevedeki çift madde kaldırıldı).
    expect(k).not.toMatch(/yapışabilen cümle yazılmaz/);
  });

  it("özgüllük: ortak dört kural bir kez ve önde; araca özgü ekler arkada (tanı → hata örüntüsü, ilgi alanı 'Uzman notları'nda, öğrencisiz genel materyal, yetişkin, uydurma ad yok)", () => {
    const p = rota.SYSTEM_PROMPT;
    expect(say(p, "profildeki en az bir somut veriye")).toBe(1);
    expect(say(p, "İlgi alanı verilmişse")).toBe(1);
    expect(say(p, "Geçmiş çalışmalar verilmişse")).toBe(1);
    const o = bolum(p, "ÖZGÜLLÜK KURALLARI", "ZAYIF ÖRNEK");
    expect(o.indexOf("profildeki en az bir somut veriye")).toBeLessThan(o.indexOf("Tanı"));
    expect(o).toMatch(/Tanı/);
    expect(o).toMatch(/Uzman notları/);
    expect(o).toMatch(/bayılıyor/);
    expect(o).toMatch(/genel çocuk materyali/);
    expect(o).toMatch(/uydurulmaz/);
    expect(o).toMatch(/18 yaş/);
    expect(o).toContain('"veli"');
    expect(o).toMatch(/kişi adı/i);
  });

  it("karşıt örnek: zayıf = jenerik kalıplar; iyi = ses + pozisyon + yerleşim + ayna + uzatma + ölçüt (5 doğru)", () => {
    const p = rota.SYSTEM_PROMPT;
    const zayif = p.slice(p.indexOf("ZAYIF ÖRNEK"), p.indexOf("İYİ ÖRNEK"));
    const iyi = p.slice(p.indexOf("İYİ ÖRNEK"), p.indexOf("BİÇİM\n"));
    expect(zayif).toMatch(/Düzenli tekrar önemlidir/);
    expect(zayif).toMatch(/sabırlı olun/);
    expect(iyi).toContain("/ş/");
    expect(iyi).toMatch(/kelime başında/);
    expect(iyi).toMatch(/dil ucu/);
    expect(iyi).toMatch(/ayna/);
    expect(iyi).toMatch(/şşşapka/);
    expect(iyi).toMatch(/5 doğru/);
  });

  it("biçim: tek parça JSON; şema bugünkü alan adlarıyla; seviye örnekleri başlıklı; bağlam örneği 3–4 cümle ve ADSIZ; bütçeler her alan için", () => {
    const b = bolum(rota.SYSTEM_PROMPT, "BİÇİM\n", "ÖZ-DENETİM");
    expect(b).toMatch(/SADECE/);
    expect(b).toMatch(/JSON/);
    for (const baslik of ["Hece düzeyi (syllable) için items[] örneği:", "Bağlam düzeyi (contextual) için items[] örneği:"]) {
      expect(b, baslik).toContain(baslik);
    }
    // Bağlam örneği (articulationContextual.test.ts ile aynı okuma): JSON, 3–4 cümle, kelime paragrafta.
    const blokMetni = b.split("Bağlam düzeyi (contextual) için items[] örneği:")[1]!;
    const json = blokMetni.slice(blokMetni.indexOf("["), blokMetni.indexOf("]") + 1);
    const [ornek] = JSON.parse(json) as Array<{ word: string; sentence: string }>;
    const cumleler = ornek!.sentence.split(/(?<=[.!?])\s+/).filter(Boolean);
    expect(cumleler.length).toBeGreaterThanOrEqual(3);
    expect(cumleler.length).toBeLessThanOrEqual(4);
    expect(ornek!.sentence.toLocaleLowerCase("tr-TR")).toContain(ornek!.word);
    // Adsız: büyük harfle başlayan sözcükler yalnız cümle başlarında (özel ad yok).
    const icSozcukler = cumleler.flatMap((c) => c.split(/\s+/).slice(1));
    expect(icSozcukler.filter((w) => /^\p{Lu}/u.test(w))).toEqual([]);
    expect(b).not.toMatch(/Selin/);
    // Tur 2: örnek doğal Türkçe, zorlama ses yoğunluğu yok ("şaşkın bir kuşa uzattım" anlamsızdı); /ş/ yine ≥ 4 kez.
    expect(ornek!.sentence).not.toMatch(/şaşkın/);
    expect(ornek!.sentence).toBe("Yağmur şiddetlendi. Şemsiyemi alıp okula koştum. Şemsiyenin altında şapkam ıslanmadı.");
    expect(say(ornek!.sentence.toLocaleLowerCase("tr-TR"), "ş")).toBeGreaterThanOrEqual(4);
    // Bütçe satırları.
    const butce = b.slice(b.indexOf("Alan bütçeleri:"));
    for (const alan of ["title", "items", "sentence", "visualPrompt", "expertNotes", "cueTypes", "homeGuidance"]) expect(butce, alan).toContain(alan);
    expect(butce).toMatch(/items[^\n]*tam/);
    expect(butce).toMatch(/sentence[^\n]*≤ 10 kelime/);
    expect(butce).toMatch(/3-4 cümle/);
    expect(butce).toMatch(/visualPrompt[^\n]*İngilizce/);
    expect(butce).toMatch(/visualPrompt[^\n]*""/);
    // Derinlik (kural g): uzman notu ve ev rehberi içerik yuvalı, çıplak tavan değil.
    expect(butce).toMatch(/expertNotes[^\n]*4–6 cümle/);
    expect(butce).toMatch(/expertNotes[^\n]*ilerleme ölçütü/);
    expect(butce).toMatch(/expertNotes[^\n]*hata anında/);
    // Uzman notu sese/seviyeye/tanıya özgü, kalıp yok — tek yerde (bütçe satırı; tur 2'de çerçevedeki kopya kalktı).
    expect(butce).toMatch(/expertNotes[^\n]*yapışabilen cümle yazılmaz/);
    expect(say(rota.SYSTEM_PROMPT, "yapışabilen cümle yazılmaz")).toBe(1);
    expect(butce).toMatch(/cueTypes[^\n]*tam 3/);
    expect(butce).toMatch(/homeGuidance[^\n]*4–5 cümle/);
    expect(butce).toMatch(/homeGuidance[^\n]*ödül/i);
  });

  it("öz-denetim 4–6 numaralı madde, tek kutuplu soru ('… mı?'): hedef harf/pozisyon, banka, word dolu, visualPrompt, sese özgü not, JSON", () => {
    const oz = bolum(rota.SYSTEM_PROMPT, "ÖZ-DENETİM", ETIK_SINIR);
    const maddeler = oz.split("\n").filter((l) => /^\d\. /.test(l));
    expect(maddeler.length).toBeGreaterThanOrEqual(4);
    expect(maddeler.length).toBeLessThanOrEqual(6);
    for (const m of maddeler) expect(m).toMatch(/m[ıiuü]\?$/);
    expect(oz).toMatch(/hedef harf/i);
    expect(oz).toMatch(/pozisyon/i);
    expect(oz).toMatch(/banka/i);
    expect(oz).toMatch(/word/);
    expect(oz).toMatch(/visualPrompt/);
    expect(oz).toMatch(/sese, seviyeye, tanıya özgü/);
    expect(oz).toContain('"hasta/terapist"');
    expect(oz).toMatch(/JSON/);
    expect(oz).toContain("listeyi çıktıya YAZMA");
  });
});

/** Eval PII tuzak teli (`adIziKonum`): katlanmış metinde fikstür adı bir sözcüğün BAŞINDA geçerse koşu durur
    ("durum" → Duru, "çanta" → Can, "adapte" → Ada, "emir kipi" → Emir). Prompt'un sabit metni ve sade bir
    kullanıcı prompt'u bu adların hiçbirini taşımamalı. Artikülasyon fikstürlerinin ilk adları. */
const FIKSTUR_ADLARI = ["Kerem", "Duru", "Emir", "Ada", "Yusuf", "Zeynep", "Mert", "Elif", "Can", "Nehir", "Berk", "Selin"];
describe("PII tuzak teli", () => {
  it("sistem prompt'u ve öğrencisiz kullanıcı prompt'ları fikstür adlarını sözcük başında taşımaz", () => {
    const metinler = [
      rota.SYSTEM_PROMPT,
      ...(["isolated", "syllable", "word", "sentence", "contextual"] as const).map((level) => kur({ level, targetSounds: ["/ş/"] }, "", null, "")),
      kur({}, "", yetiskin, "34 yaşında"),
    ];
    for (const m of metinler) {
      const k = katla(m);
      for (const ad of FIKSTUR_ADLARI) {
        const re = new RegExp(`(?<![a-z])${katla(ad)}`, "u");
        const hit = re.exec(k);
        expect(hit, `'${ad}' → …${k.slice(Math.max(0, (hit?.index ?? 0) - 20), (hit?.index ?? 0) + 25)}…`).toBeNull();
      }
    }
  });
});

describe("yetiskinMi", () => {
  it("önce ageText, yoksa doğum yılı; 18 sınır dahil; ikisi de yoksa çocuk", () => {
    expect(rota.yetiskinMi(yetiskin, "34 yaşında")).toBe(true);
    expect(rota.yetiskinMi(yetiskin, "")).toBe(true);
    expect(rota.yetiskinMi({ ...yetiskin, birthDate: null }, "34 yaşında")).toBe(true);
    expect(rota.yetiskinMi({ ...yetiskin, birthDate: null }, "18 yaşında")).toBe(true);
    expect(rota.yetiskinMi({ ...yetiskin, birthDate: null }, "17 yaşında")).toBe(false);
    expect(rota.yetiskinMi({ ...yetiskin, birthDate: null }, "")).toBe(false);
    expect(rota.yetiskinMi(cocuk, "6 yaşında")).toBe(false);
    expect(rota.yetiskinMi(null, "")).toBe(false);
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
    expect(RUMUZ.exec(kur())?.[2]).toBe("Hazal");
  });

  it("parametreler bugünkü etiketlerle", () => {
    const p = kur({ level: "isolated" });
    expect(p).toContain("- Hedef ses(ler): /ş/");
    expect(p).toContain("- Ses pozisyonu: Başta, Ortada");
    expect(p).toContain("- Alıştırma seviyesi: İzole Ses");
    expect(p).toContain("- Kelime/öğe sayısı: 10");
    expect(p).not.toContain("Banka");
  });

  it.each([
    ["isolated", /İzole Ses, 10 öğe, pozisyon Başta, Ortada → items: word = yalnız hedef sesten kurulu tekrar deseni[^\n]*visualPrompt yok; banka: yok\.$/],
    ["syllable", /Hece Düzeyi, 10 öğe, pozisyon Başta, Ortada → items: word = hece \+ syllableType[^\n]*exampleWord[^\n]*visualPrompt yok; banka: yok\.$/],
  ] as const)("odak: %s → seviye biçimi tek satır, banka yok (öğe sayısı istekten)", (level, cipa) => {
    const odak = odakSatir(kur({ level }));
    expect(odak).toMatch(cipa);
    expect(odak).toBe(`Odak: ${rota.odakSatiri({ ...govde, level }, null)}`);
    expect(odak).not.toMatch(/cümlelik paragraf/);
  });

  it("odak: kelime düzeyi + banka → items [] (sistem ekler), yalnız dört alan; banka kelimeleri parametrede sırayla", () => {
    const { p, bank } = bankaIle({ level: "word", itemCount: 15 });
    expect(bank.length).toBeGreaterThan(0);
    expect(p).toContain(`- Banka kelimeleri (${bank.length}`);
    expect(p).toContain(bank.join(", "));
    const odak = odakSatir(p);
    expect(odak).toMatch(/^Odak: Kelime Düzeyi, 15 öğe, pozisyon Başta, Ortada → items: \[\][^\n]*title, expertNotes, cueTypes, homeGuidance; banka: verildi, yalnız bu kelimeler\.$/);
    expect(odak).not.toMatch(/cümlelik paragraf/);
  });

  it("odak: cümle düzeyi + banka → öğe sayısı BANKA kadar, 'sentence' tek cümle ≤ 10 kelime; paragraf istemez", () => {
    const { p, bank } = bankaIle({ level: "sentence", itemCount: 10 });
    const odak = odakSatir(p);
    expect(odak).toMatch(new RegExp(`^Odak: Cümle Düzeyi, ${bank.length} öğe, pozisyon Başta, Ortada → items: word \\+ syllableBreak[^\\n]*"sentence" = o kelimeyi içeren tek cümle \\(≤ 10 kelime\\); banka: verildi, yalnız bu kelimeler\\.$`));
    expect(p).not.toMatch(/cümlelik paragraf/);
    expect(p).toContain(bank.join(", "));
  });

  it("odak: bağlam düzeyi → 'sentence' alanına 3-4 cümlelik paragraf (articulationContextual.test.ts sözleşmesi)", () => {
    const { p, bank } = bankaIle({ level: "contextual", itemCount: 10 });
    const odak = odakSatir(p);
    expect(odak).toMatch(/"sentence"[^\n]*3-4 cümlelik paragraf/);
    expect(odak).toMatch(new RegExp(`^Odak: Bağlam İçi, ${bank.length} öğe, `));
    expect(odak).toMatch(/; banka: verildi, yalnız bu kelimeler\.$/);
  });

  it("banka istenenden kısaysa parametre satırı bunu söyler; istenen sayı yine parametrede", () => {
    // /j/ bankası: üç pozisyonda 25 istenince 19 gelir (bkz. evals adapter.selftest).
    const { p, bank } = bankaIle({ level: "word", targetSounds: ["/j/"], positions: ["initial", "medial", "final"], itemCount: 25 });
    expect(bank.length).toBeLessThan(25);
    expect(p).toContain("- Kelime/öğe sayısı: 25");
    expect(p).toMatch(new RegExp(`- Banka kelimeleri \\(${bank.length}; istenen 25, banka bu kadar`));
    expect(odakSatir(p)).toMatch(new RegExp(`^Odak: Kelime Düzeyi, ${bank.length} öğe, `));
  });

  it("odak satırı tek satırdır ve hemen hatırlatmadan önce gelir", () => {
    const p = kur();
    const odak = odakSatir(p);
    expect(p.indexOf(odak) + odak.length + 2).toBe(p.indexOf("Son hatırlatma:"));
  });

  it("iki hatırlatma sonda tek satırda: hedef harf her kelimede + uzman notu sese ve seviyeye özgü", () => {
    const p = kur();
    const son = p.slice(p.indexOf("Son hatırlatma: "));
    expect(son).not.toContain("\n");
    expect(son).toBe("Son hatırlatma: Hedef harf her kelimede. Uzman notu bu sese ve seviyeye özgü.");
  });

  it("yetişkin öğrencide (18+) parametrelere koddan satır eklenir: iş/günlük yaşam, 'veli/çocuğunuz/oyun' yok, rehber kendisine; çocukta yok", () => {
    const blokY = "Öğrenci: Meral, 34 yaş\nÇalışma alanı: Konuşma\nTanı: Yetişkin rotasizm; iş toplantılarında hatalar artıyor.";
    const p = kur({ level: "contextual" }, blokY, yetiskin, "34 yaşında");
    const satir = p.split("\n").find((l) => l.startsWith("- Öğrenci yetişkin (34 yaş)"))!;
    expect(satir).toBeDefined();
    expect(satir).toMatch(/iş/);
    expect(satir).toContain('"veli"');
    expect(satir).toContain('"çocuğunuz"');
    expect(satir).toContain('"oyun"');
    expect(satir).toMatch(/homeGuidance[^\n]*"siz"/);
    expect(p.indexOf(satir)).toBeLessThan(p.indexOf("Odak:"));
    expect(kur({}, blokY, null, "34 yaşında")).toContain("- Öğrenci yetişkin (34 yaş)");
    expect(kur()).not.toContain("Öğrenci yetişkin");
    expect(kur({}, blok, { ...cocuk, birthDate: null }, "17 yaşında")).not.toContain("Öğrenci yetişkin");
  });

  it("boş blokta (öğrencisiz) ÖĞRENCİ başlığı yok; parametreler, odak ve hatırlatma yine var; blok verilmemişse de çalışır", async () => {
    const p = kur({}, "", null, "");
    expect(p).not.toContain("ÖĞRENCİ");
    expect(p.startsWith("PARAMETRELER\n")).toBe(true);
    expect(p).toContain("Odak: Cümle Düzeyi");
    expect(p).toContain("Son hatırlatma:");
    expect(kur({}, "  \n ", null, "")).not.toContain("ÖĞRENCİ");
    // Eski sözleşme testleri (articulationContextual.test.ts) ctx'i `studentBlock`süz kurar.
    const eski = await (captured.config!.buildUserPrompt as (...a: unknown[]) => string | Promise<string>)(
      { ...govde, studentId: undefined }, null, "", { therapistId: "t1", scrubText: (t: string | null | undefined) => t ?? "", stash: {} },
    );
    expect(eski.startsWith("PARAMETRELER\n")).toBe(true);
  });
});

describe("rota sözleşmesi (A4: değişmeyenler)", () => {
  it("rota dışa aktarılan buildUserPrompt'u kullanır; toolType/responseKey/cost/maxTokens/studentRequired aynı", () => {
    expect(captured.config?.buildUserPrompt).toBe(rota.buildUserPrompt);
    expect(captured.config).toMatchObject({ toolType: "ARTICULATION_DRILL", responseKey: "drill", cost: 1, maxTokens: 8000, studentRequired: false });
  });

  it("enrichContent: banka yolunda kelime/hece/görsel bankadan otoriter; banka dışında hedef harfsiz öğe elenir", async () => {
    const data = { ...govde, level: "sentence" as const } as Body;
    const c = { ...ctx, stash: {} as { bankWords?: Array<{ word: string }> } };
    rota.buildUserPrompt(data, cocuk, "6 yaşında", c);
    const bank = c.stash.bankWords!;
    const content: Record<string, unknown> = { items: bank.map(() => ({ word: "yanlış", sentence: "Cümle." })) };
    await captured.config!.enrichContent(content, data, c);
    expect((content.items as Array<{ word: string; sentence: string }>).map((i) => i.word)).toEqual(bank.map((w) => w.word));
    expect((content.items as Array<{ sentence: string }>)[0]!.sentence).toBe("Cümle.");

    const hece: Record<string, unknown> = { items: [{ word: "şa" }, { word: "ka" }] };
    await captured.config!.enrichContent(hece, { ...govde, level: "syllable" }, { stash: {} });
    expect(hece.items).toEqual([{ word: "şa" }]);
  });
});
