"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { GlassCalendar } from "@/components/poster/glass-calendar";
import { PBtn, PCard, PBadge, PSelect, PInput, PTextarea, PLabel, PModal, PCheckbox, PSkeleton } from "@/components/poster";
import useSWR from "swr";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, X as XIcon, RotateCcw, Trash2, Repeat } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type LessonStatus = "PLANNED" | "COMPLETED" | "CANCELLED";

interface LessonStudent {
  id: string;
  name: string;
  workArea: string;
}

interface LessonException {
  id: string;
  lessonId: string;
  originalDate: string;
  title: string | null;
  startTime: string | null;
  endTime: string | null;
  status: LessonStatus | null;
  note: string | null;
}

interface Lesson {
  id: string;
  studentId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string | null;
  isRecurring: boolean;
  recurringDay: number | null;
  status: LessonStatus;
  student: LessonStudent;
  exceptions?: LessonException[];
}

interface DisplayLesson extends Lesson {
  displayDate: Date;
}

interface Student {
  id: string;
  name: string;
}

const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTH_LABELS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const RECURRING_DAYS = [
  { label: "Pzt", value: 1 }, { label: "Sal", value: 2 },
  { label: "Çar", value: 3 }, { label: "Per", value: 4 },
  { label: "Cum", value: 5 }, { label: "Cmt", value: 6 },
  { label: "Paz", value: 0 },
];

const START_HOUR = 8;
const END_HOUR = 20;
const HOUR_HEIGHT = 48;

const STATUS_COLOR: Record<LessonStatus, "blue" | "green" | "pink"> = {
  PLANNED: "blue",
  COMPLETED: "green",
  CANCELLED: "pink",
};

const STATUS_VAR: Record<LessonStatus, string> = {
  PLANNED: "var(--poster-blue)",
  COMPLETED: "var(--poster-green)",
  CANCELLED: "var(--poster-danger)",
};

const STATUS_LABEL: Record<LessonStatus, string> = {
  PLANNED: "Planlandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function expandLessons(lessons: Lesson[], startDate: Date, endDate: Date): DisplayLesson[] {
  const result: DisplayLesson[] = [];
  for (const lesson of lessons) {
    if (!lesson.isRecurring) {
      const d = new Date(lesson.date);
      d.setHours(0, 0, 0, 0);
      if (d >= startDate && d <= endDate) result.push({ ...lesson, displayDate: d });
    } else {
      const recurStart = new Date(lesson.date);
      recurStart.setHours(0, 0, 0, 0);
      const d = new Date(startDate);
      while (d <= endDate) {
        if (d >= recurStart && d.getDay() === lesson.recurringDay) {
          const currentDateStr = new Date(d).toISOString().split("T")[0];
          const exception = lesson.exceptions?.find((ex) => ex.originalDate.startsWith(currentDateStr));

          if (exception?.status === "CANCELLED") {
            d.setDate(d.getDate() + 1);
            continue;
          }

          result.push({
            ...lesson,
            displayDate: new Date(d),
            ...(exception
              ? {
                  title: exception.title ?? lesson.title,
                  startTime: exception.startTime ?? lesson.startTime,
                  endTime: exception.endTime ?? lesson.endTime,
                  status: exception.status ?? lesson.status,
                  note: exception.note ?? lesson.note,
                }
              : {}),
          });
        }
        d.setDate(d.getDate() + 1);
      }
    }
  }
  return result.sort((a, b) => {
    const dc = a.displayDate.getTime() - b.displayDate.getTime();
    return dc !== 0 ? dc : timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });
}

function collectLessonDates(lessons: Lesson[], year: number, month: number): Date[] {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month + 1, 0);
  return expandLessons(lessons, start, end).map((l) => l.displayDate);
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hh, mm] = value.split(":").map((p) => p.padStart(2, "0"));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <PSelect
        value={hh ?? "09"}
        onChange={(e) => onChange(`${e.target.value}:${mm ?? "00"}`)}
        style={{ width: 80, textAlign: "center", padding: "0 30px 0 10px", height: 40 }}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </PSelect>
      <span style={{ fontWeight: 800, color: "var(--poster-ink-3)" }}>:</span>
      <PSelect
        value={mm ?? "00"}
        onChange={(e) => onChange(`${hh ?? "09"}:${e.target.value}`)}
        style={{ width: 80, textAlign: "center", padding: "0 30px 0 10px", height: 40 }}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </PSelect>
    </div>
  );
}

function LessonModal({
  students,
  initialDate,
  lesson,
  onClose,
  onSave,
}: {
  students: Student[];
  initialDate?: Date;
  lesson?: Lesson | null;
  onClose: () => void;
  onSave: (data: Lesson) => void;
}) {
  const isEdit = !!lesson;
  const [studentId, setStudentId] = useState(lesson?.studentId ?? "");
  const [title, setTitle] = useState(lesson?.title ?? "");

  const _initDate = lesson ? lesson.date.slice(0, 10) : initialDate ? initialDate.toISOString().slice(0, 10) : "";
  const [dayStr, setDayStr] = useState(_initDate ? String(parseInt(_initDate.slice(8, 10), 10)) : "");
  const [monthStr, setMonthStr] = useState(_initDate ? String(parseInt(_initDate.slice(5, 7), 10)) : "");
  const [yearStr, setYearStr] = useState(_initDate ? _initDate.slice(0, 4) : "");
  const date =
    dayStr && monthStr && yearStr && yearStr.length === 4
      ? `${yearStr}-${monthStr.padStart(2, "0")}-${dayStr.padStart(2, "0")}`
      : "";

  const [startTime, setStartTime] = useState(lesson?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(lesson?.endTime ?? "10:00");
  const [note, setNote] = useState(lesson?.note ?? "");
  const [isRecurring, setIsRecurring] = useState(lesson?.isRecurring ?? false);
  const [recurringDay, setRecurringDay] = useState<number>(lesson?.recurringDay ?? 1);
  const [saving, setSaving] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (!isEdit && studentId) {
      const s = students.find((st) => st.id === studentId);
      if (s) setTitle(`${s.name} Dersi`);
    }
  }, [studentId, students, isEdit]);

  async function handleSave() {
    if (!studentId || !title || !date || !startTime || !endTime) {
      toast.error("Öğrenci, başlık, tarih ve saatler zorunludur");
      return;
    }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      toast.error("Bitiş saati başlangıç saatinden sonra olmalıdır");
      return;
    }
    setSaving(true);
    try {
      const body = {
        studentId,
        title,
        date,
        startTime,
        endTime,
        note: note || undefined,
        isRecurring,
        recurringDay: isRecurring ? recurringDay : undefined,
        ...(isEdit ? { status: lesson!.status } : {}),
      };
      const res = await fetch(isEdit ? `/api/lessons/${lesson!.id}` : "/api/lessons", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hata");
      toast.success(isEdit ? "Ders güncellendi" : "Ders eklendi");
      onSave(data.lesson);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PModal
      open
      onClose={onClose}
      title={isEdit ? "Dersi Düzenle" : "Yeni Ders Ekle"}
      width={460}
      footer={
        <>
          <PBtn onClick={onClose} variant="white" size="md">
            İptal
          </PBtn>
          <PBtn onClick={handleSave} disabled={saving} variant="accent" size="md">
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </PBtn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <PLabel htmlFor="student" required>Öğrenci</PLabel>
          <PSelect id="student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Öğrenci seçin</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </PSelect>
        </div>

        <div>
          <PLabel htmlFor="title" required>Başlık</PLabel>
          <PInput id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ders başlığı" />
        </div>

        <div>
          <PLabel required>Tarih</PLabel>
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PInput
                value={dayStr}
                onChange={(e) => setDayStr(e.target.value)}
                placeholder="GG"
                maxLength={2}
                style={{ width: 70, textAlign: "center" }}
              />
              <span style={{ color: "var(--poster-ink-3)" }}>/</span>
              <PInput
                value={monthStr}
                onChange={(e) => setMonthStr(e.target.value)}
                placeholder="AA"
                maxLength={2}
                style={{ width: 70, textAlign: "center" }}
              />
              <span style={{ color: "var(--poster-ink-3)" }}>/</span>
              <PInput
                value={yearStr}
                onChange={(e) => setYearStr(e.target.value)}
                placeholder="YYYY"
                maxLength={4}
                style={{ width: 90, textAlign: "center" }}
              />
              <button
                type="button"
                onClick={() => setShowCalendar(!showCalendar)}
                style={{
                  marginLeft: "auto",
                  width: 46,
                  height: 46,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 12,
                  border: "2px solid var(--poster-ink)",
                  background: showCalendar ? "var(--poster-accent)" : "var(--poster-panel)",
                  color: showCalendar ? "#fff" : "var(--poster-ink)",
                  cursor: "pointer",
                  boxShadow: "var(--poster-shadow-sm)",
                }}
              >
                <CalendarIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {showCalendar && (
              <div style={{ position: "absolute", top: 56, left: 0, right: 0, zIndex: 50 }}>
                <GlassCalendar
                  selectedDate={(() => {
                    const d = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
                    return isNaN(d.getTime()) ? new Date() : d;
                  })()}
                  onSelectDate={(newDate) => {
                    setDayStr(String(newDate.getDate()).padStart(2, "0"));
                    setMonthStr(String(newDate.getMonth() + 1).padStart(2, "0"));
                    setYearStr(String(newDate.getFullYear()));
                    setShowCalendar(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <PLabel required>Başlangıç</PLabel>
            <TimeSelect value={startTime} onChange={setStartTime} />
          </div>
          <div>
            <PLabel required>Bitiş</PLabel>
            <TimeSelect value={endTime} onChange={setEndTime} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--poster-ink-3)" }}>Süre:</span>
          {[30, 40, 45, 60].map((m) => {
            const st = timeToMinutes(startTime);
            const end = st + m;
            const endStr = `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
            const isActive = endTime === endStr;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setEndTime(endStr)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 10,
                  border: "2px solid var(--poster-ink)",
                  background: isActive ? "var(--poster-accent)" : "var(--poster-panel)",
                  color: isActive ? "#fff" : "var(--poster-ink)",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: "pointer",
                  boxShadow: isActive ? "2px 2px 0 var(--poster-ink)" : "none",
                }}
              >
                {m}dk
              </button>
            );
          })}
        </div>

        <div>
          <PCheckbox
            id="recurring"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            label="Haftalık tekrarlayan ders"
          />
          {isRecurring && (
            <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {RECURRING_DAYS.map((d) => {
                const active = recurringDay === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setRecurringDay(d.value)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 10,
                      border: "2px solid var(--poster-ink)",
                      background: active ? "var(--poster-accent)" : "var(--poster-panel)",
                      color: active ? "#fff" : "var(--poster-ink)",
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      boxShadow: active ? "2px 2px 0 var(--poster-ink)" : "none",
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <PLabel htmlFor="note" optional>Not</PLabel>
          <PTextarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Ders notu..."
          />
        </div>
      </div>
    </PModal>
  );
}

function LessonDetailModal({
  lesson,
  displayDate,
  onClose,
  onUpdate,
  onDelete,
}: {
  lesson: Lesson;
  displayDate: Date;
  onClose: () => void;
  onUpdate: (updated: Lesson) => void;
  onDelete: (id: string) => void;
}) {
  const [note, setNote] = useState(lesson.note ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [scope, setScope] = useState<"this" | "all">("this");

  const dateStr = formatDate(displayDate, "long");
  const originalDateStr = displayDate.toISOString().split("T")[0];

  async function changeStatus(status: LessonStatus) {
    setSaving(true);
    try {
      const qs = lesson.isRecurring ? `?scope=${scope}&date=${originalDateStr}` : "";
      const res = await fetch(`/api/lessons/${lesson.id}${qs}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Durum güncellendi");
      onUpdate(data.lesson);
    } catch {
      toast.error("Güncelleme başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function saveNote() {
    setSaving(true);
    try {
      const qs = lesson.isRecurring ? `?scope=${scope}&date=${originalDateStr}` : "";
      const res = await fetch(`/api/lessons/${lesson.id}${qs}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Not kaydedildi");
      onUpdate(data.lesson);
      setEditingNote(false);
    } catch {
      toast.error("Not kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const qs = lesson.isRecurring ? `?scope=${scope}&date=${originalDateStr}` : "";
      const res = await fetch(`/api/lessons/${lesson.id}${qs}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error("Silinemedi");
      toast.success("Ders silindi");
      if (data.scope === "this") {
        window.location.reload();
      } else {
        onDelete(lesson.id);
      }
    } catch {
      toast.error("Silme başarısız");
      setDeleting(false);
    }
  }

  return (
    <PModal
      open
      onClose={onClose}
      title={lesson.title}
      width={420}
      footer={
        <PBtn onClick={handleDelete} disabled={deleting} variant="white" size="sm">
          <Trash2 style={{ width: 12, height: 12, marginRight: 4 }} />
          {deleting ? "Siliniyor..." : "Dersi Sil"}
        </PBtn>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: "var(--poster-ink-3)", fontWeight: 700 }}>{lesson.student.name}</p>
          {lesson.isRecurring && (
            <span
              style={{
                marginTop: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                fontWeight: 700,
                color: "var(--poster-accent)",
              }}
            >
              <Repeat style={{ width: 10, height: 10 }} /> Haftalık tekrarlayan
            </span>
          )}
        </div>

        <PCard rounded={12} style={{ padding: 12, background: "var(--poster-bg-2)" }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 700,
              color: "var(--poster-ink-3)",
              textTransform: "capitalize",
            }}
          >
            {dateStr}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 800, color: "var(--poster-ink)" }}>
            {lesson.startTime} – {lesson.endTime}
          </p>
        </PCard>

        {lesson.isRecurring && (
          <div
            style={{
              display: "flex",
              padding: 3,
              borderRadius: 10,
              border: "2px solid var(--poster-ink)",
              background: "var(--poster-panel)",
              boxShadow: "var(--poster-shadow-sm)",
            }}
          >
            {(["this", "all"] as const).map((s) => {
              const active = scope === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: active ? "var(--poster-ink)" : "transparent",
                    color: active ? "#fff" : "var(--poster-ink-3)",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {s === "this" ? "Sadece Bu Ders" : "Tüm Seri"}
                </button>
              );
            })}
          </div>
        )}

        <div>
          <PBadge color={STATUS_COLOR[lesson.status]}>{STATUS_LABEL[lesson.status]}</PBadge>
        </div>

        {lesson.status !== "CANCELLED" && (
          <div style={{ display: "flex", gap: 8 }}>
            {lesson.status !== "COMPLETED" && (
              <PBtn onClick={() => changeStatus("COMPLETED")} disabled={saving} variant="green" size="sm" style={{ flex: 1 }}>
                <Check style={{ width: 12, height: 12, marginRight: 4 }} />
                Tamamlandı
              </PBtn>
            )}
            <button
              type="button"
              onClick={() => changeStatus("CANCELLED")}
              disabled={saving}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 10,
                border: "2px solid var(--poster-ink)",
                background: "var(--poster-danger)",
                color: "#fff",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                boxShadow: "2px 2px 0 var(--poster-ink)",
                opacity: saving ? 0.5 : 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <XIcon style={{ width: 12, height: 12 }} />
              İptal Et
            </button>
          </div>
        )}
        {lesson.status === "CANCELLED" && (
          <PBtn onClick={() => changeStatus("PLANNED")} disabled={saving} variant="accent" size="sm" style={{ width: "100%" }}>
            <RotateCcw style={{ width: 12, height: 12, marginRight: 4 }} />
            Yeniden Planla
          </PBtn>
        )}

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-ink-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
              Not
            </span>
            {!editingNote && (
              <button
                type="button"
                onClick={() => setEditingNote(true)}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--poster-accent)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-display)",
                }}
              >
                Düzenle
              </button>
            )}
          </div>
          {editingNote ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <PTextarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setEditingNote(false)}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--poster-ink-3)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={saveNote}
                  disabled={saving}
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--poster-accent)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-display)",
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          ) : (
            <PCard rounded={10} style={{ padding: "8px 12px", minHeight: 40, background: "var(--poster-bg-2)" }}>
              <p style={{ margin: 0, fontSize: 13, color: lesson.note ? "var(--poster-ink-2)" : "var(--poster-ink-faint)" }}>
                {lesson.note || "Not eklenmemiş"}
              </p>
            </PCard>
          )}
        </div>
      </div>
    </PModal>
  );
}

function DayLessonList({
  date,
  lessons,
  allLessons,
  onLessonClick,
  onAddClick,
}: {
  date: Date;
  lessons: DisplayLesson[];
  allLessons: DisplayLesson[];
  onLessonClick: (l: Lesson, d: Date) => void;
  onAddClick: () => void;
}) {
  const dateStr = formatDate(date, "long");

  const planned = allLessons.filter((l) => l.status === "PLANNED").length;
  const completed = allLessons.filter((l) => l.status === "COMPLETED").length;
  const cancelled = allLessons.filter((l) => l.status === "CANCELLED").length;

  const now = new Date();
  const upcoming = allLessons.filter((l) => l.displayDate >= now && l.status === "PLANNED").slice(0, 3);

  return (
    <PCard rounded={18} style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          borderBottom: "2px solid var(--poster-ink)",
          background: "var(--poster-bg-2)",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 11, color: "var(--poster-ink-3)", fontWeight: 700 }}>Seçilen gün</p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 14,
              fontWeight: 800,
              color: "var(--poster-ink)",
              textTransform: "capitalize",
            }}
          >
            {dateStr}
          </p>
        </div>
        <PBtn onClick={onAddClick} variant="accent" size="sm">
          + Ekle
        </PBtn>
      </div>

      {allLessons.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 18px",
            borderBottom: "2px dashed var(--poster-ink-faint)",
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 800, color: "var(--poster-ink-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
            Bu ay:
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-blue)" }}>{planned} planlandı</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-green)" }}>{completed} tamamlandı</span>
          {cancelled > 0 && <span style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-danger)" }}>{cancelled} iptal</span>}
        </div>
      )}

      <div style={{ padding: 18, position: "relative" }}>
        {lessons.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 28, opacity: 0.25, marginBottom: 10 }}>📅</div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--poster-ink-3)" }}>Bu güne ait ders yok</p>
            <div style={{ marginTop: 12 }}>
              <PBtn onClick={onAddClick} variant="white" size="sm">
                + Yeni Ders Ekle
              </PBtn>
            </div>

            {upcoming.length > 0 && (
              <div style={{ marginTop: 28, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: "var(--poster-accent)",
                      border: "1.5px solid var(--poster-ink)",
                    }}
                  />
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: "var(--poster-ink-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
                    Yaklaşan Oturumlar
                  </p>
                </div>
                <div
                  style={{
                    marginLeft: 4,
                    borderLeft: "2px dashed var(--poster-accent)",
                    paddingBottom: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {upcoming.map((l, i) => (
                    <div key={i} style={{ position: "relative", paddingLeft: 18 }}>
                      <div
                        style={{
                          position: "absolute",
                          left: -5,
                          top: 14,
                          height: 8,
                          width: 8,
                          borderRadius: 999,
                          background: "var(--poster-panel)",
                          border: "2px solid var(--poster-accent)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => onLessonClick(l, l.displayDate)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: 12,
                          borderRadius: 12,
                          border: "2px solid var(--poster-ink)",
                          background: "var(--poster-panel)",
                          cursor: "pointer",
                          fontFamily: "var(--font-display)",
                          boxShadow: "var(--poster-shadow-sm)",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: "var(--poster-blue)" }}>
                          {formatDate(l.displayDate, "short")} · {l.startTime}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 800, color: "var(--poster-ink)" }}>{l.student.name}</p>
                        {l.title && (
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--poster-ink-3)", fontWeight: 600 }}>{l.title}</p>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              position: "relative",
              borderLeft: "2px solid var(--poster-ink-faint)",
              marginLeft: 48,
              paddingBottom: 4,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {lessons.map((l, i) => {
              const isToday = l.displayDate.toDateString() === now.toDateString();
              const lStart = timeToMinutes(l.startTime);
              const lEnd = timeToMinutes(l.endTime);
              const currentMin = now.getHours() * 60 + now.getMinutes();
              const isActiveNow = isToday && currentMin >= lStart && currentMin <= lEnd;
              const dotColor = isActiveNow
                ? "var(--poster-accent)"
                : l.status === "COMPLETED"
                ? "var(--poster-green)"
                : l.status === "CANCELLED"
                ? "var(--poster-danger)"
                : "var(--poster-blue)";

              return (
                <div key={i} style={{ position: "relative", paddingLeft: 24 }}>
                  <div style={{ position: "absolute", left: -58, top: 6, width: 48, textAlign: "right" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 800,
                        color: isActiveNow ? "var(--poster-accent)" : "var(--poster-ink-3)",
                      }}
                    >
                      {l.startTime}
                    </p>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      left: -5,
                      top: 10,
                      height: 10,
                      width: 10,
                      borderRadius: 999,
                      background: dotColor,
                      border: "2px solid var(--poster-ink)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => onLessonClick(l, l.displayDate)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 12,
                      borderRadius: 12,
                      border: "2px solid var(--poster-ink)",
                      background: isActiveNow ? "color-mix(in srgb, var(--poster-accent) 10%, var(--poster-panel))" : "var(--poster-panel)",
                      cursor: "pointer",
                      boxShadow: isActiveNow ? "3px 3px 0 var(--poster-accent)" : "var(--poster-shadow-sm)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--poster-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {l.student.name}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--poster-ink-3)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {l.title}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              textTransform: "uppercase",
                              letterSpacing: ".08em",
                              padding: "2px 6px",
                              borderRadius: 6,
                              background: "var(--poster-bg-2)",
                              color: "var(--poster-ink-2)",
                            }}
                          >
                            {l.startTime} - {l.endTime}
                          </span>
                          {l.isRecurring && (
                            <Repeat style={{ width: 10, height: 10, color: "var(--poster-ink-3)" }} />
                          )}
                        </div>
                      </div>
                      <PBadge color={isActiveNow && l.status === "PLANNED" ? "accent" : STATUS_COLOR[l.status]}>
                        {isActiveNow && l.status === "PLANNED" ? "ŞİMDİ" : STATUS_LABEL[l.status]}
                      </PBadge>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PCard>
  );
}

function WeekView({
  weekStart,
  lessons,
  onLessonClick,
  onSlotClick,
  onDropLesson,
}: {
  weekStart: Date;
  lessons: Lesson[];
  onLessonClick: (lesson: Lesson, date: Date) => void;
  onSlotClick?: (date: Date, hour: number) => void;
  onDropLesson?: (lessonId: string, newDate: Date, newHour: number) => void;
}) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const displayed = expandLessons(lessons, weekStart, weekEnd);

  const weekDays: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const today = new Date();
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const nowTop = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const showNowLine = nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60;

  function lessonsForDay(date: Date): DisplayLesson[] {
    return displayed.filter((l) => isSameDay(l.displayDate, date));
  }

  function lessonStyle(l: DisplayLesson): React.CSSProperties {
    const top = ((timeToMinutes(l.startTime) - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = Math.max(((timeToMinutes(l.endTime) - timeToMinutes(l.startTime)) / 60) * HOUR_HEIGHT, 24);
    return { top, height, left: 2, right: 2, position: "absolute" };
  }

  return (
    <div style={{ overflowX: "auto", fontFamily: "var(--font-display)" }}>
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid var(--poster-ink)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--poster-panel)",
        }}
      >
        <div style={{ width: 56, flexShrink: 0 }} />
        {weekDays.map((d, i) => {
          const isTodayCol = isSameDay(d, today);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: 100,
                padding: "8px 0",
                textAlign: "center",
                borderLeft: "2px solid var(--poster-ink-faint)",
                background: isTodayCol ? "color-mix(in srgb, var(--poster-accent) 8%, transparent)" : "transparent",
              }}
            >
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "var(--poster-ink-3)" }}>{DAY_LABELS[i]}</p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 14,
                  fontWeight: 800,
                  color: isTodayCol ? "var(--poster-accent)" : "var(--poster-ink)",
                }}
              >
                {d.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", position: "relative", height: totalHeight + 24 }}>
        <div style={{ width: 56, flexShrink: 0, position: "relative" }}>
          {hours.map((h) => (
            <div
              key={h}
              style={{
                position: "absolute",
                width: "100%",
                paddingRight: 8,
                textAlign: "right",
                top: (h - START_HOUR) * HOUR_HEIGHT - 8,
              }}
            >
              <span style={{ fontSize: 10, color: "var(--poster-ink-faint)", fontWeight: 700 }}>
                {String(h).padStart(2, "0")}:00
              </span>
            </div>
          ))}
        </div>
        {weekDays.map((day, i) => {
          const dayLessons = lessonsForDay(day);
          const isTodayCol = isSameDay(day, today);

          return (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: 100,
                position: "relative",
                borderLeft: "2px solid var(--poster-ink-faint)",
                height: "100%",
                background: isTodayCol ? "color-mix(in srgb, var(--poster-accent) 4%, transparent)" : undefined,
              }}
            >
              {hours.map((h) => (
                <div
                  key={h}
                  style={{
                    position: "absolute",
                    width: "100%",
                    borderTop: "1px dashed var(--poster-ink-faint)",
                    top: (h - START_HOUR) * HOUR_HEIGHT,
                    height: HOUR_HEIGHT,
                    cursor: "pointer",
                  }}
                  onClick={() => onSlotClick?.(day, h)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const lessonId = e.dataTransfer.getData("lessonId");
                    if (lessonId && onDropLesson) onDropLesson(lessonId, day, h);
                  }}
                />
              ))}
              {isTodayCol && showNowLine && (
                <div style={{ position: "absolute", width: "100%", zIndex: 20, pointerEvents: "none", top: nowTop }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div
                      style={{
                        height: 10,
                        width: 10,
                        borderRadius: 999,
                        background: "var(--poster-accent)",
                        border: "2px solid var(--poster-ink)",
                        marginLeft: -5,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, height: 2, background: "var(--poster-accent)" }} />
                  </div>
                </div>
              )}
              {dayLessons.map((l, j) => {
                const color = STATUS_VAR[l.status];
                return (
                  <div
                    key={j}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("lessonId", l.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onLessonClick(l, l.displayDate);
                    }}
                    style={{
                      ...lessonStyle(l),
                      cursor: "pointer",
                      borderRadius: 10,
                      border: `2px solid var(--poster-ink)`,
                      background: `color-mix(in srgb, ${color} 18%, var(--poster-panel))`,
                      padding: "4px 6px",
                      fontSize: 10,
                      overflow: "hidden",
                      zIndex: 10,
                      boxShadow: "1.5px 1.5px 0 var(--poster-ink)",
                      fontFamily: "var(--font-display)",
                      color: "var(--poster-ink)",
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 800, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.startTime} {l.student.name}
                    </p>
                    <p style={{ margin: 0, lineHeight: 1.2, color: "var(--poster-ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.title}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const today = new Date();

  const [view, setView] = useState<"month" | "week">("month");
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const query =
    view === "month"
      ? `month=${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`
      : `week=${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;

  const { data: studentsData } = useSWR("/api/students", fetcher);
  const { data: lessonsData, mutate: mutateLessons, isLoading } = useSWR(`/api/lessons?${query}`, fetcher);

  const students: Student[] = studentsData?.students ?? [];
  const lessons: Lesson[] = lessonsData?.lessons ?? [];
  const loading = isLoading;

  const [showAddModal, setShowAddModal] = useState(false);
  const [addInitialDate, setAddInitialDate] = useState<Date | undefined>();
  const [selectedLesson, setSelectedLesson] = useState<{ lesson: Lesson; date: Date } | null>(null);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>("");

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Mobile (<768px) için haftalık görünüm kullanışsız (7×100px overflow);
  // bu genişlikte aylık görünüme zorla ve haftalık seçeneğini gizle.
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (isNarrow && view === "week") setView("month");
  }, [isNarrow, view]);

  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const todaysLessons = expandLessons(lessons, now, now);

      todaysLessons.forEach((l) => {
        const startMin = timeToMinutes(l.startTime);
        if (startMin - currentMin === 15) {
          new Notification("Yaklaşan Ders", {
            body: `${l.startTime}'da ${l.student.name} ile dersiniz başlayacak.`,
            icon: "/favicon.ico",
          });
        }
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [lessons]);

  function handleSelectDate(date: Date) {
    setSelectedDay(date);
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  function prevPeriod() {
    if (view === "week")
      setWeekStart((d) => {
        const n = new Date(d);
        n.setDate(d.getDate() - 7);
        return n;
      });
    else setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextPeriod() {
    if (view === "week")
      setWeekStart((d) => {
        const n = new Date(d);
        n.setDate(d.getDate() + 7);
        return n;
      });
    else setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }
  function goToday() {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    setSelectedDay(t);
    setCurrentDate(new Date(t.getFullYear(), t.getMonth(), 1));
    setWeekStart(getWeekStart(t));
  }

  function handleLessonSaved(lesson: Lesson) {
    mutateLessons((data: any) => {
      const prev = data?.lessons ?? [];
      const idx = prev.findIndex((l: Lesson) => l.id === lesson.id);
      if (idx >= 0) {
        const n = [...prev];
        n[idx] = lesson;
        return { ...data, lessons: n };
      }
      return { ...data, lessons: [...prev, lesson] };
    }, false);
    setShowAddModal(false);
    if (selectedLesson) setSelectedLesson({ lesson, date: selectedLesson.date });
  }
  function handleLessonDeleted(id: string) {
    mutateLessons((data: any) => {
      const prev = data?.lessons ?? [];
      return { ...data, lessons: prev.filter((l: Lesson) => l.id !== id) };
    }, false);
    setSelectedLesson(null);
  }

  const filteredLessons = useMemo(() => {
    if (!selectedStudentFilter) return lessons;
    return lessons.filter((l) => l.studentId === selectedStudentFilter);
  }, [lessons, selectedStudentFilter]);

  const lessonDotDates = collectLessonDates(filteredLessons, currentDate.getFullYear(), currentDate.getMonth() + 1);
  const dayLessons = expandLessons(filteredLessons, selectedDay, selectedDay);

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const allMonthLessons = expandLessons(filteredLessons, monthStart, monthEnd);

  const weekLabel = (() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return `${weekStart.getDate()} – ${end.getDate()} ${MONTH_LABELS[end.getMonth()]} ${end.getFullYear()}`;
  })();

  const handleDropLesson = async (lessonId: string, newDate: Date, newHour: number) => {
    const lessonToMove = lessons.find((l) => l.id === lessonId);
    if (!lessonToMove) return;

    if (lessonToMove.isRecurring) {
      toast.error("Tekrarlayan dersleri sürükle-bırak ile taşıyamazsınız. Düzenleme ekranını kullanın.");
      return;
    }

    const startH = String(newHour).padStart(2, "0") + ":00";
    const oldSt = timeToMinutes(lessonToMove.startTime);
    const oldEn = timeToMinutes(lessonToMove.endTime);
    const dur = oldEn - oldSt;
    const newEn = newHour * 60 + dur;
    const endH = String(Math.floor(newEn / 60)).padStart(2, "0") + ":" + String(newEn % 60).padStart(2, "0");
    const dStr = newDate.toLocaleDateString("en-CA");

    if (newEn > 24 * 60) {
      toast.error("Ders süresi gün sonunu aşıyor");
      return;
    }

    try {
      const payload: any = {
        date: dStr,
        startTime: startH,
        endTime: endH,
      };
      if (lessonToMove.studentId) payload.studentId = lessonToMove.studentId;
      if (lessonToMove.title) payload.title = lessonToMove.title;

      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Taşıma başarısız");

      toast.success("Ders başarıyla taşındı");
      mutateLessons();
    } catch (e: any) {
      toast.error(e.message || "Bir hata oluştu");
    }
  };

  const navBtnStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: "2px solid var(--poster-ink)",
    background: "var(--poster-panel)",
    color: "var(--poster-ink)",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    boxShadow: "var(--poster-shadow-sm)",
  };

  return (
    <main
      style={{ minHeight: "100vh", fontFamily: "var(--font-display)" }}
    >
      <div style={{ maxWidth: 1200, width: "100%", margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column" }}>
        <div
          style={{
            marginBottom: 20,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={prevPeriod} aria-label="Önceki" style={navBtnStyle}>
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </button>
            <PBtn onClick={goToday} variant="white" size="sm">
              Bugün
            </PBtn>
            <button type="button" onClick={nextPeriod} aria-label="Sonraki" style={navBtnStyle}>
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
            <h1
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: "var(--poster-ink)",
                margin: "0 0 0 8px",
                letterSpacing: "-.02em",
              }}
            >
              {view === "week" ? weekLabel : `${MONTH_LABELS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PSelect
              value={selectedStudentFilter}
              onChange={(e) => setSelectedStudentFilter(e.target.value)}
              style={{ height: 36, fontSize: 13, minWidth: 160 }}
            >
              <option value="">Tüm Öğrenciler</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </PSelect>

            <div
              style={{
                display: "flex",
                padding: 3,
                background: "var(--poster-panel)",
                border: "2px solid var(--poster-ink)",
                borderRadius: 12,
                boxShadow: "var(--poster-shadow-sm)",
              }}
            >
              {(["month", "week"] as const).map((v) => {
                const active = view === v;
                if (v === "week" && isNarrow) return null;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: ".05em",
                      background: active ? "var(--poster-ink)" : "transparent",
                      color: active ? "#fff" : "var(--poster-ink-3)",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {v === "month" ? "Aylık" : "Haftalık"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", gap: 20, padding: "16px 0" }}>
            <PSkeleton width={380} height={384} radius={18} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              <PSkeleton height={80} radius={14} />
              <PSkeleton height={80} radius={14} />
              <PSkeleton height={80} radius={14} />
            </div>
          </div>
        ) : view === "month" ? (
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20 }} className="calendar-month-grid">
            <GlassCalendar selectedDate={selectedDay} onSelectDate={handleSelectDate} lessonDates={lessonDotDates} />
            <DayLessonList
              date={selectedDay}
              lessons={dayLessons}
              allLessons={allMonthLessons}
              onLessonClick={(lesson, date) => setSelectedLesson({ lesson, date })}
              onAddClick={() => {
                setAddInitialDate(selectedDay);
                setShowAddModal(true);
              }}
            />
          </div>
        ) : (
          <PCard rounded={18} style={{ padding: 0, overflow: "hidden", flex: 1, minHeight: "calc(100vh - 120px)" }}>
            <WeekView
              weekStart={weekStart}
              lessons={filteredLessons}
              onLessonClick={(lesson, date) => setSelectedLesson({ lesson, date })}
              onSlotClick={(date) => {
                setAddInitialDate(date);
                setShowAddModal(true);
              }}
              onDropLesson={handleDropLesson}
            />
          </PCard>
        )}

        {showAddModal && (
          <LessonModal
            students={students}
            initialDate={addInitialDate}
            onClose={() => setShowAddModal(false)}
            onSave={handleLessonSaved}
          />
        )}
        {selectedLesson && (
          <LessonDetailModal
            lesson={selectedLesson.lesson}
            displayDate={selectedLesson.date}
            onClose={() => setSelectedLesson(null)}
            onUpdate={(updated) => handleLessonSaved(updated)}
            onDelete={handleLessonDeleted}
          />
        )}
      </div>

      <style jsx global>{`
        @media (max-width: 1023px) {
          .calendar-month-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
