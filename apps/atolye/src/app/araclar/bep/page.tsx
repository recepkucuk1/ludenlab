import type { Metadata } from "next";
import Link from "next/link";
import { BepAssistant } from "@/components/BepAssistant";

export const metadata: Metadata = {
  title: "BEP & Rapor Asistanı — LudenLab Atölye",
  description:
    "Çocuğun profilinden BEP hedef taslağı, ilerleme raporu ve aile özeti üretir. Çıktılar uzman onayı gerektiren taslaklardır.",
};

export default function BepPage() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
      <Link href="/" style={{ color: "var(--poster-ink-3)", fontSize: "0.9rem", textDecoration: "none" }}>
        ← Atölye
      </Link>
      <header style={{ margin: "0.75rem 0 1.75rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.4rem" }}>
          BEP &amp; Rapor Asistanı
        </h1>
        <p style={{ color: "var(--poster-ink-2)", maxWidth: 620, margin: 0 }}>
          Çocuğun profilini girin; MEB destek eğitim çerçevesine hizalı bir taslak üretilsin.
          Çocuk adı yerine kod/rumuz kullanın.
        </p>
      </header>
      <BepAssistant />
    </main>
  );
}
