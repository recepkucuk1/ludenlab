"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PBadge } from "@ludenlab/ui";
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

const tileStyle: React.CSSProperties = {
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
};

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

  return (
    <>
      <header style={{ marginBottom: "1.6rem" }}>
        <span className="p-eyebrow">TÜM TASLAKLAR</span>
        <h1 className="p-h1" style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.3rem)", margin: "8px 0 0.3rem" }}>
          Kütüphane
        </h1>
        <p className="p-body" style={{ margin: 0 }}>
          Bugüne kadar üretip kaydettiğin tüm taslaklar.
        </p>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: "1.5rem" }}>
        <div className="p-chips">
          <button type="button" className="p-chip" aria-pressed={tf === "all"} onClick={() => setTf("all")}>
            Tümü
          </button>
          {TYPE_KEYS.map((t) => (
            <button type="button" key={t} className="p-chip" aria-pressed={tf === t} onClick={() => setTf(t)}>
              {DOC_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <input
          className="p-input"
          placeholder="Ad ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 200 }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="p-card" style={{ maxWidth: 560 }}>
          <p className="p-body" style={{ margin: 0 }}>
            {initial.length === 0 ? "Henüz kayıtlı taslak yok." : "Filtreyle eşleşen taslak yok."}
          </p>
        </div>
      ) : (
        <section style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {filtered.map((d) => (
            <Link
              key={d.id}
              href={`/vakalarim/${d.caseId}`}
              className="p-card p-card--hover"
              style={{ padding: 18, textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: "0.9rem" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                <PBadge tone="accent">{docTypeLabel(d.type)}</PBadge>
                <span className="p-mono">{new Date(d.createdAt).toLocaleDateString("tr-TR")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", minWidth: 0 }}>
                <span style={tileStyle} aria-hidden>
                  📄
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: "0.15rem", minWidth: 0 }}>
                  <strong className="p-h4" style={{ fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.code}
                  </strong>
                  <span className="p-small">{KADEME[d.kademe as Kademe] ?? d.kademe}</span>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "auto" }}>
                <PBadge tone="blue">~{d.credits} kredi</PBadge>
              </div>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
