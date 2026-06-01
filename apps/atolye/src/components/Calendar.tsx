"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  PAlert,
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
interface SessionExc {
  originalDate: string; // ISO
  title: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string | null;
  note: string | null;
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
  exceptions: SessionExc[];
}

/** Takvimde gösterilen tek bir occurrence (tekrar edenler exception ile override edilmiş olabilir). */
interface Occ {
  sessionId: string;
  occDate: string; // YYYY-MM-DD
  recurring: boolean;
  recurringDay: number | null;
  caseId: string | null;
  title: string;
  startTime: string;
  endTime: string;
  note: string | null;
  status: string;
  caseCode: string | null;
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

interface FormState {
  caseId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  note: string;
  isRecurring: boolean;
  recurringDay: number;
}
const EMPTY: FormState = {
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

interface EditCtx {
  sessionId: string;
  occDate: string;
  recurring: boolean;
}

export function Calendar({ caseOptions }: { caseOptions: CaseOption[] }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editCtx, setEditCtx] = useState<EditCtx | null>(null);
  const [scope, setScope] = useState<"this" | "all">("this");
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

  function occurrencesForDay(dayIndex: number, date: Date): Occ[] {
    const key = fmt(date);
    const out: Occ[] = [];
    for (const s of sessions) {
      if (s.isRecurring) {
        if (s.recurringDay !== dayIndex) continue;
        const exc = s.exceptions?.find((e) => e.originalDate.slice(0, 10) === key);
        if (exc && exc.status === "CANCELLED") continue; // bu occurrence iptal
        out.push({
          sessionId: s.id,
          occDate: key,
          recurring: true,
          recurringDay: s.recurringDay,
          caseId: s.caseId,
          title: exc?.title ?? s.title,
          startTime: exc?.startTime ?? s.startTime,
          endTime: exc?.endTime ?? s.endTime,
          note: exc?.note ?? s.note,
          status: exc?.status ?? s.status,
          caseCode: s.case?.code ?? null,
        });
      } else {
        if (s.date.slice(0, 10) !== key) continue;
        out.push({
          sessionId: s.id,
          occDate: key,
          recurring: false,
          recurringDay: null,
          caseId: s.caseId,
          title: s.title,
          startTime: s.startTime,
          endTime: s.endTime,
          note: s.note,
          status: s.status,
          caseCode: s.case?.code ?? null,
        });
      }
    }
    return out.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function openCreate(date?: Date) {
    setEditCtx(null);
    setScope("this");
    setForm({ ...EMPTY, date: fmt(date ?? new Date()) });
    setErr(null);
    setOpen(true);
  }
  function openEdit(o: Occ) {
    setEditCtx({ sessionId: o.sessionId, occDate: o.occDate, recurring: o.recurring });
    setScope("this");
    setForm({
      caseId: o.caseId ?? "",
      title: o.title,
      date: o.occDate,
      startTime: o.startTime,
      endTime: o.endTime,
      status: o.status,
      note: o.note ?? "",
      isRecurring: o.recurring,
      recurringDay: o.recurringDay ?? 0,
    });
    setErr(null);
    setOpen(true);
  }

  const payload = () => ({
    caseId: form.caseId || null,
    title: form.title.trim(),
    date: form.date,
    startTime: form.startTime,
    endTime: form.endTime,
    status: form.status,
    note: form.note.trim() || undefined,
    isRecurring: form.isRecurring,
    recurringDay: form.isRecurring ? Number(form.recurringDay) : null,
  });

  async function save() {
    if (!form.title.trim()) {
      setErr("Başlık gerekli.");
      return;
    }
    setSaving(true);
    setErr(null);

    let url = "/api/sessions";
    let method: "POST" | "PATCH" = "POST";
    if (editCtx) {
      method = "PATCH";
      url =
        editCtx.recurring && scope === "this"
          ? `/api/sessions/${editCtx.sessionId}?scope=this&date=${editCtx.occDate}`
          : `/api/sessions/${editCtx.sessionId}`;
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      toast.success(editCtx ? "Seans güncellendi" : "Seans eklendi");
      void load();
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(d.error ?? "Kaydedilemedi.");
    }
  }

  async function del() {
    if (!editCtx) return;
    const thisOnly = editCtx.recurring && scope === "this";
    if (!confirm(thisOnly ? "Bu seans (yalnız bu tarih) iptal edilsin mi?" : "Bu seans silinsin mi?"))
      return;
    const url = thisOnly
      ? `/api/sessions/${editCtx.sessionId}?scope=this&date=${editCtx.occDate}`
      : `/api/sessions/${editCtx.sessionId}`;
    const res = await fetch(url, { method: "DELETE" });
    if (res.ok) {
      setOpen(false);
      toast.success(thisOnly ? "Seans iptal edildi" : "Seans silindi");
      void load();
    } else {
      toast.error("İşlem başarısız");
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
          const items = occurrencesForDay(i, date);
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

              {items.map((o) => (
                <button
                  key={`${o.sessionId}-${o.occDate}`}
                  type="button"
                  onClick={() => openEdit(o)}
                  style={{
                    textAlign: "left",
                    border: `2px solid ${STATUS_TONE[o.status] ?? "var(--poster-ink)"}`,
                    borderRadius: "var(--poster-radius-sm)",
                    background: `color-mix(in srgb, ${STATUS_TONE[o.status] ?? "var(--poster-ink)"} 14%, transparent)`,
                    padding: "0.35rem 0.45rem",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.1rem",
                    opacity: o.status === "CANCELLED" ? 0.65 : 1,
                  }}
                >
                  <span style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                    {o.startTime}–{o.endTime}
                  </span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {o.title}
                  </span>
                  {o.caseCode && (
                    <span style={{ fontSize: "0.68rem", color: "var(--poster-ink-3)" }}>{o.caseCode}</span>
                  )}
                  {o.recurring && (
                    <span style={{ fontSize: "0.62rem", color: "var(--poster-ink-3)" }}>↻ haftalık</span>
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <PModal open={open} onClose={() => setOpen(false)} title={editCtx ? "Seansı düzenle" : "Yeni seans"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {editCtx?.recurring && (
            <div
              style={{
                display: "flex",
                gap: "0.4rem",
                padding: "0.5rem",
                border: "var(--poster-border)",
                borderRadius: "var(--poster-radius-md)",
                background: "var(--poster-panel)",
              }}
            >
              {(["this", "all"] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setScope(sc)}
                  aria-pressed={scope === sc}
                  style={{
                    flex: 1,
                    padding: "0.4rem",
                    border: "var(--poster-border)",
                    borderRadius: "var(--poster-radius-sm)",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    background: scope === sc ? "var(--poster-accent)" : "transparent",
                    color: scope === sc ? "#fff" : "var(--poster-ink)",
                  }}
                >
                  {sc === "this" ? "Bu seans" : "Tüm seri"}
                </button>
              ))}
            </div>
          )}

          <PField label="Başlık" htmlFor="s-title">
            <PInput
              id="s-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Okuma seansı"
            />
          </PField>
          <PField label="Öğrenci" hint="opsiyonel" htmlFor="s-case">
            <PSelect
              id="s-case"
              value={form.caseId}
              onChange={(e) => setForm((f) => ({ ...f, caseId: e.target.value }))}
            >
              <option value="">— öğrenci yok —</option>
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
          {/* Tekrar ayarı yalnız yeni / tüm-seri düzenlemede anlamlı */}
          {(!editCtx || scope === "all") && (
            <>
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
            </>
          )}
          <PField label="Not" hint="opsiyonel" htmlFor="s-note">
            <PTextarea id="s-note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} style={{ minHeight: "3.5rem" }} />
          </PField>
          {err && <PAlert tone="error">{err}</PAlert>}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between" }}>
            {editCtx ? (
              <PButton variant="danger" onClick={del}>
                <Trash2 size={15} aria-hidden /> {editCtx.recurring && scope === "this" ? "Bu seansı iptal et" : "Sil"}
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
