import { definePrompt, type RunPromptResult } from "@ludenlab/ai";
import { ATOLYE_SYSTEM } from "./atolye-system";
import { profilToPrompt } from "./ogrenci-profili";
import { mebToPrompt } from "./meb-program";
import { type VeliMektubuInput } from "./veli-mektubu";

/* SERVER-ONLY. */

const AMAC_LABEL: Record<VeliMektubuInput["amac"], string> = {
  bilgilendirme: "genel bilgilendirme",
  ev_etkinligi: "evde yapılabilecek etkinlik önerileri",
  gorusme_ozeti: "veli görüşmesi özeti",
};

const veliMektubu = definePrompt<VeliMektubuInput>({
  name: "veli_mektubu",
  temperature: 0.6,
  maxTokens: 2000,
  system: ATOLYE_SYSTEM,
  user: (i) => {
    const mebBlok = i.mebHedefKod
      ? mebToPrompt({ hedefKod: i.mebHedefKod, davranisKodlari: i.mebDavranisKodlari })
      : null;
    return `Aşağıdaki öğrenci için VELİYE yönelik, sıcak ve sade dilde bir mektup taslağı üret.

ÖĞRENCİ PROFİLİ (uzman için bağlam — veliye etiket olarak dayatma)
${profilToPrompt(i)}
${mebBlok ? `\nMEB HEDEF HİZALAMASI (uzman için bağlam — mektupta resmî kod/jargon YAZMA)\n${mebBlok}\n` : ""}
MEKTUP
- Amaç: ${AMAC_LABEL[i.amac]}
- Uzman notları: ${i.notlar || "—"}

İSTENEN YAPI (Markdown)
1. Sıcak açılış — çocuğun **güçlü yönleriyle** başla
2. Amaca uygun gövde:
   - bilgilendirme → hangi alanlarda destek planlandığı (sade dil)
   - ev etkinliği → **3–5 somut, kısa** evde uygulanabilir etkinlik/rutin
   - görüşme özeti → görüşmede konuşulanların özeti + birlikte atılacak adımlar
3. Gerçekçi beklenti (sabır, küçük adımlar, güçlü yöne güven)
4. Güven veren, iş birliğine davet eden kapanış

KURALLAR: Tıbbi tanı/iddia KURMA; veliye "çocuğunuz ...dır" gibi etiket dayatma. Damgalamayan, suçlamayan, umut veren dil. Teknik jargon az.${mebBlok ? " Seçilen MEB hedef alanındaki çalışmayı sade, gündelik dille yansıt; resmî kodları mektuba yazma." : ""}`;
  },
});

export function generateVeliMektubu(input: VeliMektubuInput): Promise<RunPromptResult> {
  return veliMektubu.run(input);
}
