"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Search, Filter, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  PBtn,
  PCard,
  PBadge,
  PInput,
  PSelect,
  PSpinner,
  PEmptyState,
  PStatCard,
} from "@/components/poster";
import { AdminNav } from "@/components/admin/AdminNav";

type Status = "received" | "processed" | "failed";

interface WebhookRow {
  id: string;
  provider: string;
  externalId: string;
  status: Status;
  attempts: number;
  payload: unknown;
  error: string | null;
  receivedAt: string;
  processedAt: string | null;
}

interface ApiResponse {
  rows: WebhookRow[];
  nextCursor: string | null;
  total: number;
  providers: string[];
  counts30d: Record<string, number>;
}

const STATUS_COLOR: Record<Status, "blue" | "accent" | "pink"> = {
  received: "blue",
  processed: "accent",
  failed: "pink",
};

const STATUS_LABEL: Record<Status, string> = {
  received: "Alındı",
  processed: "İşlendi",
  failed: "Hata",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "var(--poster-ink-3)",
  fontFamily: "var(--font-display)",
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

function fmt(d: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  return `${formatDate(date, "short")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function eventTypeFromPayload(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "iyziEventType" in payload) {
    const v = (payload as Record<string, unknown>).iyziEventType;
    return typeof v === "string" ? v : null;
  }
  return null;
}

export default function AdminWebhooksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [rows, setRows] = useState<WebhookRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [providers, setProviders] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ received: 0, processed: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filtreler
  const [provider, setProvider] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | Status>("");
  const [externalId, setExternalId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [take, setTake] = useState(50);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const buildQuery = useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams();
      if (provider) params.set("provider", provider);
      if (statusFilter) params.set("status", statusFilter);
      if (externalId) params.set("externalId", externalId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("take", String(take));
      if (cursor) params.set("cursor", cursor);
      return params.toString();
    },
    [provider, statusFilter, externalId, from, to, take],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/webhooks?${buildQuery()}`);
      const data: ApiResponse = await res.json();
      setRows(data.rows);
      setNextCursor(data.nextCursor);
      setTotal(data.total);
      setProviders(data.providers);
      setCounts(data.counts30d);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/admin/webhooks?${buildQuery(nextCursor)}`);
      const data: ApiResponse = await res.json();
      setRows((prev) => [...prev, ...data.rows]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [buildQuery, nextCursor]);

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

  if (status === "loading" || (loading && rows.length === 0)) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <PSpinner size={40} />
      </div>
    );
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setProvider("");
    setStatusFilter("");
    setExternalId("");
    setFrom("");
    setTo("");
  }

  const hasActiveFilter = !!(provider || statusFilter || externalId || from || to);

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
            Webhook Teslimleri
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)" }}>
            iyzico ve diğer sağlayıcılardan gelen webhook olaylarını izleyin.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <PBtn onClick={() => load()} variant="white" size="md">
            <RefreshCw style={{ width: 14, height: 14, marginRight: 6 }} />
            Yenile
          </PBtn>
          <AdminNav current="/admin/webhooks" />
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
        <PStatCard size="small" label="Alındı (30g)" value={counts.received ?? 0} valueColor="var(--poster-blue)" countUp={false} noAnimation />
        <PStatCard size="small" label="İşlendi (30g)" value={counts.processed ?? 0} valueColor="var(--poster-accent)" countUp={false} noAnimation />
        <PStatCard
          size="small"
          label="Hata (30g)"
          value={counts.failed ?? 0}
          valueColor={counts.failed > 0 ? "var(--poster-danger)" : "var(--poster-ink-3)"}
          countUp={false}
          noAnimation
        />
        <PStatCard size="small" label="Filtre Sonucu" value={total} sub={`${rows.length} yüklü`} valueColor="var(--poster-ink)" countUp={false} noAnimation />
      </div>

      <PCard rounded={16} style={{ padding: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--poster-ink-3)" }} />
            <PInput
              type="text"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="External ID..."
              style={{ paddingLeft: 36 }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Filter style={{ width: 14, height: 14, color: "var(--poster-ink-3)" }} />
            <PSelect value={provider} onChange={(e) => setProvider(e.target.value)} style={{ width: "auto", minWidth: 130 }}>
              <option value="">Tüm Sağlayıcılar</option>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </PSelect>
          </div>

          <PSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "" | Status)} style={{ width: "auto", minWidth: 140 }}>
            <option value="">Tüm Durumlar</option>
            <option value="received">Alındı</option>
            <option value="processed">İşlendi</option>
            <option value="failed">Hata</option>
          </PSelect>

          <PInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: "auto", minWidth: 140 }} />
          <PInput type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: "auto", minWidth: 140 }} />

          <PSelect value={take} onChange={(e) => setTake(Number(e.target.value))} style={{ width: "auto", minWidth: 110 }}>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </PSelect>

          <PBtn onClick={load} variant="accent" size="md">
            Uygula
          </PBtn>
          {hasActiveFilter && (
            <PBtn onClick={() => { clearFilters(); }} variant="white" size="md">
              Temizle
            </PBtn>
          )}
        </div>
      </PCard>

      <PCard rounded={18} style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-display)" }}>
            <thead>
              <tr>
                <th style={th}>Alınma</th>
                <th style={th}>Sağlayıcı</th>
                <th style={th}>External ID</th>
                <th style={th}>Olay Tipi</th>
                <th style={th}>Durum</th>
                <th style={{ ...th, textAlign: "center" }}>Deneme</th>
                <th style={th}>İşlenme</th>
                <th style={{ ...th, cursor: "default" }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const isExpanded = expanded.has(r.id);
                const eventType = eventTypeFromPayload(r.payload);
                return (
                  <>
                    <tr
                      key={r.id}
                      onClick={() => toggleExpand(r.id)}
                      style={{
                        background: r.status === "failed" ? "rgba(239, 68, 68, 0.05)" : idx % 2 === 0 ? "var(--poster-panel)" : "var(--poster-bg-2)",
                        borderTop: "1.5px dashed var(--poster-ink-faint)",
                        cursor: "pointer",
                      }}
                    >
                      <td style={{ ...td, whiteSpace: "nowrap", color: "var(--poster-ink-2)" }}>{fmt(r.receivedAt)}</td>
                      <td style={td}>
                        <PBadge color="ink">{r.provider}</PBadge>
                      </td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 11, color: "var(--poster-ink-2)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.externalId}
                      </td>
                      <td style={{ ...td, fontSize: 12, color: "var(--poster-ink-2)" }}>{eventType ?? "—"}</td>
                      <td style={td}>
                        <PBadge color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</PBadge>
                      </td>
                      <td style={{ ...td, textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: r.attempts > 1 ? 800 : 600 }}>
                        {r.attempts}
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap", color: "var(--poster-ink-2)" }}>{fmt(r.processedAt)}</td>
                      <td style={{ ...td, textAlign: "right", color: "var(--poster-ink-3)", fontSize: 11, fontWeight: 700 }}>
                        {isExpanded ? "▾" : "▸"}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${r.id}-detail`} style={{ background: "var(--poster-bg-2)", borderTop: "1.5px dashed var(--poster-ink-faint)" }}>
                        <td colSpan={8} style={{ padding: 18 }}>
                          <div style={{ display: "grid", gridTemplateColumns: r.error ? "1fr 1fr" : "1fr", gap: 14 }}>
                            <div>
                              <p style={{ ...sectionLabel, marginBottom: 6 }}>Payload</p>
                              <pre
                                style={{
                                  margin: 0,
                                  padding: 12,
                                  fontSize: 11,
                                  background: "var(--poster-panel)",
                                  border: "1.5px dashed var(--poster-ink-faint)",
                                  borderRadius: 10,
                                  maxHeight: 360,
                                  overflow: "auto",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  color: "var(--poster-ink)",
                                }}
                              >
                                {JSON.stringify(r.payload, null, 2)}
                              </pre>
                            </div>
                            {r.error && (
                              <div>
                                <p style={{ ...sectionLabel, marginBottom: 6, color: "var(--poster-danger)" }}>Hata</p>
                                <pre
                                  style={{
                                    margin: 0,
                                    padding: 12,
                                    fontSize: 11,
                                    background: "rgba(239, 68, 68, 0.06)",
                                    border: "1.5px dashed var(--poster-danger)",
                                    borderRadius: 10,
                                    maxHeight: 360,
                                    overflow: "auto",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    color: "var(--poster-danger)",
                                  }}
                                >
                                  {r.error}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 0 }}>
                    <PEmptyState
                      icon="📭"
                      title={hasActiveFilter ? "Bu filtreye uyan webhook yok" : "Henüz webhook teslimi yok"}
                      subtitle={hasActiveFilter ? "Filtreleri sıfırlayıp tekrar deneyin." : "iyzico veya başka bir sağlayıcıdan webhook gelmeden bu liste boş kalır."}
                      variant="dashed"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {nextCursor && (
          <div style={{ padding: 16, borderTop: "2px solid var(--poster-ink)", background: "var(--poster-bg-2)", textAlign: "center" }}>
            <PBtn onClick={loadMore} disabled={loadingMore} variant="white" size="md">
              {loadingMore ? "Yükleniyor..." : "Daha Fazla Yükle"}
            </PBtn>
          </div>
        )}
      </PCard>
    </div>
  );
}
