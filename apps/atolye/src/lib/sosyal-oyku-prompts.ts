import { definePrompt, type RunPromptResult } from "@ludenlab/ai";
import { ATOLYE_SYSTEM } from "./atolye-system";
import { profilToPrompt } from "./ogrenci-profili";
import { mebToPrompt } from "./meb-program";
import { type SosyalOykuInput } from "./sosyal-oyku";

/* SERVER-ONLY. */

const BAKIS_LABEL: Record<SosyalOykuInput["bakisAcisi"], string> = {
  birinci_kisi: "birinci kişi (ben dili)",
  ucuncu_kisi: "üçüncü kişi",
};

const sosyalOyku = definePrompt<SosyalOykuInput>({
  name: "sosyal_oyku",
  temperature: 0.6,
  maxTokens: 1500,
  system: ATOLYE_SYSTEM,
  user: (i) => {
    const mebBlok = i.mebHedefKod
      ? mebToPrompt({ hedefKod: i.mebHedefKod, davranisKodlari: i.mebDavranisKodlari })
      : null;
    return `Aşağıdaki öğrenci için bir SOSYAL ÖYKÜ & DUYGU-DÜZENLEME senaryosu taslağı üret.

ÖĞRENCİ PROFİLİ
${profilToPrompt(i)}
${mebBlok ? `\nMEB HEDEF HİZALAMASI (resmî destek eğitim programına demirle)\n${mebBlok}\n` : ""}
SENARYO
- Durum: ${i.durum}
- Bakış açısı: ${BAKIS_LABEL[i.bakisAcisi]}
- Hedef beceri: ${i.hedefBeceri || "—"}

İSTENEN YAPI (Markdown, sırayla)
1. **Sosyal öykü metni** — yaşa/düzeye göre KISA (DEHB için 5–8 cümle); somut neden-sonuç; beklenen davranıştan ÖNCE duyguyu adlandır ve "bu his normaldir" çerçevesini kur; sonra uygun davranışı/baş etme yolunu öner
2. **Görsel / sahneleme önerisi** (yalnız metinle tarif)
3. **Kullanım yönergesi** — sakin bir anda ve olaydan hemen önce okuma; tekrar sıklığı

KURALLAR: Yargılamayan, olumlu dil. Duyguyu "kötü/yanlış" diye çerçeveleme — duygu geçerli, davranış seçilebilir mesajını ver. Tanı koyma; damgalamayan dil.${mebBlok ? " Öykü, seçilen MEB hedef davranışını hedeflesin." : ""}`;
  },
});

export function generateSosyalOyku(input: SosyalOykuInput): Promise<RunPromptResult> {
  return sosyalOyku.run(input);
}
