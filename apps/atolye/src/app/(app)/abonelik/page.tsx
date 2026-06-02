import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Coins, Sparkles } from "lucide-react";
import { PBadge, PCard, PSection, PStatCard } from "@ludenlab/ui";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { listCreditTxns } from "@/lib/credits";
import { PLAN_CONFIG, PLAN_KEYS, formatKurus, planLabel, type PlanType } from "@/lib/plans";
import { CheckoutButton } from "./CheckoutButton";
import { SubscriptionManager } from "@/components/subscription/SubscriptionManager";

export const metadata: Metadata = { title: "Abonelik & Kredi — LudenLab Atölye" };

export default async function AbonelikPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const [acc, txns, sub] = await Promise.all([
    prisma.account.findUnique({
      where: { id: session.user.id },
      select: { planType: true, credits: true },
    }),
    listCreditTxns(session.user.id, 15),
    prisma.subscription.findFirst({
      where: { accountId: session.user.id, status: { in: ["ACTIVE", "CANCELED", "PAST_DUE"] } },
      orderBy: { createdAt: "desc" },
      select: { status: true, billingCycle: true, currentPeriodEnd: true, plan: { select: { type: true } } },
    }),
  ]);
  const current = (acc?.planType ?? "FREE") as PlanType;
  const credits = acc?.credits ?? 0;
  // Yönetim kartını yalnız "canlı" abonelik için göster (iptal edilip dönemi de geçmişse gizle).
  const showManager = sub && (sub.status !== "CANCELED" || sub.currentPeriodEnd.getTime() > Date.now());

  return (
    <>
      <header style={{ marginBottom: "1.6rem" }}>
        <span className="p-eyebrow">PLAN · KREDİ</span>
        <h1 className="p-h1" style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.3rem)", margin: "8px 0 0.4rem" }}>
          Abonelik &amp; Kredi
        </h1>
        <p className="p-body" style={{ margin: 0, maxWidth: 560 }}>
          Planınız, kredi bakiyeniz ve hareketler. Her araç üretimi krediden düşer.
          Daha fazla kredi için planınızı yükseltin.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          marginBottom: "1.8rem",
        }}
      >
        <PStatCard label="Mevcut plan" value={planLabel(current)} icon={<Sparkles size={22} aria-hidden />} tint="var(--poster-accent)" />
        <PStatCard label="Kredi bakiyesi" value={credits} icon={<Coins size={22} aria-hidden />} tint="var(--poster-blue)" />
      </section>

      {showManager && sub && (
        <SubscriptionManager
          status={sub.status as "ACTIVE" | "CANCELED" | "PAST_DUE"}
          planType={sub.plan.type}
          billingCycle={sub.billingCycle}
          currentPeriodEnd={sub.currentPeriodEnd.toISOString()}
        />
      )}

      <section style={{ marginBottom: "1.8rem" }}>
        <span className="p-eyebrow">PLANLAR</span>
        <h2 className="p-h3" style={{ fontSize: 19, margin: "6px 0 14px" }}>Sana uygun olanı seç</h2>
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
                  gap: "0.65rem",
                  border: isCurrent ? "2px solid var(--poster-accent)" : "var(--poster-border)",
                  boxShadow: isCurrent ? "var(--shadow-accent)" : undefined,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                  <span
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      border: "var(--poster-border)",
                      boxShadow: "0 2px 0 var(--poster-ink)",
                      background: "var(--poster-bg)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 24,
                      flexShrink: 0,
                    }}
                    aria-hidden
                  >
                    {k === "FREE" ? "🌱" : k === "ENTERPRISE" ? "🏢" : "⚡"}
                  </span>
                  {isCurrent && <PBadge tone="accent">Mevcut</PBadge>}
                </div>
                <div className="p-h4" style={{ fontSize: "1.05rem" }}>{p.label}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 800, color: "var(--poster-ink)" }}>{price}</div>
                <ul style={{ margin: "0.1rem 0 0.4rem", paddingLeft: "1.1rem", color: "var(--poster-ink-2)", fontSize: "0.88rem", lineHeight: 1.5 }}>
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <CheckoutButton plan={k} isCurrent={isCurrent} />
              </PCard>
            );
          })}
        </div>
      </section>

      <PSection title="Kredi hareketleri">
        {txns.length === 0 ? (
          <p className="p-small" style={{ margin: 0 }}>Henüz kredi hareketi yok.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--poster-ink-3)" }}>
                  <th style={{ padding: "0.5rem 0.6rem", fontWeight: 700 }}>Tarih</th>
                  <th style={{ padding: "0.5rem 0.6rem", fontWeight: 700 }}>Açıklama</th>
                  <th style={{ padding: "0.5rem 0.6rem", textAlign: "right", fontWeight: 700 }}>Kredi</th>
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
