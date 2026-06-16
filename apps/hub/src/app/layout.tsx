import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LudenLab — Özel eğitimin her aşaması için tek çatı",
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
    <html lang="tr" suppressHydrationWarning>
      <head>
        {/* FOUC önleyici tek tema script'i (TÜM rotalar: shell + /studio + /atolye).
            `luden-theme` = uygulama-geneli tek tercih; 'dark' veya (system/unset & sistem-dark) → .dark */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('luden-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||((!t||t==='system')&&m)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap"
        />
      </head>
      <body className="poster-scope">{children}</body>
    </html>
  );
}
