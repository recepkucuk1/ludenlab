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
        {/* FOUC önleyici tek tema script'i.
            Landing/pazarlama/auth rotaları (/, /fiyatlandirma, /giris, … + çıplak
            /studio & /atolye) HER ZAMAN açık — sistem koyu olsa bile .dark eklenmez.
            Yalnız uygulama alt-rotaları (/studio/* · /atolye/*) saklı tercihi onurlar:
            'dark' → koyu; 'system' → OS'u takip; aksi (boş/'light') → açık (varsayılan). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(/^\\/(studio|atolye)\\/.+/.test(location.pathname)){var t=localStorage.getItem('luden-theme');if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}}catch(e){}})()`,
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
