import { definePrompt, type RunPromptResult } from "@ludenlab/ai";
import { ATOLYE_SYSTEM } from "./atolye-system";
import { profilToPrompt } from "./ogrenci-profili";
import { type MateryalInput } from "./materyal";

/* SERVER-ONLY. */

const TUR_LABEL: Record<MateryalInput["materyalTuru"], string> = {
  calisma_yapragi: "çalışma yaprağı",
  etkinlik: "etkinlik",
  okuma_metni: "okuma metni",
  alistirma: "alıştırma",
};
const ZORLUK_LABEL: Record<MateryalInput["zorlukVaryanti"], string> = {
  tek: "tek düzey",
  kolay_orta: "kolay + orta",
  kolay_orta_ileri: "kolay + orta + ileri",
};

const materyal = definePrompt<MateryalInput>({
  name: "cok_duyulu_materyal",
  temperature: 0.5,
  maxTokens: 3500,
  system: ATOLYE_SYSTEM,
  user: (i) => `Aşağıdaki öğrenci için ÇOK DUYULU bir ${TUR_LABEL[i.materyalTuru]} taslağı üret.

ÖĞRENCİ PROFİLİ
${profilToPrompt(i)}

MATERYAL
- Tür: ${TUR_LABEL[i.materyalTuru]}
- Konu/beceri: ${i.konu}
- Zorluk varyantı: ${ZORLUK_LABEL[i.zorlukVaryanti]}
- Cevap anahtarı: ${i.cevapAnahtari ? "evet" : "hayır"}

İSTENEN YAPI (Markdown, sırayla)
1. **Başlık + hedeflenen kazanım** (kademeye uygun, MEB çerçevesiyle hizalı)
2. **Öğretmen için uygulama yönergesi** — hangi duyusal kanallar (işitsel/görsel/dokunsal-kinestetik) nasıl kullanılıyor
3. **Materyal gövdesi** — güçlük profiline göre uyarlanmış:
   - disleksi: hece bölme, kısa cümle, fonetik/ses desteği, geniş satır aralığı talimatı
   - disgrafi: yazma iskeleti/şablon, kademeli kopyalama, az yazma hacmi
   - diskalkuli: somut görsel temsil, sayı doğrusu/manipülatif yönergesi
4. **Zorluk varyantları** (seçilen varyanta göre kolay/orta/ileri)
5. **Sınıf-içi farklılaştırma / uyarlama notları**
${i.cevapAnahtari ? "6. **Cevap anahtarı**" : "(Cevap anahtarı istenmedi — ekleme.)"}

KURALLAR: Görsel ÜRETME — görsel öğeleri yalnız metinle TARİF et ("buraya 5 elma çizin/yapıştırın" gibi). Kazanım uydurma; konuyu kademeye uygun ölçekle. Veri yetersizse varsayım üretme.`,
});

export function generateMateryal(input: MateryalInput): Promise<RunPromptResult> {
  return materyal.run(input);
}
