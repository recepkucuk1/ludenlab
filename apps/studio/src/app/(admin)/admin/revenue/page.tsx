"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  PBtn,
  PCard,
  PBadge,
  PSpinner,
  PEmptyState,
  PStatCard,
} from "@/components/poster";
import { AdminNav } from "@/components/admin/AdminNav";

type PlanType = "FREE" | "PRO" | "ADVANCED" | "ENTERPRISE";
type BillingCycle = "MONTHLY" | "YEARLY";

interface RenewalRow {
  id: string;
  currentPeriodEnd: string;
  billingCycle: BillingCycle;
  iyzicoSubscriptionRef: string | null;
  plan: PlanType;
  therapist: { id: string; name: string; email: string; planType: PlanType };
}

interface RevenueResponse {
  since: string;
  summary: {
    mrrCents: number;
    arrCents: number;
    activeSubs: number;
    churn30: number;
    churn90: number;
    churnRate30: number;
  };
  planBreakdown: Record<string, { count: number; mrrCents: number }>;
  renewals: RenewalRow[];
}

const PLAN_COLOR: Record<PlanType, "soft" | "blue" | "accent" | "pink"> = {
  FREE: "soft",
  PRO: "blue",
  ADVANCED: "accent",
  ENTERPRISE: "pink",
};

const PLAN_LABEL: Record<PlanType, string> = {
  FREE: "Free",
  PRO: "Pro",
  ADVANCED: "Advanced",
  ENTERPRISE: "Enterprise",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "var(--poster-ink-3)",
  fontFamily: "var(--font-display)",
  marginBottom: 10,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "var(--poster-ink-2)",
  whiteSpace: "nowrap",
  borderBottom: "2px solid var(--poster-ink)",
  background: "var(--poster-bg-2)",
  fontFamily: "var(--font-display)",
};

const td: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 13,
  fontFamily: "var(--font-display)",
  color: "var(--poster-ink)",
};

function formatTRY(cents: number): string {
  // Kuruş değil "kuruş cinsinden TL fiyat" → 100 ile bölüp formatla
  const tl = Math.round(cents / 100);
  return tl.toLocaleString("tr-TR") + " ₺";
}

function fmtDate(d: string) {
  return formatDate(new Date(d), "short");
}

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export default function AdminRevenuePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData] = useState<RevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/revenue");
      if (res.ok) {
        const j: RevenueResponse = await res.json();
        setData(j);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.replace("/login");
      return;
    }
    if (session.user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    load();
  }, [session, status, router, load]);

  if (status === "loading" || loading || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <PSpinner size={40} />
      </div>
    );
  }

  const planEntries = (Object.entries(data.planBreakdown) as [PlanType, { count: number; mrrCents: number }][])
    .filter(([type]) => type !== "FREE" && type !== "ENTERPRISE")
    .sort((a, b) => b[1].mrrCents - a[1].mrrCents);
  const maxPlanMrr = planEntries.reduce((m, [, v]) => Math.max(m, v.mrrCents), 0);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px 48px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              color: "var(--poster-ink)",
              fontFamily: "var(--font-display)",
              letterSpacing: "-.02em",
            }}
          >
            Gelir & Yenileme
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)" }}>
            Aktif abonelik geliri, churn metrikleri ve önümüzdeki 30 günde vade dolan abonelikler.
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)", fontWeight: 700 }}>
            Veriler {formatDate(new Date(data.since), "medium")} tarihinden itibaren toplanıyor.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <PBtn onClick={load} variant="white" size="md">
            <RefreshCw style={{ width: 14, height: 14, marginRight: 6 }} />
            Yenile
          </PBtn>
          <AdminNav current="/admin/revenue" />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <PStatCard
          size="default"
          label="MRR"
          value={formatTRY(data.summary.mrrCents)}
          sub={`${data.summary.activeSubs} aktif abonelik`}
          valueColor="var(--poster-green)"
          countUp={false}
          noAnimation
        />
        <PStatCard
          size="default"
          label="ARR (Yıllık)"
          value={formatTRY(data.summary.arrCents)}
          valueColor="var(--poster-accent)"
          countUp={false}
          noAnimation
        />
        <PStatCard
          size="default"
          label="Aktif Abonelik"
          value={data.summary.activeSubs}
          valueColor="var(--poster-blue)"
          countUp={false}
          noAnimation
        />
        <PStatCard
          size="default"
          label="30g Churn"
          value={data.summary.churn30}
          sub={`${(data.summary.churnRate30 * 100).toFixed(1)}% oran`}
          valueColor={data.summary.churn30 > 0 ? "var(--poster-pink)" : "var(--poster-ink-3)"}
          countUp={false}
          noAnimation
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) 2fr", gap: 18, marginBottom: 22 }}>
        <PCard rounded={16} style={{ padding: 18 }}>
          <p style={sectionLabel}>Plan Dağılımı (MRR)</p>
          {planEntries.length === 0 ? (
            <PEmptyState variant="dashed" size="compact" title="Aktif ücretli abonelik yok" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {planEntries.map(([type, v]) => {
                const pct = maxPlanMrr > 0 ? (v.mrrCents / maxPlanMrr) * 100 : 0;
                return (
                  <div key={type}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontFamily: "var(--font-display)", fontSize: 12 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <PBadge color={PLAN_COLOR[type]}>{PLAN_LABEL[type]}</PBadge>
                        <span style={{ color: "var(--poster-ink-3)", fontWeight: 700 }}>×{v.count}</span>
                      </span>
                      <span style={{ color: "var(--poster-ink)", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                        {formatTRY(v.mrrCents)}
                      </span>
                    </div>
                    <div style={{ height: 10, borderRadius: 999, background: "var(--poster-bg-2)", border: "1.5px solid var(--poster-ink-faint)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "var(--poster-accent)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p style={{ margin: "14px 0 0", fontSize: 11, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
            Yıllık abonelikler aylık eşdeğere normalize edilir (yıllık fiyat ÷ 12).
          </p>
        </PCard>

        <PCard rounded={16} style={{ padding: 18 }}>
          <p style={sectionLabel}>Churn Özeti</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <PStatCard size="small" label="Son 30 Gün" value={data.summary.churn30} valueColor="var(--poster-pink)" countUp={false} noAnimation />
            <PStatCard size="small" label="Son 90 Gün" value={data.summary.churn90} valueColor="var(--poster-pink)" countUp={false} noAnimation />
            <PStatCard size="small" label="Churn Oranı (30g)" value={`${(data.summary.churnRate30 * 100).toFixed(1)}%`} valueColor="var(--poster-ink)" countUp={false} noAnimation />
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 11, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)", lineHeight: 1.5 }}>
            Hesap: dönem içinde CANCELLED veya EXPIRED&apos;a düşmüş sub sayısı (updatedAt). Manuel override de updatedAt&apos;ı değiştirdiği için yaklaşık değerdir; tam doğruluk için audit-log state-transition&apos;dan hesaplanmalı.
          </p>
        </PCard>
      </div>

      <PCard rounded={18} style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "2px solid var(--poster-ink)", background: "var(--poster-bg-2)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <p style={{ ...sectionLabel, marginBottom: 0 }}>
              <AlertTriangle style={{ width: 12, height: 12, display: "inline-block", marginRight: 4, verticalAlign: -1 }} />
              Renewal Risk — Önümüzdeki 30 Gün
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
              ACTIVE durumdaki abonelikler. iyzico cycle&apos;ında otomatik yenilenmeleri gerekir; webhook gelmezse manuel müdahale gerekebilir.
            </p>
          </div>
          <PBadge color={data.renewals.length > 0 ? "pink" : "soft"}>{data.renewals.length} sub</PBadge>
        </div>

        {data.renewals.length === 0 ? (
          <PEmptyState
            variant="dashed"
            title="Önümüzdeki 30 günde vade dolan abonelik yok"
            subtitle="iyzico cycle bu pencere için sakin görünüyor."
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-display)" }}>
              <thead>
                <tr>
                  <th style={th}>Bitiş</th>
                  <th style={{ ...th, textAlign: "center" }}>Kalan Gün</th>
                  <th style={th}>Kullanıcı</th>
                  <th style={th}>Plan</th>
                  <th style={th}>Fatura</th>
                  <th style={th}>iyzico Sub Ref</th>
                </tr>
              </thead>
              <tbody>
                {data.renewals.map((r, idx) => {
                  const days = daysUntil(r.currentPeriodEnd);
                  const urgent = days <= 3;
                  return (
                    <tr
                      key={r.id}
                      style={{
                        background: urgent ? "rgba(239, 68, 68, 0.06)" : idx % 2 === 0 ? "var(--poster-panel)" : "var(--poster-bg-2)",
                        borderTop: "1.5px dashed var(--poster-ink-faint)",
                      }}
                    >
                      <td style={{ ...td, whiteSpace: "nowrap", fontWeight: 700 }}>{fmtDate(r.currentPeriodEnd)}</td>
                      <td style={{ ...td, textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 8,
                            background: urgent ? "var(--poster-danger)" : "var(--poster-bg-2)",
                            color: urgent ? "#fff" : "var(--poster-ink-2)",
                            border: `1.5px solid ${urgent ? "var(--poster-danger)" : "var(--poster-ink-faint)"}`,
                            fontWeight: 800,
                            fontVariantNumeric: "tabular-nums",
                            fontSize: 12,
                          }}
                        >
                          {days}g
                        </span>
                      </td>
                      <td style={td}>
                        <Link
                          href={`/admin/users/${r.therapist.id}`}
                          style={{
                            color: "var(--poster-ink)",
                            fontWeight: 700,
                            textDecoration: "none",
                            borderBottom: "1.5px dashed var(--poster-ink-faint)",
                          }}
                        >
                          {r.therapist.name}
                        </Link>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--poster-ink-3)" }}>{r.therapist.email}</p>
                      </td>
                      <td style={td}>
                        <PBadge color={PLAN_COLOR[r.plan]}>{PLAN_LABEL[r.plan]}</PBadge>
                      </td>
                      <td style={td}>{r.billingCycle === "MONTHLY" ? "Aylık" : "Yıllık"}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 11, color: "var(--poster-ink-3)" }}>
                        {r.iyzicoSubscriptionRef ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PCard>
    </div>
  );
}
