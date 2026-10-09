// apps/hub/evals/tools/studio/articulation/adapter.ts
import { studioAdapter, type StudioToolCfg } from "../../../lib/adapterFactory";
import { str } from "../../../lib/sharedChecks";
import { BANKA_DUZEYLERI, articulationChecks, bankaKelimeleri, bankaTohumu, type ArticulationBody, type Level } from "./checks";

const LEVEL_TR: Record<Level, string> = { isolated: "İzole ses", syllable: "Hece", word: "Kelime", sentence: "Cümle", contextual: "Bağlam (paragraf)" };
const POS_TR: Record<string, string> = { initial: "başta", medial: "ortada", final: "sonda" };
const GENERIC = ["Dil ucunu doğru yere koyun.", "Düzenli tekrar önemlidir.", "Sabırlı olun ve çocuğu cesaretlendirin."];

type Rec = Record<string, unknown>;
const ogeler = (d: Rec) => (Array.isArray(d.items) ? d.items : []) as Rec[];

/** Modelin bu düzeyde ne ürettiği (hakem öğeleri doğru yerden değerlendirsin). Ürün hatası cümlesi yalnız öğrencili
    vakada: prompt banka kelimelerini HER ZAMAN listeler; hata yalnız sistemin sonradan yeniden yazmamasıdır. */
function modelNeYapar(level: Level, bank: string[], ogrencili: boolean): string {
  if (level === "isolated") return "Model izole ses örüntülerini ve notları üretir.";
  if (level === "syllable") return "Model heceleri (açık/kapalı), örnek kelimeleri ve notları üretir.";
  const birim = level === "sentence" ? "bir cümle" : "3–4 cümlelik bir paragraf";
  if (!bank.length) return `Bu ses(ler) bankada olmadığından model kelimeleri kendisi seçer${level === "word" ? "" : ` ve her kelime için ${birim} yazar`}.`;
  if (level === "word") {
    return [
      "Kelimeler uzman-onaylı bankadan gelir (iki adayda aynı); model öğe üretmez, yalnız başlık, uzman notları, ipucu türleri ve ev rehberini yazar.",
      ogrencili ? "Öğrencili istekte sistem banka kelimelerini sonradan eklemez (bilinen ürün hatası): kelime düzeyinde boş öğe listesi beklenen davranıştır, kusur sayma." : "",
    ].filter(Boolean).join(" ");
  }
  return [
    `Prompt modele banka kelimelerini sırasıyla verir; model her kelime için ${birim} yazar.`,
    ogrencili
      ? "Öğrencili istekte sistem kelimeleri sonradan yeniden yazmaz (bilinen ürün hatası); listeden sapma modelin hatasıdır."
      : "Sistem kelime alanını sonradan bankayla yeniden yazar; metin o kelimeyi içermiyorsa model listeden sapmıştır (modelin hatası).",
  ].join(" ");
}

const ALANLAR: Array<[string, string]> = [
  ["word", "kelime"],
  ["syllableType", "hece türü"],
  ["exampleWord", "örnek"],
  ["syllableBreak", "heceleme"],
  ["position", "konum"],
  ["targetSound", "ses"],
  ["description", "açıklama"],
];
const ogeSatiri = (i: Rec, k: number) => {
  const alanlar = ALANLAR.flatMap(([key, ad]) => {
    const v = str(i[key]);
    return v ? [`${ad}: ${key === "position" ? (POS_TR[v] ?? v) : v}`] : [];
  });
  return `${k + 1}. ${alanlar.join(" · ")}${str(i.sentence) ? `\n   → metin: ${str(i.sentence)}` : ""}`;
};
/** Kelime düzeyinde (bankadan kurulan) öğe listesi: çıktının `level` alanı "word" ve öğelerde cümle/hece alanı yok. */
const kelimeDuzeyi = (d: Rec, its: Rec[]) =>
  d.level === "word" && its.every((i) => !str(i.sentence) && !str(i.syllableType) && !str(i.exampleWord));

export const articulationCfg: StudioToolCfg<ArticulationBody> = {
  id: "studio/articulation",
  label: "Artikülasyon alıştırması (Studio)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/tools/articulation/route"),
  responseKey: "drill",
  studentRequired: false,
  // 1A düzeneğiyle (ve gerçek Sonnet 4.6 referanslarıyla) AYNI banka kelimeleri: tohum = seçim argümanları.
  seedKey: bankaTohumu,

  requestLines: (b, f) => {
    const bank = bankaKelimeleri(b);
    return [
      `- Düzey: ${LEVEL_TR[b.level]}. ${modelNeYapar(b.level, bank, f !== null)}`,
      `- Hedef ses(ler): ${b.targetSounds.join(", ")} · Pozisyon: ${b.positions.map((p) => POS_TR[p]).join(", ")} · İstenen öğe sayısı: ${b.itemCount}`,
      ...(!BANKA_DUZEYLERI.has(b.level)
        ? []
        : bank.length
          ? [`- Banka kelimeleri (${bank.length}): ${bank.join(", ")}`]
          : ["- Banka: bu ses(ler) için banka yok, model kendi kelimelerini üretir"]),
    ];
  },

  renderOutput(o) {
    const d = o as Rec; // JSON modu: çıktı nesnesi
    const its = ogeler(d);
    const liste = !its.length
      ? ["Öğeler: (boş)"]
      : kelimeDuzeyi(d, its)
        ? [`Öğeler: bankadan, iki adayda aynı (${its.length} kelime: ${its.map((i) => str(i.word)).join(", ")})`]
        : [`Öğeler (${its.length}):`, ...its.map(ogeSatiri)];
    return [
      `Başlık: ${str(d.title) || "—"}`,
      ...liste,
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
};

export const adapter = studioAdapter(articulationCfg);
