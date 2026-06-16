import { definePrompt, type RunPromptResult } from "@ludenlab/ai";
import { ATOLYE_SYSTEM } from "./atolye-system";
import { profilToPrompt } from "./ogrenci-profili";
import { mebToPrompt } from "./meb-program";
import { type OkumaInput } from "./okuma";

/* SERVER-ONLY. */

const DUZEY_LABEL: Record<OkumaInput["okumaDuzeyi"], string> = {
  hece: "hece",
  kelime: "kelime",
  cumle: "cümle",
  paragraf: "paragraf",
};

const okuma = definePrompt<OkumaInput>({
  name: "okuma_akicilik_seti",
  temperature: 0.5,
  maxTokens: 3500,
  system: ATOLYE_SYSTEM,
  user: (i) => {
    const mebBlok = i.mebHedefKod
      ? mebToPrompt({ hedefKod: i.mebHedefKod, davranisKodlari: i.mebDavranisKodlari })
      : null;
    return `Aşağıdaki öğrenci için bir OKUMA-AKICILIK SETİ taslağı üret (disleksi/okuma güçlüğü odaklı).

ÖĞRENCİ PROFİLİ
${profilToPrompt(i)}
${mebBlok ? `\nMEB HEDEF HİZALAMASI (resmî destek eğitim programına demirle)\n${mebBlok}\n` : ""}
OKUMA
- Çalışma düzeyi: ${DUZEY_LABEL[i.okumaDuzeyi]}
- Hedef akıcılık: ${i.hedefAkicilik || "—"}
- Takılınan desenler: ${i.takilanDesenler || "—"}

İSTENEN YAPI (Markdown, sırayla)
1. **Seviyeli okuma parçası** — öğrencinin ilgi alanına ve düzeyine uygun, kısa ve özgün
2. **Hece-ses çalışması** — Türkçe ŞEFFAF ORTOGRAFİYE uygun (hece işleme ve akıcılık odaklı); İngilizce fonik mantığını OLDUĞU GİBİ aktarma
3. **Akıcılık egzersizleri** — tekrarlı okuma, eşli/koro okuma, zamanlı tur (somuttan soyuta, küçük adımlar)
4. **Kelime dağarcığı desteği** — parçadan seçili sözcüklerle
5. **Akıcılık ölçüm rubriği** — kelime/dk, doğruluk %, prozodi (gözlem ölçütleriyle)

KURALLAR: Tanı koyma; güçlü-yön odaklı, damgalamayan dil. Türkçe dil yapısına (heceleme kuralları, sesli/sessiz uyumu) uygun ol; İngilizceye özgü stratejileri körlemesine aktarma. Veri yetersizse varsayım üretme.${mebBlok ? " Üretilen tüm içerik, seçilen MEB hedef davranışlarıyla doğrudan ilişkili olsun." : ""}`;
  },
});

export function generateOkuma(input: OkumaInput): Promise<RunPromptResult> {
  return okuma.run(input);
}
