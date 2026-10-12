import { z } from "zod";
import { prisma } from "@studio/lib/db";
import { createToolHandler } from "@studio/lib/toolHandler";
import { formatDate } from "@studio/lib/utils";

/**
 * Haftalık çalışma planı.
 *
 * Bu rota ESKİDEN ortak `createToolHandler` kapısının DIŞINDAYDI: çocuk-PII rumuzu (#09),
 * atomik kredi rezervasyonu (#22) ve sayarak gövde okuma (#29) burada uygulanmıyordu —
 * gerçek çocuk adı ve tanısı doğrudan sağlayıcıya gidiyordu, üstelik yayımladığımız
 * "gerçek ad gönderilmez" beyanının tek istisnasıydı (2026-09 denetimi, P0). Ayrıca
 * yanıt SSE-heartbeat'siz döndüğü için 60 sn'yi aşan üretimler Safari'de kopuyordu.
 *
 * Prompt'a giren GEÇMİŞ bağlamı (kart başlıkları, son oturum özeti, uzmanın ek notu) da
 * gerçek ad içerebilir; hepsi `ctx.scrubText`'ten geçirilir.
 * `src/lib/toolGate.test.ts` bu rotanın bir daha kapı dışına çıkmasını engeller.
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

const SYSTEM_PROMPT = `Sen LudenLab platformunun haftalık çalışma planı üretici aracısın.
Dil-konuşma-işitme uzmanları için öğrenci bazlı haftalık ders planları oluşturuyorsun.

Plan yapısı:
- Her ders için ayrı plan
- Her ders içinde: ısınma aktivitesi, ana çalışma, kapanış
- Müfredat hedefleriyle uyumlu
- Önceki çalışmalara referans ver (bağlam verilmişse)
- Progressive difficulty: hafta ilerledikçe zorluk kademeli artsın
- Çeşitlilik: her gün farklı aktivite türleri kullan

İlkeler:
- İçsel motivasyon odaklı (ödül/puan önerme)
- Yaşa uygun aktiviteler
- 'hasta' yerine 'öğrenci', 'terapist' yerine 'uzman' de
- Her aktivite için tahmini süre belirt
- Gerekli materyalleri listele

Kısa yaz; uzman planı ders sırasında göz atarak okur:
- Hedef, ısınma, ana çalışma ve kapanış açıklamaları tek cümle
- Ana çalışmada en fazla 3 adım (her biri kısa bir cümle), en fazla 3 materyal, en fazla 2 hedef
- Isınmada en fazla 2 materyal
- notes yalnız gerçekten gerekiyorsa tek cümle, gerekmiyorsa null
- Gün adı, tarih ve ders süresini yazma; sunucu ekler. days dizisinde her ders için bir öğe, verilen sırayla

Yanıtını SADECE JSON formatında ver, başka hiçbir şey yazma:
{
  "title": "Haftalık Plan — [Öğrenci Adı] — [Tarih Aralığı]",
  "studentSummary": "Öğrenci hakkında 1-2 cümlelik bağlam özeti",
  "days": [
    {
      "focusArea": "Odak alanı",
      "objective": "Bu dersin hedefi, tek cümle",
      "warmup": {
        "activity": "Isınma aktivitesi, tek cümle",
        "duration": "5 dakika",
        "materials": ["Gerekli materyal"]
      },
      "mainWork": {
        "activity": "Ana çalışma, tek cümle",
        "duration": "30 dakika",
        "steps": ["Adım 1", "Adım 2", "Adım 3"],
        "materials": ["Gerekli materyal"],
        "targetGoals": ["İlgili müfredat hedefi"]
      },
      "closing": {
        "activity": "Kapanış aktivitesi, tek cümle",
        "duration": "10 dakika"
      },
      "notes": null
    }
  ],
  "weeklyGoal": "Bu haftanın genel hedefi, tek cümle",
  "materialsNeeded": ["Hafta boyunca gerekli materyaller, en fazla 6"],
  "parentCommunication": "Veliye bu hafta hakkında 2-3 cümlelik bilgi",
  "expertNotes": "Uzman için 2-3 cümlelik haftalık değerlendirme notu",
  "nextWeekSuggestion": "Gelecek hafta için tek cümlelik öneri"
}`;

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

  async buildUserPrompt(data, student, ageText, ctx) {
    const s = student!; // studentId zorunlu (bodySchema) → handler öğrenciyi doğruladı
    const { weekStart, sessionDuration, focusAreas, planApproach, daySchedule, extraNote } = data;

    const [recentCards, lastSummary, studentRow] = await Promise.all([
      prisma.card.findMany({
        where: { studentId: s.id, therapistId: ctx.therapistId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { title: true, toolType: true, createdAt: true },
      }),
      prisma.card.findFirst({
        where: { studentId: s.id, therapistId: ctx.therapistId, toolType: "SESSION_SUMMARY" },
        orderBy: { createdAt: "desc" },
        select: { content: true, createdAt: true },
      }),
      prisma.student.findUnique({ where: { id: s.id }, select: { curriculumIds: true } }),
    ]);

    const curriculumIds = studentRow?.curriculumIds ?? [];
    const curricula = curriculumIds.length > 0
      ? await prisma.curriculum.findMany({ where: { id: { in: curriculumIds } }, select: { title: true } })
      : [];
    const curriculumTitles = curricula.map((c) => c.title);

    const weekRange = getWeekRange(weekStart);
    const dayDates  = getDayDatesFromSchedule(weekStart, daySchedule);

    // Kart başlıkları gerçek adla kaydedilir → prompt'a girmeden önce rumuzlanır.
    const recentCardsBlock = recentCards.length > 0
      ? `Son çalışmalar:\n${recentCards.map((c) => `- ${ctx.scrubText(c.title)} (${c.toolType ?? "kart"}, ${formatDate(c.createdAt, "short")})`).join("\n")}\n\n`
      : "";

    const lastSummaryBlock = (() => {
      if (!lastSummary?.content) return "";
      const c = lastSummary.content as Record<string, unknown>;
      const parts = [
        c.overallPerformance ? `Genel performans: ${ctx.scrubText(String(c.overallPerformance))}` : "",
        c.sessionNotes       ? `Notlar: ${ctx.scrubText(String(c.sessionNotes))}` : "",
        c.nextSessionGoals   ? `Sonraki hedefler: ${ctx.scrubText(String(c.nextSessionGoals))}` : "",
      ].filter(Boolean);
      if (parts.length === 0) return "";
      return `Son oturum özeti (${formatDate(lastSummary.createdAt, "short")}):\n${parts.join("\n")}\n\n`;
    })();

    return `Öğrenci bilgileri:
- Ad: ${s.name}
- ${ageText ? `${ageText}, ` : ""}Çalışma alanı: ${s.workArea}${s.diagnosis ? `\n- Tanı: ${s.diagnosis}` : ""}
${curriculumTitles.length > 0 ? `- Atanmış müfredat modülleri: ${curriculumTitles.join(", ")}` : ""}

${recentCardsBlock}${lastSummaryBlock}Haftalık plan parametreleri:
- Hafta: ${weekRange}
- Dersler (days dizisi bu sırayı izlesin):
${dayDates.map((d, i) => `  ${i + 1}. ${d.name} ${d.date}${d.lessonsOnDay > 1 ? ` (${d.lessonIndex}. ders / günde ${d.lessonsOnDay} ders)` : ""}`).join("\n")}
- Ders süresi: ${sessionDuration} dakika
- Odak alanları: ${focusAreas.join(", ")}
- Planlama yaklaşımı: ${planApproach === "ai" ? "Öğrenci profiline ve geçmişe göre AI otomatik önersin" : "Seçilen odak alanlarına göre yönlendirilmiş plan"}
${extraNote ? `\nEk notlar: ${ctx.scrubText(extraNote)}` : ""}

Bu parametrelere uygun haftalık çalışma planı oluştur. days dizisi tam olarak ${dayDates.length} ders içersin.`;
  },

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
