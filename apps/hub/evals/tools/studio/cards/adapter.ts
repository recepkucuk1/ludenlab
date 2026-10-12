// apps/hub/evals/tools/studio/cards/adapter.ts
import { studioAdapter } from "../../../lib/adapterFactory";
import { kayitlar, str } from "../../../lib/sharedChecks";
import { cardChecks, type CardBody } from "./checks";

type Rec = Record<string, unknown>;

/** Route prompt'unun (`prompts/index.ts`: CATEGORY_LABEL, DIFFICULTY_MAP, AGE_MAP) etiketleriyle AYNI metinler: hakem modelin gördüğünü görsün.
    Adaptör testi bunları gerçek `buildCardPrompt` çıktısıyla karşılaştırır. */
export const CAT_TR: Record<CardBody["category"], string> = { speech: "konuşma", language: "dil", hearing: "işitme" };
export const DIFF_TR: Record<CardBody["difficulty"], string> = {
  easy: "kolay (başlangıç seviyesi)",
  medium: "orta (gelişim aşaması)",
  hard: "ileri (pekiştirme aşaması)",
};
export const AGE_TR: Record<CardBody["ageGroup"], string> = {
  "3-6": "3-6 yaş (okul öncesi)",
  "7-12": "7-12 yaş (ilkokul)",
  "13-18": "13-18 yaş (ortaokul/lise)",
  adult: "yetişkin (18 yaş üzeri)",
};
/** Sistem prompt'unun (CARD_SYSTEM_PROMPT) "ZORLUK SEVİYELERİ" ve "YAŞ GRUBU BAĞLAMI" tanımları (hakem düzeyi ve yaş uyumunu BU kurala göre ölçsün). */
export const ZORLUK_KURALI: Record<CardBody["difficulty"], string> = {
  easy: "İzole hedef, yüksek ipucu, kısa süre, modelleme baskın",
  medium: "Yarı yapılandırılmış, orta ipucu, seçim/üretim dengesi",
  hard: "Doğal ortamda kullanım, minimum ipucu, öz-izleme",
};
export const YAS_KURALI: Record<CardBody["ageGroup"], string> = {
  "3-6": "Oyun temelli, kısa dikkat süresi (5-10 dk), somut nesneler, rutin/öngörülebilir yapı",
  "7-12": "Kural tabanlı oyunlar, keşif/merak, 10-15 dk, görsel-işitsel çoklu kanal",
  "13-18": "Öz-değerlendirme, kimliğe saygılı dil, ilgi alanlarına bağlı içerik, 15-25 dk",
  adult: "Gerçek yaşam senaryoları, profesyonel ton, hedefe ortaklık, öz-yönetim",
};

/** Dizi alanını hakeme okunur listeye çevirir; metin olmayan öğe "—" olur. */
const liste = (v: unknown): string[] => (Array.isArray(v) ? v : []).map((x) => (typeof x === "string" && x.trim() ? x : "—"));

export const adapter = studioAdapter<CardBody>({
  id: "studio/cards",
  label: "Öğrenme kartı üreticisi (Studio)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/cards/generate/route"),
  responseKey: "card",
  studentRequired: false,

  requestLines: (b, f) => [
    `- Kategori: ${CAT_TR[b.category]} · Zorluk: ${DIFF_TR[b.difficulty]} · Yaş grubu: ${AGE_TR[b.ageGroup]}${b.focusArea ? ` · Hedef beceri / odak alan: ${b.focusArea}` : ""}`,
    `- Zorluk kuralı (sistem prompt'u): ${ZORLUK_KURALI[b.difficulty]}.`,
    `- Yaş grubu kuralı (sistem prompt'u): ${YAS_KURALI[b.ageGroup]}.`,
    "- Not: müfredat hedefi kimlikleri bu düzenekte çözülmez (boş); hizayı odak alanına göre değerlendir.",
    // Öğrencisiz vakada (kart-02) araca hiçbir öğrenci bağlamı gitmez; not yalnız öğrencili vakada yazılır.
    ...(f
      ? [
          "- Öğrenci bağlamı ortak bloktan gider: notlar, AI profilinin iki bölümü (öncelikli alanlar, dikkat noktaları), son kartlar, son oturum özeti (değerlendirme + sonraki plan; davranış notu gitmez), atanmış müfredat başlıkları, tamamlanan ve sürmekte olan hedefler.",
        ]
      : []),
  ],

  renderOutput(o) {
    const c = o as Rec; // JSON modu: çıktı nesnesi (route'un eklediği kategori/zorluk/yaş alanları modelin çıktısı değildir, gösterilmez)
    return [
      `Başlık: ${str(c.title) || "—"}`,
      `Amaç: ${str(c.objective) || "—"}`,
      `Materyaller: ${liste(c.materials).join(", ") || "—"}`,
      "Yönerge:",
      ...liste(c.instructions).map((s) => `  ${s}`),
      "Egzersizler:",
      ...kayitlar(c.exercises).map((e) => `  • ${str(e.name) || "—"}: ${str(e.description) || "—"} (${str(e.repetitions) || "—"})`),
      `Uzman notları: ${str(c.therapistNotes) || "—"}`,
      `İlerleme göstergeleri: ${liste(c.progressIndicators).join(" | ") || "—"}`,
      `Ev egzersizi: ${str(c.homeExercise) || "—"}`,
    ].join("\n");
  },

  checks: cardChecks,

  // `EVAL_KART_ESKI_OLCUT=1`: 2026-10-12 öncesi ölçüt kümesiyle (dil_kurali OLMADAN) ölç — yeni ölçütün sonucu ne kadar çevirdiğini görmek için.
  criteria: ([
    {
      key: "hedef_hizasi",
      question:
        "Amaç ve egzersizler istenen odak alanına ve kategoriye hizalı mı (müfredat hedefi bu düzenekte verilmez; hizayı odak alanına göre değerlendir)? Öğrenci seçiliyse: tamamlanmış hedefler yeniden hedeflenmemiş, son kartların içerik ve teması tekrarlanmamış, tanı ve uzman notları (ör. görsel destek, yazılı taslak tercihi, ilgi alanı) egzersiz tasarımına yansımış mı?",
    },
    {
      key: "progresyon",
      question:
        "Zorluk düzeyi (başlangıç: izole hedef/modelleme; gelişim: yarı yapılandırılmış; pekiştirme: doğal ortam/öz-izleme) içerikte görünüyor mu; ilerleme göstergeleri ölçülebilir, gözlemlenebilir ve karta özgü mü (soyut 'gelişim gösterir' değil)?",
    },
    {
      key: "yas_uyumu",
      question:
        "İçerik istenen yaş grubuna uygun mu (okul öncesi: oyun temelli, kısa, somut nesne; ilkokul: kural tabanlı oyun, keşif; ergen: kimliğe saygılı, ilgi alanına bağlı; yetişkin: gerçek yaşam senaryosu, profesyonel ton, çocuksu oyun/dil yok)? Ev egzersizi aileye (yetişkinde kendisine ya da yakınına) verilebilecek kadar basit ve terimsiz mi?",
    },
    // 2026-10-12: r1–r3'te hakem tabanın 'terapist' demesini 12/12 kararda not edip "kolayca düzeltilebilir" diyerek klinik derinlik için tabanı seçti.
    // Kullanıcı kararı: kartta dil kuralı ihlali "uzmana olduğu gibi verilemez" ağırlığında; tek başına overall'ı çevirir. (dil_etik ortak ölçütü ağırlık belirtmez.)
    {
      key: "dil_kurali",
      question:
        "Dil kuralı: metinde 'terapist' ya da 'hasta' geçiyor mu, ya da ödül sistemi (çıkartma, puan, yıldız) öneriliyor mu? Böyle bir kart uzmana ya da aileye düzeltilmeden verilemez: ihlali o adayın critical_errors listesine yaz ve overall'da karşı adayı seç — bu ihlal tek başına tercihi çevirir; klinik derinlik farkı bunu telafi etmez, 'kolayca düzeltilebilir' diye hoş görülmez. İki adayda da ihlal varsa bu ölçütte 'tie' ver.",
    },  ] as { key: string; question: string }[]).filter((c) => !(process.env.EVAL_KART_ESKI_OLCUT === "1" && c.key === "dil_kurali")),

  // Fabrika çıktının derin kopyasını verir (çıktı yoksa `{}`). Başlık, malzeme ve egzersiz adı/tekrarı aynı kalır; amaç, adımların içeriği,
  // uzman notu, ev egzersizi, göstergeler ve egzersiz açıklamaları jenerik olur. Yasak kalıplar SABİT alanlardan gelir: boş/kısa çıktıda da ≥ 4 kalıp.
  generic(o) {
    const c = o as Rec;
    const adimlar = Array.isArray(c.instructions) ? c.instructions : [];
    return {
      ...c,
      objective: "Becerileri geliştirmek.",
      instructions: adimlar.map((_, i) => `Adım ${i + 1}: Çok duyulu yaklaşım kullanın.`),
      exercises: kayitlar(c.exercises).map((e) => ({ ...e, description: "Etkinliği birlikte uygulayın." })),
      therapistNotes: "Bireysel farklılıklara dikkat edin. Sabırlı olun ve olumlu pekiştirme yapın. Düzenli tekrar önemlidir.",
      progressIndicators: ["Gelişim gösterir", "Daha iyi yapar"],
      homeExercise: "Uygun ortam sağlayın ve gelişimini takip edin.",
    };
  },
});
