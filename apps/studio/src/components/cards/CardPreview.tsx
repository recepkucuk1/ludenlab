"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import type { GeneratedCard } from "@/lib/prompts";
import {
  WORK_AREA_LABEL,
  DIFFICULTY_LABEL,
  AGE_LABEL,
  getCategoryBadge,
  getDifficultyBadge,
} from "@/lib/constants";
import { PBtn, PBadge, PSection } from "@/components/poster";
import { InlineMd } from "@/components/Md";
import { Download } from "lucide-react";

const CardPDFDocument = dynamic(
  () => import("./CardPDFDocument").then((m) => m.CardPDFDocument),
  { ssr: false }
);

interface CardPreviewProps {
  card: GeneratedCard;
}

async function downloadPDF(card: GeneratedCard) {
  const { pdf } = await import("@react-pdf/renderer");
  const { CardPDFDocument } = await import("./CardPDFDocument");
  const blob = await pdf(<CardPDFDocument card={card} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${card.title.replace(/\s+/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CardPreview({ card }: CardPreviewProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    const loadingToast = toast.loading("PDF hazırlanıyor…");
    try {
      await downloadPDF(card);
      toast.success("PDF indirildi", { id: loadingToast });
    } catch (err) {
      console.error("[PDF] oluşturma hatası:", err);
      toast.error("PDF oluşturulamadı, tekrar deneyin", { id: loadingToast });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "var(--font-display)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {WORK_AREA_LABEL[card.category] && (
              <PBadge color={getCategoryBadge(card.category)}>
                {WORK_AREA_LABEL[card.category]}
              </PBadge>
            )}
            <PBadge color={getDifficultyBadge(card.difficulty)}>
              {DIFFICULTY_LABEL[card.difficulty] ?? card.difficulty}
            </PBadge>
            <PBadge color="soft">{AGE_LABEL[card.ageGroup] ?? card.ageGroup}</PBadge>
          </div>
          <PBtn
            type="button"
            variant="white"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            icon={<Download size={14} />}
          >
            {downloading ? "Hazırlanıyor…" : "PDF İndir"}
          </PBtn>
        </div>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "var(--poster-ink)",
            letterSpacing: "-.02em",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {card.title}
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--poster-ink-2)", margin: 0 }}>
          <InlineMd text={card.objective} />
        </p>
      </div>

      {card.materials?.length > 0 && (
        <PSection title="📦 Materyaller">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {card.materials.map((m, i) => (
              <PBadge key={i} color="soft">
                {m}
              </PBadge>
            ))}
          </div>
        </PSection>
      )}

      {card.instructions?.length > 0 && (
        <PSection title="📋 Uygulama Adımları">
          <ol style={{ display: "flex", flexDirection: "column", gap: 8, margin: 0, padding: 0, listStyle: "none" }}>
            {card.instructions.map((step, i) => (
              <li key={i} style={{ display: "flex", gap: 12, fontSize: 14, lineHeight: 1.5 }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: "var(--poster-accent)",
                    color: "#fff",
                    border: "2px solid var(--poster-ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ paddingTop: 2 }}>
                  <InlineMd text={step.replace(/^Adım \d+:\s*/, "")} />
                </span>
              </li>
            ))}
          </ol>
        </PSection>
      )}

      {card.exercises?.length > 0 && (
        <PSection title="🏃 Egzersizler">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {card.exercises.map((ex, i) => (
              <div
                key={i}
                style={{
                  padding: 12,
                  background: "var(--poster-bg-2)",
                  border: "2px solid var(--poster-ink)",
                  borderRadius: 12,
                  boxShadow: "var(--poster-shadow-sm)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "var(--poster-ink)" }}>{ex.name}</span>
                  <PBadge color="soft">{ex.repetitions}</PBadge>
                </div>
                <p style={{ fontSize: 12, color: "var(--poster-ink-2)", lineHeight: 1.5, margin: 0 }}>
                  <InlineMd text={ex.description} />
                </p>
              </div>
            ))}
          </div>
        </PSection>
      )}

      {card.therapistNotes && (
        <PSection title="📝 Uzman Notları" tone="warning">
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            <InlineMd text={card.therapistNotes} />
          </p>
        </PSection>
      )}

      {card.progressIndicators?.length > 0 && (
        <PSection title="📈 İlerleme Göstergeleri">
          <ul style={{ display: "flex", flexDirection: "column", gap: 4, margin: 0, padding: 0, listStyle: "none" }}>
            {card.progressIndicators.map((pi, i) => (
              <li
                key={i}
                style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--poster-ink)" }}
              >
                <span style={{ color: "var(--poster-green)", marginTop: 2, fontWeight: 800 }}>✓</span>
                <InlineMd text={pi} />
              </li>
            ))}
          </ul>
        </PSection>
      )}

      {card.homeExercise && (
        <PSection title="🏠 Ev Egzersizi" tone="success">
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            <InlineMd text={card.homeExercise} />
          </p>
        </PSection>
      )}
    </div>
  );
}
