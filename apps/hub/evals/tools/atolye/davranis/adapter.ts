// apps/hub/evals/tools/atolye/davranis/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { mebSatirlari } from "../ortak";
import { DAVRANIS_BOLUM_LISTESI, davranisChecks, type DavranisBody } from "./checks";

/** `davranis-prompts.ts` `ORTAM_LABEL` ile aynı (adapter.selftest gerçek istemde doğrular). */
const ORTAM_TR: Record<DavranisBody["ortam"], string> = { sinif: "sınıf", ev: "ev", seans: "seans", genel: "genel" };

export const adapter = atolyeAdapter<DavranisBody>({
  id: "atolye/davranis",
  label: "Davranış destek planı (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/davranis/route"),

  body: (b, f) => ({ ...profilBody(f), ...b }),

  // Etiketler `davranis-prompts.ts` "DAVRANIŞ" bloğuyla AYNI.
  requestLines: (b) => [
    `- Hedef davranış: ${b.hedefDavranis}`,
    `- Ortam: ${ORTAM_TR[b.ortam]}`,
    b.siklikSure ? `- Sıklık/süre gözlemi: ${b.siklikSure}` : "",
    ...mebSatirlari(b.mebHedefKod, b.mebDavranisKodlari),
  ].filter(Boolean),

  sections: DAVRANIS_BOLUM_LISTESI, // tek kaynak: checks.ts
  checks: davranisChecks,

  criteria: [
    { key: "islev_analizi", question: "ABC analizi ve işlev hipotezi verilen gözleme (sıklık, ortam) dayanıyor mu; hipotez tek ve savunulabilir mi; veri yetersizse varsayım üretmek yerine veri toplama öneriliyor mu?" },
    { key: "onleyici_strateji", question: "Önleyici düzenlemeler ve yerine koyma davranışı bu öğrencinin güçlü yönlerine/ilgi alanlarına bağlı, ortama uygun ve öğretilebilir mi; pekiştirme planı cezasız ve somut mu?" },
  ],
});
