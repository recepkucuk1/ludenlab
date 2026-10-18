"use client";

import { X } from "lucide-react";
import { Markdown } from "@studio/components/Md";
import { parcala } from "@studio/lib/assistant/profileSections";

/**
 * Eğitim Profili bölüm gövdesi. Asistanın eklediği maddeler (`- metin _(asistan)_`) kendi
 * satırında, küçük "asistan" etiketi ve çarpı ile çizilir; geri kalan metin olduğu gibi
 * Markdown'dır. Çarpı `onRemove(satır)` ile tam satırı verir; silme/PATCH üst bileşende.
 */
export function ProfileSectionBody({ content, onRemove, busy }: { content: string; onRemove: (line: string) => void; busy?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {parcala(content).map((p, i) =>
        p.tur === "md" ? (
          <Markdown key={i}>{p.metin}</Markdown>
        ) : (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, lineHeight: 1.6, color: "var(--poster-ink-2)" }}>
            <span aria-hidden style={{ color: "var(--poster-ink-3)", userSelect: "none" }}>•</span>
            <span style={{ flex: 1 }}>
              {p.metin}{" "}
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--poster-ink-3)", whiteSpace: "nowrap" }}>asistan</span>
            </span>
            <button
              type="button"
              aria-label="Asistan maddesini sil"
              title="Profilden çıkar"
              disabled={busy}
              onClick={() => onRemove(p.satir)}
              style={{ background: "none", border: "none", cursor: busy ? "default" : "pointer", padding: 2, color: "var(--poster-ink-3)", flexShrink: 0, opacity: busy ? 0.5 : 1 }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        ),
      )}
    </div>
  );
}
