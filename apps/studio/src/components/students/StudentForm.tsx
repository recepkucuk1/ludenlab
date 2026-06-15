"use client";

import { useState } from "react";
import { CurriculumPicker } from "@/components/students/CurriculumPicker";
import { CATEGORY_META } from "@/lib/constants";
import {
  PBtn,
  PInput,
  PTextarea,
  PLabel,
  PAlert,
  PFieldHint,
} from "@/components/poster";

const WORK_AREAS = [
  { value: "speech", label: "Konuşma", icon: "🗣️" },
  { value: "language", label: "Dil", icon: "📚" },
  { value: "hearing", label: "İşitme", icon: "👂" },
];

export interface StudentFormData {
  name: string;
  birthDate: string;
  workArea: string;
  diagnosis: string;
  notes: string;
  curriculumIds: string[];
}

interface StudentFormProps {
  initialValues?: Partial<StudentFormData>;
  curricula: { id: string; area: string; title: string }[];
  onSubmit: (data: StudentFormData) => void;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
  submitText?: string;
}

export function StudentForm({
  initialValues,
  curricula,
  onSubmit,
  onCancel,
  submitting,
  error,
  submitText = "Kaydet",
}: StudentFormProps) {
  const [name, setName] = useState(initialValues?.name || "");
  const [birthDate, setBirthDate] = useState(initialValues?.birthDate || "");
  const [workArea, setWorkArea] = useState(initialValues?.workArea || "speech");
  const [diagnosis, setDiagnosis] = useState(initialValues?.diagnosis || "");
  const [notes, setNotes] = useState(initialValues?.notes || "");
  const [curriculumIds, setCurriculumIds] = useState<string[]>(initialValues?.curriculumIds || []);
  const [nameTouched, setNameTouched] = useState(false);

  const nameError = !name.trim() ? "Ad Soyad zorunludur" : null;
  const showNameError = nameTouched && nameError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNameTouched(true);
    if (nameError) return;
    onSubmit({ name, birthDate, workArea, diagnosis, notes, curriculumIds });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <PLabel htmlFor="name" required>
          Ad Soyad
        </PLabel>
        <PInput
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setNameTouched(true)}
          placeholder="Öğrenci adı"
          autoFocus
          invalid={!!showNameError}
          aria-invalid={!!showNameError}
          aria-describedby={showNameError ? "name-error" : undefined}
        />
        {showNameError && (
          <PFieldHint tone="error" style={{ marginTop: 6 }}>
            <span id="name-error">{nameError}</span>
          </PFieldHint>
        )}
      </div>

      <div>
        <PLabel htmlFor="birthDate" optional>Doğum Tarihi</PLabel>
        <PInput
          id="birthDate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
      </div>

      <div>
        <PLabel required>Çalışma Alanı</PLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {WORK_AREAS.map((w) => {
            const active = workArea === w.value;
            const tint = CATEGORY_META[w.value]?.cssVar ?? "var(--poster-accent)";
            return (
              <button
                key={w.value}
                type="button"
                onClick={() => setWorkArea(w.value)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "12px 8px",
                  background: active ? tint : "var(--poster-panel)",
                  border: "2px solid var(--poster-ink)",
                  borderRadius: 12,
                  boxShadow: active ? "0 3px 0 var(--poster-ink)" : "var(--poster-shadow-sm)",
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: active ? "var(--poster-ink)" : "var(--poster-ink-2)",
                  cursor: "pointer",
                  transition: "background .12s, box-shadow .12s",
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{w.icon}</span>
                {w.label}
              </button>
            );
          })}
        </div>
      </div>

      <CurriculumPicker
        key={workArea}
        curricula={curricula}
        selectedIds={curriculumIds}
        onChange={setCurriculumIds}
        defaultOpenKey={workArea}
      />

      <div>
        <PLabel htmlFor="diagnosis" optional>Tanı</PLabel>
        <PInput
          id="diagnosis"
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="Örn: Dil gelişim gecikmesi"
        />
      </div>

      <div>
        <PLabel htmlFor="notes" optional>Notlar</PLabel>
        <PTextarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Öğrenci hakkında ek notlar..."
          rows={2}
        />
      </div>

      {error && <PAlert tone="error">{error}</PAlert>}

      <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
        <PBtn
          type="submit"
          variant="accent"
          size="md"
          disabled={submitting}
          style={{ flex: 1, justifyContent: "center" }}
        >
          {submitting ? "Kaydediliyor…" : submitText}
        </PBtn>
        <PBtn
          type="button"
          variant="white"
          size="md"
          onClick={onCancel}
          style={{ flex: 1, justifyContent: "center" }}
        >
          İptal
        </PBtn>
      </div>
    </form>
  );
}
