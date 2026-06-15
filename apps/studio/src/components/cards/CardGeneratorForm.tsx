"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AREA_LABELS, WORK_AREA_FILTER, CATEGORY_META, DIFFICULTY_BADGE_COLOR } from "@/lib/constants";
import { PBtn, PLabel, PSelect, PTextarea, PAlert, PBadge } from "@/components/poster";
import type { GeneratedCard } from "@/lib/prompts";

const schema = z.object({
  category: z.enum(["speech", "language", "hearing"]),
  ageGroup: z.enum(["3-6", "7-12", "13-18", "adult"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  focusArea: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type AgeGroup = "3-6" | "7-12" | "13-18" | "adult";

function calcAgeGroup(birthDate: string): AgeGroup {
  const age = Math.floor(
    (Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );
  if (age < 7)  return "3-6";
  if (age < 13) return "7-12";
  if (age < 19) return "13-18";
  return "adult";
}

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

interface CardGeneratorFormProps {
  onCardGenerated: (card: GeneratedCard) => void;
  onLoading: (loading: boolean) => void;
  onCardIdGenerated?: (id: string) => void;
  studentId?: string;
  studentName?: string;
  studentBirthDate?: string;
}

const CATEGORIES = [
  { value: "speech", label: "Konuşma", icon: "🗣️", desc: "Artikülasyon, ses, akıcılık" },
  { value: "language", label: "Dil", icon: "📚", desc: "Anlama, üretme, kelime hazinesi" },
  { value: "hearing", label: "İşitme", icon: "👂", desc: "İşitsel hafıza, iletişim" },
] as const;

const AGE_GROUPS = [
  { value: "3-6", label: "3–6 yaş" },
  { value: "7-12", label: "7–12 yaş" },
  { value: "13-18", label: "13–18 yaş" },
  { value: "adult", label: "Yetişkin" },
] as const;

const DIFFICULTIES = [
  { value: "easy", label: "Kolay" },
  { value: "medium", label: "Orta" },
  { value: "hard", label: "Zor" },
] as const;

const DIFFICULTY_TINT: Record<string, string> = {
  easy: "var(--poster-green)",
  medium: "var(--poster-yellow)",
  hard: "var(--poster-pink)",
};

export function CardGeneratorForm({
  onCardGenerated,
  onLoading,
  onCardIdGenerated,
  studentId,
  studentName,
  studentBirthDate,
}: CardGeneratorFormProps) {
  const [error, setError] = useState<string | null>(null);

  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState("");
  const [selectedMainGoalId, setSelectedMainGoalId] = useState("");
  const [selectedSubGoalIds, setSelectedSubGoalIds] = useState<string[]>([]);
  const [studentCurriculumIds, setStudentCurriculumIds] = useState<string[]>([]);

  const curriculaByArea = curricula.reduce<Record<string, Curriculum[]>>((acc, c) => {
    if (!acc[c.area]) acc[c.area] = [];
    acc[c.area].push(c);
    return acc;
  }, {});

  useEffect(() => {
    fetch("/api/curriculum")
      .then((r) => r.json())
      .then((d) => setCurricula(d.curricula ?? []))
      .catch(() => toast.error("Müfredat yüklenemedi"));
  }, []);

  useEffect(() => {
    if (!studentId) { setStudentCurriculumIds([]); return; }
    fetch(`/api/students/${studentId}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setStudentCurriculumIds(d.student?.curriculumIds ?? []))
      .catch(() => toast.error("Öğrenci verileri yüklenemedi"));
  }, [studentId]);

  const selectedCurriculum = curricula.find((c) => c.id === selectedCurriculumId);
  const mainGoals = selectedCurriculum?.goals.filter((g) => g.isMainGoal) ?? [];
  const selectedMainGoal = mainGoals.find((g) => g.id === selectedMainGoalId);

  const filteredSubGoals = selectedMainGoal
    ? (selectedCurriculum?.goals.filter(
        (g) => !g.isMainGoal && g.code.startsWith(selectedMainGoal.code.replace(".0", "."))
      ) ?? [])
    : [];

  function toggleSubGoal(id: string) {
    setSelectedSubGoalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function resetCurriculum() {
    setSelectedCurriculumId("");
    setSelectedMainGoalId("");
    setSelectedSubGoalIds([]);
  }

  const autoAgeGroup = studentBirthDate ? calcAgeGroup(studentBirthDate) : undefined;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "speech",
      ageGroup: autoAgeGroup ?? "7-12",
      difficulty: "easy",
    },
  });

  useEffect(() => {
    if (autoAgeGroup) setValue("ageGroup", autoAgeGroup);
  }, [autoAgeGroup, setValue]);

  const watchedCategory = watch("category");
  const watchedAgeGroup = watch("ageGroup");
  const watchedDifficulty = watch("difficulty");

  const allowedAreas = WORK_AREA_FILTER[watchedCategory] ?? null;
  const filteredCurriculaByArea = Object.fromEntries(
    Object.entries(curriculaByArea)
      .filter(([area]) => !allowedAreas || allowedAreas.includes(area))
      .map(([area, list]) => {
        const filtered = studentCurriculumIds.length > 0
          ? list.filter(c => studentCurriculumIds.includes(c.id))
          : list;
        return [area, filtered] as [string, typeof list];
      })
      .filter(([, list]) => list.length > 0)
  );

  useEffect(() => {
    resetCurriculum();
  }, [watchedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(values: FormValues) {
    setError(null);
    onLoading(true);
    const loadingToast = toast.loading("Kart üretiliyor... ✨");
    try {
      const res = await fetch("/api/cards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          studentId,
          curriculumGoalIds: selectedSubGoalIds.length > 0
            ? selectedSubGoalIds
            : selectedMainGoalId
            ? [selectedMainGoalId]
            : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bilinmeyen hata");
      toast.success("Öğrenme kartı oluşturuldu", { id: loadingToast });
      if (data.cardId) onCardIdGenerated?.(data.cardId);
      onCardGenerated(data.card);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bir hata oluştu, tekrar deneyin";
      toast.error(msg, { id: loadingToast });
      setError(msg);
    } finally {
      onLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: "flex", flexDirection: "column", gap: 22, fontFamily: "var(--font-display)" }}
    >
      {studentId && studentName && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "var(--poster-bg-2)",
            border: "2px solid var(--poster-ink)",
            borderRadius: 12,
            boxShadow: "var(--poster-shadow-sm)",
          }}
        >
          <span style={{ fontSize: 14 }}>👤</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--poster-ink)" }}>{studentName}</span>
          <span style={{ fontSize: 11, color: "var(--poster-ink-3)", marginLeft: "auto" }}>
            için kart üretiliyor
          </span>
        </div>
      )}

      <div>
        <PLabel>Eğitim Kategorisi</PLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {CATEGORIES.map((cat) => {
            const active = watchedCategory === cat.value;
            const tint = CATEGORY_META[cat.value]?.cssVar ?? "var(--poster-accent)";
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setValue("category", cat.value)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "12px 6px",
                  background: active ? tint : "var(--poster-panel)",
                  border: "2px solid var(--poster-ink)",
                  borderRadius: 12,
                  boxShadow: active ? "0 3px 0 var(--poster-ink)" : "var(--poster-shadow-sm)",
                  cursor: "pointer",
                  fontFamily: "var(--font-display)",
                  textAlign: "center",
                  transition: "background .12s, box-shadow .12s",
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{cat.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--poster-ink)" }}>{cat.label}</span>
                <span style={{ fontSize: 10, color: active ? "var(--poster-ink)" : "var(--poster-ink-3)", lineHeight: 1.3 }}>
                  {cat.desc}
                </span>
              </button>
            );
          })}
        </div>
        {errors.category && <p style={{ fontSize: 12, color: "var(--poster-danger)", margin: "6px 0 0" }}>{errors.category.message}</p>}
      </div>

      <div>
        <PLabel>Yaş Grubu</PLabel>
        {autoAgeGroup ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: "var(--poster-bg-2)",
              border: "2px dashed var(--poster-ink-3)",
              borderRadius: 12,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--poster-ink)" }}>
              {AGE_GROUPS.find((a) => a.value === autoAgeGroup)?.label}
            </span>
            <span style={{ fontSize: 11, color: "var(--poster-ink-3)", marginLeft: "auto" }}>
              öğrenciden otomatik
            </span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {AGE_GROUPS.map((age) => {
              const active = watchedAgeGroup === age.value;
              return (
                <button
                  key={age.value}
                  type="button"
                  onClick={() => setValue("ageGroup", age.value)}
                  style={{
                    padding: "10px 6px",
                    background: active ? "var(--poster-accent)" : "var(--poster-panel)",
                    border: "2px solid var(--poster-ink)",
                    borderRadius: 12,
                    boxShadow: active ? "0 3px 0 var(--poster-ink)" : "var(--poster-shadow-sm)",
                    fontSize: 13,
                    fontWeight: 700,
                    color: active ? "#fff" : "var(--poster-ink-2)",
                    cursor: "pointer",
                    fontFamily: "var(--font-display)",
                    transition: "background .12s, box-shadow .12s",
                  }}
                >
                  {age.label}
                </button>
              );
            })}
          </div>
        )}
        {errors.ageGroup && <p style={{ fontSize: 12, color: "var(--poster-danger)", margin: "6px 0 0" }}>{errors.ageGroup.message}</p>}
      </div>

      <div>
        <PLabel>Zorluk Seviyesi</PLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {DIFFICULTIES.map((d) => {
            const active = watchedDifficulty === d.value;
            const tint = DIFFICULTY_TINT[d.value];
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => setValue("difficulty", d.value)}
                style={{
                  padding: "10px 6px",
                  background: active ? tint : "var(--poster-panel)",
                  border: "2px solid var(--poster-ink)",
                  borderRadius: 12,
                  boxShadow: active ? "0 3px 0 var(--poster-ink)" : "var(--poster-shadow-sm)",
                  fontSize: 13,
                  fontWeight: 800,
                  color: "var(--poster-ink)",
                  cursor: "pointer",
                  fontFamily: "var(--font-display)",
                  transition: "background .12s, box-shadow .12s",
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        {errors.difficulty && <p style={{ fontSize: 12, color: "var(--poster-danger)", margin: "6px 0 0" }}>{errors.difficulty.message}</p>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <PLabel
          rightSlot={
            selectedCurriculumId ? (
              <button
                type="button"
                onClick={resetCurriculum}
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
                Temizle
              </button>
            ) : undefined
          }
        >
          Müfredat Hedefi <span style={{ fontWeight: 500, color: "var(--poster-ink-3)" }}>(isteğe bağlı)</span>
        </PLabel>

        <PSelect
          value={selectedCurriculumId}
          onChange={(e) => {
            setSelectedCurriculumId(e.target.value);
            setSelectedMainGoalId("");
            setSelectedSubGoalIds([]);
          }}
        >
          <option value="">— Modül seç —</option>
          {Object.entries(filteredCurriculaByArea).map(([area, list]) => (
            <optgroup key={area} label={AREA_LABELS[area] ?? area}>
              {list.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </optgroup>
          ))}
        </PSelect>

        {selectedCurriculumId && (
          <PSelect
            value={selectedMainGoalId}
            onChange={(e) => {
              setSelectedMainGoalId(e.target.value);
              setSelectedSubGoalIds([]);
            }}
          >
            <option value="">— Ana hedef seç —</option>
            {mainGoals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.code} {g.title}
              </option>
            ))}
          </PSelect>
        )}

        {selectedMainGoalId && filteredSubGoals.length > 0 && (
          <div
            style={{
              background: "var(--poster-panel)",
              border: "2px solid var(--poster-ink)",
              borderRadius: 12,
              boxShadow: "var(--poster-shadow-sm)",
              overflow: "hidden",
            }}
          >
            {filteredSubGoals.map((g, i) => {
              const checked = selectedSubGoalIds.includes(g.id);
              return (
                <label
                  key={g.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "8px 12px",
                    cursor: "pointer",
                    background: checked ? "var(--poster-bg-2)" : "var(--poster-panel)",
                    borderTop: i === 0 ? "none" : "1px dashed var(--poster-ink-faint)",
                    transition: "background .12s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSubGoal(g.id)}
                    style={{
                      marginTop: 2,
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                      accentColor: "var(--poster-accent)",
                      cursor: "pointer",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--poster-ink-3)",
                      flexShrink: 0,
                      width: 40,
                      paddingTop: 1,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {g.code}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--poster-ink)", lineHeight: 1.5 }}>{g.title}</span>
                </label>
              );
            })}
          </div>
        )}

        {(selectedSubGoalIds.length > 0 || selectedMainGoalId) && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "8px 12px",
              background: "var(--poster-bg-2)",
              border: "2px solid var(--poster-ink)",
              borderRadius: 12,
              boxShadow: "var(--poster-shadow-sm)",
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1.4 }}>🎯</span>
            <p style={{ fontSize: 12, color: "var(--poster-ink)", lineHeight: 1.5, margin: 0 }}>
              {selectedSubGoalIds.length > 0
                ? `${selectedSubGoalIds.length} alt hedef seçildi`
                : mainGoals.find((g) => g.id === selectedMainGoalId)?.title}
            </p>
          </div>
        )}
      </div>

      <div>
        <PLabel htmlFor="focusArea">
          Hedef Beceri <span style={{ fontWeight: 500, color: "var(--poster-ink-3)" }}>(isteğe bağlı)</span>
        </PLabel>
        <PTextarea
          id="focusArea"
          {...register("focusArea")}
          placeholder="Örn: /s/ sesi üretimi, akıcı konuşma, kelime çağrışımı..."
          rows={3}
        />
      </div>

      {error && <PAlert tone="error">{error}</PAlert>}

      <PBtn
        type="submit"
        variant="accent"
        size="md"
        disabled={isSubmitting}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {isSubmitting ? "Kart üretiliyor…" : "✨ Kart Üret"}
      </PBtn>
    </form>
  );
}
