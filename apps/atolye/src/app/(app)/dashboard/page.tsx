import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, FolderHeart, Sparkles } from "lucide-react";
import { PBadge, PCard, PSection, PStatCard } from "@ludenlab/ui";
import { auth } from "@/auth";
import { dashboardData } from "@/lib/cases";
import { docTypeLabel } from "@/lib/doc-types";
import { KADEME, type Kademe } from "@/lib/bep";

export const metadata: Metadata = { title: "Panel — LudenLab Atölye" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const { caseCount, docCount, recentCases, recentDocs, byType } = await dashboardData(
    session.user.id,
  );
  const isEmpty = caseCount === 0 && docCount === 0;
  const maxType = Math.max(1, ...byType.map((t) => t._count._all));

  return (
    <>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.2rem" }}>Panel</h1>
          <p style={{ color: "var(--poster-ink-2)", margin: 0 }}>
            Hoş geldin{session.user.name ? `, ${session.user.name}` : ""}.
          </p>
        </div>
        <Link className="p-btn p-btn--accent p-btn--md" href="/araclar">
          <Sparkles size={18} aria-hidden /> Taslak üret
        </Link>
      </header>

      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          marginBottom: "1.5rem",
        }}
      >
        <PStatCard
          label="Vaka"
          value={caseCount}
          icon={<FolderHeart size={22} aria-hidden />}
          tint="var(--poster-yellow)"
        />
        <PStatCard
          label="Üretilen taslak"
          value={docCount}
          icon={<FileText size={22} aria-hidden />}
          tint="var(--poster-accent)"
        />
      </section>

      {isEmpty ? (
        <PCard style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 520 }}>
          <strong style={{ fontSize: "1.1rem" }}>Başlayalım 👋</strong>
          <p style={{ color: "var(--poster-ink-2)", margin: 0 }}>
            Henüz taslak üretmedin. Bir araç seç, çocuğun profilini gir ve ilk taslağını “Vakaya
            kaydet” ile sakla.
          </p>
          <Link className="p-btn p-btn--accent p-btn--md" href="/araclar" style={{ alignSelf: "flex-start" }}>
            İlk taslağını üret →
          </Link>
        </PCard>
      ) : (
        <section
          className="poster-tool-grid"
          style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)" }}
        >
          <PSection
            title="Son üretilen taslaklar"
            action={
              <Link href="/vakalarim" style={{ color: "var(--poster-accent)", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
                Tümü →
              </Link>
            }
          >
            {recentDocs.length === 0 ? (
              <p style={{ color: "var(--poster-ink-3)", margin: 0 }}>Henüz taslak yok.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {recentDocs.map((d) => (
                  <Link
                    key={d.id}
                    href={`/vakalarim/${d.case.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      padding: "0.6rem 0.75rem",
                      border: "var(--poster-border)",
                      borderRadius: "var(--poster-radius-md)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span style={{ display: "flex", flexDirection: "column", gap: "0.15rem", minWidth: 0 }}>
                      <strong style={{ fontSize: "0.95rem" }}>{docTypeLabel(d.type)}</strong>
                      <span style={{ fontSize: "0.8rem", color: "var(--poster-ink-3)" }}>{d.case.code}</span>
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "var(--poster-ink-3)", whiteSpace: "nowrap" }}>
                      {d.createdAt.toLocaleDateString("tr-TR")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </PSection>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <PSection title="Tür dağılımı">
              {byType.length === 0 ? (
                <p style={{ color: "var(--poster-ink-3)", margin: 0 }}>—</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {byType.map((t) => (
                    <div key={t.type} style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      <span style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span>{docTypeLabel(t.type)}</span>
                        <strong>{t._count._all}</strong>
                      </span>
                      <span style={{ height: 8, background: "var(--poster-ink-faint)", borderRadius: 999 }}>
                        <span
                          style={{
                            display: "block",
                            height: "100%",
                            width: `${(t._count._all / maxType) * 100}%`,
                            background: "var(--poster-accent)",
                            borderRadius: 999,
                          }}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </PSection>

            <PSection
              title="Son vakalar"
              action={
                <Link href="/vakalarim" style={{ color: "var(--poster-accent)", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
                  Tümü →
                </Link>
              }
            >
              {recentCases.length === 0 ? (
                <p style={{ color: "var(--poster-ink-3)", margin: 0 }}>Henüz vaka yok.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {recentCases.map((c) => (
                    <Link
                      key={c.id}
                      href={`/vakalarim/${c.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        padding: "0.5rem 0.7rem",
                        border: "var(--poster-border)",
                        borderRadius: "var(--poster-radius-md)",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <strong style={{ fontSize: "0.9rem" }}>{c.code}</strong>
                        <span style={{ fontSize: "0.75rem", color: "var(--poster-ink-3)" }}>
                          {KADEME[c.kademe as Kademe] ?? c.kademe}
                        </span>
                      </span>
                      <PBadge tone="blue">{c._count.documents}</PBadge>
                    </Link>
                  ))}
                </div>
              )}
            </PSection>
          </div>
        </section>
      )}
    </>
  );
}
