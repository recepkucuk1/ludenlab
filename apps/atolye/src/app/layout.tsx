import type { Metadata } from "next";
import Link from "next/link";
import { AppShell, PToaster, ThemeProvider, ThemeToggle } from "@ludenlab/ui";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/LogoutButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "LudenLab Atölye — ÖÖB & DEHB araçları",
  description:
    "Özgül öğrenme güçlüğü (ÖÖB) ve DEHB temelli öğrenme güçlükleri için BEP, rapor ve seans araçları. AI çıktıları taslaktır; uzman onayı gerektirir.",
  metadataBase: new URL("https://atolye.ludenlab.com"),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
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
            actions={
              <>
                {session?.user ? (
                  <>
                    <span style={{ fontSize: "0.85rem", color: "var(--poster-ink-3)" }}>
                      {session.user.email}
                    </span>
                    <LogoutButton />
                  </>
                ) : (
                  <Link href="/giris" className="p-btn p-btn--ghost p-btn--sm">
                    Giriş
                  </Link>
                )}
                <ThemeToggle />
              </>
            }
          >
            {children}
          </AppShell>
          <PToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
