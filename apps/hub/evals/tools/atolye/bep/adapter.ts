// apps/hub/evals/tools/atolye/bep/adapter.ts
import { ALAN } from "@atolye/lib/bep";
import { atolyeAdapter } from "../../../lib/adapterFactory";
import { ALT_KALIPLAR, bepChecks, type BepBody } from "./checks";

/** Fikstürde olup araca GİTMEYEN alanlar (bepInputSchema + bep-prompts `profil()`): hakem özgüllüğü bunlarla ölçmesin. */
const HAKEM_NOTU =
  "- (Hakem notu: güçlük profili, güçlük düzeyi, ilgi alanları, çalışılan MEB bölümleri ve önceki belgeler araca İLETİLMEDİ; özgüllüğü yalnız araca giden alanlara göre değerlendir — ad, kademe, yaş, hedef alanlar, güçlü yönler, güçlük alanları, ek notlar, MEB kodu.)";

export const adapter = atolyeAdapter<BepBody>({
  id: "atolye/bep",
  label: "BEP hedef taslağı (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/bep/route"),

  body: (b, f) => ({
    // Önce vaka gövdesi, sonra hesaplanan varsayılanlar, en son kimlik: vaka kimliği ezemez.
    ...b,
    gucluYonler: b.gucluYonler ?? f.gucluYonler ?? "",
    ekNotlar: b.ekNotlar ?? "",
    mebDavranisKodlari: b.mebDavranisKodlari ?? [],
    outputType: "bep_hedef",
    rumuz: f.code,
    kademe: f.kademe,
    ...(f.yas ? { yas: f.yas } : {}),
  }),

  requestLines: (b) => [
    "- Biçim: MEB ÖÖG destek eğitim programına hizalı; alan başına uzun/kısa dönem hedef + yöntem + ölçme",
    `- Hedef alanlar: ${b.alanlar.map((a) => ALAN[a]).join(", ")}`,
    b.gucluYonler ? `- Güçlü yönler (istekte; araca giden): ${b.gucluYonler}` : "",
    `- Güçlük alanları / mevcut düzey: ${b.guclukAlanlari}`,
    b.ekNotlar ? `- Ek notlar: ${b.ekNotlar}` : "",
    b.mebHedefKod ? `- MEB hedef kodu: ${b.mebHedefKod}` : "",
  ],

  sections: [...ALT_KALIPLAR, /iş\s?birliği/],

  checks: bepChecks,

  criteria: [
    { key: "hedef_olculebilirlik", question: "Kısa dönem hedefler gözlenebilir davranış + ölçüt (%/oran/sıklık) + koşul formülünde mi; uzun dönem amaçla tutarlı mı?" },
    { key: "meb_hizasi", question: "MEB destek eğitim programı çerçevesi ve ölçme aşamaları doğru kullanılmış mı; MEB kodu verildiyse hedefler ona demirli mi?" },
  ],

  notSent: HAKEM_NOTU,
});
