"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { AREA_LABELS } from "@/lib/constants";
import { PBtn, PSelect, PTextarea, PSpinner, PEmptyState } from "@/components/poster";

interface CurriculumGoal {
  id: string;
  code: string;
  title: string;
  isMainGoal: boolean;
}

interface Curriculum {
  id: string;
  code: string;
  area: string;
  title: string;
  goals: CurriculumGoal[];
}

type GoalProgress = { status: string; notes: string };
type ProgressMap = Record<string, GoalProgress>;

const STATUS_OPTIONS = [
  {
    value: "not_started",
    label: "Başlanmadı",
    icon: "⚪",
    activeBg: "var(--poster-bg-2)",
    activeColor: "var(--poster-ink)",
  },
  {
    value: "in_progress",
    label: "Devam Ediyor",
    icon: "🔵",
    activeBg: "var(--poster-accent)",
    activeColor: "#fff",
  },
  {
    value: "completed",
    label: "Tamamlandı",
    icon: "✅",
    activeBg: "var(--poster-green)",
    activeColor: "#fff",
  },
] as const;

function GoalStatusButtons({
  goalId,
  status,
  onSet,
}: {
  goalId: string;
  status: string;
  onSet: (goalId: string, status: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
      {STATUS_OPTIONS.map((opt) => {
        const active = status === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSet(goalId, opt.value)}
            title={opt.label}
            aria-pressed={active}
            style={{
              padding: "4px 8px",
              borderRadius: 8,
              border: "2px solid var(--poster-ink)",
              background: active ? opt.activeBg : "var(--poster-panel)",
              color: active ? opt.activeColor : "var(--poster-ink-3)",
              boxShadow: active ? "0 2px 0 var(--poster-ink)" : "none",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              transition: "background .12s, color .12s, box-shadow .12s",
              opacity: active ? 1 : 0.55,
            }}
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
  );
}

export function ProgressTab({
  studentId,
  curriculumIds,
  onEditClick,
}: {
  studentId: string;
  curriculumIds: string[];
  onEditClick?: () => void;
}) {
  const [allCurricula, setAllCurricula] = useState<Curriculum[]>([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState("");

  const [localProgress, setLocalProgress] = useState<ProgressMap>({});
  const [savedProgress, setSavedProgress] = useState<ProgressMap>({});

  const [openMainGoals, setOpenMainGoals] = useState<Set<string>>(new Set());
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const curricula = useMemo(
    () => allCurricula.filter((c) => curriculumIds.includes(c.id)),
    [allCurricula, curriculumIds]
  );

  useEffect(() => {
    if (curricula.length > 0 && !curricula.find((c) => c.id === selectedCurriculumId)) {
      setSelectedCurriculumId(curricula[0].id);
    } else if (curricula.length === 0) {
      setSelectedCurriculumId("");
    }
  }, [curricula]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    Promise.all([
      fetch("/api/curriculum").then((r) => r.json()),
      fetch(`/api/students/${studentId}/progress`).then((r) => r.json()),
    ])
      .then(([cData, pData]) => {
        setAllCurricula(cData.curricula ?? []);
        const progressList: { goalId: string; status: string; notes: string | null }[] =
          pData.progress ?? [];
        const map: ProgressMap = {};
        for (const p of progressList) {
          map[p.goalId] = { status: p.status, notes: p.notes ?? "" };
        }
        setLocalProgress(map);
        setSavedProgress(map);
      })
      .catch(() => toast.error("Veriler yüklenemedi"))
      .finally(() => setLoading(false));
  }, [studentId]);

  const selectedCurriculum = curricula.find((c) => c.id === selectedCurriculumId);
  const mainGoals = selectedCurriculum?.goals.filter((g) => g.isMainGoal) ?? [];

  function getSubGoals(mainGoal: CurriculumGoal): CurriculumGoal[] {
    if (!selectedCurriculum) return [];
    const prefix = mainGoal.code.replace(".0", ".");
    return selectedCurriculum.goals.filter(
      (g) => !g.isMainGoal && g.code.startsWith(prefix)
    );
  }

  function setGoalStatus(goalId: string, status: string) {
    setLocalProgress((prev) => ({
      ...prev,
      [goalId]: { status, notes: prev[goalId]?.notes ?? "" },
    }));
  }

  function setGoalNotes(goalId: string, notes: string) {
    setLocalProgress((prev) => ({
      ...prev,
      [goalId]: { status: prev[goalId]?.status ?? "not_started", notes },
    }));
  }

  function toggleMainGoal(id: string) {
    setOpenMainGoals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleNote(goalId: string) {
    setOpenNotes((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) next.delete(goalId); else next.add(goalId);
      return next;
    });
  }

  const dirtyEntries = Object.entries(localProgress).filter(([id, v]) => {
    const saved = savedProgress[id];
    return !saved || saved.status !== v.status || saved.notes !== v.notes;
  });

  async function handleSave() {
    if (dirtyEntries.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/students/${studentId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: dirtyEntries.map(([goalId, v]) => ({
            goalId,
            status: v.status,
            notes: v.notes || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedProgress((prev) => {
        const next = { ...prev };
        for (const [id, v] of dirtyEntries) next[id] = { ...v };
        return next;
      });
      toast.success(`${data.saved} hedef güncellendi`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
        <PSpinner size={28} />
      </div>
    );
  }

  if (curriculumIds.length === 0) {
    return (
      <PEmptyState
        variant="dashed"
        icon="📋"
        title="Bu öğrenciye henüz modül atanmamış"
        subtitle="Öğrenci profilini düzenleyerek modül ekleyebilirsiniz."
        action={
          onEditClick ? (
            <PBtn type="button" variant="accent" size="sm" onClick={onEditClick}>
              Öğrenciyi Düzenle → Modül Ekle
            </PBtn>
          ) : undefined
        }
      />
    );
  }

  const curriculaByArea = curricula.reduce<Record<string, Curriculum[]>>((acc, c) => {
    if (!acc[c.area]) acc[c.area] = [];
    acc[c.area].push(c);
    return acc;
  }, {});

  const allGoals = selectedCurriculum?.goals ?? [];
  const completedCount = allGoals.filter((g) => localProgress[g.id]?.status === "completed").length;
  const inProgressCount = allGoals.filter((g) => localProgress[g.id]?.status === "in_progress").length;
  const totalCount = allGoals.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "var(--font-display)" }}>
      {curricula.length > 1 && (
        <PSelect
          value={selectedCurriculumId}
          onChange={(e) => setSelectedCurriculumId(e.target.value)}
        >
          {Object.entries(curriculaByArea).map(([area, list]) => (
            <optgroup key={area} label={AREA_LABELS[area] ?? area}>
              {list.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </optgroup>
          ))}
        </PSelect>
      )}

      {curricula.length === 1 && selectedCurriculum && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--poster-ink)", margin: 0 }}>
            {selectedCurriculum.title}
          </p>
          {onEditClick && (
            <button
              onClick={onEditClick}
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
              Modülü Değiştir
            </button>
          )}
        </div>
      )}

      {totalCount > 0 && (
        <div
          style={{
            padding: "12px 14px",
            background: "var(--poster-panel)",
            border: "2px solid var(--poster-ink)",
            borderRadius: 14,
            boxShadow: "var(--poster-shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "var(--poster-ink-2)" }}>
              <span style={{ fontWeight: 800, color: "var(--poster-green)" }}>{completedCount}</span>
              {" "}tamamlandı ·{" "}
              <span style={{ fontWeight: 800, color: "var(--poster-accent)" }}>{inProgressCount}</span>
              {" "}devam ediyor ·{" "}
              <span style={{ color: "var(--poster-ink-3)" }}>
                {totalCount - completedCount - inProgressCount} başlanmadı
              </span>
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--poster-ink)" }}>
              {Math.round((completedCount / totalCount) * 100)}%
            </span>
          </div>
          <div
            style={{
              height: 8,
              width: "100%",
              borderRadius: 999,
              border: "2px solid var(--poster-ink)",
              background: "var(--poster-ink-faint)",
              overflow: "hidden",
            }}
          >
            <div style={{ height: "100%", display: "flex" }}>
              <div
                style={{
                  background: "var(--poster-green)",
                  width: `${(completedCount / totalCount) * 100}%`,
                  transition: "width .3s cubic-bezier(.16,1,.3,1)",
                }}
              />
              <div
                style={{
                  background: "var(--poster-accent)",
                  width: `${(inProgressCount / totalCount) * 100}%`,
                  transition: "width .3s cubic-bezier(.16,1,.3,1)",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {selectedCurriculum && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {mainGoals.map((main) => {
            const subGoals = getSubGoals(main);
            const isOpen = openMainGoals.has(main.id);
            const subCompleted = subGoals.filter((s) => localProgress[s.id]?.status === "completed").length;
            const subInProgress = subGoals.filter((s) => localProgress[s.id]?.status === "in_progress").length;

            return (
              <div
                key={main.id}
                style={{
                  background: "var(--poster-panel)",
                  border: "2px solid var(--poster-ink)",
                  borderRadius: 14,
                  boxShadow: "var(--poster-shadow-sm)",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleMainGoal(main.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background: isOpen ? "var(--poster-bg-2)" : "var(--poster-panel)",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "var(--font-display)",
                    transition: "background .12s",
                  }}
                >
                  <span style={{ color: "var(--poster-ink-3)", flexShrink: 0, display: "inline-flex" }}>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "var(--poster-ink-3)",
                      flexShrink: 0,
                      width: 32,
                    }}
                  >
                    {main.code}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--poster-ink)",
                      lineHeight: 1.4,
                    }}
                  >
                    {main.title}
                  </span>
                  {subGoals.length > 0 && (
                    <span style={{ fontSize: 11, color: "var(--poster-ink-3)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                      {subCompleted}/{subGoals.length}
                      {subInProgress > 0 && (
                        <span style={{ marginLeft: 4, color: "var(--poster-accent)" }}>· {subInProgress} sürmekte</span>
                      )}
                    </span>
                  )}
                </button>

                {isOpen && subGoals.length > 0 && (
                  <div>
                    {subGoals.map((sub, i) => {
                      const currentStatus = localProgress[sub.id]?.status ?? "not_started";
                      const currentNotes = localProgress[sub.id]?.notes ?? "";
                      const noteOpen = openNotes.has(sub.id);
                      const hasNote = currentNotes.length > 0;

                      return (
                        <div
                          key={sub.id}
                          style={{
                            padding: "10px 14px",
                            borderTop: i === 0 ? "2px solid var(--poster-ink-faint)" : "1px dashed var(--poster-ink-faint)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--poster-ink-3)",
                                flexShrink: 0,
                                width: 32,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {sub.code}
                            </span>
                            <span style={{ flex: 1, fontSize: 13, color: "var(--poster-ink)", lineHeight: 1.4 }}>
                              {sub.title}
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => toggleNote(sub.id)}
                                title="Not ekle"
                                aria-pressed={noteOpen || hasNote}
                                style={{
                                  padding: 4,
                                  borderRadius: 6,
                                  border: "none",
                                  background: "transparent",
                                  color: noteOpen || hasNote ? "var(--poster-accent)" : "var(--poster-ink-3)",
                                  cursor: "pointer",
                                  opacity: noteOpen || hasNote ? 1 : 0.55,
                                  transition: "color .12s, opacity .12s",
                                }}
                              >
                                <FileText style={{ width: 14, height: 14 }} />
                              </button>
                              <GoalStatusButtons
                                goalId={sub.id}
                                status={currentStatus}
                                onSet={setGoalStatus}
                              />
                            </div>
                          </div>

                          {(noteOpen || hasNote) && (
                            <div style={{ marginTop: 8 }}>
                              <PTextarea
                                value={currentNotes}
                                onChange={(e) => setGoalNotes(sub.id, e.target.value)}
                                placeholder="Not ekle…"
                                rows={2}
                                style={{ fontSize: 13 }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {isOpen && subGoals.length === 0 && (
                  <p
                    style={{
                      padding: "12px 14px",
                      fontSize: 12,
                      color: "var(--poster-ink-3)",
                      borderTop: "2px solid var(--poster-ink-faint)",
                      margin: 0,
                    }}
                  >
                    Alt hedef bulunmuyor.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 4,
          paddingBottom: 12,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--poster-ink-3)" }}>
          {dirtyEntries.length > 0
            ? `${dirtyEntries.length} değişiklik kaydedilmedi`
            : "Tüm değişiklikler kaydedildi"}
        </span>
        <PBtn
          type="button"
          variant="accent"
          size="sm"
          onClick={handleSave}
          disabled={dirtyEntries.length === 0 || saving}
        >
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </PBtn>
      </div>
    </div>
  );
}
