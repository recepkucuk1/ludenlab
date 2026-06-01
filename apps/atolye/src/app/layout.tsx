import type { Metadata } from "next";
import { PToaster, ThemeProvider } from "@ludenlab/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "LudenLab Atölye — ÖÖB & DEHB araçları",
  description:
    "Özgül öğrenme güçlüğü (ÖÖB) ve DEHB temelli öğrenme güçlükleri için BEP, rapor ve seans araçları. AI çıktıları taslaktır; uzman onayı gerektirir.",
  metadataBase: new URL("https://atolye.ludenlab.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Body = Satoshi, Display = Bricolage Grotesque (Yön A). Turbopack CSS @import'u
            düşürdüğü için fontları burada <link> ile yüklüyoruz (hub ile aynı yöntem). */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap"
        />
      </head>
      <body className="poster-scope">
        <ThemeProvider>
          {children}
          <PToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
