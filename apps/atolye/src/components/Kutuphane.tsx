"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PBadge, PCard } from "@ludenlab/ui";
import { DOC_TYPE_LABEL, docTypeLabel } from "@/lib/doc-types";
import { KADEME, type Kademe } from "@/lib/bep";

interface DocRow {
  id: string;
  type: string;
  credits: number;
  createdAt: string;
  caseId: string;
  code: string;
  kademe: string;
}

const TYPE_KEYS = Object.keys(DOC_TYPE_LABEL);

export function Kutuphane({ initial }: { initial: DocRow[] }) {
  const [q, setQ] = useState("");
  const [tf, setTf] = useState<"all" | string>("all");

  const filtered = useMemo(() => {
    let list = initial;
    if (tf !== "all") list = list.filter((d) => d.type === tf);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((d) => d.code.toLowerCase().includes(s));
    return list;
  }, [initial, q, tf]);

  const pillStyle = (active: boolean) => ({
    padding: "0.35rem 0.8rem",
    border: "var(--poster-border)",
    borderRadius: "var(--poster-radius-pill)",
    background: active ? "var(--poster-accent-soft)" : "transparent",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
  });

  return (
    <>
      <header style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: "0 0 0.3rem" }}>Kütüphane</h1>
        <p style={{ color: "var(--poster-ink-2)", margin: 0 }}>
          Bugüne kadar üretip kaydettiğin tüm taslaklar.
        </p>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          <button type="button" style={pillStyle(tf === "all")} onClick={() => setTf("all")}>
            Tümü
          </button>
          {TYPE_KEYS.map((t) => (
            <button type="button" key={t} style={pillStyle(tf === t)} onClick={() => setTf(t)}>
              {DOC_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <input
          className="p-input"
          placeholder="Rumuz ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 200 }}
        />
      </div>

      {filtered.length === 0 ? (
        <PCard>
          <p style={{ margin: 0, color: "var(--poster-ink-2)" }}>
            {initial.length === 0 ? "Henüz kayıtlı taslak yok." : "Filtreyle eşleşen taslak yok."}
          </p>
        </PCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {filtered.map((d) => (
            <Link
              key={d.id}
              href={`/vakalarim/${d.caseId}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                padding: "0.75rem 0.9rem",
                border: "var(--poster-border)",
                borderRadius: "var(--poster-radius-md)",
                background: "var(--poster-panel)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span style={{ display: "flex", flexDirection: "column", gap: "0.15rem", minWidth: 0 }}>
                <strong style={{ fontSize: "0.95rem" }}>{docTypeLabel(d.type)}</strong>
                <span style={{ fontSize: "0.8rem", color: "var(--poster-ink-3)" }}>
                  {d.code} · {KADEME[d.kademe as Kademe] ?? d.kademe}
                </span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem", whiteSpace: "nowrap" }}>
                <PBadge tone="blue">~{d.credits}</PBadge>
                <span style={{ fontSize: "0.78rem", color: "var(--poster-ink-3)" }}>
                  {new Date(d.createdAt).toLocaleDateString("tr-TR")}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
