import { z } from "zod";
import { createToolHandler } from "@/lib/toolHandler";

const LENGTH_LABEL: Record<string, string> = {
  short:  "Kısa (3-5 cümle)",
  medium: "Orta (6-10 cümle)",
  long:   "Uzun (11-15 cümle)",
};

const SYSTEM_PROMPT = `Sen LudenLab platformunun sosyal hikaye üretici aracısın.
Carol Gray'in sosyal hikaye formatını kullanarak Türkçe sosyal hikayeler üretiyorsun.

Hikaye yapısı kuralları:
- Tanımlayıcı cümleler: Durumu nesnel olarak anlatır (çoğunluk bu olmalı)
- Perspektif cümleleri: Diğer kişilerin düşünce ve duygularını yansıtır
- Yönlendirici cümleler: Çocuğun yapabileceği davranışları önerir ('yapmalısın' DEĞİL, 'deneyebilirim' veya 'yapabilirim' kullan)
- Olumlu cümleler: Beklenen olumlu sonuçları belirtir

Genel ilkeler:
- 1. tekil kişi ile yaz (Ben...)
- Yaşa uygun kelime hazinesi kullan
- Olumlu ve destekleyici dil kullan
- İçsel motivasyon odaklı ol (ödül/puan/ceza ÖNERİSİ YAPMA)
- 'hasta' yerine 'öğrenci', 'terapist' yerine 'uzman' terminolojisi kullan
- Her cümleyi ayrı satırda ver
- Başlık çocuğun ilgisini çekecek şekilde olsun

Yanıtını SADECE JSON formatında ver, başka hiçbir şey yazma:
{
  "title": "Hikaye başlığı",
  "sentences": [
    {
      "type": "descriptive",
      "text": "Cümle metni",
      "visualPrompt": "Bu sahneyi anlatan görsel açıklama (istenirse)"
    }
  ],
  "expertNotes": "Uzman için uygulama önerileri (ne zaman okunmalı, nasıl pekiştirilmeli)",
  "homeGuidance": "Veli için kısa rehber (evde nasıl kullanılacağı)"
}`;

export const POST = createToolHandler({
  rateLimitKey: "social-story",
  bodySchema: z.object({
    studentId:     z.string().min(1),
    situation:     z.string().min(1).max(200),
    environment:   z.enum(["Okul", "Ev", "Park", "Market", "Hastane", "Rehabilitasyon merkezi"]),
    length:        z.enum(["short", "medium", "long"]),
    visualSupport: z.boolean(),
  }),
  cost: 20,
  systemPrompt: SYSTEM_PROMPT,
  toolType: "SOCIAL_STORY",
  category: "language",
  categoryFromWorkArea: true,
  creditDescription: "Sosyal hikaye üretimi",
  responseKey: "story",
  fallbackTitle: "Sosyal Hikaye",

  buildUserPrompt(data, student, ageText) {
    return `Öğrenci bilgileri:
- Ad: ${student!.name}${ageText ? `, ${ageText}` : ""}
- Çalışma alanı: ${student!.workArea}
${student!.diagnosis ? `- Tanı: ${student!.diagnosis}` : ""}

Sosyal hikaye parametreleri:
- Durum: ${data.situation}
- Ortam: ${data.environment}
- Hikaye uzunluğu: ${LENGTH_LABEL[data.length]}
- Görsel destek açıklamaları: ${data.visualSupport ? "Evet, her cümle için kısa görsel sahne açıklaması ekle" : "Hayır"}

Bu öğrenci için uygun bir sosyal hikaye yaz.`;
  },

  enrichContent(content, data) {
    content.situation   = data.situation;
    content.environment = data.environment;
    content.length      = data.length;
  },
});
