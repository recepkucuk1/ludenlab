// apps/hub/evals/tools/atolye/matematik/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { mebSatirlari } from "../ortak";
import { MATEMATIK_BOLUM_LISTESI, matematikChecks, type MatematikBody } from "./checks";

/** `matematik-prompts.ts` `ALAN_LABEL` / `SOMUTLUK_LABEL` ile aynı (adapter.selftest gerçek istemde doğrular). */
const ALAN_TR: Record<MatematikBody["alanProfili"], string> = {
  sayi_hissi: "sayı hissi",
  sayi_buyukluk: "sayı-büyüklük ilişkisi",
  islem_akiciligi: "işlem akıcılığı",
  problem_cozme: "problem çözme",
};
const SOMUT_TR: Record<MatematikBody["somutlukDuzeyi"], string> = { somut: "somut", yari_somut: "yarı-somut", soyut: "soyut" };

export const adapter = atolyeAdapter<MatematikBody>({
  id: "atolye/matematik",
  label: "Matematik destek seti (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/matematik/route"),

  body: (b, f) => ({ ...profilBody(f), ...b }),

  // Etiketler `matematik-prompts.ts` "MATEMATİK" bloğuyla AYNI (üç ayrı satır).
  requestLines: (b) => [
    `- Alan profili: ${ALAN_TR[b.alanProfili]}`,
    `- Kazanım/konu: ${b.kazanimKonu}`,
    `- Başlangıç somutluk düzeyi: ${SOMUT_TR[b.somutlukDuzeyi]}`,
    ...mebSatirlari(b.mebHedefKod, b.mebDavranisKodlari),
  ],

  sections: MATEMATIK_BOLUM_LISTESI, // tek kaynak: checks.ts (prompt bölümleri ve başlık normalleştirme notu orada)
  checks: matematikChecks,

  criteria: [
    {
      key: "somut_soyut",
      question:
        "CRA dizisi, istenen başlangıç somutluk düzeyinden başlayarak (somut → yarı-somut → soyut) gerçekten basamaklanıyor mu; her aşama öğrencinin yaşına uygun mu (ör. lisede çocuksu manipülatif yok, okul öncesinde kısa ve hareketli); manipülatif yönergesi yalnız metinle uygulanabilir mi?",
    },
    {
      key: "hata_analizi",
      question:
        "Yaygın hata desenleri bu kazanıma ve öğrencinin profiline özgü mü (ör. basamak kaydırma, parmakla sayma, adım atlama); müdahale ipuçları somut mu; öğrenci hatası olarak açıkça sunulan örnekler dışındaki tüm sayılar ve işlemler matematiksel olarak doğru mu? (Öğrenci hatası olarak açıkça sunulan örnekler, hangi bölümde olursa olsun, hata sayılmaz.)",
    },
  ],
});
