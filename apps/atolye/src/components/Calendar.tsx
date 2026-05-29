"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  PAlert,
  PBadge,
  PButton,
  PField,
  PInput,
  PModal,
  PSelect,
  PSpinner,
  PTextarea,
  toast,
} from "@ludenlab/ui";

interface CaseOption {
  id: string;
  code: string;
}
interface SessionRow {
  id: string;
  caseId: string | null;
  title: string;
  date: string; // ISO
  startTime: string;
  endTime: string;
  note: string | null;
  status: string;
  isRecurring: boolean;
  recurringDay: number | null;
  case: { code: string } | null;
}

const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const STATUS_TONE: Record<string, string> = {
  PLANNED: "var(--poster-blue)",
  COMPLETED: "var(--poster-green)",
  CANCELLED: "var(--poster-danger)",
};
const STATUS_LABEL: Record<string, string> = {
  PLANNED: "Planlandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function startOfWeekMonday(base: Date) {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const EMPTY = {
  id: null as string | null,
  caseId: "",
  title: "",
  date: "",
  startTime: "09:00",
  endTime: "09:40",
  status: "PLANNED",
  note: "",
  isRecurring: false,
  recurringDay: 0,
};

export function Calendar({ caseOptions }: { caseOptions: CaseOption[] }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const weekStart = useMemo(() => addDays(startOfWeekMonday(new Date()), weekOffset * 7), [weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const load = useCallback(async () => {
    setLoading(true);
    const from = fmt(weekStart);
    const to = fmt(addDays(weekStart, 6));
    try {
      const res = await fetch(`/api/sessions?from=${from}&to=${to}`);
      const data = (await res.json()) as { sessions?: SessionRow[] };
      setSessions(data.sessions ?? []);
    } catch {
      toast.error("Takvim yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  function sessionsForDay(dayIndex: number, date: Date): SessionRow[] {
    const key = fmt(date);
    return sessions
      .filter((s) =>
        s.isRecurring ? s.recurringDay === dayIndex : s.date.slice(0, 10) === key,
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function openCreate(date?: Date) {
    setForm({ ...EMPTY, date: fmt(date ?? new Date()) });
    setErr(null);
    setOpen(true);
  }
  function openEdit(s: SessionRow) {
    setForm({
      id: s.id,
      caseId: s.caseId ?? "",
      title: s.title,
      date: s.date.slice(0, 10),
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      note: s.note ?? "",
      isRecurring: s.isRecurring,
      recurringDay: s.recurringDay ?? 0,
    });
    setErr(null);
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim()) {
      setErr("Başlık gerekli.");
      return;
    }
    setSaving(true);
    setErr(null);
    const payload = {
      caseId: form.caseId || null,
      title: form.title.trim(),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      status: form.status,
      note: form.note.trim() || undefined,
      isRecurring: form.isRecurring,
      recurringDay: form.isRecurring ? Number(form.recurringDay) : null,
    };
    const res = await fetch(form.id ? `/api/sessions/${form.id}` : "/api/sessions", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      toast.success(form.id ? "Seans güncellendi" : "Seans eklendi");
      void load();
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(d.error ?? "Kaydedilemedi.");
    }
  }

  async function del() {
    if (!form.id) return;
    if (!confirm("Bu seans silinsin mi?")) return;
    const res = await fetch(`/api/sessions/${form.id}`, { method: "DELETE" });
    if (res.ok) {
      setOpen(false);
      toast.success("Seans silindi");
      void load();
    } else {
      toast.error("Silinemedi");
    }
  }

  return (
    <>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
        }}
      >
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: 0 }}>Takvim</h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <PButton size="sm" variant="ghost" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Önceki hafta">
            <ChevronLeft size={16} aria-hidden />
          </PButton>
          <PButton size="sm" variant="ghost" onClick={() => setWeekOffset(0)}>
            Bu hafta
          </PButton>
          <PButton size="sm" variant="ghost" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Sonraki hafta">
            <ChevronRight size={16} aria-hidden />
          </PButton>
          <PButton size="sm" onClick={() => openCreate()}>
            <Plus size={16} aria-hidden /> Yeni seans
          </PButton>
        </div>
      </header>

      <p style={{ color: "var(--poster-ink-3)", fontSize: "0.85rem", margin: "0 0 1rem" }}>
        {fmt(weekStart)} – {fmt(addDays(weekStart, 6))}
        {loading && (
          <span style={{ marginLeft: "0.5rem" }}>
            <PSpinner />
          </span>
        )}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: "0.5rem",
          overflowX: "auto",
        }}
      >
        {days.map((date, i) => {
          const today = fmt(date) === fmt(new Date());
          const items = sessionsForDay(i, date);
          return (
            <div
              key={i}
              style={{
                border: "var(--poster-border)",
                borderRadius: "var(--poster-radius-md)",
                background: today ? "var(--poster-accent-soft)" : "var(--poster-panel)",
                minHeight: 160,
                minWidth: 120,
                padding: "0.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <button
                type="button"
                onClick={() => openCreate(date)}
                title="Bu güne seans ekle"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: 0,
                }}
              >
                <span style={{ fontWeight: 800, fontSize: "0.8rem" }}>{DAY_NAMES[i]}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--poster-ink-3)" }}>
                  {date.getDate()}.{pad(date.getMonth() + 1)}
                </span>
              </button>

              {items.map((s) => (
                <button
                  key={`${s.id}-${i}`}
                  type="button"
                  onClick={() => openEdit(s)}
                  style={{
                    textAlign: "left",
                    border: `2px solid ${STATUS_TONE[s.status] ?? "var(--poster-ink)"}`,
                    borderRadius: "var(--poster-radius-sm)",
                    background: `color-mix(in srgb, ${STATUS_TONE[s.status] ?? "var(--poster-ink)"} 14%, transparent)`,
                    padding: "0.35rem 0.45rem",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.1rem",
                    opacity: s.status === "CANCELLED" ? 0.65 : 1,
                  }}
                >
                  <span style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                    {s.startTime}–{s.endTime}
                  </span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.title}
                  </span>
                  {s.case?.code && (
                    <span style={{ fontSize: "0.68rem", color: "var(--poster-ink-3)" }}>{s.case.code}</span>
                  )}
                  {s.isRecurring && (
                    <span style={{ fontSize: "0.62rem", color: "var(--poster-ink-3)" }}>↻ haftalık</span>
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <PModal open={open} onClose={() => setOpen(false)} title={form.id ? "Seansı düzenle" : "Yeni seans"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <PField label="Başlık" htmlFor="s-title">
            <PInput
              id="s-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Okuma seansı"
            />
          </PField>
          <PField label="Vaka" hint="opsiyonel" htmlFor="s-case">
            <PSelect
              id="s-case"
              value={form.caseId}
              onChange={(e) => setForm((f) => ({ ...f, caseId: e.target.value }))}
            >
              <option value="">— vaka yok —</option>
              {caseOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </PSelect>
          </PField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem" }}>
            <PField label="Tarih" htmlFor="s-date">
              <PInput id="s-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </PField>
            <PField label="Başlangıç" htmlFor="s-start">
              <PInput id="s-start" type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </PField>
            <PField label="Bitiş" htmlFor="s-end">
              <PInput id="s-end" type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
            </PField>
          </div>
          <PField label="Durum" htmlFor="s-status">
            <PSelect id="s-status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </PSelect>
          </PField>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={form.isRecurring}
              onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))}
            />
            Her hafta tekrar et
          </label>
          {form.isRecurring && (
            <PField label="Tekrar günü" htmlFor="s-rday">
              <PSelect
                id="s-rday"
                value={String(form.recurringDay)}
                onChange={(e) => setForm((f) => ({ ...f, recurringDay: Number(e.target.value) }))}
              >
                {DAY_NAMES.map((d, idx) => (
                  <option key={idx} value={idx}>
                    {d}
                  </option>
                ))}
              </PSelect>
            </PField>
          )}
          <PField label="Not" hint="opsiyonel" htmlFor="s-note">
            <PTextarea id="s-note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} style={{ minHeight: "3.5rem" }} />
          </PField>
          {err && <PAlert tone="error">{err}</PAlert>}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between" }}>
            {form.id ? (
              <PButton variant="danger" onClick={del}>
                <Trash2 size={15} aria-hidden /> Sil
              </PButton>
            ) : (
              <span />
            )}
            <PButton onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <PSpinner /> Kaydediliyor…
                </>
              ) : (
                "Kaydet"
              )}
            </PButton>
          </div>
        </div>
      </PModal>
    </>
  );
}
