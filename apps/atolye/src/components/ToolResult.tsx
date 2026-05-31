"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { PAlert, PBadge, PButton, PSection, PSpinner, toast } from "@ludenlab/ui";
import { TASLAK_NOTU } from "@/lib/bep";

/* Tüm araçların sağ kolonunda kullanılan paylaşılan sonuç paneli:
   uyarı + boş/yükleniyor/sonuç durumları + Kopyala/Vakaya kaydet + TASLAK_NOTU.
   Kaydet → POST /api/cases/save { code, kademe, type, content, model, credits }. */

export interface ToolResultData {
  text: string;
  credits: number;
  model: string;
}

export function ToolResult({
  result,
  loading,
  title,
  emptyHint,
  saveType,
  code,
  kademe,
}: {
  result: ToolResultData | null;
  loading: boolean;
  title: string;
  emptyHint: string;
  saveType: string;
  code: string;
  kademe: string;
}) {
  const [saved, setSaved] = useState(false);
  useEffect(() => setSaved(false), [result]);

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(result.text);
    toast.success("Panoya kopyalandı");
  }

  async function saveToCase() {
    if (!result) return;
    const res = await fetch("/api/cases/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        kademe,
        type: saveType,
        content: result.text,
        model: result.model,
        credits: result.credits,
      }),
    });
    if (res.ok) {
      setSaved(true);
      toast.success(`“${code.trim()}” vakasına kaydedildi`);
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(d.error ?? "Kaydedilemedi.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <PAlert tone="warning">
        <strong>Önemli:</strong> Çıktı bir <strong>taslaktır</strong>; uygulanmadan önce uzman
        tarafından gözden geçirilmelidir. Tanı koymaz.
      </PAlert>

      {!result && !loading && (
        <PSection title={title}>
          <p style={{ color: "var(--poster-ink-3)" }}>{emptyHint}</p>
        </PSection>
      )}

      {loading && (
        <PSection title={title}>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--poster-ink-2)" }}
          >
            <PSpinner /> Claude hazırlıyor…
          </div>
        </PSection>
      )}

      {result && (
        <PSection
          title={title}
          action={
            <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
              <PBadge tone="blue">~{result.credits} kredi</PBadge>
              <PButton size="sm" variant="ghost" onClick={copyResult}>
                Kopyala
              </PButton>
              <PButton size="sm" onClick={saveToCase} disabled={saved}>
                {saved ? "Kaydedildi ✓" : "Vakaya kaydet"}
              </PButton>
            </span>
          }
        >
          <div className="md">
            <ReactMarkdown>{result.text}</ReactMarkdown>
          </div>
          <p
            style={{
              marginTop: "1rem",
              paddingTop: "0.75rem",
              borderTop: "var(--poster-border)",
              color: "var(--poster-ink-3)",
              fontSize: "0.8rem",
            }}
          >
            ⚠️ {TASLAK_NOTU}
          </p>
        </PSection>
      )}
    </div>
  );
}
