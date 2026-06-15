import type { Metadata } from "next";
import Image from "next/image";
import { PCard, PSection, PBadge } from "@/components/poster";

export const metadata: Metadata = {
  title: "Hakkımızda — LudenLab",
  description: "LudenLab hakkında ve iletişim bilgileri.",
};

const WHY_ITEMS = [
  {
    title: "Yapay Zeka Destekli Üretim",
    desc: "Anthropic Claude ile öğrenci profiline göre kişiselleştirilmiş öğrenme materyalleri.",
    badge: "AI",
  },
  {
    title: "MEB Müfredatı Entegrasyonu",
    desc: "Talim Terbiye Kurulu destek eğitim programlarına tam uyum.",
    badge: "Müfredat",
  },
  {
    title: "Öğrenci Odaklı Kişiselleştirme",
    desc: "Tanı türü, yaş grubu ve çalışma alanına göre özelleştirilmiş içerik.",
    badge: "Kişisel",
  },
  {
    title: "Güvenli Altyapı",
    desc: "KVKK uyumlu veri koruma, şifreli iletişim ve güvenli ödeme altyapısı.",
    badge: "Güvenli",
  },
  {
    title: "Kolay Kullanım",
    desc: "Sade ve modern arayüz ile hızlıca materyal üretme, düzenleme ve indirme.",
    badge: "UX",
  },
];

const COMPANY_INFO: [string, string][] = [
  ["Ticaret Unvanı", "Luden Eğitim Danışmanlık Organizasyon ve Ticaret Limited Şirketi"],
  ["MERSİS No", "0609120901300001"],
  ["Ticaret Sicil No", "237834"],
  ["Adres", "Aydınlıkevler Mahallesi 6782/5 Sk. No:15 Çiğli / İzmir"],
  ["Meslek Grubu", "35 Eğitim Grubu"],
];

type ContactItem = {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string | null;
};

const CONTACT_ITEMS: ContactItem[] = [
  {
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    label: "E-posta",
    value: "info@ludenlab.com",
    href: "mailto:info@ludenlab.com",
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    label: "Adres",
    value: "Aydınlıkevler Mah. 6782/5 Sk. No:15 Çiğli / İzmir",
    href: null,
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    label: "Web",
    value: "ludenlab.com",
    href: "https://ludenlab.com",
  },
];

export default function AboutPage() {
  return (
    <div
      className="poster-scope"
      style={{
        background: "var(--poster-bg)",
        minHeight: "100%",
        fontFamily: "var(--font-display)",
        color: "var(--poster-ink)",
      }}
    >
      <div
        style={{
          maxWidth: 880,
          margin: "0 auto",
          padding: "clamp(40px, 8vw, 64px) clamp(16px, 5vw, 24px) clamp(48px, 10vw, 80px)",
        }}
      >
        {/* Başlık */}
        <header style={{ textAlign: "center", marginBottom: 56 }}>
          <Image
            src="/logo.svg"
            alt="LudenLab"
            width={200}
            height={72}
            style={{ height: 56, width: "auto", margin: "0 auto" }}
            priority
          />
        </header>

        {/* Bölüm 1: Hakkımızda */}
        <section style={{ marginBottom: 48 }}>
          <SectionTitle>Hakkımızda</SectionTitle>
          <Paragraph>
            LudenLab, Luden Eğitim Danışmanlık Organizasyon ve Ticaret Limited Şirketi tarafından geliştirilen
            dijital eğitim platformudur. Dil, konuşma ve işitme alanlarında çalışan özel eğitim uzmanlarına yönelik
            yapay zeka destekli öğrenme materyali üretim hizmeti sunmaktadır.
          </Paragraph>
          <Paragraph>
            &ldquo;Oyunla keşfet, teknolojiyle geliştir.&rdquo; vizyonuyla yola çıkan LudenLab, MEB Talim Terbiye
            Kurulu müfredatına uygun, öğrenci profiline özel eğitim materyalleri üretilmesini sağlar. Platform,
            uzmanların materyal hazırlama süresini minimize ederek daha fazla zamanı doğrudan öğrenciyle çalışmaya
            ayırmasını hedeflemektedir.
          </Paragraph>

          {/* Neden LudenLab */}
          <h3
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--poster-ink)",
              marginTop: 32,
              marginBottom: 16,
            }}
          >
            Neden LudenLab?
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
              marginBottom: 32,
            }}
          >
            {WHY_ITEMS.map((item) => (
              <PCard key={item.title} color="var(--poster-bg-2)" rounded={14} style={{ padding: 16 }}>
                <PBadge color="accent" style={{ marginBottom: 10 }}>
                  {item.badge}
                </PBadge>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "var(--poster-ink)",
                    margin: "0 0 4px",
                    lineHeight: 1.3,
                  }}
                >
                  {item.title}
                </p>
                <p style={{ fontSize: 13, color: "var(--poster-ink-2)", lineHeight: 1.55, margin: 0 }}>
                  {item.desc}
                </p>
              </PCard>
            ))}
          </div>

          {/* Homo Ludens */}
          <h3
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--poster-ink)",
              marginBottom: 16,
            }}
          >
            Homo Ludens Felsefesi
          </h3>
          <PSection tone="warning">
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              LudenLab ismindeki &ldquo;Luden&rdquo;, Johan Huizinga&apos;nın &ldquo;Homo Ludens&rdquo; (Oynayan İnsan)
              kavramından esinlenmektedir. Öğrenmenin oyun ve keşif yoluyla gerçekleştiğine inanan bu felsefeyi dijital
              eğitim araçlarına taşımak, platformun temel amacıdır.
            </p>
          </PSection>
        </section>

        {/* Bölüm 2: Şirket Bilgileri */}
        <section style={{ marginBottom: 48 }}>
          <SectionTitle>Şirket Bilgileri</SectionTitle>
          <PCard rounded={16} style={{ padding: "20px 22px" }}>
            <dl style={{ display: "flex", flexDirection: "column", gap: 12, margin: 0 }}>
              {COMPANY_INFO.map(([label, value], i) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    paddingTop: i === 0 ? 0 : 12,
                    borderTop: i === 0 ? "none" : "1px dashed var(--poster-ink-faint)",
                  }}
                >
                  <dt
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: ".05em",
                      color: "var(--poster-ink-3)",
                      flexShrink: 0,
                      minWidth: 150,
                    }}
                  >
                    {label}
                  </dt>
                  <dd style={{ fontSize: 13, color: "var(--poster-ink)", margin: 0, lineHeight: 1.5, flex: 1, minWidth: 200 }}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </PCard>
        </section>

        {/* Bölüm 3: İletişim */}
        <section>
          <SectionTitle>İletişim</SectionTitle>
          <Paragraph>
            LudenLab hakkında soru, öneri ve iş birliği talepleriniz için bizimle iletişime geçebilirsiniz.
          </Paragraph>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {CONTACT_ITEMS.map((item) => (
              <PCard key={item.label} rounded={14} style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div
                    style={{
                      flexShrink: 0,
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "var(--poster-bg-2)",
                      border: "2px solid var(--poster-ink)",
                      boxShadow: "0 2px 0 var(--poster-ink)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--poster-ink)",
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: ".1em",
                        color: "var(--poster-ink-3)",
                        margin: "0 0 4px",
                      }}
                    >
                      {item.label}
                    </p>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.href.startsWith("http") ? "_blank" : undefined}
                        rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        style={{
                          fontSize: 14,
                          color: "var(--poster-ink)",
                          fontWeight: 600,
                          textDecoration: "none",
                          wordBreak: "break-word",
                        }}
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p style={{ fontSize: 14, color: "var(--poster-ink)", margin: 0, lineHeight: 1.5 }}>
                        {item.value}
                      </p>
                    )}
                  </div>
                </div>
              </PCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 22,
        fontWeight: 800,
        color: "var(--poster-ink)",
        letterSpacing: "-.01em",
        marginBottom: 20,
        paddingBottom: 10,
        borderBottom: "2px solid var(--poster-ink-faint)",
      }}
    >
      {children}
    </h2>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 14.5,
        color: "var(--poster-ink-2)",
        lineHeight: 1.7,
        margin: "0 0 14px",
      }}
    >
      {children}
    </p>
  );
}
