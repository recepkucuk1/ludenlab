import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Coins, Sparkles } from "lucide-react";
import { PBadge, PButton, PCard, PSection, PStatCard } from "@ludenlab/ui";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { listCreditTxns } from "@/lib/credits";
import { PLAN_CONFIG, PLAN_KEYS, formatKurus, planLabel, type PlanType } from "@/lib/plans";

export const metadata: Metadata = { title: "Abonelik & Kredi — LudenLab Atölye" };

export default async function AbonelikPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const [acc, txns] = await Promise.all([
    prisma.account.findUnique({
      where: { id: session.user.id },
      select: { planType: true, credits: true },
    }),
    listCreditTxns(session.user.id, 15),
  ]);
  const current = (acc?.planType ?? "FREE") as PlanType;
  const credits = acc?.credits ?? 0;

  return (
    <>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.3rem" }}>Abonelik & Kredi</h1>
        <p style={{ color: "var(--poster-ink-2)", margin: 0 }}>
          Planınız, kredi bakiyeniz ve hareketler. Her araç üretimi krediden düşer; ödeme
          entegrasyonu yakında.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          marginBottom: "1.5rem",
        }}
      >
        <PStatCard label="Mevcut plan" value={planLabel(current)} icon={<Sparkles size={22} aria-hidden />} tint="var(--poster-accent)" />
        <PStatCard label="Kredi bakiyesi" value={credits} icon={<Coins size={22} aria-hidden />} tint="var(--poster-blue)" />
      </section>

      <PSection title="Planlar">
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {PLAN_KEYS.map((k) => {
            const p = PLAN_CONFIG[k];
            const isCurrent = k === current;
            const price =
              p.monthlyKurus > 0 ? `${formatKurus(p.monthlyKurus)}/ay` : k === "FREE" ? "Ücretsiz" : "Özel fiyat";
            return (
              <PCard
                key={k}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  border: isCurrent ? "2px solid var(--poster-accent)" : "var(--poster-border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "1.05rem" }}>{p.label}</strong>
                  {isCurrent && <PBadge tone="accent">Mevcut</PBadge>}
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800 }}>{price}</div>
                <ul style={{ margin: "0.25rem 0 0.5rem", paddingLeft: "1.1rem", color: "var(--poster-ink-2)", fontSize: "0.88rem" }}>
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {isCurrent ? (
                  <span style={{ color: "var(--poster-ink-3)", fontSize: "0.85rem" }}>Aktif plan</span>
                ) : (
                  <PButton size="sm" variant="ghost" disabled>
                    Yakında
                  </PButton>
                )}
              </PCard>
            );
          })}
        </div>
      </PSection>

      <div style={{ height: "1rem" }} />

      <PSection title="Kredi hareketleri">
        {txns.length === 0 ? (
          <p style={{ margin: 0, color: "var(--poster-ink-3)" }}>Henüz kredi hareketi yok.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--poster-ink-3)" }}>
                  <th style={{ padding: "0.5rem 0.6rem" }}>Tarih</th>
                  <th style={{ padding: "0.5rem 0.6rem" }}>Açıklama</th>
                  <th style={{ padding: "0.5rem 0.6rem", textAlign: "right" }}>Kredi</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id} style={{ borderTop: "2px solid var(--poster-ink-faint)" }}>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--poster-ink-3)", whiteSpace: "nowrap" }}>
                      {t.createdAt.toLocaleDateString("tr-TR")}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem" }}>{t.reason}</td>
                    <td
                      style={{
                        padding: "0.5rem 0.6rem",
                        textAlign: "right",
                        fontWeight: 700,
                        color: t.amount >= 0 ? "var(--poster-green)" : "var(--poster-danger)",
                      }}
                    >
                      {t.amount >= 0 ? "+" : ""}
                      {t.amount}
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
