import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LudenLab — Özel eğitimde yazılım araçları",
  description:
    "LudenLab; dil-konuşma-işitme, özgül öğrenme güçlüğü ve özel eğitim merkezleri için geliştirilen yazılım araçlarının çatısı.",
  metadataBase: new URL("https://ludenlab.com"),
  openGraph: {
    title: "LudenLab",
    description: "Özel eğitimde yazılım araçları",
    type: "website",
    locale: "tr_TR",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="poster-scope">{children}</body>
    </html>
  );
}
