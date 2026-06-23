import { definePrompt, type CompiledPrompt, type RunPromptResult } from "@ludenlab/ai";
import { ALAN, KADEME, type BepInput, type OutputType } from "./bep";
import { ATOLYE_SYSTEM } from "./atolye-system";
import { mebToPrompt } from "./meb-program";

/* SERVER-ONLY. Yalnız API route'tan import edilir. */

function profil(input: BepInput): string {
  const yas = input.yas ? `, ${input.yas} yaş` : "";
  const alanlar = input.alanlar.map((a) => ALAN[a]).join(", ");
  const meb = input.mebHedefKod
    ? mebToPrompt({ hedefKod: input.mebHedefKod, davranisKodlari: input.mebDavranisKodlari })
    : null;
  return [
    `- Öğrenci: ${input.rumuz}`,
    `- Kademe: ${KADEME[input.kademe]}${yas}`,
    `- Hedef alan(lar): ${alanlar}`,
    `- Güçlü yönler: ${input.gucluYonler || "—"}`,
    `- Güçlük alanları / mevcut düzey: ${input.guclukAlanlari}`,
    input.ekNotlar ? `- Ek notlar: ${input.ekNotlar}` : null,
    meb ? `\nMEB HEDEF HİZALAMASI (BEP hedeflerini resmî koda demirle)\n${meb}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

const bepHedef = definePrompt<BepInput>({
  name: "bep_hedef",
  temperature: 0.4,
  maxTokens: 8000,
  system: ATOLYE_SYSTEM,
  user: (input) => `Aşağıdaki öğrenci profili için BEP HEDEF TASLAĞI üret.

PROFİL
${profil(input)}

İSTENEN YAPI — her seçili alan için:
1. **Alan başlığı**
2. **Uzun dönem amaç** (1 dönem)
3. **Kısa dönem hedefler** (3–6 madde; her biri gözlenebilir davranış + ölçüt + koşul)
4. **Yöntem/teknikler** (çok duyulu, somuttan soyuta; varsa fonolojik/dil bileşeni)
5. **Ölçme-değerlendirme** (nasıl izlenecek, hangi aşamada)

Sonunda kısa bir **Aile/okul iş birliği** notu ekle.${
    input.mebHedefKod
      ? " Kısa dönem hedefleri, verilen MEB hedef davranışlarıyla birebir ilişkilendir ve her birinin yanına ilgili kodu (ör. 3.3.1) parantezle ekle."
      : ""
  }`,
});

const PROMPTS: Record<OutputType, CompiledPrompt<BepInput>> = {
  bep_hedef: bepHedef,
};

export function generateBep(input: BepInput): Promise<RunPromptResult> {
  return PROMPTS[input.outputType].run(input);
}
