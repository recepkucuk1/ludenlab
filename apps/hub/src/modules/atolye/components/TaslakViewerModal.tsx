"use client";

import { useState } from "react";
import Link from "next/link";
import { PBadge, PButton, PModal, toast } from "@ludenlab/ui";
import { docTypeLabel } from "@atolye/lib/doc-types";
import { downloadDraftPdf } from "@atolye/lib/pdf";
import { Markdown } from "@atolye/components/Markdown";

/* Kayıtlı bir taslağı tam metin gösteren PAYLAŞILAN görüntüleyici modal.
   Hem öğrenci sayfası (CaseDetail) hem Kütüphane (Kutuphane) kullanır.
   PDF indir / Kopyala + (varsa) öğrenci sayfasına link. */

export interface ViewerDoc {
  type: string;
  content: string;
  createdAt: string;
  credits: number;
}

export function TaslakViewerModal({
  doc,
  onClose,
  studentHref,
}: {
  doc: ViewerDoc | null;
  onClose: () => void;
  /** Verilirse modal içinde "Öğrenci sayfası →" linki gösterilir (Kütüphane'den açınca). */
  studentHref?: string;
}) {
  const [pdfBusy, setPdfBusy] = useState(false);

  async function downloadPdf() {
    if (!doc || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadDraftPdf(docTypeLabel(doc.type), doc.content);
    } catch {
      toast.error("PDF oluşturulamadı. Tekrar deneyin.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function copyResult() {
    if (!doc) return;
    await navigator.clipboard.writeText(doc.content);
    toast.success("Panoya kopyalandı");
  }

  return (
    <PModal
      open={!!doc}
      onClose={onClose}
      maxWidth={820}
      title={
        doc ? `${docTypeLabel(doc.type)} · ${new Date(doc.createdAt).toLocaleDateString("tr-TR")}` : ""
      }
    >
      {doc && (
        <>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: "1rem",
            }}
          >
            <PBadge tone="blue">~{doc.credits} kredi</PBadge>
            <div style={{ flex: 1 }} />
            {studentHref && (
              <Link href={studentHref} className="p-link" style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                Öğrenci sayfası →
              </Link>
            )}
            <PButton size="sm" variant="ghost" onClick={copyResult}>
              Kopyala
            </PButton>
            <PButton size="sm" onClick={downloadPdf} disabled={pdfBusy}>
              {pdfBusy ? "PDF hazırlanıyor…" : "PDF indir"}
            </PButton>
          </div>
          <Markdown>{doc.content}</Markdown>
        </>
      )}
    </PModal>
  );
}
