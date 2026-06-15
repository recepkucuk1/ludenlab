import type Anthropic from "@anthropic-ai/sdk";

export type CardCategory = "speech" | "language" | "hearing";
export type Difficulty = "easy" | "medium" | "hard";
export type AgeGroup = "3-6" | "7-12" | "13-18" | "adult";

/**
 * Öğrenciye özel geçmiş bağlamı. Generate route, prisma'dan doldurur.
 * Modelin "isabetli" içerik üretmesi için en büyük sinyal kaynağıdır.
 */
export interface StudentContext {
  name: string;
  ageYears: number | null;
  workArea: string;
  diagnosis?: string | null;
  notes?: string | null;
  aiProfile?: string | null;
  /** Son çalışılmış kartlar — tekrarı önlemek ve progresyon kurmak için. */
  recentCards: { title: string; difficulty: string; createdAt: Date }[];
  /** Tamamlanmış müfredat hedef kodları — atlanacak aşamalar. */
  completedGoalCodes: string[];
}

export interface CardGenerationParams {
  category: CardCategory;
  difficulty: Difficulty;
  ageGroup: AgeGroup;
  focusArea?: string;
  curriculumGoalText?: string; // "[kod] - [başlık]" formatında, generate route tarafından doldurulur
  studentContext?: StudentContext;
}

export interface GeneratedCard {
  title: string;
  objective: string;
  materials: string[];
  instructions: string[];
  exercises: { name: string; description: string; repetitions: string }[];
  therapistNotes: string;
  progressIndicators: string[];
  homeExercise: string;
  category: CardCategory;
  difficulty: Difficulty;
  ageGroup: AgeGroup;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATIC SYSTEM PROMPT — prompt-cache'li. Değiştirmeden önce cache hit'ini bozduğunu unutma.
// ─────────────────────────────────────────────────────────────────────────────

export const CARD_SYSTEM_PROMPT = `Sen Türkiye'de lisanslı, deneyimli bir konuşma/dil/işitme terapistisin. Uzmanlar için klinik olarak doğru ve pedagojik olarak sağlam öğrenme kartları hazırlıyorsun.

GÖREV: Verilen kategori, zorluk, yaş grubu ve (varsa) müfredat hedefi ile öğrenci bağlamına göre \`emit_card\` aracını kullanarak TEK bir öğrenme kartı üret. Araç dışında serbest metin yazma.

KATEGORİ TANIMLARI:
- speech (konuşma): Artikülasyon, ses üretimi, akıcılık/kekemelik, prozodi, fonolojik bozukluklar
- language (dil): Alıcı/ifade edici dil, kelime hazinesi, morfoloji-sentaks, pragmatik/sosyal dil, anlatı becerileri
- hearing (işitme): İşitme kayıplı bireylerde sözlü iletişim, işitsel ayırt etme, işitsel hafıza, dudak okuma, işitsel-sözel terapi

ZORLUK SEVİYELERİ:
- easy (başlangıç): İzole hedef, yüksek ipucu, kısa süre, modelleme baskın
- medium (gelişim): Yarı yapılandırılmış, orta ipucu, seçim/üretim dengesi
- hard (pekiştirme/genelleme): Doğal ortamda kullanım, minimum ipucu, öz-izleme

YAŞ GRUBU BAĞLAMI:
- 3-6 (okul öncesi): Oyun temelli, kısa dikkat süresi (5-10 dk), somut nesneler, rutin/öngörülebilir yapı
- 7-12 (ilkokul): Kural tabanlı oyunlar, keşif/merak, 10-15 dk, görsel-işitsel çoklu kanal
- 13-18 (ortaokul/lise): Öz-değerlendirme, kimliğe saygılı dil, ilgi alanlarına bağlı içerik, 15-25 dk
- adult (yetişkin): Gerçek yaşam senaryoları, profesyonel ton, hedefe ortaklık, öz-yönetim

MOTİVASYON KURALI — MUTLAK:
Ödül çıkartması, puan tablosu, rozet, yıldız, hediye, ödül sistemi veya herhangi bir DIŞSAL ödüllendirme mekanizması ÜRETME. Bunun yerine yalnızca içsel motivasyon yaklaşımları:
- Sözel övgü ve cesaretlendirme ("Harika denedin!", "Bir öncekinden daha net çıktı!")
- Öz-farkındalık desteği (önceki/şimdiki performansı karşılaştırma)
- Oyun temelli katılım (rol yapma, hikâye kurma, keşif oyunları)
- Merak/keşif soruları ("Sence neden böyle oluyor?", "Bakalım ne keşfedeceğiz")

İSABET KURALLARI:
1. Müfredat hedefi verilmişse, egzersizler bu hedefe DOĞRUDAN hizmet etsin — jenerik olma, hedef kodunu zihinde tut.
2. Öğrenci bağlamı verildiyse:
   a) "Son çalışılan kartlar" listesindeki içerikleri ve temaları TEKRARLAMA; bir sonraki doğal aşamaya geç.
   b) "Tamamlanmış müfredat hedefleri"ni atla; bir üst hedefe yoğunlaş.
   c) Tanı ve notları egzersiz tasarımında dikkate al (ör. OSB → öngörülebilir yapı + görsel destek; işitme kaybı → görsel ipuçları; DEHB → kısa ve çeşitli görevler).
   d) \`therapistNotes\` içinde öğrencinin ismini doğal bir şekilde en az bir kez kullan.
3. Materyaller ev/okul ortamında kolay bulunabilir olsun — özel/pahalı terapi malzemesi şart koşma.
4. Artikülasyon hedefi varsa izole ses → hece → kelime → cümle → serbest konuşma hiyerarşisini gözet ve şu anki zorluk seviyesine uygun basamakta kal.
5. Dil hedefi varsa modelleme, genişletme (expansion), yeniden biçimlendirme (recast) gibi kanıta dayalı teknikleri adım adım göm.
6. İşitme hedefi varsa listening-first yaklaşımla gürültü/sessizlik koşullarını netleştir.
7. Kartın TAMAMI Türkçe olsun; klinik terimler Türk konuşma-dil terapisi pratiğine uygun olsun.
8. \`progressIndicators\` gözlemlenebilir ve ölçülebilir olsun (örn. "5 denemeden 4'ünde /s/ sesini izole olarak üretir"), soyut olmasın.
9. \`homeExercise\` aileye verilebilecek kadar basit açıklansın; terim kullanma, günlük dil kullan.

Her çağrıda yalnızca \`emit_card\` aracını bir kez çağır ve gerekli tüm alanları doldur.`;

// ─────────────────────────────────────────────────────────────────────────────
// TOOL DEFINITION — Claude'un structured output garantisi. Şema, parse edilen
// sonucun GeneratedCard arayüzüne (category/difficulty/ageGroup hariç) uyar.
// ─────────────────────────────────────────────────────────────────────────────

export const CARD_TOOL: Anthropic.Messages.Tool = {
  name: "emit_card",
  description:
    "Üretilen öğrenme kartını structured format olarak döndürür. Her zaman tam ve eksiksiz doldur.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Etkinliğin kısa ve açıklayıcı başlığı (en fazla 80 karakter).",
        maxLength: 80,
      },
      objective: {
        type: "string",
        description:
          "Bu etkinliğin eğitimsel hedefi (1-2 cümle). Müfredat hedefi verilmişse ona açıkça referans ver.",
      },
      materials: {
        type: "array",
        description:
          "Gerekli materyaller. Ev/okul ortamında kolay bulunabilir olanları tercih et.",
        items: { type: "string" },
        minItems: 1,
        maxItems: 6,
      },
      instructions: {
        type: "array",
        description:
          "Sıralı uygulama adımları. Her adım 'Adım N: ...' formatında, eyleme yönelik fiillerle.",
        items: { type: "string" },
        minItems: 3,
        maxItems: 8,
      },
      exercises: {
        type: "array",
        description: "Kart içindeki 1-4 adet egzersiz tanımı.",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Egzersiz adı." },
            description: {
              type: "string",
              description:
                "Egzersizin nasıl uygulanacağı — içsel motivasyona dayalı, merak/keşif/oyun odaklı.",
            },
            repetitions: {
              type: "string",
              description: "Tekrar sayısı veya süre (örn. '5 tekrar', '10 dakika', '3 deneme').",
            },
          },
          required: ["name", "description", "repetitions"],
        },
      },
      therapistNotes: {
        type: "string",
        description:
          "Uzmana özel ipuçları: sözel cesaretlendirme örnekleri, öz-farkındalık destekleri, dikkat edilecek klinik noktalar. Öğrenci ismi verildiyse doğal bir şekilde kullan.",
      },
      progressIndicators: {
        type: "array",
        description:
          "Gözlemlenebilir ve ölçülebilir ilerleme göstergeleri. Soyut ifade kullanma.",
        items: { type: "string" },
        minItems: 2,
        maxItems: 5,
      },
      homeExercise: {
        type: "string",
        description:
          "Evde aile tarafından uygulanabilecek merak/keşif odaklı basit etkinlik önerisi. Klinik terim kullanma.",
      },
    },
    required: [
      "title",
      "objective",
      "materials",
      "instructions",
      "exercises",
      "therapistNotes",
      "progressIndicators",
      "homeExercise",
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC USER PROMPT — cache dışı. Her çağrıda değişen parametreler burada.
// ─────────────────────────────────────────────────────────────────────────────

const DIFFICULTY_MAP: Record<Difficulty, string> = {
  easy: "kolay (başlangıç seviyesi)",
  medium: "orta (gelişim aşaması)",
  hard: "ileri (pekiştirme aşaması)",
};

const AGE_MAP: Record<AgeGroup, string> = {
  "3-6": "3-6 yaş (okul öncesi)",
  "7-12": "7-12 yaş (ilkokul)",
  "13-18": "13-18 yaş (ortaokul/lise)",
  adult: "yetişkin (18 yaş üzeri)",
};

const CATEGORY_LABEL: Record<CardCategory, string> = {
  speech: "konuşma",
  language: "dil",
  hearing: "işitme",
};

function formatStudentContext(ctx: StudentContext): string {
  const lines: string[] = [];
  lines.push(`- İsim: ${ctx.name}`);
  if (ctx.ageYears !== null) lines.push(`- Yaş: ${ctx.ageYears}`);
  lines.push(`- Çalışma alanı: ${ctx.workArea}`);
  if (ctx.diagnosis?.trim()) lines.push(`- Tanı: ${ctx.diagnosis.trim()}`);
  if (ctx.notes?.trim()) lines.push(`- Uzman notları: ${ctx.notes.trim()}`);
  if (ctx.aiProfile?.trim()) lines.push(`- AI profili: ${ctx.aiProfile.trim()}`);

  if (ctx.recentCards.length > 0) {
    lines.push("- Son çalışılan kartlar (tekrarlama, bir sonraki aşamaya geç):");
    for (const c of ctx.recentCards) {
      lines.push(`  • ${c.title} [${c.difficulty}]`);
    }
  } else {
    lines.push("- Son çalışılan kartlar: (ilk kart — başlangıç noktası olarak tasarla)");
  }

  if (ctx.completedGoalCodes.length > 0) {
    lines.push(
      `- Tamamlanmış müfredat hedefleri (ATLA): ${ctx.completedGoalCodes.join(", ")}`,
    );
  }

  return lines.join("\n");
}

export function buildCardPrompt(params: CardGenerationParams): string {
  const { category, difficulty, ageGroup, focusArea, curriculumGoalText, studentContext } =
    params;

  const sections: string[] = [
    `Aşağıdaki parametrelere göre \`emit_card\` aracını kullanarak bir ${CATEGORY_LABEL[category]} terapi kartı üret.`,
    "",
    `**KATEGORİ:** ${CATEGORY_LABEL[category]}`,
    `**ZORLUK:** ${DIFFICULTY_MAP[difficulty]}`,
    `**YAŞ GRUBU:** ${AGE_MAP[ageGroup]}`,
  ];

  if (curriculumGoalText) {
    sections.push("", "**MÜFREDAT HEDEFLERİ (kart bunlara DOĞRUDAN hizmet etmeli):**", curriculumGoalText);
  }

  if (focusArea?.trim()) {
    sections.push("", `**HEDEF BECERİ / ODAK ALAN:** ${focusArea.trim()}`);
  }

  if (studentContext) {
    sections.push("", "**ÖĞRENCİ BAĞLAMI:**", formatStudentContext(studentContext));
  }

  sections.push(
    "",
    "Şimdi `emit_card` aracını çağır ve tüm alanları yukarıdaki bağlama özgü, isabetli içerikle doldur.",
  );

  return sections.join("\n");
}
