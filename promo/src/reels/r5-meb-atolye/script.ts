import type { ReelScript } from "../../reels-lib/types";

export const r5Script: ReelScript = {
  id: "r5",
  slug: "r5-meb-atolye",
  title: "MEB hedefinden taslağa",
  voice: "Chris",
  scenes: [
    { id: "s1", vo: "Hedef belli; ona uygun seans planını hazırlamak ise saatler alıyor.", screen: "Hedef belli. Plan nerede?", defaultSec: 4 },
    {
      id: "s2",
      vo: "Atölye'de MEB'in öğrenme güçlüğü destek eğitim programından hedefini seç.",
      screen: "Modül → Bölüm → Hedef → hedef davranışlar",
      defaultSec: 5.5,
    },
    {
      id: "s3",
      vo: "Seans planı taslağın dakikalar içinde hazır; son söz her zaman senin.",
      screen: "Gerçek PDF taslak + akış + TASLAK damgası",
      defaultSec: 5,
    },
    { id: "s4", vo: "Evrakla değil, çocukla geçen bir gün.", screen: "172 hedef · resmî kodlarıyla", defaultSec: 3.5 },
    { id: "s5", vo: "Atölye'yi keşfet: ludenlab nokta com.", screen: "Kapanış kartı (ATÖLYE)", defaultSec: 3.5, minSec: 3.5, hideCaption: true },
  ],
};
