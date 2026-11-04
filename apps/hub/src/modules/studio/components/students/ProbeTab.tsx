// apps/hub/src/modules/studio/components/students/ProbeTab.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PBtn, PCard, PBadge, PModal, PSpinner, PEmptyState, PSelect, PLabel } from "@studio/components/poster";
import { formatDate } from "@studio/lib/utils";
import { gunAy } from "@studio/lib/probe/contextLine";
import { POSITION_LABEL, PROBE_COUNT, PROBE_POSITIONS, PROBE_SOUNDS, type ProbePosition, type ProbeSeriesDto, type RunItem } from "@studio/lib/probe/schema";
import { ProbeChart } from "./ProbeChart";
import { ProbeRunner } from "./ProbeRunner";

/* Ölçüm sekmesi (spec §7): seriler (aktif önce), grafik, son koşular, "Prob başlat", "Seti yenile", koşu sil. */
interface Props { studentId: string }

export function ProbeTab({ studentId }: Props) {
  const [series, setSeries] = useState<ProbeSeriesDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ sound: string; position: ProbePosition; count: number }>({ sound: "/r/", position: "initial", count: PROBE_COUNT.default });
  const [running, setRunning] = useState<ProbeSeriesDto | null>(null);
  const [renewing, setRenewing] = useState<ProbeSeriesDto | null>(null);
  const [deleting, setDeleting] = useState<{ seriesId: string; runId: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const base = `/studio/api/students/${studentId}/probes`;

  const rootRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef<ProbeSeriesDto | null>(null);
  runningRef.current = running;

  const load = useCallback(async () => {
    try {
      const r = await fetch(base);
      if (!r.ok) throw new Error();
      setSeries(((await r.json()).series ?? []) as ProbeSeriesDto[]);
    } catch { toast.error("Ölçümler yüklenemedi"); } finally { setLoading(false); }
  }, [base]);

  useEffect(() => { void load(); }, [load]);

  /* Sayaç kapanınca odak, onu açan "Prob başlat" düğmesine döner. */
  const closeRunner = useCallback(() => {
    const id = runningRef.current?.id;
    setRunning(null);
    if (!id) return;
    requestAnimationFrame(() => {
      rootRef.current?.querySelector<HTMLButtonElement>(`[data-probe-start="${id}"] button`)?.focus();
    });
  }, []);

  async function createSeries(sound: string, position: ProbePosition, count: number) {
    setCreating(true);
    try {
      const r = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sound, position, count }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(d.error ?? "Seri açılamadı");
        if (r.status === 409) { setShowForm(false); setRenewing(null); await load(); }
        return null;
      }
      await load();
      setShowForm(false);
      setRenewing(null);
      return d.series as ProbeSeriesDto;
    } catch {
      toast.error("Seri açılamadı");
      return null;
    } finally { setCreating(false); }
  }

  const saveRun = useCallback(async (items: RunItem[], note: string) => {
    const s = runningRef.current;
    if (!s) return;
    try {
      const r = await fetch(`${base}/${s.id}/runs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, note: note || undefined }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error ?? "Kaydedilemedi"); return; }
      toast.success(`Kaydedildi: %${d.run.pct}`);
      closeRunner();
      await load();
    } catch {
      toast.error("Kaydedilemedi");
    }
  }, [base, closeRunner, load]);

  async function deleteRun() {
    if (!deleting) return;
    try {
      const r = await fetch(`${base}/runs/${deleting.runId}`, { method: "DELETE" });
      if (!r.ok) toast.error("Silinemedi"); else await load();
    } catch { toast.error("Silinemedi"); }
    setDeleting(null);
  }

  if (loading) return <PSpinner fullPanel label="Yükleniyor…" style={{ minHeight: 240 }} />;

  const aktif = series.filter((s) => s.active);
  const eski = series.filter((s) => !s.active);

  const Form = (
    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr", alignItems: "end" }}>
      <div>
        <PLabel htmlFor="probe-sound">Ses</PLabel>
        <PSelect id="probe-sound" value={form.sound} onChange={(e) => setForm({ ...form, sound: e.target.value })}>
          {PROBE_SOUNDS.map((s) => <option key={s} value={s}>{s}</option>)}
        </PSelect>
      </div>
      <div>
        <PLabel htmlFor="probe-position">Pozisyon</PLabel>
        <PSelect id="probe-position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value as ProbePosition })}>
          {PROBE_POSITIONS.map((p) => <option key={p} value={p}>{POSITION_LABEL[p]}</option>)}
        </PSelect>
      </div>
      <div>
        <PLabel htmlFor="probe-count">Kelime sayısı</PLabel>
        <PSelect id="probe-count" value={String(form.count)} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}>
          {Array.from({ length: PROBE_COUNT.max - PROBE_COUNT.min + 1 }, (_, i) => PROBE_COUNT.min + i).map((n) => <option key={n} value={n}>{n}</option>)}
        </PSelect>
      </div>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
        <PBtn as="button" variant="accent" size="sm" onClick={() => void createSeries(form.sound, form.position, form.count)} disabled={creating}>Seriyi aç</PBtn>
        <PBtn as="button" variant="white" size="sm" onClick={() => setShowForm(false)} disabled={creating}>Vazgeç</PBtn>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} style={{ display: "grid", gap: 14 }}>
      <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Ölçüm</h2>
            <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: "2px 0 0" }}>Bankadan sabit kelime setiyle seans içi prob · hak düşmez</p>
          </div>
          {!showForm && <PBtn as="button" variant="accent" size="sm" onClick={() => setShowForm(true)}><Plus size={14} aria-hidden /> Yeni seri</PBtn>}
        </div>
        {showForm && <div style={{ marginTop: 14 }}>{Form}</div>}
      </PCard>

      {aktif.length === 0 && !showForm && (
        <PEmptyState title="Henüz ölçüm yok" subtitle="İlk seriyi açıp probu başlatın; sonuçlar burada seri hâlinde grafiğe dönüşür." size="compact" />
      )}

      {[...aktif, ...eski].map((s) => (
        <PCard key={s.id} rounded={18} style={{ padding: 18, background: "var(--poster-panel)", opacity: s.active ? 1 : 0.75 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ fontFamily: "var(--font-display)" }}>{s.sound} · {POSITION_LABEL[s.position]} · {s.words.length} kelime</strong>
              {!s.active && <PBadge color="soft">önceki set</PBadge>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span data-probe-start={s.id}><PBtn as="button" variant="accent" size="sm" onClick={() => setRunning(s)}><Play size={14} aria-hidden /> Prob başlat</PBtn></span>
              {s.active && <PBtn as="button" variant="white" size="sm" onClick={() => setRenewing(s)}><RefreshCw size={14} aria-hidden /> Seti yenile</PBtn>}
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: "6px 0 10px" }}>{s.words.map((w) => w.word).join(" · ")}</p>
          {s.runs.length > 0 ? (
            <>
              <ProbeChart runs={s.runs.map((r) => ({ pct: r.pct, label: gunAy(r.date) }))} ariaLabel={`${s.sound} ${POSITION_LABEL[s.position]} ölçüm grafiği`} />
              <table style={{ width: "100%", fontSize: 12, marginTop: 8, borderCollapse: "collapse" }}>
                <thead><tr style={{ textAlign: "left", color: "var(--poster-ink-3)" }}><th>Tarih</th><th>Bağımsız</th><th>İpuçlu</th><th>Not</th><th aria-label="İşlem" /></tr></thead>
                <tbody>
                  {[...s.runs].reverse().map((r) => (
                    <tr key={r.id} style={{ borderTop: "1px solid var(--poster-ink-faint)" }}>
                      <td style={{ padding: "6px 4px" }}>{formatDate(r.date, "short")}</td>
                      <td style={{ padding: "6px 4px", fontWeight: 800 }}>%{r.pct} ({r.correct}/{r.total})</td>
                      <td style={{ padding: "6px 4px" }}>{r.cuedCount}</td>
                      <td style={{ padding: "6px 4px" }}>{r.note ?? ""}</td>
                      <td style={{ padding: "6px 4px", textAlign: "right" }}>
                        <button type="button" onClick={() => setDeleting({ seriesId: s.id, runId: r.id })} aria-label="Ölçümü sil" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--poster-ink-3)" }}><Trash2 size={15} aria-hidden /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: 0 }}>Bu seride henüz ölçüm yok.</p>
          )}
        </PCard>
      ))}

      {running && (
        <ProbeRunner sound={running.sound} position={running.position} words={running.words} onCancel={closeRunner} onSave={saveRun} />
      )}

      {renewing && (
        <PModal open onClose={() => setRenewing(null)} title="Seti yenile">
          <p style={{ fontSize: 13, margin: "0 0 12px" }}>Yeni set yeni bir seri açar; eski grafik "önceki setler" altında kalır. Devam edilsin mi?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <PBtn as="button" variant="accent" size="sm" onClick={() => void createSeries(renewing.sound, renewing.position, renewing.words.length)} disabled={creating}>Yenile</PBtn>
            <PBtn as="button" variant="white" size="sm" onClick={() => setRenewing(null)} disabled={creating}>Vazgeç</PBtn>
          </div>
        </PModal>
      )}

      {deleting && (
        <PModal open onClose={() => setDeleting(null)} title="Ölçümü sil">
          <p style={{ fontSize: 13, margin: "0 0 12px" }}>Bu ölçüm silinecek. Devam edilsin mi?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <PBtn as="button" variant="accent" size="sm" onClick={() => void deleteRun()}>Sil</PBtn>
            <PBtn as="button" variant="white" size="sm" onClick={() => setDeleting(null)}>Vazgeç</PBtn>
          </div>
        </PModal>
      )}
    </div>
  );
}
