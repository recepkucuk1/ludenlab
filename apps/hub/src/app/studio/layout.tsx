import { Plus_Jakarta_Sans, Space_Grotesk, Instrument_Serif } from "next/font/google";
import { auth } from "@studio/auth";
import { ThemeProvider } from "@studio/components/ThemeProvider";
import { AuthSessionProvider } from "@studio/components/AuthSessionProvider";
import { PToaster } from "@studio/components/poster";
import { CookieBanner } from "@studio/components/cookie-banner";
import "@studio/styles/studio.css";

// auth() (cookie) köprü session'ı SSR'da çözülsün → prerender invariant'ı önle.
export const dynamic = "force-dynamic";

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

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  // Köprü session'ı (session.user.role = Therapist.role, ör. "admin") → client'a ver.
  // Yoksa useSession merkezi /api/auth/session'a düşer (role="user") → admin linki kaybolur.
  const session = await auth();
  return (
    <div className={`${jakarta.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable} antialiased`}>
      {/* FOUC script artık root layout'ta (tüm rotalar için tek tema kaynağı). */}
      <ThemeProvider>
        <AuthSessionProvider session={session}>{children}</AuthSessionProvider>
        <PToaster />
        <CookieBanner />
      </ThemeProvider>
    </div>
  );
}
