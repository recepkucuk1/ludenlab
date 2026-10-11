// apps/hub/src/app/studio/api/tools/comm-board/prompt.test.ts
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ETIK_SINIR } from "@/lib/prompts/ortakBloklar";
import { PROMPT_PENCERESI, promptIddialari, promptPenceresi } from "@studio/lib/prompts/iskelet";

/**
 * İletişim panosu (AAC) A1 prompt sözleşmesi (Faz 2 / Task 8). Model çıktısı birim testte ölçülemez; burada
 * kilitlenen şey MODELE GİDEN METİNDİR: sistem prompt'u pencerede (tavana ≥ 60 token pay) ve A1 sırasında,
 * şema alan adları aynen (CommBoardView, PDF ve görsel rotası bunları okur), klinik çerçeve (çekirdek sözcük,
 * işlevler, Fitzgerald tablosu, metin modu, modelleme, yaş), özgüllük, karşıt örnek ve öz-denetim yerinde;
 * kullanıcı prompt'unda ortak öğrenci bloğu önce, odak satırı koddan türetilmiş, yetişkin satırı yaşa göre
 * KODDA koşullu, iki hatırlatma sonda.
 *
 * Rota `createToolHandler`'ı kurulumda çağırır ve kapı DB/oturum modüllerini çeker; taklit yalnız config'i
 * yakalar (homework/prompt.test.ts deseni). Böylece dışa aktarılan prompt'un rotaya BAĞLANDIĞI da doğrulanır.
 */
type BoardType = "basic_needs" | "emotions" | "daily_routines" | "school" | "social" | "requests" | "custom";
type Body = {
  studentId?: string;
  boardType: BoardType;
  customCategory?: string;
  symbolCount: number;
  layout: "grid" | "strip";
  textMode: "word_only" | "word_sentence";
  colorCoding: boolean;
};
type Config = {
  systemPrompt: string;
  toolType: string;
  responseKey: string;
  cost: number;
  studentRequired?: boolean;
  fallbackTitle?: unknown;
  difficulty?: string;
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

/** Bugünkü şema alan adları — `CommBoardView`, PDF ve `comm-board/images` bunları okur; A4: değişmez. */
const ALANLAR = [
  "title", "boardType", "layout", "rows", "cols", "cells",
  "position", "word", "sentence", "category", "fitzgeraldColor", "visualDescription", "visualPrompt", "usage",
  "instructions", "expertNotes", "homeGuidance", "adaptations",
];
const TURLER: BoardType[] = ["basic_needs", "emotions", "daily_routines", "school", "social", "requests", "custom"];
/** Eval kontrolünün (`evals/tools/studio/comm-board/checks.ts`) zorladığı Fitzgerald anahtarı. */
const FITZGERALD = { noun: "yellow", verb: "green", adjective: "blue", social: "pink", question: "orange", other: "white" } as const;

const govde: Body = { studentId: "s1", boardType: "basic_needs", symbolCount: 6, layout: "grid", textMode: "word_sentence", colorCoding: true };
const blok = [
  "Öğrenci: Hazal, 6 yaş",
  "Çalışma alanı: Dil",
  "Tanı: Otizm spektrum bozukluğu, hafif düzey",
  "Uzman notları: Dinozorlara ve trenlere bayılıyor. İki kelimelik istek cümlesi kuruyor ('su ver').",
  "Sürmekte olan hedefler: Üç sözcüklü istek cümlesi",
].join("\n");
const ctx = { therapistId: "t1", scrubText: (t: string | null | undefined) => t ?? "", studentBlock: blok };
const cocuk = { id: "s1", name: "Hazal", birthDate: new Date("2020-05-14"), workArea: "language", diagnosis: null };
const yetiskin = { id: "s2", name: "Meral", birthDate: new Date("1992-07-30"), workArea: "speech", diagnosis: null };
const kur = (d: Partial<Body> = {}, studentBlock = blok, student: typeof cocuk | null = cocuk, ageText = "6 yaşında") =>
  rota.buildUserPrompt({ ...govde, ...d }, student, ageText, { ...ctx, studentBlock });

/** Koşturucunun rumuz deseni (`evals/lib/runner.ts`): bloğun tiresiz `Öğrenci: <rumuz>, N yaş` satırı okunur. */
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
const kelime = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

describe("SYSTEM_PROMPT (A1)", () => {
  it("pencere 1200–2000 token ve tavana ≥ 60 token pay, 18 şema alanı aynen, yasak sözcük yok; rota bu metni gönderir", () => {
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

  it("rol: AAC panosu; uzman/veli basar, öğrenci işaret eder; hücre sözcüğü öğrencinin sözü; expertNotes'ta öğrenci/uzman sözcükleri geçerli", () => {
    const rol = bolum(rota.SYSTEM_PROMPT, "ROL\n", "KLİNİK ÇERÇEVE");
    expect(rol).toMatch(/AAC/);
    expect(rol).toMatch(/uzman/i);
    expect(rol).toMatch(/veli/i);
    expect(rol).toMatch(/işaret eder/);
    expect(rol).toMatch(/istiyorum/);
    expect(rol).toMatch(/expertNotes/);
    expect(rol).toContain("öğrenci/uzman");
    expect(rol).not.toMatch(/mesleki dil serbest/);
  });

  it("klinik çerçeve: ≥ 2 çekirdek sözcük, beş işlev, Fitzgerald tablosu kontrolle aynı, metin modu (boş dize / 2–4 sözcük), modelleme 5 sn, yetişkin simgesi; tür odağı Odak satırına bırakılır", () => {
    const k = bolum(rota.SYSTEM_PROMPT, "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK KURALLARI");
    expect(k).toMatch(/en az 2 çekirdek/);
    for (const c of ["istiyorum", "daha", "bitti", "yardım", "hayır", "evet"]) expect(k, c).toContain(`"${c}"`);
    for (const f of ["istek", "ret", "yorum", "selam", "soru"]) expect(k, f).toMatch(new RegExp(`\\b${f}\\b`));
    for (const [kategori, renk] of Object.entries(FITZGERALD)) expect(k, kategori).toContain(`${kategori}=${renk}`);
    expect(k).toContain('""'); // yalnız kelime: sentence boş dize
    expect(k).toMatch(/2–4 sözcük/);
    expect(k).toMatch(/sözcüğün kendisinden farklı/);
    expect(k).toMatch(/5 saniye/);
    expect(k).toMatch(/işaret/);
    expect(k).toMatch(/yetişkin/i);
    expect(k).toMatch(/çizgi film|cartoon/i);
    // Tür tablosu sistem prompt'una YAZILMAZ (7 satır ≈ 230 token; model tek tür üretir): odak satırı türün
    // işlev odağını isteğe göre taşır, sistem prompt'u modele oraya bakmasını söyler.
    expect(k).toMatch(/Odak satırında/);
    for (const t of TURLER) expect(k).not.toContain(`Tür ${t}:`);
  });

  it("özgüllük: ortak dört kural bir kez ve önde; araca özgü ekler arkada (ilgi alanı Uzman notlarında → hücre yeri türe göre, tanı simgeyi biçimler, öğrencisiz genel materyal)", () => {
    const p = rota.SYSTEM_PROMPT;
    expect(say(p, "profildeki en az bir somut veriye")).toBe(1);
    expect(say(p, "İlgi alanı verilmişse")).toBe(1);
    expect(say(p, "Geçmiş çalışmalar verilmişse")).toBe(1);
    const o = bolum(p, "ÖZGÜLLÜK KURALLARI", "ZAYIF ÖRNEK");
    expect(o.indexOf("profildeki en az bir somut veriye")).toBeLessThan(o.indexOf("Uzman notları"));
    expect(o).toContain('"Uzman notları"');
    expect(o).toMatch(/requests/);
    expect(o).toMatch(/daily_routines/);
    expect(o).toMatch(/tren/);
    expect(o).toMatch(/işitme/);
    expect(o).toMatch(/blo[ğk]u yoksa/i);
    expect(o).toMatch(/uydur/);
  });

  it("karşıt örnek: zayıf = sahne + boş kullanım; iyi = kategori↔renk tutarlı, 2 sözcüklü cümle, ≤ 10 kelimelik tek simge, 5 sn bekleyen somut modelleme; ≤ 120 kelime", () => {
    const p = rota.SYSTEM_PROMPT;
    const zayif = p.slice(p.indexOf("ZAYIF ÖRNEK"), p.indexOf("İYİ ÖRNEK"));
    const iyi = p.slice(p.indexOf("İYİ ÖRNEK"), p.indexOf("BİÇİM\n"));
    expect(zayif).toContain("a happy child playing");
    expect(zayif).toMatch(/Mutlu/);
    expect(iyi).toMatch(/"Daha"/);
    // "daha" zarftır: arayüzün adjective etiketi "Sıfat/Zarf" → blue (kontrol tablosuyla tutarlı).
    expect(iyi).toContain("adjective");
    expect(iyi).toContain("blue");
    expect(iyi).toContain("Daha istiyorum");
    const komut = /visualPrompt: "([^"]+)"/.exec(iyi)?.[1] ?? "";
    expect(kelime(komut)).toBeGreaterThan(0);
    expect(kelime(komut)).toBeLessThanOrEqual(10);
    expect(komut).toMatch(/^[a-z ,]+$/);
    expect(iyi).toMatch(/5 saniye/);
    expect(iyi).toMatch(/kurabiye/);
    expect(kelime(zayif) + kelime(iyi)).toBeLessThanOrEqual(120 + 8); // + iki başlık etiketi
  });

  it("biçim: tek parça JSON; her alan için yazılı bütçe (cells tam N, word 1–2, sentence ≤ 4 sözcük, visualPrompt ≤ 10 İngilizce kelime, usage/visualDescription 1 cümle, instructions ≤ 4, expertNotes/homeGuidance ≤ 3, adaptations Kolay/Zor)", () => {
    const b = bolum(rota.SYSTEM_PROMPT, "BİÇİM\n", "ÖZ-DENETİM");
    expect(b).toMatch(/SADECE/);
    expect(b).toMatch(/JSON/);
    const butce = b.slice(b.indexOf("Alan bütçeleri:"));
    for (const alan of ["title", "rows", "cols", "cells", "position", "word", "sentence", "category", "fitzgeraldColor", "visualDescription", "visualPrompt", "usage", "instructions", "expertNotes", "homeGuidance", "adaptations"]) {
      expect(butce, alan).toContain(alan);
    }
    expect(butce).toMatch(/cells[^\n]*TAM/);
    expect(butce).toMatch(/word[^\n]*1–2 sözcük/);
    expect(butce).toMatch(/sentence[^\n]*""[^\n]*4 sözcük/);
    expect(butce).toMatch(/visualDescription[^\n]*1 cümle/);
    expect(butce).toMatch(/visualPrompt[^\n]*≤ 10 İngilizce kelime/);
    expect(butce).toMatch(/visualPrompt[^\n]*metin yok/);
    expect(butce).toMatch(/usage[^\n]*1 cümle/);
    expect(butce).toMatch(/instructions[^\n]*≤ 4 cümle/);
    expect(butce).toMatch(/expertNotes[^\n]*≤ 3 cümle/);
    expect(butce).toMatch(/homeGuidance[^\n]*≤ 3 cümle/);
    expect(butce).toMatch(/adaptations[^\n]*Kolay[^\n]*Zor/);
    expect(butce).toMatch(/rows × cols/);
  });

  it("öz-denetim 4–6 numaralı madde: hücre sayısı, renk↔kategori, çekirdek sözcük, metin modu, İngilizce tek simge + yaş, tırnaklı 'hasta/terapist', JSON", () => {
    const oz = bolum(rota.SYSTEM_PROMPT, "ÖZ-DENETİM", ETIK_SINIR);
    const maddeler = oz.split("\n").filter((l) => /^\d\. /.test(l));
    expect(maddeler.length).toBeGreaterThanOrEqual(4);
    expect(maddeler.length).toBeLessThanOrEqual(6);
    expect(oz).toMatch(/hücre sayısı/i);
    expect(oz).toMatch(/kategori/i);
    expect(oz).toMatch(/çekirdek/i);
    expect(oz).toMatch(/İngilizce/);
    expect(oz).toMatch(/tek simge/);
    expect(oz).toMatch(/yetişkin/i);
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
    const m = RUMUZ.exec(kur());
    expect((m?.[1] ?? m?.[2])?.trim()).toBe("Hazal");
  });

  it("parametreler eval adaptörüyle aynı etiketlerle: pano türü, sembol sayısı + ızgara, düzen, metin modu, renk kodlaması", () => {
    const p = kur();
    expect(p).toContain("- Pano türü: Temel İhtiyaçlar");
    expect(p).toContain("- Sembol sayısı: 6 (2×3 grid)");
    expect(p).toContain("- Düzen: Grid");
    expect(p).toContain("- Metin modu: Kelime + kısa cümle");
    expect(p).toContain("- Fitzgerald renk kodlaması: Evet");
    const q = kur({ boardType: "custom", customCategory: "Dinozor oyunu", symbolCount: 12, layout: "strip", textMode: "word_only", colorCoding: false });
    expect(q).toContain("- Pano türü: Özel — Dinozor oyunu");
    expect(q).toContain("- Sembol sayısı: 12 (3×4 grid)");
    expect(q).toContain("- Düzen: Satır (iletişim şeridi)");
    expect(q).toContain("- Metin modu: Sadece kelime");
    expect(q).toContain("- Fitzgerald renk kodlaması: Hayır");
    for (const t of TURLER.filter((x) => x !== "custom")) expect(kur({ boardType: t })).toContain(`- Pano türü: ${rota.BOARD_TYPE_LABEL[t]}`);
  });

  it.each([
    [4, 2, 2],
    [6, 2, 3],
    [9, 3, 3],
    [12, 3, 4],
  ])("odak: %i hücre → ızgara %i×%i (koddan türetilir), metin modu, renk durumu, tür ve işlev odağı", (n, rows, cols) => {
    expect(rota.GRID[n as 4 | 6 | 9 | 12]).toEqual({ rows, cols });
    const beklenen = `Odak: ${n} hücre (${rows}×${cols}), word_sentence, renk açık → basic_needs: ${rota.TUR_ODAK.basic_needs}.`;
    expect(kur({ symbolCount: n })).toContain(beklenen);
    expect(rota.odakSatiri({ ...govde, symbolCount: n })).toBe(beklenen.slice("Odak: ".length));
  });

  it.each(TURLER.filter((t) => t !== "custom"))("odak: tür %s → tek satır işlev odağı", (tur) => {
    const tanim = rota.TUR_ODAK[tur];
    expect(tanim.length).toBeGreaterThan(20);
    expect(tanim).not.toContain("\n");
    expect(kur({ boardType: tur })).toContain(`→ ${tur}: ${tanim}.`);
  });

  it("odak: renk kapalı, yalnız kelime ve custom temasını yazar", () => {
    expect(kur({ colorCoding: false })).toContain(", word_sentence, renk kapalı →");
    expect(kur({ textMode: "word_only" })).toContain(", word_only, renk açık →");
    const odak = rota.odakSatiri({ ...govde, boardType: "custom", customCategory: "Dinozor oyunu" });
    expect(odak).toContain('custom: tema "Dinozor oyunu"');
    expect(odak).toContain(rota.TUR_ODAK.custom);
    expect(odak).not.toContain("\n");
  });

  it("odak satırı tek satırdır ve hemen hatırlatmadan önce gelir", () => {
    const p = kur();
    const odak = p.split("\n").find((l) => l.startsWith("Odak: "))!;
    expect(odak).toMatch(/^Odak: 6 hücre \(2×3\), word_sentence, renk açık → basic_needs: .+\.$/);
    expect(p.indexOf(odak) + odak.length + 2).toBe(p.indexOf("Son hatırlatma:"));
  });

  it("iki hatırlatma sonda tek satırda: tam N hücre (kapanış cümlesi aynen) + renk kategoriyi izler", () => {
    const p = kur();
    const h = rota.hatirlatma(6);
    expect(h).toHaveLength(2);
    expect(h[0]).toBe("Tam olarak 6 hücre oluştur.");
    expect(h[1]).toMatch(/Renk kategoriyi izler/);
    expect(p.endsWith(`Son hatırlatma: ${h.join(" ")}`)).toBe(true);
    expect(kur({ symbolCount: 12 })).toContain("Tam olarak 12 hücre oluştur.");
  });

  it("boş blokta (öğrencisiz) ÖĞRENCİ başlığı yok; parametreler, odak ve hatırlatma yine var; yetişkin satırı yok", () => {
    const p = kur({ studentId: undefined }, "", null, "");
    expect(p).not.toContain("ÖĞRENCİ");
    expect(p.startsWith("PARAMETRELER\n")).toBe(true);
    expect(p).toContain("Odak: 6 hücre (2×3)");
    expect(p).toContain("Son hatırlatma:");
    expect(p).not.toMatch(/yetişkin/i);
    expect(kur({}, "  \n ", null, "")).not.toContain("ÖĞRENCİ");
  });

  it("yetişkin öğrencide (≥ 18) KODDA koşullu parametre satırı: gerçekçi simge, çocuksu/çizgi film yok, 'veli' yazılmaz; çocukta ve öğrencisizde yok", () => {
    expect(rota.YETISKIN_YAS).toBe(18);
    const blokY = "Öğrenci: Meral, 34 yaş\nÇalışma alanı: Konuşma\nTanı: Hafif dizartri";
    const p = kur({ boardType: "requests", symbolCount: 4 }, blokY, yetiskin, "34 yaşında");
    const satir = p.split("\n").find((l) => l.startsWith("- Öğrenci yetişkin"))!;
    expect(satir).toBeDefined();
    expect(satir).toContain("34 yaş");
    expect(satir).toMatch(/gerçekçi/);
    expect(satir).toMatch(/çizgi film/);
    expect(satir).toContain('"veli"');
    expect(satir).toMatch(/yazılmaz/);
    expect(p.indexOf(satir)).toBeLessThan(p.indexOf("Odak:"));
    // Yaş kapıyla aynı kaynaktan: ageText; yoksa birthDate; ikisi de yoksa yetişkin sayılmaz.
    expect(rota.yetiskinMi(yetiskin, "34 yaşında")).toBe(true);
    expect(rota.yetiskinMi(yetiskin, "")).toBe(true);
    expect(rota.yetiskinMi({ ...yetiskin, birthDate: null }, "34 yaşında")).toBe(true);
    expect(rota.yetiskinMi({ ...yetiskin, birthDate: null }, "")).toBe(false);
    expect(rota.yetiskinMi(cocuk, "6 yaşında")).toBe(false);
    expect(rota.yetiskinMi(null, "")).toBe(false);
    expect(kur()).not.toContain("- Öğrenci yetişkin");
    expect(kur({}, "", null, "")).not.toContain("- Öğrenci yetişkin");
  });
});

describe("rota sözleşmesi (A4: değişmeyenler)", () => {
  it("rota dışa aktarılan buildUserPrompt'u kullanır; toolType/responseKey/cost/studentRequired/fallbackTitle/difficulty aynı", () => {
    expect(captured.config?.buildUserPrompt).toBe(rota.buildUserPrompt);
    expect(captured.config).toMatchObject({
      toolType: "COMMUNICATION_BOARD",
      responseKey: "board",
      cost: 1,
      studentRequired: false,
      fallbackTitle: "İletişim Panosu",
      difficulty: "easy",
    });
  });

  it("enrichContent sunucu alanlarını (boardType, symbolCount, layout, textMode, colorCoding) istekten yazar", async () => {
    const content: Record<string, unknown> = { boardType: "yanlış", symbolCount: 99 };
    await captured.config!.enrichContent(content, { ...govde, boardType: "emotions", symbolCount: 9, layout: "strip", textMode: "word_only", colorCoding: false });
    expect(content).toMatchObject({ boardType: "emotions", symbolCount: 9, layout: "strip", textMode: "word_only", colorCoding: false });
  });
});
