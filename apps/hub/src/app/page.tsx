/* ============================================================
   Ana sayfa (/) — LANSMAN ÖNCESİ "Pek yakında" gösteriyor.

   Tam landing korunuyor: ./_landing/FullLanding.tsx
   LAUNCH'TA GERİ ALMAK İÇİN: aşağıdaki importu ve return'ü
   FullLanding ile değiştir (tek satır):
     import FullLanding from "./_landing/FullLanding";
     export default function HomePage() { return <FullLanding />; }
   ============================================================ */
import type { Metadata } from "next";
import { ComingSoon } from "./_landing/ComingSoon";

export const metadata: Metadata = {
  title: "LudenLab — Pek yakında",
  description:
    "Özel eğitimde yapay zekâ destekli öğrenme yönetimi. Studio ve Atölye pek yakında.",
};

export default function HomePage() {
  return <ComingSoon />;
}
