"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { WORK_AREA_LABEL, getCategoryBadge } from "@/lib/constants";
import { PBtn, PBadge, PModal, PSkeleton } from "@/components/poster";

interface StudentOption {
  id: string;
  name: string;
  workArea: string;
}

interface Props {
  cardId: string;
  cardTitle: string;
  onClose: () => void;
  onSaved?: (assignedCount: number) => void;
}

export function AssignStudentsModal({ cardId, cardTitle, onClose, onSaved }: Props) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [studentsRes, assignmentsRes] = await Promise.all([
          fetch("/api/students"),
          fetch(`/api/cards/${cardId}/assignments`),
        ]);
        if (!studentsRes.ok) throw new Error("Öğrenciler yüklenemedi");
        if (!assignmentsRes.ok) throw new Error("Atamalar yüklenemedi");
        const studentsData = await studentsRes.json();
        const assignmentsData = await assignmentsRes.json();

        setStudents(
          (studentsData.students ?? []).map((s: StudentOption) => ({
            id: s.id,
            name: s.name,
            workArea: s.workArea,
          }))
        );
        setSelected(new Set(assignmentsData.assignedStudentIds ?? []));
      } catch {
        toast.error("Veriler yüklenemedi");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [cardId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/cards/${cardId}/assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hata oluştu");
      toast.success(`${data.assignedCount} öğrenciye atandı`);
      onSaved?.(data.assignedCount);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PModal
      open
      onClose={onClose}
      title={
        <div>
          <div>Öğrenciye Ata</div>
          <p
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--poster-ink-3)",
              margin: "2px 0 0",
              maxWidth: 320,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {cardTitle}
          </p>
        </div>
      }
      width={460}
      persistent={saving}
      footer={
        <>
          <span style={{ fontSize: 12, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)", marginRight: "auto" }}>
            {selected.size} öğrenci seçildi
          </span>
          <PBtn type="button" variant="white" size="sm" onClick={onClose} disabled={saving}>
            İptal
          </PBtn>
          <PBtn type="button" variant="accent" size="sm" onClick={handleSave} disabled={saving || loading}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </PBtn>
        </>
      }
    >
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
          <PSkeleton height={56} radius={12} />
          <PSkeleton height={56} radius={12} />
          <PSkeleton height={56} radius={12} />
        </div>
      ) : students.length === 0 ? (
        <p
          style={{
            fontSize: 14,
            color: "var(--poster-ink-3)",
            textAlign: "center",
            padding: "48px 0",
            margin: 0,
            fontFamily: "var(--font-display)",
          }}
        >
          Henüz öğrenci eklenmedi
        </p>
      ) : (
        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 0,
            margin: 0,
            listStyle: "none",
          }}
        >
          {students.map((s) => {
            const checked = selected.has(s.id);
            return (
              <li key={s.id}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    cursor: "pointer",
                    background: checked ? "var(--poster-bg-2)" : "var(--poster-panel)",
                    border: "2px solid var(--poster-ink)",
                    borderRadius: 12,
                    boxShadow: checked ? "0 3px 0 var(--poster-accent)" : "var(--poster-shadow-sm)",
                    fontFamily: "var(--font-display)",
                    transition: "background .12s, box-shadow .12s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(s.id)}
                    style={{
                      width: 18,
                      height: 18,
                      accentColor: "var(--poster-accent)",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "var(--poster-ink)" }}>
                    {s.name}
                  </span>
                  <PBadge color={getCategoryBadge(s.workArea)}>
                    {WORK_AREA_LABEL[s.workArea] ?? s.workArea}
                  </PBadge>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </PModal>
  );
}
