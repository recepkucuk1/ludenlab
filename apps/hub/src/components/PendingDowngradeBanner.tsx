"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";

/**
 * Zamanlanmış downgrade bildirimi + "Vazgeç". Kullanıcı yüksek plandayken düşük plana
 * geçtiğinde ödeme alınmaz; mevcut plan dönem sonuna kadar sürer, sonra cron bekleyen planı
 * uygular. Bu banner o bekleyen değişikliği görünür kılar ve tek tıkla iptal ettirir.
 *
 * Self-contained: /api/odeme/pending-downgrade'i okur (sayfanın plan verisinden bağımsız),
 * bekleyen yoksa hiçbir şey render etmez. `module` verilirse yalnız o modülü gösterir
 * (studio/atolye sayfaları); verilmezse tüm modülleri gösterir (hesap/abonelik).
 */

type Pending = {
  module: string;
  currentPlanName: string | null;
  currentPlanCode: string | null;
  pendingPlanName: string | null;
  pendingPlanCode: string | null;
  appliesAt: string | null;
};

const MODULE_LABEL: Record<string, string> = { STUDIO: "Studio", ATOLYE: "Atölye" };
const PLAN_LABEL: Record<string, string> = { PRO: "Pro", ADVANCED: "Advanced", ENTERPRISE: "Enterprise" };

/** Tier kodunu kısa etikete çevir (tam ad "Atölye Pro Aylık" yerine "Pro" → modül adı tekrarı olmaz). */
function planLabel(code: string | null, name: string | null): string {
  return (code ? PLAN_LABEL[code] : null) ?? name ?? code ?? "planınız";
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export function PendingDowngradeBanner({ module }: { module?: "STUDIO" | "ATOLYE" }) {
  const [items, setItems] = useState<Pending[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState<string[]>([]);

  useEffect(() => {
    let aborted = false;
    fetch("/api/odeme/pending-downgrade")
      .then((r) => r.json())
      .then((d: { pending?: Pending[] }) => {
        if (aborted) return;
        const list = (d.pending ?? []).filter((p) => !module || p.module === module);
        setItems(list);
      })
      .catch(() => {});
    return () => {
      aborted = true;
    };
  }, [module]);

  async function vazgec(mod: string) {
    setBusy(mod);
    try {
      const r = await fetch("/api/odeme/downgrade-cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: mod }),
      });
      if (r.ok) {
        setItems((prev) => prev.filter((p) => p.module !== mod));
        setCancelled((prev) => [...prev, mod]);
        // Onay mesajını birkaç saniye sonra gizle.
        setTimeout(() => setCancelled((prev) => prev.filter((m) => m !== mod)), 6000);
      }
    } catch {
      // sessiz: kullanıcı tekrar deneyebilir
    } finally {
      setBusy(null);
    }
  }

  if (!items.length && !cancelled.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
      {items.map((p) => {
        const date = fmtDate(p.appliesAt);
        const modLabel = module ? null : MODULE_LABEL[p.module] ?? p.module;
        return (
          <div
            key={p.module}
            role="status"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 12,
              border: "2px solid var(--poster-ink)",
              background: "var(--poster-bg-2)",
              boxShadow: "3px 3px 0 var(--poster-ink)",
            }}
          >
            <CalendarClock style={{ width: 20, height: 20, flexShrink: 0, marginTop: 2, color: "var(--poster-accent)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="p-body" style={{ margin: 0, color: "var(--poster-ink)", fontWeight: 600 }}>
                {modLabel ? `${modLabel}: ` : ""}
                <strong>{planLabel(p.pendingPlanCode, p.pendingPlanName)}</strong> planına geçişiniz zamanlandı
              </p>
              <p className="p-small" style={{ margin: "4px 0 0", color: "var(--poster-ink-2)", lineHeight: 1.5 }}>
                {date
                  ? `${date} tarihindeki bir sonraki yenilemede uygulanacak. O tarihe kadar mevcut ${planLabel(
                      p.currentPlanCode,
                      p.currentPlanName,
                    )} planınızı kullanmaya devam edersiniz.`
                  : `Bir sonraki yenilemede uygulanacak. O tarihe kadar mevcut planınızı kullanmaya devam edersiniz.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => vazgec(p.module)}
              disabled={busy === p.module}
              style={{
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 36,
                padding: "0 14px",
                borderRadius: 9,
                border: "2px solid var(--poster-ink)",
                background: "var(--poster-bg)",
                color: "var(--poster-ink)",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 800,
                cursor: busy === p.module ? "wait" : "pointer",
                boxShadow: "2px 2px 0 var(--poster-ink)",
                opacity: busy === p.module ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {busy === p.module && <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />}
              Vazgeç
            </button>
          </div>
        );
      })}

      {cancelled.map((mod) => (
        <div
          key={`done-${mod}`}
          role="status"
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "2px solid var(--poster-ink)",
            background: "var(--poster-accent)",
            color: "var(--poster-ink)",
            fontWeight: 700,
            boxShadow: "3px 3px 0 var(--poster-ink)",
          }}
        >
          {module ? "" : `${MODULE_LABEL[mod] ?? mod}: `}Plan değişikliği iptal edildi — mevcut planınız devam ediyor.
        </div>
      ))}
    </div>
  );
}
