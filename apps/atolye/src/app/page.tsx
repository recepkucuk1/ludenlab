import Link from "next/link";
import { PBadge, PCard } from "@ludenlab/ui";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "clamp(2rem, 6vw, 4.5rem) 1.25rem" }}>
      <header style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontWeight: 800, letterSpacing: "0.16em", color: "var(--poster-accent)" }}>
          LUDENLAB ATÖLYE
        </p>
        <h1 style={{ fontSize: "clamp(1.9rem, 4.5vw, 2.75rem)", margin: "0.4rem 0", lineHeight: 1.1 }}>
          Özgül öğrenme güçlüğü için araçlar
        </h1>
        <p style={{ color: "var(--poster-ink-2)", fontSize: "1.0625rem", maxWidth: 560 }}>
          ÖÖB ve DEHB temelli öğrenme güçlüklerinde, MEB destek eğitim çerçevesine hizalı,
          uzmanın işini hızlandıran taslak üreteçleri.
        </p>
      </header>

      <section style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "1fr" }}>
        <PCard style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "2rem" }} aria-hidden>
              🧩
            </span>
            <PBadge tone="accent">Beta</PBadge>
          </div>
          <h2 style={{ fontSize: "1.3rem", margin: 0 }}>BEP &amp; Rapor Asistanı</h2>
          <p style={{ color: "var(--poster-ink-2)", margin: 0 }}>
            Çocuğun profilinden üç taslak üretir: <strong>BEP hedef taslağı</strong>,{" "}
            <strong>ilerleme raporu</strong> ve <strong>aile özeti</strong>. Çocuk adı yerine
            kod/rumuz kullanılır; çıktılar uzman onayı gerektirir.
          </p>
          <Link className="p-btn p-btn--accent p-btn--md" href="/araclar/bep">
            Asistanı aç →
          </Link>
        </PCard>
      </section>

      <p style={{ marginTop: "2.5rem", color: "var(--poster-ink-3)", fontSize: "0.85rem" }}>
        Bu araç tıbbi tanı koymaz. Tanı, çocuk-ergen psikiyatristine; eğitsel değerlendirme ve
        destek eğitim kararı RAM'a aittir.
      </p>
    </main>
  );
}
