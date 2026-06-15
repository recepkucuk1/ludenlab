"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users,
  CheckCircle2,
  LayoutGrid,
  Flame,
  User,
  Package,
  Sparkles,
  Plus,
  CalendarDays,
  Clock,
} from "lucide-react";
import {
  DIFFICULTY_LABEL,
  CATEGORY_META,
  getDifficultyBadge,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  PBtn,
  PCard,
  PBadge,
  PProgress,
  PSpinner,
  PStatCard,
} from "@/components/poster";
import type { BadgeColor } from "@/components/poster";

function relativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Az önce";
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} saat önce`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Dün";
  if (diffD < 7) return `${diffD} gün önce`;
  return formatDate(d, "short");
}

interface DashboardStats {
  students: number;
  cards: number;
  byCategory: Record<string, number>;
}

interface WeeklyStats {
  studentsWorked: number;
  goalsCompleted: number;
  cardsCreated: number;
  streak: number;
}

interface RecentCard {
  id: string;
  title: string;
  category: string | null;
  difficulty: string;
  createdAt: string;
  student: { id: string; name: string } | null;
}

interface RecentStudent {
  id: string;
  name: string;
  workArea: string;
  createdAt: string;
  cardCount: number;
}


function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <PCard rounded={18} style={{ padding: 20, boxShadow: "var(--poster-shadow-lg)", ...style }}>
      {children}
    </PCard>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyStats | null>(null);
  const [recentCards, setRecentCards] = useState<RecentCard[]>([]);
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, weekRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/stats/weekly"),
        ]);
        const [dashData, weekData] = await Promise.all([dashRes.json(), weekRes.json()]);
        if (!dashRes.ok) throw new Error(dashData.error);
        setStats(dashData.stats);
        setRecentCards(dashData.recentCards);
        setRecentStudents(dashData.recentStudents);
        if (weekRes.ok) setWeekly(weekData);
      } catch (err) {
        console.error("Dashboard yüklenemedi:", err);
        toast.error("Veriler yüklenemedi, sayfayı yenileyin");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="poster-scope" style={{ flex: 1 }}>
        <PSpinner fullPanel label="Yükleniyor…" style={{ minHeight: "70vh" }} />
      </div>
    );
  }

  const isEmpty = (stats?.students ?? 0) === 0 && (stats?.cards ?? 0) === 0;
  const KNOWN_CATEGORIES = new Set(Object.keys(CATEGORY_META));
  const categoryEntries = Object.entries(stats?.byCategory ?? {}).filter(
    ([key, v]) => v > 0 && KNOWN_CATEGORIES.has(key),
  );
  const totalCategoryItems = categoryEntries.reduce((s, [, v]) => s + v, 0);

  const statCards: Array<{ Icon: React.ElementType; label: string; value: number; sub: string; tint: string; suffix?: string }> = [
    { Icon: Users,        label: "Toplam Öğrenci",     value: stats?.students ?? 0,        sub: `Bu hafta ${weekly?.studentsWorked ?? 0} aktif öğrenci`,    tint: "var(--poster-yellow)" },
    { Icon: LayoutGrid,   label: "Toplam Kart",        value: stats?.cards ?? 0,           sub: `Bu hafta ${weekly?.cardsCreated ?? 0} yeni kart`,          tint: "var(--poster-accent)" },
    { Icon: CheckCircle2, label: "Tamamlanan Hedef",   value: weekly?.goalsCompleted ?? 0, sub: "Bu hafta genel değerlendirme",                              tint: "var(--poster-green)" },
    { Icon: Flame,        label: "Günlük Seri",        value: weekly?.streak ?? 0,         sub: "Çalışmaya devam et!",                                       tint: "var(--poster-pink)",  suffix: "gün" },
  ];

  return (
    <div
      className="poster-scope"
      style={{
        flex: 1,
        background: "var(--poster-bg)",
        padding: "clamp(16px, 4vw, 24px) clamp(16px, 4vw, 24px) clamp(32px, 6vw, 48px)",
        fontFamily: "var(--font-display)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <div>
            <h1 style={{ fontSize: "clamp(22px, 5.5vw, 32px)", fontWeight: 700, color: "var(--poster-ink)", letterSpacing: "-.02em", margin: 0 }}>
              Genel Bakış
            </h1>
            <p style={{ marginTop: 4, fontSize: 14, color: "var(--poster-ink-2)" }}>
              LudenLab paneline hoş geldiniz
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PBtn as="a" href="/generate" variant="accent" size="md" icon={<Plus size={16} />}>
              Yeni Kart Üret
            </PBtn>
            <Link
              href="/profile"
              aria-label="Profil"
              style={{
                width: 44,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--poster-panel)",
                border: "2px solid var(--poster-ink)",
                borderRadius: 12,
                boxShadow: "0 3px 0 var(--poster-ink)",
                color: "var(--poster-ink)",
              }}
            >
              <User style={{ width: 20, height: 20 }} />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {statCards.map((c, i) => (
          <PStatCard
            key={c.label}
            icon={<c.Icon style={{ width: 20, height: 20 }} strokeWidth={2.25} />}
            label={c.label}
            value={c.value}
            suffix={c.suffix}
            sub={c.sub}
            tint={c.tint}
            delay={i * 0.06}
          />
        ))}
      </div>

      {/* Content grid */}
      <div
        className="poster-tool-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
          gap: 20,
        }}
      >
        {/* Left column — recent cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Panel style={{ maxHeight: 560, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--poster-ink)", margin: 0 }}>Son Üretilen Kartlar</h3>
              <Link href="/cards" style={{ fontSize: 13, fontWeight: 700, color: "var(--poster-accent)", textDecoration: "none" }}>
                Tümünü gör
              </Link>
            </div>

            {recentCards.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 0", textAlign: "center" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: "var(--poster-accent)",
                    border: "2px solid var(--poster-ink)",
                    boxShadow: "0 3px 0 var(--poster-ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                    color: "#fff",
                  }}
                >
                  <Package style={{ width: 26, height: 26 }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--poster-ink)", margin: 0 }}>Henüz kart üretilmedi</p>
                <p style={{ fontSize: 12, color: "var(--poster-ink-2)", margin: "4px 0 16px" }}>AI ile saniyeler içinde ilk kartınızı oluşturun</p>
                <PBtn as="a" href="/generate" variant="accent" size="sm" icon={<Sparkles size={14} />}>
                  İlk Kartı Üret
                </PBtn>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", paddingRight: 4, flex: 1 }}>
                {recentCards.map((card) => {
                  const catMeta = card.category ? CATEGORY_META[card.category] : null;
                  const diffColor: BadgeColor = getDifficultyBadge(card.difficulty);
                  return (
                    <Link
                      key={card.id}
                      href={`/cards/${card.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "2px solid transparent",
                        textDecoration: "none",
                        transition: "background .12s, border-color .12s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--poster-bg-2)";
                        e.currentTarget.style.borderColor = "var(--poster-ink)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          flexShrink: 0,
                          borderRadius: 10,
                          background: catMeta?.cssVar ?? "var(--poster-ink-faint)",
                          border: "2px solid var(--poster-ink)",
                          boxShadow: "0 2px 0 var(--poster-ink)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--poster-ink)",
                        }}
                      >
                        <Package style={{ width: 18, height: 18 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--poster-ink)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {card.title}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", marginTop: 4 }}>
                          {catMeta && (
                            <PBadge color={catMeta.badge}>{catMeta.label}</PBadge>
                          )}
                          <PBadge color={diffColor}>
                            {DIFFICULTY_LABEL[card.difficulty] ?? card.difficulty}
                          </PBadge>
                          {card.student && (
                            <span style={{ fontSize: 11, color: "var(--poster-ink-2)", fontWeight: 600, marginLeft: 2 }}>
                              {card.student.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--poster-ink-3)", fontWeight: 600, whiteSpace: "nowrap" }}>
                        <Clock style={{ width: 12, height: 12 }} />
                        {relativeTime(card.createdAt)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>
        </motion.div>

        {/* Right column */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          {/* Onboarding */}
          {isEmpty && (
            <Panel style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--poster-ink)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  borderBottom: "2px solid var(--poster-ink)",
                }}
              >
                <Sparkles style={{ width: 14, height: 14, color: "var(--poster-accent)" }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Başlangıç Adımları</span>
                <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.7 }}>1/3</span>
              </div>
              <div>
                {[
                  { done: true, label: "Hesap oluştur", href: "" },
                  { done: (stats?.students ?? 0) > 0, label: "Öğrenci ekle", href: "/students" },
                  { done: (stats?.cards ?? 0) > 0, label: "Kart üret", href: "/generate" },
                ].map((step, i, arr) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 16px",
                      borderTop: i === 0 ? "none" : "1px dashed var(--poster-ink-faint)",
                      borderBottom: i === arr.length - 1 ? "none" : undefined,
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        flexShrink: 0,
                        borderRadius: 999,
                        border: "2px solid var(--poster-ink)",
                        background: step.done ? "var(--poster-green)" : "var(--poster-panel)",
                        color: step.done ? "#fff" : "var(--poster-ink-2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {step.done ? "✓" : i + 1}
                    </div>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: step.done ? 500 : 700,
                        color: step.done ? "var(--poster-ink-3)" : "var(--poster-ink)",
                        textDecoration: step.done ? "line-through" : "none",
                      }}
                    >
                      {step.label}
                    </span>
                    {!step.done && step.href && (
                      <Link href={step.href} style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-accent)", textDecoration: "none" }}>
                        Başla →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* Category distribution */}
          <Panel>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--poster-ink)", margin: "0 0 16px" }}>
              Alan Dağılımı
            </h3>
            {categoryEntries.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--poster-ink-3)", textAlign: "center", padding: "12px 0", margin: 0 }}>Henüz veri yok</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {categoryEntries.map(([key, value]) => {
                  const meta = CATEGORY_META[key] ?? { label: key, cssVar: "var(--poster-ink-faint)", badge: "soft" as BadgeColor };
                  const pct = totalCategoryItems > 0 ? (value / totalCategoryItems) * 100 : 0;
                  return (
                    <div key={key}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--poster-ink)" }}>
                          <span style={{ width: 10, height: 10, borderRadius: 999, background: meta.cssVar, border: "1.5px solid var(--poster-ink)" }} />
                          {meta.label}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--poster-ink)" }}>{value}</span>
                      </div>
                      <PProgress value={pct} color={meta.cssVar} />
                    </div>
                  );
                })}
                <div style={{ paddingTop: 8, borderTop: "1px dashed var(--poster-ink-faint)", display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--poster-ink-3)" }}>
                  <span>Toplam</span>
                  <span style={{ fontWeight: 800, color: "var(--poster-ink)" }}>{totalCategoryItems} kart</span>
                </div>
              </div>
            )}
          </Panel>

          {/* Today */}
          <Panel>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--poster-ink)", margin: 0 }}>Bugün</h3>
              <Link href="/calendar" style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-accent)", textDecoration: "none" }}>
                Takvim
              </Link>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 12,
                background: "var(--poster-bg-2)",
                border: "2px solid var(--poster-ink)",
                boxShadow: "0 3px 0 var(--poster-ink)",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: 10,
                  background: "var(--poster-panel)",
                  border: "2px solid var(--poster-ink)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--poster-ink)",
                }}
              >
                <CalendarDays style={{ width: 20, height: 20 }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--poster-ink)", margin: 0 }}>
                  {formatDate(new Date(), "long")}
                </p>
                <p style={{ fontSize: 11, color: "var(--poster-ink-2)", margin: "2px 0 0" }}>
                  {weekly?.studentsWorked ?? 0} aktif öğrenci · {weekly?.cardsCreated ?? 0} kart üretildi
                </p>
              </div>
            </div>
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Link
                href="/generate"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "2px solid var(--poster-ink)",
                  boxShadow: "0 2px 0 var(--poster-ink)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--poster-ink)",
                  background: "var(--poster-panel)",
                  textDecoration: "none",
                }}
              >
                <Sparkles style={{ width: 14, height: 14 }} />
                Kart Üret
              </Link>
              <Link
                href="/students"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "2px solid var(--poster-ink)",
                  boxShadow: "0 2px 0 var(--poster-ink)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--poster-ink)",
                  background: "var(--poster-panel)",
                  textDecoration: "none",
                }}
              >
                <Users style={{ width: 14, height: 14 }} />
                Öğrenciler
              </Link>
            </div>
          </Panel>

          {/* Recent students */}
          <Panel>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--poster-ink)", margin: 0 }}>Yeni Öğrenciler</h3>
              <Link href="/students" style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-accent)", textDecoration: "none" }}>
                Tümü
              </Link>
            </div>
            {recentStudents.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0" }}>
                <p style={{ fontSize: 13, color: "var(--poster-ink-3)", textAlign: "center", margin: "0 0 10px" }}>Henüz öğrenci eklenmedi</p>
                <PBtn as="a" href="/students" variant="accent" size="sm" icon={<Plus size={14} />}>
                  Öğrenci Ekle
                </PBtn>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {recentStudents.slice(0, 4).map((student) => (
                  <Link
                    key={student.id}
                    href={`/students/${student.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: 10,
                      textDecoration: "none",
                      border: "2px solid transparent",
                      transition: "background .1s, border-color .1s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--poster-bg-2)";
                      e.currentTarget.style.borderColor = "var(--poster-ink)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "";
                      e.currentTarget.style.borderColor = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          flexShrink: 0,
                          borderRadius: 10,
                          background: "var(--poster-yellow)",
                          border: "2px solid var(--poster-ink)",
                          boxShadow: "0 2px 0 var(--poster-ink)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: 13,
                          color: "var(--poster-ink)",
                        }}
                      >
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--poster-ink)" }}>
                        {student.name}
                      </span>
                    </div>
                    <PBadge color="soft">{student.cardCount} kart</PBadge>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </motion.div>
      </div>

    </div>
  );
}

// Re-use PCard in future if decorative rotations are needed; kept import for consistency.
void PCard;
