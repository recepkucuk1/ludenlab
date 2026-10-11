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
  image_desc: "cardA somut, çizilebilir nesne; cardB görünüşünü tarif eden ≤ 2 cümle; HER çiftte visualPrompt",
  synonym:    "iki kart da kelime; gerçek eş anlamlı çift (yorumla yakın değil)",
  antonym:    "iki kart da kelime; gerçek zıt anlamlı çift",
  category:   "cardA kelime; cardB kategori adı. Aynı kategoriye 2+ kelime meşru ama kategoriler birbirini KAPSAMAZ (Yiyecek + Meyve yazılmaz)",
  sentence:   "cardA boşluklu cümle, boşluk '___' (tek alt çizgi değil); cardB boşluğa gelen tek kelime; boşluğa oyundaki başka hiçbir cardB oturmaz",
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

/** Odak satırındaki ipucu kuralı — zorluğa göre koddan: yalnız zor düzeyde ipucu. */
export const IPUCU_KURALI: Record<Difficulty, string> = {
  easy:   'yok ("")',
  medium: 'yok ("")',
  hard:   "her çiftte ≤ 8 kelime, cevabı vermez",
};

export const SYSTEM_PROMPT = studioSistemPromptu({
  rol: `Sen LudenLab'in kelime eşleştirme oyunu üreticisisin. Oyunu uzman basar ve öğrenciyle oynar; instructions uzmana/veliye kısa yönerge, expertNotes yalnız uzmana: terim serbest, "öğrenci/uzman" sözcükleri burada da geçerli. Bu bir DİL aracıdır, artikülasyon aracı değil: tanı artikülasyon olsa bile kelimeler hedef sese göre seçilmez; hedef ses en çok expertNotes'ta tek cümle.`,
  klinikCerceve: [
    `Her çift TEK ve KESİN eşleşir: hiçbir cardA başka bir cardB'ye, hiçbir cardB başka bir cardA'ya oturmaz; hiçbir kelime iki kartta geçmez; ters çift ve zincir (büyük–iri, iri–kocaman) yazılmaz. Kategori türünde cardA'lar tekil, kategori adı tekrar edebilir.`,
    `cardB cardA'yı yankılamaz: aynı kelime, kök ya da "X değil" yazılmaz.`,
    `Zorluk sözcük sıklığıdır — kolay → sık, somut (masa, kedi); orta → daha az sık, bazıları soyut (mevsim, mesafe); zor → soyut, çok anlamlı, deyim. Yaş kaydırır: 6 yaşın "orta"sı 12 yaşın "orta"sından daha sık. 18+ öğrencide çocuksu sözcük (oyuncak, miyav) ve "çocuk" yazılmaz; yönerge profesyonel kayıtta.`,
    `Tema verildiyse TÜM çiftler o temadan. Kelimeler gerçek, yaygın Türkçe.`,
    ...TURLER.map((t) => `${t}: ${TUR_TANIMI[t]}.`),
    `Görsel (visualPrompt) ya TÜM çiftlerde ya HİÇBİRİNDE: image_desc her çiftte; category somut nesnelerse her çiftte, değilse hiçbirinde; synonym/antonym/definition/sentence hiçbirinde (""). Komut İngilizce, tek nesne ("a red apple"); Türkçe, stil, arka plan yazılmaz.`,
  ],
  // Ortak dört kural iskeletten gelir; buradakiler yalnız araca özgü ekler.
  ozgulluk: [
    `goalTitle verildiyse kelimeler ve kategoriler o hedefe hizalı: hedefte sayılan gruplar ("yiyecek, taşıt, hayvan") cardB'lerdir; hedef dışı eklenmez.`,
    `İlgi alanı "Uzman notları" satırındadır ("…bayılıyor"): tema boşsa tema odur; tema verildiyse çiftler temadan kalır, ilgi alanı instructions'ta kurulum biçimi olur.`,
    `"Uzman notları" ve "Dikkat edilmesi gerekenler" oynanışı belirler: en az bir instructions/adaptations cümlesi doğrudan karşılar ("sözlü yanıt baskısı" → göstermesi yeter).`,
    `ÖĞRENCİ bloğu yoksa genel materyal: yaş, tanı, ilgi alanı uydurulmaz; expertNotes türe ve zorluğa dayanır.`,
  ],
  karsitOrnek: {
    zayif: 'cardA: "Büyük" — cardB: "Küçük değil"; aynı oyunda "İri" — "Ufak".',
    iyi: '"Büyük" — "Küçük" (antonym, kolay): gerçek zıt, iki kart da tek kelime, hint "" ve visualPrompt "". Aynı oyuna "İri — Ufak" eklenmez ("İri" de "Küçük" ile eşleşir).',
  },
  bicim: {
    giris: "SADECE tek parça, geçerli JSON yaz; açıklama/Markdown çiti yok. Alan adları aynen; matchType ve difficulty istekteki anahtarın aynısı:",
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
      `cardA: kelime kartı ≤ 3 kelime (zor düzeyde deyim için ≤ 5), cümle noktalaması yok; sentence türünde 6–14 kelimelik cümle, boşluk '___'.`,
      `cardB: ≤ 12 kelime; definition tek cümle, image_desc ≤ 2 cümle, diğer türlerde noktasız kelime kartı.`,
      `hint: zor düzeyde her çiftte ≤ 8 kelime, cardB'yi ya da kökünü vermez; kolay ve ortada "".`,
      `visualPrompt: İngilizce tek nesne 2–6 kelime ya da "" (tüm çiftlerde aynı karar).`,
      `instructions: ≤ 3 cümle — dizim, bir tur, doğrulama.`,
      `expertNotes: ≤ 3 cümle — zorlayacak çiftler ve nedeni, seçimin gerekçesi, bir uzatma.`,
      `adaptations: tek dizede "Kolay: …" ve "Zor: …", her biri ≤ 2 cümle (kaç çift, hangi destek).`,
    ],
  },
  ozDenetim: [
    `Çift sayısı istenenle aynı, id'ler 1'den ardışık mı?`,
    `Her çift tek eşleşme mi: hiçbir kelime iki kartta yok, zincir/ters çift yok, yankı yok mu?`,
    `visualPrompt ya hepsinde ya hiçbirinde ve türe uygun; dolu olanlar İngilizce tek nesne mi?`,
    `Kelimeler zorluk sıklığına, yaşa, temaya/hedefe uygun; kart biçimi türe uygun; ipucu yalnız zorda mı?`,
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
  // Tema boşsa: ilgi alanı bloktaki "Uzman notları" satırındadır; o satır yoksa (öğrencisiz ya da notsuz öğrenci) karışık.
  const ilgiAlaniVar = UZMAN_NOTLARI_SATIRI.test(ctx.studentBlock);
  return studioKullaniciPromptu({
    studentBlock: ctx.studentBlock,
    parametreler: [
      `- Eşleştirme türü: ${MATCH_TYPE_LABEL[data.matchType]} (${data.matchType})`,
      `- Çift sayısı: ${data.pairCount} çift`,
      `- Zorluk: ${DIFFICULTY_LABEL[data.difficulty]} (${data.difficulty})`,
      `- Tema: ${tema || (ilgiAlaniVar ? 'verilmedi → ilgi alanından ("Uzman notları")' : "verilmedi → karışık")}`,
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
    content.theme     = data.theme ?? "";
    content.pairCount = parseInt(data.pairCount);
  },
});
