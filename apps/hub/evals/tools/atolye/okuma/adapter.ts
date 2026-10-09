// apps/hub/evals/tools/atolye/okuma/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { mebSatirlari } from "../ortak";
import { OKUMA_BOLUM_LISTESI, okumaChecks, type OkumaBody } from "./checks";

/** `okuma-prompts.ts` `DUZEY_LABEL` ile aynı (adapter.selftest gerçek istemde doğrular). */
const DUZEY_TR: Record<OkumaBody["okumaDuzeyi"], string> = { hece: "hece", kelime: "kelime", cumle: "cümle", paragraf: "paragraf" };

export const adapter = atolyeAdapter<OkumaBody>({
  id: "atolye/okuma",
  label: "Okuma akıcılık seti (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/okuma/route"),

  body: (b, f) => ({ ...profilBody(f), ...b }),

  // Etiketler `okuma-prompts.ts` "OKUMA" bloğuyla AYNI.
  requestLines: (b) => [
    `- Çalışma düzeyi: ${DUZEY_TR[b.okumaDuzeyi]}`,
    b.hedefAkicilik ? `- Hedef akıcılık: ${b.hedefAkicilik}` : "",
    b.takilanDesenler ? `- Takılınan desenler: ${b.takilanDesenler}` : "",
    ...mebSatirlari(b.mebHedefKod, b.mebDavranisKodlari),
  ].filter(Boolean),

  sections: OKUMA_BOLUM_LISTESI, // tek kaynak: checks.ts
  checks: okumaChecks,

  criteria: [
    { key: "fonolojik_temel", question: "Hece-ses çalışması Türkçenin şeffaf yazımına uygun mu (İngilizce fonik aktarması yok); takılınan desenler (ör. b/d) doğrudan hedefleniyor mu?" },
    { key: "metin_duzeyi", question: "Okuma parçası istenen düzeyde (hece/kelime/cümle/paragraf), özgün, ilgi alanına uygun ve kademeye göre uzunlukta mı; rubrik kelime/dk + doğruluk + prozodi içeriyor mu?" },
  ],
});
