// apps/hub/evals/tools/atolye/uyarlama/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { mebSatirlari } from "../ortak";
import { uyarlamaChecks, type UyarlamaBody } from "./checks";

/** `uyarlama-prompts.ts` `ORTAM_LABEL` ile aynı (adapter.selftest gerçek istemde doğrular). */
const ORTAM_TR: Record<UyarlamaBody["ortam"], string> = {
  kaynastirma: "kaynaştırma sınıfı",
  ozel_egitim_sinifi: "özel eğitim sınıfı",
  destek_egitim_odasi: "destek eğitim odası",
  ev: "ev",
};

export const adapter = atolyeAdapter<UyarlamaBody>({
  id: "atolye/uyarlama",
  label: "Uyarlama önerisi (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/uyarlama/route"),

  body: (b, f) => ({ ...profilBody(f), ...b }),

  // Etiketler `uyarlama-prompts.ts` "BAĞLAM" bloğuyla AYNI (iki ayrı satır); ders boşsa/yoksa ürün "genel" yazar (`i.ders || "genel"`).
  requestLines: (b) => [
    `- Ders: ${b.ders || "genel"}`,
    `- Ortam: ${ORTAM_TR[b.ortam]}`,
    ...mebSatirlari(b.mebHedefKod, b.mebDavranisKodlari),
  ],

  // Prompt: "1. Bağlam özeti 2. Sunum uyarlamaları 3. Yanıt/çıktı uyarlamaları 4. Ortam/zaman uyarlamaları 5. Değerlendirme/sınav uyarlamaları 6. Her madde için kısa gerekçe".
  // Altıncı kalem ayrı bölüm değil her maddeye eklenen gerekçedir (`gerekce` kontrolü); ortam/zaman kalıbı bağlam başlığındaki "ortam" ile karışmasın diye bölüm adına bağlıdır.
  sections: [/bağlam/, /sunum/, /yanıt|çıktı/, /^(?:ortam|zaman)|(?:ortam|zaman) uyarlama/, /değerlendirme|sınav/],
  checks: uyarlamaChecks,

  criteria: [
    {
      key: "sinif_uygulanabilirlik",
      question:
        "Uyarlamalar bu ortamda (kaynaştırma/özel sınıf/destek odası/ev) uygulayıcının ek kaynak olmadan uygulayabileceği türden mi; ders verildiyse dersin içeriğine, verilmediyse ortamın günlük rutinine özgü mü; öğrencinin güçlük düzeyine orantılı mı (hafif düzeyde aşırı uyarlama yok)?",
    },
    {
      key: "olcme_uyarlamasi",
      question:
        "Değerlendirme/sınav uyarlamaları öğrencinin güçlük profiline (ör. diskalkulide formül kartı/hesap makinesi, DEHB'de ek süre ve bölünmüş sınav, disleksi'de sesli okuma) somut ve gerekçeli biçimde bağlı mı? Okul öncesinde sınav yerine gözlem/oyun temelli değerlendirme beklenir. Her madde için kısa gerekçe var mı?",
    },
  ],
});
