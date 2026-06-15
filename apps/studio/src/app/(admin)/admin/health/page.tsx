"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RefreshCw, Activity, Webhook, Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  PBtn,
  PCard,
  PBadge,
  PSpinner,
  PStatCard,
} from "@/components/poster";
import { AdminNav } from "@/components/admin/AdminNav";

interface HealthResponse {
  checkedAt: string;
  lastCron: { id: string; action: string; diff: unknown; createdAt: string } | null;
  lastWebhook: {
    id: string;
    provider: string;
    status: string;
    receivedAt: string;
    processedAt: string | null;
  } | null;
  webhook24h: Record<string, number>;
  audit24h: number;
  apiUsage1h: { calls: number; costUsd: number };
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "var(--poster-ink-3)",
  fontFamily: "var(--font-display)",
  marginBottom: 10,
};

function ageMs(iso: string): number {
  return Date.now() - new Date(iso).getTime();
}

function formatAge(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  return `${d} gün önce`;
}

function fmtFull(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(d, "short")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 999,
        background: ok ? "color-mix(in srgb, var(--poster-green) 14%, transparent)" : "color-mix(in srgb, var(--poster-danger) 14%, transparent)",
        border: `1.5px solid ${ok ? "var(--poster-green)" : "var(--poster-danger)"}`,
        color: ok ? "var(--poster-green)" : "var(--poster-danger)",
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 11,
      }}
    >
      {ok ? <CheckCircle2 style={{ width: 12, height: 12 }} /> : <XCircle style={{ width: 12, height: 12 }} />}
      {label}
    </span>
  );
}

export default function AdminHealthPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/health");
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
    load();
  }, [session, status, router, load]);

  if (status === "loading" || loading || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <PSpinner size={40} />
      </div>
    );
  }

  const cronStale = !data.lastCron || ageMs(data.lastCron.createdAt) > 26 * 60 * 60 * 1000;
  const webhookStale = !data.lastWebhook || ageMs(data.lastWebhook.receivedAt) > 24 * 60 * 60 * 1000;
  const failedWebhooks = data.webhook24h.failed ?? 0;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 48px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "var(--poster-ink)", fontFamily: "var(--font-display)", letterSpacing: "-.02em" }}>
            Sistem Sağlığı
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)" }}>
            Cron, webhook ve API trafiği için early-warning paneli. Kontrol: {fmtFull(data.checkedAt)}.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <PBtn onClick={load} variant="white" size="md">
            <RefreshCw style={{ width: 14, height: 14, marginRight: 6 }} />
            Yenile
          </PBtn>
          <AdminNav current="/admin/health" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 22 }}>
        <PStatCard
          size="default"
          label="Webhook (24sa)"
          value={data.webhook24h.processed ?? 0}
          sub={`${failedWebhooks} hata`}
          valueColor={failedWebhooks > 0 ? "var(--poster-danger)" : "var(--poster-green)"}
          countUp={false}
          noAnimation
        />
        <PStatCard
          size="default"
          label="Audit (24sa)"
          value={data.audit24h}
          valueColor="var(--poster-blue)"
          countUp={false}
          noAnimation
        />
        <PStatCard
          size="default"
          label="API Çağrı (1sa)"
          value={data.apiUsage1h.calls}
          sub={`$${data.apiUsage1h.costUsd.toFixed(4)}`}
          valueColor="var(--poster-accent)"
          countUp={false}
          noAnimation
        />
        <PStatCard
          size="default"
          label="DB"
          value="OK"
          sub="bu yanıt = canlı"
          valueColor="var(--poster-green)"
          countUp={false}
          noAnimation
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 18 }}>
        <PCard rounded={16} style={{ padding: 18, borderLeft: `6px solid ${cronStale ? "var(--poster-danger)" : "var(--poster-green)"}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ ...sectionLabel, marginBottom: 0, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Clock style={{ width: 12, height: 12 }} /> Subscription Cleanup Cron
            </p>
            <StatusPill ok={!cronStale} label={cronStale ? "Stale" : "Aktif"} />
          </div>
          {data.lastCron ? (
            <>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--poster-ink)", fontFamily: "var(--font-display)" }}>
                {formatAge(ageMs(data.lastCron.createdAt))}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
                {fmtFull(data.lastCron.createdAt)}
              </p>
              {data.lastCron.diff != null && (
                <pre
                  style={{
                    margin: "10px 0 0",
                    padding: 10,
                    fontSize: 10,
                    background: "var(--poster-bg-2)",
                    border: "1.5px dashed var(--poster-ink-faint)",
                    borderRadius: 8,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "var(--poster-ink)",
                    maxHeight: 180,
                  }}
                >
                  {JSON.stringify(data.lastCron.diff, null, 2)}
                </pre>
              )}
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
              Hiç cron çalışması kaydı yok. Hostinger cron ayarını kontrol edin.
            </p>
          )}
          {cronStale && data.lastCron && (
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--poster-danger)", fontFamily: "var(--font-display)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle style={{ width: 13, height: 13 }} />
              26 saatten uzun süredir çalışmadı — cron schedule&apos;ını kontrol edin.
            </p>
          )}
        </PCard>

        <PCard rounded={16} style={{ padding: 18, borderLeft: `6px solid ${webhookStale ? "var(--poster-pink)" : failedWebhooks > 0 ? "var(--poster-danger)" : "var(--poster-green)"}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ ...sectionLabel, marginBottom: 0, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Webhook style={{ width: 12, height: 12 }} /> Webhook Trafiği
            </p>
            <StatusPill ok={!webhookStale && failedWebhooks === 0} label={webhookStale ? "Sessiz" : failedWebhooks > 0 ? "Hata" : "Sağlıklı"} />
          </div>
          {data.lastWebhook ? (
            <>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--poster-ink)", fontFamily: "var(--font-display)" }}>
                Son: {formatAge(ageMs(data.lastWebhook.receivedAt))}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
                {data.lastWebhook.provider} · <PBadge color={data.lastWebhook.status === "processed" ? "accent" : data.lastWebhook.status === "failed" ? "pink" : "blue"}>{data.lastWebhook.status}</PBadge> · {fmtFull(data.lastWebhook.receivedAt)}
              </p>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
              Hiç webhook teslimi yok.
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
            <MiniStat label="Alındı" value={data.webhook24h.received ?? 0} color="var(--poster-blue)" />
            <MiniStat label="İşlendi" value={data.webhook24h.processed ?? 0} color="var(--poster-green)" />
            <MiniStat label="Hata" value={failedWebhooks} color={failedWebhooks > 0 ? "var(--poster-danger)" : "var(--poster-ink-3)"} />
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 11, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
            Son 24 saat. Detay için <a href="/admin/webhooks" style={{ color: "var(--poster-blue)", fontWeight: 700 }}>Webhook&apos;lar</a> sayfası.
          </p>
        </PCard>

        <PCard rounded={16} style={{ padding: 18, gridColumn: "1 / -1" }}>
          <p style={{ ...sectionLabel, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Activity style={{ width: 12, height: 12 }} /> Notlar
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)", lineHeight: 1.7 }}>
            <li>Cron heartbeat: subscription-cleanup her çalıştığında AuditLog&apos;a `cron.subscription-cleanup` yazar. Hostinger 04:00 TR&apos;de tetikler — 26 saatten uzun gecikme stale sayılır.</li>
            <li>Webhook trafiği: yalnızca iyzico aktif. Sessizlik tek başına problem değil — saatlerce abonelik hareketi yoksa normal. failed &gt; 0 ise <a href="/admin/webhooks?status=failed" style={{ color: "var(--poster-blue)", fontWeight: 700 }}>failed listesini</a> incele.</li>
            <li>API hataları için Sentry&apos;ye bak — burada sadece başarılı çağrılar (ApiUsageLog) sayılır.</li>
          </ul>
        </PCard>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        background: "var(--poster-bg-2)",
        border: "1.5px solid var(--poster-ink-faint)",
        textAlign: "center",
        fontFamily: "var(--font-display)",
      }}
    >
      <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--poster-ink-3)" }}>{label}</p>
      <p style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{value}</p>
    </div>
  );
}
