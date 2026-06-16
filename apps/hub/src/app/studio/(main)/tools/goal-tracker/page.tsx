"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  StickyNote,
  Check,
  Loader2,
  Target,
  CheckCircle,
  Clock,
  Circle,
  Printer,
} from "lucide-react";
import { formatDate } from "@studio/lib/utils";
import { PBtn, PCard, PBadge, PLabel, PSelect, PTextarea, PSpinner } from "@studio/components/poster";
import { ToolHeader } from "@studio/components/tools/ToolShell";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  name: string;
  birthDate: string | null;
  workArea: string;
  diagnosis: string | null;
  createdAt: string;
  curriculumIds: string[];
}

interface GoalProgress {
  id: string;
  status: string;
  notes: string | null;
  updatedAt: string;
}

interface GoalItem {
  goal: { id: string; code: string; title: string; isMainGoal: boolean };
  progress: GoalProgress | null;
}

interface ModuleItem {
  curriculum: { id: string; code: string; area: string; title: string };
  goals: GoalItem[];
}

interface RecentCard {
  id: string;
  title: string;
  toolType: string;
  createdAt: string;
}

interface RecentProgress {
  goalId: string;
  goalTitle: string;
  status: string;
  updatedAt: string;
}

interface TrackerData {
  student: Student;
  modules: ModuleItem[];
  recentCards: RecentCard[];
  recentProgress: RecentProgress[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: string; label: string; color: string; short: string }> = [
  { value: "not_started",   label: "Başlanmamış",    color: "#fff",                short: "B" },
  { value: "in_progress",   label: "Devam Ediyor",   color: "var(--poster-accent)", short: "D" },
  { value: "consolidating", label: "Pekiştiriliyor", color: "var(--poster-yellow)", short: "P" },
  { value: "mastered",      label: "Kazanıldı",      color: "var(--poster-green)",  short: "K" },
];

const STATUS_ORDER: Record<string, number> = {
  not_started:   0,
  in_progress:   1,
  consolidating: 2,
  mastered:      3,
  completed:     3,
};

type SortKey = "code" | "status" | "updatedAt";
type SortDir = "asc" | "desc";

const STATUS_META: Record<string, { label: string; color: "soft" | "accent" | "yellow" | "ink" | "green" }> = {
  not_started:   { label: "Başlanmamış",    color: "soft"   },
  in_progress:   { label: "Devam Ediyor",   color: "accent" },
  consolidating: { label: "Pekiştiriliyor", color: "yellow" },
  mastered:      { label: "Kazanıldı",      color: "green"  },
  completed:     { label: "Kazanıldı",      color: "green"  },
};

const TOOL_LABELS: Record<string, string> = {
  LEARNING_CARD:       "Öğrenme Kartı",
  SOCIAL_STORY:        "Sosyal Hikaye",
  ARTICULATION_DRILL:  "Artikülasyon",
  HOMEWORK_MATERIAL:   "Ev Ödevi",
  WEEKLY_PLAN:         "Haftalık Plan",
  SESSION_SUMMARY:     "Oturum Özeti",
  MATCHING_GAME:       "Kelime Eşleştirme",
  PHONATION_ACTIVITY:  "Sesletim",
  COMMUNICATION_BOARD: "İletişim Panosu",
};

const AREA_LABELS: Record<string, string> = {
  speech:   "Konuşma",
  language: "Dil",
  hearing:  "İşitme",
};

function getAge(birthDate: string | null) {
  if (!birthDate) return "—";
  const diff = Date.now() - new Date(birthDate).getTime();
  return `${Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))} yaş`;
}

function isMastered(s: string) { return s === "mastered" || s === "completed"; }
function isActive(s: string)   { return s === "in_progress" || s === "consolidating"; }

// ─── PDF ──────────────────────────────────────────────────────────────────────

async function downloadGoalTrackerPDF(data: TrackerData) {
  const jsPDF     = (await import("jspdf")).default;
  const autoTable = (await import("jspdf-autotable")).default;

  const doc   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const L     = 14;
  const R     = 196;
  const today = formatDate(new Date(), "medium");

  const [regResp, boldResp] = await Promise.all([
    fetch(`${window.location.origin}/fonts/NotoSans-Regular.ttf`),
    fetch(`${window.location.origin}/fonts/NotoSans-Bold.ttf`),
  ]);
  const toB64 = async (res: Response) => {
    const buf = await res.arrayBuffer();
    let bin = "";
    new Uint8Array(buf).forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin);
  };
  doc.addFileToVFS("NotoSans-Regular.ttf", await toB64(regResp));
  doc.addFileToVFS("NotoSans-Bold.ttf",    await toB64(boldResp));
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFont("NotoSans-Bold.ttf",    "NotoSans", "bold");

  const allGoals = data.modules.flatMap(m => m.goals);
  const total    = allGoals.length;
  const mastered = allGoals.filter(g => g.progress && isMastered(g.progress.status)).length;
  const active   = allGoals.filter(g => g.progress && isActive(g.progress.status)).length;
  const notStart = total - mastered - active;

  doc.setFont("NotoSans", "bold");
  doc.setFontSize(16);
  doc.setTextColor("#023435");
  doc.text(`Hedef Takip Raporu -- ${data.student.name}`, L, 18);

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#71717a");
  doc.text(today, L, 24);

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#18181b");
  doc.text(
    `Toplam: ${total}   Kazanildi: ${mastered}   Devam Eden: ${active}   Baslanmamis: ${notStart}   ` +
    `Genel Ilerleme: %${total ? Math.round((mastered + active * 0.5) / total * 100) : 0}`,
    L, 31
  );

  let y = 38;

  for (const mod of data.modules) {
    if (y > 240) { doc.addPage(); y = 16; }

    const modMastered = mod.goals.filter(g => g.progress && isMastered(g.progress.status)).length;
    doc.setFillColor("#023435");
    doc.roundedRect(L, y, R - L, 7, 1.5, 1.5, "F");
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor("#ffffff");
    doc.text(mod.curriculum.title, L + 3, y + 5);
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(8);
    doc.text(`${modMastered}/${mod.goals.length} kazanildi`, R - 3, y + 5, { align: "right" });
    y += 9;

    autoTable(doc, {
      head: [["Kod", "Hedef", "Durum", "Not"]],
      body: mod.goals.map(({ goal, progress }) => [
        goal.code,
        goal.title,
        progress ? (STATUS_META[progress.status]?.label ?? progress.status) : "Baslanmamis",
        progress?.notes ?? "",
      ]),
      startY: y,
      margin: { left: L, right: 14 },
      styles: { font: "NotoSans", fontSize: 7.5, cellPadding: 2, textColor: [24, 24, 27], overflow: "linebreak" },
      headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: "bold", fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 14 },
        2: { cellWidth: 30 },
        3: { cellWidth: 40 },
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  }

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor("#e4e4e7");
    doc.line(L, 285, R, 285);
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(7);
    doc.setTextColor("#a1a1aa");
    doc.text("LudenLab -- ludenlab.com", L, 290);
    doc.text(today, R, 290, { align: "right" });
  }

  doc.save(`Hedef_Takip_${data.student.name.replace(/\s+/g, "_")}.pdf`);
}

// ─── Sortable header ──────────────────────────────────────────────────────────

function SortableTh({
  label, sortKey: key, current, dir, onClick, width,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  width?: number;
}) {
  const active = current === key;
  return (
    <th style={{ padding: 0, textAlign: "left", width }}>
      <button
        type="button"
        onClick={() => onClick(key)}
        style={{
          width: "100%",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "8px 12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          fontWeight: 800,
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: ".05em",
          color: active ? "var(--poster-ink)" : "var(--poster-ink-2)",
          textAlign: "left" as const,
        }}
      >
        {label}
        <span style={{ fontSize: 10, opacity: active ? 1 : 0.35 }}>
          {active ? (dir === "asc" ? "▲" : "▼") : "▲"}
        </span>
      </button>
    </th>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, pct, color, Icon,
}: {
  label: string; value: number; pct: number; color: string;
  Icon: React.ElementType;
}) {
  return (
    <PCard rounded={14} style={{ padding: 14, background: "var(--poster-panel)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--poster-ink-2)", textTransform: "uppercase", letterSpacing: ".05em" }}>
          {label}
        </span>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: "2px solid var(--poster-ink)",
            display: "grid",
            placeItems: "center",
            background: color,
          }}
        >
          <Icon style={{ width: 14, height: 14, color: "#fff" }} />
        </div>
      </div>
      <p style={{ fontSize: 26, fontWeight: 900, color: "var(--poster-ink)", margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--poster-ink-3)", margin: "4px 0 0" }}>%{pct}</p>
    </PCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GoalTrackerPage() {
  const [students,      setStudents]      = useState<Student[]>([]);
  const [selectedId,    setSelectedId]    = useState("");
  const [data,          setData]          = useState<TrackerData | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [expanded,      setExpanded]      = useState<Set<string>>(new Set());
  const [savingGoal,    setSavingGoal]    = useState<string | null>(null);
  const [editNote,      setEditNote]      = useState<string | null>(null);
  const [noteInputs,    setNoteInputs]    = useState<Record<string, string>>({});
  const [savingNote,    setSavingNote]    = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [sortKey,       setSortKey]       = useState<SortKey>("code");
  const [sortDir,       setSortDir]       = useState<SortDir>("asc");

  function toggleSort(k: SortKey) {
    if (k === sortKey) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(k === "updatedAt" ? "desc" : "asc");
    }
  }

  function sortGoals(goals: GoalItem[]): GoalItem[] {
    const parseCode = (code: string): [number, number] => {
      const parts = code.split(".");
      const a = Number.parseInt(parts[0] ?? "", 10);
      const b = Number.parseInt(parts[1] ?? "", 10);
      return [Number.isFinite(a) ? a : 0, Number.isFinite(b) ? b : 0];
    };
    const sign = sortDir === "asc" ? 1 : -1;
    return [...goals].sort((x, y) => {
      if (sortKey === "code") {
        const [xa, xb] = parseCode(x.goal.code);
        const [ya, yb] = parseCode(y.goal.code);
        if (xa !== ya) return (xa - ya) * sign;
        return (xb - yb) * sign;
      }
      if (sortKey === "status") {
        const xs = STATUS_ORDER[x.progress?.status ?? "not_started"] ?? 0;
        const ys = STATUS_ORDER[y.progress?.status ?? "not_started"] ?? 0;
        if (xs !== ys) return (xs - ys) * sign;
        const [xa, xb] = parseCode(x.goal.code);
        const [ya, yb] = parseCode(y.goal.code);
        if (xa !== ya) return xa - ya;
        return xb - yb;
      }
      const xt = x.progress?.updatedAt ? new Date(x.progress.updatedAt).getTime() : 0;
      const yt = y.progress?.updatedAt ? new Date(y.progress.updatedAt).getTime() : 0;
      if (xt !== yt) return (xt - yt) * sign;
      const [xa, xb] = parseCode(x.goal.code);
      const [ya, yb] = parseCode(y.goal.code);
      if (xa !== ya) return xa - ya;
      return xb - yb;
    });
  }

  useEffect(() => {
    fetch("/api/students")
      .then(r => r.json())
      .then(d => setStudents(d.students ?? []));
  }, []);

  const fetchData = useCallback(async (sid: string) => {
    if (!sid) { setData(null); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/tools/goal-tracker/${sid}`);
      if (!r.ok) throw new Error();
      const d: TrackerData = await r.json();
      setData(d);
      setExpanded(new Set(d.modules.map(m => m.curriculum.id)));
      const notes: Record<string, string> = {};
      d.modules.forEach(m =>
        m.goals.forEach(({ goal, progress }) => {
          if (progress?.notes) notes[goal.id] = progress.notes;
        })
      );
      setNoteInputs(notes);
    } catch {
      toast.error("Veriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(selectedId); }, [selectedId, fetchData]);

  async function updateStatus(goalId: string, status: string) {
    if (!selectedId) return;
    setSavingGoal(goalId);
    try {
      const r = await fetch(`/api/tools/goal-tracker/${selectedId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, status }),
      });
      if (!r.ok) throw new Error();
      const { progress } = await r.json();
      setData(prev => !prev ? prev : {
        ...prev,
        modules: prev.modules.map(m => ({
          ...m,
          goals: m.goals.map(g =>
            g.goal.id === goalId ? { ...g, progress } : g
          ),
        })),
      });
      toast.success("Durum güncellendi");
    } catch {
      toast.error("Güncelleme başarısız");
    } finally {
      setSavingGoal(null);
    }
  }

  async function saveNote(goalId: string) {
    if (!selectedId) return;
    setSavingNote(goalId);
    try {
      const r = await fetch(`/api/tools/goal-tracker/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, note: noteInputs[goalId] ?? "" }),
      });
      if (!r.ok) throw new Error();
      const { progress } = await r.json();
      setData(prev => !prev ? prev : {
        ...prev,
        modules: prev.modules.map(m => ({
          ...m,
          goals: m.goals.map(g =>
            g.goal.id === goalId ? { ...g, progress } : g
          ),
        })),
      });
      setEditNote(null);
      toast.success("Not kaydedildi");
    } catch {
      toast.error("Not kaydedilemedi");
    } finally {
      setSavingNote(null);
    }
  }

  const stats = data
    ? (() => {
        const all      = data.modules.flatMap(m => m.goals);
        const total    = all.length;
        const mastered = all.filter(g => g.progress && isMastered(g.progress.status)).length;
        const active   = all.filter(g => g.progress && isActive(g.progress.status)).length;
        const notStart = total - mastered - active;
        const overallPct = total ? Math.round((mastered + active * 0.5) / total * 100) : 0;
        return { total, mastered, active, notStart, overallPct };
      })()
    : null;

  const selectedStudent = students.find(s => s.id === selectedId);

  function toggleModule(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const activities = data
    ? [
        ...data.recentCards.map(c => ({ type: "card" as const, date: c.createdAt, card: c })),
        ...data.recentProgress.map(p => ({ type: "progress" as const, date: p.updatedAt, prog: p })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
    : [];

  return (
    <div
      className="poster-scope"
      style={{
        minHeight: "100%",
        background: "var(--poster-bg)",
        padding: "clamp(14px, 3.5vw, 20px) clamp(14px, 3.5vw, 20px) clamp(24px, 5vw, 32px)",
        fontFamily: "var(--font-display)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Header */}
        <ToolHeader
          title="Hedef Takip Tablosu"
          description="Öğrencilerinizin BEP hedeflerini takip edin, ilerlemeyi görselleştirin."
          actions={
            data ? (
              <>
                <PBtn variant="white" onClick={() => window.print()} icon={<Printer style={{ width: 14, height: 14 }} />}>
                  Yazdır
                </PBtn>
                <PBtn
                  variant="dark"
                  onClick={async () => {
                    if (!data) return;
                    setDownloadingPDF(true);
                    try { await downloadGoalTrackerPDF(data); }
                    catch { toast.error("PDF oluşturulamadı"); }
                    finally { setDownloadingPDF(false); }
                  }}
                  disabled={downloadingPDF}
                  icon={downloadingPDF
                    ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                    : <FileText style={{ width: 14, height: 14 }} />}
                >
                  PDF İndir
                </PBtn>
              </>
            ) : undefined
          }
        />

        {/* Student selector */}
        <PCard rounded={14} style={{ padding: 16, background: "var(--poster-panel)" }}>
          <PLabel>Öğrenci Seç</PLabel>
          <PSelect value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">— Öğrenci seçin —</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </PSelect>

          {selectedStudent && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                border: "2px solid var(--poster-ink)",
                borderRadius: 12,
                background: "var(--poster-bg-2)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(110px, 100%), 1fr))",
                gap: 12,
              }}
            >
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--poster-ink-3)", textTransform: "uppercase", letterSpacing: ".05em", margin: 0 }}>Ad</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: "var(--poster-ink)", margin: "2px 0 0" }}>{selectedStudent.name}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--poster-ink-3)", textTransform: "uppercase", letterSpacing: ".05em", margin: 0 }}>Yaş</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: "var(--poster-ink)", margin: "2px 0 0" }}>{getAge(selectedStudent.birthDate)}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--poster-ink-3)", textTransform: "uppercase", letterSpacing: ".05em", margin: 0 }}>Alan</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: "var(--poster-ink)", margin: "2px 0 0" }}>{AREA_LABELS[selectedStudent.workArea] ?? selectedStudent.workArea}</p>
              </div>
              {selectedStudent.diagnosis ? (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--poster-ink-3)", textTransform: "uppercase", letterSpacing: ".05em", margin: 0 }}>Tanı</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "var(--poster-ink)", margin: "2px 0 0" }}>{selectedStudent.diagnosis}</p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--poster-ink-3)", textTransform: "uppercase", letterSpacing: ".05em", margin: 0 }}>Modül</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "var(--poster-ink)", margin: "2px 0 0" }}>{selectedStudent.curriculumIds.length}</p>
                </div>
              )}
            </div>
          )}
        </PCard>

        {/* Empty state */}
        {!selectedId && (
          <PCard rounded={18} style={{ padding: "64px 24px", textAlign: "center", background: "var(--poster-panel)" }}>
            <Target style={{ width: 48, height: 48, margin: "0 auto 16px", color: "var(--poster-ink-faint)" }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--poster-ink-2)", margin: 0 }}>
              Bir öğrenci seçerek hedef takibine başlayın.
            </p>
          </PCard>
        )}

        {/* Loading */}
        {selectedId && loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <PSpinner size={32} />
          </div>
        )}

        {/* No modules */}
        {selectedId && !loading && data && data.modules.length === 0 && (
          <PCard rounded={18} style={{ padding: "48px 24px", textAlign: "center", background: "var(--poster-panel)" }}>
            <Target style={{ width: 40, height: 40, margin: "0 auto 12px", color: "var(--poster-ink-faint)" }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--poster-ink-2)", margin: "0 0 4px" }}>
              Bu öğrenciye henüz modül atanmamış.
            </p>
            <Link
              href={`/students/${selectedId}`}
              style={{ fontSize: 13, fontWeight: 700, color: "var(--poster-accent)", textDecoration: "underline" }}
            >
              Öğrenci detayına git → Modül ata
            </Link>
          </PCard>
        )}

        {/* Dashboard */}
        {selectedId && !loading && data && stats && data.modules.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(120px, 100%), 1fr))", gap: 12 }}>
              <StatCard label="Toplam" value={stats.total}    pct={100} color="var(--poster-blue)"   Icon={Target}      />
              <StatCard label="Kazanıldı"    value={stats.mastered} pct={stats.total ? Math.round(stats.mastered/stats.total*100) : 0} color="var(--poster-green)"  Icon={CheckCircle} />
              <StatCard label="Devam Eden"   value={stats.active}   pct={stats.total ? Math.round(stats.active/stats.total*100)   : 0} color="var(--poster-accent)" Icon={Clock}       />
              <StatCard label="Başlanmamış"  value={stats.notStart} pct={stats.total ? Math.round(stats.notStart/stats.total*100) : 0} color="var(--poster-ink-3)"  Icon={Circle}      />
            </div>

            {/* Progress bar */}
            <PCard rounded={14} style={{ padding: 14, background: "var(--poster-panel)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--poster-ink)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                  Genel İlerleme
                </span>
                <span style={{ fontSize: 16, fontWeight: 900, color: "var(--poster-ink)" }}>%{stats.overallPct}</span>
              </div>
              <div
                style={{
                  height: 14,
                  width: "100%",
                  border: "2px solid var(--poster-ink)",
                  borderRadius: 7,
                  background: "var(--poster-panel)",
                  display: "flex",
                  overflow: "hidden",
                }}
              >
                {stats.total > 0 && (
                  <>
                    <div style={{ width: `${stats.mastered / stats.total * 100}%`, background: "var(--poster-green)" }} />
                    <div style={{ width: `${stats.active   / stats.total * 100}%`, background: "var(--poster-accent)" }} />
                  </>
                )}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, fontWeight: 700, color: "var(--poster-ink-2)", alignItems: "center" }}>
                {STATUS_OPTIONS.map(opt => (
                  <span key={opt.value} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        background: opt.color,
                        border: "2px solid var(--poster-ink)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "inherit",
                        fontSize: 10,
                        fontWeight: 800,
                        color: "var(--poster-ink)",
                      }}
                    >
                      {opt.short}
                    </span>
                    {opt.label}
                  </span>
                ))}
              </div>
            </PCard>

            {/* Modules */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.modules.map(mod => {
                const modMastered = mod.goals.filter(g => g.progress && isMastered(g.progress.status)).length;
                const modTotal    = mod.goals.length;
                const modPct      = modTotal ? Math.round(modMastered / modTotal * 100) : 0;
                const isOpen      = expanded.has(mod.curriculum.id);

                return (
                  <PCard key={mod.curriculum.id} rounded={14} style={{ padding: 0, background: "var(--poster-panel)", overflow: "hidden" }}>
                    <button
                      type="button"
                      onClick={() => toggleModule(mod.curriculum.id)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "14px 16px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "left" as const,
                      }}
                    >
                      {isOpen
                        ? <ChevronDown  style={{ width: 16, height: 16, color: "var(--poster-ink)", flexShrink: 0 }} />
                        : <ChevronRight style={{ width: 16, height: 16, color: "var(--poster-ink)", flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--poster-ink)" }}>
                          {mod.curriculum.title}
                        </span>
                        <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "var(--poster-ink-3)", fontFamily: "monospace" }}>
                          {mod.curriculum.code}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <div
                          style={{
                            width: 80,
                            height: 8,
                            border: "1.5px solid var(--poster-ink)",
                            borderRadius: 6,
                            background: "var(--poster-panel)",
                            overflow: "hidden",
                          }}
                        >
                          <div style={{ width: `${modPct}%`, height: "100%", background: "var(--poster-green)" }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--poster-ink-2)", minWidth: 56, textAlign: "right" as const }}>
                          {modMastered}/{modTotal}
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <div style={{ borderTop: "2px solid var(--poster-ink)", overflowX: "auto" }}>
                        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", minWidth: 560 }}>
                          <thead>
                            <tr style={{ background: "var(--poster-bg-2)", borderBottom: "2px solid var(--poster-ink)" }}>
                              <SortableTh label="Kod"        sortKey="code"      current={sortKey} dir={sortDir} onClick={toggleSort} width={64} />
                              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 800, color: "var(--poster-ink-2)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>Hedef</th>
                              <SortableTh label="Durum"      sortKey="status"    current={sortKey} dir={sortDir} onClick={toggleSort} width={200} />
                              <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 800, color: "var(--poster-ink-2)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em", width: 48 }}>Not</th>
                              <SortableTh label="Güncelleme" sortKey="updatedAt" current={sortKey} dir={sortDir} onClick={toggleSort} width={112} />
                            </tr>
                          </thead>
                          <tbody>
                            {sortGoals(mod.goals).map(({ goal, progress }) => {
                              const status   = progress?.status ?? "not_started";
                              const isSaving = savingGoal === goal.id;
                              const noteOpen = editNote === goal.id;

                              return (
                                <React.Fragment key={goal.id}>
                                  <tr style={{ borderBottom: "2px dashed var(--poster-ink-faint)" }}>
                                    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 700, color: "var(--poster-ink-3)" }}>
                                      {goal.code}
                                    </td>
                                    <td style={{ padding: "10px 12px", color: "var(--poster-ink)", fontWeight: 600 }}>
                                      {goal.isMainGoal && (
                                        <span style={{ marginRight: 6, display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--poster-accent)", verticalAlign: "middle" }} />
                                      )}
                                      {goal.title}
                                    </td>
                                    <td style={{ padding: "10px 12px" }}>
                                      {isSaving ? (
                                        <Loader2 style={{ width: 14, height: 14, color: "var(--poster-ink-3)", animation: "spin 1s linear infinite" }} />
                                      ) : (
                                        <div style={{ display: "inline-flex", gap: 4 }}>
                                          {STATUS_OPTIONS.map(opt => {
                                            const active = status === opt.value || (opt.value === "mastered" && status === "completed");
                                            return (
                                              <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => updateStatus(goal.id, opt.value)}
                                                title={opt.label}
                                                aria-label={opt.label}
                                                aria-pressed={active}
                                                style={{
                                                  width: 36,
                                                  height: 36,
                                                  borderRadius: 8,
                                                  border: "2px solid var(--poster-ink)",
                                                  background: opt.color,
                                                  color: "var(--poster-ink)",
                                                  fontFamily: "inherit",
                                                  fontSize: 11,
                                                  fontWeight: 800,
                                                  cursor: "pointer",
                                                  display: "inline-flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  boxShadow: active ? "2px 2px 0 var(--poster-ink)" : "none",
                                                  opacity: active ? 1 : 0.55,
                                                  transform: active ? "translate(-1px, -1px)" : "none",
                                                  transition: "opacity .1s, transform .1s, box-shadow .1s",
                                                }}
                                              >
                                                {opt.short}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                      <button
                                        type="button"
                                        onClick={() => setEditNote(noteOpen ? null : goal.id)}
                                        title={progress?.notes ? "Notu görüntüle / düzenle" : "Not ekle"}
                                        style={{
                                          width: 36,
                                          height: 36,
                                          borderRadius: 8,
                                          border: "2px solid var(--poster-ink)",
                                          background: progress?.notes ? "var(--poster-yellow)" : "#fff",
                                          color: "var(--poster-ink)",
                                          cursor: "pointer",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                        }}
                                      >
                                        <StickyNote style={{ width: 14, height: 14 }} />
                                      </button>
                                    </td>
                                    <td style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--poster-ink-3)" }}>
                                      {progress?.updatedAt ? formatDate(progress.updatedAt, "short") : "—"}
                                    </td>
                                  </tr>
                                  {noteOpen && (
                                    <tr>
                                      <td colSpan={5} style={{ padding: 12, background: "var(--poster-bg-2)", borderBottom: "2px dashed var(--poster-ink-faint)" }}>
                                        <PTextarea
                                          rows={2}
                                          placeholder="Bu hedefle ilgili not ekleyin..."
                                          value={noteInputs[goal.id] ?? ""}
                                          onChange={e =>
                                            setNoteInputs(prev => ({ ...prev, [goal.id]: e.target.value }))
                                          }
                                        />
                                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                          <PBtn
                                            variant="dark"
                                            size="sm"
                                            onClick={() => saveNote(goal.id)}
                                            disabled={savingNote === goal.id}
                                            icon={savingNote === goal.id
                                              ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                                              : <Check style={{ width: 12, height: 12 }} />}
                                          >
                                            Kaydet
                                          </PBtn>
                                          <PBtn variant="white" size="sm" onClick={() => setEditNote(null)}>
                                            İptal
                                          </PBtn>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </PCard>
                );
              })}
            </div>

            {/* Recent activities */}
            {activities.length > 0 && (
              <PCard rounded={14} style={{ padding: 16, background: "var(--poster-panel)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--poster-ink)", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: ".05em" }}>
                  Son Aktiviteler
                </h3>
                <div
                  style={{
                    position: "relative",
                    paddingLeft: 18,
                    borderLeft: "2px dashed var(--poster-ink-faint)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  {activities.map((item, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <div
                        style={{
                          position: "absolute",
                          left: -24,
                          top: 2,
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: "var(--poster-panel)",
                          border: "2px solid var(--poster-ink)",
                        }}
                      />
                      {item.type === "card" ? (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <PBadge color="blue">
                            {TOOL_LABELS[item.card.toolType] ?? item.card.toolType}
                          </PBadge>
                          <div>
                            <Link
                              href={`/cards/${item.card.id}`}
                              style={{ fontSize: 12, fontWeight: 800, color: "var(--poster-ink)", textDecoration: "none" }}
                            >
                              {item.card.title}
                            </Link>
                            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--poster-ink-3)", margin: "2px 0 0" }}>
                              {formatDate(item.date, "medium")}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <PBadge color={STATUS_META[item.prog.status]?.color ?? "soft"}>
                            {STATUS_META[item.prog.status]?.label ?? item.prog.status}
                          </PBadge>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--poster-ink)", margin: 0 }}>
                              {item.prog.goalTitle}
                            </p>
                            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--poster-ink-3)", margin: "2px 0 0" }}>
                              {formatDate(item.date, "medium")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </PCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
