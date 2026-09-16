import type { ReelScript } from "../../reels-lib/types";

export const r2Script: ReelScript = {
  id: "r2",
  slug: "r2-kartlar",
  title: "Öğrenme kartı",
  scenes: [
    {
      id: "s1",
      vo: "Pazar akşamı, yarınki seanslar için yine materyal hazırlıyorsun.",
      screen: "Pazar akşamı. Yine materyaller.",
      defaultSec: 3.5,
    },
    {
      id: "s2",
      vo: "Studio'da çalışma odağını yaz; amacı, materyalleri ve adımlarıyla bir öğrenme kartı hazırlansın.",
      screen: "Konuşma · 3–6 yaş · Orta → /s/ sesi üretimi → kart bölüm bölüm doluyor",
      defaultSec: 6,
    },
    {
      id: "s3",
      vo: "Gözden geçir, PDF olarak indir.",
      screen: "Gerçek PDF sayfası + PDF indir",
      defaultSec: 3.5,
    },
    {
      id: "s4",
      vo: "Materyal hazır, akşamın senin.",
      screen: "Esenliğin de işinin parçası.",
      defaultSec: 3,
    },
    {
      id: "s5",
      vo: "Studio'yu keşfet: ludenlab nokta com.",
      screen: "Kapanış kartı (STUDIO)",
      defaultSec: 3.5,
      minSec: 3.5,
      hideCaption: true,
    },
  ],
};
