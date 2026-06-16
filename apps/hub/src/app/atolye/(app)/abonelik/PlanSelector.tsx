"use client";

import { useState } from "react";
import { PBadge, PCard } from "@ludenlab/ui";
import { PLAN_CONFIG, PLAN_KEYS, YEARLY_DISCOUNT_PCT, formatKurus, type PlanType } from "@atolye/lib/plans";
import { CheckoutButton } from "./CheckoutButton";

/** Planlar bölümü — Aylık/Yıllık seçici. Yıllık %15 indirimli (plans.ts). */
export function PlanSelector({ current }: { current: PlanType }) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  return (
    <section style={{ marginBottom: "1.8rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: 14,
        }}
      >
        <div>
          <span className="p-eyebrow">PLANLAR</span>
          <h2 className="p-h3" style={{ fontSize: 19, margin: "6px 0 0" }}>Sana uygun olanı seç</h2>
        </div>

        {/* Aylık / Yıllık toggle */}
        <div
          style={{
            display: "inline-flex",
            gap: 2,
            padding: 3,
            border: "var(--poster-border)",
            borderRadius: "var(--poster-radius-pill)",
            background: "var(--poster-panel)",
          }}
        >
          {(["monthly", "yearly"] as const).map((c) => {
            const on = cycle === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                aria-pressed={on}
                style={{
                  border: 0,
                  cursor: "pointer",
                  borderRadius: "var(--poster-radius-pill)",
                  padding: "0.35rem 0.9rem",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-display)",
                  background: on ? "var(--poster-accent)" : "transparent",
                  color: on ? "var(--accent-on)" : "var(--poster-ink-2)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {c === "monthly" ? "Aylık" : "Yıllık"}
                {c === "yearly" && (
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      color: on ? "var(--accent-on)" : "var(--poster-green)",
                    }}
                  >
                    %{YEARLY_DISCOUNT_PCT} ↓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

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
          const kurus = cycle === "yearly" ? p.yearlyKurus : p.monthlyKurus;
          const hasPrice = kurus > 0;
          const price = hasPrice ? formatKurus(kurus) : k === "FREE" ? "Ücretsiz" : "Özel fiyat";
          const suffix = hasPrice ? (cycle === "yearly" ? "/yıl" : "/ay") : "";
          const perMonth =
            cycle === "yearly" && hasPrice ? formatKurus(Math.round(p.yearlyKurus / 12)) : null;

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

              <div>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 800, color: "var(--poster-ink)" }}>
                  {price}
                </span>
                {suffix && <span className="p-small" style={{ fontWeight: 600 }}>{suffix}</span>}
                {perMonth && (
                  <div className="p-small" style={{ marginTop: 2, color: "var(--poster-green)", fontWeight: 700 }}>
                    ayda {perMonth} · %{YEARLY_DISCOUNT_PCT} indirim
                  </div>
                )}
              </div>

              <ul style={{ margin: "0.1rem 0 0.4rem", paddingLeft: "1.1rem", color: "var(--poster-ink-2)", fontSize: "0.88rem", lineHeight: 1.5 }}>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              <CheckoutButton plan={k} isCurrent={isCurrent} cycle={cycle} />
            </PCard>
          );
        })}
      </div>
    </section>
  );
}
