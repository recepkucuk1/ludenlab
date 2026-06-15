import { z } from "zod";
import { createToolHandler } from "@/lib/toolHandler";

const LEVEL_LABEL: Record<string, string> = {
  isolated:   "İzole Ses",
  syllable:   "Hece Düzeyi",
  word:       "Kelime Düzeyi",
  sentence:   "Cümle Düzeyi",
  contextual: "Bağlam İçi",
};

const POSITION_LABEL: Record<string, string> = {
  initial: "Başta",
  medial:  "Ortada",
  final:   "Sonda",
};

const SYSTEM_PROMPT = `Sen LudenLab platformunun artikülasyon alıştırma üretici aracısın.
Konuşma sesi bozuklukları için hedef ses bazlı alıştırma materyalleri üretiyorsun.

Kurallar:
- Tüm kelimeler gerçek, yaygın kullanılan Türkçe kelimeler olmalı
- Uydurma veya nadir kelimeler KULLANMA
- Hedef ses belirtilen pozisyonda (başta/ortada/sonda) MUTLAKA bulunmalı
- Kelimeler öğrencinin yaş grubuna uygun olmalı
- Tema seçildiyse kelimeler o temadan olmalı
- Her kelime için hece sayısını belirt
- Hece düzeyinde: hedef sesi içeren hece kombinasyonları üret (açık ve kapalı heceler)
- Kelime düzeyinde: hedef kelimeyi ve hece ayrımını ver
- Cümle düzeyinde: her kelimeyi içeren kısa, doğal bir cümle yaz
- Bağlam düzeyinde: hedef sesi sık içeren 3-4 cümlelik bir paragraf yaz
- İzole ses düzeyinde: sesin farklı uzunluk ve tonlamalarla tekrar önerileri

İçsel motivasyon ilkesi: Ödül/puan/çıkartma sistemi önerme.
'hasta' yerine 'öğrenci', 'terapist' yerine 'uzman' de.

ÖNEMLİ — items[] içindeki "word" alanı:
- Her seviyede MUTLAKA "word" alanı doldurulmalı (asla "syllable", "sound", "phrase" gibi başka isimler kullanma).
- "word" alanı, öğrencinin sesli olarak üreteceği birim olur:
  - isolated  → tek ses veya tekrar deseni: "şşş", "ş - ş - ş"
  - syllable  → hece: "şa", "şap", "şa-şa"
  - word      → kelime: "şapka"
  - sentence  → "word" alanı yine kelime olur (cümle ayrı "sentence" alanına yazılır)
  - contextual→ "word" alanı baş kelime, paragraf "sentence" alanına yazılır

Yanıtını SADECE JSON formatında ver, başka hiçbir şey yazma:
{
  "title": "Alıştırma başlığı",
  "targetSounds": ["/s/"],
  "positions": ["initial"],
  "level": "word",
  "items": [
    {
      "word": "sandal",
      "syllableCount": 2,
      "syllableBreak": "san-dal",
      "position": "initial",
      "targetSound": "/s/",
      "sentence": "Göl kenarında kırmızı bir sandal var.",
      "visualPrompt": "sandal görseli"
    }
  ],
  "expertNotes": "Çalışma önerileri ve dikkat edilecek noktalar",
  "cueTypes": ["Görsel (ayna karşısında)", "Dokunsal (çene altı desteği)", "İşitsel (uzman modeli)"],
  "homeGuidance": "Evde tekrar için veli rehberi"
}

Hece düzeyi (syllable) için items[] örneği:
[
  { "word": "şa",  "syllableType": "açık",   "exampleWord": "şapka", "targetSound": "/ş/", "position": "initial" },
  { "word": "şap", "syllableType": "kapalı", "exampleWord": "şapka", "targetSound": "/ş/", "position": "initial" }
]

İzole ses (isolated) için items[] örneği:
[
  { "word": "şşş",       "targetSound": "/ş/" },
  { "word": "ş - ş - ş", "targetSound": "/ş/" }
]`;

export const POST = createToolHandler({
  rateLimitKey: "articulation",
  bodySchema: z.object({
    studentId:    z.string().min(1),
    targetSounds: z.array(z.string()).min(1, "En az bir hedef ses seçin"),
    positions:    z.array(z.enum(["initial", "medial", "final"])).min(1),
    level:        z.enum(["isolated", "syllable", "word", "sentence", "contextual"]),
    itemCount:    z.number().int().min(5).max(30),
    theme:        z.string().optional(),
  }),
  cost: 15,
  systemPrompt: SYSTEM_PROMPT,
  toolType: "ARTICULATION_DRILL",
  category: "speech",
  categoryFromWorkArea: true,
  creditDescription: "Artikülasyon alıştırması üretimi",
  responseKey: "drill",
  fallbackTitle: "Artikülasyon Alıştırması",

  // 30 item senaryosunda statik alanlar + dinamik items ~3000-3500 tok'a
  // ulaşabiliyor. 4096 default'u tavana çarpıp JSON'u ortadan kesiyordu
  // (production'da gözlenen bug: out_tok=4096 + extractJson fail riski).
  // 5500 güvenli bir tavan — gerçek kullanım zaten bu kadarı istemez ama
  // clipping'i matematik olarak imkansız hale getirir.
  maxTokens: 5500,

  buildUserPrompt(data, student, ageText) {
    const positionLabels = data.positions.map((p: string) => POSITION_LABEL[p]).join(", ");
    return `Öğrenci bilgileri:
- Ad: ${student!.name}${ageText ? `, ${ageText}` : ""}
- Çalışma alanı: ${student!.workArea}
${student!.diagnosis ? `- Tanı: ${student!.diagnosis}` : ""}

Alıştırma parametreleri:
- Hedef ses(ler): ${data.targetSounds.join(", ")}
- Ses pozisyonu: ${positionLabels}
- Alıştırma seviyesi: ${LEVEL_LABEL[data.level]}
- Kelime/öğe sayısı: ${data.itemCount}
${data.theme && data.theme !== "none" ? `- Tema: ${data.theme}` : "- Tema: Karışık (tema yok)"}

Bu öğrenci için uygun artikülasyon alıştırma materyali üret.`;
  },

  enrichContent(content, data) {
    if (data.theme && data.theme !== "none") content.theme = data.theme;
  },
});
