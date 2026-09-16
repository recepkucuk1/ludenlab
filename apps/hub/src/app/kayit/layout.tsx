import type { Metadata } from "next";

/**
 * Sayfanın kendisi istemci bileşeni olduğu için metadata BURADAN verilir (Next kuralı).
 * `noindex`: kimlik sayfalarının arama sonuçlarında yeri yok; ayrıca `?callbackUrl=`
 * parametresi sonsuz sayıda varyant üretebiliyordu (2026-09 denetimi).
 */
export const metadata: Metadata = {
  title: "Kayıt Ol — LudenLab",
  description: "LudenLab Studio ve Atölye için ücretsiz hesap oluşturun.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
