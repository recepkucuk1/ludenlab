import type { ReelScript } from "../../reels-lib/types";

export const r1Script: ReelScript = {
  id: "r1",
  slug: "r1-lansman",
  title: "LudenLab yayında",
  voice: "Matilda",
  scenes: [
    {
      id: "s1",
      vo: "Özel eğitimde her çocuk için ayrı bir materyal hazırlıyorsun.",
      screen: "Her çocuk ayrı. Her materyal ayrı.",
      defaultSec: 3.5,
    },
    {
      id: "s2",
      vo: "Bu yükü artık tek başına taşımak zorunda değilsin.",
      screen: "Yalnız değilsin.",
      defaultSec: 3,
    },
    {
      id: "s3",
      vo: "Yapay zekâ destekli Luden Lab yayında. Dil ve konuşma alanında çalışan uzmanlar için Studio,",
      caption: "Yapay zekâ destekli LudenLab yayında. Dil ve konuşma alanında çalışan uzmanlar için Studio,",
      screen: "LudenLab yayında · Studio",
      defaultSec: 4,
    },
    {
      id: "s4",
      vo: "öğrenme güçlüğü alanında çalışan uzmanlar için Atölye.",
      screen: "Atölye",
      defaultSec: 3,
      voice: "Chris",
    },
    {
      id: "s5",
      vo: "Hepsi tek adreste: ludenlab nokta com.",
      screen: "Kapanış kartı",
      defaultSec: 3.5,
      minSec: 3.5,
      hideCaption: true,
      voice: "Chris",
    },
  ],
};
