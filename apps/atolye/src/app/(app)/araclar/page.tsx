import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Araçlar — LudenLab Atölye" };

const TOOLS = [
  {
    name: "BEP & Rapor Asistanı",
    href: "/araclar/bep",
    emoji: "📝",
    desc: "Çocuğun profilinden alan bazında ölçülebilir BEP hedef taslağı üretir.",
  },
  {
    name: "Seans Planı Üreteci",
    href: "/araclar/seans-plani",
    emoji: "🗓️",
    desc: "Bir seansın hedefinden ısınma → ana etkinlik → tekrar → kapanış akışlı plan üretir.",
  },
  {
    name: "Çok Duyulu Materyal Üreteci",
    href: "/araclar/materyal",
    emoji: "🧩",
    desc: "Öğrencinin güçlük profiline ve kademesine göre çalışma yaprağı/etkinlik taslağı.",
  },
  {
    name: "DEHB Davranış Destek Planı",
    href: "/araclar/davranis",
    emoji: "🎯",
    desc: "ABC analizi, yerine koyma davranışı ve pekiştirme planı taslağı.",
  },
  {
    name: "Okuma-Akıcılık Seti",
    href: "/araclar/okuma",
    emoji: "📖",
    desc: "Disleksi için seviyeli okuma parçası, hece çalışması ve akıcılık egzersizleri.",
  },
  {
    name: "Matematik Destek Seti",
    href: "/araclar/matematik",
    emoji: "🔢",
    desc: "Diskalkuli için somut→soyut (CRA) ilerlemeli etkinlik ve hata analizi.",
  },
  {
    name: "Sosyal Öykü Üreteci",
    href: "/araclar/sosyal-oyku",
    emoji: "💬",
    desc: "Günlük durumlar için kısa, somut, duygu-düzenleme odaklı sosyal öykü.",
  },
  {
    name: "Bireysel Uyarlama Önericisi",
    href: "/araclar/uyarlama",
    emoji: "🛠️",
    desc: "Tanı profiline ve ortama göre sınıf-içi uyarlama listesi (gerekçeli).",
  },
  {
    name: "Veli/Ev Destek Mektubu",
    href: "/araclar/veli-mektubu",
    emoji: "💌",
    desc: "Aileye sıcak, damgalamayan, somut ev önerileri içeren mektup taslağı.",
  },
  {
    name: "İlerleme İzleme Çizelgesi",
    href: "/araclar/ilerleme-cizelgesi",
    emoji: "📈",
    desc: "Ölçülebilir bir hedefi izlemeye hazır, doldurulacak veri çizelgesine böler.",
  },
];

const tileStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 14,
  border: "var(--poster-border)",
  boxShadow: "0 2px 0 var(--poster-ink)",
  background: "var(--poster-bg)",
  display: "grid",
  placeItems: "center",
  fontSize: 24,
  flexShrink: 0,
};

export default function AraclarPage() {
  return (
    <>
      <header style={{ marginBottom: "1.75rem" }}>
        <span className="p-eyebrow">10 ARAÇ · TEK YERDEN</span>
        <h1 className="p-h2" style={{ margin: "8px 0 0.5rem" }}>Araçlar</h1>
        <p className="p-body" style={{ margin: 0, maxWidth: 560 }}>
          MEB destek eğitim çerçevesine hizalı taslak üreteçleri. Önce öğrencinizi seçin.
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
          <Link
            key={t.href}
            href={t.href}
            className="p-card p-card--hover"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              padding: 18,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <span style={tileStyle} aria-hidden>
              {t.emoji}
            </span>
            <h2 className="p-h4" style={{ fontSize: 16 }}>{t.name}</h2>
            <p className="p-small" style={{ flex: 1, margin: 0 }}>{t.desc}</p>
            <span className="p-link" aria-hidden>Aç →</span>
          </Link>
        ))}
      </section>
    </>
  );
}
