// apps/hub/evals/tools/atolye/ev-odevi/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { mebSatirlari } from "../ortak";
import { EV_ODEVI_BOLUM_LISTESI, evOdeviChecks, type EvOdeviBody } from "./checks";

export const adapter = atolyeAdapter<EvOdeviBody>({
  id: "atolye/ev-odevi",
  label: "Ev ödevi programı (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/ev-odevi/route"),

  body: (b, f) => ({ ...profilBody(f), ...b }),

  // Etiketler `ev-odevi-prompts.ts` "HEDEF & SÜRE" bloğuyla AYNI (üç ayrı satır; süre "N günlük" yazılır); ek not boşsa ürün "Belirtilmedi" yazar, hakeme satır gitmez (uydurma yok).
  requestLines: (b) => [
    `- Hedeflenen Konu/Beceri: ${b.hedefKonu}`,
    `- Program Süresi: ${b.gunSayisi} günlük`,
    b.ekstraNot ? `- Uzman Yönergeleri / Ek Not: ${b.ekstraNot}` : "",
    ...mebSatirlari(b.mebHedefKod, b.mebDavranisKodlari),
  ].filter(Boolean),

  sections: EV_ODEVI_BOLUM_LISTESI, // tek kaynak: checks.ts (plan kapsamının dışlama listesi ayrıca)
  checks: evOdeviChecks,

  criteria: [
    { key: "rutine_yerlesme", question: "Günlük plan ailenin gerçek rutinine (akşam, hafta sonu, kardeş; uzman notunda verilmişse ona göre) yerleşebilir mi; oyunlaştırma/pekiştirme çocuğun ilgisine ve oyuna dayanıyor, yalnız puan-ödül tablosuna indirgenmemiş mi; çocuk direnirse B planı gerçekçi mi?" },
    { key: "sure_uyumu", question: "Çalışma 15–20 dk'lık dilimlerden oluşuyor mu (ısınma dâhil günün toplamı 20 dk'yı belirgin aşmıyor); istenen gün sayısı kadar gün var, günler birbirini tekrarlamayıp basamaklanıyor mu?" },
  ],
});
