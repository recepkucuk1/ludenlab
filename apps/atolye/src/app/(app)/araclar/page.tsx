import type { Metadata } from "next";
import Link from "next/link";
import { PCard } from "@ludenlab/ui";

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

export default function AraclarPage() {
  return (
    <>
      <header style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.4rem" }}>Araçlar</h1>
        <p style={{ color: "var(--poster-ink-2)", margin: 0 }}>
          MEB destek eğitim çerçevesine hizalı taslak üreteçleri. Çocuk adı yerine kod/rumuz.
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
    </>
  );
}
