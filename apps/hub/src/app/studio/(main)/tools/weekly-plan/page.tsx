"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Library, RefreshCw, CalendarDays } from "lucide-react";
import { formatDate } from "@studio/lib/utils";
import { WeeklyPlanView } from "@studio/components/cards/WeeklyPlanView";
import type { WeeklyPlanContent } from "@studio/components/cards/WeeklyPlanView";
import { downloadWeeklyPlanPDF } from "@studio/components/cards/weeklyPlanPdf";
import { ToolShell, ToolEmptyState, ToolLoadingCard } from "@studio/components/tools/ToolShell";
import { PBtn, PCard, PBadge, PLabel, PSelect, PInput, PTextarea, PCheckbox, PFieldHint } from "@studio/components/poster";
import { fetchGeneration } from "@/lib/fetchGeneration";

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

// ─── Style helpers ────────────────────────────────────────────────────────────

const gridBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: "10px 12px",
  borderRadius: 12,
  border: "2px solid var(--poster-ink)",
  background: active ? "var(--poster-accent)" : "var(--poster-panel)",
  color: active ? "var(--poster-on-color)" : "var(--poster-ink)",
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
      fetch("/studio/api/students?limit=200").then((r) => r.json()),
      fetch("/studio/api/curriculum").then((r) => r.json()),
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
      const res = await fetchGeneration("/studio/api/tools/weekly-plan", {
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
          1 üretim hakkı kullanılacak
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
          <PBtn as="a" href={`/studio/cards/${savedCardId}`} variant="white" icon={<Library style={{ width: 14, height: 14 }} />}>
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
      icon={<CalendarDays size={40} aria-hidden />}
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
