import { z } from "zod";
import { createToolHandler, type ToolPromptContext } from "@studio/lib/toolHandler";
import { studioKullaniciPromptu, studioSistemPromptu } from "@studio/lib/prompts/iskelet";

/* İletişim panosu (AAC) — spec A1 prompt'u (Faz 2 / Task 8).
   Sistem prompt'u sabittir (önbellek) ve `studioSistemPromptu` ile A1 sırasında kurulur; kullanıcı
   prompt'u ortak öğrenci bloğunu (`ctx.studentBlock`, spec A2) olduğu gibi gömer — öğrenci isteğe bağlı,
   blok boşsa başlık da yok. Yetişkin öğrenci (≥ 18) KODDA koşulludur (`yetiskinMi`): yalnız nesirde değil,
   parametre satırları olarak gider (tur 2: pano konuşma desteğidir, çocuk AAC basamağı yazılmaz — pano-04 hakemi).
   Simge kuralı tur 2'den: DURAĞAN nesne/işaret, jest yok (v1 "daha/bitti" jest komutları okunmuyordu).
   JSON alan adları, istemci (`CommBoardView`), PDF, görsel rotası
   (`visualPrompt`), `enrichContent`, kredi ve SSE DEĞİŞMEZ (A4). Sözleşme: `prompt.test.ts`.
   Eval kontrolleri (`evals/tools/studio/comm-board/checks.ts`) şunları ölçer; prompt bunları garanti eder:
   hücre sayısı = symbolCount, rows × cols = symbolCount, position ardışık, visualDescription + visualPrompt dolu,
   visualPrompt İngilizce, category → fitzgeraldColor tablosu aynen, word_only'de sentence boş / word_sentence'ta
   sözcükten farklı, sözcükler tekrarsız, üst düzey metin alanları dolu. */

const bodySchema = z.object({
  studentId:      z.string().optional(),
  boardType:      z.enum(["basic_needs", "emotions", "daily_routines", "school", "social", "requests", "custom"]),
  customCategory: z.string().max(100).optional(),
  symbolCount:    z.number().int().refine((v) => [4, 6, 9, 12].includes(v), "Geçersiz sembol sayısı"),
  layout:         z.enum(["grid", "strip"]),
  textMode:       z.enum(["word_only", "word_sentence"]),
  colorCoding:    z.boolean().default(true),
});
type CommBoardBody = z.infer<typeof bodySchema>;
type BoardType = CommBoardBody["boardType"];
type SymbolCount = 4 | 6 | 9 | 12;

/** Parametre etiketleri — eval adaptörü (`evals/tools/studio/comm-board/adapter.ts`) hakeme aynı metinleri gösterir. */
export const BOARD_TYPE_LABEL: Record<BoardType, string> = {
  basic_needs:    "Temel İhtiyaçlar",
  emotions:       "Duygular",
  daily_routines: "Günlük Rutinler",
  school:         "Okul Aktiviteleri",
  social:         "Sosyal İfadeler",
  requests:       "İstek ve Seçim",
  custom:         "Özel",
};

/** Sembol sayısı → ızgara. Parametre satırı, odak satırı ve `rows`/`cols` beklentisi aynı tablodan okur. */
export const GRID: Record<SymbolCount, { rows: number; cols: number }> = {
  4:  { rows: 2, cols: 2 },
  6:  { rows: 2, cols: 3 },
  9:  { rows: 3, cols: 3 },
  12: { rows: 3, cols: 4 },
};
const izgara = (n: number) => GRID[n as SymbolCount] ?? { rows: 3, cols: 3 };

/** Türün tek satır işlev odağı: YALNIZ odak satırında (sistem prompt'una tür tablosu yazılmaz; klinik çerçeve modele
    "Odak satırına bak" der). Somut kenar sözcükler çekirdek sözcüklerden önce listelenir ki küçük panoda çekirdek
    doygunluğu olmasın (v1 pano-04: dört hücrenin dördü çekirdek). `custom` satırı temayı parametreden alır; odak
    satırı temayı tırnak içinde önüne yazar (`odakSatiri`). */
export const TUR_ODAK: Record<BoardType, string> = {
  basic_needs:    'istek + ret — su, yemek, tuvalet gibi gereksinim adları ve "istiyorum", "hayır", "yardım"',
  emotions:       'yorum + istek — temel duygular (mutlu, üzgün, kızgın, korkmuş, yorgun), yoğunluk basamağı ("biraz", "çok") ve bir çıkış hücresi ("yardım" ya da "mola")',
  daily_routines: 'sıra ve geçiş — günün rutin adımları (uyan, giyin, ye, okul, uyu) ve "şimdi", "sonra", "bitti"',
  school:         'sınıf işlevleri — "yardım", "anlamadım", "tuvalet", "bitti", "sıra bende" ve ders/araç adları',
  social:         'selam ve sosyal rutin — "merhaba", "güle güle", "lütfen", "teşekkürler", "benim sıram", "oynar mısın"',
  requests:       'istek + seçim — öğrencinin istediği somut nesne ya da etkinlik adları (bloktaki hedef/ilgi) ve "istiyorum", "daha", "hayır"',
  custom:         'parametredeki özel tema hücrelerin TAMAMINI belirler — tema nesneleri, temaya özgü eylemler ve çekirdek sözcükler temanın içinde ("daha" → oyunun devamı); tema dışı hücre yazılmaz',
};

export const SYSTEM_PROMPT = studioSistemPromptu({
  rol: `Sen LudenLab Studio'nun iletişim panosu (AAC) üreticisisin. Uzman ya da veli basar, öğrenci hücreye işaret eder, yetişkin sözcüğü seslendirir. Hücre sözcüğü ÖĞRENCİNİN sözüdür (birinci tekil: "istiyorum"). instructions ve homeGuidance okuyana "siz" ile; expertNotes yalnız uzmana: terim serbest, "öğrenci/uzman" sözcükleri burada da geçerli.`,
  klinikCerceve: [
    `Çekirdek sözcük dengesi: her panoda en az 2, en çok N/2 çekirdek sözcük ("istiyorum", "daha", "bitti", "yardım", "hayır", "evet"); kalanı pano türüne özgü somut kenar sözcükler. Tür odağı isteğin Odak satırındadır.`,
    `İşlevler: istek, ret, yorum, selam, soru — en az üç; ret ya da çıkış ("hayır") her panoda; yalnız nesne adlarından pano yazılmaz.`,
    `Fitzgerald rengi category'den, tek tablo: noun=yellow, verb=green, adjective=blue (sıfat/zarf: "daha"), social=pink ("evet", "hayır"), question=orange, other=white. Küçük harf anahtar; kapalıyken de doldurulur.`,
    `Metin modu: word_only ("Sadece kelime") → sentence "". word_sentence ("Kelime + kısa cümle") → 2–4 sözcüklü cümle, sözcüğün kendisinden farklı; düzey bloktan (iki sözcüklü istek → 2–3).`,
    `Çocukta modelleme (usage): yetişkin durumu kurar, hücreye KENDİ işaret edip sözcüğü söyler, 5 saniye bekler; öğrenci işaret edince cümleyi seslendirir, isteği hemen karşılar. Ret kabul edilir; düzeltme yok.`,
    `Yetişkinde (parametrede) pano dil öğretimi değil KONUŞMA DESTEĞİDİR: anlaşılmadığında işaret edip kendisi söyler; gelişim basamağı yazılmaz.`,
    `Simge: tek, somut, DURAĞAN simge (nesne, yüz, el duruşu); jest ve sahne yok. Geleneksel: daha = tabakta artı, bitti = boş tabak, yardım = kaldırılmış açık el, hayır = kırmızı çarpı, evet = yeşil onay. Çocukta sade, yetişkinde gerçekçi; çizgi film tarzı yok.`,
  ],
  // Ortak dört kural iskeletten gelir; buradakiler yalnız araca özgü ekler.
  ozgulluk: [
    `İlgi alanı bloktaki "Uzman notları" satırındadır ("…bayılıyor"): en az bir hücre ondan gelir, türe göre yerleşir (requests'te "tren" hücresi; daily_routines'ta rutin sözcüğü).`,
    `Tanı ve "Dikkat edilmesi gerekenler" simgeyi biçimler: işitme kaybında yüz ifadesi belirgin; motor zorlukta büyük hücreler adaptations'a.`,
    `Öğrenci bloğu yoksa genel materyal: türün en sık gereksinimleri; profil uydurulmaz.`,
  ],
  karsitOrnek: {
    zayif: `Hücre "Mutlu" — visualPrompt: "a happy child playing"; usage: "Mutlu olduğunda gösterir."`,
    iyi: `Hücre "Daha" (adjective, blue) — sentence: "Daha istiyorum"; visualPrompt: "plus sign on a plate"; usage: "Uzman kurabiye kutusunu kapatır, 'daha' hücresini gösterip 5 saniye bekler; öğrenci işaret edince açar."`,
  },
  bicim: {
    giris: "Yanıtını SADECE tek parça, geçerli JSON olarak ver; Markdown çiti yazma. Alan adları aynen:",
    sema: `{
"title": "başlık",
"boardType": "basic_needs",
"layout": "grid|strip",
"rows": 2,
"cols": 3,
"cells": [{ "position": 1, "word": "Su", "sentence": "Su istiyorum", "category": "noun", "fitzgeraldColor": "yellow", "visualDescription": "Türkçe tanım", "visualPrompt": "English single icon", "usage": "modelleme" }],
"instructions": "yönerge",
"expertNotes": "uzmana not",
"homeGuidance": "evde kullanım",
"adaptations": "Kolay: … Zor: …"
}`,
    butce: [
      `title: ≤ 6 kelime.`,
      `boardType, layout, rows, cols: parametreden; cells: TAM N nesne, rows × cols = N, position ardışık.`,
      `word: 1–2 sözcük, Türkçe, her hücrede farklı. category/fitzgeraldColor: tablodan.`,
      `sentence: word_only → ""; word_sentence → 2–4 sözcük, sözcükten farklı.`,
      `visualDescription: 1 Türkçe cümle.`,
      `visualPrompt: ≤ 10 İngilizce kelime, tek durağan simge, metin yok; stil/arka plan yazılmaz (sağlayıcı ekler).`,
      `usage: ≤ 2 kısa cümle, ≤ 25 kelime — durum, yetişkinin modeli, 5 saniye bekleme, öğrenci işaret edince ne olur.`,
      `instructions: ≤ 4 cümle — panonun yeri, kim işaret eder, yetişkin ne söyler, yanıt gelmezse ne olur.`,
      `expertNotes: ≤ 3 cümle, yalnız uzmana — günlük kullanım fırsatı sayısı, sonraki adımın ölçütü, dayandığı profil verisi.`,
      `homeGuidance: ≤ 3 cümle — evdeki yer, bir rutinde somut örnek, yanıt gelmezse ne olur.`,
      `adaptations: "Kolay: …" (daha az hücre) ve "Zor: …" (çocukta iki sembollü birleşim; yetişkinde gürültü, yorgunluk koşulu), her biri ≤ 2 cümle.`,
    ],
  },
  ozDenetim: [
    `Hücre sayısı tam, position ardışık, rows × cols eşit mi?`,
    `Renk kategori tablosuna uyuyor; 2–N/2 çekirdek sözcük, bir ret/çıkış hücresi var; sözcük tekrarı yok mu?`,
    `Metin modu: word_only'de sentence ""; word_sentence'ta sözcükten farklı, ≤ 4 sözcük mü?`,
    `visualPrompt yalnız İngilizce, tek durağan simge, jest yok; yetişkinde çizgi film tarzı yok mu?`,
    `"hasta/terapist" yok; ödül, çıkartma yok; yetişkinde "veli", "çocuk", gelişim basamağı yok mu?`,
    `JSON tek parça ve geçerli, alan adları aynen, bütçeler içinde mi?`,
  ],
});

/** Yetişkin eşiği: bu yaştan itibaren simge/muhatap satırı parametrelere eklenir (ev ödeviyle aynı sınır). */
export const YETISKIN_YAS = 18;

/** Yaş kapıyla aynı kaynaktan: önce `ageText` ("34 yaşında", kapı `calcAgeText` ile üretir), yoksa `birthDate`
    yıl farkı (kapının `calcAgeYears` formülü); ikisi de yoksa yetişkin sayılmaz. */
export function yetiskinMi(student: { birthDate: Date | null } | null, ageText: string): boolean {
  const m = /^(\d+) yaş/.exec(ageText.trim());
  if (m) return Number(m[1]) >= YETISKIN_YAS;
  if (student?.birthDate) return new Date().getFullYear() - new Date(student.birthDate).getFullYear() >= YETISKIN_YAS;
  return false;
}

const yasMetni = (student: { birthDate: Date | null } | null, ageText: string): string => {
  const m = /^(\d+) yaş/.exec(ageText.trim());
  if (m) return `${m[1]} yaş`;
  return student?.birthDate ? `${new Date().getFullYear() - new Date(student.birthDate).getFullYear()} yaş` : "yetişkin";
};

/** Son hatırlatma (A1 kullanıcı prompt'u, d): bu araç için en kritik iki kural; kapanış cümlesi aynen korunur. */
export function hatirlatma(symbolCount: number): string[] {
  return [`Tam olarak ${symbolCount} hücre oluştur.`, "Renk kategoriyi izler."];
}

/** A1 odak satırı — koddan türetilir: hücre sayısı → ızgara; metin modu; renk durumu; tür → tek satır işlev odağı
    (custom'da tema tırnak içinde). */
export function odakSatiri(data: CommBoardBody): string {
  const { rows, cols } = izgara(data.symbolCount);
  const tur = data.boardType === "custom"
    ? `custom: tema "${data.customCategory ?? "Özel"}" — ${TUR_ODAK.custom}`
    : `${data.boardType}: ${TUR_ODAK[data.boardType]}`;
  return `${data.symbolCount} hücre (${rows}×${cols}), ${data.textMode}, renk ${data.colorCoding ? "açık" : "kapalı"} → ${tur}.`;
}

/** Yetişkin parametre satırları (≥ 18; yalnız yetişkinde gider, önbellekli sistem prompt'una sayılmaz): pano dil öğretimi
    değil KONUŞMA DESTEĞİDİR — pano-04 hakemi v1'in çocuk AAC basamağını (tek simge → birleşim → cümle) ve jest simgelerini
    yetişkine uymaz buldu. Bütçe satırlarındaki çocuk reçetesi (modelleme, 5 sn bekleme, geçiş ölçütü) burada açıkça
    geri alınır; simge kuralı (gerçekçi, "cartoon/cute/child" yazılmaz) ve muhatap ("veli/çocuk" yazılmaz) buradadır. */
function yetiskinSatirlari(yas: string): string[] {
  return [
    `- Öğrenci yetişkin (${yas}): pano dil öğretimi değil KONUŞMA DESTEĞİDİR — konuşması anlaşılmadığında hücreye işaret edip kendisi söyler. Hücreler onun günlük sözleri ve gereksinimleri (bloktaki iş/sınıf bağlamı, yetişkin kaydı), onarım stratejileri ("tekrar edeyim", "yavaş söylüyorum", "yazarak göstereyim"), evet/hayır, yardım.`,
    `- Yetişkinde usage: dinleyen anlamadığında hangi durumda işaret edip söyler; modelleme ve 5 saniye bekleme yazılmaz. expertNotes ve adaptations: gürültü, yorgunluk, anlaşılırlık koşulları; gelişim basamağı (tek simge → iki sembollü birleşim → cümle) yazılmaz. Simge gerçekçi: çocuksu ya da çizgi film tarzı yok, "cartoon", "cute", "child" yazılmaz; "veli", "çocuk", "çocuğunuz" yazılmaz; homeGuidance muhatabı kendisi ya da yakını.`,
  ];
}

/** A1 kullanıcı prompt'u: öğrenci bloğu (A2, boşsa başlıksız) → parametreler (+ yetişkin satırları koşullu) → odak → son hatırlatma. */
export function buildUserPrompt(
  data: CommBoardBody,
  student: { birthDate: Date | null } | null,
  ageText: string,
  ctx: ToolPromptContext,
): string {
  const { rows, cols } = izgara(data.symbolCount);
  const boardLabel = data.boardType === "custom" && data.customCategory
    ? `Özel — ${data.customCategory}`
    : BOARD_TYPE_LABEL[data.boardType];
  const yetiskin = student && yetiskinMi(student, ageText) ? yetiskinSatirlari(yasMetni(student, ageText)) : [];
  return studioKullaniciPromptu({
    studentBlock: ctx.studentBlock,
    parametreler: [
      `- Pano türü: ${boardLabel}`,
      `- Sembol sayısı: ${data.symbolCount} (${rows}×${cols} grid)`,
      `- Düzen: ${data.layout === "grid" ? "Grid" : "Satır (iletişim şeridi)"}`,
      `- Metin modu: ${data.textMode === "word_only" ? "Sadece kelime" : "Kelime + kısa cümle"}`,
      `- Fitzgerald renk kodlaması: ${data.colorCoding ? "Evet" : "Hayır"}`,
      ...yetiskin,
    ],
    odak: odakSatiri(data),
    hatirlatma: hatirlatma(data.symbolCount),
  });
}

export const POST = createToolHandler({
  rateLimitKey: "comm-board",
  bodySchema,
  cost: 1,
  systemPrompt: SYSTEM_PROMPT,
  toolType: "COMMUNICATION_BOARD",
  category: "language",
  categoryFromWorkArea: true,
  difficulty: "easy",
  creditDescription: "İletişim panosu üretimi",
  responseKey: "board",
  fallbackTitle: "İletişim Panosu",
  studentRequired: false,

  buildUserPrompt,

  enrichContent(content, data) {
    content.boardType   = data.boardType;
    content.symbolCount = data.symbolCount;
    content.layout      = data.layout;
    content.textMode    = data.textMode;
    content.colorCoding = data.colorCoding;
  },
});
