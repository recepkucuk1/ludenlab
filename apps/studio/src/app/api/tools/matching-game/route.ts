import { z } from "zod";
import { createToolHandler } from "@/lib/toolHandler";
import { DIFFICULTY_LABEL } from "@/lib/constants";

const MATCH_TYPE_LABEL: Record<string, string> = {
  definition: "Kelime — Tanım",
  image_desc: "Kelime — Resim Açıklaması",
  synonym:    "Eş Anlamlı",
  antonym:    "Zıt Anlamlı",
  category:   "Kategori Eşleştirme",
  sentence:   "Cümle Tamamlama",
};

const SYSTEM_PROMPT = `Sen LudenLab platformunun kelime eşleştirme oyunu üretici aracısın.
Dil gelişimi alanında kullanılmak üzere yazdırılabilir eşleştirme kartları üretiyorsun.

Kurallar:
- Tüm kelimeler gerçek, yaygın Türkçe kelimeler olsun
- Yaşa ve zorluk seviyesine uygun kelimeler seç
- Kolay: sık kullanılan, somut kelimeler (masa, kedi, elma)
- Orta: daha az sık, bazıları soyut (heyecan, mevsim, mesafe)
- Zor: soyut kavramlar, çok anlamlı kelimeler, deyimler
- Her çift net ve tartışmasız eşleşmeli
- Tema seçildiyse kelimeler o temadan olsun
- Eşleştirme türüne göre:
  - definition (Kelime-Tanım): kısa ve net tanımlar (1 cümle)
  - image_desc (Kelime-Resim Açıklaması): görsel olarak tarif eden kısa açıklama
  - synonym (Eş Anlamlı): gerçek eş anlamlı kelime çiftleri
  - antonym (Zıt Anlamlı): gerçek zıt anlamlı kelime çiftleri
  - category (Kategori): kelime + ait olduğu kategori
  - sentence (Cümle Tamamlama): boşluklu cümle + doğru kelime
- 'hasta' yerine 'öğrenci', 'terapist' yerine 'uzman' de

Yanıtını SADECE JSON formatında ver, başka hiçbir şey yazma:
{
  "title": "Oyun başlığı",
  "matchType": "synonym|antonym|definition|image_desc|category|sentence",
  "difficulty": "easy|medium|hard",
  "pairs": [
    {
      "id": 1,
      "cardA": "Kelime veya cümle (sol kart)",
      "cardB": "Eşleşen tanım/kelime/açıklama (sağ kart)",
      "hint": "Opsiyonel ipucu (zor eşleşmeler için, kısa)"
    }
  ],
  "instructions": "Oyun nasıl oynanır (uzman/veli için kısa açıklama)",
  "expertNotes": "Uzman için kullanım önerileri",
  "adaptations": "Kolaylaştırma ve zorlaştırma önerileri"
}`;

export const POST = createToolHandler({
  rateLimitKey: "matching-game",
  bodySchema: z.object({
    studentId:  z.string().optional(),
    matchType:  z.enum(["definition", "image_desc", "synonym", "antonym", "category", "sentence"]),
    pairCount:  z.enum(["6", "8", "10", "12"]),
    difficulty: z.enum(["easy", "medium", "hard"]),
    theme:      z.string().max(100).optional(),
    goalTitle:  z.string().max(300).optional(),
  }),
  cost: 15,
  systemPrompt: SYSTEM_PROMPT,
  toolType: "MATCHING_GAME",
  category: "language",
  categoryFromWorkArea: true,
  creditDescription: "Kelime eşleştirme oyunu üretimi",
  responseKey: "game",
  fallbackTitle: "Kelime Eşleştirme",
  studentRequired: false,

  buildUserPrompt(data, student, ageText) {
    const studentBlock = student
      ? `Öğrenci bilgileri:\n- Ad: ${student.name}${ageText ? `, ${ageText}` : ""}\n- Çalışma alanı: ${student.workArea}${student.diagnosis ? `\n- Tanı: ${student.diagnosis}` : ""}\n\n`
      : "";

    return `${studentBlock}Parametreler:
- Eşleştirme türü: ${MATCH_TYPE_LABEL[data.matchType]}
- Çift sayısı: ${data.pairCount} çift
- Zorluk: ${DIFFICULTY_LABEL[data.difficulty]}
- Tema: ${data.theme || "Karışık (tema yok)"}
${data.goalTitle ? `- Müfredat hedefi: ${data.goalTitle}` : ""}

Bu parametrelere uygun eşleştirme kartı seti üret.`;
  },

  enrichContent(content, data) {
    content.theme     = data.theme ?? "";
    content.pairCount = parseInt(data.pairCount);
  },
});
