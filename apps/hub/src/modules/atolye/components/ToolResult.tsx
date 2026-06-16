"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { PAlert, PBadge, PButton, PSection, PSpinner, PSkeleton, toast } from "@ludenlab/ui";
import { TASLAK_NOTU } from "@atolye/lib/bep";

/* Tüm araçların sağ kolonunda kullanılan paylaşılan sonuç paneli:
   uyarı + boş/yükleniyor/(canlı reveal) sonuç + PDF indir / Kopyala / Öğrenciye ata.
   "Streaming" = client-side progresif reveal (prototip ile aynı; backend tek POST).
   Atama → POST /atolye/api/cases/save (öğrenciyi adıyla bul-veya-oluştur, taslağı ona ata). */

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
  mebHedef,
}: {
  result: ToolResultData | null;
  loading: boolean;
  title: string;
  emptyHint: string;
  saveType: string;
  code: string;
  kademe: string;
  mebHedef?: { mebHedefKod?: string; mebDavranisKodlari: string[] };
}) {
  const [saved, setSaved] = useState(false);
  const [shown, setShown] = useState("");
  const [revealing, setRevealing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Yeni sonuç gelince metni elapsed-time tabanlı progresif aç (canlı yazılıyor hissi)
  useEffect(() => {
    setSaved(false);
    const full = result?.text ?? "";
    if (!full) {
      setShown("");
      setRevealing(false);
      return;
    }
    const total = full.length;
    setShown("");
    setRevealing(true);
    const duration = Math.min(2600, Math.max(700, total)); // ~1ms/char, 0.7–2.6s
    const start = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / duration);
      setShown(full.slice(0, Math.ceil(total * p)));
      if (p >= 1) {
        clearInterval(id);
        setRevealing(false);
      }
    }, 40);
    return () => clearInterval(id);
  }, [result]);

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
        `<link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />` +
        `<link rel="preconnect" href="https://fonts.googleapis.com" />` +
        `<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />` +
        `<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap" />` +
        `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" />` +
        `<style>` +
        `:root { --ink: #18272D; --faint: rgba(24,39,45,0.12); }` +
        `body { font-family: "Satoshi", system-ui, sans-serif; color: var(--ink); max-width: 800px; margin: 40px auto; padding: 0 32px; line-height: 1.6; }` +
        `h1, h2, h3 { font-family: "Bricolage Grotesque", sans-serif; line-height: 1.2; margin: 1.2em 0 0.5em; letter-spacing: -0.015em; }` +
        `h1 { font-size: 26px; border-bottom: 2px solid var(--ink); padding-bottom: 8px; }` +
        `h2 { font-size: 20px; }` +
        `h3 { font-size: 16px; }` +
        `p { margin: 0.8em 0; }` +
        `table { border-collapse: collapse; width: 100%; margin: 1.2em 0; }` +
        `th, td { border: 1.5px solid var(--ink); padding: 8px 12px; text-align: left; font-size: 13.5px; }` +
        `th { background: rgba(24,39,45,0.05); font-weight: 700; }` +
        `code { background: rgba(24,39,45,0.06); padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, "SF Mono", monospace; font-size: 0.9em; font-weight: 600; }` +
        `ul, ol { padding-left: 1.5em; margin: 0.8em 0; }` +
        `li { margin-bottom: 0.4em; }` +
        `hr { border: none; border-top: 2px solid var(--faint); margin: 2em 0; }` +
        `.brand-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--ink); padding-bottom: 16px; margin-bottom: 32px; }` +
        `.brand-name { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 18px; }` +
        `.doc-title { font-weight: 600; font-size: 14px; color: rgba(24,39,45,0.6); }` +
        `.notu { margin-top: 40px; padding-top: 16px; border-top: 1.5px dashed var(--ink); color: rgba(24,39,45,0.7); font-size: 11.5px; font-weight: 500; }` +
        `@media print { body { margin: 0; padding: 0; } .brand-head { margin-top: 0; } }` +
        `</style></head>` +
        `<body>` +
        `<div class="brand-head"><div class="brand-name">LudenLab Atölye</div><div class="doc-title">${title}</div></div>` +
        `${html}<p class="notu">⚠️ ${TASLAK_NOTU}</p></body></html>`,
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 800);
  }

  async function assignToStudent() {
    if (!result) return;
    if (!code.trim()) {
      toast.error("Önce öğrencinin adını girin / öğrenci seçin.");
      return;
    }
    const res = await fetch("/atolye/api/cases/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        kademe,
        type: saveType,
        content: result.text,
        model: result.model,
        credits: result.credits,
        mebHedefKod: mebHedef?.mebHedefKod,
        mebDavranisKodlari: mebHedef?.mebDavranisKodlari ?? [],
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
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <PSkeleton width="100%" height="24px" />
            <PSkeleton width="85%" height="24px" />
            <PSkeleton width="90%" height="24px" />
            <PSkeleton width="60%" height="24px" />
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--poster-ink-2)", marginTop: "8px", fontSize: "14px", fontWeight: 600 }}>
              <PSpinner /> Claude taslağı hazırlıyor…
            </div>
          </div>
        </PSection>
      )}

      {result && (
        <PSection
          title={title}
          action={
            revealing ? (
              <span style={{ display: "inline-flex", gap: "0.45rem", alignItems: "center", color: "var(--poster-ink-3)", fontSize: "0.85rem", fontWeight: 600 }}>
                <PSpinner /> yazılıyor…
              </span>
            ) : (
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
            )
          }
        >
          <div className="md" ref={contentRef}>
            <ReactMarkdown>{shown}</ReactMarkdown>
          </div>
          {revealing && (
            <span
              aria-hidden
              style={{ display: "inline-block", width: "0.5ch", marginTop: 2, color: "var(--poster-accent)", fontWeight: 800 }}
            >
              ▋
            </span>
          )}
          {!revealing && (
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
          )}
        </PSection>
      )}
    </div>
  );
}
