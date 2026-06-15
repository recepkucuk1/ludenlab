"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { RefreshCw, Library, Eye, Star, Clock, Package, ChevronRight, Lightbulb, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { WORK_AREA_LABEL, calcAge, getCategoryBadge } from "@/lib/constants";
import type { HomeworkContent } from "@/components/cards/HomeworkView";
import { PBtn, PCard, PBadge, PSelect, PLabel, PInput, PTextarea, PFieldHint } from "@/components/poster";
import type { BadgeColor } from "@/components/poster";
import { ToolShell, ToolEmptyState, ToolLoadingCard } from "@/components/tools/ToolShell";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  name: string;
  birthDate: string | null;
  workArea: string;
  diagnosis: string | null;
  curriculumIds?: string[];
}

interface CurriculumItem {
  id: string;
  area: string;
  title: string;
  goals?: { id: string; title: string }[];
}


// ─── Constants ────────────────────────────────────────────────────────────────

const GENERAL_AREAS = [
  "Artikülasyon / Ses çalışması",
  "Dil gelişimi / Kelime hazinesi",
  "Akıcı konuşma",
  "Pragmatik dil / Sosyal iletişim",
  "İşitsel algı / Dinleme becerileri",
  "Oral motor egzersizler",
  "Diğer",
];

const MATERIAL_TYPE_OPTIONS = [
  { value: "exercise",       label: "Ev Egzersizi",         desc: "Adım adım yapılandırılmış aktivite" },
  { value: "observation",    label: "Gözlem Formu",          desc: "Velinin çocuğu gözlemleyip not alacağı form" },
  { value: "daily_activity", label: "Günlük Konuşma Aktivitesi", desc: "Günlük rutinlere entegre edilecek aktivite" },
];

const MATERIAL_TYPE_LABEL: Record<string, string> = {
  exercise:       "Ev Egzersizi",
  observation:    "Gözlem Formu",
  daily_activity: "Günlük Aktivite",
};

const MATERIAL_TYPE_BADGE: Record<string, BadgeColor> = {
  exercise:       "blue",
  observation:    "ink",
  daily_activity: "yellow",
};

const LOADING_MSGS = [
  "Öğrenci profili analiz ediliyor...",
  "Hedef çalışma alanı değerlendiriliyor...",
  "Veli dostu talimatlar hazırlanıyor...",
  "Adımlar yapılandırılıyor...",
  "İpuçları ekleniyor...",
  "Son dokunuşlar yapılıyor...",
];

// ─── Loading Messages ─────────────────────────────────────────────────────────

function LoadingMessages() {
  const [index, setIndex]   = useState(0);
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

// ─── Result View ──────────────────────────────────────────────────────────────

function HomeworkResult({ hw, forPdf = false }: { hw: HomeworkContent; forPdf?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--poster-ink)", margin: "0 0 10px", letterSpacing: "-.01em" }}>
          {hw.title}
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <PBadge color={MATERIAL_TYPE_BADGE[hw.materialType] ?? "soft"}>
            {MATERIAL_TYPE_LABEL[hw.materialType] ?? hw.materialType}
          </PBadge>
          {hw.duration && (
            <PBadge color="soft">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Clock style={{ width: 12, height: 12 }} /> {hw.duration}
              </span>
            </PBadge>
          )}
          {hw.targetArea && <PBadge color="soft">{hw.targetArea}</PBadge>}
        </div>
      </div>

      {hw.introduction && (
        <div
          style={{
            padding: 14,
            background: "var(--poster-bg-2)",
            border: "2px solid var(--poster-ink)",
            borderRadius: 12,
            boxShadow: "0 2px 0 var(--poster-ink)",
            display: "flex",
            gap: 10,
          }}
        >
          <Lightbulb style={{ width: 16, height: 16, color: "var(--poster-ink-2)", flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, color: "var(--poster-ink)", lineHeight: 1.6, margin: 0 }}>{hw.introduction}</p>
        </div>
      )}

      {hw.materials && hw.materials.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Package style={{ width: 14, height: 14, color: "var(--poster-ink-2)" }} />
            <p style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-ink-2)", textTransform: "uppercase", letterSpacing: ".08em", margin: 0 }}>
              Gerekli Malzemeler
            </p>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {hw.materials.map((m, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--poster-ink)" }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--poster-accent)", flexShrink: 0 }} />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hw.steps && hw.steps.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-ink-2)", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 10px" }}>
            Adımlar
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {hw.steps.map((step, i) => (
              <div
                key={i}
                style={{
                  padding: 12,
                  background: "var(--poster-panel)",
                  border: "2px solid var(--poster-ink)",
                  borderRadius: 12,
                  boxShadow: "0 2px 0 var(--poster-ink)",
                  display: "flex",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    background: "var(--poster-blue)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {step.stepNumber ?? i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: "var(--poster-ink)", lineHeight: 1.6, margin: 0 }}>{step.instruction}</p>
                  {step.tip && (
                    <p
                      style={{
                        marginTop: 8,
                        padding: "6px 10px",
                        background: "var(--poster-bg-2)",
                        border: "2px dashed var(--poster-ink-faint)",
                        borderRadius: 8,
                        fontSize: 11,
                        fontStyle: "italic",
                        color: "var(--poster-ink-2)",
                      }}
                    >
                      <ChevronRight style={{ display: "inline", width: 12, height: 12, marginRight: 2, verticalAlign: "-2px" }} />
                      {step.tip}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hw.watchFor && (
        <div
          style={{
            padding: 14,
            background: "#fff3d1",
            border: "2px solid #b7791f",
            borderRadius: 12,
            boxShadow: "0 3px 0 #b7791f",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Eye style={{ width: 16, height: 16, color: "#b7791f" }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#5a3d05" }}>Dikkat Edin</span>
          </div>
          <p style={{ fontSize: 12, color: "#5a3d05", lineHeight: 1.6, margin: 0 }}>{hw.watchFor}</p>
        </div>
      )}

      {hw.celebration && (
        <div
          style={{
            padding: 14,
            background: "#e4f8ec",
            border: "2px solid var(--poster-green)",
            borderRadius: 12,
            boxShadow: "0 3px 0 var(--poster-green)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Star style={{ width: 16, height: 16, color: "var(--poster-green)" }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#0f4f28" }}>Kutlama Anı</span>
          </div>
          <p style={{ fontSize: 12, color: "#0f4f28", lineHeight: 1.6, margin: 0 }}>{hw.celebration}</p>
        </div>
      )}

      {hw.frequency && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Clock style={{ width: 14, height: 14, color: "var(--poster-ink-3)" }} />
          <span style={{ fontSize: 12, color: "var(--poster-ink-2)" }}>
            Öneri: <span style={{ fontWeight: 700, color: "var(--poster-ink)" }}>{hw.frequency}</span>
          </span>
        </div>
      )}

      {hw.adaptations && (
        <div
          style={{
            padding: 14,
            background: "var(--poster-bg-2)",
            border: "2px solid var(--poster-ink)",
            borderRadius: 12,
            boxShadow: "0 2px 0 var(--poster-ink)",
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-ink-2)", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 6px" }}>
            Uyarlama Önerileri
          </p>
          <p style={{ fontSize: 12, color: "var(--poster-ink)", lineHeight: 1.6, margin: 0 }}>{hw.adaptations}</p>
        </div>
      )}

      {!forPdf && hw.expertNotes && (
        <div
          style={{
            padding: 14,
            background: "#fff3d1",
            border: "2px solid #b7791f",
            borderRadius: 12,
            boxShadow: "0 3px 0 #b7791f",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Lightbulb style={{ width: 16, height: 16, color: "#b7791f" }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#5a3d05" }}>Uzman Notları</span>
          </div>
          <p style={{ fontSize: 12, color: "#5a3d05", lineHeight: 1.6, margin: 0 }}>{hw.expertNotes}</p>
        </div>
      )}
    </div>
  );
}

// ─── PDF Download (unchanged) ─────────────────────────────────────────────────

async function downloadHomeworkPDF(hw: HomeworkContent, studentName?: string) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });

  const MTLABEL: Record<string, string> = {
    exercise: "Ev Egzersizi", observation: "Gözlem Formu", daily_activity: "Günlük Aktivite",
  };

  const today = formatDate(new Date(), "medium");

  const S = StyleSheet.create({
    page:      { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 44 },
    title:     { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 20, color: "#023435", marginBottom: 6 },
    infoRow:   { flexDirection: "row", marginBottom: 18, borderBottomWidth: 1, borderBottomColor: "#e4e4e7", paddingBottom: 10 },
    infoText:  { fontSize: 9, color: "#52525b", marginRight: 16 },
    sectionHdr:{ fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, color: "#71717a", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
    intro:     { backgroundColor: "#f4f4f5", borderRadius: 4, padding: 10, marginBottom: 14 },
    introText: { fontSize: 10, lineHeight: 1.6, color: "#3f3f46" },
    matItem:   { fontSize: 9, color: "#3f3f46", marginBottom: 3 },
    stepWrap:  { marginBottom: 12 },
    stepRow:   { flexDirection: "row" },
    stepNum:   { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 10, color: "#107996", width: 22 },
    stepText:  { flex: 1, fontSize: 10, lineHeight: 1.6, color: "#3f3f46" },
    stepTip:   { fontSize: 8, color: "#a1a1aa", marginTop: 4, marginLeft: 22, paddingLeft: 6, borderLeftWidth: 2, borderLeftColor: "#d4d4d8" },
    box:       { borderRadius: 4, padding: 10, marginBottom: 10 },
    boxTitle:  { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, marginBottom: 4 },
    boxText:   { fontSize: 9, lineHeight: 1.6 },
    freq:      { fontSize: 9, color: "#52525b", marginBottom: 10 },
    footer:    { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e4e4e7", paddingTop: 6 },
    footerTxt: { fontSize: 8, color: "#a1a1aa" },
  });

  const steps  = Array.isArray(hw.steps)    ? hw.steps    : [];
  const mats   = Array.isArray(hw.materials) ? hw.materials : [];

  const Doc = () => (
    <Document title={hw.title} author="LudenLab">
      <Page size="A4" style={S.page}>
        <Text style={S.title}>{hw.title ?? ""}</Text>

        <View style={S.infoRow}>
          {studentName ? <Text style={S.infoText}>Öğrenci: {studentName}</Text> : null}
          {hw.duration  ? <Text style={S.infoText}>Süre: {hw.duration}</Text>   : null}
          {hw.targetArea ? <Text style={S.infoText}>{hw.targetArea}</Text>      : null}
          <Text style={[S.infoText, { marginRight: 0 }]}>
            {MTLABEL[hw.materialType] ?? hw.materialType}
          </Text>
          <Text style={[S.infoText, { marginLeft: "auto", marginRight: 0 }]}>{today}</Text>
        </View>

        {hw.introduction ? (
          <View style={[S.intro, { marginBottom: 14 }]}>
            <Text style={S.introText}>{hw.introduction}</Text>
          </View>
        ) : null}

        {mats.length > 0 ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={S.sectionHdr}>Gerekli Malzemeler</Text>
            {mats.map((m, i) => (
              <Text key={i} style={S.matItem}>• {m}</Text>
            ))}
          </View>
        ) : null}

        {steps.length > 0 ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={S.sectionHdr}>Adımlar</Text>
            {steps.map((step, i) => (
              <View key={i} style={S.stepWrap}>
                <View style={S.stepRow}>
                  <Text style={S.stepNum}>{step.stepNumber ?? i + 1}.</Text>
                  <Text style={S.stepText}>{step.instruction ?? ""}</Text>
                </View>
                {step.tip ? <Text style={S.stepTip}>İpucu: {step.tip}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {hw.watchFor ? (
          <View style={[S.box, { backgroundColor: "#fefce8", borderWidth: 1, borderColor: "#fde68a" }]}>
            <Text style={[S.boxTitle, { color: "#92400e" }]}>⚠ Dikkat Edin</Text>
            <Text style={[S.boxText,  { color: "#78350f" }]}>{hw.watchFor}</Text>
          </View>
        ) : null}

        {hw.celebration ? (
          <View style={[S.box, { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" }]}>
            <Text style={[S.boxTitle, { color: "#14532d" }]}>★ Kutlama Anı</Text>
            <Text style={[S.boxText,  { color: "#166534" }]}>{hw.celebration}</Text>
          </View>
        ) : null}

        {hw.frequency ? <Text style={S.freq}>Önerilen Sıklık: {hw.frequency}</Text> : null}

        {hw.adaptations ? (
          <View style={[S.box, { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e4e4e7" }]}>
            <Text style={[S.boxTitle, { color: "#374151" }]}>Uyarlama Önerileri</Text>
            <Text style={[S.boxText,  { color: "#4b5563" }]}>{hw.adaptations}</Text>
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
  a.download = `${(hw.title ?? "ev-odevi").replace(/\s+/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomeworkPage() {
  const [students, setStudents]         = useState<Student[]>([]);
  const [curricula, setCurricula]       = useState<CurriculumItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  const [studentId,    setStudentId]    = useState("");
  const [targetArea,   setTargetArea]   = useState("");
  const [customArea,   setCustomArea]   = useState("");
  const [duration,     setDuration]     = useState<"10" | "15" | "20">("15");
  const [parentLevel,  setParentLevel]  = useState<"basic" | "detailed">("basic");
  const [materialType, setMaterialType] = useState<"exercise" | "observation" | "daily_activity">("exercise");
  const [extraNote,    setExtraNote]    = useState("");

  const [loading,     setLoading]     = useState(false);
  const [homework,    setHomework]    = useState<HomeworkContent | null>(null);
  const [savedCardId, setSavedCardId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [formKey,     setFormKey]     = useState(0);

  const [studentTouched, setStudentTouched] = useState(false);
  const [areaTouched,    setAreaTouched]    = useState(false);

  const finalArea = targetArea === "Diğer" ? customArea.trim() : targetArea;
  const studentError = !studentId ? "Lütfen bir öğrenci seçin" : null;
  const areaError    = !finalArea ? "Lütfen çalışma alanını belirtin" : null;
  const showStudentError = studentTouched && studentError;
  const showAreaError    = areaTouched && areaError;

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;

  const studentAreas = curricula
    .filter((c) => selectedStudent?.curriculumIds?.includes(c.id))
    .map((c) => c.title);

  const areaOptions = studentAreas.length > 0 ? [...studentAreas, "Diğer"] : GENERAL_AREAS;

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
    setTargetArea("");
    setCustomArea("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStudentTouched(true);
    setAreaTouched(true);
    if (studentError || areaError) return;

    setLoading(true);
    setHomework(null);
    setSavedCardId(null);

    try {
      const res = await fetch("/api/tools/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          targetArea: finalArea,
          duration,
          parentLevel,
          materialType,
          extraNote: extraNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Bir hata oluştu"); return; }
      setHomework(data.homework as HomeworkContent);
      setSavedCardId(data.cardId ?? null);
      toast.success("Ev ödevi materyali üretildi!");
    } catch {
      toast.error("Bağlantı hatası, tekrar deneyin");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setHomework(null);
    setSavedCardId(null);
    setFormKey((k) => k + 1);
    setStudentId("");
    setTargetArea("");
    setCustomArea("");
    setDuration("15");
    setParentLevel("basic");
    setMaterialType("exercise");
    setExtraNote("");
  }

  async function handleDownloadPDF() {
    if (!homework) return;
    setDownloading(true);
    const loadingToast = toast.loading("PDF hazırlanıyor...");
    try {
      await downloadHomeworkPDF(homework, selectedStudent?.name);
      toast.success("PDF indirildi", { id: loadingToast });
    } catch {
      toast.error("PDF oluşturulamadı", { id: loadingToast });
    } finally {
      setDownloading(false);
    }
  }

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
    padding: "10px 12px",
    background: active ? "var(--poster-ink)" : "var(--poster-panel)",
    color: active ? "#fff" : "var(--poster-ink)",
    border: "2px solid var(--poster-ink)",
    borderRadius: 10,
    boxShadow: active ? "0 2px 0 var(--poster-ink)" : "var(--poster-shadow-sm)",
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

      {/* Çalışma Alanı */}
      <div>
        <PLabel required>
          Çalışma Alanı{" "}
          {studentAreas.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 500, color: "var(--poster-ink-3)" }}>(öğrencinin modüllerinden)</span>
          )}
        </PLabel>
        <PSelect
          value={targetArea}
          onChange={(e) => setTargetArea(e.target.value)}
          onBlur={() => setAreaTouched(true)}
          invalid={!!showAreaError}
          aria-invalid={!!showAreaError}
        >
          <option value="">Alan seçin</option>
          {areaOptions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </PSelect>
        {targetArea === "Diğer" && (
          <div style={{ marginTop: 8 }}>
            <PInput
              type="text"
              placeholder="Çalışma alanını açıklayın..."
              value={customArea}
              onChange={(e) => {
                setCustomArea(e.target.value);
                setAreaTouched(true);
              }}
              required
              invalid={!!showAreaError}
            />
          </div>
        )}
        {showAreaError && <PFieldHint tone="error">{areaError}</PFieldHint>}
      </div>

      {/* Süre */}
      <div>
        <PLabel>Süre</PLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          {(["10", "15", "20"] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDuration(d)} style={gridBtnStyle(duration === d)}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{d} dk</span>
            </button>
          ))}
        </div>
      </div>

      {/* Veli Bilgi Düzeyi */}
      <div>
        <PLabel>Veli Bilgi Düzeyi</PLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          {([
            { value: "basic",    label: "Temel",    desc: "Basit anlatım" },
            { value: "detailed", label: "Detaylı",  desc: "Teknik bilgi" },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setParentLevel(opt.value)}
              style={{ ...gridBtnStyle(parentLevel === opt.value), textAlign: "left" }}
            >
              <span style={{ display: "block", fontSize: 13, fontWeight: 800 }}>{opt.label}</span>
              <span style={{ display: "block", fontSize: 10, opacity: 0.75 }}>{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Materyal Türü */}
      <div>
        <PLabel>Materyal Türü</PLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {MATERIAL_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMaterialType(opt.value as typeof materialType)}
              style={rowStyle(materialType === opt.value)}
            >
              <span style={{ display: "block", fontSize: 13, fontWeight: 800 }}>{opt.label}</span>
              <span style={{ display: "block", fontSize: 10, opacity: 0.75 }}>{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ek Not */}
      <div>
        <PLabel>
          Ek Not <span style={{ fontSize: 10, fontWeight: 500, color: "var(--poster-ink-3)" }}>(opsiyonel)</span>
        </PLabel>
        <PTextarea
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
          placeholder="Bu oturumdaki gözlemleriniz, özel durumlar..."
          rows={3}
        />
      </div>

      <button type="submit" disabled={loading} style={submitStyle}>
        {loading ? "Üretiliyor..." : "Ev Ödevi Üret"}
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
  ) : homework ? (
    <>
      <PCard rounded={18} style={{ padding: 18, background: "var(--poster-panel)" }}>
        <HomeworkResult hw={homework} />
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
            onClick={handleDownloadPDF}
            disabled={downloading}
            icon={<Download style={{ width: 16, height: 16 }} />}
            style={{ flex: 1, minWidth: 140 }}
          >
            {downloading ? "Hazırlanıyor..." : "PDF İndir"}
          </PBtn>
          {savedCardId && (
            <PBtn as="a" href="/cards" variant="white" size="md" icon={<Library style={{ width: 16, height: 16 }} />} style={{ flex: 1, minWidth: 140 }}>
              Kütüphaneye Git
            </PBtn>
          )}
          <PBtn as="button" variant="white" size="md" onClick={handleReset} icon={<RefreshCw style={{ width: 16, height: 16 }} />} style={{ flex: 1, minWidth: 140 }}>
            Yeni Materyal Üret
          </PBtn>
        </div>
      </PCard>
    </>
  ) : (
    <ToolEmptyState
      icon="📋"
      title="Henüz materyal üretilmedi"
      hint='Sol taraftan parametreleri seçip "Ev Ödevi Üret" butonuna bas.'
    />
  );

  return (
    <ToolShell
      title="Ev Ödevi Materyali Üretici"
      description="Velilerin evde uygulayabileceği, uzman yönlendirmeli çalışma materyalleri üretin."
      form={form}
      result={result}
    />
  );
}
