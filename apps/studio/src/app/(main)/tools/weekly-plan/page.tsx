"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Library, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { WeeklyPlanView } from "@/components/cards/WeeklyPlanView";
import type { WeeklyPlanContent } from "@/components/cards/WeeklyPlanView";
import { ToolShell, ToolEmptyState, ToolLoadingCard } from "@/components/tools/ToolShell";
import { PBtn, PCard, PBadge, PLabel, PSelect, PInput, PTextarea, PCheckbox, PFieldHint } from "@/components/poster";

interface Student {
  id: string;
  name: string;
  birthDate: string | null;
  workArea: string;
  diagnosis: string | null;
  curriculumIds: string[];
}

interface CurriculumItem {
  id: string;
  area: string;
  title: string;
}

const WEEKDAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"] as const;

function distributeEvenly(total: number): Record<string, number> {
  const schedule: Record<string, number> = {};
  WEEKDAYS.forEach((d) => { schedule[d] = 0; });
  let remaining = total;
  let i = 0;
  while (remaining > 0) {
    schedule[WEEKDAYS[i % WEEKDAYS.length]]++;
    remaining--;
    i++;
  }
  return schedule;
}

const DURATION_OPTIONS = [
  { value: "20", label: "20 dakika" },
  { value: "30", label: "30 dakika" },
  { value: "40", label: "40 dakika" },
  { value: "45", label: "45 dakika" },
  { value: "60", label: "60 dakika" },
];
const DEFAULT_FOCUS_AREAS = [
  "Artikülasyon / Ses çalışması",
  "Dil gelişimi",
  "Akıcı konuşma",
  "Pragmatik dil / Sosyal iletişim",
  "İşitsel algı",
  "Oral motor",
];

const LOADING_MSGS = [
  "Öğrenci profili analiz ediliyor...",
  "Geçmiş çalışmalar inceleniyor...",
  "Haftalık hedefler belirleniyor...",
  "Günlük planlar oluşturuluyor...",
  "Materyaller listeleniyor...",
  "Uzman notları hazırlanıyor...",
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

function getMondayOfCurrentWeek(): string {
  const now  = new Date();
  const day  = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon  = new Date(now);
  mon.setDate(now.getDate() + diff);
  return mon.toISOString().slice(0, 10);
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end   = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => formatDate(d, "medium");
  return `${fmt(start)} — ${fmt(end)}`;
}

// ─── PDF Download ─────────────────────────────────────────────────────────────

async function downloadWeeklyPlanPDF(plan: WeeklyPlanContent, studentName?: string) {
  const jsPDF    = (await import("jspdf")).default;
  const autoTable = (await import("jspdf-autotable")).default;

  const doc   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W     = 210;
  const L     = 14;
  const R     = W - 14;
  const today = formatDate(new Date(), "medium");

  const [regResp, boldResp] = await Promise.all([
    fetch(`${window.location.origin}/fonts/NotoSans-Regular.ttf`),
    fetch(`${window.location.origin}/fonts/NotoSans-Bold.ttf`),
  ]);
  const regBuf  = await regResp.arrayBuffer();
  const boldBuf = await boldResp.arrayBuffer();
  const toB64   = (buf: ArrayBuffer) => {
    let bin = "";
    new Uint8Array(buf).forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin);
  };
  doc.addFileToVFS("NotoSans-Regular.ttf", toB64(regBuf));
  doc.addFileToVFS("NotoSans-Bold.ttf",    toB64(boldBuf));
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFont("NotoSans-Bold.ttf",    "NotoSans", "bold");

  void W;
  const days = Array.isArray(plan.days) ? plan.days : [];

  doc.setFont("NotoSans", "bold");
  doc.setFontSize(16);
  doc.setTextColor("#023435");
  doc.text(plan.title, L, 20);

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#71717a");
  const meta = [
    plan.weekRange,
    studentName ?? "",
    plan.sessionsPerWeek ? `${plan.sessionsPerWeek} ders/hafta` : "",
    plan.sessionDuration ? `${plan.sessionDuration} dk/ders` : "",
  ].filter(Boolean).join("  |  ");
  doc.text(meta, L, 26);

  let y = 32;

  for (let di = 0; di < days.length; di++) {
    const day = days[di];

    if (y > 240) { doc.addPage(); y = 16; }

    doc.setFillColor("#023435");
    doc.roundedRect(L, y, R - L, 8, 1.5, 1.5, "F");
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(10);
    doc.setTextColor("#ffffff");
    doc.text(`${day.dayNumber}. GUN — ${day.dayName}, ${day.date}`, L + 3, y + 5.5);
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#ffffff99" as unknown as string);
    doc.text(day.duration, R - 3, y + 5.5, { align: "right" });
    y += 10;

    doc.setFont("NotoSans", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#52525b");
    doc.text(`Odak: ${day.focusArea}`, L, y + 4);
    y += 5;
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(9);
    doc.setTextColor("#18181b");
    const objLines = doc.splitTextToSize(day.objective, R - L - 2);
    doc.text(objLines, L, y + 4);
    y += objLines.length * 4.5 + 2;

    const mainSteps = day.mainWork.steps?.join("; ") ?? "";
    const mainText  = mainSteps ? `${day.mainWork.activity}\n${mainSteps}` : day.mainWork.activity;

    autoTable(doc, {
      head: [["Bolum", "Aktivite", "Sure"]],
      body: [
        ["Isinma",      day.warmup.activity,  day.warmup.duration],
        ["Ana Calisma", mainText,              day.mainWork.duration],
        ["Kapanis",     day.closing.activity,  day.closing.duration],
      ],
      startY: y,
      margin:  { left: L, right: 14 },
      styles:  { font: "NotoSans", fontSize: 8.5, cellPadding: 2.5, textColor: [24, 24, 27], overflow: "linebreak" },
      headStyles: { fillColor: [2, 52, 53], textColor: 255, fontStyle: "bold", fontSize: 8 },
      columnStyles: { 0: { cellWidth: 28, fontStyle: "bold" }, 2: { cellWidth: 20, halign: "center" } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;

    const mats = [...(day.warmup.materials ?? []), ...(day.mainWork.materials ?? [])];
    if (mats.length > 0) {
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor("#52525b");
      const matText = `Materyaller: ${mats.join(", ")}`;
      const matLines = doc.splitTextToSize(matText, R - L - 2);
      doc.text(matLines, L, y + 3.5);
      y += matLines.length * 3.8 + 1;
    }

    if (day.notes) {
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor("#a1a1aa");
      const noteLines = doc.splitTextToSize(`Not: ${day.notes}`, R - L - 2);
      doc.text(noteLines, L, y + 3.5);
      y += noteLines.length * 3.8 + 1;
    }

    if (di < days.length - 1) {
      doc.setDrawColor("#e4e4e7");
      doc.line(L, y + 2, R, y + 2);
      y += 6;
    } else {
      y += 4;
    }
  }

  const addSection = (title: string, text: string, fillRgb: [number,number,number], titleColor: string) => {
    if (y > 255) { doc.addPage(); y = 16; }
    doc.setFillColor(...fillRgb);
    doc.roundedRect(L, y, R - L, 5, 1, 1, "F");
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(titleColor);
    doc.text(title, L + 3, y + 3.5);
    y += 7;
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor("#18181b");
    const lines = doc.splitTextToSize(text, R - L - 2);
    doc.text(lines, L, y);
    y += lines.length * 4.2 + 5;
  };

  if (plan.weeklyGoal)            addSection("Haftalik Hedef",      plan.weeklyGoal,                    [255, 247, 237], "#c2410c");
  if (plan.materialsNeeded?.length) addSection("Gerekli Materyaller", plan.materialsNeeded.join(", "), [249, 250, 251], "#374151");
  if (plan.parentCommunication)   addSection("Veli Bilgilendirme",  plan.parentCommunication,           [239, 246, 255], "#1e40af");

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor("#e4e4e7");
    doc.line(L, 285, R, 285);
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(7);
    doc.setTextColor("#a1a1aa");
    doc.text("LudenLab — ludenlab.com", L, 290);
    doc.text(today, R, 290, { align: "right" });
  }

  doc.save(`${plan.title.replace(/\s+/g, "_")}.pdf`);
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const gridBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: "10px 12px",
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
  textAlign: "left" as const,
});

const counterBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "2px solid var(--poster-ink)",
  background: "var(--poster-panel)",
  color: "var(--poster-ink)",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WeeklyPlanPage() {
  const [students,    setStudents]    = useState<Student[]>([]);
  const [curricula,   setCurricula]   = useState<CurriculumItem[]>([]);
  const [studentId,   setStudentId]   = useState("");
  const [weekStart,   setWeekStart]   = useState(getMondayOfCurrentWeek);
  const [sessions,    setSessions]    = useState(3);
  const [daySchedule, setDaySchedule] = useState<Record<string, number>>(() => distributeEvenly(3));
  const [duration,    setDuration]    = useState("45");
  const [focusAreas,  setFocusAreas]  = useState<string[]>([]);
  const [customFocus, setCustomFocus] = useState("");
  const [approach,    setApproach]    = useState<"ai" | "guided">("ai");
  const [extraNote,   setExtraNote]   = useState("");

  const [generating,   setGenerating]   = useState(false);
  const [savedCardId,  setSavedCardId]  = useState<string | null>(null);
  const [pendingCardId,setPendingCardId]= useState<string | null>(null);
  const [plan,         setPlan]         = useState<WeeklyPlanContent | null>(null);
  const [downloading,  setDownloading]  = useState(false);

  const [studentTouched, setStudentTouched] = useState(false);
  const [daysTouched,    setDaysTouched]    = useState(false);
  const [focusTouched,   setFocusTouched]   = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/students?limit=200").then((r) => r.json()),
      fetch("/api/curriculum").then((r) => r.json()),
    ]).then(([sd, cd]) => {
      setStudents(sd.students ?? []);
      setCurricula(cd.curricula ?? []);
    });
  }, []);

  const selectedStudent = students.find((s) => s.id === studentId);

  const studentCurricula = selectedStudent
    ? curricula.filter((c) => selectedStudent.curriculumIds.includes(c.id))
    : [];

  useEffect(() => { setFocusAreas([]); }, [studentId]);

  useEffect(() => {
    setDaySchedule(distributeEvenly(sessions));
  }, [sessions]);

  const totalAssigned = Object.values(daySchedule).reduce((a, b) => a + b, 0);

  const studentError = !studentId ? "Lütfen öğrenci seçin" : null;
  const daysError = totalAssigned === 0 ? "En az 1 ders günü belirleyin" : null;
  const effectiveFocusCount = focusAreas.length + (customFocus.trim() ? 1 : 0);
  const focusError = effectiveFocusCount === 0 ? "En az bir odak alanı seçin" : null;
  const showStudentError = studentTouched && studentError;
  const showDaysError    = daysTouched && daysError;
  const showFocusError   = focusTouched && focusError;

  function updateDay(day: string, delta: number) {
    setDaySchedule((prev) => {
      const val = (prev[day] ?? 0) + delta;
      if (val < 0) return prev;
      return { ...prev, [day]: val };
    });
  }

  function toggleFocus(area: string) {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  const allFocusOptions: string[] = studentCurricula.length > 0
    ? studentCurricula.map((c) => c.title)
    : DEFAULT_FOCUS_AREAS;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setStudentTouched(true);
    setDaysTouched(true);
    setFocusTouched(true);
    if (studentError || daysError || focusError) return;
    const effectiveFocus = [...focusAreas, ...(customFocus.trim() ? [customFocus.trim()] : [])];
    setGenerating(true);
    setSavedCardId(null);
    setPendingCardId(null);
    setPlan(null);
    const activeDays = WEEKDAYS
      .filter((d) => (daySchedule[d] ?? 0) > 0)
      .map((d) => ({ dayName: d, lessonCount: daySchedule[d] }));
    try {
      const res = await fetch("/api/tools/weekly-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          weekStart,
          sessionsPerWeek: totalAssigned,
          sessionDuration: duration,
          focusAreas: effectiveFocus,
          planApproach: approach,
          daySchedule: activeDays,
          extraNote: extraNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Bir hata oluştu"); return; }
      setPlan(data.plan as WeeklyPlanContent);
      setPendingCardId(data.cardId ?? null);
      setSavedCardId(data.cardId ?? null);
      toast.success("Haftalık plan oluşturuldu");
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload() {
    if (!plan) return;
    setDownloading(true);
    const t = toast.loading("PDF hazırlanıyor…");
    try {
      await downloadWeeklyPlanPDF(plan, selectedStudent?.name);
      toast.success("PDF indirildi", { id: t });
    } catch {
      toast.error("PDF oluşturulamadı", { id: t });
    } finally {
      setDownloading(false);
    }
  }

  function handleReset() {
    setPlan(null);
    setPendingCardId(null);
    setSavedCardId(null);
  }
  void pendingCardId;

  const form = (
    <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Öğrenci */}
      <div>
        <PLabel required>Öğrenci</PLabel>
        <PSelect
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          onBlur={() => setStudentTouched(true)}
          invalid={!!showStudentError}
          aria-invalid={!!showStudentError}
        >
          <option value="">— Öğrenci seçin —</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </PSelect>
        {showStudentError && <PFieldHint tone="error">{studentError}</PFieldHint>}
        {selectedStudent && (
          <div
            style={{
              marginTop: 8,
              padding: "10px 12px",
              border: "2px solid var(--poster-ink)",
              borderRadius: 10,
              background: "var(--poster-bg-2)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--poster-ink)" }}>
              {selectedStudent.name}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--poster-ink-2)", marginTop: 2 }}>
              {selectedStudent.workArea}{selectedStudent.diagnosis ? ` · ${selectedStudent.diagnosis}` : ""}
            </div>
            {studentCurricula.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {studentCurricula.map((c) => (
                  <PBadge key={c.id} color="accent">{c.title}</PBadge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hafta */}
      <div>
        <PLabel>Hafta</PLabel>
        <PInput type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
        {weekStart && (
          <p style={{ fontSize: 11, color: "var(--poster-ink-3)", margin: "4px 0 0", fontWeight: 600 }}>
            {formatWeekRange(weekStart)}
          </p>
        )}
      </div>

      {/* Haftalık ders */}
      <div>
        <PLabel>Haftalık Ders Sayısı</PLabel>
        <PSelect value={sessions} onChange={(e) => setSessions(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n} ders</option>
          ))}
        </PSelect>
      </div>

      {/* Day schedule */}
      <div>
        <PLabel required>
          Günlük Dağılım
          <span style={{ marginLeft: 6, fontWeight: 700, color: "var(--poster-accent)", textTransform: "none" }}>
            · Toplam {totalAssigned}
          </span>
        </PLabel>
        <div
          style={{
            border: "2px solid var(--poster-ink)",
            borderRadius: 12,
            background: "var(--poster-panel)",
            overflow: "hidden",
          }}
        >
          {WEEKDAYS.map((day, idx) => (
            <div
              key={day}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderTop: idx === 0 ? "none" : "2px dashed var(--poster-ink-faint)",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--poster-ink)" }}>{day}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => { updateDay(day, -1); setDaysTouched(true); }}
                  disabled={!daySchedule[day]}
                  style={{ ...counterBtnStyle, opacity: daySchedule[day] ? 1 : 0.3, cursor: daySchedule[day] ? "pointer" : "not-allowed" }}
                >
                  −
                </button>
                <span style={{ width: 20, textAlign: "center", fontSize: 13, fontWeight: 800, color: "var(--poster-ink)" }}>
                  {daySchedule[day] ?? 0}
                </span>
                <button type="button" onClick={() => { updateDay(day, 1); setDaysTouched(true); }} style={counterBtnStyle}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        {showDaysError && <PFieldHint tone="error">{daysError}</PFieldHint>}
      </div>

      {/* Ders süresi */}
      <div>
        <PLabel>Ders Süresi</PLabel>
        <PSelect value={duration} onChange={(e) => setDuration(e.target.value)}>
          {DURATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </PSelect>
      </div>

      {/* Odak alanları */}
      <div>
        <PLabel required>
          Odak Alanları
          {studentCurricula.length > 0 && (
            <span style={{ marginLeft: 6, fontWeight: 700, color: "var(--poster-accent)", textTransform: "none" }}>
              · Modüllerden
            </span>
          )}
        </PLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {allFocusOptions.map((area) => (
            <PCheckbox
              key={area}
              checked={focusAreas.includes(area)}
              onChange={() => { toggleFocus(area); setFocusTouched(true); }}
              label={area}
            />
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <PInput
            value={customFocus}
            onChange={(e) => { setCustomFocus(e.target.value); setFocusTouched(true); }}
            placeholder="Diğer (serbest metin — isteğe bağlı)"
          />
        </div>
        {showFocusError && <PFieldHint tone="error">{focusError}</PFieldHint>}
      </div>

      {/* Yaklaşım */}
      <div>
        <PLabel>Planlama Yaklaşımı</PLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {([
            ["ai",      "AI Önersin",        "Profil ve geçmişe göre"],
            ["guided",  "Ben Yönlendireyim", "Seçilen odaklara göre"],
          ] as const).map(([v, l, d]) => (
            <button
              key={v}
              type="button"
              onClick={() => setApproach(v)}
              style={gridBtnStyle(approach === v)}
            >
              <div>{l}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--poster-ink-2)", marginTop: 2 }}>
                {d}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Ek not */}
      <div>
        <PLabel>
          Ek Not <span style={{ fontWeight: 500, color: "var(--poster-ink-3)", textTransform: "none" }}>(opsiyonel)</span>
        </PLabel>
        <PTextarea
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
          rows={3}
          placeholder="Bu hafta dikkat edilecek durumlar, veli geri bildirimi..."
        />
      </div>

      {/* Submit */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
        <PBtn
          type="submit"
          variant="accent"
          disabled={generating}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {generating ? "Oluşturuluyor…" : "Haftalık Plan Oluştur"}
        </PBtn>
        <p style={{ fontSize: 11, color: "var(--poster-ink-3)", textAlign: "center", margin: 0 }}>
          20 kredi kullanılacak
        </p>
      </div>
    </form>
  );

  const result = generating ? (
    <ToolLoadingCard>
      <LoadingMessages />
    </ToolLoadingCard>
  ) : plan ? (
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
          Yeni Plan
        </PBtn>
      </div>
      <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
        <WeeklyPlanView plan={plan} />
      </PCard>
    </>
  ) : (
    <ToolEmptyState
      icon="🗓️"
      title="Haftalık plan burada görünecek"
      hint='Sol formu doldurun ve "Haftalık Plan Oluştur" butonuna tıklayın.'
    />
  );

  return (
    <ToolShell
      title="Haftalık Çalışma Planı"
      description="Öğrenci bazlı, hedef odaklı haftalık ders planları oluşturun."
      form={form}
      result={result}
      formWidth={420}
    />
  );
}
