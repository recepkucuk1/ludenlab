import { definePrompt, type RunPromptResult } from "@ludenlab/ai";
import { ATOLYE_SYSTEM } from "./atolye-system";
import { profilToPrompt } from "./ogrenci-profili";
import { mebToPrompt } from "./meb-program";
import { type EvOdeviInput } from "./ev-odevi";

/* SERVER-ONLY. */

const evOdevi = definePrompt<EvOdeviInput>({
  name: "ev_odevi_programi",
  temperature: 0.5,
  maxTokens: 8000,
  system: ATOLYE_SYSTEM,
  user: (i) => {
    const mebBlok = i.mebHedefKod
      ? mebToPrompt({ hedefKod: i.mebHedefKod, davranisKodlari: i.mebDavranisKodlari })
      : null;
    return `Aşağıdaki Özel Öğrenme Güçlüğü (ÖÖG) tanılı veya riskli öğrenci için ev-okul-uzman işbirliğini destekleyecek bir EV ÇALIŞMA PROGRAMI taslağı üret.

ÖĞRENCİ PROFİLİ
${profilToPrompt(i)}
${mebBlok ? `\nMEB HEDEF HİZALAMASI (resmî destek eğitim programına demirle)\n${mebBlok}\n` : ""}
HEDEF & SÜRE
- Hedeflenen Konu/Beceri: ${i.hedefKonu}
- Program Süresi: ${i.gunSayisi} günlük
- Uzman Yönergeleri / Ek Not: ${i.ekstraNot || "Belirtilmedi"}

İSTENEN YAPI (Markdown, sırayla)
1. **Genel Çerçeve ve Ebeveyn Bilgilendirmesi** — Aileye yönelik kısa, destekleyici ve olumlu bir not. Evde çalışma yaparken dikkat etmeleri gereken (çocuğu yormadan, oyunlaştırarak vs.) temel prensipler.
2. **Günlük Çalışma Planı** — Belirtilen gün sayısı kadar. Her gün için:
   - Isınma/Hazırlık (2-3 dk)
   - Ana Etkinlik (Kısa ve net yönergelerle, hedeflenen beceriye yönelik)
   - Oyunlaştırma/Pekiştirme (Ödül veya oyun tabanlı bitiriş)
3. **Alternatif Yollar** — Eğer çocuk o gün çok direnç gösterirse veya sıkılırsa yapılabilecek alternatif, daha esnek B planı etkinlikleri.
4. **Gözlem ve Uzmana Notlar (Aile için)** — Ailenin bu haftaki çalışmaları yaparken neye dikkat etmesi ve uzmana ne gibi geri bildirimler (rubrik veya form) getirmesi gerektiğine dair ufak bir bölüm.

KURALLAR: Tanı koyma; güçlü-yön odaklı, damgalamayan dil kullan. Öğrenme güçlüğü (disleksi, disgrafi, diskalkuli) profiline uygun çok duyulu (multisensory) yöntemler öner. Saatlerce süren sıkıcı masa başı ödevleri değil, 15-20 dakikalık etkili, oyun temelli çalışma dilimleri tasarla.${mebBlok ? " Günlük etkinlikler, seçilen MEB hedef davranışlarıyla doğrudan ilişkili olsun." : ""}`;
  },
});

export function generateEvOdevi(input: EvOdeviInput): Promise<RunPromptResult> {
  return evOdevi.run(input);
}
