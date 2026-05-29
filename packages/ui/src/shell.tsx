import { type ReactNode } from "react";

export interface AppShellProps {
  /** Sol üst marka alanı (logo/wordmark). */
  brand: ReactNode;
  /** Başlıktaki gezinme bağlantıları. */
  nav?: ReactNode;
  /** Sağdaki aksiyonlar (ör. tema düğmesi). */
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
}

/** LudenLab uygulamaları için ortak kabuk: yapışkan başlık + içerik alanı. */
export function AppShell({ brand, nav, actions, children, maxWidth = 1120 }: AppShellProps) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header className="p-appbar">
        <div className="p-appbar__inner" style={{ maxWidth }}>
          <div className="p-appbar__brand">{brand}</div>
          {nav && <nav className="p-appbar__nav">{nav}</nav>}
          <div style={{ flex: 1 }} />
          {actions && <div className="p-appbar__actions">{actions}</div>}
        </div>
      </header>
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth,
          margin: "0 auto",
          padding: "1.75rem 1.25rem 4rem",
        }}
      >
        {children}
      </main>
    </div>
  );
}
