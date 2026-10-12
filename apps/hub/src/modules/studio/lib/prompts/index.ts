import type Anthropic from "@anthropic-ai/sdk";
import { studioKullaniciPromptu, studioSistemPromptu } from "./iskelet";

export type CardCategory = "speech" | "language" | "hearing";
export type Difficulty = "easy" | "medium" | "hard";
export type AgeGroup = "3-6" | "7-12" | "13-18" | "adult";

export interface CardGenerationParams {
  category: CardCategory;
  difficulty: Difficulty;
  ageGroup: AgeGroup;
  focusArea?: string;
  curriculumGoalText?: string; // "[kod] - [başlık]" formatında, generate route tarafından doldurulur
  /**
   * Ortak öğrenci bağlam bloğu (spec A2, `loadStudentContext`): RUMUZLU, bütçeli; kimlik, tanı,
   * modüller, uzman notları, AI profilinin iki bölümü, son çalışmalar, son oturum özeti ve hedefler.
   * Modelin "isabetli" içerik üretmesi için en büyük sinyal kaynağıdır; rota olduğu gibi gömer.
   */
  studentBlock?: string;
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
// STATIC SYSTEM PROMPT — prompt-cache'li; spec A1 iskeletiyle (Faz 2 / Task 12) kurulur:
// rol → klinik çerçeve → özgüllük → karşıt örnek → biçim → öz-denetim → ortak son blok.
// Alan adları `CARD_TOOL` şemasıyla AYNEN (A4). Taban sert hatası "terapist" sözcüğüydü:
// yeni metin "uzman" der ve `card.prompt.test.ts` bunu kilitler. Değiştirmeden önce cache
// hit'ini bozduğunu unutma.
// ─────────────────────────────────────────────────────────────────────────────

/** Aşama adları — odak satırı ve klinik çerçeve aynı adı kullanır. */
const STAGE_NAME: Record<Difficulty, string> = { easy: "Başlangıç", medium: "Gelişim", hard: "Pekiştirme" };

/** Aşama kuralı (tek satır). Eval adaptörü (`evals/tools/studio/cards/adapter.ts` ZORLUK_KURALI) hakeme AYNI metni gösterir. */
export const DIFFICULTY_RULE: Record<Difficulty, string> = {
  easy: "İzole hedef, yüksek ipucu, kısa süre, modelleme baskın",
  medium: "Yarı yapılandırılmış, orta ipucu, seçim/üretim dengesi",
  hard: "Doğal ortamda kullanım, minimum ipucu, öz-izleme",
};

/** Yaş grubu kuralı (tek satır). Adaptörün YAS_KURALI'sı ile AYNI metin. */
export const AGE_RULE: Record<AgeGroup, string> = {
  "3-6": "Oyun temelli, kısa dikkat süresi (5-10 dk), somut nesneler, rutin/öngörülebilir yapı",
  "7-12": "Kural tabanlı oyunlar, keşif/merak, 10-15 dk, görsel-işitsel çoklu kanal",
  "13-18": "Öz-değerlendirme, kimliğe saygılı dil, ilgi alanlarına bağlı içerik, 15-25 dk",
  adult: "Gerçek yaşam senaryoları, profesyonel ton, hedefe ortaklık, öz-yönetim",
};

const DIFFICULTIES = Object.keys(STAGE_NAME) as Difficulty[];
const AGE_GROUPS = Object.keys(AGE_RULE) as AgeGroup[];

export const CARD_SYSTEM_PROMPT = studioSistemPromptu({
  rol: `Sen LudenLab Studio'nun öğrenme kartı üreticisisin: konuşma, dil ve işitme uzmanları için klinik olarak doğru TEK bir kart hazırlarsın. OKUYAN uzmandır; instructions ve exercises kısa emir kipiyle. therapistNotes yalnız uzmana: terim serbest, "öğrenci/uzman" sözcükleri burada da geçerli. homeExercise'ı veli okur (yetişkinde öğrencinin kendisi): günlük Türkçe, terim yok, "siz" ile öneri kipi.`,
  klinikCerceve: [
    `speech (konuşma): artikülasyon, ses üretimi, akıcılık, prozodi, fonoloji. Artikülasyonda izole ses → hece → kelime → cümle → serbest konuşma; aşamaya uygun basamakta kal.`,
    `language (dil): alıcı/ifade edici dil, kelime hazinesi, morfoloji-sentaks, pragmatik, anlatı. Teknikler adımlarda: modelleme, genişletme (ifadeye bir öğe ekleyip geri verme), yeniden biçimlendirme.`,
    `hearing (işitme): işitme kayıplı bireyde sözlü iletişim, işitsel ayırt etme ve hafıza, dudak okuma. Önce dinleme; her egzersizde gürültü/sessizlik koşulu yazılı.`,
    `${DIFFICULTIES.map((d) => `${d} = ${STAGE_NAME[d]}: ${DIFFICULTY_RULE[d]}`).join(". ")}.`,
    ...AGE_GROUPS.map((a) => `${a}: ${AGE_RULE[a]}.`),
    `Yetişkin (adult) kartında çocuk oyunu, çocuksu dil ve "veli/çocuk" yazılmaz; hedef iş/okul/aile yaşamına bağlanır.`,
    `Tanı tasarımı belirler: OSB → öngörülebilir akış + görsel destek; işitme kaybı → görsel ipucu; DEHB → kısa görevler. Bloktaki "Tamamlanan hedefler" yeniden hedeflenmez, "Son çalışmalar" tekrarlanmaz: kart onların bir sonraki aşamasıdır (üst basamak ya da yeni ortam).`,
    `progressIndicators karta özgü: her madde sayı (kaç denemede kaç doğru, yüzde), ölçüt (ne sayılır) ve koşul (ipucu düzeyi, ortam, kaç seans) içerir. exercises[].repetitions sayıyla (tekrar, deneme ya da dakika).`,
    `İçsel motivasyon: tırnaklı cesaretlendirme sözü, öz-farkındalık sorusu (önceki/şimdiki karşılaştırma), oyun ya da keşif sorusu.`,
  ],
  // Ortak dört kural iskeletten gelir; buradakiler yalnız araca özgü ekler.
  ozgulluk: [
    `focusArea her egzersizde görünür: exercises[].description hedefin somut biçimini (ses, sözcük, cümle kalıbı) içerir.`,
    `Müfredat hedefi verilmişse objective ona DOĞRUDAN hizmet eder ve kodunu anar.`,
    `Öğrenci bloğu varsa therapistNotes bloktaki adı en az bir kez aynen kullanır. İlgi alanı "Uzman notları" içindedir ("…bayılıyor", "…meraklı"): materials'a ve en az bir egzersize taşınır; "Dikkat edilmesi gerekenler" bir adıma ya da uzman notuna dönüşür.`,
    `adult yaş grubunda homeExercise öğrencinin kendisine yazılır ("siz" = öğrenci); yakını yalnız dinleyici rolünde anılır.`,
  ],
  karsitOrnek: {
    zayif: "İlerleme göstergesi: Öğrenci hedef sesi daha iyi üretir.",
    iyi: "İlerleme göstergesi: 10 kelimelik listede /r/ kelime başı en az 8/10 doğru, sözel ipucusuz, iki ardışık seansta.",
  },
  bicim: {
    giris: "`emit_card` aracını kullan; araç dışında metin yazma. Alan adları aynen:",
    sema: `{ "title": "…", "objective": "…", "materials": ["…"], "instructions": ["Adım 1: …"], "exercises": [{ "name": "…", "description": "…", "repetitions": "…" }], "therapistNotes": "…", "progressIndicators": ["…"], "homeExercise": "…" }`,
    butce: [
      `title: ≤ 80 karakter.`,
      `objective: 1–2 cümle; hedef davranış + (varsa) müfredat kodu.`,
      `materials: ≤ 6 madde (en az 3), ≤ 10 kelime; ev/okulda bulunan ya da ilgi alanından.`,
      `instructions: 4–8 adım, her biri "Adım N: " ile başlar, ≤ 2 cümle: tek eylem + öğrencinin söyleyeceği şey + ipucu düzeyi.`,
      `exercises: 2–4; name ≤ 6 kelime; description 2–3 cümle (uygulama, hedef biçim, ne zaman genişletilir); repetitions sayıyla.`,
      `therapistNotes: 5–8 cümle: iki cesaretlendirme sözü tırnak içinde; bir öz-farkındalık sorusu; profil verisine bağlı iki klinik dikkat noktası (ne / ne zaman / nasıl); son çalışmalarla ilişki, sonraki basamak.`,
      `progressIndicators: 3–5 madde, ≤ 25 kelime, sayı + ölçüt + koşul.`,
      `homeExercise: 3–4 cümle: rutin anı, yapılacak tek şey, örnek söz, neye bakılacağı.`,
    ],
  },
  ozDenetim: [
    `Her egzersiz odak alanına (ve varsa müfredat hedefine) hizalı mı?`,
    `Her gösterge sayı + ölçüt + koşul içeriyor mu?`,
    `Zorluk aşaması ve yaş grubu kuralı (yetişkinde profesyonel ton) içerikte görünüyor mu?`,
    `"hasta/terapist" yerine "öğrenci/uzman", dışsal ödül yerine içsel motivasyon yazıldı mı?`,
    `Alanlar şemaya ve bütçeye uygun; "Adım N:" biçimi, sayılı tekrar, bloktaki ad yerinde mi?`,
  ],
});

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

/** A1 odak satırı — koddan türetilir: aşama adı + yaş etiketi → aşama kuralı; yaş kuralı; homeExercise muhatabı. */
export function odakSatiri(difficulty: Difficulty, ageGroup: AgeGroup): string {
  const yas = AGE_RULE[ageGroup];
  const yasKurali = yas.charAt(0).toLocaleLowerCase("tr-TR") + yas.slice(1);
  const muhatap =
    ageGroup === "adult"
      ? `homeExercise öğrencinin kendisine ("siz" = öğrenci); çocuk oyunu/dili ve "veli/çocuk" yazılmaz`
      : "homeExercise veliye";
  return `${STAGE_NAME[difficulty]} aşaması + ${AGE_MAP[ageGroup]} → ${DIFFICULTY_RULE[difficulty]}; ${yasKurali}; ${muhatap}.`;
}

/** Son hatırlatma (A1 kullanıcı prompt'u, d) — iki sabit madde; olumsuz emir yerine "…hedeflenmez" (ad öbeği gibi okunmasın). */
const HATIRLATMA = [
  "Göstergeler sayı/ölçüt/koşul içerir.",
  "Tamamlanan hedefler yeniden hedeflenmez; son çalışmaların bir sonraki aşaması kurulur.",
] as const;

/** A1 kullanıcı prompt'u: öğrenci bloğu (A2, boşsa başlıksız) → parametreler → odak → son hatırlatma. */
export function buildCardPrompt(params: CardGenerationParams): string {
  const { category, difficulty, ageGroup, focusArea, curriculumGoalText, studentBlock } = params;
  return studioKullaniciPromptu({
    // Blok RUMUZLUDUR (çocuk-PII kapısı, denetim #09) — çağıran taraf `loadStudentContext`ten alır.
    studentBlock: studentBlock ?? "",
    parametreler: [
      `- Kategori: ${CATEGORY_LABEL[category]}`,
      `- Zorluk: ${DIFFICULTY_MAP[difficulty]}`,
      `- Yaş grubu: ${AGE_MAP[ageGroup]}`,
      ...(focusArea?.trim() ? [`- Hedef beceri / odak alan: ${focusArea.trim()}`] : []),
      ...(curriculumGoalText ? [`- Müfredat hedefleri (objective bunlara DOĞRUDAN hizmet eder):\n${curriculumGoalText}`] : []),
    ],
    odak: odakSatiri(difficulty, ageGroup),
    hatirlatma: [...HATIRLATMA],
  });
}
