// apps/hub/evals/tools/atolye/materyal/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { mebSatirlari } from "../ortak";
import { MATERYAL_BOLUM_LISTESI, materyalChecks, type MateryalBody } from "./checks";

/** `materyal-prompts.ts` `TUR_LABEL` / `ZORLUK_LABEL` ile aynı (adapter.selftest gerçek istemde doğrular). */
const TUR_TR: Record<MateryalBody["materyalTuru"], string> = {
  calisma_yapragi: "çalışma yaprağı",
  etkinlik: "etkinlik",
  okuma_metni: "okuma metni",
  alistirma: "alıştırma",
};
const VARYANT_TR: Record<MateryalBody["zorlukVaryanti"], string> = {
  tek: "tek düzey",
  kolay_orta: "kolay + orta",
  kolay_orta_ileri: "kolay + orta + ileri",
};

export const adapter = atolyeAdapter<MateryalBody>({
  id: "atolye/materyal",
  label: "Çok duyulu materyal (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/materyal/route"),

  body: (b, f) => ({ ...profilBody(f), ...b }),

  // Etiketler `materyal-prompts.ts` "MATERYAL" bloğuyla AYNI (dört ayrı satır).
  requestLines: (b) => [
    `- Tür: ${TUR_TR[b.materyalTuru]}`,
    `- Konu/beceri: ${b.konu}`,
    `- Zorluk varyantı: ${VARYANT_TR[b.zorlukVaryanti]}`,
    `- Cevap anahtarı: ${b.cevapAnahtari ? "evet" : "hayır"}`,
    ...mebSatirlari(b.mebHedefKod, b.mebDavranisKodlari),
  ],

  sections: MATERYAL_BOLUM_LISTESI, // tek kaynak: checks.ts (altıncı 'Cevap anahtarı' bölümünün neden listede olmadığı orada)
  checks: materyalChecks,

  criteria: [
    {
      key: "cok_duyulu_somutluk",
      question:
        "Materyal birden çok duyusal kanalı (görsel, işitsel, dokunsal-kinestetik) somut adımlarla kullanıyor mu; öğrencinin profilindeki güçlüğe karşılık gelen uyarlamalar içerikte görünüyor mu (disleksi: hece bölme, geniş satır aralığı, ses desteği; disgrafi: yazma iskeleti, az yazma hacmi; diskalkuli: sayı doğrusu, manipülatif; DEHB: kısa, bölünmüş görevler)? Profilde olmayan güçlüğün uyarlamasını bekleme.",
    },
    {
      key: "uretilebilirlik",
      question:
        "Materyal gövdesi yalnız metinle sınıfta çoğaltılıp hemen kullanılabilir mi (görsel üretilmeden, görsel öğeler yalnız metinle tarif edilerek)?",
    },
    // `varyant` ve `cevap_anahtari` kontrolleri yalnız seviye ETİKETLERİNİ ve anahtarın VARLIĞINI bulur; gerçek zorluk farkı ve anahtarın doğruluğu hakemde.
    {
      key: "varyant_anahtar",
      question: "Birden çok varyant istendiyse varyantlar gerçekten zorluk farkı taşıyor mu; cevap anahtarı istendiyse doğru ve eksiksiz mi?",
    },
  ],
});
