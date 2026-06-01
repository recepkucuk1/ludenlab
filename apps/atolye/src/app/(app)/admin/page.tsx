import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, FileText, FolderHeart, Users } from "lucide-react";
import { PBadge, PSection, PStatCard } from "@ludenlab/ui";
import { adminStats, listAccounts } from "@/lib/admin";

export const metadata: Metadata = { title: "Admin — LudenLab Atölye" };

export default async function AdminPage() {
  const [stats, accounts] = await Promise.all([adminStats(), listAccounts()]);

  return (
    <>
      <header
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.3rem" }}>Admin</h1>
          <p style={{ color: "var(--poster-ink-2)", margin: 0 }}>Sistem geneli özet ve hesaplar.</p>
        </div>
        <Link className="p-btn p-btn--ghost p-btn--sm" href="/admin/audit">
          Denetim kaydı →
        </Link>
      </header>

      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          marginBottom: "1.5rem",
        }}
      >
        <PStatCard label="Hesap" value={stats.accounts} icon={<Users size={22} aria-hidden />} tint="var(--poster-blue)" />
        <PStatCard label="Vaka" value={stats.cases} icon={<FolderHeart size={22} aria-hidden />} tint="var(--poster-yellow)" />
        <PStatCard label="Taslak" value={stats.docs} icon={<FileText size={22} aria-hidden />} tint="var(--poster-accent)" />
        <PStatCard label="Seans" value={stats.sessions} icon={<CalendarClock size={22} aria-hidden />} tint="var(--poster-green)" />
      </section>

      <PSection title={`Hesaplar (${accounts.length})`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--poster-ink-3)" }}>
                <th style={{ padding: "0.5rem 0.6rem" }}>E-posta</th>
                <th style={{ padding: "0.5rem 0.6rem" }}>Ad</th>
                <th style={{ padding: "0.5rem 0.6rem" }}>Rol</th>
                <th style={{ padding: "0.5rem 0.6rem" }}>Vaka</th>
                <th style={{ padding: "0.5rem 0.6rem" }}>Kayıt</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} style={{ borderTop: "2px solid var(--poster-ink-faint)" }}>
                  <td style={{ padding: "0.5rem 0.6rem" }}>
                    <Link href={`/admin/users/${a.id}`} style={{ color: "var(--poster-accent)", fontWeight: 600, textDecoration: "none" }}>
                      {a.email}
                    </Link>
                  </td>
                  <td style={{ padding: "0.5rem 0.6rem" }}>{a.name ?? "—"}</td>
                  <td style={{ padding: "0.5rem 0.6rem" }}>
                    <PBadge tone={a.role === "admin" ? "accent" : "default"}>{a.role}</PBadge>
                  </td>
                  <td style={{ padding: "0.5rem 0.6rem" }}>{a._count.cases}</td>
                  <td style={{ padding: "0.5rem 0.6rem", color: "var(--poster-ink-3)" }}>
                    {a.createdAt.toLocaleDateString("tr-TR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PSection>
    </>
  );
}
