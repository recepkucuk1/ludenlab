"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { RefreshCw, Library, LayoutList, LayoutGrid, ChevronDown, ChevronUp, Lightbulb, Info, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { WORK_AREA_LABEL, calcAge, getCategoryBadge } from "@/lib/constants";
import type { MatchingGameContent, MatchingPair } from "@/components/cards/MatchingGameView";
import { PBtn, PCard, PBadge, PSelect, PLabel } from "@/components/poster";
import type { BadgeColor } from "@/components/poster";
import { ToolShell, ToolEmptyState, ToolLoadingCard } from "@/components/tools/ToolShell";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  name: string;
  birthDate: string | null;
  workArea: string;
  diagnosis: string | null;
  curriculumIds?: string[];
}

interface CurriculumGoal {
  id: string;
  title: string;
}

interface CurriculumItem {
  id: string;
  area: string;
  title: string;
  goals: CurriculumGoal[];
}


// ─── Constants ────────────────────────────────────────────────────────────────

const MATCH_TYPE_OPTIONS = [
  { value: "definition",  label: "Kelime — Tanım",              desc: "Kelimenin anlamını eşleştir" },
  { value: "image_desc",  label: "Kelime — Resim Açıklaması",   desc: "Kelimeyi görsel açıklamayla eşleştir" },
  { value: "synonym",     label: "Eş Anlamlı",                  desc: "Aynı anlama gelen kelimeler" },
  { value: "antonym",     label: "Zıt Anlamlı",                 desc: "Karşıt anlamlı kelimeler" },
  { value: "category",    label: "Kategori Eşleştirme",         desc: "Kelimeyi ait olduğu kategoriyle eşleştir" },
  { value: "sentence",    label: "Cümle Tamamlama",             desc: "Cümledeki boşluğu doğru kelimeyle eşleştir" },
] as const;
type MatchType = (typeof MATCH_TYPE_OPTIONS)[number]["value"];

const PAIR_COUNTS = ["6", "8", "10", "12"] as const;
type PairCount = (typeof PAIR_COUNTS)[number];

const DIFFICULTY_OPTIONS = [
  { value: "easy",   label: "Kolay",  desc: "Somut, sık kullanılan kelimeler" },
  { value: "medium", label: "Orta",   desc: "Daha az sık, bazıları soyut" },
  { value: "hard",   label: "Zor",    desc: "Soyut kavramlar, deyimler" },
] as const;
type Difficulty = (typeof DIFFICULTY_OPTIONS)[number]["value"];

const THEME_OPTIONS = [
  { value: "",                    label: "Tema yok (karışık)" },
  { value: "Hayvanlar",           label: "Hayvanlar" },
  { value: "Yiyecekler",          label: "Yiyecekler" },
  { value: "Meslekler",           label: "Meslekler" },
  { value: "Okul ve sınıf",       label: "Okul ve sınıf" },
  { value: "Ev ve aile",          label: "Ev ve aile" },
  { value: "Doğa ve mevsimler",   label: "Doğa ve mevsimler" },
  { value: "Vücut ve sağlık",     label: "Vücut ve sağlık" },
  { value: "Ulaşım araçları",     label: "Ulaşım araçları" },
  { value: "Duygular ve hisler",  label: "Duygular ve hisler" },
];

const MATCH_TYPE_LABEL: Record<string, string> = {
  definition: "Kelime — Tanım",
  image_desc: "Kelime — Resim Açıklaması",
  synonym:    "Eş Anlamlı",
  antonym:    "Zıt Anlamlı",
  category:   "Kategori Eşleştirme",
  sentence:   "Cümle Tamamlama",
};

const MATCH_TYPE_BADGE: Record<string, BadgeColor> = {
  definition: "blue",
  image_desc: "ink",
  synonym:    "green",
  antonym:    "pink",
  category:   "accent",
  sentence:   "yellow",
};

const DIFFICULTY_LABEL: Record<string, string> = { easy: "Kolay", medium: "Orta", hard: "Zor" };
const DIFFICULTY_BADGE: Record<string, BadgeColor> = { easy: "green", medium: "yellow", hard: "pink" };

const LOADING_MSGS = [
  "Kelime listesi oluşturuluyor...",
  "Eşleştirme çiftleri hazırlanıyor...",
  "Zorluk seviyesi ayarlanıyor...",
  "İpuçları ekleniyor...",
  "Talimatlar hazırlanıyor...",
  "Son dokunuşlar yapılıyor...",
];

// ─── Loading Messages ─────────────────────────────────────────────────────────

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
    <p style={{ fontSize: 13, color: "var(--poster-ink-2)", transition: "opacity .3s", opacity: visible ? 1 : 0, margin: 0 }}>
      {LOADING_MSGS[index]}
    </p>
  );
}

// ─── Printable Cards View ─────────────────────────────────────────────────────

function PrintableCards({ game }: { game: MatchingGameContent }) {
  const pairs = Array.isArray(game.pairs) ? game.pairs : [];

  const allCards: { text: string; type: "A" | "B"; pairId: number }[] = [];
  pairs.forEach((p) => {
    allCards.push({ text: p.cardA, type: "A", pairId: p.id ?? 0 });
    allCards.push({ text: p.cardB, type: "B", pairId: p.id ?? 0 });
  });
  const shuffled = [...allCards].sort(() => Math.random() - 0.5);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginBottom: 16 }}>
        {shuffled.map((card, i) => (
          <div
            key={i}
            style={{
              padding: 12,
              minHeight: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.4,
              background: card.type === "A" ? "var(--poster-panel)" : "#fff0e8",
              color: card.type === "A" ? "var(--poster-blue)" : "var(--poster-accent)",
              border: `2px dashed ${card.type === "A" ? "var(--poster-blue)" : "var(--poster-accent)"}`,
              borderRadius: 10,
            }}
          >
            {card.text}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 10, color: "var(--poster-ink-3)", textAlign: "center", margin: 0 }}>
        Mavi kartlar = Kart A &nbsp;·&nbsp; Turuncu kartlar = Kart B
      </p>
    </div>
  );
}

// ─── PDF Downloads (unchanged) ────────────────────────────────────────────────

async function downloadTablePDF(game: MatchingGameContent, studentName?: string) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });

  const today = formatDate(new Date(), "medium");
  const pairs = Array.isArray(game.pairs) ? game.pairs : [];

  const S = StyleSheet.create({
    page:      { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 44, paddingBottom: 70 },
    title:     { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 6 },
    infoRow:   { flexDirection: "row", flexWrap: "wrap", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#e4e4e7", paddingBottom: 10 },
    badge:     { fontSize: 8, color: "#52525b", backgroundColor: "#f4f4f5", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 4 },
    tableHdr:  { flexDirection: "row", backgroundColor: "#f4f4f5", borderBottomWidth: 1, borderBottomColor: "#e4e4e7", paddingVertical: 6, paddingHorizontal: 8 },
    hdrNum:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#a1a1aa", width: 20 },
    hdrCell:   { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#71717a", flex: 1 },
    row:       { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f4f4f5" },
    rowNum:    { fontSize: 9, color: "#a1a1aa", width: 20 },
    cellA:     { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, color: "#18181b", flex: 1, marginRight: 8 },
    cellB:     { fontSize: 9, color: "#3f3f46", flex: 1 },
    box:       { borderRadius: 4, padding: 10, marginBottom: 8, marginTop: 14 },
    boxTitle:  { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, marginBottom: 4 },
    boxText:   { fontSize: 9, lineHeight: 1.6 },
    footer:    { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e4e4e7", paddingTop: 6 },
    footerTxt: { fontSize: 8, color: "#a1a1aa" },
  });

  const Doc = () => (
    <Document title={game.title ?? "Kelime Eşleştirme"} author="LudenLab">
      <Page size="A4" style={S.page}>
        <Text style={S.title}>{game.title ?? "Kelime Eşleştirme"}</Text>

        <View style={S.infoRow}>
          {studentName ? <Text style={S.badge}>Öğrenci: {studentName}</Text> : null}
          <Text style={S.badge}>{MATCH_TYPE_LABEL[game.matchType] ?? game.matchType}</Text>
          <Text style={S.badge}>{DIFFICULTY_LABEL[game.difficulty] ?? game.difficulty}</Text>
          <Text style={S.badge}>{pairs.length} çift</Text>
          {game.theme ? <Text style={S.badge}>{game.theme}</Text> : null}
        </View>

        <View style={{ borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 4 }}>
          <View style={S.tableHdr}>
            <Text style={S.hdrNum}>#</Text>
            <Text style={S.hdrCell}>Kart A</Text>
            <Text style={S.hdrCell}>Kart B</Text>
          </View>
          {pairs.map((pair, i) => (
            <View key={i} style={[S.row, { backgroundColor: i % 2 === 1 ? "#fafafa" : "#fff" }]}>
              <Text style={S.rowNum}>{pair.id ?? i + 1}</Text>
              <Text style={S.cellA}>{pair.cardA}</Text>
              <Text style={S.cellB}>{pair.cardB}</Text>
            </View>
          ))}
        </View>

        {game.instructions ? (
          <View style={[S.box, { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e4e4e7" }]}>
            <Text style={[S.boxTitle, { color: "#374151" }]}>Nasıl Oynanır</Text>
            <Text style={[S.boxText, { color: "#4b5563" }]}>{game.instructions}</Text>
          </View>
        ) : null}

        {game.adaptations ? (
          <View style={[S.box, { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e4e4e7" }]}>
            <Text style={[S.boxTitle, { color: "#374151" }]}>Uyarlama Önerileri</Text>
            <Text style={[S.boxText, { color: "#4b5563" }]}>{game.adaptations}</Text>
          </View>
        ) : null}

        {game.expertNotes ? (
          <View style={[S.box, { backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a" }]}>
            <Text style={[S.boxTitle, { color: "#92400e" }]}>Uzman Notları</Text>
            <Text style={[S.boxText, { color: "#78350f" }]}>{game.expertNotes}</Text>
          </View>
        ) : null}

        <View style={S.footer} fixed>
          <Text style={S.footerTxt}>LudenLab — ludenlab.com</Text>
          <Text style={S.footerTxt}>{today}</Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${(game.title ?? "esleştirme").replace(/\s+/g, "_")}_tablo.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadCardsPDF(game: MatchingGameContent, studentName?: string) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });

  const today = formatDate(new Date(), "medium");
  const pairs = Array.isArray(game.pairs) ? game.pairs : [];

  const cards: { text: string; type: "A" | "B" }[] = [];
  pairs.forEach((p) => {
    cards.push({ text: p.cardA, type: "A" });
    cards.push({ text: p.cardB, type: "B" });
  });
  const shuffled: typeof cards = [];
  const aCards = cards.filter((c) => c.type === "A");
  const bCards = cards.filter((c) => c.type === "B");
  const maxLen = Math.max(aCards.length, bCards.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < bCards.length) shuffled.push(bCards[i]);
    if (i < aCards.length) shuffled.push(aCards[i]);
  }

  const S = StyleSheet.create({
    page:      { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 32, paddingBottom: 60 },
    title:     { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 14, color: "#023435", marginBottom: 4 },
    subtitle:  { fontSize: 8, color: "#71717a", marginBottom: 16 },
    grid:      { flexDirection: "row", flexWrap: "wrap" },
    cardA:     { width: "30%", margin: "1.5%", minHeight: 64, borderWidth: 1, borderColor: "#93c5fd", borderRadius: 6, backgroundColor: "#eff6ff", padding: 8, justifyContent: "center", alignItems: "center" },
    cardB:     { width: "30%", margin: "1.5%", minHeight: 64, borderWidth: 1, borderColor: "#fdba74", borderRadius: 6, backgroundColor: "#fff7ed", padding: 8, justifyContent: "center", alignItems: "center" },
    cardText:  { fontSize: 9, textAlign: "center", lineHeight: 1.4, color: "#18181b" },
    legend:    { flexDirection: "row", marginBottom: 12, marginTop: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4, marginTop: 1 },
    legendTxt: { fontSize: 8, color: "#71717a", marginRight: 12 },
    ansTitle:  { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 14, color: "#023435", marginBottom: 12 },
    ansRow:    { flexDirection: "row", marginBottom: 6, alignItems: "flex-start" },
    ansNum:    { width: 20, fontSize: 9, color: "#a1a1aa", fontFamily: "NotoSans", fontWeight: "bold" },
    ansA:      { flex: 1, fontSize: 9, color: "#18181b", fontFamily: "NotoSans", fontWeight: "bold", marginRight: 4 },
    ansArrow:  { fontSize: 9, color: "#a1a1aa", marginRight: 4 },
    ansB:      { flex: 1, fontSize: 9, color: "#3f3f46" },
    footer:    { position: "absolute", bottom: 24, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e4e4e7", paddingTop: 5 },
    footerTxt: { fontSize: 8, color: "#a1a1aa" },
  });

  const Doc = () => (
    <Document title={`${game.title ?? "Kelime Eşleştirme"} — Kesme Kartları`} author="LudenLab">
      <Page size="A4" style={S.page}>
        <Text style={S.title}>{game.title ?? "Kelime Eşleştirme"}</Text>
        <Text style={S.subtitle}>
          Kartları kesin ve karıştırın · {studentName ? `Öğrenci: ${studentName} · ` : ""}
          {MATCH_TYPE_LABEL[game.matchType]} · {DIFFICULTY_LABEL[game.difficulty]} · {today}
        </Text>

        <View style={S.legend}>
          <View style={[S.legendDot, { backgroundColor: "#93c5fd" }]} />
          <Text style={S.legendTxt}>Mavi = Kart A</Text>
          <View style={[S.legendDot, { backgroundColor: "#fdba74" }]} />
          <Text style={S.legendTxt}>Turuncu = Kart B</Text>
        </View>

        <View style={S.grid}>
          {shuffled.map((card, i) => (
            <View key={i} style={card.type === "A" ? S.cardA : S.cardB}>
              <Text style={S.cardText}>{card.text}</Text>
            </View>
          ))}
        </View>

        <View style={S.footer} fixed>
          <Text style={S.footerTxt}>LudenLab — ludenlab.com</Text>
          <Text style={S.footerTxt}>{today}</Text>
        </View>
      </Page>

      <Page size="A4" style={S.page}>
        <Text style={S.ansTitle}>Cevap Anahtarı</Text>
        {pairs.map((pair, i) => (
          <View key={i} style={S.ansRow}>
            <Text style={S.ansNum}>{pair.id ?? i + 1}.</Text>
            <Text style={S.ansA}>{pair.cardA}</Text>
            <Text style={S.ansArrow}>→</Text>
            <Text style={S.ansB}>{pair.cardB}</Text>
          </View>
        ))}
        <View style={S.footer} fixed>
          <Text style={S.footerTxt}>LudenLab — ludenlab.com · Cevap Anahtarı</Text>
          <Text style={S.footerTxt}>{today}</Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${(game.title ?? "esleştirme").replace(/\s+/g, "_")}_kartlar.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MatchingGamePage() {
  const [students, setStudents]         = useState<Student[]>([]);
  const [curricula, setCurricula]       = useState<CurriculumItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  const [studentId,  setStudentId]  = useState("");
  const [matchType,  setMatchType]  = useState<MatchType>("synonym");
  const [pairCount,  setPairCount]  = useState<PairCount>("8");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [theme,      setTheme]      = useState("");
  const [goalId,     setGoalId]     = useState("");

  const [loading,      setLoading]      = useState(false);
  const [game,         setGame]         = useState<MatchingGameContent | null>(null);
  const [savedCardId,  setSavedCardId]  = useState<string | null>(null);
  const [downloading,  setDownloading]  = useState(false);
  const [formKey,      setFormKey]      = useState(0);
  const [viewMode,     setViewMode]     = useState<"table" | "cards">("table");
  const [showAnswers,  setShowAnswers]  = useState(false);

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;

  const availableGoals: { id: string; title: string }[] = curricula
    .filter((c) => selectedStudent?.curriculumIds?.includes(c.id))
    .flatMap((c) => c.goals.map((g) => ({ id: g.id, title: g.title })));

  const selectedGoalTitle = availableGoals.find((g) => g.id === goalId)?.title ?? "";

  useEffect(() => {
    Promise.all([
      fetch("/api/students").then((r) => r.json()),
      fetch("/api/curriculum").then((r) => r.json()),
    ]).then(([sData, cData]) => {
      setStudents(sData.students ?? []);
      setCurricula(cData.curricula ?? []);
    }).finally(() => setStudentsLoading(false));
  }, []);

  function handleStudentChange(id: string) {
    setStudentId(id);
    setGoalId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setGame(null);
    setSavedCardId(null);
    setShowAnswers(false);
    setViewMode("table");

    try {
      const res = await fetch("/api/tools/matching-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId:  studentId || undefined,
          matchType,
          pairCount,
          difficulty,
          theme:      theme || undefined,
          goalTitle:  selectedGoalTitle || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Bir hata oluştu"); return; }
      setGame(data.game as MatchingGameContent);
      setSavedCardId(data.cardId ?? null);
      toast.success("Eşleştirme kartları üretildi!");
    } catch {
      toast.error("Bağlantı hatası, tekrar deneyin");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setGame(null);
    setSavedCardId(null);
    setFormKey((k) => k + 1);
    setStudentId("");
    setMatchType("synonym");
    setPairCount("8");
    setDifficulty("easy");
    setTheme("");
    setGoalId("");
    setShowAnswers(false);
    setViewMode("table");
  }

  async function handleDownloadTable() {
    if (!game) return;
    setDownloading(true);
    const t = toast.loading("PDF hazırlanıyor...");
    try {
      await downloadTablePDF(game, selectedStudent?.name);
      toast.success("Tablo PDF indirildi", { id: t });
    } catch {
      toast.error("PDF oluşturulamadı", { id: t });
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadCards() {
    if (!game) return;
    setDownloading(true);
    const t = toast.loading("Kesme kartları hazırlanıyor...");
    try {
      await downloadCardsPDF(game, selectedStudent?.name);
      toast.success("Kesme kartları PDF indirildi", { id: t });
    } catch {
      toast.error("PDF oluşturulamadı", { id: t });
    } finally {
      setDownloading(false);
    }
  }

  const pairs = game ? (Array.isArray(game.pairs) ? game.pairs : []) : [];

  // ── Button style helpers ─────────────────────────────────────────────────────
  const rowStyle = (active: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "10px 12px",
    background: active ? "var(--poster-accent)" : "var(--poster-panel)",
    color: active ? "#fff" : "var(--poster-ink)",
    border: "2px solid var(--poster-ink)",
    borderRadius: 10,
    boxShadow: active ? "0 2px 0 var(--poster-ink)" : "var(--poster-shadow-sm)",
    cursor: "pointer",
    fontFamily: "var(--font-display)",
    textAlign: "left",
  });

  const gridBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 8px",
    background: active ? "var(--poster-ink)" : "var(--poster-panel)",
    color: active ? "#fff" : "var(--poster-ink)",
    border: "2px solid var(--poster-ink)",
    borderRadius: 10,
    boxShadow: active ? "0 2px 0 var(--poster-ink)" : "var(--poster-shadow-sm)",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "var(--font-display)",
  });

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    background: active ? "var(--poster-ink)" : "transparent",
    color: active ? "#fff" : "var(--poster-ink-2)",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "var(--font-display)",
  });

  const submitStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    background: "var(--poster-accent)",
    color: "#fff",
    border: "2px solid var(--poster-ink)",
    borderRadius: 12,
    boxShadow: "0 3px 0 var(--poster-ink)",
    fontSize: 14,
    fontWeight: 800,
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.6 : 1,
    fontFamily: "var(--font-display)",
  };

  const form = (
    <form key={formKey} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Öğrenci */}
      <div>
        <PLabel optional>Öğrenci</PLabel>
        <PSelect value={studentId} onChange={(e) => handleStudentChange(e.target.value)}>
          <option value="">{studentsLoading ? "Yükleniyor..." : "Öğrenci seçin (opsiyonel)"}</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </PSelect>
        {selectedStudent && (
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {selectedStudent.birthDate && <PBadge color="soft">{calcAge(selectedStudent.birthDate)}</PBadge>}
            <PBadge color={getCategoryBadge(selectedStudent.workArea)}>
              {WORK_AREA_LABEL[selectedStudent.workArea] ?? selectedStudent.workArea}
            </PBadge>
            {selectedStudent.diagnosis && <PBadge color="soft">{selectedStudent.diagnosis}</PBadge>}
          </div>
        )}
      </div>

      {/* Eşleştirme Türü */}
      <div>
        <PLabel>Eşleştirme Türü</PLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {MATCH_TYPE_OPTIONS.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setMatchType(opt.value)} style={rowStyle(matchType === opt.value)}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 800 }}>{opt.label}</span>
              <span style={{ display: "block", fontSize: 10, opacity: 0.75 }}>{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Çift Sayısı */}
      <div>
        <PLabel>Çift Sayısı</PLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
          {PAIR_COUNTS.map((n) => (
            <button key={n} type="button" onClick={() => setPairCount(n)} style={gridBtnStyle(pairCount === n)}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Zorluk */}
      <div>
        <PLabel>Zorluk Seviyesi</PLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setDifficulty(opt.value)} style={gridBtnStyle(difficulty === opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tema */}
      <div>
        <PLabel>
          Tema <span style={{ fontSize: 10, fontWeight: 500, color: "var(--poster-ink-3)" }}>opsiyonel</span>
        </PLabel>
        <PSelect value={theme} onChange={(e) => setTheme(e.target.value)}>
          {THEME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </PSelect>
      </div>

      {/* Müfredat Hedefi */}
      {availableGoals.length > 0 && (
        <div>
          <PLabel>
            Müfredat Hedefi <span style={{ fontSize: 10, fontWeight: 500, color: "var(--poster-ink-3)" }}>opsiyonel</span>
          </PLabel>
          <PSelect value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">Hedef seçin (opsiyonel)</option>
            {availableGoals.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </PSelect>
        </div>
      )}

      <button type="submit" disabled={loading} style={submitStyle}>
        {loading ? "Üretiliyor..." : "Eşleştirme Kartları Üret"}
      </button>
      <p style={{ textAlign: "center", fontSize: 11, color: "var(--poster-ink-3)", margin: 0 }}>
        15 kredi kullanılacak
      </p>
    </form>
  );

  const result = loading ? (
    <ToolLoadingCard>
      <LoadingMessages />
    </ToolLoadingCard>
  ) : game ? (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <PBadge color={MATCH_TYPE_BADGE[game.matchType] ?? "soft"}>
            {MATCH_TYPE_LABEL[game.matchType] ?? game.matchType}
          </PBadge>
          <PBadge color={DIFFICULTY_BADGE[game.difficulty] ?? "soft"}>
            {DIFFICULTY_LABEL[game.difficulty] ?? game.difficulty}
          </PBadge>
          <PBadge color="soft">{pairs.length} çift</PBadge>
          {game.theme && <PBadge color="soft">{game.theme}</PBadge>}
        </div>
        <div
          style={{
            display: "inline-flex",
            padding: 3,
            background: "var(--poster-panel)",
            border: "2px solid var(--poster-ink)",
            borderRadius: 10,
            boxShadow: "var(--poster-shadow-sm)",
          }}
        >
          <button type="button" onClick={() => setViewMode("table")} style={toggleBtn(viewMode === "table")}>
            <LayoutList style={{ width: 14, height: 14 }} /> Tablo
          </button>
          <button type="button" onClick={() => setViewMode("cards")} style={toggleBtn(viewMode === "cards")}>
            <LayoutGrid style={{ width: 14, height: 14 }} /> Kartlar
          </button>
        </div>
      </div>

      <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--poster-ink)", margin: "0 0 16px", letterSpacing: "-.01em" }}>
          {game.title}
        </h2>

        {viewMode === "table" ? (
          <div
            style={{
              background: "var(--poster-panel)",
              border: "2px solid var(--poster-ink)",
              borderRadius: 12,
              boxShadow: "0 3px 0 var(--poster-ink)",
              overflow: "hidden",
              marginBottom: 18,
            }}
          >
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--poster-bg-2)", borderBottom: "2px solid var(--poster-ink)" }}>
                  <th style={{ width: 36, padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, color: "var(--poster-ink-2)", textTransform: "uppercase", letterSpacing: ".08em" }}>#</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, color: "var(--poster-ink-2)", textTransform: "uppercase", letterSpacing: ".08em" }}>Kart A</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, color: "var(--poster-ink-2)", textTransform: "uppercase", letterSpacing: ".08em" }}>Kart B</th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((pair: MatchingPair, i: number) => (
                  <tr key={pair.id ?? i} style={{ borderTop: i === 0 ? "none" : "2px dashed var(--poster-ink-faint)" }}>
                    <td style={{ padding: "10px 12px", fontSize: 11, color: "var(--poster-ink-3)", fontWeight: 700 }}>{pair.id ?? i + 1}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: "var(--poster-ink)" }}>{pair.cardA}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--poster-ink)" }}>
                      {pair.cardB}
                      {pair.hint && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: "var(--poster-ink-3)", fontStyle: "italic" }}>
                          ({pair.hint})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ marginBottom: 18 }}>
            <PrintableCards game={game} />
          </div>
        )}

        {game.instructions && (
          <div
            style={{
              padding: 14,
              background: "var(--poster-bg-2)",
              border: "2px solid var(--poster-ink)",
              borderRadius: 12,
              boxShadow: "0 2px 0 var(--poster-ink)",
              display: "flex",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <Info style={{ width: 16, height: 16, color: "var(--poster-ink-2)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-ink-2)", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 4px" }}>
                Nasıl Oynanır
              </p>
              <p style={{ fontSize: 13, color: "var(--poster-ink)", lineHeight: 1.6, margin: 0 }}>{game.instructions}</p>
            </div>
          </div>
        )}

        {game.adaptations && (
          <div
            style={{
              padding: 14,
              background: "var(--poster-panel)",
              border: "2px solid var(--poster-ink)",
              borderRadius: 12,
              boxShadow: "0 2px 0 var(--poster-ink)",
              marginBottom: 12,
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-ink-2)", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 6px" }}>
              Uyarlama Önerileri
            </p>
            <p style={{ fontSize: 13, color: "var(--poster-ink)", lineHeight: 1.6, margin: 0 }}>{game.adaptations}</p>
          </div>
        )}

        {game.expertNotes && (
          <div
            style={{
              padding: 14,
              background: "#fff3d1",
              border: "2px solid #b7791f",
              borderRadius: 12,
              boxShadow: "0 3px 0 #b7791f",
              display: "flex",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <Lightbulb style={{ width: 16, height: 16, color: "#b7791f", flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#5a3d05", margin: "0 0 4px" }}>Uzman Notları</p>
              <p style={{ fontSize: 12, color: "#5a3d05", lineHeight: 1.6, margin: 0 }}>{game.expertNotes}</p>
            </div>
          </div>
        )}

        <div
          style={{
            background: "var(--poster-panel)",
            border: "2px solid var(--poster-ink)",
            borderRadius: 12,
            boxShadow: "var(--poster-shadow-sm)",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setShowAnswers((v) => !v)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "var(--poster-bg-2)",
              border: "none",
              borderBottom: showAnswers ? "2px solid var(--poster-ink)" : "none",
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              fontSize: 12,
              fontWeight: 800,
              color: "var(--poster-ink-2)",
              textTransform: "uppercase",
              letterSpacing: ".08em",
            }}
          >
            Cevap Anahtarı
            {showAnswers ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
          </button>
          {showAnswers && (
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              {pairs.map((pair: MatchingPair, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--poster-ink)" }}>
                  <span style={{ width: 22, flexShrink: 0, fontWeight: 800, color: "var(--poster-ink-3)" }}>{pair.id ?? i + 1}.</span>
                  <span style={{ fontWeight: 700 }}>{pair.cardA}</span>
                  <span style={{ color: "var(--poster-ink-3)" }}>→</span>
                  <span>{pair.cardB}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </PCard>

      <PCard rounded={14} style={{ padding: 14, background: "var(--poster-panel)" }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-ink-2)", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 10px" }}>
          Sonraki adım
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PBtn
            as="button"
            variant="accent"
            size="md"
            onClick={handleDownloadTable}
            disabled={downloading}
            icon={<Download style={{ width: 16, height: 16 }} />}
          >
            Tablo PDF
          </PBtn>
          <PBtn
            as="button"
            variant="dark"
            size="md"
            onClick={handleDownloadCards}
            disabled={downloading}
            icon={<Download style={{ width: 16, height: 16 }} />}
          >
            Kesme Kartları PDF
          </PBtn>
          {savedCardId && (
            <PBtn as="a" href="/cards" variant="white" size="md" icon={<Library style={{ width: 16, height: 16 }} />}>
              Kütüphane
            </PBtn>
          )}
          <PBtn as="button" variant="white" size="md" onClick={handleReset} icon={<RefreshCw style={{ width: 16, height: 16 }} />}>
            Yeni Oyun
          </PBtn>
        </div>
      </PCard>
    </>
  ) : (
    <ToolEmptyState
      icon="🃏"
      title="Parametreleri ayarlayın"
      hint="Üretilen kartlar burada görünecek"
    />
  );

  return (
    <ToolShell
      title="Kelime Eşleştirme Oyunu"
      description="Dil gelişimi için yazdırılabilir eşleştirme kartları ve oyunları üretin."
      form={form}
      result={result}
    />
  );
}
