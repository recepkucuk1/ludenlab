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
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  // Köprü session'ı (session.user.role = Therapist.role, ör. "admin") → client'a ver.
  // Yoksa useSession merkezi /api/auth/session'a düşer (role="user") → admin linki kaybolur.
  const session = await auth();
  return (
    <div className="antialiased">
      {/* FOUC script artık root layout'ta (tüm rotalar için tek tema kaynağı). */}
      <ThemeProvider>
        <AuthSessionProvider session={session}>{children}</AuthSessionProvider>
        <PToaster />
        <CookieBanner />
      </ThemeProvider>
    </div>
  );
}
