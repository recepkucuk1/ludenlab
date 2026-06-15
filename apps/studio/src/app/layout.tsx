import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk, Instrument_Serif } from "next/font/google";
import { PToaster } from "@/components/poster";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { CookieBanner } from "@/components/cookie-banner";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff8ec" },
    { media: "(prefers-color-scheme: dark)", color: "#15100a" },
  ],
};

const TITLE = "LudenLab — AI Destekli Öğrenme Kartı Üreticisi";
const DESCRIPTION =
  "Dil, konuşma ve işitme uzmanları için AI destekli öğrenme kartı üreticisi.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "LudenLab",
  keywords: [
    "dil ve konuşma terapisi",
    "özel eğitim materyali",
    "öğrenme kartı",
    "AI kart üreticisi",
    "artikülasyon",
    "afazi",
    "BEP",
    "konuşma terapisti",
    "işitme engelli eğitimi",
  ],
  authors: [{ name: "LudenLab" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "LudenLab",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LudenLab",
  },
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable} antialiased`}>
        {/*
          Blocking inline script — JS yüklenmeden önce çalışır, FOUC'u önler.
          localStorage'daki tercih yoksa sistem dark mode'una uyar.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('luden-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <a href="#main-content" className="skip-link">Ana içeriğe geç</a>
        <ThemeProvider>
          <AuthSessionProvider>{children}</AuthSessionProvider>
          <PToaster />
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
