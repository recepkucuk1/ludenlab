// apps/hub/evals/tools/studio/matching-game/adapter.ts
import { DIFFICULTY_LABEL } from "@studio/lib/constants";
import { studioAdapter } from "../../../lib/adapterFactory";
import { kayitlar, str } from "../../../lib/sharedChecks";
import { matchingGameChecks, type MatchingGameBody } from "./checks";

type Rec = Record<string, unknown>;

/** Route'taki MATCH_TYPE_LABEL ve parametre satırlarının AYNI metinleri (hakem, modelin gördüğünü görsün). */
const MATCH_TR: Record<MatchingGameBody["matchType"], string> = {
  definition: "Kelime — Tanım",
  image_desc: "Kelime — Resim Açıklaması",
  synonym: "Eş Anlamlı",
  antonym: "Zıt Anlamlı",
  category: "Kategori Eşleştirme",
  sentence: "Cümle Tamamlama",
};
/** Route prompt'unun tür kuralları (hakem "doğru kart biçimi"ni bilsin). */
const TUR_KURALI: Record<MatchingGameBody["matchType"], string> = {
  definition: "kart A kelime, kart B kısa ve net tek cümlelik tanım; kart A somut nesneyse görsel komutu ya TÜM çiftlerde ya HİÇBİRİNDE",
  image_desc: "kart A somut nesne, kart B nesneyi görsel olarak tarif eden kısa açıklama (en çok iki cümle); HER çiftte görsel komutu (İngilizce, tek nesne) VAR",
  synonym: "iki kart da kelime (gerçek eş anlamlı çift); görsel YOK",
  antonym: "iki kart da kelime (gerçek zıt anlamlı çift); görsel YOK",
  category: "kart A kelime, kart B ait olduğu kategori; somutsa ya TÜM çiftlerde ya HİÇBİRİNDE görsel komutu",
  sentence: "kart A boşluklu cümle, kart B doğru kelime; görsel YOK",
};
const GENERIC_IPUCU = "Dikkatli bak.";

export const adapter = studioAdapter<MatchingGameBody>({
  id: "studio/matching-game",
  label: "Kelime eşleştirme oyunu (Studio)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/tools/matching-game/route"),
  responseKey: "game",
  studentRequired: false,

  requestLines: (b) => [
    `- Eşleştirme türü: ${MATCH_TR[b.matchType]} · Çift sayısı: ${b.pairCount} çift · Zorluk: ${DIFFICULTY_LABEL[b.difficulty]} · Tema: ${b.theme || "Karışık (tema yok)"}`,
    ...(b.goalTitle ? [`- Müfredat hedefi: ${b.goalTitle}`] : []),
    `- Tür kuralı (route prompt'u): ${TUR_KURALI[b.matchType]}.`,
    "- Not: ipucu (hint) prompt'ta opsiyoneldir (yalnız zor eşleşmeler için, kısa); yokluğu kusur değildir.",
  ],

  renderOutput(o) {
    const g = o as Rec; // JSON modu: çıktı nesnesi
    const pairs = kayitlar(g.pairs);
    return [
      `Başlık: ${str(g.title) || "—"}`,
      ...pairs.map(
        (p, i) =>
          `${typeof p.id === "number" || typeof p.id === "string" ? String(p.id) : String(i + 1)}. ${str(p.cardA) || "—"} ↔ ${str(p.cardB) || "—"}` +
          `${str(p.hint) ? ` (ipucu: ${str(p.hint)})` : ""}${str(p.visualPrompt) ? ` · görsel komutu: ${str(p.visualPrompt)}` : ""}`,
      ),
      `Yönerge: ${str(g.instructions) || "—"}`,
      `Uzman notları: ${str(g.expertNotes) || "—"}`,
      `Uyarlamalar: ${str(g.adaptations) || "—"}`,
    ].join("\n");
  },

  checks: matchingGameChecks,

  criteria: [
    {
      key: "cift_kesinligi",
      question:
        "Her çift tek ve doğru biçimde eşleşiyor mu (eş/zıt anlam, tanım, kategori ya da boşluğa gelen kelime gerçekten doğru; başka bir kartla da eşleşebilen belirsiz çift yok — kategori türünde aynı kategoriye giren birkaç kelime meşrudur; kelimeler gerçek ve yaygın Türkçe)?",
    },
    {
      key: "seviye_uyumu",
      question:
        "Kelime dağarcığı, ipuçları (varsa) ve cümleler istenen zorluğa (kolay: sık, somut; zor: soyut, çok anlamlı, deyim) ve varsa öğrencinin yaşına/tanısına uygun mu; tema ve (varsa) müfredat hedefiyle tutarlı mı? Araç bir dil aracıdır: tanı artikülasyon olsa bile hedef sesi içermeyi şart koşma.",
    },
  ],

  // Fabrika çıktının derin kopyasını verir (çıktı yoksa `{}`). Çiftler (kartlar, id, görsel komutu) ve başlık aynı kalır; ipuçları
  // ve tüm yorum alanları jenerik olur. Yasak kalıplar SABİT (üst düzey) alanlardan gelir: çiftsiz kısa çıktıda da ≥ 4 kalıp taşınır.
  generic(o) {
    const g = o as Rec;
    return {
      ...g,
      pairs: kayitlar(g.pairs).map((p) => ({ ...p, hint: GENERIC_IPUCU })),
      instructions: "Kartları eşleştirin. Sabırlı olun.",
      expertNotes: "Çok duyulu yaklaşım kullanın. Düzenli tekrar önemlidir.",
      adaptations: "Bireysel farklılıklara dikkat edin. Olumlu pekiştirme yapın.",
    };
  },
});
