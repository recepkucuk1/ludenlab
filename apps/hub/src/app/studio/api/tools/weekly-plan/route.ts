import { z } from "zod";
import { createToolHandler, type ToolPromptContext } from "@studio/lib/toolHandler";
import { studioKullaniciPromptu, studioSistemPromptu } from "@studio/lib/prompts/iskelet";
import { formatDate } from "@studio/lib/utils";

/**
 * Haftalık çalışma planı — spec A1 prompt'u (Faz 2 / Task 7).
 *
 * Bu rota ESKİDEN ortak `createToolHandler` kapısının DIŞINDAYDI: çocuk-PII rumuzu (#09),
 * atomik kredi rezervasyonu (#22) ve sayarak gövde okuma (#29) burada uygulanmıyordu —
 * gerçek çocuk adı ve tanısı doğrudan sağlayıcıya gidiyordu, üstelik yayımladığımız
 * "gerçek ad gönderilmez" beyanının tek istisnasıydı (2026-09 denetimi, P0). Ayrıca
 * yanıt SSE-heartbeat'siz döndüğü için 60 sn'yi aşan üretimler Safari'de kopuyordu.
 * `src/lib/toolGate.test.ts` bu rotanın bir daha kapı dışına çıkmasını engeller.
 *
 * Öğrenci bağlamı (kimlik, tanı, modüller, uzman notları, son çalışmalar, son oturum özeti,
 * hedefler) ortak bağlam katmanından RUMUZLU gelir (`ctx.studentBlock`, spec A2); rota kendi
 * sorgusunu yapmaz. Uzmanın ek notu gerçek ad içerebilir; `ctx.scrubText`'ten geçirilir.
 *
 * Sistem prompt'u sabittir (önbellek) ve `studioSistemPromptu` ile A1 sırasında kurulur. 2026-09 yalın
 * şema (tek cümlelik alanlar, ≤ 3 adım, ≤ 3 materyal, ≤ 2 hedef, notes null, gün/tarih/süre sunucudan)
 * KORUNUR: `enrichContent` dolgusu ve tavan değişmedi (`weeklyPlanLean.test.ts`). JSON alan adları,
 * istemci, PDF, kredi ve SSE DEĞİŞMEZ (A4). Prompt sözleşmesi: `prompt.test.ts`.
 */

const dayScheduleItem = z.object({
  dayName:     z.string().max(20), // denetim #29 — prompt'a giren serbest metin sınırlı
  lessonCount: z.number().int().min(1).max(4),
});

const bodySchema = z.object({
  studentId:       z.string().min(1, "Öğrenci seçin"),
  weekStart:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli tarih girin"),
  sessionsPerWeek: z.number().int().min(1).max(12),
  sessionDuration: z.enum(["20", "30", "40", "45", "60"]),
  focusAreas:      z.array(z.string().max(60)).min(1, "En az bir odak alanı seçin").max(12),
  planApproach:    z.enum(["ai", "guided"]),
  daySchedule:     z.array(dayScheduleItem).min(1, "En az bir ders günü seçin").max(7),
  extraNote:       z.string().max(500).optional(),
});
type WeeklyPlanBody = z.infer<typeof bodySchema>;
type Duration = WeeklyPlanBody["sessionDuration"];

/**
 * Ders süresi → varsayılan ısınma/ana çalışma/kapanış dakikaları (toplam = süre). Odak satırı ve klinik
 * çerçeve aynı tablodan okur; eval `sure_dagilimi` üç bloğun toplamını ders süresine karşı ölçer
 * (tolerans 20 dk'da 3, üstünde 5 dk). Taban çıktıları da bu bölünmelere yakındı (20 → 4/12/4, 45 → 5/30/10).
 */
export const SURE_BOLUNMESI: Record<Duration, readonly [number, number, number]> = {
  "20": [4, 12, 4],
  "30": [5, 20, 5],
  "40": [5, 30, 5],
  "45": [5, 30, 10],
  "60": [10, 40, 10],
};
const bolunme = (d: Duration) => SURE_BOLUNMESI[d].join("/");

/**
 * Ders başına kelime bütçesi. Taban (`baseline/out`, 4 vaka, 21 ders): ders başına ortalama 96 kelime
 * (12 derslik planda 80, 2–4 derslikte 106–129). Ortalamanın ~%15 üstü: derinlik için pay, taban +%20
 * tavanının altında.
 */
export const DERS_KELIME_BUTCESI = 110;

export const SYSTEM_PROMPT = studioSistemPromptu({
  rol: `Sen LudenLab Studio'nun haftalık ders planı üreticisisin. Planı isteyen ve OKUYAN dil ve konuşma uzmanıdır; ders sırasında göz atarak okur: her alan yalın, tek cümle, somut eylem. Terim serbest, "öğrenci/uzman" sözcükleri burada da geçerli. Tek istisna parentCommunication: veliye (öğrenci 18 yaş ve üzeriyse kendisine ya da yakınına) "siz" ile günlük Türkçe.`,
  klinikCerceve: [
    `PROGRESYON: ders N+1 ders N'in üzerine kurulur — yoğun ipucu → ipucu azaltma → bağımsız üretim → yeni bağlam/kişiyle genelleme; her objective zincirdeki yeri söyler.`,
    `Aynı etkinlik iki derste yazılmaz (eylem ya da malzeme değişir). Odak alanları DÖNÜŞÜMLÜ: her odak alanı en az bir dersin focusArea'sında isteğin yazımıyla (ses harfi dahil) geçer.`,
    `Geçmiş: bloktaki "Son oturum" satırının "Sonraki plan:" cümlesi İLK dersin ana çalışmasıdır; yoksa "Son çalışmalar"daki son kartın bir adım ötesi. "Tamamlanan hedefler" yeniden planlanmaz; "Sürmekte olan hedefler" targetGoals'a aynen girer; "Modüller" targetGoals'un dilidir. Geçmiş yoksa uydurulmaz.`,
    `Dakikalar: ısınma + ana çalışma + kapanış toplamı ders süresine EŞİTTİR ve her blokta yazılır ("N dakika"); varsayılan bölünme odak satırında (ör. 40 dk → 5/30/5). Isınma önceki dersin becerisini çağırır; kapanış günün ürününü bağımsız tekrarlatır.`,
    `Yaş ve uzman notu biçimi belirler: küçük yaş/kısa masa toleransı → hareketli, 3–5 dakikalık kısa bloklar, hedef oyun içinde; okul çağı → yazılı/çizili taslak; yetişkin → yaşam hedefi (iş, okul, aile), oyun yazılmaz; cihaz yorgunluğu → ana çalışma iki kısa tur, toplam aynı.`,
  ],
  // Ortak dört kural iskeletten gelir; buradakiler yalnız araca özgü ekler.
  ozgulluk: [
    `İlgi alanı bloğun "Uzman notları" satırındadır ("…bayılıyor"): tema ve malzeme oradan; notta yoksa uydurulmaz.`,
    `studentSummary bloğun özetidir: yalnız blokta yazılı tanı, güçlü yön, son oturum verisi; blokta olmayan ölçüm yazılmaz.`,
    `materialsNeeded (≤ 6) derslerdeki materyallerin BİRLEŞİMİDİR; derslerde geçmeyen malzeme yazılmaz.`,
    `parentCommunication velinin BU HAFTA evde yapacağı TEK şeydir (hangi rutinde, ne söyler, ne bekler). Öğrenci 18 yaş ve üzeriyse muhatap kendisi ya da yakınıdır: "veli", "çocuğunuz" yazılmaz.`,
    `Uzmanın "Ek notlar"ı etkinliğin kendisini değiştirir (ör. "oyun ağırlıklı" → ana çalışma oyun), notes'a yazılmaz.`,
  ],
  karsitOrnek: {
    zayif: "Ana çalışma: hedef sesle kelime çalışması, çeşitli materyallerle.",
    iyi: "Ana çalışma: /s/ kelime başı 10 kart; ilk 5'te uzman modeli, son 5'te bağımsız; 'sarı dinozor' gibi dinozor temalı kartlarla (ilgi alanı).",
  },
  bicim: {
    giris: "Yanıtını SADECE tek parça, geçerli JSON olarak ver; açıklama yazma. Alan adları aynen; gün adı, tarih ve ders süresini YAZMA, sunucu ekler. days: her derse verilen sırayla bir öğe:",
    sema: `{ "title": "Haftalık Plan — <ad> — <hafta>", "studentSummary": "…",
  "days": [ { "focusArea": "…", "objective": "…",
    "warmup": { "activity": "…", "duration": "5 dakika", "materials": ["…"] },
    "mainWork": { "activity": "…", "duration": "30 dakika", "steps": ["…", "…", "…"], "materials": ["…"], "targetGoals": ["…"] },
    "closing": { "activity": "…", "duration": "5 dakika" }, "notes": null } ],
  "weeklyGoal": "…", "materialsNeeded": ["…"], "parentCommunication": "…", "expertNotes": "…", "nextWeekSuggestion": "…" }`,
    butce: [
      `title: ≤ 10 kelime. studentSummary: 1–2 cümle, ≤ 35 kelime.`,
      `days: ders başına ≤ ${DERS_KELIME_BUTCESI} kelime; "tek cümle" = nokta ile bölme, ";" kullan.`,
      `focusArea: 1–4 kelime. objective: tek cümle ≤ 15 kelime, gözlenebilir ölçüt + ipucu düzeyi.`,
      `warmup: activity tek cümle ≤ 15 kelime, en fazla 2 materyal. closing: activity tek cümle ≤ 15 kelime. duration her blokta "N dakika".`,
      `mainWork: activity tek cümle ≤ 20 kelime (kaç kart, hangi ipucu); steps en fazla 3 adım, adım ≤ 12 kelime; en fazla 3 materyal; targetGoals 1–2 hedef ≤ 8 kelime.`,
      `notes: null; derse özgü uyarı varsa tek cümle.`,
      `weeklyGoal: tek cümle ≤ 20 kelime. materialsNeeded: 3–6 madde. nextWeekSuggestion: tek cümle, zincirin sonraki halkası.`,
      `parentCommunication: 2–3 cümle, ≤ 45 kelime. expertNotes: 2–3 cümle, ≤ 50 kelime: progresyon gerekçesi + izlenecek ölçüt.`,
    ],
  },
  ozDenetim: [
    `days ders sayısı ve sırası isteğin listesiyle aynı; gün/tarih/süre yazılmadı mı?`,
    `Her derste üç bloğun dakika toplamı ders süresi mi?`,
    `Her ders öncekinin üzerine; aynı etkinlik ya da adım tekrar etmiyor; her odak alanı bir focusArea'da mı?`,
    `İlk ders "Sonraki plan"a ya da son karta bağlı; "Tamamlanan hedefler" yeniden planlanmadı; studentSummary ve materialsNeeded uydurmasız mı?`,
    `Ödül/puan yok; "hasta/terapist" yok; yetişkinde "veli/çocuğunuz" yok mu?`,
    `JSON tek parça, alan adları aynen, bütçeler içinde mi?`,
  ],
});

/** Son hatırlatma (A1 kullanıcı prompt'u, d): bu araç için en kritik iki kural. */
export const HATIRLATMA: readonly string[] = [
  "Gün/tarih/süre yazma.",
  "Her ders öncekinin üzerine kurulur; tekrar yok.",
];

const YETISKIN_YASI = 18;

/**
 * 18+ öğrencide parentCommunication'ın muhatabı veli değil öğrencinin kendisi ya da yakınıdır. Doğum tarihi
 * varsa yaş oradan (kapıdaki `calcAgeYears` ile aynı yıl farkı); yoksa kapının verdiği yaş metni ("34 yaşında");
 * ikisi de yoksa çocuk varsayılır.
 */
export function yetiskinMi(student: { birthDate: Date | null } | null, ageText: string): boolean {
  const yas = student?.birthDate
    ? new Date().getFullYear() - new Date(student.birthDate).getFullYear()
    : Number(/^(\d+)\s/.exec(ageText)?.[1]);
  return Number.isFinite(yas) && yas >= YETISKIN_YASI;
}

/** A1 odak satırı — koddan türetilir: ders sayısı (takvimden) × süre → days öğe sayısı, ders başı sınırlar, dakika bölünmesi. */
export function odakSatiri(dersSayisi: number, duration: Duration): string {
  return `${dersSayisi} ders × ${duration} dk → days tam ${dersSayisi} öğe; her derste 1–2 hedef, ≤3 adım; dakikalar ${bolunme(duration)}.`;
}

function getWeekRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end   = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => formatDate(d, "medium");
  return `${fmt(start)} - ${fmt(end)}`;
}

const DAY_OFFSETS: Record<string, number> = {
  Pazartesi: 0, Salı: 1, Çarşamba: 2, Perşembe: 3, Cuma: 4, Cumartesi: 5,
};

function getDayDatesFromSchedule(
  weekStart: string,
  daySchedule: { dayName: string; lessonCount: number }[],
): { name: string; date: string; lessonIndex: number; lessonsOnDay: number }[] {
  const result: { name: string; date: string; lessonIndex: number; lessonsOnDay: number }[] = [];
  for (const { dayName, lessonCount } of daySchedule) {
    const offset = DAY_OFFSETS[dayName] ?? 0;
    const d = new Date(weekStart);
    d.setDate(d.getDate() + offset);
    const dateStr = formatDate(d, "medium");
    for (let li = 0; li < lessonCount; li++) {
      result.push({ name: dayName, date: dateStr, lessonIndex: li + 1, lessonsOnDay: lessonCount });
    }
  }
  return result;
}

/** Parametre etiketi — eval adaptörü (`evals/tools/studio/weekly-plan/adapter.ts`) hakeme aynı metni gösterir. */
const APPROACH_LABEL: Record<WeeklyPlanBody["planApproach"], string> = {
  ai:     "Öğrenci profiline ve geçmişe göre AI otomatik önersin",
  guided: "Seçilen odak alanlarına göre yönlendirilmiş plan",
};

/**
 * A1 kullanıcı prompt'u: öğrenci bloğu (A2, boşsa başlıksız) → parametreler → odak → son hatırlatma.
 * Ders listesi numaralıdır ve `enrichContent` etiketleri bu SIRAYLA eşler; "days dizisi tam olarak N ders
 * içersin" cümlesi kalır (eval `ders_sayisi` modelin ham çıktısını bu sayıya karşı ölçer).
 */
export function buildUserPrompt(data: WeeklyPlanBody, student: { birthDate: Date | null } | null, ageText: string, ctx: ToolPromptContext): string {
  const { weekStart, sessionDuration, focusAreas, planApproach, daySchedule, extraNote } = data;
  const dayDates = getDayDatesFromSchedule(weekStart, daySchedule);
  const n = dayDates.length;
  return studioKullaniciPromptu({
    studentBlock: ctx.studentBlock,
    parametreler: [
      `- Hafta: ${getWeekRange(weekStart)}`,
      `- Dersler (days dizisi bu sırayı izlesin):`,
      ...dayDates.map((d, i) => `  ${i + 1}. ${d.name} ${d.date}${d.lessonsOnDay > 1 ? ` (${d.lessonIndex}. ders / günde ${d.lessonsOnDay} ders)` : ""}`),
      `- Ders süresi: ${sessionDuration} dakika`,
      `- Odak alanları: ${focusAreas.join(", ")}`,
      `- Planlama yaklaşımı: ${APPROACH_LABEL[planApproach]}`,
      ...(extraNote ? [`- Ek notlar: ${ctx.scrubText(extraNote)}`] : []),
      ...(yetiskinMi(student, ageText)
        ? [`- Muhatap: öğrenci yetişkin (18 yaş ve üzeri); parentCommunication öğrencinin kendisine ya da yakınına yazılır, "veli/çocuğunuz" yazılmaz; oyun yerine yaşam hedefi (iş, okul, aile).`]
        : []),
      `- Ders sayısı: days dizisi tam olarak ${n} ders içersin.`,
    ],
    odak: odakSatiri(n, sessionDuration),
    hatirlatma: [...HATIRLATMA],
  });
}

export const POST = createToolHandler({
  rateLimitKey: "weekly-plan",
  bodySchema,
  cost: 1,
  systemPrompt: SYSTEM_PROMPT,
  toolType: "WEEKLY_PLAN",
  category: "speech",
  categoryFromWorkArea: true,
  creditDescription: "Haftalık çalışma planı üretimi",
  responseKey: "plan",
  // Yalın plan (2026-09-16): gün, tarih, süre ve hafta aralığını sunucu doldurur, ders başına
  // metinler kısa. Eski şemada çıktı ≈ 2.500 + 850 × ders token'ıydı: 3 derslik plan 6.000
  // tavanının %88'ini kullanıyor, 12 derslik plan 240 sn SSE sınırına çarpıyordu. Yalın şemada
  // ölçüm: 3 ders ≈ 2.200 token / 41 sn, 12 ders 6.300–6.800 token / 103–116 sn. Tavan 12 derse
  // ~1,5 kat pay bırakır; saniyede ~55 token akışla tavana çarpan üretim de 240 sn'den önce biter.
  maxTokens: 10000,
  // Gerçek ad yerine rumuz kaçmasın diye sabit başlık (AI zaten başlık üretiyor).
  fallbackTitle: "Haftalık Çalışma Planı",

  buildUserPrompt,

  enrichContent(content, data) {
    // Ders numarası, gün, tarih, süre ve hafta aralığı modelden istenmez: sunucu zaten biliyor
    // ve model bunları her derste yeniden yazınca çıktı tavana çarpıyordu. Etiketler dersin
    // SIRASIYLA eşlenir; takvimde karşılığı olmayan fazladan ders atılır (etiketsiz ders
    // ekranda boş başlıkla görünür, PDF dışa aktarımını bozar).
    const slots = getDayDatesFromSchedule(data.weekStart, data.daySchedule);
    content.days = (content.days as Record<string, unknown>[])
      .slice(0, slots.length)
      .map((day, i) => ({
        ...day,
        dayNumber: i + 1,
        dayName:   slots[i]!.name,
        date:      slots[i]!.date,
        duration:  `${data.sessionDuration} dakika`,
      }));
    content.weekRange       = getWeekRange(data.weekStart);
    content.weekStart       = data.weekStart;
    content.sessionsPerWeek = data.sessionsPerWeek;
    content.sessionDuration = data.sessionDuration;
    content.focusAreas      = data.focusAreas;
  },
});
