import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Logo } from "@ludenlab/ui";

export const metadata: Metadata = { title: "Haftalık geri bildirim — LudenLab", robots: { index: false, follow: false }, referrer: "no-referrer", alternates: { canonical: null } };

/* Açık kabuk (spec §6): studio layout YOK (oturum/tema/çerez bandı yok); poster token'ları kökten gelir; hep açık tema. */
export default function VeliLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "var(--poster-bg)", minHeight: "100vh", color: "var(--poster-ink)" }}>
      <header style={{ borderBottom: "var(--poster-border)", padding: "14px 16px", display: "flex", alignItems: "center", maxWidth: 560, margin: "0 auto" }}>
        <Logo height={26} />
      </header>
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px 40px" }}>{children}</main>
    </div>
  );
}
