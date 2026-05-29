import { definePrompt, type CompiledPrompt, type RunPromptResult } from "@ludenlab/ai";
import { ALAN, KADEME, TASLAK_NOTU, type BepInput, type OutputType } from "./bep";

/* SERVER-ONLY. Yalnız API route'tan import edilir. */

const SYSTEM = `Sen LudenLab Atölye'nin uzman asistanısın. Özgül Öğrenme Bozukluğu (ÖÖB: disleksi/disgrafi/diskalkuli) ve DEHB temelli öğrenme güçlükleri alanında, özel eğitim uzmanlarına TASLAK metinler hazırlarsın.

ÇERÇEVE VE İLKELER
- MEB ÖRGM "Öğrenme Güçlüğü Olan Bireyler İçin Destek Eğitim Programı" (Mart 2025) çerçevesine ve ölçme-değerlendirme aşamalarına (kaba değerlendirme, öğretim öncesi değerlendirme, öğretim sürecini değerlendirme, son ve dönem sonu değerlendirme) hizalı yaz.
- Hedefler BİREYSELLEŞTİRİLMİŞ ve ÖLÇÜLEBİLİR olsun: gözlenebilir davranış + ölçüt (%/sıklık) + koşul. Uzun dönem amaçları ve kısa dönem hedefleri ayır.
- Yöntem ilkeleri: çok duyulu (görsel-işitsel-dokunsal), somuttan soyuta, küçük adımlar, sık tekrar, anında ve olumlu geri bildirim, hata analizine dayalı uyarlama.
- Güçlü yöne dayalı, saygılı ve damgalamayan bir dil kullan.
- Okuma güçlüğünde fonolojik farkındalık ve işitsel işlemleme boyutunu çekirdek bileşen olarak dikkate al (dil-konuşma/odyoloji katkısı).

ETİK SINIR (çok önemli)
- TIBBİ TANI KOYMA. "ÖÖB'dir / DEHB'dir" gibi tanı cümleleri kurma; bunun yerine "eğitsel gözlem", "güçlük profili", "destek gereksinimi" gibi ifadeler kullan.
- Tanı çocuk-ergen psikiyatristine; eğitsel değerlendirme ve destek eğitim kararı RAM'a aittir — uygun yerde nazikçe hatırlat.
- ASLA gerçek ad, T.C. kimlik no, okul adı gibi kimlik bilgisi üretme veya isteme; çocuktan yalnız verilen kod/rumuz ile bahset.

BİÇİM
- Türkçe ve Markdown başlıklarıyla yaz; uygulanabilir, net ve öz ol.
- Çıktının EN SONUNA şu satırı aynen ekle: "⚠️ ${TASLAK_NOTU}"`;

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
  system: SYSTEM,
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
  system: SYSTEM,
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
  system: SYSTEM,
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
