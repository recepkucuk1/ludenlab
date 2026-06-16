import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, FileText, FolderHeart, Users } from "lucide-react";
import { PBadge, PSection, PStatCard } from "@ludenlab/ui";
import { adminStats, listAccounts } from "@atolye/lib/admin";

export const metadata: Metadata = { title: "Admin — LudenLab Atölye" };

const AVATAR = [
  "var(--poster-green)",
  "var(--poster-yellow)",
  "var(--poster-pink)",
  "var(--poster-blue)",
  "var(--poster-accent)",
];
const avatarColor = (id: string) =>
  AVATAR[[...id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR.length];
const initials = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default async function AdminPage() {
  const [stats, accounts] = await Promise.all([adminStats(), listAccounts()]);

  return (
    <>
      <header
        style={{
          marginBottom: "1.6rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <span className="p-eyebrow">SİSTEM YÖNETİMİ</span>
          <h1 className="p-h2" style={{ margin: "8px 0 0.3rem" }}>
            Admin
          </h1>
          <p className="p-body" style={{ margin: 0 }}>
            Sistem geneli özet ve hesaplar.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link className="p-btn p-btn--ghost p-btn--sm" href="/admin/usage">
            Kullanım →
          </Link>
          <Link className="p-btn p-btn--white p-btn--sm" href="/admin/audit">
            Denetim kaydı →
          </Link>
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          marginBottom: "1.8rem",
        }}
      >
        <PStatCard label="Hesap" value={stats.accounts} icon={<Users size={20} aria-hidden />} tint="var(--poster-blue)" />
        <PStatCard label="Vaka" value={stats.cases} icon={<FolderHeart size={20} aria-hidden />} tint="var(--poster-yellow)" />
        <PStatCard label="Taslak" value={stats.docs} icon={<FileText size={20} aria-hidden />} tint="var(--poster-accent)" />
        <PStatCard label="Seans" value={stats.sessions} icon={<CalendarClock size={20} aria-hidden />} tint="var(--poster-green)" />
      </section>

      <PSection title={`Hesaplar (${accounts.length})`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {accounts.map((a) => {
            const col = avatarColor(a.id);
            return (
              <div
                key={a.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr auto auto auto",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 16px",
                  background: "var(--poster-panel)",
                  border: "var(--poster-border)",
                  borderRadius: 14,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    flexShrink: 0,
                    background: col,
                    color: col === "var(--poster-yellow)" ? "var(--poster-ink)" : "#fff",
                    border: "var(--poster-border)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                  aria-hidden
                >
                  {initials(a.name ?? a.email)}
                </span>
                <span style={{ minWidth: 0 }}>
                  <Link
                    href={`/admin/users/${a.id}`}
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: "var(--poster-ink)",
                      textDecoration: "none",
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.name ?? "—"}
                  </Link>
                  <span
                    className="p-small"
                    style={{
                      display: "block",
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.email}
                  </span>
                </span>
                <PBadge tone={a.role === "admin" ? "accent" : "default"}>{a.role}</PBadge>
                <PBadge tone="blue">{a._count.cases} vaka</PBadge>
                <span className="p-mono" style={{ whiteSpace: "nowrap" }}>
                  {a.createdAt.toLocaleDateString("tr-TR")}
                </span>
              </div>
            );
          })}
        </div>
      </PSection>
    </>
  );
}
