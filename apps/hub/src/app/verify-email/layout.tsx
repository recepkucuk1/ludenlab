import type { Metadata } from "next";

/**
 * Sayfanın kendisi istemci bileşeni olduğu için metadata BURADAN verilir (Next kuralı).
 * `noindex`: kimlik sayfalarının arama sonuçlarında yeri yok; ayrıca `?callbackUrl=`
 * parametresi sonsuz sayıda varyant üretebiliyordu (2026-09 denetimi).
 */
export const metadata: Metadata = {
  title: "E-posta Doğrulama — LudenLab",
  description: "E-posta adresinizi doğrulayın.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
