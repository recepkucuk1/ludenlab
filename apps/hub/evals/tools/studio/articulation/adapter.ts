// apps/hub/evals/tools/studio/articulation/adapter.ts
import { studioAdapter } from "../../../lib/adapterFactory";
import { str } from "../../../lib/sharedChecks";
import { articulationChecks, type ArticulationBody, type Level } from "./checks";

const LEVEL_TR: Record<Level, string> = { isolated: "İzole ses", syllable: "Hece", word: "Kelime", sentence: "Cümle", contextual: "Bağlam (paragraf)" };
const POS_TR: Record<string, string> = { initial: "başta", medial: "ortada", final: "sonda" };
/** Modelin bu düzeyde ne ürettiği (hakem öğeleri doğru yerden değerlendirsin). */
const MODEL_DOES: Record<Level, string> = {
  isolated: "Model izole ses örüntülerini ve notları üretir.",
  syllable: "Model heceleri (açık/kapalı), örnek kelimeleri ve notları üretir.",
  word: "Kelimeler uzman-onaylı bankadan gelir (iki adayda aynı); model yalnız başlık, uzman notları, ipucu türleri ve ev rehberini yazar. Öğrencili istekte bilinen ürün hatası yüzünden öğe listesi boş görünebilir; bunu iki adaya da yükleme.",
  sentence: "Banka kelimeleriyle her kelime için bir cümle; öğrencili istekte model kendi kelimelerini kullanmış olabilir (bilinen ürün hatası).",
  contextual: "Banka kelimeleriyle her kelime için 3–4 cümlelik paragraf; öğrencili istekte model kendi kelimelerini kullanmış olabilir (bilinen ürün hatası).",
};
const GENERIC = ["Dil ucunu doğru yere koyun.", "Düzenli tekrar önemlidir.", "Sabırlı olun ve çocuğu cesaretlendirin."];

type Rec = Record<string, unknown>;
const ogeler = (d: Rec) => (Array.isArray(d.items) ? d.items : []) as Rec[];

export const adapter = studioAdapter<ArticulationBody>({
  id: "studio/articulation",
  label: "Artikülasyon alıştırması (Studio)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/tools/articulation/route"),
  responseKey: "drill",
  studentRequired: false,
  // 1A düzeneğiyle (ve gerçek Sonnet 4.6 referanslarıyla) AYNI banka kelimeleri: tohum = seçim argümanları.
  seedKey: (b) => JSON.stringify([b.targetSounds, b.positions, b.itemCount]),

  requestLines: (b) => [
    `- Düzey: ${LEVEL_TR[b.level]}. ${MODEL_DOES[b.level]}`,
    `- Hedef ses(ler): ${b.targetSounds.join(", ")} · Pozisyon: ${b.positions.map((p) => POS_TR[p]).join(", ")} · İstenen öğe sayısı: ${b.itemCount}`,
  ],

  renderOutput(o) {
    const d = o as Rec; // JSON modu: çıktı nesnesi
    const its = ogeler(d);
    return [
      `Başlık: ${str(d.title) || "—"}`,
      its.length ? `Öğeler (${its.length}):` : "Öğeler: (boş)",
      ...its.map(
        (i, k) =>
          `${k + 1}. ${[str(i.word), str(i.syllableType), str(i.exampleWord), str(i.syllableBreak), str(i.position), str(i.targetSound)].filter(Boolean).join(" · ")}${str(i.sentence) ? `\n   → ${str(i.sentence)}` : ""}`,
      ),
      `Uzman notları: ${str(d.expertNotes) || "—"}`,
      `İpucu türleri: ${(Array.isArray(d.cueTypes) ? d.cueTypes : []).map(String).join(" | ") || "—"}`,
      `Ev rehberi: ${str(d.homeGuidance) || "—"}`,
    ].join("\n");
  },

  // Öğrencisiz istekte rumuz yoktur (alias null) → banka-kaybı bilinci yalnız öğrencili vakada.
  checks: (a) => articulationChecks({ ...a, ogrencili: a.alias !== null }),

  criteria: [
    {
      key: "hedef_ses",
      question:
        "Öğeler hedef sesi istenen pozisyonda gerçekten içeriyor mu? Hece türü (açık = ünlüyle biter, kapalı = ünsüzle biter) doğru mu? Örnek kelimeler heceyi içeriyor mu? İzole düzeyde örüntüler hedef sesten mi oluşuyor? İmkânsız bir pozisyon istenmişse (ör. Türkçede başta /ğ/) aday bunu doğru ele alıyor mu? Kelime düzeyinde öğeler bankadan geldiği için bu ölçütü notlardaki ses bilgisinin doğruluğuna göre değerlendir.",
    },
    {
      key: "dil_yas",
      question:
        "Cümle ve paragraflar doğal ve dilbilgisi açısından doğru Türkçe mi? Uzunluk ve kelime dağarcığı öğrencinin yaşına uygun mu (öğrenci yoksa genel çocuk materyali varsay)? Bağlam düzeyinde hedef ses paragrafta sık geçiyor mu? Banka kelimesi anlamlı bir bağlamda kullanılmış mı?",
    },
    {
      key: "uzman_notlari",
      question:
        "Uzman notları ve ipucu türleri bu sese (ör. /r/ için dil ucu titreşimi, /s/ için dil ucu konumu ve hava akışı), bu seviyeye ve varsa öğrencinin tanısına ÖZGÜ, somut ve uygulanabilir mi? Klinik olarak doğru mu? Her vakaya yapıştırılabilecek genel kalıp cümleler zayıftır.",
    },
    {
      key: "ev_rehberi",
      question: "Veliye anlaşılır, somut ve günlük rutine yerleştirilebilir mi? Ödül, puan ya da çıkartma sistemi ÖNERMEMELİ (içsel motivasyon ilkesi).",
    },
    {
      key: "hata_yok",
      question:
        'Uydurma ya da çocuğun bilmeyeceği kadar nadir kelime, yanlış fonetik veya klinik bilgi, tanı koyma yok mu? "hasta" yerine "öğrenci", "terapist" yerine "uzman" kullanılmış mı?',
    },
  ],

  // Fabrika çıktının derin kopyasını verir (çıktı yoksa `{}`).
  generic(o) {
    const d = o as Rec;
    return {
      ...d,
      items: ogeler(d).map((i, k) => (str(i.sentence) ? { ...i, sentence: `${str(i.word)} ${GENERIC[k % GENERIC.length]}` } : i)),
      expertNotes: "Çok duyulu yaklaşım kullanın. Düzenli tekrar önemlidir. Bireysel farklılıklara dikkat edin.",
      cueTypes: ["genel"],
      homeGuidance: "Uygun ortam sağlayın ve gelişimini takip edin.",
    };
  },
});
