// apps/hub/evals/tools/atolye/veli-mektubu/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { mebSatirlari } from "../ortak";
import { veliMektubuChecks, type VeliMektubuBody } from "./checks";

/** `veli-mektubu-prompts.ts` `AMAC_LABEL` ile aynı (adapter.selftest gerçek istemde doğrular). */
const AMAC_TR: Record<VeliMektubuBody["amac"], string> = {
  bilgilendirme: "genel bilgilendirme",
  ev_etkinligi: "evde yapılabilecek etkinlik önerileri",
  gorusme_ozeti: "veli görüşmesi özeti",
};

export const adapter = atolyeAdapter<VeliMektubuBody>({
  id: "atolye/veli-mektubu",
  label: "Veli mektubu (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/veli-mektubu/route"),

  body: (b, f) => ({ ...profilBody(f), ...b }),

  // Etiketler `veli-mektubu-prompts.ts` "MEKTUP" bloğuyla AYNI (iki ayrı satır); uzman notu boşsa ürün "—" yazar, hakeme satır gitmez (uydurma yok).
  // MEB hedefi uzman için bağlamdır (ürün: "mektupta resmî kod/jargon YAZMA"): hakem hedef metnini görür ama kodun mektupta olmaması gerektiğini bilir.
  requestLines: (b) => [
    `- Amaç: ${AMAC_TR[b.amac]}`,
    b.notlar ? `- Uzman notları: ${b.notlar}` : "",
    ...mebSatirlari(b.mebHedefKod, b.mebDavranisKodlari),
    b.mebHedefKod ? "- (Hakem notu: MEB hedefi uzman için bağlamdır; mektupta resmî kod/jargon YAZILMAMALI, hedef alandaki çalışma sade dille anlatılmalı.)" : "",
  ].filter(Boolean),

  // Prompt: "İSTENEN YAPI (Markdown): 1. Sıcak açılış 2. Amaca uygun gövde 3. Gerçekçi beklenti 4. Kapanış" — içerik kalemleridir, başlık zorunlu değil
  // (mektup düzyazı olabilir): yapı oranı ölçülmez.
  sections: [],
  checks: veliMektubuChecks,

  criteria: [
    { key: "veli_dili", question: "Mektup sıcak, etiketlemeyen, teknik terimsiz bir veli diliyle çocuğun güçlü yönlerinden başlıyor mu (profilde güçlü yön yoksa güçlü yön UYDURMADAN, gerçek veriye — ilgi alanı gibi — dayanarak); 'çocuğunuz …dır' tanı/etiket cümlesi, suçlayıcı dil ve resmî kod yok mu?" },
    { key: "somut_oneri", question: "Amaca göre içerik (bilgilendirme: hangi alanlarda destek planlandığı / ev etkinliği: 3–5 somut, kısa, evde uygulanabilir etkinlik / görüşme özeti: konuşulanların özeti + birlikte atılacak adımlar) gerçekçi beklentiyle (sabır, küçük adımlar) ve iş birliğine davetle veriliyor mu?" },
  ],
});
