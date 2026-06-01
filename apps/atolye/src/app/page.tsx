import Link from "next/link";
import { redirect } from "next/navigation";
import { PCard } from "@ludenlab/ui";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const TOOLS = [
  { emoji: "📝", name: "BEP & Rapor Asistanı", desc: "Alan bazında ölçülebilir BEP hedef taslağı — dakikalar içinde." },
  { emoji: "🗓️", name: "Seans Planı Üreteci", desc: "Bir hedeften çok duyulu, süre dağılımlı seans planı." },
];

const STEPS = [
  { n: "1", t: "Kaydol", d: "E-posta ile ücretsiz hesap aç." },
  { n: "2", t: "Profili gir", d: "Öğrencinin adını, kademesini ve güçlük alanlarını gir." },
  { n: "3", t: "Taslağı al", d: "MEB çerçevesine hizalı taslağı üret, uyarlayıp vakaya kaydet." },
];

const FAQ = [
  { q: "Bu araç tanı koyar mı?", a: "Hayır. Tanı çocuk-ergen psikiyatristine; eğitsel değerlendirme ve destek eğitim kararı RAM'a aittir. Üretilen her metin uzman onayı gerektiren bir taslaktır." },
  { q: "Öğrencinin bilgileri güvende mi?", a: "Öğrenci kayıtlarınız, yalnız sizin hesabınıza görünür biçimde ayrı ve izole bir veritabanında tutulur. Taslaklar yapay zekâ ile üretildiği için girdiğiniz öğrenci adı ve profili bu süreçte işlenir; gerçek öğrenci verisiyle çalışmadan önce gerekli veli/yasal rızayı almanız önerilir." },
  { q: "Ücretli mi?", a: "Şu an kapalı beta — ücretsiz. Geri bildirimlerinizle olgunlaştırıyoruz." },
];

export default async function RootPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div style={{ background: "var(--surface-page-gradient)", minHeight: "100dvh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1080,
          margin: "0 auto",
          padding: "1rem 1.25rem",
        }}
      >
        <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>🧩 LudenLab Atölye</span>
        <nav style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <Link className="p-btn p-btn--ghost p-btn--sm" href="/giris">
            Giriş
          </Link>
          <Link className="p-btn p-btn--accent p-btn--sm" href="/kayit">
            Kayıt ol
          </Link>
        </nav>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "1rem 1.25rem 4rem" }}>
        <section style={{ textAlign: "center", padding: "clamp(2rem, 7vw, 5rem) 0 3rem" }}>
          <p style={{ fontWeight: 800, letterSpacing: "0.16em", color: "var(--poster-accent)" }}>
            ÖÖB & DEHB ARAÇLARI
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 5.5vw, 3.4rem)", lineHeight: 1.1, margin: "0.5rem auto", maxWidth: 760 }}>
            Özel öğrenme güçlüğünde uzmanın yükünü hafifletin
          </h1>
          <p style={{ color: "var(--poster-ink-2)", fontSize: "1.125rem", maxWidth: 600, margin: "0 auto 1.75rem" }}>
            MEB destek eğitim çerçevesine hizalı BEP, rapor ve seans taslaklarını AI ile dakikalar
            içinde üretin; uyarlayıp kaydedin.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="p-btn p-btn--accent p-btn--lg" href="/kayit">
              Ücretsiz başla →
            </Link>
            <Link className="p-btn p-btn--ghost p-btn--lg" href="/giris">
              Giriş yap
            </Link>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gap: "1.25rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            marginBottom: "3rem",
          }}
        >
          {TOOLS.map((t) => (
            <PCard key={t.name} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <span style={{ fontSize: "2rem" }} aria-hidden>
                {t.emoji}
              </span>
              <h2 style={{ fontSize: "1.2rem", margin: 0 }}>{t.name}</h2>
              <p style={{ color: "var(--poster-ink-2)", margin: 0 }}>{t.desc}</p>
            </PCard>
          ))}
        </section>

        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ textAlign: "center", fontSize: "1.5rem", marginBottom: "1.5rem" }}>Nasıl çalışır?</h2>
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {STEPS.map((s) => (
              <PCard key={s.n} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <span
                  style={{
                    display: "inline-flex",
                    width: "2rem",
                    height: "2rem",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "var(--poster-border)",
                    borderRadius: "999px",
                    background: "var(--poster-accent-soft)",
                    fontWeight: 800,
                  }}
                >
                  {s.n}
                </span>
                <strong>{s.t}</strong>
                <span style={{ color: "var(--poster-ink-2)", fontSize: "0.9rem" }}>{s.d}</span>
              </PCard>
            ))}
          </div>
        </section>

        <section style={{ maxWidth: 720, margin: "0 auto 3rem" }}>
          <h2 style={{ textAlign: "center", fontSize: "1.5rem", marginBottom: "1.25rem" }}>Sık sorulanlar</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {FAQ.map((f) => (
              <details
                key={f.q}
                style={{
                  border: "var(--poster-border)",
                  borderRadius: "var(--poster-radius-md)",
                  background: "var(--poster-panel)",
                  padding: "0.75rem 1rem",
                }}
              >
                <summary style={{ fontWeight: 700, cursor: "pointer" }}>{f.q}</summary>
                <p style={{ color: "var(--poster-ink-2)", margin: "0.5rem 0 0" }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer
        style={{
          borderTop: "var(--poster-border)",
          padding: "1.5rem 1.25rem",
          textAlign: "center",
          color: "var(--poster-ink-3)",
          fontSize: "0.85rem",
        }}
      >
        © {new Date().getFullYear()} LudenLab Atölye · Bu araçlar tıbbi tanı koymaz; çıktılar uzman
        onayı gerektiren taslaklardır.
      </footer>
    </div>
  );
}
