import { z } from "zod";
import { createToolHandler } from "@studio/lib/toolHandler";
import { articulation } from "@ludenlab/ai";

type BankStash = { __bankWords?: articulation.SelectedWord[] };

/** Banka-içi mi + uygulanabilir mi? Tam 1 hedef ses ve bankada o ses varsa, seçili kelimeleri döner; yoksa null. */
function pickBankWords(data: {
  targetSounds: string[];
  positions: ("initial" | "medial" | "final")[];
  itemCount: number;
  level: string;
}): articulation.SelectedWord[] | null {
  if (data.targetSounds.length !== 1) return null;
  const letter = articulation.soundToLetter(data.targetSounds[0]!);
  if (!articulation.WORD_BANK[letter]) return null;
  if (!["word", "sentence", "contextual"].includes(data.level)) return null;
  const picked = articulation.selectWords(articulation.WORD_BANK, letter, data.positions, data.itemCount);
  return picked.length > 0 ? picked : null;
}

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
- KRİTİK: Her kelimenin İÇİNDE hedef ses HARFİ MUTLAKA geçmeli. Hedef sesi İÇERMEYEN kelimeyi ASLA listeye ekleme. (Örn. /ç/ için "güneş" YANLIŞTIR — "güneş"te ç yok, ş var; "ağaç" doğrudur.) Her kelimeyi yazmadan önce hedef harfi gerçekten içerip içermediğini kontrol et.
- Kelimeler öğrencinin yaş grubuna uygun olmalı
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

ÖNEMLİ — items[] içindeki "visualPrompt" alanı (görsel üretimi için):
- visualPrompt İNGİLİZCE yazılmalı (görsel üretim modeli İngilizce'de daha isabetli).
- visualPrompt, "word" ile BİREBİR AYNI nesneyi betimlemeli. Alakasız bir nesne YAZMA
  (ör. "top" için "a flower" yazma — "top" için "a ball" yaz).
- Tek, net, somut bir nesne betimle. Belirsizlik varsa parantezle netleştir:
  "sandal" → "a sandal (footwear)" veya bağlama göre "a small rowing boat".
- Kelime SOMUT bir nesneyse visualPrompt'u MUTLAKA doldur (boş bırakma).
- Yalnız GERÇEKTEN görselleştirilemeyen soyut kelimelerde (ör. "sevgi", "hız") visualPrompt'u boş bırak ("").
- Stil betimleme (renk, arka plan) YAZMA — stil sistem tarafından eklenir.

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
      "visualPrompt": "a sandal (footwear)"
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
    studentId:    z.string().optional(),
    targetSounds: z.array(z.string()).min(1, "En az bir hedef ses seçin"),
    positions:    z.array(z.enum(["initial", "medial", "final"])).min(1),
    level:        z.enum(["isolated", "syllable", "word", "sentence", "contextual"]),
    itemCount:    z.number().int().min(5).max(30),
  }),
  studentRequired: false,
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
    const bankWords = pickBankWords(data);
    if (bankWords) {
      (data as typeof data & BankStash).__bankWords = bankWords;
    }
    const positionLabels = data.positions.map((p: string) => POSITION_LABEL[p]).join(", ");
    const studentBlock = student
      ? `Öğrenci bilgileri:
- Ad: ${student.name}${ageText ? `, ${ageText}` : ""}
- Çalışma alanı: ${student.workArea}
${student.diagnosis ? `- Tanı: ${student.diagnosis}` : ""}

`
      : "";
    return `${studentBlock}Alıştırma parametreleri:
- Hedef ses(ler): ${data.targetSounds.join(", ")}
- Ses pozisyonu: ${positionLabels}
- Alıştırma seviyesi: ${LEVEL_LABEL[data.level]}
- Kelime/öğe sayısı: ${data.itemCount}

${student ? "Bu öğrenci için uygun" : "Uygun"} artikülasyon alıştırma materyali üret.${bankWords ? (
  data.level === "word"
    ? `\nÖNEMLİ: items[] ÜRETME — kelimeler sistem tarafından sabit listeden eklenecek. Yalnız title, expertNotes, cueTypes, homeGuidance alanlarını doldur, "items": [] bırak.`
    : `\nÖNEMLİ: SADECE şu kelimeleri AYNI SIRADA kullan, başka kelime EKLEME/DEĞİŞTİRME: ${bankWords.map((w) => w.word).join(", ")}. Her kelime için items[] içinde bir öğe oluştur.`
) : ""}`;
  },

  enrichContent(content, data) {
    const stash = (data as typeof data & BankStash).__bankWords;
    if (stash) {
      if (data.level === "word") {
        // Kelime düzeyi: item'ları tamamen bankadan kur (Claude'unkini yok say).
        content.items = stash.map((w) => ({
          word: w.word,
          syllableCount: w.syllableCount,
          syllableBreak: w.syllableBreak,
          position: w.position,
          targetSound: data.targetSounds[0],
          visualPrompt: w.visualPrompt,
        }));
      } else {
        // Cümle/bağlam: Claude'un cümlesini koru, kelime/hece/görsel'i bankadan otoriter yaz.
        const items = Array.isArray(content.items) ? content.items : [];
        content.items = stash.map((w, i) => {
          const src = (items[i] ?? {}) as Record<string, unknown>;
          return {
            ...src,
            word: w.word,
            syllableCount: w.syllableCount,
            syllableBreak: w.syllableBreak,
            position: w.position,
            targetSound: data.targetSounds[0],
            visualPrompt: w.visualPrompt,
          };
        });
      }
      return; // banka yolu: hedef-harf filtresine gerek yok
    }
    // (buradan sonrası mevcut hedef-harf filtresi — banka-DIŞI sesler için güvence)
    // Deterministik hedef-ses güvencesi: prompt kuralına rağmen Claude bazen hedef sesi
    // İÇERMEYEN kelime üretiyor (ör. /k/ alıştırmasında "balon"·"çorap", /ç/'de "güneş").
    // Türkçe'de bu sesler tek harfle yazılır (k, m, ç, p, s, ş…) → hedef harfi içermeyen
    // item'ı kesin olarak ele. Prompt %100 değil; bu filtre kesindir.
    const letters = data.targetSounds
      .map((s) => s.replace(/\//g, "").trim().toLocaleLowerCase("tr-TR"))
      .filter((s) => s.length > 0);
    const items = content.items;
    if (letters.length > 0 && Array.isArray(items)) {
      const before = items.length;
      content.items = items.filter((it) => {
        const word = (it as { word?: unknown }).word;
        const w = typeof word === "string" ? word.toLocaleLowerCase("tr-TR") : "";
        return letters.some((l) => w.includes(l));
      });
      const dropped = before - (content.items as unknown[]).length;
      if (dropped > 0) {
        console.warn(
          `[articulation] hedef-ses filtresi: ${dropped} alakasız kelime elendi (hedef=${data.targetSounds.join(",")})`,
        );
      }
    }
  },
});
