"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { PAlert, PBadge, PButton, PSection, PSpinner, toast } from "@ludenlab/ui";
import { TASLAK_NOTU } from "@/lib/bep";

/* Tüm araçların sağ kolonunda kullanılan paylaşılan sonuç paneli:
   uyarı + boş/yükleniyor/sonuç + PDF indir / Kopyala / Öğrenciye ata + TASLAK_NOTU.
   Atama → POST /api/cases/save { code, kademe, type, content, model, credits }
   (öğrenciyi adıyla bul-veya-oluştur, taslağı ona ata). */

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
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => setSaved(false), [result]);

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(result.text);
    toast.success("Panoya kopyalandı");
  }

  function downloadPdf() {
    const html = contentRef.current?.innerHTML;
    if (!html) return;
    const w = window.open("", "_blank", "width=840,height=1000");
    if (!w) {
      toast.error("Açılır pencere engellendi — izin verip tekrar deneyin.");
      return;
    }
    w.document.write(
      `<!doctype html><html lang="tr"><head><meta charset="utf-8" /><title>${title}</title>` +
        `<style>` +
        `body{font-family:-apple-system,system-ui,"Segoe UI",Roboto,sans-serif;color:#0e1e26;max-width:720px;margin:36px auto;padding:0 28px;line-height:1.6;}` +
        `h1,h2,h3{line-height:1.25;margin:1.1em 0 .4em;}h1{font-size:22px;}h2{font-size:18px;}h3{font-size:15px;}` +
        `table{border-collapse:collapse;width:100%;margin:.6em 0;}th,td{border:1px solid #cbb;padding:6px 9px;text-align:left;font-size:13px;}` +
        `code{background:#f3eee2;padding:1px 5px;border-radius:4px;}ul,ol{padding-left:1.3em;}` +
        `.notu{margin-top:28px;padding-top:12px;border-top:1px solid #cbb;color:#666;font-size:11px;}` +
        `@media print{body{margin:0;}}</style></head>` +
        `<body>${html}<p class="notu">⚠️ ${TASLAK_NOTU}</p></body></html>`,
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  }

  async function assignToStudent() {
    if (!result) return;
    if (!code.trim()) {
      toast.error("Önce öğrencinin adını girin / öğrenci seçin.");
      return;
    }
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
      toast.success(`“${code.trim()}” öğrencisine atandı`);
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(d.error ?? "Atanamadı.");
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
            <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <PBadge tone="blue">~{result.credits} kredi</PBadge>
              <PButton size="sm" variant="ghost" onClick={downloadPdf}>
                PDF indir
              </PButton>
              <PButton size="sm" variant="ghost" onClick={copyResult}>
                Kopyala
              </PButton>
              <PButton size="sm" onClick={assignToStudent} disabled={saved}>
                {saved ? "Atandı ✓" : "Öğrenciye ata"}
              </PButton>
            </span>
          }
        >
          <div className="md" ref={contentRef}>
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
