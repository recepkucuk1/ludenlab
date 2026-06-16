"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
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
  originalDate: string;
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
  date: string;
  startTime: string;
  endTime: string;
  note: string | null;
  status: string;
  isRecurring: boolean;
  recurringDay: number | null;
  case: { code: string } | null;
  exceptions: SessionExc[];
}
interface Occ {
  sessionId: string;
  occDate: string;
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
function weekdayMon(d: Date) {
  return (d.getDay() + 6) % 7; // 0=Pzt … 6=Paz
}
function startOfWeekMonday(base: Date) {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - weekdayMon(d));
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
  const [view, setView] = useState<"week" | "month">("month");
  const [cursor, setCursor] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editCtx, setEditCtx] = useState<EditCtx | null>(null);
  const [scope, setScope] = useState<"this" | "all">("this");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [dragId, setDragId] = useState<string | null>(null);
  const [remindOn, setRemindOn] = useState(false);
  const notifiedRef = useRef<Set<string>>(new Set());

  const weekStart = useMemo(() => startOfWeekMonday(cursor), [cursor]);
  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const gridStart = useMemo(
    () => (view === "week" ? weekStart : startOfWeekMonday(monthStart)),
    [view, weekStart, monthStart],
  );
  const gridDays = useMemo(
    () => Array.from({ length: view === "week" ? 7 : 42 }, (_, i) => addDays(gridStart, i)),
    [view, gridStart],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const from = fmt(gridStart);
    const to = fmt(addDays(gridStart, (view === "week" ? 7 : 42) - 1));
    try {
      const res = await fetch(`/atolye/api/sessions?from=${from}&to=${to}`);
      const data = (await res.json()) as { sessions?: SessionRow[] };
      setSessions(data.sessions ?? []);
    } catch {
      toast.error("Takvim yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [gridStart, view]);

  useEffect(() => {
    void load();
  }, [load]);

  const occurrencesForDay = useCallback(
    (date: Date): Occ[] => {
      const key = fmt(date);
      const dayIndex = weekdayMon(date);
      const out: Occ[] = [];
      for (const s of sessions) {
        if (s.isRecurring) {
          if (s.recurringDay !== dayIndex) continue;
          if (s.date.slice(0, 10) > key) continue; // tekrar: başlangıç tarihinden önceki haftalarda gösterme
          const exc = s.exceptions?.find((e) => e.originalDate.slice(0, 10) === key);
          if (exc && exc.status === "CANCELLED") continue;
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
    },
    [sessions],
  );

  // 15 dk hatırlatma (sekme açıkken; bugün yüklü aralıktaysa). Tam arka-plan için service worker gerekir.
  useEffect(() => {
    if (!remindOn) return;
    const tick = () => {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      for (const o of occurrencesForDay(now)) {
        if (o.status !== "PLANNED") continue;
        const [h, m] = o.startTime.split(":").map(Number);
        const diff = h * 60 + m - nowMin;
        const tag = `${o.sessionId}-${o.occDate}`;
        if (diff >= 0 && diff <= 15 && !notifiedRef.current.has(tag)) {
          notifiedRef.current.add(tag);
          try {
            new Notification("Yaklaşan seans", { body: `${o.startTime} · ${o.title}` });
          } catch {
            /* yoksay */
          }
        }
      }
    };
    tick();
    const iv = setInterval(tick, 60000);
    return () => clearInterval(iv);
  }, [remindOn, occurrencesForDay]);

  async function enableReminders() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Tarayıcınız bildirimi desteklemiyor.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setRemindOn(true);
      toast.success("Hatırlatmalar açık (bu sekme açıkken).");
    } else {
      toast.error("Bildirim izni verilmedi.");
    }
  }

  function shift(dir: -1 | 1) {
    setCursor((c) =>
      view === "week" ? addDays(c, dir * 7) : new Date(c.getFullYear(), c.getMonth() + dir, 1),
    );
  }
  function goToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCursor(d);
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

  const payload = (over?: Partial<FormState>) => {
    const f = { ...form, ...over };
    return {
      caseId: f.caseId || null,
      title: f.title.trim(),
      date: f.date,
      startTime: f.startTime,
      endTime: f.endTime,
      status: f.status,
      note: f.note.trim() || undefined,
      isRecurring: f.isRecurring,
      recurringDay: f.isRecurring ? Number(f.recurringDay) : null,
    };
  };

  async function save() {
    if (!form.title.trim()) {
      setErr("Başlık gerekli.");
      return;
    }
    setSaving(true);
    setErr(null);
    let url = "/atolye/api/sessions";
    let method: "POST" | "PATCH" = "POST";
    if (editCtx) {
      method = "PATCH";
      url =
        editCtx.recurring && scope === "this"
          ? `/atolye/api/sessions/${editCtx.sessionId}?scope=this&date=${editCtx.occDate}`
          : `/atolye/api/sessions/${editCtx.sessionId}`;
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
      ? `/atolye/api/sessions/${editCtx.sessionId}?scope=this&date=${editCtx.occDate}`
      : `/atolye/api/sessions/${editCtx.sessionId}`;
    const res = await fetch(url, { method: "DELETE" });
    if (res.ok) {
      setOpen(false);
      toast.success(thisOnly ? "Seans iptal edildi" : "Seans silindi");
      void load();
    } else {
      toast.error("İşlem başarısız");
    }
  }

  // Sürükle-bırak: yalnız tek-seferlik seans başka güne taşınır (tekrar edenler hariç)
  async function dropOnDay(date: Date) {
    if (!dragId) return;
    const o = occAll.find((x) => x.sessionId === dragId && !x.recurring);
    setDragId(null);
    if (!o) return;
    const newDate = fmt(date);
    if (o.occDate === newDate) return;
    const res = await fetch(`/atolye/api/sessions/${o.sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId: o.caseId,
        title: o.title,
        date: newDate,
        startTime: o.startTime,
        endTime: o.endTime,
        status: o.status,
        note: o.note ?? undefined,
        isRecurring: false,
        recurringDay: null,
      }),
    });
    if (res.ok) {
      toast.success("Seans taşındı");
      void load();
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(d.error ?? "Taşınamadı");
    }
  }

  const occAll = useMemo(() => gridDays.flatMap((d) => occurrencesForDay(d)), [gridDays, occurrencesForDay]);

  const todayKey = fmt(new Date());
  const periodLabel =
    view === "week"
      ? `${fmt(weekStart)} – ${fmt(addDays(weekStart, 6))}`
      : monthStart.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  function OccCard({ o, compact }: { o: Occ; compact?: boolean }) {
    const tone = STATUS_TONE[o.status] ?? "var(--poster-ink)";
    return (
      <button
        type="button"
        draggable={!o.recurring}
        onDragStart={() => setDragId(o.sessionId)}
        onDragEnd={() => setDragId(null)}
        onClick={(e) => {
          e.stopPropagation();
          openEdit(o);
        }}
        title={`${o.startTime}–${o.endTime} ${o.title}`}
        style={{
          textAlign: "left",
          border: `2px solid ${tone}`,
          borderRadius: "var(--poster-radius-sm)",
          background: `color-mix(in srgb, ${tone} 14%, transparent)`,
          padding: compact ? "0.15rem 0.3rem" : "0.35rem 0.45rem",
          cursor: o.recurring ? "pointer" : "grab",
          fontFamily: "inherit",
          display: "flex",
          flexDirection: "column",
          gap: "0.1rem",
          opacity: o.status === "CANCELLED" ? 0.6 : 1,
          width: "100%",
        }}
      >
        <span style={{ fontSize: compact ? "0.62rem" : "0.72rem", fontWeight: 700 }}>
          {o.startTime}
          {compact ? "" : `–${o.endTime}`}
        </span>
        <span
          style={{
            fontSize: compact ? "0.66rem" : "0.78rem",
            fontWeight: 700,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {o.title}
        </span>
        {!compact && o.caseCode && (
          <span style={{ fontSize: "0.68rem", color: "var(--poster-ink-3)" }}>{o.caseCode}</span>
        )}
        {!compact && o.recurring && (
          <span style={{ fontSize: "0.62rem", color: "var(--poster-ink-3)" }}>↻ haftalık</span>
        )}
      </button>
    );
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
          marginBottom: "0.75rem",
        }}
      >
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: 0 }}>Takvim</h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", border: "var(--poster-border)", borderRadius: "var(--poster-radius-pill)", overflow: "hidden" }}>
            {(["week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                style={{
                  padding: "0.35rem 0.8rem",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  fontFamily: "inherit",
                  background: view === v ? "var(--poster-accent)" : "transparent",
                  color: view === v ? "#fff" : "var(--poster-ink)",
                }}
              >
                {v === "week" ? "Hafta" : "Ay"}
              </button>
            ))}
          </div>
          <PButton size="sm" variant="ghost" onClick={() => shift(-1)} aria-label="Önceki">
            <ChevronLeft size={16} aria-hidden />
          </PButton>
          <PButton size="sm" variant="ghost" onClick={goToday}>
            Bugün
          </PButton>
          <PButton size="sm" variant="ghost" onClick={() => shift(1)} aria-label="Sonraki">
            <ChevronRight size={16} aria-hidden />
          </PButton>
          {!remindOn && (
            <PButton size="sm" variant="ghost" onClick={enableReminders} aria-label="Hatırlatmaları aç">
              <Bell size={15} aria-hidden /> Hatırlat
            </PButton>
          )}
          <PButton size="sm" onClick={() => openCreate()}>
            <Plus size={16} aria-hidden /> Yeni seans
          </PButton>
        </div>
      </header>

      <p style={{ color: "var(--poster-ink-3)", fontSize: "0.85rem", margin: "0 0 1rem", textTransform: "capitalize" }}>
        {periodLabel}
        {loading && (
          <span style={{ marginLeft: "0.5rem" }}>
            <PSpinner />
          </span>
        )}
      </p>

      {!loading && occAll.length === 0 && (
        <p style={{ color: "var(--poster-ink-3)", fontSize: "0.9rem", margin: "-0.25rem 0 0.85rem" }}>
          Bu {view === "week" ? "hafta" : "ay"} planlı seans yok — bir güne tıklayıp ekleyin.
        </p>
      )}

      {view === "week" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "0.5rem", overflowX: "auto" }}>
          {gridDays.map((date, i) => {
            const items = occurrencesForDay(date);
            const isToday = fmt(date) === todayKey;
            return (
              <div
                key={i}
                onClick={() => openCreate(date)}
                onDragOver={(e) => dragId && e.preventDefault()}
                onDrop={() => dropOnDay(date)}
                title="Seans eklemek için tıkla"
                style={{
                  border: isToday ? "2px solid var(--poster-accent)" : "var(--poster-border)",
                  borderRadius: "var(--poster-radius-md)",
                  background: isToday ? "var(--poster-accent-soft)" : "var(--poster-panel)",
                  minHeight: "clamp(320px, 58vh, 560px)",
                  minWidth: 120,
                  padding: "0.6rem 0.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, marginBottom: "0.1rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.85rem" }}>{DAY_NAMES[i]}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--poster-ink-3)" }}>
                    {date.getDate()}.{pad(date.getMonth() + 1)}
                  </span>
                </div>
                {items.map((o) => (
                  <OccCard key={`${o.sessionId}-${o.occDate}`} o={o} />
                ))}
                {items.length === 0 && (
                  <span style={{ marginTop: "auto", textAlign: "center", color: "var(--poster-ink-3)", opacity: 0.55, fontSize: "0.75rem", paddingBottom: "0.4rem" }}>
                    + ekle
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "0.3rem", minWidth: 720 }}>
            {DAY_NAMES.map((d) => (
              <div key={d} style={{ textAlign: "center", fontWeight: 800, fontSize: "0.75rem", color: "var(--poster-ink-3)", padding: "0.2rem 0" }}>
                {d}
              </div>
            ))}
            {gridDays.map((date, i) => {
              const items = occurrencesForDay(date);
              const inMonth = date.getMonth() === monthStart.getMonth();
              return (
                <div
                  key={i}
                  onClick={() => openCreate(date)}
                  onDragOver={(e) => dragId && e.preventDefault()}
                  onDrop={() => dropOnDay(date)}
                  style={{
                    border: "var(--poster-border)",
                    borderRadius: "var(--poster-radius-sm)",
                    background: fmt(date) === todayKey ? "var(--poster-accent-soft)" : "var(--poster-panel)",
                    opacity: inMonth ? 1 : 0.45,
                    minHeight: 96,
                    padding: "0.3rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.2rem",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--poster-ink-3)" }}>
                    {date.getDate()}
                  </span>
                  {items.slice(0, 3).map((o) => (
                    <OccCard key={`${o.sessionId}-${o.occDate}`} o={o} compact />
                  ))}
                  {items.length > 3 && (
                    <span style={{ fontSize: "0.65rem", color: "var(--poster-ink-3)" }}>+{items.length - 3} daha</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PModal open={open} onClose={() => setOpen(false)} title={editCtx ? "Seansı düzenle" : "Yeni seans"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {editCtx?.recurring && (
            <div style={{ display: "flex", gap: "0.4rem", padding: "0.5rem", border: "var(--poster-border)", borderRadius: "var(--poster-radius-md)", background: "var(--poster-panel)" }}>
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
            <PInput id="s-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Okuma seansı" />
          </PField>
          <PField label="Öğrenci" hint="opsiyonel" htmlFor="s-case">
            <PSelect id="s-case" value={form.caseId} onChange={(e) => setForm((f) => ({ ...f, caseId: e.target.value }))}>
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
          {(!editCtx || scope === "all") && (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
                <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))} />
                Her hafta tekrar et
              </label>
              {form.isRecurring && (
                <PField label="Tekrar günü" htmlFor="s-rday">
                  <PSelect id="s-rday" value={String(form.recurringDay)} onChange={(e) => setForm((f) => ({ ...f, recurringDay: Number(e.target.value) }))}>
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
