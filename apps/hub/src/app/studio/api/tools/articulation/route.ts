import { z } from "zod";
import { articulationBodySchema as bodySchema } from "@studio/lib/toolSchemas";
import { createToolHandler, type ToolPromptContext } from "@studio/lib/toolHandler";
import { studioKullaniciPromptu, studioSistemPromptu } from "@studio/lib/prompts/iskelet";
import { articulation } from "@ludenlab/ai";
import { lookupCachedWordImage } from "@studio/lib/generateWordImage";

/* Artikülasyon alıştırması — spec A1 prompt'u (Faz 2 / Task 11).
   Sistem prompt'u sabittir (önbellek) ve `studioSistemPromptu` ile A1 sırasında kurulur; kullanıcı
   prompt'u ortak öğrenci bloğunu (`ctx.studentBlock`, spec A2) olduğu gibi gömer — eski "Öğrenci
   bilgileri" satırları kalktı, kimlik (rumuz, yaş, alan, tanı) bloktadır. Öğrenci isteğe bağlıdır; blok
   boşsa başlık da yok. Yetişkin öğrenci (≥ 18) KODDA koşulludur (`yetiskinMi`). Banka kuralı (kelime
   düzeyinde items [] / cümle-bağlamda yalnız liste, sırayla) odak satırında koddan yazılır.
   Bağlam örneği ADSIZ: eski prompt "Selin…" içeriyordu ve eval PII maskesi (`evals/lib/piiMask.ts`) o
   parçayı maskeliyordu; artık maske girdisi gerekmiyor.
   Tur 2 (inceleme): sonda EKSİZ kuralı NASIL'ı da söyler (özne/yalın nesne; eki atılmış bozuk cümle yazılmaz —
   tur 1 art-10), her cümle dilbilgisi kusursuz (zorlama ses yoğunluğu yok), bağlam örneği doğal 3 cümle,
   /ğ/ ipucu (temas yok, ünlü uzar — art-05); uzman notu kuralı yalnız bütçe satırında.
   JSON alan adları, sayfa (`tools/articulation/page.tsx`), PDF, görsel rotası (`visualPrompt`/`imageUrl`),
   `enrichContent`, kredi, `maxTokens` ve SSE DEĞİŞMEZ (A4). Sözleşme: `prompt.test.ts` +
   `articulationContextual.test.ts`. */

type ArticulationBody = z.infer<typeof bodySchema>;
type Level = ArticulationBody["level"];

/** `ctx.stash` içeriği — prompt kurulurken seçilen banka kelimeleri, `enrichContent`'te okunur (öğrenci seçiliyken `data` rumuzlu KOPYADIR; ona iliştirilen yolda kaybolur). */
type BankStash = { bankWords?: articulation.SelectedWord[] };

/**
 * Banka-zorunlu kelime seçimi. Kelime üreten seviyelerde (word/sentence/contextual) kelimeler
 * YALNIZCA bankadan gelir — tek bir kelime bile banka dışından ÜRETİLMEZ (uydurma kelime önlenir).
 * Çok-sesli drill'lerde tüm seçili seslerin kelimeleri birleştirilir. Tüm 29 harf bankada olduğundan
 * bu yol pratikte her zaman çalışır. isolated/syllable seviyeleri kelime değil ses/hece deseni üretir
 * (banka kapsamı dışı) → null döner, eski akış devam eder.
 */
function pickBankWords(data: Pick<ArticulationBody, "targetSounds" | "positions" | "itemCount" | "level">): articulation.SelectedWord[] | null {
  if (!BANKA_SEVIYELERI.has(data.level)) return null;
  if (data.targetSounds.length === 0) return null;
  // Tüm hedef sesler bankada olmalı (aksi halde banka-dışı üretim gerekirdi — buna izin yok).
  const allBanked = data.targetSounds.every(
    (s) => articulation.WORD_BANK[articulation.soundToLetter(s)],
  );
  if (!allBanked) return null;
  const picked = articulation.selectWordsMulti(
    articulation.WORD_BANK,
    data.targetSounds,
    data.positions,
    data.itemCount,
  );
  return picked.length > 0 ? picked : null;
}

const BANKA_SEVIYELERI: ReadonlySet<Level> = new Set<Level>(["word", "sentence", "contextual"]);

/** Parametre etiketleri — eval adaptörü (`evals/tools/studio/articulation/adapter.ts`) hakeme aynı seviye adlarını gösterir. */
export const LEVEL_LABEL: Record<Level, string> = {
  isolated:   "İzole Ses",
  syllable:   "Hece Düzeyi",
  word:       "Kelime Düzeyi",
  sentence:   "Cümle Düzeyi",
  contextual: "Bağlam İçi",
};

const POSITION_LABEL: Record<ArticulationBody["positions"][number], string> = {
  initial: "Başta",
  medial:  "Ortada",
  final:   "Sonda",
};

/** Seviye başına items[] biçimi — tek satır: klinik çerçevede ve odak satırında aynı metin (model aynı
    tanımı iki kez görür). Kelime düzeyinde banka verildiyse ayrı satır (`ODAK_KELIME_BANKA`). */
export const SEVIYE_BICIMI: Record<Level, string> = {
  isolated:   `items: word = yalnız hedef sesten kurulu tekrar deseni ("şşş", "ş - ş - ş"; uzun/kısa/ritimli) + targetSound; visualPrompt yok`,
  syllable:   `items: word = hece + syllableType ("açık" = ünlüyle biter, "kapalı" = ünsüzle biter) + exampleWord (o heceyi taşıyan gerçek kelime) + targetSound + position; visualPrompt yok`,
  word:       `items: word (gerçek, yaygın kelime) + syllableCount + syllableBreak + position + targetSound + visualPrompt`,
  sentence:   `items: word + syllableBreak + syllableCount + position + targetSound + visualPrompt + "sentence" = o kelimeyi içeren tek cümle (≤ 10 kelime)`,
  contextual: `items: word + syllableBreak + syllableCount + position + targetSound + visualPrompt + "sentence" = o kelimeyi içeren, hedef sesi sık kullanan 3-4 cümlelik paragraf`,
};
export const ODAK_KELIME_BANKA = `items: [] — kelimeler sistemce bankadan eklenir; yalnız title, expertNotes, cueTypes, homeGuidance`;

export const SYSTEM_PROMPT = studioSistemPromptu({
  rol: `Sen LudenLab Studio'nun artikülasyon alıştırması üreticisisin. Uzman üretir, basar ve seansta uygular; homeGuidance'ı veli okur (öğrenci 18 yaş ve üzeriyse kendisi). Kayıt sade, doğal Türkçe; okuyana "siz". expertNotes yalnız uzmana: terim serbest, "öğrenci/uzman" burada da geçerli.`,
  klinikCerceve: [
    `Hiyerarşi: izole → hece → kelime → cümle → bağlam. Yalnız istenen seviye üretilir; üst seviyeye geçiş ölçütü expertNotes'ta sayıyla.`,
    `Hedef ses istenen pozisyonda (başta/ortada/sonda), hedef HARF her kelimede (/ç/ için "güneş" olmaz, "ağaç" olur). Olmayan pozisyon (başta /ğ/) uydurulmaz: olanlar üretilir, notta belirtilir.`,
    `Seviye biçimi Odak satırındadır; word her seviyede dolu. Hece: "açık" = ünlüyle biter, "kapalı" = ünsüzle biter; ortada "a-şa"; etiket hedef harfi taşıyan parçaya göre.`,
    `BANKA: kelime listesi verilmişse YALNIZ o kelimeler, verilen sırayla, her kelimeye bir öğe; cümle ve paragraf senin. Kelime düzeyinde banka → items [] (sistem ekler).`,
    `Sonda pozisyonda kelime cümlede EKSİZ geçer ("mantar", "mantarı" değil); bunun için kelimeyi özne ya da yalın nesne yap ("Mantar ormanda büyür."); eki atılmış bozuk cümle ("Resmi duvar süslüyor") yazılmaz.`,
    `Yaş cümleyi belirler: ≤ 5 yaş 3–5 kelime, günlük nesneler; 6–9 yaş ≤ 7; 10 yaş üstü ≤ 10; yetişkinde iş ve günlük yaşam. Her cümle doğal, dilbilgisi kusursuz Türkçe; ses sıklığı için zorlama cümle kurulmaz.`,
    `cueTypes: Görsel / Dokunsal / İşitsel, BU sesin yerleşimine özgü (/s/ dil ucu alt dişlerin arkasında, ince hava el sırtında; /r/ dil ucu titreşimi; /k/ dil arkası damağa, öksürük taklidi; /ğ/ temas yok, önceki ünlüyü uzatır).`,
  ],
  // Ortak dört kural iskeletten gelir; buradakiler yalnız araca özgü ekler.
  ozgulluk: [
    `Bloktaki "Tanı" hata örüntüsünü ve ipucunu belirler (öne alma → dil arkası; işitme kaybı → görsel/dokunsal). İlgi alanı "Uzman notları"ndadır ("…bayılıyor"): cümle ve paragraflara malzeme.`,
    `Blok yoksa genel çocuk materyali; profil uydurulmaz.`,
    `Öğrenci 18 yaş ve üzeriyse homeGuidance kendisine; "veli", "çocuğunuz", "oyun" yazılmaz.`,
    `Uydurma kişi adı yazılmaz.`,
  ],
  karsitOrnek: {
    zayif: "Uzman notu: Düzenli tekrar önemlidir; sabırlı olun, motivasyonu yüksek tutun.",
    iyi: "Uzman notu: /ş/ kelime başında dudaklar hafif yuvarlak, dil ucu geride; ayna karşısında 'şapka'yı önce uzatarak 'şşşapka' söyletin, 5 doğru üretimden sonra uzatmayı kaldırın.",
  },
  bicim: {
    giris: "Yanıtını SADECE tek parça, geçerli JSON olarak ver; açıklama ve Markdown çiti yok. Alan adları aynen:",
    sema: `{ "title": "…", "targetSounds": ["…"], "positions": ["…"], "level": "…",
  "items": [{ "word": "…", "syllableCount": 0, "syllableBreak": "…", "position": "…", "targetSound": "…", "sentence": "…", "visualPrompt": "…" }],
  "expertNotes": "…", "cueTypes": ["…"], "homeGuidance": "…" }
Hece düzeyi (syllable) için items[] örneği:
[{ "word": "şa", "syllableType": "açık", "exampleWord": "şapka", "targetSound": "/ş/", "position": "initial" }, { "word": "şap", "syllableType": "kapalı", "exampleWord": "şapka", "targetSound": "/ş/", "position": "initial" }]
Bağlam düzeyi (contextual) için items[] örneği:
[{ "word": "şemsiye", "syllableCount": 3, "syllableBreak": "şem-si-ye", "position": "initial", "targetSound": "/ş/", "sentence": "Yağmur şiddetlendi. Şemsiyemi alıp okula koştum. Şemsiyenin altında şapkam ıslanmadı.", "visualPrompt": "an open umbrella in the rain" }]`,
    butce: [
      `title: ≤ 8 kelime; targetSounds, positions, level: parametreden aynen.`,
      `items: tam istenen sayıda öğe (banka verildiyse banka kadar; kelime düzeyinde banka → []).`,
      `sentence: cümle düzeyinde tek cümle ≤ 10 kelime (yaşa göre kısa); bağlamda 3-4 cümle, hedef ses ≥ 4 kez, tek konu.`,
      `visualPrompt: ≤ 8 İngilizce kelime, "word" ile aynı tek somut nesne; stil yok; soyut kelimede ""; izole/hecede alan yok.`,
      `expertNotes: 4–6 cümle — yerleşim, tanıya bağlı hata örüntüsü ve düzeltme, ilerleme ölçütü (sayı), hata anında ne yapılır; her vakaya yapışabilen cümle yazılmaz.`,
      `cueTypes: tam 3 madde "Görsel (…)", "Dokunsal (…)", "İşitsel (…)"; parantezde bu sese özgü somut eylem, ≤ 12 kelime.`,
      `homeGuidance: 4–5 cümle — rutin anı ve dakika, önce yetişkin modeli sonra öğrenci, hatada doğru model bir kez daha, ne not edilir; ödül yok.`,
    ],
  },
  ozDenetim: [
    `Her öğede hedef harf var ve istenen pozisyonda; word her seviyede dolu mu?`,
    `Banka verildiyse yalnız o kelimeler aynı sırada; kelime düzeyinde items [] mi?`,
    `Cümle uzunluğu yaşa uygun, sonda kelime eksiz; bağlamda 3-4 cümle mi?`,
    `visualPrompt somut kelimede İngilizce, soyutta boş, izole/hecede yok mu?`,
    `Not ve ipuçları bu sese, seviyeye, tanıya özgü; "hasta/terapist", ödül yok mu?`,
    `JSON tek parça ve geçerli, alan adları aynen mi?`,
  ],
});

/** Son hatırlatma (A1 kullanıcı prompt'u, d): bu araç için en kritik iki kural. */
export const HATIRLATMA: readonly string[] = ["Hedef harf her kelimede.", "Uzman notu bu sese ve seviyeye özgü."];

/** Yetişkin eşiği (ev ödevi ve iletişim panosuyla aynı sınır). */
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

/** A1 odak satırı — koddan türetilir: seviye, öğe sayısı (banka varsa banka kadar), pozisyonlar → seviye biçimi; banka durumu.
    Kelime düzeyinde banka verildiyse biçim `ODAK_KELIME_BANKA` (model öğe üretmez). */
export function odakSatiri(data: Pick<ArticulationBody, "level" | "itemCount" | "positions">, bank: articulation.SelectedWord[] | null): string {
  const n = bank ? bank.length : data.itemCount;
  const pozisyon = data.positions.map((p) => POSITION_LABEL[p]).join(", ");
  const bicim = bank && data.level === "word" ? ODAK_KELIME_BANKA : SEVIYE_BICIMI[data.level];
  return `${LEVEL_LABEL[data.level]}, ${n} öğe, pozisyon ${pozisyon} → ${bicim}; banka: ${bank ? "verildi, yalnız bu kelimeler" : "yok"}.`;
}

/** A1 kullanıcı prompt'u: öğrenci bloğu (A2, boşsa başlıksız) → parametreler (+ banka listesi, + yetişkin satırı koşullu) → odak → son hatırlatma. */
export function buildUserPrompt(
  data: ArticulationBody,
  student: { birthDate: Date | null } | null,
  ageText: string,
  ctx: ToolPromptContext,
): string {
  const bankWords = pickBankWords(data);
  if (bankWords) {
    (ctx.stash as BankStash).bankWords = bankWords;
  }
  const banka = bankWords
    ? [
        `- Banka kelimeleri (${bankWords.length}${bankWords.length < data.itemCount ? `; istenen ${data.itemCount}, banka bu kadar` : ""}; bu sırayla${
          data.level === "word" ? "; sistem items'a ekler, notlarda anabilirsin" : ", her kelimeye bir öğe"
        }): ${bankWords.map((w) => w.word).join(", ")}`,
      ]
    : [];
  const yetiskin = yetiskinMi(student, ageText)
    ? [`- Öğrenci yetişkin (${yasMetni(student, ageText)}): cümle ve paragraflar iş ve günlük yaşamdan; "veli", "çocuğunuz", "oyun" yazılmaz; homeGuidance kendisine "siz" ile.`]
    : [];
  return studioKullaniciPromptu({
    // Eski sözleşme testleri (articulationContextual.test.ts) ctx'i bloksuz kurar; kapı her zaman dize verir.
    studentBlock: ctx.studentBlock || "",
    parametreler: [
      `- Hedef ses(ler): ${data.targetSounds.join(", ")}`,
      `- Ses pozisyonu: ${data.positions.map((p) => POSITION_LABEL[p]).join(", ")}`,
      `- Alıştırma seviyesi: ${LEVEL_LABEL[data.level]}`,
      `- Kelime/öğe sayısı: ${data.itemCount}`,
      ...banka,
      ...yetiskin,
    ],
    odak: odakSatiri(data, bankWords),
    hatirlatma: [...HATIRLATMA],
  });
}

export const POST = createToolHandler({
  rateLimitKey: "articulation",
  bodySchema,
  studentRequired: false,
  cost: 1,
  systemPrompt: SYSTEM_PROMPT,
  toolType: "ARTICULATION_DRILL",
  category: "speech",
  categoryFromWorkArea: true,
  creditDescription: "Artikülasyon alıştırması üretimi",
  responseKey: "drill",
  fallbackTitle: "Artikülasyon Alıştırması",

  // Tavana çarpan çıktı JSON'u ortadan keser: uzman hata görür, API bedeli yine ödenir.
  // Cümle düzeyinde 30 öğe ~4.000 token. Bağlam düzeyi öğe başına 3-4 cümlelik paragraf
  // yazdığından öğe başına ~150-165 token harcar: 30 öğe ölçümde 5.015 token tuttu ve bir
  // tekrarda eski 5.500 tavanında KESİLDİ (2026-09-16). 8.000 bu yüke ~%50 pay bırakır;
  // Sonnet 4.6 hızında ~135 sn sürer, streamingJson'un 240 sn sınırının altında.
  // Ücret üretilen token kadardır; tavan yükseltmek tek başına maliyet artırmaz.
  maxTokens: 8000,

  buildUserPrompt,

  async enrichContent(content, data, ctx) {
    // İstek anahtarları SUNUCUDAN yazılır: A1 prompt'u seviyeyi "Cümle Düzeyi" etiketiyle verince model
    // `level`e "cümle"/"bağlam" yazdı; arayüz ve PDF `level === "sentence"|"contextual"` ile cümleyi
    // gösterdiğinden canlıda cümle/bağlam düzeyi kelime düzeyi gibi göründü (2026-10-12).
    content.level        = data.level;
    content.targetSounds = data.targetSounds;
    content.positions    = data.positions;
    const stash = (ctx.stash as BankStash).bankWords;
    if (stash) {
      if (data.level === "word") {
        // Kelime düzeyi: item'ları tamamen bankadan kur (Claude'unkini yok say).
        content.items = stash.map((w) => ({
          word: w.word,
          syllableCount: w.syllableCount,
          syllableBreak: w.syllableBreak,
          position: w.position,
          targetSound: w.targetSound ?? data.targetSounds[0],
          visualPrompt: w.visualPrompt,
        }));
      } else {
        // Cümle/bağlam: Claude'un cümlesini koru, kelime/hece/görsel'i bankadan otoriter yaz.
        const items = Array.isArray(content.items) ? content.items : [];
        content.items = stash.map((w, i) => {
          const src = (items[i] ?? {}) as Record<string, unknown>;
          return {
            ...src,
            word: w.word,
            syllableCount: w.syllableCount,
            syllableBreak: w.syllableBreak,
            position: w.position,
            targetSound: w.targetSound ?? data.targetSounds[0],
            visualPrompt: w.visualPrompt,
          };
        });
      }
      // banka yolu: hedef-harf filtresine gerek yok
    } else {
      // (banka-DIŞI sesler için güvence — hedef-harf filtresi)
      // Deterministik hedef-ses güvencesi: prompt kuralına rağmen Claude bazen hedef sesi
      // İÇERMEYEN kelime üretiyor (ör. /k/ alıştırmasında "balon"·"çorap", /ç/'de "güneş").
      // Türkçe'de bu sesler tek harfle yazılır (k, m, ç, p, s, ş…) → hedef harfi içermeyen
      // item'ı kesin olarak ele. Prompt %100 değil; bu filtre kesindir.
      const letters = data.targetSounds
        .map((s) => s.replace(/\//g, "").trim().toLocaleLowerCase("tr-TR"))
        .filter((s) => s.length > 0);
      const items = content.items;
      if (letters.length > 0 && Array.isArray(items)) {
        const before = items.length;
        content.items = items.filter((it) => {
          const word = (it as { word?: unknown }).word;
          const w = typeof word === "string" ? word.toLocaleLowerCase("tr-TR") : "";
          return letters.some((l) => w.includes(l));
        });
        const dropped = before - (content.items as unknown[]).length;
        if (dropped > 0) {
          console.warn(
            `[articulation] hedef-ses filtresi: ${dropped} alakasız kelime elendi (hedef=${data.targetSounds.join(",")})`,
          );
        }
      }
    }

    // HER İKİ YOL — cache'teki hazır görseli item'lara ÜCRETSİZ iliştir (banka kelimeleri
    // ön-üretildi → yalnız DB lookup, üretim/kredi YOK; araç doğası gereği resimli sonuç döner).
    // Cache'te olmayan (banka-dışı / çok-sesli) kelimeler imageUrl'siz kalır → istemci onları
    // otomatik gerçek üretime gönderir (orada kredi alınır).
    const finalItems = content.items;
    if (Array.isArray(finalItems)) {
      await Promise.all(
        finalItems.map(async (it) => {
          const rec = it as { word?: unknown; imageUrl?: unknown };
          if (typeof rec.word === "string" && !rec.imageUrl) {
            const url = await lookupCachedWordImage(rec.word);
            if (url) rec.imageUrl = url;
          }
        }),
      );
    }
  },
});
