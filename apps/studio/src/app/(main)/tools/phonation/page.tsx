"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { RefreshCw, Library } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { WORK_AREA_LABEL, calcAge, getCategoryBadge } from "@/lib/constants";
import { PhonationView } from "@/components/cards/PhonationView";
import type { PhonationActivityContent } from "@/components/cards/PhonationView";
import { ToolShell, ToolEmptyState, ToolLoadingCard } from "@/components/tools/ToolShell";
import { PBtn, PCard, PBadge, PLabel, PSelect, PFieldHint } from "@/components/poster";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  name: string;
  birthDate: string | null;
  workArea: string;
  diagnosis: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOUND_GROUPS = [
  { label: "Sürtünme / Temas", sounds: ["/s/", "/z/", "/ş/", "/ç/", "/c/", "/j/"] },
  { label: "Akıcı",             sounds: ["/r/", "/l/", "/n/", "/m/"] },
  { label: "Patlayıcı",         sounds: ["/k/", "/g/", "/t/", "/d/", "/p/", "/b/"] },
  { label: "Diğer",             sounds: ["/f/", "/v/", "/h/", "/y/"] },
];

type ActivityType = "sound_hunt" | "bingo" | "snakes_ladders" | "word_chain" | "sound_maze";

const ACTIVITY_TYPE_OPTIONS: {
  value: ActivityType;
  label: string;
  desc: string;
  emoji: string;
  counts: number[];
  countLabel: (n: number) => string;
}[] = [
  {
    value: "sound_hunt",
    label: "Ses Avı",
    desc: "Sahnedeki hedef sesli nesneleri bul",
    emoji: "🔍",
    counts: [8, 12, 16],
    countLabel: (n) => `${n} nesne`,
  },
  {
    value: "bingo",
    label: "Tombala",
    desc: "Hedef sesli kelimelerle tombala kartı",
    emoji: "🎰",
    counts: [9, 16, 25],
    countLabel: (n) => n === 9 ? "3×3" : n === 16 ? "4×4" : "5×5",
  },
  {
    value: "snakes_ladders",
    label: "Yılan Merdiven",
    desc: "Hedef sesli kelimelerle oyun tahtası",
    emoji: "🐍",
    counts: [15, 20, 25],
    countLabel: (n) => `${n} kare`,
  },
  {
    value: "word_chain",
    label: "Kelime Zinciri",
    desc: "Son sesle başlayan yeni kelime zinciri",
    emoji: "🔗",
    counts: [8, 12, 16],
    countLabel: (n) => `${n} kelime`,
  },
  {
    value: "sound_maze",
    label: "Ses Labirenti",
    desc: "Hedef sesli kelimeleri takip ederek çık",
    emoji: "🌀",
    counts: [10, 15, 20],
    countLabel: (n) => `${n} kelime`,
  },
];

type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; desc: string }[] = [
  { value: "easy",   label: "Kolay", desc: "Sık kullanılan, somut kelimeler" },
  { value: "medium", label: "Orta",  desc: "Daha az sık, bazıları soyut" },
  { value: "hard",   label: "Zor",   desc: "Soyut kavramlar, çok heceli" },
];

const THEME_OPTIONS = [
  { value: "",                    label: "Tema yok (karışık)" },
  { value: "Hayvanlar",           label: "Hayvanlar" },
  { value: "Yiyecekler",          label: "Yiyecekler" },
  { value: "Mevsimler ve hava",   label: "Mevsimler ve hava" },
  { value: "Meslekler",           label: "Meslekler" },
  { value: "Okul eşyaları",       label: "Okul eşyaları" },
  { value: "Vücut bölümleri",     label: "Vücut bölümleri" },
  { value: "Spor ve oyunlar",     label: "Spor ve oyunlar" },
];

const LOADING_MSGS = [
  "Hedef ses analiz ediliyor...",
  "Aktivite tasarlanıyor...",
  "Türkçe kelime dağarcığı taranıyor...",
  "Oyun öğeleri hazırlanıyor...",
  "Talimatlar oluşturuluyor...",
  "Uzman notları ekleniyor...",
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

// ─── PDF Download ─────────────────────────────────────────────────────────────

async function downloadPhonationPDF(activity: PhonationActivityContent, studentName?: string) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);

  const today = formatDate(new Date(), "medium");
  const sounds = Array.isArray(activity.targetSounds) ? activity.targetSounds : [];

  const ACTIVITY_TYPE_LABEL: Record<string, string> = {
    sound_hunt:     "Ses Avı",
    bingo:          "Tombala",
    snakes_ladders: "Yılan Merdiven",
    word_chain:     "Kelime Zinciri",
    sound_maze:     "Ses Labirenti",
  };

  const COL_NUM  = 40;
  const COL_TYPE = 145;

  const S = StyleSheet.create({
    page:     { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 44, paddingBottom: 70 },
    title:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 6 },
    infoRow:  { flexDirection: "row", flexWrap: "wrap", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#e4e4e7", paddingBottom: 10 },
    badge:    { fontSize: 8, color: "#52525b", backgroundColor: "#f4f4f5", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 4 },
    secHdr:   { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, color: "#71717a", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
    tblWrap:  { borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 4, marginBottom: 12, overflow: "hidden" },
    tHdr:     { flexDirection: "row", backgroundColor: "#f4f4f5", paddingVertical: 6, paddingHorizontal: 8 },
    thNum:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#a1a1aa", width: COL_NUM },
    thCell:   { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#71717a", flex: 1 },
    thType:   { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#71717a", width: COL_TYPE },
    tRow:     { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: "#f4f4f5", alignItems: "flex-start" },
    tdNum:    { fontSize: 9, color: "#a1a1aa", width: COL_NUM, paddingTop: 1 },
    tdCell:   { fontSize: 9, color: "#18181b", flex: 1 },
    tdType:   { width: COL_TYPE },
    typeBadge:{ borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, alignSelf: "flex-start" },
    typeTxt:  { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8 },
    box:      { borderRadius: 4, padding: 10, marginBottom: 10, borderWidth: 1 },
    boxTitle: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, marginBottom: 3 },
    boxText:  { fontSize: 9, lineHeight: 1.6 },
    footer:   { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e4e4e7", paddingTop: 6 },
    footTxt:  { fontSize: 8, color: "#a1a1aa" },
  });

  const Table = ({
    hdrLeft, hdrRight, rows,
  }: {
    hdrLeft: string;
    hdrRight: string;
    rows: { num: number | string; left: string; rightLabel: string; rightBg: string; rightColor: string }[];
  }) => (
    <View style={S.tblWrap}>
      <View style={S.tHdr}>
        <Text style={S.thNum}>#</Text>
        <Text style={S.thCell}>{hdrLeft}</Text>
        <Text style={S.thType}>{hdrRight}</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={[S.tRow, { backgroundColor: i % 2 === 1 ? "#fafafa" : "#fff" }]}>
          <Text style={S.tdNum}>{r.num}</Text>
          <Text style={S.tdCell}>{r.left}</Text>
          <View style={S.tdType}>
            <View style={[S.typeBadge, { backgroundColor: r.rightBg }]}>
              <Text style={[S.typeTxt, { color: r.rightColor }]}>{r.rightLabel}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderContent = () => {
    if (activity.activityType === "sound_hunt") {
      const objects = Array.isArray(activity.objects) ? activity.objects : [];
      const tableRows = objects.map((obj, i) => ({
        num: i + 1,
        left: obj.name,
        rightLabel: obj.hasTargetSound ? "Evet ✓" : "Hayır",
        rightBg:    obj.hasTargetSound ? "#dcfce7" : "#f4f4f5",
        rightColor: obj.hasTargetSound ? "#166534" : "#6b7280",
      }));
      return (
        <View>
          {activity.scene ? (
            <View style={[S.box, { backgroundColor: "#f0f9ff", borderColor: "#bae6fd" }]}>
              <Text style={[S.boxTitle, { color: "#0369a1" }]}>Sahne</Text>
              <Text style={[S.boxText, { color: "#0c4a6e" }]}>{activity.scene}</Text>
            </View>
          ) : null}
          <Text style={S.secHdr}>Nesneler ({objects.length})</Text>
          <Table hdrLeft="Nesne" hdrRight="Hedef Ses?" rows={tableRows} />
        </View>
      );
    }

    if (activity.activityType === "bingo") {
      const grid  = activity.grid;
      if (!grid) return null;
      const cells = Array.isArray(grid.cells) ? grid.cells : [];
      const rows: (typeof cells)[] = [];
      for (let r = 0; r < grid.rows; r++) {
        rows.push(cells.slice(r * grid.cols, (r + 1) * grid.cols));
      }
      const cellW = Math.floor(507 / grid.cols) - 2;
      return (
        <View>
          <Text style={S.secHdr}>Tombala Kartı — {grid.rows}×{grid.cols}</Text>
          {rows.map((rowCells, ri) => (
            <View key={ri} style={{ flexDirection: "row", marginBottom: 2 }}>
              {rowCells.map((cell, ci) => (
                <View
                  key={ci}
                  style={{
                    width: cellW,
                    marginRight: ci < rowCells.length - 1 ? 2 : 0,
                    borderWidth: 2,
                    borderColor: "#f59e0b",
                    borderRadius: 3,
                    paddingVertical: 8,
                    paddingHorizontal: 4,
                    backgroundColor: "#fffbeb",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, textAlign: "center", color: "#92400e" }}>
                    {cell.word}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }

    if (activity.activityType === "snakes_ladders") {
      const grid = activity.grid;
      if (!grid) return null;
      const cells = Array.isArray(grid.cells) ? grid.cells : [];
      const total = cells.length;
      const tableRows = cells.map((cell) => {
        const isFinish = cell.position === total;
        if (cell.isLadder) return { num: cell.position, left: cell.word, rightLabel: "↑ Merdiven", rightBg: "#16a34a", rightColor: "#fff" };
        if (cell.isSnake)  return { num: cell.position, left: cell.word, rightLabel: "↓ Yılan",   rightBg: "#dc2626", rightColor: "#fff" };
        if (isFinish)      return { num: cell.position, left: cell.word, rightLabel: "Bitis",      rightBg: "#f59e0b", rightColor: "#fff" };
        return                    { num: cell.position, left: cell.word, rightLabel: "Normal",     rightBg: "transparent", rightColor: "#a1a1aa" };
      });
      return (
        <View>
          <Text style={S.secHdr}>Oyun Tahtası ({total} kare)</Text>
          <Table hdrLeft="Kelime" hdrRight="Kare Türü" rows={tableRows} />
        </View>
      );
    }

    if (activity.activityType === "word_chain") {
      const chain = Array.isArray(activity.wordChain) ? activity.wordChain : [];
      const tableRows = chain.map((item) => ({
        num: item.order,
        left: item.word,
        rightLabel: item.connection ?? "",
        rightBg: "transparent",
        rightColor: "#6b7280",
      }));
      return (
        <View>
          <Text style={S.secHdr}>Kelime Zinciri ({chain.length} kelime)</Text>
          <Table hdrLeft="Kelime" hdrRight="Bağlantı" rows={tableRows} />
        </View>
      );
    }

    if (activity.activityType === "sound_maze") {
      const grid = activity.grid;
      if (!grid) return null;
      const cells = Array.isArray(grid.cells) ? grid.cells : [];
      const tableRows = cells.map((cell, i) => ({
        num: i === 0 ? "GİRİŞ" : i === cells.length - 1 ? "ÇIKIŞ" : cell.position ?? i + 1,
        left: cell.word,
        rightLabel: cell.hasTargetSound ? "✓ Doğru Yol" : "✗ Yanlış",
        rightBg:    cell.hasTargetSound ? "#dcfce7" : "#fee2e2",
        rightColor: cell.hasTargetSound ? "#166534" : "#991b1b",
      }));
      return (
        <View>
          <Text style={S.secHdr}>Ses Labirenti ({cells.length} kelime)</Text>
          <Table hdrLeft="Kelime" hdrRight="Doğru Yol?" rows={tableRows} />
        </View>
      );
    }

    return null;
  };

  const Doc = () => (
    <Document title={activity.title} author="LudenLab">
      <Page size="A4" style={S.page}>
        <Text style={S.title}>{activity.title}</Text>

        <View style={S.infoRow}>
          {studentName ? <Text style={S.badge}>Öğrenci: {studentName}</Text> : null}
          <Text style={S.badge}>{ACTIVITY_TYPE_LABEL[activity.activityType] ?? activity.activityType}</Text>
          <Text style={S.badge}>{activity.difficulty === "easy" ? "Kolay" : activity.difficulty === "medium" ? "Orta" : "Zor"}</Text>
          {sounds.map((s, i) => <Text key={i} style={S.badge}>{s}</Text>)}
          {activity.theme ? <Text style={S.badge}>{activity.theme}</Text> : null}
        </View>

        {renderContent()}

        {activity.instructions ? (
          <View style={[S.box, { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e4e4e7" }]}>
            <Text style={[S.boxTitle, { color: "#374151" }]}>Nasıl Oynanır</Text>
            <Text style={[S.boxText, { color: "#4b5563" }]}>{activity.instructions}</Text>
          </View>
        ) : null}

        {activity.adaptations ? (
          <View style={[S.box, { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e4e4e7" }]}>
            <Text style={[S.boxTitle, { color: "#374151" }]}>Uyarlama Önerileri</Text>
            <Text style={[S.boxText, { color: "#4b5563" }]}>{activity.adaptations}</Text>
          </View>
        ) : null}

        {activity.expertNotes ? (
          <View style={[S.box, { backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a" }]}>
            <Text style={[S.boxTitle, { color: "#92400e" }]}>Uzman Notları</Text>
            <Text style={[S.boxText, { color: "#78350f" }]}>{activity.expertNotes}</Text>
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
  a.download = `${(activity.title ?? "sesletim").replace(/\s+/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Style Helpers ────────────────────────────────────────────────────────────

const pillStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: "2px solid var(--poster-ink)",
  background: active ? "var(--poster-ink)" : "#fff",
  color: active ? "#fff" : "var(--poster-ink)",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: active ? "2px 2px 0 var(--poster-ink)" : "none",
  transition: "all 0.1s",
});

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
  textAlign: "center" as const,
});

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PhonationPage() {
  const [students, setStudents]               = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  const [studentId,     setStudentId]     = useState("");
  const [targetSounds,  setTargetSounds]  = useState<string[]>([]);
  const [activityType,  setActivityType]  = useState<ActivityType>("sound_hunt");
  const [difficulty,    setDifficulty]    = useState<Difficulty>("easy");
  const [itemCount,     setItemCount]     = useState<number>(8);
  const [theme,         setTheme]         = useState("");

  const [loading,     setLoading]     = useState(false);
  const [activity,    setActivity]    = useState<PhonationActivityContent | null>(null);
  const [savedCardId, setSavedCardId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [formKey,     setFormKey]     = useState(0);
  const [soundsTouched, setSoundsTouched] = useState(false);

  const soundsError = targetSounds.length === 0 ? "En az bir hedef ses seçin" : null;
  const showSoundsError = soundsTouched && soundsError;

  const selectedStudent    = students.find((s) => s.id === studentId) ?? null;
  const selectedTypeOption = ACTIVITY_TYPE_OPTIONS.find((o) => o.value === activityType)!;

  function handleActivityTypeChange(type: ActivityType) {
    setActivityType(type);
    const opt = ACTIVITY_TYPE_OPTIONS.find((o) => o.value === type);
    if (opt) setItemCount(opt.counts[0]!);
  }

  function toggleSound(sound: string) {
    setSoundsTouched(true);
    setTargetSounds((prev) =>
      prev.includes(sound) ? prev.filter((s) => s !== sound) : [...prev, sound]
    );
  }

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((d) => setStudents(d.students ?? []))
      .finally(() => setStudentsLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSoundsTouched(true);
    if (soundsError) return;

    setLoading(true);
    setActivity(null);
    setSavedCardId(null);

    try {
      const res = await fetch("/api/tools/phonation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId:    studentId || undefined,
          targetSounds,
          activityType,
          difficulty,
          itemCount,
          theme:        theme || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Bir hata oluştu"); return; }
      setActivity(data.activity as PhonationActivityContent);
      setSavedCardId(data.cardId ?? null);
      toast.success("Sesletim aktivitesi üretildi!");
    } catch {
      toast.error("Bağlantı hatası, tekrar deneyin");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setActivity(null);
    setSavedCardId(null);
    setFormKey((k) => k + 1);
    setStudentId("");
    setTargetSounds([]);
    setActivityType("sound_hunt");
    setDifficulty("easy");
    setItemCount(8);
    setTheme("");
  }

  async function handleDownload() {
    if (!activity) return;
    setDownloading(true);
    const t = toast.loading("PDF hazırlanıyor...");
    try {
      await downloadPhonationPDF(activity, selectedStudent?.name);
      toast.success("PDF indirildi", { id: t });
    } catch {
      toast.error("PDF oluşturulamadı", { id: t });
    } finally {
      setDownloading(false);
    }
  }

  const form = (
    <form key={formKey} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Öğrenci */}
      <div>
        <PLabel optional>Öğrenci</PLabel>
        <PSelect value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">{studentsLoading ? "Yükleniyor..." : "Öğrenci seçin"}</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </PSelect>
        {selectedStudent && (
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {selectedStudent.birthDate && (
              <PBadge color="soft">{calcAge(selectedStudent.birthDate)}</PBadge>
            )}
            <PBadge color={getCategoryBadge(selectedStudent.workArea)}>
              {WORK_AREA_LABEL[selectedStudent.workArea] ?? selectedStudent.workArea}
            </PBadge>
            {selectedStudent.diagnosis && (
              <PBadge color="soft">{selectedStudent.diagnosis}</PBadge>
            )}
          </div>
        )}
      </div>

      {/* Hedef Sesler */}
      <div>
        <PLabel required>
          Hedef Ses(ler)
          {targetSounds.length > 0 && (
            <span style={{ marginLeft: 6, fontWeight: 700, color: "var(--poster-accent)", textTransform: "none" }}>
              · {targetSounds.length} seçili
            </span>
          )}
        </PLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SOUND_GROUPS.map((group) => (
            <div key={group.label}>
              <p style={{ fontSize: 10, fontWeight: 800, color: "var(--poster-ink-3)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: ".05em" }}>
                {group.label}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {group.sounds.map((sound) => (
                  <button
                    key={sound}
                    type="button"
                    onClick={() => toggleSound(sound)}
                    style={pillStyle(targetSounds.includes(sound))}
                  >
                    {sound}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {showSoundsError && <PFieldHint tone="error">{soundsError}</PFieldHint>}
      </div>

      {/* Aktivite Türü */}
      <div>
        <PLabel>Aktivite Türü</PLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ACTIVITY_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleActivityTypeChange(opt.value)}
              style={rowStyle(activityType === opt.value)}
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
      </div>

      {/* Zorluk */}
      <div>
        <PLabel>Zorluk</PLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDifficulty(opt.value)}
              style={gridBtnStyle(difficulty === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Öğe Sayısı */}
      <div>
        <PLabel>
          {activityType === "bingo" ? "Kart Boyutu" : activityType === "snakes_ladders" ? "Kare Sayısı" : activityType === "word_chain" || activityType === "sound_maze" ? "Kelime Sayısı" : "Nesne Sayısı"}
        </PLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {selectedTypeOption.counts.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setItemCount(n)}
              style={gridBtnStyle(itemCount === n)}
            >
              {selectedTypeOption.countLabel(n)}
            </button>
          ))}
        </div>
      </div>

      {/* Tema */}
      <div>
        <PLabel>
          Tema <span style={{ fontWeight: 500, color: "var(--poster-ink-3)", textTransform: "none" }}>(opsiyonel)</span>
        </PLabel>
        <PSelect value={theme} onChange={(e) => setTheme(e.target.value)}>
          {THEME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </PSelect>
      </div>

      {/* Submit */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
        <PBtn
          type="submit"
          variant="accent"
          disabled={loading || targetSounds.length === 0}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {loading ? "Üretiliyor..." : "Aktivite Üret"}
        </PBtn>
        <p style={{ fontSize: 11, color: "var(--poster-ink-3)", textAlign: "center", margin: 0 }}>
          15 kredi kullanılacak
        </p>
      </div>
    </form>
  );

  const result = loading ? (
    <ToolLoadingCard>
      <LoadingMessages />
    </ToolLoadingCard>
  ) : activity ? (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <PBtn variant="accent" onClick={handleDownload} disabled={downloading}>
          {downloading ? "Hazırlanıyor…" : "PDF İndir"}
        </PBtn>
        {savedCardId && (
          <PBtn as="a" href={`/cards/${savedCardId}`} variant="white" icon={<Library style={{ width: 14, height: 14 }} />}>
            Kütüphanede Gör
          </PBtn>
        )}
        <PBtn variant="white" onClick={handleReset} icon={<RefreshCw style={{ width: 14, height: 14 }} />}>
          Yeni Aktivite
        </PBtn>
      </div>
      <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
        <PhonationView activity={activity} />
      </PCard>
    </>
  ) : (
    <ToolEmptyState
      icon="🎮"
      title="Aktivite burada görünecek"
      hint='Sol formu doldurun ve "Aktivite Üret" butonuna tıklayın.'
    />
  );

  return (
    <ToolShell
      title="Sesletim Aktivitesi Üretici"
      description="Hedef ses çalışmaları için eğlenceli ve yazdırılabilir oyun aktiviteleri üretin."
      form={form}
      result={result}
      formWidth={400}
    />
  );
}
