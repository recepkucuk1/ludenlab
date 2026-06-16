import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, FileText, FolderHeart } from "lucide-react";
import { PBadge, PSection, PStatCard } from "@ludenlab/ui";
import { auth } from "@/auth";
import { getAccountDetail } from "@atolye/lib/admin";
import { KADEME, type Kademe } from "@atolye/lib/bep";
import { AdminUserActions } from "@atolye/components/AdminUserActions";

export const metadata: Metadata = { title: "Hesap — Admin" };

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, acc] = await Promise.all([auth(), getAccountDetail(id)]);
  if (!acc) notFound();
  const docTotal = acc.cases.reduce((n, c) => n + c._count.documents, 0);

  return (
    <>
      <Link
        href="/admin"
        style={{ color: "var(--poster-ink-3)", fontSize: "0.9rem", textDecoration: "none" }}
      >
        ← Admin
      </Link>
      <header
        style={{
          margin: "0.75rem 0 1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.1rem)", margin: 0 }}>{acc.name ?? acc.email}</h1>
        <PBadge tone={acc.role === "admin" ? "accent" : "default"}>{acc.role}</PBadge>
        {acc.suspended && (
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#fff",
              background: "var(--poster-danger)",
              padding: "0.2rem 0.6rem",
              borderRadius: "var(--poster-radius-pill)",
            }}
          >
            Askıda
          </span>
        )}
        <div style={{ flex: 1 }} />
        <AdminUserActions
          id={acc.id}
          role={acc.role}
          suspended={acc.suspended}
          isSelf={acc.id === session?.user?.id}
        />
      </header>

      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          marginBottom: "1.5rem",
        }}
      >
        <PStatCard label="Öğrenci" value={acc._count.cases} icon={<FolderHeart size={20} aria-hidden />} tint="var(--poster-yellow)" />
        <PStatCard label="Taslak" value={docTotal} icon={<FileText size={20} aria-hidden />} tint="var(--poster-accent)" />
        <PStatCard label="Seans" value={acc._count.sessions} icon={<CalendarClock size={20} aria-hidden />} tint="var(--poster-green)" />
      </section>

      <PSection title="Hesap bilgisi">
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "0.4rem 1rem",
            margin: 0,
            fontSize: "0.92rem",
          }}
        >
          <dt style={{ color: "var(--poster-ink-3)" }}>E-posta</dt>
          <dd style={{ margin: 0 }}>{acc.email}</dd>
          <dt style={{ color: "var(--poster-ink-3)" }}>Ad</dt>
          <dd style={{ margin: 0 }}>{acc.name ?? "—"}</dd>
          <dt style={{ color: "var(--poster-ink-3)" }}>Kayıt</dt>
          <dd style={{ margin: 0 }}>{acc.createdAt.toLocaleString("tr-TR")}</dd>
        </dl>
      </PSection>

      <div style={{ height: "1rem" }} />

      <PSection title={`Öğrenciler (${acc.cases.length})`}>
        {acc.cases.length === 0 ? (
          <p style={{ margin: 0, color: "var(--poster-ink-3)" }}>Bu hesapta öğrenci yok.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--poster-ink-3)" }}>
                  <th style={{ padding: "0.5rem 0.6rem" }}>Ad Soyad</th>
                  <th style={{ padding: "0.5rem 0.6rem" }}>Kademe</th>
                  <th style={{ padding: "0.5rem 0.6rem" }}>Taslak</th>
                  <th style={{ padding: "0.5rem 0.6rem" }}>Güncelleme</th>
                </tr>
              </thead>
              <tbody>
                {acc.cases.map((c) => (
                  <tr key={c.id} style={{ borderTop: "2px solid var(--poster-ink-faint)" }}>
                    <td style={{ padding: "0.5rem 0.6rem" }}>{c.code}</td>
                    <td style={{ padding: "0.5rem 0.6rem" }}>{KADEME[c.kademe as Kademe] ?? c.kademe}</td>
                    <td style={{ padding: "0.5rem 0.6rem" }}>{c._count.documents}</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--poster-ink-3)" }}>
                      {c.updatedAt.toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PSection>
    </>
  );
}
