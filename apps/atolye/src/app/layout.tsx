import type { Metadata } from "next";
import Link from "next/link";
import { AppShell, PToaster, ThemeProvider, ThemeToggle } from "@ludenlab/ui";
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
          <AppShell
            brand={
              <Link href="/" className="p-appbar__brand">
                <span aria-hidden>🧩</span> LudenLab Atölye
              </Link>
            }
            nav={
              <>
                <Link href="/araclar/bep">BEP &amp; Rapor</Link>
                <Link href="/araclar/seans-plani">Seans Planı</Link>
              </>
            }
            actions={<ThemeToggle />}
          >
            {children}
          </AppShell>
          <PToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
