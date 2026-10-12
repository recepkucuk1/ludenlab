import { z } from "zod";
import { createToolHandler, type ToolPromptContext } from "@studio/lib/toolHandler";
import { DIFFICULTY_LABEL } from "@studio/lib/constants";
import { studioKullaniciPromptu, studioSistemPromptu } from "@studio/lib/prompts/iskelet";

/* Kelime eşleştirme oyunu — spec A1 prompt'u (Faz 2 / Task 9).
   Sistem prompt'u sabittir (önbellek) ve `studioSistemPromptu` ile A1 sırasında kurulur; kullanıcı
   prompt'u ortak öğrenci bloğunu (`ctx.studentBlock`, spec A2) olduğu gibi gömer — araç öğrencisiz de
   çalışır (`studentRequired: false`), o zaman blok ve başlığı yoktur. Eski "Öğrenci bilgileri" satırları
   kalktı, kimlik bloktadır. JSON alan adları, istemci (`MatchingGameView`), PDF, görsel rotası
   (`images/route.ts`: dolu `visualPrompt` → resim), `enrichContent`, kredi ve SSE DEĞİŞMEZ (A4).
   Eval kontrollerinin ölçtüğü her kural (çift sayısı, id sırası, kart biçimi, tekrar yok, görsel ya
   hepsinde ya hiçbirinde, İngilizce komut, tür/zorluk yankısı) prompt'ta BİR KEZ ve açıkça yazılıdır:
   eşleşme/tür/görsel kuralları klinik çerçevede, kart uzunluk ve noktalama kuralları alan bütçelerinde.
   Sözleşme: `prompt.test.ts`. */

const bodySchema = z.object({
  studentId:  z.string().optional(),
  matchType:  z.enum(["definition", "image_desc", "synonym", "antonym", "category", "sentence"]),
  pairCount:  z.enum(["6", "8", "10", "12"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  theme:      z.string().max(100).optional(),
  goalTitle:  z.string().max(300).optional(),
});
type MatchingGameBody = z.infer<typeof bodySchema>;
type MatchType = MatchingGameBody["matchType"];
type Difficulty = MatchingGameBody["difficulty"];

/** Parametre etiketleri — eval adaptörü (`evals/tools/studio/matching-game/adapter.ts`) hakeme aynı metni gösterir. */
export const MATCH_TYPE_LABEL: Record<MatchType, string> = {
  definition: "Kelime — Tanım",
  image_desc: "Kelime — Resim Açıklaması",
  synonym:    "Eş Anlamlı",
  antonym:    "Zıt Anlamlı",
  category:   "Kategori Eşleştirme",
  sentence:   "Cümle Tamamlama",
};

/** Türün tek satır tanımı (klinik çerçevede bir kez): hangi kart ne. Eval `kart_bicimi` bu kuralları ölçer. */
const TUR_TANIMI: Record<MatchType, string> = {
  definition: "cardA kelime; cardB TEK cümlelik tanım (kelime ve kökü geçmez)",
  image_desc: "cardA somut nesne; cardB görünüşünü DOĞRU tarif eden ≤ 2 cümle, onu oyundaki yakınlarından ayıran özellikle (kaşık: ucu çukur), uydurma parça yazılmaz; visualPrompt aynı nesne, HER çiftte",
  synonym:    "iki kart da kelime; gerçek eş anlamlı çift",
  antonym:    "iki kart da kelime; gerçek zıt anlamlı çift",
  category:   "cardA kelime; cardB kategori adı; aynı kategoriye 2+ kelime meşru, kategoriler birbirini KAPSAMAZ (Yiyecek + Meyve)",
  sentence:   "cardA boşluklu cümle, boşluk '___' (tek alt çizgi değil); cardB boşluğa gelen tek ad ya da sıfat (eylem yazılmaz); yerleşince cümle dil bilgisi açısından kusursuz; boşluğa başka hiçbir cardB oturmaz, bağlam cardB'yi tek başına belirler",
};
const TURLER = Object.keys(TUR_TANIMI) as MatchType[];

/** Odak satırındaki görsel kuralı — türe göre koddan (eval `gorsel_tutarli`: ya hepsinde ya hiçbirinde). */
export const GORSEL_KURALI: Record<MatchType, string> = {
  definition: "hiçbir çiftte",
  image_desc: "her çiftte",
  synonym:    "hiçbir çiftte",
  antonym:    "hiçbir çiftte",
  category:   "somut nesnelerse her çiftte, değilse hiçbirinde",
  sentence:   "hiçbir çiftte",
};

/** Odak satırındaki ipucu kuralı — zorluğa göre koddan: kolay boş, orta yalnız az sık / eski sözcüklü çiftlerde, zor her çiftte. */
export const IPUCU_KURALI: Record<Difficulty, string> = {
  easy:   'yok ("")',
  medium: 'yalnız az sık / eski sözcüklü çiftlerde ≤ 8 kelime, kalanında ""',
  hard:   "her çiftte ≤ 8 kelime, cevabı vermez",
};

export const SYSTEM_PROMPT = studioSistemPromptu({
  rol: `Sen LudenLab'in kelime eşleştirme oyunu üreticisisin; uzman basar. instructions uzmana kısa yönerge; expertNotes yalnız uzmana: terim serbest, "öğrenci/uzman" sözcükleri burada da geçerli. DİL aracı, artikülasyon değil: kelimeler hedef sese göre seçilmez; hedef ses en çok expertNotes'ta tek cümle.`,
  klinikCerceve: [
    `Her çift TEK ve KESİN eşleşir: hiçbir kart başka kartla da oturmaz, hiçbir kelime iki kartta geçmez, ters çift ve zincir (büyük–iri–kocaman) yazılmaz. Kategoride cardA'lar tekil, kategori adı tekrar edebilir.`,
    `cardB cardA'yı yankılamaz: aynı kelime, kök ya da "X değil" yazılmaz.`,
    `Zorluk sözcük sıklığıdır — kolay → sık, somut; orta → az sık, bazıları soyut; zor → soyut kavram, çok anlamlı, deyim (sabır, göz kulak olmak). Yaş yalnız kolay ve ortayı kaydırır (6 yaşın "orta"sı 12'ninkinden sık); "zor" her yaşta soyuttur. 18+ öğrencide çocuksu sözcük ve "çocuk" yazılmaz, yönerge profesyonel.`,
    `Tema verildiyse TÜM çiftler o temadan. Kelimeler gerçek Türkçe; cümle ve tarifler günlük, tıbbi/klinik bağlam yazılmaz.`,
    ...TURLER.map((t) => `${t}: ${TUR_TANIMI[t]}.`),
    `visualPrompt ya TÜM çiftlerde ya HİÇBİRİNDE: image_desc ve somut nesneli category her çiftte; diğer category ve synonym/antonym/definition/sentence hiçbirinde. Komut İngilizce tek nesne; stil, arka plan yazılmaz.`,
  ],
  // Ortak dört kural iskeletten gelir; buradakiler yalnız araca özgü ekler.
  ozgulluk: [
    `goalTitle verildiyse kelimeler o hedefe hizalı: hedefte sayılan gruplar cardB'lerdir; hedef dışı eklenmez.`,
    `İlgi alanı "Uzman notları" satırında ("…bayılıyor"): tema boşsa çiftlerin en az yarısı ondan (hedef/tür önce); tema verildiyse çiftler temadan, ilgi alanı uzatma ya da adaptations'ta, yönergeye zorla sokulmaz.`,
    `"Uzman notları" ve "Dikkat edilmesi gerekenler" oynanışı belirler: en az bir instructions/adaptations cümlesi karşılar ("sözlü yanıt baskısı" → göstermesi yeter).`,
    `ÖĞRENCİ bloğu yoksa genel materyal: yaş, tanı, ilgi alanı uydurulmaz.`,
  ],
  karsitOrnek: {
    zayif: '"Büyük" — "Küçük değil"; aynı oyunda "İri" — "Ufak".',
    iyi: '"Büyük" — "Küçük" (antonym, kolay): gerçek zıt, tek kelime kartlar, hint "" ve visualPrompt "". "İri — Ufak" eklenmez ("İri" de "Küçük" ile eşleşir).',
  },
  bicim: {
    giris: "SADECE tek parça, geçerli JSON; Markdown çiti yok. Alan adları aynen; matchType ve difficulty istekteki anahtar:",
    sema: `{
  "title": "…",
  "matchType": "definition|image_desc|synonym|antonym|category|sentence",
  "difficulty": "easy|medium|hard",
  "pairs": [{ "id": 1, "cardA": "…", "cardB": "…", "hint": "…", "visualPrompt": "…" }],
  "instructions": "…",
  "expertNotes": "…",
  "adaptations": "Kolay: … Zor: …"
}`,
    butce: [
      `title: ≤ 6 kelime; tür ve tema görünür.`,
      `pairs: TAM istenen çift sayısı; id 1'den ardışık.`,
      `cardA: kelime kartı ≤ 3 kelime (zorda deyim için ≤ 5), cümle noktalaması yok; sentence: 6–14 kelimelik cümle, boşluk '___'.`,
      `cardB: ≤ 12 kelime; definition tek cümle, image_desc ≤ 2 cümle, diğerlerinde noktasız kelime kartı.`,
      `hint: ≤ 8 kelime, cardB'yi/kökünü vermez; zorda her çiftte, ortada yalnız az sık sözcüklü çiftlerde, kolayda "".`,
      `visualPrompt: İngilizce tek nesne 2–6 kelime ya da ""; anahtar her çiftte, karar tüm çiftlerde aynı.`,
      `instructions: ≤ 3 cümle — dizim, bir tur, doğrulama.`,
      `expertNotes: 4–5 cümle — zorlayacak çiftler ve nedeni; yakın çiftleri ayırt ettirme yolu; seçimin profil/hedef gerekçesi (öğrencisizde tür ve zorluk); bir uzatma.`,
      `adaptations: tek dizede "Kolay: …" ve "Zor: …", her biri 2–3 cümle: kaç çift, hangi destek (gösterme, ilk ses, ipucu kartı), ne zaman geçilir.`,
    ],
  },
  ozDenetim: [
    `Çift sayısı istenen, id'ler 1'den ardışık mı?`,
    `Her çift tek eşleşme mi: kelime iki kartta yok, zincir/ters çift ve yankı yok mu?`,
    `visualPrompt ya hepsinde ya hiçbirinde; dolular İngilizce tek nesne mi?`,
    `Kelimeler zorluk sıklığına, yaşa, temaya/hedefe uygun; kart biçimi türe, ipucu zorluğa uygun mu?`,
    `matchType ve difficulty istekteki anahtar; JSON tek parça; "hasta/terapist" yok mu?`,
  ],
});

/** Son hatırlatma (A1 kullanıcı prompt'u, d): bu aracın iki en kritik kuralı. */
export const HATIRLATMA = ["Tek ve kesin eşleşme.", "Görsel tutarlılığı: ya hepsinde ya hiçbirinde."] as const;

/** Yetişkin öğrencide parametrelere eklenen kitle satırı (sistem prompt'undaki 18+ kuralını tetikler). */
const YETISKIN_SATIRI = "- Kitle: yetişkin öğrenci (18+) — çocuksu sözcük yazılmaz; yönerge yetişkine, profesyonel kayıtta.";

const YETISKIN_YASI = 18;

/**
 * 18+ öğrencide kelimeler ve yönerge yetişkine. Doğum tarihi varsa yaş oradan (kapıdaki `calcAgeYears`
 * ile aynı yıl farkı); yoksa kapının verdiği yaş metni ("34 yaşında"); ikisi de yoksa çocuk varsayılır.
 */
export function yetiskinMi(student: { birthDate: Date | null } | null, ageText: string): boolean {
  const yas = student?.birthDate
    ? new Date().getFullYear() - new Date(student.birthDate).getFullYear()
    : Number(/^(\d+)\s/.exec(ageText)?.[1]);
  return Number.isFinite(yas) && yas >= YETISKIN_YASI;
}

/** A1 odak satırı — koddan türetilir: çift sayısı, tür ve zorluk anahtarı → görsel kuralı (türe göre) + ipucu kuralı (zorluğa göre). */
export function odakSatiri(pairCount: MatchingGameBody["pairCount"], matchType: MatchType, difficulty: Difficulty): string {
  return `${pairCount} çift, ${matchType}, ${difficulty} → görsel: ${GORSEL_KURALI[matchType]}; ipucu: ${IPUCU_KURALI[difficulty]}.`;
}

/** Bloğun "Uzman notları:" satırı (studentContext.ts) — ilgi alanı yalnız oradadır; satır yoksa tema yönlendirmesi yapılmaz. */
const UZMAN_NOTLARI_SATIRI = /^Uzman notları:/m;

/** A1 kullanıcı prompt'u: öğrenci bloğu (A2, boşsa başlıksız) → parametreler → odak → son hatırlatma. */
export function buildUserPrompt(data: MatchingGameBody, student: { birthDate: Date | null } | null, ageText: string, ctx: ToolPromptContext): string {
  const tema = data.theme?.trim();
  // Tema boşsa: ilgi alanı bloktaki "Uzman notları" satırındadır; satır yalnız klinik not da taşıyabilir, bu yüzden
  // koşullu söylenir ("varsa o, yoksa karışık"); satır yoksa (öğrencisiz ya da notsuz öğrenci) doğrudan karışık.
  const ilgiAlaniVar = UZMAN_NOTLARI_SATIRI.test(ctx.studentBlock);
  return studioKullaniciPromptu({
    studentBlock: ctx.studentBlock,
    parametreler: [
      `- Eşleştirme türü: ${MATCH_TYPE_LABEL[data.matchType]} (${data.matchType})`,
      `- Çift sayısı: ${data.pairCount} çift`,
      `- Zorluk: ${DIFFICULTY_LABEL[data.difficulty]} (${data.difficulty})`,
      `- Tema: ${tema || (ilgiAlaniVar ? 'verilmedi → "Uzman notları" satırında ilgi alanı varsa o, yoksa karışık' : "verilmedi → karışık")}`,
      ...(data.goalTitle ? [`- Müfredat hedefi: ${data.goalTitle}`] : []),
      ...(yetiskinMi(student, ageText) ? [YETISKIN_SATIRI] : []),
    ],
    odak: odakSatiri(data.pairCount, data.matchType, data.difficulty),
    hatirlatma: [...HATIRLATMA],
  });
}

export const POST = createToolHandler({
  rateLimitKey: "matching-game",
  bodySchema,
  cost: 1,
  systemPrompt: SYSTEM_PROMPT,
  toolType: "MATCHING_GAME",
  category: "language",
  categoryFromWorkArea: true,
  creditDescription: "Kelime eşleştirme oyunu üretimi",
  responseKey: "game",
  fallbackTitle: "Kelime Eşleştirme",
  studentRequired: false,

  buildUserPrompt,

  enrichContent(content, data) {
    // Rozet/PDF `matchType` ve `difficulty` anahtarıyla çalışır; model etikete kayabilir → istekten yazılır.
    content.matchType  = data.matchType;
    content.difficulty = data.difficulty;
    content.theme      = data.theme ?? "";
    content.pairCount  = parseInt(data.pairCount);
  },
});
