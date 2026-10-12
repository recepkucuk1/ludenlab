// apps/hub/src/app/studio/api/tools/matching-game/prompt.test.ts
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ETIK_SINIR } from "@/lib/prompts/ortakBloklar";
import { PROMPT_PENCERESI, promptIddialari, promptPenceresi } from "@studio/lib/prompts/iskelet";

/**
 * Kelime eşleştirme A1 prompt sözleşmesi (Faz 2 / Task 9). Model çıktısı birim testte ölçülemez; burada
 * kilitlenen şey MODELE GİDEN METİNDİR: sistem prompt'u pencerede ve A1 sırasında, şema alan adları aynen
 * (istemci `MatchingGameView`, PDF ve görsel rotası `images/route.ts` bunları okur), tek-eşleşme / zorluk-sıklık /
 * tür kuralları / görsel tutarlılığı / karşıt örnek / öz-denetim yerinde; kullanıcı prompt'unda ortak öğrenci
 * bloğu önce (öğrencisiz araçta blok yokken başlık da yok), odak satırı türe ve zorluğa göre koddan türetilmiş,
 * iki hatırlatma sonda, yetişkin öğrencide kitle satırı.
 *
 * Eval kontrollerinin (`evals/tools/studio/matching-game/checks.ts`) ölçtüğü her kural prompt'ta AÇIKÇA yazılı
 * olmalı: çift sayısı, id sırası, kart biçimi (kelime kartı ≤ 3 / zor 5, definition tek cümle, image_desc ≤ 2 cümle,
 * sentence '___'), tekrar yok (zincir / ters çift), görsel ya hepsinde ya hiçbirinde, İngilizce komut, tür/zorluk yankısı.
 *
 * Rota `createToolHandler`'ı kurulumda çağırır ve kapı DB/oturum modüllerini çeker; taklit yalnız config'i
 * yakalar (homework/prompt.test.ts deseni). Böylece dışa aktarılan prompt'un rotaya BAĞLANDIĞI da doğrulanır.
 */
type MatchType = "definition" | "image_desc" | "synonym" | "antonym" | "category" | "sentence";
type Difficulty = "easy" | "medium" | "hard";
type Body = {
  studentId?: string;
  matchType: MatchType;
  pairCount: "6" | "8" | "10" | "12";
  difficulty: Difficulty;
  theme?: string;
  goalTitle?: string;
};
type Config = {
  systemPrompt: string;
  toolType: string;
  responseKey: string;
  cost: number;
  studentRequired?: boolean;
  fallbackTitle: unknown;
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

/** Bugünkü şema alan adları — istemci, PDF ve görsel rotası bunları okur; A4: değişmez. */
const ALANLAR = ["title", "matchType", "difficulty", "pairs", "id", "cardA", "cardB", "hint", "visualPrompt", "instructions", "expertNotes", "adaptations"];
const TURLER: readonly MatchType[] = ["definition", "image_desc", "synonym", "antonym", "category", "sentence"];
const GORSELLI: readonly MatchType[] = ["image_desc"];
const GORSELSIZ: readonly MatchType[] = ["definition", "synonym", "antonym", "sentence"];

const govde: Body = { studentId: "s1", matchType: "synonym", pairCount: "10", difficulty: "medium", theme: "okul" };
const blok = [
  "Öğrenci: Hazal, 12 yaş",
  "Çalışma alanı: Dil",
  "Tanı: Gelişimsel dil bozukluğu; anlatı becerilerinde zorluk.",
  "Uzman notları: Utangaç, hata yapmaktan çekiniyor; yazarak yanıt vermeyi tercih ediyor. Kedilere ve çizgi romana meraklı.",
].join("\n");
const ctx = { stash: {} as Record<string, unknown>, therapistId: "t1", scrubText: (t: string | null | undefined) => t ?? "", studentBlock: blok };
/** Doğum yılı → kapıdaki `calcAgeYears` ile aynı yaklaşım (yıl farkı). */
const dogum = (yas: number) => new Date(`${new Date().getFullYear() - yas}-06-15`);
const cocuk = { birthDate: dogum(12) };
const yetiskin = { birthDate: dogum(34) };
const kur = (d: Partial<Body> = {}, studentBlock = blok, student: { birthDate: Date | null } | null = cocuk, ageText = "12 yaşında") =>
  rota.buildUserPrompt({ ...govde, ...d }, student, ageText, { ...ctx, studentBlock });
const odakSatir = (p: string) => p.split("\n").find((l) => l.startsWith("Odak: "))!;

/** Koşturucunun rumuz deseni (`evals/lib/runner.ts`): bloğun tiresiz `Öğrenci: <rumuz>, N yaş` satırı da okunur. */
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
  it("pencere 1200–2000 token (üstte ≥ 60 token pay), 12 şema alanı aynen, yasak sözcük yok; rota bu metni gönderir", () => {
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

  it("rol: uzman basar; DİL aracı (sesletim/artikülasyon değil — hedef ses şart değil); expertNotes uzmana, terim serbest ama 'öğrenci/uzman' geçerli", () => {
    const rol = bolum(rota.SYSTEM_PROMPT, "ROL\n", "KLİNİK ÇERÇEVE");
    expect(rol).toMatch(/uzman/);
    expect(rol).toContain("DİL");
    expect(rol).toMatch(/artikülasyon/);
    expect(rol).toMatch(/hedef ses/);
    expect(rol).toContain("expertNotes");
    expect(rol).toMatch(/terim serbest/);
    expect(rol).toContain('"öğrenci/uzman"');
    expect(rol).not.toMatch(/mesleki dil/);
  });

  it("klinik çerçeve: TEK ve KESİN eşleşme (zincir/ters çift yok, kategori adı tekrar edebilir), yankı yok, zorluk = sıklık + yaş yalnız kolay/ortayı kaydırır (zor her yaşta soyut) + yetişkin, tema tüm çiftlerde + günlük bağlam, altı tür (image_desc doğru/ayırt edici tarif; sentence ad/sıfat + dil bilgisi uyumu), görsel ya TÜM ya HİÇBİRİNDE", () => {
    const k = bolum(rota.SYSTEM_PROMPT, "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK KURALLARI");
    // `i` bayrağı Türkçe İ'yi katlamaz: büyük harfli biçimler aynen aranır.
    expect(k).toContain("TEK ve KESİN");
    expect(k).toMatch(/zincir/);
    expect(k).toMatch(/ters çift/);
    expect(k).toMatch(/iki kartta geçmez/);
    expect(k).toMatch(/kategori adı tekrar edebilir/);
    expect(k).toMatch(/KAPSAMAZ/);
    expect(k).toMatch(/yankıla/);
    expect(k).toContain('"X değil"');
    // Zorluk tanımları ve yaş → sıklık; yetişkin kaydı.
    expect(k).toMatch(/sözcük sıklığı/);
    expect(k).toMatch(/kolay → [^\n]*somut/);
    expect(k).toMatch(/orta → [^\n]*soyut/);
    expect(k).toMatch(/zor → [^\n]*soyut/);
    expect(k).toMatch(/zor → [^\n]*deyim/);
    // Yaş yalnız kolay ve ortayı kaydırır; zor her yaşta soyut kalır (tur 2: es-04'te 9 yaşın "zor"u kolaya kaymıştı).
    expect(k).toMatch(/[Yy]aş yalnız kolay ve orta/);
    expect(k).toMatch(/her yaşta soyut/);
    expect(k).toMatch(/18\+|18 yaş/);
    expect(k).toMatch(/çocuksu sözcük/);
    expect(k).toMatch(/profesyonel/);
    // Tema tüm çiftlerde; gerçek Türkçe kelime.
    expect(k).toContain("TÜM çiftler o temadan");
    expect(k).toMatch(/gerçek/);
    // Cümle ve tarifler günlük; tıbbi/klinik bağlam karta sızmaz (tur 2: "Doktor … öğrenciye ___ yazdı").
    expect(k).toMatch(/günlük/);
    expect(k).toMatch(/tıbbi/);
    // Altı tür tek satır tanımla, klinik çerçevede bir kez.
    for (const t of TURLER) {
      expect(k, t).toContain(`\n- ${t}: `);
      expect(say(rota.SYSTEM_PROMPT, `\n- ${t}: `), t).toBe(1);
    }
    expect(k).toMatch(/definition: [^\n]*TEK cümle/);
    expect(k).toMatch(/image_desc: [^\n]*≤ 2 cümle/);
    expect(k).toMatch(/image_desc: [^\n]*HER çiftte/);
    // image_desc tarifi gerçeğe uyar ve nesneyi oyundaki yakınlarından ayırır; uydurma parça yok (tur 2: çaydanlık hatası).
    expect(k).toMatch(/image_desc: [^\n]*DOĞRU/);
    expect(k).toMatch(/image_desc: [^\n]*ayıran/);
    expect(k).toMatch(/image_desc: [^\n]*uydurma/);
    expect(k).toMatch(/synonym: [^\n]*eş anlamlı/);
    expect(k).toMatch(/antonym: [^\n]*zıt anlamlı/);
    expect(k).toMatch(/category: [^\n]*kategori adı/);
    expect(k).toMatch(/sentence: [^\n]*___/);
    expect(k).toMatch(/sentence: [^\n]*tek alt çizgi değil/);
    // sentence: cardB ad/sıfat (eylem yazılmaz), yerleşince dil bilgisi kusursuz, boşluğa başka cardB oturmaz, bağlam tek başına belirler.
    expect(k).toMatch(/sentence: [^\n]*eylem yazılmaz/);
    expect(k).toMatch(/sentence: [^\n]*dil bilgisi/);
    expect(k).toMatch(/sentence: [^\n]*başka hiçbir cardB/);
    expect(k).toMatch(/sentence: [^\n]*tek başına belirler/);
    // Görsel kuralı: ya TÜM ya HİÇBİRİNDE; türe göre dağılım; İngilizce tek nesne; Türkçe/stil yok.
    expect(k).toContain("ya TÜM çiftlerde ya HİÇBİRİNDE");
    expect(k).toMatch(/synonym\/antonym\/definition\/sentence/);
    expect(k).toMatch(/somut nesne/);
    expect(k).toMatch(/İngilizce/);
    expect(k).toMatch(/tek nesne/);
    expect(k).toMatch(/stil/);
    // Kart uzunluk/noktalama ve ipucu kuralları alan bütçelerinde BİR KEZ durur; burada yinelenmez.
    expect(k).not.toMatch(/≤ 3 kelime|≤ 8 kelime/);
  });

  it("özgüllük: ortak dört kural bir kez ve önde; araca özgü ekler arkada (goalTitle hizası, ilgi alanı 'Uzman notları'nda → tema boşsa çiftlerin en az yarısı, tema verildiyse uzatma/adaptations'ta ve yönergeye zorla sokulmaz, profil notu kurulumu belirler, öğrencisiz genel materyal)", () => {
    const p = rota.SYSTEM_PROMPT;
    expect(say(p, "profildeki en az bir somut veriye")).toBe(1);
    expect(say(p, "İlgi alanı verilmişse")).toBe(1);
    expect(say(p, "Geçmiş çalışmalar verilmişse")).toBe(1);
    const o = bolum(p, "ÖZGÜLLÜK KURALLARI", "ZAYIF ÖRNEK");
    expect(o.indexOf("profildeki en az bir somut veriye")).toBeLessThan(o.indexOf("goalTitle"));
    expect(o).toContain("goalTitle");
    expect(o).toMatch(/hedefe hizalı/);
    expect(o).toMatch(/"Uzman notları"/);
    expect(o).toMatch(/bayılıyor/);
    expect(o).toMatch(/tema boşsa/i);
    expect(o).toMatch(/tema verildiyse/i);
    // Tur 2: ilgi alanı tema boşsa çiftlerin en az yarısı (hedef/tür kuralı önce); tema varsa uzatma/adaptations'ta, yönergeye zorla sokulmaz.
    expect(o).toMatch(/en az yarısı/);
    expect(o).toMatch(/adaptations/);
    expect(o).toMatch(/zorla sokulmaz/);
    expect(o).not.toMatch(/tema odur/);
    expect(o).not.toMatch(/kurulum biçimi/);
    expect(o).toMatch(/Dikkat edilmesi gerekenler/);
    expect(o).toMatch(/ÖĞRENCİ bloğu yoksa/);
    expect(o).toMatch(/uydurulmaz/);
  });

  it("karşıt örnek: zayıf = yankı ('Küçük değil') + ikinci eşleşme; iyi = gerçek zıt, tek kelime kartlar, kolayda ipucu ve görsel boş, zincir reddi; iyi örnek her kurala uyar", () => {
    const p = rota.SYSTEM_PROMPT;
    const zayif = p.slice(p.indexOf("ZAYIF ÖRNEK"), p.indexOf("İYİ ÖRNEK"));
    const iyi = p.slice(p.indexOf("İYİ ÖRNEK"), p.indexOf("BİÇİM\n"));
    expect(zayif).toContain('"Küçük değil"');
    expect(zayif).toContain('"İri"');
    expect(iyi).toContain('"Büyük"');
    expect(iyi).toContain('"Küçük"');
    expect(iyi).toContain("antonym");
    expect(iyi).toMatch(/kolay/);
    expect(iyi).toMatch(/hint ""/);
    expect(iyi).toMatch(/visualPrompt ""/);
    expect(iyi).toMatch(/İri/);
    expect(iyi).toMatch(/eklenmez/);
    expect(iyi).not.toContain("Küçük değil");
    // Kurala uyar: tırnaklı kart metinlerinin hiçbirinde cümle noktalaması ve "değil" yankısı yok, hepsi ≤ 3 kelime.
    // Boş tırnaklar (`hint ""`) da eşlenir ki çiftleme kaymasın; sonra elenir.
    const kartlar = (iyi.match(/"[^"]*"/g) ?? []).map((k) => k.slice(1, -1)).filter(Boolean);
    expect(kartlar.length).toBeGreaterThanOrEqual(4);
    for (const k of kartlar) {
      expect(k, k).not.toMatch(/[.!?…]/);
      expect(k, k).not.toMatch(/değil/);
      expect(k.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length, k).toBeLessThanOrEqual(3);
    }
  });

  it("biçim: tek parça JSON; tür/zorluk anahtarı aynen; alan bütçeleri her alan için (pairs TAM, id ardışık, kelime kartı ≤ 3 / zor 5 + noktalama yok, cardB sınırları, hint ≤ 8 zorda her çiftte / ortada az sık çiftlerde / kolayda boş, visualPrompt anahtarı her çiftte, instructions ≤ 3, expertNotes 4–5 içerik yuvalı, adaptations Kolay/Zor 2–3)", () => {
    const b = bolum(rota.SYSTEM_PROMPT, "BİÇİM\n", "ÖZ-DENETİM");
    expect(b).toMatch(/SADECE/);
    expect(b).toMatch(/JSON/);
    expect(b).toMatch(/matchType[^\n]*difficulty[^\n]*anahtar/);
    expect(b).toContain('"matchType": "definition|image_desc|synonym|antonym|category|sentence"');
    expect(b).toContain('"difficulty": "easy|medium|hard"');
    const butce = b.slice(b.indexOf("Alan bütçeleri:"));
    for (const alan of ["title", "pairs", "cardA", "cardB", "hint", "visualPrompt", "instructions", "expertNotes", "adaptations"]) {
      expect(butce, alan).toContain(`\n- ${alan}: `);
    }
    expect(butce).toMatch(/title: [^\n]*≤ 6 kelime/);
    expect(butce).toMatch(/pairs: [^\n]*TAM/);
    expect(butce).toMatch(/pairs: [^\n]*id 1'den ardışık/);
    // Kelime kartı biçimi (eval `kart_bicimi`): ≤ 3 kelime, zor düzeyde deyim 5, cümle noktalaması yok; sentence '___'.
    expect(butce).toMatch(/cardA: [^\n]*≤ 3 kelime/);
    expect(butce).toMatch(/cardA: [^\n]*deyim için ≤ 5/);
    expect(butce).toMatch(/cardA: [^\n]*noktalaması yok/);
    expect(butce).toMatch(/cardA: [^\n]*sentence[^\n]*___/);
    expect(butce).toMatch(/cardB: [^\n]*≤ 12 kelime/);
    expect(butce).toMatch(/cardB: [^\n]*definition tek cümle/);
    expect(butce).toMatch(/cardB: [^\n]*image_desc ≤ 2 cümle/);
    expect(butce).toMatch(/cardB: [^\n]*noktasız/);
    // İpucu ≤ 8 kelime, cevabı (cardB'yi/kökünü) vermez; zorda her çiftte, ortada yalnız az sık sözcüklü çiftlerde, kolayda "".
    expect(butce).toMatch(/hint: [^\n]*≤ 8 kelime/);
    expect(butce).toMatch(/hint: [^\n]*kökünü/);
    expect(butce).toMatch(/hint: [^\n]*zor[^\n]*her çiftte/);
    expect(butce).toMatch(/hint: [^\n]*orta[^\n]*az sık/);
    expect(butce).toMatch(/hint: [^\n]*kolay[^\n]*""/);
    expect(butce).not.toMatch(/hint: [^\n]*kolay ve ortada ""/);
    // visualPrompt anahtarı her çiftte yazılır ("" olabilir); tüm çiftlerde aynı karar.
    expect(butce).toMatch(/visualPrompt: [^\n]*İngilizce/);
    expect(butce).toMatch(/visualPrompt: [^\n]*""/);
    expect(butce).toMatch(/visualPrompt: [^\n]*anahtar[^\n]*her çiftte/);
    expect(butce).toMatch(/instructions: [^\n]*≤ 3 cümle/);
    // expertNotes derinliği (kural g): 4–5 cümle, içerik yuvaları — zorlayacak çiftler, yakınları ayırt ettirme, gerekçe, uzatma.
    expect(butce).toMatch(/expertNotes: [^\n]*4–5 cümle/);
    expect(butce).toMatch(/expertNotes: [^\n]*ayırt/);
    expect(butce).toMatch(/expertNotes: [^\n]*uzatma/);
    expect(butce).toMatch(/expertNotes: [^\n]*öğrencisiz/);
    expect(butce).toMatch(/adaptations: [^\n]*Kolay[^\n]*Zor[^\n]*2–3 cümle/);
    expect(butce).toMatch(/adaptations: [^\n]*kaç çift/);
    expect(butce).toMatch(/adaptations: [^\n]*ne zaman/);
  });

  it("öz-denetim 4–6 numaralı madde: çift sayısı + id, tek eşleşme, görsel hepsinde/hiçbirinde, zorluk sıklığı, tür/zorluk anahtarı + JSON, tırnaklı 'hasta/terapist'", () => {
    const oz = bolum(rota.SYSTEM_PROMPT, "ÖZ-DENETİM", ETIK_SINIR);
    const maddeler = oz.split("\n").filter((l) => /^\d\. /.test(l));
    expect(maddeler.length).toBeGreaterThanOrEqual(4);
    expect(maddeler.length).toBeLessThanOrEqual(6);
    expect(oz).toMatch(/Çift sayısı/);
    expect(oz).toMatch(/ardışık/);
    expect(oz).toMatch(/tek eşleşme/);
    expect(oz).toMatch(/zincir/);
    expect(oz).toMatch(/visualPrompt[^\n]*hepsinde[^\n]*hiçbirinde/);
    expect(oz).toMatch(/İngilizce/);
    expect(oz).toMatch(/sıklı/);
    expect(oz).toMatch(/ipucu[^\n]*zorlu/);
    expect(oz).not.toMatch(/yalnız zorda/);
    expect(oz).toMatch(/matchType[^\n]*difficulty/);
    expect(oz).toMatch(/JSON/);
    expect(oz).toContain('"hasta/terapist"');
    expect(oz).toContain("listeyi çıktıya YAZMA");
  });
});

describe("yetiskinMi", () => {
  it("doğum tarihi varsa o belirler (18 sınır dahil); yoksa kapının yaş metni; ikisi de yoksa çocuk varsayılır", () => {
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
    const m = RUMUZ.exec(kur());
    expect((m?.[1] ?? m?.[2])?.trim()).toBe("Hazal");
  });

  it("parametreler etiketli: tür etiketi + anahtar, çift sayısı, zorluk etiketi + anahtar, tema; müfredat hedefi yalnız verilmişse", () => {
    const p = kur();
    expect(p).toContain("- Eşleştirme türü: Eş Anlamlı (synonym)");
    expect(p).toContain("- Çift sayısı: 10 çift");
    expect(p).toContain("- Zorluk: Orta (medium)");
    expect(p).toContain("- Tema: okul");
    expect(p).not.toContain("Müfredat hedefi");
    const h = kur({ matchType: "category", pairCount: "6", difficulty: "easy", theme: undefined, goalTitle: "Nesneleri işlevine göre gruplar (yiyecek, taşıt, hayvan)" });
    expect(h).toContain("- Eşleştirme türü: Kategori Eşleştirme (category)");
    expect(h).toContain("- Zorluk: Kolay (easy)");
    expect(h).toContain("- Müfredat hedefi: Nesneleri işlevine göre gruplar (yiyecek, taşıt, hayvan)");
  });

  it("tema boşsa: blokta 'Uzman notları' satırı varsa ilgi alanına yönlendirir; satır yoksa (öğrencisiz ya da notsuz öğrenci) karışık", () => {
    const temaSatiri = (p: string) => p.split("\n").find((l) => l.startsWith("- Tema: "))!;
    expect(temaSatiri(kur({ theme: undefined }))).toMatch(/verilmedi/);
    expect(temaSatiri(kur({ theme: undefined }))).toMatch(/Uzman notları/);
    // Satır var ama ilgi alanı taşımayabilir (yalnız klinik not): koşullu söylenir, karışık geri dönüşü yazılır.
    expect(temaSatiri(kur({ theme: undefined }))).toMatch(/varsa/);
    expect(temaSatiri(kur({ theme: undefined }))).toMatch(/yoksa karışık/);
    expect(temaSatiri(kur({ theme: "   " }))).toMatch(/verilmedi/);
    expect(temaSatiri(kur({ theme: undefined }, "", null, ""))).toMatch(/karışık/);
    expect(temaSatiri(kur({ theme: undefined }, "", null, ""))).not.toMatch(/Uzman notları/);
    // Notsuz öğrenci (es-04 fikstürü gibi): blok var ama "Uzman notları" satırı yok → modele olmayan satır gösterilmez.
    const notsuz = "Öğrenci: Zeynep, 9 yaş\nÇalışma alanı: Konuşma\nTanı: Artikülasyon bozukluğu.\nSürmekte olan hedefler: /r/ sesini hece düzeyinde üretir";
    expect(temaSatiri(kur({ theme: undefined }, notsuz, { birthDate: dogum(9) }, "9 yaşında"))).toMatch(/karışık/);
    expect(temaSatiri(kur({ theme: undefined }, notsuz, { birthDate: dogum(9) }, "9 yaşında"))).not.toMatch(/Uzman notları/);
    // Tema verilmişse blok ne olursa olsun tema yazılır.
    expect(temaSatiri(kur({ theme: "okul" }, notsuz, { birthDate: dogum(9) }, "9 yaşında"))).toBe("- Tema: okul");
  });

  it.each([
    ["definition", "hiçbir çiftte"],
    ["image_desc", "her çiftte"],
    ["synonym", "hiçbir çiftte"],
    ["antonym", "hiçbir çiftte"],
    ["category", "somut nesnelerse her çiftte, değilse hiçbirinde"],
    ["sentence", "hiçbir çiftte"],
  ] as const)("odak: tür %s → görsel '%s' (koddan türetilir, rota aynı yardımcıyı kullanır)", (tur, gorsel) => {
    expect(rota.GORSEL_KURALI[tur]).toBe(gorsel);
    const odak = odakSatir(kur({ matchType: tur }));
    expect(odak).toBe(`Odak: ${rota.odakSatiri("10", tur, "medium")}`);
    expect(odak.startsWith(`Odak: 10 çift, ${tur}, medium → görsel: ${gorsel};`)).toBe(true);
    expect(odak.endsWith(".")).toBe(true);
  });

  it("görsel tablosu türlerle örtüşür: yalnız image_desc 'her çiftte', soyut dört tür 'hiçbir çiftte', category koşullu", () => {
    for (const t of GORSELLI) expect(rota.GORSEL_KURALI[t]).toBe("her çiftte");
    for (const t of GORSELSIZ) expect(rota.GORSEL_KURALI[t]).toBe("hiçbir çiftte");
    expect(rota.GORSEL_KURALI.category).toMatch(/somut/);
    expect(Object.keys(rota.GORSEL_KURALI).sort()).toEqual([...TURLER].sort());
  });

  it.each([
    ["easy", /ipucu: yok \(""\)/],
    ["medium", /ipucu: yalnız az sık[^\n]*≤ 8 kelime[^\n]*kalanında ""/],
    ["hard", /ipucu: her çiftte ≤ 8 kelime/],
  ] as const)("odak: zorluk %s → ipucu kuralı koddan (kolay boş, orta yalnız az sık çiftlerde, zor her çiftte)", (zorluk, ipucu) => {
    const odak = odakSatir(kur({ difficulty: zorluk }));
    expect(odak).toContain(`, ${zorluk} → `);
    expect(odak).toMatch(ipucu);
  });

  it("odak satırı çift sayısını taşır, tek satırdır ve hemen hatırlatmadan önce gelir", () => {
    const p = kur({ pairCount: "12", matchType: "sentence", difficulty: "hard", theme: undefined });
    const odak = odakSatir(p);
    expect(odak.startsWith("Odak: 12 çift, sentence, hard → görsel: hiçbir çiftte; ipucu: her çiftte ≤ 8 kelime")).toBe(true);
    expect(p.indexOf(odak) + odak.length + 2).toBe(p.indexOf("Son hatırlatma:"));
  });

  it("iki hatırlatma sonda tek satırda: tek ve kesin eşleşme + görsel tutarlılığı (ya hepsinde ya hiçbirinde)", () => {
    const p = kur();
    const son = p.slice(p.indexOf("Son hatırlatma: "));
    expect(son).not.toContain("\n");
    expect(son).toBe(`Son hatırlatma: ${rota.HATIRLATMA.join(" ")}`);
    expect(rota.HATIRLATMA).toHaveLength(2);
    expect(son).toMatch(/Tek ve kesin eşleşme\./);
    expect(son).toMatch(/Görsel tutarlılığı: ya hepsinde ya hiçbirinde\./);
  });

  it("öğrencisiz (boş blok): ÖĞRENCİ başlığı yok, PARAMETRELER ile başlar; odak ve hatırlatma yine var; kitle satırı yok", () => {
    const p = kur({ matchType: "image_desc", pairCount: "8", difficulty: "easy", theme: "mutfak" }, "", null, "");
    expect(p).not.toContain("ÖĞRENCİ");
    expect(p.startsWith("PARAMETRELER\n")).toBe(true);
    expect(p).toContain("- Tema: mutfak");
    expect(odakSatir(p)).toBe("Odak: 8 çift, image_desc, easy → görsel: her çiftte; ipucu: yok (\"\").");
    expect(p).toContain("Son hatırlatma:");
    expect(p).not.toContain("Kitle:");
    expect(kur({}, "  \n ", null, "")).not.toContain("ÖĞRENCİ");
  });

  it("yetişkin öğrencide (18+) kitle satırı: çocuksu sözcük yazılmaz, yönerge yetişkine; çocukta satır yok; hatırlatma aynı", () => {
    const yetiskinBlok = "Öğrenci: Meral, 34 yaş\nÇalışma alanı: Dil\nUzman notları: Afazi sonrası; iş yerine dönmek istiyor.";
    const p = kur({ difficulty: "medium" }, yetiskinBlok, yetiskin, "34 yaşında");
    const kitle = p.split("\n").find((l) => l.startsWith("- Kitle: "))!;
    expect(kitle).toMatch(/yetişkin/);
    expect(kitle).toMatch(/18\+/);
    expect(kitle).toMatch(/çocuksu sözcük/);
    expect(kitle).toMatch(/yönerge/);
    expect(p.indexOf(kitle)).toBeLessThan(p.indexOf("Odak:"));
    expect(p.slice(p.indexOf("Son hatırlatma: "))).toBe(`Son hatırlatma: ${rota.HATIRLATMA.join(" ")}`);
    // Yaş kapıdan yalnız metin olarak gelirse de yetişkin sayılır; 17 yaş çocuk.
    expect(kur({}, yetiskinBlok, null, "34 yaşında")).toContain("- Kitle: ");
    expect(kur({}, blok, { birthDate: dogum(17) }, "17 yaşında")).not.toContain("- Kitle: ");
    expect(kur()).not.toContain("- Kitle: ");
  });
});

describe("rota sözleşmesi (A4: değişmeyenler)", () => {
  it("rota dışa aktarılan buildUserPrompt'u kullanır; toolType/responseKey/cost/studentRequired/fallbackTitle aynı", () => {
    expect(captured.config?.buildUserPrompt).toBe(rota.buildUserPrompt);
    expect(captured.config).toMatchObject({ toolType: "MATCHING_GAME", responseKey: "game", cost: 1, studentRequired: false, fallbackTitle: "Kelime Eşleştirme" });
  });

  it("enrichContent sunucu alanlarını (theme, pairCount sayı, matchType, difficulty) istekten yazar", async () => {
    const content: Record<string, unknown> = { theme: "modelin yazdığı", pairCount: "yanlış", matchType: "Eş Anlam", difficulty: "Orta" };
    await captured.config!.enrichContent(content, { ...govde, theme: "mutfak", pairCount: "8" });
    expect(content).toMatchObject({ theme: "mutfak", pairCount: 8, matchType: "synonym", difficulty: "medium" });
    const bos: Record<string, unknown> = {};
    await captured.config!.enrichContent(bos, { ...govde, theme: undefined, pairCount: "12" });
    expect(bos).toMatchObject({ theme: "", pairCount: 12 });
  });
});
