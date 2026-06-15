import { z } from "zod";
import { createToolHandler } from "@/lib/toolHandler";

const PARENT_LEVEL_LABEL: Record<string, string> = {
  basic:    "Temel (basit anlatım, teknik terim yok)",
  detailed: "Detaylı (daha fazla açıklama, bazı teknik bilgi)",
};

const MATERIAL_TYPE_LABEL: Record<string, string> = {
  exercise:       "Ev egzersizi (adım adım yapılandırılmış aktivite)",
  observation:    "Gözlem formu (velinin çocuğu gözlemleyip not alacağı form)",
  daily_activity: "Günlük konuşma aktivitesi (günlük rutinlere entegre edilecek aktivite)",
};

const SYSTEM_PROMPT = `Sen LudenLab platformunun ev ödevi materyali üretici aracısın.
Dil-konuşma-işitme uzmanlarının öğrencileri için velilere yönelik ev çalışma materyalleri üretiyorsun.

Temel ilkeler:
- Veli dostu dil kullan (teknik terim kullanma veya kullanırsan parantez içinde açıkla)
- Adım adım, numaralı talimatlar ver
- Her adım kısa ve net olsun
- Süre bilgisine uy (belirtilen dakika içinde tamamlanabilir olsun)
- İçsel motivasyon odaklı ol (ödül/puan/çıkartma sistemi önerme)
- 'hasta' yerine 'öğrenci' veya çocuğun adı, 'terapist' yerine 'uzman' de
- Veliye emir kipi yerine öneri kipi kullan ('yapın' yerine 'yapabilirsiniz')
- Yaşa uygun, eğlenceli ve doğal aktiviteler öner

Yanıtını SADECE JSON formatında ver, başka hiçbir şey yazma:
{
  "title": "Materyal başlığı",
  "materialType": "exercise|observation|daily_activity",
  "duration": "10 dakika",
  "targetArea": "Çalışma alanı",
  "introduction": "Veliye kısa giriş açıklaması (bu çalışma ne için, neden önemli)",
  "materials": ["Gerekli malzemeler listesi (varsa)"],
  "steps": [
    {
      "stepNumber": 1,
      "instruction": "Adım açıklaması",
      "tip": "Bu adımla ilgili ipucu (opsiyonel)"
    }
  ],
  "watchFor": "Dikkat edin kutusu — veli neye dikkat etmeli, ne gözlemlemeli",
  "celebration": "Kutlama anı — başarıyı nasıl fark edip kutlayacağınız (içsel motivasyon odaklı, dışsal ödül değil)",
  "frequency": "Önerilen tekrar sıklığı (günde 1 kez, haftada 3 kez vb.)",
  "expertNotes": "Uzman için not (bu materyali veliye verirken dikkat edilecekler)",
  "adaptations": "Kolay ve zor versiyonları için kısa öneriler"
}`;

export const POST = createToolHandler({
  rateLimitKey: "homework",
  bodySchema: z.object({
    studentId:    z.string().min(1),
    targetArea:   z.string().min(1).max(300),
    duration:     z.enum(["10", "15", "20"]),
    parentLevel:  z.enum(["basic", "detailed"]),
    materialType: z.enum(["exercise", "observation", "daily_activity"]),
    extraNote:    z.string().max(500).optional(),
  }),
  cost: 15,
  systemPrompt: SYSTEM_PROMPT,
  toolType: "HOMEWORK_MATERIAL",
  category: "speech",
  categoryFromWorkArea: true,
  creditDescription: "Ev ödevi materyali üretimi",
  responseKey: "homework",
  fallbackTitle: "Ev Ödevi Materyali",

  buildUserPrompt(data, student, ageText) {
    return `Öğrenci bilgileri:
- Ad: ${student!.name}${ageText ? `, ${ageText}` : ""}
- Çalışma alanı: ${student!.workArea}
${student!.diagnosis ? `- Tanı: ${student!.diagnosis}` : ""}

Materyal parametreleri:
- Hedef çalışma alanı: ${data.targetArea}
- Süre: ${data.duration} dakika
- Veli bilgi düzeyi: ${PARENT_LEVEL_LABEL[data.parentLevel]}
- Materyal türü: ${MATERIAL_TYPE_LABEL[data.materialType]}
${data.extraNote ? `\nUzman ek notu: ${data.extraNote}` : ""}

Bu öğrenci için uygun ev ödevi materyali üret.`;
  },

  enrichContent(content, data) {
    content.targetArea   = data.targetArea;
    content.materialType = data.materialType;
    content.duration     = `${data.duration} dakika`;
  },
});
