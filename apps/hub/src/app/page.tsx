import { PBadge, PCard } from "@ludenlab/ui";

interface Service {
  name: string;
  tagline: string;
  href: string;
  status: { label: string; tone: "green" | "accent" };
  emoji: string;
}

const SERVICES: Service[] = [
  {
    name: "LudenLab Stüdyo",
    tagline: "Dil, konuşma ve işitme profesyonelleri için AI destekli terapi araçları.",
    href: "https://studio.ludenlab.com",
    status: { label: "Canlı", tone: "green" },
    emoji: "🗣️",
  },
  {
    name: "LudenLab Atölye",
    tagline: "Özgül öğrenme güçlüğü (ÖÖB) ve DEHB için BEP ve rapor araçları.",
    href: "https://atolye.ludenlab.com",
    status: { label: "Yeni · Beta", tone: "accent" },
    emoji: "🧩",
  },
  {
    name: "BRY Takip",
    tagline: "Özel eğitim merkezleri için yoklama ve ders saati takibi.",
    href: "https://bry.ludenlab.com",
    status: { label: "Canlı", tone: "green" },
    emoji: "📋",
  },
];

export default function HomePage() {
  const year = new Date().getFullYear();
  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "clamp(2rem, 6vw, 5rem) 1.25rem",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: "3rem" }}>
        <p style={{ fontWeight: 800, letterSpacing: "0.18em", color: "var(--poster-accent)" }}>
          LUDENLAB
        </p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", margin: "0.5rem 0", lineHeight: 1.1 }}>
          Özel eğitimde yazılım araçları
        </h1>
        <p
          style={{
            color: "var(--poster-ink-2)",
            fontSize: "1.125rem",
            maxWidth: 540,
            margin: "0 auto",
          }}
        >
          Tek çatı, üç ürün. Aşağıdan ihtiyacınız olan servise geçin.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gap: "1.25rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        {SERVICES.map((s) => (
          <PCard key={s.name} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "2rem" }} aria-hidden>
                {s.emoji}
              </span>
              <PBadge tone={s.status.tone}>{s.status.label}</PBadge>
            </div>
            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>{s.name}</h2>
            <p style={{ color: "var(--poster-ink-2)", flex: 1, margin: 0 }}>{s.tagline}</p>
            <a
              className="p-btn p-btn--accent p-btn--md"
              href={s.href}
              aria-label={`${s.name} servisini aç`}
            >
              Aç →
            </a>
          </PCard>
        ))}
      </section>

      <footer
        style={{
          marginTop: "3.5rem",
          textAlign: "center",
          color: "var(--poster-ink-3)",
          fontSize: "0.875rem",
        }}
      >
        © {year} LudenLab · Tüm hakları saklıdır
      </footer>
    </main>
  );
}
