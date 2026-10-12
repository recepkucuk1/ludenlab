import type { ReelScript } from "../../reels-lib/types";

export const r4Script: ReelScript = {
  id: "r4",
  slug: "r4-sosyal-hikaye",
  title: "Her çocuğa kendi hikayesi",
  voice: "Matilda",
  scenes: [
    { id: "s1", vo: "Sıra beklemek, bazı çocuklar için çok zor.", screen: "Sıra beklemek çok zor.", defaultSec: 3.5 },
    {
      id: "s2",
      vo: "Studio'da durumu yaz; Carol Gray formatında bir sosyal hikaye hazırlansın.",
      screen: "Sosyal Hikaye: Sıra bekleme · Market → başlık",
      defaultSec: 5,
    },
    { id: "s3", vo: "Her cümlenin kendi görseli var.", screen: "4 cümle kartı: tür rozeti + gerçek sahne görseli", defaultSec: 4.5 },
    { id: "s4", vo: "Öğrencine özel, yazdırmaya hazır.", screen: "Gerçek PDF + Yazdır", defaultSec: 3.5 },
    { id: "s5", vo: "Her çocuğa kendi hikayesi.", screen: "Her çocuğa kendi hikayesi.", defaultSec: 3 },
    { id: "s6", vo: "ludenlab nokta com.", screen: "Kapanış kartı (STUDIO)", defaultSec: 3.5, minSec: 3.5, hideCaption: true },
  ],
};
