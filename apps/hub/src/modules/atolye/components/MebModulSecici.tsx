"use client";

import { MEB_MODULLER } from "@atolye/lib/meb-program";

/* Öğrenci düzeyi MEB hedef alanı seçici — 6 modül + her birinin altında bölümler (çoklu seçim).
   value = seçili BÖLÜM kodları (ör. ["3.1","5.2"]); modül koddan türetilir.
   Modül başlığına tıklamak o modülün tüm bölümlerini seçer/kaldırır. Kontrollü. */

const pill = (on: boolean, soft = false): React.CSSProperties => ({
  border: "var(--poster-border)",
  borderRadius: "var(--poster-radius-pill)",
  padding: "0.25rem 0.6rem",
  fontSize: "0.74rem",
  fontWeight: 600,
  cursor: "pointer",
  background: on ? "var(--poster-accent)" : soft ? "var(--poster-accent-soft)" : "var(--poster-panel)",
  color: on ? "#fff" : "var(--poster-ink)",
});

export function MebModulSecici({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const sel = new Set(value);

  function toggleBolum(kod: string) {
    const next = new Set(sel);
    if (next.has(kod)) next.delete(kod);
    else next.add(kod);
    onChange([...next]);
  }
  function toggleModul(no: number) {
    const m = MEB_MODULLER.find((x) => x.no === no);
    if (!m) return;
    const kodlar = m.bolumler.map((b) => b.kod);
    const hepsi = kodlar.every((k) => sel.has(k));
    const next = new Set(sel);
    kodlar.forEach((k) => (hepsi ? next.delete(k) : next.add(k)));
    onChange([...next]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {MEB_MODULLER.map((m) => {
        const kodlar = m.bolumler.map((b) => b.kod);
        const secili = kodlar.filter((k) => sel.has(k)).length;
        const hepsi = secili === kodlar.length;
        return (
          <div key={m.no} className="p-card" style={{ padding: "0.65rem 0.8rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                aria-pressed={hepsi}
                onClick={() => toggleModul(m.no)}
                style={{ ...pill(hepsi, secili > 0), fontWeight: 800 }}
              >
                {m.no}. {m.ad}
              </button>
              {secili > 0 && (
                <span style={{ fontSize: "0.72rem", color: "var(--poster-ink-3)", fontWeight: 600 }}>
                  {secili}/{kodlar.length} bölüm
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {m.bolumler.map((b) => (
                <button
                  key={b.kod}
                  type="button"
                  aria-pressed={sel.has(b.kod)}
                  onClick={() => toggleBolum(b.kod)}
                  title={b.kod}
                  style={pill(sel.has(b.kod))}
                >
                  {b.ad}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
