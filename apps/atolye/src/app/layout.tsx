import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LudenLab Atölye — ÖÖB & DEHB araçları",
  description:
    "Özgül öğrenme güçlüğü (ÖÖB) ve DEHB temelli öğrenme güçlükleri için BEP ve rapor araçları. AI çıktıları taslaktır; uzman onayı gerektirir.",
  metadataBase: new URL("https://atolye.ludenlab.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="poster-scope">{children}</body>
    </html>
  );
}
