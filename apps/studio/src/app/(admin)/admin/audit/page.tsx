"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Filter, RefreshCw, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { AUDIT_ACTION_LABEL } from "@/lib/audit-labels";
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

interface AuditRow {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  diff: unknown;
  ip: string | null;
  createdAt: string;
}

interface ApiResponse {
  rows: AuditRow[];
  nextCursor: string | null;
  total: number;
  counts: { last24h: number; last7d: number; all: number };
  actors: Record<string, { name: string; email: string }>;
  distinctActions: string[];
  distinctTargetTypes: string[];
}

function fmt(d: string) {
  const date = new Date(d);
  return `${formatDate(date, "short")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function actionColor(action: string): "soft" | "blue" | "accent" | "pink" | "ink" {
  if (action.startsWith("user.suspend")) return "pink";
  if (action.startsWith("user.unsuspend")) return "accent";
  if (action.startsWith("plan.")) return "blue";
  if (action.startsWith("credits.")) return "accent";
  if (action.startsWith("role.")) return "ink";
  if (action.startsWith("subscription.")) return "blue";
  return "soft";
}

export default function AdminAuditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [actors, setActors] = useState<Record<string, { name: string; email: string }>>({});
  const [distinctActions, setDistinctActions] = useState<string[]>([]);
  const [distinctTargetTypes, setDistinctTargetTypes] = useState<string[]>([]);
  const [counts, setCounts] = useState({ last24h: 0, last7d: 0, all: 0 });
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filtreler
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [targetId, setTargetId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [take, setTake] = useState(50);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const buildQuery = useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams();
      if (actorId) params.set("actorId", actorId);
      if (action) params.set("action", action);
      if (targetType) params.set("targetType", targetType);
      if (targetId) params.set("targetId", targetId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("take", String(take));
      if (cursor) params.set("cursor", cursor);
      return params.toString();
    },
    [actorId, action, targetType, targetId, from, to, take],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit?${buildQuery()}`);
      const data: ApiResponse = await res.json();
      setRows(data.rows);
      setActors(data.actors);
      setDistinctActions(data.distinctActions);
      setDistinctTargetTypes(data.distinctTargetTypes);
      setCounts(data.counts);
      setTotal(data.total);
      setNextCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/admin/audit?${buildQuery(nextCursor)}`);
      const data: ApiResponse = await res.json();
      setRows((prev) => [...prev, ...data.rows]);
      setActors((prev) => ({ ...prev, ...data.actors }));
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

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setActorId("");
    setAction("");
    setTargetType("");
    setTargetId("");
    setFrom("");
    setTo("");
  }

  const hasActiveFilter = !!(actorId || action || targetType || targetId || from || to);

  if (status === "loading" || (loading && rows.length === 0)) {
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
            Denetim Kayıtları
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)" }}>
            Admin eylemleri ve hassas değişiklikler için değiştirilemez log.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <PBtn onClick={load} variant="white" size="md">
            <RefreshCw style={{ width: 14, height: 14, marginRight: 6 }} />
            Yenile
          </PBtn>
          <AdminNav current="/admin/audit" />
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
        <PStatCard size="small" label="Son 24 Saat" value={counts.last24h} valueColor="var(--poster-accent)" countUp={false} noAnimation />
        <PStatCard size="small" label="Son 7 Gün" value={counts.last7d} valueColor="var(--poster-blue)" countUp={false} noAnimation />
        <PStatCard size="small" label="Toplam" value={counts.all} valueColor="var(--poster-ink)" countUp={false} noAnimation />
        <PStatCard size="small" label="Filtre Sonucu" value={total} sub={`${rows.length} yüklü`} valueColor="var(--poster-pink)" countUp={false} noAnimation />
      </div>

      <PCard rounded={16} style={{ padding: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 1 auto" }}>
            <Filter style={{ width: 14, height: 14, color: "var(--poster-ink-3)" }} />
            <PSelect value={action} onChange={(e) => setAction(e.target.value)} style={{ width: "auto", minWidth: 170 }}>
              <option value="">Tüm Eylemler</option>
              {distinctActions.map((a) => (
                <option key={a} value={a}>
                  {AUDIT_ACTION_LABEL[a] ?? a}
                </option>
              ))}
            </PSelect>
          </div>

          <PSelect value={targetType} onChange={(e) => setTargetType(e.target.value)} style={{ width: "auto", minWidth: 150 }}>
            <option value="">Tüm Hedef Tipleri</option>
            {distinctTargetTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </PSelect>

          <div style={{ position: "relative", flex: "1 1 200px", minWidth: 180 }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--poster-ink-3)" }} />
            <PInput
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Hedef ID..."
              style={{ paddingLeft: 36 }}
            />
          </div>

          <div style={{ position: "relative", flex: "1 1 200px", minWidth: 180 }}>
            <PInput
              type="text"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              placeholder='Actor ID (veya "system")...'
            />
          </div>

          <PInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: "auto", minWidth: 140 }} />
          <PInput type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: "auto", minWidth: 140 }} />

          <PSelect value={take} onChange={(e) => setTake(Number(e.target.value))} style={{ width: "auto", minWidth: 100 }}>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </PSelect>

          <PBtn onClick={load} variant="accent" size="md">
            Uygula
          </PBtn>
          {hasActiveFilter && (
            <PBtn onClick={() => clearFilters()} variant="white" size="md">
              <X style={{ width: 13, height: 13, marginRight: 4 }} />
              Temizle
            </PBtn>
          )}
          <PBtn
            as="a"
            href={`/api/admin/audit/export?${buildQuery()}`}
            variant="white"
            size="md"
          >
            CSV İndir
          </PBtn>
        </div>
      </PCard>

      <PCard rounded={18} style={{ padding: 0, overflow: "hidden" }}>
        {rows.length === 0 ? (
          <PEmptyState
            icon="📜"
            title={hasActiveFilter ? "Bu filtreye uyan kayıt yok" : "Henüz audit kaydı yok"}
            subtitle={hasActiveFilter ? "Filtreleri sıfırlayıp tekrar deneyin." : "Admin eylemler ve hassas değişiklikler bu listeye düşer."}
            variant="dashed"
          />
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {rows.map((log, idx) => {
              const actor = log.actorId ? actors[log.actorId] : null;
              const isExpanded = expanded.has(log.id);
              const isUserTarget = log.targetType === "therapist";
              return (
                <li
                  key={log.id}
                  style={{
                    padding: "14px 18px",
                    borderTop: idx === 0 ? "none" : "1.5px dashed var(--poster-ink-faint)",
                    background: idx % 2 === 0 ? "var(--poster-panel)" : "var(--poster-bg-2)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        <PBadge color={actionColor(log.action)}>{AUDIT_ACTION_LABEL[log.action] ?? log.action}</PBadge>
                        <code style={{ fontSize: 10, color: "var(--poster-ink-3)", padding: "2px 6px", borderRadius: 6, background: "var(--poster-bg-2)", border: "1px solid var(--poster-ink-faint)" }}>
                          {log.action}
                        </code>
                        <span style={{ fontSize: 11, color: "var(--poster-ink-3)", fontWeight: 700 }}>{fmt(log.createdAt)}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "var(--poster-ink-2)" }}>
                        <span>
                          <strong style={{ color: "var(--poster-ink-3)", fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", marginRight: 4 }}>
                            actor
                          </strong>
                          {log.actorId === null ? (
                            <em style={{ color: "var(--poster-ink-3)" }}>sistem</em>
                          ) : actor ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setActorId(log.actorId!)}
                                title="Bu actor'a göre filtrele"
                                style={{
                                  fontFamily: "inherit",
                                  background: "transparent",
                                  border: "none",
                                  padding: 0,
                                  color: "var(--poster-ink)",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  textDecoration: "underline dotted",
                                }}
                              >
                                {actor.name}
                              </button>
                              <span style={{ color: "var(--poster-ink-3)" }}> · {actor.email}</span>
                            </>
                          ) : (
                            <code style={{ fontSize: 11, color: "var(--poster-ink-3)" }}>{log.actorId.slice(0, 12)}…</code>
                          )}
                        </span>
                        <span>
                          <strong style={{ color: "var(--poster-ink-3)", fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", marginRight: 4 }}>
                            target
                          </strong>
                          <button
                            type="button"
                            onClick={() => { setTargetType(log.targetType); setTargetId(log.targetId); }}
                            title="Bu hedefe göre filtrele"
                            style={{
                              fontFamily: "inherit",
                              background: "transparent",
                              border: "none",
                              padding: 0,
                              color: "var(--poster-ink)",
                              fontWeight: 700,
                              cursor: "pointer",
                              textDecoration: "underline dotted",
                            }}
                          >
                            {log.targetType}:{log.targetId.slice(0, 12)}…
                          </button>
                          {isUserTarget && (
                            <Link
                              href={`/admin/users/${log.targetId}`}
                              style={{ marginLeft: 6, color: "var(--poster-blue)", fontWeight: 700, textDecoration: "none" }}
                            >
                              detaya git →
                            </Link>
                          )}
                        </span>
                        {log.ip && (
                          <span>
                            <strong style={{ color: "var(--poster-ink-3)", fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", marginRight: 4 }}>
                              ip
                            </strong>
                            <code style={{ fontSize: 11 }}>{log.ip}</code>
                          </span>
                        )}
                      </div>
                    </div>
                    {log.diff != null && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(log.id)}
                        style={{
                          fontFamily: "inherit",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: 8,
                          border: "1.5px solid var(--poster-ink-faint)",
                          background: "transparent",
                          color: "var(--poster-ink-2)",
                          cursor: "pointer",
                        }}
                      >
                        diff {isExpanded ? "▾" : "▸"}
                      </button>
                    )}
                  </div>
                  {isExpanded && log.diff != null && (
                    <pre
                      style={{
                        margin: "10px 0 0",
                        padding: 12,
                        fontSize: 11,
                        background: "var(--poster-bg-2)",
                        border: "1.5px dashed var(--poster-ink-faint)",
                        borderRadius: 10,
                        maxHeight: 320,
                        overflow: "auto",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: "var(--poster-ink)",
                      }}
                    >
                      {JSON.stringify(log.diff, null, 2)}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>
        )}

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
