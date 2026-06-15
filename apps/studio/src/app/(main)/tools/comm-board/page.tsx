"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Library, RefreshCw } from "lucide-react";
import { CommBoardView } from "@/components/cards/CommBoardView";
import type { CommBoardContent } from "@/components/cards/CommBoardView";
import { formatDate } from "@/lib/utils";
import { ToolShell, ToolEmptyState, ToolLoadingCard } from "@/components/tools/ToolShell";
import { PBtn, PCard, PLabel, PSelect, PInput, PSwitch, PFieldHint } from "@/components/poster";

interface Student {
  id: string;
  name: string;
  birthDate: string | null;
  workArea: string;
  diagnosis: string | null;
}

type BoardType = "basic_needs" | "emotions" | "daily_routines" | "school" | "social" | "requests" | "custom";
type Layout    = "grid" | "strip";
type TextMode  = "word_only" | "word_sentence";

const BOARD_TYPE_OPTIONS: { value: BoardType; label: string; emoji: string; desc: string }[] = [
  { value: "basic_needs",    label: "Temel İhtiyaçlar",  emoji: "💧", desc: "Yemek, su, tuvalet, uyku" },
  { value: "emotions",       label: "Duygular",           emoji: "😊", desc: "Mutlu, üzgün, kızgın" },
  { value: "daily_routines", label: "Günlük Rutinler",    emoji: "🌅", desc: "Uyanma, kahvaltı, okul" },
  { value: "school",         label: "Okul",               emoji: "📚", desc: "Ders, teneffüs, yemek" },
  { value: "social",         label: "Sosyal",             emoji: "👋", desc: "Merhaba, teşekkürler" },
  { value: "requests",       label: "İstek / Seçim",      emoji: "🙋", desc: "İstiyorum, bu, daha" },
  { value: "custom",         label: "Özel",               emoji: "✏️", desc: "Kendi kategoriniz" },
];

const SYMBOL_COUNT_OPTIONS: { value: number; label: string; grid: string }[] = [
  { value: 4,  label: "4",  grid: "2×2" },
  { value: 6,  label: "6",  grid: "2×3" },
  { value: 9,  label: "9",  grid: "3×3" },
  { value: 12, label: "12", grid: "3×4" },
];

const LOADING_MSGS = [
  "İletişim ihtiyaçları analiz ediliyor...",
  "Semboller tasarlanıyor...",
  "Fitzgerald renk sistemi uygulanıyor...",
  "Görsel açıklamalar oluşturuluyor...",
  "Veli rehberi hazırlanıyor...",
  "Uzman önerileri ekleniyor...",
];

function LoadingMessages() {
  const [index, setIndex]     = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      timerRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % LOADING_MSGS.length);
        setVisible(true);
      }, 300);
    }, 2600);
    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <p
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: "var(--poster-ink-2)",
        margin: 0,
        transition: "opacity 300ms",
        opacity: visible ? 1 : 0,
      }}
    >
      {LOADING_MSGS[index]}
    </p>
  );
}

// ─── Board PDF ────────────────────────────────────────────────────────────────

async function downloadBoardOnlyPDF(board: CommBoardContent, studentName?: string) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);

  const colorCoding = board.colorCoding !== false;
  const cells       = Array.isArray(board.cells) ? board.cells : [];
  const cols        = board.cols ?? 3;
  const rows        = board.rows ?? Math.ceil(cells.length / cols);
  const today       = formatDate(new Date(), "medium");

  const FG_BG: Record<string, string> = {
    yellow: "#FEF3C7", green: "#D1FAE5", blue: "#DBEAFE",
    pink: "#FCE7F3",   orange: "#FFEDD5", white: "#F9FAFB",
  };
  const FG_BORDER: Record<string, string> = {
    yellow: "#F59E0B", green: "#10B981", blue: "#3B82F6",
    pink: "#EC4899",   orange: "#F97316", white: "#D4D4D8",
  };
  const FG_TEXT: Record<string, string> = {
    yellow: "#92400E", green: "#065F46", blue: "#1E3A8A",
    pink: "#831843",   orange: "#7C2D12", white: "#3F3F46",
  };

  const CONTENT_W = 515;
  const GAP = 4;
  const cellW = Math.floor((CONTENT_W - GAP * (cols - 1)) / cols);
  const CONTENT_H = 842 - 40 - 40 - 50 - rows * GAP;
  const cellH = Math.floor(CONTENT_H / rows);

  const S = StyleSheet.create({
    page:     { fontFamily: "NotoSans", padding: 40, paddingBottom: 50 },
    header:   { marginBottom: 12 },
    title:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 16, color: "#023435", marginBottom: 2 },
    subtitle: { fontSize: 9, color: "#71717a" },
    row:      { flexDirection: "row" },
    cell:     { borderWidth: 2, borderRadius: 6, padding: 6, flexDirection: "column", alignItems: "center" },
    cellWord: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 12, textAlign: "center", marginBottom: 4 },
    cellBox:  { flex: 1, width: "100%", borderWidth: 1, borderRadius: 4, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
    footer:   { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e4e4e7", paddingTop: 5 },
    footTxt:  { fontSize: 7, color: "#a1a1aa" },
  });

  const gridRows: (typeof cells)[] = [];
  for (let r = 0; r < rows; r++) {
    gridRows.push(cells.slice(r * cols, (r + 1) * cols));
  }

  const Doc = () => (
    <Document title={board.title} author="LudenLab">
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <Text style={S.title}>{board.title}</Text>
          <Text style={S.subtitle}>
            {studentName ? `Öğrenci: ${studentName} · ` : ""}
            {rows}×{cols} İletişim Panosu · {today}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          {gridRows.map((rowCells, ri) => (
            <View key={ri} style={[S.row, { marginBottom: ri < rows - 1 ? GAP : 0 }]}>
              {rowCells.map((cell, ci) => {
                const color = colorCoding ? (cell.fitzgeraldColor ?? "white") : "white";
                return (
                  <View
                    key={ci}
                    style={[
                      S.cell,
                      {
                        width: cellW,
                        height: cellH,
                        marginRight: ci < rowCells.length - 1 ? GAP : 0,
                        backgroundColor: FG_BG[color] ?? "#F9FAFB",
                        borderColor: FG_BORDER[color] ?? "#D4D4D8",
                        borderStyle: "dashed",
                      },
                    ]}
                  >
                    <Text style={[S.cellWord, { color: FG_TEXT[color] ?? "#3F3F46" }]}>{cell.word}</Text>
                    <View style={[S.cellBox, { borderColor: FG_BORDER[color] ?? "#D4D4D8", borderStyle: "dashed" }]} />
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View style={S.footer} fixed>
          <Text style={S.footTxt}>LudenLab — ludenlab.com</Text>
          <Text style={S.footTxt}>Görsel iletişim panosu — sembol yapıştırın</Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${board.title.replace(/\s+/g, "_")}_pano.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadFullReportPDF(board: CommBoardContent, studentName?: string) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);

  const colorCoding = board.colorCoding !== false;
  const cells       = Array.isArray(board.cells) ? board.cells : [];
  const today       = formatDate(new Date(), "medium");

  const FG_BG: Record<string, string> = {
    yellow: "#FEF3C7", green: "#D1FAE5", blue: "#DBEAFE",
    pink: "#FCE7F3",   orange: "#FFEDD5", white: "#F9FAFB",
  };
  const FG_TEXT: Record<string, string> = {
    yellow: "#92400E", green: "#065F46", blue: "#1E3A8A",
    pink: "#831843",   orange: "#7C2D12", white: "#3F3F46",
  };

  const BOARD_TYPE_LABEL: Record<string, string> = {
    basic_needs: "Temel İhtiyaçlar", emotions: "Duygular",
    daily_routines: "Günlük Rutinler", school: "Okul Aktiviteleri",
    social: "Sosyal İfadeler", requests: "İstek ve Seçim", custom: "Özel",
  };

  const S = StyleSheet.create({
    page:      { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 44, paddingBottom: 70 },
    title:     { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 6 },
    infoRow:   { flexDirection: "row", flexWrap: "wrap", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#e4e4e7", paddingBottom: 10 },
    badge:     { fontSize: 8, color: "#52525b", backgroundColor: "#f4f4f5", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 4 },
    secHdr:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, color: "#71717a", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
    tblWrap:   { borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 4, marginBottom: 12, overflow: "hidden" },
    tHdr:      { flexDirection: "row", backgroundColor: "#f4f4f5", paddingVertical: 5, paddingHorizontal: 8 },
    thPos:     { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#a1a1aa", width: 28 },
    thWord:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#71717a", width: 80 },
    thDesc:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#71717a", flex: 1 },
    thColor:   { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#71717a", width: 70 },
    tRow:      { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: "#f4f4f5", alignItems: "flex-start" },
    tdPos:     { fontSize: 9, color: "#a1a1aa", width: 28, paddingTop: 1 },
    tdWord:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, color: "#18181b", width: 80 },
    tdDesc:    { fontSize: 9, color: "#52525b", flex: 1, lineHeight: 1.5 },
    tdColor:   { width: 70 },
    colorBadge:{ borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, alignSelf: "flex-start" },
    colorTxt:  { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 7 },
    box:       { borderRadius: 4, padding: 10, marginBottom: 10, borderWidth: 1 },
    boxTitle:  { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, marginBottom: 3 },
    boxText:   { fontSize: 9, lineHeight: 1.6 },
    footer:    { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e4e4e7", paddingTop: 6 },
    footTxt:   { fontSize: 8, color: "#a1a1aa" },
  });

  const COLOR_LABEL: Record<string, string> = {
    yellow: "Sarı — İsim", green: "Yeşil — Fiil", blue: "Mavi — Sıfat",
    pink: "Pembe — Sosyal", orange: "Turuncu — Soru", white: "Beyaz — Diğer",
  };

  const Doc = () => (
    <Document title={board.title} author="LudenLab">
      <Page size="A4" style={S.page}>
        <Text style={S.title}>{board.title}</Text>
        <View style={S.infoRow}>
          {studentName ? <Text style={S.badge}>Öğrenci: {studentName}</Text> : null}
          <Text style={S.badge}>{BOARD_TYPE_LABEL[board.boardType] ?? board.boardType}</Text>
          <Text style={S.badge}>{(board.rows ?? 3)}×{(board.cols ?? 3)} — {board.symbolCount ?? cells.length} sembol</Text>
          <Text style={S.badge}>{board.layout === "grid" ? "Grid" : "Satır"}</Text>
          {colorCoding ? <Text style={S.badge}>Fitzgerald renk kodu</Text> : null}
          <Text style={S.badge}>{today}</Text>
        </View>

        <Text style={S.secHdr}>Semboller ({cells.length} hücre)</Text>
        <View style={S.tblWrap}>
          <View style={S.tHdr}>
            <Text style={S.thPos}>#</Text>
            <Text style={S.thWord}>Kelime</Text>
            <Text style={S.thDesc}>Görsel Açıklama</Text>
            {colorCoding ? <Text style={S.thColor}>Renk</Text> : null}
          </View>
          {cells.map((cell, i) => {
            const color = colorCoding ? (cell.fitzgeraldColor ?? "white") : "white";
            return (
              <View key={i} style={[S.tRow, { backgroundColor: i % 2 === 1 ? "#fafafa" : "#fff" }]}>
                <Text style={S.tdPos}>{cell.position ?? i + 1}</Text>
                <Text style={S.tdWord}>{cell.word}{cell.sentence ? `\n"${cell.sentence}"` : ""}</Text>
                <Text style={S.tdDesc}>{cell.visualDescription}{cell.usage ? `\n↳ ${cell.usage}` : ""}</Text>
                {colorCoding ? (
                  <View style={S.tdColor}>
                    <View style={[S.colorBadge, { backgroundColor: FG_BG[color] ?? "#F9FAFB" }]}>
                      <Text style={[S.colorTxt, { color: FG_TEXT[color] ?? "#3F3F46" }]}>{COLOR_LABEL[color] ?? color}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {board.instructions ? (
          <View style={[S.box, { backgroundColor: "#f9fafb", borderColor: "#e4e4e7" }]}>
            <Text style={[S.boxTitle, { color: "#374151" }]}>Kullanım Talimatları</Text>
            <Text style={[S.boxText, { color: "#4b5563" }]}>{board.instructions}</Text>
          </View>
        ) : null}

        {board.expertNotes ? (
          <View style={[S.box, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
            <Text style={[S.boxTitle, { color: "#92400e" }]}>Uzman Notları</Text>
            <Text style={[S.boxText, { color: "#78350f" }]}>{board.expertNotes}</Text>
          </View>
        ) : null}

        {board.homeGuidance ? (
          <View style={[S.box, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
            <Text style={[S.boxTitle, { color: "#1e40af" }]}>Veli Rehberi</Text>
            <Text style={[S.boxText, { color: "#1e3a8a" }]}>{board.homeGuidance}</Text>
          </View>
        ) : null}

        {board.adaptations ? (
          <View style={[S.box, { backgroundColor: "#f9fafb", borderColor: "#e4e4e7" }]}>
            <Text style={[S.boxTitle, { color: "#374151" }]}>Uyarlama Önerileri</Text>
            <Text style={[S.boxText, { color: "#4b5563" }]}>{board.adaptations}</Text>
          </View>
        ) : null}

        <View style={S.footer} fixed>
          <Text style={S.footTxt}>LudenLab — ludenlab.com</Text>
          <Text style={S.footTxt}>{today}</Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${board.title.replace(/\s+/g, "_")}_tam_rapor.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const rowStyle = (active: boolean): React.CSSProperties => ({
  width: "100%",
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 12,
  border: "2px solid var(--poster-ink)",
  background: active ? "var(--poster-accent)" : "#fff",
  color: "var(--poster-ink)",
  textAlign: "left" as const,
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: active ? "3px 3px 0 var(--poster-ink)" : "none",
  transition: "all 0.1s",
});

const gridBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: "10px 8px",
  borderRadius: 12,
  border: "2px solid var(--poster-ink)",
  background: active ? "var(--poster-accent)" : "#fff",
  color: "var(--poster-ink)",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: active ? "3px 3px 0 var(--poster-ink)" : "none",
  transition: "all 0.1s",
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommBoardPage() {
  const [students, setStudents]           = useState<Student[]>([]);
  const [studentId, setStudentId]         = useState("");
  const [boardType, setBoardType]         = useState<BoardType>("basic_needs");
  const [customCategory, setCustomCategory] = useState("");
  const [symbolCount, setSymbolCount]     = useState(9);
  const [layout, setLayout]               = useState<Layout>("grid");
  const [textMode, setTextMode]           = useState<TextMode>("word_sentence");
  const [colorCoding, setColorCoding]     = useState(true);

  const [generating, setGenerating]       = useState(false);
  const [savedCardId, setSavedCardId]     = useState<string | null>(null);
  const [board, setBoard]                 = useState<CommBoardContent | null>(null);
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);

  const [customCategoryTouched, setCustomCategoryTouched] = useState(false);
  const customCategoryError = boardType === "custom" && !customCategory.trim()
    ? "Lütfen özel kategori adını girin"
    : null;
  const showCustomCategoryError = customCategoryTouched && customCategoryError;
  const [downloadingBoard, setDownloadingBoard]   = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  useEffect(() => {
    fetch("/api/students?limit=200")
      .then((r) => r.json())
      .then((d) => setStudents(d.students ?? []));
  }, []);

  const selectedStudent = students.find((s) => s.id === studentId);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setCustomCategoryTouched(true);
    if (customCategoryError) return;
    setGenerating(true);
    setSavedCardId(null);
    setPendingCardId(null);
    setBoard(null);
    try {
      const res = await fetch("/api/tools/comm-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId:      studentId || undefined,
          boardType,
          customCategory: boardType === "custom" ? customCategory.trim() : undefined,
          symbolCount,
          layout,
          textMode,
          colorCoding,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Bir hata oluştu"); return; }
      setBoard(data.board as CommBoardContent);
      setPendingCardId(data.cardId ?? null);
      setSavedCardId(data.cardId ?? null);
      toast.success("İletişim panosu oluşturuldu");
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownloadBoard() {
    if (!board) return;
    setDownloadingBoard(true);
    const t = toast.loading("Pano PDF hazırlanıyor…");
    try {
      await downloadBoardOnlyPDF(board, selectedStudent?.name);
      toast.success("Pano PDF indirildi", { id: t });
    } catch {
      toast.error("PDF oluşturulamadı", { id: t });
    } finally {
      setDownloadingBoard(false);
    }
  }

  async function handleDownloadReport() {
    if (!board) return;
    setDownloadingReport(true);
    const t = toast.loading("Tam rapor PDF hazırlanıyor…");
    try {
      await downloadFullReportPDF(board, selectedStudent?.name);
      toast.success("Tam rapor PDF indirildi", { id: t });
    } catch {
      toast.error("PDF oluşturulamadı", { id: t });
    } finally {
      setDownloadingReport(false);
    }
  }

  function handleReset() {
    setBoard(null);
    setPendingCardId(null);
    setSavedCardId(null);
  }
  void pendingCardId;

  const form = (
    <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Öğrenci */}
      <div>
        <PLabel optional>Öğrenci</PLabel>
        <PSelect value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">— Öğrenci seçin —</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </PSelect>
        {selectedStudent && (
          <div
            style={{
              marginTop: 8,
              padding: "8px 10px",
              border: "2px solid var(--poster-ink)",
              borderRadius: 10,
              background: "var(--poster-bg-2)",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--poster-ink)",
            }}
          >
            {selectedStudent.name}
            {selectedStudent.diagnosis && (
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--poster-ink-2)", marginTop: 2 }}>
                {selectedStudent.diagnosis}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pano türü */}
      <div>
        <PLabel>Pano Türü</PLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {BOARD_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setBoardType(opt.value);
                if (opt.value !== "custom") setCustomCategory("");
              }}
              style={rowStyle(boardType === opt.value)}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{opt.emoji}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800 }}>{opt.label}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--poster-ink-2)", marginTop: 2 }}>
                  {opt.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
        {boardType === "custom" && (
          <div style={{ marginTop: 8 }}>
            <PInput
              placeholder="Kategori adı (örn: Spor aktiviteleri)"
              value={customCategory}
              onChange={(e) => {
                setCustomCategory(e.target.value);
                setCustomCategoryTouched(true);
              }}
              invalid={!!showCustomCategoryError}
              aria-invalid={!!showCustomCategoryError}
            />
            {showCustomCategoryError && (
              <PFieldHint tone="error">{customCategoryError}</PFieldHint>
            )}
          </div>
        )}
      </div>

      {/* Sembol sayısı */}
      <div>
        <PLabel>Sembol Sayısı</PLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {SYMBOL_COUNT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSymbolCount(opt.value)}
              style={gridBtnStyle(symbolCount === opt.value)}
            >
              <div>{opt.label}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--poster-ink-2)", marginTop: 2 }}>
                {opt.grid}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Düzen */}
      <div>
        <PLabel>Düzen</PLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {([["grid", "Grid", "Satır ve sütun"], ["strip", "Satır", "Tek yatay şerit"]] as const).map(([v, l, d]) => (
            <button
              key={v}
              type="button"
              onClick={() => setLayout(v)}
              style={{ ...gridBtnStyle(layout === v), textAlign: "left" as const, padding: "10px 12px" }}
            >
              <div>{l}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--poster-ink-2)", marginTop: 2 }}>
                {d}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Metin dili */}
      <div>
        <PLabel>Metin Dili</PLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {([["word_only", "Sadece kelime", "Su"], ["word_sentence", "Kelime + cümle", "Su istiyorum"]] as const).map(([v, l, ex]) => (
            <button
              key={v}
              type="button"
              onClick={() => setTextMode(v)}
              style={{ ...gridBtnStyle(textMode === v), textAlign: "left" as const, padding: "10px 12px" }}
            >
              <div>{l}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--poster-ink-2)", marginTop: 2 }}>
                &quot;{ex}&quot;
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Color coding */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 12px",
          border: "2px solid var(--poster-ink)",
          borderRadius: 12,
          background: "var(--poster-panel)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--poster-ink)" }}>Fitzgerald Renk Kodu</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--poster-ink-2)", marginTop: 2 }}>
            İsim=Sarı · Fiil=Yeşil · Sıfat=Mavi
          </div>
        </div>
        <PSwitch checked={colorCoding} onChange={setColorCoding} />
      </div>

      {/* Submit */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
        <PBtn
          type="submit"
          variant="accent"
          disabled={generating}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {generating ? "Pano üretiliyor…" : "İletişim Panosu Üret"}
        </PBtn>
        <p style={{ fontSize: 11, color: "var(--poster-ink-3)", textAlign: "center", margin: 0 }}>
          15 kredi kullanılacak
        </p>
      </div>
    </form>
  );

  const result = generating ? (
    <ToolLoadingCard>
      <LoadingMessages />
    </ToolLoadingCard>
  ) : board ? (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <PBtn variant="accent" onClick={handleDownloadBoard} disabled={downloadingBoard || downloadingReport}>
          {downloadingBoard ? "Hazırlanıyor…" : "PDF — Pano"}
        </PBtn>
        <PBtn variant="dark" onClick={handleDownloadReport} disabled={downloadingBoard || downloadingReport}>
          {downloadingReport ? "Hazırlanıyor…" : "PDF — Tam Rapor"}
        </PBtn>
        {savedCardId && (
          <PBtn as="a" href={`/cards/${savedCardId}`} variant="white" icon={<Library style={{ width: 14, height: 14 }} />}>
            Kütüphanede Gör
          </PBtn>
        )}
        <PBtn variant="white" onClick={handleReset} icon={<RefreshCw style={{ width: 14, height: 14 }} />}>
          Yeni Pano
        </PBtn>
      </div>
      <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
        <CommBoardView board={board} />
      </PCard>
    </>
  ) : (
    <ToolEmptyState
      icon="🗨️"
      title="Pano burada görünecek"
      hint='Sol formu doldurun ve "İletişim Panosu Üret" butonuna tıklayın.'
    />
  );

  return (
    <ToolShell
      title="İletişim Panosu Üretici"
      description="AAC için kişiselleştirilmiş görsel iletişim panoları üretin."
      form={form}
      result={result}
      formWidth={400}
    />
  );
}
