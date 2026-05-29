import Link from "next/link";
import { PCard } from "@ludenlab/ui";

const TOOLS = [
  {
    name: "BEP & Rapor Asistanı",
    href: "/araclar/bep",
    emoji: "📝",
    desc: "Çocuğun profilinden BEP hedef taslağı, ilerleme raporu ve aile özeti üretir.",
  },
  {
    name: "Seans Planı Üreteci",
    href: "/araclar/seans-plani",
    emoji: "🗓️",
    desc: "Bir seansın hedefinden ısınma → ana etkinlik → tekrar → kapanış akışlı plan üretir.",
  },
];

export default function HomePage() {
  return (
    <>
      <header style={{ marginBottom: "2rem", maxWidth: 640 }}>
        <p style={{ fontWeight: 800, letterSpacing: "0.16em", color: "var(--poster-accent)" }}>
          ARAÇLAR
        </p>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", margin: "0.3rem 0", lineHeight: 1.1 }}>
          ÖÖB &amp; DEHB için uzman araçları
        </h1>
        <p style={{ color: "var(--poster-ink-2)", fontSize: "1.0625rem", margin: 0 }}>
          MEB destek eğitim çerçevesine hizalı taslak üreteçleri. Çocuk adı yerine kod/rumuz; tüm
          çıktılar uzman onayı gerektirir.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gap: "1.25rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        {TOOLS.map((t) => (
          <PCard key={t.href} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <span style={{ fontSize: "2rem" }} aria-hidden>
              {t.emoji}
            </span>
            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>{t.name}</h2>
            <p style={{ color: "var(--poster-ink-2)", flex: 1, margin: 0 }}>{t.desc}</p>
            <Link className="p-btn p-btn--accent p-btn--md" href={t.href}>
              Aç →
            </Link>
          </PCard>
        ))}
      </section>

      <p style={{ marginTop: "2.5rem", color: "var(--poster-ink-3)", fontSize: "0.85rem" }}>
        Bu araçlar tıbbi tanı koymaz. Tanı çocuk-ergen psikiyatristine; eğitsel değerlendirme ve
        destek eğitim kararı RAM'a aittir.
      </p>
    </>
  );
}
