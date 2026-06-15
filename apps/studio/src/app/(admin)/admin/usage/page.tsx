"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
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

interface UsageResponse {
  since: string;
  days: number;
  totals: {
    cost: number;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    cacheHitRate: number;
  };
  daily: Array<{ date: string; cost: number; calls: number }>;
  byEndpoint: Array<{ endpoint: string; cost: number; calls: number }>;
  byModel: Array<{ model: string; cost: number; calls: number }>;
  topUsers: Array<{
    therapistId: string;
    cost: number;
    calls: number;
    therapist: { id: string; name: string; email: string; planType: PlanType } | null;
  }>;
}

const PLAN_COLOR: Record<PlanType, "soft" | "blue" | "accent" | "pink"> = {
  FREE: "soft",
  PRO: "blue",
  ADVANCED: "accent",
  ENTERPRISE: "pink",
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
  padding: "10px 14px",
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

export default function AdminUsagePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/usage?days=${d}`);
      if (res.ok) setData(await res.json());
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
    load(days);
  }, [session, status, router, load, days]);

  const maxDailyCost = useMemo(() => data?.daily.reduce((m, d) => Math.max(m, d.cost), 0) ?? 0, [data]);

  if (status === "loading" || loading || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <PSpinner size={40} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px 48px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "var(--poster-ink)", fontFamily: "var(--font-display)", letterSpacing: "-.02em" }}>
            AI Kullanım & Maliyet
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)" }}>
            Sistem geneli Claude API maliyeti, dağılımı ve en pahalı kullanıcılar. {formatDate(new Date(data.since), "medium")} sonrası.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <PBtn onClick={() => load(days)} variant="white" size="md">
            <RefreshCw style={{ width: 14, height: 14, marginRight: 6 }} />
            Yenile
          </PBtn>
          <AdminNav current="/admin/usage" />
        </div>
      </div>

      <PCard rounded={16} style={{ padding: 14, marginBottom: 18, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
          Pencere
        </span>
        {[7, 14, 30, 60, 90].map((d) => {
          const active = days === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: "2px solid var(--poster-ink)",
                background: active ? "var(--poster-ink)" : "var(--poster-panel)",
                color: active ? "#fff" : "var(--poster-ink)",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                boxShadow: active ? "none" : "var(--poster-shadow-sm)",
              }}
            >
              {d}g
            </button>
          );
        })}
      </PCard>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <PStatCard size="default" label={`Toplam ($, ${days}g)`} value={`$${data.totals.cost.toFixed(4)}`} valueColor="var(--poster-green)" countUp={false} noAnimation />
        <PStatCard size="default" label="Toplam Çağrı" value={data.totals.calls} valueColor="var(--poster-ink)" countUp={false} noAnimation />
        <PStatCard
          size="default"
          label="Cache Hit"
          value={`${(data.totals.cacheHitRate * 100).toFixed(1)}%`}
          sub={`${data.totals.cacheReadTokens.toLocaleString("tr-TR")} okuma`}
          valueColor="var(--poster-blue)"
          countUp={false}
          noAnimation
        />
        <PStatCard
          size="default"
          label="Token (in/out)"
          value={(data.totals.inputTokens + data.totals.cacheWriteTokens).toLocaleString("tr-TR")}
          sub={`${data.totals.outputTokens.toLocaleString("tr-TR")} çıktı`}
          valueColor="var(--poster-accent)"
          countUp={false}
          noAnimation
        />
      </div>

      <PCard rounded={16} style={{ padding: 18, marginBottom: 18 }}>
        <p style={sectionLabel}>Günlük Maliyet Trendi</p>
        {data.daily.length === 0 || maxDailyCost === 0 ? (
          <PEmptyState variant="dashed" size="compact" title="Bu pencerede API kullanımı yok" />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 3,
              height: 160,
              padding: "0 4px",
              borderLeft: "2px solid var(--poster-ink-faint)",
              borderBottom: "2px solid var(--poster-ink-faint)",
            }}
          >
            {data.daily.map((d) => {
              const pct = maxDailyCost > 0 ? d.cost / maxDailyCost : 0;
              return (
                <div
                  key={d.date}
                  title={`${d.date} · $${d.cost.toFixed(4)} · ${d.calls} çağrı`}
                  style={{
                    flex: 1,
                    minWidth: 4,
                    height: `${Math.max(pct * 100, 1)}%`,
                    background: pct > 0.7 ? "var(--poster-danger)" : pct > 0.4 ? "var(--poster-accent)" : "var(--poster-green)",
                    border: "1.5px solid var(--poster-ink)",
                    borderRadius: "4px 4px 0 0",
                    cursor: "help",
                  }}
                />
              );
            })}
          </div>
        )}
        <p style={{ margin: "10px 0 0", fontSize: 11, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
          Bara hover ederek günlük maliyet ve çağrı sayısı görüntülenir. Renkler: yeşil (düşük) · turuncu (orta) · kırmızı (peak).
        </p>
      </PCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14, marginBottom: 18 }}>
        <PCard rounded={16} style={{ padding: 18 }}>
          <p style={sectionLabel}>Endpoint Dağılımı</p>
          {data.byEndpoint.length === 0 ? (
            <PEmptyState variant="dashed" size="compact" title="—" />
          ) : (
            <BreakdownList rows={data.byEndpoint.map((e) => ({ label: e.endpoint, cost: e.cost, calls: e.calls }))} totalCost={data.totals.cost} />
          )}
        </PCard>

        <PCard rounded={16} style={{ padding: 18 }}>
          <p style={sectionLabel}>Model Dağılımı</p>
          {data.byModel.length === 0 ? (
            <PEmptyState variant="dashed" size="compact" title="—" />
          ) : (
            <BreakdownList rows={data.byModel.map((m) => ({ label: m.model, cost: m.cost, calls: m.calls }))} totalCost={data.totals.cost} />
          )}
        </PCard>
      </div>

      <PCard rounded={18} style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "2px solid var(--poster-ink)", background: "var(--poster-bg-2)" }}>
          <p style={{ ...sectionLabel, marginBottom: 0 }}>Top 10 Maliyetli Kullanıcı</p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
            FREE planda yüksek maliyet = istismar sinyali; PRO+ planda yüksek maliyet doğal kullanım.
          </p>
        </div>
        {data.topUsers.length === 0 ? (
          <PEmptyState variant="dashed" title="Bu dönemde API kullanımı yok" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "center" }}>#</th>
                  <th style={th}>Kullanıcı</th>
                  <th style={th}>Plan</th>
                  <th style={{ ...th, textAlign: "right" }}>Maliyet ($)</th>
                  <th style={{ ...th, textAlign: "right" }}>Çağrı</th>
                </tr>
              </thead>
              <tbody>
                {data.topUsers.map((u, idx) => {
                  const t = u.therapist;
                  const isFree = t?.planType === "FREE";
                  return (
                    <tr key={u.therapistId} style={{ background: isFree && u.cost > 0.5 ? "rgba(239, 68, 68, 0.05)" : idx % 2 === 0 ? "var(--poster-panel)" : "var(--poster-bg-2)", borderTop: "1.5px dashed var(--poster-ink-faint)" }}>
                      <td style={{ ...td, textAlign: "center", fontWeight: 800, color: "var(--poster-ink-3)", fontVariantNumeric: "tabular-nums" }}>{idx + 1}</td>
                      <td style={td}>
                        {t ? (
                          <>
                            <Link
                              href={`/admin/users/${t.id}`}
                              style={{
                                color: "var(--poster-ink)",
                                fontWeight: 700,
                                textDecoration: "none",
                                borderBottom: "1.5px dashed var(--poster-ink-faint)",
                              }}
                            >
                              {t.name}
                            </Link>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--poster-ink-3)" }}>{t.email}</p>
                          </>
                        ) : (
                          <code style={{ fontSize: 11, color: "var(--poster-ink-3)" }}>{u.therapistId.slice(0, 12)}…</code>
                        )}
                      </td>
                      <td style={td}>
                        {t && <PBadge color={PLAN_COLOR[t.planType]}>{t.planType}</PBadge>}
                      </td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: isFree && u.cost > 0.5 ? "var(--poster-danger)" : "var(--poster-ink)" }}>
                        ${u.cost.toFixed(4)}
                      </td>
                      <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{u.calls}</td>
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

function BreakdownList({ rows, totalCost }: { rows: Array<{ label: string; cost: number; calls: number }>; totalCost: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r) => {
        const pct = totalCost > 0 ? (r.cost / totalCost) * 100 : 0;
        return (
          <div key={r.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontFamily: "var(--font-display)", fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: "var(--poster-ink)" }}>{r.label}</span>
              <span style={{ color: "var(--poster-ink-3)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                ${r.cost.toFixed(4)} · {r.calls}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "var(--poster-bg-2)", border: "1.5px solid var(--poster-ink-faint)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "var(--poster-accent)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
