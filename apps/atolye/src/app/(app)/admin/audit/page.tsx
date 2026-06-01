import type { Metadata } from "next";
import Link from "next/link";
import { PSection } from "@ludenlab/ui";
import { auditLabel, listAudit } from "@/lib/audit";

export const metadata: Metadata = { title: "Denetim kaydı — Admin" };

export default async function AdminAuditPage() {
  const rows = await listAudit(150);

  return (
    <>
      <Link
        href="/admin"
        style={{ color: "var(--poster-ink-3)", fontSize: "0.9rem", textDecoration: "none" }}
      >
        ← Admin
      </Link>
      <header style={{ margin: "0.75rem 0 1.5rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.3rem" }}>Denetim kaydı</h1>
        <p style={{ color: "var(--poster-ink-2)", margin: 0 }}>Son yönetsel işlemler (en yeni üstte).</p>
      </header>

      <PSection title={`Kayıtlar (${rows.length})`}>
        {rows.length === 0 ? (
          <p style={{ margin: 0, color: "var(--poster-ink-3)" }}>Henüz işlem kaydı yok.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--poster-ink-3)" }}>
                  <th style={{ padding: "0.5rem 0.6rem" }}>Zaman</th>
                  <th style={{ padding: "0.5rem 0.6rem" }}>İşlem</th>
                  <th style={{ padding: "0.5rem 0.6rem" }}>Aktör</th>
                  <th style={{ padding: "0.5rem 0.6rem" }}>Hedef</th>
                  <th style={{ padding: "0.5rem 0.6rem" }}>Ayrıntı</th>
                  <th style={{ padding: "0.5rem 0.6rem" }}>IP</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: "2px solid var(--poster-ink-faint)" }}>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--poster-ink-3)", whiteSpace: "nowrap" }}>
                      {r.createdAt.toLocaleString("tr-TR")}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", fontWeight: 600 }}>{auditLabel(r.action)}</td>
                    <td style={{ padding: "0.5rem 0.6rem" }}>
                      {r.actor ? (r.actor.name ?? r.actor.email) : "Sistem"}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--poster-ink-3)" }}>
                      {r.targetType}:{r.targetId.slice(0, 8)}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--poster-ink-3)", fontFamily: "monospace", fontSize: "0.78rem" }}>
                      {r.diff ? JSON.stringify(r.diff) : "—"}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--poster-ink-3)" }}>{r.ip ?? "—"}</td>
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
