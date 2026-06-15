import { z } from "zod";
import { createToolHandler } from "@/lib/toolHandler";
import { formatDate } from "@/lib/utils";

const SESSION_TYPE_LABEL: Record<string, string> = {
  individual:     "Bireysel Oturum",
  group:          "Grup Oturumu",
  assessment:     "Değerlendirme Oturumu",
  parent_meeting: "Veli Görüşmesi",
};

const PERFORMANCE_LABEL: Record<string, string> = {
  above_target:  "Beklenenin Üstünde",
  on_target:     "Hedefle Uyumlu",
  progressing:   "Gelişim Gösteriyor",
  needs_support: "Ek Destek Gerekiyor",
  not_assessed:  "Değerlendirme Yapılamadı",
};

const GoalEntrySchema = z.object({
  goalId:    z.string(),
  goalTitle: z.string().min(1).max(500),
  accuracy:  z.number().min(0).max(100),
  cueLevel:  z.string().min(1),
});

const SYSTEM_PROMPT = `Sen LudenLab platformunun oturum özeti üretici aracısın.
Dil-konuşma-işitme uzmanlarının oturum sonrası profesyonel ve yapılandırılmış oturum raporları oluşturmasına yardımcı oluyorsun.

İlkeler:
- Profesyonel ve nesnel dil kullan
- Ölçülebilir veriler vurgula (yüzdeler, ipucu düzeyleri)
- 'hasta' yerine 'öğrenci', 'terapist' yerine 'uzman' de
- Olumlu ve yapıcı ton (güçlü yönleri de belirt)
- Gizlilik: veliye iletilecek kısımda sadece genel bilgi, detaylı klinik bilgiyi uzman notunda tut

Yanıtını SADECE JSON formatında ver, başka hiçbir şey yazma:
{
  "title": "Oturum Özeti — [Öğrenci Adı] — [Tarih]",
  "sessionInfo": {
    "date": "Tarih (Türkçe uzun format, ör: 28 Mart 2026)",
    "duration": "Süre (ör: 45 dakika)",
    "type": "Oturum türü",
    "student": "Öğrenci adı ve yaşı"
  },
  "goalPerformance": [
    {
      "goal": "Hedef açıklaması",
      "accuracy": "Yüzde (ör: %75)",
      "cueLevel": "İpucu düzeyi",
      "analysis": "Bu hedefe dair 1-3 cümle analiz ve gözlem",
      "recommendation": "Bu hedef için sonraki adım önerisi"
    }
  ],
  "overallAssessment": "Oturumun genel değerlendirmesi (2-4 cümle)",
  "behaviorNotes": "Davranış ve katılım gözlemleri",
  "nextSessionPlan": "Bir sonraki oturum için plan ve öneriler",
  "parentNote": "Veliye iletilecek kısa anlaşılır özet (teknik terim yok, 3-5 cümle)",
  "expertNotes": "Sadece uzmanın göreceği klinik notlar ve öneriler"
}`;

export const POST = createToolHandler({
  rateLimitKey: "session-summary",
  bodySchema: z.object({
    studentId:          z.string().min(1),
    sessionDate:        z.string().min(1),
    duration:           z.enum(["20", "30", "40", "45", "60"]),
    sessionType:        z.enum(["individual", "group", "assessment", "parent_meeting"]),
    goals:              z.array(GoalEntrySchema).min(1),
    overallPerformance: z.enum(["above_target", "on_target", "progressing", "needs_support", "not_assessed"]),
    behaviorNotes:      z.string().max(1000).optional(),
    nextSessionNotes:   z.string().max(1000).optional(),
  }),
  cost: 10,
  systemPrompt: SYSTEM_PROMPT,
  toolType: "SESSION_SUMMARY",
  category: "speech",
  categoryFromWorkArea: true,
  creditDescription: "Oturum özeti oluşturma",
  responseKey: "summary",
  fallbackTitle: (_, student) => `Oturum Özeti — ${student?.name ?? ""}`,

  buildUserPrompt(data, student, ageText) {
    const dateDisplay = formatDate(data.sessionDate, "medium");

    const goalsText = data.goals
      .map((g: z.infer<typeof GoalEntrySchema>, i: number) =>
        `${i + 1}. ${g.goalTitle}\n   - Doğruluk: %${g.accuracy}\n   - İpucu düzeyi: ${g.cueLevel}`
      )
      .join("\n");

    return `Öğrenci bilgileri:
- Ad: ${student!.name}${ageText ? `, ${ageText}` : ""}
- Çalışma alanı: ${student!.workArea}
${student!.diagnosis ? `- Tanı: ${student!.diagnosis}` : ""}

Oturum bilgileri:
- Tarih: ${dateDisplay}
- Süre: ${data.duration} dakika
- Tür: ${SESSION_TYPE_LABEL[data.sessionType]}
- Genel performans değerlendirmesi: ${PERFORMANCE_LABEL[data.overallPerformance]}

Çalışılan hedefler ve performans verileri:
${goalsText}
${data.behaviorNotes ? `\nDavranış ve katılım gözlemi: ${data.behaviorNotes}` : ""}
${data.nextSessionNotes ? `\nSonraki oturum için notlar: ${data.nextSessionNotes}` : ""}

Yukarıdaki verilerle kapsamlı ve profesyonel bir oturum özeti oluştur.`;
  },

  enrichContent(content, data) {
    content.sessionType        = data.sessionType;
    content.overallPerformance = data.overallPerformance;
    content.sessionDate        = data.sessionDate;
  },
});
