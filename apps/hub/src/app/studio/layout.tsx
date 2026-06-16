import { Plus_Jakarta_Sans, Space_Grotesk, Instrument_Serif } from "next/font/google";
import { ThemeProvider } from "@studio/components/ThemeProvider";
import { AuthSessionProvider } from "@studio/components/AuthSessionProvider";
import { PToaster } from "@studio/components/poster";
import { CookieBanner } from "@studio/components/cookie-banner";
import "@studio/styles/studio.css";

/**
 * Studio segment layout (/studio/*) — birleşik app içinde Studio'nun kabuğu.
 * Hub root layout'ta `<html>/<body>` var → burada YOK; fontlar + dark-mode + provider'lar
 * bir wrapper div'de (Studio'nun eski root layout gövdesinden, `<body>` parçası hariç).
 */
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

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${jakarta.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable} antialiased`}>
      {/* FOUC önleyici dark-mode script (Studio teması) */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('luden-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
        }}
      />
      <ThemeProvider>
        <AuthSessionProvider>{children}</AuthSessionProvider>
        <PToaster />
        <CookieBanner />
      </ThemeProvider>
    </div>
  );
}
