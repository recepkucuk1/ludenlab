import { definePrompt, type CompiledPrompt, type RunPromptResult } from "@ludenlab/ai";
import { ALAN, KADEME, type BepInput, type OutputType } from "./bep";
import { ATOLYE_SYSTEM } from "./atolye-system";

/* SERVER-ONLY. Yalnız API route'tan import edilir. */

function profil(input: BepInput): string {
  const yas = input.yas ? `, ${input.yas} yaş` : "";
  const alanlar = input.alanlar.map((a) => ALAN[a]).join(", ");
  return [
    `- Kod/rumuz: ${input.rumuz}`,
    `- Kademe: ${KADEME[input.kademe]}${yas}`,
    `- Hedef alan(lar): ${alanlar}`,
    `- Güçlü yönler: ${input.gucluYonler || "—"}`,
    `- Güçlük alanları / mevcut düzey: ${input.guclukAlanlari}`,
    input.ekNotlar ? `- Ek notlar: ${input.ekNotlar}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

const bepHedef = definePrompt<BepInput>({
  name: "bep_hedef",
  temperature: 0.4,
  maxTokens: 3200,
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

Sonunda kısa bir **Aile/okul iş birliği** notu ekle.`,
});

const ilerlemeRaporu = definePrompt<BepInput>({
  name: "ilerleme_raporu",
  temperature: 0.35,
  maxTokens: 3000,
  system: ATOLYE_SYSTEM,
  user: (input) => `Aşağıdaki bilgilere dayanarak bir İLERLEME RAPORU üret.

PROFİL
${profil(input)}
- Dönem: ${input.donem || "—"}
- Ölçüm verileri / gözlemler (ham): ${input.olcumVerileri || "(ölçüm verisi girilmemiş — yalnız verilen nitel gözleme dayan, sayı uydurma)"}

İSTENEN YAPI
1. **Özet**
2. **Alan bazında ilerleme** (hedef kazanım durumu; veri varsa % ve değişim)
3. **Devam eden güçlükler**
4. **Sonraki dönem önerileri** (hedef güncelleme)
5. **Aile/okul için kısa not**

Veriler yetersizse VARSAYIM ÜRETME; bunun yerine hangi ölçümlerin yapılması gerektiğini belirt.`,
});

const aileOzeti = definePrompt<BepInput>({
  name: "aile_ozeti",
  temperature: 0.5,
  maxTokens: 2200,
  system: ATOLYE_SYSTEM,
  user: (input) => `Aşağıdaki profilden AİLEYE yönelik, sade ve sıcak dilde bir ÖZET üret (teknik jargon az olsun).

PROFİL
${profil(input)}

İSTENEN YAPI
1. Çocuğun **güçlü yönleriyle** başla
2. Hangi alanlarda destek planlandığı (sade dil)
3. **Evde yapılabilecek 3–5 somut, kısa** etkinlik/rutin
4. Gerçekçi beklenti ve süreç (sabır, küçük adımlar, güçlü yöne güven)
5. Aileye güven veren bir kapanış

Tıbbi tanı/iddia KURMA; damgalayıcı dil kullanma.`,
});

const PROMPTS: Record<OutputType, CompiledPrompt<BepInput>> = {
  bep_hedef: bepHedef,
  ilerleme_raporu: ilerlemeRaporu,
  aile_ozeti: aileOzeti,
};

export function generateBep(input: BepInput): Promise<RunPromptResult> {
  return PROMPTS[input.outputType].run(input);
}
