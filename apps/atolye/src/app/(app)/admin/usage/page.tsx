import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Coins, DollarSign, Hash } from "lucide-react";
import { PSection, PStatCard } from "@ludenlab/ui";
import { usageStats } from "@/lib/usage";

export const metadata: Metadata = { title: "Kullanım — Admin" };

const fmtUsd = (n: number) => `$${n.toFixed(4)}`;

export default async function AdminUsagePage() {
  const s = await usageStats(30);
  const maxDay = Math.max(1, ...s.daily.map((d) => d.costUsd));

  return (
    <>
      <Link
        href="/admin"
        style={{ color: "var(--poster-ink-3)", fontSize: "0.9rem", textDecoration: "none" }}
      >
        ← Admin
      </Link>
      <header style={{ margin: "0.75rem 0 1.5rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.3rem" }}>Kullanım</h1>
        <p style={{ color: "var(--poster-ink-2)", margin: 0 }}>
          Son 30 gün — AI üretim adedi ve tahmini maliyet.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          marginBottom: "1.5rem",
        }}
      >
        <PStatCard label="AI çağrısı" value={s.totals.calls} icon={<Activity size={20} aria-hidden />} tint="var(--poster-blue)" />
        <PStatCard label="Tahmini maliyet" value={fmtUsd(s.totals.costUsd)} icon={<DollarSign size={20} aria-hidden />} tint="var(--poster-green)" />
        <PStatCard label="Kredi (tahmini)" value={s.totals.credits} icon={<Coins size={20} aria-hidden />} tint="var(--poster-accent)" />
        <PStatCard label="Token" value={(s.totals.inputTokens + s.totals.outputTokens).toLocaleString("tr-TR")} icon={<Hash size={20} aria-hidden />} tint="var(--poster-yellow)" />
      </section>

      <PSection title="Günlük maliyet">
        {s.daily.length === 0 ? (
          <p style={{ margin: 0, color: "var(--poster-ink-3)" }}>Henüz kullanım kaydı yok.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {s.daily.map((d) => (
              <div key={d.date} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.82rem" }}>
                <span style={{ width: 52, color: "var(--poster-ink-3)" }}>{d.date.slice(5)}</span>
                <div style={{ flex: 1, height: 10, background: "var(--poster-ink-faint)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${(d.costUsd / maxDay) * 100}%`, height: "100%", background: "var(--poster-accent)" }} />
                </div>
                <span style={{ width: 74, textAlign: "right", fontWeight: 600 }}>{fmtUsd(d.costUsd)}</span>
              </div>
            ))}
          </div>
        )}
      </PSection>

      <div style={{ height: "1rem" }} />

      <PSection title="Modele göre">
        {s.byModel.length === 0 ? (
          <p style={{ margin: 0, color: "var(--poster-ink-3)" }}>—</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--poster-ink-3)" }}>
                  <th style={{ padding: "0.5rem 0.6rem" }}>Model</th>
                  <th style={{ padding: "0.5rem 0.6rem", textAlign: "right" }}>Çağrı</th>
                  <th style={{ padding: "0.5rem 0.6rem", textAlign: "right" }}>Maliyet</th>
                </tr>
              </thead>
              <tbody>
                {s.byModel.map((m) => (
                  <tr key={m.model} style={{ borderTop: "2px solid var(--poster-ink-faint)" }}>
                    <td style={{ padding: "0.5rem 0.6rem", fontFamily: "monospace", fontSize: "0.82rem" }}>{m.model}</td>
                    <td style={{ padding: "0.5rem 0.6rem", textAlign: "right" }}>{m.calls}</td>
                    <td style={{ padding: "0.5rem 0.6rem", textAlign: "right", fontWeight: 600 }}>{fmtUsd(m.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PSection>

      <div style={{ height: "1rem" }} />

      <PSection title="En çok kullanan hesaplar">
        {s.topAccounts.length === 0 ? (
          <p style={{ margin: 0, color: "var(--poster-ink-3)" }}>—</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--poster-ink-3)" }}>
                  <th style={{ padding: "0.5rem 0.6rem" }}>Hesap</th>
                  <th style={{ padding: "0.5rem 0.6rem", textAlign: "right" }}>Çağrı</th>
                  <th style={{ padding: "0.5rem 0.6rem", textAlign: "right" }}>Maliyet</th>
                </tr>
              </thead>
              <tbody>
                {s.topAccounts.map((a) => (
                  <tr key={a.id} style={{ borderTop: "2px solid var(--poster-ink-faint)" }}>
                    <td style={{ padding: "0.5rem 0.6rem" }}>
                      <Link href={`/admin/users/${a.id}`} style={{ color: "var(--poster-accent)", textDecoration: "none" }}>
                        {a.account ? (a.account.name ?? a.account.email) : a.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", textAlign: "right" }}>{a.calls}</td>
                    <td style={{ padding: "0.5rem 0.6rem", textAlign: "right", fontWeight: 600 }}>{fmtUsd(a.costUsd)}</td>
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
