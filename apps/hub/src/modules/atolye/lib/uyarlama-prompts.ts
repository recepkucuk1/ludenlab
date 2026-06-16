import { definePrompt, type RunPromptResult } from "@ludenlab/ai";
import { ATOLYE_SYSTEM } from "./atolye-system";
import { profilToPrompt } from "./ogrenci-profili";
import { mebToPrompt } from "./meb-program";
import { type UyarlamaInput } from "./uyarlama";

/* SERVER-ONLY. */

const ORTAM_LABEL: Record<UyarlamaInput["ortam"], string> = {
  kaynastirma: "kaynaştırma sınıfı",
  ozel_egitim_sinifi: "özel eğitim sınıfı",
  destek_egitim_odasi: "destek eğitim odası",
  ev: "ev",
};

const uyarlama = definePrompt<UyarlamaInput>({
  name: "uyarlama_onerisi",
  temperature: 0.3,
  maxTokens: 2000,
  system: ATOLYE_SYSTEM,
  user: (i) => {
    const mebBlok = i.mebHedefKod
      ? mebToPrompt({ hedefKod: i.mebHedefKod, davranisKodlari: i.mebDavranisKodlari })
      : null;
    return `Aşağıdaki öğrenci için BİREYSEL UYARLAMA (accommodation) önerileri taslağı üret.

ÖĞRENCİ PROFİLİ
${profilToPrompt(i)}
${mebBlok ? `\nMEB HEDEF HİZALAMASI (resmî destek eğitim programına demirle)\n${mebBlok}\n` : ""}
BAĞLAM
- Ders: ${i.ders || "genel"}
- Ortam: ${ORTAM_LABEL[i.ortam]}

İSTENEN YAPI (Markdown, sırayla)
1. **Bağlam özeti** (güçlük profili × ders × ortam)
2. **Sunum uyarlamaları** (ör. metin-okuma desteği, görsel organizatör, yönergeyi bölme)
3. **Yanıt/çıktı uyarlamaları** (ör. yazma hacmini azaltma, sözlü/işaretli yanıt)
4. **Ortam/zaman uyarlamaları** (ör. ek süre, bölünmüş görev, dikkat dağıtıcıları azaltma)
5. **Değerlendirme/sınav uyarlamaları**
6. Her madde için **kısa gerekçe** (hangi güçlüğe nasıl yardımcı)

KURALLAR: Kanıta dayalı, MEB kaynaştırma/BEP bağlamına uygun, uygulanabilir öneriler ver. Tanı koyma. (Bu çıktı BEP Asistanı'na girdi olarak da kullanılabilir.) Veri yetersizse varsayım üretme.${mebBlok ? " Uyarlamalar, seçilen MEB hedef davranışlarına erişimi destekleyecek şekilde önerilsin." : ""}`;
  },
});

export function generateUyarlama(input: UyarlamaInput): Promise<RunPromptResult> {
  return uyarlama.run(input);
}
