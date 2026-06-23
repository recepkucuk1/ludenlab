"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PAlert, PBadge, PButton, PSection, PSpinner, PSkeleton, toast } from "@ludenlab/ui";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { downloadDraftPdf } from "@atolye/lib/pdf";

/* Tüm araçların sağ kolonunda kullanılan paylaşılan sonuç paneli:
   uyarı + boş/yükleniyor/(canlı reveal) sonuç + PDF indir / Kopyala / Öğrenciye ata.
   "Streaming" = client-side progresif reveal (prototip ile aynı; backend tek POST).
   Atama → POST /atolye/api/cases/save (öğrenciyi adıyla bul-veya-oluştur, taslağı ona ata). */

export interface ToolResultData {
  text: string;
  credits: number;
  model: string;
  /** Sunucu üretimde otomatik kaydetti → öğrenci (Case) kimliği. Varsa çıktı zaten
      Kütüphane'de ve öğrencinin sayfasındadır; istemci elle atamaz, durumu gösterir. */
  caseId?: string | null;
  docId?: string | null;
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
  const [pdfBusy, setPdfBusy] = useState(false);

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

  async function downloadPdf() {
    if (!result || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadDraftPdf(title, result.text);
    } catch (err) {
      console.error("[atolye] PDF oluşturulamadı", err);
      toast.error(`PDF oluşturulamadı: ${err instanceof Error ? err.message : "bilinmeyen hata"}`);
    } finally {
      setPdfBusy(false);
    }
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
                <PButton size="sm" variant="ghost" onClick={downloadPdf} disabled={pdfBusy}>
                  {pdfBusy ? "PDF hazırlanıyor…" : "PDF indir"}
                </PButton>
                <PButton size="sm" variant="ghost" onClick={copyResult}>
                  Kopyala
                </PButton>
                {result.caseId ? (
                  <a
                    href={`/atolye/vakalarim/${result.caseId}`}
                    title="Bu taslak otomatik kaydedildi — öğrencinin sayfasında ve Kütüphane'de görünür."
                    style={{ textDecoration: "none" }}
                  >
                    <PBadge tone="green">✓ Kütüphaneye kaydedildi</PBadge>
                  </a>
                ) : (
                  <PButton size="sm" onClick={assignToStudent} disabled={saved}>
                    {saved ? "Atandı ✓" : "Öğrenciye ata"}
                  </PButton>
                )}
              </span>
            )
          }
        >
          <div className="md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{shown}</ReactMarkdown>
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
