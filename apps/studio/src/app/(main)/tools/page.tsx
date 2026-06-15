"use client";

import { useState } from "react";
import Link from "next/link";
import { Wand2, ClipboardList, Gamepad2, Sparkles } from "lucide-react";
import { PBadge, PTabs, PHoverPanel } from "@/components/poster";

interface ToolItem {
  title: string;
  href: string;
  desc: string;
  active: boolean;
}

type SectionColor = "blue" | "accent" | "yellow";

interface ToolSection {
  title: string;
  Icon: React.ElementType;
  color: SectionColor;
  items: ToolItem[];
}

const SECTION_COLOR_HEX: Record<SectionColor, string> = {
  blue: "var(--poster-blue)",
  accent: "var(--poster-accent)",
  yellow: "var(--poster-yellow)",
};

const SECTIONS: ToolSection[] = [
  {
    title: "Üretici",
    Icon: Wand2,
    color: "blue",
    items: [
      { title: "Öğrenme Kartı", href: "/generate", desc: "Müfredat hedefine uygun öğrenme kartları", active: true },
      { title: "Sosyal Hikaye", href: "/tools/social-story", desc: "Carol Gray formatında sosyal hikayeler", active: true },
      { title: "Artikülasyon Alıştırması", href: "/tools/articulation", desc: "Hedef ses bazlı alıştırma kartları", active: true },
      { title: "Ev Ödevi Materyali", href: "/tools/homework", desc: "Veli yönlendirmeli ev egzersizleri", active: true },
    ],
  },
  {
    title: "Organizatör",
    Icon: ClipboardList,
    color: "accent",
    items: [
      { title: "Haftalık Çalışma Planı", href: "/tools/weekly-plan", desc: "Öğrenci bazlı haftalık ders planı", active: true },
      { title: "Hedef Takip Tablosu", href: "/tools/goal-tracker", desc: "BEP hedeflerini görselleştirin", active: true },
      { title: "Oturum Özeti", href: "/tools/session-summary", desc: "Ders sonrası yapılandırılmış not", active: true },
    ],
  },
  {
    title: "Aktiviteler",
    Icon: Gamepad2,
    color: "yellow",
    items: [
      { title: "Kelime Eşleştirme", href: "/tools/matching-game", desc: "Kelime-tanım eşleştirme kartları", active: true },
      { title: "Sesletim", href: "/tools/phonation", desc: "Oyunlaştırılmış ses çalışmaları", active: true },
      { title: "İletişim Panosu", href: "/tools/comm-board", desc: "Görsel iletişim panoları", active: true },
    ],
  },
];

const TAB_VALUES = ["all", ...SECTIONS.map((s) => s.title.toLowerCase())];

function ToolCard({ item, section }: { item: ToolItem; section: ToolSection }) {
  const color = SECTION_COLOR_HEX[section.color];
  const { Icon } = section;

  const content = (
    <PHoverPanel
      disabled={!item.active}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 18,
        opacity: item.active ? 1 : 0.55,
        cursor: item.active ? "pointer" : "not-allowed",
        height: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: 12,
            background: color,
            border: "2px solid var(--poster-ink)",
            boxShadow: "0 3px 0 var(--poster-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--poster-ink)",
          }}
        >
          <Icon style={{ width: 22, height: 22 }} strokeWidth={2.25} />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--poster-ink)", letterSpacing: "-.01em", margin: 0 }}>
              {item.title}
            </h3>
            {!item.active && <PBadge color="soft">Yakında</PBadge>}
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--poster-ink-2)", margin: 0 }}>{item.desc}</p>
        </div>
      </div>
    </PHoverPanel>
  );

  if (!item.active) return content;
  return (
    <Link href={item.href} style={{ textDecoration: "none", display: "block" }}>
      {content}
    </Link>
  );
}

export default function ToolsPage() {
  const [tab, setTab] = useState<string>("all");

  const filteredSections = SECTIONS.filter((s) => tab === "all" || s.title.toLowerCase() === tab);
  void TAB_VALUES;

  return (
    <div
      className="poster-scope"
      style={{
        minHeight: "100%",
        background: "var(--poster-bg)",
        padding: "clamp(16px, 4vw, 24px) clamp(16px, 4vw, 24px) clamp(32px, 6vw, 48px)",
        fontFamily: "var(--font-display)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              marginBottom: 10,
              borderRadius: 999,
              background: "var(--poster-accent)",
              border: "2px solid var(--poster-ink)",
              boxShadow: "0 3px 0 var(--poster-ink)",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "#fff",
            }}
          >
            <Sparkles style={{ width: 12, height: 12 }} />
            Devamlı Gelişen Koleksiyon
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "var(--poster-ink)",
              letterSpacing: "-.02em",
              margin: 0,
            }}
          >
            Terapist Araçları
          </h1>
          <p style={{ marginTop: 4, fontSize: 14, color: "var(--poster-ink-2)", maxWidth: 560 }}>
            Seanslarınızı daha verimli hale getirin. Materyal üretin, plan yapın ve izleyin.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: 24 }}>
          <PTabs value={tab} onValueChange={setTab}>
            <PTabs.List>
              <PTabs.Trigger value="all">Tümü</PTabs.Trigger>
              {SECTIONS.map((s) => (
                <PTabs.Trigger key={s.title} value={s.title.toLowerCase()}>
                  {s.title}
                </PTabs.Trigger>
              ))}
            </PTabs.List>
          </PTabs>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {filteredSections.map((section) => {
            const color = SECTION_COLOR_HEX[section.color];
            return (
              <div key={section.title}>
                {tab === "all" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: color,
                        border: "2px solid var(--poster-ink)",
                        boxShadow: "0 2px 0 var(--poster-ink)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--poster-ink)",
                      }}
                    >
                      <section.Icon style={{ width: 16, height: 16 }} strokeWidth={2.5} />
                    </div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--poster-ink)", letterSpacing: "-.01em", margin: 0 }}>
                      {section.title}
                    </h2>
                  </div>
                )}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: 14,
                  }}
                >
                  {section.items.map((item) => (
                    <ToolCard key={item.title} item={item} section={section} />
                  ))}
                </div>
              </div>
            );
          })}

          {filteredSections.length === 0 && (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  margin: "0 auto 16px",
                  borderRadius: 18,
                  background: "var(--poster-bg-2)",
                  border: "2px solid var(--poster-ink)",
                  boxShadow: "0 4px 0 var(--poster-ink)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--poster-ink-2)",
                }}
              >
                <Wand2 style={{ width: 28, height: 28 }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--poster-ink)", margin: 0 }}>
                Bu kategoride henüz araç yok
              </h3>
              <p style={{ marginTop: 4, fontSize: 14, color: "var(--poster-ink-2)" }}>
                Yakında yeni materyaller eklenecektir.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
