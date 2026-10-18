"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { PBtn, PCard, PBadge, PModal, PTextarea, PSpinner, PAlert } from "@studio/components/poster";
import type { BadgeColor } from "@studio/components/poster";
import { fetchGeneration } from "@/lib/fetchGeneration";
import { encodePrefill } from "@studio/lib/prefill";
import { applyProfileNote } from "@studio/lib/assistant/applyProfileNote";
import { ASSISTANT_TOOL_LABEL, type AssistantTool } from "@studio/lib/toolSchemas";
import type { Suggestion } from "@studio/lib/assistant/schema";
import { formatDate } from "@studio/lib/utils";

interface Observation { id: string; text: string; createdAt: string; updatedAt: string }
interface GoalLite { id: string; code: string; title: string }

interface Props {
  studentId: string;
  aiProfile: string | null;
  /** Müfredat hedefleri (kod/başlık için); sayfa zaten yüklüyor. */
  goals: GoalLite[];
  /** Profil maddesi uygulanınca sayfadaki öğrenci nesnesi güncellenir. */
  onProfileChange: (aiProfile: string) => void;
}

const TUR: Record<Suggestion["kind"], { label: string; color: BadgeColor }> = {
  goal_status:   { label: "Hedef",    color: "green" },
  profile_note:  { label: "Profil",   color: "blue" },
  generate_tool: { label: "Materyal", color: "accent" },
};

const DURUM_ETIKET: Record<string, string> = { in_progress: "Devam ediyor", completed: "Tamamlandı" };

export function AssistantTab({ studentId, aiProfile, goals, onProfileChange }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [locked, setLocked] = useState(false);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [lastObservationId, setLastObservationId] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [deleting, setDeleting] = useState<Observation | null>(null);

  useEffect(() => {
    fetch(`/studio/api/students/${studentId}/observations`)
      .then((r) => r.json())
      .then((d) => { setObservations(d.observations ?? []); setLocked(Boolean(d.locked)); })
      .catch(() => toast.error("Gözlemler yüklenemedi"))
      .finally(() => setLoading(false));
  }, [studentId]);

  async function send(observationId?: string) {
    if (!observationId && !text.trim()) return;
    setSending(true);
    setWarning(null);
    if (!observationId) { setSuggestions([]); setApplied(new Set()); }
    try {
      const res = await fetchGeneration(`/studio/api/students/${studentId}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(observationId ? { observationId } : { text }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Bir hata oluştu"); return; }
      if (!observationId) {
        setObservations((prev) => [data.observation, ...prev]);
        setText("");
      }
      setLastObservationId(data.observation.id);
      setSuggestions(data.suggestions ?? []);
      setApplied(new Set());
      setWarning(data.warning ?? null);
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setSending(false);
    }
  }

  async function apply(i: number, s: Suggestion) {
    try {
      if (s.kind === "goal_status") {
        const res = await fetch(`/studio/api/students/${studentId}/progress`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates: [{ goalId: s.goalId, status: s.status }] }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Hedef durumu güncellendi");
      } else if (s.kind === "profile_note") {
        if (!aiProfile) { toast.error("Önce eğitim profili üretin"); return; }
        const yeni = applyProfileNote(aiProfile, s.section, s.text);
        if (!yeni) { toast.error(`Profilde "${s.section}" bölümü bulunamadı`); return; }
        const res = await fetch(`/studio/api/students/${studentId}/ai-profile`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aiProfile: yeni }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        onProfileChange(yeni);
        toast.success("Profile eklendi");
      } else {
        const q = new URLSearchParams({ studentId, prefill: encodePrefill(s.params) });
        router.push(`/studio/tools/${s.tool}?${q.toString()}`);
        return;
      }
      setApplied((prev) => new Set(prev).add(i));
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Uygulanamadı");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const res = await fetch(`/studio/api/observations/${editing.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editing.text }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Kaydedilemedi"); return; }
    setObservations((prev) => prev.map((o) => (o.id === editing.id ? data.observation : o)));
    setEditing(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    const res = await fetch(`/studio/api/observations/${deleting.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Silinemedi"); return; }
    setObservations((prev) => prev.filter((o) => o.id !== deleting.id));
    setDeleting(null);
  }

  const goalLabel = (id: string) => { const g = goals.find((x) => x.id === id); return g ? `${g.code} ${g.title}` : id; };

  function title(s: Suggestion): string {
    if (s.kind === "goal_status") return `${goalLabel(s.goalId)} → ${DURUM_ETIKET[s.status] ?? s.status}`;
    if (s.kind === "profile_note") return `${s.section}: ${s.text}`;
    return `${ASSISTANT_TOOL_LABEL[s.tool as AssistantTool]} üret`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {locked ? (
        <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Lock style={{ width: 18, height: 18, flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 800, margin: "0 0 4px" }}>Öğrenci asistanı ücretli planlarda</p>
              <p style={{ fontSize: 13, margin: "0 0 10px", color: "var(--poster-ink-2)" }}>
                Seans sonrası gözleminizi yazın; asistan hedef, profil ve materyal önerileri çıkarsın. Kredi düşmez.
              </p>
              <PBtn as="a" href="/studio/subscription" variant="accent" size="sm">Planları gör</PBtn>
            </div>
          </div>
        </PCard>
      ) : (
        <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>Bugün ne gözlemlediniz?</h2>
          <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: "0 0 10px" }}>
            Gözlem günlüğe kaydedilir; asistan hedef, profil ve materyal önerir. Başka çocukların ya da velilerin adını yazmayın.
          </p>
          <PTextarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={1000} placeholder="Örn. Kelime başı /r/ sesinde 10 denemede 6 doğru; oyun içinde daha istekli." disabled={sending} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "var(--poster-ink-3)" }}>{text.length}/1000</span>
            <PBtn as="button" variant="accent" size="sm" onClick={() => send()} disabled={sending || !text.trim()}>Gönder</PBtn>
          </div>
          {sending && <div style={{ marginTop: 12 }}><PSpinner size={22} label="Gözlem kaydedildi, öneriler hazırlanıyor…" style={{ display: "flex" }} /></div>}
          {warning && !sending && (
            <div style={{ marginTop: 12 }}>
              <PAlert tone="warning">
                {warning}. {lastObservationId && <button type="button" onClick={() => send(lastObservationId)} style={{ background: "none", border: "none", textDecoration: "underline", cursor: "pointer", fontWeight: 800 }}>Tekrar dene</button>}
              </PAlert>
            </div>
          )}
          {!sending && suggestions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              {suggestions.map((s, i) => {
                const done = applied.has(i);
                return (
                  <PCard key={i} rounded={14} style={{ padding: 14, opacity: done ? 0.7 : 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <PBadge color={TUR[s.kind].color}>{TUR[s.kind].label}</PBadge>
                      <span style={{ fontWeight: 800, fontSize: 13 }}>{title(s)}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--poster-ink-2)", margin: "0 0 10px" }}>{s.reason}</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      {done ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 800, color: "var(--poster-green)" }}><Check style={{ width: 14, height: 14 }} /> Uygulandı</span>
                      ) : (
                        <>
                          <PBtn as="button" variant="accent" size="sm" onClick={() => apply(i, s)}>{s.kind === "generate_tool" ? "Formu aç" : "Uygula"}</PBtn>
                          <PBtn as="button" variant="white" size="sm" onClick={() => setSuggestions((prev) => prev.filter((_, j) => j !== i))}>Geç</PBtn>
                        </>
                      )}
                    </div>
                  </PCard>
                );
              })}
            </div>
          )}
          {!sending && !aiProfile && suggestions.length === 0 && lastObservationId && (
            <div style={{ marginTop: 12 }}><PAlert tone="info">Profil önerileri için önce <b>Eğitim Profili</b> sekmesinden profil üretin.</PAlert></div>
          )}
        </PCard>
      )}

      <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 12px" }}>Gözlem günlüğü</h2>
        {loading ? <PSpinner size={22} /> : observations.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--poster-ink-3)", margin: 0 }}>Henüz gözlem yok.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {observations.map((o) => (
              <div key={o.id} style={{ padding: 12, border: "2px solid var(--poster-ink-faint)", borderRadius: 12, background: "var(--poster-bg-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-ink-3)" }}>{formatDate(new Date(o.createdAt))}</span>
                  <span style={{ display: "flex", gap: 6 }}>
                    <button type="button" aria-label="Düzenle" onClick={() => setEditing({ id: o.id, text: o.text })} style={{ background: "none", border: "none", cursor: "pointer" }}><Pencil style={{ width: 14, height: 14 }} /></button>
                    <button type="button" aria-label="Sil" onClick={() => setDeleting(o)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 style={{ width: 14, height: 14 }} /></button>
                  </span>
                </div>
                {editing?.id === o.id ? (
                  <div>
                    <PTextarea value={editing.text} onChange={(e) => setEditing({ id: o.id, text: e.target.value })} rows={3} maxLength={1000} />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <PBtn as="button" variant="accent" size="sm" onClick={saveEdit}>Kaydet</PBtn>
                      <PBtn as="button" variant="white" size="sm" onClick={() => setEditing(null)}>İptal</PBtn>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, margin: 0, whiteSpace: "pre-wrap" }}>{o.text}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </PCard>

      {deleting && (
        <PModal open onClose={() => setDeleting(null)} title="Gözlemi sil">
          <p style={{ fontSize: 13 }}>Bu gözlem silinecek. Devam edilsin mi?</p>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <PBtn as="button" variant="accent" size="sm" onClick={confirmDelete}>Sil</PBtn>
            <PBtn as="button" variant="white" size="sm" onClick={() => setDeleting(null)}>Vazgeç</PBtn>
          </div>
        </PModal>
      )}
    </div>
  );
}
