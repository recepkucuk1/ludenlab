// apps/hub/src/app/studio/api/tools/social-story/prompt.test.ts
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ETIK_SINIR } from "@/lib/prompts/ortakBloklar";
import { promptIddialari, promptPenceresi } from "@studio/lib/prompts/iskelet";

/**
 * Sosyal hikâye A1 prompt sözleşmesi (Faz 2 / Task 6). Model çıktısı birim testte ölçülemez; kilitlenen şey
 * MODELE GİDEN METİNDİR: sistem prompt'u pencerede ve A1 sırasında, şema alan adları aynen (istemci, PDF ve
 * görsel rotası `type/text/visualPrompt` okur), Carol Gray çerçevesi / özgüllük / karşıt örnek / öz-denetim
 * yerinde; kullanıcı prompt'unda ortak öğrenci bloğu önce, odak satırı uzunluk + ortamdan türetilmiş, iki
 * hatırlatma sonda.
 *
 * Rota `createToolHandler`'ı kurulumda çağırır ve kapı DB/oturum modüllerini çeker; taklit yalnız config'i
 * yakalar (homework/prompt.test.ts deseni). Böylece dışa aktarılan prompt'un rotaya BAĞLANDIĞI da doğrulanır.
 */
type Length = "short" | "medium" | "long";
type Environment = "Okul" | "Ev" | "Park" | "Market" | "Hastane" | "Rehabilitasyon merkezi";
type Body = {
  studentId: string;
  situation: string;
  environment: Environment;
  length: Length;
  visualSupport?: boolean;
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

/** Bugünkü şema alan adları — istemci (`SocialStoryTool`), PDF ve `images/route.ts` bunları okur; A4: değişmez. */
const ALANLAR = ["title", "sentences", "type", "text", "visualPrompt", "expertNotes", "homeGuidance"];
const TIPLER = ["descriptive", "perspective", "directive", "affirmative"] as const;
const UZUNLUKLAR: ReadonlyArray<[Length, string, string]> = [
  ["short", "Kısa", "3–5"],
  ["medium", "Orta", "6–10"],
  ["long", "Uzun", "11–15"],
];
const ORTAMLAR: readonly Environment[] = ["Okul", "Ev", "Park", "Market", "Hastane", "Rehabilitasyon merkezi"];

const govde: Body = { studentId: "s1", situation: "Markette istediği şeker alınmayınca sakin kalmak", environment: "Market", length: "medium" };
const blok = [
  "Öğrenci: Hazal, 4 yaş",
  "Çalışma alanı: Dil",
  "Uzman notları: Dinozorlara bayılıyor. Zorlanınca kulaklarını kapatıyor.",
].join("\n");
const ctx = { stash: {} as Record<string, unknown>, therapistId: "t1", scrubText: (t: string | null | undefined) => t ?? "", studentBlock: blok };
const kur = (d: Partial<Body> = {}, studentBlock = blok, ageText = "4 yaşında") => rota.buildUserPrompt({ ...govde, ...d }, null, ageText, { ...ctx, studentBlock });

/** Koşturucunun rumuz deseni (`evals/lib/runner.ts` RUMUZ_DESENI) AYNEN: kimlik satırı tiresiz, ardında "Çalışma alanı:". */
const RUMUZ = /(?:- (?:Ad|Öğrenci|İsim)|Öğrenci adı): ([^,\n]+)|^Öğrenci: ([^,\n]+)(?:, \d+ yaş)?$(?=\nÇalışma alanı: )/m;

/** Eval düzeneğinin zorunluluk kipi (`evals/lib/sharedChecks.ts` ZORUNLU) — iyi örnek bunu geçmeli. */
const ZORUNLU = /(?<=\p{L})(?:malı(?:yım|sın(?:ız)?|yız|dır|lar)|meli(?:yim|sin(?:iz)?|yiz|dir|ler))(?!\p{L})|(?<=\p{L})(?:malı|meli)(?=\s*(?:[.!?…]|$))|(?<!\p{L})zorunda(?:yım|sın(?:ız)?|yız|dır|lar)?(?!\p{L})|(?<!\p{L})(?:gerek(?:ir|iyor)|lazım|şart(?:tır)?)(?!\p{L})/u;

/** `baslik` ile `sonraki` başlık arasındaki bölüm metni (iskeletin A1 başlıkları). */
function bolum(p: string, baslik: string, sonraki: string): string {
  const a = p.indexOf(baslik);
  const b = p.indexOf(sonraki, a + 1);
  expect(a, baslik).toBeGreaterThanOrEqual(0);
  expect(b, sonraki).toBeGreaterThan(a);
  return p.slice(a, b);
}
const say = (p: string, parca: string) => p.split(parca).length - 1;
const kelime = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

describe("SYSTEM_PROMPT (A1)", () => {
  it("pencere 1200–2000 token, 7 şema alanı aynen, yasak sözcük yok; rota bu metni gönderir", () => {
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

  it("rol: çocuk okur/dinler, uzman ve veli okutur; birinci tekil, sıcak, somut; notlar uzmana (dil kuralı orada da), rehber veliye (yetişkinde kendisine/yakınına)", () => {
    const rol = bolum(rota.SYSTEM_PROMPT, "ROL\n", "KLİNİK ÇERÇEVE");
    expect(rol).toMatch(/ÇOCUK/);
    expect(rol).toMatch(/dinle(r|yen)/);
    expect(rol).toMatch(/uzman/i);
    expect(rol).toMatch(/veli/i);
    expect(rol).toMatch(/birinci tekil/i);
    expect(rol).toMatch(/sıcak/);
    expect(rol).toMatch(/somut/);
    // expertNotes: terim serbest AMA "öğrenci/uzman" kuralı orada da geçerli ("mesleki dil serbest" yazılmaz: dil kuralı tüm çıktıyı tarar).
    expect(rol).toMatch(/expertNotes[^\n]*"öğrenci\/uzman"/);
    expect(rol).not.toMatch(/mesleki dil serbest/);
    expect(rol).toMatch(/homeGuidance[^\n]*veli/);
    expect(rol).toContain(`${rota.YETISKIN_YASI} yaş`);
    expect(rol).toMatch(/kendisine ya da yakınına/);
    expect(rol).toMatch(/"veli", "çocuğunuz" yazılmaz/);
  });

  it("klinik çerçeve: Gray oranı ≥ 2:1 (sayılarla), '…ebilirim' kipi, tek fikir, dört aşamalı sıra, yaş→kelime tablosu, kaygıda normalleştirme, gerçeğe uygunluk, ödül/ceza yok", () => {
    const k = bolum(rota.SYSTEM_PROMPT, "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK KURALLARI");
    expect(k).toMatch(/Carol Gray/);
    expect(k).toContain("İKİ KATI");
    expect(k).toMatch(/üçte birini geçmez/);
    // Oran sayılarla örneklenir (model hesaplamaz, okur); örneklerin her biri ≥ 2:1'i sağlamalı.
    const ornekler = [...k.matchAll(/(\d+) cümlede (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
    expect(ornekler.length).toBeGreaterThanOrEqual(2);
    for (const [toplam, yonlendirici] of ornekler) expect(toplam - yonlendirici, `${toplam} cümlede ${yonlendirici}`).toBeGreaterThanOrEqual(2 * yonlendirici);
    for (const t of TIPLER) expect(k, t).toContain(t);
    expect(k).toContain("deneyebilirim");
    expect(k).toContain("yapabilirim");
    expect(k).toContain("-malı/-meli");
    expect(k).toContain("TEK fikir");
    // Sıra: durum → başkalarının duygusu → benim yapabileceğim → olumlu sonuç
    expect(k.indexOf("durum")).toBeGreaterThan(0);
    expect(k.indexOf("durum")).toBeLessThan(k.indexOf("başkaları"));
    expect(k.indexOf("başkaları")).toBeLessThan(k.indexOf("ben ne yapabilirim"));
    expect(k.indexOf("ben ne yapabilirim")).toBeLessThan(k.indexOf("olumlu sonuç"));
    expect(k).toContain("4 yaş ve altı ≤ 7 kelime");
    expect(k).toMatch(/5–7 yaş ≤ \d+/);
    expect(k).toMatch(/8 yaş ve üstü ≤ \d+/);
    expect(k).toContain("normaldir");
    // "Bazen … hissederim, bu normaldir." iki kısa yan cümle = TEK fikir (tek-fikir kuralıyla çelişmez).
    expect(k).toMatch(/normaldir\."[^\n]*tek fikir sayılır/);
    expect(k).toContain("hiç acımaz");
    expect(k).toMatch(/kısa sürer/);
    expect(k).toMatch(/Ödül/);
    expect(k).toMatch(/ceza/);
  });

  it("özgüllük: ortak dört kural bir kez ve önde; araca özgü ekler arkada (ilgi alanı karakter/nesne, ortam her görselde, visualPrompt sahne, uzman notu strateji, tanı konu değil)", () => {
    const p = rota.SYSTEM_PROMPT;
    expect(say(p, "profildeki en az bir somut veriye")).toBe(1);
    expect(say(p, "İlgi alanı verilmişse")).toBe(1);
    expect(say(p, "Geçmiş çalışmalar verilmişse")).toBe(1);
    const o = bolum(p, "ÖZGÜLLÜK KURALLARI", "ZAYIF ÖRNEK");
    expect(o.indexOf("profildeki en az bir somut veriye")).toBeLessThan(o.indexOf("KARAKTER"));
    // İlgi alanı blokta etiketsizdir: model onu "Uzman notları" içinde arar.
    expect(o).toMatch(/İlgi alanı[^\n]*"Uzman notları" içinde/);
    expect(o).toContain("KARAKTER");
    expect(o).toContain("NESNE");
    expect(o).toContain("environment");
    expect(o).toMatch(/her visualPrompt/);
    expect(o).toContain("SAHNE");
    expect(o).toMatch(/çeviri/);
    expect(o).toMatch(/İngilizce/);
    expect(o).toMatch(/Stil adı[^\n]*yazılmaz/);
    expect(o).toMatch(/Uzman notları/);
    expect(o).toMatch(/Dikkat edilmesi gerekenler/);
    // Hastane (ss-04): kişiler mesleğiyle, çocuk her yerde "ben"; canlandırmada da çocuğun kendi rolü; "hasta" hiçbir alanda.
    expect(o).toMatch(/Hastane[^\n]*"doktor"[^\n]*"hemşire"/);
    expect(o).toMatch(/"başka çocuklar ve yetişkinler"/);
    expect(o).toMatch(/çocuk her yerde "ben"dir/);
    expect(o).toMatch(/canlandırma[^\n]*"kolunu uzatan çocuk"/);
    expect(o).toMatch(/"hasta" sözcüğü hiçbir alanda yazılmaz/);
    expect(o).toMatch(/Tanı/);
  });

  it("karşıt örnek: zayıf = zorunluluk + soyut değer; iyi = ortam + duygu adlandırma/normalleştirme + '…ebilirim' + somut söz + olumlu kapanış; iyi örnek kendi kurallarına (Gray oranı dahil) uyar", () => {
    const p = rota.SYSTEM_PROMPT;
    const zayif = p.slice(p.indexOf("ZAYIF ÖRNEK"), p.indexOf("İYİ ÖRNEK"));
    const iyi = p.slice(p.indexOf("İYİ ÖRNEK"), p.indexOf("BİÇİM\n"));
    // Zayıf: zorunluluk kipi + soyut değer sözcüğü (tam da yasaklanan iki şey).
    const zayifMetin = zayif.slice(zayif.indexOf(": ") + 2).trim();
    expect(ZORUNLU.test(zayifMetin.toLocaleLowerCase("tr-TR"))).toBe(true);
    expect(zayifMetin).toMatch(/iyidir/);
    // İyi: ortam → duyguyu adlandırıp normalleştirme → "…ebilirim" + tırnaklı somut söz → olumlu kapanış; prompt'un kendi
    // kurallarına uyar (zorunluluk kipi yok, 4 cümle, her cümle ≤ 7 kelime = 4 yaş sınırı, birinci tekil, Gray oranı).
    const metin = iyi.slice(iyi.indexOf(": ") + 2).trim();
    expect(metin).toMatch(/^Markette/);
    expect(metin).toMatch(/normaldir/);
    expect(metin).toMatch(/(?:e|a)bilirim\b/);
    expect(metin).toMatch(/'[^']+' diyebilirim/);
    expect(ZORUNLU.test(metin.toLocaleLowerCase("tr-TR"))).toBe(false);
    const cumleler = metin.split(/(?<=[.!?])\s+/).filter(Boolean);
    expect(cumleler.length).toBe(4);
    for (const c of cumleler) expect(kelime(c), c).toBeLessThanOrEqual(7);
    expect(metin).not.toMatch(/hasta|terapist|ödül|aferin/i);
    // Gray: yönlendirici ("…ebilirim" kipli) cümleler ≤ betimleyicilerin yarısı; son cümle yönlendirici değil (olumlu kapanış).
    const yonlendirici = cumleler.filter((c) => /(?:e|a)bilirim\b/.test(c));
    expect(yonlendirici.length).toBeGreaterThanOrEqual(1);
    expect(cumleler.length - yonlendirici.length).toBeGreaterThanOrEqual(2 * yonlendirici.length);
    expect(/(?:e|a)bilirim\b/.test(cumleler[cumleler.length - 1])).toBe(false);
  });

  it("biçim: tek parça JSON; dört tip (positive değil); cümle sayısı length'ten aynen; visualPrompt ≤ 20 kelime; expertNotes ≤ 4, homeGuidance ≤ 3 cümle", () => {
    const b = bolum(rota.SYSTEM_PROMPT, "BİÇİM\n", "ÖZ-DENETİM");
    expect(b).toMatch(/SADECE/);
    expect(b).toMatch(/JSON/);
    expect(b).toContain('"type": "descriptive|perspective|directive|affirmative"');
    const butce = b.slice(b.indexOf("Alan bütçeleri:"));
    for (const alan of ["title", "sentences", "type", "text", "visualPrompt", "expertNotes", "homeGuidance"]) {
      expect(butce, alan).toContain(alan);
    }
    expect(butce).toMatch(/title[^\n]*≤ 6 kelime/);
    expect(butce).toContain("short 3–5, medium 6–10, long 11–15");
    expect(butce).toMatch(/aralığın dışına çıkılmaz/);
    // Taban çıktıları iki vakada "positive" tipi üretmişti (tip_gecerli < 1): yasak açıkça yazılı.
    expect(butce).toMatch(/type[^\n]*"positive" yazılmaz/);
    // Olumsuz buyruklar ad gibi okunmaz: "yazma/çıkma" yerine "yazılmaz/çıkılmaz" (iskeletin kendi "YAZMA"sı hariç).
    expect(b).not.toMatch(/ (yazma|çıkma|ekleme)\b/);
    expect(butce).toMatch(/visualPrompt[^\n]*≤ 20 kelime/);
    // Taban/alt sınırlı bütçeler; uzman notu ilk cümlesiyle bir blok verisine bağlanır (hakem: "öğrenciye özgü değil"),
    // pekiştirme çocuğun KENDİ rolünde canlandırmadır ("rol oyunu"nda çocuk 'hasta' rolüne düşüyordu).
    expect(butce).toMatch(/expertNotes[^\n]*3–4 cümle/);
    expect(butce).toMatch(/expertNotes[^\n]*ilk cümle bloktaki bir veriye/);
    expect(butce).toMatch(/expertNotes[^\n]*çocuğun kendi rolünde kısa canlandırma/);
    expect(butce).not.toMatch(/rol oyunu/);
    expect(butce).toMatch(/homeGuidance[^\n]*2–3 cümle/);
    expect(butce).toMatch(/homeGuidance[^\n]*yetişkinde öğrencinin kendisine/);
  });

  it("öz-denetim 4–6 numaralı madde: Gray oranı, birinci tekil, cümle sayısı, visualPrompt sahne, ödül/ceza yok, tırnaklı 'hasta/terapist', JSON", () => {
    const oz = bolum(rota.SYSTEM_PROMPT, "ÖZ-DENETİM", ETIK_SINIR);
    const maddeler = oz.split("\n").filter((l) => /^\d\. /.test(l));
    expect(maddeler.length).toBeGreaterThanOrEqual(4);
    expect(maddeler.length).toBeLessThanOrEqual(6);
    expect(oz).toMatch(/iki katı/i);
    expect(oz).toMatch(/birinci tekil/i);
    expect(oz).toMatch(/cümle sayısı/i);
    expect(oz).toMatch(/visualPrompt/);
    expect(oz).toMatch(/sahne/i);
    expect(oz).toMatch(/ödül/i);
    expect(oz).toMatch(/ceza/i);
    expect(oz).toContain('"hasta/terapist"');
    expect(oz).toMatch(/yetişkin[^\n]*"veli\/çocuğunuz"/);
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
    expect(p).not.toContain("- Tanı:");
  });

  it("rumuz koşturucunun deseniyle okunur (bloğun ilk satırı)", () => {
    const m = RUMUZ.exec(kur());
    expect(m?.[1] ?? m?.[2]).toBe("Hazal");
  });

  it("parametreler etiketli ve bugünkü etiketlerle: durum, ortam, uzunluk (aralığıyla), görsel kuralı", () => {
    const p = kur();
    expect(p).toContain("- Durum: Markette istediği şeker alınmayınca sakin kalmak");
    expect(p).toContain("- Ortam: Market");
    expect(p).toContain("- Hikâye uzunluğu: Orta (6–10 cümle)");
    expect(p).toMatch(/- Görsel: [^\n]*İngilizce[^\n]*visualPrompt/);
    expect(kur({ length: "short" })).toContain("- Hikâye uzunluğu: Kısa (3–5 cümle)");
    expect(kur({ length: "long", environment: "Hastane" })).toContain("- Hikâye uzunluğu: Uzun (11–15 cümle)");
    expect(kur({ length: "long", environment: "Hastane" })).toContain("- Ortam: Hastane");
  });

  it.each(UZUNLUKLAR)("odak: uzunluk %s → etiket %s, aralık %s cümle (koddan türetilir)", (length, etiket, aralik) => {
    expect(rota.LENGTH_LABEL[length]).toBe(etiket);
    expect(rota.CUMLE_ARALIGI[length]).toBe(aralik);
    const beklenen = `Odak: ${etiket} → ${aralik} cümle; ortam Market → her görselde bu ortam.`;
    expect(kur({ length })).toContain(beklenen);
    expect(rota.odakSatiri(length, "Market")).toBe(beklenen.slice("Odak: ".length));
  });

  it.each(ORTAMLAR)("odak: ortam %s odak satırında aynen", (environment) => {
    expect(kur({ environment })).toContain(`; ortam ${environment} → her görselde bu ortam.`);
  });

  it("odak satırı tek satırdır ve hemen hatırlatmadan önce gelir", () => {
    const p = kur();
    const odak = p.split("\n").find((l) => l.startsWith("Odak: "))!;
    expect(odak).toBe("Odak: Orta → 6–10 cümle; ortam Market → her görselde bu ortam.");
    expect(p.indexOf(odak) + odak.length + 2).toBe(p.indexOf("Son hatırlatma:"));
  });

  it("iki hatırlatma sonda tek satırda: yönlendirici kipi + visualPrompt sahne", () => {
    const p = kur();
    expect(rota.HATIRLATMA).toHaveLength(2);
    expect(rota.HATIRLATMA[0]).toContain("deneyebilirim/yapabilirim");
    expect(rota.HATIRLATMA[1]).toContain("visualPrompt");
    expect(rota.HATIRLATMA[1]).toMatch(/çeviri değil sahne/);
    expect(p.endsWith(`Son hatırlatma: ${rota.HATIRLATMA.join(" ")}`)).toBe(true);
  });

  it("boş blokta ÖĞRENCİ başlığı yok; parametreler, odak ve hatırlatma yine var", () => {
    const p = kur({}, "");
    expect(p).not.toContain("ÖĞRENCİ");
    expect(p.startsWith("PARAMETRELER\n")).toBe(true);
    expect(p).toContain("Odak: Orta → 6–10 cümle");
    expect(p).toContain("Son hatırlatma:");
    expect(kur({}, "  \n ")).not.toContain("ÖĞRENCİ");
  });

  describe("yetişkin öğrenci (koşul koddan: ageText ya da birthDate)", () => {
    const yetiskinBlok = "Öğrenci: Deniz, 34 yaş\nÇalışma alanı: Dil";

    it("çocukta Okuyan satırı yok, iki hatırlatma", () => {
      const p = kur();
      expect(p).not.toContain("- Okuyan:");
      expect(p).not.toMatch(/Son hatırlatma:[^\n]*Yetişkin/);
      expect(p.endsWith(`Son hatırlatma: ${rota.HATIRLATMA.join(" ")}`)).toBe(true);
    });

    it("18 yaş ve üzeri (ageText): Okuyan satırı parametrelerin sonunda, üçüncü hatırlatma 'veli/çocuğunuz' yok", () => {
      const p = kur({}, yetiskinBlok, "34 yaşında");
      expect(p).toContain(rota.YETISKIN_PARAMETRE(34));
      expect(p).toMatch(/- Okuyan: öğrenci 34 yaşında, yetişkin[^\n]*kendisine ya da yakınına[^\n]*"veli", "çocuğunuz" yazılmaz/);
      expect(p.indexOf("- Görsel:")).toBeLessThan(p.indexOf("- Okuyan:"));
      expect(p.indexOf("- Okuyan:")).toBeLessThan(p.indexOf("Odak:"));
      expect(p.endsWith(`Son hatırlatma: ${[...rota.HATIRLATMA, rota.YETISKIN_HATIRLATMA].join(" ")}`)).toBe(true);
      expect(rota.YETISKIN_HATIRLATMA).toContain('"veli/çocuğunuz"');
      // Hikâyenin kendisi de yetişkin diline döner.
      expect(rota.YETISKIN_PARAMETRE(34)).toMatch(/yetişkin günlük dilinde[^\n]*"çocuk" yazılmaz/);
    });

    it("sınır: 17 çocuk, 18 yetişkin; yaş bilinmiyorsa çocuk varsayılır", () => {
      expect(kur({}, blok, "17 yaşında")).not.toContain("- Okuyan:");
      expect(kur({}, blok, `${rota.YETISKIN_YASI} yaşında`)).toContain("- Okuyan:");
      expect(kur({}, blok, "")).not.toContain("- Okuyan:");
      expect(rota.yasYili(null, "")).toBeNull();
      expect(rota.yasYili(null, "7 yaşında")).toBe(7);
    });

    it("ageText boşsa doğum tarihinden (kapının formülüyle: yıl farkı)", () => {
      const yil = new Date().getFullYear();
      const yetiskin = { birthDate: new Date(`${yil - 34}-07-30`) };
      const cocuk = { birthDate: new Date(`${yil - 6}-05-14`) };
      expect(rota.yasYili(yetiskin, "")).toBe(34);
      expect(rota.yasYili(cocuk, "")).toBe(6);
      // ageText varsa o kazanır (kapı her ikisini aynı tarihten üretir; test yalnız önceliği kilitler).
      expect(rota.yasYili(yetiskin, "6 yaşında")).toBe(6);
      const p = rota.buildUserPrompt(govde, yetiskin, "", { ...ctx, studentBlock: yetiskinBlok });
      expect(p).toContain(rota.YETISKIN_PARAMETRE(34));
      expect(rota.buildUserPrompt(govde, cocuk, "", ctx)).not.toContain("- Okuyan:");
    });
  });
});

describe("rota sözleşmesi (A4: değişmeyenler)", () => {
  it("rota dışa aktarılan buildUserPrompt'u kullanır; toolType/responseKey/cost aynı", () => {
    expect(captured.config?.buildUserPrompt).toBe(rota.buildUserPrompt);
    expect(captured.config).toMatchObject({ toolType: "SOCIAL_STORY", responseKey: "story", cost: 1 });
  });

  it("enrichContent sunucu alanlarını (situation, environment, length) istekten yazar", async () => {
    const content: Record<string, unknown> = { situation: "modelin yazdığı", length: "yanlış" };
    await captured.config!.enrichContent(content, { ...govde, environment: "Okul", length: "long" });
    expect(content).toMatchObject({ situation: govde.situation, environment: "Okul", length: "long" });
  });
});
