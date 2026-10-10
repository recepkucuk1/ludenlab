// apps/hub/evals/tools/atolye/sosyal-oyku/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { mebSatirlari } from "../ortak";
import { SOSYAL_OYKU_BOLUM_LISTESI, sosyalOykuChecks, type SosyalOykuBody } from "./checks";

/** `sosyal-oyku-prompts.ts` `BAKIS_LABEL` ile aynı (adapter.selftest gerçek istemde doğrular). */
const BAKIS_TR: Record<SosyalOykuBody["bakisAcisi"], string> = { birinci_kisi: "birinci kişi (ben dili)", ucuncu_kisi: "üçüncü kişi" };

export const adapter = atolyeAdapter<SosyalOykuBody>({
  id: "atolye/sosyal-oyku",
  label: "Sosyal öykü (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/sosyal-oyku/route"),

  body: (b, f) => ({ ...profilBody(f), ...b }),

  // Etiketler `sosyal-oyku-prompts.ts` "SENARYO" bloğuyla AYNI (üç ayrı satır); hedef beceri boşsa ürün "—" yazar, hakeme satır gitmez (uydurma yok).
  requestLines: (b) => [
    `- Durum: ${b.durum}`,
    `- Bakış açısı: ${BAKIS_TR[b.bakisAcisi]}`,
    b.hedefBeceri ? `- Hedef beceri: ${b.hedefBeceri}` : "",
    ...mebSatirlari(b.mebHedefKod, b.mebDavranisKodlari),
  ].filter(Boolean),

  sections: SOSYAL_OYKU_BOLUM_LISTESI, // tek kaynak: checks.ts (öykü bölümünün sınırı da buradan)
  checks: sosyalOykuChecks,

  criteria: [
    { key: "duygu_cercevesi", question: "Öykü önce duyguyu adlandırıp 'bu his normaldir' çerçevesini kuruyor, sonra uygun davranışı/baş etme yolunu veriyor mu; duygu 'kötü/yanlış' diye çerçevelenmemiş, davranış 'seçilebilir' olarak sunulmuş mu?" },
    { key: "kisalik", question: "Öykü kademeye ve dikkat profiline göre KISA mı (DEHB profilinde 5–8 cümle), tek durum, somut neden-sonuç cümleleri; istenen bakış açısına (birinci/üçüncü kişi) ve yaşa uygun dilde mi; görsel/sahneleme önerisi yalnız metinle ve uygulanabilir mi?" },
  ],
});
