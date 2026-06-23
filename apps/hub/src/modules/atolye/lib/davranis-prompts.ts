import { definePrompt, type RunPromptResult } from "@ludenlab/ai";
import { ATOLYE_SYSTEM } from "./atolye-system";
import { profilToPrompt } from "./ogrenci-profili";
import { mebToPrompt } from "./meb-program";
import { type DavranisInput } from "./davranis";

/* SERVER-ONLY. */

const ORTAM_LABEL: Record<DavranisInput["ortam"], string> = {
  sinif: "sınıf",
  ev: "ev",
  seans: "seans",
  genel: "genel",
};

const davranis = definePrompt<DavranisInput>({
  name: "davranis_destek_plani",
  temperature: 0.4,
  maxTokens: 8000,
  system: ATOLYE_SYSTEM,
  user: (i) => {
    const mebBlok = i.mebHedefKod
      ? mebToPrompt({ hedefKod: i.mebHedefKod, davranisKodlari: i.mebDavranisKodlari })
      : null;
    return `Aşağıdaki öğrenci için EĞİTSEL bir DAVRANIŞ DESTEK PLANI taslağı üret (DEHB odaklı, olumlu davranışsal destek yaklaşımı).

ÖĞRENCİ PROFİLİ
${profilToPrompt(i)}
${mebBlok ? `\nMEB HEDEF HİZALAMASI (resmî destek eğitim programına demirle)\n${mebBlok}\n` : ""}
DAVRANIŞ
- Hedef davranış: ${i.hedefDavranis}
- Ortam: ${ORTAM_LABEL[i.ortam]}
- Sıklık/süre gözlemi: ${i.siklikSure || "—"}

İSTENEN YAPI (Markdown, sırayla)
1. **Hedef davranışın gözlenebilir/ölçülebilir tanımı**
2. **ABC analizi** (Öncül → Davranış → Sonuç) — tablo
3. **İşlev hipotezi** (dikkat çekme / kaçınma-kaçış / duyusal / somut kazanç — hangisi/hangileri)
4. **Önleyici (antecedent) ve çevresel düzenlemeler**
5. **Yerine koyma davranışı** (aynı işlevi gören uygun davranış) + nasıl öğretileceği
6. **Pekiştirme planı** (olumlu, somut, kademeli; pekiştireç örnekleri)
7. **Öz-izleme / veri toplama önerisi** (basit çizelge fikri)
8. **Aile–okul–seans tutarlılık notu**

KURALLAR: Bu EĞİTSEL davranış desteğidir, TEDAVİ DEĞİLDİR; ilaç veya klinik öneri verme. Tanı koyma. Cezalandırıcı/utandırıcı strateji önerme; damgalamayan, güçlü-yön odaklı dil. Veri yetersizse varsayım üretme; gerekli gözlemi öner.${mebBlok ? " Yerine koyma davranışı ve hedefler, seçilen MEB hedef davranışlarıyla ilişkilendirilsin." : ""}`;
  },
});

export function generateDavranis(input: DavranisInput): Promise<RunPromptResult> {
  return davranis.run(input);
}
