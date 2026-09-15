import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

// Ziyaret istatistiği — Umami (çerezsiz, anonim; KVKK-dostu). Yalnız website id verilince
// yüklenir; yoksa hiçbir script eklenmez. Sorgu dizgileri (?email=… gibi) gönderilmez.
const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim() || null;
const UMAMI_SCRIPT_URL = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL?.trim() || "https://cloud.umami.is/script.js";

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
        {/* Bricolage Grotesque — birleşik display fontu (hub · atölye · studio) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap"
        />
      </head>
      <body className="poster-scope">
        {children}
        {UMAMI_WEBSITE_ID && (
          <Script
            src={UMAMI_SCRIPT_URL}
            data-website-id={UMAMI_WEBSITE_ID}
            data-exclude-search="true"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
