import { z } from "zod";
import { createToolHandler, type ToolPromptContext } from "@studio/lib/toolHandler";
import { studioKullaniciPromptu, studioSistemPromptu } from "@studio/lib/prompts/iskelet";

/* Sosyal hikâye — spec A1 prompt'u (Faz 2 / Task 6).
   Sistem prompt'u sabittir (önbellek) ve `studioSistemPromptu` ile A1 sırasında kurulur; kullanıcı
   prompt'u ortak öğrenci bloğunu (`ctx.studentBlock`, spec A2) olduğu gibi gömer — eski "Öğrenci
   bilgileri" satırları kalktı, kimlik bloktadır. JSON alan adları (istemci, PDF ve `images/route.ts`
   `type/text/visualPrompt` okur), `enrichContent`, kredi ve SSE DEĞİŞMEZ (A4). Sözleşme: `prompt.test.ts`. */

const bodySchema = z.object({
  studentId:     z.string().min(1),
  situation:     z.string().min(1).max(200),
  environment:   z.enum(["Okul", "Ev", "Park", "Market", "Hastane", "Rehabilitasyon merkezi"]),
  length:        z.enum(["short", "medium", "long"]),
  visualSupport: z.boolean().optional(), // artık her cümle görselli — alan kullanılmıyor (geriye-uyum)
});
type SocialStoryBody = z.infer<typeof bodySchema>;

/** Bu yaştan itibaren homeGuidance'ın muhatabı veli değil öğrencinin kendisi ya da yakınıdır (rol, öz-denetim ve kullanıcı prompt'u aynı sabiti okur). */
export const YETISKIN_YASI = 18;

/** Uzunluk etiketi ve cümle aralığı — eval kontrolleri (`evals/tools/studio/social-story/checks.ts` LEN) aynı aralıkları ölçer. */
export const LENGTH_LABEL: Record<SocialStoryBody["length"], string> = { short: "Kısa", medium: "Orta", long: "Uzun" };
export const CUMLE_ARALIGI: Record<SocialStoryBody["length"], string> = { short: "3–5", medium: "6–10", long: "11–15" };
const UZUNLUK_SATIRI = (Object.keys(CUMLE_ARALIGI) as SocialStoryBody["length"][]).map((l) => `${l} ${CUMLE_ARALIGI[l]}`).join(", ");

export const SYSTEM_PROMPT = studioSistemPromptu({
  rol: `Sen LudenLab Studio'nun sosyal hikâye üreticisisin. Hikâyeyi dil ve konuşma uzmanı ister; okuyan ya da dinleyen ÇOCUKTUR (uzman ve veli okutur). Hikâye birinci tekil kişiden, sıcak, somut ve çocuğun günlük dilinde yazılır; başkalarının sözleri tek tırnak içinde. expertNotes yalnız uzmana (terim serbest; "öğrenci/uzman" sözcükleri burada da geçerli). homeGuidance veliye; öğrenci ${YETISKIN_YASI} yaş ve üzeriyse kendisine ya da yakınına ("veli", "çocuğunuz" yazılmaz).`,
  klinikCerceve: [
    `Carol Gray oranı: betimleyici cümleler (descriptive + perspective + affirmative) yönlendiricilerin (directive) EN AZ İKİ KATI; directive sayısı toplamın üçte birini geçmez (5 cümlede 1, 12 cümlede 4).`,
    `Yönlendiriciler yalnız "…deneyebilirim / …yapabilirim" kipindedir; hiçbir cümlede "-malı/-meli", "gerekir", "lazım" yok.`,
    `Her cümle TEK fikir. Akış sırası: durum → başkaları ne hisseder/ister → ben ne yapabilirim → olumlu sonuç; hikâye affirmative cümleyle biter.`,
    `Cümle uzunluğu yaşa göre: 4 yaş ve altı ≤ 7 kelime, 5–7 yaş ≤ 10, 8 yaş ve üstü ≤ 14; yaş yoksa ≤ 10. Soyut değer sözcüğü yerine görülebilir eylem.`,
    `Kaygıda duyguyu adlandır ve normalleştir ("Bazen … hissederim, bu normaldir." tek fikir sayılır). Gerçeğe uygun kal: "hiç acımaz", "her zaman" gibi vaat yok.`,
    `İşlem öyküsünde (hastane, diş, aşı) sıra olayın gerçek kronolojisidir: varış/bekleme → hazırlık → işlem → sonrası, hiçbir adım atlanmaz; Gray akışı bu adımların içinde tekrarlar. Duyu dürüst ve kısa ("biraz acıtabilir, kısa sürer"); hikâye "Bugün" ile başlamaz.`,
    `Ödül, ceza, puan yok; olumlu sonuç içsel ya da ilişkiseldir.`,
  ],
  // Ortak dört kural iskeletten gelir; buradakiler yalnız araca özgü ekler.
  ozgulluk: [
    `İlgi alanı "Uzman notları" içinde geçer ("…bayılıyor"); hikâyeye KARAKTER ya da NESNE olarak girer, metinde ve görselde.`,
    `Ortam (environment) her visualPrompt'ta yer alır ("in a supermarket aisle"); hikâye o ortamın gerçek ayrıntılarını kullanır.`,
    `visualPrompt o cümlenin SAHNESİDİR, çevirisi değil: İngilizce; somut mekân ayrıntısı ve çocuğun başa çıkma eylemi görünür; çocuk-dostu. Stil adı, görüntüde yazı ve çocuğun adı yazılmaz.`,
    `Bloktaki "Uzman notları" ve "Dikkat edilmesi gerekenler" hikâyede başa çıkma stratejisi olur ("kulaklarını kapatıyor" → "Kulaklarımı kapatabilirim.").`,
    `Hastanede kişiler mesleğiyle anılır ("doktor", "hemşire"), bekleyenler "başka çocuklar ve yetişkinler"dir; çocuk her yerde "ben"dir — canlandırmada da "kolunu uzatan çocuk" rolü; "hasta" sözcüğü hiçbir alanda yazılmaz.`,
    `Tanı hikâyenin konusu değildir (ses/dil hedefi eklenmez); yalnız cümle uzunluğunu belirler.`,
  ],
  karsitOrnek: {
    zayif: "Markette sakin olmalıyım. Sakin olmak iyidir.",
    iyi: "Markette bazen çok ses olur. Bazen bu sesten ürkerim, bu normaldir. Annemin elini tutup 'Çok ses var' diyebilirim. Annem beni duyar, alışverişi birlikte bitiririz.",
  },
  bicim: {
    giris: "Yanıt SADECE tek parça geçerli JSON; açıklama ya da Markdown çiti yazılmaz. Alan adları aynen:",
    sema: `{
  "title": "başlık",
  "sentences": [
    { "type": "descriptive|perspective|directive|affirmative", "text": "cümle, birinci tekil", "visualPrompt": "English scene: who, doing what, where" }
  ],
  "expertNotes": "uzmana not",
  "homeGuidance": "veliye ev rehberi"
}`,
    butce: [
      `title: ≤ 6 kelime, çocuğun diliyle.`,
      `sentences: uzunluğa göre cümle sayısı — ${UZUNLUK_SATIRI} (aralığın dışına çıkılmaz).`,
      `type: yalnız descriptive, perspective, directive, affirmative; "positive" yazılmaz.`,
      `text: tek cümle, yaş sınırında kelime, birinci tekil.`,
      `visualPrompt: ≤ 20 kelime İngilizce; ortam + kişi + eylem; her cümlede DOLU.`,
      `expertNotes: 3–4 cümle, dil-konuşma/özel eğitim kapsamında; ilk cümle bloktaki bir veriye (konuşma profili, ilgi alanı, bilinen düzenleme stratejisi) bağlanır; okuma zamanı (kaç gün kala; kriz anında değil), pekiştirme (görsel ipucu, çocuğun kendi rolünde kısa canlandırma); başka mesleğe yönlendirme blok söylemedikçe yazılmaz.`,
      `homeGuidance: 2–3 cümle — okuyana (veliye; yetişkinde öğrencinin kendisine) "siz" ile öneri kipi: okuma zamanı, durum anında hatırlatılacak cümle, adımların ilgi alanındaki nesneyle kısa provası.`,
    ],
  },
  ozDenetim: [
    `Betimleyici cümleler yönlendiricilerin en az iki katı mı; her yönlendirici "…ebilirim" kipinde, hiçbir cümlede "-malı/-meli" yok mu?`,
    `Cümleler birinci tekil, tek fikir, yaş sınırında mı; cümle sayısı length aralığında mı?`,
    `Her visualPrompt dolu, İngilizce, ortamlı, çeviri değil sahne mi?`,
    `İlgi alanı, uzman notu hikâyede mi; ödül, ceza yok mu; "hasta/terapist" yok mu; yetişkin öğrencide "veli/çocuğunuz" yok mu?`,
    `type dört geçerli değerden mi ("positive" değil); JSON tek parça, alan adları aynen, bütçeler içinde mi?`,
  ],
});

/** Son hatırlatma (A1 kullanıcı prompt'u, d): bu araç için en kritik iki kural. */
export const HATIRLATMA: readonly string[] = [
  "Yönlendiriciler 'deneyebilirim/yapabilirim'.",
  "visualPrompt çeviri değil sahne.",
];

/** A1 odak satırı — koddan türetilir: uzunluk → cümle aralığı; ortam → her görselde. */
export function odakSatiri(length: SocialStoryBody["length"], environment: SocialStoryBody["environment"]): string {
  return `${LENGTH_LABEL[length]} → ${CUMLE_ARALIGI[length]} cümle; ortam ${environment} → her görselde bu ortam.`;
}

/** Kapının verdiği yaş: önce `ageText` ("N yaşında", kapı `birthDate`'ten üretir), yoksa doğum tarihinden yıl farkı; ikisi de yoksa null. */
export function yasYili(student: { birthDate?: Date | null } | null, ageText: string): number | null {
  const m = /^(\d+) yaşında$/.exec(ageText.trim());
  if (m) return Number(m[1]);
  if (student?.birthDate) return new Date().getFullYear() - new Date(student.birthDate).getFullYear();
  return null;
}

/** Yetişkin öğrencide (≥ YETISKIN_YASI) eklenen parametre satırı ve üçüncü hatırlatma — koşul koddadır, yalnız düzyazıda değil. */
export const YETISKIN_PARAMETRE = (yas: number) => `- Okuyan: öğrenci ${yas} yaşında, yetişkin — homeGuidance öğrencinin kendisine ya da yakınına; "veli", "çocuğunuz" yazılmaz; hikâye yetişkin günlük dilinde ("çocuk" yazılmaz).`;
export const YETISKIN_HATIRLATMA = `Yetişkin öğrenci: "veli/çocuğunuz" yok.`;

/** A1 kullanıcı prompt'u: öğrenci bloğu (A2, boşsa başlıksız) → parametreler → odak → son hatırlatma.
    `data` kapıdan rumuzlu gelir (`scrubDeep`): durum metnindeki gerçek ad bloktaki rumuzla aynıdır. */
export function buildUserPrompt(data: SocialStoryBody, student: { birthDate?: Date | null } | null, ageText: string, ctx: ToolPromptContext): string {
  const yas = yasYili(student, ageText);
  const yetiskin = yas !== null && yas >= YETISKIN_YASI;
  return studioKullaniciPromptu({
    studentBlock: ctx.studentBlock,
    parametreler: [
      `- Durum: ${data.situation}`,
      `- Ortam: ${data.environment}`,
      `- Hikâye uzunluğu: ${LENGTH_LABEL[data.length]} (${CUMLE_ARALIGI[data.length]} cümle)`,
      `- Görsel: her cümle için İngilizce bir sahne tanımı (visualPrompt) — her cümlenin görseli üretilecek.`,
      ...(yetiskin ? [YETISKIN_PARAMETRE(yas)] : []),
    ],
    odak: odakSatiri(data.length, data.environment),
    hatirlatma: [...HATIRLATMA, ...(yetiskin ? [YETISKIN_HATIRLATMA] : [])],
  });
}

export const POST = createToolHandler({
  rateLimitKey: "social-story",
  bodySchema,
  cost: 1,
  systemPrompt: SYSTEM_PROMPT,
  toolType: "SOCIAL_STORY",
  category: "language",
  categoryFromWorkArea: true,
  creditDescription: "Sosyal hikaye üretimi",
  responseKey: "story",
  fallbackTitle: "Sosyal Hikaye",

  buildUserPrompt,

  enrichContent(content, data) {
    content.situation   = data.situation;
    content.environment = data.environment;
    content.length      = data.length;
  },
});
