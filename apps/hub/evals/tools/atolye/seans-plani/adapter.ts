// apps/hub/evals/tools/atolye/seans-plani/adapter.ts
import { ALAN } from "@atolye/lib/bep";
import { atolyeAdapter } from "../../../lib/adapterFactory";
import { mebSatirlari } from "../ortak";
import { SEANS_BOLUM_LISTESI, seansChecks, type SeansBody } from "./checks";

/** Fikstürde olup araca GİTMEYEN alanlar: seans planı profil omurgasını kullanmaz (`seansInputSchema`: rumuz, kademe, alan,
    seansHedefi, sureDk, ilgiAlanlari, sonSeansNotu, materyalKisiti, MEB). `renderAtolyeCase` yaş ve tanıyı da basar; hakem bunlarla özgüllük ölçmesin. */
const HAKEM_NOTU =
  "- (Hakem notu: yaş, güçlük profili, güçlük düzeyi, güçlü yönler, çalışılan MEB bölümleri ve önceki belgeler araca İLETİLMEDİ; yalnız ad, kademe, ilgi alanları ve istek alanları gider — özgüllüğü yalnız araca giden alanlara göre değerlendir.)";

export const adapter = atolyeAdapter<SeansBody>({
  id: "atolye/seans-plani",
  label: "Seans planı (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/seans-plani/route"),

  // Önce hesaplanan varsayılanlar, sonra vaka gövdesi; rumuz/kademe fabrikada son kez fikstürden yazılır.
  body: (b, f) => ({ rumuz: f.code, kademe: f.kademe, ilgiAlanlari: f.ilgiAlanlari ?? "", sonSeansNotu: "", materyalKisiti: "", ...b }),

  // Etiketler `seans-prompts.ts` kullanıcı isteminin etiketleriyle AYNI (adapter.selftest gerçek istemde doğrular); ALAN etiketleri `bep.ts`'ten.
  requestLines: (b) => [
    `- Alan: ${ALAN[b.alan]}`,
    `- Bu seansın hedefi: ${b.seansHedefi}`,
    `- Süre: ${b.sureDk} dakika`,
    b.sonSeansNotu ? `- Son seans notu: ${b.sonSeansNotu}` : "",
    b.materyalKisiti ? `- Materyal kısıtı: ${b.materyalKisiti}` : "",
    ...mebSatirlari(b.mebHedefKod, b.mebDavranisKodlari),
  ].filter(Boolean),

  sections: SEANS_BOLUM_LISTESI, // tek kaynak: checks.ts (akış bölümünün sınırı da buradan)
  checks: seansChecks,

  criteria: [
    { key: "akis_sure", question: "Isınma → ana etkinlik → tekrar/oyun → kapanış akışı istenen toplam süreye dakika dakika oturuyor mu; her blok uygulanabilir ve kademeye uygun mu?" },
    { key: "hedef_hizasi", question: "Ana etkinlik seans hedefine (ve verildiyse MEB hedef davranışlarına) doğrudan hizmet ediyor mu; ilgi alanı etkinliğe gerçekten taşınmış mı, yoksa süs mü?" },
  ],

  notSent: HAKEM_NOTU,
});
