import { PToaster, ThemeProvider } from "@ludenlab/ui";
import "@atolye/styles/atolye.css";

/**
 * Atölye segment layout (/atolye/*) — birleşik app içinde Atölye kabuğu.
 * `<html>/<body className="poster-scope">` hub root layout'ta → burada YOK.
 * Atölye `@ludenlab/ui` poster sistemini kullanır (hub ile ortak); atolye.css
 * Yön A token'larını (.poster-scope scoped) /atolye'ye yükler.
 */
export default function AtolyeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Bricolage + Satoshi artık root layout'ta global yükleniyor */}
      <ThemeProvider>
        {children}
        <PToaster />
      </ThemeProvider>
    </>
  );
}
