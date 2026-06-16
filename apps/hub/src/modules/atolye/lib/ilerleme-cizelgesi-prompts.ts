import { definePrompt, type RunPromptResult } from "@ludenlab/ai";
import { ATOLYE_SYSTEM } from "./atolye-system";
import { profilToPrompt } from "./ogrenci-profili";
import { mebToPrompt } from "./meb-program";
import { type IlerlemeCizelgesiInput } from "./ilerleme-cizelgesi";

/* SERVER-ONLY. */

const ilerlemeCizelgesi = definePrompt<IlerlemeCizelgesiInput>({
  name: "ilerleme_cizelgesi",
  temperature: 0.3,
  maxTokens: 2000,
  system: ATOLYE_SYSTEM,
  user: (i) => {
    const mebBlok = i.mebHedefKod
      ? mebToPrompt({ hedefKod: i.mebHedefKod, davranisKodlari: i.mebDavranisKodlari })
      : null;
    return `Aşağıdaki ölçülebilir hedef için bir İLERLEME İZLEME ÇİZELGESİ taslağı üret.

ÖĞRENCİ PROFİLİ
${profilToPrompt(i)}
${mebBlok ? `\nMEB HEDEF HİZALAMASI (resmî destek eğitim programına demirle)\n${mebBlok}\n` : ""}
HEDEF
${i.hedefMetni}

İSTENEN YAPI (Markdown, sırayla)
1. **Hedefin gözlenebilir bileşenleri** — hedefi ölçülebilir alt-göstergelere böl (davranış + ölçüt + koşul)
2. **Veri toplama çizelgesi** — boş bir **Markdown tablo** (sütunlar: Tarih · Ölçüt/Gösterge · Sonuç (% veya sıklık) · Not). Birkaç örnek satır başlığı ekle ama SONUÇ hücrelerini BOŞ bırak
3. **Ölçüm sıklığı ve yöntemi** önerisi (ne, ne sıklıkla, nasıl kaydedilecek)
4. **İlerleme yorumlama notu** (kazanım kararı için eşik/ölçüt önerisi)

KURALLAR: SONUÇ/veri ASLA uydurma — çizelge boş doldurulacak şekilde tasarlanır. Tanı koyma. Hedef belirsizse, ölçülebilir hâle getirmek için hangi bilginin gerektiğini belirt.${mebBlok ? " Göstergeler, seçilen MEB hedef davranışlarıyla hizalı olsun." : ""}`;
  },
});

export function generateIlerlemeCizelgesi(
  input: IlerlemeCizelgesiInput,
): Promise<RunPromptResult> {
  return ilerlemeCizelgesi.run(input);
}
