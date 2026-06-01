import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarClock, Coins, FileText, GraduationCap, Sparkles } from "lucide-react";
import { PBadge, PStatCard } from "@ludenlab/ui";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { dashboardData } from "@/lib/cases";
import { getBalance } from "@/lib/credits";
import { docTypeLabel } from "@/lib/doc-types";
import { KADEME, type Kademe } from "@/lib/bep";

export const metadata: Metadata = { title: "Panel — LudenLab Atölye" };

const AVATAR = [
  "var(--poster-green)",
  "var(--poster-yellow)",
  "var(--poster-pink)",
  "var(--poster-blue)",
  "var(--poster-accent)",
];
const initials = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

const QUICK = [
  { e: "📝", href: "/araclar/bep", t: "BEP hedefi", d: "Ölçülebilir hedef taslağı", badge: "POPÜLER" },
  { e: "🧩", href: "/araclar/materyal", t: "Çok duyulu materyal", d: "Profile göre çalışma yaprağı" },
  { e: "🗓️", href: "/araclar/seans-plani", t: "Seans planı", d: "Akışlı, süre dağılımlı" },
  { e: "📖", href: "/araclar/okuma", t: "Okuma-akıcılık", d: "Disleksi seti", badge: "" },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");
  const uid = session.user.id;

  const [{ caseCount, docCount, recentCases, recentDocs }, credits, sessionCount] = await Promise.all([
    dashboardData(uid),
    getBalance(uid),
    prisma.session.count({ where: { ownerId: uid } }),
  ]);
  const isEmpty = caseCount === 0 && docCount === 0;

  return (
    <>
      {/* Greeting */}
      <header style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between", marginBottom: "1.6rem" }}>
        <div>
          <h1 style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.3rem)", margin: "0 0 0.25rem" }}>
            İyi günler{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="p-body" style={{ margin: 0 }}>
            {caseCount} öğrenci · {docCount} taslak · {sessionCount} seans
          </p>
        </div>
        <Link className="p-btn p-btn--accent p-btn--md" href="/araclar">
          <Sparkles size={18} aria-hidden /> Üret
        </Link>
      </header>

      {/* Stats */}
      <section style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: "1.8rem" }}>
        <PStatCard label="Aktif öğrenci" value={caseCount} icon={<GraduationCap size={20} aria-hidden />} tint="var(--poster-green)" />
        <PStatCard label="Üretilen taslak" value={docCount} icon={<FileText size={20} aria-hidden />} tint="var(--poster-accent)" />
        <PStatCard label="Seans" value={sessionCount} icon={<CalendarClock size={20} aria-hidden />} tint="var(--poster-blue)" />
        <PStatCard label="Kalan kredi" value={credits} icon={<Coins size={20} aria-hidden />} tint="var(--poster-deep-teal)" />
      </section>

      {/* Quick tools */}
      <section style={{ marginBottom: "1.8rem" }}>
        <span className="p-eyebrow">HIZLI ARAÇLAR</span>
        <h2 className="p-h3" style={{ fontSize: 19, margin: "6px 0 14px" }}>Sık kullanılanlar</h2>
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {QUICK.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="p-card p-card--hover"
              style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12, padding: 18, textDecoration: "none", background: "var(--poster-accent)", borderColor: "var(--poster-ink)", color: "#fff" }}
            >
              {q.badge && (
                <span style={{ position: "absolute", top: 12, right: 12, fontSize: 10, fontWeight: 800, background: "var(--poster-ink)", color: "var(--poster-bg)", padding: "3px 8px", borderRadius: 999, letterSpacing: "0.08em" }}>
                  {q.badge}
                </span>
              )}
              <span style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.2)", border: "2px solid #fff", display: "grid", placeItems: "center", fontSize: 22 }}>
                {q.e}
              </span>
              <span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, lineHeight: 1.2, display: "block" }}>{q.t}</span>
                <span style={{ fontSize: 12.5, opacity: 0.92, marginTop: 4, fontWeight: 500, display: "block" }}>{q.d}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {isEmpty ? (
        <div className="p-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 560 }}>
          <strong className="p-h4" style={{ fontSize: "1.15rem" }}>Başlayalım 👋</strong>
          <p className="p-body" style={{ margin: 0 }}>
            Henüz taslak üretmedin. Bir öğrenci ekle, bir araç seç ve ilk taslağını üretip öğrenciye ata.
          </p>
          <Link className="p-btn p-btn--accent p-btn--md" href="/araclar" style={{ alignSelf: "flex-start" }}>
            İlk taslağını üret <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      ) : (
        <>
          {/* Recent students */}
          {recentCases.length > 0 && (
            <section style={{ marginBottom: "1.8rem" }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
                <h2 className="p-h3" style={{ fontSize: 19, margin: 0 }}>Son öğrenciler</h2>
                <Link className="p-link" href="/vakalarim">Tümü →</Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recentCases.map((c, i) => {
                  const col = AVATAR[i % AVATAR.length];
                  return (
                    <div key={c.id} style={{ display: "grid", gridTemplateColumns: "44px 1fr auto auto", alignItems: "center", gap: 14, padding: "12px 16px", background: "var(--poster-panel)", border: "var(--poster-border)", borderRadius: 14, boxShadow: "var(--shadow-sm)" }}>
                      <span style={{ width: 40, height: 40, borderRadius: 999, background: col, color: col === "var(--poster-yellow)" ? "var(--poster-ink)" : "#fff", border: "var(--poster-border)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14 }}>
                        {initials(c.code)}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, display: "block" }}>{c.code}</span>
                        <span className="p-small" style={{ display: "block", marginTop: 2 }}>{KADEME[c.kademe as Kademe] ?? c.kademe}</span>
                      </span>
                      <PBadge tone="blue">{c._count.documents} taslak</PBadge>
                      <Link className="p-btn p-btn--white p-btn--sm" href={`/vakalarim/${c.id}`}>
                        Aç <ArrowRight size={14} aria-hidden />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Recent materials */}
          {recentDocs.length > 0 && (
            <section>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
                <h2 className="p-h3" style={{ fontSize: 19, margin: 0 }}>Son üretilen taslaklar</h2>
                <Link className="p-link" href="/kutuphane">Kütüphane →</Link>
              </div>
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                {recentDocs.map((d) => (
                  <Link key={d.id} href={`/vakalarim/${d.case.id}`} className="p-card p-card--hover" style={{ padding: 18, textDecoration: "none", color: "inherit", display: "block" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <PBadge tone="accent">{docTypeLabel(d.type)}</PBadge>
                      <span className="p-mono">{d.createdAt.toLocaleDateString("tr-TR")}</span>
                    </div>
                    <div className="p-h4" style={{ fontSize: 16, lineHeight: 1.25 }}>{d.case.code}</div>
                    <p className="p-small" style={{ marginTop: 6 }}>~{d.credits} kredi · {d.model.replace("claude-", "")}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
