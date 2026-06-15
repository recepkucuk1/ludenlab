"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { RefreshCw, Library, Plus, X, Lock, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { WORK_AREA_LABEL, calcAge, getCategoryBadge } from "@/lib/constants";
import { SessionSummaryView, type SessionSummaryContent } from "@/components/cards/SessionSummaryView";
import { PBtn, PCard, PBadge, PSelect, PLabel, PInput, PTextarea, PCheckbox, PFieldHint } from "@/components/poster";
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
  code: string;
  title: string;
  isMainGoal: boolean;
}

interface CurriculumItem {
  id: string;
  area: string;
  title: string;
  goals: CurriculumGoal[];
}

interface GoalEntry {
  tempId: string;
  goalId: string;
  title: string;
  accuracy: number;
  cueLevel: string;
}


// ─── Constants ────────────────────────────────────────────────────────────────

const DURATION_OPTIONS = ["20", "30", "40", "45", "60"] as const;
type Duration = (typeof DURATION_OPTIONS)[number];

const SESSION_TYPE_OPTIONS = [
  { value: "individual",     label: "Bireysel Oturum" },
  { value: "group",          label: "Grup Oturumu" },
  { value: "assessment",     label: "Değerlendirme Oturumu" },
  { value: "parent_meeting", label: "Veli Görüşmesi" },
] as const;
type SessionType = (typeof SESSION_TYPE_OPTIONS)[number]["value"];

const PERFORMANCE_OPTIONS = [
  { value: "above_target",  label: "Beklenenin Üstünde" },
  { value: "on_target",     label: "Hedefle Uyumlu" },
  { value: "progressing",   label: "Gelişim Gösteriyor" },
  { value: "needs_support", label: "Ek Destek Gerekiyor" },
  { value: "not_assessed",  label: "Değerlendirme Yapılamadı" },
] as const;
type OverallPerformance = (typeof PERFORMANCE_OPTIONS)[number]["value"];

const CUE_LEVELS = [
  "Bağımsız",
  "Minimum İpucu",
  "Orta İpucu",
  "Maksimum İpucu",
  "Tam Destek",
];

const LOADING_MSGS = [
  "Öğrenci profili analiz ediliyor...",
  "Oturum hedefleri değerlendiriliyor...",
  "Performans analizi yapılıyor...",
  "Veli notu hazırlanıyor...",
  "Rapor yapılandırılıyor...",
  "Son dokunuşlar yapılıyor...",
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

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

// ─── PDF Downloads (unchanged) ────────────────────────────────────────────────

async function downloadFullPDF(summary: SessionSummaryContent, studentName?: string) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });

  const today = formatDate(new Date(), "medium");
  const goals = Array.isArray(summary.goalPerformance) ? summary.goalPerformance : [];

  function parseAccPct(acc: string | number): number {
    if (typeof acc === "number") return Math.min(100, Math.max(0, acc));
    const m = String(acc).match(/\d+/);
    return m ? Math.min(100, Math.max(0, parseInt(m[0]))) : 0;
  }
  function barColor(pct: number): string {
    if (pct >= 81) return "#16a34a";
    if (pct >= 61) return "#ca8a04";
    if (pct >= 31) return "#FE703A";
    return "#ef4444";
  }

  const S = StyleSheet.create({
    page:       { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 44, paddingBottom: 70 },
    title:      { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 6 },
    infoRow:    { flexDirection: "row", flexWrap: "wrap", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#e4e4e7", paddingBottom: 10 },
    infoBadge:  { fontSize: 8, color: "#52525b", backgroundColor: "#f4f4f5", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 4 },
    secHdr:     { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, color: "#71717a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
    goalCard:   { borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 4, padding: 10, marginBottom: 8 },
    goalTitle:  { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 10, color: "#18181b", marginBottom: 6 },
    barBg:      { height: 5, backgroundColor: "#f4f4f5", borderRadius: 3, marginBottom: 6 },
    cueBadge:   { fontSize: 8, color: "#52525b", backgroundColor: "#f4f4f5", borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", marginBottom: 6 },
    bodyText:   { fontSize: 9, lineHeight: 1.6, color: "#3f3f46" },
    recRow:     { flexDirection: "row", marginTop: 4 },
    recBullet:  { fontSize: 8, color: "#a1a1aa", marginRight: 4, marginTop: 1 },
    recText:    { flex: 1, fontSize: 8, color: "#71717a", lineHeight: 1.5 },
    box:        { borderRadius: 4, padding: 10, marginBottom: 10 },
    boxTitle:   { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, marginBottom: 4 },
    boxText:    { fontSize: 9, lineHeight: 1.6 },
    footer:     { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e4e4e7", paddingTop: 6 },
    footerTxt:  { fontSize: 8, color: "#a1a1aa" },
  });

  const Doc = () => (
    <Document title={summary.title ?? "Oturum Özeti"} author="LudenLab">
      <Page size="A4" style={S.page}>
        <Text style={S.title}>{summary.title ?? "Oturum Özeti"}</Text>

        <View style={S.infoRow}>
          {studentName ? <Text style={S.infoBadge}>Öğrenci: {studentName}</Text> : null}
          {summary.sessionInfo?.date     ? <Text style={S.infoBadge}>{summary.sessionInfo.date}</Text> : null}
          {summary.sessionInfo?.duration ? <Text style={S.infoBadge}>{summary.sessionInfo.duration}</Text> : null}
          {summary.sessionInfo?.type     ? <Text style={S.infoBadge}>{summary.sessionInfo.type}</Text> : null}
        </View>

        {goals.length > 0 ? (
          <View style={{ marginBottom: 14 }}>
            <Text style={S.secHdr}>Çalışılan Hedefler</Text>
            {goals.map((g, i) => {
              const pct = parseAccPct(g.accuracy);
              return (
                <View key={i} style={S.goalCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Text style={[S.goalTitle, { flex: 1, marginRight: 8 }]}>{g.goal}</Text>
                    <Text style={{ fontSize: 9, fontFamily: "NotoSans", fontWeight: "bold", color: barColor(pct) }}>{g.accuracy}</Text>
                  </View>
                  <View style={S.barBg}>
                    <View style={{ height: 5, borderRadius: 3, width: `${pct}%`, backgroundColor: barColor(pct) }} />
                  </View>
                  {g.cueLevel ? <Text style={S.cueBadge}>{g.cueLevel}</Text> : null}
                  {g.analysis ? <Text style={S.bodyText}>{g.analysis}</Text> : null}
                  {g.recommendation ? (
                    <View style={S.recRow}>
                      <Text style={S.recBullet}>›</Text>
                      <Text style={S.recText}>{g.recommendation}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {summary.overallAssessment ? (
          <View style={[S.box, { backgroundColor: "#f0f9ff", borderWidth: 1, borderColor: "#bae6fd" }]}>
            <Text style={[S.boxTitle, { color: "#0369a1" }]}>Genel Değerlendirme</Text>
            <Text style={[S.boxText, { color: "#0c4a6e" }]}>{summary.overallAssessment}</Text>
          </View>
        ) : null}

        {summary.behaviorNotes ? (
          <View style={[S.box, { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e4e4e7" }]}>
            <Text style={[S.boxTitle, { color: "#374151" }]}>Davranış ve Katılım</Text>
            <Text style={[S.boxText, { color: "#4b5563" }]}>{summary.behaviorNotes}</Text>
          </View>
        ) : null}

        {summary.nextSessionPlan ? (
          <View style={[S.box, { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderLeftWidth: 3, borderLeftColor: "#16a34a" }]}>
            <Text style={[S.boxTitle, { color: "#15803d" }]}>Sonraki Oturum Planı</Text>
            <Text style={[S.boxText, { color: "#166534" }]}>{summary.nextSessionPlan}</Text>
          </View>
        ) : null}

        {summary.parentNote ? (
          <View style={[S.box, { backgroundColor: "#f0fdf4", borderWidth: 2, borderColor: "#86efac" }]}>
            <Text style={[S.boxTitle, { color: "#15803d" }]}>Veliye İletilecek Not</Text>
            <Text style={[S.boxText, { color: "#166534" }]}>{summary.parentNote}</Text>
          </View>
        ) : null}

        {summary.expertNotes ? (
          <View style={[S.box, { backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a" }]}>
            <Text style={[S.boxTitle, { color: "#92400e" }]}>Uzman Notları (Gizli)</Text>
            <Text style={[S.boxText, { color: "#78350f" }]}>{summary.expertNotes}</Text>
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
  a.download = `${(summary.title ?? "oturum-ozeti").replace(/\s+/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadParentPDF(summary: SessionSummaryContent, studentName?: string) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });

  const today = formatDate(new Date(), "medium");

  const S = StyleSheet.create({
    page:    { fontFamily: "NotoSans", fontSize: 11, color: "#18181b", padding: 56, paddingBottom: 70 },
    header:  { marginBottom: 24, borderBottomWidth: 2, borderBottomColor: "#023435", paddingBottom: 16 },
    brand:   { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 10, color: "#023435", marginBottom: 4 },
    h1:      { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 4 },
    sub:     { fontSize: 10, color: "#52525b" },
    body:    { fontSize: 11, lineHeight: 1.8, color: "#27272a" },
    footer:  { position: "absolute", bottom: 28, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e4e4e7", paddingTop: 6 },
    footTxt: { fontSize: 8, color: "#a1a1aa" },
  });

  const Doc = () => (
    <Document title="Veli Notu" author="LudenLab">
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <Text style={S.brand}>LudenLab</Text>
          <Text style={S.h1}>Veli Bilgilendirme Notu</Text>
          <Text style={S.sub}>
            {studentName ? `Öğrenci: ${studentName}  ·  ` : ""}
            {summary.sessionInfo?.date ?? today}
          </Text>
        </View>

        <Text style={S.body}>{summary.parentNote ?? ""}</Text>

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
  a.download = `Veli_Notu_${(studentName ?? "ogrenci").replace(/\s+/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SessionSummaryPage() {
  const [students, setStudents]           = useState<Student[]>([]);
  const [curricula, setCurricula]         = useState<CurriculumItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  const [studentId,          setStudentId]          = useState("");
  const [sessionDate,        setSessionDate]        = useState(todayStr());
  const [duration,           setDuration]           = useState<Duration>("45");
  const [sessionType,        setSessionType]        = useState<SessionType>("individual");
  const [selectedGoals,      setSelectedGoals]      = useState<GoalEntry[]>([]);
  const [overallPerformance, setOverallPerformance] = useState<OverallPerformance>("on_target");
  const [behaviorNotes,      setBehaviorNotes]      = useState("");
  const [nextSessionNotes,   setNextSessionNotes]   = useState("");

  const [loading,       setLoading]       = useState(false);
  const [summary,       setSummary]       = useState<SessionSummaryContent | null>(null);
  const [savedCardId,   setSavedCardId]   = useState<string | null>(null);
  const [downloading,   setDownloading]   = useState(false);
  const [formKey,       setFormKey]       = useState(0);

  const [studentTouched, setStudentTouched] = useState(false);
  const [goalsTouched,   setGoalsTouched]   = useState(false);

  const studentError = !studentId ? "Lütfen bir öğrenci seçin" : null;
  const emptyGoalTitle = selectedGoals.find((g) => !g.title.trim());
  const goalsError = selectedGoals.length === 0
    ? "En az bir hedef ekleyin"
    : emptyGoalTitle
    ? "Tüm hedef başlıklarını doldurun"
    : null;
  const showStudentError = studentTouched && studentError;
  const showGoalsError   = goalsTouched && goalsError;

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;

  const availableGoals = curricula
    .filter((c) => selectedStudent?.curriculumIds?.includes(c.id))
    .flatMap((c) =>
      c.goals.map((g) => ({
        id: g.id,
        title: g.title,
        isMainGoal: g.isMainGoal,
        curriculumTitle: c.title,
      }))
    );
  const hasAvailableGoals = availableGoals.length > 0;

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
    setSelectedGoals([]);
  }

  function toggleGoal(goalId: string, goalTitle: string) {
    setGoalsTouched(true);
    setSelectedGoals((prev) => {
      const exists = prev.find((g) => g.tempId === goalId);
      if (exists) return prev.filter((g) => g.tempId !== goalId);
      return [...prev, { tempId: goalId, goalId, title: goalTitle, accuracy: 80, cueLevel: "Bağımsız" }];
    });
  }

  function updateGoal(tempId: string, field: "accuracy" | "cueLevel", value: number | string) {
    setSelectedGoals((prev) =>
      prev.map((g) => g.tempId === tempId ? { ...g, [field]: value } : g)
    );
  }

  function addCustomGoal() {
    setGoalsTouched(true);
    const tempId = `custom-${Date.now()}`;
    setSelectedGoals((prev) => [...prev, { tempId, goalId: "", title: "", accuracy: 80, cueLevel: "Bağımsız" }]);
  }

  function updateCustomTitle(tempId: string, title: string) {
    setGoalsTouched(true);
    setSelectedGoals((prev) =>
      prev.map((g) => g.tempId === tempId ? { ...g, title } : g)
    );
  }

  function removeGoal(tempId: string) {
    setGoalsTouched(true);
    setSelectedGoals((prev) => prev.filter((g) => g.tempId !== tempId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStudentTouched(true);
    setGoalsTouched(true);
    if (studentError || goalsError) return;

    setLoading(true);
    setSummary(null);
    setSavedCardId(null);

    try {
      const res = await fetch("/api/tools/session-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          sessionDate,
          duration,
          sessionType,
          goals: selectedGoals.map((g) => ({
            goalId:    g.goalId,
            goalTitle: g.title.trim(),
            accuracy:  Number(g.accuracy),
            cueLevel:  g.cueLevel,
          })),
          overallPerformance,
          behaviorNotes:    behaviorNotes.trim() || undefined,
          nextSessionNotes: nextSessionNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Bir hata oluştu"); return; }
      setSummary(data.summary as SessionSummaryContent);
      setSavedCardId(data.cardId ?? null);
      toast.success("Oturum özeti oluşturuldu!");
    } catch {
      toast.error("Bağlantı hatası, tekrar deneyin");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSummary(null);
    setSavedCardId(null);
    setFormKey((k) => k + 1);
    setStudentId("");
    setSessionDate(todayStr());
    setDuration("45");
    setSessionType("individual");
    setSelectedGoals([]);
    setOverallPerformance("on_target");
    setBehaviorNotes("");
    setNextSessionNotes("");
  }

  async function handleDownloadFull() {
    if (!summary) return;
    setDownloading(true);
    const t = toast.loading("PDF hazırlanıyor...");
    try {
      await downloadFullPDF(summary, selectedStudent?.name);
      toast.success("PDF indirildi", { id: t });
    } catch {
      toast.error("PDF oluşturulamadı", { id: t });
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadParent() {
    if (!summary) return;
    setDownloading(true);
    const t = toast.loading("Veli notu hazırlanıyor...");
    try {
      await downloadParentPDF(summary, selectedStudent?.name);
      toast.success("Veli notu indirildi", { id: t });
    } catch {
      toast.error("PDF oluşturulamadı", { id: t });
    } finally {
      setDownloading(false);
    }
  }

  // ── Button helpers ───────────────────────────────────────────────────────────
  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 12px",
    background: active ? "var(--poster-ink)" : "var(--poster-panel)",
    color: active ? "#fff" : "var(--poster-ink)",
    border: "2px solid var(--poster-ink)",
    borderRadius: 10,
    boxShadow: active ? "0 2px 0 var(--poster-ink)" : "var(--poster-shadow-sm)",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "var(--font-display)",
  });

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
    fontSize: 13,
    fontWeight: 700,
  });

  const miniInput: React.CSSProperties = {
    height: 30,
    padding: "0 8px",
    background: "var(--poster-panel)",
    border: "2px solid var(--poster-ink)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--poster-ink)",
    outline: "none",
    fontFamily: "var(--font-display)",
  };

  const miniSelect: React.CSSProperties = {
    height: 30,
    padding: "0 24px 0 8px",
    background: `var(--poster-panel) url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 12 8'%3e%3cpath fill='none' stroke='%230E1E26' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='M1 1l5 5 5-5'/%3e%3c/svg%3e") no-repeat right 6px center`,
    border: "2px solid var(--poster-ink)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--poster-ink)",
    outline: "none",
    appearance: "none" as const,
    cursor: "pointer",
    fontFamily: "var(--font-display)",
    flex: 1,
    minWidth: 0,
  };

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
        <PLabel required>Öğrenci</PLabel>
        <PSelect
          value={studentId}
          onChange={(e) => handleStudentChange(e.target.value)}
          onBlur={() => setStudentTouched(true)}
          invalid={!!showStudentError}
          aria-invalid={!!showStudentError}
        >
          <option value="">{studentsLoading ? "Yükleniyor..." : "Öğrenci seçin"}</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </PSelect>
        {showStudentError && <PFieldHint tone="error">{studentError}</PFieldHint>}
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

      {/* Oturum Tarihi */}
      <div>
        <PLabel required>Oturum Tarihi</PLabel>
        <PInput
          type="date"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
          required
        />
      </div>

      {/* Süre */}
      <div>
        <PLabel>Oturum Süresi</PLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {DURATION_OPTIONS.map((d) => (
            <button key={d} type="button" onClick={() => setDuration(d)} style={chipStyle(duration === d)}>
              {d} dk
            </button>
          ))}
        </div>
      </div>

      {/* Oturum Türü */}
      <div>
        <PLabel>Oturum Türü</PLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          {SESSION_TYPE_OPTIONS.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setSessionType(opt.value)} style={rowStyle(sessionType === opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Çalışılan Hedefler */}
      <div>
        <PLabel>
          Çalışılan Hedefler{" "}
          {selectedGoals.length > 0 && (
            <span style={{ color: "var(--poster-accent)", fontWeight: 800 }}>({selectedGoals.length})</span>
          )}
        </PLabel>

        {!studentId ? (
          <p style={{ fontSize: 12, color: "var(--poster-ink-3)", fontStyle: "italic", margin: 0 }}>
            Önce öğrenci seçin
          </p>
        ) : hasAvailableGoals ? (
          <div
            style={{
              background: "var(--poster-panel)",
              border: "2px solid var(--poster-ink)",
              borderRadius: 12,
              boxShadow: "var(--poster-shadow-sm)",
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            {availableGoals.map((goal, i) => {
              const isSelected = selectedGoals.some((g) => g.tempId === goal.id);
              const entry = selectedGoals.find((g) => g.tempId === goal.id);
              return (
                <div
                  key={goal.id}
                  style={{
                    padding: 10,
                    borderTop: i === 0 ? "none" : "2px dashed var(--poster-ink-faint)",
                    background: isSelected ? "var(--poster-bg-2)" : "transparent",
                  }}
                >
                  <PCheckbox
                    checked={isSelected}
                    onChange={() => toggleGoal(goal.id, goal.title)}
                    label={<span style={{ fontSize: 12, lineHeight: 1.5 }}>{goal.title}</span>}
                  />
                  {isSelected && entry && (
                    <div style={{ marginTop: 8, marginLeft: 30, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--poster-ink-3)" }}>%</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={entry.accuracy}
                          onChange={(e) => updateGoal(entry.tempId, "accuracy", Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          style={{ ...miniInput, width: 56, textAlign: "center" }}
                        />
                      </div>
                      <select
                        value={entry.cueLevel}
                        onChange={(e) => updateGoal(entry.tempId, "cueLevel", e.target.value)}
                        style={miniSelect}
                      >
                        {CUE_LEVELS.map((cl) => (
                          <option key={cl} value={cl}>{cl}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {selectedGoals.map((entry) => (
              <div
                key={entry.tempId}
                style={{
                  padding: 10,
                  background: "var(--poster-bg-2)",
                  border: "2px solid var(--poster-ink)",
                  borderRadius: 12,
                  boxShadow: "var(--poster-shadow-sm)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Hedef açıklaması..."
                    value={entry.title}
                    onChange={(e) => updateCustomTitle(entry.tempId, e.target.value)}
                    style={{ ...miniInput, flex: 1 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeGoal(entry.tempId)}
                    style={{
                      width: 28,
                      height: 28,
                      background: "var(--poster-panel)",
                      border: "2px solid var(--poster-ink)",
                      borderRadius: 8,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X style={{ width: 14, height: 14, color: "var(--poster-ink)" }} />
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--poster-ink-3)" }}>%</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={entry.accuracy}
                    onChange={(e) => updateGoal(entry.tempId, "accuracy", Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    style={{ ...miniInput, width: 56, textAlign: "center" }}
                  />
                  <select
                    value={entry.cueLevel}
                    onChange={(e) => updateGoal(entry.tempId, "cueLevel", e.target.value)}
                    style={miniSelect}
                  >
                    {CUE_LEVELS.map((cl) => (
                      <option key={cl} value={cl}>{cl}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addCustomGoal}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                width: "100%",
                padding: "8px 12px",
                background: "var(--poster-panel)",
                border: "2px dashed var(--poster-ink-3)",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                color: "var(--poster-ink-2)",
                cursor: "pointer",
                fontFamily: "var(--font-display)",
              }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Hedef Ekle
            </button>
          </div>
        )}
        {showGoalsError && <PFieldHint tone="error">{goalsError}</PFieldHint>}
      </div>

      {/* Genel Performans */}
      <div>
        <PLabel>Genel Performans Değerlendirmesi</PLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {PERFORMANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setOverallPerformance(opt.value)}
              style={rowStyle(overallPerformance === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Davranış gözlemi */}
      <div>
        <PLabel>
          Davranış ve Katılım Gözlemi{" "}
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--poster-ink-3)" }}>opsiyonel</span>
        </PLabel>
        <PTextarea
          value={behaviorNotes}
          onChange={(e) => setBehaviorNotes(e.target.value)}
          placeholder="Öğrencinin oturum sırasındaki genel tutumu, motivasyonu, dikkat süresi, işbirliği düzeyi..."
          rows={3}
        />
      </div>

      {/* Sonraki oturum notları */}
      <div>
        <PLabel>
          Sonraki Oturum İçin Notlar{" "}
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--poster-ink-3)" }}>opsiyonel</span>
        </PLabel>
        <PTextarea
          value={nextSessionNotes}
          onChange={(e) => setNextSessionNotes(e.target.value)}
          placeholder="Sonraki oturumda odaklanılacak konular, değiştirilecek yaklaşımlar..."
          rows={3}
        />
      </div>

      <button type="submit" disabled={loading} style={submitStyle}>
        {loading ? "Oluşturuluyor..." : "Oturum Özeti Oluştur"}
      </button>
      <p style={{ textAlign: "center", fontSize: 11, color: "var(--poster-ink-3)", margin: 0 }}>
        10 kredi kullanılacak
      </p>
    </form>
  );

  const result = loading ? (
    <ToolLoadingCard>
      <LoadingMessages />
    </ToolLoadingCard>
  ) : summary ? (
    <>
      <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
        <SessionSummaryView summary={summary} />
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
            onClick={handleDownloadFull}
            disabled={downloading}
            icon={<Download style={{ width: 16, height: 16 }} />}
          >
            Tam Rapor PDF
          </PBtn>
          <PBtn
            as="button"
            variant="dark"
            size="md"
            onClick={handleDownloadParent}
            disabled={downloading}
            icon={<Download style={{ width: 16, height: 16 }} />}
          >
            Veli Notu PDF
          </PBtn>
          {savedCardId && (
            <PBtn as="a" href="/cards" variant="white" size="md" icon={<Library style={{ width: 16, height: 16 }} />}>
              Kütüphane
            </PBtn>
          )}
          <PBtn as="button" variant="white" size="md" onClick={handleReset} icon={<RefreshCw style={{ width: 16, height: 16 }} />}>
            Yeni Özet
          </PBtn>
        </div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <Lock style={{ width: 12, height: 12, color: "var(--poster-ink-3)" }} />
          <p style={{ fontSize: 10, color: "var(--poster-ink-3)", margin: 0 }}>
            Tam rapor PDF uzman notlarını içerir. Veli Notu PDF yalnızca genel özeti paylaşır.
          </p>
        </div>
      </PCard>
    </>
  ) : (
    <ToolEmptyState
      icon="📋"
      title="Oturum bilgilerini doldurun"
      hint="Oluşturulan özet burada görünecek"
    />
  );

  return (
    <ToolShell
      title="Oturum Özeti Oluşturucu"
      description="Oturum sonrası profesyonel ve yapılandırılmış değerlendirme raporları oluşturun."
      form={form}
      result={result}
      formWidth={420}
    />
  );
}
