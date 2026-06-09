import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Coins, Sparkles } from "lucide-react";
import { PSection, PStatCard } from "@ludenlab/ui";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { listCreditTxns } from "@/lib/credits";
import { planLabel, type PlanType } from "@/lib/plans";
import { PlanSelector } from "./PlanSelector";
import { SubscriptionManager } from "@/components/subscription/SubscriptionManager";
import { centralEntitlement } from "@/lib/central-billing";

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

  // E-posta köprüsü (flag'li): merkezi (apex) abonelik durumunu salt-okuma göster. KAPALI = canlı davranış.
  // Best-effort: merkezi okuma hata verirse (env/bağlantı) sayfayı ÇÖKERTME — kutuyu gizle.
  const centralOn = process.env.NEXT_PUBLIC_CENTRAL_BILLING === "true";
  let central: Awaited<ReturnType<typeof centralEntitlement>> | null = null;
  if (centralOn && session.user.email) {
    try {
      central = await centralEntitlement(session.user.email);
    } catch (e) {
      console.error("[abonelik] merkezi okuma hata:", e instanceof Error ? e.message : String(e));
    }
  }

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

      {central && (
        <div
          style={{
            marginBottom: "1.4rem",
            padding: "0.85rem 1.1rem",
            border: "var(--poster-border)",
            borderRadius: "var(--poster-radius)",
            background: "var(--poster-panel)",
          }}
        >
          <span className="p-small" style={{ fontWeight: 700 }}>Merkezi abonelik (LudenLab):</span>{" "}
          <span className="p-small">
            {central.active ? `Aktif — ${central.status}` : `Yok/pasif — ${central.status}`}
            {central.currentPeriodEnd
              ? ` · dönem sonu ${central.currentPeriodEnd.toLocaleDateString("tr-TR")}`
              : ""}
          </span>
        </div>
      )}

      {showManager && sub && (
        <SubscriptionManager
          status={sub.status as "ACTIVE" | "CANCELED" | "PAST_DUE"}
          planType={sub.plan.type}
          billingCycle={sub.billingCycle}
          currentPeriodEnd={sub.currentPeriodEnd.toISOString()}
        />
      )}

      <PlanSelector current={current} />

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
