import type { ReelScript } from "../../reels-lib/types";

export const r3Script: ReelScript = {
  id: "r3",
  slug: "r3-artikulasyon",
  title: "Hedef ses, görseliyle",
  voice: "Matilda",
  scenes: [
    {
      id: "s1",
      vo: "R sesi için onlarca kelime, her birine bir görsel… Saatlerce arama.",
      screen: "/r/ sesi için kelime + görsel avı?",
      defaultSec: 4,
    },
    { id: "s2", vo: "Studio'da hedef sesi seç.", screen: "Ses çipleri → /r/ · Başta", defaultSec: 3 },
    {
      id: "s3",
      vo: "Kelimeler, görselleriyle birlikte gelsin.",
      screen: "Gerçek önbellek görselleriyle 6 kelime kartı",
      defaultSec: 4,
    },
    { id: "s4", vo: "Çalışma kâğıdın yazdırmaya hazır.", screen: "Gerçek çalışma kâğıdı + HAZIR damgası", defaultSec: 3.5 },
    { id: "s5", vo: "Görsel avı bitti, vaktin çocuğa kalsın.", screen: "Görsel avı bitti, vaktin çocuğa kalsın.", defaultSec: 3 },
    {
      id: "s6",
      vo: "ludenlab nokta com.",
      screen: "Kapanış kartı (STUDIO)",
      defaultSec: 3.5,
      minSec: 3.5,
      hideCaption: true,
    },
  ],
};
