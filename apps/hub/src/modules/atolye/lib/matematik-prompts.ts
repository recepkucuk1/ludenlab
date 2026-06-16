import { definePrompt, type RunPromptResult } from "@ludenlab/ai";
import { ATOLYE_SYSTEM } from "./atolye-system";
import { profilToPrompt } from "./ogrenci-profili";
import { mebToPrompt } from "./meb-program";
import { type MatematikInput } from "./matematik";

/* SERVER-ONLY. */

const ALAN_LABEL: Record<MatematikInput["alanProfili"], string> = {
  sayi_hissi: "sayı hissi",
  sayi_buyukluk: "sayı-büyüklük ilişkisi",
  islem_akiciligi: "işlem akıcılığı",
  problem_cozme: "problem çözme",
};
const SOMUTLUK_LABEL: Record<MatematikInput["somutlukDuzeyi"], string> = {
  somut: "somut",
  yari_somut: "yarı-somut",
  soyut: "soyut",
};

const matematik = definePrompt<MatematikInput>({
  name: "matematik_destek_seti",
  temperature: 0.4,
  maxTokens: 3500,
  system: ATOLYE_SYSTEM,
  user: (i) => {
    const mebBlok = i.mebHedefKod
      ? mebToPrompt({ hedefKod: i.mebHedefKod, davranisKodlari: i.mebDavranisKodlari })
      : null;
    return `Aşağıdaki öğrenci için bir MATEMATİK DESTEK SETİ taslağı üret (diskalkuli/matematik güçlüğü odaklı).

ÖĞRENCİ PROFİLİ
${profilToPrompt(i)}
${mebBlok ? `\nMEB HEDEF HİZALAMASI (resmî destek eğitim programına demirle)\n${mebBlok}\n` : ""}
MATEMATİK
- Alan profili: ${ALAN_LABEL[i.alanProfili]}
- Kazanım/konu: ${i.kazanimKonu}
- Başlangıç somutluk düzeyi: ${SOMUTLUK_LABEL[i.somutlukDuzeyi]}

İSTENEN YAPI (Markdown, sırayla)
1. **Kazanım + ön-koşul beceri kontrolü** (bu kazanım için gereken alt beceriler)
2. **CRA dizisi** — Somut etkinlik → Yarı-somut (görsel temsil) → Soyut, kademeli
3. **Manipülatif/materyal yönergesi** (sayı doğrusu, onluk taban blokları vb. — yalnız metinle tarif)
4. **Yaygın hata desenleri + müdahale ipucu**
5. **Kademeli alıştırma seti**

KURALLAR: Tanı koyma. Matematiksel olarak DOĞRU içerik üret; emin olmadığın sayısal örneği üretme (sayı/işlem uydurma). Görseli yalnız metinle tarif et. Veri yetersizse varsayım üretme.${mebBlok ? " Üretilen tüm içerik, seçilen MEB hedef davranışlarıyla doğrudan ilişkili olsun." : ""}`;
  },
});

export function generateMatematik(input: MatematikInput): Promise<RunPromptResult> {
  return matematik.run(input);
}
