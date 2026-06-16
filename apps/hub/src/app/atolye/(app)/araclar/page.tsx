import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Araçlar — LudenLab Atölye" };

const CATEGORIZED_TOOLS = [
  {
    category: "BEP & Değerlendirme Süreçleri",
    desc: "Resmî raporlar, hedefler ve yasal uyarlamalar için asistanlar.",
    items: [
      {
        name: "BEP & Rapor Asistanı",
        href: "/araclar/bep",
        emoji: "📝",
        desc: "Çocuğun profilinden alan bazında ölçülebilir BEP hedef taslağı üretir.",
      },
      {
        name: "Bireysel Uyarlama Önericisi",
        href: "/araclar/uyarlama",
        emoji: "🛠️",
        desc: "Tanı profiline ve ortama göre sınıf-içi uyarlama listesi (gerekçeli).",
      },
      {
        name: "İlerleme İzleme Çizelgesi",
        href: "/araclar/ilerleme-cizelgesi",
        emoji: "📈",
        desc: "Ölçülebilir bir hedefi izlemeye hazır, doldurulacak veri çizelgesine böler.",
      },
    ],
  },
  {
    category: "Seans & Müdahale Materyalleri",
    desc: "Birebir seans planlamaları ve çok duyulu öğrenme içerikleri.",
    items: [
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
    ],
  },
  {
    category: "Sosyal & Davranışsal Destek",
    desc: "DEHB ve özel gereksinimli çocuklarda davranış ve duygu düzenleme.",
    items: [
      {
        name: "DEHB Davranış Destek Planı",
        href: "/araclar/davranis",
        emoji: "🎯",
        desc: "ABC analizi, yerine koyma davranışı ve pekiştirme planı taslağı.",
      },
      {
        name: "Sosyal Öykü Üreteci",
        href: "/araclar/sosyal-oyku",
        emoji: "💬",
        desc: "Günlük durumlar için kısa, somut, duygu-düzenleme odaklı sosyal öykü.",
      },
    ],
  },
  {
    category: "Veli & Ev Koordinasyonu",
    desc: "Ev-okul-klinik üçgenini güçlendiren paylaşımlar ve ödevler.",
    items: [
      {
        name: "Veli/Ev Destek Mektubu",
        href: "/araclar/veli-mektubu",
        emoji: "💌",
        desc: "Aileye sıcak, damgalamayan, somut ev önerileri içeren mektup taslağı.",
      },
      {
        name: "Ev Ödevi Programı",
        href: "/araclar/ev-odevi",
        emoji: "🏡",
        desc: "Özel öğrenme güçlüğü odaklı, 3-5-7 günlük oyunlaştırılmış ev programı.",
      },
    ],
  },
];

export default function AraclarPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .tool-link {
          transition: transform 0.08s ease, box-shadow 0.08s ease;
        }
        .tool-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 0 var(--poster-ink) !important;
        }
      `}} />

      <header style={{ marginBottom: "1.75rem" }}>
        <span className="p-eyebrow">11 ARAÇ · UZMAN YARDIMCISI</span>
        <h1 className="p-h2" style={{ margin: "6px 0 0.5rem", fontSize: "28px" }}>Araçlar</h1>
        <p className="p-body" style={{ margin: 0, fontSize: "0.95rem", color: "var(--poster-ink-2)" }}>
          MEB destek eğitim çerçevesine hizalı, süreç odaklı taslak üreteçleri.
        </p>
      </header>

      <div style={{
        display: "grid",
        gap: "1.5rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
      }}>
        {CATEGORIZED_TOOLS.map((cat) => (
          <div
            key={cat.category}
            className="p-card"
            style={{
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.2rem",
              background: "var(--poster-panel)",
            }}
          >
            <div>
              <h2 className="p-h4" style={{ fontSize: 18, marginBottom: "0.25rem", color: "var(--poster-ink)" }}>
                {cat.category}
              </h2>
              <p className="p-small" style={{ color: "var(--poster-ink-3)", margin: 0, fontSize: "0.8rem", lineHeight: 1.4 }}>
                {cat.desc}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {cat.items.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className="tool-link"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.85rem",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    textDecoration: "none",
                    color: "inherit",
                    background: "var(--poster-bg)",
                    border: "var(--poster-border)",
                    boxShadow: "0 2px 0 var(--poster-ink)",
                  }}
                >
                  <span style={{ fontSize: "1.6rem", flexShrink: 0 }} aria-hidden>
                    {t.emoji}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, gap: "2px" }}>
                    <span style={{ fontSize: "14.5px", fontWeight: 700, lineHeight: 1.25 }}>{t.name}</span>
                    <span
                      style={{
                        fontSize: "11.5px",
                        color: "var(--poster-ink-3)",
                        lineHeight: 1.35,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {t.desc}
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--poster-ink-3)", marginLeft: "auto", flexShrink: 0 }} aria-hidden>
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}


