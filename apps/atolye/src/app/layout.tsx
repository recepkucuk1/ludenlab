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
      <body className="poster-scope">
        <ThemeProvider>
          {children}
          <PToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
