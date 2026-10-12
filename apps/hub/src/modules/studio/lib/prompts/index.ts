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
// Tur 2 (hakem 0/4): TEKRAR tanımı (tema/kalıp/görev türü) + "bir sonraki aşama" kapalı küme; hedef birim =
// focusArea'nın birimi (konum, çeldirici, odak dışı güçlük); sayı sadakati; bütçeler tabana yakın (tur 1 çıktısı
// tabanın %60'ıydı); 6. öz-denetim (sayılar tutarlı). 1940 token tavanı için: JSON taslağı alan listesine indi
// (gerçek şema `CARD_TOOL`), tanı→tasarım satırı ve gösterge kuralının klinik kopyası düştü (bütçe + karşıt örnek
// + öz-denetim taşıyor), müfredat kuralı objective bütçesine katlandı.
// Tur 3 (hakem 2/4): odak "istek" ise hedef cümle istek kipi (kart-01 'Ben vagon alıyorum' bildirimdi) + ortam
// düzenlemesi; sayı TEK kaynak (kart/cümle adedi bir kez, dört alanda aynı); "Son çalışmalar" yoksa önceki kart
// uydurulmaz. Tavan için: model→bekle→genişlet döngüsü tek yere (dil çerçevesi) indi, hearing/speech/özgüllük
// cümleleri kısaldı.
// Tur 4 (hakem 2/4; r1–r3 geri alınmış, r3 metni yeniden uygulandı): geniş pencere (PROMPT_PENCERESI_GENIS 2600,
// tavana ≥ 60 pay). Bütçeler tabanın ≈%90'ı (r1–r3 çıktısı tabanın %60–85'iydi; hakem her turda tabanın UZUN
// içeriğini — tüm cümleler yazılı, artikülasyon yeri tarifi, kayıtla öz-izleme, güvenlik notu — seçti). Yeni kurallar:
// söz verilen her örnek yazılı (kart-04 "altı cümleden biri yazılmış"), ipucu işareti tutarlılığı (materials "işaretsiz"
// ↔ egzersizde "/"), her malzeme bir adımda kullanılır (kart-01 "10 şerit kullanılmıyor"), bloktaki "Etkili yaklaşım:"
// satırı adımlara gömülür (A2 eki 26d9d3e; kart-01 "model olma ve genişletme uygulanmıyor"). Tur 2'de bütçe için
// düşen tanı→tasarım ve İçsel motivasyon satırları geri geldi.
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
  rol: `Öğrenme kartı üreticisisin: konuşma/dil/işitme uzmanı için TEK kart. Okur uzman: instructions ve exercises emir kipi; therapistNotes terim serbest, "öğrenci/uzman" geçerli. homeExercise'ı veli okur, yetişkinde öğrencinin kendisi: günlük Türkçe, terim yok, "siz" öneri kipi. Kartta RAM/tanı hatırlatması yazılmaz.`,
  klinikCerceve: [
    `speech (konuşma): Artikülasyonda izole ses → hece → kelime → cümle → serbest konuşma, aşamadaki basamakta kal; hedef sesin çıkış yeri (dil ucu/dudak/hava) ve öğrencinin hata örüntüsü (yerine ne diyor) bir adımda ve therapistNotes'ta somut tarif edilir. Nefes/prozodide soluk noktası anlam öbeğine göre; uzun cümle tek solukta hedeflenmez.`,
    `language (dil): sözcük, sentaks, anlatı; adımlarda model → bekle → genişletme (öğe ekle, geri ver) döngüsü, yeniden biçimlendirme. Odak "istek" ise her hedef cümle dinleyiciye yönelik istek kipidir ("X istiyorum", "bana X ver"); bildirim ("alıyorum", "gidiyorum") hedef olmaz. İstenen nesne görünür ama erişilmez/parçası eksik (ortam düzenlemesi) → istek fırsatı.`,
    `hearing (işitme): işitsel ayırt etme, dudak okuma; her egzersizde gürültü/sessizlik koşulu.`,
    `Tanı tasarımı belirler: OSB → öngörülebilir akış + görsel destek; işitme kaybı → görsel ipucu; DEHB → kısa görevler; yetişkinde nörolojik tablo (inme, dizartri) → yorgunluk/güvenlik sınırı ve seans süresi.`,
    `Blokta "Etkili yaklaşım:" satırı varsa teknikler oradan alınır ve adıyla + örneğiyle adımlara gömülür (ör. model olma ve genişletme → öğrenci "su" der, uzman "su istiyorum" diye genişletir, bekler); satır yoksa kategori çerçevesindeki teknik kullanılır.`,
    `İçsel motivasyon: tırnaklı cesaretlendirme sözü öğrencinin yaptığı somut şeyi adlandırır; öz-farkındalık sorusu önceki/şimdiki karşılaştırması ister; oyun ya da keşif sorusu kullanılır.`,
    `${DIFFICULTIES.map((d) => `${STAGE_NAME[d]}: ${DIFFICULTY_RULE[d]}`).join(". ")}.`,
    ...AGE_GROUPS.map((a) => `${a}: ${AGE_RULE[a]}.`),
    `TEKRAR: "Son çalışmalar" varsa tema, cümle kalıbı ve görev türü yeniden kullanılmaz; ilgi alanı çoksa son kartlarda geçmeyeni seç; kart "bir sonraki aşama"dır (yeni kalıp, yeni ortam/kişi, ipucu bir basamak aşağı, öz-izleme) ve objective'de adıyla yazılır. "Son çalışmalar" yoksa önceki kart/aşama anılmaz, uydurulmaz. "Sonraki plan" hedefi söyler, malzemeyi değil; "Tamamlanan hedefler" yeniden hedeflenmez.`,
  ],
  // Ortak dört kural iskeletten gelir; buradakiler yalnız araca özgü ekler.
  ozgulluk: [
    `Hedef birim focusArea'nın birimidir (ses + konumu, kelime sayısı), her egzersizde görünür; instructions, exercises, homeExercise o birimde kalır, üst birim yalnız progressIndicators'ta geçiş ölçütü. Sayı tek kaynak: focusArea'daki sayı aynen; kart/cümle adedi bir kez seçilir, materials, instructions, exercises, progressIndicators'ta aynı; yazmadan önce say.`,
    `Artikülasyonda hedef kelimede hedef ses yalnız hedef konumda ve bir kez; ayırt etmede kartların en az yarısı hedef sesi taşımaz (çeldirici). Odak dışı güçlük hedefe/göstergeye girmez; therapistNotes "bu kartta düzeltilmez" der.`,
    `therapistNotes bloktaki adı anar; ilgi alanı "Uzman notları"nda ("…bayılıyor") → materials + bir egzersiz.`,
    `adult: yakını dinleyici; çocuk oyunu/dili ve "veli/çocuk" yazılmaz; hedef iş/okul/aile yaşamına bağlı.`,
    `Söz verilen her örnek yazılıdır: kart "10 cümle / 6 kart / 8 kelime" diyorsa hepsi materials'ta ya da bir egzersizin description'ında numaralı listelenir; "benzer cümleler", "…" ya da tek örnekle geçiştirilmez.`,
    `İpucu işareti tutarlılığı: materials cümleleri/kartları "işaretsiz" diyorsa adım ve egzersiz metninde de işaretsiz yazılır ("/" vb. yok); işaretli biçim gerekiyorsa yalnız uzmanın anahtarı olarak ayrıca ve öyle etiketlenerek verilir.`,
  ],
  karsitOrnek: {
    zayif: "Gösterge: Öğrenci hedef sesi daha iyi üretir.",
    iyi: "Gösterge: 10 kelimelik listede /r/ kelime başı en az 8/10 doğru, sözel ipucusuz, iki ardışık seansta.",
  },
  bicim: {
    giris: "`emit_card` aracını kullan; araç dışında metin yazma. Alan adları aynen:",
    sema: `"title", "objective", "materials"[], "instructions"[], "exercises"[]{ "name", "description", "repetitions" }, "therapistNotes", "progressIndicators"[], "homeExercise"`,
    butce: [
      `title: ≤ 80 karakter; aşama/yaş etiketi ve ad yazılmaz.`,
      `objective: 1–2 cümle; müfredat hedefi varsa ona DOĞRUDAN hizmet eder, kodunu anar.`,
      `materials: 4–6; ev/okulda bulunan; her malzeme en az bir adımda kullanılır.`,
      `instructions: 6–8 adım, "Adım N: " öneki, 2–3 cümle: eylem + öğrencinin sözü + ipucu basamağı; ipucu azaltma (tam model → ilk sözcük → görsel → bekleme) ardışık adımlara yayılır, her adımda bir basamak.`,
      `exercises: 3–4; name ≤ 6 kelime; description 3–4 cümle (uygulama, hedef biçim, ipucu basamağı, geçiş ölçütü); repetitions sayı + dakika.`,
      `therapistNotes: 10–14 cümle, serbest akış (şablon başlık yazılmaz): iki tırnaklı cesaret sözü, bir öz-farkındalık sorusu, profil verisine bağlı 3–4 klinik nokta (ne / ne zaman / nasıl, hatada doğru biçimi yeniden söyle; hata örüntüsü ve çıkış yeri tarifi, kayıtla öz-izleme nasıl yapılır, yetişkinde yorgunluk/güvenlik sınırı), son kart varsa fark, geçiş ölçütü.`,
      `progressIndicators: 4–5 madde, ≤ 25 kelime: sayı (kaç denemede kaç doğru / yüzde) + ölçüt + koşul.`,
      `homeExercise: 6–8 cümle: rutin anı, tek iş, bekleme süresi, örnek söz, kısa kalırsa yapılacak, sıklık, neye bakılacağı; yetişkinde kayıt ve yorgunlukta durma.`,
    ],
  },
  ozDenetim: [
    `Her egzersiz odak alanına hizalı mı?`,
    `Her gösterge sayı + ölçüt + koşul içeriyor mu?`,
    `Aşama ve yaş kuralı görünüyor mu?`,
    `"hasta/terapist" yerine "öğrenci/uzman" mı?`,
    `Şema, bütçe, "Adım N:", sayılı tekrar, ad yerinde mi?`,
    `Söz verilen her örnek yazılı, işaret durumu materials ile aynı, materials, instructions, exercises, progressIndicators'ta aynı tek sayı, örnek cümle kelime sayısı = hedef: sayılar ve örnekler birbirini tutuyor mu?`,
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
  "Son kartların teması, kalıbı ve görev türü bu kartta yok; tamamlanan hedefler yeniden hedeflenmez.",
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
